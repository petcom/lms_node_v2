# Role System Architecture Plan V2 - GNAP Compatible
**Version:** 2.1
**Date:** 2026-01-10
**Status:** Ready for Implementation
**Scope:** Backend Database Schemas, API Endpoints, GNAP-Compatible Authorization

---

## Related Documents

| Document | Location | Purpose |
|----------|----------|---------|
| UI Role System Contracts | `contracts/UI_ROLE_SYSTEM_CONTRACTS.md` | Complete UI team reference |
| Auth V2 Contracts | `contracts/api/auth-v2.contract.ts` | Auth endpoint contracts |
| Roles Contracts | `contracts/api/roles.contract.ts` | Role/access rights contracts |
| Endpoint Authorization | `devdocs/Endpoint_Role_Authorization.md` | API endpoint→role mapping |
| Q&A Reference | `devdocs/Role_System_Clarification_Questions.md` | Decision history |

---

## Executive Summary

This document supersedes `Role_System_API_Model_Plan.md` and incorporates all clarifications and decisions from the Q&A process. Key changes from V1:

1. **Removed all "global" role fields** from User, Staff, and Learner models
2. **New GlobalAdmin model** for admin dashboard access with escalation password
3. **Unified departmentMemberships** schema for Learner and Staff
4. **GNAP-compatible access rights** structure for future SSO integration
5. **Master department** concept for GlobalAdmin roles
6. **Bearer tokens** with upgrade path to DPoP

---

## Table of Contents

