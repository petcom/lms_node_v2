# Learning Events & Event Groups Specification

## Version: 1.0.0
## Status: Draft
## Created: 2026-01-21
## Author: UI Team

---

## 1. Overview

### 1.1 Purpose

This specification defines a dynamic learning delivery system based on **Learning Events** and **Learning Event Groups**. The goal is to create an adaptive, replayable learning experience that helps learners master material through varied practice and reinforcement.

### 1.2 Core Concepts

| Concept | Definition |
|---------|------------|
| **Learning Event** | A single learning activity (exercise, quiz, exposition, etc.) |
| **Learning Event Group** | A collection of learning events that together cover a module's material |
| **Exposition** | Content delivery - the "teaching" portion (video, reading, presentation) |
| **Completion Metric** | Criteria determining when a learner has mastered an event group |

### 1.3 Design Philosophy

Traditional LMS: Linear progression through fixed content
```
Module 1 → Module 2 → Module 3 → Final Exam
```

Event-Based Learning: Dynamic, adaptive, mastery-focused
```
Event Group 1:
  ├── Exposition (core content)
  ├── Learning Events (practice in varied order)
  │   ├── Exercise A (random)
  │   ├── Quiz B (random)
  │   ├── Flashcards C (random)
  │   └── Matching D (random)
  └── Completion Gate (exam or metric threshold)
```

---

## 2. Learning Events

### 2.1 Event Types

```typescript
type LearningEventType =
  | 'exposition'        // Content delivery (video, document, presentation)
  | 'exercise'          // Practice activity (flashcard, matching, etc.)
  | 'quiz'              // Knowledge check (assessment style: quiz)
  | 'exam'              // Formal evaluation (assessment style: exam)
  | 'discussion'        // Collaborative learning (future)
  | 'simulation'        // Interactive scenario (future)
  | 'external';         // External resource/link (future)
```

### 2.2 Learning Event Entity

```typescript
interface LearningEvent {
  id: string;
  eventGroupId: string;

  // Event identification
  type: LearningEventType;
  title: string;
  description?: string;

  // Content reference
  contentType: 'module' | 'assessment' | 'exercise' | 'external';
  contentId: string;              // Reference to actual content

  // Sequencing
  order?: number;                 // Fixed order (null = random eligible)
  isRequired: boolean;            // Must complete for group completion
  isReplayable: boolean;          // Can be repeated after completion

  // Prerequisites within group
  prerequisites?: string[];       // Event IDs that must complete first

  // Completion criteria
  completionCriteria: EventCompletionCriteria;

  // Weighting
  weight: number;                 // Contribution to group completion (0-100)

  // Timing
  estimatedDuration: number;      // Minutes
  timeLimit?: number;             // Minutes (null = unlimited)

  // Availability
  availableFrom?: string;         // ISO date
  availableUntil?: string;        // ISO date

  // Metadata
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';

  createdAt: string;
  updatedAt: string;
}

interface EventCompletionCriteria {
  type: 'view' | 'score' | 'time' | 'interaction' | 'custom';

  // For 'view' type (expositions)
  viewPercentage?: number;        // % of content viewed (e.g., 90)

  // For 'score' type (quizzes, exercises)
  minimumScore?: number;          // Minimum score to complete (e.g., 70)

  // For 'time' type
  minimumTime?: number;           // Minimum time spent (seconds)

  // For 'interaction' type
  requiredInteractions?: string[]; // Specific interactions required
}
```

### 2.3 Event Categories

#### Expositions (Content Delivery)
- **Purpose**: Deliver core instructional content
- **Types**: Video lectures, documents, presentations, interactive content
- **Completion**: View percentage threshold (e.g., 90% watched)
- **Replay**: Always replayable for review
- **Order**: Typically first in sequence (prerequisites for practice)

#### Practice Events (Exercises)
- **Purpose**: Reinforce learning through varied practice
- **Types**: Flashcards, matching, fill-in-blank, simulations
- **Completion**: Participation or score threshold
- **Replay**: Highly replayable, encourages mastery
- **Order**: Random or learner-chosen within availability

