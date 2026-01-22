# UI-ISS-046: Create Course Page Missing (404)

## Status: COMPLETE

## Problem
The Create Course route returns a 404 error. The page does not exist and users cannot create new courses through the UI.

## Expected Behavior
A Create Course page should exist that allows users with appropriate permissions to create new courses within their department.

## Root Cause
The route `/staff/departments/:deptId/courses/create` was referenced in sidebar navigation and department pages but was never defined in the router configuration.

## Solution
1. Created a lightweight wrapper component `DepartmentCreateCoursePage` that reuses the existing `CourseEditorPage`
2. Added the route to the router configuration
3. Modified `CourseEditorPage` to accept a `defaultDepartmentId` prop for pre-filling

## Implementation

### Files Created
- `src/pages/staff/departments/DepartmentCreateCoursePage.tsx` - New wrapper component
- `src/pages/staff/departments/__tests__/DepartmentCreateCoursePage.test.tsx` - Test file

### Files Modified
- `src/pages/staff/courses/CourseEditorPage.tsx` - Added defaultDepartmentId prop
- `src/app/router/index.tsx` - Added new route
- `src/pages/staff/departments/index.ts` - Export new component

### New Component
```typescript
export const DepartmentCreateCoursePage: React.FC = () => {
  const { deptId } = useParams<{ deptId: string }>();
  const { currentDepartmentId, switchDepartment, isSwitching } = useDepartmentContext();

  React.useEffect(() => {
    if (deptId && currentDepartmentId !== deptId && !isSwitching) {
      switchDepartment(deptId);
    }
  }, [deptId, currentDepartmentId, switchDepartment, isSwitching]);

  return <CourseEditorPage defaultDepartmentId={deptId} />;
};
```

### Route Added
```typescript
<Route
  path="/staff/departments/:deptId/courses/create"
  element={
    <StaffOnlyRoute>
      <DepartmentCreateCoursePage />
    </StaffOnlyRoute>
  }
/>
```

## Acceptance Criteria
- [x] Create Course page exists and is accessible
- [x] Route properly configured in application routing
- [x] Page is accessible from Manage Courses or sidebar navigation
- [x] Form allows course creation with required fields
- [x] Department field pre-filled from URL parameter

## Tests
- 3 tests passing for DepartmentCreateCoursePage

## QA Review
APPROVED by Opus 4.5 Code Reviewer

## Additional Fix (2026-01-20)
### Bug: TypeError when accessing Create Course page
**Error:** `can't access property "id", course.department is undefined`

**Root Cause:**
`CourseEditorPage` used `isNewCourse = courseId === 'new'` which evaluates to `false` when `courseId` is `undefined` (as it is when accessed via `DepartmentCreateCoursePage`). This caused the `useCourse` query to fire with an empty string.

**Fix:**
1. Changed `isNewCourse` check to: `!courseId || courseId === 'new'`
2. Added optional chaining for `course.department?.id` in useEffect

## Priority
High - Core functionality missing

## Created
2026-01-20

## Completed
2026-01-20
