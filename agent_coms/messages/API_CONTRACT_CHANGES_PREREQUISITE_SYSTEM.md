# API Contract Changes - Prerequisite System

**Message Type:** API Contract Change Notification
**Created:** 2026-01-16
**Priority:** HIGH
**From:** API Team
**To:** UI Team
**Feature:** Prerequisite System (Core - Phase 1)
**Related Documents:**
- PREREQUISITE_SYSTEM_DESIGN.md
- PREREQUISITE_SYSTEM_IMPLEMENTATION_PLAN.md
- PREREQUISITE_SYSTEM_UI_CHANGES.md

---

## 📋 Summary

The Prerequisite System introduces **11 new API endpoints** and **extends 4 existing models**. This is a CORE feature (free/always available) that enables self-paced learning with completion-based content unlocking.

**Timeline:** Implementation starting Week of Jan 20, 2026
**Estimated Completion:** Feb 24 - Mar 10, 2026 (5-7 weeks)
**Breaking Changes:** None (backward compatible)

---

## 🆕 New API Endpoints

### 1. Check Content Access Status
```
GET /api/v2/classes/:classId/content/:contentId/access-status
```

**Purpose:** Check if learner can access content (enrollment, deadline, prerequisites)

**Response:**
```typescript
{
  success: boolean;
  data: {
    canAccess: boolean;
    reason?: 'not-enrolled' | 'deadline-passed' | 'class-inactive' | 'prerequisites-not-met';
    message?: string;
    deadline?: string; // ISO date
    missingPrerequisites?: Array<{
      contentId?: string;
      contentTitle?: string;
      reason: string;
      currentScore?: number;
      requiredScore?: number;
    }>;
  };
}
```

**UI Integration:** Call before attempting to launch/access content. Show lock icon + reason if `canAccess: false`.

---

### 2. Get Learner Progress
```
GET /api/v2/classes/:classId/progress
```

**Purpose:** Get learner's progress, what's completed, what's locked, why

**Response:**
```typescript
{
  success: boolean;
  data: {
    classId: string;
    className: string;
    enrollment: {
      enrolledAt: string;
      deadline: string;
      customDeadline: boolean;
      daysRemaining: number;
    };
    progress: {
      totalContent: number;
      completed: number;
      inProgress: number;
      locked: number;
      percentComplete: number;
    };
    modules: Array<{
      moduleNumber: number;
      moduleName?: string;
      status: 'completed' | 'in-progress' | 'locked';
      reason?: string; // Why locked
      content: Array<{
        contentId: string;
        title: string;
        type: string;
        status: 'completed' | 'in-progress' | 'locked';
        score?: number;
        completedAt?: string;
        reason?: string; // Why locked
      }>;
    }>;
    warnings?: Array<{
      id: string;
      name: string;
      severity: 'info' | 'warning' | 'critical';
      message: string;
      actionPrompt?: string;
      triggeredAt: string;
    }>;
  };
}
```

**UI Integration:** Display on class detail page, show progress bars, lock icons, warnings.

---

### 3. Extend Class Deadline (Admin Only)
```
POST /api/v2/classes/:classId/enrollments/:enrollmentId/extend-deadline
```

**Purpose:** Grant deadline extension to specific learner

**Request:**
```typescript
{
  newDeadline: string; // ISO date
  reason: string; // 10-1000 chars
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    enrollmentId: string;
    learnerId: string;
    learnerName: string;
    originalDeadline: string;
    newDeadline: string;
    extensionDays: number;
    grantedBy: string;
    grantedAt: string;
    reason: string;
  };
  message: string;
}
```

**Authorization:** `classes:manage` OR `enrollments:update` (dept-admin, enrollment-admin)

---

### 4. Configure Content Prerequisites
```
PUT /api/v2/courses/:courseId/content/:courseContentId/prerequisites
```

**Purpose:** Set prerequisite rules for content item

**Request (Sequential):**
```typescript
{
  type: 'sequential';
  sequential: {
    enabled: boolean;
    mustComplete: boolean;
    minimumScore?: number; // 0-100
    mustPass?: boolean;
  };
}
```

**Request (Specific):**
```typescript
{
  type: 'specific';
  specific: {
    contentIds: string[]; // Array of ObjectIds
    requireAll: boolean; // true = AND, false = OR
    minimumScore?: number;
    mustPass?: boolean;
  };
}
```

