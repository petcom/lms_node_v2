# Prerequisite System - Core Design Document

**Document Type:** Core System Design
**Created:** 2026-01-16
**Status:** DRAFT - Awaiting Approval
**Priority:** CRITICAL - Phase 1 (Foundation)
**Feature Type:** CORE/FREE (Always Available)
**Related Documents:**
- CONTENT_UNLOCKING_ARCHITECTURE.md (Read first for context)
- PREREQUISITE_SYSTEM_IMPLEMENTATION_PLAN.md (Implementation)
- PREREQUISITE_SYSTEM_UI_CHANGES.md (UI specification)

---

## Executive Summary

This document defines the **core prerequisite-based content unlocking system** for CadenceLMS. This is the foundation of learner progression and is **always enabled** for all institutions.

**Key Principles:**
1. **Self-Paced Learning:** Learners control their own pace within class deadlines
2. **Completion-Driven:** Content unlocks based on completing prior content, not dates
3. **Prerequisite Enforcement:** Must complete Module 1 before Module 2
4. **Flexible Deadlines:** Class-level deadline with per-learner extensions
5. **Progress Tracking:** Learners see what's locked, why, and how to unlock it

**NOT in Core System:**
- Time-based restrictions (see TIME_PACING_PREMIUM_FEATURE.md)
- Cohort scheduling
- Fixed release dates

---

## Problem Statement

### Current Pain Points
- No way to enforce "complete Module 1 before Module 2"
- Learners can jump ahead without mastering basics
- No visibility into why content is locked
- Instructors can't require minimum scores to proceed
- No structured learning paths

### Desired State
- **Sequential Learning:** Content unlocks in logical order
- **Mastery-Based:** Require 70% on Quiz 1 to unlock Assignment 1
- **Clear Communication:** Learners see "Complete Module 1 (80%) to unlock Module 2"
- **Flexible Paths:** Support multiple prerequisite patterns
- **Self-Paced:** No time restrictions, only completion requirements

---

## Use Cases

### UC-1: Sequential Module Progression

**Scenario:** Programming course requires completing modules in order

**Setup:**
- Module 1: Intro to Programming (no prerequisites)
- Module 2: Variables (requires Module 1 completion)
- Module 3: Control Flow (requires Module 2 completion)
- Module 4: Functions (requires Module 3 completion)

**Learner Experience:**
- Day 1: Starts Module 1
- Day 3: Completes Module 1 → Module 2 unlocks
- Day 7: Completes Module 2 → Module 3 unlocks
- Day 14: Completes Module 3 → Module 4 unlocks

**Key Feature:** Simple sequential progression

---

### UC-2: Score-Based Unlocking

**Scenario:** Must pass quiz before accessing assignment

**Setup:**
- Quiz 1: Basic Concepts (no prerequisites)
- Assignment 1: Requires Quiz 1 with ≥70% score
- Quiz 2: Advanced Concepts (requires Assignment 1 completion)

**Learner Experience:**
- Day 1: Takes Quiz 1, scores 65% → Assignment 1 still locked
- Day 2: Retakes Quiz 1, scores 75% → Assignment 1 unlocks
- Day 3: Completes Assignment 1 → Quiz 2 unlocks

**Key Feature:** Minimum score requirements

---

### UC-3: Multiple Prerequisites (AND logic)

**Scenario:** Final exam requires all modules completed

**Setup:**
- Final Exam: Requires:
  - Module 1 completed
  - Module 2 completed
  - Module 3 completed
  - All assignments submitted

**Learner Experience:**
- Week 8: Completes Module 3 but hasn't done Assignment 2
- Final Exam: Still locked
- Message: "Complete 1 more prerequisite to unlock Final Exam"
- Week 9: Submits Assignment 2 → Final Exam unlocks

**Key Feature:** Multiple specific prerequisites (all required)

---

### UC-4: Flexible Prerequisites (OR logic)

**Scenario:** Must complete ANY 3 of 5 practice exercises

**Setup:**
- Module 2: Requires any 3 of:
  - Practice Exercise 1
  - Practice Exercise 2
  - Practice Exercise 3
  - Practice Exercise 4
  - Practice Exercise 5

