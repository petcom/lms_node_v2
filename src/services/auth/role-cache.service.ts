/**
 * Role Cache Service
 *
 * In-memory cache for RoleDefinitions to optimize authorization performance.
 * Implements Tier 1 caching as specified in UNIFIED_AUTHORIZATION_MODEL.md.
 *
 * Features:
 * - Singleton instance for consistent cache state across application
 * - Loads all active RoleDefinitions from database on startup
 * - Provides fast O(1) lookups by role name
 * - Auto-refreshes at configurable intervals (default: 1 hour)
 * - Graceful fallback to database queries on cache failures
 * - Thread-safe refresh mechanism
 *
 * Reference: agent_coms/api/specs/UNIFIED_AUTHORIZATION_MODEL.md (Caching Strategy)
 *
 * @module services/auth/role-cache
 */

import { RoleDefinition, IRoleDefinition } from '@/models/RoleDefinition.model';
import { logger } from '@/config/logger';

/**
 * Cache TTL configuration (in seconds)
 * Matches CacheTTL from contracts/api/authorization.contract.ts
 */
const CacheTTL = {
  roleDefinitions: 60 * 60 // 1 hour
};

/**
 * Cached role definition data (lightweight version without Mongoose document overhead)
 */
export interface CachedRoleDefinition {
  /** Role identifier (e.g., 'instructor', 'content-admin') */
  name: string;
  /** Which userType this role belongs to */
  userType: 'learner' | 'staff' | 'global-admin';
  /** Human-readable name */
  displayName: string;
  /** Description of role purpose */
  description: string;
  /** Access rights granted by this role */
  accessRights: string[];
  /** Is this a default role for new memberships? */
  isDefault: boolean;
  /** Display order in UI */
  sortOrder: number;
}

/**
 * Role Cache Service
 *
 * Provides in-memory caching for RoleDefinitions to eliminate repeated
 * database queries during permission resolution. This is a critical
 * optimization for the authentication middleware.
 */
class RoleCacheService {
  /** In-memory cache of role definitions */
  private cache: Map<string, CachedRoleDefinition> = new Map();

  /** Whether the cache has been initialized */
  private initialized: boolean = false;

  /** Timestamp of last cache refresh */
  private lastRefreshAt: Date | null = null;

  /** Auto-refresh interval handle */
  private refreshIntervalHandle: ReturnType<typeof setInterval> | null = null;

  /** Flag to prevent concurrent refresh operations */
  private isRefreshing: boolean = false;

  /** Cache TTL in milliseconds (default: 1 hour from CacheTTL.roleDefinitions) */
  private cacheTTLMs: number = CacheTTL.roleDefinitions * 1000;

  /**
   * Initialize the cache by loading all active role definitions
   *
   * This should be called during application startup (e.g., after database connection).
   * The method is idempotent and can be called multiple times safely.
   *
   * @returns Promise<void>
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.debug('RoleCache: Already initialized, skipping');
      return;
    }

    try {
      logger.info('RoleCache: Initializing...');

      await this.loadFromDatabase();

      // Set up auto-refresh interval
      this.setupAutoRefresh();

      this.initialized = true;
      logger.info(
        `RoleCache: Initialized successfully with ${this.cache.size} role definitions`
      );
    } catch (error) {
      logger.error('RoleCache: Failed to initialize', error);
      // Don't throw - allow application to continue with fallback to database queries
      this.initialized = false;
    }
  }

  /**
   * Get a single role definition by name
   *
   * Attempts to return from cache first. Falls back to database query
   * if cache is not initialized or role is not found in cache.
   *
   * @param roleName - The role name to look up (case-insensitive)
   * @returns CachedRoleDefinition or null if not found
   */
  getRoleDefinition(roleName: string): CachedRoleDefinition | null {
    const normalizedName = roleName.toLowerCase();

    // Try cache first
    const cached = this.cache.get(normalizedName);
    if (cached) {
      logger.debug(`RoleCache: Cache hit for role "${roleName}"`);
      return cached;
    }

    // Cache miss
    logger.debug(`RoleCache: Cache miss for role "${roleName}"`);

    // If cache is initialized but role not found, it genuinely doesn't exist
    if (this.initialized) {
      return null;
    }

    // Cache not initialized - caller should fall back to database
    // This is handled by the async version below
    return null;
  }

