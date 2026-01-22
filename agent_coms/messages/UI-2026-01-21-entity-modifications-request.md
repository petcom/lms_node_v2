# UI Team Message: Entity Modification Requests

**Date:** 2026-01-21
**From:** UI Team
**To:** API Team
**Priority:** P0 (Blocking)
**Status:** PENDING

---

## Terminology

| Term | Definition |
|------|------------|
| **Module** | A logical grouping of learning units within a course |
| **LearningUnit** | A single piece of content/activity within a module (formerly "CourseModule") |

---

## Request

Modify existing entities to support the new Module hierarchy.

---

## 1. CourseModule → LearningUnit Rename

```
CourseModule → LearningUnit
```

### Add Fields

```typescript
interface LearningUnit {
  // EXISTING fields...
  moduleId: string;                 // NEW: link to parent module
  category: 'exposition' | 'practice' | 'assessment';  // NEW
  isRequired: boolean;              // NEW
  isReplayable: boolean;            // NEW
  weight: number;                   // NEW (0-100)
}
```

### New Endpoints

```
POST /api/v2/modules/:moduleId/learning-units
GET  /api/v2/modules/:moduleId/learning-units
GET  /api/v2/learning-units/:learningUnitId
PUT  /api/v2/learning-units/:learningUnitId
DELETE /api/v2/learning-units/:learningUnitId
```

---

## 2. ContentAttempt Modifications

```typescript
interface ContentAttempt {
  // EXISTING fields...
  moduleId: string;                 // NEW
  learningUnitId: string;           // NEW
}
```

---

## 3. ExamAttempt Modifications

```typescript
interface ExamAttempt {
  // EXISTING fields...
  moduleId: string;                 // NEW
  learningUnitId: string;           // NEW
}
```

---

## 4. Exercise Entity - Remove Types

```typescript
// BEFORE
type ExerciseType = 'quiz' | 'exam' | 'practice' | 'assessment';

// AFTER
type ExerciseType = 'practice' | 'flashcard' | 'matching' | 'finish_the_story';
```

Quiz/exam moved to Assessment entity.

---

## 5. LearningUnitType (formerly CourseModuleType)

```typescript
type LearningUnitType = 'scorm' | 'custom' | 'exercise' | 'video' | 'document' | 'assessment';
```

---

## Summary

| Entity | Action |
|--------|--------|
| CourseModule | RENAME → LearningUnit |
| LearningUnit | ADD: moduleId, category, isRequired, isReplayable, weight |
| ContentAttempt | ADD: moduleId, learningUnitId |
| ExamAttempt | ADD: moduleId, learningUnitId |
| ExerciseType | REMOVE: quiz, exam, assessment |

## Response Requested

Please confirm renames, field additions, migration approach, and timeline.

---

**Related Spec:** `/home/adam/github/cadencelms_ui/specs/UNIFIED_CONTENT_HIERARCHY_SPEC.md`
