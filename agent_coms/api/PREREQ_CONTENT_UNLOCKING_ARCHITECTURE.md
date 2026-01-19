# Content Unlocking Architecture - System Overview

**Document Type:** Architecture & System Design
**Created:** 2026-01-16
**Status:** DRAFT - Awaiting Approval
**Priority:** Critical Foundation

---

## Executive Summary

This document defines the **two-tier content unlocking system** for CadenceLMS:

1. **Core System (Free/Default):** Prerequisite-based unlocking - learners progress at their own pace, controlled by completion requirements
2. **Premium Feature (Optional/Paid):** Time-based pacing - instructors can add date restrictions on top of prerequisite requirements

**Design Principle:** The prerequisite system is the foundation. Time-based pacing is an optional layer that can be enabled per institution or per class.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Content Access Engine                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  CORE LAYER (Always Active - Free)                    │  │
│  │                                                        │  │
│  │  ✓ Class enrollment check                             │  │
│  │  ✓ Class deadline check (Class.endDate)               │  │
│  │  ✓ Prerequisite completion check                      │  │
│  │  ✓ Course sequence enforcement                        │  │
│  │                                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                            ▲                                  │
│                            │                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  PREMIUM LAYER (Optional - Feature Flag)              │  │
│  │                                                        │  │
│  │  ✓ Time-based availability windows                    │  │
│  │  ✓ Cohort scheduling                                  │  │
│  │  ✓ Instructor date overrides                          │  │
│  │                                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                             ▼
                    Access Decision: ALLOW / DENY
                    (with specific reason)
```

---

## Core vs Premium: Feature Comparison

| Feature | Core (Free) | Premium (Paid) | Notes |
|---------|-------------|----------------|-------|
| **Prerequisite Unlocking** | ✅ | ✅ | Complete Module 1 to unlock Module 2 |
| **Completion-Based** | ✅ | ✅ | Score ≥70% to unlock next content |
| **Class Deadline** | ✅ | ✅ | All work due by Class.endDate |
| **Deadline Extensions** | ✅ | ✅ | Admin extends deadline per learner |
| **Self-Paced Learning** | ✅ | ✅ | Learner controls their pace |
| **Progress Warnings** | ✅ | ✅ | "You're behind suggested pace" |
| **Time-Based Restrictions** | ❌ | ✅ | "Module 2 opens Jan 22" |
| **Cohort Scheduling** | ❌ | ✅ | Different dates per cohort |
| **Instructor Date Control** | ❌ | ✅ | Instructor sets availability windows |
| **Fixed Release Dates** | ❌ | ✅ | "Assignment 2 releases Week 3" |

---

## How They Work Together

### Scenario 1: Core System Only (Default)

**Course Setup:**
- Module 1: No prerequisites (always available)
- Module 2: Requires Module 1 completion (80% minimum)
- Module 3: Requires Module 2 completion
- Final Exam: Requires all modules completed

**Class Setup:**
- Start Date: Jan 15, 2026
- End Date: Apr 15, 2026 (3 months)

**Learner Experience:**
- Jan 15: Enrolls, can immediately start Module 1
- Jan 20: Completes Module 1 with 85% → Module 2 unlocks
- Feb 1: Completes Module 2 with 90% → Module 3 unlocks
- Mar 15: Completes Module 3 → Final Exam unlocks
- Apr 10: Completes Final Exam (5 days before deadline)

**Access Rules:**
1. ✅ Enrolled in class
2. ✅ Before Class.endDate
3. ✅ Prerequisites met (or not required)
4. → **ALLOW ACCESS**

---

### Scenario 2: Core + Premium (Optional Feature Enabled)

**Course Setup (Same as above, PLUS):**
- Module 1: Available immediately
- Module 2: Available Week 2 (Jan 22) AND requires Module 1 completion
- Module 3: Available Week 4 (Feb 5) AND requires Module 2 completion
- Final Exam: Available Week 10 (Mar 15) AND requires all modules

**Class Setup:**
- Start Date: Jan 15, 2026
- End Date: Apr 15, 2026
- Premium Pacing: ENABLED

**Learner Experience:**
- Jan 15: Enrolls, can start Module 1
- Jan 16: Completes Module 1 with 85% → Module 2 still locked (date restriction)
- Jan 22: Module 2 unlocks (both time + completion requirements met)
- Jan 25: Completes Module 2 → Module 3 still locked until Feb 5
- Feb 5: Module 3 unlocks
- Mar 15: Final Exam becomes available

**Access Rules (Layered):**
1. ✅ Enrolled in class
2. ✅ Before Class.endDate
3. ✅ Prerequisites met (or not required)
4. ✅ Premium: Within time-based availability window
5. → **ALLOW ACCESS**

**If Premium check fails:**
- "Content available Jan 22 (you've completed prerequisites)"

---

## Data Model Design

### Core System: Prerequisite Data

**CourseContent Model (Enhanced):**
```typescript
interface ICourseContent {
  // ... existing fields ...

