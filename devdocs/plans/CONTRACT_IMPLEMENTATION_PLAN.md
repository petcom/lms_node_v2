# Backend Contract Implementation Plan

**Created:** 2026-01-08
**Strategy:** Contracts First - Parallel Development
**Approach:** Define all contracts quickly to unblock frontend team, then implement backend iteratively

---

## 📋 Implementation Strategy

### Phase Overview

Each phase focuses on creating **complete, accurate contracts** for a functional area. Backend implementation happens in parallel with frontend development.

**Timeline:**
- **Phase 1-4:** Contract creation (Week 1-2)
- **Backend Implementation:** Parallel to frontend (Week 2-6)
- **Integration Testing:** Ongoing (Week 3-8)

**Contract-First Benefits:**
✅ Frontend team can start immediately after each phase
✅ Clear API boundaries defined upfront
✅ Both teams work independently
✅ Breaking changes identified early

---

## Phase 1: Core Identity & Organization (Days 1-2)

**Goal:** Enable user authentication and organizational structure

### Contracts to Create

#### 1.1 `auth.contract.ts` ✅
- Status: **Complete**
- Login, logout, token refresh, password reset
- User profile (me endpoint)

#### 1.2 `users.contract.ts`
**Endpoints:**
```typescript
GET    /users/me                    // Current user profile (unified)
PUT    /users/me                    // Update profile
GET    /users/me/departments        // My departments
GET    /users/me/courses            // My assigned courses (instructor)
GET    /users/me/enrollments        // My enrollments (learner)
GET    /users/me/progress           // My progress summary
```

#### 1.3 `staff.contract.ts`
**Endpoints:**
```typescript
GET    /users/staff                 // List staff (admin/dept-scoped)
POST   /users/staff                 // Register staff
GET    /users/staff/:id             // Staff details
PUT    /users/staff/:id             // Update staff
DELETE /users/staff/:id             // Soft delete staff
PATCH  /users/staff/:id/departments // Update dept assignments
```

#### 1.4 `learners.contract.ts`
**Endpoints:**
```typescript
GET    /users/learners              // List learners
POST   /users/learners              // Register learner
GET    /users/learners/:id          // Learner details
PUT    /users/learners/:id          // Update learner
DELETE /users/learners/:id          // Soft delete learner
```

#### 1.5 `departments.contract.ts`
**Endpoints:**
```typescript
GET    /departments                 // List departments
POST   /departments                 // Create department
GET    /departments/:id             // Department details
PUT    /departments/:id             // Update department
DELETE /departments/:id             // Delete department
GET    /departments/:id/hierarchy   // Department tree
GET    /departments/:id/programs    // Department programs
GET    /departments/:id/staff       // Department staff
GET    /departments/:id/stats       // Department statistics (NEW)
```

#### 1.6 `academic-years.contract.ts`
**Endpoints:**
```typescript
GET    /calendar/years              // List academic years
POST   /calendar/years              // Create year
GET    /calendar/years/:id          // Year details
PUT    /calendar/years/:id          // Update year
DELETE /calendar/years/:id          // Delete year
GET    /calendar/terms              // List terms
POST   /calendar/terms              // Create term
GET    /calendar/terms/:id          // Term details
PUT    /calendar/terms/:id          // Update term
DELETE /calendar/terms/:id          // Delete term
```

**Backend Models:** ✅ Existing
- User, Staff, Learner, Department, AcademicYear

**Frontend Impact:**
- Login/logout UI
- User profile pages
- Department selector
- Staff/Learner management pages
- Academic calendar setup

---

## Phase 2: Programs & Courses (Days 3-4)

**Goal:** Enable course catalog creation and program structure

### Contracts to Create

#### 2.1 `programs.contract.ts`
**Endpoints:**
```typescript
GET    /programs                    // List programs
POST   /programs                    // Create program
GET    /programs/:id                // Program details
PUT    /programs/:id                // Update program
DELETE /programs/:id                // Delete program
GET    /programs/:id/levels         // Program levels
POST   /programs/:id/levels         // Create level
GET    /programs/:id/courses        // Program courses
GET    /programs/:id/enrollments    // Program enrollments
PATCH  /programs/:id/department     // Move to department
```

#### 2.2 `program-levels.contract.ts`
**Endpoints:**
```typescript
GET    /program-levels/:id          // Level details (shortcut)
PUT    /program-levels/:id          // Update level
DELETE /program-levels/:id          // Delete level
PATCH  /program-levels/:id/reorder  // Reorder levels
```

