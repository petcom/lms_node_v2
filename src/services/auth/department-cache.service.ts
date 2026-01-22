/**
 * DepartmentCacheService
 *
 * Singleton service that maintains an in-memory cache of the department hierarchy.
 * This is critical for hierarchical permission inheritance and must be highly performant.
 *
 * Features:
 * - Loads department hierarchy from database on startup
 * - Caches parent→children and child→parent relationships in memory
 * - Provides O(1) lookups for hierarchy traversal
 * - Auto-refreshes every hour
 * - Manual refresh capability for admin operations
 *
 * Usage:
 * ```typescript
 * import { departmentCacheService } from '@/services/auth/department-cache.service';
 *
 * // Get all children of a department
 * const children = departmentCacheService.getChildren(deptId);
 *
 * // Get all ancestors (parents up the chain)
 * const ancestors = departmentCacheService.getAncestors(deptId);
 *
 * // Check hierarchy relationship
 * const canAccess = departmentCacheService.isAncestorOf(userDeptId, resourceDeptId);
 * ```
 *
 * @module services/auth/department-cache
 */

import Department from '@/models/organization/Department.model';
import { logger } from '@/config/logger';

/**
 * Cache refresh interval in milliseconds (1 hour)
 */
const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Interface for cached department data
 */
interface DepartmentCacheData {
  /** Map of parent department ID to array of child department IDs */
  parentToChildren: Map<string, string[]>;
  /** Map of child department ID to parent department ID */
  childToParent: Map<string, string>;
}

/**
 * DepartmentCacheService
 *
 * Singleton service for managing department hierarchy cache.
 * Provides fast in-memory lookups for department relationships.
 */
