# Role System V2 - Phased Implementation Plan
**Version:** 1.0  
**Date:** 2026-01-10  
**Purpose:** Parallel implementation tasks for Claude Code agent team  
**Reference:** [Role_System_API_Model_Plan_V2.md](Role_System_API_Model_Plan_V2.md)

---

## Overview

This document breaks down the Role System V2 implementation into phases with parallelizable tasks. Each task is designed to be independently implementable by a Claude Code agent.

### Existing Assets (Already Complete)
- ✅ `src/models/GlobalAdmin.model.ts`
- ✅ `src/models/RoleDefinition.model.ts`  
- ✅ `src/models/AccessRight.model.ts`
- ✅ `src/models/EnrollmentActivity.model.ts`
- ✅ `src/models/ClassEnrollment.model.ts`
- ✅ `scripts/seed-admin.ts`
- ✅ `contracts/api/auth-v2.contract.ts`
- ✅ `contracts/api/roles.contract.ts`
- ✅ `contracts/UI_ROLE_SYSTEM_CONTRACTS.md`
- ✅ `devdocs/Endpoint_Role_Authorization.md`

---

## Phase 1: Model Updates & Schema Alignment
**Duration:** 2-3 days  
**Dependencies:** None  
**Parallelism:** All tasks can run in parallel

### Task 1.1: Update User Model
**Agent ID:** `agent-1`  
**File:** `src/models/auth/User.model.ts`  
**Estimated Time:** 1 hour

**Requirements:**
1. Add `userTypes` field (array of `'learner' | 'staff' | 'global-admin'`)
2. Add `defaultDashboard` field (`'learner' | 'staff'`)
3. Add `lastSelectedDepartment` field (ObjectId ref to Department)
4. Add pre-save hook to calculate `defaultDashboard` from `userTypes`
5. Add method `hasUserType(type: UserType): boolean`
6. Add method `canEscalateToAdmin(): boolean`

**Schema Changes:**
```typescript
userTypes: {
  type: [String],
  enum: ['learner', 'staff', 'global-admin'],
  default: ['learner'],
  validate: { validator: (v) => v.length > 0 }
}
defaultDashboard: {
  type: String,
  enum: ['learner', 'staff'],
  default: 'learner'
}
lastSelectedDepartment: {
  type: Schema.Types.ObjectId,
  ref: 'Department'
}
```

**Tests Required:**
- `tests/unit/models/User.model.test.ts` - userTypes validation
- `tests/unit/models/User.model.test.ts` - defaultDashboard calculation

---

### Task 1.2: Update Staff Model with DepartmentMemberships
**Agent ID:** `agent-2`  
**File:** `src/models/auth/Staff.model.ts`  
**Estimated Time:** 1.5 hours

**Requirements:**
1. Create shared `DepartmentMembershipSchema` subdocument
2. Add `departmentMemberships` array using the schema
3. Add role validation for STAFF_ROLES only
4. Add indexes for efficient queries
5. Add method `getRolesForDepartment(deptId: ObjectId): string[]`
6. Add method `hasDepartmentRole(deptId: ObjectId, role: string): boolean`

**Schema:**
```typescript
const DepartmentMembershipSchema = new Schema({
  departmentId: { type: ObjectId, ref: 'Department', required: true },
  roles: { type: [String], required: true },
  isPrimary: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, { _id: false });
```

**Tests Required:**
- `tests/unit/models/Staff.model.test.ts` - departmentMemberships CRUD
- `tests/unit/models/Staff.model.test.ts` - role validation

---

### Task 1.3: Update Learner Model with DepartmentMemberships
**Agent ID:** `agent-3`  
**File:** `src/models/auth/Learner.model.ts`  
**Estimated Time:** 1.5 hours