**Learner Experience:**
- Completes Exercise 1, 2, 3 → Module 2 unlocks
- Did not complete Exercise 4, 5 → That's OK

**Key Feature:** "Any N of M" logic for flexibility

---

### UC-5: Late Enrollment with Extensions

**Scenario:** Learner enrolls late, needs extra time

**Setup:**
- Class: Jan 15 - Apr 15 (3 months)
- Learner enrolls: Feb 15 (1 month late)
- All content available immediately (no time restrictions)
- Extension granted: New deadline May 15

**Learner Experience:**
- Feb 15: Enrolls, can start any unlocked content immediately
- Feb-May: Works through all modules at own pace
- May 15: Extended deadline (instead of Apr 15)

**Key Feature:** Self-paced + flexible deadlines

---

## Data Model

### CourseContent Model (Enhanced)

**New Fields:**

```typescript
interface ICourseContent {
  // ... existing fields ...

  // NEW: Prerequisite configuration
  prerequisites?: {
    // Prerequisite type
    type: 'none' | 'sequential' | 'specific' | 'any-of';

    // Type: sequential
    // Content unlocks only after previous content in sequence is completed
    sequential?: {
      enabled: boolean;
      mustComplete: boolean;         // Just complete (any score)
      minimumScore?: number;          // e.g., 70%
      mustPass?: boolean;             // Score >= content's passing score
    };

    // Type: specific
    // Content requires specific items to be completed
    specific?: {
      contentIds: ObjectId[];         // Specific content that must be completed
      requireAll: boolean;            // true = AND logic, false = OR logic
      minimumScore?: number;          // Optional: require minimum score
      mustPass?: boolean;             // Optional: must pass all
    };

    // Type: any-of
    // Content requires completing N of M items
    anyOf?: {
      contentIds: ObjectId[];         // Pool of content items
      minimumRequired: number;        // e.g., "complete any 3 of 5"
      minimumScore?: number;          // Optional: require minimum score
    };
  };

  // Suggested (but not enforced) timeline
  suggestedWeek?: number;            // "Try to complete by Week 2" (advisory)
  estimatedDuration?: number;        // Minutes (for progress estimates)
}
```

**Examples:**

```typescript
// Sequential: Must complete previous content
{
  prerequisites: {
    type: 'sequential',
    sequential: {
      enabled: true,
      mustComplete: true,
      minimumScore: 70
    }
  }
}

// Specific: Requires Module 1 AND Module 2
{
  prerequisites: {
    type: 'specific',
    specific: {
      contentIds: [moduleId1, moduleId2],
      requireAll: true,
      minimumScore: 80
    }
  }
}

// Any-of: Complete any 3 of 5 exercises
{
  prerequisites: {
    type: 'any-of',
    anyOf: {
      contentIds: [ex1, ex2, ex3, ex4, ex5],
      minimumRequired: 3
    }
  }
}
```

---

### ClassEnrollment Model (Enhanced)

**New Fields:**

```typescript
interface IClassEnrollment {
  // ... existing fields ...

  // NEW: Deadline management
  customEndDate?: Date;              // Override class end date for this learner
  extensionGrantedBy?: ObjectId;     // Admin who granted extension
  extensionReason?: string;          // "Late enrollment", "Medical leave", etc.
  extensionGrantedAt?: Date;         // When extension was granted

  // NEW: Prerequisite override requests
  prerequisiteOverrides?: [{
    contentId: ObjectId;             // Content requesting access to
    requestedBy: ObjectId;           // Instructor who requested
    requestedAt: Date;
    requestReason: string;
    status: 'pending' | 'approved' | 'denied';
    reviewedBy?: ObjectId;           // Dept-admin who approved/denied
    reviewedAt?: Date;
    reviewNotes?: string;
  }];
}
```

---

### Department Model (Enhanced) - Progress Warning Configuration

**New Fields:**

