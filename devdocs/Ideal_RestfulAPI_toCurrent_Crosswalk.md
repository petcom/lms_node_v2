# Ideal RESTful API to Current Endpoint Crosswalk

> **Created:** 2026-01-07  
> **Purpose:** Map ideal API structure to current endpoints to ensure complete coverage  
> **Baseline:** Ideal API (add missing functionality as needed)

## How to Read This Document

| Symbol | Meaning |
|--------|---------|
| ✅ | Covered - Current endpoint(s) exist |
| ⚠️ | Partial - Some functionality exists, needs enhancement |
| ❌ | Missing - No current equivalent |
| 🆕 | New - Added to ideal API based on current needs |

---

## Department Management

### Ideal API: `/departments`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /departments` | `GET /departments` | ✅ | Exists in academic routes |
| `POST /departments` | `POST /departments` | ✅ | Exists |
| `GET /departments/:id` | `GET /departments/:id` | ✅ | Exists |
| `PUT /departments/:id` | `PUT /departments/:id` | ✅ | Exists |
| `DELETE /departments/:id` | `DELETE /departments/:id` | ✅ | Exists |
| `GET /departments/:id/hierarchy` | `GET /department-resources/departments` | ✅ | Exists in dept-resources |
| `GET /departments/:id/programs` | None | ⚠️ | Can query `/programs?department=:id` |
| `GET /departments/:id/staff` | `GET /department-resources/staffusers?departmentId=:id` | ✅ | Exists |
| `GET /departments/:id/stats` | None | ❌ | Need to add |

**Additions Needed:**
```
GET /departments/:id/stats              - Department statistics
  Response: {
    totalStaff: 15,
    totalPrograms: 3,
    totalCourses: 45,
    activeEnrollments: 234,
    completionRate: 0.78
  }
```

---

## Program Management

### Ideal API: `/programs`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /programs` | `GET /programs` | ✅ | Exists in academic routes |
| `POST /programs` | `POST /programs` | ✅ | Exists |
| `GET /programs/:id` | `GET /programs/:id` | ✅ | Exists |
| `PUT /programs/:id` | `PUT /programs/:id` | ✅ | Exists |
| `DELETE /programs/:id` | `DELETE /programs/:id` | ✅ | Exists |
| `GET /programs/:id/levels` | `GET /program-levels?program=:id` | ✅ | Exists |
| `POST /programs/:id/levels` | `POST /program-levels` | ✅ | Exists (body includes program) |
| `GET /programs/:id/courses` | `GET /courses?program=:id` | ✅ | Exists |
| `GET /programs/:id/enrollments` | `GET /program-enrollments?program=:id` | ✅ | Exists |
| `PATCH /programs/:id/department` | `PATCH /department-resources/programs/:id/department` | ✅ | Exists in dept-resources |

**Status:** All covered ✅

---

## Course Management

### Ideal API: `/courses`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /courses` | `GET /courses` | ✅ | Exists in academic routes |
| `POST /courses` | `POST /courses` | ✅ | Exists (needs permission fix) |
| `GET /courses/:id` | `GET /courses/:id` | ✅ | Exists |
| `PUT /courses/:id` | `PUT /courses/:id` | ✅ | Exists (needs permission fix) |
| `PATCH /courses/:id` | `PATCH /courses/:id` | ✅ | Exists |
| `DELETE /courses/:id` | `DELETE /courses/:id` | ✅ | Exists |
| `POST /courses/:id/publish` | `POST /courses/:id/publish` | ✅ | Exists |
| `POST /courses/:id/unpublish` | `POST /courses/:id/unpublish` | ✅ | Exists |
| `POST /courses/:id/archive` | `PATCH /courses/:id/archive` | ✅ | Exists (PATCH not POST) |
| `POST /courses/:id/unarchive` | `PATCH /courses/:id/unarchive` | ✅ | Exists (PATCH not POST) |
| `POST /courses/:id/duplicate` | None | ❌ | Need to add |
| `PATCH /courses/:id/department` | `PATCH /department-resources/courses/:id/department` | ✅ | Exists in dept-resources |
| `PATCH /courses/:id/program` | `PATCH /department-resources/courses/:id/program` | ✅ | Exists in dept-resources |

**Additions Needed:**
```
POST /courses/:id/duplicate              - Duplicate course
  Body: {
    newTitle?: string,                   - Optional new title
    includeModules: true,                - Copy modules
    includeSettings: true,               - Copy settings
    targetProgram?: ObjectId             - Optional different program
  }
  Response: { courseId, title, ... }
```

---

## Course Modules (Course Contents)

### Ideal API: `/courses/:courseId/modules`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /courses/:id/modules` | `GET /course-contents?course=:id` | ✅ | Exists (query param) |
| `POST /courses/:id/modules` | `POST /course-contents` (body includes course) | ✅ | Exists |
| `GET /courses/:cid/modules/:mid` | `GET /course-contents/:id` | ✅ | Exists |
| `PUT /courses/:cid/modules/:mid` | `PUT /course-contents/:id` | ✅ | Exists |
| `DELETE /courses/:cid/modules/:mid` | `DELETE /course-contents/:id` | ✅ | Exists |
| `PATCH /courses/:id/modules/reorder` | None | ❌ | Need to add |

**Additions Needed:**
```
PATCH /courses/:id/modules/reorder       - Reorder modules
  Body: {
    moduleIds: ['id1', 'id2', 'id3']     - Ordered array of module IDs
  }
  Response: { success: true }
```

**Note:** Current uses flat `/course-contents` with course filter. Ideal uses nested route.

---

## Classes (Student Groups)

### Ideal API: `/classes`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /classes` | `GET /classes` | ✅ | Exists in academic routes |
| `POST /classes` | `POST /classes` | ✅ | Exists |
| `GET /classes/:id` | `GET /classes/:id` | ✅ | Exists |
| `PUT /classes/:id` | `PUT /classes/:id` | ✅ | Exists |
| `DELETE /classes/:id` | `DELETE /classes/:id` | ✅ | Exists |
| `GET /classes/:id/enrollments` | `GET /class-enrollments?class=:id` | ✅ | Exists (query param) |
| `POST /classes/:id/enrollments` | `POST /class-enrollments` (body includes class) | ✅ | Exists |
| `DELETE /classes/:id/enrollments/:eid` | `DELETE /class-enrollments/:id` | ✅ | Exists |
| `GET /classes/:id/roster` | None | ❌ | Need to add |
| `GET /classes/:id/progress` | None | ❌ | Need to add |
| `GET /classes/:id/assignments` | None | ⚠️ | Depends on assignment system |

