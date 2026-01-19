# Implementation Plan: IPerson Refactor (3-Layer Architecture)

**Date:** 2026-01-12
**Project:** ISS-001 Breaking Changes - IPerson Refactor
**Status:** 🔴 PENDING APPROVAL
**Timeline:** 8-12 hours (parallelized to 4-6 hours)
**Risk Level:** 🟡 Medium (breaking changes, but pre-production)

---

## Executive Summary

**Objective:** Refactor personal information from single optional `IPerson` to three-layer architecture:
- `IPerson` (Basic) - Shared by all users
- `IStaffPersonExtended` / `ILearnerPersonExtended` - Context-specific
- `IDemographics` - Compliance/reporting data

**Strategy:** Parallel implementation using specialized teams
**Approach:** TDD (Test-Driven Development) with migration-first strategy

---

## Parallel Implementation Teams

### Team Structure (4 Parallel Tracks)

```
Track 1: TYPE DEFINITIONS & SCHEMAS
├── Agent: Schema Architect
├── Duration: 2-3 hours
├── Dependencies: None
└── Deliverables:
    ├── Person.types.ts (IPerson Basic)
    ├── PersonExtended.types.ts (Staff & Learner variants)
    ├── Demographics.types.ts (IDemographics)
    └── All Mongoose schemas

Track 2: DATA MIGRATION
├── Agent: Data Migration Specialist
├── Duration: 2-3 hours
├── Dependencies: Track 1 (types)
└── Deliverables:
    ├── Migration script (migrate-person-field.ts)
    ├── Rollback script
    ├── Validation script
    └── Migration documentation

Track 3: CONTRACTS & API DESIGN
├── Agent: API Contract Designer
├── Duration: 2-3 hours
├── Dependencies: Track 1 (types)
└── Deliverables:
    ├── Updated: users.contract.ts
    ├── New: person.contract.ts
    ├── New: demographics.contract.ts
    └── Contract change documentation

Track 4: MODELS & SERVICES
├── Agent: Backend Implementation
├── Duration: 3-4 hours
├── Dependencies: Track 1 (types), Track 3 (contracts)
└── Deliverables:
    ├── Updated: Staff.model.ts
    ├── Updated: Learner.model.ts
    ├── Updated: UsersService
    ├── Updated: All related services
    └── Updated: All controllers

Track 5: TESTING & VALIDATION (Sequential after Tracks 1-4)
├── Agent: Test Engineer
├── Duration: 2-3 hours
├── Dependencies: All tracks complete
└── Deliverables:
    ├── Updated: All existing tests
    ├── New: Person field tests
    ├── New: Demographics tests
    ├── Integration test suite
    └── Test coverage report
```

### Critical Path Analysis

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: FOUNDATION (Parallel) - Hours 0-3                  │
├─────────────────────────────────────────────────────────────┤
│ Track 1: Types & Schemas          [████████████] 3h         │
│ Track 2: Migration (waits on T1)  [──██████████] 3h         │
│ Track 3: Contracts (waits on T1)  [──██████████] 3h         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: IMPLEMENTATION (Parallel) - Hours 3-6              │
├─────────────────────────────────────────────────────────────┤
│ Track 4: Models & Services        [████████████] 3h         │
│ Track 2: Migration testing        [████████────] 2h         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: TESTING (Mostly Sequential) - Hours 6-9            │
├─────────────────────────────────────────────────────────────┤
│ Track 5: Update tests             [████████████] 3h         │
│          Integration tests        [████████────]            │
└─────────────────────────────────────────────────────────────┘

