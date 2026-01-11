# UserType Revision Plan
**Version:** 1.0  
**Date:** 2026-01-11  
**Status:** Planning  
**Scope:** Transform userTypes from string array to object array in API responses

---

## Executive Summary

This document outlines the plan to enhance the userType response format from simple strings to objects with `_id` and `displayAs` fields. This change provides human-readable labels for UI consumption while maintaining backward compatibility in storage.

---

## 1. Current State Analysis

### 1.1 How UserTypes Are Stored

**Database Storage:** `string[]` on User model
```javascript
// In MongoDB users collection
{
  "_id": ObjectId("..."),
  "email": "user@example.com",
  "userTypes": ["staff", "global-admin"]  // Currently stored as string array
}
```

### 1.2 How UserTypes Are Defined

**Location:** `src/models/auth/role-constants.ts`
```typescript
export const USER_TYPES = ['learner', 'staff', 'global-admin'] as const;
export type UserType = typeof USER_TYPES[number];
```

### 1.3 Current API Response Format

**Login/Me Endpoints** return userTypes as string array:
```json
{
  "user": {
    "_id": "...",
    "email": "user@example.com",
    "userTypes": ["staff", "global-admin"]
  }
}
```

---

## 2. Key Architecture Understanding

### 2.1 UserTypes vs Roles vs DepartmentMemberships

| Concept | Scope | Storage Location | Purpose |
|---------|-------|------------------|---------|
| **UserType** | Global (user-level) | `User.userTypes[]` | Determines which dashboards/features a user can access |
| **Role** | Department-scoped | `*.departmentMemberships[].roles[]` | Determines specific permissions within a department |
| **DepartmentMembership** | Per-department | On Staff/Learner/GlobalAdmin models | Links user to department with role(s) |

### 2.2 Relationship Diagram

```
User
├── userTypes: ['learner', 'staff', 'global-admin']  ← GLOBAL, independent of departments
│
├── If userTypes.includes('learner'):
│   └── Learner.departmentMemberships[]
│       └── { departmentId, roles: ['course-taker' | 'auditor' | 'learner-supervisor'] }
│
├── If userTypes.includes('staff'):
│   └── Staff.departmentMemberships[]
│       └── { departmentId, roles: ['instructor', 'department-admin', 'content-admin', 'billing-admin'] }
│
└── If userTypes.includes('global-admin'):
    └── GlobalAdmin.roleMemberships[]
        └── { departmentId: MASTER_DEPT, roles: ['system-admin', 'enrollment-admin', ...] }
```

### 2.3 Key Insight

**UserTypes are NOT department-dependent.** They indicate what "type" of user someone is across the entire system. The department context only comes into play when determining which specific **roles** apply.

---

## 3. Proposed Changes

### 3.1 New UserType Object Format

**Transform from:**
```json
{
  "userTypes": ["staff", "global-admin"]
}
```

**Transform to:**
```json
{
  "userTypes": [
    { "_id": "staff", "displayAs": "Staff" },
    { "_id": "global-admin", "displayAs": "System Admin" }
  ]
}
```

### 3.2 Display Value Mapping

| `_id` (internal) | `displayAs` (UI label) |
|------------------|------------------------|
| `learner` | `Learner` |
| `staff` | `Staff` |
| `global-admin` | `System Admin` |

### 3.3 Storage vs Response

| Layer | Format |
|-------|--------|
| **Database** | `string[]` (no change) |
| **Internal Code** | `string[]` (no change) |
| **API Response** | `UserTypeObject[]` (new) |

The transformation happens at response serialization time only.

---

## 4. Implementation Plan

### 4.1 Add Display Constants to role-constants.ts

```typescript
// Add to src/models/auth/role-constants.ts

/**
 * UserType Display Names - Human-readable labels for UI
 */
export const USER_TYPE_DISPLAY: Record<UserType, string> = {
  'learner': 'Learner',
  'staff': 'Staff',
  'global-admin': 'System Admin'
} as const;

/**
 * UserType Object interface for API responses
 */
export interface UserTypeObject {
  _id: UserType;
  displayAs: string;
}

/**
 * Transform userTypes string array to UserTypeObject array
 */
export function toUserTypeObjects(userTypes: UserType[]): UserTypeObject[] {
  return userTypes.map(ut => ({
    _id: ut,
    displayAs: USER_TYPE_DISPLAY[ut]
  }));
}
```

### 4.2 Update auth.service.ts - Login Response

**File:** `src/services/auth/auth.service.ts`

Find where login response is built (around line 391) and update:
```typescript
// Before
userTypes: user.userTypes

// After
userTypes: toUserTypeObjects(user.userTypes)
```

### 4.3 Update auth.service.ts - Me Response

**File:** `src/services/auth/auth.service.ts`

Find where /me response is built (around line 593) and update similarly.

### 4.4 Update API Contract Documentation

**File:** `contracts/api/auth-v2.contract.ts`

Update the userTypes type from `string[]` to `UserTypeObject[]`.

---

## 5. Files to Modify

