# Terminology Rename Reference

## Date: 2026-01-21
## Status: COMPLETE (documents updated)

---

## Core Terminology

| Term | Definition |
|------|------------|
| **Module** | A logical grouping of learning units within a course (formerly "Chapter") |
| **LearningUnit** | A single piece of content/activity within a module (formerly "CourseModule") |

---

## Complete Rename Mapping

### Entity Names

| Old Entity | New Entity |
|------------|------------|
| Chapter | Module |
| ChapterAccess | ModuleAccess |
| ChapterProgress | ModuleProgress |
| ChapterCompletionCriteria | ModuleCompletionCriteria |
| ChapterPresentationRules | ModulePresentationRules |
| CourseModule | LearningUnit |
| CourseModuleType | LearningUnitType |
| CourseModuleSettings | LearningUnitSettings |
| ModuleCategory (old) | LearningUnitCategory |
| ModuleProgress (old, per-item) | LearningUnitProgress |

### Field Names

| Old Field | New Field | Context |
|-----------|-----------|---------|
| chapterId | moduleId | On LearningUnit, Attempts |
| moduleId (old) | learningUnitId | On Attempts (content item reference) |
| chapters | modules | On Course |
| modules (old, content items) | learningUnits | On Module |
| gateModuleId | gateLearningUnitId | On Module |
| hasStartedModule | hasStartedLearningUnit | On ModuleAccess |
| firstModuleStartedAt | firstLearningUnitStartedAt | On ModuleAccess |
| modulesCompleted | learningUnitsCompleted | On ModuleAccess, Progress |
| modulesTotal | learningUnitsTotal | On ModuleAccess, Progress |
| moduleCount | learningUnitCount | Statistics |

### API Endpoints

| Old Endpoint | New Endpoint |
|--------------|--------------|
| /chapters | /modules |
| /chapters/:chapterId | /modules/:moduleId |
| /chapters/:chapterId/modules | /modules/:moduleId/learning-units |
| /modules/:moduleId | /learning-units/:learningUnitId |
| /chapters/:chapterId/access | /modules/:moduleId/access |

### Array/Collection Names

| Old Array | New Array | Context |
|-----------|-----------|---------|
| chapters[] | modules[] | Course.modules |
| modules[] | learningUnits[] | Module.learningUnits |
| chapterAccess[] | moduleAccess[] | Enrollment tracking |

---

## Files Updated

- [x] specs/UNIFIED_CONTENT_HIERARCHY_SPEC.md
- [x] specs/IMPLEMENTATION_PLAN.md
- [x] api_messages/README.md
- [x] api_messages/UI-MSG-001-MODULE-ENTITY.md (renamed from CHAPTER)
- [x] api_messages/UI-MSG-002-ASSESSMENT-ENTITY.md
- [x] api_messages/UI-MSG-003-MODULE-ACCESS-ENTITY.md (renamed from CHAPTER-ACCESS)
- [x] api_messages/UI-MSG-004-ENTITY-MODIFICATIONS.md

---

## TODO Items for Development

### New Entity Files to Create

```
src/entities/module/
├── model/
│   ├── types.ts              # Module, ModulePresentationRules, ModuleCompletionCriteria
│   ├── moduleKeys.ts
│   └── useModule.ts
├── api/
│   └── moduleApi.ts
├── hooks/
│   └── index.ts
├── ui/
│   ├── ModuleCard.tsx
│   ├── ModuleList.tsx
│   ├── ModuleForm.tsx
│   └── PresentationRulesForm.tsx
└── index.ts

src/entities/learning-unit/           # Renamed from course-module
├── model/
│   ├── types.ts              # LearningUnit, LearningUnitType, LearningUnitCategory
│   ├── learningUnitKeys.ts
│   └── useLearningUnit.ts
├── api/
│   └── learningUnitApi.ts
├── hooks/
│   └── index.ts
├── ui/
│   ├── LearningUnitCard.tsx
│   ├── LearningUnitList.tsx
│   └── LearningUnitForm.tsx
└── index.ts

src/entities/module-access/
├── model/
│   ├── types.ts              # ModuleAccess
│   └── moduleAccessKeys.ts
├── api/
│   └── moduleAccessApi.ts
└── index.ts
```

### Type Definitions Summary

```typescript
// New Module types
interface Module { ... }
interface ModulePresentationRules { ... }
interface ModuleCompletionCriteria { ... }
type PresentationMode = 'prescribed' | 'learner_choice' | 'random';
type RepetitionMode = 'none' | 'until_passed' | 'until_mastery' | 'spaced';

// Renamed LearningUnit types (from CourseModule)
interface LearningUnit { ... }  // was CourseModule
type LearningUnitType = ...;    // was CourseModuleType
type LearningUnitCategory = 'exposition' | 'practice' | 'assessment';
interface LearningUnitSettings { ... }

// New ModuleAccess types
interface ModuleAccess { ... }

// Updated Attempt types
interface ContentAttempt {
  moduleId: string;           // NEW
  learningUnitId: string;     // NEW (was implicitly contentId)
  // ... existing fields
}

interface ExamAttempt {
  moduleId: string;           // NEW
  learningUnitId: string;     // NEW
  // ... existing fields
}

// Updated Exercise types
type ExerciseType = 'practice' | 'flashcard' | 'matching' | 'finish_the_story';
// REMOVED: 'quiz' | 'exam' | 'assessment'
```

---

*This file tracks the terminology rename. Reference when implementing.*