#### Assessment Events (Quizzes/Exams)
- **Purpose**: Measure knowledge acquisition
- **Types**: Quiz (low-stakes), Exam (high-stakes)
- **Completion**: Score threshold
- **Replay**: Limited based on assessment configuration
- **Order**: Typically after expositions and practice

---

## 3. Learning Event Groups

### 3.1 Event Group Entity

```typescript
interface LearningEventGroup {
  id: string;
  courseId: string;

  // Identification
  title: string;                  // e.g., "Module 1: Introduction to Safety"
  description?: string;
  order: number;                  // Position in course

  // Events
  events: LearningEvent[];

  // Structure
  structure: EventGroupStructure;

  // Completion
  completionCriteria: GroupCompletionCriteria;

  // Gating
  gateEvent?: string;             // Event ID that "gates" completion (usually exam)
  prerequisites?: string[];       // Group IDs that must complete first

  // Adaptive options
  adaptiveSettings: AdaptiveSettings;

  // Availability
  isPublished: boolean;
  availableFrom?: string;
  availableUntil?: string;

  // Metadata
  estimatedDuration: number;      // Total minutes
  objectives?: string[];          // Learning objectives covered

  createdAt: string;
  updatedAt: string;
}
```

### 3.2 Event Group Structure

```typescript
interface EventGroupStructure {
  // How events are organized
  layout: 'sequential' | 'flexible' | 'adaptive';

  // For 'sequential': strict order
  // For 'flexible': learner chooses order within phases
  // For 'adaptive': system recommends based on performance

  phases: EventPhase[];
}

interface EventPhase {
  id: string;
  name: string;                   // e.g., "Introduction", "Practice", "Assessment"
  order: number;

  // Events in this phase
  eventIds: string[];

  // How to present events in this phase
  presentationMode: 'sequential' | 'random' | 'learner_choice';

  // Minimum events to complete in this phase
  minimumEvents?: number;         // null = all required events

  // Phase completion unlocks next phase
  unlockNext: boolean;
}
```

### 3.3 Standard Event Group Template

```
PHASE 1: Introduction (Sequential)
├── Exposition: Core Content Video
└── Exposition: Supporting Reading

PHASE 2: Practice (Random/Learner Choice)
├── Exercise: Flashcard Review
├── Exercise: Matching Activity
├── Quiz: Knowledge Check 1
├── Exercise: Scenario Practice
└── Quiz: Knowledge Check 2
    [Complete any 3 of 5]

PHASE 3: Assessment (Sequential)
└── Exam: Module Exam (Gate Event)
    [Must pass to complete group]
```

---

## 4. Completion & Mastery

### 4.1 Group Completion Criteria

```typescript
interface GroupCompletionCriteria {
  type: 'all_required' | 'percentage' | 'points' | 'gate_event';

  // For 'all_required': complete all events marked required
  // For 'percentage': complete X% of total weight
  percentageRequired?: number;

  // For 'points': earn X points from weighted events
  pointsRequired?: number;

  // For 'gate_event': pass the designated gate event
  gateEventId?: string;
  gateEventScore?: number;        // Minimum score on gate event

  // Additional requirements
  minimumTimeSpent?: number;      // Total minutes in group
  requireAllExpositions?: boolean; // Must view all expositions
}
```

### 4.2 Mastery Tracking

```typescript
interface LearnerEventProgress {
  learnerId: string;
  eventId: string;
  eventGroupId: string;

  // Attempt tracking
  attempts: EventAttempt[];
  totalAttempts: number;

  // Best performance
  bestScore?: number;
  bestAttemptId?: string;

  // Completion
  isCompleted: boolean;
  completedAt?: string;
  completionAttemptId?: string;

  // Time tracking
  totalTimeSpent: number;         // Seconds

  // Mastery (for replayable events)
  masteryLevel: 'not_started' | 'in_progress' | 'completed' | 'mastered';
  masteryScore?: number;          // 0-100 mastery percentage
}

interface EventAttempt {
  id: string;
  attemptNumber: number;
  startedAt: string;
  completedAt?: string;
  timeSpent: number;              // Seconds
  score?: number;
  passed: boolean;
  details?: any;                  // Event-type specific data
}

interface LearnerGroupProgress {
  learnerId: string;
  eventGroupId: string;

  // Overall progress
  progressPercentage: number;     // 0-100
  weightedScore: number;          // Based on event weights

  // Event completion
  eventsCompleted: number;
  eventsTotal: number;
  requiredEventsCompleted: number;
  requiredEventsTotal: number;

  // Phase progress
  currentPhase: string;
  phasesCompleted: number;
  phasesTotal: number;

  // Time
  totalTimeSpent: number;         // Seconds

  // Completion
  isCompleted: boolean;
  completedAt?: string;

  // Gate event status
  gateEventPassed?: boolean;
  gateEventAttempts?: number;
}
```

