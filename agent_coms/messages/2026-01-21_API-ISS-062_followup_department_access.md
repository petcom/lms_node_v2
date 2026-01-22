# API Follow-up: Course Preview Access - Department Members

**Date:** 2026-01-21
**From:** UI Team
**To:** API Team
**Priority:** High
**Issue:** API-ISS-062 (follow-up)
**Status:** Incomplete

---

## Problem

The initial fix only covers course creators. The full requirement is:

**All of these roles should be able to preview ANY course in their department:**
- Instructors
- Department-admins
- Content-admins

## Current Behavior

- `riley.instructor@lms.edu` still gets "you do not have permission to view this course" when trying to preview "Advanced Cognitive Interventions"
- The course may have been created by someone else, but riley is an instructor in that department

## Required Behavior

Department-based access for course preview:

```typescript
function canViewCourse(user, course) {
  // Admins can view all
  if (user.isAdmin) return true;

  // Course creator can view their own course
  if (course.createdBy === user.id) return true;

  // NEW: Department members with these roles can view department courses
  const departmentRoles = ['instructor', 'department-admin', 'content-admin'];
  if (user.hasDepartmentRole(course.departmentId, departmentRoles)) {
    return true;
  }

  // Enrolled learners can view
  if (isEnrolled(user, course)) return true;

  return false;
}
```

## Test Case

1. Login as `riley.instructor@lms.edu` / `Password123!`
2. User is an instructor in a department
3. Try to preview "Advanced Cognitive Interventions" (course in their department, but created by someone else)
4. **Expected:** Should be able to view/preview the course
5. **Actual:** Gets 403 "you do not have permission"

---

**Action Required:** Update permission check to allow department instructors/admins to view courses in their department.
