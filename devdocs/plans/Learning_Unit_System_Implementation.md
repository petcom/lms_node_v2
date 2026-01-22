# Learning Unit System - Phased Implementation Plan
**Version:** 1.0
**Date:** 2026-01-21
**Purpose:** Parallel implementation tasks for Claude Code agent team
**Reference:** UI Team Requests in `agent_coms/messages/UI-2026-01-21-*.md`

---

## Overview

This document breaks down the Learning Unit System implementation into phases with parallelizable tasks. Each task is designed to be independently implementable by a Claude Code agent.

### Terminology

| Term | Definition |
|------|------------|
| **Module** | A logical grouping of learning units within a course (formerly "Chapter") |
| **LearningUnit** | A single piece of content/activity within a module (formerly "CourseModule") |
| **ModuleAccess** | Tracking entity for learner module-level access analytics |
| **Assessment** | Quiz/exam configuration entity for evaluations |

### UI Team Requests (Priority Order)

| Request | Priority | Source |
|---------|----------|--------|
| Module Entity | P0 (Blocking) | UI-2026-01-21-module-entity-request.md |
| LearningUnit Modifications | P0 (Blocking) | UI-2026-01-21-entity-modifications-request.md |
| Assessment Entity | P0 (Blocking) | UI-2026-01-21-assessment-module-spec.md |
| ModuleAccess Entity | P1 (High) | UI-2026-01-21-module-access-entity-request.md |
| Question Bank IDs | P1 (High) | UI-2026-01-21-question-entity-modification.md |

---

## Phase 1: Model Creation & Schema Design
**Dependencies:** None
**Parallelism:** Tasks 1.1-1.5 can run in parallel

### Task 1.1: Create Module Model
**Agent ID:** `agent-models-1`
**File:** `src/models/academic/Module.model.ts`

**Requirements:**
1. Create Module schema with all fields from UI spec
2. Include nested `completionCriteria` subdocument
3. Include nested `presentationRules` subdocument
4. Add validation for `prerequisites` (must be valid Module IDs)
5. Add indexes for `courseId`, `isPublished`

**Schema:**
```typescript
interface IModule extends Document {
  courseId: ObjectId;
  title: string;
  description?: string;
  prerequisites: ObjectId[];           // Module IDs

  completionCriteria: {
    type: 'all_required' | 'percentage' | 'gate_learning_unit' | 'points';
    percentageRequired?: number;
    pointsRequired?: number;
    gateLearningUnitScore?: number;
    requireAllExpositions?: boolean;
  };
  gateLearningUnitId?: ObjectId;

  presentationRules: {
    presentationMode: 'prescribed' | 'learner_choice' | 'random';
    prescribedOrder?: ObjectId[];
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
  availableFrom?: Date;
  availableUntil?: Date;
  estimatedDuration: number;
  objectives?: string[];
  order: number;

  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

**Tests Required:**
- `tests/unit/models/Module.model.test.ts`

---

### Task 1.2: Update CourseContent → LearningUnit Model
**Agent ID:** `agent-models-2`
**File:** `src/models/content/CourseContent.model.ts` → `src/models/content/LearningUnit.model.ts`

**Requirements:**
1. Rename file and model from CourseContent to LearningUnit
2. Add `moduleId` field (required, ref to Module)
3. Add `category` field: `'exposition' | 'practice' | 'assessment'`
4. Add `isRequired` field (boolean, default true)
5. Add `isReplayable` field (boolean, default false)
6. Add `weight` field (number 0-100, for module completion)
7. Update `type` enum to include `'assessment'`
8. Add indexes for `moduleId`, `category`
9. Create alias export to maintain backward compatibility

**New Fields:**
```typescript
moduleId: { type: ObjectId, ref: 'Module', required: true },
category: {
  type: String,
  enum: ['exposition', 'practice', 'assessment'],
  required: true
},
isRequired: { type: Boolean, default: true },
isReplayable: { type: Boolean, default: false },
weight: { type: Number, min: 0, max: 100, default: 0 }
```

**Type Update:**
```typescript
type: {
  type: String,
  enum: ['scorm', 'custom', 'exercise', 'video', 'document', 'assessment'],
  required: true
}
```

**Tests Required:**
- `tests/unit/models/LearningUnit.model.test.ts`

---

### Task 1.3: Create Assessment Model
**Agent ID:** `agent-models-3`
**File:** `src/models/content/Assessment.model.ts`

**Requirements:**
1. Create Assessment schema for quiz/exam configurations
2. Include `style` field: `'quiz' | 'exam'`
3. Include `questionBankIds` array for question selection
4. Include timing, attempt limits, and scoring configuration
5. Include feedback settings
6. Add indexes for `departmentId`, `style`, `isPublished`

**Schema:**
```typescript
interface IAssessment extends Document {
  departmentId: ObjectId;
  title: string;
  description?: string;
  style: 'quiz' | 'exam';

