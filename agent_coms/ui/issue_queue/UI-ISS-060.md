# UI-ISS-060: Quiz/Exam Builder Page

## Priority: Medium
## Status: Complete (Investigation)
## Created: 2026-01-21
## Completed: 2026-01-21

---

## Description

Need a way to create and manage quiz/exam questions. Either:
1. Create a dedicated Quiz/Exam Builder page
2. Add a link/button to existing builder from the "Add a module" flow

## Investigation Results

- [x] **Quiz/Exam builder EXISTS**: `ExerciseBuilderPage` at `/staff/courses/exercises/new`
- [x] **API contracts exist**: Exercise entity with full CRUD in `src/entities/exercise/`
- [x] **Questions stored in exercise**: Via `ExerciseQuestion` type with bank support

## Existing Infrastructure

| Component | Location |
|-----------|----------|
| ExerciseBuilderPage | `/staff/courses/exercises/new` (create), `/staff/courses/exercises/:exerciseId` (edit) |
| ExerciseManagementPage | `/admin/exercises` |
| Exercise Entity | `src/entities/exercise/` |
| Question Types | multiple_choice, true_false, short_answer, essay, matching |
| Exercise Types | quiz, exam, practice, assessment |

## Remaining Work

The builder exists but navigation from module creation may need improvement:
- When user selects Quiz/Exam module type, show link to exercise builder
- Or embed exercise selection in module creation flow

## If Builder Page Doesn't Exist

Create a Quiz/Exam Builder with:
- Question creation (multiple choice, true/false, short answer, etc.)
- Question bank management
- Point values per question
- Time limits
- Randomization options
- Preview functionality

## If Builder Page Exists

- Add navigation from "Add a module" page when Quiz/Exam type is selected
- "Create New Quiz" or "Configure Exam" button that opens builder
- Return flow back to module creation with quiz/exam ID

## Files to Check

```
src/pages/staff/**/quiz*
src/pages/staff/**/exam*
src/entities/quiz/
src/entities/exam/
src/features/quiz-builder/
```

## Related Issues

- UI-ISS-059: Missing quiz/exam module types in Add Module

## Notes

This is a significant feature. May need to coordinate with API team on question/answer storage and grading contracts.