**Request (Any-Of):**
```typescript
{
  type: 'any-of';
  anyOf: {
    contentIds: string[];
    minimumRequired: number; // e.g., complete any 3 of 5
    minimumScore?: number;
  };
}
```

**Authorization:** `courses:update` (content-admin, dept-admin)

**Warning:** Changing prerequisites creates a new course version (see versioning section below)

---

### 5. Get Prerequisite Map
```
GET /api/v2/courses/:courseId/prerequisites/map
```

**Purpose:** Get overview of all prerequisites in course

**Response:**
```typescript
{
  success: boolean;
  data: {
    courseId: string;
    courseName: string;
    prerequisiteGraph: Array<{
      contentId: string;
      title: string;
      sequence: number;
      prerequisites: {
        type: 'none' | 'sequential' | 'specific' | 'any-of';
        // Type-specific fields
      } | null;
      unlocks: string[]; // Content IDs unlocked by this
    }>;
  };
}
```

**UI Integration:** Show summary table or list view of prerequisites.

---

### 6. Request Prerequisite Override (Instructor)
```
POST /api/v2/classes/:classId/enrollments/:enrollmentId/prerequisite-override/request
```

**Purpose:** Instructor requests exception for learner

**Request:**
```typescript
{
  contentId: string;
  reason: string; // 10-1000 chars
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    overrideId: string;
    status: 'pending' | 'approved'; // Auto-approved if instructor is dept-admin
    contentId: string;
    contentTitle: string;
    requestedBy: string;
    requestedAt: string;
    requiresApproval: boolean;
    approver?: string; // "dept-admin" if pending
  };
  message: string;
}
```

**Authorization:** `classes:manage` OR instructor of class

**Note:** If instructor has dept-admin role, auto-approved immediately.

---

### 7. Review Prerequisite Override (Dept-Admin)
```
POST /api/v2/classes/:classId/enrollments/:enrollmentId/prerequisite-override/:overrideId/review
```

**Purpose:** Approve/deny override request

**Request:**
```typescript
{
  action: 'approve' | 'deny';
  notes?: string; // Optional review notes
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    overrideId: string;
    status: 'approved' | 'denied';
    reviewedBy: string;
    reviewedAt: string;
    notes?: string;
  };
  message: string;
}
```

**Authorization:** Dept-admin of class's department

---

### 8. Get Pending Override Requests
```
GET /api/v2/departments/:departmentId/prerequisite-overrides/pending
```

**Purpose:** Dept-admin sees pending requests to review

**Response:**
```typescript
{
  success: boolean;
  data: {
    pending: number;
    requests: Array<{
      overrideId: string;
      classId: string;
      className: string;
      learnerId: string;
      learnerName: string;
      contentId: string;
      contentTitle: string;
      requestedBy: string;
      instructorName: string;
      requestedAt: string;
      reason: string;
      daysWaiting: number;
    }>;
  };
}
```

**Authorization:** `departments:manage` (dept-admin)

---

### 9. Configure Progress Warnings
```
PUT /api/v2/departments/:departmentId/progress-warnings
```

**Purpose:** Set warning thresholds for department

**Request:**
```typescript
{
  enabled: boolean;
  thresholds: Array<{
    id: string;
    name: string;
    severity: 'info' | 'warning' | 'critical';
    condition: {
      type: 'time-elapsed' | 'content-remaining' | 'custom';
      timeElapsedPercent?: number;
      contentCompletePercent?: number;
      daysRemaining?: number;
      contentRemainingPercent?: number;
      customFormula?: string;
    };
    message: string;
    actionPrompt?: string;
    notifyInstructor?: boolean;
  }>;
}
```

**Authorization:** `departments:update` (dept-admin)

---

### 10. Get Progress Warnings
```
GET /api/v2/classes/:classId/progress/warnings
```

**Purpose:** Get active warnings for current learner

**Response:**
```typescript
{
  success: boolean;
  data: {
    warnings: Array<{
      id: string;
      name: string;
      severity: 'info' | 'warning' | 'critical';
      message: string;
      actionPrompt?: string;
      triggeredAt: string;
    }>;
    stats: {
      timeElapsedPercent: number;
      contentCompletePercent: number;
      daysRemaining: number;
      contentRemaining: number;
    };
  };
}
```