  questionSelection: {
    questionBankIds: string[];
    questionCount: number;
    selectionMode: 'random' | 'sequential' | 'weighted';
    filterByTags?: string[];
    filterByDifficulty?: ('beginner' | 'intermediate' | 'advanced')[];
  };

  timing: {
    timeLimit?: number;           // minutes, null = unlimited
    showTimer: boolean;
    autoSubmitOnExpiry: boolean;
  };

  attempts: {
    maxAttempts: number | null;   // null = unlimited
    cooldownMinutes?: number;
    retakePolicy: 'anytime' | 'after_cooldown' | 'instructor_unlock';
  };

  scoring: {
    passingScore: number;         // percentage
    showScore: boolean;
    showCorrectAnswers: 'never' | 'after_submit' | 'after_all_attempts';
    partialCredit: boolean;
  };

  feedback: {
    showFeedback: boolean;
    feedbackTiming: 'immediate' | 'after_submit' | 'after_grading';
    showExplanations: boolean;
  };

  isPublished: boolean;
  isArchived: boolean;

  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

**Tests Required:**
- `tests/unit/models/Assessment.model.test.ts`

---

### Task 1.4: Create ModuleAccess Model
**Agent ID:** `agent-models-4`
**File:** `src/models/progress/ModuleAccess.model.ts`

**Requirements:**
1. Create ModuleAccess schema for tracking module-level engagement
2. Track first/last access timestamps
3. Track learning unit progress within module
4. Include status field for analytics
5. Add compound indexes for efficient queries

**Schema:**
```typescript
interface IModuleAccess extends Document {
  learnerId: ObjectId;
  enrollmentId: ObjectId;
  courseId: ObjectId;
  moduleId: ObjectId;

  firstAccessedAt: Date;
  lastAccessedAt: Date;
  accessCount: number;

  hasStartedLearningUnit: boolean;
  firstLearningUnitStartedAt?: Date;
  learningUnitsCompleted: number;
  learningUnitsTotal: number;

  status: 'accessed' | 'in_progress' | 'completed';
  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
```typescript
{ learnerId: 1, moduleId: 1 }, { unique: true }
{ moduleId: 1, hasStartedLearningUnit: 1 }
{ moduleId: 1, status: 1 }
{ enrollmentId: 1 }
```

**Tests Required:**
- `tests/unit/models/ModuleAccess.model.test.ts`

---

### Task 1.5: Update Question Model - Add questionBankIds
**Agent ID:** `agent-models-5`
**File:** `src/models/content/Question.model.ts`

**Requirements:**
1. Add `questionBankIds` array field (default empty array)
2. Add index for efficient bank queries
3. Ensure backward compatibility (existing questions get empty array)

**Schema Addition:**
```typescript
questionBankIds: {
  type: [String],
  default: [],
  index: true
}
```

**Tests Required:**
- `tests/unit/models/Question.model.test.ts` - questionBankIds validation

---

### Task 1.6: Create AssessmentAttempt Model
**Agent ID:** `agent-models-6`
**File:** `src/models/progress/AssessmentAttempt.model.ts`

**Requirements:**
1. Create AssessmentAttempt schema for tracking attempts
2. Store question selection and responses
3. Track timing and scoring
4. Support partial saves (auto-save)

**Schema:**
```typescript
interface IAssessmentAttempt extends Document {
  assessmentId: ObjectId;
  learnerId: ObjectId;
  enrollmentId: ObjectId;
  moduleId?: ObjectId;
  learningUnitId?: ObjectId;

