# LMS V2 Implementation Questions - Answered & Formatted

> **Updated:** 2026-01-07  
> **Status:** Answers Provided - Awaiting Clarifications  

---

## Architecture & Design

### Q1: API Versioning Strategy
**Decision:** URL versioning with `/api/v2` prefix

**Rationale:** 
- Simplest for frontend developers
- Clear migration path from V1
- Standard industry practice

**Implementation Notes:**
- Use middleware to validate API version
- Return 404 for unsupported versions
- Document in Swagger with version selector
- Set up version-based route namespacing

---

### Q2: Database per Service or Monolithic?
**Decision:** Single database (`lms_v2`) with plans for future sharding

**Rationale:**
- Simpler initial implementation with atomic transactions
- Easier data relationships and joins
- Can migrate to sharded architecture when scale demands it
- Reduced operational complexity for Phase 1

**Implementation Notes:**
- Design collections with sharding in mind (use consistent shard keys)
- Document potential shard keys for future: `departmentId`, `learnerId`
- Monitor database size and query performance
- Plan sharding strategy around 1TB database size or performance degradation

---

### Q3: Real-time Updates?
**Decision:** Polling acceptable - no real-time updates for Phase 1

**Rationale:**
- Simpler architecture without WebSocket infrastructure
- Reduces server resource requirements
- Most use cases don't require sub-second updates
- Can add real-time features in future phases if needed

**Implementation Notes:**
- Implement efficient polling endpoints with `If-Modified-Since` headers
- Use ETags for cache validation
- Document recommended polling intervals (e.g., 30 seconds for dashboards)
- Design APIs to support future WebSocket upgrade

**Follow-up Questions:**
- **Q3a:** Should we still implement SSE for specific use cases like SCORM session monitoring?
- **Q3b:** What's the acceptable polling interval for learner dashboards? (suggested: 30-60 seconds)

---

## Authentication & Authorization

### Q4: Multi-Role Users
**Decision:** Roles are additive; Learners are distinct from Staff

**Rationale:**
- Staff can accumulate multiple administrative/teaching roles
- Learners remain separate to maintain clear learner experience
- Prevents permission confusion and security issues
- Aligns with real-world organizational structures

**Implementation Notes:**
- User model has `roles` array
- Separate Staff and Learner collections (different `_id` from User)
- Staff can have: `['instructor', 'department-admin', 'content-admin', 'billing-admin', 'system-admin']`
- Learners cannot be Staff (no overlap in collections)
- Middleware checks against all roles (OR logic)
- API responses filter data based on highest permission level

**Follow-up Questions:**
- **Q4a:** If a staff member needs professional development (take courses), should we:
  - Create a separate Learner account for them?
  - Allow Staff to view/take courses in a "learner mode"?
  - Restrict staff from being learners entirely?

- **Q4b:** For permission checks, should we use the highest privilege role or require explicit role specification?
  - Example: A user with both `instructor` and `department-admin` - which role applies when creating content?

---

### Q5: Department Membership Complexity
**Decision:** Yes, staff can have different subroles in different departments/subdepartments

**Rationale:**
- Reflects real organizational structures
- Staff often teach across departments
- Administrative responsibilities may vary by department
- Provides granular access control

**Implementation Notes:**
```typescript
{
  departmentMemberships: [
    { 
      departmentId: ObjectId("CS"), 
      roles: ["instructor", "content-admin"],
      isPrimary: true
    },
    { 
      departmentId: ObjectId("Math"), 
      roles: ["instructor"],
      isPrimary: false
    }
  ]
}
```
- Permissions are OR across all departments (staff sees all content they can access)
- Use `isPrimary` to determine default department scope
- Content created is scoped to department where action occurs (requires department context in request)

**Follow-up Questions:**
- **Q5a:** When staff creates content, which department should it belong to?
  - Their primary department by default?
  - Require explicit department selection?
  - Allow multi-department assignment at creation?

- **Q5b:** Should we limit the number of department memberships per staff? (suggested: 10 max)

---

### Q6: Token Expiration Strategy
**Decision:** Environment-specific expiration times

**Rationale:**
- Development: Longer tokens reduce login friction during development
- Production: Shorter tokens improve security posture
- Balances developer experience with security requirements

**Implementation Notes:**
```javascript
// Environment-based configuration
const tokenConfig = {
  development: {
    accessToken: '7d',
    refreshToken: '30d'
  },
  test: {
    accessToken: '2h',
    refreshToken: '6h'
  },
  production: {
    accessToken: '2h',
    refreshToken: '6h'
  }
}
```
- Implement automatic token refresh 5 minutes before expiration (frontend)
- Backend should issue new access token when refresh token used
- Sliding window for refresh tokens (extend on use)

**Follow-up Questions:**
- **Q6a:** Should refresh token be extended each time it's used, or have absolute expiration?
  - Sliding window: Each use extends the 6h window
  - Absolute: 6h from initial issue, no extensions

---

## Academic Structure

### Q7: Program-Course Relationship
**Decision:** Many-to-many - one course can be used by multiple programs

**Rationale:**
- Reduces content duplication
- Common courses (e.g., "Math 101") can be shared
- Authors maintain ownership regardless of program use
- Enables course catalog approach

**Implementation Notes:**
- Course model does NOT have `program` field
- Programs reference courses through intermediary (ProgramCourse junction)
- Track course usage across programs for analytics
- Original authors remain in `createdBy` and `instructors` array
- Programs can override course settings (passing score, max attempts)

```javascript
// Program → Course relationship
ProgramCourse: {
  programId: ObjectId,
  courseId: ObjectId,
  subProgramId: ObjectId,
  sequence: Number,
  isRequired: Boolean,
  // Program-specific overrides
  passingScoreOverride: Number,
  maxAttemptsOverride: Number
}
```

**Follow-up Questions:**
- **Q7a:** When a course is updated, should all programs using it see the update immediately or require manual update approval?
- **Q7b:** Should programs be able to "fork" a shared course to customize it?

---

### Q8: SubProgram Granularity
**Decision:** Keep 2 levels - Program → SubProgram

**Rationale:**
- Matches current V1 structure (ProgramLevel)
- Sufficient for most educational structures (Year 1, Year 2, Semester 1, etc.)
- Simpler data model and queries
- Can be extended later if needed