**Authorization:** Authenticated learner (own enrollment) or instructor

---

### 11. Get Prerequisite Flow Diagram
```
GET /api/v2/courses/:courseId/prerequisites/flow-diagram
```

**Purpose:** Get data for rendering prerequisite flow diagram

**Response:**
```typescript
{
  success: boolean;
  data: {
    nodes: Array<{
      id: string;
      title: string;
      sequence: number;
      type: 'module' | 'content';
      prerequisites: object | null;
      position: { x: number; y: number };
    }>;
    edges: Array<{
      from: string;
      to: string;
      label?: string;
      type: 'sequential' | 'specific' | 'any-of';
    }>;
    issues?: Array<{
      type: 'circular' | 'orphaned' | 'impossible';
      contentId?: string;
      message: string;
    }>;
  };
}
```

**Authorization:** `courses:read` (content-admin, instructor)

---

## 🔄 Modified Existing Endpoints

### Content Launch/Access Endpoints
```
POST /api/v2/classes/:classId/content/:contentId/launch
```

**CHANGE:** Now checks prerequisites before allowing access

**New Error Response (403):**
```typescript
{
  success: false;
  error: {
    code: 'PREREQUISITES_NOT_MET',
    message: 'You must complete prerequisites first',
    details: {
      reason: 'prerequisites-not-met',
      missingPrerequisites: [...]
    }
  }
}
```

**UI Action:** Call `GET /access-status` first, show lock UI if locked, don't attempt launch.

---

## 📦 Model Changes (Informational)

### CourseContent Model
**New Fields:**
- `prerequisites` (object) - Prerequisite configuration
- `suggestedWeek` (number) - Advisory timeline
- `estimatedDuration` (number) - Minutes

**Backward Compatible:** Existing content has `prerequisites: { type: 'none' }`

---

### Course Model
**New Fields:**
- `version` (number) - Version number (default: 1)
- `isCurrentVersion` (boolean) - Only one current version
- `previousVersionId` (string) - Links to previous version
- `versionCreatedAt` (date)
- `versionCreatedBy` (string)
- `versionChangeReason` (string)

**Important:** Changing prerequisites creates new version automatically.

---

### Class Model
**New Fields:**
- `courseVersion` (number) - Snapshot of version at class creation

**Impact:** Classes stay on their course version even if course is updated.

---

### ClassEnrollment Model
**New Fields:**
- `customEndDate` (date) - Per-learner deadline override
- `extensionGrantedBy` (string)
- `extensionReason` (string)
- `extensionGrantedAt` (date)
- `prerequisiteOverrides` (array) - Override requests/approvals

---

### Department Model
**New Fields:**
- `progressWarnings` (object) - Warning configuration

---

## ⚠️ Breaking Changes

**NONE** - All changes are backward compatible.

**Opt-In:** Prerequisites are disabled by default (`type: 'none'`). Instructors must explicitly configure them.

---

## 🎨 UI Integration Checklist

### Phase 1: Content Access (CRITICAL - Week 1-2)
- [ ] Show lock icon for locked content
- [ ] Display "Complete X to unlock" message
- [ ] Call `/access-status` before allowing launch
- [ ] Handle 403 errors with prerequisite message
- [ ] Show progress percentage

### Phase 2: Progress Tracking (Week 2-3)
- [ ] Display progress on class detail page
- [ ] Show module-level completion
- [ ] Display warnings (info/warning/critical)
- [ ] Show deadline and days remaining

### Phase 3: Instructor Tools (Week 3-4)
- [ ] UI to configure prerequisites (3 types)
- [ ] Request override button for instructors
- [ ] Auto-approval indicator (instructor=dept-admin)
- [ ] Version warning when changing prerequisites

### Phase 4: Admin Tools (Week 4-5)
- [ ] Dept-admin pending overrides queue
- [ ] Approve/deny override UI
- [ ] Deadline extension UI
- [ ] Progress warning configuration

### Phase 5: Visualizations (Week 5-6)
- [ ] Prerequisite flow diagram component
- [ ] Progress dashboard
- [ ] Warning indicators
- [ ] Status badges (locked/available/complete)