**Requirements:**
1. Import shared `DepartmentMembershipSchema` from Staff or create shared module
2. Add `departmentMemberships` array using the schema
3. Add role validation for LEARNER_ROLES only
4. Add indexes for efficient queries
5. Add method `getRolesForDepartment(deptId: ObjectId): string[]`
6. Add method `hasDepartmentRole(deptId: ObjectId, role: string): boolean`

**Role Validation:**
```typescript
const LEARNER_ROLES = ['course-taker', 'auditor', 'learner-supervisor'] as const;
```

**Tests Required:**
- `tests/unit/models/Learner.model.test.ts` - departmentMemberships CRUD
- `tests/unit/models/Learner.model.test.ts` - role validation

---

### Task 1.4: Create Shared Role Constants Module
**Agent ID:** `agent-4`  
**File:** `src/models/auth/role-constants.ts`  
**Estimated Time:** 30 minutes

**Requirements:**
1. Export `LEARNER_ROLES` constant array
2. Export `STAFF_ROLES` constant array
3. Export `GLOBAL_ADMIN_ROLES` constant array
4. Export `USER_TYPES` constant array
5. Export TypeScript types for each
6. Export `MASTER_DEPARTMENT_ID` constant
7. Export `MASTER_DEPARTMENT_NAME` constant

**Content:**
```typescript
export const USER_TYPES = ['learner', 'staff', 'global-admin'] as const;
export type UserType = typeof USER_TYPES[number];

export const LEARNER_ROLES = ['course-taker', 'auditor', 'learner-supervisor'] as const;
export type LearnerRole = typeof LEARNER_ROLES[number];

export const STAFF_ROLES = ['instructor', 'department-admin', 'content-admin', 'billing-admin'] as const;
export type StaffRole = typeof STAFF_ROLES[number];

export const GLOBAL_ADMIN_ROLES = ['system-admin', 'enrollment-admin', 'course-admin', 'theme-admin', 'financial-admin'] as const;
export type GlobalAdminRole = typeof GLOBAL_ADMIN_ROLES[number];

export const MASTER_DEPARTMENT_ID = new Types.ObjectId('000000000000000000000001');
export const MASTER_DEPARTMENT_NAME = 'System Administration';
```

---

### Task 1.5: Create DepartmentMembership Shared Schema
**Agent ID:** `agent-5`  
**File:** `src/models/auth/department-membership.schema.ts`  
**Estimated Time:** 30 minutes

**Requirements:**
1. Export reusable `DepartmentMembershipSchema`
2. Export `IDepartmentMembership` interface
3. Include all fields: departmentId, roles, isPrimary, joinedAt, isActive
4. Include validation logic

**This schema is used by both Staff and Learner models.**

---

### Task 1.6: Update Department Model for Master Department
**Agent ID:** `agent-6`  
**File:** `src/models/organization/Department.model.ts`  
**Estimated Time:** 45 minutes

**Requirements:**
1. Add `isSystem` field (boolean, default false)
2. Add `isVisible` field (boolean, default true)
3. Add `requireExplicitMembership` field (boolean, default false)
4. Add pre-delete hook to prevent deletion of system departments
5. Add static method `getMasterDepartment()`

**Schema Additions:**
```typescript
isSystem: { type: Boolean, default: false },  // Cannot be deleted
isVisible: { type: Boolean, default: true },  // Hidden from normal lists
requireExplicitMembership: { type: Boolean, default: false }  // Role cascading control
```

---

## Phase 2: Seed Data & Migration
**Duration:** 1-2 days  
**Dependencies:** Phase 1 complete  
**Parallelism:** Tasks 2.1-2.4 can run in parallel

### Task 2.1: Create Role Definitions Seed Script
**Agent ID:** `agent-1`  
**File:** `scripts/seed-role-definitions.ts`  
**Estimated Time:** 1 hour

**Requirements:**
1. Seed all learner roles to RoleDefinition collection
2. Seed all staff roles to RoleDefinition collection
3. Seed all global-admin roles to RoleDefinition collection
4. Include access rights for each role (from Section 5.2 of Model Plan)
5. Make script idempotent (can run multiple times safely)

