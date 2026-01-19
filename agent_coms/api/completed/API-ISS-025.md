# API-ISS-025: Fix learning-events.contract.ts - Standardize to Hyphens

**Type:** breaking-change  
**Priority:** High  
**Status:** 🔲 Not Started  
**Date Created:** 2026-01-15  
**Blocked By:** API-ISS-024  
**Blocks:** API-ISS-030  

---

## Summary

The `learning-events.contract.ts` file uses underscores for event types (e.g., `content_started`) while the actual `LearningEvent.model.ts` uses hyphens (e.g., `content-started`). This mismatch needs to be corrected to align with our kebab-case standard.

---

## Current State (Incorrect)

```typescript
// contracts/api/learning-events.contract.ts
enum: [
  'enrollment',
  'content_started',      // ❌ Should be: 'content-started'
  'content_completed',    // ❌ Should be: 'content-completed'
  'assessment_started',   // ❌ Should be: 'assessment-started'
  'assessment_completed', // ❌ Should be: 'assessment-completed'
  'module_completed',     // ❌ Should be: 'module-completed'
  'course_completed',     // ❌ Should be: 'course-completed'
  'achievement_earned',   // ❌ Should be: 'achievement-earned'
  'login',
  'logout'
]
```

## Target State (Correct)

```typescript
// contracts/api/learning-events.contract.ts
enum: [
  'enrollment-created',    // ✅ Renamed for clarity
  'content-started',       // ✅ Hyphenated
  'content-completed',     // ✅ Hyphenated
  'assessment-started',    // ✅ Hyphenated
  'assessment-completed',  // ✅ Hyphenated
  'module-completed',      // ✅ Hyphenated
  'course-completed',      // ✅ Hyphenated
  'achievement-earned',    // ✅ Hyphenated
  'login',
  'logout'
]
```

---

## Files to Update

| File | Changes |
|------|---------|
| `contracts/api/learning-events.contract.ts` | Update all event type enums to use hyphens |
| `contracts/types/api-types.ts` | Update `LearningEventType` type if exported |
| `src/validators/learning-events.validator.ts` | Update Joi/Zod schema if event types are validated |

---

## Implementation Steps

1. **Update contract file:**
   - Change all underscore event types to hyphens
   - Add new event types that are missing but exist in the model
   - Update example payloads in the contract

2. **Update any validators:**
   - Search for event type validation schemas
   - Update allowed values to match

3. **Update OpenAPI generation:**
   - Regenerate OpenAPI spec after contract changes
   - Verify enum values are correct in generated docs

4. **Verify no data migration needed:**
   - Confirm `LearningEvent.model.ts` already uses hyphens ✅
   - No database migration required

---

## Acceptance Criteria

- [ ] All event types in contract use hyphens (kebab-case)
- [ ] Contract matches `LearningEvent.model.ts` enum values
- [ ] No TypeScript compilation errors
- [ ] Contract validation tests pass
- [ ] OpenAPI spec regenerated with correct values
- [ ] Postman collection updated (if applicable)

---

## Breaking Change Notice

This is a **breaking change** to the API contract. Since we are not in production, this is acceptable per project guidelines.

UI team must be notified to update their event type handling to use hyphens.

---

## Reference

See [REPORT_SYSTEM_RECOMMENDATION.md](../REPORT_SYSTEM_RECOMMENDATION.md) section 5.1 for event type comparison matrix.