**Additions Needed:**
```
GET /classes/:id/roster                  - Class roster with learner details
  Response: [
    {
      enrollmentId,
      learner: {
        id,
        firstName,
        lastName,
        email,
        studentId
      },
      enrolledAt,
      status: 'active|withdrawn|completed',
      attendance?: {
        sessionsAttended: 8,
        totalSessions: 10
      }
    }
  ]

GET /classes/:id/progress                - Class-wide progress summary
  Response: {
    classId,
    totalLearners: 25,
    averageProgress: 0.68,
    averageScore: 78.5,
    completedCount: 15,
    inProgressCount: 8,
    notStartedCount: 2,
    byModule: [
      {
        moduleId,
        title,
        completedCount: 20,
        averageScore: 82
      }
    ]
  }
```

**Status:** Core CRUD operations covered ✅, enhanced features needed ⚠️

---

## Course Rendering

### Ideal API: `/courses/:id/render` & `/courses/:id/export`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /courses/:id/render` | `GET /content/courses/:id/render` | ✅ | Exists in content routes |
| `POST /courses/:id/render` | `POST /content/courses/:id/render` | ✅ | Exists (force re-render) |
| `GET /courses/:id/export` | None | ❌ | Need to add |

**Additions Needed:**
```
GET /courses/:id/export                  - Export course package
  Query: ?format=scorm1.2|scorm2004|xapi|pdf
  Response: Binary file download or { downloadUrl, expiresAt }
```

---

## Content Library

### Ideal API: `/content`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /content` | `GET /content/` | ✅ | Exists (global-admin only, needs fix) |
| `GET /content` | `GET /department-resources/content` | ✅ | Department view (staff accessible) |
| `GET /content/:id` | `GET /content/:id` | ✅ | Exists (needs permission fix) |

**Status:** Covered but needs permission updates ⚠️

---

## Content - SCORM Packages

### Ideal API: `/content/scorm`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /content/scorm` | `GET /scorm/packages` | ✅ | Exists in SCORM routes |
| `POST /content/scorm` | `POST /scorm/packages/upload` | ✅ | Exists |
| `GET /content/scorm/:id` | `GET /scorm/packages/:id` | ✅ | Exists |
| `PUT /content/scorm/:id` | `PUT /scorm/packages/:id` | ✅ | Exists |
| `DELETE /content/scorm/:id` | `DELETE /scorm/packages/:id` | ✅ | Exists |
| `POST /content/scorm/:id/launch` | `POST /scorm/packages/:id/launch` | ✅ | Exists |
| `POST /content/scorm/:id/publish` | `POST /scorm/packages/:id/publish` | ✅ | Exists |
| `POST /content/scorm/:id/unpublish` | `POST /scorm/packages/:id/unpublish` | ✅ | Exists |

**Status:** All covered ✅ (SCORM routes are comprehensive)

---

## Content - Exercises (Custom Content)

### Ideal API: `/content/exercises`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /content/exercises` | `GET /exams` | ✅ | Exists in academic routes |
| `POST /content/exercises` | `POST /exams` | ✅ | Exists |
| `POST /content/exercises` | `POST /content/custom` | ✅ | Also in content routes |
| `GET /content/exercises/:id` | `GET /exams/:id` | ✅ | Exists |
| `PUT /content/exercises/:id` | `PUT /exams/:id` | ✅ | Exists |
| `PATCH /content/exercises/:id` | `PATCH /content/custom/:id` | ✅ | Exists in content routes |
| `DELETE /content/exercises/:id` | `DELETE /exams/:id` | ✅ | Exists |
| `GET /content/exercises/:id/questions` | `GET /questions?exam=:id` | ✅ | Exists |
| `POST /content/exercises/:id/questions` | `POST /questions` | ✅ | Exists (body includes exam) |

**Status:** All covered ✅

**Note:** Current has separate `/exams` routes and `/content/custom` routes for same thing

---

## Content - Media

### Ideal API: `/content/media`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /content/media` | `GET /media` | ✅ | Exists (DCV-051) |
| `POST /content/media` | `POST /media` | ✅ | Exists |
| `GET /content/media/:id` | `GET /media/:id` | ✅ | Exists |
| `PUT /content/media/:id` | `PUT /media/:id` | ✅ | Exists |
| `DELETE /content/media/:id` | `DELETE /media/:id` | ✅ | Exists |

**Status:** All covered ✅

---

## Progress & Tracking

### Ideal API: `/progress`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /progress/learners/:id` | `GET /content/reports/learner/:id` | ✅ | Exists |
| `GET /progress/learners/:id/courses/:cid` | None | ⚠️ | Partial via content attempts |
| `POST /progress/learners/:id/modules/:mid` | `POST /content/custom/:id/progress` | ✅ | Exists (for custom content) |
| | `POST /scorm/attempts` | ✅ | Exists (for SCORM) |
| `GET /progress/modules/:id/attempts` | `GET /content/:id/attempts` | ✅ | Exists |
| `POST /progress/modules/:id/attempts` | `POST /content-attempts` | ✅ | Exists |
| `GET /progress/attempts/:id` | `GET /content-attempts/:id` | ✅ | Exists |
| `GET /progress/courses/:id` | None | ❌ | Need to add |
| `GET /progress/courses/:id/learners` | `GET /course-enrollments?course=:id` | ⚠️ | Exists but no progress data |

**Additions Needed:**
```
GET /progress/courses/:id                - Course completion statistics
  Response: {
    courseId,
    totalEnrolled: 50,
    completed: 35,
    inProgress: 12,
    notStarted: 3,
    averageScore: 82.5,
    averageCompletionTime: 14400,        - Seconds
    completionRate: 0.7
  }

GET /progress/courses/:id/learners       - Learners with progress
  Query: ?status=completed|in_progress|not_started
  Response: [
    {
      learnerId,
      name,
      enrolledAt,
      status: 'completed',
      progress: 1.0,
      score: 85,
      completedAt,
      timeSpent: 12000
    }
  ]

GET /progress/learners/:lid/courses/:cid - Specific learner course progress
  Response: {
    learnerId,
    courseId,
    status: 'in_progress',
    progress: 0.6,                       - 0-1
    modulesCompleted: 3,
    modulesTotal: 5,
    currentScore: 78,
    timeSpent: 7200,
    lastAccessedAt,
    modules: [
      {
        moduleId,
        title,
        status: 'completed',
        score: 85,
        attempts: 1,
        completedAt
      }
    ]
  }
```

---

## User Management - Current User (Me)

### Ideal API: `/users/me`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /users/me` | `GET /staff/profile` (staff) | ✅ | Exists |
| | `GET /learners/profile` (learner) | ✅ | Exists |
| | `GET /staff/admins/profile` (admin) | ✅ | Exists |
| `PUT /users/me` | `PUT /staff/:id/update` | ✅ | Exists |
| | `PUT /learners/:id/update` | ✅ | Exists |
| `GET /users/me/departments` | Via `GET /staff/profile` | ✅ | Included in profile |
| `GET /users/me/courses` | None | ❌ | Need to add for instructors |
| `GET /users/me/enrollments` | `GET /program-enrollments?learner=me` | ⚠️ | Exists with filter |
| `GET /users/me/progress` | `GET /content/reports/learner/:id` | ✅ | Exists |

