# Time-Based Pacing - Premium Feature Design

**Document Type:** Premium Feature Specification
**Created:** 2026-01-16
**Status:** DRAFT - Awaiting Approval
**Feature Type:** OPTIONAL/PAID ADD-ON
**Priority:** Phase 2 (After Core Prerequisite System)
**Related Documents:**
- CONTENT_UNLOCKING_ARCHITECTURE.md (Read this first!)
- PREREQUISITE_SYSTEM_DESIGN.md (Core system)
- TIME_PACING_IMPLEMENTATION_PLAN.md (Implementation)

---

## ⚠️ IMPORTANT: This is a Premium Feature

**This document describes an OPTIONAL, PAID feature that builds ON TOP OF the core prerequisite system.**

- **Core System (Free/Default):** Prerequisite-based unlocking (see PREREQUISITE_SYSTEM_DESIGN.md)
- **This Premium Feature:** Adds time-based restrictions on top of prerequisites

**Feature Status:** Optional, disabled by default, requires feature flag or license

---

## Executive Summary

This document defines the **time-based pacing premium feature** that allows instructors to control WHEN learners can access course content within specific class instances. This enables cohort-based, scheduled learning where content unlocks on specific dates.

**Key Principle:** Time-based pacing is an ADDITIONAL LAYER on top of prerequisite checking. For content to be accessible:
1. ✅ Prerequisites must be met (Core system)
2. ✅ Time-based availability window must be active (Premium feature)

**Use Case:** Institutions wanting synchronized cohort learning where all students progress together on a fixed schedule, rather than self-paced learning.

---

## Problem Statement

### Current State
- `CourseContent` has `availableFrom`/`availableUntil` dates, but these are at the **Course template** level
- All class instances of the same course share the same availability dates
- No support for cohort-specific pacing (Spring 2026 cohort vs Fall 2026 cohort)
- No concept of "week-based" pacing relative to class start date
- Instructors cannot customize content availability per class offering

### Desired State
- **Same course, different pacing:** Spring cohort starts Module 2 on Week 2, Fall cohort starts Module 2 on Week 3
- **Flexible pacing models:** Fixed dates, week-based, or always-available
- **Class-level control:** Instructors can override pacing for their specific class
- **Learner experience:** Clear visibility into when content becomes available
- **Cohort-based learning:** Support structured, time-bound learning paths

---

## Use Cases

### UC-1: Fixed-Date Cohort Pacing
**Scenario:** A 12-week bootcamp runs every quarter with strict module dates.

**Example:**
- **Spring 2026 Cohort** (Class 101): Jan 15 - Apr 15
  - Module 1: Available Jan 15 - Jan 21
  - Module 2: Available Jan 22 - Jan 28
  - Module 3: Available Jan 29 - Feb 4

- **Summer 2026 Cohort** (Class 102): Jun 1 - Aug 30
  - Module 1: Available Jun 1 - Jun 7
  - Module 2: Available Jun 8 - Jun 14
  - Module 3: Available Jun 15 - Jun 21

**Key Requirement:** Same course, different fixed dates per class.

---

### UC-2: Week-Based Pacing (Relative to Class Start)
**Scenario:** A course uses "Week 1, Week 2, Week 3" pacing relative to class start date.

**Example:**
- **Course:** Introduction to Programming
- **Pacing Rules:**
  - Module 1: Week 1 (Days 0-6 from class start)
  - Module 2: Week 2 (Days 7-13 from class start)
  - Module 3: Week 3 (Days 14-20 from class start)

- **Fall 2026 Class** (Starts Sep 1):
  - Module 1: Sep 1 - Sep 7
  - Module 2: Sep 8 - Sep 14
  - Module 3: Sep 15 - Sep 21

- **Spring 2027 Class** (Starts Jan 10):
  - Module 1: Jan 10 - Jan 16
  - Module 2: Jan 17 - Jan 23
  - Module 3: Jan 24 - Jan 30

**Key Requirement:** Dates calculated dynamically based on class start date.

---

### UC-3: Always-Available Content
**Scenario:** Self-paced or reference materials always accessible.

**Example:**
- **Module 0: Orientation** - Always available from class start to end
- **Module 99: Resources** - Always available throughout class

**Key Requirement:** No date restrictions, available for entire class duration.

---

### UC-4: Instructor Override
**Scenario:** Instructor needs to extend access due to holidays or adjust pacing.

**Example:**
- **Original:** Module 3 available Week 3 (Jan 15-21)
- **Override:** Instructor extends to Jan 15-28 due to holiday week