  // CORE: Prerequisite system
  prerequisites?: {
    type: 'sequential' | 'specific' | 'any' | 'none';

    // Sequential: Must complete previous content in sequence
    sequential?: boolean;

    // Specific: Must complete specific content items
    specificContentIds?: ObjectId[];

    // Any: Must complete any N items from a set
    anyOf?: {
      contentIds: ObjectId[];
      minimumRequired: number;  // e.g., "any 3 of 5"
    };

    // Completion criteria
    completionRequirement?: {
      mustComplete: boolean;        // Just complete (any score)
      minimumScore?: number;        // e.g., 70% to unlock next
      mustPass?: boolean;           // Score >= passing score
    };
  };

  // Suggested timeline (advisory only, not enforced)
  suggestedCompletionWeek?: number;  // "Try to complete by Week 2"
  estimatedDuration?: number;         // Minutes (for progress tracking)
}
```

**ClassEnrollment Model (Enhanced):**
```typescript
interface IClassEnrollment {
  // ... existing fields ...

  // CORE: Deadline management
  customEndDate?: Date;  // Override class end date for this learner
  extensionGrantedBy?: ObjectId;  // Admin who granted extension
  extensionReason?: string;
}
```

---

### Premium Feature: Time-Based Data

**CourseContent Model (Additional):**
```typescript
interface ICourseContent {
  // ... core fields above ...

  // PREMIUM: Time-based pacing (optional)
  timePacingConfig?: {
    enabled: boolean;  // Feature flag at content level
    type: 'fixed' | 'relative' | 'always-available';

    // Fixed dates
    fixedAvailableFrom?: Date;
    fixedAvailableUntil?: Date;

    // Relative (week-based)
    relativeStartDay?: number;
    relativeDurationDays?: number;
  };
}
```

**ClassContentSchedule Collection (Premium Only):**
```typescript
// Only created if Class.timePacingEnabled = true
interface IClassContentSchedule {
  classId: ObjectId;
  courseContentId: ObjectId;
  contentId: ObjectId;
  availableFrom: Date;
  availableUntil: Date | null;
  isOverridden: boolean;
  // ... see TIME_PACING_PREMIUM_FEATURE.md for full schema
}
```

**Class Model (Enhanced):**
```typescript
interface IClass {
  // ... existing fields ...

