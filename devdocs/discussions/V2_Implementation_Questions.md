# LMS V2 Implementation Questions

> **Created:** 2026-01-07  
> **Purpose:** Questions to clarify before/during V2 implementation  
> **Status:** Awaiting Responses

---

## Table of Contents

1. [Architecture & Design](#architecture--design)
2. [Authentication & Authorization](#authentication--authorization)
3. [Academic Structure](#academic-structure)
4. [Content Management](#content-management)
5. [Enrollment & Lifecycle](#enrollment--lifecycle)
6. [Analytics & Reporting](#analytics--reporting)
7. [SCORM Implementation](#scorm-implementation)
8. [Performance & Scalability](#performance--scalability)
9. [Migration & Deployment](#migration--deployment)

---

## Architecture & Design

### Q1: API Versioning Strategy
**Question:** Should we maintain `/api/v2` in the URL, or use header-based versioning?

**Context:** Current V1 uses `/api/v1` prefix. Options:
- Keep URL versioning: `/api/v2/courses`
- Header versioning: `Accept: application/vnd.lms.v2+json`
- No versioning (breaking change approach)

**Recommendation:** URL versioning for simplicity and developer experience.

**Decision:** [URL Versioning ]

---

### Q2: Database per Service or Monolithic?
**Question:** Should we use a single MongoDB database or split by domain?

**Options:**
- Single database: `lms_v2` with all collections
- Multiple databases: `lms_auth`, `lms_academic`, `lms_content`, etc.

**Trade-offs:**
- Single: Simpler transactions, easier joins
- Multiple: Better scaling, logical separation

**Recommendation:** Single database initially, can shard later if needed.

**Decision:** [Single database with plans for sharding ]

---

### Q3: Real-time Updates?
**Question:** Do we need real-time updates for learner progress, or is polling acceptable?

**Use Cases:**
- Instructor watching live class progress
- Learner dashboard updates
- SCORM session monitoring

**Options:**
- WebSockets (Socket.io)
- Server-Sent Events (SSE)
- Polling (REST)

**Impact:** Affects architecture significantly.

**Decision:** [No real-time updates for learner progress, polling is acceptible]

---

## Authentication & Authorization

### Q4: Multi-Role Users
**Question:** Can a single user have multiple roles simultaneously?

**Example Scenario:**
- A staff member who is also a learner (taking professional development courses)
- An instructor who is also a department admin

**Current V1:** Supports multiple roles via `roles` array.

**V2 Approach:**
- Keep multi-role support?
- Force role selection at login?
- Allow role switching during session?

**Decision:** [role should be additive, although learners should be distinct from staff.  A staff person could be a system-admin, department-admin, content-admin, instructor, and a billing-admin all together.  If you need clarity on roles ask me more questions ]

---

### Q5: Department Membership Complexity
**Question:** Can staff have different subroles in different departments?

**Example:**
```javascript
{
  departmentMemberships: [
    { departmentId: "CS", roles: ["instructor", "content-admin"] },
    { departmentId: "Math", roles: ["instructor"] }
  ]
}
```

**Follow-up:**
- Should permissions be AND or OR across departments?
- Can staff create content visible across all their departments?

**Decision:** [Yes, staff can have different subroles in different deparments or even subdepartments ]

---

### Q6: Token Expiration Strategy
**Question:** What should be the token expiration times?

**Current V1:**
- Access token: 7 days
- Refresh token: 30 days

**Industry Standard:**
- Access token: 15 minutes - 1 hour
- Refresh token: 7-30 days

**Considerations:**
- Shorter = more secure, more refresh calls
- Longer = better UX, higher risk

**Decision:** [Dev = 7days,30 days, Test/Prod = 2 hours, 6 hours ]

---

## Academic Structure

### Q7: Program-Course Relationship
**Question:** Can a course belong to multiple programs?

**Example Scenario:**
- "Introduction to Programming" used in both CS and Data Science programs

**Options:**
- One-to-many: Course belongs to one program only
- Many-to-many: Course can be shared across programs

**Impact:** Affects data model and queries significantly.

**Decision:** [yes, one course can be used by multiple programs - although the authors will remain the authors ]

---

### Q8: SubProgram Granularity
**Question:** How many levels of SubPrograms do we support?

**Examples:**
- 2 levels: Program → SubProgram (Year 1, Year 2)
- 3 levels: Program → SubProgram → Term (Year 1 → Fall, Spring)

**Current V1:** Single level (ProgramLevel)

**V2 Approach:**
- Keep single level?
- Support nested SubPrograms?

**Decision:** [keep 2 levels Program->SubProgram ]

---

### Q9: Course Prerequisites
**Question:** Should course prerequisites be enforced automatically?

**Scenarios:**
- Learner tries to enroll in Course B without completing Course A
- Manual override by admin?
- Warning vs hard block?

**Implementation:**
- Validation on enrollment creation
- Check at course start
- Advisory only

**Decision:** [Allow overrides, occasionally but automatically enforce without override. Allow signup, but check at course start]

---

### Q10: Class Capacity Enforcement
**Question:** What happens when a class is full?

**Options:**
- Hard block enrollment
- Waitlist system
- Allow overrides by admins
- Automatic overflow to new class instance

**Decision:** [Waitlist system - Remeber a Course is a set of learning segments/content, A class is a group of learners working through courses together like a cohort]

---

## Content Management

### Q11: SCORM Package Sharing
**Question:** Can SCORM packages be shared across departments?

**Use Cases:**
- Master department creates global packages
- Department creates package, wants to share with another department
- Staff member works in multiple departments

**Permissions Model:**
- Package visibility: `global`, `department`, `private`
- Who can assign packages across departments?

**Decision:** [ department-admin can select packages to share, and system-admins can add to globally shared list]

---

### Q12: Content Versioning
**Question:** Do we need version control for content?

**Scenarios:**
- Instructor updates course module
- Learners mid-course see old vs new version
- Track which version a learner completed

**Options:**
- No versioning (in-place updates)
- Full versioning (keep all versions)
- Snapshot on enrollment (freeze content)

**Decision:** [Snapshot on enrollment - with versioning and notify of updates to content that can then be replaced in enrollment queue ]

---

### Q13: Media Storage
**Question:** Where should media files be stored?

**Options:**
- Local file system
- AWS S3
- Hybrid (local dev, S3 production)
- CDN for serving

**Considerations:**
- Cost
- Performance
- Backup strategy

**Decision:** [ dev=local files for everything, test/Prod = aws|digial ocean|S3| usually with CDN]

---

### Q14: Exercise Question Bank
**Question:** Should questions be reusable across exercises?

**Scenario:**
- Create a question bank
- Build exercises by selecting questions
- Same question appears in multiple exams

**Options:**
- Embedded: Questions embedded in Exercise
- Referenced: Questions separate, referenced by ID
- Mixed: Support both

**Impact:** Affects randomization, statistics, updates.

**Decision:** [ Support both, support bank with randomization and windowing]

---

## Enrollment & Lifecycle

### Q15: Enrollment Workflows
**Question:** What statuses can enrollments transition through?

**Proposed States:**
```
Program: applied → enrolled → active → [on-leave] → completed/withdrawn
Course: enrolled → active → [suspended] → completed/withdrawn
Class: enrolled → active → withdrawn/completed
```

**Questions:**
- Do we need "applied" state for program enrollments?
- Can learners self-enroll or always admin-created?
- What triggers transition to "active"?

**Decision:** [we need applied for programs, learners will be able to self-enroll, Active usually is fired by learner opening first course in a sub/program ]

---

### Q16: Withdrawal Policies
**Question:** What happens to progress/attempts when a learner withdraws?

**Options:**
- Preserve all data (soft delete enrollment)
- Archive attempts (move to historical table)
- Hard delete (GDPR compliance)

**Related:**
- Can learners re-enroll after withdrawal?
- Does their progress carry over?

**Decision:** [ preserve all data, after 30 days archive, allow for GDPR hard delete request. Learners can re-enroll, and progress carries over unless otherwise handled]

---

### Q17: Concurrent Enrollments
**Question:** Can a learner be enrolled in multiple programs/courses simultaneously?

**Scenarios:**
- Learner in both "CS Degree" and "Certificate Program"
- Learner taking 5 courses at once

**Limits:**
- No limit?
- Configurable max per program type?
- Business rule validation?

**Decision:** [No limit ]

---

## Analytics & Reporting

### Q18: Analytics Data Retention
**Question:** How long should we keep detailed analytics data?

**Data Types:**
- Learning events (page views, interactions): [keep until class completion, then aggregate per class]
- Content attempts: [keep until program completion, then aggregate after]
- SCORM CMI data: [keep until programc completion, then aggregate ]
- Audit logs: [keep for previous 3 months sitewide, then archive ]

**Options:**
- Forever (expensive storage)
- Aggregate after N months (lose granularity)
- Delete after N years (GDPR-friendly)

**Decision:** [given for every data type]

---

### Q19: Windowed Metrics Defaults
**Question:** What should be the default time windows for analytics?

**Current V1:** 4 weeks default

**Proposed:**
- Default: [4 weeks ] (4 weeks, 30 days, 90 days?)
- Options: [yes ] (weekly, monthly, quarterly, yearly?)
- Custom range supported: Yes/No

**Decision:** [4 weeks, yes, custom range yes ]

---

### Q20: Abandonment Definition
**Question:** How do we define "abandoned" enrollment?

**Options:**
- No activity for X days: [60 ] days
- Enrollment created but never started: Yes/No
- Started but no activity in window: Yes/No

**Related:**
- Should we send reminder emails?
- Auto-withdraw after X days of abandonment?

**Decision:** [auto-withdraw after 60 days abaondoment ]

---

### Q21: Real-Time vs Batch Analytics
**Question:** Should analytics be calculated real-time or via background jobs?

**Trade-offs:**
- Real-time: Up-to-date, slower requests
- Batch: Faster responses, potentially stale data

**Recommendation:**
- Real-time for individual learner
- Batch/cached for aggregate reports

**Decision:** [ ]

---

### Q22: Content Recommendations
**Question:** How sophisticated should the recommendation engine be?

**Options:**
1. **Rule-based:** If completion rate < 70%, flag for review
2. **Statistical:** Correlation analysis, success predictors
3. **ML-based:** Pattern recognition, predictive modeling

**Phase 1 Scope:** [ ]

**Future Enhancement:** [ ]

**Decision:** [ ]

---

## SCORM Implementation

### Q23: SCORM CMI Storage
**Question:** Should we store full CMI data or only essential fields?

**Options:**
- **Full CMI:** Store entire SCORM data model (interactions, objectives, etc.)
- **Essential:** Store only score, completion, time, suspend_data
- **Hybrid:** Essential in main collection, full in separate collection

**Storage Impact:**
- Full CMI can be 10KB - 100KB+ per attempt
- Thousands of attempts = significant storage

**Decision:** [ ]

---

### Q24: SCORM Session Timeout
**Question:** How long should SCORM sessions stay alive?

**Scenarios:**
- Learner walks away, browser tab open
- Learner loses internet connection
- Learner pauses for lunch

**Options:**
- Short timeout: 30 min (more restarts)
- Long timeout: 4 hours (more server memory)
- Configurable per package

**Heartbeat Interval:** [ ] seconds

**Decision:** [ ]

---

### Q25: SCORM Package Re-attempts
**Question:** How should we handle attempt limits and retries?

**Scenarios:**
- Learner fails, wants to retry
- Learner wants to improve score
- Package configured with max 3 attempts

**Behavior:**
- Block after max attempts: Yes/No
- Admin override allowed: Yes/No
- Best score vs latest score: [ ]

**Decision:** [ ]

---

### Q26: SCORM Content Updates
**Question:** What happens when a SCORM package is updated?

**Scenarios:**
- New version uploaded
- Learners mid-course with old version
- Learner has attempts on old version

**Options:**
- Version packages separately
- Update in place (orphans old attempts)
- Maintain mapping (attempts point to package version)

**Decision:** [ ]

---

## Performance & Scalability

### Q27: Caching Strategy
**Question:** What should we cache and for how long?

**Candidates:**
- User profile: [ ] minutes
- Course catalog: [ ] minutes
- Department tree: [ ] minutes
- SCORM packages list: [ ] minutes
- Analytics dashboards: [ ] minutes

**Cache Invalidation:**
- Time-based (TTL)
- Event-based (on update)
- Mixed

**Decision:** [ ]

---

### Q28: Pagination Defaults
**Question:** What should be default page sizes?

**Endpoints:**
- Course list: [ ] per page
- Learner list: [ ] per page
- Attempt list: [ ] per page
- Analytics reports: [ ] per page

**Maximum allowed:** [ ]

**Decision:** [ ]

---

### Q29: File Upload Limits
**Question:** What should be the file upload size limits?

**Content Types:**
- SCORM packages: [ ] MB
- Media files (videos): [ ] MB
- Documents (PDFs): [ ] MB
- Images: [ ] MB

**Related:**
- Concurrent uploads limit: [ ]
- Chunk upload support: Yes/No

**Decision:** [ ]

---

### Q30: Database Indexing Strategy
**Question:** Should we create indexes proactively or analyze query patterns first?

**Approach:**
- Create all suggested indexes from Ideal_MongoDB_DataObjects.md
- Start minimal, add as needed
- A/B test index performance

**Monitoring:**
- Slow query logging threshold: [ ] ms
- Index usage analysis frequency: [ ]

**Decision:** [ ]

---

## Migration & Deployment

### Q31: Migration Window
**Question:** Do we need zero-downtime migration?

**Options:**
- Maintenance window: Schedule downtime (simpler)
- Zero-downtime: Dual-write, gradual cutover (complex)
- Phased rollout: Migrate departments one-by-one

**Acceptable Downtime:** [ ] hours

**Decision:** [ ]

---

### Q32: V1 Sunset Timeline
**Question:** How long will V1 API remain available?

**Options:**
- Hard cutover: V1 goes offline when V2 launches
- Parallel: V1 and V2 both available for [ ] months
- Gradual deprecation: V1 read-only, then sunset

**V1 Shutdown Date:** [ ]

**Decision:** [ ]

---

### Q33: Data Validation Strategy
**Question:** How do we validate migration data integrity?

**Checks:**
- Row counts match: Yes/No
- Checksum validation: Yes/No
- Sample data review: [ ]% of records
- Foreign key integrity: Yes/No
- Business rule validation: Yes/No

**Rollback Plan:**
- If validation fails, rollback migration: Yes/No
- Acceptable error rate: [ ]%

**Decision:** [ ]

---

### Q34: Deployment Environment
**Question:** What deployment infrastructure are we targeting?

**Options:**
- Docker containers
- Kubernetes
- Traditional VMs
- Serverless (AWS Lambda)
- Hybrid

**Monitoring:**
- Logging: Winston + CloudWatch/ELK?
- Metrics: Prometheus + Grafana?
- APM: New Relic/DataDog?

**Decision:** [ ]

---

### Q35: Backup Strategy
**Question:** What's the backup and disaster recovery plan?

**Database Backups:**
- Frequency: [ ] (hourly, daily, weekly)
- Retention: [ ] days/months
- Point-in-time recovery: Yes/No

**File Backups (SCORM packages, media):**
- Frequency: [ ]
- Storage location: [ ]

**RTO (Recovery Time Objective):** [ ] hours  
**RPO (Recovery Point Objective):** [ ] hours

**Decision:** [ ]

---

## Feature Additions (Beyond V1 Parity)

### Q36: New Features for V2
**Question:** Are there features we want to add that V1 doesn't have?

**Suggestions:**
1. **Notifications System**
   - Email/SMS notifications for assignments, deadlines
   - In-app notifications

2. **Gamification**
   - Badges, points, leaderboards
   - Achievement system

3. **Social Learning**
   - Discussion forums
   - Peer comments on content
   - Study groups

4. **Mobile API Optimizations**
   - Offline mode support
   - Reduced payload sizes
   - Mobile-specific endpoints

5. **Advanced Analytics**
   - Predictive analytics (at-risk learners)
   - Learning path optimization
   - Content effectiveness scoring

**Phase 1 Scope:** [ ]

**Future Phases:** [ ]

**Decision:** [ ]

---

## Response Template

**Please respond with:**

```markdown
### Q[Number]: [Question Title]
**Decision:** [Your decision]
**Rationale:** [Why this decision?]
**Implementation Notes:** [Any specific guidance]

---
```

**Example:**

```markdown
### Q1: API Versioning Strategy
**Decision:** URL versioning with `/api/v2` prefix
**Rationale:** 
- Simplest for frontend developers
- Clear migration path from V1
- Standard industry practice

**Implementation Notes:**
- Use middleware to validate version
- Return 404 for unsupported versions
- Document version in Swagger

---
```

---

## Summary of Decision Categories

| Category | Total Questions | Answered | Pending |
|----------|----------------|----------|---------|
| Architecture & Design | 3 | 0 | 3 |
| Authentication & Authorization | 3 | 0 | 3 |
| Academic Structure | 4 | 0 | 4 |
| Content Management | 4 | 0 | 4 |
| Enrollment & Lifecycle | 3 | 0 | 3 |
| Analytics & Reporting | 5 | 0 | 5 |
| SCORM Implementation | 4 | 0 | 4 |
| Performance & Scalability | 4 | 0 | 4 |
| Migration & Deployment | 5 | 0 | 5 |
| Feature Additions | 1 | 0 | 1 |
| **TOTAL** | **36** | **0** | **36** |

---

**Next Steps:**
1. Review all questions
2. Provide decisions and rationale
3. Implementation plan will be updated based on answers
4. Begin Phase 1 development