1. [Core Concepts](#1-core-concepts)
2. [UserTypes and Dashboards](#2-usertypes-and-dashboards)
3. [Role Definitions by UserType](#3-role-definitions-by-usertype)
4. [Database Schema - Models](#4-database-schema---models)
5. [GNAP-Compatible Access Rights](#5-gnap-compatible-access-rights)
6. [Authentication Flow](#6-authentication-flow)
7. [Department Scoping Logic](#7-department-scoping-logic)
8. [API Endpoints](#8-api-endpoints)
9. [Implementation Phases](#9-implementation-phases)

---

## 1. Core Concepts

### Terminology

| Term | Definition |
|------|------------|
| **UserType** | Category of user determining dashboard access: `learner`, `staff`, `global-admin` |
| **Role** | Specific capability within a userType, always department-scoped |
| **Department** | Organizational unit containing courses, classes, and users |
| **Master Department** | Special system department (ID: `000000000000000000000001`) for GlobalAdmin role assignments |
| **Access Right** | Granular permission string following `{domain}:{resource}:{action}` pattern |
| **Escalation** | Process of entering admin password to access Admin Dashboard |
| **Class** | Group of courses held for a cohort during a specific timeframe (e.g., "Fall 2027 Semester") |
| **Program** | Sequence of courses required for certification, license, or degree |
| **Cohort** | Group of learners participating in a class together |

### Key Principles

1. **UserType determines dashboard** - learner→Learner, staff/global-admin→Staff (with admin escalation)
2. **Roles are always department-scoped** - no "global roles" except through master department
3. **Sum of roles = sum of permissions** - having multiple roles grants combined access
4. **Backend is source of truth** - UI checks are for UX, backend validates everything
5. **GNAP-ready** - structures support future SSO/OAuth3 integration

---

## 2. UserTypes and Dashboards

### UserType Enum

```typescript
type UserType = 'learner' | 'staff' | 'global-admin';
```

### Dashboard Routing Logic

```typescript
function determineDefaultDashboard(userTypes: UserType[]): DashboardType {
  // Learner-only users go to Learner Dashboard
  if (userTypes.length === 1 && userTypes[0] === 'learner') {
    return 'learner';
  }
  // Everyone else (staff, global-admin, or combinations) goes to Staff Dashboard
  return 'staff';
}

type DashboardType = 'learner' | 'staff';
// Note: Admin Dashboard is accessed via escalation from Staff Dashboard
```

### Dashboard Features

| Dashboard | Access Condition | Features |
|-----------|-----------------|----------|
| **Learner** | userType includes 'learner' only | My courses, progress, grades, certificates |
| **Staff** | userType includes 'staff' or 'global-admin' | Department management, teaching, content |
| **Admin** | userType includes 'global-admin' + escalation | System settings, global reporting, user management |

### Escalation to Admin Dashboard

1. User must have `global-admin` userType
2. "Login as Admin" button visible on Staff Dashboard
3. Requires separate escalation password entry
4. Admin session times out after 15 minutes of inactivity (configurable)
5. On timeout, redirects to Staff Dashboard (not login)

---

## 3. Role Definitions by UserType

### Learner Roles (Department-Scoped)

| Role Name | Display Name | Description |
|-----------|-------------|-------------|
| `course-taker` | Course Taker | Standard learner who enrolls in and completes courses |
| `auditor` | Auditor | View-only access, cannot earn credit or complete exams |
| `learner-supervisor` | Learner Supervisor | Elevated permissions for TAs, peer mentors |

```typescript
const LEARNER_ROLES = ['course-taker', 'auditor', 'learner-supervisor'] as const;
type LearnerRole = typeof LEARNER_ROLES[number];
```

### Staff Roles (Department-Scoped)

| Role Name | Display Name | Description |
|-----------|-------------|-------------|
| `instructor` | Instructor | Teaches classes, grades student work |
| `department-admin` | Department Administrator | Manages department operations, staff, settings |
| `content-admin` | Content Administrator | Creates and manages courses, programs |
| `billing-admin` | Billing Administrator | Department-level billing operations |

```typescript
const STAFF_ROLES = ['instructor', 'department-admin', 'content-admin', 'billing-admin'] as const;
type StaffRole = typeof STAFF_ROLES[number];
```

### GlobalAdmin Roles (Master Department Only)

| Role Name | Display Name | Description |
|-----------|-------------|-------------|
| `system-admin` | System Administrator | Full system access - highest privilege |
| `enrollment-admin` | Enrollment Administrator | Manages enrollment system globally |
| `course-admin` | Course Administrator | Manages course system globally |
| `theme-admin` | Theme Administrator | Manages themes, branding, UI |
| `financial-admin` | Financial Administrator | System-wide financial operations |

```typescript
const GLOBAL_ADMIN_ROLES = [
  'system-admin',
  'enrollment-admin', 
  'course-admin',
  'theme-admin',
  'financial-admin'
] as const;
type GlobalAdminRole = typeof GLOBAL_ADMIN_ROLES[number];
```

---

## 4. Database Schema - Models

### 4.1 User Model (Updated)

```typescript
/**
 * User Model - Authentication and basic identity
 * CHANGES FROM V1:
 * - Removed: globalRoles field
 * - Added: lastSelectedDepartment for UI state
 */
interface IUser {
  _id: ObjectId;
  email: string;
  password: string;
  
  /** Array of userTypes this user has */
  userTypes: UserType[];
  
  /** Which dashboard to load by default */
  defaultDashboard: 'learner' | 'staff';
  
  /** Last selected department (for UI state persistence) */
  lastSelectedDepartment?: ObjectId;
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
    required: true,
    select: false
  },
  userTypes: {
    type: [String],
    enum: ['learner', 'staff', 'global-admin'],
    default: ['learner'],
    validate: {
      validator: (v: string[]) => v.length > 0,
      message: 'User must have at least one userType'
    }
  },
  defaultDashboard: {
    type: String,
    enum: ['learner', 'staff'],
    default: 'learner'
  },
  lastSelectedDepartment: {
    type: Schema.Types.ObjectId,
    ref: 'Department'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Pre-save: Calculate defaultDashboard
UserSchema.pre('save', function(next) {
  if (this.isModified('userTypes') || this.isNew) {
    const hasOnlyLearner = this.userTypes.length === 1 && this.userTypes[0] === 'learner';
    this.defaultDashboard = hasOnlyLearner ? 'learner' : 'staff';
  }
  next();
});
```

### 4.2 DepartmentMembership Schema (Shared)

```typescript
/**
 * Unified DepartmentMembership schema
 * Used by: Staff, Learner
 * Same structure for consistency
 */
interface IDepartmentMembership {
  departmentId: ObjectId;
  roles: string[];        // Role names valid for that model's userType
  isPrimary: boolean;     // Primary department for this user
  joinedAt: Date;
  isActive: boolean;
}

const DepartmentMembershipSchema = new Schema({
  departmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  roles: {
    type: [String],
    required: true,
    validate: {
      validator: (v: string[]) => v.length > 0,
      message: 'At least one role is required'
    }
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
}, { _id: false });
```

### 4.3 Staff Model (Updated)

```typescript
/**
 * Staff Model - Staff-specific data
 * CHANGES FROM V1:
 * - Removed: globalStaffRoles field
 * - Uses unified DepartmentMembership schema
 */
interface IStaff {
  _id: ObjectId;  // Same as User._id
  firstName: string;
  lastName: string;
  title?: string;
  
  /** Department-scoped roles */
  departmentMemberships: IDepartmentMembership[];
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  departmentMemberships: {
    type: [DepartmentMembershipSchema],
    validate: {
      validator: function(memberships: IDepartmentMembership[]) {
        // Validate role names against STAFF_ROLES
        const validRoles = new Set(STAFF_ROLES);
        return memberships.every(m => 
          m.roles.every(r => validRoles.has(r))
        );
      },
      message: 'Invalid staff role'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for efficient queries
StaffSchema.index({ 'departmentMemberships.departmentId': 1 });
StaffSchema.index({ 'departmentMemberships.roles': 1 });
```

### 4.4 Learner Model (Updated)

```typescript
/**
 * Learner Model - Learner-specific data
 * CHANGES FROM V1:
 * - Renamed: departmentEnrollments → departmentMemberships
 * - Removed: globalLearnerRole field
 * - Uses unified DepartmentMembership schema
 */
interface ILearner {
  _id: ObjectId;  // Same as User._id
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  address?: IAddress;
  emergencyContact?: IEmergencyContact;
  
  /** Department-scoped roles */
  departmentMemberships: IDepartmentMembership[];
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  address: AddressSchema,
  emergencyContact: EmergencyContactSchema,
  departmentMemberships: {
    type: [DepartmentMembershipSchema],
    validate: {
      validator: function(memberships: IDepartmentMembership[]) {
        // Validate role names against LEARNER_ROLES
        const validRoles = new Set(LEARNER_ROLES);
        return memberships.every(m => 
          m.roles.every(r => validRoles.has(r))
        );
      },
      message: 'Invalid learner role'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for efficient queries
LearnerSchema.index({ 'departmentMemberships.departmentId': 1 });
```

### 4.5 GlobalAdmin Model (NEW)

```typescript
/**
 * GlobalAdmin Model - NEW
 * Separate model for admin dashboard access
 * Uses roleMemberships in master department only
 */
interface IGlobalAdmin {
  _id: ObjectId;  // Same as User._id
  
  /** Escalation password (separate from login password) */
  escalationPassword: string;
  
  /** Role memberships (always in master department) */
  roleMemberships: IRoleMembership[];
  
  /** Last time admin escalated to admin dashboard */
  lastEscalation?: Date;
  
  /** Admin session timeout in minutes (default: 15) */
  sessionTimeout: number;
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface IRoleMembership {
  departmentId: ObjectId;  // Always master department
  roles: GlobalAdminRole[];
  assignedAt: Date;
  assignedBy: ObjectId;  // User who assigned these roles
  isActive: boolean;
}

const RoleMembershipSchema = new Schema({
  departmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  roles: {
    type: [String],
    enum: GLOBAL_ADMIN_ROLES,
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const GlobalAdminSchema = new Schema<IGlobalAdmin>({
  _id: {
    type: Schema.Types.ObjectId,
    required: true
  },
  escalationPassword: {
    type: String,
    required: true,
    select: false
  },
  roleMemberships: {
    type: [RoleMembershipSchema],
    required: true,
    validate: {
      validator: function(memberships: IRoleMembership[]) {
        // All memberships must be in master department
        const masterId = MASTER_DEPARTMENT_ID.toString();
        return memberships.every(m => 
          m.departmentId.toString() === masterId
        );
      },
      message: 'GlobalAdmin roles must be in master department'
    }
  },
  lastEscalation: Date,
  sessionTimeout: {
    type: Number,
    default: 15,  // 15 minutes
    min: 5,
    max: 60
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });
```

### 4.6 Master Department (Special)

```typescript
/**
 * Master Department Constants
 * This is a protected system department for GlobalAdmin roles
 */
export const MASTER_DEPARTMENT_ID = new Types.ObjectId('000000000000000000000001');
export const MASTER_DEPARTMENT_NAME = 'System Administration';

/**
 * Master Department Document (seeded on installation)
 */
const masterDepartment = {
  _id: MASTER_DEPARTMENT_ID,
  name: MASTER_DEPARTMENT_NAME,
  slug: 'master',
  description: 'System administration department for global admin roles',
  isSystem: true,        // Cannot be deleted
  isVisible: false,      // Hidden from normal department lists
  parentDepartmentId: null,
  isActive: true
};
```

### 4.7 RoleDefinition Model (NEW)

```typescript
/**
 * RoleDefinition - Database-stored role definitions
 * Allows dynamic role management while maintaining code defaults
 */
interface IRoleDefinition {
  _id: ObjectId;
  
  /** Role identifier (e.g., 'instructor', 'content-admin') */
  name: string;
  
  /** Which userType this role belongs to */
  userType: UserType;
  
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
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleDefinitionSchema = new Schema<IRoleDefinition>({
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  userType: {
    type: String,
    enum: ['learner', 'staff', 'global-admin'],
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: String,
  accessRights: {
    type: [String],
    default: []
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for efficient queries
RoleDefinitionSchema.index({ userType: 1, isActive: 1 });
RoleDefinitionSchema.index({ name: 1 }, { unique: true });
```

### 4.8 AccessRight Model (NEW - GNAP Compatible)

```typescript
/**
 * AccessRight - GNAP-compatible access rights store
 * These are the granular permissions that roles grant
 */
interface IAccessRight {
  _id: ObjectId;
  
  /** Access right identifier (e.g., 'content:courses:read') */
  name: string;
  
  /** Domain grouping (e.g., 'content', 'enrollment', 'system') */
  domain: string;
  
  /** Resource within domain (e.g., 'courses', 'programs') */
  resource: string;
  
  /** Action on resource (e.g., 'read', 'create', 'update', 'delete') */
  action: string;
  
  /** Human-readable description */
  description: string;
  
  /** Is this a sensitive right (FERPA, billing)? */
  isSensitive: boolean;
  
  /** Category for sensitive rights */
  sensitiveCategory?: 'ferpa' | 'billing' | 'pii' | 'audit';
  
  isActive: boolean;
}

const AccessRightSchema = new Schema<IAccessRight>({
  name: {
    type: String,
    required: true,
    unique: true
  },
  domain: {
    type: String,
    required: true
  },
  resource: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  description: String,
  isSensitive: {
    type: Boolean,
    default: false
  },
  sensitiveCategory: {
    type: String,
    enum: ['ferpa', 'billing', 'pii', 'audit']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Compound unique index
AccessRightSchema.index({ domain: 1, resource: 1, action: 1 }, { unique: true });
```

### 4.9 EnrollmentActivity Model (NEW)

```typescript
/**
 * EnrollmentActivity - Tracks all status changes to enrollments
 * Answers: "How are point in time changes to course enrollment tracked?"
 */
interface IEnrollmentActivity {
  _id: ObjectId;
  
  /** Reference to the enrollment */
  enrollmentId: ObjectId;
  
  /** Learner who owns the enrollment */
  learnerId: ObjectId;
  
  /** Course being enrolled in */
  courseId: ObjectId;
  
  /** Type of activity */
  activityType: EnrollmentActivityType;
  
  /** Previous status (for status changes) */
  previousStatus?: EnrollmentStatus;
  
  /** New status (for status changes) */
  newStatus?: EnrollmentStatus;
  
  /** Progress at time of activity */
  progressSnapshot?: number;
  
  /** Grade at time of activity */
  gradeSnapshot?: number;
  
  /** User who triggered the activity (null for system) */
  triggeredBy?: ObjectId;
  
  /** Additional context */
  metadata?: Record<string, any>;
  
  createdAt: Date;
}

type EnrollmentActivityType = 
  | 'enrolled'
  | 'status_changed'
  | 'progress_updated'
  | 'grade_assigned'
  | 'grade_changed'
  | 'completed'
  | 'withdrawn'
  | 'reinstated'
  | 'expired';

type EnrollmentStatus = 'pending' | 'active' | 'completed' | 'withdrawn' | 'failed' | 'expired';

const EnrollmentActivitySchema = new Schema<IEnrollmentActivity>({
  enrollmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: true
  },
  learnerId: {
    type: Schema.Types.ObjectId,
    ref: 'Learner',
    required: true
  },
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  activityType: {
    type: String,
    enum: [
      'enrolled', 'status_changed', 'progress_updated',
      'grade_assigned', 'grade_changed', 'completed',
      'withdrawn', 'reinstated', 'expired'
    ],
    required: true
  },
  previousStatus: {
    type: String,
    enum: ['pending', 'active', 'completed', 'withdrawn', 'failed', 'expired']
  },
  newStatus: {
    type: String,
    enum: ['pending', 'active', 'completed', 'withdrawn', 'failed', 'expired']
  },
  progressSnapshot: Number,
  gradeSnapshot: Number,
  triggeredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: Schema.Types.Mixed
}, { timestamps: { createdAt: true, updatedAt: false } });

// Indexes for efficient queries
EnrollmentActivitySchema.index({ enrollmentId: 1, createdAt: -1 });
EnrollmentActivitySchema.index({ learnerId: 1, createdAt: -1 });
EnrollmentActivitySchema.index({ courseId: 1, activityType: 1 });
```

### 4.10 ClassEnrollment Model (NEW)

```typescript
/**
 * ClassEnrollment - Enrollment in a Class (cohort of courses)
 * A Class is a "defined group of courses" held during a "specific period"
 */
interface IClassEnrollment {
  _id: ObjectId;
  
  /** Reference to the Class */
  classId: ObjectId;
  
  /** Learner enrolled */
  learnerId: ObjectId;
  
  /** Status of this class enrollment */
  status: 'pending' | 'active' | 'completed' | 'withdrawn';
  
  /** Enrollment date */
  enrolledAt: Date;
  
  /** When the class period started for this learner */
  periodStartDate?: Date;
  
  /** When the class period ends for this learner */
  periodEndDate?: Date;
  
  /** Overall progress across all courses in the class */
  overallProgress: number;
  
  /** Completed date */
  completedAt?: Date;
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClassEnrollmentSchema = new Schema<IClassEnrollment>({
  classId: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  learnerId: {
    type: Schema.Types.ObjectId,
    ref: 'Learner',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'withdrawn'],
    default: 'pending'
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  periodStartDate: Date,
  periodEndDate: Date,
  overallProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  completedAt: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Compound unique index
ClassEnrollmentSchema.index({ classId: 1, learnerId: 1 }, { unique: true });
```

---

## 5. GNAP-Compatible Access Rights

### 5.1 Access Right Naming Convention

```
{domain}:{resource}:{action}
```

**Domains:**
- `content` - Courses, programs, lessons, SCORM
- `enrollment` - Enrollments, class enrollments
- `staff` - Staff management
- `learner` - Learner management
- `reports` - Analytics and reporting
- `system` - System settings and configuration
- `billing` - Financial operations

**Actions:**
- `read` / `view` - Read access
- `create` - Create new records
- `update` / `edit` - Modify existing records
- `delete` - Remove records
- `manage` - Full CRUD operations
- `export` - Export data

### 5.2 Access Rights by Role

```typescript
const ROLE_ACCESS_RIGHTS: Record<string, string[]> = {
  // Learner Roles
  'course-taker': [
    'content:courses:read',
    'content:lessons:read',
    'content:exams:attempt',
    'enrollment:own:read',
    'enrollment:own:update',
    'learner:profile:read',
    'learner:profile:update',
    'learner:progress:read',
    'learner:certificates:read',
    'learner:certificates:download'
  ],
  
  'auditor': [
    'content:courses:read',
    'content:lessons:read',
    'learner:profile:read'
  ],
  
  'learner-supervisor': [
    'content:courses:read',
    'content:lessons:read',
    'content:exams:attempt',
    'enrollment:own:read',
    'enrollment:department:read',
    'learner:profile:read',
    'learner:department:read',
    'reports:department-progress:read'
  ],
  
  // Staff Roles
  'instructor': [
    'content:courses:read',
    'content:lessons:read',
    'content:classes:read',
    'content:classes:manage-own',
    'enrollment:department:read',
    'learner:department:read',
    'reports:class:read',
    'reports:class:export',
    'grades:department:read',
    'grades:own-classes:manage'
  ],
  
  'content-admin': [
    'content:courses:manage',
    'content:programs:manage',
    'content:lessons:manage',
    'content:exams:manage',
    'content:scorm:manage',
    'reports:content:read'
  ],
  
  'department-admin': [
    'content:courses:read',
    'content:classes:manage',
    'staff:department:manage',
    'learner:department:manage',
    'enrollment:department:manage',
    'reports:department:read',
    'reports:department:export',
    'settings:department:manage'
  ],
  
  'billing-admin': [
    'billing:department:read',
    'billing:department:manage',
    'billing:invoices:manage',
    'billing:payments:read',
    'reports:billing-department:read'
  ],
  
  // GlobalAdmin Roles
  'system-admin': [
    'system:*',  // Wildcard - all system access
    'content:*',
    'enrollment:*',
    'staff:*',
    'learner:*',
    'reports:*',
    'billing:*',
    'audit:*'
  ],
  
  'enrollment-admin': [
    'enrollment:system:manage',
    'enrollment:bulk:manage',
    'enrollment:policies:manage',
    'reports:enrollment:read'
  ],
  
  'course-admin': [
    'content:system:manage',
    'content:templates:manage',
    'content:categories:manage',
    'reports:content-system:read'
  ],
  
  'theme-admin': [
    'system:themes:manage',
    'system:branding:manage',
    'system:emails:manage'
  ],
  
  'financial-admin': [
    'billing:system:manage',
    'billing:policies:manage',
    'billing:reports:read',
    'billing:refunds:manage',
    'reports:financial:read',
    'reports:financial:export'
  ]
};
```

### 5.3 Sensitive Access Rights (FERPA/Billing)

```typescript
const SENSITIVE_ACCESS_RIGHTS = {
  ferpa: [
    'learner:pii:read',
    'learner:grades:read',
    'learner:transcripts:read',
    'learner:transcripts:export',
    'reports:learner-detail:read'
  ],
  
  billing: [
    'billing:payments:read',
    'billing:payments:process',
    'billing:refunds:manage',
    'billing:financial-reports:read',
    'billing:financial-reports:export'
  ],
  
  pii: [
    'learner:contact:read',
    'learner:emergency:read',
    'staff:contact:read',
    'reports:pii:export'
  ],
  
  audit: [
    'audit:logs:read',
    'audit:logs:export',
    'audit:security:read'
  ]
};
```

---

## 6. Authentication Flow

### 6.1 Login Flow

```typescript
/**
 * POST /api/v1/auth/login
 * Returns access token with access rights
 */
interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  
  user: {
    id: string;
    email: string;
    userTypes: UserType[];
    defaultDashboard: 'learner' | 'staff';
    lastSelectedDepartment?: string;
  };
  
  // GNAP-compatible access rights
  accessRights: string[];
  
  // Department-specific rights (for multi-department users)
  departmentRights: {
    [departmentId: string]: {
      departmentName: string;
      roles: string[];
      accessRights: string[];
    };
  };
  
  // Does user have admin escalation capability?
  canEscalateToAdmin: boolean;
}
```

### 6.2 Admin Escalation Flow

```typescript
/**
 * POST /api/v1/auth/escalate
 * Escalate to admin dashboard
 */
interface EscalateRequest {
  escalationPassword: string;
}

interface EscalateResponse {
  adminToken: string;        // Separate token for admin session
  expiresIn: number;         // Timeout in seconds (default 15min)
  
  adminRoles: string[];      // GlobalAdmin roles
  adminAccessRights: string[]; // Admin-level access rights
}

/**
 * Admin session validation
 * - adminToken is separate from accessToken
 * - Stored in memory only (not localStorage)
 * - Validated on every admin API call
 * - Auto-expires after sessionTimeout
 */
```

### 6.3 Department Switch Flow

```typescript
/**
 * POST /api/v1/auth/switch-department
 * Switch current department context
 */
interface SwitchDepartmentRequest {
  departmentId: string;
}

interface SwitchDepartmentResponse {
  departmentId: string;
  departmentName: string;
  roles: string[];
  accessRights: string[];
  
  // Child departments (if role cascades)
  childDepartments?: Array<{
    id: string;
    name: string;
    roles: string[];
  }>;
}

/**
 * This endpoint also updates User.lastSelectedDepartment
 */
```

---

## 7. Department Scoping Logic

### 7.1 Role Cascading to Subdepartments

```typescript
/**
 * When checking permissions for a department:
 * 1. Check if user has direct membership in that department
 * 2. If not, check if any parent department grants cascading access
 */
async function getRolesForDepartment(
  userId: ObjectId,
  departmentId: ObjectId,
  userType: 'learner' | 'staff'
): Promise<string[]> {
  const model = userType === 'staff' ? Staff : Learner;
  const record = await model.findById(userId);
  
  if (!record) return [];
  
  // Direct membership
  const directMembership = record.departmentMemberships.find(
    m => m.departmentId.equals(departmentId) && m.isActive
  );
  
  if (directMembership) {
    return directMembership.roles;
  }
  
  // Check parent departments
  const department = await Department.findById(departmentId)
    .populate('parentDepartmentId');
    
  if (department?.parentDepartmentId) {
    // Check if role cascading is enabled for parent
    const parent = department.parentDepartmentId;
    if (!parent.requireExplicitMembership) {
      // Recursively check parent
      return getRolesForDepartment(userId, parent._id, userType);
    }
  }
  
  return [];
}
```

### 7.2 Department Visibility

```typescript
/**
 * Get all departments visible to a user
 * Includes departments where they have membership + child departments
 */
async function getVisibleDepartments(
  userId: ObjectId,
  userType: 'learner' | 'staff'
): Promise<DepartmentWithRoles[]> {
  const model = userType === 'staff' ? Staff : Learner;
  const record = await model.findById(userId)
    .populate('departmentMemberships.departmentId');
    
  if (!record) return [];
  
  const visible: DepartmentWithRoles[] = [];
  
  for (const membership of record.departmentMemberships) {
    if (!membership.isActive) continue;
    
    const dept = membership.departmentId;
    
    // Add the department
    visible.push({
      id: dept._id,
      name: dept.name,
      roles: membership.roles,
      isPrimary: membership.isPrimary,
      level: 0,
      children: []
    });
    
    // Add child departments
    const children = await Department.find({
      parentDepartmentId: dept._id,
      isActive: true,
      isVisible: true
    });
    
    for (const child of children) {
      visible.push({
        id: child._id,
        name: child.name,
        roles: membership.roles,  // Cascaded roles
        isPrimary: false,
        level: 1,
        parentId: dept._id
      });
    }
  }
  
  return visible;
}
```

---

## 8. API Endpoints

### 8.1 Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | Login, get tokens + access rights | No |
| POST | `/auth/refresh` | Refresh access token | Refresh token |
| POST | `/auth/logout` | Invalidate tokens | Yes |
| POST | `/auth/escalate` | Escalate to admin dashboard | Yes + escalation password |
| POST | `/auth/switch-department` | Switch department context | Yes |
| GET | `/auth/me` | Get current user + access rights | Yes |

### 8.2 Role Management Endpoints

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/roles` | List all role definitions | Any authenticated |
| GET | `/roles/:name` | Get role definition | Any authenticated |
| GET | `/roles/user-type/:type` | Get roles for userType | Any authenticated |
| PUT | `/roles/:name` | Update role access rights | system-admin |

### 8.3 Access Rights Endpoints

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/access-rights` | List all access rights | Any authenticated |
| GET | `/access-rights/domain/:domain` | Get rights by domain | Any authenticated |
| GET | `/access-rights/role/:roleName` | Get rights for role | Any authenticated |

---

## 9. Implementation Phases

### Phase 1: Core Models (Week 1)
- [ ] Create GlobalAdmin model
- [ ] Create RoleDefinition model
- [ ] Create AccessRight model
- [ ] Update User model (remove globalRoles, add lastSelectedDepartment)
- [ ] Update Staff model (remove globalStaffRoles)
- [ ] Update Learner model (rename to departmentMemberships)
- [ ] Create seed-admin.ts script
- [ ] Create master department on init

### Phase 2: Enrollment Tracking (Week 1)
- [ ] Create EnrollmentActivity model
- [ ] Create ClassEnrollment model
- [ ] Add activity logging to Enrollment model hooks

### Phase 3: Authentication Updates (Week 2)
- [ ] Update login to return access rights
- [ ] Implement escalation endpoint
- [ ] Implement department switch endpoint
- [ ] Update auth middleware for access right checks

### Phase 4: Role Management (Week 2)
- [ ] Seed RoleDefinition collection
- [ ] Seed AccessRight collection
- [ ] Create role management endpoints
- [ ] Create access rights endpoints

### Phase 5: Testing & Validation (Week 3)
- [ ] Unit tests for all new models
- [ ] Integration tests for auth flows
- [ ] Test escalation flow
- [ ] Test department switching
- [ ] Test role cascading

### Phase 6: Documentation (Week 3)
- [ ] Update API documentation
- [ ] Create Endpoint_Role_Authorization.md
- [ ] Update UI Authorization Recommendations

---

## Appendix A: Migration from V1

```typescript
/**
 * Migration script to update from V1 to V2 structure
 */
async function migrateToV2() {
  console.log('Starting V2 migration...');
  
  // 1. Update Users - remove globalRoles
  await User.updateMany(
    {},
    {
      $unset: { globalRoles: '' },
      $set: { lastSelectedDepartment: null }
    }
  );
  console.log('✓ Users updated');
  
  // 2. Update Staff - remove globalStaffRoles
  await Staff.updateMany(
    {},
    { $unset: { globalStaffRoles: '' } }
  );
  console.log('✓ Staff updated');
  
  // 3. Update Learners - rename departmentEnrollments to departmentMemberships
  const learners = await Learner.find({});
  for (const learner of learners) {
    if (learner.departmentEnrollments) {
      // Convert to new format
      const memberships = learner.departmentEnrollments.map(e => ({
        departmentId: e.departmentId,
        roles: [e.role], // Single role to array
        isPrimary: false,
        joinedAt: e.enrolledAt,
        isActive: e.isActive
      }));
      
      await Learner.updateOne(
        { _id: learner._id },
        {
          $set: { departmentMemberships: memberships },
          $unset: { departmentEnrollments: '', globalLearnerRole: '' }
        }
      );
    }
  }
  console.log('✓ Learners updated');
  
  // 4. Create GlobalAdmin records for system-admin users
  const admins = await User.find({ userTypes: 'system-admin' });
  for (const admin of admins) {
    // Update userType
    await User.updateOne(
      { _id: admin._id },
      {
        $set: {
          userTypes: admin.userTypes.map(t => 
            t === 'system-admin' ? 'global-admin' : t
          )
        }
      }
    );
    
    // Create GlobalAdmin record (password needs to be set manually)
    await GlobalAdmin.create({
      _id: admin._id,
      escalationPassword: 'CHANGE_ME', // Placeholder - must be reset
      roleMemberships: [{
        departmentId: MASTER_DEPARTMENT_ID,
        roles: ['system-admin'],
        assignedAt: new Date(),
        isActive: true
      }],
      sessionTimeout: 15
    });
  }
  console.log('✓ GlobalAdmin records created');
  
  // 5. Seed RoleDefinitions and AccessRights
  await seedRoleDefinitions();
  await seedAccessRights();
  console.log('✓ Role definitions and access rights seeded');
  
  console.log('Migration complete!');
}
```

---

## Appendix B: Seed Data Scripts

See separate files:
- `scripts/seed-admin.ts` - Create initial admin user and master department
- `scripts/seed-roles.ts` - Seed RoleDefinition collection
- `scripts/seed-access-rights.ts` - Seed AccessRight collection

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-10 | Initial plan |
| 2.0 | 2026-01-10 | Complete rewrite with GNAP compatibility, clarification answers || 2.1 | 2026-01-10 | Added Class vs Program hierarchy (Option C), financial-admin role clarification, related documents section |

---

## Appendix C: Class vs Program Hierarchy (Option C)

Based on Q14.1, the system uses **parallel structures** for Programs and Classes:

```
┌──────────────────────────────────────────────────────────────┐
│                    PROGRAM (Certification Path)              │
│                                                              │
│  Purpose: Sequence of courses for certification/degree       │
│  Example: "LCSW Certification Program"                       │
│                                                              │
│  Contains:                                                   │
│  ├── Course: "Clinical Social Work Foundations"              │
│  ├── Course: "Trauma-Informed Care"                          │
│  ├── Course: "Ethics in Social Work"                         │
│  └── Course: "Supervised Clinical Practice"                  │
│                                                              │
│  Completion: All courses done → Certificate/License issued   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    CLASS (Cohort/Timeframe)                  │
│                                                              │
│  Purpose: Group of courses for a cohort during timeframe     │
│  Example: "Fall 2027 CBT Cohort"                             │
│                                                              │
│  Contains (same courses, different context):                 │
│  ├── Course: "Clinical Social Work Foundations"              │
│  ├── Course: "Trauma-Informed Care"                          │
│  └── Course: "Ethics in Social Work"                         │
│                                                              │
│  Timeframe: September 2027 - December 2027                   │
│  Cohort: 25 learners studying together                       │
│  Use Case: Collaboration, study groups, synchronized pacing  │
└──────────────────────────────────────────────────────────────┘
```

### Key Differences

| Aspect | Program | Class |
|--------|---------|-------|
| **Purpose** | Certification/degree requirements | Cohort-based learning |
| **Timeframe** | Open-ended (complete at your pace) | Fixed dates (semester, quarter) |
| **Enrollment** | Individual learner enrolls | Cohort enrolls together |
| **Completion** | All courses done = certificate | Period ends = class complete |
| **Collaboration** | Optional | Core feature (study groups, forums) |

### Database Relationships

```typescript
// A Course can be part of multiple Programs AND multiple Classes
Course {
  _id: ObjectId;
  title: string;
  // ... course content
}

// Program: Certification path
Program {
  _id: ObjectId;
  name: string;                    // "LCSW Certification Program"
  courses: ObjectId[];             // List of required courses
  completionRequirements: {};      // Rules for certification
  // ...
}

// Class: Cohort learning experience
Class {
  _id: ObjectId;
  name: string;                    // "Fall 2027 CBT Cohort"
  courses: ObjectId[];             // List of courses for this class
  startDate: Date;                 // September 1, 2027
  endDate: Date;                   // December 15, 2027
  departmentId: ObjectId;          // Owning department
  maxEnrollment?: number;          // Optional capacity
  // ...
}

// ClassEnrollment: Learner enrolled in a Class
ClassEnrollment {
  _id: ObjectId;
  classId: ObjectId;               // Reference to Class
  learnerId: ObjectId;             // Reference to Learner
  status: 'pending' | 'active' | 'completed' | 'withdrawn';
  enrolledAt: Date;
  overallProgress: number;         // 0-100 across all courses
  // ...
}
```

### Use Case Example

> Dr. Smith creates the "Fall 2027 LCSW Prep Class" containing 3 courses from the LCSW Program.
> 25 learners enroll in this class and work through the courses together from Sept-Dec 2027.
> They use class forums to discuss concepts, form study groups, and attend synchronous sessions.
> After completing the class, they still need to complete the remaining Program courses 
> (individually, at their own pace) to earn their LCSW certification.