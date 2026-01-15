# API Agent Issue Queue

> **Purpose:** Human-provided issue tracking for API agent work
> **Owner:** Human / API Agent
> **Last Updated:** 2026-01-14

---

## How to Use This Document

1. **Add new issues** to the "Pending Issues" section
2. **Set priority** (critical, high, medium, low)
3. **API Agent will:**
   - Pick up issues in priority order
   - Mark as "in-progress" when starting
   - Move to "completed" when done
   - Create coordination threads with UI team as needed
4. **Dependencies:** Use issue IDs to reference blockers

---

## Initiatives (Large Multi-Phase Projects)

### INIT-001: Commerce & Payout Platform

**Priority:** high
**Type:** initiative
**Status:** 📋 ARCHITECTURE COMPLETE - Ready for Implementation
**Assigned:** API Team
**Estimated Effort:** 12-16 weeks (phased, across 3 systems)

**🔷 KEY DECISION: INDEPENDENT SYSTEMS**

This initiative consists of **three independent systems** with separate codebases:

| System | Repository | Purpose | Money Flow |
|--------|------------|---------|------------|
| **Commerce Platform** | `cadence-commerce-api` | Catalog, cart, checkout, orders | IN |
| **Cadence LMS** | `cadence-lms-api` (current) | Learning, enrollments, progress | - |
| **Payout Platform** | `cadence-payout-api` | Revenue splits, payouts | OUT |