**Additions Needed:**
```
GET /users/me/courses                    - My assigned courses (instructor)
  Response: [
    {
      courseId,
      title,
      role: 'primary|secondary',         - Instructor role
      program,
      level,
      activeEnrollments: 25,
      startDate,
      endDate
    }
  ]
```

**Unification Needed:**
Current has 3 separate profile endpoints based on role. Ideal has unified `/users/me` that returns appropriate data based on authenticated user's role.

---

## User Management - Staff Directory

### Ideal API: `/users/staff`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /users/staff` | `GET /staff/admins/staff` | ✅ | Exists (admin only) |
| | `GET /department-resources/staffusers` | ✅ | Exists (dept-scoped) |
| `POST /users/staff` | `POST /staff/admins/staff/register` | ✅ | Exists |
| `GET /users/staff/:id` | `GET /staff/admins/staff/:id` | ✅ | Exists |
| `PUT /users/staff/:id` | `PUT /staff/admins/staff/:id/update` | ✅ | Exists |
| `DELETE /users/staff/:id` | None | ❌ | Need to add |
| `PATCH /users/staff/:id/departments` | `PATCH /department-resources/staffusers/:id/role` | ✅ | Exists |
| | `PATCH /department-resources/staffusers/:id/department` | ✅ | Exists |

**Additions Needed:**
```
DELETE /users/staff/:id                  - Soft delete staff user
  Sets status to 'withdrawn'
  Response: { success: true }
```

---

## User Management - Learner Directory

### Ideal API: `/users/learners`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /users/learners` | `GET /learners` | ✅ | Exists |
| `POST /users/learners` | `POST /learners/admins/learner/register` | ✅ | Exists |
| `GET /users/learners/:id` | `GET /learners/:id` | ✅ | Exists |
| `PUT /users/learners/:id` | `PUT /learners/:id/update` | ✅ | Exists |
| `DELETE /users/learners/:id` | None | ❌ | Need to add |

**Additions Needed:**
```
DELETE /users/learners/:id               - Soft delete learner
  Sets status to 'withdrawn'
  Response: { success: true }
```

---

## Enrollment Management

### Ideal API: `/enrollments`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /enrollments` | `GET /program-enrollments` | ✅ | Exists |
| | `GET /course-enrollments` | ✅ | Exists (different model) |
| `POST /enrollments` | `POST /program-enrollments` | ✅ | Exists |
| | `POST /course-enrollments` | ✅ | Exists |
| `GET /enrollments/:id` | `GET /program-enrollments/:id` | ✅ | Exists |
| `PUT /enrollments/:id` | `PUT /program-enrollments/:id` | ✅ | Exists |
| `DELETE /enrollments/:id` | `DELETE /program-enrollments/:id` | ✅ | Exists |
| `POST /enrollments/:id/withdraw` | None | ⚠️ | Can PATCH status |
| `POST /enrollments/:id/complete` | None | ⚠️ | Can PATCH status |
| `GET /enrollments/programs/:id` | `GET /program-enrollments?program=:id` | ✅ | Exists |
| `GET /enrollments/courses/:id` | `GET /course-enrollments?course=:id` | ✅ | Exists |

**Additions Needed:**
```
POST /enrollments/:id/withdraw           - Withdraw enrollment
  Body: { reason?, withdrawnAt? }
  Response: { enrollmentId, status: 'withdrawn' }

POST /enrollments/:id/complete           - Mark enrollment complete
  Body: { completedAt?, finalGrade? }
  Response: { enrollmentId, status: 'completed' }
```

**Note:** Current has separate ProgramEnrollment and CourseEnrollment models. Ideal unifies under `/enrollments` with type distinction.

---

## Progress Tracking

### Ideal API: `/progress`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /progress/programs/:id` | None | ❌ | Need to add |
| `GET /progress/courses/:id` | None | ⚠️ | Partial via course enrollment |
| `GET /progress/courses/:id/learners` | `GET /course-enrollments?course=:id` | ⚠️ | Exists but no detailed progress |
| `GET /progress/content/:id` | `GET /content/:id/attempts` | ✅ | Exists |
| `POST /progress/content/:id/start` | `POST /content-attempts` | ✅ | Exists (implicit) |
| `POST /progress/content/:id/events` | None | ❌ | Need to add |
| `POST /progress/content/:id/complete` | `PATCH /content-attempts/:id` | ⚠️ | Exists but not as action |
| `GET /progress/courses` | `GET /course-enrollments?learner=me` | ✅ | Exists |
| `GET /progress/recent` | None | ❌ | Need to add |
| `GET /progress/learners/:id` | `GET /content/reports/learner/:id` | ✅ | Exists |
| `GET /progress/learners/:id/courses/:cid` | None | ❌ | Need to add |

**Additions Needed:**
```
GET /progress/programs/:id               - Program progress overview
  Response: {
    programId,
    status: 'enrolled',
    completionPercent: 0.65,
    coursesCompleted: 8,
    coursesTotal: 12,
    currentLevel,
    credentialGoal,
    enrolledAt,
    estimatedCompletion
  }

GET /progress/courses/:id                - Course progress with module breakdown
  Response: {
    courseId,
    status: 'in_progress',
    progress: 0.6,
    modulesCompleted: 3,
    modulesTotal: 5,
    currentScore: 78,
    timeSpent: 7200,
    lastAccessedAt,
    modules: [
      {
        moduleId,
        title,
        status: 'completed',
        score: 85,
        attempts: 1,
        completedAt
      }
    ],
    nextUp: { moduleId, title }
  }

POST /progress/content/:id/events        - Record learning events
  Body: {
    eventType: 'page_view|interaction|bookmark|note',
    timestamp,
    metadata: { ... }
  }

GET /progress/recent                     - Recent activity across all content
  Query: ?limit=10&type=completion|attempt|assessment
  Response: [
    {
      contentId,
      contentTitle,
      activityType: 'completed',
      timestamp,
      score?,
      timeSpent?
    }
  ]
```

**Status:** Core tracking exists ✅, enhanced features needed ⚠️

---

## Attempt Management

