# UI-ISS-061: Remove Module Types from Add Module Flow

## Priority: High
## Status: Complete
## Created: 2026-01-21
## Completed: 2026-01-21

---

## Description

In the Create Course page, when adding a module, the UI still asks for module "types". This is outdated and confusing. Modules should function as chapters or course subdivisions - they are organizational containers, not typed content.

Content types (video, document, SCORM, exercise, assessment, etc.) should be attributes of **Learning Units**, not Modules.

## Current Behavior

The "Add Module" flow presents a type selection screen that doesn't align with the current architecture.

## Expected Behavior

Adding a module should be straightforward:
- Module title
- Module description (optional)
- Completion criteria settings
- Presentation rules (prescribed/learner_choice/random)
- Objectives (optional)

No "type" selection should be required for modules.

## Architecture Reference

Per the current entity model:
- **Course** → contains **Modules** (organizational chapters)
- **Module** → contains **Learning Units** (typed content)
- **Learning Unit** → has `type` field: `'scorm' | 'custom' | 'exercise' | 'video' | 'document' | 'assessment'`

The `LearningUnitType` is defined in `src/entities/learning-unit/model/types.ts`.

## Files to Investigate

```
src/pages/staff/courses/
src/features/course-builder/
src/entities/course-module/ui/CourseModuleForm.tsx
src/entities/module/ui/ModuleForm.tsx
```

## Acceptance Criteria

- [x] Remove module type selection from Add Module flow
- [x] Module creation collects: title, description, order, passing score, duration, published status
- [x] Types are only selectable when adding Learning Units to a module
- [x] Update any related UI that references "module types" (removed type badge from ModuleList)

## Implementation Summary

**Files Modified:**
- `src/entities/course-module/ui/CourseModuleForm.tsx` - Removed type selector, simplified to chapter-like fields
- `src/features/courses/ui/ModuleDialog.tsx` - Removed type from defaultValues
- `src/features/courses/ui/ModuleList.tsx` - Removed type badge display, simplified icon function

**Changes:**
1. CourseModuleForm now only collects: title, description, order, passing score, duration, published status
2. Type defaults to 'custom' internally for API compatibility
3. Removed assessment-specific settings (shuffleQuestions, showFeedback, etc.) that belong on Learning Units
4. Updated dialog description to clarify modules are like chapters
5. Removed type badge from module list display
6. Simplified module icon to always show BookOpen (chapter icon)

## Related

- Module entity: `src/entities/module/`
- Learning Unit entity: `src/entities/learning-unit/`
- New ModuleForm component: `src/entities/module/ui/ModuleForm.tsx`

## Notes

The recently created `ModuleForm.tsx` component already follows the correct pattern (no type field). The issue is in the existing course creation/editing pages that still use the old flow.