```typescript
interface IDepartment {
  // ... existing fields ...

  // NEW: Progress warning configuration
  progressWarnings?: {
    enabled: boolean;                // Enable/disable warnings
    thresholds: [{
      id: string;                    // Unique ID for threshold
      name: string;                  // "Behind Pace", "At Risk", etc.
      severity: 'info' | 'warning' | 'critical';
      condition: {
        type: 'time-elapsed' | 'content-remaining' | 'custom';

        // For time-elapsed
        timeElapsedPercent?: number;  // e.g., 50% of class time passed
        contentCompletePercent?: number; // e.g., but only 30% complete

        // For content-remaining
        daysRemaining?: number;        // e.g., < 14 days left
        contentRemainingPercent?: number; // e.g., > 40% remaining

        // Custom formula (evaluated)
        customFormula?: string;        // e.g., "daysRemaining < (contentRemaining * 2)"
      };
      message: string;                 // Message shown to learner
      actionPrompt?: string;           // e.g., "Contact your instructor"
      notifyInstructor?: boolean;      // Send alert to instructor
    }];
  };
}
```

**Example Warning Configuration:**

```typescript
{
  enabled: true,
  thresholds: [
    {
      id: 'behind-pace',
      name: 'Behind Suggested Pace',
      severity: 'info',
      condition: {
        type: 'time-elapsed',
        timeElapsedPercent: 50,
        contentCompletePercent: 30
      },
      message: 'You have completed 30% of content with 50% of time elapsed. Consider increasing your pace.',
      actionPrompt: 'Review your progress and plan your schedule',
      notifyInstructor: false
    },
    {
      id: 'at-risk',
      name: 'At Risk of Not Completing',
      severity: 'warning',
      condition: {
        type: 'content-remaining',
        daysRemaining: 14,
        contentRemainingPercent: 40
      },
      message: 'You have 40% of content remaining with only 2 weeks left. You may need assistance.',
      actionPrompt: 'Contact your instructor for support',
      notifyInstructor: true
    },
    {
      id: 'critical',
      name: 'Urgent Action Required',
      severity: 'critical',
      condition: {
        type: 'content-remaining',
        daysRemaining: 7,
        contentRemainingPercent: 30
      },
      message: 'Critical: 30% of content remaining with only 1 week left. Immediate action required.',
      actionPrompt: 'Schedule meeting with instructor immediately',
      notifyInstructor: true
    }
  ]
}
```

---

### ContentAttempt Model (Already Exists)

**Existing model tracks completion - no changes needed:**

```typescript
interface IContentAttempt {
  learnerId: ObjectId;
  contentId: ObjectId;
  classId: ObjectId;
  status: 'not-started' | 'in-progress' | 'completed' | 'failed';
  score?: number;
  passed?: boolean;
  completedAt?: Date;
  // ... other fields
}
```

**This model already has everything we need for prerequisite checking!**

---

## Business Logic

### Prerequisite Checking Algorithm

```typescript
async function checkPrerequisites(
  learnerId: ObjectId,
  classId: ObjectId,
  courseContent: ICourseContent
): Promise<{ met: boolean; missing?: PrerequisiteInfo[] }> {

  // No prerequisites = always accessible
  if (!courseContent.prerequisites || courseContent.prerequisites.type === 'none') {
    return { met: true };
  }

  const prereqs = courseContent.prerequisites;

  // Check sequential prerequisites
  if (prereqs.type === 'sequential') {
    return await checkSequentialPrerequisites(
      learnerId,
      classId,
      courseContent,
      prereqs.sequential
    );
  }

  // Check specific prerequisites
  if (prereqs.type === 'specific') {
    return await checkSpecificPrerequisites(
      learnerId,
      classId,
      prereqs.specific
    );
  }

  // Check any-of prerequisites
  if (prereqs.type === 'any-of') {
    return await checkAnyOfPrerequisites(
      learnerId,
      classId,
      prereqs.anyOf
    );
  }

  return { met: true };
}
```

---

### Sequential Prerequisites