### Ideal API: `/attempts`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /attempts/content/:contentId` | `GET /content/:id/attempts` | ✅ | Exists |
| `GET /attempts/:id` | `GET /content-attempts/:id` | ✅ | Exists |
| `POST /attempts/content/:contentId` | `POST /content-attempts` | ✅ | Exists |
| `PATCH /attempts/:id` | `PATCH /content-attempts/:id` | ✅ | Exists |
| `POST /attempts/:id/submit` | None | ⚠️ | Can PATCH status |
| `GET /attempts/:id/scorm/cmi` | `GET /scorm/attempts/:id` | ✅ | Exists |
| `PATCH /attempts/:id/scorm/cmi` | `PATCH /scorm/attempts/:id` | ✅ | Exists |
| `POST /attempts/:id/scorm/suspend` | None | ⚠️ | CMI exit=suspend |
| `POST /attempts/:id/scorm/resume` | None | ⚠️ | CMI entry=resume |
| `GET /attempts/me` | `GET /content-attempts?learner=me` | ✅ | Exists |
| `GET /attempts/me/content/:contentId` | `GET /content-attempts?learner=me&courseContent=:id` | ✅ | Exists |

**Additions Needed:**
```
POST /attempts/:id/submit                - Submit for grading
  Body: { finalAnswers?, submittedAt? }
  Response: { attemptId, status: 'completed', score?, passed? }

POST /attempts/:id/scorm/suspend         - Suspend SCORM session
  Updates CMI exit='suspend' and preserves suspend_data

POST /attempts/:id/scorm/resume          - Resume SCORM session
  Updates CMI entry='resume' and restores suspend_data
```

**Status:** All covered ✅, action endpoints needed for clarity ⚠️

---

## Assessment Management

### Ideal API: `/assessments`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /assessments/:id` | `GET /exams/:id` | ✅ | Exists |
| `POST /assessments/:id/attempts` | `POST /exam-results` | ✅ | Exists (implicit) |
| `GET /assessments/:id/attempts/:attemptId` | `GET /exam-results/:id` | ✅ | Exists |
| `POST /assessments/:id/attempts/:attemptId/answer` | None | ❌ | Need to add |
| `POST /assessments/:id/attempts/:attemptId/submit` | `POST /exam-results` | ⚠️ | Exists as create |
| `GET /assessments/:id/results` | `GET /exam-results?exam=:id&learner=me` | ✅ | Exists |
| `GET /assessments/:id/results/:resultId` | `GET /exam-results/:id` | ✅ | Exists |
| `GET /assessments/:id/feedback/:resultId` | None | ❌ | Need to add |

**Additions Needed:**
```
POST /assessments/:id/attempts/:attemptId/answer  - Submit single answer
  Body: {
    questionId,
    answer: 'B' | ['A','C'] | 'essay text',
    timeSpent?
  }
  Response: { saved: true }

GET /assessments/:id/feedback/:resultId  - Get feedback/corrections
  Response: {
    resultId,
    overallFeedback,
    questions: [
      {
        questionId,
        userAnswer,
        correctAnswer?,
        isCorrect,
        feedback,
        pointsAwarded,
        pointsPossible
      }
    ]
  }
```

**Status:** Basic functionality exists ✅, interactive assessment flow needed ❌

---

## Analytics (Staff/Admin)

### Ideal API: `/analytics`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /analytics/programs/:id/completion` | `GET /staff/analytics/program/:id` | ⚠️ | Partial coverage |
| `GET /analytics/programs/:id/performance` | None | ❌ | Need to add |
| `GET /analytics/programs/:id/engagement` | None | ❌ | Need to add |
| `GET /analytics/programs/:id/learners` | None | ❌ | Need to add |
| `GET /analytics/courses/:id/completion` | None | ❌ | Need to add |
| `GET /analytics/courses/:id/performance` | None | ❌ | Need to add |
| `GET /analytics/courses/:id/modules` | None | ❌ | Need to add |
| `GET /analytics/courses/:id/learners` | None | ❌ | Need to add |
| `GET /analytics/content/:id` | None | ❌ | Need to add |
| `GET /analytics/content/:id/attempts` | `GET /content/:id/attempts` | ⚠️ | Exists but no aggregation |
| `GET /analytics/content/:id/time` | None | ❌ | Need to add |
| `GET /analytics/departments/:id` | None | ❌ | Need to add |
| `GET /analytics/institution` | None | ❌ | Need to add |

**Additions Needed:**
```
GET /analytics/programs/:id/completion   - Completion rates & trends
  Query: ?weeks=12                       - Time window
  Response: {
    completionRate: 0.78,
    abandonmentRate: 0.12,
    activeLearners: 45,
    weeklyEnrollments: [5,8,12,...],
    weeklyCompletions: [3,6,9,...]
  }

GET /analytics/programs/:id/performance  - Performance metrics
  Response: {
    averageScore: 82.5,
    medianScore: 85,
    passRate: 0.78,
    scoreDistribution: {...},
    topPerformers: [...],
    needsAttention: [...]
  }

GET /analytics/programs/:id/engagement   - Engagement statistics
  Response: {
    averageTimeSpent: 7200,
    dailyActiveUsers: [...],
    weeklyActiveUsers: [...],
    engagementRate: 0.85
  }

GET /analytics/courses/:id/completion    - Course completion metrics
  Response: {
    totalEnrolled: 50,
    completed: 35,
    inProgress: 12,
    notStarted: 3,
    completionRate: 0.7,
    averageCompletionTime: 14400
  }

GET /analytics/courses/:id/modules       - Module-level analytics
  Response: [
    {
      moduleId,
      title,
      completionRate: 0.82,
      averageScore: 78,
      averageAttempts: 1.5,
      averageTimeSpent: 3600
    }
  ]

GET /analytics/content/:id/time          - Time-on-task metrics
  Response: {
    averageTimeSpent: 1800,
    medianTimeSpent: 1500,
    timeDistribution: {...},
    engagementPattern: 'front_loaded|consistent|procrastinated'
  }

GET /analytics/departments/:id           - Department dashboard
  Response: {
    staff: { total: 15, byRole: {...} },
    courses: { total: 45, published: 38 },
    enrollments: { active: 234, completionRate: 0.78 },
    progress: { averageCompletion: 0.65, averageScore: 82 }
  }

GET /analytics/institution               - Institution-wide metrics
  Response: {
    departments: 5,
    programs: 20,
    courses: 150,
    activeLearners: 1500,
    completionRate: 0.75,
    topPrograms: [...],
    trendsOverTime: {...}
  }
```

**Status:** Basic program analytics exist ⚠️, comprehensive analytics needed ❌

---

## Activity Feed

### Ideal API: `/activity`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /activity/me` | None | ❌ | Need to add |
| `GET /activity/learners/:id` | None | ❌ | Need to add |
| `GET /activity/courses/:id` | None | ❌ | Need to add |
| `GET /activity/classes/:id` | None | ❌ | Need to add |

