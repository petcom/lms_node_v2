# Unified Content & Learning Hierarchy Specification

## Version: 1.2.0
## Status: Draft
## Created: 2026-01-21
## Updated: 2026-01-21
## Author: UI Team

---

## Terminology Note

| Term | Definition |
|------|------------|
| **Module** | A logical grouping of learning units within a course (formerly "Chapter") |
| **LearningUnit** | A single piece of content/activity within a module (formerly "Module") |

---

## 1. Overview

### 1.1 Purpose

This specification consolidates the Assessment Module, Enhanced Exercise Delivery, and Learning Events specifications into a unified architecture with two distinct hierarchies:

1. **Content Hierarchy**: Course → Module → LearningUnit → Content Data
2. **Activity Hierarchy**: Course → ModuleProgress (computed) → Attempts

### 1.2 Key Principle

**Content Hierarchy** = What is built (the blueprint)
**Activity Hierarchy** = What happened (the learner's journey)

### 1.3 Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Group naming | **Module** | Logical grouping of learning units |
| Content unit naming | **LearningUnit** | Individual content/activity items |
| Sequencing | **Prerequisites** | Use existing `prerequisites` field for dependency-based ordering |
| Assessment vs Exercise | **Separate types** | Assessment pulls from question bank; Exercise is embedded practice |
| Activity tracking | **ModuleAccess + Enhanced Attempts** | Track module opens + learning unit attempts |
| Event granularity | **Start/Complete only** | Don't track individual question events |
| System events | **Separate** | Login, enrollment events stay in existing LearningEvent entity |
| Question selection | **Runtime** | Questions randomly selected from pool at attempt start |

---

## 2. Content Hierarchy

### 2.1 Visual Structure

```
Course
└── Module (e.g., "Unit 1: Introduction")
    ├── prerequisites: [] (determines ordering)
    ├── LearningUnit: Exposition Video (category: exposition)
    │   └── contentId → Video content
    ├── LearningUnit: Reading Material (category: exposition)
    │   └── contentId → Document content
    ├── LearningUnit: Practice Flashcards (category: practice)
    │   └── contentId → Exercise (type: flashcard)
    ├── LearningUnit: Knowledge Check (category: assessment)
    │   └── contentId → Assessment (style: quiz)
    │       └── questionBankIds[] + selection rules
    └── LearningUnit: Unit Exam (category: assessment)
        └── contentId → Assessment (style: exam)
            └── questionBankIds[] + selection rules
```

### 2.2 Module Entity (NEW - formerly "Chapter")

```typescript
/**
 * Module - A logical grouping of learning units within a course
 * Replaces flat learning unit list with structured units
 */
interface Module {
  id: string;
  courseId: string;

  // Identification
  title: string;                    // e.g., "Unit 1: Workplace Safety"
  description?: string;

  // Sequencing via dependencies
  prerequisites: string[];          // Module IDs that must complete first
                                    // Empty array = can start immediately
                                    // Used for both strict order and flexible paths

  // Completion Requirements
  completionCriteria: ModuleCompletionCriteria;

  // Gate LearningUnit (optional) - must pass to complete module
  gateLearningUnitId?: string;

  // Presentation Rules
  presentationRules: ModulePresentationRules;

  // Availability
  isPublished: boolean;
  availableFrom?: string;           // ISO date
  availableUntil?: string;          // ISO date

  // Metadata
  estimatedDuration: number;        // Minutes
  objectives?: string[];            // Learning objectives

  createdAt: string;
  updatedAt: string;
  createdBy: UserRef;
}

interface ModuleCompletionCriteria {
  type: 'all_required' | 'percentage' | 'gate_learning_unit' | 'points';

  // For 'percentage': complete X% of learning units
  percentageRequired?: number;

  // For 'points': earn X points from weighted learning units
  pointsRequired?: number;

  // For 'gate_learning_unit': pass the designated gate learning unit
  gateLearningUnitScore?: number;

  // Additional
  requireAllExpositions?: boolean;  // Must view all exposition content
}
```

### 2.3 LearningUnit Entity (Enhanced - formerly "CourseModule")

```typescript
/**
 * Learning Unit Types
 * NOTE: 'assessment' removed from ExerciseType - it's a separate learning unit type
 */
type LearningUnitType =
  | 'scorm'       // SCORM package
  | 'custom'      // Custom HTML/embedded content
  | 'video'       // Video content
  | 'document'    // PDF, document viewer
  | 'exercise'    // Practice activity (flashcard, matching, finish-the-story)
  | 'assessment'; // Quiz or Exam (pulls from question bank(s) at runtime)

/**
 * Learning Unit Content Category
 * Determines how the learning unit functions in the learning flow
 */
type LearningUnitCategory =
  | 'exposition'  // Content delivery (teach)
  | 'practice'    // Reinforcement (practice)
  | 'assessment'; // Evaluation (test)

/**
 * Learning Unit (formerly CourseModule)
 */
interface LearningUnit {
  id: string;
  courseId: string;
  moduleId: string;                 // Link to parent module

  // Identification
  title: string;
  description: string | null;

  // Classification
  type: LearningUnitType;
  category: LearningUnitCategory;

  // Sequencing within module
  prerequisites: string[];          // LearningUnit IDs within same module
                                    // Empty = available when module unlocked

  // Content Reference
  contentId: string | null;         // Reference to content/exercise/assessment
  content?: LearningUnitContent;    // Populated content details

  // Settings
  settings: LearningUnitSettings;
  isPublished: boolean;
  isRequired: boolean;              // Required for module completion
  isReplayable: boolean;            // Can be repeated after completion

  // Weighting
  weight: number;                   // Contribution to module completion (0-100)
  passingScore: number | null;

  // Timing
  duration: number | null;          // Estimated minutes
  timeLimit: number | null;         // Max time allowed (for assessments)

  // Statistics (computed)
  completionCount: number;
  averageScore: number | null;

  createdAt: string;
  updatedAt: string;
  createdBy: UserRef;
}

interface LearningUnitSettings {
  allowMultipleAttempts: boolean;
  maxAttempts: number | null;
  timeLimit: number | null;
  showFeedback: boolean;
  shuffleQuestions: boolean;
}
```

### 2.4 Exercise Types (Practice)

```typescript
/**
 * Exercise Type - for practice learning units only
 * NOTE: 'assessment' REMOVED - use Assessment entity instead
 */
type ExerciseType =
  | 'practice'           // General practice (existing)
  | 'flashcard'          // Card-based memorization
  | 'matching'           // Drag-and-drop matching
  | 'finish_the_story';  // Prose completion with AI scoring

/**
 * Exercise Entity - for embedded practice content
 * Questions are embedded directly, not pulled from pool
 */
interface Exercise {
  id: string;
  title: string;
  description?: string;
  type: ExerciseType;
  department: DepartmentRef;

  // Type-specific configuration
  flashcardConfig?: FlashcardConfig;
  matchingConfig?: MatchingConfig;
  finishTheStoryConfig?: FinishTheStoryConfig;

  // Embedded questions (not from pool)
  questions?: EmbeddedQuestion[];

  // Settings
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number | null;
  passingScore: number;
  shuffleQuestions: boolean;
  showFeedback: boolean;
  allowReview: boolean;

  status: 'draft' | 'published' | 'archived';
  createdBy: UserRef;
  createdAt: string;
  updatedAt: string;
}
```

### 2.5 Assessment Entity (Quiz/Exam)

```typescript
/**
 * Assessment Style
 */
type AssessmentStyle = 'quiz' | 'exam';

/**
 * Assessment Entity - pulls questions from pool at runtime
 * Distinct from Exercise which has embedded questions
 */
interface Assessment {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  style: AssessmentStyle;
  department: DepartmentRef;

  // Question Bank Selection (evaluated at attempt start)
  questionBankIds?: string[];       // Specific banks to pull from (multi-select), or empty for department-wide
  questionSelectionMode: 'percentage' | 'fixed_count' | 'all';
  questionPercentage?: number;      // For percentage mode (e.g., 40 = 40%)
  questionCount?: number;           // For fixed_count mode
  questionTags?: string[];          // Filter by tags
  questionDifficulty?: ('easy' | 'medium' | 'hard')[];

  // Behavior
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  timeLimit: number | null;         // Seconds
  maxAttempts: number;              // 0 = unlimited
  cooldownPeriod: number | null;    // Seconds between attempts

  // Scoring
  passingScore: number;             // Percentage (0-100)
  partialCredit: boolean;
  negativeScoring: boolean;

  // Feedback Configuration
  showScore: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  feedbackTiming: 'immediate' | 'after_submission' | 'after_all_attempts' | 'never';

  // Computed (from pool + rules)
  estimatedQuestionCount: number;
  estimatedDuration: number;
  totalPoints: number;

  status: 'draft' | 'published' | 'archived';
  createdBy: UserRef;
  createdAt: string;
  updatedAt: string;
}

/**
 * Style Presets - default configurations by style
 */
const ASSESSMENT_STYLE_PRESETS: Record<AssessmentStyle, Partial<Assessment>> = {
  quiz: {
    questionSelectionMode: 'percentage',
    questionPercentage: 40,           // 30-50% of pool
    shuffleQuestions: true,
    shuffleAnswers: true,
    timeLimit: null,                  // No time limit
    maxAttempts: 0,                   // Unlimited
    cooldownPeriod: null,
    passingScore: 70,
    showScore: true,
    showCorrectAnswers: true,
    showExplanations: true,
    feedbackTiming: 'immediate',
    partialCredit: true,
    negativeScoring: false,
  },
  exam: {
    questionSelectionMode: 'percentage',
    questionPercentage: 90,           // 80-100% of pool
    shuffleQuestions: true,
    shuffleAnswers: true,
    timeLimit: 3600,                  // 1 hour default
    maxAttempts: 2,                   // Limited retries
    cooldownPeriod: 86400,            // 24 hours between attempts
    passingScore: 70,
    showScore: true,
    showCorrectAnswers: false,        // Don't reveal answers
    showExplanations: false,
    feedbackTiming: 'after_all_attempts',
    partialCredit: false,
    negativeScoring: false,
  },
};
```

### 2.6 Prerequisites & Ordering

The system uses `prerequisites` for dependency-based ordering at both Module and LearningUnit levels:

```typescript
// Example: Modules with dependencies
{
  modules: [
    { id: 'mod-1', title: 'Introduction', prerequisites: [] },           // First
    { id: 'mod-2', title: 'Core Concepts', prerequisites: ['mod-1'] },   // After mod-1
    { id: 'mod-3', title: 'Advanced Topics', prerequisites: ['mod-2'] }, // After mod-2
    { id: 'mod-4', title: 'Supplementary', prerequisites: ['mod-1'] },   // After mod-1 (parallel to mod-2)
  ]
}

// Example: LearningUnits within a module with flexible ordering
{
  learningUnits: [
    { id: 'lu-1', title: 'Intro Video', prerequisites: [], category: 'exposition' },
    { id: 'lu-2', title: 'Flashcards', prerequisites: ['lu-1'], category: 'practice' },
    { id: 'lu-3', title: 'Matching', prerequisites: ['lu-1'], category: 'practice' },
    { id: 'lu-4', title: 'Quiz', prerequisites: ['lu-1'], category: 'practice' },
    { id: 'lu-5', title: 'Exam', prerequisites: ['lu-2', 'lu-3', 'lu-4'], category: 'assessment' },
  ]
}
// Result: lu-1 first, then lu-2/lu-3/lu-4 in any order (can be randomized), then lu-5
```

### 2.7 Presentation Rules Engine

When multiple learning units share the same prerequisites (e.g., lu-2, lu-3, lu-4 all require only lu-1), the **Presentation Rules Engine** determines how they are presented to the learner.

```typescript
/**
 * Presentation Mode - how eligible learning units are ordered
 */
type PresentationMode =
  | 'prescribed'      // Instructor sets fixed order
  | 'learner_choice'  // Learner picks from available learning units
  | 'random';         // System randomizes order

/**
 * Repetition Mode - how learning units repeat for mastery
 */
type RepetitionMode =
  | 'none'            // No repetition, one pass through
  | 'until_passed'    // Repeat failed learning units until passed
  | 'until_mastery'   // Repeat until mastery threshold reached
  | 'spaced';         // Spaced repetition algorithm (for flashcards)

/**
 * Module Presentation Rules
 * Configurable per module by instructors/staff
 */
interface ModulePresentationRules {
  // LearningUnit ordering
  presentationMode: PresentationMode;
  prescribedOrder?: string[];         // LearningUnit IDs in order (for 'prescribed' mode)

  // Repetition for mastery
  repetitionMode: RepetitionMode;
  masteryThreshold?: number;          // Score required for mastery (0-100)
  maxRepetitions?: number;            // Max times a learning unit can repeat (null = unlimited)
  cooldownBetweenRepetitions?: number; // Seconds before retry allowed

  // What triggers repetition
  repeatOn: {
    failedAttempt: boolean;           // Repeat if didn't pass
    belowMastery: boolean;            // Repeat if below mastery threshold
    learnerRequest: boolean;          // Allow learner to voluntarily repeat
  };

  // Which learning units can repeat
  repeatableCategories: LearningUnitCategory[]; // e.g., ['practice'] - expositions usually don't repeat

  // UI behavior
  showAllAvailable: boolean;          // Show all eligible learning units or just next one
  allowSkip: boolean;                 // Can learner skip optional learning units
}

/**
 * Default presentation rules by module type
 */
const DEFAULT_PRESENTATION_RULES: ModulePresentationRules = {
  presentationMode: 'learner_choice', // Default: learner picks
  repetitionMode: 'until_passed',
  masteryThreshold: 70,
  maxRepetitions: null,               // Unlimited
  cooldownBetweenRepetitions: 0,      // Immediate retry
  repeatOn: {
    failedAttempt: true,
    belowMastery: false,
    learnerRequest: true,
  },
  repeatableCategories: ['practice', 'assessment'],
  showAllAvailable: true,
  allowSkip: false,                   // Must complete required learning units
};
```

#### Presentation Flow Examples

**Example 1: Prescribed Order (Instructor Override)**
```typescript
{
  presentationMode: 'prescribed',
  prescribedOrder: ['lu-2', 'lu-4', 'lu-3'], // Flashcards, then Quiz, then Matching
}
// Learner MUST do lu-2, then lu-4, then lu-3 in that exact order
```

**Example 2: Learner Choice (Default)**
```typescript
{
  presentationMode: 'learner_choice',
  showAllAvailable: true,
}
// After completing lu-1, learner sees: "Choose your next activity:"
// - Flashcards
// - Matching
// - Quiz
```

**Example 3: Random Presentation**
```typescript
{
  presentationMode: 'random',
  showAllAvailable: false,            // Show one at a time
}
// After completing lu-1, system randomly picks next learning unit
// Learner sees: "Next: Matching" (no choice)
```

**Example 4: Mastery-Based Repetition**
```typescript
{
  repetitionMode: 'until_mastery',
  masteryThreshold: 85,
  repeatOn: {
    failedAttempt: true,
    belowMastery: true,               // Even if passed, repeat if < 85%
    learnerRequest: true,
  },
  repeatableCategories: ['practice', 'assessment'],
}
// Learner scores 72% on Quiz (passed but below 85%)
// System: "Good job! You passed. Practice more to reach mastery (85%)?"
// [Continue] [Practice Again]
```

#### UI Flow for Presentation Mode Selection

When staff/instructor creates a module:

```
┌─────────────────────────────────────────────────────────────┐
│  Learning Unit Presentation Settings                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  How should learning units be presented?                    │
│                                                             │
│  ○ Prescribed Order                                         │
│    You set the exact order learners must follow             │
│    [Drag to reorder learning units...]                      │
│                                                             │
│  ○ Learner's Choice (Recommended)                           │
│    Learners choose from available learning units            │
│                                                             │
│  ○ Random                                                   │
│    System randomizes order for each learner                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Repetition Settings                                        │
│                                                             │
│  □ Allow repetition until mastery                           │
│    Mastery threshold: [85]%                                 │
│                                                             │
│  □ Limit repetitions to [3] attempts                        │
│                                                             │
│  Which learning units can repeat?                           │
│  ☑ Practice activities                                      │
│  ☑ Assessments (quizzes/exams)                              │
│  □ Exposition content                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Activity Hierarchy

### 3.1 Strategy: ModuleAccess + Enhanced Attempts

Track learner activity at two levels:
1. **ModuleAccess**: When learner opens/views a module (for drop-off tracking)
2. **Enhanced Attempts**: LearningUnit-level activity with module reference

```
Course Enrollment
├── ModuleAccess (NEW: tracks when learner opens module)
│   └── Enables: "opened but never started" intervention
├── ContentAttempt (SCORM, video, document)
│   └── NEW: moduleId, learningUnitId fields
├── ExamAttempt (quiz, exam)
│   └── NEW: moduleId, learningUnitId fields
└── Existing LearningEvent (system events: login, enrollment, etc.)
    └── Unchanged - stays separate
```

### 3.2 ModuleAccess Entity (NEW - formerly "ChapterAccess")

Tracks when learners access modules, enabling instructor intervention for drop-off.

```typescript
/**
 * Module Access - tracks when learner opens a module
 * Separate from learning unit attempts to identify drop-off
 */
interface ModuleAccess {
  id: string;

  // References
  learnerId: string;
  enrollmentId: string;
  courseId: string;
  moduleId: string;

  // Access tracking
  firstAccessedAt: string;          // When learner first opened module
  lastAccessedAt: string;           // Most recent access
  accessCount: number;              // How many times opened

  // Progress summary (denormalized for queries)
  hasStartedLearningUnit: boolean;  // Has any learning unit attempt?
  firstLearningUnitStartedAt?: string; // When first learning unit was started
  learningUnitsCompleted: number;
  learningUnitsTotal: number;

  // Status
  status: 'accessed' | 'in_progress' | 'completed';

  createdAt: string;
  updatedAt: string;
}
```

**Use Cases:**
- Instructor dashboard: "Learners who opened Module 1 but never started"
- At-risk detection: "Accessed 3+ days ago, no learning unit attempts"
- Engagement tracking: "Module access frequency"

### 3.3 Enhanced ContentAttempt

```typescript
/**
 * Enhanced Content Attempt
 * Tracks SCORM, video, document viewing attempts
 */
interface ContentAttempt {
  id: string;
  contentId: string;
  content?: ContentReference;
  learnerId: string;
  learner?: LearnerReference;
  enrollmentId: string | null;
  enrollment?: EnrollmentReference | null;

  // NEW: Module tracking
  moduleId: string;                 // Link to module for aggregation
  learningUnitId: string;           // Link to learning unit

  attemptNumber: number;
  status: AttemptStatus;
  progressPercent: number | null;
  score: number | null;
  // ... existing fields ...

  // Timestamps for start/complete events
  startedAt: string | null;
  completedAt: string | null;
  lastAccessedAt: string | null;

  createdAt: string;
  updatedAt: string;
}
```

### 3.4 Enhanced ExamAttempt

```typescript
/**
 * Enhanced Exam Attempt
 * Tracks quiz/exam attempts
 */
interface ExamAttempt {
  id: string;
  examId: string;                   // Assessment ID
  examTitle: string;
  examType: 'quiz' | 'exam';        // Assessment style
  learnerId: string;
  learnerName?: string;

  // NEW: Module tracking
  moduleId: string;                 // Link to module for aggregation
  learningUnitId: string;           // Link to learning unit

  attemptNumber: number;
  status: AttemptStatus;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  // ... existing fields ...

  // Questions selected for THIS attempt (from pool at start)
  questions: ExamQuestion[];

  // Timestamps
  startedAt: string;
  submittedAt?: string | null;
  gradedAt?: string | null;

  createdAt: string;
  updatedAt: string;
}
```

### 3.5 ModuleProgress (Computed - formerly "ChapterProgress")

Module-level progress is **computed** from attempt data, not stored separately:

```typescript
/**
 * Module Progress - computed from attempts
 * Not a separate entity - aggregated at query time
 */
interface ModuleProgress {
  moduleId: string;
  moduleTitle: string;
  learnerId: string;
  enrollmentId: string;

  // Computed from attempts
  status: 'not_started' | 'in_progress' | 'completed';
  progressPercentage: number;       // Based on completed learning units

  // LearningUnit tracking
  learningUnitsCompleted: number;
  learningUnitsTotal: number;
  requiredLearningUnitsCompleted: number;
  requiredLearningUnitsTotal: number;

  // Scoring (from assessment learning units)
  averageScore: number | null;
  gateLearningUnitPassed: boolean | null;

  // Time (sum of attempts)
  totalTimeSpent: number;           // Seconds

  // Derived from first/last attempts
  firstAccessedAt: string | null;
  lastAccessedAt: string | null;
  completedAt: string | null;
}

/**
 * Query to compute ModuleProgress
 */
function computeModuleProgress(
  moduleId: string,
  learnerId: string,
  enrollmentId: string
): ModuleProgress {
  // 1. Get all learning units in module
  const learningUnits = getLearningUnitsForModule(moduleId);

  // 2. Get all attempts for these learning units
  const contentAttempts = getContentAttempts({ moduleId, learnerId });
  const examAttempts = getExamAttempts({ moduleId, learnerId });

  // 3. Compute metrics
  const completedLearningUnits = learningUnits.filter(lu =>
    hasPassingAttempt(lu.id, contentAttempts, examAttempts)
  );

  return {
    moduleId,
    moduleTitle: getModule(moduleId).title,
    learnerId,
    enrollmentId,
    status: computeStatus(learningUnits, completedLearningUnits),
    progressPercentage: (completedLearningUnits.length / learningUnits.length) * 100,
    learningUnitsCompleted: completedLearningUnits.length,
    learningUnitsTotal: learningUnits.length,
    // ... etc
  };
}
```

### 3.6 Example: Quiz Retake Tracking

When a learner takes a quiz, fails, and retakes:

```typescript
// First attempt - stored in ExamAttempt table
{
  id: 'att-001',
  examId: 'quiz-1',
  moduleId: 'mod-1',
  learningUnitId: 'lu-quiz-1',
  learnerId: 'learner-1',
  attemptNumber: 1,
  status: 'graded',
  score: 33,
  maxScore: 100,
  percentage: 33,
  passed: false,
  startedAt: '2026-01-21T10:00:00Z',
  submittedAt: '2026-01-21T10:15:00Z',
  gradedAt: '2026-01-21T10:15:00Z',
}

// Second attempt (retake) - separate record
{
  id: 'att-002',
  examId: 'quiz-1',
  moduleId: 'mod-1',
  learningUnitId: 'lu-quiz-1',
  learnerId: 'learner-1',
  attemptNumber: 2,
  status: 'graded',
  score: 100,
  maxScore: 100,
  percentage: 100,
  passed: true,
  startedAt: '2026-01-21T11:00:00Z',
  submittedAt: '2026-01-21T11:10:00Z',
  gradedAt: '2026-01-21T11:10:00Z',
}
```

Both attempts appear when querying `ExamAttempts WHERE learningUnitId = 'lu-quiz-1'`.

---

## 4. Migration Plan

### 4.1 Phase 1: Schema Updates

**Database changes:**
1. Create `Module` collection/table (formerly Chapter)
2. Rename `CourseModule` to `LearningUnit`
3. Add `moduleId` to `LearningUnit` (formerly chapterId)
4. Add `moduleId`, `learningUnitId` to `ContentAttempt`
5. Add `moduleId`, `learningUnitId` to `ExamAttempt`
6. Create `Assessment` collection (separate from `Exercise`)
7. Create `ModuleAccess` collection

**Migration script:**
1. Create default module for each existing course
2. Move all learning units into default module
3. Backfill `moduleId` on existing attempts

### 4.2 Phase 2: Type Updates (UI)

```typescript
// Rename CourseModule to LearningUnit
// BEFORE:
type CourseModuleType = 'scorm' | 'custom' | 'exercise' | 'video' | 'document';

// AFTER:
type LearningUnitType = 'scorm' | 'custom' | 'exercise' | 'video' | 'document' | 'assessment';

// Remove from ExerciseType
// BEFORE:
type ExerciseType = 'quiz' | 'exam' | 'practice' | 'assessment';

// AFTER:
type ExerciseType = 'practice' | 'flashcard' | 'matching' | 'finish_the_story';
```

### 4.3 Phase 3: Entity Implementation

| Order | Entity | Description |
|-------|--------|-------------|
| 1 | Module | New entity (formerly Chapter), CRUD, UI |
| 2 | LearningUnit | Renamed from CourseModule, add moduleId, category, weight fields |
| 3 | Assessment | New entity (separate from Exercise) |
| 4 | ModuleAccess | New entity for tracking module opens |
| 5 | ContentAttempt | Add moduleId, learningUnitId fields |
| 6 | ExamAttempt | Add moduleId, learningUnitId fields |
| 7 | Exercise | Update types, remove 'assessment', 'quiz', 'exam' |

### 4.4 Phase 4: UI Updates

| Order | Component | Changes |
|-------|-----------|---------|
| 1 | CourseBuilder | Add module management |
| 2 | LearningUnitForm | Add module selection, category selection |
| 3 | AssessmentBuilder | New component for quiz/exam creation |
| 4 | ProgressView | Group by module |
| 5 | CoursePlayer | Navigate by module |

---

## 5. API Endpoints

### 5.1 Module Endpoints (formerly Chapter)

```
GET    /api/v2/courses/:courseId/modules
POST   /api/v2/courses/:courseId/modules
GET    /api/v2/modules/:moduleId
PUT    /api/v2/modules/:moduleId
DELETE /api/v2/modules/:moduleId
POST   /api/v2/modules/:moduleId/reorder
```

### 5.2 LearningUnit Endpoints (formerly Module)

```
GET    /api/v2/modules/:moduleId/learning-units
POST   /api/v2/modules/:moduleId/learning-units
PUT    /api/v2/learning-units/:learningUnitId
DELETE /api/v2/learning-units/:learningUnitId
```

### 5.3 Assessment Endpoints

```
GET    /api/v2/assessments
POST   /api/v2/assessments
GET    /api/v2/assessments/:assessmentId
PUT    /api/v2/assessments/:assessmentId
DELETE /api/v2/assessments/:assessmentId
POST   /api/v2/assessments/:assessmentId/publish
```

### 5.4 ModuleAccess Endpoints

```
POST   /api/v2/modules/:moduleId/access
GET    /api/v2/enrollments/:enrollmentId/module-access
GET    /api/v2/modules/:moduleId/access
GET    /api/v2/courses/:courseId/module-access-summary
```

### 5.5 Progress Endpoints (Enhanced)

```
GET    /api/v2/enrollments/:enrollmentId/progress
        # Returns CourseProgress with modules grouped

GET    /api/v2/enrollments/:enrollmentId/modules/:moduleId/progress
        # Returns computed ModuleProgress

GET    /api/v2/learning-units/:learningUnitId/attempts
        # Returns all attempts for a learning unit (for learner or admin)
```

---

## 6. Open Questions

### 6.1 Resolved

| Question | Decision |
|----------|----------|
| Group naming | **Module** (formerly Chapter) |
| Content unit naming | **LearningUnit** (formerly Module) |
| Ordering approach | **Prerequisites** (dependency-based) |
| Assessment vs Exercise | **Separate entities** |
| Activity tracking | **ModuleAccess + Enhanced Attempts** |
| Event granularity | **Start/Complete only** |
| System events | **Stay separate** in existing LearningEvent |
| Question selection | **Runtime** from bank(s) - see Question Bank Architecture below |
| Presentation ordering | **Rules Engine** - configurable per module (prescribed/learner_choice/random) |
| Repetition | **Rules Engine** - configurable mastery thresholds and repeat until learned |
| Module timestamps | **ModuleAccess entity** - Track when learner opens module separately from learning unit starts |

### 6.2 Pending

1. **API messages folder**: Need to check API codebase for Assessment contract work (may already be in progress).

### 6.3 Question Bank Architecture

Questions and Question Banks have a **many-to-many relationship**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  QUESTION BANK ARCHITECTURE                                                 │
│                                                                             │
│  Question Entity (existing, modified):                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Question {                                                           │   │
│  │   id: string;                                                        │   │
│  │   questionText: string;                                              │   │
│  │   questionType: QuestionType;                                        │   │
│  │   // ... other fields ...                                            │   │
│  │   questionBankIds: string[];  // <-- NEW: array of bank IDs          │   │
│  │ }                                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Relationships supported:                                                   │
│                                                                             │
│  1. One Question → Multiple Banks (via questionBankIds array)               │
│     Question A: questionBankIds: ["bank-1", "bank-2", "bank-3"]             │
│                                                                             │
│  2. One Bank → Multiple Questions (many questions reference same bank)      │
│     Question A: questionBankIds: ["bank-1"]                                 │
│     Question B: questionBankIds: ["bank-1"]                                 │
│     Question C: questionBankIds: ["bank-1"]                                 │
│                                                                             │
│  3. One Bank → Multiple Assessments (many assessments reference same bank)  │
│     Assessment X: questionBankIds: ["bank-1"]                               │
│     Assessment Y: questionBankIds: ["bank-1"]                               │
│                                                                             │
│  4. One Assessment → Multiple Banks (via questionBankIds array)             │
│     Assessment Z: questionBankIds: ["bank-1", "bank-2"]                     │
│     → pulls questions from BOTH banks                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Design Points:**
- No separate QuestionBank entity needed - bank IDs are lightweight identifiers
- Questions with `questionBankIds: []` (empty) are in the department-wide pool
- UI will provide a QuestionBankPicker component for multi-select
- Query: `GET /questions?bankId=xxx` returns questions where `questionBankIds` contains `xxx`

---

## 7. Implementation Checklist

### Phase 1: Foundation (Backend coordination required)
- [ ] Coordinate with API team on Module entity (with presentationRules)
- [ ] Coordinate on Assessment entity (check messages folder in API repo)
- [ ] Coordinate on ModuleAccess entity
- [ ] Coordinate on ContentAttempt/ExamAttempt field additions (moduleId, learningUnitId)
- [ ] Coordinate on Presentation Rules Engine backend support
- [ ] Coordinate on LearningUnit rename (from CourseModule)

### Phase 2: UI Types
- [ ] Create `Module` types (including ModulePresentationRules)
- [ ] Create `LearningUnit` types (rename from CourseModule)
- [ ] Create `ModuleAccess` types
- [ ] Create `PresentationMode`, `RepetitionMode` types
- [ ] Create `Assessment` types (separate from Exercise)
- [ ] Update `ExerciseType` (remove 'quiz', 'exam', 'assessment')
- [ ] Update `ContentAttempt` types (add moduleId, learningUnitId)
- [ ] Update `ExamAttempt` types (add moduleId, learningUnitId)

### Phase 3: UI Components - Module Management
- [ ] ModuleCard component
- [ ] ModuleList component
- [ ] ModuleForm component (including presentation rules UI)
- [ ] PresentationRulesForm component (mode selection, repetition settings)
- [ ] CourseBuilder with module management

### Phase 4: UI Components - Assessment & LearningUnit
- [ ] AssessmentBuilder component
- [ ] AssessmentForm component (question bank multi-selection, style presets)
- [ ] LearningUnitForm updates (module selection, category)
- [ ] QuestionBankPicker component (multi-select)

### Phase 5: Progress & Player
- [ ] ModuleProgress computed view
- [ ] CourseProgress grouped by module
- [ ] CoursePlayer module navigation
- [ ] Presentation engine (respects rules: prescribed/choice/random)
- [ ] Mastery tracking and repetition prompts
- [ ] AttemptHistory view (per learning unit)

### Phase 6: Exercise Enhancements
- [ ] FlashcardBuilder component
- [ ] FlashcardPlayer with spaced repetition
- [ ] MatchingBuilder component
- [ ] MatchingPlayer with drag-drop
- [ ] FinishTheStoryBuilder component
- [ ] FinishTheStoryPlayer with AI scoring
- [ ] Media upload integration

---

## 8. Terminology Migration TODO

When implementing, use these mappings:

| Old Code Term | New Code Term |
|---------------|---------------|
| Chapter | Module |
| chapter | module |
| chapterId | moduleId |
| chapters | modules |
| ChapterAccess | ModuleAccess |
| ChapterProgress | ModuleProgress |
| ChapterCompletionCriteria | ModuleCompletionCriteria |
| ChapterPresentationRules | ModulePresentationRules |
| CourseModule | LearningUnit |
| courseModule | learningUnit |
| moduleId (old) | learningUnitId |
| modules (old) | learningUnits |
| CourseModuleType | LearningUnitType |
| CourseModuleSettings | LearningUnitSettings |
| ModuleCategory | LearningUnitCategory |
| ModuleProgress (old) | LearningUnitProgress |
| gateModuleId | gateLearningUnitId |
| moduleCount | learningUnitCount |

---

## 9. Relationship to Other Specs

This specification **consolidates and supersedes**:

| Original Spec | How Incorporated |
|---------------|------------------|
| ASSESSMENT_MODULE_SPEC.md | Assessment entity, quiz/exam styles, question bank selection |
| ENHANCED_EXERCISE_DELIVERY_SPEC.md | Exercise types (flashcard, matching, finish_the_story), media support |
| LEARNING_EVENTS_SPEC.md | ModuleProgress concept (computed), attempt tracking |

Original specs remain as detailed reference for specific features.

---

*End of Specification*
