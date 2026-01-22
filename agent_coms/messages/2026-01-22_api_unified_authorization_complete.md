# API Team - Unified Authorization System COMPLETE - Ready for UI Refactoring

**Date:** 2026-01-22
**From:** API Team
**To:** UI Team
**Priority:** High (Action Required)
**Related Spec:** `agent_coms/api/specs/UNIFIED_AUTHORIZATION_MODEL.md`

---

## Summary

The **Unified Authorization System** implementation is **COMPLETE** (Phases 1-3). The UI team can now begin refactoring to use the new authorization patterns.

---

## What's Done

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ Complete | Caching layer (3-tier: Memory → Redis → DB) |
| **Phase 2** | ✅ Complete | New permission structure in user context |
| **Phase 3** | ✅ Complete | All routes migrated to `authorize()` middleware |
| **Phase 4** | Pending | Remove deprecated code (after UI migration) |

---

## Breaking Changes for UI

### User Context Changes

The `AuthenticatedUser` interface has new fields:

```typescript
// NEW FIELDS (available now)
interface AuthenticatedUser {
  userId: string;
  email: string;
  userTypes: ('learner' | 'staff' | 'global-admin')[];

  // NEW - Use these for authorization
  globalRights: string[];                    // Rights that apply everywhere
  departmentRights: Record<string, string[]>; // Department-scoped rights
  departmentHierarchy: Record<string, string[]>; // Parent-to-children mapping

  // STILL AVAILABLE (deprecated, will be removed in Phase 4)
  allAccessRights: string[];  // @deprecated - use globalRights + departmentRights
  departmentMemberships: DepartmentMembership[];

  permissionVersion: number;  // For cache validation
}
```

### Authorization Pattern Changes

```typescript
// OLD PATTERN (deprecated)
if (user.allAccessRights.includes('content:courses:read')) { ... }

// NEW PATTERN (recommended)
// For global rights (admin-level):
if (user.globalRights.includes('content:courses:read')) { ... }

// For department-scoped rights:
if (user.departmentRights[departmentId]?.includes('content:courses:read')) { ... }

// For checking any department:
const hasRight = Object.values(user.departmentRights).some(
  rights => rights.includes('content:courses:read')
);
```

---

## UI Migration Checklist

### Required Changes

1. **Replace `allAccessRights` usage:**
   - `user.allAccessRights.includes(right)` → check `globalRights` first, then `departmentRights`

2. **Update permission checks for department context:**
   - Old: Check if user has right anywhere
   - New: Check if user has right for specific department

3. **Use new fields for UI decisions:**
   - Show admin features: `user.globalRights.includes('system:*')`
   - Show department features: `user.departmentRights[deptId]?.includes(right)`

### Optional Improvements

1. **Permission versioning:** Use `permissionVersion` to detect stale cached permissions
2. **Department hierarchy:** Use `departmentHierarchy` for parent/child department UI

---

## Contract Reference

See: `contracts/api/authorization.contract.ts`

Key exports:
- `AuthenticatedUser` - Full user context interface
- `DepartmentMembership` - Department membership structure
- `Permission` - Right + Scope structure
- `PermissionScope` - `'*'` | `'dept:${id}'` | `'own'`

---

## Deprecation Timeline

| Item | Status | Removal |
|------|--------|---------|
| `allAccessRights` | Deprecated | Phase 4 |
| `requireAccessRight()` middleware | Deprecated | Phase 4 |
| Direct role checks | Deprecated | Phase 4 |

**Phase 4 will not begin until UI confirms migration is complete.**

---

## Questions?

1. Check the spec: `agent_coms/api/specs/UNIFIED_AUTHORIZATION_MODEL.md`
2. Check the contract: `contracts/api/authorization.contract.ts`
3. Send a message to `agent_coms/messages/`

---

*API Team - 2026-01-22*
