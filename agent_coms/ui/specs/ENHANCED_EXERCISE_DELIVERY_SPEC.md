# Enhanced Exercise Delivery Specification

## Version: 1.0.0
## Status: Draft
## Created: 2026-01-21
## Author: UI Team

---

## 1. Overview

### 1.1 Purpose

This specification defines enhancements to the existing Exercise entity to support new interactive exercise types and rich media content. Exercises are practice-oriented learning activities (distinct from Assessments which are formal evaluations).

### 1.2 Scope

- New exercise types: Flashcard, Matching, Finish the Story
- Rich media support: Images, video clips, audio snippets
- Media storage integration with S3/Spaces/CDN
- AI-assisted scoring for prose responses

### 1.3 Relationship to Assessment Module

| Feature | Exercise | Assessment |
|---------|----------|------------|
| Purpose | Practice, learning reinforcement | Formal evaluation, grading |
| Feedback | Immediate, learning-focused | Configurable timing |
| Retries | Typically unlimited | Style-dependent limits |
| Scoring | Optional, formative | Required, summative |
| Question Source | Embedded in exercise | Question bank with random selection |

---

## 2. New Exercise Types

### 2.1 Exercise Type Enum

Update the existing `ExerciseType`:

```typescript
// Current
type ExerciseType = 'quiz' | 'exam' | 'practice' | 'assessment';

// Proposed
type ExerciseType =
  | 'practice'           // General practice (existing)
  | 'flashcard'          // Card-based memorization
  | 'matching'           // Drag-and-drop matching
  | 'finish_the_story';  // Prose completion with AI scoring
```

### 2.2 Flashcard Exercise

Interactive card-based learning for memorization and recall.

**Behavior:**
- Cards have a front (prompt) and back (answer)
- Learner views front, mentally recalls answer, flips to reveal
- Self-assessment: "Got it" / "Need more practice"
- Spaced repetition algorithm tracks mastery
- Cards can contain text, images, audio, or video

**Data Structure:**

```typescript
interface FlashcardItem {
  id: string;
  front: MediaContent;           // Question/prompt side
  back: MediaContent;            // Answer side
  hints?: string[];              // Optional progressive hints
  tags?: string[];               // For filtering/grouping
  difficulty: 'easy' | 'medium' | 'hard';
}

interface FlashcardExerciseConfig {
  cards: FlashcardItem[];
  shuffleCards: boolean;
  showHints: boolean;
  trackMastery: boolean;         // Enable spaced repetition
  masteryThreshold: number;      // Times correct before "mastered" (default: 3)
  sessionSize?: number;          // Cards per session (null = all)
}
```

**Mastery Tracking:**

```typescript
interface FlashcardProgress {
  cardId: string;
  timesCorrect: number;
  timesIncorrect: number;
  lastReviewed: string;
  nextReviewDate: string;        // Spaced repetition scheduling
  mastered: boolean;
}
```

### 2.3 Matching Exercise

Drag-and-drop activity connecting items from two columns.

**Behavior:**
- Column A displays prompts/questions (fixed position)
- Column B displays answers (draggable)
- Learner drags items from B to match with A
- Visual feedback on correct/incorrect matches
- Supports text, images, or mixed content

**Data Structure:**

```typescript
interface MatchingPair {
  id: string;
  columnA: MediaContent;         // The prompt (left side)
  columnB: MediaContent;         // The answer (right side)
  explanation?: string;          // Shown after matching
}

interface MatchingExerciseConfig {
  pairs: MatchingPair[];
  shuffleColumnB: boolean;       // Randomize answer positions
  allowPartialCredit: boolean;   // Score based on correct matches
  showFeedbackOnDrop: boolean;   // Immediate or after submit
  maxAttempts?: number;          // Per matching session
  timeLimit?: number;            // In seconds
}
```

**UI Requirements:**
- Responsive drag-and-drop (touch and mouse)
- Visual connection lines between matched items
- Clear visual states: unmatched, matched, correct, incorrect
- Accessibility: keyboard navigation alternative

### 2.4 Finish the Story Exercise

Prose-based response where learners complete a narrative or explanation.

**Behavior:**
- System presents a prompt/scenario
- Learner writes a prose response (paragraph or more)
- System scores against:
  - Required keywords/phrases
  - Optional keywords for bonus
  - AI analysis for coherence and completeness
- Partial credit based on keyword coverage and AI assessment

**Data Structure:**