Total Elapsed Time: 6-9 hours (parallelized from 12-15 hours)
```

---

## Track 1: Type Definitions & Schemas

### Task 1.1: Create IPerson (Basic) Type
**File:** `src/models/auth/Person.types.ts`
**Duration:** 1 hour
**Priority:** CRITICAL (blocks all other tracks)

**Deliverables:**
- `IPerson` interface
- `IPhone` interface
- `IEmail` interface (enhanced)
- `IAddress` interface (enhanced)
- `ILegalConsent` interface
- `ICommunicationPreferences` interface
- All Mongoose schemas (PersonSchema, PhoneSchema, EmailSchema, AddressSchema)

**Validation:**
- [ ] TypeScript compiles without errors
- [ ] All fields have proper validation
- [ ] Schemas have proper indexes
- [ ] Documentation complete (JSDoc)

### Task 1.2: Create IPersonExtended Types
**File:** `src/models/auth/PersonExtended.types.ts`
**Duration:** 1 hour
**Priority:** CRITICAL

**Deliverables:**
- `IStaffPersonExtended` interface
- `ILearnerPersonExtended` interface
- `ICredential` interface
- `IEmergencyContact` interface
- `IParentGuardian` interface
- `IIdentification` interface (enhanced)
- `IPriorEducation` interface
- `IAccommodation` interface
- All related Mongoose schemas

**Validation:**
- [ ] TypeScript compiles without errors
- [ ] Staff vs Learner distinction is clear
- [ ] Emergency contact structure complete
- [ ] Documentation complete

### Task 1.3: Create IDemographics Type
**File:** `src/models/auth/Demographics.types.ts`
**Duration:** 30 minutes
**Priority:** HIGH

**Deliverables:**
- `IDemographics` interface
- `DemographicsSchema` for Mongoose
- Proper enums for race, ethnicity, citizenship, etc.

**Validation:**
- [ ] IPEDS reporting fields present
- [ ] Privacy/consent fields included
- [ ] Self-reported tracking
- [ ] Documentation complete

---

## Track 2: Data Migration

### Task 2.1: Create Migration Script
**File:** `scripts/migrate-person-refactor.ts`
**Duration:** 2 hours
**Dependencies:** Track 1 complete (types exist)
**Priority:** CRITICAL

**Script Phases:**
1. **Backup Phase:** Create database backup
2. **Staff Migration:** Migrate staff records to new structure
3. **Learner Migration:** Migrate learner records to new structure
4. **Validation Phase:** Verify all records migrated
5. **Cleanup Phase:** (Optional) Remove old fields

**Deliverables:**
```typescript
// Migration functions
- migrateStaffToPerson()
- migrateLearnerToPerson()
- validateMigration()
- rollbackMigration()
- cleanupLegacyFields()  // Optional, dangerous
```

**Validation:**
- [ ] Dry-run mode works
- [ ] Progress reporting works
- [ ] Error handling comprehensive
- [ ] Rollback tested
- [ ] Zero data loss verified

### Task 2.2: Test Migration on Dev Data
**Duration:** 1 hour
**Priority:** CRITICAL

**Steps:**
1. Create test database with sample data
2. Run migration in dry-run mode
3. Run actual migration
4. Validate results
5. Test rollback
6. Document any edge cases

**Validation:**
- [ ] All staff records migrated
- [ ] All learner records migrated
- [ ] No data loss
- [ ] Rollback works correctly

---

## Track 3: Contracts & API Design

### Task 3.1: Create person.contract.ts
**File:** `contracts/api/person.contract.ts` (NEW)
**Duration:** 1.5 hours
**Dependencies:** Track 1 complete (types exist)
**Priority:** HIGH

**Contract Endpoints:**
```typescript
GET    /api/v2/users/me/person          - Get full person data
PUT    /api/v2/users/me/person          - Update person data
GET    /api/v2/users/me/person/extended - Get extended data
PUT    /api/v2/users/me/person/extended - Update extended data
GET    /api/v2/users/me/demographics    - Get demographics
PUT    /api/v2/users/me/demographics    - Update demographics
POST   /api/v2/users/me/person/avatar   - Upload avatar
DELETE /api/v2/users/me/person/avatar   - Delete avatar
```

**Validation:**
- [ ] All request/response schemas defined
- [ ] Validation rules specified
- [ ] Error responses documented
- [ ] Examples provided

### Task 3.2: Update users.contract.ts
**File:** `contracts/api/users.contract.ts` (EXISTING)
**Duration:** 1 hour
**Priority:** HIGH

**Changes:**
```typescript
GET /api/v2/users/me
  - BEFORE: Flat structure (firstName, lastName, etc.)
  - AFTER: Nested structure (person: { firstName, lastName, ... })