#### 2.3 `courses.contract.ts`
**Endpoints:**
```typescript
GET    /courses                     // List courses
POST   /courses                     // Create course
GET    /courses/:id                 // Course details
PUT    /courses/:id                 // Full update
PATCH  /courses/:id                 // Partial update
DELETE /courses/:id                 // Delete course
POST   /courses/:id/publish         // Publish course
POST   /courses/:id/unpublish       // Unpublish course
POST   /courses/:id/archive         // Archive course
POST   /courses/:id/unarchive       // Unarchive course
POST   /courses/:id/duplicate       // Duplicate course (NEW)
GET    /courses/:id/export          // Export course (NEW)
PATCH  /courses/:id/department      // Move to department
PATCH  /courses/:id/program         // Move to program
```

#### 2.4 `course-segments.contract.ts`
**Endpoints:**
```typescript
GET    /courses/:id/modules         // List modules
POST   /courses/:id/modules         // Create module
GET    /courses/:cid/modules/:mid   // Module details
PUT    /courses/:cid/modules/:mid   // Update module
DELETE /courses/:cid/modules/:mid   // Delete module
PATCH  /courses/:id/modules/reorder // Reorder modules (NEW)
```

#### 2.5 `classes.contract.ts`
**Endpoints:**
```typescript
GET    /classes                     // List classes (course instances)
POST   /classes                     // Create class
GET    /classes/:id                 // Class details
PUT    /classes/:id                 // Update class
DELETE /classes/:id                 // Delete class
GET    /classes/:id/enrollments     // Class enrollments
POST   /classes/:id/enrollments     // Enroll learners
GET    /classes/:id/roster          // Class roster with progress (NEW)
GET    /classes/:id/progress        // Class-wide progress (NEW)
```

**Backend Models:** ✅ Existing
- Program, Course, CourseContent, Class

**Frontend Impact:**
- Program management UI
- Course builder/editor
- Course catalog browsing
- Module/content organization
- Class scheduling

---

## Phase 3: Content & Templates (Days 5-6)

**Goal:** Enable content creation and library management

### Contracts to Create

#### 3.1 `content.contract.ts`
**Endpoints:**
```typescript
GET    /content                     // List content (library)
GET    /content/:id                 // Content details
GET    /content/scorm               // SCORM packages
POST   /content/scorm               // Upload SCORM
GET    /content/scorm/:id           // SCORM details
PUT    /content/scorm/:id           // Update SCORM metadata
DELETE /content/scorm/:id           // Delete SCORM
POST   /content/scorm/:id/launch    // Launch SCORM
POST   /content/scorm/:id/publish   // Publish SCORM
POST   /content/scorm/:id/unpublish // Unpublish SCORM
GET    /content/media               // Media library
POST   /content/media               // Upload media
GET    /content/media/:id           // Media details
PUT    /content/media/:id           // Update media
DELETE /content/media/:id           // Delete media
```

#### 3.2 `exercises.contract.ts`
**Endpoints:**
```typescript
GET    /content/exercises           // List exercises/exams
POST   /content/exercises           // Create exercise
GET    /content/exercises/:id       // Exercise details
PUT    /content/exercises/:id       // Update exercise
DELETE /content/exercises/:id       // Delete exercise
GET    /content/exercises/:id/questions  // Exercise questions
POST   /content/exercises/:id/questions  // Add question
```

#### 3.3 `questions.contract.ts`
**Endpoints:**
```typescript
GET    /questions                   // Question bank
POST   /questions                   // Create question
GET    /questions/:id               // Question details
PUT    /questions/:id               // Update question
DELETE /questions/:id               // Delete question
POST   /questions/bulk              // Bulk import questions
```

#### 3.4 `templates.contract.ts`
**Endpoints:**
```typescript
GET    /templates                   // List templates
POST   /templates                   // Create template
GET    /templates/:id               // Template details
PUT    /templates/:id               // Update template
DELETE /templates/:id               // Delete template
POST   /templates/:id/duplicate     // Duplicate template
GET    /templates/:id/preview       // Preview template
```

**Backend Models:** ✅ Existing
- Content, CourseContent, Question, QuestionBank

**Frontend Impact:**
- Content library browser
- SCORM package uploader
- Exercise/exam builder
- Question bank management
- Template editor

---

## Phase 4: Enrollments & Progress (Days 7-8)