---

## 5. Adaptive Learning

### 5.1 Adaptive Settings

```typescript
interface AdaptiveSettings {
  enabled: boolean;

  // Recommendation engine
  recommendationMode: 'none' | 'suggest' | 'enforce';

  // Performance-based adaptation
  adaptToPerformance: boolean;

  // If learner struggles, system can:
  struggleResponse: {
    suggestReview: boolean;       // Suggest reviewing exposition
    addPractice: boolean;         // Add more practice events
    reduceComplexity: boolean;    // Offer simpler versions
    notifyInstructor: boolean;    // Alert instructor
  };

  // If learner excels, system can:
  excelResponse: {
    skipPractice: boolean;        // Allow skipping some practice
    offerAdvanced: boolean;       // Offer advanced content
    acceleratePace: boolean;      // Move to next group faster
  };

  // Thresholds
  struggleThreshold: number;      // Score below this = struggling
  excelThreshold: number;         // Score above this = excelling
}
```

### 5.2 Event Recommendation

```typescript
interface EventRecommendation {
  eventId: string;
  reason: RecommendationReason;
  priority: 'high' | 'medium' | 'low';
  message: string;                // Explanation for learner
}

type RecommendationReason =
  | 'next_in_sequence'            // Natural progression
  | 'review_needed'               // Low score on related content
  | 'spaced_repetition'           // Time to review for retention
  | 'prerequisite'                // Must complete before other events
  | 'learner_weakness'            // Targets identified weak area
  | 'completion_required'         // Needed for group completion
  | 'gate_preparation';           // Prepare for gate event
```

---

## 6. Relationship to Existing Entities

### 6.1 Course → Event Groups → Events

```
Course
├── Event Group 1 (Module 1)
│   ├── Event: Exposition (contentId → CourseModule)
│   ├── Event: Exercise (contentId → Exercise)
│   ├── Event: Quiz (contentId → Assessment)
│   └── Event: Exam (contentId → Assessment)
├── Event Group 2 (Module 2)
│   └── ...
└── Event Group 3 (Module 3)
    └── ...
```

### 6.2 Content References

| Event Type | Content Entity | Content ID Points To |
|------------|----------------|---------------------|
| exposition | CourseModule | video, document, scorm, custom |
| exercise | Exercise | flashcard, matching, practice |
| quiz | Assessment | style: quiz |
| exam | Assessment | style: exam |

### 6.3 Migration Considerations

Existing `CourseModule` entities can be wrapped in Learning Events:
- Each module becomes an event within an event group
- Existing course structure translates to sequential event groups
- No data loss, backward compatible

---

## 7. API Endpoints (Proposed)

### Event Group CRUD

```
GET    /api/v2/courses/:courseId/event-groups
GET    /api/v2/event-groups/:groupId
POST   /api/v2/courses/:courseId/event-groups
PUT    /api/v2/event-groups/:groupId
DELETE /api/v2/event-groups/:groupId
POST   /api/v2/event-groups/:groupId/reorder-events
```

### Learning Events

```
GET    /api/v2/event-groups/:groupId/events
GET    /api/v2/events/:eventId
POST   /api/v2/event-groups/:groupId/events
PUT    /api/v2/events/:eventId
DELETE /api/v2/events/:eventId
```

### Learner Progress

```
GET    /api/v2/event-groups/:groupId/progress           # Current user's progress
GET    /api/v2/event-groups/:groupId/progress/:userId   # Specific user (staff/admin)
POST   /api/v2/events/:eventId/start                    # Start event attempt
POST   /api/v2/events/:eventId/complete                 # Complete event
GET    /api/v2/events/:eventId/attempts                 # Get attempts
```