```typescript
interface FinishTheStoryPrompt {
  id: string;
  scenario: MediaContent;        // The setup/prompt
  instructions: string;          // What the learner should do
  minWordCount?: number;         // Minimum response length
  maxWordCount?: number;         // Maximum response length

  // Keyword-based scoring
  requiredKeywords: KeywordRule[];
  bonusKeywords?: KeywordRule[];

  // AI scoring configuration
  aiScoringEnabled: boolean;
  aiScoringWeight: number;       // 0-100, percentage of total score
  aiRubric?: string;             // Instructions for AI scorer

  // Reference answer for AI comparison
  modelAnswer?: string;

  // Points
  totalPoints: number;
}

interface KeywordRule {
  keyword: string;               // Word or phrase to match
  variants?: string[];           // Acceptable variations
  caseSensitive: boolean;
  points: number;
  required: boolean;             // Must appear for credit
}

interface FinishTheStoryExerciseConfig {
  prompts: FinishTheStoryPrompt[];
  allowRevision: boolean;        // Can learner edit after submit
  showKeywordFeedback: boolean;  // Highlight matched keywords
  showAiFeedback: boolean;       // Show AI's assessment
  requireMinWords: boolean;      // Block submit if under minimum
}
```

**AI Scoring Response:**

```typescript
interface AiScoringResult {
  score: number;                 // 0-100
  confidence: number;            // AI's confidence in scoring
  feedback: string;              // Constructive feedback for learner
  strengths: string[];           // What the response did well
  improvements: string[];        // Suggestions for improvement
  coherenceScore: number;        // How well-structured
  relevanceScore: number;        // How relevant to prompt
  completenessScore: number;     // How thorough
}
```

---

## 3. Rich Media Support

### 3.1 Media Content Model

All exercises can include rich media in questions, answers, and prompts.

```typescript
/**
 * Media types supported
 */
type MediaType = 'text' | 'image' | 'video' | 'audio';

/**
 * Media content that can be attached to any question/prompt
 */
interface MediaContent {
  // Primary content (at least one required)
  text?: string;                 // Text content (markdown supported)

  // Media attachments (zero or more)
  media?: MediaAttachment[];

  // Layout preference
  layout: MediaLayout;
}

/**
 * Individual media attachment
 */
interface MediaAttachment {
  id: string;
  type: MediaType;

  // Storage reference
  storageKey: string;            // Key in S3/Spaces bucket
  cdnUrl: string;                // Public CDN URL for delivery

  // Metadata
  filename: string;
  mimeType: string;
  fileSize: number;              // In bytes

  // Dimensions (for image/video)
  width?: number;
  height?: number;

  // Duration (for video/audio)
  duration?: number;             // In seconds

  // Accessibility
  altText?: string;              // For images
  transcript?: string;           // For video/audio
  captions?: CaptionTrack[];     // For video

  // Upload metadata
  uploadedBy: string;
  uploadedAt: string;
}

/**
 * How to display media relative to text
 */
type MediaLayout =
  | 'text_only'           // No media, text only
  | 'media_only'          // No text, media only
  | 'media_above'         // Media above text
  | 'media_below'         // Media below text
  | 'media_left'          // Media left, text right (side by side)
  | 'media_right'         // Media right, text left (side by side)
  | 'media_background';   // Media as background with text overlay

/**
 * Caption track for video
 */
interface CaptionTrack {
  language: string;              // ISO 639-1 code
  label: string;                 // Display name
  storageKey: string;            // VTT file in storage
  cdnUrl: string;
  isDefault: boolean;
}
```

### 3.2 Media Constraints

| Media Type | Max File Size | Max Duration | Supported Formats |
|------------|---------------|--------------|-------------------|
| Image | 10 MB | N/A | JPEG, PNG, GIF, WebP, SVG |
| Video | 100 MB | 5 minutes | MP4 (H.264), WebM |
| Audio | 20 MB | 5 minutes | MP3, WAV, OGG, M4A |

### 3.3 Storage Configuration

```typescript
/**
 * Storage provider configuration
 */
interface MediaStorageConfig {
  provider: 'aws_s3' | 'digitalocean_spaces' | 'cloudflare_r2';

  // Bucket configuration
  bucket: string;
  region: string;

  // CDN configuration
  cdnEnabled: boolean;
  cdnDomain?: string;            // e.g., cdn.example.com

  // Paths
  basePath: string;              // e.g., 'exercises/media'

  // Security
  signedUrlExpiry: number;       // Seconds for signed URLs
  publicAccess: boolean;         // If false, use signed URLs
}

/**
 * Media upload request
 */
interface MediaUploadRequest {
  file: File;
  exerciseId?: string;           // Associate with exercise
  purpose: 'question' | 'answer' | 'hint' | 'explanation';
  altText?: string;
}

/**
 * Media upload response
 */
interface MediaUploadResponse {
  attachment: MediaAttachment;
  uploadUrl?: string;            // For direct upload to storage
}
```

