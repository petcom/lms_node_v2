# Role System Documentation Index
**Version:** 2.1  
**Last Updated:** 2026-01-10  
**Status:** Ready for Alpha→Beta Transition

---

## Purpose

This document serves as an index to all role system documentation created during the V2 role system refactor. Use this as your starting point for understanding the role system architecture.

---

## For Implementation Team (Claude Code Agents)

**Start here for parallel implementation:**

| Priority | Document | Path | Purpose |
|----------|----------|------|---------|
| ⭐ **1st** | Phased Implementation Plan | [Role_System_V2_Phased_Implementation.md](Role_System_V2_Phased_Implementation.md) | **Task breakdown for agents** |
| ⭐ 2nd | Architecture Plan V2 | [Role_System_API_Model_Plan_V2.md](Role_System_API_Model_Plan_V2.md) | Complete technical architecture |
| 3rd | Endpoint Authorization | [Endpoint_Role_Authorization.md](Endpoint_Role_Authorization.md) | Role→endpoint mapping |

---

## For UI Development Team

Start here:

| Priority | Document | Path | Purpose |
|----------|----------|------|---------|
| ⭐ **1st** | UI Role System Contracts | [contracts/UI_ROLE_SYSTEM_CONTRACTS.md](../contracts/UI_ROLE_SYSTEM_CONTRACTS.md) | **Complete UI reference** - Start here! |
| ⭐ 2nd | Auth V2 Contract | [contracts/api/auth-v2.contract.ts](../contracts/api/auth-v2.contract.ts) | Login, escalation, department switch API |
| ⭐ 3rd | Roles Contract | [contracts/api/roles.contract.ts](../contracts/api/roles.contract.ts) | Role definitions, access rights API |

### Quick Reference for UI

**UserTypes (determines dashboard):**
- `learner` → Learner Dashboard
- `staff` → Staff Dashboard  
- `global-admin` → Staff Dashboard + Admin escalation

**Login Response Key Fields:**
```typescript
{
  userTypes: ['staff', 'global-admin'],
  defaultDashboard: 'staff',
  canEscalateToAdmin: true,
  departmentMemberships: [...],
  allAccessRights: ['content:courses:read', ...]
}
```

**Access Right Check:**
```typescript
function hasAccessRight(userRights: string[], required: string): boolean {
  if (userRights.includes(required)) return true;
  const [domain] = required.split(':');
  return userRights.includes(`${domain}:*`);
}
```

---

## For Backend Development Team

| Priority | Document | Path | Purpose |
|----------|----------|------|---------|
| ⭐ **1st** | Architecture Plan V2 | [devdocs/Role_System_API_Model_Plan_V2.md](Role_System_API_Model_Plan_V2.md) | Complete backend architecture |
| ⭐ 2nd | Endpoint Authorization | [devdocs/Endpoint_Role_Authorization.md](Endpoint_Role_Authorization.md) | Which roles access which endpoints |
| 3rd | Clarification Q&A | [devdocs/Role_System_Clarification_Questions.md](Role_System_Clarification_Questions.md) | Decision history/rationale |

### Models Created

| Model | Path | Purpose |
|-------|------|---------|
| GlobalAdmin | `src/models/GlobalAdmin.model.ts` | Admin users with escalation |
| RoleDefinition | `src/models/RoleDefinition.model.ts` | Role→access rights mapping |
| AccessRight | `src/models/AccessRight.model.ts` | GNAP-compatible permissions |
| EnrollmentActivity | `src/models/EnrollmentActivity.model.ts` | Enrollment audit trail |
| ClassEnrollment | `src/models/ClassEnrollment.model.ts` | Cohort-based class enrollment |

### Scripts

| Script | Path | Purpose |
|--------|------|---------|
| seed-admin.ts | `scripts/seed-admin.ts` | Create initial admin + master department |

---

## Key Decisions Summary

### 1. UserTypes vs Roles

| Concept | Stored On | Purpose |
|---------|-----------|---------|
| **UserType** | `User.userTypes[]` | Dashboard access (`learner`, `staff`, `global-admin`) |
| **Role** | `Staff.departmentMemberships[].roles[]` | Department-scoped capabilities |
| **Access Right** | Token / computed from roles | Granular permission strings |

### 2. Role Definitions

**Learner Roles:** `course-taker`, `auditor`, `learner-supervisor`

**Staff Roles:** `instructor`, `department-admin`, `content-admin`, `billing-admin`

**GlobalAdmin Roles:** `system-admin`, `enrollment-admin`, `course-admin`, `theme-admin`, `financial-admin`

### 3. Master Department

- **ID:** `000000000000000000000001`
- **Name:** "System Administration"
- **Purpose:** Container for GlobalAdmin roles only
- **Protection:** Cannot be deleted, hidden from normal lists

### 4. Admin Escalation

- Separate password from login
- 15-minute timeout (configurable)
- Token stored in memory only (security)
- Timeout → redirect to Staff Dashboard

### 5. Class vs Program (Option C)

- **Program:** Certification path, complete at own pace
- **Class:** Cohort learning, fixed timeframe, collaboration
- Both can reference the same courses

---

## Implementation Status

### Phase 1: Core Models ✅
- [x] GlobalAdmin.model.ts
- [x] RoleDefinition.model.ts
- [x] AccessRight.model.ts
- [x] EnrollmentActivity.model.ts
- [x] ClassEnrollment.model.ts

### Phase 2: Documentation ✅
- [x] Role_System_API_Model_Plan_V2.md
- [x] Endpoint_Role_Authorization.md
- [x] UI_ROLE_SYSTEM_CONTRACTS.md
- [x] auth-v2.contract.ts
- [x] roles.contract.ts

### Phase 3: Backend Implementation 🔲
- [ ] Update User model (remove globalRoles)
- [ ] Update Staff model (remove globalStaffRoles)
- [ ] Update Learner model (rename departmentEnrollments)
- [ ] Create seed-admin.ts script
- [ ] Update login endpoint to V2 response format
- [ ] Implement escalation endpoint
- [ ] Implement department switch endpoint
- [ ] Update auth middleware

### Phase 4: Testing 🔲
- [ ] Unit tests for new models
- [ ] Integration tests for auth flows
- [ ] Escalation flow tests
- [ ] Department switching tests

---

## Related Documents

| Document | Path | Notes |
|----------|------|-------|
| Original API Model Plan (V1) | `devdocs/Role_System_API_Model_Plan.md` | Superseded by V2 |
| UI Authorization Recommendations | `devdocs/UI_Authorization_Recommendations.md` | Original UI guidance |
| Data Dictionary | `lms_node_devdocs/Data_Dictionary.md` | Field definitions |

---

## Contact & Questions

For questions about this documentation:
1. Check the Q&A document: `Role_System_Clarification_Questions.md`
2. Reference the architecture plan: `Role_System_API_Model_Plan_V2.md`
3. For API questions: Check the contracts in `contracts/api/`