### Recommendations

```
GET    /api/v2/event-groups/:groupId/recommendations    # Get recommended next events
GET    /api/v2/courses/:courseId/learning-path          # Full course recommendations
```

---

## 8. UI Components (Proposed)

### 8.1 Component Hierarchy

```
src/entities/learning-event/
  model/types.ts
  api/learningEventApi.ts
  hooks/useLearningEvents.ts
  ui/
    EventCard.tsx
    EventList.tsx
    EventProgress.tsx

src/entities/event-group/
  model/types.ts
  api/eventGroupApi.ts
  hooks/useEventGroups.ts
  ui/
    EventGroupCard.tsx
    EventGroupProgress.tsx
    PhaseIndicator.tsx

src/features/learning-path/
  ui/
    LearningPathView.tsx
    EventRecommendations.tsx
    ProgressDashboard.tsx

src/widgets/event-player/
  ui/
    EventPlayerContainer.tsx     # Routes to appropriate player
    ExpositionPlayer.tsx
    ExercisePlayer.tsx
    AssessmentPlayer.tsx
```

### 8.2 Learner View: Event Group

```
┌─────────────────────────────────────────────────────────┐
│  Module 1: Introduction to Workplace Safety             │
│  Progress: ████████░░ 75%                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  PHASE 1: Introduction ✓ Complete                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ✓ Video: Safety Fundamentals (18 min)           │   │
│  │ ✓ Reading: OSHA Guidelines (10 min)             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  PHASE 2: Practice ░ 2 of 3 required                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ✓ Flashcards: Safety Terms (Mastered)           │   │
│  │ ✓ Matching: Hazard Symbols (85%)                │   │
│  │ ○ Quiz: Knowledge Check (Not started)           │   │
│  │ ○ Scenario: Emergency Response (Optional)       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  PHASE 3: Assessment 🔒 Locked                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔒 Module Exam (Complete Phase 2 first)         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 💡 Recommended: Complete "Quiz: Knowledge Check" │   │
│  │    to prepare for the Module Exam                │   │
│  │                            [Start Quiz →]        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Open Questions

1. **Backward Compatibility**: Should existing courses auto-convert to event groups, or run parallel systems?

2. **Granularity**: Should one CourseModule = one Event, or can a module contain multiple events?

3. **Adaptive Algorithm**: What algorithm/model should power adaptive recommendations? Simple rules, ML-based, or hybrid?

4. **Time-Based Events**: Should events unlock based on calendar time or time since previous completion?

5. **Collaborative Events**: Should discussion-based events be part of v1, or deferred?

6. **Instructor Override**: Can instructors manually adjust learner paths, or is it fully automated?

7. **Analytics**: What analytics should be captured at the event level vs group level?

---

## 10. Implementation Phases (Proposed)

### Phase 1: Core Event Structure
- [ ] LearningEvent entity and types
- [ ] LearningEventGroup entity and types
- [ ] Basic CRUD APIs
- [ ] Sequential event progression

### Phase 2: Flexible Learning
- [ ] Phase-based event organization
- [ ] Random/learner-choice ordering
- [ ] Replayable events
- [ ] Progress tracking

### Phase 3: Completion & Gating
- [ ] Group completion criteria
- [ ] Gate events (exams)
- [ ] Prerequisites
- [ ] Completion certificates

### Phase 4: Adaptive Learning
- [ ] Recommendation engine
- [ ] Performance-based adaptation
- [ ] Struggle/excel detection
- [ ] Personalized learning paths

### Phase 5: Analytics & Insights
- [ ] Event-level analytics
- [ ] Group performance reports
- [ ] Learning pattern analysis
- [ ] Instructor dashboards

---

## 11. Glossary

| Term | Definition |
|------|------------|
| **Learning Event** | A single, atomic learning activity |
| **Event Group** | Collection of events covering a topic/module |
| **Exposition** | Content delivery event (teaching) |
| **Gate Event** | Assessment that must be passed to complete a group |
| **Phase** | Logical grouping of events within an event group |
| **Mastery** | High level of demonstrated competence |
| **Adaptive Learning** | System adjusts based on learner performance |

---

*End of Specification*