**Implementation Notes:**
- Program has many SubPrograms
- SubProgram belongs to one Program
- SubPrograms have `order` field for sequencing
- Academic Terms are separate from SubPrograms (for scheduling)

---

### Q9: Course Prerequisites
**Decision:** Allow overrides occasionally, but enforce automatically without override by default. Allow signup, but check at course start.

**Rationale:**
- Soft enforcement improves user experience
- Admin flexibility handles edge cases
- Checks at course start prevent wasted effort
- Balances academic rigor with administrative needs

**Implementation Notes:**
```javascript
// Course Prerequisites
Course: {
  prerequisites: [
    {
      courseId: ObjectId,
      minimumGrade: String, // 'C', 'B', 'A' or null
      isStrict: Boolean // if true, blocks even with override
    }
  ]
}

// Enrollment validation
- On enrollment creation: WARNING if prerequisites not met
- On course start (first module access): HARD CHECK prerequisites
- Admin override flag in enrollment: bypassPrerequisites: Boolean
```

**Follow-up Questions:**
- **Q9a:** Who can grant prerequisite overrides?
  - Only department-admins?
  - Instructors can override for their courses?
  - System-admins only?

- **Q9b:** Should we track prerequisite waivers for auditing?

---

### Q10: Class Capacity Enforcement
**Decision:** Waitlist system

**Rationale:**
- Better student experience than hard blocks
- Allows automatic enrollment when space opens
- Provides visibility into demand
- Remember: Course = learning segments/content, Class = cohort of learners

**Implementation Notes:**
```javascript
Class: {
  capacity: Number,
  enrollmentCount: Number, // current enrolled
  waitlistCount: Number,
  waitlist: [
    {
      learnerId: ObjectId,
      position: Number,
      addedAt: Date
    }
  ]
}

// Enrollment flow
1. Check capacity
2. If full → add to waitlist
3. When enrollment dropped → auto-enroll from waitlist (FIFO)
4. Send notification to waitlist learner
```

**Follow-up Questions:**
- **Q10a:** Should waitlist positions be strict FIFO or allow priority (e.g., by enrollment date in program)?
- **Q10b:** Maximum waitlist length? (suggested: 2x capacity)
- **Q10c:** Should waitlist have expiration? (learner removed after X days if no response to enrollment offer)

---

## Content Management

### Q11: SCORM Package Sharing
**Decision:** Department-admins select packages to share; system-admins add to global shared list

**Rationale:**
- Gives department control over their content
- Allows for institutional knowledge sharing
- System-admins curate high-quality global content
- Prevents unauthorized content spread

**Implementation Notes:**
```javascript
ScormPackage: {
  visibility: String, // 'private', 'department', 'shared', 'global'
  department: ObjectId,
  sharedWithDepartments: [ObjectId], // for 'shared' visibility
  uploadedBy: ObjectId,
  createdBy: ObjectId
}

// Permissions
- Private: Only creator and department-admins in same department
- Department: All staff in department
- Shared: Specific departments (set by department-admin)
- Global: All departments (set by system-admin)
```

**Follow-up Questions:**
- **Q11a:** Can instructors share their packages, or only department-admins?
- **Q11b:** Should we track package usage across departments for the creator?

---

### Q12: Content Versioning
**Decision:** Snapshot on enrollment with versioning; notify of updates that can be replaced in enrollment queue

**Rationale:**
- Learners get consistent experience (no mid-course changes)
- Instructors can improve content without disrupting active learners
- Learners can opt-in to updates if desired
- Maintains academic integrity

**Implementation Notes:**
```javascript
CourseModule: {
  currentVersion: ObjectId, // ref: CourseModuleVersion
  versions: [ObjectId] // history
}

CourseModuleVersion: {
  versionNumber: Number,
  content: Object,
  publishedAt: Date,
  publishedBy: ObjectId,
  isActive: Boolean
}

CourseEnrollment: {
  moduleSnapshots: [
    {
      moduleId: ObjectId,
      versionId: ObjectId, // frozen at enrollment
      hasUpdate: Boolean, // flag when new version available
      updatedNotifiedAt: Date
    }
  ]
}

// Update flow
1. Instructor publishes new version
2. Flag all active enrollments: hasUpdate = true
3. Learner sees "Update Available" badge
4. Learner can choose to update (admin can force update)
```

**Follow-up Questions:**
- **Q12a:** Should version updates reset learner progress in that module?
- **Q12b:** How many versions should we retain? (suggested: last 5 versions)
- **Q12c:** Can learners view changelog/diff between versions before updating?

---

### Q13: Media Storage
**Decision:** Environment-specific storage strategy

**Rationale:**
- Development: Local files simplify setup
- Production: Cloud storage provides scalability and CDN integration
- Cost-effective for different environments

**Implementation Notes:**
```javascript
// Storage configuration
const storageConfig = {
  development: {
    type: 'local',
    path: './uploads'
  },
  test: {
    type: 's3', // or DigitalOcean Spaces
    bucket: 'lms-test',
    cdn: false
  },
  production: {
    type: 's3',
    bucket: 'lms-prod',
    cdn: true,
    cdnDomain: 'cdn.lms.example.com'
  }
}

// File URL generation
- Local: /uploads/scorm/package-id/file.html
- S3: https://s3.amazonaws.com/bucket/scorm/package-id/file.html
- CDN: https://cdn.lms.example.com/scorm/package-id/file.html
```

**Follow-up Questions:**
- **Q13a:** Should we support multiple cloud providers (AWS S3, DigitalOcean Spaces, Azure Blob)?
  - Suggestion: Abstract storage layer, support S3-compatible APIs

- **Q13b:** File naming strategy?
  - UUID-based: `a3b2c1d4-e5f6.zip`
  - Hierarchical: `{department}/{course}/{package-id}/content.zip`

---

### Q14: Exercise Question Bank
**Decision:** Support both embedded and referenced questions; support randomization and windowing

**Rationale:**
- Flexibility for different use cases
- Question banks enable reusability
- Randomization prevents cheating
- Windowing allows large banks with subset selection

