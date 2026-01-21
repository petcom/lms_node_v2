# API-ISS-006: Make contentId Optional for Module Creation

## Status: COMPLETE
## Priority: High
## Created: 2026-01-21
## Requested By: UI Team
## Related: UI-ISS-059

---

## Overview

Fix validation error "ContentID: content is required" when creating course modules without pre-existing content.

---

## Root Cause

The `CourseContent.model.ts` had `contentId` marked as required:
```typescript
contentId: {
  type: Schema.Types.ObjectId,
  ref: 'Content',
  required: [true, 'Content is required']  // <-- Caused the error
}
```

---

## Solution

1. Made `contentId` optional in the model
2. Added `sparse: true` to the unique compound index to allow multiple modules without content
3. Updated interface to reflect optional type

---

## Files Modified

| File | Change |
|------|--------|
| `src/models/content/CourseContent.model.ts` | Made contentId optional, added sparse index |

---

## Module Types Clarification

Valid module types in the API:
- `scorm` - SCORM packages
- `custom` - Custom content / interactive exercises
- `exercise` - Quizzes, exams, assessments
- `video` - Video content
- `document` - Documents, PDFs

**Note:** `quiz` and `exam` are NOT direct module types. For quiz/exam content, use type `exercise`.

---

## Content Creation Flow

With this fix, the supported flows are:

### Flow 1: Module First (Now Supported)
1. Create module without contentId
2. Later attach content via PUT endpoint

### Flow 2: Content First
1. Create content via `POST /api/v2/content`
2. Create module with contentId reference

---

## Acceptance Criteria

- [x] contentId no longer required
- [x] Multiple modules without content allowed
- [x] Unique index still prevents duplicate content in same course