### 3.4 Media Processing Pipeline

```
1. Upload Request
   └─> Validate file type and size
   └─> Generate unique storage key
   └─> Return presigned upload URL

2. Direct Upload (client -> storage)
   └─> Client uploads directly to S3/Spaces
   └─> Reduces server bandwidth

3. Post-Upload Processing
   └─> Verify upload completed
   └─> Generate thumbnails (images)
   └─> Transcode if needed (video/audio)
   └─> Extract metadata (dimensions, duration)
   └─> Generate CDN URL
   └─> Update database record

4. Delivery
   └─> Serve via CDN URL
   └─> Use signed URLs for private content
   └─> Lazy load for performance
```

---

## 4. Updated Question Types

### 4.1 Enhanced Question Type Enum

```typescript
// Current
type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'essay'
  | 'fill_blank';

// Proposed (add to existing)
type QuestionType =
  | 'multiple_choice'      // Select one from options
  | 'multiple_select'      // Select multiple from options
  | 'true_false'           // Binary choice
  | 'short_answer'         // Brief text response
  | 'essay'                // Long-form text response
  | 'fill_blank'           // Complete the sentence
  | 'ordering'             // Arrange items in sequence
  | 'hotspot'              // Click on image region
  | 'drag_drop';           // Drag items to targets
```

### 4.2 Question with Media

```typescript
/**
 * Enhanced question structure with media support
 */
interface EnhancedQuestion {
  id: string;
  questionType: QuestionType;

  // Content (supports rich media)
  content: MediaContent;

  // Answer options (for choice-based questions)
  options?: AnswerOption[];

  // Correct answer(s)
  correctAnswer: string | string[];

  // Scoring
  points: number;
  partialCredit: boolean;

  // Feedback
  explanation?: MediaContent;    // Can include media
  hintContent?: MediaContent;    // Progressive hints with media

  // Metadata
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Answer option with optional media
 */
interface AnswerOption {
  id: string;
  content: MediaContent;         // Text and/or media
  isCorrect: boolean;
  feedback?: string;             // Option-specific feedback
}
```

---

## 5. API Endpoints

### 5.1 Exercise Endpoints (Updates)

```
# Create exercise with new types
POST /api/v2/exercises
Body: CreateExercisePayload (updated with new types)

# Get exercise with media URLs
GET /api/v2/exercises/:exerciseId
Response: Exercise with resolved CDN URLs
```

### 5.2 Media Endpoints

```
# Request upload URL
POST /api/v2/media/upload-url
Body: {
  filename: string,
  mimeType: string,
  fileSize: number,
  exerciseId?: string,
  purpose: string
}
Response: {
  uploadUrl: string,
  storageKey: string,
  expiresAt: string
}

# Confirm upload and process
POST /api/v2/media/confirm
Body: {
  storageKey: string,
  altText?: string,
  transcript?: string
}
Response: MediaAttachment

# Get media details
GET /api/v2/media/:mediaId

# Delete media
DELETE /api/v2/media/:mediaId

# List media for exercise
GET /api/v2/exercises/:exerciseId/media
```

### 5.3 AI Scoring Endpoints

```
# Score prose response
POST /api/v2/exercises/score-prose
Body: {
  promptId: string,
  response: string,
  exerciseId: string
}
Response: AiScoringResult

# Get scoring history
GET /api/v2/exercises/:exerciseId/scoring-history
```

---

## 6. Flashcard-Specific Endpoints

```
# Get flashcard session (with spaced repetition)
GET /api/v2/exercises/:exerciseId/flashcard-session
Query: sessionSize, includeMastered
Response: {
  cards: FlashcardItem[],
  totalCards: number,
  masteredCount: number,
  dueForReview: number
}

# Record flashcard result
POST /api/v2/exercises/:exerciseId/flashcard-result
Body: {
  cardId: string,
  correct: boolean,
  timeSpent: number
}

# Get flashcard progress
GET /api/v2/exercises/:exerciseId/flashcard-progress
Response: {
  progress: FlashcardProgress[],
  overallMastery: number,
  streakDays: number
}

# Reset flashcard progress
DELETE /api/v2/exercises/:exerciseId/flashcard-progress
```

---

## 7. UI Components

### 7.1 Component Hierarchy