**Additions Needed:**
```
GET /activity/me                         - My recent activity
  Query: 
    ?type=completion|attempt|assessment|enrollment
    &since=2025-01-01
    &limit=20
  Response: [
    {
      activityId,
      type: 'completion',
      timestamp,
      resource: {
        type: 'course|module|assessment',
        id,
        title
      },
      details: {
        score?: 85,
        timeSpent?: 3600,
        status: 'completed'
      }
    }
  ]

GET /activity/learners/:id               - Specific learner activity (staff)
  Query: ?type=...&since=...&limit=...
  Response: [...] (same structure as /me)

GET /activity/courses/:id                - Course activity feed
  Query: ?type=...&since=...&limit=...
  Response: [
    {
      activityId,
      type: 'enrollment|completion|assessment_submitted',
      timestamp,
      learner: { id, name },
      details: {...}
    }
  ]

GET /activity/classes/:id                - Class activity feed
  Response: [...] (similar to courses)
```

**Status:** Not implemented ❌

---

## Reporting & Analytics

### Ideal API: `/reports`

| Ideal Endpoint | Current Endpoint(s) | Status | Notes |
|----------------|---------------------|--------|-------|
| `GET /reports/completion` | `GET /content/reports` | ✅ | Exists |
| `GET /reports/performance` | None | ❌ | Need to add |
| `GET /reports/engagement` | None | ❌ | Need to add |
| `GET /reports/departments/:id` | None | ❌ | Need to add |

**Additions Needed:**
```
GET /reports/performance                 - Performance metrics
  Query: 
    ?learner=:id                         - Specific learner
    &course=:id                          - Specific course
    &program=:id                         - Specific program
    &department=:id                      - Specific department
    &groupBy=learner|course|department   - Aggregation level
    &from=2026-01-01&to=2026-12-31       - Date range
  Response: {
    averageScore: 82.5,
    medianScore: 85,
    passRate: 0.78,
    topPerformers: [...],
    needsAttention: [...]
  }

GET /reports/engagement                  - Engagement statistics
  Query: ?course=:id&metric=time_spent|attempts|completion_rate
  Response: {
    metric: 'time_spent',
    totalTimeSpent: 125000,              - Seconds
    averageTimePerLearner: 5000,
    activeUsers: 25,
    dailyActiveUsers: [...],             - Time series
    weeklyTrends: [...]
  }

GET /reports/departments/:id             - Department dashboard
  Query: ?include=staff,courses,enrollments,progress
  Response: {
    departmentId,
    name,
    staff: {
      total: 15,
      byRole: { instructor: 10, ... }
    },
    courses: {
      total: 45,
      published: 38,
      draft: 7
    },
    enrollments: {
      active: 234,
      completed: 156,
      completionRate: 0.78
    },
    progress: {
      averageCompletion: 0.65,
      averageScore: 82
    }
  }
```

---

## Additional Current Endpoints Not Yet Mapped

### Class Management

| Current Endpoint | Ideal Mapping | Status | Notes |
|------------------|---------------|--------|-------|
| `GET /classes` | 🆕 `GET /classes` | ❌ | Need to add to ideal |
| `POST /classes` | 🆕 `POST /classes` | ❌ | Need to add to ideal |
| `GET /classes/:id` | 🆕 `GET /classes/:id` | ❌ | Need to add to ideal |
| `PUT /classes/:id` | 🆕 `PUT /classes/:id` | ❌ | Need to add to ideal |
| `DELETE /classes/:id` | 🆕 `DELETE /classes/:id` | ❌ | Need to add to ideal |
| `GET /class-enrollments` | 🆕 `GET /classes/:id/enrollments` | ❌ | Need to add to ideal |

**Add to Ideal API:**
```
Classes - Course instances with schedules

GET    /classes                          - List classes
  ?course=:id                            - Filter by course
  &program=:id                           - Filter by program
  &instructor=:id                        - Filter by instructor
  &status=active|completed|upcoming      - Filter by status
  &department=:id                        - Filter by department

POST   /classes                          - Create class
  Body: {
    name,
    course,
    program,
    programLevel,
    instructors: [],                     - Staff IDs
    startDate,
    endDate,
    duration,
    capacity?
  }

GET    /classes/:id                      - Get class details
PUT    /classes/:id                      - Update class
DELETE /classes/:id                      - Delete class

GET    /classes/:id/enrollments          - Class enrollments
POST   /classes/:id/enrollments          - Enroll learners
GET    /classes/:id/roster               - Class roster with progress
```

### Academic Calendar

| Current Endpoint | Ideal Mapping | Status | Notes |
|------------------|---------------|--------|-------|
| `GET /academic-years` | 🆕 `GET /calendar/years` | ❌ | Need to add to ideal |
| `POST /academic-years` | 🆕 `POST /calendar/years` | ❌ | Need to add to ideal |
| `GET /academic-terms` | 🆕 `GET /calendar/terms` | ❌ | Need to add to ideal |
| `POST /academic-terms` | 🆕 `POST /calendar/terms` | ❌ | Need to add to ideal |
| `GET /year-groups` | 🆕 `GET /calendar/cohorts` | ❌ | Need to add to ideal |

**Add to Ideal API:**
```
Academic Calendar Management

GET    /calendar/years                   - List academic years
POST   /calendar/years                   - Create academic year
  Body: { name, startDate, endDate, isCurrent }

GET    /calendar/years/:id               - Get year details
PUT    /calendar/years/:id               - Update year
DELETE /calendar/years/:id               - Delete year

GET    /calendar/terms                   - List academic terms
POST   /calendar/terms                   - Create term
  Body: { name, academicYear, startDate, endDate, termType }

GET    /calendar/terms/:id               - Get term details
PUT    /calendar/terms/:id               - Update term
DELETE /calendar/terms/:id               - Delete term

GET    /calendar/cohorts                 - List cohorts/year groups
POST   /calendar/cohorts                 - Create cohort
GET    /calendar/cohorts/:id             - Get cohort details
PUT    /calendar/cohorts/:id             - Update cohort
DELETE /calendar/cohorts/:id             - Delete cohort
```

### Program Levels

| Current Endpoint | Ideal Mapping | Status | Notes |
|------------------|---------------|--------|-------|
| `GET /program-levels` | `GET /programs/:id/levels` | ✅ | Already in ideal (nested) |
| `POST /program-levels` | `POST /programs/:id/levels` | ✅ | Already in ideal |
| `GET /program-levels/:id` | 🆕 `GET /program-levels/:id` | ⚠️ | Add shortcut to ideal |
| `PUT /program-levels/:id` | 🆕 `PUT /program-levels/:id` | ⚠️ | Add shortcut to ideal |
| `DELETE /program-levels/:id` | 🆕 `DELETE /program-levels/:id` | ⚠️ | Add shortcut to ideal |

**Add to Ideal API (shortcuts):**
```
Program Level Shortcuts (in addition to nested routes)

GET    /program-levels/:id               - Get level (direct access)
PUT    /program-levels/:id               - Update level
DELETE /program-levels/:id               - Delete level
```

### Questions

