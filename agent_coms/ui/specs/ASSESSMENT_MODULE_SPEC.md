# Assessment Module Specification

## Version: 1.0.0
## Status: Draft
## Created: 2026-01-21
## Author: UI Team

---

## 1. Overview

### 1.1 Purpose

The Assessment module is a new course module type designed for evaluating learner knowledge through quizzes and exams. Unlike the existing `exercise` type (which is for practice activities), assessments are formal evaluations that pull questions from a question bank with configurable selection rules.

### 1.2 Key Differentiators from Exercise

| Aspect | Exercise | Assessment |
|--------|----------|------------|
| Purpose | Practice, learning reinforcement | Formal evaluation, grading |
| Question Source | Embedded questions | Question bank with selection rules |
| Question Selection | Fixed set | Percentage-based from bank |
| Retries | Typically unlimited | Style-dependent limits |
| Scoring | Optional | Required for completion |
| Proctoring | Not applicable | Optional (future) |

### 1.3 Assessment Styles

| Style | Description | Question Selection | Retry Behavior |
|-------|-------------|-------------------|----------------|
| `quiz` | Short, frequent knowledge checks | 30-50% of question bank | Multiple retries allowed |
| `exam` | Formal, comprehensive evaluation | 80-100% of question bank | Limited retries (1-3) |
| *future* | Additional styles can be added | Configurable | Configurable |

---

## 2. Data Model

### 2.1 New Module Type

Add `assessment` to the `CourseModuleType`:

```typescript
// Current
type CourseModuleType = 'scorm' | 'custom' | 'exercise' | 'video' | 'document';

// Proposed
type CourseModuleType = 'scorm' | 'custom' | 'exercise' | 'video' | 'document' | 'assessment';
```

### 2.2 Assessment Entity

```typescript
/**
 * Assessment Style
 * Determines question selection and retry behavior
 */
type AssessmentStyle = 'quiz' | 'exam';

/**
 * Assessment Status
 */
type AssessmentStatus = 'draft' | 'published' | 'archived';

/**
 * Question Selection Mode
 */
type QuestionSelectionMode = 'percentage' | 'fixed_count' | 'all';

/**
 * Assessment Configuration
 */
interface AssessmentConfig {
  // Question Selection
  questionSelectionMode: QuestionSelectionMode;
  questionPercentage?: number;       // For percentage mode (30-100)
  questionCount?: number;            // For fixed_count mode

  // Question Bank Filters
  questionBankIds?: string[];        // Specific banks to pull from (can select multiple), or empty for department-wide
  questionTags?: string[];           // Filter by tags
  questionDifficulty?: ('easy' | 'medium' | 'hard')[]; // Filter by difficulty

  // Randomization
  shuffleQuestions: boolean;         // Randomize question order
  shuffleAnswers: boolean;           // Randomize answer options

  // Time & Attempts
  timeLimit: number | null;          // In seconds, null = unlimited
  maxAttempts: number;               // 0 = unlimited (for quiz), 1-3 typical for exam
  cooldownPeriod: number | null;     // Seconds between attempts, null = immediate

  // Scoring
  passingScore: number;              // Percentage required to pass (0-100)
  showScore: boolean;                // Show score after completion
  showCorrectAnswers: boolean;       // Show which answers were correct
  showExplanations: boolean;         // Show question explanations

  // When to show feedback
  feedbackTiming: 'immediate' | 'after_submission' | 'after_all_attempts' | 'never';

  // Grading
  partialCredit: boolean;            // Allow partial credit for multi-select
  negativeScoring: boolean;          // Deduct points for wrong answers
}

/**
 * Assessment Entity
 */
interface Assessment {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;       // Shown before starting
  style: AssessmentStyle;
  status: AssessmentStatus;

  // Organization
  departmentId: string;
  courseId?: string;                 // Optional: can be standalone
  moduleId?: string;                 // Optional: linked module

  // Configuration
  config: AssessmentConfig;

  // Computed from config + question bank
  estimatedQuestionCount: number;
  estimatedDuration: number;         // In seconds
  totalPoints: number;

  // Statistics
  statistics: {
    totalAttempts: number;
    uniqueParticipants: number;
    averageScore: number;
    passRate: number;
    averageTimeSpent: number;        // In seconds
  };

  // Metadata
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}
```

