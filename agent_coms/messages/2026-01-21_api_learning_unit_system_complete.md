# API Team Response: Learning Unit System Implementation Complete

**Date:** 2026-01-21
**From:** API Team
**To:** UI Team
**Priority:** P0 Response
**Status:** IMPLEMENTED

---

## Summary

All requested features from the following messages have been implemented:

- `UI-2026-01-21-module-entity-request.md`
- `UI-2026-01-21-module-access-entity-request.md`
- `UI-2026-01-21-entity-modifications-request.md`
- `UI-2026-01-21-assessment-module-spec.md`
- `UI-2026-01-21-question-entity-modification.md`
- `UI-2026-01-21-learning-events-spec.md`

---

## Implemented Entities

### 1. Module Entity
**Location:** `src/models/content/Module.model.ts`

```typescript
interface IModule {
  courseId: ObjectId;
  title: string;
  description?: string;
  order: number;
  prerequisites: ObjectId[];  // Module IDs

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
  createdBy: ObjectId;
}
```

### 2. LearningUnit Entity
**Location:** `src/models/content/LearningUnit.model.ts`

```typescript
interface ILearningUnit {
  moduleId: ObjectId;
  courseId: ObjectId;
  title: string;
  description?: string;
  type: 'scorm' | 'custom' | 'exercise' | 'video' | 'document' | 'assessment';
  contentId?: ObjectId;
  order: number;
  category: 'exposition' | 'practice' | 'assessment';
  isRequired: boolean;
  isReplayable: boolean;
  weight: number;  // 0-100
  estimatedDuration: number;
  isPublished: boolean;
  createdBy: ObjectId;
}
```

### 3. Assessment Entity
**Location:** `src/models/content/Assessment.model.ts`

```typescript
interface IAssessment {
  departmentId: ObjectId;
  title: string;
  description?: string;
  style: 'quiz' | 'exam';

  questionSelection: {
    questionBankIds: string[];  // Bank IDs to pull from
    selectionMode: 'percentage' | 'fixed_count' | 'all';
    percentage?: number;
    fixedCount?: number;
    difficultyDistribution?: {
      easy?: number;
      medium?: number;
      hard?: number;
    };
    tagFilters?: string[];
  };

  settings: {
    timeLimit?: number;
    attemptLimit?: number;
    cooldownPeriod?: number;
    passingScore: number;
    showResults: 'immediately' | 'after_submission' | 'after_due_date' | 'never';
    showCorrectAnswers: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    allowBackNavigation: boolean;
    autoSubmitOnTimeout: boolean;
  };

  scoring: {
    method: 'points' | 'percentage' | 'pass_fail';
    totalPoints?: number;
    partialCredit: boolean;
  };

  status: 'draft' | 'published' | 'archived';
  isActive: boolean;
  createdBy: ObjectId;
}
```

### 4. AssessmentAttempt Entity
**Location:** `src/models/progress/AssessmentAttempt.model.ts`

```typescript
interface IAssessmentAttempt {
  assessmentId: ObjectId;
  learnerId: ObjectId;
  enrollmentId?: ObjectId;
  moduleId?: ObjectId;
  learningUnitId?: ObjectId;

  status: 'not_started' | 'in_progress' | 'submitted' | 'graded' | 'abandoned';
  attemptNumber: number;

  questions: Array<{
    questionId: ObjectId;
    questionText: string;
    questionType: string;
    options?: any[];
    order: number;
    points: number;
    response?: any;
    isCorrect?: boolean;
    pointsEarned?: number;
    gradedAt?: Date;
    feedback?: string;
  }>;

  timing: {
    startedAt?: Date;
    submittedAt?: Date;
    timeLimit?: number;
    timeSpent?: number;
    lastActivityAt?: Date;
  };

  scoring: {
    rawScore?: number;
    maxScore?: number;
    percentageScore?: number;
    passed?: boolean;
    gradedAt?: Date;
    gradedBy?: ObjectId;
  };

  metadata: {
    ipAddress?: string;
    userAgent?: string;
    autoSaveCount?: number;
    lastAutoSaveAt?: Date;
  };
}
```

### 5. ModuleAccess Entity
**Location:** `src/models/progress/ModuleAccess.model.ts`

```typescript
interface IModuleAccess {
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
}
```

### 6. Question Entity - questionBankIds Added
**Location:** `src/models/assessment/Question.model.ts`

```typescript
// Already implemented
questionBankIds: {
  type: [String],
  default: [],
  index: true
}
```

---

## Implemented API Endpoints

### Modules
```
GET    /api/v2/courses/:courseId/modules
POST   /api/v2/courses/:courseId/modules
GET    /api/v2/modules/:moduleId
PUT    /api/v2/modules/:moduleId
DELETE /api/v2/modules/:moduleId
POST   /api/v2/modules/:moduleId/reorder
POST   /api/v2/courses/:courseId/modules/reorder
POST   /api/v2/modules/:moduleId/publish
POST   /api/v2/modules/:moduleId/unpublish
```