| File | Change |
|------|--------|
| `src/models/auth/role-constants.ts` | Add `USER_TYPE_DISPLAY`, `UserTypeObject`, `toUserTypeObjects()` |
| `src/services/auth/auth.service.ts` | Transform userTypes in login/me responses |
| `contracts/api/auth-v2.contract.ts` | Update contract documentation |
| `devdocs/API_USERTYPE_DISPLAYAS_ENHANCEMENT.md` | Mark as implemented |

---

## 6. Testing Checklist

- [ ] Login endpoint returns userTypes as objects
- [ ] Me endpoint returns userTypes as objects
- [ ] Each userType object has `_id` and `displayAs` fields
- [ ] Display values match specification
- [ ] Existing tests still pass
- [ ] Database storage unchanged (still string array)

---

## 7. Breaking Changes

This is a **breaking change** for API consumers that expect `userTypes` as a string array.

**Migration for consumers:**
```javascript
// Before
const isStaff = user.userTypes.includes('staff');

// After
const isStaff = user.userTypes.some(ut => ut._id === 'staff');
```

---

## 8. Rollback Plan

If issues arise, revert the transformation in auth.service.ts to return raw `user.userTypes` string array.

---

## Appendix: Current Model Patterns (Verified 2026-01-11)

### A.1 Role Constants (role-constants.ts)

```typescript
// Verified source: src/models/auth/role-constants.ts

export const USER_TYPES = ['learner', 'staff', 'global-admin'] as const;
export type UserType = typeof USER_TYPES[number];

export const LEARNER_ROLES = ['course-taker', 'auditor', 'learner-supervisor'] as const;
export type LearnerRole = typeof LEARNER_ROLES[number];

export const STAFF_ROLES = ['instructor', 'department-admin', 'content-admin', 'billing-admin'] as const;
export type StaffRole = typeof STAFF_ROLES[number];

export const GLOBAL_ADMIN_ROLES = [
  'system-admin', 'enrollment-admin', 'course-admin', 'theme-admin', 'financial-admin'
] as const;
export type GlobalAdminRole = typeof GLOBAL_ADMIN_ROLES[number];

export const MASTER_DEPARTMENT_ID = new Types.ObjectId('000000000000000000000001');
```

### A.2 Staff Model (Staff.model.ts)

```typescript
// Staff defines its own departmentMembershipSchema inline
// Validates roles against STAFF_ROLES constant

interface IDepartmentMembership {
  departmentId: ObjectId;
  roles: string[];          // Validated: ['instructor', 'department-admin', 'content-admin', 'billing-admin']
  isPrimary: boolean;
  joinedAt: Date;
  isActive: boolean;
}

interface IStaff {
  _id: ObjectId;            // Shared with User._id
  firstName: string;
  lastName: string;
  departmentMemberships: IDepartmentMembership[];
  isActive: boolean;
}
```

### A.3 Learner Model (Learner.model.ts)

```typescript
// Learner imports shared DepartmentMembershipSchema
// Validates roles against LEARNER_ROLES constant at model level

import { DepartmentMembershipSchema, IDepartmentMembership } from './department-membership.schema';

interface ILearner {
  _id: ObjectId;            // Shared with User._id
  firstName: string;
  lastName: string;
  departmentMemberships: IDepartmentMembership[];  // Uses shared schema
  isActive: boolean;
}

// Validation at model level:
validate: {
  validator: (memberships) => memberships.every(m =>
    m.roles.every(r => LEARNER_ROLES.includes(r))
  ),
  message: 'Invalid learner role. Must be one of: course-taker, auditor, learner-supervisor'
}
```

### A.4 GlobalAdmin Model (GlobalAdmin.model.ts)

```typescript
// GlobalAdmin uses 'roleMemberships' (not departmentMemberships)
// All memberships must be in MASTER_DEPARTMENT

interface IRoleMembership {
  departmentId: ObjectId;   // Must equal MASTER_DEPARTMENT_ID
  roles: string[];          // Validated: GLOBAL_ADMIN_ROLES enum
  assignedAt: Date;
  assignedBy?: ObjectId;
  isActive: boolean;
}

interface IGlobalAdmin {
  _id: ObjectId;            // Shared with User._id
  escalationPassword: string;
  roleMemberships: IRoleMembership[];
  lastEscalation?: Date;
  sessionTimeout: number;
  isActive: boolean;
}
```

### A.5 Shared DepartmentMembership Schema (department-membership.schema.ts)

```typescript
// Generic schema used by Learner model
// Does NOT validate role names (that's done at model level per userType)

interface IDepartmentMembership {
  departmentId: ObjectId;
  roles: string[];          // At least one required, validation at consumer level
  isPrimary: boolean;
  joinedAt: Date;
  isActive: boolean;
}
```

### A.6 Pattern Differences Summary

| Model | Schema Source | Role Validation | Property Name |
|-------|---------------|-----------------|---------------|
| Staff | Inline schema | STAFF_ROLES at schema level | `departmentMemberships` |
| Learner | Shared DepartmentMembershipSchema | LEARNER_ROLES at model level | `departmentMemberships` |
| GlobalAdmin | Inline RoleMembershipSchema | GLOBAL_ADMIN_ROLES at schema level | `roleMemberships` |

**Note:** Staff and GlobalAdmin validate roles at schema level, while Learner validates at model level.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-11 | System | Initial document |
| 1.1 | 2026-01-11 | System | Added detailed model pattern verification from source code |
