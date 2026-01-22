# UI-ISS-055: Nested Programs in Subdepartments

## Priority: Medium
## Status: Complete
## Created: 2026-01-20
## Completed: 2026-01-20

---

## Description

Programs should be allowed at both the top department level AND within subdepartments. The UI should show:

1. **Top-level Programs section** (current) - Programs belonging to the selected department
2. **Programs inside each Subdepartment** - Each subdepartment card/section should contain its own programs list with ability to create programs there

## File

`src/pages/staff/departments/DepartmentProgramsPage.tsx`

## Current Structure
```
Department Management Page
├── Subdepartments (list)
│   ├── Subdept A
│   └── Subdept B
└── Programs (list for top dept only)
```

## Proposed Structure
```
Department Management Page
├── Programs (top department programs)
├── Subdepartments
│   ├── Subdept A
│   │   └── Programs (Subdept A programs) + New Program button
│   └── Subdept B
│       └── Programs (Subdept B programs) + New Program button
```

## Requirements

- [x] Refactor subdepartment list items to be expandable/collapsible (using Radix Collapsible)
- [x] Each subdepartment shows its programs when expanded (SubdepartmentProgramsList component)
- [x] Each subdepartment has "+ Program" button
- [x] Programs created in subdepartment use that subdepartment's ID (via createProgramForSubdept dialog)
- [x] Fetch programs per subdepartment (usePrograms hook per expanded subdept)
- [x] Certificate configuration available for programs at all levels (onCertificateConfig callback)

## API Consideration

Verify `GET /programs?department={subdeptId}` works for subdepartments (should already work).

## UX Notes

Consider accordion/collapsible pattern for subdepartments to avoid overwhelming the page.