**Roles to Seed:**
- Learner: `course-taker`, `auditor`, `learner-supervisor`
- Staff: `instructor`, `department-admin`, `content-admin`, `billing-admin`
- GlobalAdmin: `system-admin`, `enrollment-admin`, `course-admin`, `theme-admin`, `financial-admin`

---

### Task 2.2: Create Access Rights Seed Script
**Agent ID:** `agent-2`  
**File:** `scripts/seed-access-rights.ts`  
**Estimated Time:** 1.5 hours

**Requirements:**
1. Seed all access rights to AccessRight collection
2. Organize by domain: content, enrollment, staff, learner, reports, system, billing, audit, grades
3. Mark sensitive rights appropriately (FERPA, billing, PII, audit)
4. Make script idempotent
5. Include helper to generate access rights from role definitions

**Access Rights Pattern:** `{domain}:{resource}:{action}`

**Sensitive Categories:**
```typescript
const SENSITIVE_ACCESS_RIGHTS = {
  ferpa: ['learner:pii:read', 'learner:grades:read', 'learner:transcripts:read', ...],
  billing: ['billing:payments:read', 'billing:payments:process', ...],
  pii: ['learner:contact:read', 'learner:emergency:read', ...],
  audit: ['audit:logs:read', 'audit:logs:export', ...]
};
```

---

### Task 2.3: Create Master Department Seed
**Agent ID:** `agent-3`  
**File:** `scripts/seed-master-department.ts`  
**Estimated Time:** 30 minutes

**Requirements:**
1. Create master department with fixed ID `000000000000000000000001`
2. Set `isSystem: true`, `isVisible: false`
3. Make script idempotent
4. Add to installation/setup sequence

**Master Department:**
```typescript
{
  _id: new Types.ObjectId('000000000000000000000001'),
  name: 'System Administration',
  slug: 'master',
  description: 'System administration department for global admin roles',
  isSystem: true,
  isVisible: false,
  parentDepartmentId: null,
  isActive: true
}
```

---

### Task 2.4: Update seed-admin.ts Script
**Agent ID:** `agent-4`  
**File:** `scripts/seed-admin.ts`  
**Estimated Time:** 45 minutes

**Requirements:**
1. Ensure master department is created first
2. Create default admin user with all userTypes: `['learner', 'staff', 'global-admin']`
3. Create GlobalAdmin record with `system-admin` role
4. Set default escalation password (require change on first login)
5. Create corresponding Staff and Learner records
6. Make script idempotent

---

### Task 2.5: Create Combined Seed Script
**Agent ID:** `agent-5`  
**File:** `scripts/seed-role-system.ts`  
**Estimated Time:** 30 minutes

**Requirements:**
1. Run all seed scripts in correct order:
   - seed-master-department.ts
   - seed-role-definitions.ts
   - seed-access-rights.ts
   - seed-admin.ts
2. Add npm script: `npm run seed:role-system`
3. Handle errors gracefully
4. Report progress

---

## Phase 3: Authentication Service Updates
**Duration:** 2-3 days  
**Dependencies:** Phase 1 & 2 complete  
**Parallelism:** Tasks 3.1-3.2 can run in parallel, then 3.3-3.5

### Task 3.1: Create AccessRightsService
**Agent ID:** `agent-1`  
**File:** `src/services/auth/access-rights.service.ts`  
**Estimated Time:** 2 hours

**Requirements:**
1. `getAccessRightsForRole(roleName: string): Promise<string[]>`
2. `getAccessRightsForRoles(roles: string[]): Promise<string[]>` (union)
3. `expandWildcards(rights: string[]): Promise<string[]>`
4. `hasAccessRight(userRights: string[], required: string): boolean`
5. `hasAnyAccessRight(userRights: string[], required: string[]): boolean`
6. `hasAllAccessRights(userRights: string[], required: string[]): boolean`
7. Cache role→access rights mappings