  // PREMIUM: Feature flag
  timePacingEnabled: boolean;  // Default: false
  pacingMode?: 'inherit' | 'custom';  // Only relevant if enabled
}
```

---

## Feature Flag Management

### System-Level Feature Flag

**Institution Model (or System Settings):**
```typescript
interface IInstitutionSettings {
  features: {
    timePacing: {
      enabled: boolean;        // Master switch
      availableTo: 'all' | 'paid-only';
      licenseKey?: string;     // For paid features
      enabledAt?: Date;
      expiresAt?: Date;        // For trial periods
    };
  };
}
```

### Class-Level Override

Even if institution has feature enabled, instructor can choose:
- **Use time pacing:** `Class.timePacingEnabled = true`
- **Use core only:** `Class.timePacingEnabled = false` (default)

---

## Access Control Logic

### Core Access Check (Always Executed)

```typescript
async function checkCoreAccess(
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
    return { canAccess: false, reason: 'Not enrolled' };
  }

  // 2. Check class deadline
  const classDoc = await Class.findById(classId);
  const deadline = enrollment.customEndDate || classDoc.endDate;

  if (new Date() > deadline) {
    return { canAccess: false, reason: 'Class deadline passed' };
  }

  // 3. Check prerequisites
  const courseContent = await CourseContent.findOne({ contentId });

  if (courseContent.prerequisites) {
    const prereqsMet = await checkPrerequisites(
      learnerId,
      classId,
      courseContent.prerequisites
    );

    if (!prereqsMet.passed) {
      return {
        canAccess: false,
        reason: 'Prerequisites not met',
        missingPrerequisites: prereqsMet.missing
      };
    }
  }

  return { canAccess: true };
}
```

---

### Premium Time Check (Conditional)

```typescript
async function checkTimeBasedAccess(
  contentId: ObjectId,
  classId: ObjectId
): Promise<AccessCheckResult> {

  // Check if feature is enabled
  const classDoc = await Class.findById(classId);

  if (!classDoc.timePacingEnabled) {
    return { canAccess: true };  // Skip time checks
  }

  // Get time-based schedule
  const schedule = await ClassContentSchedule.findOne({
    classId,
    contentId,
    isActive: true
  });

  if (!schedule) {
    return { canAccess: true };  // No schedule = always available
  }

  const now = new Date();

  if (now < schedule.availableFrom) {
    return {
      canAccess: false,
      reason: 'Content not yet available',
      availableAt: schedule.availableFrom
    };
  }

  if (schedule.availableUntil && now > schedule.availableUntil) {
    return {
      canAccess: false,
      reason: 'Content availability period ended'
    };
  }

  return { canAccess: true };
}
```

---

### Combined Access Check

```typescript
async function canAccessContent(
  learnerId: ObjectId,
  contentId: ObjectId,
  classId: ObjectId
): Promise<AccessCheckResult> {

  // LAYER 1: Core checks (always run)
  const coreCheck = await checkCoreAccess(learnerId, contentId, classId);

  if (!coreCheck.canAccess) {
    return coreCheck;  // Blocked by core rules
  }

  // LAYER 2: Premium time checks (conditional)
  const timeCheck = await checkTimeBasedAccess(contentId, classId);

  if (!timeCheck.canAccess) {
    return timeCheck;  // Blocked by time rules
  }

  // All checks passed
  return { canAccess: true };
}
```

---

## API Endpoint Strategy

### Core Endpoints (Always Available)

```
GET  /api/v2/classes/:classId/content/:contentId/access-status
     → Returns: enrollment, deadline, prerequisites status

POST /api/v2/classes/:classId/enrollments/:enrollmentId/extend-deadline
     → Admin extends deadline for specific learner

GET  /api/v2/classes/:classId/progress
     → Learner progress, prerequisites met/unmet

PUT  /api/v2/courses/:courseId/content/:contentId/prerequisites
     → Configure prerequisite rules
```

---

### Premium Endpoints (Feature Flag Protected)

```
GET  /api/v2/classes/:classId/content-schedule
     → 403 if feature not enabled

POST /api/v2/classes/:classId/enable-time-pacing
     → 403 if institution doesn't have feature

PUT  /api/v2/classes/:classId/content-schedule/:scheduleId
     → Instructor override (premium only)
```

**Middleware:**
```typescript
export const requirePremiumFeature = (featureName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const institution = await getInstitution();

    if (!institution.features[featureName].enabled) {
      throw new ApiError(
        403,
        `Feature '${featureName}' not available. Contact admin to enable.`,
        { upgradeRequired: true }
      );
    }

    next();
  };
};

