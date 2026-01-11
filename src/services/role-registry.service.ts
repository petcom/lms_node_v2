/**
 * RoleRegistry Service
 *
 * Singleton service that provides centralized access to user types and roles
 * loaded from the LookupValue collection. Uses in-memory caching for performance.
 *
 * Key Features:
 * - Singleton pattern ensures one instance across the application
 * - In-memory cache for fast lookups (no database queries after initialization)
 * - Validates userTypes and roles against database-loaded values
 * - Transforms string arrays to enriched object arrays for API responses
 * - Can be refreshed without server restart
 *
 * Reference: devdocs/plans/UserType_Validation_Lookup_Migration_Plan.md Section 3
 */

import { IRoleRegistry, UserTypeObject, RoleObject } from './role-registry.interface';

/**
 * Internal lookup value structure (matches LookupValue model)
 */
interface LookupValue {
  lookupId: string;
  category: string;
  key: string;
  parentLookupId: string | null;
  displayAs: string;
  isActive: boolean;
  sortOrder: number;
}

/**
 * RoleRegistry Service Implementation
 *
 * This implementation uses a singleton pattern and maintains an in-memory cache
 * of all lookup values. The cache is organized for fast O(1) lookups.
 */
export class RoleRegistry implements IRoleRegistry {
  private static instance: RoleRegistry;
  private initialized: boolean = false;

  // In-memory caches
  private lookupCache: Map<string, LookupValue> = new Map(); // lookupId → LookupValue
  private userTypeCache: Map<string, LookupValue> = new Map(); // userType key → LookupValue
  private rolesByUserType: Map<string, string[]> = new Map(); // userType → role keys[]
  private roleCache: Map<string, LookupValue> = new Map(); // role key → LookupValue

