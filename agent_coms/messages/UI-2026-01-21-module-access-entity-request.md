# UI Team Message: ModuleAccess Entity Contract Request

**Date:** 2026-01-21
**From:** UI Team
**To:** API Team
**Priority:** P1 (High)
**Status:** PENDING

---

## Terminology

| Term | Definition |
|------|------------|
| **Module** | A logical grouping of learning units within a course |
| **LearningUnit** | A single piece of content/activity within a module |

---

## Request

Create new `ModuleAccess` entity to track when learners open/view modules.

## Context

We need to track module-level access SEPARATELY from learning unit attempts so instructors can:
- See learners who opened a module but never started any learning unit (drop-off)
- Identify learners falling behind or not completing training
- Intervene before learners give up

## Required Entity: ModuleAccess

```typescript
interface ModuleAccess {
  id: string;
  learnerId: string;
  enrollmentId: string;
  courseId: string;
  moduleId: string;

  firstAccessedAt: string;
  lastAccessedAt: string;
  accessCount: number;

  hasStartedLearningUnit: boolean;
  firstLearningUnitStartedAt?: string;
  learningUnitsCompleted: number;
  learningUnitsTotal: number;

  status: 'accessed' | 'in_progress' | 'completed';

  createdAt: string;
  updatedAt: string;
}
```

## Required Endpoints

```
POST   /api/v2/modules/:moduleId/access
GET    /api/v2/enrollments/:enrollmentId/module-access
GET    /api/v2/modules/:moduleId/access
GET    /api/v2/courses/:courseId/module-access-summary
```

## Instructor Queries

```
# Drop-off risk
GET /api/v2/modules/:moduleId/access?hasStartedLearningUnit=false

# In progress
GET /api/v2/modules/:moduleId/access?status=in_progress
```

## Response Requested

Please provide preferred approach (dedicated entity vs LearningEvent) and timeline.

---

**Related Spec:** `/home/adam/github/cadencelms_ui/specs/UNIFIED_CONTENT_HIERARCHY_SPEC.md`