### 2.3 Assessment Attempt

```typescript
/**
 * Assessment Attempt Status
 */
type AttemptStatus = 'in_progress' | 'submitted' | 'graded' | 'abandoned';

/**
 * Question Response
 */
interface QuestionResponse {
  questionId: string;
  selectedAnswer: string | string[];  // For multi-select
  timeSpent: number;                  // Seconds on this question
  isCorrect?: boolean;                // Populated after grading
  pointsEarned?: number;              // Populated after grading
  feedback?: string;                  // Populated if showExplanations
}

/**
 * Assessment Attempt
 */
interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  userId: string;
  attemptNumber: number;
  status: AttemptStatus;

  // Questions for this attempt (randomized selection)
  questions: {
    questionId: string;
    order: number;
    points: number;
  }[];

  // Responses
  responses: QuestionResponse[];

  // Timing
  startedAt: string;
  submittedAt: string | null;
  timeSpent: number;                  // Total seconds
  timeRemaining: number | null;       // If timed

  // Results (populated after grading)
  results?: {
    score: number;                    // Raw score
    percentage: number;               // Score as percentage
    passed: boolean;
    pointsEarned: number;
    pointsPossible: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
  };

  // Metadata
  ipAddress?: string;
  userAgent?: string;
  gradedAt?: string;
  gradedBy?: string;                  // For manual grading (essay questions)
}
```

### 2.4 Style Presets

```typescript
/**
 * Default configurations by style
 */
const ASSESSMENT_STYLE_PRESETS: Record<AssessmentStyle, Partial<AssessmentConfig>> = {
  quiz: {
    questionSelectionMode: 'percentage',
    questionPercentage: 40,           // 30-50% of bank
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
    questionPercentage: 90,           // 80-100% of bank
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

---

## 3. API Endpoints

### 3.1 Assessment CRUD

```
# List assessments
GET /api/v2/assessments
Query: departmentId, style, status, search, page, limit, sort

# Get assessment details
GET /api/v2/assessments/:assessmentId

# Create assessment
POST /api/v2/assessments
Body: CreateAssessmentPayload

# Update assessment
PUT /api/v2/assessments/:assessmentId
Body: UpdateAssessmentPayload

# Delete assessment
DELETE /api/v2/assessments/:assessmentId

# Publish assessment
POST /api/v2/assessments/:assessmentId/publish

# Archive assessment
POST /api/v2/assessments/:assessmentId/archive

# Duplicate assessment
POST /api/v2/assessments/:assessmentId/duplicate
```

### 3.2 Assessment Questions

```
# Preview questions (based on config, not committed)
GET /api/v2/assessments/:assessmentId/questions/preview
Query: count (optional, defaults to config)

# Get question statistics
GET /api/v2/assessments/:assessmentId/questions/statistics
```

### 3.3 Assessment Attempts

```
# Start attempt (creates attempt with randomized questions)
POST /api/v2/assessments/:assessmentId/attempts

# Get current attempt
GET /api/v2/assessments/:assessmentId/attempts/current

# Save progress (auto-save)
PUT /api/v2/assessments/:assessmentId/attempts/:attemptId
Body: { responses: QuestionResponse[] }

# Submit attempt
POST /api/v2/assessments/:assessmentId/attempts/:attemptId/submit

# Get attempt results
GET /api/v2/assessments/:assessmentId/attempts/:attemptId/results

# List user's attempts
GET /api/v2/assessments/:assessmentId/attempts
Query: userId (admin only for other users)
```

### 3.4 Course Module Integration

```
# Create assessment module (creates module + assessment)
POST /api/v2/courses/:courseId/modules
Body: {
  title: string,
  description?: string,
  order: number,
  type: 'assessment',
  assessmentConfig: CreateAssessmentPayload  // Embedded assessment config
}

