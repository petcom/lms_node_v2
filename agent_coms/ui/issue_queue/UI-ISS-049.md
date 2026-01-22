# UI-ISS-049: Create Department Management Page

## Status: OPEN

## Problem
There is no page for department administrators to manage their department's subdepartments, programs, and certificates.

## Expected Behavior
A Department Management page that displays:
1. List of subdepartments with their program counts
2. List of programs in the current department
3. Actions to create/edit subdepartments and programs
4. Certificate configuration per program

## Requirements

### Page Layout
```
+------------------------------------------------------------------+
| Department Management                                    [+ Add]  |
| [Current Department Name]                                         |
+------------------------------------------------------------------+
| Subdepartments (N)                              [+ New Subdept]   |
+------------------------------------------------------------------+
| Expandable list of child departments with program counts          |
+------------------------------------------------------------------+
|                                                                   |
| Programs (N)                                    [+ New Program]   |
+------------------------------------------------------------------+
| Table: Name | Courses | Certificate | Status | Actions           |
+------------------------------------------------------------------+
```

### Subdepartments Section
- List all direct child departments
- Show program count per subdepartment
- Actions: Edit, View Programs
- Button to create new subdepartment

### Programs Section
- Table listing all programs in current department
- Columns: Name, Course Count, Certificate (Yes/No), Status, Actions
- Actions: Edit, Configure Certificate, Archive
- Button to create new program

### Access Control
- Route: `/staff/departments/:deptId/manage`
- Protected: `department-admin` or `system-admin` roles only

## Implementation

### Files to Create
- `src/pages/staff/departments/DepartmentManagementPage.tsx`
- `src/pages/staff/departments/__tests__/DepartmentManagementPage.test.tsx`

### Files to Modify
- `src/app/router/index.tsx` - Add route
- `src/pages/staff/departments/index.ts` - Export component

### Data Requirements
- `useDepartmentHierarchy(deptId)` - Get subdepartments
- `useDepartmentPrograms(deptId)` - Get programs (may need API endpoint)

### Component Structure
```typescript
export const DepartmentManagementPage: React.FC = () => {
  const { deptId } = useParams();
  const { data: hierarchy } = useDepartmentHierarchy(deptId);
  const { data: programs } = useDepartmentPrograms(deptId);

  return (
    <div>
      <PageHeader title="Department Management" />
      <SubdepartmentSection departments={hierarchy?.children} />
      <ProgramSection programs={programs} />
    </div>
  );
};
```

## Acceptance Criteria
- [ ] Page renders with department name in header
- [ ] Subdepartments section shows child departments
- [ ] Programs section shows department's programs
- [ ] Create subdepartment button opens form dialog
- [ ] Create program button opens form dialog
- [ ] Edit actions work for both subdepartments and programs
- [ ] Page is protected by role-based access
- [ ] Loading states displayed while fetching data
- [ ] Empty states shown when no subdepartments/programs

## Dependencies
- UI-ISS-048: Sidebar link (can be developed in parallel)
- API endpoints for programs (verify with API team)

## Related Spec
- [DEPARTMENT_PROGRAM_MANAGEMENT_SPEC.md](../../SPECS/DEPARTMENT_PROGRAM_MANAGEMENT_SPEC.md)

## Priority
High

## Created
2026-01-20