// Usage
router.get(
  '/classes/:classId/content-schedule',
  authenticate,
  requirePremiumFeature('timePacing'),  // NEW
  controller.getClassSchedule
);
```

---

## Database Schema Optimization

### Core System (Minimal Storage)

**What we store:**
- `CourseContent.prerequisites` (lightweight JSON)
- `ContentAttempt` (already exists - tracks completion)
- `ClassEnrollment.customEndDate` (single date field)

**No new collections needed for core system.**

---

### Premium System (Additional Storage)

**What we store:**
- `CourseContent.timePacingConfig` (optional JSON)
- `ClassContentSchedule` collection (only if `Class.timePacingEnabled`)

**Storage impact:**
- Core system: ~50 bytes per content item (prerequisites)
- Premium system: ~200 bytes per content item per class (schedules)

---

## Migration Strategy

### Phase 1: Core System (3-4 weeks)
1. Add `prerequisites` to CourseContent
2. Implement prerequisite checking service
3. Add deadline extension to ClassEnrollment
4. Update access control middleware
5. UI for prerequisite configuration
6. UI for learner progress tracking

**Result:** Self-paced learning with prerequisites works for everyone

---

### Phase 2: Premium Foundation (1-2 weeks)
1. Add feature flag system
2. Add `timePacingConfig` to CourseContent (optional)
3. Add `timePacingEnabled` to Class
4. Create premium middleware
5. UI feature gate indicators

**Result:** System ready for premium features, but none active yet

---

### Phase 3: Premium Implementation (3-4 weeks)
1. Implement time-based scheduling
2. Create ClassContentSchedule collection
3. Add schedule management APIs
4. UI for instructor time pacing
5. Testing and rollout

**Result:** Premium feature available for paying customers

---

## Document Organization

### Core System Documents (Priority 1)
1. **PREREQUISITE_SYSTEM_DESIGN.md** - Complete prerequisite architecture
2. **PREREQUISITE_SYSTEM_IMPLEMENTATION_PLAN.md** - Phased implementation
3. **PREREQUISITE_SYSTEM_UI_CHANGES.md** - UI for prerequisites & progress

### Premium Feature Documents (Priority 2)
1. **TIME_PACING_PREMIUM_FEATURE.md** - Time-based pacing as add-on
2. **TIME_PACING_IMPLEMENTATION_PLAN.md** - Premium implementation
3. **TIME_PACING_UI_CHANGES.md** - Additional UI for time pacing

### This Document
- **CONTENT_UNLOCKING_ARCHITECTURE.md** - How both systems integrate (this file)

---

## Testing Strategy

### Core System Testing
- Unit tests: Prerequisite logic (sequential, specific, anyOf)
- Integration tests: Access denied when prerequisites not met
- E2E tests: Learner completes Module 1, Module 2 unlocks

### Premium System Testing
- Feature flag tests: Premium endpoints blocked when disabled
- Integration tests: Time checks only run when enabled
- E2E tests: Both prerequisite AND time requirements enforced

### Upgrade/Downgrade Testing
- Enable premium → schedules generated
- Disable premium → falls back to core system gracefully
- Expired license → premium features disabled mid-semester

---

## Pricing & Licensing Considerations

### Potential Pricing Models

**Option A: Per-Institution License**
- $X/year for entire institution
- Unlimited classes, unlimited learners
- Simple administration

**Option B: Per-Class License**
- $X per class using time pacing
- Pay as you use
- More granular control

**Option C: Tiered Plans**
- Basic (Free): Core prerequisites only
- Professional ($X/mo): Time pacing for 10 classes
- Enterprise ($Y/mo): Unlimited time pacing + priority support

---

## Success Metrics

### Core System Metrics
- Prerequisite completion rates
- Learner pacing (fast/medium/slow)
- Deadline extension requests
- Learner satisfaction with self-paced learning

### Premium Feature Metrics
- Feature adoption rate (% of institutions enabling)
- Instructor satisfaction with time controls
- Revenue from premium features
- Support burden (should be low if well-designed)

---

## Open Questions for Approval

1. **Feature Flag Location:** Store in Institution model or separate FeatureFlags collection?
2. **Trial Period:** Should there be a free trial of premium features (30 days)?
3. **Gradual Rollout:** Enable premium for beta institutions first?
4. **License Key:** Use license keys, or just database flags?
5. **Hybrid Classes:** Can instructor enable time pacing for some modules but not others?

---

## Next Steps

1. **Human approves this architecture**
2. **Create PREREQUISITE_SYSTEM_DESIGN.md** (Core - Priority 1)
3. **Create TIME_PACING_PREMIUM_FEATURE.md** (Premium - Priority 2)
4. **Begin implementing Core System first**
5. **Premium system implemented after Core is stable**

---

**Approval Checklist:**

- [ ] Two-tier architecture approved
- [ ] Core vs Premium separation clear
- [ ] Data model strategy approved
- [ ] Feature flag approach approved
- [ ] Implementation priority confirmed (Core first)
- [ ] Ready to create detailed design documents

---

**END OF ARCHITECTURE OVERVIEW**