  attemptNumber: number;
  status: 'in_progress' | 'submitted' | 'graded' | 'abandoned';

  questions: [{
    questionId: ObjectId;
    questionSnapshot: any;        // Frozen question at attempt time
    response?: any;
    isCorrect?: boolean;
    pointsEarned?: number;
    pointsPossible: number;
    gradedAt?: Date;
    gradedBy?: ObjectId;
    feedback?: string;
  }];

  timing: {
    startedAt: Date;
    lastActivityAt: Date;
    submittedAt?: Date;
    timeSpentSeconds: number;
    timeLimitSeconds?: number;
  };

  scoring: {
    rawScore?: number;
    percentageScore?: number;
    passed?: boolean;
    gradingComplete: boolean;
    requiresManualGrading: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

**Tests Required:**
- `tests/unit/models/AssessmentAttempt.model.test.ts`

---

## Phase 2: Services Layer
**Dependencies:** Phase 1 complete
**Parallelism:** Tasks 2.1-2.5 can run in parallel

### Task 2.1: Create Module Service
**Agent ID:** `agent-services-1`
**File:** `src/services/academic/modules.service.ts`

**Requirements:**
1. CRUD operations for modules
2. `listModules(courseId, filters)` - with publish status filter
3. `getModule(moduleId)` - with learning units populated
4. `createModule(courseId, data)` - validate prerequisites
5. `updateModule(moduleId, data)` - validate circular dependencies
6. `deleteModule(moduleId)` - handle cascading
7. `reorderModules(courseId, moduleIds)` - bulk reorder
8. `validatePrerequisites(moduleId, prerequisiteIds)` - prevent cycles

**Tests Required:**
- `tests/unit/services/modules.service.test.ts`

---

### Task 2.2: Create LearningUnit Service
**Agent ID:** `agent-services-2`
**File:** `src/services/academic/learning-units.service.ts`

**Requirements:**
1. CRUD operations for learning units
2. `listLearningUnits(moduleId, filters)` - with category filter
3. `getLearningUnit(learningUnitId)` - with content populated
4. `createLearningUnit(moduleId, data)` - validate content reference
5. `updateLearningUnit(learningUnitId, data)`
6. `deleteLearningUnit(learningUnitId)`
7. `reorderLearningUnits(moduleId, learningUnitIds)`
8. `moveLearningUnit(learningUnitId, targetModuleId)`

**Tests Required:**
- `tests/unit/services/learning-units.service.test.ts`

---

### Task 2.3: Create Assessment Service
**Agent ID:** `agent-services-3`
**File:** `src/services/content/assessments.service.ts`

**Requirements:**
1. CRUD operations for assessments
2. `listAssessments(departmentId, filters)` - with style filter
3. `getAssessment(assessmentId)` - include question count
4. `createAssessment(data)` - validate question banks exist
5. `updateAssessment(assessmentId, data)`
6. `publishAssessment(assessmentId)`
7. `archiveAssessment(assessmentId)`
8. `getQuestionsForAssessment(assessmentId)` - apply selection rules

**Tests Required:**
- `tests/unit/services/assessments.service.test.ts`

---

### Task 2.4: Create ModuleAccess Service
**Agent ID:** `agent-services-4`
**File:** `src/services/progress/module-access.service.ts`

**Requirements:**
1. `recordAccess(learnerId, moduleId, enrollmentId)` - upsert access record
2. `getAccessByEnrollment(enrollmentId)` - all module access for enrollment
3. `getAccessByModule(moduleId, filters)` - all learner access for module
4. `getAccessSummary(courseId)` - aggregate stats
5. `markLearningUnitStarted(moduleAccessId)`
6. `updateProgress(moduleAccessId, completed, total)`
7. `markCompleted(moduleAccessId)`

**Tests Required:**
- `tests/unit/services/module-access.service.test.ts`

---

### Task 2.5: Create AssessmentAttempt Service
**Agent ID:** `agent-services-5`
**File:** `src/services/progress/assessment-attempts.service.ts`

**Requirements:**
1. `startAttempt(assessmentId, learnerId, enrollmentId)` - select questions, create attempt
2. `getCurrentAttempt(assessmentId, learnerId)` - get in-progress attempt
3. `saveProgress(attemptId, responses)` - auto-save partial responses
4. `submitAttempt(attemptId)` - finalize and grade auto-gradeable
5. `getAttemptResults(attemptId)` - with feedback based on settings
6. `listAttempts(assessmentId, learnerId)` - attempt history
7. `gradeEssayQuestion(attemptId, questionIndex, score, feedback)` - manual grading

**Tests Required:**
- `tests/unit/services/assessment-attempts.service.test.ts`

---

### Task 2.6: Update Question Service - Add Bank Filtering
**Agent ID:** `agent-services-6`
**File:** `src/services/content/questions.service.ts`

**Requirements:**
1. Update `listQuestions` to support `bankId` filter
2. Add `getQuestionsByBankIds(bankIds, filters)` - for assessment selection
3. Update `createQuestion` to accept `questionBankIds`
4. Update `updateQuestion` to accept `questionBankIds`
5. Add `addToBank(questionId, bankId)`
6. Add `removeFromBank(questionId, bankId)`

**Tests Required:**
- `tests/unit/services/questions.service.test.ts` - bank filtering

---

## Phase 3: Controllers & Routes
**Dependencies:** Phase 2 complete
**Parallelism:** All tasks can run in parallel

### Task 3.1: Create Module Controller & Routes
**Agent ID:** `agent-controllers-1`
**Files:**
- `src/controllers/academic/modules.controller.ts`
- `src/routes/modules.routes.ts`

**Endpoints:**
```
GET    /api/v2/courses/:courseId/modules
POST   /api/v2/courses/:courseId/modules
GET    /api/v2/modules/:moduleId
PUT    /api/v2/modules/:moduleId
DELETE /api/v2/modules/:moduleId
POST   /api/v2/modules/:moduleId/reorder
POST   /api/v2/courses/:courseId/modules/reorder
```

**Tests Required:**
- `tests/integration/modules/modules-api.test.ts`

---

### Task 3.2: Create LearningUnit Controller & Routes
**Agent ID:** `agent-controllers-2`
**Files:**
- `src/controllers/academic/learning-units.controller.ts`
- `src/routes/learning-units.routes.ts`

**Endpoints:**
```
POST   /api/v2/modules/:moduleId/learning-units
GET    /api/v2/modules/:moduleId/learning-units
GET    /api/v2/learning-units/:learningUnitId
PUT    /api/v2/learning-units/:learningUnitId
DELETE /api/v2/learning-units/:learningUnitId
POST   /api/v2/modules/:moduleId/learning-units/reorder
```

**Tests Required:**
- `tests/integration/learning-units/learning-units-api.test.ts`

---

### Task 3.3: Create Assessment Controller & Routes
**Agent ID:** `agent-controllers-3`
**Files:**
- `src/controllers/content/assessments.controller.ts`
- `src/routes/assessments.routes.ts`

**Endpoints:**
```
GET    /api/v2/assessments
GET    /api/v2/assessments/:id
POST   /api/v2/assessments
PUT    /api/v2/assessments/:id
DELETE /api/v2/assessments/:id
POST   /api/v2/assessments/:id/publish
POST   /api/v2/assessments/:id/archive
```

**Tests Required:**
- `tests/integration/assessments/assessments-api.test.ts`

---

### Task 3.4: Create AssessmentAttempt Controller & Routes
**Agent ID:** `agent-controllers-4`
**Files:**
- `src/controllers/progress/assessment-attempts.controller.ts`
- `src/routes/assessment-attempts.routes.ts`

**Endpoints:**
```
POST   /api/v2/assessments/:id/attempts
GET    /api/v2/assessments/:id/attempts/current
PUT    /api/v2/assessments/:id/attempts/:attemptId
POST   /api/v2/assessments/:id/attempts/:attemptId/submit
GET    /api/v2/assessments/:id/attempts/:attemptId/results
GET    /api/v2/assessments/:id/attempts
POST   /api/v2/assessment-attempts/:attemptId/grade-question
```

**Tests Required:**
- `tests/integration/assessment-attempts/attempts-api.test.ts`

---

### Task 3.5: Create ModuleAccess Controller & Routes
**Agent ID:** `agent-controllers-5`
**Files:**
- `src/controllers/progress/module-access.controller.ts`
- `src/routes/module-access.routes.ts`

**Endpoints:**
```
POST   /api/v2/modules/:moduleId/access
GET    /api/v2/enrollments/:enrollmentId/module-access
GET    /api/v2/modules/:moduleId/access
GET    /api/v2/courses/:courseId/module-access-summary
```

**Query Filters:**
```
GET /api/v2/modules/:moduleId/access?hasStartedLearningUnit=false
GET /api/v2/modules/:moduleId/access?status=in_progress
```

**Tests Required:**
- `tests/integration/module-access/module-access-api.test.ts`

---

### Task 3.6: Update Question Controller - Add Bank Filter
**Agent ID:** `agent-controllers-6`
**File:** `src/controllers/content/questions.controller.ts`

**Updates:**
1. Add `bankId` query parameter to `listQuestions`
2. Update `createQuestion` to accept `questionBankIds`
3. Update `updateQuestion` to accept `questionBankIds`

**Tests Required:**
- `tests/integration/questions/questions-bank-filter.test.ts`

---

## Phase 4: Validators & Contracts
**Dependencies:** Phase 1 complete (can run parallel to Phase 2-3)
**Parallelism:** All tasks can run in parallel

### Task 4.1: Create Module Validators
**Agent ID:** `agent-validators-1`
**File:** `src/validators/module.validator.ts`

**Schemas:**
- `createModuleSchema`
- `updateModuleSchema`
- `reorderModulesSchema`

---

### Task 4.2: Create LearningUnit Validators
**Agent ID:** `agent-validators-2`
**File:** `src/validators/learning-unit.validator.ts`

**Schemas:**
- `createLearningUnitSchema`
- `updateLearningUnitSchema`
- `reorderLearningUnitsSchema`

---

### Task 4.3: Create Assessment Validators
**Agent ID:** `agent-validators-3`
**File:** `src/validators/assessment.validator.ts`

**Schemas:**
- `createAssessmentSchema`
- `updateAssessmentSchema`

---

### Task 4.4: Create AssessmentAttempt Validators
**Agent ID:** `agent-validators-4`
**File:** `src/validators/assessment-attempt.validator.ts`

**Schemas:**
- `saveProgressSchema`
- `gradeQuestionSchema`

---

### Task 4.5: Create API Contracts
**Agent ID:** `agent-validators-5`
**Files:**
- `contracts/api/modules.contract.ts`
- `contracts/api/learning-units.contract.ts`
- `contracts/api/assessments.contract.ts`
- `contracts/api/module-access.contract.ts`

---

## Phase 5: Migration & Seed Scripts
**Dependencies:** Phase 1 complete
**Parallelism:** Tasks 5.1-5.2 parallel, then 5.3

### Task 5.1: Create Default Module Migration
**Agent ID:** `agent-migration-1`
**File:** `src/migrations/create-default-modules.migration.ts`

**Requirements:**
1. For each existing course, create a default "Main Content" module
2. Move all existing CourseContent into the default module
3. Set default `presentationRules` with `learner_choice` mode
4. Make migration reversible

---

### Task 5.2: Create Question BankIds Migration
**Agent ID:** `agent-migration-2`
**File:** `src/migrations/add-question-bankids.migration.ts`

**Requirements:**
1. Add `questionBankIds: []` to all existing questions
2. Make migration reversible

---

### Task 5.3: Update ContentAttempt/ExamAttempt
**Agent ID:** `agent-migration-3`
**File:** `src/migrations/add-module-to-attempts.migration.ts`

**Requirements:**
1. Add `moduleId` and `learningUnitId` fields to ContentAttempt
2. Add `moduleId` and `learningUnitId` fields to ExamAttempt
3. Backfill existing attempts (derive from course structure)

---

## Phase 6: Integration Testing & E2E
**Dependencies:** Phases 1-5 complete
**Parallelism:** All tasks can run in parallel

### Task 6.1: Module System E2E Tests
**Agent ID:** `agent-test-1`
**File:** `tests/integration/learning-unit-system/module-e2e.test.ts`

**Test Scenarios:**
1. Create course → create modules → create learning units flow
2. Module prerequisites block progress
3. Completion criteria calculations work
4. Module reordering works

---

### Task 6.2: Assessment System E2E Tests
**Agent ID:** `agent-test-2`
**File:** `tests/integration/learning-unit-system/assessment-e2e.test.ts`

**Test Scenarios:**
1. Create assessment → start attempt → answer → submit → results flow
2. Question bank selection works
3. Time limits enforced
4. Attempt limits enforced
5. Auto-grading works
6. Manual grading flow works

---

### Task 6.3: ModuleAccess Analytics Tests
**Agent ID:** `agent-test-3`
**File:** `tests/integration/learning-unit-system/module-access-e2e.test.ts`

**Test Scenarios:**
1. Access tracking records correctly
2. Drop-off queries work
3. Progress updates correctly
4. Summary aggregation works

---

## Agent Assignment Summary

| Agent | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 |
|-------|---------|---------|---------|---------|---------|---------|
| agent-1 | 1.1 Module Model | 2.1 Module Svc | 3.1 Module Ctrl | 4.1 Module Val | 5.1 Default Module Mig | 6.1 Module E2E |
| agent-2 | 1.2 LearningUnit Model | 2.2 LearningUnit Svc | 3.2 LearningUnit Ctrl | 4.2 LearningUnit Val | 5.2 Question BankIds Mig | 6.2 Assessment E2E |
| agent-3 | 1.3 Assessment Model | 2.3 Assessment Svc | 3.3 Assessment Ctrl | 4.3 Assessment Val | 5.3 Attempt Fields Mig | 6.3 ModuleAccess E2E |
| agent-4 | 1.4 ModuleAccess Model | 2.4 ModuleAccess Svc | 3.4 Attempt Ctrl | 4.4 Attempt Val | - | - |
| agent-5 | 1.5 Question Update | 2.5 Attempt Svc | 3.5 ModuleAccess Ctrl | 4.5 Contracts | - | - |
| agent-6 | 1.6 AssessmentAttempt Model | 2.6 Question Svc Update | 3.6 Question Ctrl Update | - | - | - |

---

## Execution Order

```
Phase 1: Models (All parallel)
    ↓
Phase 2: Services (All parallel) ←→ Phase 4: Validators (Parallel)
    ↓
Phase 3: Controllers (All parallel)
    ↓
Phase 5: Migrations (5.1-5.2 parallel, then 5.3)
    ↓
Phase 6: E2E Tests (All parallel)
```

---

## Phase Gates

### Phase Gate 1: Models Complete
- [ ] All model schemas compile without errors
- [ ] Unit tests for new models pass
- [ ] Indexes created correctly

### Phase Gate 2: Services Complete
- [ ] All service methods implemented
- [ ] Unit tests pass with >80% coverage
- [ ] No circular dependencies

### Phase Gate 3: Controllers Complete
- [ ] All endpoints respond correctly
- [ ] Integration tests pass
- [ ] Error handling consistent

### Phase Gate 4: Validators Complete
- [ ] All request bodies validated
- [ ] Contracts match implementation
- [ ] Error messages clear

### Phase Gate 5: Migrations Complete
- [ ] Migrations run without errors
- [ ] Existing data preserved
- [ ] Rollback works

### Phase Gate 6: E2E Complete
- [ ] All E2E tests pass
- [ ] Performance acceptable
- [ ] Ready for UI integration

---

## Success Criteria

1. All UI team requested endpoints functional
2. >80% test coverage on new code
3. Migration preserves existing course data
4. No breaking changes to existing endpoints
5. Contracts exported for UI team

---

## Risk Mitigation

### Risk: Breaking existing CourseContent/CourseSegments
**Mitigation:** Create LearningUnit as alias, maintain backward compatible exports

### Risk: Complex migration for existing courses
**Mitigation:** Create default module per course, move content, test on staging

### Risk: Assessment performance with large question banks
**Mitigation:** Index questionBankIds, limit selection queries

### Risk: ModuleAccess storage growth
**Mitigation:** Consider TTL index for old records, archive strategy
