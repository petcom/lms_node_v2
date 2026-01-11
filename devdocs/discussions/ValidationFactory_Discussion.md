# UserType & Validation Factory Implementation Plan
**Version:** 2.0  
**Date:** 2026-01-11  
**Status:** Planning - Schema Finalized  
**Scope:** Implement UserType object transformation + Role Validation Factory pattern + LookupValues collection

---

## Executive Summary

This document provides a comprehensive implementation plan for two related changes:

1. **UserType Object Transformation**: Change `userTypes` from `string[]` to `{ _id: string, displayAs: string }[]` in API responses
2. **Role Validation Factory**: Implement a consistent factory pattern for validating department membership roles

Both changes aim to improve consistency, reduce duplication, and provide a cleaner API contract.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Target State Design](#2-target-state-design)
3. [Implementation Tasks](#3-implementation-tasks)
4. [File Changes Matrix](#4-file-changes-matrix)
5. [Questions for Review](#5-questions-for-review)
6. [Risk Assessment](#6-risk-assessment)
7. [Testing Strategy](#7-testing-strategy)
8. [Migration Steps](#8-migration-steps)
9. [LookupValues Collection Design (FINALIZED)](#9-lookupvalues-collection-design-finalized)
10. [Follow-Up Question Answers](#10-follow-up-question-answers)
11. [Answer Summary (All Questions)](#11-answer-summary-all-questions)
12. [Revised Implementation Tasks](#12-revised-implementation-tasks)
13. [New File: LookupValue.model.ts](#13-new-file-lookupvaluemodelts)
14. [New File: constants.seed.ts](#14-new-file-constantsseedts-excerpt)

---

## 1. Current State Analysis

### 1.1 UserType Definition Locations (DUPLICATION EXISTS)

| Location | Definition | Used By |
|----------|------------|---------|
| `src/models/auth/User.model.ts:5` | `export type UserType = 'learner' \| 'staff' \| 'global-admin'` | User model, middlewares |
| `src/models/auth/role-constants.ts:22` | `export const USER_TYPES = ['learner', 'staff', 'global-admin'] as const` | Staff, Learner, GlobalAdmin models |
| `src/models/RoleDefinition.model.ts:18` | `export const USER_TYPES = ['learner', 'staff', 'global-admin'] as const` | RoleDefinition model |

**Issue:** Three separate definitions of the same constants.

### 1.2 Role Definition Locations (DUPLICATION EXISTS)

| Location | Definition |
|----------|------------|
| `src/models/auth/role-constants.ts:34` | `LEARNER_ROLES = ['course-taker', 'auditor', 'learner-supervisor']` |
| `src/models/auth/role-constants.ts:47` | `STAFF_ROLES = ['instructor', 'department-admin', 'content-admin', 'billing-admin']` |
| `src/models/auth/role-constants.ts:59-64` | `GLOBAL_ADMIN_ROLES = ['system-admin', 'enrollment-admin', ...]` |
| `src/models/RoleDefinition.model.ts:21-23` | Same arrays duplicated |
| `roledefinitions` collection | Database records with same values |

**Issue:** Three sources of truth - two code files and one database.

### 1.3 Current UserType Storage & Response

**Storage (User model):**
```typescript
// User.model.ts
userTypes: {
  type: [String],
  enum: ['learner', 'staff', 'global-admin'],
  default: ['learner']
}
```

**API Response (auth.service.ts lines 391, 593):**
```typescript
userTypes: user.userTypes  // Returns: ['staff', 'global-admin']
```

### 1.4 Current DepartmentMembership Validation

| Model | Validation Method | Valid Roles Source |
|-------|-------------------|-------------------|
| Staff | Inline schema validator (lines 36-45) | `STAFF_ROLES` from role-constants.ts |
| Learner | Model-level validator (lines 65-74) | `LEARNER_ROLES` from role-constants.ts |
| GlobalAdmin | Inline schema validator | `GLOBAL_ADMIN_ROLES` from role-constants.ts |

**Issue:** Inconsistent validation patterns across models.

### 1.5 Files That Reference UserTypes

| File | Line(s) | Usage |
|------|---------|-------|
| `src/models/auth/User.model.ts` | 5, 12, 38-44, 68-69, 77, 82 | Type definition, storage, validation |
| `src/services/auth/auth.service.ts` | 78, 108, 125, 175, 191, 355, 391, 425, 593 | Response building |
| `src/controllers/auth/auth.controller.ts` | 40, 75, 79, 102 | Documentation comments |
| `src/controllers/auth/roles.controller.ts` | 186, 205, 224, 258-279 | Role queries by userType |
| `src/middlewares/isAuthenticated.ts` | 43, 149, 168, 313-325 | Token user object |
| `src/middlewares/require-department-membership.ts` | 138 | Membership lookup |
| `src/services/auth/department-switch.service.ts` | 103, 113, 171, 178, 181, 189, 197 | Department switching logic |

### 1.6 Database Collections

| Collection | UserType Field | Role Field |
|------------|----------------|------------|
| `users` | `userTypes: string[]` | N/A |
| `staff` | N/A | `departmentMemberships[].roles` |
| `learners` | N/A | `departmentMemberships[].roles` |
| `globaladmins` | N/A | `roleMemberships[].roles` |
| `roledefinitions` | `userType: string` | `name: string` |

---

## 2. Target State Design

### 2.1 Single Source of Truth for Constants

**Database as source:** `roledefinitions` collection
**Memory cache:** `RoleRegistry` service singleton
**Code constants:** Deprecated (fallback only)

### 2.2 UserType Object Format

**New interface:**
```typescript
interface UserTypeObject {
  _id: 'learner' | 'staff' | 'global-admin';
  displayAs: string;  // 'Learner' | 'Staff' | 'System Admin'
}
```

**Response transformation:**
```typescript
// Before
userTypes: ['staff', 'global-admin']

// After
userTypes: [
  { _id: 'staff', displayAs: 'Staff' },
  { _id: 'global-admin', displayAs: 'System Admin' }
]
```

### 2.3 Display Value Mapping

| `_id` | `displayAs` |
|-------|-------------|
| `learner` | `Learner` |
| `staff` | `Staff` |
| `global-admin` | `System Admin` |

### 2.4 Role Validation Factory Pattern

```typescript
// Factory function
function DepartmentValidatorFactory(
  validRoles: readonly string[],
  receivedRoles: string[]
): { isValid: boolean }

// Convenience wrapper
function validateRolesForUserType(
  userType: UserType,
  receivedRoles: string[]
): { isValid: boolean }
```

### 2.5 RoleRegistry Service

```typescript
class RoleRegistryService {
  private cache: {
    learner: string[];
    staff: string[];
    'global-admin': string[];
  };

  async initialize(): Promise<void>;  // Load from DB
  getValidRoles(userType: UserType): readonly string[];
  async refresh(): Promise<void>;  // For admin role updates
}
```

---

## 3. Implementation Tasks

### Phase 1: Foundation (No Breaking Changes)

| Task | File | Description |
|------|------|-------------|
| 1.1 | `src/services/role-registry.service.ts` | Create RoleRegistry singleton service |
| 1.2 | `src/models/auth/department-membership.validator.ts` | Create DepartmentValidatorFactory |
| 1.3 | `src/models/auth/user-type.utils.ts` | Create UserType display utilities |
| 1.4 | `src/app.ts` or `src/index.ts` | Add RoleRegistry.initialize() on startup |

### Phase 2: Model Consistency

| Task | File | Description |
|------|------|-------------|
| 2.1 | `src/models/auth/Staff.model.ts` | Replace inline validator with factory |
| 2.2 | `src/models/auth/Learner.model.ts` | Replace model-level validator with factory |
| 2.3 | `src/models/GlobalAdmin.model.ts` | Replace inline validator with factory |
| 2.4 | `src/models/auth/role-constants.ts` | Add deprecation notices |

### Phase 3: API Response Transformation (BREAKING CHANGE)

| Task | File | Description |
|------|------|-------------|
| 3.1 | `src/services/auth/auth.service.ts:391` | Transform userTypes in login response |
| 3.2 | `src/services/auth/auth.service.ts:593` | Transform userTypes in /me response |
| 3.3 | `src/services/auth/auth.service.ts:78` | Update LoginResponseV2 interface |

### Phase 4: Contract & Documentation

| Task | File | Description |
|------|------|-------------|
| 4.1 | `contracts/api/auth-v2.contract.ts` | Update userTypes type definition |
| 4.2 | `contracts/api/user-type-revision.contract.ts` | Update with final implementation |
| 4.3 | `devdocs/User_Type_Revision_Plan.md` | Mark as implemented |

### Phase 5: Tests

| Task | File | Description |
|------|------|-------------|
| 5.1 | `tests/unit/services/role-registry.test.ts` | Unit tests for RoleRegistry |
| 5.2 | `tests/unit/validators/department-membership.test.ts` | Unit tests for factory |
| 5.3 | `tests/integration/auth/auth.test.ts` | Update existing tests for new format |

---

## 4. File Changes Matrix

### 4.1 New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/services/role-registry.service.ts` | Singleton service for role caching |
| `src/models/auth/department-membership.validator.ts` | Factory + validation utilities |
| `src/models/auth/user-type.utils.ts` | UserType display transformation |
| `tests/unit/services/role-registry.test.ts` | Unit tests |
| `tests/unit/validators/department-membership.test.ts` | Unit tests |

### 4.2 Files to Modify

| File Path | Changes |
|-----------|---------|
| `src/models/auth/Staff.model.ts` | Replace validator |
| `src/models/auth/Learner.model.ts` | Replace validator |
| `src/models/GlobalAdmin.model.ts` | Replace validator |
| `src/models/auth/role-constants.ts` | Add deprecation, add display map |
| `src/services/auth/auth.service.ts` | Transform userTypes in responses |
| `src/app.ts` or startup file | Initialize RoleRegistry |
| `contracts/api/auth-v2.contract.ts` | Update types |
| `tests/integration/auth/auth.test.ts` | Update assertions |

### 4.3 Files to Review (May Need Updates)

| File Path | Reason |
|-----------|--------|
| `src/middlewares/isAuthenticated.ts` | Uses `userTypes`, may need interface update |
| `src/services/auth/department-switch.service.ts` | Uses `userTypes.includes()` |
| `src/controllers/auth/roles.controller.ts` | Uses `USER_TYPES` |
| `src/models/RoleDefinition.model.ts` | Has duplicate USER_TYPES constant |

---

## 5. Questions for Review

### 5.1 Architecture Questions

**Q1: Single Source of Truth**
> Should we use the database (`roledefinitions` collection) as the ONLY source of truth, or keep `role-constants.ts` as a fallback?
> 
> **Option A:** Database only, fail if empty
> **Option B:** Database primary, code constants as fallback
> **Option C:** Code constants only (current state, no change)

**Answer**
Database only, Create a "lookup" or "constants" ts script that is added to the db seed scripts. Make sure this set of constants starts in every db by default

**Q2: RoleRegistry Initialization**
> What should happen if RoleRegistry fails to initialize on startup?
>
> **Option A:** Fatal error, server won't start
> **Option B:** Log warning, use fallback constants
> **Option C:** Log warning, continue with empty cache (validation will fail)

**Answer**
Create an "are Constants loaded" test to be run on every server boot. If it fails - fatal error, server won't start, but gives warning "constants not found, please rerun seed scripts". Always add constants to seed script whenever we add a new constant to the Model.

**Q3: GlobalAdmin Naming Consistency**
> Should `roleMemberships` on GlobalAdmin be renamed to `departmentMemberships` for consistency with Staff/Learner?
>
> **Option A:** Yes, rename for consistency (requires migration)
> **Option B:** No, keep as `roleMemberships` (already works)

**Answer**
yes rename

### 5.2 API Contract Questions

**Q4: UserType Response Location**
> The current response has `userTypes` at the top level. Should we:
>
> **Option A:** Keep at top level: `{ userTypes: [{ _id, displayAs }], ... }`
> **Option B:** Nest inside user: `{ user: { userTypes: [{ _id, displayAs }] }, ... }`
> **Option C:** Both (include in both locations for compatibility)

**Answer**
nest inside user only

**Q5: Breaking Change Strategy**
> This is a breaking change for API consumers. How to handle?
>
> **Option A:** Single release with migration guide
> **Option B:** Versioned endpoint (/api/v2.1/auth/login)
> **Option C:** Feature flag (return old format unless header present)

**Answer**
Create migration documents - treat as single relese - this API isn't in production yet.  After we're in beta, then we will start versioned endpoints.

**Q6: Middleware Updates**
> `req.user.userTypes` is currently `string[]`. Should this change too?
>
> **Option A:** Yes, update to `UserTypeObject[]` everywhere
> **Option B:** No, keep internal as `string[]`, only transform at API boundary
> **Option C:** Add both: `req.user.userTypes` (strings) + `req.user.userTypeObjects` (objects)

**Answer**
A - update everywhere

### 5.3 Implementation Questions

**Q7: Display Name Storage**
> Where should display names (`Learner`, `Staff`, `System Admin`) be stored?
>
> **Option A:** Code constant (USER_TYPE_DISPLAY map)
> **Option B:** Database field on roledefinitions or new collection
> **Option C:** Environment variable / config file

**Answer**
create a db lookup or constants document store.  Keep all constants stored in the db in this one place.  Make the LookupValues document "LookupObjectIdentifier":{_id: string, name:string }, "Field":string, "_id": hex or int, "Value": string. Create a pattern to store these looksups using this constants document store. Also create a stub structure for internationalization of all displayAs fields for internationalizaiton.

**Q8: UserType Validation**
> Should we also validate `userTypes` on User model using the factory pattern?
>
> **Option A:** Yes, use same factory pattern for consistency
> **Option B:** No, keep simple enum validation (only 3 values)

**Answer**
Yes, we should start making a list of datapoints that are important to keep valid for db consistency.  Make a separate document so we can apply the "isValid" factory pattern to all of them, and store all of their constants in the constant documentstore
---

## 6. Risk Assessment

### 6.1 Breaking Changes

| Change | Impact | Mitigation |
|--------|--------|------------|
| UserType response format | Frontend must update parsing | Migration guide, version bump |
| Validation timing changes | Possible different error messages | Test thoroughly |

### 6.2 Performance Considerations

| Concern | Impact | Mitigation |
|---------|--------|------------|
| RoleRegistry startup time | Slight delay on boot | Minimal (small table) |
| Memory usage | Cache size | Negligible (~1KB) |
| DB dependency on startup | Can't start without DB | Already true, no change |

### 6.3 Rollback Plan

1. Revert `auth.service.ts` to return `user.userTypes` directly
2. Remove RoleRegistry.initialize() from startup
3. Keep factory files but don't use them
4. Update tests back to string[] assertions

---

## 7. Testing Strategy

### 7.1 Unit Tests

| Test File | Coverage |
|-----------|----------|
| `role-registry.test.ts` | initialize(), getValidRoles(), refresh() |
| `department-membership.validator.test.ts` | DepartmentValidatorFactory, validateRolesForUserType |
| `user-type.utils.test.ts` | toUserTypeObjects(), USER_TYPE_DISPLAY |

### 7.2 Integration Tests

| Test File | Updates Needed |
|-----------|----------------|
| `auth.test.ts` | Assert userTypes is array of objects, check _id and displayAs |
| `authorization.test.ts` | May need updates if middleware changes |

### 7.3 Test Cases for Factory

```typescript
describe('DepartmentValidatorFactory', () => {
  it('returns isValid:true when all roles exist in validRoles', () => {
    const result = DepartmentValidatorFactory(
      ['instructor', 'content-admin'],
      ['instructor']
    );
    expect(result.isValid).toBe(true);
  });

  it('returns isValid:false when any role missing from validRoles', () => {
    const result = DepartmentValidatorFactory(
      ['instructor', 'content-admin'],
      ['instructor', 'fake-role']
    );
    expect(result.isValid).toBe(false);
  });

  it('returns isValid:false for empty receivedRoles', () => {
    const result = DepartmentValidatorFactory(['instructor'], []);
    expect(result.isValid).toBe(false);
  });
});
```

---

## 8. Migration Steps

### 8.1 Pre-Implementation

1. [ ] Review and answer all questions in Section 5
2. [ ] Verify `roledefinitions` collection has all expected records
3. [ ] Create feature branch

### 8.2 Implementation Order

1. [ ] Create RoleRegistry service (no dependencies)
2. [ ] Create DepartmentValidatorFactory (depends on RoleRegistry)
3. [ ] Create user-type.utils.ts (no dependencies)
4. [ ] Add RoleRegistry.initialize() to startup
5. [ ] Update Staff model to use factory
6. [ ] Update Learner model to use factory
7. [ ] Update GlobalAdmin model to use factory
8. [ ] Update auth.service.ts login response
9. [ ] Update auth.service.ts /me response
10. [ ] Update contracts
11. [ ] Update tests
12. [ ] Add deprecation notices to role-constants.ts

### 8.3 Post-Implementation

1. [ ] Run full test suite
2. [ ] Manual API testing with Postman/curl
3. [ ] Update frontend documentation
4. [ ] Create migration guide for API consumers
5. [ ] Code review
6. [ ] Merge to main

---

## Appendix A: Code Snippets

### A.1 user-type.utils.ts

```typescript
import { UserType } from './role-constants';

export interface UserTypeObject {
  _id: UserType;
  displayAs: string;
}

export const USER_TYPE_DISPLAY: Record<UserType, string> = {
  'learner': 'Learner',
  'staff': 'Staff',
  'global-admin': 'System Admin'
} as const;

export function toUserTypeObjects(userTypes: UserType[]): UserTypeObject[] {
  return userTypes.map(ut => ({
    _id: ut,
    displayAs: USER_TYPE_DISPLAY[ut]
  }));
}

export function toUserTypeStrings(userTypeObjects: UserTypeObject[]): UserType[] {
  return userTypeObjects.map(uto => uto._id);
}
```

### A.2 auth.service.ts transformation

```typescript
// Line ~391 (login response)
import { toUserTypeObjects } from '@/models/auth/user-type.utils';

// In login method:
userTypes: toUserTypeObjects(user.userTypes),

// Line ~593 (me response)
userTypes: toUserTypeObjects(user.userTypes),
```

---

## Appendix B: Sample API Responses

### B.1 Login Response (After)

```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  },
  "session": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 3600,
    "tokenType": "Bearer"
  },
  "userTypes": [
    { "_id": "staff", "displayAs": "Staff" },
    { "_id": "global-admin", "displayAs": "System Admin" }
  ],
  "defaultDashboard": "staff",
  "canEscalateToAdmin": true,
  "departmentMemberships": [...],
  "allAccessRights": [...]
}
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-11 | System | Initial document |
| 1.1 | 2026-01-11 | System | Added answers to Q1-Q8, follow-up questions |
| 2.0 | 2026-01-11 | System | Finalized LookupValue schema with parentLookupId, answered Q9-Q20, added implementation tasks |

---

## 9. LookupValues Collection Design (FINALIZED)

This section defines the centralized lookup/constants storage with hierarchical parent-child relationships.

### 9.1 LookupValue Schema

**Design Decision:** Use `parentLookupId` to establish hierarchy + generic `role` category for all role types.

```typescript
interface ILookupValue {
  _id: Types.ObjectId;
  lookupId: string;           // Unique identifier: 'userType.staff', 'role.instructor'
  category: string;           // 'userType' | 'role' (generic for all role types)
  key: string;                // 'staff', 'instructor' (the actual stored value)
  parentLookupId?: string;    // References parent's lookupId: 'userType.staff'
  displayAs: string;          // 'Staff', 'Instructor'
  description?: string;       // Optional description
  sortOrder: number;          // For UI ordering
  isActive: boolean;          // Soft delete / disable
  metadata?: {
    isDefault?: boolean;      // e.g., 'learner' is default userType
    icon?: string;            // For UI
    color?: string;           // For UI badges
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### 9.2 Hierarchical Structure

**Key insight:** Using generic `role` category + `parentLookupId` allows the system to:
1. Query all roles for a userType: `{ parentLookupId: 'userType.staff' }`
2. Validate role belongs to correct userType
3. Support future multi-level hierarchies if needed

### 9.3 Sample LookupValues Data

#### UserTypes (Root level - no parent)

| lookupId | category | key | parentLookupId | displayAs | sortOrder |
|----------|----------|-----|----------------|-----------|----------|
| `userType.learner` | `userType` | `learner` | `null` | `Learner` | 1 |
| `userType.staff` | `userType` | `staff` | `null` | `Staff` | 2 |
| `userType.global-admin` | `userType` | `global-admin` | `null` | `System Admin` | 3 |

#### Staff Roles (Children of userType.staff)

| lookupId | category | key | parentLookupId | displayAs | sortOrder |
|----------|----------|-----|----------------|-----------|----------|
| `role.instructor` | `role` | `instructor` | `userType.staff` | `Instructor` | 1 |
| `role.department-admin` | `role` | `department-admin` | `userType.staff` | `Department Admin` | 2 |
| `role.content-admin` | `role` | `content-admin` | `userType.staff` | `Content Admin` | 3 |
| `role.billing-admin` | `role` | `billing-admin` | `userType.staff` | `Billing Admin` | 4 |

#### Learner Roles (Children of userType.learner)

| lookupId | category | key | parentLookupId | displayAs | sortOrder |
|----------|----------|-----|----------------|-----------|----------|
| `role.course-taker` | `role` | `course-taker` | `userType.learner` | `Course Taker` | 1 |
| `role.auditor` | `role` | `auditor` | `userType.learner` | `Auditor` | 2 |
| `role.learner-supervisor` | `role` | `learner-supervisor` | `userType.learner` | `Learner Supervisor` | 3 |

#### GlobalAdmin Roles (Children of userType.global-admin)

| lookupId | category | key | parentLookupId | displayAs | sortOrder |
|----------|----------|-----|----------------|-----------|----------|
| `role.system-admin` | `role` | `system-admin` | `userType.global-admin` | `System Admin` | 1 |
| `role.enrollment-admin` | `role` | `enrollment-admin` | `userType.global-admin` | `Enrollment Admin` | 2 |
| `role.course-admin` | `role` | `course-admin` | `userType.global-admin` | `Course Admin` | 3 |
| `role.theme-admin` | `role` | `theme-admin` | `userType.global-admin` | `Theme Admin` | 4 |
| `role.financial-admin` | `role` | `financial-admin` | `userType.global-admin` | `Financial Admin` | 5 |

### 9.4 Query Patterns

```typescript
// 1. Get all valid roles for a userType
async function getValidRolesForUserType(userTypeKey: string): Promise<string[]> {
  const parentLookupId = `userType.${userTypeKey}`;
  const roles = await LookupValue.find({ parentLookupId, isActive: true });
  return roles.map(r => r.key);
}
// Usage: await getValidRolesForUserType('staff'); // ['instructor', 'department-admin', ...]

// 2. Validate a role belongs to correct userType
async function validateRoleForUserType(userType: string, role: string): Promise<boolean> {
  const lookup = await LookupValue.findOne({ 
    key: role, 
    parentLookupId: `userType.${userType}`,
    isActive: true 
  });
  return !!lookup;
}

// 3. Get displayAs for a key
async function getDisplayAs(lookupId: string): Promise<string | null> {
  const lookup = await LookupValue.findOne({ lookupId, isActive: true });
  return lookup?.displayAs ?? null;
}

// 4. Get all children of any parent (generic)
async function getChildLookups(parentLookupId: string): Promise<ILookupValue[]> {
  return LookupValue.find({ parentLookupId, isActive: true }).sort('sortOrder');
}
```

### 9.5 Required Indexes

```typescript
// Unique constraint on lookupId
lookupvalues.createIndex({ lookupId: 1 }, { unique: true });

// Parent-child queries (most common)
lookupvalues.createIndex({ parentLookupId: 1, isActive: 1 });

// Category queries
lookupvalues.createIndex({ category: 1, isActive: 1 });

// Key lookup (for validation)
lookupvalues.createIndex({ key: 1, parentLookupId: 1 });
```

---

## 10. Follow-Up Question Answers

### Q10: Sample LookupValues Data
**Answer:** See Section 9.3 above for complete sample data.

### Q11: i18n Approach
**Answer:** **Option C** - Separate i18n collection that references lookups.

This keeps the main lookupvalues collection simple and performant for the 99% case (English), while allowing future i18n without schema changes.

**Future i18n Collection Schema (stub - not implemented yet):**
```typescript
interface ILookupTranslation {
  _id: Types.ObjectId;
  lookupId: string;       // References lookupvalues.lookupId
  locale: string;         // 'es-MX', 'fr-FR', etc.
  displayAs: string;      // Translated display value
  description?: string;   // Translated description
  isActive: boolean;
}

// Example future data:
{ lookupId: 'userType.staff', locale: 'es-MX', displayAs: 'Personal' }
{ lookupId: 'role.instructor', locale: 'es-MX', displayAs: 'Instructor' }
```

**Query pattern (future):**
```typescript
async function getDisplayAs(lookupId: string, locale?: string): Promise<string> {
  if (locale && locale !== 'en-US') {
    const translation = await LookupTranslation.findOne({ lookupId, locale, isActive: true });
    if (translation) return translation.displayAs;
  }
  const lookup = await LookupValue.findOne({ lookupId, isActive: true });
  return lookup?.displayAs ?? lookupId;
}
```

### Q12: Default Locale
**Answer:** `en-US` as default. No locale field in lookupvalues - the `displayAs` field IS the en-US value. Translations go in separate collection.

### Q13: Seed Script Location
**Answer:** **Option A** - `src/seeds/constants.seed.ts`

This keeps seeds separate from migrations (which are one-time transformations). The seed script should:
1. Be idempotent (safe to run multiple times)
2. Use upsert pattern based on `lookupId`
3. Be called during initial DB setup and when adding new constants

**File structure:**
```
src/seeds/
├── constants.seed.ts      # LookupValues seeding
├── index.ts               # Exports all seeds
└── run-seeds.ts           # CLI runner
```

### Q14: Existing roledefinitions Data
**Answer:** **Option A** - Migrate roledefinitions → lookupvalues collection.

The `roledefinitions` collection currently stores:
- `name`, `userType`, `displayName`, `description`, `accessRights[]`, `isActive`

**Migration strategy:**
1. Create lookupvalues from roledefinitions for roles
2. Add userTypes to lookupvalues (not in roledefinitions)
3. Keep `accessRights` in a separate `accessrights` collection or as metadata
4. Deprecate roledefinitions after migration
5. RoleRegistry reads from lookupvalues only

### Q15: Initial Validation List
**Answer:** Confirmed with updated source references using parentLookupId:

| Model | Field | Valid Values Query |
|-------|-------|-------------------|
| User | `userTypes[]` | `{ category: 'userType', isActive: true }` |
| Staff | `departmentMemberships[].roles[]` | `{ parentLookupId: 'userType.staff', isActive: true }` |
| Learner | `departmentMemberships[].roles[]` | `{ parentLookupId: 'userType.learner', isActive: true }` |
| GlobalAdmin | `departmentMemberships[].roles[]` | `{ parentLookupId: 'userType.global-admin', isActive: true }` |

**Additional fields to validate (future):**

| Model | Field | Notes |
|-------|-------|-------|
| Department | `type` | If department types are added |
| Content | `contentType` | 'video', 'document', 'scorm', etc. |
| Course | `status` | 'draft', 'published', 'archived' |
| Enrollment | `status` | 'enrolled', 'completed', 'dropped' |

### Q16: Validation Document Name
**Answer:** **Option C** - `Data_Integrity_Validation_Plan.md`

This document will catalog all validated fields and their lookup sources.

### Q17: GlobalAdmin Migration Timing
**Answer:** **Option C** - Only after lookupvalues collection is set up.

**Rationale:** The rename should use the new validation factory which depends on lookupvalues. Order:
1. Create lookupvalues collection + seed
2. Create RoleRegistry service
3. Create validation factory
4. Migrate GlobalAdmin.roleMemberships → departmentMemberships

### Q18: GlobalAdmin Additional Fields
**Answer:** **Yes**, align field names for consistency:

| Current Field | New Field | Notes |
|---------------|-----------|-------|
| `roleMemberships` | `departmentMemberships` | Rename array |
| `assignedAt` | `joinedAt` | Match Staff/Learner |
| (missing) | `isPrimary` | Add with default `true` for first membership |
| `assignedBy` | Keep | Staff/Learner should add this field too |

**Migration script will:**
1. Rename `roleMemberships` → `departmentMemberships`
2. Rename nested `assignedAt` → `joinedAt`
3. Add `isPrimary: true` to first membership, `false` to others
4. Keep `assignedBy` (consider adding to Staff/Learner later)

### Q19: JWT Token Contents
**Answer:** **Option B** - Token stays as strings, middleware hydrates to objects from cache.

**Rationale:**
1. Smaller token size (important for HTTP headers)
2. Display values can change without re-issuing tokens
3. RoleRegistry cache is fast (in-memory lookup)
4. Single source of truth for displayAs values

**Implementation:**
```typescript
// In isAuthenticated middleware
const decoded = verifyToken(token);
req.user = {
  ...decoded,
  // Hydrate userTypes from cache
  userTypes: await roleRegistry.hydrateUserTypes(decoded.userTypes) 
  // Returns: [{ _id: 'staff', displayAs: 'Staff' }, ...]
};
```

### Q20: Implementation Priority
**Answer:** Ordered by dependencies:

| Priority | Task | Depends On | Est. Effort |
|----------|------|------------|-------------|
| 1 | LookupValues collection + model + seed script | Nothing | 2-3 hours |
| 2 | RoleRegistry service (cache from lookupvalues) | #1 | 2 hours |
| 3 | DepartmentValidatorFactory | #2 | 1-2 hours |
| 4 | Data_Integrity_Validation_Plan.md | #3 | 1 hour |
| 5 | GlobalAdmin rename (roleMemberships → departmentMemberships) | #3 | 2 hours |
| 6 | UserType object transformation in API responses | #2 | 1-2 hours |
| 7 | Middleware userTypes hydration update | #2, #6 | 2 hours |
| 8 | i18n stub structure (LookupTranslation model) | #1 | 30 min |

**Phase 1 (Foundation):** Tasks 1-4  
**Phase 2 (Model Updates):** Tasks 5-7  
**Phase 3 (Future-proofing):** Task 8

---

## 11. Answer Summary (All Questions)

| Question | Answer |
|----------|--------|
| Q1: Source of Truth | **Database only** + seed script for constants |
| Q2: Registry Failure | **Fatal error** + warning to rerun seed scripts |
| Q3: GlobalAdmin Rename | **Yes**, rename to `departmentMemberships` |
| Q4: UserType Location | **Nest inside user only** |
| Q5: Breaking Change | **Single release** + migration docs |
| Q6: Middleware Update | **Yes**, update to UserTypeObject[] everywhere |
| Q7: Display Name Storage | **Database** (lookupvalues collection) + i18n stub |
| Q8: UserType Validation | **Yes**, apply factory pattern + create validation list doc |
| Q9: LookupValues Schema | **parentLookupId pattern** with generic `role` category |
| Q10: Sample Data | See Section 9.3 |
| Q11: i18n Approach | **Separate collection** (LookupTranslation) referencing lookupId |
| Q12: Default Locale | **en-US**, no locale field in main collection |
| Q13: Seed Script Location | **src/seeds/constants.seed.ts** |
| Q14: roledefinitions Migration | **Migrate to lookupvalues**, deprecate roledefinitions |
| Q15: Validation List | Confirmed - see updated table with parentLookupId queries |
| Q16: Validation Doc Name | **Data_Integrity_Validation_Plan.md** |
| Q17: GlobalAdmin Timing | **After lookupvalues setup** (Phase 2) |
| Q18: GlobalAdmin Fields | **Yes**, add `isPrimary`, rename `assignedAt` → `joinedAt` |
| Q19: JWT Token Contents | **Strings only**, middleware hydrates from cache |
| Q20: Implementation Priority | 1→LookupValues, 2→Registry, 3→Factory, 4→Docs, 5→GlobalAdmin, 6→Transform, 7→Middleware, 8→i18n |

---

## 12. Revised Implementation Tasks

### Phase 1: Foundation (No Breaking Changes)

| Task | File | Description |
|------|------|-------------|
| 1.1 | `src/models/LookupValue.model.ts` | Create LookupValue model with parentLookupId |
| 1.2 | `src/seeds/constants.seed.ts` | Create idempotent seed script |
| 1.3 | `src/seeds/run-seeds.ts` | Create CLI runner for seeds |
| 1.4 | `src/services/role-registry.service.ts` | Create RoleRegistry singleton (reads from lookupvalues) |
| 1.5 | `src/models/auth/department-membership.validator.ts` | Create DepartmentValidatorFactory |
| 1.6 | `src/app.ts` | Add RoleRegistry.initialize() + validation on startup |
| 1.7 | `devdocs/Data_Integrity_Validation_Plan.md` | Document all validated fields |

### Phase 2: Model Consistency

| Task | File | Description |
|------|------|-------------|
| 2.1 | `src/models/auth/Staff.model.ts` | Replace inline validator with factory |
| 2.2 | `src/models/auth/Learner.model.ts` | Replace model-level validator with factory |
| 2.3 | `src/models/GlobalAdmin.model.ts` | Rename roleMemberships → departmentMemberships + factory |
| 2.4 | `scripts/migrate-globaladmin.ts` | DB migration script for GlobalAdmin rename |
| 2.5 | `src/models/auth/role-constants.ts` | Add deprecation notices |

### Phase 3: API Response Transformation (BREAKING CHANGE)

| Task | File | Description |
|------|------|-------------|
| 3.1 | `src/models/auth/user-type.utils.ts` | Create UserType hydration utilities |
| 3.2 | `src/services/auth/auth.service.ts` | Transform userTypes in login/me responses |
| 3.3 | `src/middlewares/isAuthenticated.ts` | Hydrate userTypes from token strings |
| 3.4 | `contracts/api/auth-v2.contract.ts` | Update userTypes type definition |

### Phase 4: Future-Proofing

| Task | File | Description |
|------|------|-------------|
| 4.1 | `src/models/LookupTranslation.model.ts` | Create i18n stub model (not wired up) |
| 4.2 | `scripts/migrate-roledefinitions.ts` | Migrate roledefinitions → lookupvalues |

---

## 13. New File: LookupValue.model.ts

```typescript
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILookupValue extends Document {
  _id: Types.ObjectId;
  lookupId: string;
  category: string;
  key: string;
  parentLookupId?: string;
  displayAs: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  metadata?: {
    isDefault?: boolean;
    icon?: string;
    color?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const LookupValueSchema = new Schema<ILookupValue>(
  {
    lookupId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
    },
    parentLookupId: {
      type: String,
      default: null,
      index: true,
    },
    displayAs: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    metadata: {
      isDefault: Boolean,
      icon: String,
      color: String,
    },
  },
  {
    timestamps: true,
    collection: 'lookupvalues',
  }
);

// Compound index for validation queries
LookupValueSchema.index({ key: 1, parentLookupId: 1 });
LookupValueSchema.index({ parentLookupId: 1, isActive: 1 });

export const LookupValue = mongoose.model<ILookupValue>('LookupValue', LookupValueSchema);
```

---

## 14. New File: constants.seed.ts (Excerpt)

```typescript
import { LookupValue } from '../models/LookupValue.model';

const LOOKUP_VALUES = [
  // UserTypes (root level)
  { lookupId: 'userType.learner', category: 'userType', key: 'learner', parentLookupId: null, displayAs: 'Learner', sortOrder: 1, metadata: { isDefault: true } },
  { lookupId: 'userType.staff', category: 'userType', key: 'staff', parentLookupId: null, displayAs: 'Staff', sortOrder: 2 },
  { lookupId: 'userType.global-admin', category: 'userType', key: 'global-admin', parentLookupId: null, displayAs: 'System Admin', sortOrder: 3 },
  
  // Staff Roles (children of userType.staff)
  { lookupId: 'role.instructor', category: 'role', key: 'instructor', parentLookupId: 'userType.staff', displayAs: 'Instructor', sortOrder: 1 },
  { lookupId: 'role.department-admin', category: 'role', key: 'department-admin', parentLookupId: 'userType.staff', displayAs: 'Department Admin', sortOrder: 2 },
  { lookupId: 'role.content-admin', category: 'role', key: 'content-admin', parentLookupId: 'userType.staff', displayAs: 'Content Admin', sortOrder: 3 },
  { lookupId: 'role.billing-admin', category: 'role', key: 'billing-admin', parentLookupId: 'userType.staff', displayAs: 'Billing Admin', sortOrder: 4 },
  
  // Learner Roles (children of userType.learner)
  { lookupId: 'role.course-taker', category: 'role', key: 'course-taker', parentLookupId: 'userType.learner', displayAs: 'Course Taker', sortOrder: 1 },
  { lookupId: 'role.auditor', category: 'role', key: 'auditor', parentLookupId: 'userType.learner', displayAs: 'Auditor', sortOrder: 2 },
  { lookupId: 'role.learner-supervisor', category: 'role', key: 'learner-supervisor', parentLookupId: 'userType.learner', displayAs: 'Learner Supervisor', sortOrder: 3 },
  
  // GlobalAdmin Roles (children of userType.global-admin)
  { lookupId: 'role.system-admin', category: 'role', key: 'system-admin', parentLookupId: 'userType.global-admin', displayAs: 'System Admin', sortOrder: 1 },
  { lookupId: 'role.enrollment-admin', category: 'role', key: 'enrollment-admin', parentLookupId: 'userType.global-admin', displayAs: 'Enrollment Admin', sortOrder: 2 },
  { lookupId: 'role.course-admin', category: 'role', key: 'course-admin', parentLookupId: 'userType.global-admin', displayAs: 'Course Admin', sortOrder: 3 },
  { lookupId: 'role.theme-admin', category: 'role', key: 'theme-admin', parentLookupId: 'userType.global-admin', displayAs: 'Theme Admin', sortOrder: 4 },
  { lookupId: 'role.financial-admin', category: 'role', key: 'financial-admin', parentLookupId: 'userType.global-admin', displayAs: 'Financial Admin', sortOrder: 5 },
];

export async function seedLookupValues(): Promise<void> {
  console.log('Seeding lookup values...');
  
  for (const value of LOOKUP_VALUES) {
    await LookupValue.findOneAndUpdate(
      { lookupId: value.lookupId },
      { ...value, isActive: true },
      { upsert: true, new: true }
    );
  }
  
  console.log(`Seeded ${LOOKUP_VALUES.length} lookup values`);
}

export async function validateLookupValues(): Promise<boolean> {
  const count = await LookupValue.countDocuments({ isActive: true });
  const requiredCount = LOOKUP_VALUES.length;
  
  if (count < requiredCount) {
    console.error(`Missing lookup values: found ${count}, expected ${requiredCount}`);
    return false;
  }
  return true;
}
```