**Tests Required:**
- `tests/unit/services/access-rights.service.test.ts`

---

### Task 3.2: Create RoleService
**Agent ID:** `agent-2`  
**File:** `src/services/auth/role.service.ts`  
**Estimated Time:** 2 hours

**Requirements:**
1. `getRolesForDepartment(userId: ObjectId, deptId: ObjectId, userType: UserType): Promise<string[]>`
2. `getVisibleDepartments(userId: ObjectId, userType: UserType): Promise<DepartmentWithRoles[]>`
3. `checkRoleCascading(userId: ObjectId, deptId: ObjectId, userType: UserType): Promise<string[]>`
4. `getAllRolesForUser(userId: ObjectId): Promise<DepartmentMembership[]>`
5. Implement parent department role cascading logic

**Tests Required:**
- `tests/unit/services/role.service.test.ts`

---

### Task 3.3: Update AuthService Login Response
**Agent ID:** `agent-3`  
**File:** `src/services/auth/auth.service.ts`  
**Estimated Time:** 2.5 hours

**Dependencies:** Tasks 3.1, 3.2

**Requirements:**
1. Update login to return V2 response format
2. Include `userTypes[]` in response
3. Include `departmentMemberships[]` with roles and access rights
4. Include `allAccessRights[]` (union of all department rights)
5. Include `canEscalateToAdmin` boolean
6. Include `lastSelectedDepartment`
7. Calculate `defaultDashboard` from userTypes

**Response Contract:** See `contracts/api/auth-v2.contract.ts`

**Tests Required:**
- `tests/integration/auth/login.test.ts` - V2 response format

---

### Task 3.4: Create Escalation Service
**Agent ID:** `agent-4`  
**File:** `src/services/auth/escalation.service.ts`  
**Estimated Time:** 2 hours

**Dependencies:** Task 3.1

**Requirements:**
1. `escalate(userId: ObjectId, escalationPassword: string): Promise<AdminSession>`
2. `deescalate(userId: ObjectId): Promise<void>`
3. `validateAdminToken(token: string): Promise<AdminTokenPayload>`
4. `isAdminSessionActive(userId: ObjectId): Promise<boolean>`
5. Generate separate admin token with shorter expiry
6. Track lastEscalation timestamp
7. Implement session timeout logic (default 15 min)

**Tests Required:**
- `tests/unit/services/escalation.service.test.ts`
- `tests/integration/auth/escalation.test.ts`

---

### Task 3.5: Create Department Switch Service
**Agent ID:** `agent-5`  
**File:** `src/services/auth/department-switch.service.ts`  
**Estimated Time:** 1.5 hours

**Dependencies:** Tasks 3.1, 3.2

**Requirements:**
1. `switchDepartment(userId: ObjectId, deptId: ObjectId): Promise<SwitchDepartmentResponse>`
2. Validate user has membership in department
3. Return department-specific roles and access rights
4. Return child departments (if role cascading enabled)
5. Update `User.lastSelectedDepartment`

**Tests Required:**
- `tests/unit/services/department-switch.service.test.ts`

---

## Phase 4: Controllers & Routes
**Duration:** 2 days  
**Dependencies:** Phase 3 complete  
**Parallelism:** All tasks can run in parallel

### Task 4.1: Create Auth V2 Controller Methods
**Agent ID:** `agent-1`  
**File:** `src/controllers/auth/auth.controller.ts`  
**Estimated Time:** 2 hours

**Requirements:**
1. Update `login` controller to use V2 response
2. Add `escalate` controller method
3. Add `deescalate` controller method
4. Add `switchDepartment` controller method
5. Add `continue` controller method (token refresh with updated rights)
6. Update `me` controller to return V2 format

---

