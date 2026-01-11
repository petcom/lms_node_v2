/**
 * UserType Revision API Contract
 * 
 * Version: 1.1
 * Date: 2026-01-11
 * Status: SUPERSEDED by lookup-values.contract.ts
 * 
 * @deprecated Use lookup-values.contract.ts for UserTypeObject and related types
 * @see lookup-values.contract.ts
 * 
 * This contract defines the new userType response format for API endpoints.
 * UserTypes will be returned as objects instead of strings.
 */

// Re-export from canonical source
export { UserTypeObject, USER_TYPE_DISPLAY, toUserTypeObjects, toUserTypeStrings } from './lookup-values.contract';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * UserType Object - New format for API responses
 * 
 * UserTypes represent the global user category (learner, staff, global-admin).
 * They are independent of departments and determine dashboard access.
 */
export interface UserTypeObject {
  /**
   * The userType identifier (internal value)
   * @example "staff", "learner", "global-admin"
   */
  _id: 'learner' | 'staff' | 'global-admin';

  /**
   * Human-readable display label for UI
   * @example "Staff", "Learner", "System Admin"
   */
  displayAs: string;
}

// ============================================================================
// DISPLAY VALUE MAPPING
// ============================================================================

/**
 * Canonical display values for each userType
 * 
 * | _id          | displayAs     |
 * |--------------|---------------|
 * | learner      | Learner       |
 * | staff        | Staff         |
 * | global-admin | System Admin  |
 */
export const USER_TYPE_DISPLAY_MAP: Record<UserTypeObject['_id'], string> = {
  'learner': 'Learner',
  'staff': 'Staff',
  'global-admin': 'System Admin'
};

// ============================================================================
// RESPONSE EXAMPLES
// ============================================================================

/**
 * Login Response - userTypes field
 * 
 * BEFORE (current):
 * ```json
 * {
 *   "user": {
 *     "_id": "...",
 *     "email": "user@example.com",
 *     "userTypes": ["staff", "global-admin"]
 *   }
 * }
 * ```
 * 
 * AFTER (proposed):
 * ```json
 * {
 *   "user": {
 *     "_id": "...",
 *     "email": "user@example.com",
 *     "userTypes": [
 *       { "_id": "staff", "displayAs": "Staff" },
 *       { "_id": "global-admin", "displayAs": "System Admin" }
 *     ]
 *   }
 * }
 * ```
 */

/**
 * Full Login Response Example
 */
export interface LoginResponse {
  success: boolean;
  user: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    /** 
     * Array of UserType objects (NEW FORMAT)
     * Previously: string[]
     * Now: UserTypeObject[]
     */
    userTypes: UserTypeObject[];
    defaultDashboard: 'learner' | 'staff' | 'admin';
  };
  roleHierarchy: RoleHierarchy;
  accessToken: string;
  refreshToken: string;
}

/**
 * Me Endpoint Response Example
 */
export interface MeResponse {
  success: boolean;
  user: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    /** 
     * Array of UserType objects (NEW FORMAT)
     */
    userTypes: UserTypeObject[];
    defaultDashboard: 'learner' | 'staff' | 'admin';
  };
  roleHierarchy: RoleHierarchy;
}

// ============================================================================
// ROLE HIERARCHY (for context - not changing)
// ============================================================================

/**
 * RoleHierarchy - Returned alongside userTypes
 * 
 * Note: Roles are department-scoped and come from departmentMemberships.
 * This is separate from userTypes which are global.
 */
export interface RoleHierarchy {
  /** Global roles (usually system-admin level) */
  globalRoles: RoleAssignment[];
  
  /** Staff department memberships with roles */
  staffDepartments?: DepartmentRoleGroup[];
  
  /** Learner department memberships with roles */
  learnerDepartments?: DepartmentRoleGroup[];
  
  /** GlobalAdmin role memberships (Master Department only) */
  globalAdminRoles?: RoleAssignment[];
  
  /** Flattened list of all permissions */
  allPermissions: string[];
}

export interface RoleAssignment {
  role: string;
  displayName: string;
  permissions: string[];
}

export interface DepartmentRoleGroup {
  departmentId: string;
  departmentName: string;
  isPrimary?: boolean;
  roles: RoleAssignment[];
}

// ============================================================================
// ARCHITECTURE CLARIFICATION
// ============================================================================

/**
 * IMPORTANT: UserTypes vs Roles vs DepartmentMemberships
 * 
 * 1. UserTypes (User.userTypes)
 *    - Scope: GLOBAL (entire system)
 *    - Purpose: Determines which dashboards/features user can access
 *    - Values: 'learner', 'staff', 'global-admin'
 *    - Storage: On User model
 *    - NOT department-dependent
 * 
 * 2. Roles (*.departmentMemberships[].roles)
 *    - Scope: DEPARTMENT-SCOPED
 *    - Purpose: Determines specific permissions within a department
 *    - Storage: On Staff/Learner/GlobalAdmin models
 *    - Examples: 'instructor', 'course-taker', 'system-admin'
 * 
 * 3. DepartmentMemberships
 *    - Links a user to a department with specific role(s)
 *    - Staff → departmentMemberships[] with staff roles
 *    - Learner → departmentMemberships[] with learner roles
 *    - GlobalAdmin → roleMemberships[] with global-admin roles
 * 
 * RELATIONSHIP:
 * 
 *   User.userTypes: ['staff', 'global-admin']
 *        ↓
 *   Staff.departmentMemberships:
 *     [{ departmentId: 'dept-A', roles: ['instructor'] }]
 *        ↓
 *   GlobalAdmin.roleMemberships:
 *     [{ departmentId: MASTER_DEPT, roles: ['system-admin'] }]
 * 
 * The userType tells you WHAT they are (staff/learner/global-admin).
 * The departmentMemberships tell you WHAT THEY CAN DO (roles) and WHERE (department).
 */

// ============================================================================
// AFFECTED ENDPOINTS
// ============================================================================

/**
 * Endpoints that return userTypes and will be updated:
 * 
 * 1. POST /api/v2/auth/login
 *    - Returns: LoginResponse with userTypes as UserTypeObject[]
 * 
 * 2. GET /api/v2/auth/me
 *    - Returns: MeResponse with userTypes as UserTypeObject[]
 * 
 * 3. POST /api/v2/auth/refresh (if it returns user data)
 *    - Returns: Updated token + user with userTypes as UserTypeObject[]
 */

// ============================================================================
// MIGRATION NOTES FOR API CONSUMERS
// ============================================================================

/**
 * For frontend/API consumers migrating to new format:
 * 
 * BEFORE:
 * ```javascript
 * const isStaff = user.userTypes.includes('staff');
 * const displayLabel = user.userTypes[0]; // 'staff' - needs manual mapping
 * ```
 * 
 * AFTER:
 * ```javascript
 * const isStaff = user.userTypes.some(ut => ut._id === 'staff');
 * const displayLabel = user.userTypes[0].displayAs; // 'Staff' - ready for display
 * ```
 */

// ============================================================================
// STORAGE NOTE
// ============================================================================

/**
 * DATABASE STORAGE UNCHANGED
 * 
 * The database continues to store userTypes as string[]:
 * 
 * MongoDB:
 * ```json
 * {
 *   "_id": ObjectId("..."),
 *   "userTypes": ["staff", "global-admin"]
 * }
 * ```
 * 
 * The transformation to UserTypeObject[] happens at API response time only.
 * This maintains backward compatibility with existing data and internal logic.
 */

export default {
  USER_TYPE_DISPLAY_MAP
};