**Implementation Notes:**
```javascript
// Approach 1: Embedded (simple exams)
Exercise: {
  questions: [
    {
      questionText: String,
      options: [...],
      correctAnswer: String
    }
  ]
}

// Approach 2: Referenced (question bank)
Exercise: {
  questionBank: ObjectId, // ref: QuestionBank
  questionSelection: {
    method: String, // 'all', 'random', 'windowed'
    count: Number, // for random selection
    categories: [String], // for windowed selection
    randomizeOrder: Boolean
  },
  selectedQuestions: [ObjectId] // cached for consistency during attempt
}

QuestionBank: {
  name: String,
  questions: [ObjectId], // ref: Question
  categories: [String],
  department: ObjectId
}

// Randomization
- On exam start: Select questions per config, cache in attempt
- Learner sees same questions for all attempts
- Different learners see different questions (if random)
```

**Follow-up Questions:**
- **Q14a:** Should question statistics (difficulty, correct %) be tracked across all exams using that question?
- **Q14b:** Can questions be updated if used in a question bank? What happens to active exams?
- **Q14c:** Should question banks be shareable like SCORM packages (private/department/shared/global)?

---

## Enrollment & Lifecycle

### Q15: Enrollment Workflows
**Decision:** 
- Programs: applied → enrolled → active → [on-leave] → completed/withdrawn
- Learners can self-enroll
- Active triggered by opening first course in program/subprogram

**Rationale:**
- "Applied" state supports admissions workflow
- Self-enrollment reduces administrative burden
- First access trigger indicates genuine engagement
- Flexible status tracking supports various scenarios

**Implementation Notes:**
```javascript
ProgramEnrollment: {
  status: String, // applied, enrolled, active, on-leave, completed, withdrawn
  statusHistory: [
    {
      status: String,
      reason: String,
      changedBy: ObjectId,
      changedAt: Date
    }
  ],
  
  appliedAt: Date,
  enrolledAt: Date, // admin approval
  activatedAt: Date, // first course access
  completedAt: Date,
  withdrawnAt: Date
}

// Status transitions
- applied → enrolled: Admin/system approval
- enrolled → active: Learner opens first course module
- active → on-leave: Manual action (learner/admin)
- active → completed: All requirements met
- * → withdrawn: Learner/admin action
```

**Follow-up Questions:**
- **Q15a:** For self-enrollment, should learners go directly to "enrolled" or start at "applied" pending approval?
  - Suggestion: Configurable per program (some allow instant enrollment, others require approval)

- **Q15b:** Should "on-leave" have a maximum duration? Auto-withdraw after X months?

- **Q15c:** What triggers "completed" status?
  - All required courses passed?
  - Credential awarded?
  - Manual marking by admin?

---

### Q16: Withdrawal Policies
**Decision:** Preserve all data → Archive after 30 days → Allow GDPR hard delete on request; Learners can re-enroll with progress carryover

**Rationale:**
- Data preservation supports academic records
- Archival improves database performance
- GDPR compliance maintained
- Re-enrollment with progress enhances learner experience

**Implementation Notes:**
```javascript
// Withdrawal flow
1. Enrollment status → 'withdrawn'
2. withdrawnAt = now, withdrawnBy = userId
3. Soft delete: isDeleted = false (still in main collection)

// After 30 days (background job)
4. Move to archive collection
5. isArchived = true, archivedAt = Date

// GDPR request
6. Hard delete from archive
7. Anonymize in audit logs (replace userId with "DELETED_USER")

// Re-enrollment
- Check for previous enrollment (including archived)
- If found: copy progress data, create new enrollment
- Link to previous enrollment: previousEnrollmentId
- Progress carryover configurable per program

ProgramEnrollment: {
  isDeleted: Boolean,
  deletedAt: Date,
  deletedBy: ObjectId,
  isArchived: Boolean,
  archivedAt: Date,
  previousEnrollmentId: ObjectId // for re-enrollments
}
```

**Follow-up Questions:**
- **Q16a:** Should archived data be in separate MongoDB collection or same collection with flag?
  - Suggestion: Separate collection for performance

- **Q16b:** What data should carry over on re-enrollment?
  - All progress?
  - Only completed courses?
  - None (fresh start)?

- **Q16c:** Should re-enrollment reset enrollment date or keep original?

---

### Q17: Concurrent Enrollments
**Decision:** No limit on concurrent enrollments

**Rationale:**
- Maximizes learner flexibility
- Supports diverse learning paths
- No technical reason to limit
- Business rules can be added later if needed

**Implementation Notes:**
- No validation on enrollment count
- Dashboard shows all active enrollments
- May want to implement warnings:
  - "You're enrolled in 10+ programs. Are you sure?"
  - "This will be your 6th active course enrollment"

**Follow-up Questions:**
- **Q17a:** Should we track enrollment overload for analytics/reporting?
- **Q17b:** Should advisors/admins be notified if learner exceeds threshold (e.g., 5+ concurrent courses)?

---

## Analytics & Reporting

### Q18: Analytics Data Retention
**Decision:** Granular retention policy based on data type

**Rationale:**
- Balance storage costs with analytics needs
- Detailed data for active learning, aggregated for historical
- Program completion is key milestone for aggregation
- Audit logs need shorter retention due to volume

**Implementation Notes:**
```javascript
// Retention policy
{
  learningEvents: {
    retention: 'until class completion',
    aggregation: 'per class',
    aggregateFields: ['eventType', 'count', 'avgDuration']
  },
  contentAttempts: {
    retention: 'until program completion',
    aggregation: 'after program completion',
    aggregateFields: ['attemptCount', 'bestScore', 'avgScore', 'totalTime']
  },
  scormCMI: {
    retention: 'until program completion',
    aggregation: 'after program completion',
    aggregateFields: ['finalScore', 'completionStatus', 'totalTime']
  },
  auditLogs: {
    retention: '3 months',
    archival: 'yes',
    archiveLocation: 'cold storage'
  }
}

// Aggregation tables
LearningEventAggregate: {
  classId: ObjectId,
  eventType: String,
  count: Number,
  avgDuration: Number,
  dateRange: { start: Date, end: Date }
}

ContentAttemptAggregate: {
  learnerId: ObjectId,
  courseId: ObjectId,
  attemptCount: Number,
  bestScore: Number,
  avgScore: Number,
  totalTimeSeconds: Number
}
```

**Follow-up Questions:**
- **Q18a:** Should we keep raw data for completed programs for a grace period (e.g., 90 days) before aggregation?
- **Q18b:** Should aggregation be triggered manually or automatically on program completion?
- **Q18c:** For audit logs archive, should we keep GDPR-sensitive actions longer (e.g., deletion requests, data exports)?