```typescript
async function checkSequentialPrerequisites(
  learnerId: ObjectId,
  classId: ObjectId,
  currentContent: ICourseContent,
  config: SequentialConfig
): Promise<PrerequisiteCheckResult> {

  // Get previous content in sequence
  const previousContent = await CourseContent.findOne({
    courseId: currentContent.courseId,
    sequence: currentContent.sequence - 1
  });

  if (!previousContent) {
    return { met: true };  // First item in sequence
  }

  // Check if previous content is completed
  const attempt = await ContentAttempt.findOne({
    learnerId,
    classId,
    contentId: previousContent.contentId,
    status: 'completed'
  });

  if (!attempt) {
    return {
      met: false,
      missing: [{
        contentId: previousContent.contentId,
        contentTitle: previousContent.title,
        reason: 'Must complete previous content in sequence'
      }]
    };
  }

  // Check score requirements
  if (config.minimumScore && attempt.score < config.minimumScore) {
    return {
      met: false,
      missing: [{
        contentId: previousContent.contentId,
        contentTitle: previousContent.title,
        reason: `Must score at least ${config.minimumScore}% (current: ${attempt.score}%)`
      }]
    };
  }

  return { met: true };
}
```

---

### Specific Prerequisites

```typescript
async function checkSpecificPrerequisites(
  learnerId: ObjectId,
  classId: ObjectId,
  config: SpecificConfig
): Promise<PrerequisiteCheckResult> {

  const attempts = await ContentAttempt.find({
    learnerId,
    classId,
    contentId: { $in: config.contentIds },
    status: 'completed'
  });

  const completedIds = attempts.map(a => a.contentId.toString());
  const missingIds = config.contentIds.filter(
    id => !completedIds.includes(id.toString())
  );

  // Check if all required (AND logic)
  if (config.requireAll && missingIds.length > 0) {
    const missingContent = await CourseContent.find({
      contentId: { $in: missingIds }
    });

    return {
      met: false,
      missing: missingContent.map(c => ({
        contentId: c.contentId,
        contentTitle: c.title,
        reason: 'Required to unlock this content'
      }))
    };
  }

  // Check if any required (OR logic)
  if (!config.requireAll && completedIds.length === 0) {
    return {
      met: false,
      missing: [{
        reason: 'Must complete at least one of the prerequisite items'
      }]
    };
  }

  // Check score requirements
  if (config.minimumScore) {
    const failedScore = attempts.find(a => a.score < config.minimumScore);
    if (failedScore) {
      return {
        met: false,
        missing: [{
          reason: `Minimum score of ${config.minimumScore}% required on all prerequisites`
        }]
      };
    }
  }

  return { met: true };
}
```

---

### Any-Of Prerequisites

```typescript
async function checkAnyOfPrerequisites(
  learnerId: ObjectId,
  classId: ObjectId,
  config: AnyOfConfig
): Promise<PrerequisiteCheckResult> {

  const attempts = await ContentAttempt.find({
    learnerId,
    classId,
    contentId: { $in: config.contentIds },
    status: 'completed'
  });

  // Check if enough completed
  if (attempts.length < config.minimumRequired) {
    return {
      met: false,
      missing: [{
        reason: `Must complete at least ${config.minimumRequired} of ${config.contentIds.length} items (completed: ${attempts.length})`
      }]
    };
  }

  // Check score requirements
  if (config.minimumScore) {
    const qualifyingAttempts = attempts.filter(
      a => a.score >= config.minimumScore
    );

    if (qualifyingAttempts.length < config.minimumRequired) {
      return {
        met: false,
        missing: [{
          reason: `Must complete ${config.minimumRequired} items with ${config.minimumScore}% or higher`
        }]
      };
    }
  }

  return { met: true };
}
```

---

## Access Control Flow

### Complete Access Check (Core System Only)