| Current Endpoint | Ideal Mapping | Status | Notes |
|------------------|---------------|--------|-------|
| `GET /questions` | 🆕 `GET /questions` | ❌ | Need to add to ideal |
| `POST /questions` | 🆕 `POST /questions` | ❌ | Need to add to ideal |
| `GET /questions/:id` | 🆕 `GET /questions/:id` | ❌ | Need to add to ideal |
| `PUT /questions/:id` | 🆕 `PUT /questions/:id` | ❌ | Need to add to ideal |
| `DELETE /questions/:id` | 🆕 `DELETE /questions/:id` | ❌ | Need to add to ideal |

**Add to Ideal API:**
```
Question Bank Management

GET    /questions                        - List questions
  ?examType=multiple_choice|essay|...   - Filter by type
  &tag=:tag                              - Filter by tag
  &difficulty=easy|medium|hard           - Filter by difficulty
  &search=:term                          - Search questions

POST   /questions                        - Create question
  Body: {
    questionText,
    questionType,
    options?: [...],                     - For multiple choice
    correctAnswer?,
    points,
    difficulty?,
    tags?: []
  }

GET    /questions/:id                    - Get question
PUT    /questions/:id                    - Update question
DELETE /questions/:id                    - Delete question

POST   /questions/bulk                   - Bulk import questions
  Body: { questions: [...] }
```

### Exam Results

| Current Endpoint | Ideal Mapping | Status | Notes |
|------------------|---------------|--------|-------|
| `GET /exam-results` | `GET /progress/exercises/:id/results` | ⚠️ | Map to progress |
| `POST /exam-results` | `POST /progress/exercises/:id/results` | ⚠️ | Map to progress |
| `GET /exam-results/:id` | `GET /progress/results/:id` | ⚠️ | Map to progress |
| `PUT /exam-results/:id` | `PUT /progress/results/:id` | ⚠️ | Map to progress |

**Add to Ideal API under `/progress`:**
```
GET    /progress/exercises/:id/results   - List results for exercise
POST   /progress/exercises/:id/results   - Submit exercise result
GET    /progress/results/:id             - Get specific result
PUT    /progress/results/:id             - Update result (grading)
```

### Templates

| Current Endpoint | Ideal Mapping | Status | Notes |
|------------------|---------------|--------|-------|
| `GET /templates` | 🆕 `GET /templates` | ❌ | Need to add to ideal |
| `POST /templates` | 🆕 `POST /templates` | ❌ | Need to add to ideal |
| `GET /templates/:id` | 🆕 `GET /templates/:id` | ❌ | Need to add to ideal |
| `PUT /templates/:id` | 🆕 `PUT /templates/:id` | ❌ | Need to add to ideal |
| `DELETE /templates/:id` | 🆕 `DELETE /templates/:id` | ❌ | Need to add to ideal |

**Add to Ideal API:**
```
Course Template Management

GET    /templates                        - List course templates
  ?type=master|department|custom         - Filter by type
  &department=:id                        - Filter by department
  &status=active|draft                   - Filter by status

POST   /templates                        - Create template
  Body: {
    name,
    type,
    css?,
    html?,
    department?,
    isGlobal: false
  }

GET    /templates/:id                    - Get template
PUT    /templates/:id                    - Update template
DELETE /templates/:id                    - Delete template

POST   /templates/:id/duplicate          - Duplicate template
GET    /templates/:id/preview            - Preview template
```

### Settings & Permissions

| Current Endpoint | Ideal Mapping | Status | Notes |
|------------------|---------------|--------|-------|
| `GET /settings` | 🆕 `GET /settings` | ❌ | Need to add to ideal |
| `PUT /settings` | 🆕 `PUT /settings` | ❌ | Need to add to ideal |
| `GET /permissions` | 🆕 `GET /permissions` | ❌ | Need to add to ideal |

**Add to Ideal API:**
```
System Settings & Permissions

GET    /settings                         - Get system settings
  ?scope=system|department|user          - Settings scope

PUT    /settings                         - Update settings
  Body: { key: value, ... }

GET    /settings/:key                    - Get specific setting
PUT    /settings/:key                    - Update specific setting

GET    /permissions                      - List available permissions
GET    /permissions/roles                - List roles with permissions
```

### Metrics & Health

| Current Endpoint | Ideal Mapping | Status | Notes |
|------------------|---------------|--------|-------|
| `GET /metrics` | 🆕 `GET /system/metrics` | ❌ | Need to add to ideal |
| `GET /health` | 🆕 `GET /system/health` | ❌ | Need to add to ideal |

**Add to Ideal API:**
```
System Monitoring

GET    /system/health                    - System health check
  Response: {
    status: 'healthy|degraded|down',
    timestamp,
    services: {
      database: 'up',
      redis: 'up',
      storage: 'up'
    }
  }

GET    /system/metrics                   - System metrics
  Response: {
    uptime,
    requests: { total, perMinute },
    database: { connections, latency },
    memory: { used, total },
    errors: { count, rate }
  }

GET    /system/version                   - API version info
```

---

## Summary: Additions Needed for Complete Coverage

### High Priority (Core Functionality)

1. ✅ **Classes Management** - Course instances
2. ✅ **Academic Calendar** - Years, terms, cohorts
3. ✅ **Question Bank** - Question management
4. ✅ **Templates** - Course templates
5. 🆕 **Progress APIs** - Real-time progress tracking with events
6. 🆕 **Attempts APIs** - Unified attempt management
7. 🆕 **Assessments APIs** - Interactive assessment workflows

### Medium Priority (Enhanced Features)

8. 🆕 **Analytics APIs** - Comprehensive metrics (separate from reports)
9. ✅ **Reports** - Performance, engagement, department dashboards
10. ✅ **Course Actions** - Duplicate, export
11. ✅ **Enrollment Actions** - Withdraw, complete endpoints
12. ✅ **User Shortcuts** - `/users/me/courses` for instructors
13. 🆕 **Activity Feeds** - Activity streams for learners/staff

### Low Priority (Admin/System)

14. ✅ **Settings** - System configuration
15. ✅ **Permissions** - Permission management
16. ✅ **System Metrics** - Health, monitoring
17. ✅ **Statistics** - Department stats

---

## Updated Ideal API Structure (Complete)

