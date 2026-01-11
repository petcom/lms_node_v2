# UserType Validation & LookupValues Migration Plan
**Version:** 1.0.0  
**Date:** 2026-01-11  
**Status:** APPROVED - Ready for Implementation  
**Scope:** LookupValues collection, RoleRegistry, Validation Factory, UserType transformation

---

## Executive Summary

This plan consolidates three related changes into a parallelizable implementation:

1. **LookupValues Collection**: Centralized database storage for all enumerated constants
2. **RoleRegistry Service**: In-memory cache with startup validation
3. **Validation Factory**: Consistent validation pattern for roles/userTypes
4. **UserType Object Transformation**: Change `userTypes` from `string[]` to `UserTypeObject[]`
5. **GlobalAdmin Migration**: Rename `roleMemberships` → `departmentMemberships`

**Contract Reference:** [lookup-values.contract.ts](../../contracts/api/lookup-values.contract.ts)

---

## Table of Contents

1. [Parallel Work Streams](#1-parallel-work-streams)
2. [Stream A: Data Layer](#2-stream-a-data-layer)
3. [Stream B: Service Layer](#3-stream-b-service-layer)
4. [Stream C: API Layer](#4-stream-c-api-layer)
5. [Integration Phase](#5-integration-phase)
6. [Testing Strategy](#6-testing-strategy)
7. [Team Configuration](#7-team-configuration)
8. [Definition of Done](#8-definition-of-done)

---

## 1. Parallel Work Streams

### 1.1 Dependency Graph

```
                    ┌─────────────────┐
                    │   CONTRACTS     │ ← Already Done ✓
                    │ (Source of Truth)│
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│   STREAM A     │  │   STREAM B     │  │   STREAM C     │
│   Data Layer   │  │  Service Layer │  │   API Layer    │
│                │  │                │  │                │
│ • LookupValue  │  │ • RoleRegistry │  │ • Auth Response│
│   Model        │  │   (mocked DB)  │  │   Transform    │
│ • Seed Script  │  │ • Validator    │  │ • Middleware   │
│ • Migration    │  │   Factory      │  │   Update       │
│                │  │                │  │                │
└───────┬────────┘  └───────┬────────┘  └───────┬────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                  ┌─────────────────┐
                  │  INTEGRATION    │
                  │                 │
                  │ • Wire together │
                  │ • E2E tests     │
                  │ • GlobalAdmin   │
                  └─────────────────┘
```

### 1.2 Work Stream Independence

| Stream | Can Start | Blocked By | Test Strategy |
|--------|-----------|------------|---------------|
| A: Data | Immediately | Nothing | Unit tests with test DB |
| B: Service | Immediately | Nothing | Unit tests with mocks |
| C: API | Immediately | Nothing | Unit tests with mocks |
| Integration | A, B, C complete | All streams | Integration + E2E tests |

---

## 2. Stream A: Data Layer

**Owner:** TBD  
**Effort:** 4-6 hours  
**Dependencies:** None

### 2.1 Tasks

| ID | Task | File | TDD Order |
|----|------|------|-----------|
| A1 | Create LookupValue model | `src/models/LookupValue.model.ts` | Test first |
| A2 | Create LookupValue model tests | `tests/unit/models/LookupValue.model.test.ts` | Write first |
| A3 | Create constants seed script | `scripts/seeds/constants.seed.ts` | Test first |
| A4 | Create seed runner | `scripts/seeds/run-seeds.ts` | After A3 |
| A5 | Create migration for existing roledefinitions | `src/migrations/migrate-roledefinitions.ts` | After A3 |
| A6 | Add npm script | `package.json` | After A4 |

### 2.2 LookupValue Model Spec

```typescript
// src/models/LookupValue.model.ts
interface ILookupValue {
  _id: Types.ObjectId;
  lookupId: string;           // 'userType.staff', 'role.instructor'
  category: string;           // 'userType' | 'role'
  key: string;                // 'staff', 'instructor'
  parentLookupId: string | null;  // 'userType.staff' for roles
  displayAs: string;          // 'Staff', 'Instructor'
  description?: string;
  sortOrder: number;
  isActive: boolean;
  metadata?: { isDefault?: boolean; icon?: string; color?: string; };
}

// Indexes:
// { lookupId: 1 } unique
// { parentLookupId: 1, isActive: 1 }
// { category: 1, isActive: 1 }
// { key: 1, parentLookupId: 1 }
```

### 2.3 Seed Data

**Location:** `scripts/seeds/constants.seed.ts`

See contract: [lookup-values.contract.ts](../../contracts/api/lookup-values.contract.ts)

- 3 userTypes (learner, staff, global-admin)
- 4 staff roles
- 3 learner roles
- 5 global-admin roles
- Total: 15 lookup values

### 2.4 Test Cases (A2)

```typescript
describe('LookupValue Model', () => {
  describe('Schema Validation', () => {
    it('should require lookupId');
    it('should require category');
    it('should require key');
    it('should require displayAs');
    it('should enforce unique lookupId');
  });
  
  describe('Queries', () => {
    it('should find all userTypes');
    it('should find roles by parentLookupId');
    it('should filter by isActive');
  });
});
```

### 2.5 Definition of Done - Stream A

- [ ] LookupValue model created with all indexes
- [ ] All A2 tests passing
- [ ] Seed script idempotent (safe to run multiple times)
- [ ] `npm run seed:constants` works
- [ ] Migration script created for roledefinitions

---

## 3. Stream B: Service Layer

**Owner:** TBD  
**Effort:** 4-5 hours  
**Dependencies:** None (uses mocks)

### 3.1 Tasks

| ID | Task | File | TDD Order |
|----|------|------|-----------|
| B1 | Create RoleRegistry interface | `src/services/role-registry.interface.ts` | First |
| B2 | Create RoleRegistry tests | `tests/unit/services/role-registry.test.ts` | Write first |
| B3 | Create RoleRegistry implementation | `src/services/role-registry.service.ts` | After B2 |
| B4 | Create ValidatorFactory tests | `tests/unit/validators/department-membership.test.ts` | Write first |
| B5 | Create ValidatorFactory | `src/validators/department-membership.validator.ts` | After B4 |
| B6 | Create userType utils tests | `tests/unit/utils/user-type.utils.test.ts` | Write first |
| B7 | Create userType utils | `src/utils/user-type.utils.ts` | After B6 |

### 3.2 RoleRegistry Interface

```typescript
// src/services/role-registry.interface.ts
export interface IRoleRegistry {
  initialize(): Promise<void>;
  isInitialized(): boolean;
  
  getValidUserTypes(): string[];
  getValidRolesForUserType(userType: string): string[];
  
  isValidUserType(userType: string): boolean;
  isValidRoleForUserType(userType: string, role: string): boolean;
  
  getDisplayAs(lookupId: string): string;
  getUserTypeDisplay(userType: string): string;
  getRoleDisplay(role: string): string;
  
  hydrateUserTypes(userTypeStrings: string[]): UserTypeObject[];
  
  refresh(): Promise<void>;
}
```

### 3.3 Test Cases (B2)

```typescript
describe('RoleRegistry', () => {
  describe('initialize()', () => {
    it('should load all lookups from database');
    it('should throw if no lookups found');
    it('should cache results in memory');
  });
  
  describe('getValidRolesForUserType()', () => {
    it('should return staff roles for userType=staff');
    it('should return learner roles for userType=learner');
    it('should return empty array for invalid userType');
  });
  
  describe('isValidRoleForUserType()', () => {
    it('should return true for valid staff role');
    it('should return false for learner role with staff userType');
  });
  
  describe('hydrateUserTypes()', () => {
    it('should convert string[] to UserTypeObject[]');
    it('should include displayAs from cache');
  });
});
```

### 3.4 ValidatorFactory Spec

```typescript
// src/validators/department-membership.validator.ts
export function validateRolesForUserType(
  registry: IRoleRegistry,
  userType: string,
  roles: string[]
): { isValid: boolean; invalidRoles: string[] }

export function createMongooseValidator(
  registry: IRoleRegistry,
  userType: string
): (roles: string[]) => boolean
```

### 3.5 Definition of Done - Stream B

- [ ] RoleRegistry interface defined
- [ ] All B2, B4, B6 tests passing
- [ ] RoleRegistry works with mock data (no DB dependency)
- [ ] ValidatorFactory works with injected registry
- [ ] userType utils convert to/from objects

---

## 4. Stream C: API Layer

**Owner:** TBD  
**Effort:** 4-5 hours  
**Dependencies:** None (uses mocks)

### 4.1 Tasks

| ID | Task | File | TDD Order |
|----|------|------|-----------|
| C1 | Update auth response types | `src/types/auth.types.ts` | First |
| C2 | Create auth transform tests | `tests/unit/services/auth-transform.test.ts` | Write first |
| C3 | Create auth transform layer | `src/services/auth/auth-transform.service.ts` | After C2 |
| C4 | Create middleware tests | `tests/unit/middlewares/user-type-hydration.test.ts` | Write first |
| C5 | Create middleware update | `src/middlewares/user-type-hydration.ts` | After C4 |
| C6 | Create list endpoints tests | `tests/unit/controllers/lookup-values.test.ts` | Write first |
| C7 | Create list endpoints | `src/controllers/lookup-values.controller.ts` | After C6 |
| C8 | Create routes | `src/routes/lookup-values.routes.ts` | After C7 |

### 4.2 Auth Response Transform

```typescript
// src/services/auth/auth-transform.service.ts
export class AuthTransformService {
  constructor(private registry: IRoleRegistry) {}
  
  transformLoginResponse(rawResponse: RawLoginResponse): LoginResponse {
    return {
      ...rawResponse,
      user: {
        ...rawResponse.user,
        userTypes: this.registry.hydrateUserTypes(rawResponse.user.userTypes)
      }
    };
  }
}
```

### 4.3 Test Cases (C2)

```typescript
describe('AuthTransformService', () => {
  describe('transformLoginResponse()', () => {
    it('should convert userTypes strings to objects');
    it('should include correct displayAs values');
    it('should preserve other response fields');
  });
});
```

### 4.4 New API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/lookup-values` | GET | List lookups with filters |
| `/api/v2/lists/user-types` | GET | Get all userTypes as objects |
| `/api/v2/lists/roles/:userType` | GET | Get roles for a userType |

### 4.5 Definition of Done - Stream C

- [ ] Auth types updated for UserTypeObject
- [ ] All C2, C4, C6 tests passing
- [ ] Transform service works with mocked registry
- [ ] Middleware hydrates userTypes from token
- [ ] List endpoints created

---

## 5. Integration Phase

**Owner:** All streams converge  
**Effort:** 4-6 hours  
**Dependencies:** Streams A, B, C complete

### 5.1 Tasks

| ID | Task | File | Description |
|----|------|------|-------------|
| I1 | Wire RoleRegistry to LookupValue | `src/services/role-registry.service.ts` | Replace mocks with real DB |
| I2 | Add startup initialization | `src/app.ts` | Initialize registry on boot |
| I3 | Add startup validation | `src/app.ts` | Fail if lookups missing |
| I4 | Update Staff model | `src/models/auth/Staff.model.ts` | Use validator factory |
| I5 | Update Learner model | `src/models/auth/Learner.model.ts` | Use validator factory |
| I6 | Update auth.service.ts | `src/services/auth/auth.service.ts` | Use transform service |
| I7 | Update isAuthenticated | `src/middlewares/isAuthenticated.ts` | Use hydration |
| I8 | GlobalAdmin migration | `src/models/GlobalAdmin.model.ts` | Rename roleMemberships |
| I9 | Create E2E tests | `tests/e2e/auth-usertype.test.ts` | Full flow tests |
| I10 | Deprecate role-constants | `src/models/auth/role-constants.ts` | Add warnings |

### 5.2 Startup Sequence

```typescript
// src/app.ts
async function bootstrap() {
  await connectDatabase();
  
  // Initialize role registry from DB
  const registry = RoleRegistry.getInstance();
  await registry.initialize();
  
  // Validate required lookups exist
  if (!registry.isInitialized()) {
    console.error('FATAL: LookupValues not found. Run: npm run seed:constants');
    process.exit(1);
  }
  
  // Continue with app setup...
}
```

### 5.3 GlobalAdmin Migration Script

```typescript
// src/migrations/migrate-globaladmin.ts
db.globaladmins.updateMany(
  {},
  [
    { $set: { departmentMemberships: '$roleMemberships' } },
    { $unset: 'roleMemberships' }
  ]
);

// Rename nested fields
db.globaladmins.updateMany(
  {},
  { $rename: { 'departmentMemberships.$[].assignedAt': 'departmentMemberships.$[].joinedAt' } }
);

// Add isPrimary
db.globaladmins.updateMany(
  {},
  [
    { $set: { 
      'departmentMemberships': {
        $map: {
          input: { $ifNull: ['$departmentMemberships', []] },
          as: 'dm',
          in: { $mergeObjects: ['$$dm', { isPrimary: { $eq: [{ $indexOfArray: ['$departmentMemberships', '$$dm'] }, 0] } }] }
        }
      }
    }}
  ]
);
```

### 5.4 Definition of Done - Integration

- [ ] Server starts and initializes RoleRegistry
- [ ] Server fails to start if lookups missing
- [ ] Login response includes UserTypeObject[]
- [ ] /me response includes UserTypeObject[]
- [ ] Staff/Learner validation uses factory
- [ ] GlobalAdmin renamed and migrated
- [ ] All E2E tests passing

---

## 6. Testing Strategy

### 6.1 Test Pyramid

```
        ┌───────────┐
        │   E2E     │  2-3 tests (login flow, /me, role validation)
        ├───────────┤
        │Integration│  5-8 tests (DB + service + controller)
        ├───────────┤
        │   Unit    │  30+ tests (models, services, utils, middleware)
        └───────────┘
```

### 6.2 Test Files

| Stream | Test File | Coverage |
|--------|-----------|----------|
| A | `tests/unit/models/LookupValue.model.test.ts` | Model CRUD |
| A | `tests/unit/seeds/constants.seed.test.ts` | Idempotency |
| B | `tests/unit/services/role-registry.test.ts` | Cache, queries |
| B | `tests/unit/validators/department-membership.test.ts` | Validation |
| B | `tests/unit/utils/user-type.utils.test.ts` | Transforms |
| C | `tests/unit/services/auth-transform.test.ts` | Response transform |
| C | `tests/unit/middlewares/user-type-hydration.test.ts` | Token hydration |
| C | `tests/unit/controllers/lookup-values.test.ts` | Endpoints |
| I | `tests/integration/auth/login-usertype.test.ts` | Login flow |
| I | `tests/e2e/auth-usertype.test.ts` | Full E2E |

### 6.3 Mocking Strategy

**Stream A:** Uses real test database (isolated)
**Stream B:** Mocks LookupValue model
**Stream C:** Mocks RoleRegistry interface
**Integration:** Uses test database with seeded data

---

## 7. Team Configuration

### 7.1 Parallel TDD Assignments

| Developer | Stream | Focus |
|-----------|--------|-------|
| Dev 1 | A | LookupValue model, seeds, migrations |
| Dev 2 | B | RoleRegistry, ValidatorFactory |
| Dev 3 | C | Auth transforms, middleware, endpoints |
| All | Integration | Wire together, E2E tests |

### 7.2 Daily Sync Points

1. **Morning:** Share interface contracts, agree on mocks
2. **Midday:** Quick sync on blockers
3. **End of day:** Integration readiness check

### 7.3 Branch Strategy

```
main
  └── feature/lookup-values-migration
        ├── stream-a/data-layer
        ├── stream-b/service-layer
        └── stream-c/api-layer
```

### 7.4 Integration Merge Order

1. Merge Stream A (data layer) first
2. Merge Stream B (update mocks to real)
3. Merge Stream C (update mocks to real)
4. Run all tests, fix integration issues
5. Final merge to main

---

## 8. Definition of Done

### 8.1 Stream Completion Criteria

| Criteria | A | B | C | I |
|----------|---|---|---|---|
| All tests passing | ✓ | ✓ | ✓ | ✓ |
| Code reviewed | ✓ | ✓ | ✓ | ✓ |
| No TypeScript errors | ✓ | ✓ | ✓ | ✓ |
| Linting passes | ✓ | ✓ | ✓ | ✓ |
| Documentation updated | - | - | - | ✓ |

### 8.2 Final Checklist

- [ ] LookupValues collection created and seeded
- [ ] RoleRegistry initializes on startup
- [ ] Server fails if lookups missing
- [ ] Login returns `userTypes: UserTypeObject[]`
- [ ] /me returns `userTypes: UserTypeObject[]`
- [ ] New endpoints functional:
  - [ ] `GET /api/v2/lookup-values`
  - [ ] `GET /api/v2/lists/user-types`
  - [ ] `GET /api/v2/lists/roles/:userType`
- [ ] Staff validation uses factory
- [ ] Learner validation uses factory
- [ ] GlobalAdmin renamed to departmentMemberships
- [ ] role-constants.ts deprecated
- [ ] All 40+ tests passing
- [ ] Migration guide created

### 8.3 Rollback Plan

1. Revert to role-constants.ts for validation
2. Remove RoleRegistry initialization
3. Return userTypes as string[] (remove transform)
4. Keep LookupValue model but don't query it

---

## Appendix A: File Creation Order

### Stream A
1. `src/models/LookupValue.model.ts`
2. `tests/unit/models/LookupValue.model.test.ts`
3. `scripts/seeds/constants.seed.ts`
4. `tests/unit/seeds/constants.seed.test.ts`
5. `scripts/seeds/run-seeds.ts`
6. `src/migrations/migrate-roledefinitions.ts`

### Stream B
1. `src/services/role-registry.interface.ts`
2. `tests/unit/services/role-registry.test.ts`
3. `src/services/role-registry.service.ts`
4. `tests/unit/validators/department-membership.test.ts`
5. `src/validators/department-membership.validator.ts`
6. `tests/unit/utils/user-type.utils.test.ts`
7. `src/utils/user-type.utils.ts`

### Stream C
1. `src/types/auth.types.ts` (update)
2. `tests/unit/services/auth-transform.test.ts`
3. `src/services/auth/auth-transform.service.ts`
4. `tests/unit/middlewares/user-type-hydration.test.ts`
5. `src/middlewares/user-type-hydration.ts`
6. `tests/unit/controllers/lookup-values.test.ts`
7. `src/controllers/lookup-values.controller.ts`
8. `src/routes/lookup-values.routes.ts`

### Integration
1. Wire services
2. `tests/integration/auth/login-usertype.test.ts`
3. `tests/e2e/auth-usertype.test.ts`
4. `src/migrations/migrate-globaladmin.ts`

---

## Appendix B: Contract References

- **Lookup Values:** [contracts/api/lookup-values.contract.ts](../../contracts/api/lookup-values.contract.ts)
- **Auth V2:** [contracts/api/auth-v2.contract.ts](../../contracts/api/auth-v2.contract.ts)
- **Roles:** [contracts/api/roles.contract.ts](../../contracts/api/roles.contract.ts)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-11 | System | Initial plan with parallel streams |