```typescript
async function canAccessContent(
  learnerId: ObjectId,
  contentId: ObjectId,
  classId: ObjectId
): Promise<AccessCheckResult> {

  // 1. Check enrollment
  const enrollment = await ClassEnrollment.findOne({
    learnerId,
    classId,
    status: { $in: ['enrolled', 'active'] }
  });

  if (!enrollment) {
    return {
      canAccess: false,
      reason: 'not-enrolled',
      message: 'You are not enrolled in this class'
    };
  }

  // 2. Check class deadline
  const classDoc = await Class.findById(classId);
  const deadline = enrollment.customEndDate || classDoc.endDate;

  if (new Date() > deadline) {
    return {
      canAccess: false,
      reason: 'deadline-passed',
      message: 'Class deadline has passed',
      deadline: deadline
    };
  }

  // 3. Check if class is active
  if (!classDoc.isActive) {
    return {
      canAccess: false,
      reason: 'class-inactive',
      message: 'This class is not currently active'
    };
  }

  // 4. Check prerequisites
  const courseContent = await CourseContent.findOne({ contentId });

  if (courseContent.prerequisites) {
    const prereqCheck = await checkPrerequisites(
      learnerId,
      classId,
      courseContent
    );

    if (!prereqCheck.met) {
      return {
        canAccess: false,
        reason: 'prerequisites-not-met',
        message: 'You must complete prerequisites first',
        missingPrerequisites: prereqCheck.missing
      };
    }
  }

  // All checks passed
  return {
    canAccess: true,
    deadline: deadline
  };
}
```

---

## API Endpoints

### 1. Check Content Access Status

```
GET /api/v2/classes/:classId/content/:contentId/access-status
```

**Purpose:** Check if learner can access content and why/why not

**Response (Accessible):**
```json
{
  "success": true,
  "data": {
    "canAccess": true,
    "deadline": "2026-04-15T23:59:59Z",
    "customDeadline": false
  }
}
```

**Response (Locked by Prerequisites):**
```json
{
  "success": true,
  "data": {
    "canAccess": false,
    "reason": "prerequisites-not-met",
    "message": "You must complete prerequisites first",
    "missingPrerequisites": [
      {
        "contentId": "507f...",
        "contentTitle": "Module 1: Introduction",
        "reason": "Must complete with 70% or higher",
        "currentScore": 65,
        "requiredScore": 70
      }
    ]
  }
}
```

---

### 2. Get Learner Progress

```
GET /api/v2/classes/:classId/progress
```

**Purpose:** Get learner's progress, what's accessible, what's locked

**Response:**
```json
{
  "success": true,
  "data": {
    "classId": "507f...",
    "className": "CS101 - Spring 2026",
    "enrollment": {
      "enrolledAt": "2026-01-15T00:00:00Z",
      "deadline": "2026-04-15T23:59:59Z",
      "customDeadline": false,
      "daysRemaining": 75
    },
    "progress": {
      "totalContent": 45,
      "completed": 12,
      "inProgress": 3,
      "locked": 30,
      "percentComplete": 27
    },
    "modules": [
      {
        "moduleNumber": 1,
        "moduleName": "Introduction",
        "status": "completed",
        "content": [
          {
            "contentId": "507f...",
            "title": "Welcome Video",
            "status": "completed",
            "score": 100,
            "completedAt": "2026-01-16T10:30:00Z"
          }
        ]
      },
      {
        "moduleNumber": 2,
        "moduleName": "Variables",
        "status": "in-progress",
        "content": [
          {
            "contentId": "507f...",
            "title": "Variables Lesson",
            "status": "in-progress",
            "score": null
          },
          {
            "contentId": "507f...",
            "title": "Assignment 1",
            "status": "locked",
            "reason": "Complete Variables Lesson first"
          }
        ]
      },
      {
        "moduleNumber": 3,
        "moduleName": "Control Flow",
        "status": "locked",
        "reason": "Complete Module 2 first"
      }
    ],
    "warnings": [
      {
        "type": "behind-pace",
        "message": "You have 30 items remaining with 75 days left",
        "severity": "info"
      }
    ]
  }
}
```

---

### 3. Extend Class Deadline (Admin Only)

```
POST /api/v2/classes/:classId/enrollments/:enrollmentId/extend-deadline
```

**Purpose:** Grant deadline extension to specific learner