```
/api/v1

├── /departments
│   ├── GET, POST /
│   ├── GET, PUT, DELETE /:id
│   ├── GET /:id/hierarchy
│   ├── GET /:id/programs
│   ├── GET /:id/staff
│   └── GET /:id/stats                  🆕

├── /programs
│   ├── GET, POST /
│   ├── GET, PUT, DELETE /:id
│   ├── GET, POST /:id/levels
│   ├── GET /:id/courses
│   ├── GET /:id/enrollments
│   └── PATCH /:id/department

├── /program-levels                     🆕 Shortcuts
│   ├── GET, PUT, DELETE /:id

├── /courses
│   ├── GET, POST /
│   ├── GET, PUT, PATCH, DELETE /:id
│   ├── POST /:id/publish
│   ├── POST /:id/unpublish
│   ├── POST /:id/archive
│   ├── POST /:id/unarchive
│   ├── POST /:id/duplicate             🆕
│   ├── GET, POST /:id/render
│   ├── GET /:id/export                 🆕
│   ├── PATCH /:id/department
│   ├── PATCH /:id/program
│   ├── GET, POST /:id/modules
│   ├── GET, PUT, DELETE /:id/modules/:mid
│   └── PATCH /:id/modules/reorder      🆕

├── /classes                            🆕
│   ├── GET, POST /
│   ├── GET, PUT, DELETE /:id
│   ├── GET, POST /:id/enrollments
│   └── GET /:id/roster

├── /calendar                           🆕
│   ├── /years
│   │   ├── GET, POST /
│   │   └── GET, PUT, DELETE /:id
│   ├── /terms
│   │   ├── GET, POST /
│   │   └── GET, PUT, DELETE /:id
│   └── /cohorts
│       ├── GET, POST /
│       └── GET, PUT, DELETE /:id

├── /content
│   ├── GET /:id
│   ├── /scorm
│   │   ├── GET, POST /
│   │   ├── GET, PUT, DELETE /:id
│   │   ├── POST /:id/launch
│   │   ├── POST /:id/publish
│   │   └── POST /:id/unpublish
│   ├── /exercises
│   │   ├── GET, POST /
│   │   ├── GET, PUT, DELETE /:id
│   │   ├── GET, POST /:id/questions
│   │   └── POST /bulk
│   └── /media
│       ├── GET, POST /
│       └── GET, PUT, DELETE /:id

├── /questions                          🆕
│   ├── GET, POST /
│   ├── GET, PUT, DELETE /:id
│   └── POST /bulk

├── /templates                          🆕
│   ├── GET, POST /
│   ├── GET, PUT, DELETE /:id
│   ├── POST /:id/duplicate
│   └── GET /:id/preview

├── /enrollments
│   ├── GET, POST /
│   ├── GET, PUT, DELETE /:id
│   ├── POST /:id/withdraw              🆕
│   ├── POST /:id/complete              🆕
│   ├── GET /programs/:id
│   └── GET /courses/:id

├── /progress
│   ├── /programs/:id
│   │   └── GET /                       🆕
│   ├── /courses/:id
│   │   ├── GET /                       🆕
│   │   └── GET /learners               🆕
│   ├── /content/:id
│   │   ├── GET /
│   │   ├── POST /start                 🆕
│   │   ├── POST /events                🆕
│   │   └── POST /complete              🆕
│   ├── /courses
│   │   └── GET /                       🆕 (my courses)
│   ├── /recent
│   │   └── GET /                       🆕
│   └── /learners/:id
│       ├── GET /
│       └── GET /courses/:cid           🆕

├── /attempts                           🆕
│   ├── /content/:contentId
│   │   ├── GET /                       - All attempts
│   │   └── POST /                      - New attempt
│   ├── /:id
│   │   ├── GET /
│   │   ├── PATCH /
│   │   └── POST /submit                🆕
│   ├── /:id/scorm
│   │   ├── GET /cmi
│   │   ├── PATCH /cmi
│   │   ├── POST /suspend               🆕
│   │   └── POST /resume                🆕
│   └── /me
│       ├── GET /
│       └── GET /content/:contentId

├── /assessments                        🆕
│   ├── /:id
│   │   ├── GET /
│   │   ├── POST /attempts
│   │   ├── GET /results
│   │   └── GET /results/:resultId
│   ├── /:id/attempts/:attemptId
│   │   ├── GET /
│   │   ├── POST /answer                🆕
│   │   └── POST /submit
│   └── /:id/feedback/:resultId         🆕

├── /analytics                          🆕
│   ├── /programs/:id
│   │   ├── GET /completion             🆕
│   │   ├── GET /performance            🆕
│   │   ├── GET /engagement             🆕
│   │   └── GET /learners               🆕
│   ├── /courses/:id
│   │   ├── GET /completion             🆕
│   │   ├── GET /performance            🆕
│   │   ├── GET /modules                🆕
│   │   └── GET /learners               🆕
│   ├── /content/:id
│   │   ├── GET /                       🆕
│   │   ├── GET /attempts               🆕
│   │   └── GET /time                   🆕
│   ├── /departments/:id                🆕
│   └── /institution                    🆕

├── /activity                           🆕
│   ├── GET /me
│   ├── GET /learners/:id
│   ├── GET /courses/:id
│   └── GET /classes/:id

├── /users
│   ├── /me
│   │   ├── GET, PUT /
│   │   ├── GET /departments
│   │   ├── GET /courses                🆕
│   │   ├── GET /enrollments
│   │   └── GET /progress
│   ├── /staff
│   │   ├── GET, POST /
│   │   ├── GET, PUT, DELETE /:id
│   │   └── PATCH /:id/departments
│   └── /learners
│       ├── GET, POST /
│       └── GET, PUT, DELETE /:id

├── /reports                            🆕
│   ├── GET /completion
│   ├── GET /performance                🆕
│   ├── GET /engagement                 🆕
│   ├── GET /departments/:id            🆕
│   ├── GET /transcript/:learnerId      🆕
│   ├── POST /custom                    🆕
│   ├── GET /:id                        🆕
│   └── GET /:id/download               🆕

├── /settings                           🆕
│   ├── GET, PUT /
│   └── GET, PUT /:key

├── /permissions                        🆕
│   ├── GET /
│   └── GET /roles

└── /system                             🆕
    ├── GET /health
    ├── GET /metrics
    └── GET /version
```

---

## Key Design Principles

### 1. **Separation of Concerns**

The ideal API separates different functional areas into distinct endpoint groups:

- **`/enrollments`** - Enrollment lifecycle management (apply, enroll, withdraw, complete)
- **`/progress`** - Real-time progress tracking and learning state
- **`/attempts`** - Detailed attempt history and management
- **`/assessments`** - Assessment-specific workflows (take exam, submit answers, get feedback)
- **`/analytics`** - Computed metrics for staff/admin (aggregations, dashboards)
- **`/reports`** - Exported/historical reports (downloadable formats)
- **`/activity`** - Activity feeds and audit trails
- **`/courses`** - Course structure and metadata
- **`/content`** - Content library (SCORM, exercises, media)
- **`/users`** - User management and profiles

**Why:** Clear boundaries make the API more intuitive, reduce coupling, and allow independent scaling.

### 2. **Resource Hierarchy**

```
Resource-Based URLs (Nouns, not verbs):
✅ GET  /courses/:id
✅ POST /courses/:id/publish
❌ POST /publishCourse/:id

Shallow Nesting (max 2-3 levels):
✅ /courses/:id/modules/:moduleId
✅ /attempts/:id/scorm/cmi
⚠️ /departments/:id/programs/:pid/courses/:cid/modules/:mid  (too deep)

Use Query Params for Filtering:
✅ GET /courses?program=:id&status=published
❌ GET /programs/:id/courses/published
```