```
src/entities/exercise/
  model/
    types.ts                     # Updated with new types
  ui/
    FlashcardPlayer.tsx          # Flashcard exercise UI
    MatchingPlayer.tsx           # Matching exercise UI
    FinishTheStoryPlayer.tsx     # Prose exercise UI
    MediaDisplay.tsx             # Render media content
    MediaUploader.tsx            # Upload media files

src/features/exercise-builder/
  ui/
    FlashcardBuilder.tsx         # Create flashcard sets
    MatchingBuilder.tsx          # Create matching exercises
    FinishTheStoryBuilder.tsx    # Create prose exercises
    MediaLibrary.tsx             # Browse/select uploaded media
    MediaUploadZone.tsx          # Drag-drop upload area

src/shared/ui/
  MediaPlayer.tsx                # Video/audio player
  ImageViewer.tsx                # Image with zoom
  DragDropContainer.tsx          # Drag-drop primitives
```

### 7.2 Flashcard Player UI

```
┌─────────────────────────────────────────┐
│  Card 3 of 15           ⟳ Shuffle      │
├─────────────────────────────────────────┤
│                                         │
│         ┌─────────────────┐             │
│         │                 │             │
│         │   [Image]       │             │
│         │                 │             │
│         │  What is this   │             │
│         │  called?        │             │
│         │                 │             │
│         │   [Tap to flip] │             │
│         │                 │             │
│         └─────────────────┘             │
│                                         │
├─────────────────────────────────────────┤
│   [Got it ✓]        [Need practice ✗]   │
└─────────────────────────────────────────┘
```

### 7.3 Matching Player UI

```
┌─────────────────────────────────────────┐
│  Match the items          Score: 3/5    │
├─────────────────────────────────────────┤
│                                         │
│  Column A              Column B         │
│  ─────────             ─────────        │
│                                         │
│  ┌─────────┐          ┌─────────┐      │
│  │ [Image] │ ←──────→ │ Answer1 │      │
│  │ Prompt1 │          └─────────┘      │
│  └─────────┘                            │
│                        ┌─────────┐      │
│  ┌─────────┐          │ Answer2 │      │
│  │ Prompt2 │          └─────────┘      │
│  └─────────┘                            │
│                        ┌─────────┐      │
│  ┌─────────┐          │ Answer3 │      │
│  │ Prompt3 │          └─────────┘      │
│  └─────────┘                            │
│                                         │
├─────────────────────────────────────────┤
│              [Check Answers]            │
└─────────────────────────────────────────┘
```

### 7.4 Finish the Story Player UI

```
┌─────────────────────────────────────────┐
│  Complete the Scenario                  │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ [Video clip playing]            │   │
│  │                                 │   │
│  │ A customer approaches the       │   │
│  │ service desk looking upset...   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Instructions: Describe how you would   │
│  handle this situation. Include...      │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Your response:                  │   │
│  │                                 │   │
│  │ I would first acknowledge the   │   │
│  │ customer's frustration and...   │   │
│  │                                 │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Word count: 47 / 100 minimum           │
│                                         │
├─────────────────────────────────────────┤
│              [Submit Response]          │
└─────────────────────────────────────────┘
```

---

## 8. AI Scoring Integration

### 8.1 AI Provider Configuration

```typescript
interface AiScoringConfig {
  provider: 'openai' | 'anthropic' | 'custom';
  model: string;                 // e.g., 'gpt-4', 'claude-3'
  endpoint?: string;             // For custom providers
  apiKey: string;                // Encrypted

  // Scoring behavior
  maxTokens: number;
  temperature: number;           // Lower = more consistent

  // Fallback
  fallbackToKeywords: boolean;   // If AI unavailable
  cacheResults: boolean;         // Cache similar responses
  cacheTtl: number;              // Cache duration in seconds
}
```

### 8.2 Scoring Prompt Template

```typescript
const SCORING_PROMPT_TEMPLATE = `
You are an educational assessment scorer. Evaluate the following student response.

PROMPT:
{scenario}

INSTRUCTIONS:
{instructions}

MODEL ANSWER (for reference):
{modelAnswer}

STUDENT RESPONSE:
{studentResponse}

RUBRIC:
{aiRubric}

Provide your assessment in the following JSON format:
{
  "score": <0-100>,
  "confidence": <0-100>,
  "feedback": "<constructive feedback>",
  "strengths": ["<strength1>", "<strength2>"],
  "improvements": ["<improvement1>", "<improvement2>"],
  "coherenceScore": <0-100>,
  "relevanceScore": <0-100>,
  "completenessScore": <0-100>
}
`;
```

### 8.3 Hybrid Scoring

