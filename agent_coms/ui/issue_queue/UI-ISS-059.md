# UI-ISS-059: Create Course Module Issues

## Priority: High
## Status: Superseded by Assessment Module Spec
## Created: 2026-01-21
## Updated: 2026-01-21

---

## Description

Two issues with the "Add a module" functionality on the Create Course page:

### Issue 1: Missing Quiz/Exam Module Types

The module type selector does not include options for Quiz or Exam content types.

**Expected:** Module type dropdown should include:
- Video
- Document/Reading
- Quiz
- Exam
- Assignment
- (other supported types)

### Issue 2: CreateContent Error (RESOLVED)

When attempting to create content, receiving validation error:

```
ContentID: content is required
```

**Resolution:** API team fixed - contentId is now optional.
See: `api/agent_coms/messages/2026-01-21_api_contentid_validation_fixed.md`

## Requirements Update

- [x] Debug CreateContent validation error - **RESOLVED by API team**
- [x] Verify content creation payload matches API contract - **RESOLVED**
- [x] Check if contentId should be auto-generated or user-provided - **Optional**

### Quiz/Exam Module Types - NEW APPROACH

**SUPERSEDED:** Instead of mapping quiz/exam to the `exercise` type, a new `assessment` module type will be created.

See specification: `specs/ASSESSMENT_MODULE_SPEC.md`

Key decisions:
- New module type: `assessment`
- Assessment styles: `quiz`, `exam` (expandable)
- Quiz: 30-50% of question bank, unlimited retries
- Exam: 80-100% of question bank, limited retries (1-3)
- Questions pulled from existing question bank

## Related Issues

- UI-ISS-060: Quiz/Exam Builder Page (superseded by Assessment Builder in spec)

## API Message

Sent: `api/agent_coms/messages/UI-2026-01-21-create-content-error.md`
Response: `api/agent_coms/messages/2026-01-21_api_contentid_validation_fixed.md`

## Next Steps

1. Share spec with API team for review
2. API team implements Assessment model and endpoints
3. UI team implements Assessment entity and builder

## Notes

The temporary mapping of quiz/exam -> exercise has been reverted. The proper implementation will use the new assessment module type with quiz/exam as style options.