---

### Q19: Windowed Metrics Defaults
**Decision:** 4 weeks default; Support weekly, monthly, quarterly, yearly; Custom range supported

**Rationale:**
- 4 weeks balances recency with trend visibility
- Standard periods align with academic calendars
- Custom range provides flexibility for specific analysis

**Implementation Notes:**
```javascript
// API query parameters
GET /api/v2/analytics/programs?window=4weeks
GET /api/v2/analytics/programs?window=weekly
GET /api/v2/analytics/programs?window=custom&start=2026-01-01&end=2026-01-31

// Window configurations
const windows = {
  weekly: { days: 7 },
  monthly: { days: 30 },
  '4weeks': { days: 28 }, // default
  quarterly: { days: 90 },
  yearly: { days: 365 },
  custom: { start: Date, end: Date }
}

// Validation
- Custom range: max 365 days
- Start date must be before end date
- Cannot query future dates
```

---

### Q20: Abandonment Definition
**Decision:** No activity for 60 days → Auto-withdraw

**Rationale:**
- 60 days provides reasonable time for temporary pauses
- Automatic withdrawal keeps data clean
- Prevents indefinitely "active" but abandoned enrollments

**Implementation Notes:**
```javascript
// Background job (daily)
1. Find enrollments with lastAccessedAt < 60 days ago
2. Status = 'active' or 'enrolled'
3. Send warning email at 50 days, 55 days
4. Auto-withdraw at 60 days
5. Set status = 'withdrawn', reason = 'auto-abandoned'

// Abandonment tracking
EnrollmentAbandonmentLog: {
  enrollmentId: ObjectId,
  lastAccessedAt: Date,
  daysSinceAccess: Number,
  warningsSent: [Date],
  autoWithdrawnAt: Date
}
```

**Follow-up Questions:**
- **Q20a:** Should learners be able to opt-out of auto-withdrawal (keep enrollment active indefinitely)?
- **Q20b:** Different thresholds for different enrollment types?
  - Program: 60 days
  - Course: 30 days
  - Class: 14 days (cohort-based, stricter)

---

### Q21: Real-Time vs Batch Analytics
**Decision:** Real-time for individual learner; Batch/cached for aggregate reports

**Rationale:**
- Individual learner dashboards require up-to-date data
- Aggregate reports can tolerate slight staleness
- Batch processing reduces database load
- Caching improves response times

**Implementation Notes:**
```javascript
// Real-time endpoints (no caching)
GET /api/v2/analytics/learners/me/progress
GET /api/v2/analytics/learners/me/dashboard

// Batch/cached endpoints (cache 2 hours)
GET /api/v2/analytics/programs
GET /api/v2/analytics/departments/:id/overview
GET /api/v2/analytics/scorm/reports

// Background jobs
- Every 2 hours: Regenerate aggregate analytics
- Every 6 hours: Regenerate department summaries
- Every 24 hours: Regenerate trend analyses

// Cache invalidation events
- Enrollment status change → invalidate program analytics
- Content attempt completion → invalidate course analytics
- New enrollment → invalidate department analytics
```

**Follow-up Questions:**
- **Q21a:** Should real-time analytics have any caching (e.g., 5 minute cache)?
- **Q21b:** Should we allow admins to force cache refresh for specific reports?

---

### Q22: Content Recommendations
**Decision:** Phase 1 = None; Future = Statistical and ML-based

**Rationale:**
- Focus Phase 1 on core functionality
- Collect data during Phase 1 for future ML training
- Statistical analysis can launch in Phase 2
- ML requires significant data volume

**Implementation Notes:**
```javascript
// Phase 1: Data collection only
- Track all content interactions
- Store completion rates, scores, time spent
- Record content sequences (what learners access next)
- Log drop-off points

// Phase 2-3: Rule-based + Statistical
- Flag content with completion rate < 70%
- Identify prerequisite correlations
- Suggest optimal content ordering
- Highlight difficulty mismatches

// Future: ML-based
- Predict at-risk learners
- Recommend personalized learning paths
- Optimize content difficulty
- Identify similar learner profiles
```

**Follow-up Questions:**
- **Q22a:** Should we design the database schema now to support future ML features?
  - Suggestion: Yes, add fields but don't implement logic

- **Q22b:** What data should we prioritize collecting for future recommendations?
  - Content view patterns?
  - Time-of-day learning patterns?
  - Device usage patterns?

---

## SCORM Implementation

### Q23: SCORM CMI Storage
**Decision:** Store full CMI during course; Store summary + aggregate after completion

**Rationale:**
- Full CMI needed for SCORM compliance during active learning
- Summary sufficient for learner transcripts
- Aggregate data supports analytics
- Reduces storage costs for completed courses

**Implementation Notes:**
```javascript
// During course (ScormAttempt)
ScormAttempt: {
  cmi: Object, // Full CMI data model (10-100KB)
  status: 'in-progress'
}

// After course completion (background job)
1. Extract summary
ScormAttemptSummary: {
  attemptId: ObjectId,
  learnerId: ObjectId,
  packageId: ObjectId,
  score: { raw, scaled, min, max },
  completionStatus: String,
  successStatus: String,
  totalTime: Number,
  completedAt: Date
}

2. Extract aggregate for analytics
ScormAnalyticsAggregate: {
  packageId: ObjectId,
  learnerId: ObjectId,
  attemptCount: Number,
  bestScore: Number,
  avgTimePerAttempt: Number,
  completionRate: Number
}

3. Delete full CMI from ScormAttempt
4. Mark attempt as archived

// Storage savings
- Full CMI: ~50KB average
- Summary: ~2KB
- 95% storage reduction for completed attempts
```

**Follow-up Questions:**
- **Q23a:** Should we keep full CMI for failed attempts (for debugging)?
- **Q23b:** Grace period before archival? (suggested: 30 days after course completion)
- **Q23c:** Should we allow learners to download their full CMI data before archival?

---

### Q24: SCORM Session Timeout
**Decision:** 15-minute timeout with progress saved; Allow resume from last position

**Rationale:**
- 15 minutes balances security with user experience
- Progress saving prevents data loss
- Resume capability critical for learner satisfaction
- Heartbeat every 15 seconds ensures session alive during active use

