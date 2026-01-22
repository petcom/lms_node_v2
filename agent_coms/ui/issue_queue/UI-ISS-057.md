# UI-ISS-057: Edit Program Link Non-Functional in Subdepartment Programs

## Priority: Medium
## Status: Complete
## Created: 2026-01-21
## Completed: 2026-01-21

---

## Description

The "Edit Program" dropdown menu item in the subdepartment programs list (expanded collapsible) does not have any onClick handler - clicking it does nothing.

## File

`src/pages/staff/departments/DepartmentProgramsPage.tsx`

## Location

`SubdepartmentProgramsList` component (~line 93):

```tsx
<DropdownMenuItem>
  <FileEdit className="h-4 w-4 mr-2" />
  Edit Program
</DropdownMenuItem>
```

## Also Affects

The same issue exists in the main Programs section (~line 388):

```tsx
<DropdownMenuItem>
  <FileEdit className="h-4 w-4 mr-2" />
  Edit Program
</DropdownMenuItem>
```

## Requirements

- [x] Create program edit dialog or navigate to edit page (dialog approach)
- [x] Add onClick handler to both "Edit Program" menu items
- [x] Decide: inline dialog edit vs dedicated edit page (chose dialog)
- [x] Verify `PUT /programs/:id` endpoint exists (P2) - exists via updateProgram
- [x] Check for existing ProgramForm edit mode support (supports program prop)

## Notes

The `ProgramForm` component likely already supports edit mode (check for `program` prop). May just need to wire up state and dialog similar to certificate config.
