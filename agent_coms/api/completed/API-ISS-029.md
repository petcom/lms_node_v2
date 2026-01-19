# API-ISS-029: Add LookupValue Validation to LearningEvent Model

**Type:** improvement  
**Priority:** Medium  
**Status:** 🔲 Not Started  
**Date Created:** 2026-01-15  
**Blocked By:** API-ISS-024  
**Blocks:** None  

---

## Summary

Add pre-save validation to the `LearningEvent` model that validates `eventType` values against the LookupValue table. This ensures only valid, registered event types can be stored.

---

## Current State

```typescript
// src/models/activity/LearningEvent.model.ts
eventType: {
  type: String,
  enum: [
    'content-viewed',
    'content-started',
    'content-completed',
    'scorm-launched',
    'scorm-suspended',
    'scorm-completed',
    // ... hardcoded list
  ],
  required: true
}
```

## Target State

```typescript
// src/models/activity/LearningEvent.model.ts
eventType: {
  type: String,
  required: true,
  // Remove enum - validation done via pre-save hook
}

// Pre-save hook validates against LookupValue
LearningEventSchema.pre('save', async function(next) {
  const lookupValue = await LookupValue.findOne({
    category: 'activity-event',
    key: this.eventType,
    isActive: true
  });
  
  if (!lookupValue) {
    throw new Error(`Invalid eventType: ${this.eventType}. Must be a registered activity-event in LookupValue.`);
  }
  
  next();
});
```

---

## Benefits

1. **Runtime Extensibility:** New event types can be added via LookupValue seed/admin without code changes
2. **Consistency:** All event types validated against single source of truth
3. **Documentation:** LookupValue entries serve as documentation for valid types
4. **UI Integration:** UI can fetch valid event types dynamically

---

## Implementation Steps

1. **Update LearningEvent model:**
   - Remove `enum` constraint from `eventType` field
   - Add pre-save validation hook
   - Import LookupValue model

2. **Add caching layer:**
   - Cache valid event types to avoid repeated DB queries
   - Use 5-minute TTL cache
   - Invalidate on LookupValue update

3. **Create validation utility:**
   ```typescript
   // src/utils/lookup-validators.ts
   export async function validateLookupValue(
     category: string, 
     key: string
   ): Promise<boolean>;
   
   export async function getValidKeys(
     category: string
   ): Promise<string[]>;
   ```

4. **Update existing tests:**
   - Ensure LookupValue seed runs before tests
   - Update any tests that rely on enum validation

5. **Write new tests:**
   - Test valid event type saves successfully
   - Test invalid event type throws error
   - Test cache invalidation

---

## Validation Utility Pattern

This pattern should be reusable across all models that reference LookupValue:

```typescript
// src/utils/lookup-validators.ts

import { LookupValue } from '../models/LookupValue.model';

const cache = new Map<string, { values: string[]; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function validateLookupValue(
  category: string,
  key: string
): Promise<boolean> {
  const validKeys = await getValidKeys(category);
  return validKeys.includes(key);
}

export async function getValidKeys(category: string): Promise<string[]> {
  const cached = cache.get(category);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.values;
  }
  
  const lookupValues = await LookupValue.find({
    category,
    isActive: true
  }).select('key').lean();
  
  const values = lookupValues.map(lv => lv.key);
  
  cache.set(category, {
    values,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
  
  return values;
}

export function invalidateCache(category?: string): void {
  if (category) {
    cache.delete(category);
  } else {
    cache.clear();
  }
}
```

---

## Acceptance Criteria

- [ ] LearningEvent model uses pre-save validation
- [ ] Validation checks against LookupValue table
- [ ] Caching layer implemented with TTL
- [ ] Validation utility created and reusable
- [ ] All existing tests pass
- [ ] New validation tests written and passing
- [ ] Invalid event types properly rejected with clear error message

---

## Reference

See [REPORT_SYSTEM_RECOMMENDATION.md](../REPORT_SYSTEM_RECOMMENDATION.md) section 6.2 for validation patterns.
