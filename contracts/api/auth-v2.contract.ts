/**
 * Authentication API Contracts V2 - Role System Update
 * Version: 2.0.0
 *
 * BREAKING CHANGES FROM V1:
 * - Login response now returns `userTypes[]` instead of single `role`
 * - Added `departmentMemberships` to login/me responses
 * - Added `accessRights` for GNAP-compatible authorization
 * - Added escalation endpoint for Admin Dashboard access
 * - Added department switch endpoint
 * - Added token continuation endpoint for role updates
 *
 * CURRENT CHANGES (In Development):
 * - userTypes changed from string[] to UserTypeObject[]
 * - Each userType now includes displayAs for UI rendering
 * - Import UserTypeObject from lookup-values.contract.ts
 *
 * Note: No version increment as API is in pre-production development
 * 
 * KEY CONCEPTS:
 * - UserTypes determine dashboard access: learner | staff | global-admin
 * - Roles are always department-scoped
 * - Admin Dashboard requires escalation with separate password
 * - Access rights follow GNAP pattern: domain:resource:action
 */

import { DepartmentMembership, UserType, RoleSystemTypes } from './roles.contract';
import { UserTypeObject } from './lookup-values.contract';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export interface AuthSession {
  /** Access token for API calls */
  accessToken: string;
  /** Refresh token for getting new access tokens */
  refreshToken: string;
  /** Token expiration in seconds */
  expiresIn: number;
  /** Token type (always 'Bearer' for now, 'DPoP' in future) */
  tokenType: 'Bearer' | 'DPoP';
}

export interface AdminSession {
  /** Separate token for admin operations */
  adminToken: string;
  /** Admin session expiration in seconds (default 900 = 15 min) */
  expiresIn: number;
  /** Admin roles granted */
  adminRoles: string[];
  /** Admin access rights */
  adminAccessRights: string[];
}

// ============================================================================
// API CONTRACTS
// ============================================================================

