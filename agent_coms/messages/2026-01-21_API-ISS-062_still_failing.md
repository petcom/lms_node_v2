# API Issue: Course Permission Still Failing

**Date:** 2026-01-21
**From:** UI Team
**To:** API Team
**Priority:** High
**Issue:** API-ISS-062
**Status:** STILL BROKEN

---

## Problem

After both fixes, `riley.instructor@lms.edu` still gets "you do not have permission to view this course" when trying to preview "Advanced Cognitive Interventions".

## Debug Info Needed

Can you check:

1. **What department is "Advanced Cognitive Interventions" in?**
2. **What departments is `riley.instructor@lms.edu` a member of?**
3. **What roles does `riley.instructor@lms.edu` have?**
4. **Is the API actually restarted with the new code?**

## Suggested Debug

Add logging to `canViewCourse()` to see what's happening:

```typescript
console.log('canViewCourse debug:', {
  courseId: course.id,
  courseDepartment: courseDeptId,
  userId: userId,
  userRoles: userRoles,
  userDepartments: userDepartmentIds,
  isStaffRole: hasStaffRole,
  isInDepartment: await isUserInCourseDepartment(),
});
```

Then check logs when riley tries to view the course.

---

**This is blocking content creators from doing their work.**