**Key Requirement:** Class-specific overrides without affecting course template.

---

## Architecture Overview

### Data Flow

```
Course Template (Immutable Pacing Template)
    ↓
Class Instance (Inherits + Applies Pacing Rules)
    ↓
ClassContentSchedule (Calculated Availability)
    ↓
Learner Access Check (Real-time Evaluation)
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Pacing Level** | Class-level, not Course-level | Enables cohort-specific schedules |
| **Pacing Storage** | New `ClassContentSchedule` collection | Separates schedule from content |
| **Default Behavior** | Inherit from Course template | Reduces duplicate configuration |
| **Override Mechanism** | Class-level overrides | Instructor flexibility |
| **Date Calculation** | Calculate on class creation | Performance (avoid runtime calculation) |
| **Pacing Models** | Fixed, relative (week-based), always-available | Covers common use cases |
| **Module Grouping** | Use existing `CourseContent.moduleNumber` | Leverage existing structure |

---

## Data Model

### New Collection: ClassContentSchedule

**Purpose:** Stores calculated availability dates for each content item in a class.

```typescript
interface IClassContentSchedule extends Document {
  classId: ObjectId;              // Reference to Class
  courseContentId: ObjectId;      // Reference to CourseContent
  contentId: ObjectId;            // Denormalized for quick access
  moduleNumber?: number;          // Denormalized from CourseContent

  // Calculated availability dates
  availableFrom: Date;            // When content becomes available
  availableUntil: Date | null;    // When content closes (null = no end)

  // Override tracking
  isOverridden: boolean;          // True if instructor manually adjusted
  overriddenBy?: ObjectId;        // Staff who made override
  overriddenAt?: Date;            // When override happened
  overrideReason?: string;        // Why override was made

