# API-ISS-062: Course Creators Cannot View Their Own Courses

## Priority: High
## Status: Open
## Created: 2026-01-21
## Related UI Issue: UI-ISS-062

---

## Description

Staff/instructor users who create courses cannot view them. The API returns "you do not have permission to view this course" when they try to access course details.

**Test User**: `riley.instructor@lms.edu` (staff/instructor role)

## Current Behavior

When a staff user tries to view a course (even one they created), the API returns a 403 forbidden error with the message "you do not have permission to view this course".

## Expected Behavior

Course creators and department staff should have **read access** to courses for review/QA purposes:

1. **Own courses** - Users should be able to view any course where they are the `createdBy`
2. **Department courses** - Users should be able to view courses belonging to their department(s)

This is read-only preview access, NOT enrollment for credit.

## API Endpoints Affected

- `GET /courses/:id` - Should allow access for creator or department member
- `GET /courses/:id/modules` - Should allow access for creator or department member
- Potentially other course sub-resource endpoints

## Implementation Suggestion

In the course permission check, add conditions:

```typescript
// Pseudocode
function canViewCourse(user, course) {
  // Admins can view all
  if (user.isAdmin) return true;

  // Creator can view their own course
  if (course.createdBy === user.id) return true;

  // Staff in same department can view
  if (user.departments.includes(course.departmentId)) return true;

  // Enrolled learners can view (existing logic)
  if (user.enrollments.includes(course.id)) return true;

  return false;
}
```

## Acceptance Criteria

- [ ] Course creators can fetch course details for courses they created
- [ ] Staff can fetch course details for courses in their department(s)
- [ ] Staff can fetch module list for courses they have access to
- [ ] Permission check considers `createdBy` field
- [ ] Permission check considers department membership

## Notes

This is a workflow blocker for content creators. They cannot verify their work without this access.

The UI changes have been completed in UI-ISS-062 - staff pages now have Preview buttons, but the backend permission issue prevents them from working.
