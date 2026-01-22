# UI-ISS-047: Department Field Should Be Dropdown Select

## Status: COMPLETE

## Problem
The department field on the Create Course form was a plain text input showing only the department ID. Users had to know the department ID to create a course.

## Expected Behavior
The department field should be a dropdown that:
1. Shows department names (not IDs)
2. Allows selection of parent or child departments
3. Shows just the department name (disabled) if user has access to only one department

## Root Cause
The CourseEditorPage used a simple `<Input>` for the department field with placeholder "Department ID".

## Solution
1. Added Select dropdown component for department selection
2. Extract user's departments from roleHierarchy (same as Sidebar)
3. Fetch child departments via useDepartmentHierarchy hook
4. Show single department name (disabled) if only one available
5. Show dropdown with all available departments if multiple

## Implementation

### Files Modified
- `src/pages/staff/courses/CourseEditorPage.tsx`

### Changes
1. Added imports for Select components and useDepartmentHierarchy
2. Added userDepartments memo to extract departments from roleHierarchy
3. Added availableDepartments memo combining parent and child departments
4. Replaced Input with conditional rendering:
   - Single department: Shows disabled input with department name
   - Multiple departments: Shows Select dropdown

### Code Pattern
```typescript
// Get user's departments from roleHierarchy
const userDepartments = React.useMemo(() => {
  const departments = [];
  if (roleHierarchy.staffRoles) {
    for (const deptGroup of roleHierarchy.staffRoles.departmentRoles) {
      departments.push({
        id: deptGroup.departmentId,
        name: deptGroup.departmentName,
      });
    }
  }
  return departments;
}, [roleHierarchy]);

// Fetch child departments
const { data: hierarchyData } = useDepartmentHierarchy(currentDeptId);

// Combine parent and child departments
const availableDepartments = React.useMemo(() => {
  const depts = [...userDepartments];
  if (hierarchyData?.children) {
    for (const child of hierarchyData.children) {
      if (!depts.some(d => d.id === child.id)) {
        depts.push({ id: child.id, name: child.name, isChild: true });
      }
    }
  }
  return depts;
}, [userDepartments, hierarchyData]);
```

## Acceptance Criteria
- [x] Department field shows dropdown when multiple departments available
- [x] Department field shows department name (not ID) when single department
- [x] Child departments displayed with indent prefix (↳)
- [x] Selected value properly submitted with form

## Priority
Medium - UX improvement

## Created
2026-01-20

## Completed
2026-01-20
