# Unified Content Hierarchy - Implementation Plan

## Version: 1.1.0
## Created: 2026-01-21
## Updated: 2026-01-21
## Status: Ready for Development

---

## Terminology

| Term | Definition |
|------|------------|
| **Module** | A logical grouping of learning units within a course (formerly "Chapter") |
| **LearningUnit** | A single piece of content/activity within a module (formerly "CourseModule") |

---

## Executive Summary

Implement a two-tier content hierarchy (Course → Module → LearningUnit) with a presentation rules engine and enhanced activity tracking. This consolidates Assessment, Enhanced Exercise, and Learning Events specs into one unified architecture.

---

## Key Decisions

| Decision | Choice |
|----------|--------|
| Group naming | **Module** (formerly Chapter) |
| Content unit naming | **LearningUnit** (formerly CourseModule) |
| Ordering | **Prerequisites** (dependency-based) |
| Assessment vs Exercise | **Separate entities** |
| Presentation | **Rules Engine** (prescribed/learner_choice/random) |
| Repetition | **Mastery-based** with configurable thresholds |
| Activity tracking | **ModuleAccess** + enhanced Attempts |
| Event granularity | **Start/Complete only** |
| Question selection | **Runtime** from bank(s) via `questionBankIds[]` |

---

## Phase 1: Backend Coordination

**Owner:** API Team
**Blocking:** All UI work

### 1.1 New Entities Required

| Entity | Priority | Description |
|--------|----------|-------------|
| Module | P0 | Course grouping with presentationRules (formerly Chapter) |
| Assessment | P0 | Quiz/Exam with question bank selection (multi-bank support) |
| ModuleAccess | P1 | Tracks when learner opens module |

### 1.2 Entity Modifications Required

| Entity | Changes |
|--------|---------|
| CourseModule → LearningUnit | Rename entity, add: `moduleId`, `category`, `isRequired`, `isReplayable`, `weight` |
| ContentAttempt | Add: `moduleId`, `learningUnitId` |
| ExamAttempt | Add: `moduleId`, `learningUnitId` |
| Exercise | Remove types: `quiz`, `exam`, `assessment` from ExerciseType |
| Question | Add: `questionBankIds: string[]` (question can belong to multiple banks) |

### 1.3 Coordination Messages

- `UI-MSG-001`: Module entity contract request (formerly Chapter)
- `UI-MSG-002`: Assessment entity contract request
- `UI-MSG-003`: ModuleAccess entity contract request (formerly ChapterAccess)
- `UI-MSG-004`: Entity modification requests (including LearningUnit rename)
- `UI-MSG-005`: Question entity modification request (add `questionBankIds[]`)

---

## Phase 2: UI Types (After API contracts received)

**Owner:** UI Team
**Depends on:** Phase 1 contracts

| Task | Files |
|------|-------|
| Create Module types | `src/entities/module/model/types.ts` |
| Create LearningUnit types | `src/entities/learning-unit/model/types.ts` |
| Create Assessment types | `src/entities/assessment/model/types.ts` |
| Create ModuleAccess types | `src/entities/module-access/model/types.ts` |
| Create PresentationRules types | `src/entities/module/model/presentationRules.ts` |
| Update ExerciseType | `src/entities/exercise/model/types.ts` |
| Update ContentAttempt types | `src/entities/content-attempt/model/types.ts` |
| Update ExamAttempt types | `src/entities/exam-attempt/model/types.ts` |

---

## Phase 3: API Integration

**Owner:** UI Team
**Depends on:** Phase 2

| Task | Files |
|------|-------|
| Module API client | `src/entities/module/api/moduleApi.ts` |
| Module hooks | `src/entities/module/hooks/` |
| LearningUnit API client | `src/entities/learning-unit/api/learningUnitApi.ts` |
| LearningUnit hooks | `src/entities/learning-unit/hooks/` |
| Assessment API client | `src/entities/assessment/api/assessmentApi.ts` |
| Assessment hooks | `src/entities/assessment/hooks/` |
| ModuleAccess API client | `src/entities/module-access/api/` |

