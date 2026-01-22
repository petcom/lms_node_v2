# API Issue: Role Name Mismatch

**Date:** 2026-01-22
**From:** UI Team
**To:** API Team
**Priority:** High
**Issue:** API-ISS-062
**Status:** ROOT CAUSE FOUND

---

## Problem

The JWT token has `roles: ["staff"]` but the permission check looks for `["instructor", "department-admin", "content-admin"]`.

## Evidence

From riley.instructor@lms.edu's JWT:

```json
{
  "userId": "6970438ce8bd84f3e113e82e",
  "email": "riley.instructor@lms.edu",
  "roles": ["staff"],
  "type": "access"
}
```

## Fix Options

1. **Update seed data** - Give riley the `instructor` role instead of/in addition to `staff`

2. **Update permission check** - Include `staff` in the allowed roles:
   ```typescript
   const staffRoles = ['staff', 'instructor', 'department-admin', 'content-admin'];
   ```

3. **Clarify role naming** - Is `staff` supposed to be equivalent to `instructor`? If so, the check should include it.

---

**Which role names should grant department course access?**
