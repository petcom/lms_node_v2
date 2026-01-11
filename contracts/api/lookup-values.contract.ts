/**
 * LookupValues API Contract
 * 
 * Version: 1.0.0
 * Date: 2026-01-11
 * Status: APPROVED
 * 
 * This contract defines the centralized lookup/constants system for the LMS.
 * LookupValues stores all enumerated values with hierarchical parent-child relationships.
 * 
 * KEY CONCEPTS:
 * - `lookupId`: Unique identifier in format "category.key" (e.g., "userType.staff")
 * - `parentLookupId`: References parent's lookupId for hierarchy (e.g., roles reference their userType)
 * - `category`: Groups related lookups ("userType", "role")
 * - `key`: The actual value stored in documents (e.g., "staff", "instructor")
 * - `displayAs`: Human-readable label for UI (e.g., "Staff", "Instructor")
 * 
 * HIERARCHY:
 * - userType.learner (root)
 *     └── role.course-taker (parentLookupId: 'userType.learner')
 *     └── role.auditor (parentLookupId: 'userType.learner')
 * - userType.staff (root)
 *     └── role.instructor (parentLookupId: 'userType.staff')
 *     └── role.department-admin (parentLookupId: 'userType.staff')
 * - userType.global-admin (root)
 *     └── role.system-admin (parentLookupId: 'userType.global-admin')
 */

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * LookupValue - Single lookup entry
 */
export interface LookupValue {
  /** MongoDB ObjectId */
  _id: string;
  
  /** 
   * Unique identifier in format "category.key"
   * @example "userType.staff", "role.instructor"
   */
  lookupId: string;
  
  /**
   * Category grouping for the lookup
   * @example "userType", "role"
   */
  category: 'userType' | 'role' | string;
  
  /**
   * The actual value stored in documents
   * @example "staff", "instructor", "course-taker"
   */
  key: string;
  
  /**
   * Parent lookup reference for hierarchical relationships
   * null for root-level lookups (userTypes)
   * @example "userType.staff" for staff roles
   */
  parentLookupId: string | null;
  
  /**
   * Human-readable display label for UI
   * This is the en-US default value
   * @example "Staff", "Instructor", "Course Taker"
   */
  displayAs: string;
  
  /**
   * Optional description
   */
  description?: string;
  
  /**
   * Order for UI display
   */
  sortOrder: number;
  
  /**
   * Whether this lookup is active
   */
  isActive: boolean;
  