**Implementation Notes:**
```javascript
// Session management
ScormSession: {
  attemptId: ObjectId,
  sessionId: String, // UUID
  startedAt: Date,
  lastHeartbeatAt: Date,
  expiresAt: Date, // lastHeartbeat + 15 minutes
  suspendData: String, // SCORM bookmark
  isActive: Boolean
}

// Flow
1. Player loads → create session
2. Heartbeat every 15 seconds updates lastHeartbeat, expiresAt
3. If no heartbeat for 15 min → session expires, commit data
4. Learner returns → create new session
5. Load from suspend_data → resume at last position

// API endpoint
POST /api/v2/scorm/sessions/:attemptId/heartbeat
- Updates lastHeartbeatAt
- Extends expiresAt by 15 minutes
- Returns: { sessionActive: true, timeRemaining: 900 }

// Recovery
- suspend_data saved on every commit
- lesson_location tracked continuously
- On resume: return to lesson_location
```

**Follow-up Questions:**
- **Q24a:** ✅ **ANSWERED:** Store progress and restart where left off with 15 minute timeout
  - **Implementation confirmed:** Use suspend_data and lesson_location for resume

- **Q24b:** Should we show a warning before session expires? (e.g., "2 minutes remaining")
  
- **Q24c:** If learner closes browser without proper exit, how long before we commit their data?
  - Suggestion: Next heartbeat timeout (15 min) triggers auto-commit

---

### Q25: SCORM Package Re-attempts
**Decision:** Block after max attempts; Admin override allowed; Best score (configurable to average)

**Rationale:**
- Max attempts enforces academic rigor
- Admin flexibility handles edge cases
- Best score motivates improvement
- Configurability supports different grading philosophies

**Implementation Notes:**
```javascript
ScormPackage: {
  maxAttempts: Number, // null = unlimited
  scoreCalculationMethod: String, // 'best', 'latest', 'average', 'average-last-n'
  averageLastN: Number // for average-last-n method
}

// Attempt validation
function canStartAttempt(learnerId, packageId) {
  const attempts = await ScormAttempt.find({ learnerId, packageId });
  const package = await ScormPackage.findById(packageId);
  
  if (!package.maxAttempts) return true; // unlimited
  if (attempts.length < package.maxAttempts) return true;
  
  // Check admin override
  const enrollment = await CourseEnrollment.findOne({
    learnerId,
    'course': package.course
  });
  
  if (enrollment.bypassAttemptLimit) return true;
  
  return false; // blocked
}

// Score calculation
function calculateFinalScore(attempts, method) {
  switch(method) {
    case 'best':
      return Math.max(...attempts.map(a => a.score.raw));
    case 'latest':
      return attempts[attempts.length - 1].score.raw;
    case 'average':
      return attempts.reduce((sum, a) => sum + a.score.raw, 0) / attempts.length;
    case 'average-last-n':
      const lastN = attempts.slice(-package.averageLastN);
      return lastN.reduce((sum, a) => sum + a.score.raw, 0) / lastN.length;
  }
}
```

**Follow-up Questions:**
- **Q25a:** Should admin override be logged/audited?
- **Q25b:** Can learners see how many attempts they have remaining?
- **Q25c:** Should we allow "practice attempts" that don't count toward the limit?

---

### Q26: SCORM Content Updates
**Decision:** Version courses with new packages; New package = new course after publication; Keep original course on learner enrollment until "updated"; Give "update available" badges; Don't change program requirements (allow either course)

**Rationale:**
- Versioning prevents disruption to active learners
- Learner choice improves experience
- Program flexibility supports continuous improvement
- Badge system provides clear communication

**Implementation Notes:**
```javascript
// Course versioning
Course: {
  _id: ObjectId,
  code: String, // "CS101"
  version: Number, // 1, 2, 3...
  parentCourseId: ObjectId, // original course
  isActiveVersion: Boolean, // only one true per code
  deprecatedAt: Date,
  successorCourseId: ObjectId // next version
}

ScormPackage: {
  courseId: ObjectId, // specific course version
  version: Number
}

// Program requirements
ProgramCourse: {
  programId: ObjectId,
  courseOptions: [ObjectId], // [CS101v1, CS101v2]
  minimumVersion: Number, // optional, require v2+
  acceptedVersions: [Number], // [1, 2] or null = any
  isDeprecated: Boolean
}

// Learner enrollment
CourseEnrollment: {
  courseId: ObjectId, // locked to version
  hasUpdate: Boolean, // new version available
  updateNotifiedAt: Date,
  canUpgrade: Boolean, // admin can disable
  upgradeFromVersionId: ObjectId
}

// Update flow
1. Instructor creates Course v2
2. Flag enrollments in v1: hasUpdate = true
3. Learner dashboard shows "Update Available" badge
4. Learner can:
   - Stay on v1 (counts toward program)
   - Upgrade to v2 (progress reset or carried over?)
5. Admin can force upgrade with deadline
```

**Follow-up Questions:**
- **Q26a:** When learner upgrades to new version, what happens to progress?
  - Reset completely?
  - Carry over completed modules that exist in both versions?
  - Manual mapping by instructor?

- **Q26b:** Should programs have a sunset date for old versions? (e.g., v1 accepted until 2027-01-01)

- **Q26c:** How do we handle SCORM packages within versioned courses?
  - Package version tied to course version?
  - Packages can be updated independently within a course?

---

## Performance & Scalability

### Q27: Caching Strategy
**Decision:** Mixed cache invalidation (event-based + TTL); 2-hour TTL for most resources

**Rationale:**
- Event-based invalidation ensures freshness after updates
- TTL provides fallback for missed events
- 2 hours balances freshness with performance
- Course catalogs change infrequently