# Link existing assessment to module
PUT /api/v2/courses/:courseId/modules/:moduleId
Body: {
  contentId: assessmentId  // Link to existing assessment
}
```

---

## 4. Payload Types

### 4.1 Create Assessment

```typescript
interface CreateAssessmentPayload {
  title: string;
  description?: string;
  instructions?: string;
  style: AssessmentStyle;
  departmentId: string;

  // Question selection
  questionSelectionMode: QuestionSelectionMode;
  questionPercentage?: number;
  questionCount?: number;
  questionBankIds?: string[];        // Array of bank IDs to pull questions from
  questionTags?: string[];
  questionDifficulty?: ('easy' | 'medium' | 'hard')[];

  // Behavior (all optional, defaults from style preset)
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  timeLimit?: number | null;
  maxAttempts?: number;
  cooldownPeriod?: number | null;
  passingScore?: number;
  showScore?: boolean;
  showCorrectAnswers?: boolean;
  showExplanations?: boolean;
  feedbackTiming?: 'immediate' | 'after_submission' | 'after_all_attempts' | 'never';
  partialCredit?: boolean;
  negativeScoring?: boolean;
}
```

### 4.2 Update Assessment

```typescript
interface UpdateAssessmentPayload {
  title?: string;
  description?: string;
  instructions?: string;
  style?: AssessmentStyle;          // Changing style resets config to preset

  // Question selection
  questionSelectionMode?: QuestionSelectionMode;
  questionPercentage?: number;
  questionCount?: number;
  questionBankIds?: string[];        // Array of bank IDs to pull questions from
  questionTags?: string[];
  questionDifficulty?: ('easy' | 'medium' | 'hard')[];

  // Behavior
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  timeLimit?: number | null;
  maxAttempts?: number;
  cooldownPeriod?: number | null;
  passingScore?: number;
  showScore?: boolean;
  showCorrectAnswers?: boolean;
  showExplanations?: boolean;
  feedbackTiming?: 'immediate' | 'after_submission' | 'after_all_attempts' | 'never';
  partialCredit?: boolean;
  negativeScoring?: boolean;

  status?: AssessmentStatus;
}
```

---

## 5. UI Components

### 5.1 Component Hierarchy

```
src/entities/assessment/
  model/
    types.ts              # Assessment types
    assessmentKeys.ts     # Query keys
  api/
    assessmentApi.ts      # API functions
  hooks/
    useAssessments.ts     # React Query hooks
    useAssessmentAttempt.ts
  ui/
    AssessmentCard.tsx    # List item card
    AssessmentForm.tsx    # Create/edit form
    AssessmentPreview.tsx # Preview before taking
    AssessmentPlayer.tsx  # Taking the assessment
    AssessmentResults.tsx # Results view
    StyleSelector.tsx     # Quiz/Exam style picker
    QuestionBankPicker.tsx# Multi-select question bank picker (can select multiple banks)

src/features/assessment-builder/
  ui/
    AssessmentBuilderWizard.tsx  # Multi-step creation wizard
    ConfigurationStep.tsx        # Settings configuration
    QuestionPreviewStep.tsx      # Preview selected questions
    PublishStep.tsx              # Final review & publish

src/pages/
  staff/
    assessments/
      AssessmentListPage.tsx
      AssessmentBuilderPage.tsx
      AssessmentResultsPage.tsx
  learner/
    assessments/
      TakeAssessmentPage.tsx
      AssessmentResultPage.tsx
```

### 5.2 Assessment Builder Flow

```
1. Basic Info
   - Title, Description, Instructions
   - Style Selection (Quiz/Exam) with visual cards
   - Department selection

2. Question Source
   - Select one or more question banks (multi-select)
   - Or use department-wide pool (no banks selected)
   - Filter by tags and difficulty
   - Preview matching question count from selected banks