### Task 4.2: Create Roles Controller
**Agent ID:** `agent-2`  
**File:** `src/controllers/auth/roles.controller.ts`  
**Estimated Time:** 1.5 hours

**Requirements:**
1. `listRoles` - GET /api/v2/roles
2. `getRole` - GET /api/v2/roles/:name
3. `getRolesByUserType` - GET /api/v2/roles/user-type/:type
4. `updateRoleAccessRights` - PUT /api/v2/roles/:name/access-rights (system-admin only)
5. `getMyRoles` - GET /api/v2/roles/me
6. `getMyRolesForDepartment` - GET /api/v2/roles/me/department/:departmentId

---

### Task 4.3: Create Access Rights Controller
**Agent ID:** `agent-3`  
**File:** `src/controllers/auth/access-rights.controller.ts`  
**Estimated Time:** 1 hour

**Requirements:**
1. `listAccessRights` - GET /api/v2/access-rights
2. `getAccessRightsByDomain` - GET /api/v2/access-rights/domain/:domain
3. `getAccessRightsForRole` - GET /api/v2/access-rights/role/:roleName

---

### Task 4.4: Update Auth Routes
**Agent ID:** `agent-4`  
**File:** `src/routes/auth.routes.ts`  
**Estimated Time:** 1 hour

**Requirements:**
1. Add `POST /auth/escalate`
2. Add `POST /auth/deescalate`
3. Add `POST /auth/switch-department`
4. Add `POST /auth/continue`
5. Ensure existing routes work with V2

---

### Task 4.5: Create Roles Routes
**Agent ID:** `agent-5`  
**File:** `src/routes/roles.routes.ts`  
**Estimated Time:** 45 minutes

**Requirements:**
1. `GET /roles` - list all
2. `GET /roles/:name` - get one
3. `GET /roles/user-type/:type` - by userType
4. `PUT /roles/:name/access-rights` - update (protected)
5. `GET /roles/me` - current user's roles
6. `GET /roles/me/department/:departmentId` - user's roles in specific dept

---

### Task 4.6: Create Access Rights Routes
**Agent ID:** `agent-6`  
**File:** `src/routes/access-rights.routes.ts`  
**Estimated Time:** 30 minutes

**Requirements:**
1. `GET /access-rights`
2. `GET /access-rights/domain/:domain`
3. `GET /access-rights/role/:roleName`

---

## Phase 5: Middleware & Authorization
**Duration:** 2 days  
**Dependencies:** Phase 4 complete  
**Parallelism:** Tasks 5.1-5.3 can run in parallel

### Task 5.1: Create requireDepartmentMembership Middleware
**Agent ID:** `agent-1`  
**File:** `src/middlewares/require-department-membership.ts`  
**Estimated Time:** 1.5 hours

**Requirements:**
1. Extract departmentId from request (params, query, or body)
2. Verify user has active membership in department
3. Check role cascading from parent departments
4. Attach department context to request
5. Return 403 if not a member

---

### Task 5.2: Create requireDepartmentRole Middleware
**Agent ID:** `agent-2`  
**File:** `src/middlewares/require-department-role.ts`  
**Estimated Time:** 1.5 hours

**Requirements:**
1. Accept array of allowed roles
2. Check user has at least one role in current department
3. Support role cascading
4. Return 403 if no matching role

**Usage:**
```typescript
router.post('/courses', 
  requireDepartmentRole(['content-admin', 'department-admin']),
  createCourse
);
```

---

### Task 5.3: Create requireEscalation Middleware
**Agent ID:** `agent-3`  
**File:** `src/middlewares/require-escalation.ts`  
**Estimated Time:** 1.5 hours

**Requirements:**
1. Check for admin token in `X-Admin-Token` header
2. Validate admin token is not expired
3. Verify user has GlobalAdmin record
4. Attach admin roles to request
5. Return 401 if no valid admin session

---