class DepartmentCacheService {
  private cache: DepartmentCacheData;
  private isInitialized: boolean = false;
  private isLoading: boolean = false;
  private refreshTimer: NodeJS.Timeout | null = null;
  private lastRefreshTime: Date | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.cache = {
      parentToChildren: new Map(),
      childToParent: new Map()
    };
  }

  /**
   * Initialize the cache service
   *
   * Loads the department hierarchy from the database and starts the auto-refresh timer.
   * This method is idempotent - calling it multiple times will only initialize once.
   *
   * @returns Promise<void>
   */
  async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized) {
      return;
    }

    // If currently initializing, wait for that to complete
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = this.performInitialization();
    await this.initPromise;
  }

  /**
   * Perform the actual initialization
   * @private
   */
  private async performInitialization(): Promise<void> {
    try {
      logger.info('DepartmentCacheService: Initializing department hierarchy cache');

      await this.loadHierarchyFromDatabase();
      this.startAutoRefresh();
      this.isInitialized = true;

      logger.info(
        `DepartmentCacheService: Initialization complete. ` +
        `Cached ${this.cache.parentToChildren.size} parent→children mappings, ` +
        `${this.cache.childToParent.size} child→parent mappings`
      );
    } catch (error) {
      logger.error('DepartmentCacheService: Failed to initialize', error);
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Load department hierarchy from database
   * @private
   */
  private async loadHierarchyFromDatabase(): Promise<void> {
    this.isLoading = true;

    try {
      // Fetch all active departments with their parent relationships
      const departments = await Department.find({ isActive: true })
        .select('_id parentDepartmentId')
        .lean();

      // Build new cache data structures
      const newParentToChildren = new Map<string, string[]>();
      const newChildToParent = new Map<string, string>();

      for (const dept of departments) {
        const deptId = dept._id.toString();

        // Initialize empty children array for each department
        if (!newParentToChildren.has(deptId)) {
          newParentToChildren.set(deptId, []);
        }

        // If this department has a parent, establish the relationship
        if (dept.parentDepartmentId) {
          const parentId = dept.parentDepartmentId.toString();

          // Add to child→parent mapping
          newChildToParent.set(deptId, parentId);

          // Add to parent→children mapping
          if (!newParentToChildren.has(parentId)) {
            newParentToChildren.set(parentId, []);
          }
          newParentToChildren.get(parentId)!.push(deptId);
        }
      }

      // Atomically swap the cache
      this.cache = {
        parentToChildren: newParentToChildren,
        childToParent: newChildToParent
      };

      this.lastRefreshTime = new Date();

      logger.debug(
        `DepartmentCacheService: Loaded ${departments.length} departments from database`
      );
    } catch (error) {
      logger.error('DepartmentCacheService: Error loading hierarchy from database', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Start the auto-refresh timer
   * @private
   */
  private startAutoRefresh(): void {
    // Clear any existing timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Set up hourly refresh
    this.refreshTimer = setInterval(async () => {
      try {
        logger.info('DepartmentCacheService: Starting scheduled refresh');
        await this.refresh();
      } catch (error) {
        logger.error('DepartmentCacheService: Scheduled refresh failed', error);
      }
    }, REFRESH_INTERVAL_MS);

    // Don't prevent process from exiting
    this.refreshTimer.unref();

    logger.debug('DepartmentCacheService: Auto-refresh timer started (1 hour interval)');
  }

  /**
   * Manually refresh the cache from database
   *
   * Call this when department hierarchy changes (create, update, delete operations).
   *
   * @returns Promise<void>
   *
   * @example
   * // After creating a new department
   * await departmentCacheService.refresh();
   */
  async refresh(): Promise<void> {
    if (this.isLoading) {
      logger.warn('DepartmentCacheService: Refresh already in progress, skipping');
      return;
    }

    try {
      logger.info('DepartmentCacheService: Refreshing cache from database');
      await this.loadHierarchyFromDatabase();
      logger.info(
        `DepartmentCacheService: Cache refreshed. ` +
        `${this.cache.parentToChildren.size} parent→children mappings, ` +
        `${this.cache.childToParent.size} child→parent mappings`
      );
    } catch (error) {
      logger.error('DepartmentCacheService: Refresh failed', error);
      throw error;
    }
  }

  /**
   * Get direct children of a department
   *
   * Returns an array of department IDs that are direct children of the given department.
   * Returns empty array if department has no children or doesn't exist.
   *
   * @param departmentId - The parent department ID
   * @returns string[] - Array of child department IDs
   *
   * @example
   * const children = departmentCacheService.getChildren('dept-123');
   * // Returns: ['dept-456', 'dept-789']
   */
  getChildren(departmentId: string): string[] {
    if (!this.isInitialized) {
      logger.warn('DepartmentCacheService: getChildren called before initialization');
      return [];
    }

    const children = this.cache.parentToChildren.get(departmentId);
    return children ? [...children] : [];
  }

  /**
   * Get all descendants of a department (recursive)
   *
   * Returns all department IDs in the subtree under the given department.
   * This includes children, grandchildren, and so on.
   *
   * @param departmentId - The root department ID
   * @returns string[] - Array of all descendant department IDs
   *
   * @example
   * const descendants = departmentCacheService.getAllDescendants('dept-123');
   * // Returns: ['dept-456', 'dept-789', 'dept-abc', ...]
   */
  getAllDescendants(departmentId: string): string[] {
    if (!this.isInitialized) {
      logger.warn('DepartmentCacheService: getAllDescendants called before initialization');
      return [];
    }

    const descendants: string[] = [];
    const queue: string[] = [departmentId];
    const visited = new Set<string>();

    // BFS traversal to collect all descendants
    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (visited.has(currentId)) {
        continue; // Prevent cycles
      }
      visited.add(currentId);

      const children = this.cache.parentToChildren.get(currentId) || [];
      for (const childId of children) {
        if (!visited.has(childId)) {
          descendants.push(childId);
          queue.push(childId);
        }
      }
    }

    return descendants;
  }

  /**
   * Get ancestors of a department (parents up the chain)
   *
   * Returns an array of department IDs from the immediate parent up to the root.
   * The first element is the immediate parent, the last is the root department.
   * Returns empty array if department is a root or doesn't exist.
   *
   * @param departmentId - The starting department ID
   * @returns string[] - Array of ancestor department IDs (ordered from immediate parent to root)
   *
   * @example
   * const ancestors = departmentCacheService.getAncestors('dept-789');
   * // Returns: ['dept-456', 'dept-123'] (parent, then grandparent)
   */
  getAncestors(departmentId: string): string[] {
    if (!this.isInitialized) {
      logger.warn('DepartmentCacheService: getAncestors called before initialization');
      return [];
    }

    const ancestors: string[] = [];
    let currentId = departmentId;
    const visited = new Set<string>();

    // Traverse up the hierarchy
    while (true) {
      // Prevent infinite loops from circular references
      if (visited.has(currentId)) {
        logger.error(
          `DepartmentCacheService: Circular reference detected at department ${currentId}`
        );
        break;
      }
      visited.add(currentId);

      const parentId = this.cache.childToParent.get(currentId);
      if (!parentId) {
        break; // Reached root
      }

      ancestors.push(parentId);
      currentId = parentId;
    }

    return ancestors;
  }

  /**
   * Get the parent of a department
   *
   * Returns the direct parent department ID, or null if root or doesn't exist.
   *
   * @param departmentId - The child department ID
   * @returns string | null - Parent department ID or null
   *
   * @example
   * const parent = departmentCacheService.getParent('dept-789');
   * // Returns: 'dept-456' or null if root
   */
  getParent(departmentId: string): string | null {
    if (!this.isInitialized) {
      logger.warn('DepartmentCacheService: getParent called before initialization');
      return null;
    }

    return this.cache.childToParent.get(departmentId) || null;
  }

  /**
   * Check if one department is an ancestor of another
   *
   * Returns true if ancestorId is in the chain of parents leading to descendantId.
   *
   * @param ancestorId - The potential ancestor department ID
   * @param descendantId - The potential descendant department ID
   * @returns boolean - True if ancestorId is an ancestor of descendantId
   *
   * @example
   * const isAncestor = departmentCacheService.isAncestorOf('dept-123', 'dept-789');
   * // Returns: true if dept-123 is a parent/grandparent/etc. of dept-789
   */
  isAncestorOf(ancestorId: string, descendantId: string): boolean {
    if (!this.isInitialized) {
      logger.warn('DepartmentCacheService: isAncestorOf called before initialization');
      return false;
    }

    // Same department is not an ancestor of itself
    if (ancestorId === descendantId) {
      return false;
    }

    const ancestors = this.getAncestors(descendantId);
    return ancestors.includes(ancestorId);
  }

  /**
   * Check if one department is a descendant of another
   *
   * Returns true if descendantId is in the subtree under ancestorId.
   *
   * @param descendantId - The potential descendant department ID
   * @param ancestorId - The potential ancestor department ID
   * @returns boolean - True if descendantId is a descendant of ancestorId
   *
   * @example
   * const isDescendant = departmentCacheService.isDescendantOf('dept-789', 'dept-123');
   * // Returns: true if dept-789 is under dept-123 in the hierarchy
   */
  isDescendantOf(descendantId: string, ancestorId: string): boolean {
    return this.isAncestorOf(ancestorId, descendantId);
  }

  /**
   * Check if department is a root department (no parent)
   *
   * @param departmentId - The department ID to check
   * @returns boolean - True if department has no parent
   */
  isRoot(departmentId: string): boolean {
    if (!this.isInitialized) {
      logger.warn('DepartmentCacheService: isRoot called before initialization');
      return false;
    }

    return !this.cache.childToParent.has(departmentId);
  }

  /**
   * Get the full department hierarchy map
   *
   * Returns a record mapping each parent department to its children.
   * Useful for building UI trees or debugging.
   *
   * @returns Record<string, string[]> - Full hierarchy map (parent → children)
   *
   * @example
   * const hierarchy = departmentCacheService.getDepartmentHierarchy();
   * // Returns: { 'dept-123': ['dept-456', 'dept-789'], ... }
   */
  getDepartmentHierarchy(): Record<string, string[]> {
    if (!this.isInitialized) {
      logger.warn('DepartmentCacheService: getDepartmentHierarchy called before initialization');
      return {};
    }

    const hierarchy: Record<string, string[]> = {};

    for (const [parentId, children] of this.cache.parentToChildren.entries()) {
      hierarchy[parentId] = [...children];
    }

    return hierarchy;
  }

  /**
   * Get department and all its subdepartments (recursive)
   *
   * Returns an array containing the department itself and all descendants.
   * This is the cached equivalent of the utility function getDepartmentAndSubdepartments.
   *
   * @param departmentId - The root department ID
   * @returns string[] - Array of department IDs including the root and all descendants
   *
   * @example
   * const deptIds = departmentCacheService.getDepartmentAndSubdepartments('dept-123');
   * // Returns: ['dept-123', 'dept-456', 'dept-789', ...]
   */
  getDepartmentAndSubdepartments(departmentId: string): string[] {
    if (!this.isInitialized) {
      logger.warn(
        'DepartmentCacheService: getDepartmentAndSubdepartments called before initialization'
      );
      return [departmentId];
    }

    return [departmentId, ...this.getAllDescendants(departmentId)];
  }

  /**
   * Get cache statistics for monitoring
   *
   * @returns Object with cache statistics
   */
  getStats(): {
    isInitialized: boolean;
    isLoading: boolean;
    lastRefreshTime: Date | null;
    parentToChildrenCount: number;
    childToParentCount: number;
  } {
    return {
      isInitialized: this.isInitialized,
      isLoading: this.isLoading,
      lastRefreshTime: this.lastRefreshTime,
      parentToChildrenCount: this.cache.parentToChildren.size,
      childToParentCount: this.cache.childToParent.size
    };
  }

  /**
   * Shutdown the service
   *
   * Stops the auto-refresh timer and clears the cache.
   * Call this during application shutdown.
   */
  shutdown(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.cache = {
      parentToChildren: new Map(),
      childToParent: new Map()
    };

    this.isInitialized = false;
    this.initPromise = null;

    logger.info('DepartmentCacheService: Shutdown complete');
  }
}

/**
 * Singleton instance of the DepartmentCacheService
 *
 * Import this instance to use the department cache throughout the application.
 *
 * @example
 * import { departmentCacheService } from '@/services/auth/department-cache.service';
 *
 * // Initialize on app startup
 * await departmentCacheService.initialize();
 *
 * // Use throughout the app
 * const children = departmentCacheService.getChildren(deptId);
 */
export const departmentCacheService = new DepartmentCacheService();

/**
 * Export the class for testing purposes
 */
export { DepartmentCacheService };

export default departmentCacheService;