**Implementation Notes:**
```javascript
// Cache configuration
const cacheConfig = {
  userProfile: {
    ttl: 24 * 60 * 60, // 24 hours
    invalidateOn: ['profile.update', 'role.change']
  },
  courseCatalog: {
    ttl: 2 * 60 * 60, // 2 hours
    invalidateOn: ['course.create', 'course.update', 'course.delete']
  },
  departmentTree: {
    ttl: 2 * 60 * 60,
    invalidateOn: ['department.create', 'department.update', 'department.delete']
  },
  scormPackages: {
    ttl: 2 * 60 * 60,
    invalidateOn: ['package.create', 'package.update', 'package.delete']
  },
  analyticsDashboard: {
    ttl: 2 * 60 * 60,
    invalidateOn: ['enrollment.complete', 'attempt.complete']
  }
}

// Cache keys
- User: `user:${userId}:profile`
- Courses: `courses:department:${deptId}:list`
- Department tree: `department:tree`
- SCORM packages: `scorm:department:${deptId}:packages`

// Invalidation
eventEmitter.on('course.update', async (courseId) => {
  await redis.del(`courses:*`); // wildcard delete
  await redis.del(`course:${courseId}:*`);
});
```

**Follow-up Questions:**
- **Q27a:** Should we implement cache warming (pre-populate cache on server start)?
- **Q27b:** Cache hit/miss metrics - should we track and alert on low hit rates?

---

### Q28: Pagination Defaults
**Decision:** 25 per page for most lists; 50 for attempts; 10 for analytics; Max 100

**Rationale:**
- 25 is comfortable for browsing without overwhelming
- Attempts often need more context (50)
- Analytics are dense, smaller pages better (10)
- 100 max prevents performance issues

**Implementation Notes:**
```javascript
// Pagination config
const paginationDefaults = {
  courses: { default: 25, max: 100 },
  learners: { default: 25, max: 100 },
  attempts: { default: 50, max: 100 },
  analytics: { default: 10, max: 100 },
  programs: { default: 25, max: 100 },
  enrollments: { default: 25, max: 100 }
}

// API response
{
  status: 'success',
  data: [...],
  pagination: {
    page: 1,
    limit: 25,
    total: 156,
    totalPages: 7,
    hasNext: true,
    hasPrev: false,
    links: {
      first: '/api/v2/courses?page=1&limit=25',
      last: '/api/v2/courses?page=7&limit=25',
      next: '/api/v2/courses?page=2&limit=25',
      prev: null
    }
  }
}

// Query validation
- page: min 1, default 1
- limit: min 1, max per resource, default per resource
- Invalid values → return 400 Bad Request
```

---

### Q29: File Upload Limits
**Decision:** Very robust limits; Trust instructors; Plan chunk upload for v2.2

**Rationale:**
- Generous limits prevent legitimate content from being blocked
- Instructors are trusted users
- Chunk upload handles very large files
- Can adjust limits based on actual usage

**Implementation Notes:**
```javascript
// Upload limits (generous)
const uploadLimits = {
  scorm: {
    maxSize: 500 * 1024 * 1024, // 500 MB
    allowedExtensions: ['.zip'],
    mimeTypes: ['application/zip']
  },
  video: {
    maxSize: 2 * 1024 * 1024 * 1024, // 2 GB
    allowedExtensions: ['.mp4', '.webm', '.mov'],
    mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime']
  },
  document: {
    maxSize: 100 * 1024 * 1024, // 100 MB
    allowedExtensions: ['.pdf', '.docx', '.pptx'],
    mimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument...']
  },
  image: {
    maxSize: 10 * 1024 * 1024, // 10 MB
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.svg'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml']
  },
  concurrent: {
    maxUploads: 3 // per user
  }
}

// V2.2: Chunk upload
- Split files into 5MB chunks
- Upload chunks sequentially or parallel
- Assemble on server
- Resume support for failed uploads
```

**Follow-up Questions:**
- **Q29a:** Should we scan uploaded files for viruses/malware?
- **Q29b:** Should we automatically transcode videos to web-friendly formats?
- **Q29c:** Compress SCORM packages automatically if >X MB?

---

### Q30: Database Indexing Strategy
**Decision:** Use current approach from Ideal_MongoDB_DataObjects.md; Industry standards for monitoring

**Rationale:**
- Documented indexes are well-researched
- Industry standards proven at scale
- Can fine-tune based on actual query patterns

**Implementation Notes:**
```javascript
// Slow query logging (MongoDB)
db.setProfilingLevel(1, { slowms: 100 }); // log queries >100ms

// Monitor slow queries
- Threshold: 100ms (log)
- Alert threshold: 500ms (notify admins)
- Critical threshold: 1000ms (immediate action)

// Index usage analysis
- Weekly: Analyze index usage stats
- Identify unused indexes (drop candidates)
- Identify missing indexes (query scans)

// Tools
- MongoDB Atlas: Built-in performance advisor
- Self-hosted: pt-query-digest, mongo-slow-query-analyzer

// Index creation strategy
1. Create all indexes from Ideal_MongoDB_DataObjects.md on deployment
2. Monitor query performance for 2 weeks
3. Analyze slow queries
4. Add/remove indexes as needed
5. Document index changes in migration files
```

---

## Migration & Deployment

### Q31: Migration Window
**Decision:** Maintenance window (2 hour max); Plan zero-downtime for v2.5

**Rationale:**
- Simpler initial migration with downtime
- 2 hours sufficient for data volume
- Zero-downtime complexity deferred
- Can practice migration on test environment

**Implementation Notes:**
```javascript
// Migration plan
1. Schedule maintenance window (2 AM UTC, weekend)
2. Notify users 1 week, 3 days, 1 day, 1 hour before
3. Put V1 in read-only mode
4. Backup database
5. Run migration scripts (estimated 1 hour)
6. Validate data integrity
7. Switch DNS/load balancer to V2
8. Monitor for issues
9. Keep V1 available for emergency rollback (1 week)

// Migration checklist
- [ ] Test migration on staging
- [ ] Backup strategy confirmed
- [ ] Rollback plan documented
- [ ] Monitoring dashboards ready
- [ ] Support team briefed
- [ ] User communications sent
```

**Follow-up Questions:**
- **Q31a:** Should we do a trial migration first with a subset of data?
- **Q31b:** Rollback strategy if migration fails at 90% complete?

---

### Q32: V1 Sunset Timeline
**Decision:** Hard cutover - V1 offline when V2 launches; V1 docs remain available

**Rationale:**
- No V1 production clients exist yet
- Eliminates need for parallel maintenance
- Reduces complexity and costs
- Documentation preserved for reference