**Request:**
```json
{
  "newDeadline": "2026-05-15T23:59:59Z",
  "reason": "Late enrollment - needs extra time to complete coursework"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enrollmentId": "507f...",
    "learnerId": "507f...",
    "learnerName": "John Doe",
    "originalDeadline": "2026-04-15T23:59:59Z",
    "newDeadline": "2026-05-15T23:59:59Z",
    "extensionDays": 30,
    "grantedBy": "507f...",
    "grantedAt": "2026-02-15T10:00:00Z",
    "reason": "Late enrollment - needs extra time to complete coursework"
  },
  "message": "Deadline extended successfully"
}
```

**Authorization:** `classes:manage` OR `enrollments:update` (dept-admin, enrollment-admin, system-admin)

---

### 4. Configure Content Prerequisites

```
PUT /api/v2/courses/:courseId/content/:courseContentId/prerequisites
```

**Purpose:** Configure prerequisite rules for content

**Request (Sequential):**
```json
{
  "type": "sequential",
  "sequential": {
    "enabled": true,
    "mustComplete": true,
    "minimumScore": 70
  }
}
```

**Request (Specific):**
```json
{
  "type": "specific",
  "specific": {
    "contentIds": ["507f1...", "507f2..."],
    "requireAll": true,
    "minimumScore": 80
  }
}
```

**Request (Any-Of):**
```json
{
  "type": "any-of",
  "anyOf": {
    "contentIds": ["507f1...", "507f2...", "507f3...", "507f4...", "507f5..."],
    "minimumRequired": 3,
    "minimumScore": 70
  }
}
```

**Authorization:** `courses:update` (content-admin, dept-admin, system-admin)

---

### 5. Get Course Prerequisite Map

```
GET /api/v2/courses/:courseId/prerequisites/map
```

**Purpose:** Get visual map of all prerequisites in course

**Response:**
```json
{
  "success": true,
  "data": {
    "courseId": "507f...",
    "courseName": "CS101 - Intro to Programming",
    "prerequisiteGraph": [
      {
        "contentId": "507f1...",
        "title": "Module 1: Intro",
        "sequence": 1,
        "prerequisites": null,
        "unlocks": ["507f2..."]
      },
      {
        "contentId": "507f2...",
        "title": "Module 2: Variables",
        "sequence": 2,
        "prerequisites": {
          "type": "sequential",
          "requires": ["Module 1: Intro"]
        },
        "unlocks": ["507f3..."]
      }
    ]
  }
}
```

**Purpose:** Allows UI to show prerequisite flow diagram

---

### 6. Request Prerequisite Override (Instructor)

```
POST /api/v2/classes/:classId/enrollments/:enrollmentId/prerequisite-override/request
```

**Purpose:** Instructor requests exception for learner to access locked content

**Request:**
```json
{
  "contentId": "507f...",
  "reason": "Learner demonstrated proficiency through alternative assessment"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overrideId": "507f...",
    "status": "pending",
    "contentId": "507f...",
    "contentTitle": "Module 3: Advanced Topics",
    "requestedBy": "507f...",
    "requestedAt": "2026-02-15T10:00:00Z",
    "requiresApproval": true,
    "approver": "dept-admin"
  },
  "message": "Prerequisite override request submitted. Awaiting department admin approval."
}
```

**Authorization:** `classes:manage` OR instructor of class

**Note:** If instructor is also dept-admin, auto-approved

---

### 7. Approve/Deny Prerequisite Override (Dept-Admin)

```
POST /api/v2/classes/:classId/enrollments/:enrollmentId/prerequisite-override/:overrideId/review
```

**Purpose:** Dept-admin reviews and approves/denies override request

**Request:**
```json
{
  "action": "approve",
  "notes": "Approved based on instructor recommendation and learner's demonstrated skills"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overrideId": "507f...",
    "status": "approved",
    "reviewedBy": "507f...",
    "reviewedAt": "2026-02-15T14:30:00Z",
    "notes": "Approved based on instructor recommendation..."
  },
  "message": "Prerequisite override approved. Learner can now access content."
}
```

**Authorization:** Department admin of class's department

---

### 8. Get Prerequisite Override Requests

```
GET /api/v2/departments/:departmentId/prerequisite-overrides/pending
```

**Purpose:** Dept-admin sees all pending override requests

