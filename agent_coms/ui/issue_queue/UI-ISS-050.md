# UI-ISS-050: Implement Subdepartment CRUD

## Status: OPEN

## Problem
Department administrators cannot create or edit subdepartments from the UI.

## Expected Behavior
From the Department Management page, users can:
1. Create new subdepartments under their department
2. Edit existing subdepartment details
3. View subdepartment hierarchy

## Requirements

### Create Subdepartment Form
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | text | Yes | 1-100 characters |
| code | text | Yes | Alphanumeric, max 35 chars, unique within parent |
| description | textarea | No | Max 500 characters |
| parentId | hidden | Yes | Auto-filled from current department |

### Edit Subdepartment Form
- Same fields as create
- Parent department is read-only (cannot be changed)
- Pre-populated with existing values

### UI Components
- Modal dialog for create/edit forms
- Confirmation dialog for delete (if supported)

## Implementation

### Files to Create
- `src/features/departments/ui/SubdepartmentForm.tsx`
- `src/features/departments/ui/SubdepartmentList.tsx`
- `src/features/departments/ui/__tests__/SubdepartmentForm.test.tsx`

### Hooks Required
- `useCreateDepartment` - Already exists
- `useUpdateDepartment` - Already exists

### Form Validation (Zod)
```typescript
const subdepartmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1).max(35).regex(/^[A-Za-z0-9]+$/),
  description: z.string().max(500).optional(),
  parentId: z.string().min(1),
});
```

## Acceptance Criteria
- [ ] Create subdepartment form opens in modal
- [ ] Form validates all required fields
- [ ] Successful creation adds subdepartment to list
- [ ] Edit form pre-populates existing values
- [ ] Successful edit updates list
- [ ] Error messages displayed for validation failures
- [ ] API errors handled gracefully
- [ ] Loading states during submission

## API Requirements
- `POST /api/v2/departments` - Create (existing)
- `PUT /api/v2/departments/:id` - Update (existing)

## Dependencies
- UI-ISS-049: Department Management page

## Related Spec
- [DEPARTMENT_PROGRAM_MANAGEMENT_SPEC.md](../../SPECS/DEPARTMENT_PROGRAM_MANAGEMENT_SPEC.md)

## Priority
Medium

## Created
2026-01-20