  // Original template values (for reference)
  originalAvailableFrom: Date;
  originalAvailableUntil: Date | null;

  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
```javascript
classContentScheduleSchema.index({ classId: 1, courseContentId: 1 }, { unique: true });
classContentScheduleSchema.index({ classId: 1, availableFrom: 1 });
classContentScheduleSchema.index({ classId: 1, moduleNumber: 1 });
classContentScheduleSchema.index({ contentId: 1 });
classContentScheduleSchema.index({ isActive: 1 });
```

---

### Extended: CourseContent Model

**Add pacing template fields** to `CourseContent`:

```typescript
interface ICourseContent extends Document {
  // ... existing fields ...

  // NEW: Pacing configuration (template for classes)
  pacingConfig?: {
    type: 'fixed' | 'relative' | 'always-available';

    // For 'fixed' type (specific dates)
    fixedAvailableFrom?: Date;
    fixedAvailableUntil?: Date | null;

    // For 'relative' type (days from class start)
    relativeStartDay?: number;      // e.g., 0 = day 1, 7 = day 8
    relativeDurationDays?: number;  // e.g., 7 = one week
    relativeEndDay?: number | null; // calculated or specified

    // For 'always-available' type
    // No additional fields needed
  };

  // DEPRECATED: Keep for backward compatibility, but prefer pacingConfig
  availableFrom?: Date;
  availableUntil?: Date;
}
```

**Migration Strategy:**
- Existing `availableFrom`/`availableUntil` converted to `pacingConfig.type='fixed'`
- New courses default to `pacingConfig.type='always-available'`

---

### Extended: Class Model

**Add pacing-related fields:**

```typescript
interface IClass extends Document {
  // ... existing fields ...

  // NEW: Pacing configuration
  pacingMode: 'inherit' | 'custom';  // Inherit from course or custom per class

  // NEW: Week definition (for relative pacing)
  weekStartDay?: number;  // 0=Sunday, 1=Monday, etc. (default: 1)

  // Existing: startDate and endDate used for calculations
  startDate: Date;
  endDate: Date;
}
```

---

## Pacing Calculation Logic

### Calculation Trigger Points

**When ClassContentSchedule entries are created/updated:**
1. **Class creation** - Generate all ClassContentSchedule entries
2. **Content added to course** - Generate ClassContentSchedule for that content
3. **Class dates changed** - Recalculate all relative-paced content
4. **Instructor override** - Update specific ClassContentSchedule entry

### Calculation Algorithm

```typescript
function calculateAvailability(
  class: IClass,
  courseContent: ICourseContent
): { availableFrom: Date, availableUntil: Date | null } {

  const pacing = courseContent.pacingConfig;

  if (!pacing || pacing.type === 'always-available') {
    return {
      availableFrom: class.startDate,
      availableUntil: class.endDate
    };
  }

  if (pacing.type === 'fixed') {
    return {
      availableFrom: pacing.fixedAvailableFrom!,
      availableUntil: pacing.fixedAvailableUntil || null
    };
  }

  if (pacing.type === 'relative') {
    const classStart = class.startDate;
    const startDay = pacing.relativeStartDay || 0;
    const durationDays = pacing.relativeDurationDays;

    const availableFrom = addDays(classStart, startDay);
    const availableUntil = durationDays
      ? addDays(availableFrom, durationDays)
      : class.endDate;

    return { availableFrom, availableUntil };
  }

  // Fallback
  return {
    availableFrom: class.startDate,
    availableUntil: class.endDate
  };
}
```

---

## Access Control Logic

### Learner Content Access Check

**Before allowing content access:**

```typescript
async function canAccessContent(
  learnerId: ObjectId,
  contentId: ObjectId,
  classId: ObjectId
): Promise<{ canAccess: boolean, reason?: string, availableAt?: Date }> {

  // 1. Check enrollment
  const enrollment = await ClassEnrollment.findOne({
    learnerId,
    classId,
    status: { $in: ['enrolled', 'active'] }
  });

  if (!enrollment) {
    return { canAccess: false, reason: 'Not enrolled in class' };
  }

  // 2. Check class is active
  const classDoc = await Class.findById(classId);
  if (!classDoc.isActive) {
    return { canAccess: false, reason: 'Class is not active' };
  }

  // 3. Check content schedule
  const schedule = await ClassContentSchedule.findOne({
    classId,
    contentId,
    isActive: true
  });

  if (!schedule) {
    // No schedule = always available (backward compatibility)
    return { canAccess: true };
  }

  const now = new Date();

  // Check if content is available yet
  if (now < schedule.availableFrom) {
    return {
      canAccess: false,
      reason: 'Content not yet available',
      availableAt: schedule.availableFrom
    };
  }

  // Check if content is still available
  if (schedule.availableUntil && now > schedule.availableUntil) {
    return {
      canAccess: false,
      reason: 'Content availability period has ended'
    };
  }

  return { canAccess: true };
}
```

---

## API Endpoints

### Class Content Schedule Management

#### 1. Get Class Content Schedule
```
GET /api/v2/classes/:classId/content-schedule
```

**Query Params:**
- `moduleNumber` (optional) - Filter by module
- `includeInactive` (optional) - Include inactive schedules

**Response:**
```json
{
  "success": true,
  "data": {
    "classId": "507f1f77bcf86cd799439011",
    "className": "CS101 - Spring 2026",
    "startDate": "2026-01-15T00:00:00Z",
    "endDate": "2026-04-15T23:59:59Z",
    "modules": [
      {
        "moduleNumber": 1,
        "moduleName": "Introduction to Programming",
        "content": [
          {
            "scheduleId": "507f1f77bcf86cd799439022",
            "contentId": "507f1f77bcf86cd799439033",
            "contentTitle": "Welcome Video",
            "availableFrom": "2026-01-15T00:00:00Z",
            "availableUntil": "2026-01-21T23:59:59Z",
            "isOverridden": false,
            "status": "upcoming" | "available" | "closed"
          }
        ]
      }
    ]
  }
}
```

**Access:** `classes:read` or instructor of class or enrolled learner

---

#### 2. Recalculate Class Schedule
```
POST /api/v2/classes/:classId/content-schedule/recalculate
```

**Body:**
```json
{
  "reason": "Class dates changed from Jan 15 to Jan 22"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recalculated": 45,
    "overridesPreserved": 3
  },
  "message": "Content schedule recalculated successfully"
}
```

**Access:** `classes:update` (instructor or admin)

**Notes:**
- Preserves manual overrides (isOverridden=true)
- Only recalculates relative-paced content
- Logs the recalculation event

---

#### 3. Override Content Availability
```
PUT /api/v2/classes/:classId/content-schedule/:scheduleId
```

**Body:**
```json
{
  "availableFrom": "2026-01-20T00:00:00Z",
  "availableUntil": "2026-02-01T23:59:59Z",
  "reason": "Extended due to holiday week"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "scheduleId": "507f1f77bcf86cd799439022",
    "availableFrom": "2026-01-20T00:00:00Z",
    "availableUntil": "2026-02-01T23:59:59Z",
    "isOverridden": true,
    "overriddenBy": "507f1f77bcf86cd799439044",
    "overriddenAt": "2026-01-16T10:30:00Z"
  }
}
```

**Access:** `classes:update` (instructor or admin)

---

#### 4. Reset Content Schedule to Template
```
POST /api/v2/classes/:classId/content-schedule/:scheduleId/reset
```

**Body:**
```json
{
  "reason": "Reverting to course template schedule"
}
```

**Access:** `classes:update` (instructor or admin)

---

#### 5. Learner Content Access Status
```
GET /api/v2/classes/:classId/content/:contentId/access-status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "canAccess": false,
    "reason": "Content not yet available",
    "availableFrom": "2026-01-22T00:00:00Z",
    "availableUntil": "2026-01-28T23:59:59Z",
    "moduleNumber": 2,
    "moduleName": "Variables and Data Types"
  }
}
```

**Access:** Authenticated learner (own enrollment) or instructor

---

### Course Content Pacing Configuration

#### 6. Update Course Content Pacing
```
PUT /api/v2/courses/:courseId/content/:courseContentId/pacing
```

**Body (Fixed Dates):**
```json
{
  "type": "fixed",
  "fixedAvailableFrom": "2026-01-15T00:00:00Z",
  "fixedAvailableUntil": "2026-01-21T23:59:59Z"
}
```

**Body (Relative/Week-Based):**
```json
{
  "type": "relative",
  "relativeStartDay": 7,
  "relativeDurationDays": 7
}
```

**Body (Always Available):**
```json
{
  "type": "always-available"
}
```

**Access:** `courses:update` (content-admin or dept-admin)

**Notes:**
- Changes to course template do NOT retroactively affect existing classes
- Only new classes or manually recalculated classes use new template

---

## Business Rules

### Rule 1: Override Preservation
- Manual overrides (`isOverridden: true`) are NEVER automatically overwritten
- Recalculation operations skip overridden schedules
- Instructors must manually reset overrides to revert to template

### Rule 2: Backward Compatibility
- Classes created before this feature have no `ClassContentSchedule` entries
- Content access defaults to "always available" if no schedule exists
- Gradual adoption: instructors opt-in by configuring pacing

### Rule 3: Module vs Individual Content
- Pacing can be set at the **CourseContent** level (individual items)
- UI can provide "Set pacing for entire module" bulk operation
- Flexibility: Some content in Module 2 available Week 2, some Week 3

### Rule 4: Date Validation
- `availableFrom` must be >= `Class.startDate`
- `availableUntil` must be <= `Class.endDate` (if set)
- System warns but allows exceptions (e.g., extended access after class ends)

### Rule 5: Instructor Authority
- Instructors can override schedules for their classes
- Instructors cannot change course template pacing (that's content-admin)
- Department admins can override any class in their department

### Rule 6: Learner Communication
- Learners see "Available on [date]" for upcoming content
- Learners see "Closed on [date]" for past-due content
- Email notifications (optional): "New content available in CS101"

---

## Edge Cases & Considerations

### Edge Case 1: Class Dates Change After Enrollment
**Scenario:** Class start date moved from Jan 15 to Jan 22.

**Solution:**
- Instructor triggers manual recalculation
- System recalculates all relative-paced schedules
- Preserves overrides
- Sends notification to enrolled learners

---

### Edge Case 2: Content Added to Course Mid-Class
**Scenario:** Instructor adds new content to active class.

**Solution:**
- System generates `ClassContentSchedule` for new content
- Uses current date if calculated date is in the past
- Instructor can manually adjust if needed

---

### Edge Case 3: Learner Enrolls Late
**Scenario:** Learner enrolls in Week 3, but Week 1-2 content is closed.

**Solution:**
- **Option A (Default):** Learner cannot access closed content (strict pacing)
- **Option B (Instructor Override):** Instructor grants extended access
- **Option C (Policy Setting):** Class setting: "Allow late enrollees to access all content"

**Implementation:** Add `Class.allowLateAccess: boolean` field

---

### Edge Case 4: Multiple Instructors with Different Overrides
**Scenario:** Two instructors teach same class, disagree on pacing.

**Solution:**
- Last override wins (audit trail shows who changed)
- Permission check: Only instructors of that specific class can override
- Communication: Instructors coordinate via LMS messaging

---

## Performance Considerations

### Optimization 1: Denormalization
- Store `contentId`, `moduleNumber` in `ClassContentSchedule` (avoid joins)
- Learner access checks are single-document queries

### Optimization 2: Indexing
- Compound indexes on `(classId, availableFrom)` for efficient filtering
- Index on `(classId, moduleNumber)` for module-based queries

### Optimization 3: Caching
- Cache class content schedules for 5 minutes (rarely changes)
- Invalidate cache on override/recalculation

### Optimization 4: Bulk Operations
- Batch create `ClassContentSchedule` entries on class creation
- Use `bulkWrite` for recalculation operations

---

## Migration Strategy

### Phase 1: Non-Breaking Addition (New Classes Only)
1. Deploy new models (`ClassContentSchedule`, extended `CourseContent`)
2. Generate schedules for NEW classes only
3. Existing classes continue without schedules (always-available behavior)
4. No changes to existing API endpoints

### Phase 2: Opt-In for Existing Classes
1. UI: Instructors see "Enable content pacing for this class" button
2. API: `POST /api/v2/classes/:classId/enable-pacing`
3. System generates schedules based on course template
4. Instructor reviews and adjusts

### Phase 3: Bulk Migration (Optional)
1. Admin tool: "Generate schedules for all classes in [term/department]"
2. Dry-run mode: Preview schedules before applying
3. Apply in batches with monitoring

---

## Testing Strategy

### Unit Tests
- Pacing calculation logic (fixed, relative, always-available)
- Date validation (within class bounds)
- Override preservation during recalculation

### Integration Tests
- Class creation → schedules generated
- Content access checks for learners
- Instructor overrides persisted correctly
- Recalculation preserves overrides

### E2E Tests
- Learner views course content with availability dates
- Learner blocked from accessing unavailable content
- Instructor adjusts schedule, learner sees updated dates
- Class dates changed, relative schedules updated

### Load Tests
- Access checks with 1000+ concurrent learners
- Schedule generation for class with 200+ content items

---

## Security & Permissions

### Permission Mapping

| Action | Required Permission | Additional Checks |
|--------|---------------------|-------------------|
| View schedule | `classes:read` OR enrolled | Class visibility |
| Recalculate schedule | `classes:update` | Instructor or admin |
| Override schedule | `classes:update` | Instructor or admin |
| Update course pacing template | `courses:update` | Content-admin or dept-admin |
| Check learner access | Authenticated | Own enrollment or instructor |

### Audit Logging

Log all schedule modifications:
- Override created/updated
- Schedule recalculated
- Pacing template changed
- Bulk operations applied

**Audit Fields:**
- `action`: 'override' | 'recalculate' | 'template-update'
- `performedBy`: ObjectId (staff)
- `classId` or `courseId`
- `changes`: Before/after values

---

## Future Enhancements (Out of Scope)

### Enhancement 1: Prerequisite-Based Unlocking
- Module 2 unlocks only after Module 1 completion
- Requires: Progress tracking integration

### Enhancement 2: Adaptive Pacing
- Extend deadlines for struggling learners automatically
- Requires: Analytics integration

### Enhancement 3: Multi-Week Modules
- Module spans multiple weeks (Week 1-3)
- Individual content within module has sub-pacing

### Enhancement 4: Schedule Templates
- Save and reuse pacing templates across courses
- "12-Week Bootcamp Template" applied to multiple courses

### Enhancement 5: Learner Notifications
- Email: "New content available tomorrow"
- Push: "Module 3 opens in 1 hour"

---

## Open Questions for Human

1. **Late Enrollment Policy:**
   - Should late enrollees automatically get access to closed content?
   - Or require instructor approval per learner?

2. **Content Closure Behavior:**
   - When content closes, can learners still view (read-only)?
   - Or completely hidden?

3. **Module Definition:**
   - Is `CourseContent.moduleNumber` sufficient?
   - Or do we need explicit Module collection with metadata?

4. **Default Pacing:**
   - New courses default to "always-available" or "inherit from institution policy"?

5. **Cohort-Class Relationship:**
   - Should Classes explicitly link to Cohorts?
   - Or is the implicit relationship (Class → Term → Academic Year) sufficient?

6. **Schedule Preview:**
   - Should instructors see a calendar preview before creating class?
   - "If I start Jan 15, here's when all modules open"?

---

## Approval Checklist

- [ ] Data model approved
- [ ] API endpoints approved
- [ ] Business rules approved
- [ ] Edge cases addressed
- [ ] Open questions answered
- [ ] Implementation plan reviewed
- [ ] UI changes documented
- [ ] Ready for implementation

---

**Next Steps:**
1. Human reviews and approves this design
2. Create Implementation Plan (phased approach)
3. Create UI Changes Document for frontend team
4. Begin Phase 1 implementation