  // Optional dependency injection for testing
  private dataLoader?: () => Promise<LookupValue[]>;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): RoleRegistry {
    if (!RoleRegistry.instance) {
      RoleRegistry.instance = new RoleRegistry();
    }
    return RoleRegistry.instance;
  }

  /**
   * Set a custom data loader for testing (optional)
   * Allows mocking the data source without database dependency
   */
  public setDataLoader(loader: () => Promise<LookupValue[]>): void {
    this.dataLoader = loader;
  }

  /**
   * Reset the singleton instance (for testing only)
   */
  public static resetInstance(): void {
    if (RoleRegistry.instance) {
      RoleRegistry.instance.initialized = false;
      RoleRegistry.instance.lookupCache.clear();
      RoleRegistry.instance.userTypeCache.clear();
      RoleRegistry.instance.rolesByUserType.clear();
      RoleRegistry.instance.roleCache.clear();
    }
    RoleRegistry.instance = new RoleRegistry();
  }

  /**
   * Initialize the registry by loading all lookup values
   */
  public async initialize(): Promise<void> {
    try {
      // Load lookup values from database or mock
      const lookupValues = await this.loadLookupValues();

      if (!lookupValues || lookupValues.length === 0) {
        throw new Error(
          'FATAL: No lookup values found in database. Please run: npm run seed:constants'
        );
      }

      // Clear existing caches
      this.lookupCache.clear();
      this.userTypeCache.clear();
      this.rolesByUserType.clear();
      this.roleCache.clear();

      // Build caches
      for (const lookup of lookupValues) {
        if (!lookup.isActive) continue;

        // Store in main lookup cache by lookupId
        this.lookupCache.set(lookup.lookupId, lookup);

        // Categorize by type
        if (lookup.category === 'usertype') {
          this.userTypeCache.set(lookup.key, lookup);
        } else if (lookup.category === 'role' && lookup.parentLookupId) {
          // Store role by key
          this.roleCache.set(lookup.key, lookup);

          // Build userType → roles mapping
          const parentUserType = this.getUserTypeFromLookupId(lookup.parentLookupId);
          if (parentUserType) {
            if (!this.rolesByUserType.has(parentUserType)) {
              this.rolesByUserType.set(parentUserType, []);
            }
            this.rolesByUserType.get(parentUserType)!.push(lookup.key);
          }
        }
      }

      // Sort roles by sortOrder within each userType
      for (const [userType, roles] of this.rolesByUserType.entries()) {
        const sortedRoles = roles.sort((a, b) => {
          const roleA = this.roleCache.get(a);
          const roleB = this.roleCache.get(b);
          return (roleA?.sortOrder ?? 999) - (roleB?.sortOrder ?? 999);
        });
        this.rolesByUserType.set(userType, sortedRoles);
      }

      this.initialized = true;

      console.log('✓ RoleRegistry initialized successfully');
      console.log(`  - UserTypes: ${this.userTypeCache.size}`);
      console.log(`  - Roles: ${this.roleCache.size}`);
    } catch (error) {
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Load lookup values from database (or mock for testing)
   */
  private async loadLookupValues(): Promise<LookupValue[]> {
    // If custom data loader is set (for testing), use it
    if (this.dataLoader) {
      return this.dataLoader();
    }

    // Otherwise, load from database
    // Note: This requires LookupValue model from Stream A
    try {
      // Dynamic import to avoid circular dependency and allow mocking
      const { LookupValue: LookupValueModel } = await import('../models/LookupValue.model');

      const lookups = await LookupValueModel.find({ isActive: true })
        .select('lookupId category key parentLookupId displayAs isActive sortOrder')
        .sort({ sortOrder: 1 })
        .lean();

      return lookups.map((l: any) => ({
        lookupId: l.lookupId,
        category: l.category,
        key: l.key,
        parentLookupId: l.parentLookupId,
        displayAs: l.displayAs,
        isActive: l.isActive,
        sortOrder: l.sortOrder
      }));
    } catch (error: any) {
      // If model doesn't exist yet, throw a clear error
      if (error.code === 'MODULE_NOT_FOUND' || error.message?.includes('Cannot find module')) {
        throw new Error(
          'LookupValue model not found. Stream A must be completed before initializing RoleRegistry.'
        );
      }
      throw error;
    }
  }

  /**
   * Extract userType key from lookupId (e.g., "usertype.staff" → "staff")
   */
  private getUserTypeFromLookupId(lookupId: string): string | null {
    const parts = lookupId.split('.');
    if (parts.length === 2 && parts[0] === 'usertype') {
      return parts[1];
    }
    return null;
  }

  /**
   * Check if registry is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Ensure registry is initialized before use
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('RoleRegistry not initialized. Call initialize() first.');
    }
  }

  /**
   * Get all valid user type keys
   */
  public getValidUserTypes(): string[] {
    this.ensureInitialized();
    return Array.from(this.userTypeCache.keys());
  }

  /**
   * Get all valid roles for a specific user type
   */
  public getValidRolesForUserType(userType: string): string[] {
    this.ensureInitialized();
    return this.rolesByUserType.get(userType) || [];
  }

  /**
   * Check if a userType is valid
   */
  public isValidUserType(userType: string): boolean {
    if (!this.initialized) return false;
    return this.userTypeCache.has(userType);
  }

  /**
   * Check if a role is valid for a specific user type
   */
  public isValidRoleForUserType(userType: string, role: string): boolean {
    if (!this.initialized) return false;
    const validRoles = this.rolesByUserType.get(userType);
    return validRoles ? validRoles.includes(role) : false;
  }

  /**
   * Get display label for any lookupId
   */
  public getDisplayAs(lookupId: string): string {
    if (!this.initialized) return lookupId;
    const lookup = this.lookupCache.get(lookupId);
    return lookup?.displayAs || lookupId;
  }

  /**
   * Get display label for a user type
   */
  public getUserTypeDisplay(userType: string): string {
    if (!this.initialized) return userType;
    const lookup = this.userTypeCache.get(userType);
    return lookup?.displayAs || userType;
  }

  /**
   * Get display label for a role
   */
  public getRoleDisplay(role: string): string {
    if (!this.initialized) return role;
    const lookup = this.roleCache.get(role);
    return lookup?.displayAs || role;
  }

  /**
   * Transform string userTypes to UserTypeObject[]
   */
  public hydrateUserTypes(userTypeStrings: string[]): UserTypeObject[] {
    if (!this.initialized) {
      // Fallback if not initialized
      return userTypeStrings.map(ut => ({
        _id: ut as any,
        displayAs: ut
      }));
    }

    return userTypeStrings.map(ut => ({
      _id: ut as any,
      displayAs: this.getUserTypeDisplay(ut)
    }));
  }

  /**
   * Transform role strings to RoleObject[]
   */
  public hydrateRoles(roleStrings: string[]): RoleObject[] {
    if (!this.initialized) {
      // Fallback if not initialized
      return roleStrings.map(r => ({
        _id: r,
        displayAs: r
      }));
    }

    return roleStrings.map(r => ({
      _id: r,
      displayAs: this.getRoleDisplay(r)
    }));
  }

  /**
   * Refresh the registry by reloading from database
   */
  public async refresh(): Promise<void> {
    console.log('Refreshing RoleRegistry...');
    await this.initialize();
  }
}

/**
 * Export singleton instance
 */
export default RoleRegistry.getInstance();