**Goal:** Enable learner enrollment and progress tracking (TOP PRIORITY)

### Contracts to Create

#### 4.1 `enrollments.contract.ts`
**Endpoints:**
```typescript
// Program Enrollments
GET    /enrollments/programs        // List program enrollments
POST   /enrollments/programs        // Enroll in program
GET    /enrollments/programs/:id    // Enrollment details
PUT    /enrollments/programs/:id    // Update enrollment
DELETE /enrollments/programs/:id    // Delete enrollment
POST   /enrollments/programs/:id/withdraw   // Withdraw (NEW)
POST   /enrollments/programs/:id/complete   // Complete (NEW)

// Course Enrollments
GET    /enrollments/courses         // List course enrollments
POST   /enrollments/courses         // Enroll in course
GET    /enrollments/courses/:id     // Enrollment details
PUT    /enrollments/courses/:id     // Update enrollment
DELETE /enrollments/courses/:id     // Delete enrollment
POST   /enrollments/courses/:id/withdraw    // Withdraw (NEW)
POST   /enrollments/courses/:id/complete    // Complete (NEW)

// Class Enrollments
GET    /enrollments/classes         // List class enrollments
POST   /enrollments/classes         // Enroll in class
DELETE /enrollments/classes/:id     // Drop from class
```

#### 4.2 `progress.contract.ts` (🔥 HIGH PRIORITY)
**Endpoints:**
```typescript
// Learner Progress Views
GET    /progress/me                 // My overall progress
GET    /progress/me/courses         // My course progress list
GET    /progress/me/recent          // Recent activity (NEW)

// Course-Level Progress
GET    /progress/courses/:id        // Course progress with modules (NEW)
GET    /progress/courses/:id/learners  // All learners progress (staff) (NEW)

// Program-Level Progress
GET    /progress/programs/:id       // Program progress overview (NEW)

// Learner-Specific Progress (Staff View)
GET    /progress/learners/:id       // Learner's overall progress
GET    /progress/learners/:id/courses/:cid  // Specific course progress (NEW)

// Content Progress Events
POST   /progress/content/:id/start  // Start content (NEW)
POST   /progress/content/:id/events // Record learning events (NEW)
POST   /progress/content/:id/complete  // Complete content (NEW)
```

#### 4.3 `content-attempts.contract.ts`
**Endpoints:**
```typescript
// Attempt Management
GET    /attempts/content/:contentId // All attempts for content
POST   /attempts/content/:contentId // Create new attempt
GET    /attempts/:id                // Attempt details
PATCH  /attempts/:id                // Update attempt
POST   /attempts/:id/submit         // Submit for grading (NEW)

// SCORM-Specific
GET    /attempts/:id/scorm/cmi      // Get CMI data
PATCH  /attempts/:id/scorm/cmi      // Update CMI data
POST   /attempts/:id/scorm/suspend  // Suspend session (NEW)
POST   /attempts/:id/scorm/resume   // Resume session (NEW)

// My Attempts
GET    /attempts/me                 // My attempts
GET    /attempts/me/content/:contentId  // My attempts for content
```

#### 4.4 `learning-events.contract.ts`
**Endpoints:**
```typescript
GET    /activity/me                 // My activity feed (NEW)
GET    /activity/learners/:id       // Learner activity (staff) (NEW)
GET    /activity/courses/:id        // Course activity feed (NEW)
GET    /activity/classes/:id        // Class activity feed (NEW)
```

**Backend Models:** ✅ Existing
- Enrollment, ClassEnrollment, ContentAttempt, ScormAttempt, LearningEvent

**Frontend Impact:** (🔥 Critical for learner experience)
- Enrollment workflow
- Course player with progress tracking
- Learner dashboard with progress overview
- Progress bars and completion indicators
- Activity feeds
- SCORM player integration

---

## Phase 5: Assessments & Results (Days 9-10)

**Goal:** Enable assessments, grading, and results

### Contracts to Create

#### 5.1 `exam-attempts.contract.ts`
**Endpoints:**
```typescript
// Take Assessment
GET    /assessments/:id             // Assessment details
POST   /assessments/:id/attempts    // Start new attempt
GET    /assessments/:id/attempts/:attemptId  // Get attempt
POST   /assessments/:id/attempts/:attemptId/answer  // Submit answer (NEW)
POST   /assessments/:id/attempts/:attemptId/submit  // Submit for grading

// Results
GET    /assessments/:id/results     // My results for assessment
GET    /assessments/:id/results/:resultId  // Specific result
GET    /assessments/:id/feedback/:resultId  // Feedback/corrections (NEW)

// Staff: Grade & Review
GET    /assessments/:id/submissions // All submissions (staff)
PATCH  /assessments/:id/results/:resultId  // Update grade (staff)
```

