# UI Team - CreateContent Validation Error Investigation

## Date: 2026-01-21
## From: UI Team
## To: API Team
## Priority: High
## Related Issues: UI-ISS-059

---

## Summary

Users are receiving validation error when trying to create content in the "Add a module" flow:

```
ContentID: content is required
```

## Context

When adding a module to a course via the CourseModuleForm, the form submits with `contentId` as optional (empty string or undefined). The API appears to require this field.

## Questions

1. Is `contentId` required when creating a course module?
2. If so, what should the content creation flow be?
   - Should content be created first, then module references it?
   - Or should module creation auto-create content?
3. What endpoint creates content? Is it `POST /content` or embedded in module creation?

## Current UI Payload

```typescript
{
  title: "Module Title",
  description: "Description",
  order: 1,
  type: "video" | "quiz" | etc,
  contentId: undefined,  // or ""
  isPublished: false,
  // ... other fields
}
```

## Expected Behavior

- User should be able to create a module without pre-existing content
- OR there should be a clear flow to create content first

## UI Changes Made

Added `quiz` and `exam` to CourseModuleType. Please confirm API supports these module types.

---

*Please advise on the correct content creation flow.*