PUT /api/v2/users/me
  - BEFORE: Direct field updates
  - AFTER: Updates to person.* fields
```

**Validation:**
- [ ] Breaking changes documented
- [ ] Migration guide for API consumers
- [ ] Backward compatibility notes
- [ ] Examples updated

### Task 3.3: Create demographics.contract.ts
**File:** `contracts/api/demographics.contract.ts` (NEW)
**Duration:** 30 minutes
**Priority:** MEDIUM

**Contract Endpoints:**
```typescript
GET /api/v2/users/me/demographics       - Get demographics
PUT /api/v2/users/me/demographics       - Update demographics
```

**Validation:**
- [ ] Privacy considerations documented
- [ ] Opt-in consent flow defined
- [ ] IPEDS reporting fields mapped

---

## Track 4: Models & Services

### Task 4.1: Update Staff Model
**File:** `src/models/auth/Staff.model.ts`
**Duration:** 1 hour
**Dependencies:** Track 1 (types), Track 3 (contracts)
**Priority:** CRITICAL

**Changes:**
```typescript
interface IStaff {
  // REMOVE these fields:
  // firstName, lastName, phoneNumber

  // ADD these fields:
  person: IPerson;                      // REQUIRED
  personExtended?: IStaffPersonExtended; // OPTIONAL
  demographics?: IDemographics;         // OPTIONAL

  // KEEP these fields:
  title?: string;                       // Job-related
  departmentMemberships: [...];
  isActive: boolean;
}
```

**Validation:**
- [ ] Schema updated
- [ ] Indexes updated
- [ ] Methods updated (if any reference old fields)
- [ ] TypeScript compiles

### Task 4.2: Update Learner Model
**File:** `src/models/auth/Learner.model.ts`
**Duration:** 1 hour
**Priority:** CRITICAL

**Changes:**
```typescript
interface ILearner {
  // REMOVE these fields:
  // firstName, lastName, dateOfBirth, phoneNumber, address, emergencyContact

  // ADD these fields:
  person: IPerson;                        // REQUIRED
  personExtended?: ILearnerPersonExtended; // OPTIONAL
  demographics?: IDemographics;           // OPTIONAL

  // KEEP these fields:
  departmentMemberships: [...];
  isActive: boolean;
}
```

**Validation:**
- [ ] Schema updated
- [ ] Emergency contact moved to personExtended
- [ ] Methods updated
- [ ] TypeScript compiles

### Task 4.3: Update UsersService
**File:** `src/services/users/users.service.ts`
**Duration:** 2 hours
**Priority:** CRITICAL

**Changes:**

**Method: getMe()**
```typescript
// BEFORE (Current - buggy)
const userObj: any = {
  firstName: staff.firstName,  // Flat structure
  lastName: staff.lastName,
  phone: staff.phoneNumber
}

// AFTER (Clean)
const userObj: any = {
  staff: {
    person: staff.person,              // Nested structure
    personExtended: staff.personExtended,
    demographics: staff.demographics?.allowReporting ? staff.demographics : null
  }
}
```

**Method: updateMe()**
```typescript
// BEFORE
staff.firstName = updateData.firstName;
staff.lastName = updateData.lastName;