#### 5.2 `reports.contract.ts`
**Endpoints:**
```typescript
// Standard Reports
GET    /reports/completion          // Completion reports
GET    /reports/performance         // Performance metrics (NEW)
GET    /reports/engagement          // Engagement stats (NEW)

// Department Reports
GET    /reports/departments/:id     // Department dashboard (NEW)

// Transcript
GET    /reports/transcript/:learnerId  // Learner transcript (NEW)

// Custom Reports
POST   /reports/custom              // Generate custom report (NEW)
GET    /reports/:id                 // Get saved report (NEW)
GET    /reports/:id/download        // Download report (NEW)
```

**Backend Models:** ✅ Existing
- ExamResult, QuestionBank, Question

**Frontend Impact:**
- Assessment taking interface
- Quiz/exam player
- Results/grade display
- Feedback viewer
- Grading interface (staff)
- Report generation UI

---

## Phase 6: System & Settings (Days 11-12)

**Goal:** Enable system configuration and audit

### Contracts to Create

#### 6.1 `settings.contract.ts`
**Endpoints:**
```typescript
GET    /settings                    // Get all settings
PUT    /settings                    // Update settings (bulk)
GET    /settings/:key               // Get specific setting
PUT    /settings/:key               // Update specific setting
```

#### 6.2 `audit-logs.contract.ts`
**Endpoints:**
```typescript
GET    /audit-logs                  // List audit logs
GET    /audit-logs/:id              // Log details
GET    /audit-logs/user/:userId     // User's activity
GET    /audit-logs/resource/:type/:id  // Resource history
```

#### 6.3 `permissions.contract.ts`
**Endpoints:**
```typescript
GET    /permissions                 // List all permissions
GET    /permissions/roles           // Roles with permissions
GET    /permissions/me              // My permissions
```

#### 6.4 `system.contract.ts`
**Endpoints:**
```typescript
GET    /system/health               // Health check
GET    /system/metrics              // System metrics (admin)
GET    /system/version              // API version
```

**Backend Models:** ✅ Existing
- Setting, Permission, RolePermission, AuditLog

**Frontend Impact:**
- Settings page (admin)
- Audit log viewer
- Permission management
- System health dashboard

---

## 📊 Contract Creation Checklist

For each contract, include:

### ✅ Contract Structure
```typescript
export const ResourceContract = {
  // Base info
  resource: 'resource-name',
  version: '1.0.0',

  // Each endpoint
  list: {
    endpoint: '/resources',
    method: 'GET',
    version: '1.0.0',

    request: {
      query: { /* ... */ },
      headers: { /* ... */ }
    },

    response: {
      success: {
        status: 200,
        body: { /* TypeScript-style shape */ }
      },
      error: {
        status: 400,
        body: { /* Error shape */ }
      }
    },

    example: {
      request: { /* ... */ },
      response: { /* ... */ }
    },

    permissions: ['read:resource'],

    notes: `
      - Filters by query params
      - Supports pagination
      - Department-scoped for staff
    `
  },

  // ... more endpoints ...
};
```

### ✅ Required Documentation
- Endpoint description
- Request parameters (path, query, body)
- Response shape with all fields
- Example request/response
- Required permissions
- Edge cases & validation rules
- Breaking change notes (if applicable)

### ✅ Export to Frontend
```bash
# After contract creation
npm run contracts:export
# Creates: contracts/dist/contracts.json
```

---

## 🔄 Workflow: Contract → Frontend → Backend Implementation

### Step 1: Backend Creates Contract (1-2 hours per contract)
```bash
cd ~/github/lms_node/1_LMS_Node_V2/contracts/api
touch courses.contract.ts

# Write contract with all endpoints, types, examples
# Commit and push
git add contracts/api/courses.contract.ts
git commit -m "feat(contracts): add courses API contract"
git push
```

### Step 2: Frontend Reads Contract (Immediate)
```bash
cd ~/github/lms_ui/1_lms_ui_v2

# Frontend reads contract
cat ../lms_node/1_LMS_Node_V2/contracts/api/courses.contract.ts

# Frontend creates types, API client, hooks
# Frontend can start UI development with mocks
```

