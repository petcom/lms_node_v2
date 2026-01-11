# Role System Architecture Plan - API & Database Model
**Version:** 1.0
**Date:** 2026-01-10
**Status:** Planning
**Scope:** Backend Database Schemas, API Endpoints, and Business Logic

## Executive Summary

This document covers the **backend/API changes** required for the role system redesign:
- Database schema updates (User, Staff, Learner models)
- IRole interface and role definitions
- Role Registry service
- Backend API endpoints
- Migration scripts

For frontend/UI changes, see: `Role_System_UI_Plan.md`

---

## Table of Contents

1. [IRole Interface Definition](#1-irole-interface-definition)
2. [Role Catalog by UserType](#2-role-catalog-by-usertype)
3. [Database Schema Changes](#3-database-schema-changes)
4. [Role Concatenation Function](#4-role-concatenation-function)
5. [Role Registry Service](#5-role-registry-service)
6. [Backend API Changes](#6-backend-api-changes)
7. [Migration Strategy](#7-migration-strategy)

---

## 1. IRole Interface Definition

### Core Interface

```typescript
/**
 * System-wide role definition
 * All roles in the system must conform to this interface
 */
interface IRole {
  /** Unique role identifier */
  name: string;

  /** Human-readable role name */
  displayName: string;

  /** Description of role purpose and capabilities */
  description: string;

  /** Which userTypes can have this role */
  applicableUserTypes: UserType[];

  /** Can this role be scoped to a specific entity? */
  scopeType: 'none' | 'department' | 'system-setting-group';

  /** Is this role required to have a scope? */
  requiresScope: boolean;

  /**
   * Scoping clarification:
   * - 'none': Role applies system-wide (e.g., system-admin, guest learner)
   * - 'department': Role applies per department (BOTH learner and staff roles)
   * - 'system-setting-group': Role applies to specific setting groups (system-admin subroles)
   */

  /** Permissions granted by this role */
  permissions: string[];

  /** Is this role active/available in the system? */
  isActive: boolean;

  /** Priority for defaultDashboard calculation (higher = takes precedence) */
  dashboardPriority: number;
}
```

### UserType Definition

```typescript
/**
 * Core user types in the system
 */
type UserType = 'learner' | 'staff' | 'system-admin';

/**
 * Dashboard options corresponding to userTypes
 */
type DashboardType = 'learner' | 'staff' | 'admin';

/**
 * Mapping from userType to dashboard route
 */
const USER_TYPE_DASHBOARD_MAP: Record<UserType, DashboardType> = {
  'learner': 'learner',
  'staff': 'staff',
  'system-admin': 'admin'
};
```

---

## 2. Role Catalog by UserType

### Learner Roles (Department-Scoped)

**Important:** Learner roles are assigned per department, NOT per course. One role per department applies to ALL courses in that department.

```typescript
const LEARNER_ROLES: IRole[] = [
  {
    name: 'course-taker',
    displayName: 'Course Taker',
    description: 'Standard learner who can enroll in and complete courses within a department',
    applicableUserTypes: ['learner'],
    scopeType: 'department',
    requiresScope: true,
    permissions: [
      'dashboard:view-my-courses',
      'dashboard:view-my-progress',
      'dashboard:view-my-grades',
      'dashboard:view-my-certificates',
      'course:view-department',
      'course:enroll-department',
      'lesson:view-department',
      'lesson:complete-department',
      'exam:attempt-department',
      'exam:view-results-own',
      'grade:view-own-department',
      'certificate:view-own-department',
      'certificate:download-own-department',
      'class:view-own-department',
      'class:participate-department',
      'discussion:view-department',
      'discussion:post-department'
    ],
    isActive: true,
    dashboardPriority: 10
  },
  {
    name: 'auditor',
    displayName: 'Auditor',
    description: 'Learner who can view course content but cannot earn credit or complete exams within a department',
    applicableUserTypes: ['learner'],
    scopeType: 'department',
    requiresScope: true,
    permissions: [
      'dashboard:view-my-courses',
      'course:view-department',
      'lesson:view-department',
      'class:view-own-department',
      'discussion:view-department'
    ],
    isActive: true,
    dashboardPriority: 5
  },
  {
    name: 'supervisor',
    displayName: 'Course Supervisor',
    description: 'Learner with elevated permissions to help facilitate courses within a department (e.g., TA, peer mentor)',
    applicableUserTypes: ['learner'],
    scopeType: 'department',
    requiresScope: true,
    permissions: [
      'dashboard:view-my-courses',
      'dashboard:view-my-progress',
      'dashboard:view-my-grades',
      'course:view-department',
      'course:enroll-department',
      'lesson:view-department',
      'lesson:complete-department',
      'exam:attempt-department',
      'exam:view-results-own',
      'grade:view-own-department',
      'course:view-all-enrollments-department',
      'student:view-department',
      'discussion:moderate-department',
      'discussion:pin-department',
      'grade:view-others-department',
      'report:view-course-progress-department'
    ],
    isActive: true,
    dashboardPriority: 15
  },
  {
    name: 'guest',
    displayName: 'Guest Learner',
    description: 'Limited access learner, can preview public courses only (not department-scoped)',
    applicableUserTypes: ['learner'],
    scopeType: 'none',
    requiresScope: false,
    permissions: [
      'course:view-public',
      'lesson:view-public',
      'course:preview-public'
    ],
    isActive: true,
    dashboardPriority: 1
  }
];
```

### Staff Roles (Department-Scoped)

**Important:** Staff roles are assigned independently per department. Users can have different roles in different departments, and dashboard analytics aggregate across ALL departments by default.

```typescript
const STAFF_ROLES: IRole[] = [
  {
    name: 'instructor',
    displayName: 'Instructor',
    description: 'Teaches classes and grades student work within assigned department',
    applicableUserTypes: ['staff'],
    scopeType: 'department',
    requiresScope: true,
    permissions: [
      'dashboard:view-my-classes',
      'dashboard:view-my-students',
      'dashboard:view-my-grades',
      'class:view-department',
      'class:manage-own',
      'course:view-department',
      'student:view-department',
      'grade:view-department',
      'grade:manage',
      'exam-attempt:view-department',
      'exam-attempt:grade',
      'class:edit-own',
      'class:attendance-own',
      'class:roster-own',
      'report:view-own-classes',
      'report:generate-own-classes'
    ],
    isActive: true,
    dashboardPriority: 50
  },
  {
    name: 'content-admin',
    displayName: 'Content Administrator',
    description: 'Creates and manages courses and programs within assigned department',
    applicableUserTypes: ['staff'],
    scopeType: 'department',
    requiresScope: true,
    permissions: [
      'dashboard:view-courses',
      'dashboard:view-course-analytics',
      'course:view-department',
      'course:create-department',
      'course:edit-department',
      'course:delete-department',
      'course:publish-department',
      'course-segment:manage-department',
      'lesson:manage-department',
      'exam:manage-department',
      'question:manage-department',
      'program:view-department',
      'program:create-department',
      'program:edit-department',
      'program:delete-department',
      'report:view-department-courses',
      'report:generate-department-courses',
      'analytics:view-department-courses'
    ],
    isActive: true,
    dashboardPriority: 60
  },
  {
    name: 'department-admin',
    displayName: 'Department Administrator',
    description: 'Manages all department operations including staff, classes, and reporting',
    applicableUserTypes: ['staff'],
    scopeType: 'department',
    requiresScope: true,
    permissions: [
      'dashboard:view-department-overview',
      'dashboard:view-department-analytics',
      'dashboard:view-department-staff',
      'dashboard:view-department-students',
      'class:view-department',
      'class:manage-own',
      'class:view-all-department',
      'class:create-department',
      'class:edit-all-department',
      'class:delete-department',
      'course:view-department',
      'student:view-department',
      'student:view-all-department',
      'grade:view-department',
      'grade:manage',
      'exam-attempt:view-department',
      'exam-attempt:grade',
      'department:view',
      'department:edit',
      'staff:view-department',
      'staff:assign-department',
      'staff:remove-department',
      'report:view-department-all',
      'report:generate-department-all',
      'analytics:view-department-all',
      'analytics:export-department'
    ],
    isActive: true,
    dashboardPriority: 70
  },
  {
    name: 'billing-admin',
    displayName: 'Billing Administrator',
    description: 'Manages billing and financial operations within department',
    applicableUserTypes: ['staff'],
    scopeType: 'department',
    requiresScope: true,
    permissions: [
      'dashboard:view-billing',
      'dashboard:view-financial-summary',
      'billing:view-department',
      'billing:manage-department',
      'invoice:view-department',
      'invoice:create-department',
      'invoice:edit-department',
      'invoice:send-department',
      'payment:view-department',
      'payment:process-department',
      'payment:refund-department',
      'report:view-financial-department',
      'report:generate-financial-department',
      'analytics:view-financial-department'
    ],
    isActive: true,
    dashboardPriority: 65
  },
  {
    name: 'reporting-analyst',
    displayName: 'Reporting Analyst',
    description: 'Views and generates reports across all system departments with drill-down capability',
    applicableUserTypes: ['staff'],
    scopeType: 'none',
    requiresScope: false,
    permissions: [
      'dashboard:view-all-departments',
      'dashboard:view-system-analytics',
      'report:view-all-departments',
      'report:generate-all-departments',
      'report:drill-down-department',
      'report:compare-departments',
      'analytics:view-all-departments',
      'analytics:drill-down-department',
      'analytics:compare-departments',
      'export:reports-all'
    ],
    isActive: true,
    dashboardPriority: 55
  }
];
```

### System Admin Roles (System-Wide)

```typescript
const SYSTEM_ADMIN_ROLES: IRole[] = [
  {
    name: 'system-admin',
    displayName: 'System Administrator',
    description: 'Full system access including settings and configuration',
    applicableUserTypes: ['system-admin'],
    scopeType: 'none',
    requiresScope: false,
    permissions: [
      'system:*',
      'settings:*',
      'user:*',
      'department:*',
      'audit:view',
      'audit:export'
    ],
    isActive: true,
    dashboardPriority: 100
  },
  {
    name: 'settings-admin',
    displayName: 'Settings Administrator',
    description: 'Manages specific groups of system settings',
    applicableUserTypes: ['system-admin'],
    scopeType: 'system-setting-group',
    requiresScope: true,
    permissions: [
      'settings:view',
      'settings:edit-scoped',
      'audit:view-settings'
    ],
    isActive: true,
    dashboardPriority: 90
  },
  {
    name: 'user-admin',
    displayName: 'User Administrator',
    description: 'Manages user accounts and permissions',
    applicableUserTypes: ['system-admin'],
    scopeType: 'none',
    requiresScope: false,
    permissions: [
      'user:view',
      'user:create',
      'user:edit',
      'user:deactivate',
      'role:assign',
      'audit:view-users'
    ],
    isActive: true,
    dashboardPriority: 85
  },
  {
    name: 'integration-admin',
    displayName: 'Integration Administrator',
    description: 'Manages external integrations and API access',
    applicableUserTypes: ['system-admin'],
    scopeType: 'none',
    requiresScope: false,
    permissions: [
      'integration:view',
      'integration:configure',
      'api-key:manage',
      'webhook:manage',
      'audit:view-integrations'
    ],
    isActive: true,
    dashboardPriority: 80
  }
];
```

---

## 3. Database Schema Changes

### Updated User Model

```typescript
/**
 * Enhanced User model with userTypes and defaultDashboard
 */
interface IUser {
  _id: ObjectId;
  email: string;
  password: string;

  /** Array of userTypes this user has */
  userTypes: UserType[];

  /** Which dashboard to load by default on login */
  defaultDashboard: DashboardType;

  /**
   * Global roles (typically system-admin roles)
   * Department-scoped roles live in Staff/Learner models
   */
  globalRoles: string[];

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Virtual/computed fields
  allRoles?: RoleHierarchy;  // Populated by getAllRoles() method
}

/**
 * Schema definition
 */
const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  userTypes: {
    type: [String],
    enum: ['learner', 'staff', 'system-admin'],
    default: ['learner'],
    validate: {
      validator: (v: string[]) => v.length > 0,
      message: 'User must have at least one userType'
    }
  },
  defaultDashboard: {
    type: String,
    enum: ['learner', 'staff', 'admin'],
    required: true
  },
  globalRoles: {
    type: [String],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

/**
 * Pre-save middleware to set defaultDashboard based on userTypes
 */
UserSchema.pre('save', function(next) {
  if (this.isModified('userTypes') || this.isNew) {
    this.defaultDashboard = calculateDefaultDashboard(this.userTypes);
  }
  next();
});

/**
 * Calculate defaultDashboard based on userType priority
 * Priority: system-admin (100) > staff (50-70) > learner (1-10)
 */
function calculateDefaultDashboard(userTypes: UserType[]): DashboardType {
  if (userTypes.includes('system-admin')) return 'admin';
  if (userTypes.includes('staff')) return 'staff';
  return 'learner';
}
```

### Updated Staff Model

```typescript
/**
 * Enhanced Staff model with explicit role objects
 */
interface IStaff {
  _id: ObjectId;  // Shared with User._id
  firstName: string;
  lastName: string;
  title?: string;

  /** Department-scoped roles */
  departmentMemberships: DepartmentMembership[];

  /** Global staff roles (like reporting-analyst) */
  globalStaffRoles: string[];

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Department membership with scoped roles
 */
interface DepartmentMembership {
  departmentId: ObjectId;

  /** Roles this staff member has in this department */
  roles: string[];  // e.g., ['instructor', 'content-admin']

  /** Is this their primary department? */
  isPrimary: boolean;

  /** When did they join this department? */
  joinedAt: Date;

  /** Are they currently active in this department? */
  isActive: boolean;
}

const StaffSchema = new Schema<IStaff>({
  _id: {
    type: Schema.Types.ObjectId,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  title: String,
  departmentMemberships: [{
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true
    },
    roles: {
      type: [String],
      enum: ['instructor', 'content-admin', 'department-admin', 'billing-admin'],
      required: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  globalStaffRoles: {
    type: [String],
    enum: ['reporting-analyst'],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});
```

### Updated Learner Model

```typescript
/**
 * Enhanced Learner model with department-scoped roles
 */
interface ILearner {
  _id: ObjectId;  // Shared with User._id
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  address?: Address;
  emergencyContact?: EmergencyContact;

  /** Department enrollments with roles */
  departmentEnrollments: DepartmentEnrollment[];

  /** Global learner role (typically 'guest' if any) */
  globalLearnerRole?: string;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Department enrollment with scoped role
 * Learner has ONE role per department that applies to ALL courses in that department
 */
interface DepartmentEnrollment {
  departmentId: ObjectId;

  /** Role in this department (applies to all courses within) */
  role: 'course-taker' | 'auditor' | 'supervisor';

  /** When did they enroll in this department? */
  enrolledAt: Date;

  /** Is this enrollment currently active? */
  isActive: boolean;
}

const LearnerSchema = new Schema<ILearner>({
  _id: {
    type: Schema.Types.ObjectId,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  dateOfBirth: Date,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    email: String
  },
  departmentEnrollments: [{
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true
    },
    role: {
      type: String,
      enum: ['course-taker', 'auditor', 'supervisor'],
      required: true
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  globalLearnerRole: {
    type: String,
    enum: ['guest'],
    default: undefined
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});
```

**Note on Course Enrollments:**
- Course enrollment data (status, progress, finalGrade) exists in a separate `Enrollment` collection
- The `Enrollment` collection links learner + course + class with progress tracking
- The learner's **role** comes from their department enrollment
- The learner's **progress** comes from the Enrollment record

```typescript
/**
 * Separate Enrollment collection for tracking course progress
 * This is distinct from the role (which is department-level)
 */
interface IEnrollment {
  _id: ObjectId;
  learnerId: ObjectId;  // Reference to Learner
  courseId: ObjectId;   // Reference to Course
  classId: ObjectId;    // Reference to Class (specific instance)
  departmentId: ObjectId; // Reference to Department

  /** Status of this specific course enrollment */
  status: 'active' | 'completed' | 'withdrawn';

  /** Progress percentage */
  progress: number;

  /** Final grade if completed */
  finalGrade?: number;

  enrolledAt: Date;
  completedAt?: Date;
}
```

---

## 4. Role Concatenation Function

### Implementation on User Model

```typescript
/**
 * Complete role hierarchy for a user
 */
interface RoleHierarchy {
  /** Primary userType for this user */
  primaryUserType: UserType;

  /** All userTypes */
  allUserTypes: UserType[];

  /** Default dashboard */
  defaultDashboard: DashboardType;

  /** Global roles (from User.globalRoles) */
  globalRoles: RoleAssignment[];

  /** Staff roles (from Staff model if exists) */
  staffRoles?: StaffRoleGroup;

  /** Learner roles (from Learner model if exists) */
  learnerRoles?: LearnerRoleGroup;

  /** Flattened permissions (all permissions from all roles) */
  allPermissions: string[];
}

/**
 * A single role assignment
 */
interface RoleAssignment {
  role: string;
  displayName: string;
  scopeType: IRole['scopeType'];
  scopeId?: string;  // Department ID, etc.
  scopeName?: string;  // Department name, etc.
  permissions: string[];
}

/**
 * Staff-specific role grouping
 */
interface StaffRoleGroup {
  /** Roles scoped to specific departments */
  departmentRoles: Array<{
    departmentId: string;
    departmentName: string;
    isPrimary: boolean;
    roles: RoleAssignment[];
  }>;

  /** Global staff roles (like reporting-analyst) */
  globalRoles: RoleAssignment[];
}

/**
 * Learner-specific role grouping
 */
interface LearnerRoleGroup {
  /** Roles scoped to specific departments */
  departmentRoles: Array<{
    departmentId: string;
    departmentName: string;
    role: RoleAssignment;  // Single role per department
  }>;

  /** Global learner role (like guest) */
  globalRole?: RoleAssignment;
}

/**
 * Method to get complete role hierarchy
 * This is added to the User model as an instance method
 */
UserSchema.methods.getAllRoles = async function(): Promise<RoleHierarchy> {
  const user = this as IUser;

  // Initialize hierarchy
  const hierarchy: RoleHierarchy = {
    primaryUserType: user.userTypes[0],
    allUserTypes: [...user.userTypes],
    defaultDashboard: user.defaultDashboard,
    globalRoles: [],
    allPermissions: []
  };

  // 1. Process global roles from User model
  for (const roleName of user.globalRoles) {
    const roleDefinition = await RoleRegistry.getRole(roleName);
    if (roleDefinition) {
      hierarchy.globalRoles.push({
        role: roleName,
        displayName: roleDefinition.displayName,
        scopeType: 'none',
        permissions: roleDefinition.permissions
      });
      hierarchy.allPermissions.push(...roleDefinition.permissions);
    }
  }

  // 2. Process Staff roles if user is staff
  if (user.userTypes.includes('staff')) {
    const staff = await Staff.findById(user._id).populate('departmentMemberships.departmentId');
    if (staff) {
      hierarchy.staffRoles = {
        departmentRoles: [],
        globalRoles: []
      };

      // Department-scoped roles
      for (const membership of staff.departmentMemberships) {
        if (!membership.isActive) continue;

        const deptRoles: RoleAssignment[] = [];
        for (const roleName of membership.roles) {
          const roleDefinition = await RoleRegistry.getRole(roleName);
          if (roleDefinition) {
            deptRoles.push({
              role: roleName,
              displayName: roleDefinition.displayName,
              scopeType: 'department',
              scopeId: membership.departmentId.toString(),
              scopeName: membership.departmentId.name,
              permissions: roleDefinition.permissions
            });
            hierarchy.allPermissions.push(...roleDefinition.permissions);
          }
        }

        hierarchy.staffRoles.departmentRoles.push({
          departmentId: membership.departmentId._id.toString(),
          departmentName: membership.departmentId.name,
          isPrimary: membership.isPrimary,
          roles: deptRoles
        });
      }

      // Global staff roles
      for (const roleName of staff.globalStaffRoles) {
        const roleDefinition = await RoleRegistry.getRole(roleName);
        if (roleDefinition) {
          hierarchy.staffRoles.globalRoles.push({
            role: roleName,
            displayName: roleDefinition.displayName,
            scopeType: 'none',
            permissions: roleDefinition.permissions
          });
          hierarchy.allPermissions.push(...roleDefinition.permissions);
        }
      }
    }
  }

  // 3. Process Learner roles if user is learner
  if (user.userTypes.includes('learner')) {
    const learner = await Learner.findById(user._id).populate('departmentEnrollments.departmentId');
    if (learner) {
      hierarchy.learnerRoles = {
        departmentRoles: []
      };

      // Department-scoped roles
      for (const enrollment of learner.departmentEnrollments) {
        if (!enrollment.isActive) continue;

        const roleDefinition = await RoleRegistry.getRole(enrollment.role);
        if (roleDefinition) {
          const departmentRole: RoleAssignment = {
            role: enrollment.role,
            displayName: roleDefinition.displayName,
            scopeType: 'department',
            scopeId: enrollment.departmentId._id.toString(),
            scopeName: enrollment.departmentId.name,
            permissions: roleDefinition.permissions
          };

          hierarchy.learnerRoles.departmentRoles.push({
            departmentId: departmentRole.scopeId!,
            departmentName: departmentRole.scopeName!,
            role: departmentRole
          });

          hierarchy.allPermissions.push(...roleDefinition.permissions);
        }
      }

      // Global learner role
      if (learner.globalLearnerRole) {
        const roleDefinition = await RoleRegistry.getRole(learner.globalLearnerRole);
        if (roleDefinition) {
          hierarchy.learnerRoles.globalRole = {
            role: learner.globalLearnerRole,
            displayName: roleDefinition.displayName,
            scopeType: 'none',
            permissions: roleDefinition.permissions
          };
          hierarchy.allPermissions.push(...roleDefinition.permissions);
        }
      }
    }
  }

  // 4. Deduplicate permissions
  hierarchy.allPermissions = [...new Set(hierarchy.allPermissions)];

  return hierarchy;
};

/**
 * Helper method to check if user has a specific permission
 * Optionally scoped to a specific entity
 */
UserSchema.methods.hasPermission = async function(
  permission: string,
  scope?: { type: 'department'; id: string }
): Promise<boolean> {
  const hierarchy = await this.getAllRoles();

  // Check for wildcard permission (system-admin)
  if (hierarchy.allPermissions.includes('system:*')) {
    return true;
  }

  // If no scope specified, check if permission exists anywhere
  if (!scope) {
    return hierarchy.allPermissions.includes(permission);
  }

  // Check department-scoped permissions (both staff and learner roles use departments)
  if (scope.type === 'department') {
    // Check staff roles
    if (hierarchy.staffRoles) {
      for (const deptGroup of hierarchy.staffRoles.departmentRoles) {
        if (deptGroup.departmentId === scope.id) {
          const hasPermission = deptGroup.roles.some(r =>
            r.permissions.includes(permission)
          );
          if (hasPermission) return true;
        }
      }
    }

    // Check learner roles
    if (hierarchy.learnerRoles) {
      for (const deptGroup of hierarchy.learnerRoles.departmentRoles) {
        if (deptGroup.departmentId === scope.id) {
          const hasPermission = deptGroup.role.permissions.includes(permission);
          if (hasPermission) return true;
        }
      }
    }
  }

  return false;
};
```

---

## 5. Role Registry Service

```typescript
/**
 * Centralized registry for all role definitions
 * Provides access to IRole interface data
 */
class RoleRegistryService {
  private roles: Map<string, IRole> = new Map();

  constructor() {
    this.initializeRoles();
  }

  /**
   * Load all role definitions
   */
  private initializeRoles(): void {
    // Load learner roles
    for (const role of LEARNER_ROLES) {
      this.roles.set(role.name, role);
    }

    // Load staff roles
    for (const role of STAFF_ROLES) {
      this.roles.set(role.name, role);
    }

    // Load system admin roles
    for (const role of SYSTEM_ADMIN_ROLES) {
      this.roles.set(role.name, role);
    }
  }

  /**
   * Get role definition by name
   */
  async getRole(roleName: string): Promise<IRole | null> {
    return this.roles.get(roleName) || null;
  }

  /**
   * Get all roles for a specific userType
   */
  async getRolesByUserType(userType: UserType): Promise<IRole[]> {
    return Array.from(this.roles.values()).filter(role =>
      role.applicableUserTypes.includes(userType)
    );
  }

  /**
   * Get all available roles
   */
  async getAllRoles(): Promise<IRole[]> {
    return Array.from(this.roles.values());
  }

  /**
   * Check if a role exists
   */
  async roleExists(roleName: string): Promise<boolean> {
    return this.roles.has(roleName);
  }

  /**
   * Get roles that require a specific scope type
   */
  async getRolesByScopeType(scopeType: IRole['scopeType']): Promise<IRole[]> {
    return Array.from(this.roles.values()).filter(role =>
      role.scopeType === scopeType
    );
  }
}

export const RoleRegistry = new RoleRegistryService();
```

---

## 6. Backend API Changes

### Enhanced Login Endpoint

```typescript
/**
 * POST /api/v1/auth/login
 * Enhanced to return roleHierarchy
 */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ email, isActive: true });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Get complete role hierarchy
  const roleHierarchy = await user.getAllRoles();

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Return enhanced user data
  res.json({
    accessToken,
    refreshToken,
    user: {
      _id: user._id,
      email: user.email,
      userTypes: user.userTypes,
      defaultDashboard: user.defaultDashboard
    },
    roleHierarchy
  });
};
```

### New Role Info Endpoints

```typescript
/**
 * GET /api/v1/roles
 * Get all available role definitions
 */
export const getRoles = async (req: Request, res: Response) => {
  const roles = await RoleRegistry.getAllRoles();
  res.json({ roles });
};

/**
 * GET /api/v1/roles/:roleName
 * Get specific role definition
 */
export const getRole = async (req: Request, res: Response) => {
  const { roleName } = req.params;
  const role = await RoleRegistry.getRole(roleName);

  if (!role) {
    return res.status(404).json({ message: 'Role not found' });
  }

  res.json({ role });
};

/**
 * GET /api/v1/roles/user-type/:userType
 * Get all roles available for a userType
 */
export const getRolesByUserType = async (req: Request, res: Response) => {
  const { userType } = req.params;

  if (!['learner', 'staff', 'system-admin'].includes(userType)) {
    return res.status(400).json({ message: 'Invalid userType' });
  }

  const roles = await RoleRegistry.getRolesByUserType(userType as UserType);
  res.json({ roles });
};
```

### Enhanced User Profile Endpoint

```typescript
/**
 * GET /api/v1/users/me
 * Get current user with complete role hierarchy
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  const userId = req.user._id;  // From auth middleware

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const roleHierarchy = await user.getAllRoles();

  res.json({
    user: {
      _id: user._id,
      email: user.email,
      userTypes: user.userTypes,
      defaultDashboard: user.defaultDashboard
    },
    roleHierarchy
  });
};
```

---

## 7. Migration Strategy

### Phase 1: Database Migration (Week 1)

**Migration Script:**

```typescript
/**
 * Migration: Add userTypes and defaultDashboard to existing users
 */
async function migrateUsers() {
  const users = await User.find({});

  for (const user of users) {
    // Determine userTypes based on existing profiles
    const userTypes: UserType[] = [];

    const staff = await Staff.findById(user._id);
    const learner = await Learner.findById(user._id);

    if (staff && staff.isActive) {
      userTypes.push('staff');
    }

    if (learner && learner.isActive) {
      userTypes.push('learner');
    }

    // Check for system-admin role in existing roles
    if (user.roles?.includes('system-admin')) {
      userTypes.push('system-admin');
    }

    // Default to learner if no types found
    if (userTypes.length === 0) {
      userTypes.push('learner');
    }

    // Calculate defaultDashboard
    const defaultDashboard = calculateDefaultDashboard(userTypes);

    // Rename roles to globalRoles and filter out non-global roles
    const globalRoles = user.roles?.filter(r =>
      ['system-admin', 'user-admin', 'integration-admin', 'settings-admin'].includes(r)
    ) || [];

    // Update user
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          userTypes,
          defaultDashboard,
          globalRoles
        },
        $unset: {
          roles: ''
        }
      }
    );

    console.log(`Migrated user ${user.email}: types=${userTypes.join(',')}, dashboard=${defaultDashboard}`);
  }
}

/**
 * Migration: Update Staff model with new structure
 */
async function migrateStaff() {
  const staffMembers = await Staff.find({});

  for (const staff of staffMembers) {
    // departmentMemberships already exists, just add joinedAt if missing
    const updatedMemberships = staff.departmentMemberships.map(m => ({
      ...m,
      joinedAt: m.joinedAt || new Date(),
      isActive: m.isActive !== undefined ? m.isActive : true
    }));

    await Staff.updateOne(
      { _id: staff._id },
      {
        $set: {
          departmentMemberships: updatedMemberships,
          globalStaffRoles: []
        }
      }
    );
  }
}

/**
 * Migration: Update Learner model with departmentEnrollments
 */
async function migrateLearners() {
  const learners = await Learner.find({});

  for (const learner of learners) {
    // Get all course enrollments
    const enrollments = await Enrollment.find({ learnerId: learner._id });

    // Group by department
    const departmentMap = new Map<string, Date>();

    for (const enrollment of enrollments) {
      const course = await Course.findById(enrollment.courseId);
      if (course) {
        const deptId = course.departmentId.toString();
        const earliestDate = departmentMap.get(deptId);

        if (!earliestDate || enrollment.enrolledAt < earliestDate) {
          departmentMap.set(deptId, enrollment.enrolledAt);
        }
      }
    }

    // Create department enrollments (default all to course-taker)
    const departmentEnrollments = Array.from(departmentMap.entries()).map(([deptId, enrolledAt]) => ({
      departmentId: deptId,
      role: 'course-taker',
      enrolledAt,
      isActive: true
    }));

    await Learner.updateOne(
      { _id: learner._id },
      {
        $set: {
          departmentEnrollments
        }
      }
    );
  }
}

/**
 * Run all migrations
 */
async function runMigrations() {
  console.log('Starting migrations...');

  await migrateUsers();
  console.log('✓ Users migrated');

  await migrateStaff();
  console.log('✓ Staff migrated');

  await migrateLearners();
  console.log('✓ Learners migrated');

  console.log('All migrations complete!');
}
```

### Phase 2: Rollback Plan

```typescript
/**
 * Rollback: Revert User model changes
 */
async function rollbackUsers() {
  const users = await User.find({});

  for (const user of users) {
    // Convert globalRoles back to roles
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          roles: user.globalRoles || []
        },
        $unset: {
          userTypes: '',
          defaultDashboard: '',
          globalRoles: ''
        }
      }
    );
  }
}
```

---

## Implementation Checklist

### Database Layer
- [ ] Update User model schema
- [ ] Update Staff model schema
- [ ] Update Learner model schema
- [ ] Create Enrollment collection (if not exists)
- [ ] Create migration script for existing users
- [ ] Test migration on copy of production data
- [ ] Create rollback script
- [ ] Run migration on development database
- [ ] Validate migrated data

### Backend Services
- [ ] Define all IRole objects (Learner, Staff, System-Admin)
- [ ] Implement RoleRegistry service
- [ ] Add getAllRoles() method to User model
- [ ] Add hasPermission() method to User model
- [ ] Update login endpoint to return roleHierarchy
- [ ] Add role info endpoints (/api/v1/roles/*)
- [ ] Update token refresh endpoint
- [ ] Update auth middleware to use permissions

### Testing
- [ ] Unit tests for RoleRegistry
- [ ] Unit tests for getAllRoles()
- [ ] Unit tests for hasPermission()
- [ ] Integration tests for login flow
- [ ] Integration tests for permission checks
- [ ] Test migration scripts
- [ ] Test rollback scripts

### Documentation
- [ ] Update API documentation
- [ ] Document permission naming conventions
- [ ] Create database schema documentation
- [ ] Create migration runbook

---

## Estimated Timeline

- **Week 1**: Database schema design and migration scripts
- **Week 2**: RoleRegistry and User model methods
- **Week 3**: API endpoint updates and testing
- **Week 4**: Migration execution and validation

**Total**: 4 weeks for backend implementation