// AFTER
staff.person.firstName = updateData.person.firstName;
staff.person.lastName = updateData.person.lastName;
```

**New Methods to Add:**
- `getPersonData(userId): Promise<IPerson>`
- `updatePersonData(userId, personData): Promise<IPerson>`
- `getExtendedData(userId): Promise<IStaffPersonExtended | ILearnerPersonExtended>`
- `updateExtendedData(userId, extendedData): Promise<...>`
- `getDemographics(userId): Promise<IDemographics>`
- `updateDemographics(userId, demographics): Promise<IDemographics>`

**Validation:**
- [ ] All methods updated
- [ ] No references to old flat structure
- [ ] Fix user.roles → user.userTypes bug
- [ ] TypeScript compiles

### Task 4.4: Update Users Controller
**File:** `src/controllers/users/users.controller.ts`
**Duration:** 1 hour
**Priority:** HIGH

**New Endpoints to Add:**
- `getPersonData` - GET /users/me/person
- `updatePersonData` - PUT /users/me/person
- `getExtendedData` - GET /users/me/person/extended
- `updateExtendedData` - PUT /users/me/person/extended
- `getDemographics` - GET /users/me/demographics
- `updateDemographics` - PUT /users/me/demographics

**Existing to Update:**
- `getMe` - Return new structure
- `updateMe` - Accept new structure

**Validation:**
- [ ] All endpoints implemented
- [ ] Validation middleware added
- [ ] Error handling proper
- [ ] TypeScript compiles

### Task 4.5: Update Routes
**File:** `src/routes/users.routes.ts`
**Duration:** 30 minutes
**Priority:** HIGH

**Add Routes:**
```typescript
router.get('/me/person', usersController.getPersonData);
router.put('/me/person', usersController.updatePersonData);
router.get('/me/person/extended', usersController.getExtendedData);
router.put('/me/person/extended', usersController.updateExtendedData);
router.get('/me/demographics', usersController.getDemographics);
router.put('/me/demographics', usersController.updateDemographics);
```

**Validation:**
- [ ] All routes added
- [ ] Authentication middleware applied
- [ ] Documentation updated

### Task 4.6: Update Seed Scripts
**File:** `scripts/seed-admin.ts` and others
**Duration:** 30 minutes
**Priority:** HIGH

**Changes:**
```typescript
// BEFORE
await Staff.create({
  _id: userId,
  firstName: 'System',
  lastName: 'Admin'
});

// AFTER
await Staff.create({
  _id: userId,
  person: {
    firstName: 'System',
    lastName: 'Admin',
    emails: [{ email: 'admin@lms.edu', type: 'institutional', isPrimary: true, verified: true, allowNotifications: true }],
    phones: [],
    addresses: [],
    timezone: 'America/New_York',
    languagePreference: 'en'
  }
});
```

**Validation:**
- [ ] All seed scripts updated
- [ ] Seeds create valid data
- [ ] No TypeScript errors

---

## Track 5: Testing & Validation

### Task 5.1: Update Existing Tests
**Files:** All test files
**Duration:** 2 hours
**Dependencies:** Track 4 complete
**Priority:** CRITICAL

**Test Files to Update:**
- `tests/integration/users/password-change.test.ts` (23 tests)
- `tests/integration/auth/department-switch.test.ts` (28 tests)
- Any other tests creating Staff/Learner records

**Changes:**
```typescript
// BEFORE
testStaff = await Staff.create({
  _id: userId,
  firstName: 'Test',
  lastName: 'User'
});

// AFTER
testStaff = await Staff.create({
  _id: userId,
  person: {
    firstName: 'Test',
    lastName: 'User',
    emails: [{ email: 'test@example.com', type: 'institutional', isPrimary: true, verified: true, allowNotifications: true }],
    phones: [],
    addresses: [],
    timezone: 'America/New_York',
    languagePreference: 'en'
  }
});