---

## Phase 4: UI Components - Module Management

**Owner:** UI Team
**Depends on:** Phase 3

| Component | Description |
|-----------|-------------|
| ModuleCard | Display module in list |
| ModuleList | List modules for a course |
| ModuleForm | Create/edit module |
| PresentationRulesForm | Configure presentation mode, repetition |
| CourseBuilder | Updated with module management |

---

## Phase 5: UI Components - Assessment & LearningUnit

**Owner:** UI Team
**Depends on:** Phase 3

| Component | Description |
|-----------|-------------|
| AssessmentBuilder | Create quiz/exam |
| AssessmentForm | Configure assessment settings |
| QuestionBankPicker | Multi-select question banks for assessment |
| StylePresetSelector | Quiz vs Exam presets |
| LearningUnitForm | Configure learning unit (module selection, category) |

---

## Phase 6: Progress & Player

**Owner:** UI Team
**Depends on:** Phases 4, 5

| Component | Description |
|-----------|-------------|
| ModuleProgress | Display learner's module progress |
| CourseProgress | Updated to group by module |
| CoursePlayer | Navigate by module |
| PresentationEngine | Respects rules (prescribed/choice/random) |
| MasteryTracker | Repetition prompts, mastery display |
| AttemptHistory | Per-learning-unit attempt listing |
| InstructorInterventionView | Learners falling behind |

---

## Phase 7: Exercise Enhancements (Future)

**Owner:** UI Team
**Depends on:** Phase 6

| Component | Description |
|-----------|-------------|
| FlashcardBuilder | Create flashcard sets |
| FlashcardPlayer | Spaced repetition |
| MatchingBuilder | Create matching exercises |
| MatchingPlayer | Drag-drop interaction |
| FinishTheStoryBuilder | Prose exercises |
| FinishTheStoryPlayer | AI scoring integration |
| MediaUploader | Rich media support |

---

## Data Flow

```
CONTENT CREATION:
Course → Module (with presentationRules) → LearningUnit → Content (Exercise/Assessment)

LEARNER JOURNEY:
Enrollment
  └→ ModuleAccess (opened module)
       └→ ContentAttempt / ExamAttempt (started/completed learning unit)
            └→ ModuleProgress (computed from above)

INSTRUCTOR VIEW:
Dashboard
  └→ Learners by Module
       └→ Filter: opened but not started (intervention needed)
       └→ Filter: below mastery threshold
       └→ Filter: not completed within timeframe
```

---

## Success Criteria

1. Courses can be organized into Modules
2. Modules contain LearningUnits
3. Modules support prerequisite-based ordering
4. Presentation rules configurable per module (prescribed/choice/random)
5. Mastery-based repetition working
6. Instructors can see learners who opened module but didn't start
7. Assessments pull questions from selected bank(s) at runtime
8. All attempts tracked with moduleId and learningUnitId for aggregation

---

## Timeline Dependencies

```
API Team                          UI Team
─────────                         ───────
[Module contract]─────────────────→[Module types]
[LearningUnit modifications]──────→[LearningUnit types]
[Assessment contract]─────────────→[Assessment types]
[ModuleAccess contract]───────────→[ModuleAccess types]
[Entity modifications]────────────→[Update existing types]
                                   ↓
                                  [API integration]
                                   ↓
                                  [UI Components]
                                   ↓
                                  [Progress & Player]
```

---

## Terminology Migration TODO

| Old Term | New Term |
|----------|----------|
| Chapter | Module |
| chapterId | moduleId |
| chapters | modules |
| ChapterAccess | ModuleAccess |
| ChapterProgress | ModuleProgress |
| CourseModule | LearningUnit |
| courseModuleId | learningUnitId |
| modules (old array) | learningUnits |

---

*End of Implementation Plan*