**Response:**
```json
{
  "success": true,
  "data": {
    "pending": 5,
    "requests": [
      {
        "overrideId": "507f...",
        "classId": "507f...",
        "className": "CS101 - Spring 2026",
        "learnerId": "507f...",
        "learnerName": "John Doe",
        "contentId": "507f...",
        "contentTitle": "Module 3",
        "requestedBy": "507f...",
        "instructorName": "Jane Smith",
        "requestedAt": "2026-02-15T10:00:00Z",
        "reason": "Learner demonstrated proficiency...",
        "daysWaiting": 2
      }
    ]
  }
}
```

---

### 9. Configure Progress Warnings (Dept-Admin)

```
PUT /api/v2/departments/:departmentId/progress-warnings
```

**Purpose:** Configure progress warning thresholds

**Request:**
```json
{
  "enabled": true,
  "thresholds": [
    {
      "id": "behind-pace",
      "name": "Behind Suggested Pace",
      "severity": "info",
      "condition": {
        "type": "time-elapsed",
        "timeElapsedPercent": 50,
        "contentCompletePercent": 30
      },
      "message": "You have completed 30% of content with 50% of time elapsed.",
      "actionPrompt": "Review your progress",
      "notifyInstructor": false
    }
  ]
}
```

**Authorization:** `departments:update` (dept-admin)

---

### 10. Get Progress Warnings for Learner

```
GET /api/v2/classes/:classId/progress/warnings
```

**Purpose:** Get active warnings for current learner

**Response:**
```json
{
  "success": true,
  "data": {
    "warnings": [
      {
        "id": "behind-pace",
        "name": "Behind Suggested Pace",
        "severity": "info",
        "message": "You have completed 30% of content with 50% of time elapsed.",
        "actionPrompt": "Review your progress",
        "triggeredAt": "2026-02-15T00:00:00Z"
      }
    ],
    "stats": {
      "timeElapsedPercent": 50,
      "contentCompletePercent": 30,
      "daysRemaining": 45,
      "contentRemaining": 31
    }
  }
}
```

---

### 11. Get Prerequisite Flow Diagram Data

```
GET /api/v2/courses/:courseId/prerequisites/flow-diagram
```

**Purpose:** Get data for rendering prerequisite flow diagram

**Response:**
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "507f1...",
        "title": "Module 1: Intro",
        "sequence": 1,
        "type": "module",
        "prerequisites": null,
        "position": { "x": 0, "y": 0 }
      },
      {
        "id": "507f2...",
        "title": "Module 2: Variables",
        "sequence": 2,
        "type": "module",
        "prerequisites": {
          "type": "sequential",
          "minimumScore": 70
        },
        "position": { "x": 200, "y": 0 }
      }
    ],
    "edges": [
      {
        "from": "507f1...",
        "to": "507f2...",
        "label": "Complete with 70%",
        "type": "sequential"
      }
    ],
    "issues": [
      {
        "type": "orphaned",
        "contentId": "507f3...",
        "message": "Content has no path from starting point"
      }
    ]
  }
}
```

**Authorization:** `courses:read` (content-admin, instructor)

---

## Edge Cases & Solutions

### Edge Case 1: Circular Prerequisites

**Problem:** Content A requires B, B requires A (circular dependency)

**Solution:**
- Validation at save time
- Check for circular dependencies when setting prerequisites
- Return error: "Circular prerequisite detected"

---

### Edge Case 2: Orphaned Content

**Problem:** Content has prerequisite that no longer exists

**Solution:**
- Validation when content is deleted
- Warn: "This content is a prerequisite for 3 other items"
- Option: Remove prerequisites or block deletion

---

### Edge Case 3: Retroactive Prerequisite Changes

**Problem:** Instructor adds prerequisites to course with active classes

**Solution: Course Versioning**
- Changing prerequisites creates a NEW course version
- Active classes remain on old version (prerequisites unchanged)
- New classes use new version with new prerequisites
- System-admin can force version change (not recommended)

**Implementation:**
```typescript
interface ICourse {
  // ... existing fields ...
  version: number;                    // Course version number
  isCurrentVersion: boolean;          // Only one current version per course
  previousVersionId?: ObjectId;       // Links to previous version
  versionCreatedAt: Date;
  versionCreatedBy: ObjectId;
  versionChangeReason?: string;       // Why version was created
}