  /**
   * Get a single role definition by name with database fallback
   *
   * This async version will query the database if the cache is not
   * initialized or if the role is not found.
   *
   * @param roleName - The role name to look up (case-insensitive)
   * @returns Promise<CachedRoleDefinition | null>
   */
  async getRoleDefinitionAsync(roleName: string): Promise<CachedRoleDefinition | null> {
    const normalizedName = roleName.toLowerCase();

    // Try cache first
    const cached = this.cache.get(normalizedName);
    if (cached) {
      logger.debug(`RoleCache: Cache hit for role "${roleName}"`);
      return cached;
    }

    // Cache miss - fall back to database
    logger.debug(`RoleCache: Cache miss for role "${roleName}", querying database`);

    try {
      const role = await RoleDefinition.findOne({
        name: normalizedName,
        isActive: true
      }).lean<IRoleDefinition>();

      if (!role) {
        logger.debug(`RoleCache: Role "${roleName}" not found in database`);
        return null;
      }

      // Convert to cached format
      const cachedRole = this.convertToCachedFormat(role);

      // Update cache with this role (opportunistic cache update)
      this.cache.set(normalizedName, cachedRole);
      logger.debug(`RoleCache: Added role "${roleName}" to cache from database query`);

      return cachedRole;
    } catch (error) {
      logger.error(`RoleCache: Database fallback failed for role "${roleName}"`, error);
      return null;
    }
  }

  /**
   * Get all cached role definitions
   *
   * Returns all role definitions currently in the cache.
   * If cache is not initialized, returns an empty array.
   *
   * @returns Array of all cached role definitions
   */
  getAllRoleDefinitions(): CachedRoleDefinition[] {
    if (!this.initialized) {
      logger.warn('RoleCache: getAllRoleDefinitions called but cache not initialized');
      return [];
    }

    return Array.from(this.cache.values());
  }

  /**
   * Get all role definitions with database fallback
   *
   * This async version will query the database if the cache is not
   * initialized.
   *
   * @returns Promise<CachedRoleDefinition[]>
   */
  async getAllRoleDefinitionsAsync(): Promise<CachedRoleDefinition[]> {
    // If cache is initialized, return cached values
    if (this.initialized && this.cache.size > 0) {
      logger.debug(`RoleCache: Returning ${this.cache.size} cached role definitions`);
      return Array.from(this.cache.values());
    }

    // Fall back to database
    logger.debug('RoleCache: getAllRoleDefinitionsAsync falling back to database');

    try {
      const roles = await RoleDefinition.find({ isActive: true })
        .sort({ sortOrder: 1 })
        .lean<IRoleDefinition[]>();

      const cachedRoles = roles.map((role) => this.convertToCachedFormat(role));

      // Update cache with all roles
      for (const role of cachedRoles) {
        this.cache.set(role.name, role);
      }

      logger.info(`RoleCache: Loaded ${cachedRoles.length} role definitions from database`);
      return cachedRoles;
    } catch (error) {
      logger.error('RoleCache: Database fallback failed for getAllRoleDefinitions', error);
      return [];
    }
  }

  /**
   * Get combined access rights for multiple roles
   *
   * Retrieves the access rights for all specified roles and returns
   * a deduplicated union of all rights. Uses cache when available
   * with database fallback.
   *
   * @param roles - Array of role names to get access rights for
   * @returns Promise<string[]> - Deduplicated array of access rights
   */
  async getCombinedAccessRights(roles: string[]): Promise<string[]> {
    if (!roles || roles.length === 0) {
      return [];
    }

    const accessRightsSet = new Set<string>();
    const missingRoles: string[] = [];

    // First, try to get all roles from cache
    for (const roleName of roles) {
      const normalizedName = roleName.toLowerCase();
      const cached = this.cache.get(normalizedName);

      if (cached) {
        for (const right of cached.accessRights) {
          accessRightsSet.add(right);
        }
      } else {
        missingRoles.push(normalizedName);
      }
    }

    // If any roles were missing from cache, query database
    if (missingRoles.length > 0) {
      logger.debug(
        `RoleCache: getCombinedAccessRights - ${missingRoles.length} roles not in cache, querying database`
      );

      try {
        const dbRoles = await RoleDefinition.find({
          name: { $in: missingRoles },
          isActive: true
        }).lean<IRoleDefinition[]>();

        for (const role of dbRoles) {
          // Add to access rights set
          for (const right of role.accessRights) {
            accessRightsSet.add(right);
          }

          // Opportunistically update cache
          const cachedRole = this.convertToCachedFormat(role);
          this.cache.set(role.name, cachedRole);
        }
      } catch (error) {
        logger.error('RoleCache: Database query failed in getCombinedAccessRights', error);
        // Continue with what we have from cache
      }
    }

    const result = Array.from(accessRightsSet);
    logger.debug(
      `RoleCache: getCombinedAccessRights for ${roles.length} roles returned ${result.length} unique rights`
    );

    return result;
  }