### Learning Units
```
GET    /api/v2/modules/:moduleId/learning-units
POST   /api/v2/modules/:moduleId/learning-units
GET    /api/v2/learning-units/:learningUnitId
PUT    /api/v2/learning-units/:learningUnitId
DELETE /api/v2/learning-units/:learningUnitId
POST   /api/v2/modules/:moduleId/learning-units/reorder
```

### Assessments
```
GET    /api/v2/assessments
GET    /api/v2/assessments/:id
POST   /api/v2/assessments
PUT    /api/v2/assessments/:id
DELETE /api/v2/assessments/:id
POST   /api/v2/assessments/:id/publish
POST   /api/v2/assessments/:id/archive
```

### Assessment Attempts
```
POST   /api/v2/assessments/:assessmentId/attempts          # Start attempt
GET    /api/v2/assessments/:assessmentId/attempts/current  # Get current attempt
PUT    /api/v2/assessment-attempts/:attemptId              # Save progress
POST   /api/v2/assessment-attempts/:attemptId/submit       # Submit attempt
GET    /api/v2/assessment-attempts/:attemptId/results      # Get results
GET    /api/v2/assessments/:assessmentId/attempts          # List attempts
GET    /api/v2/learners/:learnerId/assessment-attempts     # Learner history
```

### Module Access
```
POST   /api/v2/modules/:moduleId/access                    # Record access
GET    /api/v2/enrollments/:enrollmentId/module-access     # Enrollment progress
GET    /api/v2/modules/:moduleId/access                    # Module analytics
GET    /api/v2/courses/:courseId/module-access-summary     # Course summary
```

### Questions (Updated)
```
GET    /api/v2/questions?bankId=xxx                        # Filter by bank
POST   /api/v2/questions                                   # Accepts questionBankIds
PUT    /api/v2/questions/:id                               # Accepts questionBankIds
```

---

## File Locations

### Models
- `src/models/content/Module.model.ts`
- `src/models/content/LearningUnit.model.ts`
- `src/models/content/Assessment.model.ts`
- `src/models/progress/AssessmentAttempt.model.ts`
- `src/models/progress/ModuleAccess.model.ts`

### Services
- `src/services/content/modules.service.ts`
- `src/services/content/learning-units.service.ts`
- `src/services/content/assessments.service.ts`
- `src/services/progress/assessment-attempts.service.ts`
- `src/services/progress/module-access.service.ts`

### Controllers
- `src/controllers/content/modules.controller.ts`
- `src/controllers/content/learning-units.controller.ts`
- `src/controllers/content/assessments.controller.ts`
- `src/controllers/progress/assessment-attempts.controller.ts`
- `src/controllers/progress/module-access.controller.ts`

### Validators
- `src/validators/module.validator.ts`
- `src/validators/learning-unit.validator.ts`
- `src/validators/assessment.validator.ts`
- `src/validators/assessment-attempt.validator.ts`

### Migrations
- `src/migrations/migrate-module-structure.ts`
- `src/migrations/migrate-learning-units.ts`

### Tests
- `tests/integration/modules/modules.test.ts`
- `tests/integration/learning-units/learning-units.test.ts`
- `tests/integration/assessment-attempts/assessment-attempts.test.ts`

### Seed Scripts (Updated)
- `scripts/seeds/seed-sample-modules.ts` - Creates sample modules, learning units, and assessments
- `scripts/seeds/run-seeds.ts` - Updated to include modules seed
- `scripts/seed-mock-data.ts` - Updated to set `questionBankIds` on questions

---

## Answers to Questions

### From assessment-module-spec.md:

**Q2: Assessment -> Module relationship?**
A: Both approaches are supported:
- Assessment has optional `moduleId` and `learningUnitId` fields in AssessmentAttempt
- LearningUnit has `contentId` that can point to an Assessment when `type: 'assessment'`

**Q3: Essay question grading?**
A: Manual grading via:
- `PUT /api/v2/assessment-attempts/:attemptId` with `questions[].pointsEarned` and `questions[].feedback`
- Separate instructor review endpoint can be added if needed

### From question-entity-modification.md:

**Q1: GET /question-banks endpoint?**
A: Currently questions are filtered by bankId. A dedicated endpoint to list unique bank IDs can be added if needed.

**Q2: Bank ID validation?**
A: Currently free-form strings. Can add validation if a QuestionBank collection is created.

**Q3: Future QuestionBank collection?**
A: The current design supports this future enhancement. The existing `QuestionBank.model.ts` can be extended.

---

## Contracts

Contract files will be generated at:
- `contracts/api/modules.contract.ts`
- `contracts/api/learning-units.contract.ts`
- `contracts/api/assessments.contract.ts`
- `contracts/api/assessment-attempts.contract.ts`
- `contracts/api/module-access.contract.ts`

---

## Next Steps

1. Run migrations on staging: `npm run migrate:module-structure`
2. Seed sample data: `npm run seed:all`
3. Integration testing with UI

Please let us know if any adjustments are needed!

---

*This message was generated by the API development team*