**Implementation Notes:**
```javascript
// Cutover plan
1. V2 launches
2. V1 API returns 410 Gone
3. V1 documentation moved to /docs/v1-archived
4. Redirect all V1 API calls to V2 (with version warning)

// V1 redirect response
HTTP 301 Moved Permanently
Location: /api/v2/courses
X-API-Version-Deprecated: v1
X-Successor-Version: v2

{
  error: "API v1 has been sunset",
  message: "Please use /api/v2/courses",
  documentationUrl: "/docs/v1-archived"
}

// Preserve V1 docs
- Archive to /docs/v1-archived
- Include migration guide V1 → V2
- Keep Swagger docs available (read-only)
```

---

### Q33: Data Validation Strategy
**Decision:** Focus on test data validation; Build comprehensive validation suite for DB monitoring

**Rationale:**
- No production V1 data to migrate currently
- Mock data easier to validate and regenerate
- Validation suite valuable for ongoing DB health
- Prepares for future rollouts

**Implementation Notes:**
```javascript
// Validation test suite
describe('Database Integrity Tests', () => {
  test('User-Staff-Learner shared _id pattern', async () => {
    const users = await User.find();
    for (const user of users) {
      if (user.roles.includes('staff')) {
        const staff = await Staff.findById(user._id);
        expect(staff).toBeDefined();
        expect(staff._id.toString()).toBe(user._id.toString());
      }
    }
  });

  test('Department hierarchy integrity', async () => {
    const departments = await Department.find();
    for (const dept of departments) {
      if (dept.parentDepartment) {
        const parent = await Department.findById(dept.parentDepartment);
        expect(parent).toBeDefined();
      }
    }
  });

  test('Course-Program relationship integrity', async () => {
    const enrollments = await CourseEnrollment.find();
    for (const enrollment of enrollments) {
      const course = await Course.findById(enrollment.course);
      const program = await Program.findById(enrollment.program);
      expect(course).toBeDefined();
      expect(program).toBeDefined();
    }
  });

  test('Enrollment status transition validity', async () => {
    const validTransitions = {
      'applied': ['enrolled', 'withdrawn'],
      'enrolled': ['active', 'withdrawn'],
      'active': ['on-leave', 'completed', 'withdrawn'],
      'on-leave': ['active', 'withdrawn'],
      'completed': [],
      'withdrawn': []
    };

    const enrollments = await ProgramEnrollment.find();
    for (const enrollment of enrollments) {
      if (enrollment.statusHistory.length > 1) {
        for (let i = 1; i < enrollment.statusHistory.length; i++) {
          const prevStatus = enrollment.statusHistory[i-1].status;
          const currStatus = enrollment.statusHistory[i].status;
          expect(validTransitions[prevStatus]).toContain(currStatus);
        }
      }
    }
  });
});

// Monitoring dashboard
- Row counts per collection
- Orphaned references detection
- Duplicate detection
- Schema validation errors
- Index usage statistics
```

**Follow-up Questions:**
- **Q33a:** Should validation tests run automatically on deployment?
- **Q33b:** Should we implement database constraints (e.g., foreign key checks) or rely on application logic?

---

### Q34: Deployment Environment
**Decision:** Start with Docker; Test serverless; Possible hybrid approach

**Rationale:**
- Docker provides consistency across environments
- Serverless offers cost benefits for low-traffic periods
- Hybrid allows gradual migration
- Flexibility to optimize over time

**Implementation Notes:**
```javascript
// Docker setup
// Dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]

// docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    depends_on:
      - mongodb
      - redis
  
  mongodb:
    image: mongo:7
    volumes:
      - mongodb_data:/data/db
  
  redis:
    image: redis:alpine

// Monitoring
- Winston → CloudWatch/ELK
- Metrics → Prometheus + Grafana
- APM → Consider New Relic or DataDog for v2.3

// Serverless exploration (v2.2)
- AWS Lambda for read-heavy endpoints
- API Gateway integration
- Cold start optimization
- Cost analysis vs containers
```

**Follow-up Questions:**
- **Q34a:** Container orchestration needed?
  - Docker Compose (simple)
  - Kubernetes (scalable, complex)
  - AWS ECS/Fargate (managed)

- **Q34b:** CI/CD pipeline preferences?
  - GitHub Actions?
  - GitLab CI?
  - Jenkins?

---

### Q35: Backup Strategy
**Decision:** Tiered backup strategy based on data criticality; Activity replay log for high-frequency tables

**Rationale:**
- Frequently changing data needs more frequent backups
- Static data can be backed up less often
- Activity log enables minute-level recovery
- Cost-effective approach balancing safety and expense

**Implementation Notes:**
```javascript
// Backup tiers
const backupStrategy = {
  tier1: {
    collections: ['contentattempts', 'scormattempts', 'learningevents', 'auditlogs'],
    frequency: 'hourly',
    retention: '7 days',
    method: 'incremental'
  },
  tier2: {
    collections: ['courseenrollments', 'programenrollments', 'classenrollments'],
    frequency: 'every 6 hours',
    retention: '30 days',
    method: 'incremental'
  },
  tier3: {
    collections: ['users', 'staff', 'learners', 'courses', 'programs'],
    frequency: 'daily',
    retention: '90 days',
    method: 'full'
  },
  tier4: {
    collections: ['departments', 'academicyears', 'academicterms', 'settings'],
    frequency: 'weekly',
    retention: '1 year',
    method: 'full'
  }
}

// Activity replay log
ActivityLog: {
  timestamp: Date,
  collection: String,
  operation: String, // 'insert', 'update', 'delete'
  documentId: ObjectId,
  before: Object, // state before change
  after: Object, // state after change
  userId: ObjectId
}

// Backup to S3
- Tier 1: s3://lms-backups/tier1/hourly/
- Tier 2: s3://lms-backups/tier2/6hourly/
- Tier 3: s3://lms-backups/tier3/daily/
- Tier 4: s3://lms-backups/tier4/weekly/
- Activity log: s3://lms-backups/activity-log/

// Recovery objectives
RTO (Recovery Time Objective): 12 hours
RPO (Recovery Point Objective): 6 hours
  - With activity log replay: 1 hour for critical data

// SCORM packages & media backups
- Full backup: Weekly
- Incremental: Changes nightly
- Storage: AWS S3 + Glacier for archives
- Versioning enabled on S3 bucket
```

**Follow-up Questions:**
- **Q35a:** Should we implement automatic backup testing/restoration drills?
  - Suggestion: Monthly automated restore to test environment

