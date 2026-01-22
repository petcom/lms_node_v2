# UI-ISS-062: Course Creators Cannot View Their Own Courses

## Priority: High
## Status: BLOCKED - API fix incomplete
## Created: 2026-01-21
## UI Updated: 2026-01-21
## Related API Fix: API-ISS-062 (partial)

---

## Description

The user `riley.instructor@lms.edu` (staff/instructor role) does not have rights to view their own courses. Course creators and department staff should be able to view courses for review/QA purposes.

## Current Behavior

Staff users who create courses cannot view them after creation. This prevents creators from:
- Reviewing their course content
- Checking module/learning unit configurations
- Previewing the learner experience
- QA testing before publishing

## Expected Behavior

Course creators should have **view access** (not enrollment) to:

1. **Their own courses** - Any course where they are the creator (`createdBy`)
2. **Department courses** - Any course belonging to their department(s)

This is read-only preview access for content review, NOT enrollment for credit.

## User Context

- **Test User**: `riley.instructor@lms.edu`
- **Role**: Staff/Instructor
- **Expected Access**: View own created courses + department courses

## Acceptance Criteria

- [x] Course creators can view courses they created (API-ISS-062 partial fix)
- [ ] **Instructors** can view courses in their department
- [ ] **Department-admins** can view courses in their department
- [ ] **Content-admins** can view courses in their department
- [x] View access is distinct from learner enrollment (Preview mode exists at `/staff/courses/:id/preview`)
- [x] Preview mode shows course content without tracking progress/completion
- [x] UI shows appropriate "Preview" or "Review" mode indicator

## UI Implementation Complete

The following UI changes have been made to support course preview:

**Files Modified:**
- `src/pages/staff/courses/StaffCoursesPage.tsx` - Added Preview button to course cards
- `src/pages/staff/courses/CourseEditorPage.tsx` - Added Preview button to editor header
- `src/pages/staff/courses/CoursePreviewPage.tsx` - Fixed exit navigation to return to staff edit page

**Changes:**
1. Course cards on StaffCoursesPage now have both "Preview" and "Edit" buttons
2. CourseEditorPage has a "Preview" button in the header for existing courses
3. CoursePreviewPage properly navigates back to `/staff/courses/:id/edit` on exit
4. Preview route exists: `/staff/courses/:courseId/preview`
5. Preview mode banner shows "Read-Only" badge

## Backend Work Complete

API-ISS-062 fixed `canViewCourse()` in `courses.service.ts`:
- Course creators can now always view their own courses
- Department context allows viewing all department courses
- See `2026-01-21_api_course_creator_permissions_fixed.md` for details

## Implementation Notes

This may require:
- Backend permission check for `createdBy` field
- Backend permission check for department membership
- UI route/component for course preview vs learner view
- Possible "Preview as Learner" functionality

## Related

- Role/permission system
- Course entity `createdBy` field
- Department membership
- Staff dashboard course list

## Notes

This is a workflow blocker for content creators. They cannot verify their work without this access.