### Step 3: Backend Implements Endpoint (Parallel)
```bash
cd ~/github/lms_node/1_LMS_Node_V2

# Implement service logic
# Create controller
# Add route
# Validate response against contract
# Write integration tests
```

### Step 4: Integration Testing (After both complete)
```bash
# Start backend
cd ~/github/lms_node/1_LMS_Node_V2 && npm run dev

# Start frontend (points to backend)
cd ~/github/lms_ui/1_lms_ui_v2 && npm run dev

# Run E2E tests
npm run test:e2e
```

---

## 📅 Timeline Summary

### Week 1: Contract Creation
- **Days 1-2:** Phase 1 (Auth, Users, Departments, Calendar)
- **Days 3-4:** Phase 2 (Programs, Courses, Classes)
- **Days 5-6:** Phase 3 (Content, Templates, Questions)
- **Days 7-8:** Phase 4 (🔥 Enrollments, Progress Tracking)
- **Days 9-10:** Phase 5 (Assessments, Reports)
- **Days 11-12:** Phase 6 (System, Settings, Audit)

### Week 2-6: Parallel Implementation
- Backend: Implement endpoints for each contract
- Frontend: Build UI consuming contracts
- Both: Integration testing as features complete

### Week 3-8: Integration & Refinement
- E2E testing
- Performance optimization
- Contract refinements (non-breaking)
- Bug fixes

---

## 🎯 Success Criteria

### ✅ Contracts Complete When:
1. All endpoints documented with request/response shapes
2. Examples provided for each endpoint
3. Permissions defined
4. Validation rules specified
5. Committed to git with `feat(contracts): ...` message
6. Frontend team notified (can start work)

### ✅ Implementation Complete When:
1. Endpoint returns response matching contract
2. Validation enforces contract rules
3. Permissions checked per contract
4. Integration tests pass
5. Response validated against contract (dev mode)

### ✅ Phase Complete When:
1. All contracts in phase defined
2. Frontend has started implementation
3. Backend implementation in progress or complete
4. Integration tests written (even if mocked)

---

## 🚦 Priority Flags

### 🔥 Critical Path (Blocks frontend)
- Phase 1: Authentication (can't login without it)
- Phase 4: Progress tracking (core learner experience)

### ⚡ High Priority (Major features)
- Phase 2: Courses (content creation)
- Phase 3: Content library (content management)
- Phase 5: Assessments (testing/grading)

### 🔹 Medium Priority (Admin features)
- Phase 2: Classes (scheduling)
- Phase 5: Reports (analytics)

### 🔸 Low Priority (System admin)
- Phase 6: Settings, audit logs, permissions

---

## 📝 Contract Tracking

Update `/contracts/PENDING.md` after each contract:

```markdown
| `courses.contract.ts` | 📝 Defined | 🔲 | 🔲 | Contract ready, awaiting impl |
```

When implementation starts:
```markdown
| `courses.contract.ts` | 🔨 In Progress | 🔨 | 🔨 | Both teams implementing |
```

When complete:
```markdown
| `courses.contract.ts` | ✅ Complete | ✅ | ✅ | Integrated & tested |
```

---

## 🔗 Cross-References

- **API Spec:** `/devdocs/Ideal_RestfulAPI_toCurrent_Crosswalk.md`
- **Contract Status:** `/contracts/PENDING.md`
- **Contract Examples:** `/contracts/api/auth.contract.ts`
- **Coordination Guide:** `~/github/TEAM_COORDINATION_GUIDE.md`
- **Frontend Project:** `~/github/lms_ui/1_lms_ui_v2`

---

## 🚀 Getting Started

### Backend Team: Start Contract Creation
```bash
cd ~/github/lms_node/1_LMS_Node_V2

# Start with Phase 1
cd contracts/api

# Create first contract
touch users.contract.ts

# Use auth.contract.ts as template
cat auth.contract.ts

# Implement contract
# Commit and push
# Update PENDING.md
```

### Frontend Team: Monitor for New Contracts
```bash
cd ~/github/lms_node/1_LMS_Node_V2

# Watch for new contracts
git log --grep="feat(contracts)" --oneline --since="1 day ago"

# Read new contract
cat contracts/api/users.contract.ts

# Implement in frontend
cd ~/github/lms_ui/1_lms_ui_v2
# Create types, API client, hooks
```

---

**Ready to begin Phase 1 contract creation! 🚀**
