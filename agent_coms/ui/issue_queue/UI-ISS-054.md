# UI-ISS-054: Add "New Subdepartment" Button

## Priority: Medium
## Status: Complete
## Created: 2026-01-20
## Completed: 2026-01-20

---

## Description

Add a "+ New Subdepartment" button across from the Subdepartments header in the Department Management page.

## File

`src/pages/staff/departments/DepartmentProgramsPage.tsx`

## Location

Line ~117 (next to Subdepartments CardTitle)

```tsx
{/* Current: TODO comment */}
{/* TODO: Add "New Subdepartment" button */}

{/* Should be: */}
<Button size="sm" onClick={() => setIsCreateSubdeptOpen(true)}>
  <Plus className="h-4 w-4 mr-2" />
  New Subdepartment
</Button>
```

## Requirements

- [x] Add button next to Subdepartments header (matching Programs section pattern)
- [x] Add dialog state for subdepartment creation
- [x] Add subdepartment creation dialog/form (using DepartmentForm with defaultParentId)
- [x] Verify API endpoint exists for creating subdepartments (useCreateDepartment hook exists)
- [x] Permission: Uses existing department creation permissions

## Notes

Check if subdepartment creation endpoint exists. If not, create API message first.