export const AuthContractsV2 = {
  resource: 'auth',
  version: '2.0.0',

  // =========================================================================
  // LOGIN
  // =========================================================================

  /**
   * User Login (V2)
   * POST /api/v2/auth/login
   * 
   * CHANGES FROM V1:
   * - Returns userTypes[] instead of role
   * - Includes departmentMemberships with roles
   * - Includes accessRights for all departments
   * - Indicates if user can escalate to admin
   */
  login: {
    endpoint: '/api/v2/auth/login',
    method: 'POST' as const,
    version: '2.0.0',
    description: 'Authenticate user and receive access token with roles and access rights',
    
    request: {
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        email: { type: 'string', required: true, format: 'email' },
        password: { type: 'string', required: true }
      }
    },
    
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            user: 'AuthUser',
            session: 'AuthSession',
            
            /** Array of user's userTypes (V2.1: now includes displayAs) */
            userTypes: 'UserTypeObject[]',
            
            /** Which dashboard to load by default */
            defaultDashboard: 'learner | staff',
            
            /** Can this user access Admin Dashboard? */
            canEscalateToAdmin: 'boolean',
            
            /** Department memberships with roles and access rights */
            departmentMemberships: 'DepartmentMembership[]',
            
            /** Aggregated access rights from all departments */
            allAccessRights: 'string[]',
            
            /** Last selected department (for UI state) */
            lastSelectedDepartment: 'string | null'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        { status: 403, code: 'ACCOUNT_DISABLED', message: 'Account is disabled' }
      ]
    },
    
    example: {
      request: {
        email: 'instructor@example.com',
        password: 'SecurePass123!'
      },
      response: {
        success: true,
        data: {
          user: {
            id: '507f1f77bcf86cd799439011',
            email: 'instructor@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
            isActive: true,
            lastLogin: '2026-01-09T14:30:00.000Z',
            createdAt: '2025-06-01T00:00:00.000Z'
          },
          session: {
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            expiresIn: 3600,
            tokenType: 'Bearer'
          },
          userTypes: [
            { _id: 'staff', displayAs: 'Staff' },
            { _id: 'global-admin', displayAs: 'System Admin' }
          ],
          defaultDashboard: 'staff',
          canEscalateToAdmin: true,
          departmentMemberships: [
            {
              departmentId: '507f1f77bcf86cd799439100',
              departmentName: 'Cognitive Therapy',
              departmentSlug: 'cognitive-therapy',
              roles: ['instructor', 'content-admin'],
              accessRights: [
                'content:courses:read',
                'content:courses:manage',
                'content:lessons:manage',
                'grades:own-classes:manage'
              ],
              isPrimary: true,
              isActive: true,
              joinedAt: '2025-06-15T00:00:00.000Z',
              childDepartments: [
                {
                  departmentId: '507f1f77bcf86cd799439101',
                  departmentName: 'CBT Advanced',
                  roles: ['instructor', 'content-admin']
                }
              ]
            }
          ],
          allAccessRights: [
            'content:courses:read',
            'content:courses:manage',
            'content:lessons:manage',
            'grades:own-classes:manage'
          ],
          lastSelectedDepartment: '507f1f77bcf86cd799439100'
        }
      }
    },

    notes: `
      IMPORTANT FOR UI:
      
      1. Dashboard Routing:
         - If userTypes = ['learner'] only → show Learner Dashboard
         - Otherwise → show Staff Dashboard
      
      2. Department Selection:
         - On login, show department selector if > 1 membership
         - Load roles/rights for selected department
         - Persist lastSelectedDepartment
      
      3. Admin Access:
         - If canEscalateToAdmin = true → show "Login as Admin" button
         - Admin Dashboard requires separate escalation (see /auth/escalate)
      
      4. Access Rights Usage:
         - Use allAccessRights for "baseline" checks on login
         - When department selected, use that department's accessRights
         - Check hasAccessRight('content:courses:manage') for UI visibility
    `
  },

  // =========================================================================
  // ESCALATION (Admin Dashboard Access)
  // =========================================================================

  /**
   * Escalate to Admin Dashboard
   * POST /api/v2/auth/escalate
   * 
   * This is a NEW endpoint for V2.
   * Requires user to have 'global-admin' userType and enter escalation password.
   */
  escalate: {
    endpoint: '/api/v2/auth/escalate',
    method: 'POST' as const,
    version: '2.0.0',
    description: 'Escalate to Admin Dashboard with separate escalation password',
    
    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        escalationPassword: { type: 'string', required: true }
      }
    },
    
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            adminSession: 'AdminSession',
            
            /** Admin roles in master department */
            adminRoles: 'string[]',
            
            /** Admin access rights */
            adminAccessRights: 'string[]',
            
            /** Session timeout in minutes */
            sessionTimeoutMinutes: 'number'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 401, code: 'INVALID_ESCALATION_PASSWORD', message: 'Incorrect escalation password' },
        { status: 403, code: 'NOT_ADMIN', message: 'User does not have global-admin userType' },
        { status: 403, code: 'ADMIN_DISABLED', message: 'Admin access has been disabled' }
      ]
    },
    
    example: {
      request: {
        escalationPassword: 'AdminSecretPass123!'
      },
      response: {
        success: true,
        data: {
          adminSession: {
            adminToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin...',
            expiresIn: 900,
            adminRoles: ['system-admin'],
            adminAccessRights: ['system:*', 'content:*', 'enrollment:*']
          },
          adminRoles: ['system-admin'],
          adminAccessRights: ['system:*', 'content:*', 'enrollment:*'],
          sessionTimeoutMinutes: 15
        }
      }
    },

    notes: `
      IMPORTANT FOR UI:
      
      1. Admin Token Storage:
         - Store adminToken in memory ONLY (not localStorage/sessionStorage)
         - This prevents XSS from accessing admin privileges
      
      2. Admin Token Usage:
         - Send adminToken in X-Admin-Token header for admin API calls
         - Regular accessToken still required in Authorization header
      
      3. Session Timeout:
         - Admin session expires after sessionTimeoutMinutes of inactivity
         - Track activity and refresh timeout on user actions
         - On timeout, redirect to Staff Dashboard (not login)
      
      4. Timeout Handling:
         - Show countdown warning at 2 minutes remaining
         - On timeout: clear adminToken, hide admin UI, show "Session expired" message
    `
  },

  /**
   * De-escalate from Admin Dashboard
   * POST /api/v2/auth/deescalate
   */
  deescalate: {
    endpoint: '/api/v2/auth/deescalate',
    method: 'POST' as const,
    version: '2.0.0',
    description: 'Leave Admin Dashboard and return to Staff Dashboard',
    
    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'X-Admin-Token': '<admin-token>'
      }
    },
    
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string'
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
      ]
    },

    notes: `
      - Invalidates the admin token on the server
      - UI should clear admin token from memory
      - Redirect to Staff Dashboard
    `
  },

  // =========================================================================
  // DEPARTMENT SWITCHING
  // =========================================================================

  /**
   * Switch Department Context
   * POST /api/v2/auth/switch-department
   * 
   * This is a NEW endpoint for V2.
   * Updates the user's current department and returns department-specific roles.
   */
  switchDepartment: {
    endpoint: '/api/v2/auth/switch-department',
    method: 'POST' as const,
    version: '2.0.0',
    description: 'Switch current department context and get updated roles/rights',
    
    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        departmentId: { type: 'string', required: true }
      }
    },
    
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            /** Updated department context */
            currentDepartment: {
              departmentId: 'string',
              departmentName: 'string',
              departmentSlug: 'string',
              roles: 'string[]',
              accessRights: 'string[]'
            },
            
            /** Child departments (if role cascading enabled) */
            childDepartments: 'Array<{ departmentId, departmentName, roles }>',
            
            /** Whether roles come from direct membership or parent */
            isDirectMember: 'boolean',
            inheritedFrom: 'string | null'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'NOT_A_MEMBER', message: 'User is not a member of this department' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' }
      ]
    },

    example: {
      request: {
        departmentId: '507f1f77bcf86cd799439100'
      },
      response: {
        success: true,
        data: {
          currentDepartment: {
            departmentId: '507f1f77bcf86cd799439100',
            departmentName: 'Cognitive Therapy',
            departmentSlug: 'cognitive-therapy',
            roles: ['instructor', 'content-admin'],
            accessRights: ['content:courses:read', 'content:courses:manage', 'grades:own-classes:manage']
          },
          childDepartments: [
            {
              departmentId: '507f1f77bcf86cd799439101',
              departmentName: 'CBT Advanced',
              roles: ['instructor', 'content-admin']
            },
            {
              departmentId: '507f1f77bcf86cd799439102',
              departmentName: 'CBT Fundamentals',
              roles: ['instructor', 'content-admin']
            }
          ],
          isDirectMember: true,
          inheritedFrom: null
        }
      }
    },

    notes: `
      IMPORTANT FOR UI:
      
      1. This endpoint also updates User.lastSelectedDepartment on the server
      
      2. When department changes:
         - Update current accessRights to department-specific rights
         - Re-evaluate which UI components/links are visible
         - Gray out or hide components user doesn't have rights for
      
      3. "No Department Selected" State:
         - On first login or if removed from last department
         - Show only "global reporting items" in sidebar
         - Prompt user to select a department
      
      4. Child Departments:
         - If user has roles in parent, they cascade to children
         - Show child departments in dropdown as nested/indented
         - User can switch to child department for narrower context
    `
  },

  // =========================================================================
  // TOKEN CONTINUATION (for role updates)
  // =========================================================================

  /**
   * Continue/Refresh with Updated Access Rights
   * POST /api/v2/auth/continue
   * 
   * This is a NEW endpoint for V2 (GNAP-compatible).
   * Use when roles change mid-session to get updated access rights.
   */
  continue: {
    endpoint: '/api/v2/auth/continue',
    method: 'POST' as const,
    version: '2.0.0',
    description: 'Refresh access rights without full re-authentication (GNAP continuation)',
    
    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      }
    },
    
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            /** New access token with updated rights */
            session: 'AuthSession',
            
            /** Updated department memberships */
            departmentMemberships: 'DepartmentMembership[]',
            
            /** Updated access rights */
            allAccessRights: 'string[]',
            
            /** What changed (for debugging/logging) */
            changes: {
              rolesAdded: 'string[]',
              rolesRemoved: 'string[]',
              departmentsAdded: 'string[]',
              departmentsRemoved: 'string[]'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
      ]
    },

    notes: `
      USE CASES:
      
      1. After system-admin changes role permissions
      2. After user is added to/removed from a department
      3. After user's roles in a department change
      4. Periodic refresh to ensure token has current rights
      
      IMPLEMENTATION:
      - Call this instead of full re-login when roles change
      - Compare changes to know what to update in UI
      - This is the GNAP "continuation" pattern for access updates
    `
  },

  // =========================================================================
  // GET CURRENT USER (Updated for V2)
  // =========================================================================

  /**
   * Get Current User (V2)
   * GET /api/v2/auth/me
   * 
   * CHANGES FROM V1:
   * - Returns userTypes[] instead of role
   * - Includes full department memberships
   * - Includes access rights
   */
  me: {
    endpoint: '/api/v2/auth/me',
    method: 'GET' as const,
    version: '2.0.0',
    description: 'Get current authenticated user with roles and access rights',
    
    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      }
    },
    
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            user: 'AuthUser',
            userTypes: 'UserTypeObject[]',
            defaultDashboard: 'learner | staff',
            canEscalateToAdmin: 'boolean',
            departmentMemberships: 'DepartmentMembership[]',
            allAccessRights: 'string[]',
            lastSelectedDepartment: 'string | null',
            
            /** Is admin session currently active? */
            isAdminSessionActive: 'boolean',
            
            /** Admin session expiry (if active) */
            adminSessionExpiresAt: 'string | null'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
      ]
    },

    notes: `
      - Use this on page load to restore session state
      - Check isAdminSessionActive to know if admin UI should show
      - If adminSessionExpiresAt is near, prompt for re-escalation
    `
  },

  // =========================================================================
  // EXISTING V1 ENDPOINTS (unchanged)
  // =========================================================================

  refreshToken: {
    endpoint: '/api/v2/auth/refresh',
    method: 'POST' as const,
    version: '2.0.0',
    description: 'Get new access token using refresh token',
    notes: 'Same as V1 - no changes'
  },

  logout: {
    endpoint: '/api/v2/auth/logout',
    method: 'POST' as const,
    version: '2.0.0',
    description: 'Invalidate user session and tokens',
    notes: `
      V2 CHANGE: Also invalidates admin token if active
    `
  },

  forgotPassword: {
    endpoint: '/api/v2/auth/forgot-password',
    method: 'POST' as const,
    version: '2.0.0',
    description: 'Request password reset email',
    notes: 'Same as V1 - no changes'
  },

  resetPassword: {
    endpoint: '/api/v2/auth/reset-password',
    method: 'POST' as const,
    version: '2.0.0',
    description: 'Reset password using token from email',
    notes: 'Same as V1 - no changes'
  },

  changePassword: {
    endpoint: '/api/v2/auth/change-password',
    method: 'POST' as const,
    version: '2.0.0',
    description: 'Change password for authenticated user',
    notes: 'Same as V1 - no changes'
  },

  /**
   * Set Escalation Password (NEW)
   * POST /api/v2/auth/set-escalation-password
   * 
   * For GlobalAdmin users to set/change their escalation password.
   */
  setEscalationPassword: {
    endpoint: '/api/v2/auth/set-escalation-password',
    method: 'POST' as const,
    version: '2.0.0',
    description: 'Set or change escalation password for Admin Dashboard access',
    
    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        currentEscalationPassword: { 
          type: 'string', 
          required: false,
          description: 'Required if changing existing password, not required for first setup'
        },
        newEscalationPassword: { 
          type: 'string', 
          required: true, 
          minLength: 12,
          description: 'Must be different from login password'
        }
      }
    },
    
    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string'
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 401, code: 'INVALID_CURRENT_PASSWORD', message: 'Current escalation password is incorrect' },
        { status: 403, code: 'NOT_ADMIN', message: 'User does not have global-admin userType' },
        { status: 400, code: 'SAME_AS_LOGIN', message: 'Escalation password must be different from login password' },
        { status: 400, code: 'WEAK_PASSWORD', message: 'Escalation password does not meet complexity requirements' }
      ]
    },

    notes: `
      - Only users with 'global-admin' userType can set escalation password
      - First time setup: currentEscalationPassword not required
      - Changing: currentEscalationPassword required
      - Must be different from login password
      - Recommend: 12+ characters, mix of upper/lower/number/symbol
    `
  }
};

