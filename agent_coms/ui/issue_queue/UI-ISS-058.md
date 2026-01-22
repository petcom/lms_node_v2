# UI-ISS-058: Course Form Program Field Should Be Dropdown

## Priority: Medium
## Status: Complete
## Created: 2026-01-21
## Completed: 2026-01-21

---

## Description

The "Program" field in the Create Course form is currently a text input field. It should be a dropdown populated with programs available in the currently selected department.

## Current Behavior

- Program field is a free-text input
- User must manually type program name/ID

## Expected Behavior

- Program field is a dropdown/select
- Options populated from `GET /programs?department={currentDeptId}`
- Include empty/none option (program is not required for course creation)
- Shows program name, possibly with code

## File

Likely: `src/entities/course/ui/CourseForm.tsx` or similar

## Requirements

- [x] Change program field from text input to Select component
- [x] Fetch programs for current department using `usePrograms` hook (in CourseManagementPage)
- [x] Add empty option: "None (No Program)"
- [x] Display program name (and code) in dropdown options
- [x] Handle loading state while programs are fetched (programsLoading prop)
- [x] Verify program field is optional in API contract (P2) - already optional in form

## Notes

Similar pattern to department selection in other forms. May need to pass `departmentId` as prop to the form.