### Task 5.4: Create requireAdminRole Middleware
**Agent ID:** `agent-4`  
**File:** `src/middlewares/require-admin-role.ts`  
**Estimated Time:** 1 hour

**Dependencies:** Task 5.3

**Requirements:**
1. Must run after requireEscalation
2. Check user has required admin role in master department
3. Return 403 if role not present

**Usage:**
```typescript
router.put('/admin/settings',
  requireEscalation,
  requireAdminRole(['system-admin', 'theme-admin']),
  updateSettings
);
```

---

### Task 5.5: Create requireAccessRight Middleware
**Agent ID:** `agent-5`  
**File:** `src/middlewares/require-access-right.ts`  
**Estimated Time:** 1.5 hours

**Requirements:**
1. Accept single access right or array
2. Support `requireAll` or `requireAny` modes
3. Check user's access rights for current department context
4. Support wildcard matching (e.g., `system:*`)
5. Return 403 if access right not present

**Usage:**
```typescript
router.post('/courses',
  requireAccessRight(['content:courses:manage']),
  createCourse
);

router.get('/reports/billing',
  requireAccessRight(['billing:department:read', 'reports:billing:read'], { requireAny: true }),
  getBillingReport
);
```

---

### Task 5.6: Update isAuthenticated Middleware
**Agent ID:** `agent-6`  
**File:** `src/middlewares/isAuthenticated.ts`  
**Estimated Time:** 1 hour

**Requirements:**
1. Attach `userTypes[]` to request
2. Attach `allAccessRights[]` to request
3. Check for admin token and attach admin context if present
4. Support both V1 and V2 token formats during transition

---

## Phase 6: Validators & Schemas
**Duration:** 1 day  
**Dependencies:** Phase 1 complete  
**Parallelism:** All tasks can run in parallel

### Task 6.1: Create Escalation Validator
**Agent ID:** `agent-1`  
**File:** `src/validators/escalation.validator.ts`  
**Estimated Time:** 30 minutes

**Requirements:**
```typescript
escalateSchema = {
  body: {
    escalationPassword: { type: 'string', required: true, minLength: 8 }
  }
}
```

---

### Task 6.2: Create Department Switch Validator
**Agent ID:** `agent-2`  
**File:** `src/validators/department-switch.validator.ts`  
**Estimated Time:** 30 minutes

**Requirements:**
```typescript
switchDepartmentSchema = {
  body: {
    departmentId: { type: 'string', required: true, format: 'objectId' }
  }
}
```

---

### Task 6.3: Create Role Update Validator
**Agent ID:** `agent-3`  
**File:** `src/validators/role.validator.ts`  
**Estimated Time:** 30 minutes

**Requirements:**
```typescript
updateRoleAccessRightsSchema = {
  params: {
    name: { type: 'string', required: true }
  },
  body: {
    accessRights: { type: 'array', items: 'string', required: true }
  }
}
```

---

### Task 6.4: Update Auth Validators
**Agent ID:** `agent-4`  
**File:** `src/validators/auth.validator.ts`  
**Estimated Time:** 30 minutes

**Requirements:**
1. Add `setEscalationPasswordSchema`
2. Update login response documentation

---

## Phase 7: Integration Tests
**Duration:** 2-3 days  
**Dependencies:** Phase 6 complete  
**Parallelism:** All tasks can run in parallel

### Task 7.1: Auth V2 Login Tests
**Agent ID:** `agent-1`  
**File:** `tests/integration/auth/login-v2.test.ts`  
**Estimated Time:** 2 hours

**Test Cases:**
1. Login returns userTypes array
2. Login returns departmentMemberships
3. Login returns allAccessRights
4. Login returns canEscalateToAdmin correctly
5. Login calculates defaultDashboard correctly
6. Login includes lastSelectedDepartment

---

### Task 7.2: Escalation Tests
**Agent ID:** `agent-2`  
**File:** `tests/integration/auth/escalation.test.ts`  
**Estimated Time:** 2 hours