---

## 📝 Contract Recommendations

### Create New Contract Files

1. **`contracts/types/prerequisite-types.ts`**
```typescript
export type PrerequisiteType = 'none' | 'sequential' | 'specific' | 'any-of';

export interface PrerequisiteConfig {
  type: PrerequisiteType;
  sequential?: {
    enabled: boolean;
    mustComplete: boolean;
    minimumScore?: number;
    mustPass?: boolean;
  };
  specific?: {
    contentIds: string[];
    requireAll: boolean;
    minimumScore?: number;
    mustPass?: boolean;
  };
  anyOf?: {
    contentIds: string[];
    minimumRequired: number;
    minimumScore?: number;
  };
}

export interface MissingPrerequisite {
  contentId?: string;
  contentTitle?: string;
  reason: string;
  currentScore?: number;
  requiredScore?: number;
}

export interface AccessCheckResponse {
  canAccess: boolean;
  reason?: string;
  message?: string;
  deadline?: string;
  missingPrerequisites?: MissingPrerequisite[];
}
```

2. **`contracts/types/progress-types.ts`**
```typescript
export interface LearnerProgress {
  classId: string;
  className: string;
  enrollment: EnrollmentInfo;
  progress: ProgressStats;
  modules: ModuleProgress[];
  warnings?: ProgressWarning[];
}

export interface ProgressStats {
  totalContent: number;
  completed: number;
  inProgress: number;
  locked: number;
  percentComplete: number;
}

export interface ProgressWarning {
  id: string;
  name: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  actionPrompt?: string;
  triggeredAt: string;
}
```

3. **`contracts/types/override-types.ts`**
```typescript
export type OverrideStatus = 'pending' | 'approved' | 'denied';

export interface PrerequisiteOverride {
  overrideId: string;
  contentId: string;
  contentTitle: string;
  learnerId: string;
  learnerName: string;
  requestedBy: string;
  instructorName: string;
  requestedAt: string;
  reason: string;
  status: OverrideStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  daysWaiting?: number;
}
```

---

## 🔗 API Contract Files (Backend)

We will create corresponding Zod schemas:
- `contracts/api/prerequisite-access.contract.ts`
- `contracts/api/prerequisite-override.contract.ts`
- `contracts/api/progress-warnings.contract.ts`

These will be available for frontend validation if needed.

---

## 🧪 Testing Recommendations

### Mock API Responses

Create mock responses for local development:
- `/mocks/api/prerequisites/access-locked.json`
- `/mocks/api/prerequisites/access-allowed.json`
- `/mocks/api/prerequisites/progress-behind-pace.json`
- `/mocks/api/prerequisites/override-pending.json`

### Error Scenarios to Test

1. Content locked by prerequisites
2. Deadline passed
3. Not enrolled in class
4. Override request pending
5. Progress warnings triggered
6. Circular dependency detected (flow diagram)

---

## 📅 Rollout Timeline

| Week | API Availability | UI Integration |
|------|------------------|----------------|
| Week 1-2 | Endpoints 1-3 | Content access checks |
| Week 3-4 | Endpoints 4-6 | Prerequisite config |
| Week 5 | Endpoints 7-8 | Override workflow |
| Week 6 | Endpoints 9-10 | Progress warnings |
| Week 7 | Endpoint 11 | Flow diagram |

**Coordination:** Weekly sync meetings to align on API changes and UI needs.

---

## 🆘 Support & Questions

**API Team Contact:** [Your contact info]
**Slack Channel:** #api-prerequisite-system
**Documentation:** See PREREQUISITE_SYSTEM_DESIGN.md
**UI Spec:** See PREREQUISITE_SYSTEM_UI_CHANGES.md

**Questions?**
1. Check design docs first
2. Post in Slack channel
3. Schedule sync meeting if needed

---

## ✅ Acknowledgment Required

**UI Team:** Please respond to this message by Jan 20, 2026 confirming:
1. [ ] Reviewed all 11 new endpoints
2. [ ] Understood contract changes
3. [ ] Integration timeline acceptable
4. [ ] No blocking concerns identified

**If concerns exist, raise them immediately so we can address before implementation begins.**

---

**END OF CONTRACT CHANGE NOTIFICATION**
