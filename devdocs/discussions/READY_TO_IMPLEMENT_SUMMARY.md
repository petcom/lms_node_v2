# LookupValues Migration - Ready to Implement

**Date:** 2026-01-11
**Status:** ✅ ALL DOCUMENTATION UPDATED - READY TO BEGIN

---

## Document Changes Completed

### 1. ✅ Directory Structure Updated
- Created `scripts/seeds/` directory
- All documentation now references correct location

### 2. ✅ Implementation Plan Updated
**File:** `devdocs/plans/UserType_Validation_Lookup_Migration_Plan.md`

**Changes Made:**
- Updated all references from `src/seeds/` to `scripts/seeds/`
- Updated task A3: `scripts/seeds/constants.seed.ts`
- Updated task A4: `scripts/seeds/run-seeds.ts`
- Updated Appendix A file creation order
- Added note about maintaining consistency with existing `scripts/` directory

### 3. ✅ Review Document Updated
**File:** `devdocs/discussions/UserType_Lookup_Implementation_Review.md`

**Changes Made:**
- Marked all high-priority questions as RESOLVED ✅
- Updated Section 2.1: Seed script location decision approved
- Updated Section 2.2: GlobalAdmin migration approved
- Updated Section 2.4: Contract versioning decision (no version increment)
- Updated Section 2.5: Database handling strategy (purge and reseed)
- Updated Section 2.10: Team coordination approach (agent teams)
- Updated Section 3.2: File creation checklist with correct paths
- Updated Section 3.3: All key decisions marked as approved
- Updated Section 4: All questions marked as resolved
- Updated Section 5: Implementation ready checklist complete

### 4. ✅ Contracts Updated
**File:** `contracts/api/auth-v2.contract.ts`

**Changes Made:**
- Updated version documentation to clarify "no version increment"
- Added note: "No version increment as API is in pre-production development"
- Kept version as 2.0.0 (not incrementing to 2.1.0)
- Documented current changes as "In Development"
- Contract already imports UserTypeObject from lookup-values.contract.ts

**File:** `contracts/api/lookup-values.contract.ts`
- ✅ Already correct - no changes needed

### 5. ✅ Team Configuration Created
**File:** `.claude/team-config-lookup-values.json`

**Configuration:**
- **4 specialized agents:**
  - **agent-data (Stream A):** LookupValue model, seeds, migrations
  - **agent-service (Stream B):** RoleRegistry, validators, utils
  - **agent-api (Stream C):** Auth transforms, middleware, endpoints
  - **agent-integration:** Wiring, startup init, E2E tests

- **Clear responsibilities** for each agent
- **Dependency tracking** (blockedBy/blocks)
- **Test coverage targets** (85-90%)
- **Context files** specific to each stream
- **Phase gates** for quality control

---

## Decision Summary

| Decision | Final Resolution |
|----------|------------------|
| **Seed Script Location** | `scripts/seeds/` (maintains consistency, adds organization) |
| **Database Handling** | Purge and reseed - all data is test data |
| **Contract Versioning** | No version increment - fix in place (pre-production) |
| **GlobalAdmin Migration** | Rename roleMemberships → departmentMemberships + add fields |
| **Team Approach** | Agent teams with 3 parallel streams + integration |
| **Testing Strategy** | Strict TDD for all streams (85%+ coverage) |
| **Breaking Changes** | Acceptable - no production deployment exists |

---

## Implementation Structure

### Stream A: Data Layer
**Agent:** agent-data
**Files to Create:**
```
src/models/LookupValue.model.ts
scripts/seeds/constants.seed.ts          ← Updated location
scripts/seeds/run-seeds.ts               ← Updated location
src/migrations/migrate-roledefinitions.ts
src/migrations/migrate-globaladmin.ts
src/migrations/rollback-globaladmin.ts
tests/unit/models/LookupValue.model.test.ts
```

### Stream B: Service Layer
**Agent:** agent-service
**Files to Create:**
```
src/services/role-registry.interface.ts
src/services/role-registry.service.ts
src/validators/department-membership.validator.ts
src/utils/user-type.utils.ts
tests/unit/services/role-registry.test.ts
tests/unit/validators/department-membership.test.ts
tests/unit/utils/user-type.utils.test.ts
```

### Stream C: API Layer
**Agent:** agent-api
**Files to Create:**
```
src/services/auth/auth-transform.service.ts
src/controllers/lookup-values.controller.ts
src/routes/lookup-values.routes.ts
src/middlewares/user-type-hydration.ts
tests/unit/services/auth-transform.test.ts
tests/unit/controllers/lookup-values.test.ts
tests/unit/middlewares/user-type-hydration.test.ts
```

### Integration Phase
**Agent:** agent-integration
**Files to Create:**
```
tests/integration/auth/login-usertype-objects.test.ts
tests/integration/startup/registry-validation.test.ts
tests/e2e/lookup-values-api.test.ts
devdocs/MIGRATION_GUIDE_LOOKUP_VALUES.md
```

**Files to Modify:**
```
src/models/GlobalAdmin.model.ts          (rename fields)
src/models/auth/Staff.model.ts           (use validator factory)
src/models/auth/Learner.model.ts         (use validator factory)
src/services/auth/auth.service.ts        (transform userTypes)
src/middlewares/isAuthenticated.ts       (hydrate userTypes)
src/server.ts                            (add RoleRegistry.initialize())
src/app.ts                               (add lookup-values routes)
package.json                             (add npm scripts)
```

---

## Verification Checklist

✅ All critical questions answered
✅ All documentation updated with correct paths
✅ Team configuration file created
✅ Contracts updated (no version increment)
✅ Directory structure created (scripts/seeds/)
✅ Implementation approach confirmed (agent teams)
✅ Testing strategy defined (strict TDD, 85%+ coverage)
✅ Database strategy confirmed (purge and reseed)

---

## Next Steps

### For User:
1. ✅ Review this summary
2. ✅ Confirm all decisions are acceptable
3. ✅ Give approval to begin implementation

### For Implementation:
1. Launch agent teams using `team-config-lookup-values.json`
2. Agents work in parallel on Streams A/B/C
3. Integration agent wires everything together
4. Create implementation report after completion
5. Commit with message: `feat(lookup-values): implement LookupValues collection, RoleRegistry, and UserType transformation`

---

## Estimated Timeline

| Phase | Duration | Agents |
|-------|----------|--------|
| **Stream A (Data Layer)** | 4-5 hours | agent-data |
| **Stream B (Service Layer)** | 4-5 hours | agent-service |
| **Stream C (API Layer)** | 3-4 hours | agent-api |
| **Integration Phase** | 4-5 hours | agent-integration |
| **Total** | 15-19 hours | 3-4 agents |

**Parallel Execution:** Streams A/B/C run simultaneously (4-5 hours), then integration (4-5 hours) = **8-10 hours total elapsed time**

---

## Commands to Execute

```bash
# User has already confirmed all decisions
# Documentation has been updated
# Team configuration has been created
# Directory structure has been set up

# Ready to begin implementation with agent teams
```

---

**Status:** ✅ **READY TO BEGIN IMPLEMENTATION**

**All documentation changes completed. Awaiting user approval to launch agent teams.**