Final score combines keyword matching and AI assessment:

```typescript
function calculateFinalScore(
  keywordScore: number,
  aiResult: AiScoringResult,
  config: FinishTheStoryPrompt
): number {
  const keywordWeight = 100 - config.aiScoringWeight;
  const aiWeight = config.aiScoringWeight;

  return (
    (keywordScore * keywordWeight / 100) +
    (aiResult.score * aiWeight / 100)
  );
}
```

---

## 9. Database Schema Updates

### 9.1 Media Collection

```typescript
// MongoDB Schema
const MediaSchema = new Schema({
  storageKey: { type: String, required: true, unique: true },
  cdnUrl: { type: String, required: true },
  type: { type: String, enum: ['image', 'video', 'audio'], required: true },
  filename: { type: String, required: true },
  mimeType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  width: Number,
  height: Number,
  duration: Number,
  altText: String,
  transcript: String,
  captions: [{
    language: String,
    label: String,
    storageKey: String,
    cdnUrl: String,
    isDefault: Boolean
  }],
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now },
  exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise' },
  purpose: { type: String, enum: ['question', 'answer', 'hint', 'explanation'] }
});
```

### 9.2 Flashcard Progress Collection

```typescript
const FlashcardProgressSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true },
  cardId: { type: String, required: true },
  timesCorrect: { type: Number, default: 0 },
  timesIncorrect: { type: Number, default: 0 },
  lastReviewed: Date,
  nextReviewDate: Date,
  mastered: { type: Boolean, default: false },
  easeFactor: { type: Number, default: 2.5 }  // For spaced repetition algorithm
});

// Compound index for efficient queries
FlashcardProgressSchema.index({ userId: 1, exerciseId: 1, cardId: 1 }, { unique: true });
```

---

## 10. Permissions

| Action | Roles |
|--------|-------|
| Create exercise with media | Staff, Admin |
| Upload media | Staff, Admin |
| Delete media | Uploader, Admin |
| View exercise with media | Enrolled learner, Staff, Admin |
| Take exercise | Enrolled learner |
| View AI scoring details | Staff, Admin |
| Configure AI scoring | Admin |

---

## 11. Implementation Phases

### Phase 1: Media Infrastructure
- [ ] Media upload/storage integration
- [ ] CDN configuration
- [ ] MediaContent type and display components
- [ ] MediaUploader component

### Phase 2: Flashcard Exercise
- [ ] Flashcard data model
- [ ] FlashcardBuilder component
- [ ] FlashcardPlayer component
- [ ] Spaced repetition algorithm
- [ ] Progress tracking

### Phase 3: Matching Exercise
- [ ] Matching data model
- [ ] MatchingBuilder component
- [ ] MatchingPlayer with drag-drop
- [ ] Accessibility support

### Phase 4: Finish the Story Exercise
- [ ] Prose exercise data model
- [ ] FinishTheStoryBuilder component
- [ ] Keyword scoring engine
- [ ] AI scoring integration
- [ ] FinishTheStoryPlayer component

### Phase 5: Enhanced Question Types
- [ ] Add ordering, hotspot, drag_drop question types
- [ ] Update question bank UI
- [ ] Update exercise builder

---

## 12. Open Questions

1. **AI Scoring Provider**: Which AI provider should be primary? OpenAI GPT-4, Anthropic Claude, or support multiple?

2. **Media Storage**: Should we use a single bucket for all media or separate by organization/department?

3. **Offline Support**: Should flashcards support offline mode with sync?

4. **Media Moderation**: Should uploaded media go through content moderation (AWS Rekognition, etc.)?

5. **Spaced Repetition Algorithm**: Use SM-2 (Anki-style) or a simpler fixed-interval approach?

---

## Appendix A: Spaced Repetition Algorithm (SM-2)

```typescript
/**
 * SM-2 Algorithm for flashcard scheduling
 */
function calculateNextReview(
  quality: number,      // 0-5 response quality (0=complete blackout, 5=perfect)
  repetitions: number,
  easeFactor: number,
  interval: number
): { nextInterval: number; newEaseFactor: number; newRepetitions: number } {

  let newEaseFactor = easeFactor;
  let newRepetitions = repetitions;
  let nextInterval = interval;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      nextInterval = 1;
    } else if (repetitions === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(interval * easeFactor);
    }
    newRepetitions = repetitions + 1;
  } else {
    // Incorrect response - reset
    newRepetitions = 0;
    nextInterval = 1;
  }

  // Update ease factor
  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  return { nextInterval, newEaseFactor, newRepetitions };
}
```

---

*End of Specification*
