# API Issue: Check Permissions, Not Role Names

**Date:** 2026-01-22
**From:** UI Team
**To:** API Team
**Priority:** High
**Issue:** API-ISS-062
**Status:** ARCHITECTURE CORRECTION

---

## Problem

The current fix checks for hardcoded role names:
```typescript
const staffRoles = ['instructor', 'department-admin', 'content-admin'];
const hasStaffRole = staffRoles.some(role => userRoles.includes(role));
```

This is brittle - role names can vary (`staff` vs `instructor`).

## Correct Approach

Check **resolved permissions/rights**, not role names:

```typescript
// Instead of checking role names:
if (userRoles.includes('instructor')) { ... }

// Check if user has the permission to view courses:
if (user.hasPermission('courses:view') || user.hasPermission('courses:*')) { ... }
```

Or check against the permission system:
```typescript
const canViewDepartmentCourses = await checkPermission(user, 'courses:view', {
  department: course.departmentId
});
```

## Why This Matters

1. Role names vary in seed data (`staff` vs `instructor`)
2. Multiple roles might grant the same permission
3. Permissions are the actual capability being checked
4. More maintainable and flexible

---

**The permission check should use the resolved rights system, not hardcoded role name checks.**