- **Q35b:** Geographic redundancy for backups?
  - Multi-region S3 replication?
  - Separate cloud provider for ultimate redundancy?

- **Q35c:** Activity log retention - how long?
  - Suggestion: 30 days in hot storage, 90 days in cold storage

---

## Feature Additions (Beyond V1 Parity)

### Q36: New Features for V2
**Decision:** 
- **Phase 1 (V2.0):** Core implementation only
- **V2.2:** Social Learning + Mobile API Optimizations
- **V2.7:** Notifications + Gamification + Advanced Analytics

**Rationale:**
- Phase 1 focuses on feature parity and stability
- Social learning enables community (high priority)
- Mobile optimizations support accessibility
- Notifications and gamification enhance engagement
- Advanced analytics require data accumulation

**Implementation Notes:**
```javascript
// Roadmap
V2.0 (Phase 1 - 24 weeks)
- Core LMS functionality
- Feature parity with V1
- Stable foundation

V2.2 (8-12 weeks after V2.0)
- Social Learning
  * Discussion forums per course/module
  * Peer comments on content
  * Study groups
  * Learner profiles
  * Follow/unfollow learners
  
- Mobile API Optimizations
  * Offline mode support (service workers)
  * Reduced payload sizes (field selection)
  * Mobile-specific endpoints (/api/v2/mobile/*)
  * Progressive web app (PWA) support
  * Chunked downloads for SCORM packages

V2.7 (12-16 weeks after V2.2)
- Notifications System
  * Email notifications (assignments, deadlines)
  * SMS notifications (optional, configurable)
  * In-app notifications (bell icon)
  * Notification preferences per learner
  * Digest emails (daily/weekly summaries)

- Gamification
  * Badges for achievements
  * Points system
  * Leaderboards (opt-in, privacy-aware)
  * Streaks (consecutive days learning)
  * Course completion certificates

- Advanced Analytics
  * Predictive analytics (at-risk learners)
  * Learning path optimization
  * Content effectiveness scoring
  * Recommendation engine (ML-based)
  * Cohort comparison tools
```

**Follow-up Questions:**
- **Q36a:** Should we create detailed design documents for V2.2 and V2.7 now or after V2.0 launch?
  - Suggestion: High-level docs now, detailed docs after V2.0 stabilizes

- **Q36b:** For social learning, privacy controls?
  - Learner can opt-out of social features?
  - Choose what's visible on profile?
  - Moderate discussion forums?

- **Q36c:** Gamification opt-in or default?
  - Some learners may find points/leaderboards stressful
  - Suggestion: Opt-in with department/program-level defaults

---

## Summary of Decisions

| Category | Questions | Answered | Clarifications Needed |
|----------|-----------|----------|----------------------|
| Architecture & Design | 3 | 3 | 2 |
| Authentication & Authorization | 3 | 3 | 4 |
| Academic Structure | 4 | 4 | 3 |
| Content Management | 4 | 4 | 6 |
| Enrollment & Lifecycle | 3 | 3 | 6 |
| Analytics & Reporting | 5 | 5 | 4 |
| SCORM Implementation | 4 | 4 | 5 |
| Performance & Scalability | 4 | 4 | 3 |
| Migration & Deployment | 5 | 5 | 4 |
| Feature Additions | 1 | 1 | 3 |
| **TOTAL** | **36** | **36** | **40** |

---

## Critical Clarifications Needed Before Implementation

### High Priority (Need answers for Phase 1)

1. **Q4a:** Staff professional development - separate learner account or "learner mode"?
2. **Q5a:** Content creation department scoping - primary vs explicit selection?
3. **Q7a:** Course updates across programs - immediate or approval required?
4. **Q9a:** Who can grant prerequisite overrides?
5. **Q10a-c:** Waitlist mechanics (priority, max length, expiration)
6. **Q12a:** Version update progress handling
7. **Q15a:** Self-enrollment instant or requires approval?
8. **Q15c:** What triggers "completed" status?
9. **Q24b-c:** SCORM session warnings and auto-commit timing
10. **Q26a:** Course version upgrade progress handling

### Medium Priority (Can decide during development)

11. **Q3a:** SSE for SCORM session monitoring?
12. **Q4b:** Permission check logic for multi-role users
13. **Q5b:** Limit on department memberships per staff
14. **Q6a:** Refresh token sliding window vs absolute expiration
15. **Q11a:** Can instructors share packages or only department-admins?
16. **Q12b-c:** Version retention and changelog visibility
17. **Q14a-c:** Question bank statistics and sharing
18. **Q16a-c:** Archive strategy and re-enrollment details
19. **Q18a-c:** Aggregation timing and audit log retention
20. **Q25a-c:** Attempt override auditing and practice attempts

### Low Priority (Post-launch optimization)

21. **Q7b:** Course forking capability
22. **Q17a-b:** Enrollment overload tracking and notifications
23. **Q21a-b:** Real-time analytics caching and manual refresh
24. **Q22a-b:** ML schema design and data collection priorities
25. **Q23a-c:** Full CMI retention for failed attempts
26. **Q27a-b:** Cache warming and metrics
27. **Q29a-c:** File scanning, transcoding, compression
28. **Q31a-b:** Trial migration and rollback strategy
29. **Q33a-b:** Automated validation and database constraints
30. **Q34a-b:** Container orchestration and CI/CD preferences
31. **Q35a-c:** Backup testing, redundancy, activity log retention
32. **Q36a-c:** Future feature design timing and privacy controls

---

## Next Steps

1. **Review this formatted document** - Ensure all decisions accurately reflect your intentions
2. **Answer high-priority clarifications** - These are needed to begin Phase 1
3. **Approve medium-priority defaults** - Or provide specific guidance
4. **Schedule discussion for complex topics:**
   - Multi-role user workflows (Q4a, Q4b)
   - Content versioning and updates (Q12a, Q26a)
   - Course sharing across programs (Q7a, Q7b)
   - Enrollment lifecycle triggers (Q15a, Q15c)

5. **I will then:**
   - Update Implementation Plan with decisions
   - Create detailed Phase 1 task breakdown
   - Begin foundation development (auth, middleware, models)

---

**Ready to proceed?** Please provide clarifications for high-priority questions or approve defaults so we can begin implementation.
