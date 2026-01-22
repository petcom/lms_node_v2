# UI Team Message: Module Entity Contract Request

**Date:** 2026-01-21
**From:** UI Team
**To:** API Team
**Priority:** P0 (Blocking)
**Status:** PENDING

---

## Terminology

| Term | Definition |
|------|------------|
| **Module** | A logical grouping of learning units within a course (formerly "Chapter") |
| **LearningUnit** | A single piece of content/activity within a module (formerly "CourseModule") |

---

## Request

Create new `Module` entity to group learning units within a course.

## Context

We are implementing a Course → Module → LearningUnit hierarchy. Modules replace the flat learning unit list and support:
- Prerequisite-based ordering between modules
- Configurable presentation rules (how learning units are presented to learners)
- Mastery-based repetition settings

## Required Entity: Module

```typescript
interface Module {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  prerequisites: string[];          // Module IDs that must complete first

  completionCriteria: {
    type: 'all_required' | 'percentage' | 'gate_learning_unit' | 'points';
    percentageRequired?: number;
    pointsRequired?: number;
    gateLearningUnitScore?: number;
    requireAllExpositions?: boolean;
  };
  gateLearningUnitId?: string;

  presentationRules: {
    presentationMode: 'prescribed' | 'learner_choice' | 'random';
    prescribedOrder?: string[];
    repetitionMode: 'none' | 'until_passed' | 'until_mastery' | 'spaced';
    masteryThreshold?: number;
    maxRepetitions?: number | null;
    cooldownBetweenRepetitions?: number;
    repeatOn: {
      failedAttempt: boolean;
      belowMastery: boolean;
      learnerRequest: boolean;
    };
    repeatableCategories: ('exposition' | 'practice' | 'assessment')[];
    showAllAvailable: boolean;
    allowSkip: boolean;
  };

  isPublished: boolean;
  availableFrom?: string;
  availableUntil?: string;
  estimatedDuration: number;
  objectives?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; firstName: string; lastName: string; };
}
```

## Required Endpoints

```
GET    /api/v2/courses/:courseId/modules
POST   /api/v2/courses/:courseId/modules
GET    /api/v2/modules/:moduleId
PUT    /api/v2/modules/:moduleId
DELETE /api/v2/modules/:moduleId
POST   /api/v2/modules/:moduleId/reorder
POST   /api/v2/courses/:courseId/modules/reorder
```

## Migration Notes

1. Create default module for each existing course
2. Move all existing learning units into default module
3. Set default `presentationRules` with `learner_choice` mode

## Response Requested

Please provide contract file and timeline estimate.

---

**Related Spec:** `/home/adam/github/cadencelms_ui/specs/UNIFIED_CONTENT_HIERARCHY_SPEC.md`
