# Feature Development Checklist

## Core Principle (Pre-Launch)

**Ideal patterns over compatibility.** Until live, prioritize clean architecture even if it requires more dev time. No technical debt shortcuts. Refactor routes/endpoints/models/patterns to match ideal implementations rather than working around existing inconsistencies.

---

## Quick Reference

| Code | Rule | Verify Before Using |
|------|------|---------------------|
| P1 | Permission strings | `grep "requiredPermission" src/` + API tests |
| P2 | Endpoint paths | Contracts or API team message |
| P3 | Field/type names | Existing types in `src/entities/` |
| A1 | API changes | Message to `./api/agent_coms/messages/` first |
| A2 | New endpoints | Wait for API team confirmation |
| N1 | Component names | Check for duplicates across pages |
| T1 | Tests per phase | Write tests at end of each dev phase/issue |
| T2 | Tests at milestone | Run full test suite at end of major milestone |
| T3 | TypeScript check | Run `npx tsc --noEmit` before marking issue complete |
| C1 | Commit protocol | Follow format from `git log -5`, include Co-Authored-By |
| F1 | FSD structure | Match layer: `entities/` `features/` `widgets/` `pages/` |
| S1 | State management | Zustand=global UI, React Query=server, local=component |
| M1 | API message format | Use standard template in `./api/agent_coms/messages/` |
| E1 | Error handling | Toast for user errors, console for dev, Alert for forms |
| D1 | Stay in project | Never leave project dir; hand off via `messages/` `issue_queue/` |

**Golden Rule:** Never invent API values. Verify or ask.

---

## Index Details

### P1: Permission Strings
Search: `src/entities/auth/api/__tests__/authApi.test.ts` for `accessRights`
Patterns: `content:{resource}:{action}`, `department:{area}:{action}`, `reports:{scope}:{action}`

### P2-P3: API Contracts
Check `./contracts/` or create API team message if uncertain.

### A1-A2: API Changes
Never modify `lms_node`. Create message in `./api/agent_coms/messages/` and wait.

### N1: Naming
Staff vs Admin pages may share concepts - use specific prefixes (e.g., `DepartmentProgramsPage` not `DepartmentManagementPage`).

### T1-T3: Lazy TDD + Type Safety
Write tests after completing each dev phase or issue (not during). Run `npm test` for related files.
At major milestone/issue completion: `npm run build && npm test` to verify all tests pass.
Before marking any issue complete: `npx tsc --noEmit` to catch type errors early. Ignore pre-existing errors unrelated to your changes.

### C1: Commit Protocol
Format: `type(scope): description` + body + `Co-Authored-By: Claude <noreply@anthropic.com>`
Check recent: `git log -5 --format="%s"` to match project style.

### F1: FSD Structure
```
src/
  entities/    → Business entities (user, course, program) - data + API + basic UI
  features/    → User actions (auth, grading, enrollment) - business logic
  widgets/     → Composite UI (sidebar, header) - combines entities/features
  pages/       → Route components - composes widgets/features
  shared/      → Reusable utilities, UI primitives, hooks, types
```

### S1: State Management
- **Zustand stores** (`src/shared/stores/`): Global UI state (navigation, sidebar, theme)
- **React Query** (`useQuery/useMutation`): Server state (API data, caching, sync)
- **Local state** (`useState`): Component-only, no sharing needed

### M1: API Message Format
```markdown
# [UI/API] Team - [Subject]
## Date: YYYY-MM-DD
## From: [UI/API] Team
## To: [API/UI] Team
## Priority: [High/Medium/Low]
## Related Issues: [issue numbers]
---
## Summary
[Brief description]
## Request/Response
[Details, proposed contracts, questions]
```

### E1: Error Handling
- **API errors**: Catch in mutation `onError`, show toast via `useToast()`
- **Form validation**: Zod schemas, display inline with `<Alert variant="destructive">`
- **Dev errors**: `console.error()` with context for debugging
- **Network failures**: Toast with retry option where applicable

### D1: Stay in Project
Never `cd` into other repos (e.g., `lms_node`). For cross-team work:
- API requests → `./api/agent_coms/messages/`
- New issues → `./api/agent_coms/ui/issue_queue/`
Hand off and wait for response.

---

## Architecture Decisions

### ADR-AUTH-001: Unified Authorization Model (2026-01-22)

**Decision:** Replace dual authorization system with unified scoped permissions.

**Context:** Current system has:
- Route-level: `requireAccessRight('content:courses:read')` checking `allAccessRights`
- Service-level: Manual `departmentMemberships` + role checks
- 3-10+ DB queries per request, no caching

**Solution:**
- Single `authorize(user, right, { resource })` function
- Cached permissions with `globalRights` + `departmentRights`
- 0-1 DB queries per request

**Spec:** `agent_coms/api/specs/UNIFIED_AUTHORIZATION_MODEL.md`
**Contract:** `contracts/api/authorization.contract.ts`

**Migration:**
1. Phase 1: Add caching (non-breaking)
2. Phase 2: Add unified structure (non-breaking)
3. Phase 3: Migrate checks (deprecate old)
4. Phase 4: Remove deprecated

**QA Checkpoint:** Run architecture review after each phase.

---

## Lessons Log

**2026-01-22 | Architecture**
Unified authorization model adopted. See ADR-AUTH-001. All new authorization code should use `authorize()` pattern.

**2026-01-20 | P1 Violation**
Invented `department:admin` permission. Fix: `content:programs:manage`. Always verify permissions exist.

---