3. Selection Rules
   - Mode: Percentage / Fixed Count / All
   - Percentage slider (30-100%) or count input
   - Preview sample questions

4. Assessment Settings
   - Time limit (optional for quiz, recommended for exam)
   - Attempt limits
   - Cooldown period
   - Passing score

5. Feedback Settings
   - Show score after completion
   - When to show correct answers
   - When to show explanations

6. Review & Publish
   - Summary of all settings
   - Estimated question count
   - Estimated duration
   - Publish or save as draft
```

### 5.3 Assessment Player Flow

```
1. Instructions Screen
   - Assessment title, description
   - Instructions (if provided)
   - Time limit warning
   - Attempt count (e.g., "Attempt 1 of 3")
   - Start button

2. Question View
   - Question number and progress
   - Time remaining (if timed)
   - Question text
   - Answer options
   - Flag for review button
   - Navigation (prev/next or question list)

3. Review Screen (before submit)
   - Question list with status
   - Answered / Unanswered / Flagged indicators
   - Jump to any question
   - Submit button

4. Results Screen
   - Score and pass/fail status
   - Breakdown by question (if configured)
   - Correct answers (if configured)
   - Explanations (if configured)
   - Retry button (if attempts remaining)
```

---

## 6. Integration with Course Modules

### 6.1 Module Type Selection

When creating a course module, the type dropdown should include:
- Custom
- SCORM
- Video
- Document
- Exercise (for practice)
- **Assessment** (for quizzes/exams)

### 6.2 Assessment Module Creation

When "Assessment" is selected:
1. Show style selector (Quiz / Exam)
2. Option to:
   - Create new assessment (opens builder)
   - Link existing assessment (opens picker)
3. Module settings inherit from assessment config

### 6.3 Completion Tracking

Module completion is tracked via `AssessmentAttempt`:
- `passed: true` = module complete
- `passed: false` = module incomplete
- Multiple attempts tracked separately

---

## 7. Question Bank Integration

### 7.1 Question Selection Algorithm

```typescript
function selectQuestions(config: AssessmentConfig): Question[] {
  // 1. Start with questions from specified banks (or all department questions if empty)
  let questions: Question[] = [];

  if (config.questionBankIds?.length) {
    // Pull questions that belong to ANY of the specified banks
    questions = getQuestionsFromBanks(config.questionBankIds);
  } else {
    // Fall back to department-wide question pool
    questions = getAllDepartmentQuestions(config.departmentId);
  }

  // 2. Apply filters
  if (config.questionTags?.length) {
    questions = questions.filter(q =>
      q.tags.some(t => config.questionTags.includes(t))
    );
  }
  if (config.questionDifficulty?.length) {
    questions = questions.filter(q =>
      config.questionDifficulty.includes(q.difficulty)
    );
  }

  // 3. Calculate count based on mode
  let count: number;
  switch (config.questionSelectionMode) {
    case 'all':
      count = questions.length;
      break;
    case 'fixed_count':
      count = Math.min(config.questionCount!, questions.length);
      break;
    case 'percentage':
      count = Math.ceil(questions.length * (config.questionPercentage! / 100));
      break;
  }

  // 4. Random selection (if not 'all')
  if (config.questionSelectionMode !== 'all') {
    questions = shuffleArray(questions).slice(0, count);
  }

  // 5. Shuffle order if configured
  if (config.shuffleQuestions) {
    questions = shuffleArray(questions);
  }

  return questions;
}

