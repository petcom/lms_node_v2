# UI-ISS-043: Department Switching Fails When Roles Differ

## Status: COMPLETE

## Problem
After selecting one department, attempting to select a second department causes the UI to fault back to the first department. This specifically occurs when the first department has roles assigned but the second department does not have the same roles.

The navigation state is not properly reset when switching between departments with different role configurations.

## Expected Behavior
When switching to a department where the user lacks the current role, the UI should automatically redirect to the default department reporting page (accessible to all department roles) rather than failing back to the previous department.

## Root Cause
1. **Unstable function reference**: The `switchDepartment` function from `useDepartmentContext` was not memoized, causing the reference to change on every render
2. **Missing guards**: Some department pages lacked the `!isSwitching` guard in their useEffect, causing race conditions
3. **Infinite loop**: When switching to a department with different roles, state changes triggered re-renders that re-triggered the switch

## Solution
1. Wrapped `switchDepartment` in `useCallback` in `useDepartmentContext.ts` to stabilize the reference
2. Added `!isSwitching` guard to all department pages that were missing it

## Implementation

### Files Modified
- `src/shared/hooks/useDepartmentContext.ts` - Added useCallback wrapper for switchDepartment
- `src/pages/staff/departments/DepartmentStudentsPage.tsx` - Added !isSwitching guard
- `src/pages/staff/departments/DepartmentSettingsPage.tsx` - Added !isSwitching guard
- `src/pages/staff/departments/DepartmentReportsPage.tsx` - Added !isSwitching guard

### Code Pattern Applied
```typescript
// useDepartmentContext.ts
const switchDepartment = useCallback(
  (deptId: string) => {
    return switchDepartmentAction(deptId);
  },
  [switchDepartmentAction]
);

// Department pages
useEffect(() => {
  if (deptId && deptId !== currentDepartmentId && !isSwitching) {
    switchDepartment(deptId);
  }
}, [deptId, currentDepartmentId, switchDepartment, isSwitching]);
```

## Acceptance Criteria
- [x] Users can switch between departments with different roles seamlessly
- [x] When switching to a department without the current role, redirect to default department page
- [x] No UI fault/fallback to previous department
- [x] Navigation state properly resets on department change

## Tests
- 30 tests passing in useDepartmentContext.test.ts (including new stability test)
- All department page tests passing

## QA Review
APPROVED by Opus 4.5 Code Reviewer

## Priority
High - Core navigation functionality broken

## Created
2026-01-20

## Completed
2026-01-20
