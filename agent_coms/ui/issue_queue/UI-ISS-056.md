# UI-ISS-056: Include Subdepartment Programs Toggle

## Priority: Low
## Status: Complete
## Created: 2026-01-20
## Completed: 2026-01-21

---

## Description

Add a toggle to the top-level Programs section that allows viewing all programs including those from subdepartments.

## File

`src/pages/staff/departments/DepartmentProgramsPage.tsx`

## Current Behavior

The Programs section shows only programs directly belonging to the selected department (exact match on `departmentId`).

## Proposed Enhancement

Add a toggle/checkbox: "Include subdepartment programs"

When enabled:
- Call `GET /programs?department={deptId}&includeSubdepartments=true`
- Display programs from the department AND all its children
- Visually indicate which subdepartment each program belongs to (badge or grouping)

## UI Mockup

```
Programs                                    [x] Include subdepartments  [+ New Program]
─────────────────────────────────────────────────────────────────────────────────────
| Web Development 101    | WEB-101 | 5 courses | (Top Dept)    |
| Data Science Intro     | DS-101  | 3 courses | Subdept A     |
| Machine Learning       | ML-201  | 4 courses | Subdept B     |
```

## Requirements

- [x] Add `includeSubdepartments` state toggle
- [x] Pass parameter to `usePrograms` hook when enabled
- [x] Display subdepartment name/badge for programs not in top-level dept
- [x] Update `usePrograms` hook to accept `includeSubdepartments` param (via ProgramFilters type)
- [x] Update program types if API returns additional fields (added `department.level`)

## API Dependency

Requires `GET /programs?department={id}&includeSubdepartments=true` support.
See: `api/agent_coms/messages/UI-2026-01-20-programs-include-subdepartments.md`