// ============================================================================
// UI STATE MANAGEMENT RECOMMENDATIONS
// ============================================================================

/**
 * Recommended state structure for UI applications
 */
export interface AuthState {
  // Session
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  
  // User
  user: AuthUser | null;
  userTypes: UserTypeObject[];
  defaultDashboard: 'learner' | 'staff' | null;
  
  // Department Context
  departmentMemberships: DepartmentMembership[];
  currentDepartmentId: string | null;
  currentDepartmentRoles: string[];
  currentDepartmentAccessRights: string[];
  
  // Admin Session
  canEscalateToAdmin: boolean;
  isAdminSessionActive: boolean;
  adminToken: string | null;  // MEMORY ONLY - never persist!
  adminSessionExpiresAt: Date | null;
  adminRoles: string[];
  adminAccessRights: string[];
}

/**
 * Recommended initial state
 */
export const initialAuthState: AuthState = {
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  tokenExpiresAt: null,
  
  user: null,
  userTypes: [],
  defaultDashboard: null,
  
  departmentMemberships: [],
  currentDepartmentId: null,
  currentDepartmentRoles: [],
  currentDepartmentAccessRights: [],
  
  canEscalateToAdmin: false,
  isAdminSessionActive: false,
  adminToken: null,
  adminSessionExpiresAt: null,
  adminRoles: [],
  adminAccessRights: []
};

export default AuthContractsV2;