  /**
   * Refresh the cache by reloading all role definitions from database
   *
   * This method can be called manually to force a cache refresh,
   * or it's called automatically by the auto-refresh interval.
   *
   * @returns Promise<void>
   */
  async refresh(): Promise<void> {
    // Prevent concurrent refresh operations
    if (this.isRefreshing) {
      logger.debug('RoleCache: Refresh already in progress, skipping');
      return;
    }

    this.isRefreshing = true;

    try {
      logger.info('RoleCache: Refreshing cache...');
      const startTime = Date.now();

      await this.loadFromDatabase();

      const duration = Date.now() - startTime;
      logger.info(
        `RoleCache: Refresh completed in ${duration}ms, ${this.cache.size} role definitions cached`
      );
    } catch (error) {
      logger.error('RoleCache: Refresh failed', error);
      // Don't clear existing cache on refresh failure - stale data is better than no data
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Clear the cache and stop auto-refresh
   *
   * This should be called during application shutdown or when
   * a full cache invalidation is needed.
   */
  clear(): void {
    logger.info('RoleCache: Clearing cache');

    // Stop auto-refresh
    if (this.refreshIntervalHandle) {
      clearInterval(this.refreshIntervalHandle);
      this.refreshIntervalHandle = null;
    }

    // Clear cache
    this.cache.clear();
    this.initialized = false;
    this.lastRefreshAt = null;
  }

  /**
   * Get cache statistics for monitoring/debugging
   *
   * @returns Object with cache stats
   */
  getStats(): {
    initialized: boolean;
    size: number;
    lastRefreshAt: Date | null;
    cacheTTLMs: number;
    isRefreshing: boolean;
  } {
    return {
      initialized: this.initialized,
      size: this.cache.size,
      lastRefreshAt: this.lastRefreshAt,
      cacheTTLMs: this.cacheTTLMs,
      isRefreshing: this.isRefreshing
    };
  }

  /**
   * Check if cache is stale (beyond TTL)
   *
   * @returns boolean - true if cache needs refresh
   */
  isStale(): boolean {
    if (!this.lastRefreshAt) {
      return true;
    }

    const age = Date.now() - this.lastRefreshAt.getTime();
    return age > this.cacheTTLMs;
  }

  /**
   * Set custom cache TTL (useful for testing)
   *
   * @param ttlSeconds - TTL in seconds
   */
  setCacheTTL(ttlSeconds: number): void {
    this.cacheTTLMs = ttlSeconds * 1000;
    logger.debug(`RoleCache: Cache TTL set to ${ttlSeconds} seconds`);

    // Reset auto-refresh with new TTL
    if (this.initialized) {
      this.setupAutoRefresh();
    }
  }

  // ==================== Private Methods ====================

  /**
   * Load all active role definitions from database into cache
   * @private
   */
  private async loadFromDatabase(): Promise<void> {
    const roles = await RoleDefinition.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean<IRoleDefinition[]>();

    // Clear existing cache before loading new data
    this.cache.clear();

    for (const role of roles) {
      const cached = this.convertToCachedFormat(role);
      this.cache.set(role.name, cached);
    }

    this.lastRefreshAt = new Date();
  }

  /**
   * Convert a Mongoose document to cached format
   * @private
   */
  private convertToCachedFormat(role: IRoleDefinition): CachedRoleDefinition {
    return {
      name: role.name,
      userType: role.userType,
      displayName: role.displayName,
      description: role.description,
      accessRights: [...role.accessRights], // Clone array
      isDefault: role.isDefault,
      sortOrder: role.sortOrder
    };
  }

  /**
   * Set up automatic cache refresh interval
   * @private
   */
  private setupAutoRefresh(): void {
    // Clear existing interval if any
    if (this.refreshIntervalHandle) {
      clearInterval(this.refreshIntervalHandle);
    }

    // Set up new interval
    this.refreshIntervalHandle = setInterval(() => {
      logger.debug('RoleCache: Auto-refresh triggered');
      this.refresh().catch((error) => {
        logger.error('RoleCache: Auto-refresh failed', error);
      });
    }, this.cacheTTLMs);

    // Ensure the interval doesn't prevent Node.js from exiting
    if (this.refreshIntervalHandle.unref) {
      this.refreshIntervalHandle.unref();
    }

    logger.debug(`RoleCache: Auto-refresh scheduled every ${this.cacheTTLMs / 1000} seconds`);
  }
}

/**
 * Singleton instance of the Role Cache Service
 *
 * Usage:
 * ```typescript
 * import { roleCache } from '@/services/auth/role-cache.service';
 *
 * // Initialize on startup (after database connection)
 * await roleCache.initialize();
 *
 * // Get a single role definition
 * const role = roleCache.getRoleDefinition('instructor');
 *
 * // Get combined access rights for multiple roles
 * const rights = await roleCache.getCombinedAccessRights(['instructor', 'content-admin']);
 *
 * // Force refresh cache
 * await roleCache.refresh();
 * ```
 */
export const roleCache = new RoleCacheService();

/**
 * Export the class for testing purposes
 */
export { RoleCacheService };

export default roleCache;