// Update assertions
// BEFORE: expect(staff.firstName).toBe('Test');
// AFTER: expect(staff.person.firstName).toBe('Test');
```

**Validation:**
- [ ] All tests pass
- [ ] No skipped tests
- [ ] Test coverage maintained

### Task 5.2: Create New Person Tests
**File:** `tests/integration/users/person.test.ts` (NEW)
**Duration:** 1.5 hours
**Priority:** HIGH

**Test Suites:**
1. **GET /api/v2/users/me/person**
   - Should return person data for authenticated user
   - Should return 401 for unauthenticated
   - Should return 404 if user not found

2. **PUT /api/v2/users/me/person**
   - Should update person data
   - Should validate required fields
   - Should validate email format
   - Should validate phone format
   - Should not allow updating other users' data

3. **GET /api/v2/users/me/person/extended**
   - Should return staff extended data for staff user
   - Should return learner extended data for learner user
   - Should return 404 if no extended data

4. **PUT /api/v2/users/me/person/extended**
   - Should update extended data
   - Should validate staff-specific fields for staff
   - Should validate learner-specific fields for learners
   - Should not allow cross-type updates

**Validation:**
- [ ] All tests pass
- [ ] Edge cases covered
- [ ] Error handling tested

### Task 5.3: Create Demographics Tests
**File:** `tests/integration/users/demographics.test.ts` (NEW)
**Duration:** 1 hour
**Priority:** MEDIUM

**Test Suites:**
1. **GET /api/v2/users/me/demographics**
   - Should return demographics if consent given
   - Should return null if no consent
   - Should respect privacy settings

2. **PUT /api/v2/users/me/demographics**
   - Should update demographics
   - Should validate enum values
   - Should track consent properly
   - Should allow opt-out

**Validation:**
- [ ] Privacy considerations tested
- [ ] Consent flow tested
- [ ] All tests pass

### Task 5.4: Integration Testing
**Duration:** 1 hour
**Priority:** HIGH

**Test Scenarios:**
1. **Full User Lifecycle:**
   - Create user with full person data
   - Update person data
   - Update extended data
   - Update demographics
   - Retrieve all data
   - Verify consistency

2. **Migration Validation:**
   - Seed old-style data
   - Run migration
   - Verify new structure
   - Test all endpoints
   - Verify no data loss

3. **API Contract Validation:**
   - Test all new endpoints
   - Verify response structure matches contract
   - Test error responses
   - Test authentication/authorization

**Validation:**
- [ ] All integration tests pass
- [ ] End-to-end flows work
- [ ] Performance acceptable

---

## Contract Changes Documentation

### Breaking Changes

#### GET /api/v2/users/me

**BEFORE:**
```json
{
  "id": "123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "555-1234",
  "role": "staff"
}
```

**AFTER:**
```json
{
  "id": "123",
  "email": "user@example.com",
  "userTypes": ["staff"],
  "defaultDashboard": "staff",
  "staff": {
    "person": {
      "firstName": "John",
      "lastName": "Doe",
      "preferredFirstName": null,
      "emails": [
        {
          "email": "john@university.edu",
          "type": "institutional",
          "isPrimary": true,
          "verified": true
        }
      ],
      "phones": [
        {
          "number": "+1-555-1234",
          "type": "mobile",
          "isPrimary": true,
          "verified": true
        }
      ],
      "timezone": "America/New_York",
      "languagePreference": "en"
    },
    "personExtended": {
      "professionalTitle": "Associate Professor",
      "officeLocation": "Science Building 305"
    },
    "demographics": null
  }
}
```

**Migration Guide:**
- Change `response.firstName` → `response.staff.person.firstName`
- Change `response.phone` → `response.staff.person.phones[0].number`
- Change `response.role` → `response.userTypes`

#### PUT /api/v2/users/me

**BEFORE:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "555-1234"
}
```

**AFTER:**
```json
{
  "person": {
    "firstName": "John",
    "lastName": "Doe",
    "phones": [
      {
        "number": "+1-555-1234",
        "type": "mobile",
        "isPrimary": true
      }
    ]
  }
}
```

### New Endpoints

#### GET /api/v2/users/me/person
**Purpose:** Get basic person data only
**Response:** IPerson object

#### PUT /api/v2/users/me/person
**Purpose:** Update basic person data
**Body:** Partial IPerson object

#### GET /api/v2/users/me/person/extended
**Purpose:** Get context-specific extended data
**Response:** IStaffPersonExtended or ILearnerPersonExtended

#### PUT /api/v2/users/me/person/extended
**Purpose:** Update context-specific extended data
**Body:** Partial IStaffPersonExtended or ILearnerPersonExtended

#### GET /api/v2/users/me/demographics
**Purpose:** Get demographics data (if consent given)
**Response:** IDemographics or null

#### PUT /api/v2/users/me/demographics
**Purpose:** Update demographics data
**Body:** Partial IDemographics with consent

---

## Risk Management

### High Risk Items

1. **Data Loss During Migration**
   - **Mitigation:** Backup before migration, dry-run mode, rollback script
   - **Contingency:** Restore from backup

2. **Breaking API Consumers**
   - **Mitigation:** Version API, provide migration guide, phased rollout
   - **Contingency:** Keep old endpoints temporarily