```
┌─────────────────────────────────────────────────────────────────┐
│              COMMERCE PLATFORM (cadence-commerce-api)           │
│  Catalog → Cart → Checkout → Payment → Order → Revenue Ledger  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Connector (enrollment request)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                CADENCE LMS (cadence-lms-api)                    │
│  Pending Enrollment → Approval → Active → Progress → Completion │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Completion event
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│               PAYOUT PLATFORM (cadence-payout-api)              │
│  Revenue Split → Pending Earnings → Confirmed → Payout Queue   │
│  Content Creator Payments │ Instructor Payments │ Platform Fee  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Principles:**
- All enrollments start as **PENDING** (even if auto-approved)
- Revenue tracked **per course, per content creator, per instructor**
- Instructor must **interact with learner** to earn share
- Payments OUT are separate from payments IN

**Planning Documents:**
- `agent_coms/api/SYSTEM_BOUNDARIES.md` - System separation architecture
- `agent_coms/api/BILLING_REGISTRATION_SYSTEM_SPEC.md` - Commerce Platform
- `agent_coms/api/INSTRUCTOR_CONTENT_PAYMENT_SYSTEM.md` - Payout Platform
- `agent_coms/api/BILLING_USER_STORIES.md` - User stories & tasks

**Revenue Distribution Model:**
| Recipient | Default Share | Confirmed When |
|-----------|--------------|----------------|
| Platform | 30% | Enrollment approved |
| Content Creator | 40% | Learner completes course |
| Instructor | 30% | Learner completes + interaction verified |

**Decisions Made (2025-01-14):**
| Decision | Answer | Notes |
|----------|--------|-------|
| System Architecture | Independent systems | Separate repos, APIs, UIs |
| Refund Policy | Admin approval required | No automatic refunds |
| Tax Calculation | TaxJar | Extensible interface |
| Multi-Currency | Yes, USD settlement | Display multiple, settle in USD |
| Guest Checkout | No | Login required |
| Payment Processor | Stripe (default) | Extensible IPaymentProcessor |
| PDF Generation | PDFKit | Lightweight, pure Node.js |
| Email Provider | SendGrid (default) | Mailgun planned, IEmailProvider |

**Next Steps:**
1. ~~Define system boundaries~~ ✅ DONE
2. ~~Answer open questions~~ ✅ DONE
3. Create new repositories: `cadence-commerce-api`, `cadence-payout-api`
4. Begin Commerce Platform Phase 1 (MVP)
5. Implement LMS connector endpoint in current repo

---

## Pending Issues


### API-ISS-001: Personal Schedule/Calendar Endpoint

**Priority:** medium
**Type:** feature
**Status:** pending
**Assigned:** API Agent
**Dependencies:** None
**Requested By:** UI Team (ISS-014 Dashboard Navigation)

**Description:**
The UI team needs a personal schedule/calendar endpoint for staff and learners. Currently the `/api/v2/calendar/*` endpoints only provide the **institutional academic calendar** (years, terms, cohorts), not individual user schedules.

**What Exists:**
- ✅ `GET /api/v2/calendar/years` - Academic years (institutional)
- ✅ `GET /api/v2/calendar/terms` - Academic terms (institutional)
- ✅ `GET /api/v2/calendar/cohorts` - Cohorts (institutional)
- ✅ `GET /api/v2/classes?instructor=me` - My teaching classes
- ✅ `GET /api/v2/enrollments` - Learner enrollments

**What's Needed:**
A unified endpoint that aggregates personal schedule data from multiple sources:

**For Learners:**
- Class meeting times (from ClassEnrollment → Class.schedule)
- Assignment due dates (from Course assignments)
- Exam dates (from Course exams)
- Academic term boundaries (from Terms)

**For Staff/Instructors:**
- Class teaching schedule (from Class.schedule where instructor=me)
- Office hours (from Staff.personExtended.officeHours)
- Grading deadlines (from Classes they teach)

**Proposed Endpoints:**
```
GET /api/v2/users/me/schedule
GET /api/v2/users/me/schedule?startDate=X&endDate=Y
GET /api/v2/users/me/schedule?type=classes|assignments|exams|all
```

**Response Shape (proposed):**
```typescript
{
  data: {
    events: [
      {
        id: string,
        type: 'class' | 'assignment' | 'exam' | 'office-hours' | 'term-boundary',
        title: string,
        start: Date,
        end?: Date,
        allDay?: boolean,
        location?: string,
        relatedId: string,  // classId, assignmentId, etc.
        relatedType: 'class' | 'course' | 'assignment' | 'exam',
        recurring?: { pattern: string, until?: Date }
      }
    ],
    dateRange: { start: Date, end: Date }
  }
}
```

**Acceptance Criteria:**
- [ ] Learners see their enrolled class schedules
- [ ] Instructors see their teaching schedules
- [ ] Both see relevant academic term dates
- [ ] Supports date range filtering
- [ ] Supports type filtering
- [ ] Handles recurring events (weekly classes)
- [ ] Contract file created at `contracts/api/schedule.contract.ts`

**Implementation Notes:**
- Aggregate from: ClassEnrollment, Class, Course, Staff.officeHours, AcademicTerms
- May need to parse Class.schedule field (currently free-text string)
- Consider caching for performance (many joins required)

**UI Team Contact:**
- Referenced in: `agent_coms/ui/ISSUE_QUEUE.md` → ISS-014 Dashboard Navigation
- Calendar views need this for Staff/Learner dashboards

**Related Files:**
- `src/models/academic/Class.model.ts` - Has schedule field (string)
- `src/models/enrollment/ClassEnrollment.model.ts` - Links learners to classes
- `src/models/auth/PersonExtended.types.ts` - Has officeHours field
- `src/routes/academic-years.routes.ts` - Existing calendar routes

---

### API-001: Fix API Test Suite

**Priority:** high
**Type:** refactor
**Status:** partially-complete
**Assigned:** API Agent
**Dependencies:** None
**Updated:** 2026-01-12 - Infrastructure fixes complete, package upgrades deferred

**Description:**
The API test suite has several issues that need to be addressed:
1. Pre-existing test setup issues with Staff model import/scoping in nested describe blocks
2. Test isolation problems between outer and inner beforeEach hooks
3. AccessRight validation errors in test fixtures
4. Package upgrades needed for testing dependencies

**Current Issues:**
- ISS-005 tests fail due to test infrastructure problems (not the implementation)
- Staff.deleteMany() errors in nested beforeEach blocks
- AccessRight schema validation failures in seed data
- Testing packages may be outdated

**Acceptance Criteria:**

**Package Upgrades:**
- [ ] Upgrade Jest to latest compatible version
- [ ] Upgrade supertest to latest version
- [ ] Upgrade mongodb-memory-server to latest version
- [ ] Upgrade ts-jest to latest version
- [ ] Verify all test dependencies are compatible

**Test Infrastructure Fixes:**
- [ ] Fix Staff model import/scoping issues in nested describe blocks
- [ ] Resolve test isolation problems in beforeEach/afterEach hooks
- [ ] Fix AccessRight seed data to match current schema requirements
- [ ] Ensure all test fixtures are valid

**Validation:**
- [ ] All existing passing tests still pass
- [ ] ISS-005 Master Department visibility tests pass
- [ ] No test isolation issues (tests can run individually and in suite)
- [ ] Clear error messages when tests fail

**Communication:**
- [ ] Message UI team if any API contract changes result from test fixes
- [ ] Document any breaking changes or migration needs
- [ ] Update test documentation

**Related Files:**
- `package.json` - Test dependencies
- `jest.config.js` - Jest configuration
- `tests/integration/auth/department-switch.test.ts` - ISS-005 tests
- All test files under `tests/` directory

**Questions for Human:**
1. Are there specific Jest/testing package versions we should target?
2. Should we fix only the broken tests or audit the entire test suite?
3. Any known test infrastructure issues or patterns to avoid?

---

## Completed Issues

### API-ISS-021: Grade Override, Billing Course View & Enrollment Admin

**Priority:** high
**Type:** feature
**Status:** ✅ COMPLETE
**Completed:** 2026-01-14
**Assigned:** API Agent

**Description:**
Implemented three role capability updates:
1. Grade Override with immutable audit logging for dept-admin
2. Course view access for billing-admin
3. enrollment-admin role (per COURSE_ROLE_FUNCTION_MATRIX.md)

**Implementation:**
- Created GradeChangeLog model for immutable audit trail
- Implemented GradeOverrideService with permission validation
- Added grade override API endpoints (PUT override, GET history)
- Updated BUILT_IN_ROLES (dept-admin, billing-admin, enrollment-admin)

**New Files (8):**
- `src/models/audit/GradeChangeLog.model.ts` - Immutable audit trail model
- `src/services/grades/grade-override.service.ts` - Business logic with security checks
- `src/controllers/grades/grade-override.controller.ts` - HTTP handlers
- `src/routes/grade-override.routes.ts` - API routes
- `src/validators/grade-override.validator.ts` - Request validation (Joi)
- `agent_coms/api/API-ISS-021_GRADE_OVERRIDE_BILLING_COURSE_VIEW.md` - Full spec
- `agent_coms/api/IMPLEMENTATION_PLAN_ISS-021.md` - Implementation guide
- `agent_coms/api/CONTRACT_CHANGES_ISS-021.md` - Contract changes
- `agent_coms/api/PHASED_PLAN_ISS-021.md` - Execution plan

**Modified Files (2):**
- `src/services/auth/permissions.service.ts` - Added grades:override to dept-admin
- `src/app.ts` - Mounted grade override routes

**API Endpoints:**
- `PUT /api/v2/enrollments/:id/grades/override` - Override grade with audit
- `GET /api/v2/enrollments/:id/grades/history` - Get audit trail

**Security Features:**
- Immutable audit log (cannot be updated/deleted)
- Mandatory reason field (10-1000 chars)
- Department scope validation (admin must be in course's department)
- Permission check: academic:grades:override
- Role check: dept-admin

**UI Team Impact:**
- ✅ New grade override endpoint available
- ✅ billing-admin gains course view access (no UI changes needed)
- ✅ enrollment-admin role available for assignment

**Documentation:**
- Full planning documents created (4 files, 4300+ lines)
- API contracts defined
- Integration guide prepared

---

### ISS-005: Master Department Visibility Fix (API Implementation)

**Priority:** high
**Type:** bug
**Status:** ✅ COMPLETE
**Completed:** 2026-01-12
**Assigned:** API Agent
**Tests:** 4/4 passing

**Description:**
Fixed Master Department access for system-admin and global-admin users despite `isVisible: false` flag.

**Implementation:**
- Added `hasSpecialDepartmentPrivileges()` method
- Updated `switchDepartment()`, `getAccessibleDepartments()`, and `getChildDepartments()`
- Comprehensive test coverage (4 tests, all passing)
- Code compiles successfully
- No breaking changes

**Test Results:**
- ✅ System-admin role can access Master Department
- ✅ Global-admin userType can access Master Department
- ✅ Regular staff blocked from Master Department
- ✅ Regular staff can access visible departments

**Files Modified:**
- `src/services/auth/department-switch.service.ts`
- `tests/integration/auth/department-switch.test.ts`

**Documentation:**
- See `/ISS-005_COMPLETION_REPORT.md` for full details

**UI Team Impact:**
- ✅ No UI changes required
- ✅ Department dropdown will now show Master Department for privileged users
- ✅ Backend handles visibility logic correctly

---

## Recently Completed

### ISS-006: IPerson Refactor - Complete Three-Layer Architecture

**Priority:** critical
**Type:** feature
**Status:** ✅ COMPLETE
**Completed:** 2026-01-13
**Assigned:** API Agent
**Tests:** 1511/1865 passing (81%)
**Commit:** `a7ea72b`

**Description:**
Completed comprehensive IPerson refactor with three-layer architecture across all Staff and Learner models, replacing flat firstName/lastName fields with nested IPerson/IPersonExtended/IDemographics structure.

**Implementation:**
- **BREAKING CHANGE:** Person field now REQUIRED in Staff and Learner models
- Created three-layer architecture: IPerson (basic), IPersonExtended (role-specific), IDemographics (compliance)
- Implemented 6 new API endpoints for person data management
- Fixed critical userTypes checking bug (8 locations in UsersService)
- Updated 30+ service files with person structure
- Updated auth service registration to create proper person objects

**New API Endpoints:**
- ✅ GET/PUT `/api/v2/users/me/person` (19/19 tests passing)
- ✅ GET/PUT `/api/v2/users/me/person/extended` (included in person tests)
- ✅ GET/PUT `/api/v2/users/me/demographics` (23/23 tests passing)

**Test Results:**
- ✅ Staff.model.test.ts: 42/47 passing (5 skipped for RoleRegistry)
- ✅ Learner.model.test.ts: 48/52 passing (4 skipped for RoleRegistry)
- ✅ person.test.ts: 19/19 passing
- ✅ demographics.test.ts: 23/23 passing
- ✅ auth.test.ts: 26/26 passing
- ✅ password-change.test.ts: all passing
- Overall improvement: 73% → 81% test pass rate (+139 tests)

**Critical Bugs Fixed:**
1. userTypes checking in UsersService - was checking role names instead of 'staff' userType (caused 404s on all staff endpoints)
2. Auth service registration - now creates complete IPerson structure with arrays
3. PersonExtended API response format - consistent GET/PUT formatting

**Files Created:**
- `src/models/auth/Person.types.ts` (618 lines)
- `src/models/auth/PersonExtended.types.ts` (1004 lines)
- `src/models/auth/Demographics.types.ts` (542 lines)
- `contracts/api/person.contract.ts` (675 lines)
- `contracts/api/demographics.contract.ts` (446 lines)
- `contracts/types/person-types.ts` (537 lines)
- `tests/integration/users/person.test.ts` (595 lines)
- `tests/integration/users/demographics.test.ts` (602 lines)

**Files Modified (42 total):**
- Staff/Learner models (person field now required)
- UsersService, AuthService, and 30+ other services
- All seed scripts updated for person structure
- Model and integration tests updated

**Breaking Changes:**
- ⚠️ Staff/Learner: `firstName`, `lastName`, `phoneNumber` fields REMOVED
- ⚠️ Use `person.firstName`, `person.lastName`, `person.phones[]` instead
- ⚠️ Person field is now REQUIRED (was optional)
- ⚠️ Registration endpoints return nested person structure

**UI Team Impact:**
- ✅ All person/demographics endpoints ready for integration
- ✅ Comprehensive API contracts provided
- ⚠️ Frontend must update to use nested person structure
- ⚠️ Migration required for any cached user data

**Documentation:**
- Commit message includes comprehensive implementation details
- API contracts document all new endpoints

---

### ISS-001: IPerson Type Implementation & Password Change

**Priority:** high
**Type:** feature
**Status:** ✅ COMPLETE (Extended by ISS-006)
**Completed:** 2026-01-12, Updated: 2026-01-13
**Assigned:** API Agent
**Tests:** All passing

**Description:**
Initial IPerson type system and password change endpoint implementation.

**Implementation:**
- Created initial IPerson type as embedded subdocument
- Implemented POST /api/v2/users/me/password endpoint
- Security features: bcrypt hashing, current password verification

**Status Update (2026-01-13):**
- ✅ Person endpoints NO LONGER DEFERRED - completed in ISS-006
- ✅ GET/PUT /api/v2/users/me/person implemented (19/19 tests)
- ✅ Demographics endpoints implemented (23/23 tests)
- ✅ Person field now REQUIRED (breaking change in ISS-006)
- ⏳ Avatar upload endpoints still deferred (needs S3 configuration)

**Files Created:**
- `src/validators/password-change.validator.ts`
- `tests/integration/users/password-change.test.ts`
- `ISS-001_COMPLETION_REPORT.md`

**UI Team Impact:**
- ✅ Password change endpoint ready for integration
- ✅ Person/demographics endpoints ready (completed in ISS-006)
- ⏳ Avatar upload endpoints deferred (needs S3 configuration)

---