// Helper: Get questions that belong to any of the specified banks
function getQuestionsFromBanks(bankIds: string[]): Question[] {
  return db.questions.find({
    questionBankIds: { $in: bankIds }
  });
}
```

### 7.2 Question Caching

- Questions are selected at attempt start and stored with the attempt
- Same questions shown if learner resumes an in-progress attempt
- New random selection for each new attempt

---

## 8. Permissions

### 8.1 Assessment Management

| Action | Roles |
|--------|-------|
| Create assessment | Staff, Admin |
| Edit assessment | Creator, Admin |
| Delete assessment | Creator, Admin |
| Publish assessment | Creator, Admin |
| View all attempts | Staff, Admin |

### 8.2 Assessment Taking

| Action | Roles |
|--------|-------|
| Start attempt | Enrolled learner |
| Submit attempt | Attempt owner |
| View own results | Attempt owner |
| View all results | Staff, Admin |

---

## 9. Migration Notes

### 9.1 Existing Exercise Type

The existing `exercise` module type remains unchanged. Exercises are for:
- Practice activities
- Self-paced learning
- Embedded questions in exercises

### 9.2 Module Type Update

Update `CourseModuleType` to include `assessment`:
- API: Add `assessment` to enum
- UI: Add to type dropdown in CourseModuleForm
- Remove quiz/exam mapping to exercise

### 9.3 Database

New collections required:
- `assessments` - Assessment configurations
- `assessment_attempts` - User attempts and responses

---

## 10. Future Considerations

### 10.1 Additional Styles

- `practice_test` - Simulate exam conditions without grading
- `survey` - No correct answers, just collection
- `certification` - Proctored, high-stakes

### 10.2 Proctoring

- Webcam monitoring
- Browser lockdown
- Identity verification

### 10.3 Advanced Grading

- Manual grading for essay questions
- Rubric-based scoring
- Peer review

### 10.4 Analytics

- Question difficulty analysis
- Time-per-question metrics
- Learning gap identification

---

## 11. Open Questions

1. **Question Bank Scope**: ~~Should assessments use the existing question bank entity, or should each assessment have its own embedded questions?~~
   - **RESOLVED**: Use existing Question entity with a new `questionBankIds: string[]` field
   - Questions can belong to multiple banks simultaneously
   - Assessments specify which bank(s) to pull from via `questionBankIds[]` in config

2. **Cross-Department Questions**: Can assessments pull questions from multiple departments?
   - Recommendation: Start with single department, expand later

3. **Essay Question Grading**: How should manual grading workflow work?
   - Recommendation: Phase 2 feature, start with auto-gradable questions only

4. **Offline Support**: Should learners be able to take assessments offline?
   - Recommendation: Online only for v1

---

## 11.1 Question Entity Modification Required

To support the question bank architecture, the existing **Question** entity needs a new field:

```typescript
interface Question {
  // ... existing fields ...

  questionBankIds: string[];  // NEW: Array of bank IDs this question belongs to
                              // A question can be in multiple banks
                              // Empty array = department-wide (not in any specific bank)
}
```

**API Changes Required:**
- Add `questionBankIds` field to Question model
- Update `POST /questions` to accept `questionBankIds`
- Update `PUT /questions/:id` to accept `questionBankIds`
- Add `GET /questions?bankId=xxx` filter to query by bank
- Add `GET /question-banks` endpoint to list available banks (optional, could be derived from unique questionBankIds)

---

## 12. Implementation Phases

### Phase 1: Core Assessment
- [ ] Assessment entity and types
- [ ] Assessment CRUD API
- [ ] Assessment list page
- [ ] Assessment builder (basic)
- [ ] Course module integration

### Phase 2: Assessment Taking
- [ ] Attempt creation and management
- [ ] Assessment player UI
- [ ] Auto-save functionality
- [ ] Results display

### Phase 3: Advanced Features
- [ ] Statistics and analytics
- [ ] Question difficulty analysis
- [ ] Bulk import/export
- [ ] Style customization

### Phase 4: Future
- [ ] Essay question grading
- [ ] Proctoring integration
- [ ] Certification style
- [ ] Advanced analytics

---

## Appendix A: API Message to Backend

This specification should be shared with the API team via:
`api/agent_coms/messages/UI-2026-01-21-assessment-module-spec.md`

Key requests for API team:
1. Add `assessment` to CourseModuleType enum
2. Create Assessment model and collection
3. Create AssessmentAttempt model and collection
4. Implement endpoints per Section 3

---

*End of Specification*
