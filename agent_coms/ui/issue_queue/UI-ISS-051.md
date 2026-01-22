# UI-ISS-051: Implement Program CRUD

## Status: OPEN

## Problem
Department administrators cannot create, edit, or manage programs from the UI. Programs are collections of courses that lead to certificates or credentials.

## Expected Behavior
From the Department Management page, users can:
1. Create new programs in their department
2. Edit existing program details
3. Add/remove courses from programs
4. Change program status (Draft/Active/Archived)

## Requirements

### Create Program Form
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | text | Yes | 1-200 characters |
| code | text | Yes | Alphanumeric, max 35 chars, unique |
| description | textarea | No | Max 2000 characters |
| departmentId | hidden | Yes | Auto-filled from context |
| courses | multi-select | No | Select from department's courses |
| requiredCredits | number | No | Min 0 |
| status | select | Yes | draft, active, archived |
| certificateEnabled | checkbox | No | Default false |

### Edit Program Form
- Same fields as create
- Department is read-only
- Course ordering via drag-and-drop

### Program Status Workflow
```
Draft → Active → Archived
         ↑         |
         └─────────┘ (can reactivate)
```

### Course Selection
- Multi-select dropdown or transfer list UI
- Shows only courses from same department
- Displays course code and title
- Drag-and-drop to reorder courses in program

## Implementation

### Files to Create
- `src/features/programs/ui/ProgramForm.tsx`
- `src/features/programs/ui/ProgramList.tsx`
- `src/features/programs/ui/CourseSelector.tsx`
- `src/features/programs/ui/__tests__/ProgramForm.test.tsx`
- `src/entities/program/` (if not exists)

### Hooks Required (may need creation)
- `usePrograms(deptId)` - List programs
- `useProgram(id)` - Get single program
- `useCreateProgram()` - Create program
- `useUpdateProgram()` - Update program
- `useDeleteProgram()` - Archive program

### Form Validation (Zod)
```typescript
const programSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  code: z.string().min(1).max(35).regex(/^[A-Za-z0-9]+$/),
  description: z.string().max(2000).optional(),
  departmentId: z.string().min(1),
  courses: z.array(z.string()).optional(),
  requiredCredits: z.number().min(0).optional(),
  status: z.enum(['draft', 'active', 'archived']),
  certificateEnabled: z.boolean().optional(),
});
```

## Acceptance Criteria
- [ ] Create program form opens in modal/page
- [ ] Form validates all required fields
- [ ] Course multi-select shows department courses
- [ ] Courses can be reordered within program
- [ ] Status dropdown works correctly
- [ ] Successful creation adds program to list
- [ ] Edit form pre-populates existing values
- [ ] Successful edit updates list
- [ ] Archive action changes status
- [ ] Error messages displayed for failures

## API Requirements
Verify with API team:
- `GET /api/v2/programs?department=xxx` - List programs
- `GET /api/v2/programs/:id` - Get program
- `POST /api/v2/programs` - Create program
- `PUT /api/v2/programs/:id` - Update program
- `DELETE /api/v2/programs/:id` - Archive program

## Dependencies
- UI-ISS-049: Department Management page
- API endpoints for programs

## Related Spec
- [DEPARTMENT_PROGRAM_MANAGEMENT_SPEC.md](../../SPECS/DEPARTMENT_PROGRAM_MANAGEMENT_SPEC.md)

## Priority
Medium

## Created
2026-01-20