3. **Test Suite Breaks**
   - **Mitigation:** Update tests incrementally, maintain test coverage
   - **Contingency:** Fix tests before merging

### Medium Risk Items

4. **Performance Degradation**
   - **Mitigation:** Test with realistic data volume, optimize queries
   - **Contingency:** Add indexes, optimize schemas

5. **TypeScript Compilation Errors**
   - **Mitigation:** Incremental changes, test compilation frequently
   - **Contingency:** Fix errors immediately

---

## Success Criteria

### Must Have (Blocking)
- [ ] All TypeScript compiles without errors
- [ ] Zero data loss in migration
- [ ] All existing tests pass
- [ ] New endpoints functional
- [ ] API contracts documented

### Should Have (Important)
- [ ] Test coverage ≥ 90%
- [ ] Migration completes in < 5 minutes
- [ ] Performance within 10% of baseline
- [ ] Documentation complete

### Nice to Have (Polish)
- [ ] Migration progress bar
- [ ] Automated rollback on failure
- [ ] Performance benchmarks
- [ ] UI team integration guide

---

## Timeline & Milestones

### Day 1 (Hours 0-6): Foundation
- **Hour 0-3:** Tracks 1, 2, 3 start in parallel
- **Hour 3:** Track 1 complete (types defined)
- **Hour 4:** Track 2 complete (migration ready)
- **Hour 5:** Track 3 complete (contracts done)
- **Hour 6:** Track 4 starts (implementation)

**Milestone 1:** Types, contracts, and migration ready ✅

### Day 1-2 (Hours 6-12): Implementation
- **Hour 6-9:** Track 4 implementation
- **Hour 9:** Models and services updated
- **Hour 10:** Controllers and routes updated
- **Hour 11:** Seed scripts updated
- **Hour 12:** Track 4 complete

**Milestone 2:** Implementation complete ✅

### Day 2 (Hours 12-18): Testing
- **Hour 12-14:** Update existing tests
- **Hour 14-15:** Create new person tests
- **Hour 15-16:** Create demographics tests
- **Hour 16-17:** Integration testing
- **Hour 17:** All tests passing
- **Hour 18:** Documentation complete

**Milestone 3:** Testing complete, ready for deployment ✅

---

## Rollback Plan

### Immediate Rollback (< 1 hour)
1. Stop application
2. Run rollback script: `npm run migrate:rollback`
3. Restore previous code version
4. Restart application
5. Verify functionality

### Data Recovery (< 2 hours)
1. Stop application
2. Restore database from backup
3. Restore previous code version
4. Restart application
5. Verify data integrity

---

## Team Assignments (for Parallel Implementation)

### Track 1: Schema Architect Agent
**Role:** Define all type structures and Mongoose schemas
**Skills Required:** TypeScript, Mongoose, Data modeling
**Deliverable:** All type files ready for import

### Track 2: Data Migration Agent
**Role:** Create and test migration scripts
**Skills Required:** MongoDB, data migration, scripting
**Deliverable:** Production-ready migration script

### Track 3: API Contract Agent
**Role:** Design API contracts and documentation
**Skills Required:** API design, OpenAPI, documentation
**Deliverable:** Complete contract documentation

### Track 4: Backend Implementation Agent
**Role:** Update models, services, controllers, routes
**Skills Required:** Node.js, Express, TypeScript, business logic
**Deliverable:** Fully functional backend

### Track 5: Test Engineer Agent
**Role:** Update and create comprehensive tests
**Skills Required:** Jest, integration testing, TDD
**Deliverable:** Full test suite passing

---

## Next Steps

1. **Human Approval** - Review and approve this plan
2. **Team Assignment** - Assign agents to tracks
3. **Kickoff** - All tracks start in parallel
4. **Daily Standups** - Sync progress, handle blockers
5. **Integration** - Merge all tracks
6. **Validation** - Run full test suite
7. **Deployment** - Deploy to dev environment
8. **UI Team Notification** - Provide migration guide

---

**Status:** 🔴 Awaiting approval to begin implementation

**Estimated Completion:** 4-6 hours (parallelized) or 12-15 hours (sequential)