**Test Cases:**
1. Escalation succeeds with correct password
2. Escalation fails with wrong password
3. Escalation fails for non-global-admin user
4. Admin token has correct expiry
5. De-escalation invalidates admin token
6. Admin session timeout works

---

### Task 7.3: Department Switch Tests
**Agent ID:** `agent-3`  
**File:** `tests/integration/auth/department-switch.test.ts`  
**Estimated Time:** 1.5 hours

**Test Cases:**
1. Switch succeeds for member department
2. Switch fails for non-member department
3. Switch updates lastSelectedDepartment
4. Switch returns correct roles
5. Switch includes child departments

---

### Task 7.4: Role Cascading Tests
**Agent ID:** `agent-4`  
**File:** `tests/integration/auth/role-cascading.test.ts`  
**Estimated Time:** 2 hours

**Test Cases:**
1. User has role in child via parent membership
2. Role cascading respects requireExplicitMembership flag
3. Multiple levels of cascading work
4. Cascaded roles grant correct access rights

---

### Task 7.5: Middleware Tests
**Agent ID:** `agent-5`  
**File:** `tests/integration/middleware/authorization.test.ts`  
**Estimated Time:** 2 hours

**Test Cases:**
1. requireDepartmentMembership blocks non-members
2. requireDepartmentRole blocks users without role
3. requireEscalation blocks non-admin users
4. requireAdminRole blocks users without admin role
5. requireAccessRight blocks users without right
6. Wildcard access rights work

---

### Task 7.6: Roles API Tests
**Agent ID:** `agent-6`  
**File:** `tests/integration/roles/roles-api.test.ts`  
**Estimated Time:** 1.5 hours

**Test Cases:**
1. List all roles
2. Get role by name
3. Get roles by userType
4. Update role access rights (system-admin only)
5. Get my roles
6. Get my roles for specific department

---

## Phase 8: Documentation & Final Integration
**Duration:** 1 day  
**Dependencies:** All previous phases  
**Parallelism:** All tasks can run in parallel

### Task 8.1: Update API Documentation
**Agent ID:** `agent-1`  
**File:** `docs/api/auth-v2.md`  
**Estimated Time:** 1 hour

**Requirements:**
1. Document all new endpoints
2. Include request/response examples
3. Document error codes
4. Add migration notes from V1

---

### Task 8.2: Update OpenAPI Spec
**Agent ID:** `agent-2`  
**File:** `docs/openapi/auth.yaml`  
**Estimated Time:** 1 hour

**Requirements:**
1. Add new endpoints to OpenAPI spec
2. Update response schemas
3. Add security schemes for admin token

---

### Task 8.3: Create Migration Script
**Agent ID:** `agent-3`  
**File:** `src/migrations/v2-role-system.migration.ts`  
**Estimated Time:** 1.5 hours

**Requirements:**
1. Migrate existing User data to new schema
2. Migrate existing Staff data
3. Migrate existing Learner data
4. Create GlobalAdmin records for existing admins
5. Make migration reversible
6. Add to migration runner

---

### Task 8.4: Update Postman Collection
**Agent ID:** `agent-4`  
**File:** `docs/postman/LMS-V2.postman_collection.json`  
**Estimated Time:** 1 hour

**Requirements:**
1. Add new auth endpoints
2. Add new roles endpoints
3. Add environment variables for admin token
4. Add test scripts

---

### Task 8.5: Final Integration Test
**Agent ID:** `agent-5`  
**File:** `tests/integration/role-system-e2e.test.ts`  
**Estimated Time:** 2 hours

**Requirements:**
1. End-to-end test of login → escalation → admin action flow
2. End-to-end test of department switching
3. End-to-end test of role-based access control
4. Performance test with multiple departments

---

## Agent Assignment Summary