  /**
   * Optional metadata
   */
  metadata?: {
    /** Is this the default value for its category? */
    isDefault?: boolean;
    /** Icon identifier for UI */
    icon?: string;
    /** Color for UI badges */
    color?: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

/**
 * UserType object format for API responses
 * This replaces string[] userTypes with object[]
 */
export interface UserTypeObject {
  /**
   * The userType key (matches LookupValue.key)
   */
  _id: 'learner' | 'staff' | 'global-admin';
  
  /**
   * Human-readable display label (from LookupValue.displayAs)
   */
  displayAs: string;
}

/**
 * Role object format for department memberships
 */
export interface RoleObject {
  /**
   * The role key (matches LookupValue.key)
   */
  _id: string;
  
  /**
   * Human-readable display label (from LookupValue.displayAs)
   */
  displayAs: string;
}

// ============================================================================
// LOOKUP DATA - SOURCE OF TRUTH
// ============================================================================

/**
 * All valid UserTypes
 */
export const USER_TYPES = ['learner', 'staff', 'global-admin'] as const;
export type UserTypeKey = typeof USER_TYPES[number];

/**
 * Staff Roles - valid for userType: staff
 */
export const STAFF_ROLES = ['instructor', 'department-admin', 'content-admin', 'billing-admin'] as const;
export type StaffRoleKey = typeof STAFF_ROLES[number];

/**
 * Learner Roles - valid for userType: learner
 */
export const LEARNER_ROLES = ['course-taker', 'auditor', 'learner-supervisor'] as const;
export type LearnerRoleKey = typeof LEARNER_ROLES[number];

/**
 * GlobalAdmin Roles - valid for userType: global-admin
 */
export const GLOBAL_ADMIN_ROLES = ['system-admin', 'enrollment-admin', 'course-admin', 'theme-admin', 'financial-admin'] as const;
export type GlobalAdminRoleKey = typeof GLOBAL_ADMIN_ROLES[number];

/**
 * All valid roles (union)
 */
export type RoleKey = StaffRoleKey | LearnerRoleKey | GlobalAdminRoleKey;

/**
 * Display value mapping for UserTypes
 */
export const USER_TYPE_DISPLAY: Record<UserTypeKey, string> = {
  'learner': 'Learner',
  'staff': 'Staff',
  'global-admin': 'System Admin',
};

/**
 * Display value mapping for all Roles
 */
export const ROLE_DISPLAY: Record<RoleKey, string> = {
  // Staff Roles
  'instructor': 'Instructor',
  'department-admin': 'Department Admin',
  'content-admin': 'Content Admin',
  'billing-admin': 'Billing Admin',
  // Learner Roles
  'course-taker': 'Course Taker',
  'auditor': 'Auditor',
  'learner-supervisor': 'Learner Supervisor',
  // GlobalAdmin Roles
  'system-admin': 'System Admin',
  'enrollment-admin': 'Enrollment Admin',
  'course-admin': 'Course Admin',
  'theme-admin': 'Theme Admin',
  'financial-admin': 'Financial Admin',
};

/**
 * Mapping from userType to valid roles
 */
export const ROLES_BY_USER_TYPE: Record<UserTypeKey, readonly string[]> = {
  'learner': LEARNER_ROLES,
  'staff': STAFF_ROLES,
  'global-admin': GLOBAL_ADMIN_ROLES,
};

// ============================================================================
// API CONTRACTS
// ============================================================================

export const LookupValuesContract = {
  resource: 'lookup-values',
  version: '1.0.0',
  basePath: '/api/v2/lookup-values',

  // =========================================================================
  // LIST LOOKUP VALUES
  // =========================================================================
  
  /**
   * Get lookup values by category
   * GET /api/v2/lookup-values?category=userType
   * GET /api/v2/lookup-values?parentLookupId=userType.staff
   */
  list: {
    endpoint: '/api/v2/lookup-values',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List lookup values with optional filtering',
    auth: 'required',
    
    request: {
      query: {
        category: { type: 'string', required: false, description: 'Filter by category' },
        parentLookupId: { type: 'string', required: false, description: 'Filter by parent lookup' },
        isActive: { type: 'boolean', required: false, default: true, description: 'Filter by active status' },
      }
    },
    
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: 'LookupValue[]',
          count: 'number'
        }
      }
    },
    