**Why:** Keeps URLs predictable, readable, and maintainable. Deep nesting becomes unwieldy.

### 3. **Action Endpoints Use POST**

Actions that change state use explicit POST endpoints:

```
✅ POST /courses/:id/publish
✅ POST /courses/:id/duplicate
✅ POST /enrollments/:id/withdraw
✅ POST /attempts/:id/submit
✅ POST /progress/content/:id/start

❌ PATCH /courses/:id { published: true }  (implicit action)
```

**Why:** Makes intent explicit, enables complex business logic, and provides clear audit trails.

### 4. **Standard HTTP Methods**

- **GET** - Retrieve resource(s), no side effects, idempotent
- **POST** - Create resource or trigger action
- **PUT** - Replace entire resource (full update)
- **PATCH** - Update specific fields (partial update)
- **DELETE** - Remove resource (soft delete where appropriate)

### 5. **Learner vs Staff Permissions**

Different endpoint patterns for different roles:

**Learner Self-Service:**
```
GET /progress/me                         - My progress
GET /attempts/me                         - My attempts
GET /activity/me                         - My activity
GET /users/me                            - My profile
```

**Staff/Admin Analytics:**
```
GET /analytics/programs/:id              - Program analytics
GET /analytics/courses/:id               - Course analytics
GET /reports/performance                 - Performance reports
GET /activity/learners/:id               - Learner activity (staff view)
```

**Why:** Simplifies permission checking, makes API self-documenting, prevents accidental data exposure.

### 6. **SCORM Isolation**

SCORM complexity is hidden under specialized endpoints:

```
Generic attempt API:
POST   /attempts/content/:contentId      - Works for all content types
GET    /attempts/:id                     - Generic attempt details
PATCH  /attempts/:id                     - Update any attempt

SCORM-specific:
GET    /attempts/:id/scorm/cmi           - SCORM CMI data model
PATCH  /attempts/:id/scorm/cmi           - Update CMI values
POST   /attempts/:id/scorm/suspend       - SCORM suspend action
```

**Why:** Keeps generic APIs clean while supporting SCORM's unique requirements.

### 7. **Consistent Response Structure**

All endpoints follow consistent response patterns:

```json
// Success
{
  "status": "success",
  "message": "Resource created successfully",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}

// Error
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

### 8. **Filtering, Sorting, Pagination**

Query parameters for common operations:

```
GET /courses?department=:id&status=published&search=calculus
  &sort=-createdAt&page=1&limit=20
  
GET /progress/courses?status=in_progress
GET /attempts/me?contentType=scorm&from=2025-01-01
GET /analytics/programs/:id/completion?weeks=12
```

### 9. **Nested Resources with Shortcuts**

Provide both nested and direct access:

```
Nested (shows relationship):
GET /courses/:id/modules
GET /courses/:id/modules/:moduleId

Direct shortcuts (for convenience):
GET /modules/:id
PUT /modules/:id
```

**Why:** Nested routes show relationships, shortcuts reduce verbosity for common operations.

### 10. **Action Naming Conventions**

Clear, verb-based action names:

```
/start      - Begin activity
/complete   - Mark as done
/submit     - Submit for grading/processing
/publish    - Make public
/archive    - Move to archive
/withdraw   - Remove enrollment
/duplicate  - Copy resource
/suspend    - Pause activity
/resume     - Continue activity
/export     - Generate downloadable version
```

---

## Migration Priority

### Phase 1: Critical Paths (Week 1-2)
- Courses & Modules
- Progress tracking
- User management (/me endpoint)
- Enrollments

### Phase 2: Core Features (Week 3-4)
- Classes
- Calendar
- Questions
- Templates

### Phase 3: Enhanced Features (Week 5-6)
- Reports & Analytics
- Course actions (duplicate, export)
- Progress APIs (course-level)
- Department stats

### Phase 4: System & Admin (Week 7-8)
- Settings
- Permissions
- System metrics
- Final cleanup

---

## Conclusion

The ideal API provides **complete coverage** of current functionality with these additions:

- **15 new endpoint groups** added to ideal API (including `/progress`, `/attempts`, `/assessments`, `/analytics`, `/activity`)
- **60+ new specific endpoints** for missing functionality
- **Unified structure** that's clearer and more maintainable
- **Consistent patterns** across all resources
- **Clear separation of concerns** between progress tracking, analytics, and reporting
- **Learner-focused** endpoints (`/me`, `/progress/recent`, `/activity/me`)
- **Staff/Admin analytics** endpoints for comprehensive insights

All current functionality is preserved while providing a more intuitive, RESTful structure that follows industry best practices.

### Complete Learning Activity Flow Example

```javascript
// 1. Student enrolls in program
POST /enrollments/programs
{ programId: "CBT-101", credentialGoal: "certificate" }

// 2. Auto-enrolled in first course or manually enrolls
POST /enrollments/courses
{ courseId: "CBT-C1", programEnrollmentId: "enroll-123" }

// 3. View course structure and progress
GET /progress/courses/CBT-C1
// Returns: { progress: 0, modules: [...], nextUp: {...} }

// 4. Start first content module
POST /progress/content/module-1/start
// Creates ContentAttempt with status: in_progress

// 5. For SCORM content - interact via attempts API
POST /attempts/content/scorm-package-1
// Returns: { attemptId: "attempt-789", cmiData: {...} }

PATCH /attempts/attempt-789/scorm/cmi
// Updates CMI data (score, lesson_status, etc.)

// 6. For custom assessment - use assessments API
POST /assessments/quiz-1/attempts
// Returns: { attemptId: "quiz-attempt-456" }

POST /assessments/quiz-1/attempts/quiz-attempt-456/answer
{ questionId: "q1", answer: "B" }

POST /assessments/quiz-1/attempts/quiz-attempt-456/submit
// Creates ExamResults record

// 7. Complete content item
POST /progress/content/module-1/complete
// Updates ContentAttempt status: completed
// Updates CourseEnrollment.progress

// 8. View updated progress
GET /progress/courses/CBT-C1
// Returns: { progress: 33, completedModules: 1, totalModules: 3 }

// 9. Check recent activity
GET /activity/me?limit=5
// Returns recent completions, attempts, enrollments

// 10. Staff views analytics
GET /analytics/courses/CBT-C1/completion
// Returns: { completionRate: 0.72, averageTime: 14400, ... }

// 11. Complete course
POST /enrollments/courses/enroll-456/complete
// Updates CourseEnrollment status: completed

// 12. Complete program (when all courses done)
POST /enrollments/programs/enroll-123/complete
// Updates ProgramEnrollment status: completed

// 13. View transcript/final results
GET /reports/transcript/learner-123
```