| Agent | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 | Phase 7 | Phase 8 |
|-------|---------|---------|---------|---------|---------|---------|---------|---------|
| agent-1 | 1.1 User | 2.1 Roles Seed | 3.1 AccessRights Svc | 4.1 Auth Ctrl | 5.1 Dept Member MW | 6.1 Escalate Val | 7.1 Login Tests | 8.1 API Docs |
| agent-2 | 1.2 Staff | 2.2 Rights Seed | 3.2 Role Svc | 4.2 Roles Ctrl | 5.2 Dept Role MW | 6.2 Switch Val | 7.2 Escalate Tests | 8.2 OpenAPI |
| agent-3 | 1.3 Learner | 2.3 Master Dept | 3.3 Auth Svc | 4.3 Rights Ctrl | 5.3 Escalation MW | 6.3 Role Val | 7.3 Switch Tests | 8.3 Migration |
| agent-4 | 1.4 Constants | 2.4 Admin Seed | 3.4 Escalation Svc | 4.4 Auth Routes | 5.4 Admin Role MW | 6.4 Auth Val | 7.4 Cascade Tests | 8.4 Postman |
| agent-5 | 1.5 Membership | 2.5 Combined Seed | 3.5 Switch Svc | 4.5 Roles Routes | 5.5 AccessRight MW | - | 7.5 MW Tests | 8.5 E2E Test |
| agent-6 | 1.6 Department | - | - | 4.6 Rights Routes | 5.6 isAuth Update | - | 7.6 Roles Tests | - |

---

## Execution Order

```
Week 1:
├─ Day 1-2: Phase 1 (all parallel)
├─ Day 3: Phase 2 (2.1-2.4 parallel, then 2.5)
└─ Day 4-5: Phase 3 (3.1-3.2 parallel, then 3.3-3.5)

Week 2:
├─ Day 1: Phase 4 (all parallel)
├─ Day 2-3: Phase 5 (5.1-5.3 parallel, then 5.4-5.6)
├─ Day 3: Phase 6 (all parallel)
└─ Day 4-5: Phase 7 (all parallel)

Week 3:
└─ Day 1: Phase 8 (all parallel)
```

---

## Success Criteria

### Phase Gate: Phase 1 Complete
- [ ] All model updates compile without errors
- [ ] Unit tests for new model fields pass
- [ ] Role constants module exports correctly

### Phase Gate: Phase 2 Complete
- [ ] Seed scripts run without errors
- [ ] Database contains role definitions
- [ ] Database contains access rights
- [ ] Master department exists
- [ ] Default admin user exists

### Phase Gate: Phase 3 Complete
- [ ] Login returns V2 response format
- [ ] Escalation endpoint works
- [ ] Department switch endpoint works
- [ ] Services have unit tests passing

### Phase Gate: Phase 4 Complete
- [ ] All new routes respond correctly
- [ ] Controllers handle all edge cases
- [ ] API matches contracts

### Phase Gate: Phase 5 Complete
- [ ] All middleware blocks unauthorized access
- [ ] Role cascading works correctly
- [ ] Admin escalation is enforced

### Phase Gate: Phase 6 Complete
- [ ] All validators reject invalid input
- [ ] Error messages are helpful

### Phase Gate: Phase 7 Complete
- [ ] All integration tests pass
- [ ] Code coverage > 80% for new code

### Phase Gate: Phase 8 Complete
- [ ] Documentation is complete
- [ ] Migration script works
- [ ] E2E tests pass

---

## Risk Mitigation

### Risk: Breaking existing functionality
**Mitigation:** Keep V1 routes working, add V2 routes in parallel

### Risk: Performance degradation with role cascading
**Mitigation:** Cache role lookups, add indexes on departmentMemberships

### Risk: Security vulnerabilities in escalation
**Mitigation:** Extensive testing, admin token in memory only, short expiry

### Risk: Complex migration for existing data
**Mitigation:** Reversible migration, test on staging first, maintain backward compatibility