    examples: {
      getAllUserTypes: {
        request: { query: { category: 'userType' } },
        response: {
          success: true,
          data: [
            { _id: '...', lookupId: 'userType.learner', category: 'userType', key: 'learner', parentLookupId: null, displayAs: 'Learner', sortOrder: 1, isActive: true },
            { _id: '...', lookupId: 'userType.staff', category: 'userType', key: 'staff', parentLookupId: null, displayAs: 'Staff', sortOrder: 2, isActive: true },
            { _id: '...', lookupId: 'userType.global-admin', category: 'userType', key: 'global-admin', parentLookupId: null, displayAs: 'System Admin', sortOrder: 3, isActive: true },
          ],
          count: 3
        }
      },
      getStaffRoles: {
        request: { query: { parentLookupId: 'userType.staff' } },
        response: {
          success: true,
          data: [
            { _id: '...', lookupId: 'role.instructor', category: 'role', key: 'instructor', parentLookupId: 'userType.staff', displayAs: 'Instructor', sortOrder: 1, isActive: true },
            { _id: '...', lookupId: 'role.department-admin', category: 'role', key: 'department-admin', parentLookupId: 'userType.staff', displayAs: 'Department Admin', sortOrder: 2, isActive: true },
            { _id: '...', lookupId: 'role.content-admin', category: 'role', key: 'content-admin', parentLookupId: 'userType.staff', displayAs: 'Content Admin', sortOrder: 3, isActive: true },
            { _id: '...', lookupId: 'role.billing-admin', category: 'role', key: 'billing-admin', parentLookupId: 'userType.staff', displayAs: 'Billing Admin', sortOrder: 4, isActive: true },
          ],
          count: 4
        }
      }
    }
  },

  // =========================================================================
  // GET SINGLE LOOKUP
  // =========================================================================
  
  /**
   * Get single lookup value by lookupId
   * GET /api/v2/lookup-values/:lookupId
   */
  getByLookupId: {
    endpoint: '/api/v2/lookup-values/:lookupId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get a single lookup value by its lookupId',
    auth: 'required',
    
    request: {
      params: {
        lookupId: { type: 'string', required: true, description: 'The unique lookupId' }
      }
    },
    
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: 'LookupValue'
        }
      },
      errors: [
        { status: 404, code: 'NOT_FOUND', message: 'Lookup value not found' }
      ]
    }
  },

  // =========================================================================
  // LISTS ENDPOINTS (CONVENIENCE)
  // =========================================================================
  
  /**
   * Get all user types
   * GET /api/v2/lists/user-types
   */
  listUserTypes: {
    endpoint: '/api/v2/lists/user-types',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get all active user types as UserTypeObject[]',
    auth: 'optional',
    
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: 'UserTypeObject[]'
        }
      }
    },
    
    example: {
      response: {
        success: true,
        data: [
          { _id: 'learner', displayAs: 'Learner' },
          { _id: 'staff', displayAs: 'Staff' },
          { _id: 'global-admin', displayAs: 'System Admin' },
        ]
      }
    }
  },

  /**
   * Get roles for a specific user type
   * GET /api/v2/lists/roles/:userType
   */
  listRolesForUserType: {
    endpoint: '/api/v2/lists/roles/:userType',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get all valid roles for a specific user type',
    auth: 'required',
    
    request: {
      params: {
        userType: { type: 'string', required: true, enum: ['learner', 'staff', 'global-admin'] }
      }
    },
    
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: 'RoleObject[]'
        }
      },
      errors: [
        { status: 400, code: 'INVALID_USER_TYPE', message: 'Invalid user type' }
      ]
    },
    
    examples: {
      staffRoles: {
        request: { params: { userType: 'staff' } },
        response: {
          success: true,
          data: [
            { _id: 'instructor', displayAs: 'Instructor' },
            { _id: 'department-admin', displayAs: 'Department Admin' },
            { _id: 'content-admin', displayAs: 'Content Admin' },
            { _id: 'billing-admin', displayAs: 'Billing Admin' },
          ]
        }
      }
    }
  }
};

// ============================================================================
// HELPER TYPES FOR UI
// ============================================================================

/**
 * Response type for GET /api/v2/lookup-values
 */
export interface LookupValuesListResponse {
  success: boolean;
  data: LookupValue[];
  count: number;
}

/**
 * Response type for GET /api/v2/lists/user-types
 */
export interface UserTypesListResponse {
  success: boolean;
  data: UserTypeObject[];
}

/**
 * Response type for GET /api/v2/lists/roles/:userType
 */
export interface RolesListResponse {
  success: boolean;
  data: RoleObject[];
}

// ============================================================================
// VALIDATION HELPERS (for UI-side validation)
// ============================================================================

/**
 * Check if a role is valid for a given user type
 */
export function isValidRoleForUserType(userType: UserTypeKey, role: string): boolean {
  const validRoles = ROLES_BY_USER_TYPE[userType];
  return validRoles?.includes(role) ?? false;
}

/**
 * Get display value for a user type
 */
export function getUserTypeDisplay(userType: UserTypeKey): string {
  return USER_TYPE_DISPLAY[userType] ?? userType;
}

/**
 * Get display value for a role
 */
export function getRoleDisplay(role: RoleKey): string {
  return ROLE_DISPLAY[role] ?? role;
}

/**
 * Convert string userTypes to UserTypeObject[]
 */
export function toUserTypeObjects(userTypes: UserTypeKey[]): UserTypeObject[] {
  return userTypes.map(ut => ({
    _id: ut,
    displayAs: USER_TYPE_DISPLAY[ut] ?? ut
  }));
}

/**
 * Convert UserTypeObject[] back to string[]
 */
export function toUserTypeStrings(userTypeObjects: UserTypeObject[]): UserTypeKey[] {
  return userTypeObjects.map(uto => uto._id);
}