interface IClass {
  // ... existing fields ...
  courseId: ObjectId;                 // Links to specific course version
  courseVersion: number;              // Snapshot of version at class creation
}
```

**Version Change Rules:**
- Content-admin changes prerequisites → New version created automatically
- Warning: "This will create a new course version. Active classes will continue using v1."
- System-admin can manually migrate classes to new version (bulk operation)

---

### Edge Case 4: Score Changed After Unlock

**Problem:** Learner scored 75% on Quiz 1, unlocked Module 2. Grade changed to 65%.

**Solution:**
- **Option A:** Keep Module 2 unlocked (once unlocked, stays unlocked)
- **Option B:** Re-lock Module 2, notify learner
- **Recommended:** Option A (less disruptive)

---

## Performance Considerations

### Caching Strategy

```typescript
// Cache prerequisite checks for 5 minutes
const cacheKey = `prereq:${learnerId}:${contentId}:${classId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const result = await checkPrerequisites(...);
await redis.setex(cacheKey, 300, JSON.stringify(result));
```

---

### Database Indexes

```javascript
// CourseContent
courseContentSchema.index({ courseId: 1, sequence: 1 });
courseContentSchema.index({ 'prerequisites.specific.contentIds': 1 });

// ContentAttempt
contentAttemptSchema.index({ learnerId: 1, classId: 1, contentId: 1 });
contentAttemptSchema.index({ learnerId: 1, classId: 1, status: 1 });

// ClassEnrollment
classEnrollmentSchema.index({ learnerId: 1, classId: 1 });
classEnrollmentSchema.index({ classId: 1, status: 1 });
```

---

## Testing Strategy

### Unit Tests
- Sequential prerequisite logic
- Specific prerequisite logic (AND/OR)
- Any-of prerequisite logic
- Score requirement checks
- Deadline checks

### Integration Tests
- Learner completes Module 1 → Module 2 unlocks
- Learner scores 65% → Next content stays locked
- Learner scores 75% → Next content unlocks
- Admin extends deadline → New deadline applied
- Instructor adds prerequisites → Applied correctly

### E2E Tests
- Complete learning path with prerequisites
- Retry quiz until passing score unlocks next content
- Late enrollment with extended deadline
- Progress tracking reflects current state

---

## Success Metrics

### Technical Metrics
- Prerequisite check latency < 50ms (p95)
- Cache hit rate > 80%
- Zero circular dependencies in production

### User Experience Metrics
- Learners understand why content is locked (survey: >80% clarity)
- Prerequisite completion rate (learners complete prerequisites >90%)
- Instructor satisfaction with prerequisite controls

### Learning Outcomes
- Improved pass rates with prerequisite enforcement
- Reduced support tickets ("why can't I access this?")
- Higher course completion rates

---

## Approved Design Decisions

1. **Retroactive Prerequisites:** ✅ Course versioning - changes create new version, active classes stay on old version
2. **Prerequisite Visualization:** ✅ Flow diagram for proofing prerequisites (instructor/content-admin tool)
3. **Suggested Timeline:** ✅ Show advisory timeline (not enforced)
4. **Progress Warnings:** ✅ Customizable warning system (dept-admin/content-admin configure thresholds)
5. **Prerequisite Override:** ✅ Instructor requests → dept-admin approves (instructor who is dept-admin can self-approve)

---

## Approval Checklist

- [ ] Prerequisite types (sequential, specific, any-of) approved
- [ ] Data model approved
- [ ] API endpoints approved
- [ ] Edge case handling approved
- [ ] Open questions answered
- [ ] Ready for implementation planning

---

## Next Steps

1. Human approves this design
2. Answer open questions
3. Create implementation plan (PREREQUISITE_SYSTEM_IMPLEMENTATION_PLAN.md)
4. Create UI specification (PREREQUISITE_SYSTEM_UI_CHANGES.md)
5. Begin Phase 1 implementation

---

**END OF PREREQUISITE SYSTEM DESIGN**
