# UI-ISS-048: Add Department Management Sidebar Link

## Status: COMPLETE

## Problem
Department administrators have no way to access department management features from the UI. There is no sidebar link for managing subdepartments, programs, and certificates.

## Expected Behavior
A "Department Management" link should appear in the Staff Context Navigation section of the sidebar, but only for users with `department-admin` or `system-admin` roles.

## Requirements

### Visibility
- Only visible to users with `department-admin` role in current department
- Also visible to `system-admin` users

### Location
- Staff Context Navigation section
- Below existing staff navigation items
- Icon: `Building2` or `Settings2` from lucide-react

### Route
- Path: `/staff/departments/:deptId/manage`
- Uses current department context from URL or store

## Implementation

### Files to Modify
- `src/widgets/sidebar/config/navItems.ts` - Add navigation item
- `src/widgets/sidebar/Sidebar.tsx` - Add permission check for visibility

### Navigation Item Definition
```typescript
{
  label: 'Department Management',
  path: '/staff/departments/:deptId/manage',
  icon: Building2,
  requiredRoles: ['department-admin', 'system-admin'],
}
```

### Permission Check
```typescript
// Only show if user has department-admin role in current department
const canManageDepartment = hasDeptPermission('department:manage') ||
  currentDepartmentRoles.includes('department-admin');
```

## Acceptance Criteria
- [ ] Link appears in sidebar for department-admin users
- [ ] Link appears in sidebar for system-admin users
- [ ] Link does NOT appear for regular staff or learners
- [ ] Link uses current department context
- [ ] Clicking link navigates to Department Management page

## Dependencies
- UI-ISS-049: Department Management page must exist for link to work

## Related Spec
- [DEPARTMENT_PROGRAM_MANAGEMENT_SPEC.md](../../SPECS/DEPARTMENT_PROGRAM_MANAGEMENT_SPEC.md)

## Priority
High

## Created
2026-01-20
