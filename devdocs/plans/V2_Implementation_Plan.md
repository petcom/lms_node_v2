# LMS V2 Implementation Plan

> **Created:** 2026-01-07  
> **Purpose:** Phased implementation plan to achieve feature parity with V1 using ideal design principles  
> **Reference Documents:**
> - `../lms_node_devdocs/Ideal_RestfulAPI_toCurrent_Crosswalk.md`
> - `../lms_node_devdocs/Ideal_TypeScript_DataStructures.md`
> - `../lms_node_devdocs/Ideal_MongoDB_DataObjects.md`

---

## Table of Contents

1. [Current V1 Feature Inventory](#current-v1-feature-inventory)
2. [V2 Design Principles](#v2-design-principles)
3. [Implementation Phases](#implementation-phases)
4. [Feature Mapping V1 → V2](#feature-mapping-v1--v2)
5. [Analytics Requirements](#analytics-requirements)
6. [Migration Strategy](#migration-strategy)
7. [Success Criteria](#success-criteria)

---

## Current V1 Feature Inventory

### 1. Authentication & User Management

**Features:**
- ✅ Multi-role authentication (Learner, Staff, Admin)
- ✅ JWT-based access tokens + refresh tokens
- ✅ Role-based access control (RBAC)
- ✅ Staff subroles (instructor, department-admin, content-admin, billing-admin)
- ✅ Password reset via email token
- ✅ Password change (authenticated)
- ✅ Logout (single session)
- ✅ Logout all sessions
- ✅ Token refresh
- ✅ Token introspection
- ✅ Rate limiting on auth endpoints

**V1 Endpoints:**
- `POST /api/v1/staff/admins/register`
- `POST /api/v1/staff/admins/login`
- `GET /api/v1/staff/admins/profile`
- `POST /api/v1/staff/login`
- `GET /api/v1/staff/profile`
- `POST /api/v1/learners/login`
- `GET /api/v1/learners/profile`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `GET /api/v1/auth/token-info`
- `POST /api/v1/password/forgot`
- `PUT /api/v1/password/reset`
- `PUT /api/v1/password/change`

**Current Patterns:**
- Shared `_id` across User/Staff/Learner/Admin
- Email stored only on User model (via `getEmail()` method)
- Multiple roles per user (roles array)
- Department memberships for Staff

---

### 2. Department Management

**Features:**
- ✅ Create departments
- ✅ Update departments
- ✅ List departments
- ✅ Department hierarchy (parent/child)
- ✅ Department tree view
- ✅ Department scoping middleware
- ✅ Staff department memberships with roles

**V1 Endpoints:**
- `GET /api/v1/departments`
- `POST /api/v1/departments`
- `GET /api/v1/departments/:id`
- `PUT /api/v1/departments/:id`
- `GET /api/v1/departments/hierarchy`

**Current Patterns:**
- Master department (global)
- Top-level departments
- Sub-departments
- Department inheritance for Programs/Courses

---

### 3. Academic Structure

#### Programs
**Features:**
- ✅ Create programs
- ✅ Update programs
- ✅ List programs (with filters)
- ✅ Get single program
- ✅ Archive/activate programs
- ✅ Programs scoped by department

**V1 Endpoints:**
- `GET /api/v1/programs`
- `POST /api/v1/programs` (also `POST /api/v1/department-resources/programs` - deprecated)
- `GET /api/v1/programs/:id`
- `PUT /api/v1/programs/:id`
- `PATCH /api/v1/programs/:id/activate`
- `PATCH /api/v1/programs/:id/archive`

#### Program Levels (SubPrograms in V2)
**Features:**
- ✅ Create program levels
- ✅ Update program levels
- ✅ List levels by program
- ✅ Get single level
- ✅ Archive/activate levels
- ✅ Inherit department from program

**V1 Endpoints:**
- `GET /api/v1/program-levels`
- `POST /api/v1/program-levels`
- `GET /api/v1/program-levels/:id`
- `PUT /api/v1/program-levels/:id`
- `PATCH /api/v1/program-levels/:id/activate`
- `PATCH /api/v1/program-levels/:id/archive`

#### Courses
**Features:**
- ✅ Create courses
- ✅ Update courses
- ✅ List courses (with filters)
- ✅ Get single course
- ✅ Archive/activate courses
- ✅ Assign instructors
- ✅ Course duration & credits
- ✅ Passing score configuration
- ✅ Max attempts configuration
- ✅ Courses scoped by department

**V1 Endpoints:**
- `GET /api/v1/courses`
- `POST /api/v1/courses` (also `POST /api/v1/department-resources/courses` - deprecated)
- `GET /api/v1/courses/:id`
- `PUT /api/v1/courses/:id`
- `PATCH /api/v1/courses/:id/activate`
- `PATCH /api/v1/courses/:id/archive`

#### Course Content (Course Modules in V2)
**Features:**
- ✅ Create course content
- ✅ Update course content
- ✅ List content for course
- ✅ Reorder content sequence
- ✅ Link SCORM packages
- ✅ Link custom content
- ✅ Content visibility settings

**V1 Endpoints:**
- `GET /api/v1/course-contents`
- `POST /api/v1/course-contents`
- `GET /api/v1/course-contents/:id`
- `PUT /api/v1/course-contents/:id`
- `PATCH /api/v1/course-contents/:id/sequence`

#### Classes
**Features:**
- ✅ Create classes
- ✅ Update classes
- ✅ List classes
- ✅ Get single class
- ✅ Assign instructors
- ✅ Class schedules
- ✅ Capacity management

**V1 Endpoints:**
- Appears to be limited in current implementation

#### Academic Calendar
**Features:**
- ✅ Academic years (create, update, list, set current)
- ✅ Academic terms (create, update, list, set current)
- ✅ Year groups (create, update, list)

**V1 Endpoints:**
- `GET /api/v1/academic-years`
- `POST /api/v1/academic-years`
- `PATCH /api/v1/academic-years/:id/set-current`
- `GET /api/v1/academic-terms`
- `POST /api/v1/academic-terms`
- `PATCH /api/v1/academic-terms/:id/set-current`
- `GET /api/v1/year-groups`
- `POST /api/v1/year-groups`

---

### 4. Content Management

#### SCORM Packages
**Features:**
- ✅ Upload SCORM packages (1.2 & 2004)
- ✅ List SCORM packages
- ✅ Get package details
- ✅ Update package metadata
- ✅ Delete packages
- ✅ Clone packages
- ✅ Assign to learners
- ✅ Assign to classes
- ✅ Bulk assign
- ✅ Get learner assignments
- ✅ Package manifest parsing
- ✅ Package file serving
- ✅ Package versioning
- ✅ Grading policy configuration
- ✅ Max attempts configuration

**V1 Endpoints:**
- `POST /api/v1/content/scorm/packages` (upload)
- `GET /api/v1/content/scorm/packages`
- `GET /api/v1/content/scorm/packages/:id`
- `PUT /api/v1/content/scorm/packages/:id`
- `DELETE /api/v1/content/scorm/packages/:id`
- `POST /api/v1/content/scorm/packages/:id/clone`
- `POST /api/v1/content/scorm/packages/:id/assign-learners`
- `POST /api/v1/content/scorm/packages/:id/assign-classes`
- `POST /api/v1/content/scorm/packages/:id/bulk-assign`
- `GET /api/v1/content/scorm/packages/my-assignments`
- `GET /api/v1/content/scorm/:packageId/manifest`
- `GET /api/v1/content/scorm/:packageId/*` (file serving)

#### Custom Content (Exercises)
**Features:**
- ✅ Create exams
- ✅ Update exams
- ✅ List exams
- ✅ Get exam details
- ✅ Add questions to exams
- ✅ Update questions
- ✅ List questions

**V1 Endpoints:**
- `GET /api/v1/exams`
- `POST /api/v1/exams`
- `GET /api/v1/exams/:id`
- `PUT /api/v1/exams/:id`
- `GET /api/v1/questions`
- `POST /api/v1/questions/:examId`
- `GET /api/v1/questions/:id`
- `PUT /api/v1/questions/:id`

#### Templates
**Features:**
- ✅ Master templates (global)
- ✅ Department templates
- ✅ Custom templates
- ✅ Template preview
- ✅ Template cloning
- ✅ Rendered courses

**V1 Endpoints:**
- `GET /api/v1/templates`
- `POST /api/v1/templates`
- `GET /api/v1/templates/:id`
- `PUT /api/v1/templates/:id`
- `POST /api/v1/templates/:id/clone`
- `GET /api/v1/templates/:id/preview`

---

### 5. Enrollment Management

#### Program Enrollments
**Features:**
- ✅ Create program enrollments
- ✅ Update enrollments
- ✅ List enrollments
- ✅ Get enrollment details
- ✅ Batch enrollment creation
- ✅ Enrollment status tracking
- ✅ Withdrawal
- ✅ Completion tracking
- ✅ Credential goal tracking

**V1 Endpoints:**
- `GET /api/v1/program-enrollments`
- `POST /api/v1/program-enrollments`
- `GET /api/v1/program-enrollments/:id`
- `PUT /api/v1/program-enrollments/:id`
- `POST /api/v1/program-enrollments/batch`

#### Course Enrollments
**Features:**
- ✅ Create course enrollments
- ✅ Update enrollments
- ✅ List enrollments
- ✅ Get enrollment details
- ✅ Batch enrollment creation
- ✅ Progress tracking
- ✅ Current course activity tracking
- ✅ Historical course completion

**V1 Endpoints:**
- `GET /api/v1/course-enrollments`
- `POST /api/v1/course-enrollments`
- `GET /api/v1/course-enrollments/:id`
- `PUT /api/v1/course-enrollments/:id`
- `POST /api/v1/course-enrollments/batch`

#### Class Enrollments
**Features:**
- ✅ Create class enrollments
- ✅ Update enrollments
- ✅ List enrollments
- ✅ Get enrollment details
- ✅ Batch enrollment creation
- ✅ Attendance tracking

**V1 Endpoints:**
- `GET /api/v1/class-enrollments`
- `POST /api/v1/class-enrollments`
- `GET /api/v1/class-enrollments/:id`
- `PUT /api/v1/class-enrollments/:id`
- `POST /api/v1/class-enrollments/batch`

---

### 6. Learning Activity & Progress

#### SCORM Runtime
**Features:**
- ✅ SCORM player launch
- ✅ Initialize SCORM session
- ✅ Terminate SCORM session
- ✅ Get CMI value (SCORM 1.2 & 2004)
- ✅ Set CMI value
- ✅ Commit data
- ✅ Error handling
- ✅ Heartbeat (session keep-alive)
- ✅ Attempt tracking
- ✅ Time tracking
- ✅ Score tracking
- ✅ Completion status
- ✅ Success status

**V1 Endpoints:**
- `GET /api/v1/content/scorm/player/:packageId/launch`
- `GET /api/v1/content/scorm/player/:packageId/content/*` (content serving)
- `POST /api/v1/content/scorm/player/:attemptId/exit`
- `POST /api/v1/content/scorm/runtime/:attemptId/initialize`
- `POST /api/v1/content/scorm/runtime/:attemptId/terminate`
- `GET /api/v1/content/scorm/runtime/:attemptId/value/:element`
- `PUT /api/v1/content/scorm/runtime/:attemptId/value/:element`
- `POST /api/v1/content/scorm/runtime/:attemptId/commit`
- `GET /api/v1/content/scorm/runtime/:attemptId/error`
- `POST /api/v1/content/scorm/runtime/:attemptId/heartbeat`

#### SCORM Attempts
**Features:**
- ✅ Get learner attempts
- ✅ Get attempt details
- ✅ Update CMI data
- ✅ Get CMI element
- ✅ Complete attempt
- ✅ List all attempts (instructor/admin)
- ✅ Get attempts by package

**V1 Endpoints:**
- `GET /api/v1/content/scorm/attempts`
- `GET /api/v1/content/scorm/attempts/:attemptId`
- `PUT /api/v1/content/scorm/attempts/:attemptId/cmi`
- `GET /api/v1/content/scorm/attempts/:attemptId/cmi/:element`
- `POST /api/v1/content/scorm/attempts/:attemptId/complete`
- `GET /api/v1/content/scorm/attempts/package/:packageId`

#### Content Attempts (Unified)
**Features:**
- ✅ Unified attempt tracking across content types
- ✅ Sync from SCORM attempts
- ✅ Progress calculation
- ✅ Time tracking

**Current State:**
- ContentAttempt model exists
- SCORM syncs via post-save hook

#### Course Progress
**Features:**
- ✅ Progress percentage tracking
- ✅ Modules completed tracking
- ✅ Current module tracking
- ✅ Last accessed timestamp
- ✅ Time spent tracking

**Current State:**
- Tracked in CourseEnrollment model
- Calculated from content attempts

---

### 7. Assessments & Grading

#### Exam Taking
**Features:**
- ✅ Start exam (learner)
- ✅ Submit exam answers
- ✅ Get exam results
- ✅ Check result status

**V1 Endpoints:**
- `POST /api/v1/learners/exams/:id/write`
- `GET /api/v1/exam-results`
- `GET /api/v1/exam-results/:id/check`

#### Grading
**Features:**
- ✅ Automatic grading (multiple choice, true/false)
- ✅ Manual grading support
- ✅ Grade publishing
- ✅ Feedback provision
- ✅ Score calculation (raw, percentage)
- ✅ Pass/fail determination

**Current State:**
- ExamResult model stores grades
- Publishing flag controls visibility

---

### 8. Analytics & Reporting

#### Staff Analytics
**Features:**
- ✅ Program-level analytics
  - Completion rate (windowed)
  - Abandonment rate (windowed)
  - Active learners count
  - Weekly enrollment trends
- ✅ Program level breakdown
  - Level-specific completion/abandonment
  - Active learners per level
  - Enrollment trends
- ✅ Detailed level analytics
  - Course breakdown
  - Learner list
- ✅ Department scoping
- ✅ Windowed metrics (configurable weeks)

**V1 Endpoints:**
- `GET /api/v1/staff/analytics/programs`
- `GET /api/v1/staff/analytics/programs/:programId/levels`
- `GET /api/v1/staff/analytics/programs/:programId/levels/:levelId`

#### SCORM Reports
**Features:**
- ✅ Package analytics
  - Total attempts
  - Completion rate
  - Average score
  - Average time
  - Learner breakdown
- ✅ Learner SCORM progress
  - All packages
  - Per-package attempts
  - Latest scores
  - Completion status
- ✅ Class SCORM progress
  - Assigned packages
  - Class-wide completion
  - Individual learner status
- ✅ Time series data
  - Attempt trends over time
  - Completion trends
- ✅ Export functionality (Excel/CSV)

**V1 Endpoints:**
- `GET /api/v1/content/scorm/reports/package/:id/analytics`
- `GET /api/v1/content/scorm/reports/learner/:id/progress`
- `GET /api/v1/content/scorm/reports/class/:id/progress`
- `GET /api/v1/content/scorm/reports/attempts/timeseries`
- `GET /api/v1/content/scorm/reports/export`
- `GET /api/v1/content/scorm/reports/department/:id/summary`
- `GET /api/v1/content/scorm/reports/instructor/:id/summary`
- `GET /api/v1/content/scorm/reports/package/:id/learner-details`

#### Course History
**Features:**
- ✅ Unified course history per learner
- ✅ Historical enrollments
- ✅ Current enrollments
- ✅ Progress tracking

**V1 Endpoints:**
- `GET /api/v1/learners/:id/course-history`

#### System Metrics
**Features:**
- ✅ System-wide metrics summary
- ✅ SCORM-specific metrics
- ✅ Health status
- ✅ Metrics reset (admin)

**V1 Endpoints:**
- `GET /api/v1/metrics`
- `GET /api/v1/content/scorm/health`
- `GET /api/v1/content/scorm/metrics`
- `POST /api/v1/content/scorm/metrics/reset`

---

### 9. System Administration

#### Settings Management
**Features:**
- ✅ Get platform settings
- ✅ Update settings
- ✅ Scoped settings (system/department/user)

**V1 Endpoints:**
- `GET /api/v1/settings`
- `PUT /api/v1/settings`

#### Permissions
**Features:**
- ✅ Permissions matrix
- ✅ Role-based permissions
- ✅ Resource-level permissions

**V1 Endpoints:**
- `GET /api/v1/permissions/matrix`

#### Lookup Lists
**Features:**
- ✅ Staff roles list
- ✅ Department memberships list

**V1 Endpoints:**
- `GET /api/v1/lists/staff-roles`
- `GET /api/v1/lists/department-memberships`

#### Health Checks
**Features:**
- ✅ API health status
- ✅ Database connectivity
- ✅ SCORM subsystem health

**V1 Endpoints:**
- `GET /api/v1/health`
- `GET /api/v1/content/scorm/health`

---

### 10. Department Resources (Legacy)

**Note:** These endpoints are deprecated in V1, being replaced by direct resource endpoints.

**Features:**
- Staff users by department
- Programs by department
- Courses by department
- SCORM packages by department
- Templates by department

**V1 Endpoints (Deprecated):**
- `GET /api/v1/department-resources/staffusers`
- `GET /api/v1/department-resources/programs`
- `POST /api/v1/department-resources/programs`
- `PATCH /api/v1/department-resources/programs/:id`
- `GET /api/v1/department-resources/courses`
- `POST /api/v1/department-resources/courses`
- `PATCH /api/v1/department-resources/courses/:id`

---

## V2 Design Principles

### 1. RESTful Resource-Based Design
- Resources as nouns: `/courses`, `/enrollments`, `/attempts`
- Standard HTTP methods: GET, POST, PUT, PATCH, DELETE
- Avoid nested routes beyond 2 levels
- Use action endpoints for non-CRUD: `POST /enrollments/:id/withdraw`

### 2. Separation of Concerns
- **Learner endpoints** - own data and learning activities
- **Staff endpoints** - content creation, grading, analytics
- **Admin endpoints** - system configuration, user management

### 3. Clean Architecture
```
Controllers  → Services → Repositories → Models
    ↓             ↓            ↓            ↓
Validation   Business    Data Access   Schema
& Error      Logic       & Queries     & Rules
Handling
```

### 4. Consistent Data Models
- Shared `_id` pattern (User/Staff/Learner/Admin)
- Embedded documents for bounded data
- References for relationships
- Soft delete pattern (`isDeleted`, `deletedAt`, `deletedBy`)
- Audit fields (`createdAt`, `updatedAt`, `createdBy`, `updatedBy`)

### 5. Terminology Standardization
- **SubProgram** (not ProgramLevel)
- **CourseModule** (not CourseContent)
- **Exercise** (broader than Exam)

### 6. Analytics First
- Track all learning events
- Time-series data for trend analysis
- Windowed metrics (configurable timeframes)
- Real-time progress updates
- Historical vs current state tracking

---

## Implementation Phases

### Phase 1: Foundation & Core Infrastructure (Weeks 1-2)

**Objectives:**
- Set up clean project structure
- Implement core authentication
- Database configuration
- Basic middleware
- Error handling
- Logging

**Deliverables:**

1. **Configuration** (`src/config/`)
   - `database.ts` - MongoDB connection with retry logic
   - `redis.ts` - Redis connection for caching
   - `environment.ts` - Environment variable validation
   - `swagger.ts` - API documentation setup
   - `logger.ts` - Winston logger configuration

2. **Core Middleware** (`src/middlewares/`)
   - `errorHandler.ts` - Global error handling
   - `authenticate.ts` - JWT verification
   - `authorize.ts` - Role/permission checking
   - `validate.ts` - Request validation (Joi)
   - `rateLimit.ts` - Rate limiting
   - `cors.ts` - CORS configuration
   - `helmet.ts` - Security headers
   - `sanitize.ts` - Input sanitization

3. **Utilities** (`src/utils/`)
   - `ApiError.ts` - Custom error classes
   - `ApiResponse.ts` - Standard response format
   - `asyncHandler.ts` - Async error wrapper
   - `jwt.ts` - Token generation/verification
   - `password.ts` - Hashing utilities
   - `pagination.ts` - Pagination helpers

4. **Types** (`src/types/`)
   - `express.d.ts` - Express type extensions
   - `auth.types.ts` - Auth-related interfaces
   - `common.types.ts` - Common shared types

5. **Models - Auth** (`src/models/auth/`)
   - `User.model.ts` - Base user model
   - `Staff.model.ts` - Staff extended model
   - `Learner.model.ts` - Learner extended model
   - `RefreshToken.model.ts` - Token storage
   - `TokenBlacklist.model.ts` - Revoked tokens

6. **Auth Services** (`src/services/auth/`)
   - `auth.service.ts` - Login, logout, refresh
   - `password.service.ts` - Password reset flow
   - `token.service.ts` - Token management

7. **Auth Controllers** (`src/controllers/auth/`)
   - `auth.controller.ts` - Auth endpoints
   - `password.controller.ts` - Password endpoints

8. **Auth Routes** (`src/routes/`)
   - `auth.routes.ts` - Authentication routes

9. **Validators** (`src/validators/`)
   - `auth.validator.ts` - Auth request validation

10. **Tests**
    - Unit tests for utilities
    - Integration tests for auth endpoints

**Success Criteria:**
- ✅ Authentication working (login, logout, refresh)
- ✅ JWT validation working
- ✅ Password reset flow complete
- ✅ Rate limiting functional
- ✅ Error handling consistent
- ✅ All tests passing

---

### Phase 2: Organization & Academic Structure (Weeks 3-4)

**Objectives:**
- Department hierarchy
- Program/SubProgram/Course/Class models
- Academic calendar
- Basic CRUD operations
- Department scoping

**Deliverables:**

1. **Models - Organization** (`src/models/organization/`)
   - `Department.model.ts`

2. **Models - Academic** (`src/models/academic/`)
   - `Program.model.ts`
   - `SubProgram.model.ts`
   - `Course.model.ts`
   - `CourseModule.model.ts`
   - `Class.model.ts`
   - `AcademicYear.model.ts`
   - `AcademicTerm.model.ts`
   - `YearGroup.model.ts`
   - `Credential.model.ts`

3. **Services**
   - `departments/department.service.ts`
   - `programs/program.service.ts`
   - `programs/subprogram.service.ts`
   - `courses/course.service.ts`
   - `courses/courseModule.service.ts`
   - `courses/class.service.ts`

4. **Controllers**
   - `departments/department.controller.ts`
   - `programs/program.controller.ts`
   - `programs/subprogram.controller.ts`
   - `courses/course.controller.ts`
   - `courses/courseModule.controller.ts`
   - `courses/class.controller.ts`

5. **Routes**
   - `departments.routes.ts`
   - `programs.routes.ts`
   - `courses.routes.ts`
   - `classes.routes.ts`
   - `calendar.routes.ts`

6. **Validators**
   - `department.validator.ts`
   - `program.validator.ts`
   - `course.validator.ts`

7. **Middleware**
   - `departmentScope.middleware.ts` - Filter by user's departments

**Success Criteria:**
- ✅ Department hierarchy working
- ✅ Programs/SubPrograms CRUD complete
- ✅ Courses/Modules CRUD complete
- ✅ Classes CRUD complete
- ✅ Academic calendar functional
- ✅ Department scoping enforced

---

### Phase 3: Content Management (Weeks 5-7)

**Objectives:**
- SCORM package management
- Exercise/Question system
- Media management
- Template system
- File upload handling

**Deliverables:**

1. **Models - Content** (`src/models/content/`)
   - `ScormPackage.model.ts`
   - `Exercise.model.ts`
   - `Question.model.ts`
   - `Media.model.ts`
   - `CourseTemplate.model.ts`

2. **Services**
   - `content/scormPackage.service.ts`
   - `content/exercise.service.ts`
   - `content/question.service.ts`
   - `content/media.service.ts`
   - `content/template.service.ts`
   - `scorm/parser.service.ts` - Parse SCORM manifest
   - `scorm/storage.service.ts` - File storage (S3/local)

3. **Controllers**
   - `content/scormPackage.controller.ts`
   - `content/exercise.controller.ts`
   - `content/question.controller.ts`
   - `content/media.controller.ts`
   - `content/template.controller.ts`

4. **Routes**
   - `scorm/packages.routes.ts`
   - `exercises.routes.ts`
   - `media.routes.ts`
   - `templates.routes.ts`

5. **Utilities**
   - `scormParser.ts` - XML manifest parsing
   - `fileUpload.ts` - Multer configuration
   - `zipExtractor.ts` - SCORM package extraction

**Success Criteria:**
- ✅ SCORM upload/parse/store working
- ✅ Exercise creation with questions
- ✅ Media upload working
- ✅ Template system functional
- ✅ File serving secure

---

### Phase 4: Enrollment System (Weeks 8-9)

**Objectives:**
- Program/Course/Class enrollments
- Batch enrollment
- Status management
- Withdrawal/completion flows

**Deliverables:**

1. **Models - Enrollment** (`src/models/enrollment/`)
   - `ProgramEnrollment.model.ts`
   - `CourseEnrollment.model.ts`
   - `ClassEnrollment.model.ts`

2. **Services**
   - `enrollments/programEnrollment.service.ts`
   - `enrollments/courseEnrollment.service.ts`
   - `enrollments/classEnrollment.service.ts`
   - `enrollments/batch.service.ts` - Batch operations

3. **Controllers**
   - `enrollments/programEnrollment.controller.ts`
   - `enrollments/courseEnrollment.controller.ts`
   - `enrollments/classEnrollment.controller.ts`

4. **Routes**
   - `enrollments.routes.ts` (unified enrollment endpoints)

5. **Validators**
   - `enrollment.validator.ts`

**Success Criteria:**
- ✅ Program enrollment working
- ✅ Course enrollment working
- ✅ Class enrollment working
- ✅ Batch enrollment functional
- ✅ Status transitions validated
- ✅ Withdrawal flow complete

---

### Phase 5: Learning Activity & SCORM Runtime (Weeks 10-12)

**Objectives:**
- SCORM player integration
- SCORM runtime API (1.2 & 2004)
- Content attempt tracking
- Progress calculation
- Time tracking

**Deliverables:**

1. **Models - Activity** (`src/models/activity/`)
   - `ContentAttempt.model.ts`
   - `ScormAttempt.model.ts`
   - `ExamResult.model.ts`
   - `LearningEvent.model.ts`

2. **Services**
   - `scorm/runtime.service.ts` - SCORM API logic
   - `scorm/player.service.ts` - Player launch
   - `scorm/attempt.service.ts` - Attempt management
   - `scorm/cmi.service.ts` - CMI data handling
   - `activity/contentAttempt.service.ts`
   - `activity/progress.service.ts` - Progress calculation

3. **Controllers**
   - `scorm/player.controller.ts`
   - `scorm/runtime.controller.ts`
   - `scorm/attempt.controller.ts`
   - `activity/progress.controller.ts`

4. **Routes**
   - `scorm/player.routes.ts`
   - `scorm/runtime.routes.ts`
   - `scorm/attempts.routes.ts`
   - `progress.routes.ts`

5. **Utilities**
   - `scormRuntime.ts` - SCORM 1.2/2004 compliance
   - `cmiValidator.ts` - CMI data validation
   - `progressCalculator.ts`

6. **Public Files**
   - `public/scorm/player.html` - SCORM player UI
   - `public/scorm/api.js` - SCORM API adapter

**Success Criteria:**
- ✅ SCORM player launches correctly
- ✅ SCORM 1.2 runtime working
- ✅ SCORM 2004 runtime working
- ✅ CMI data persists correctly
- ✅ Attempts track time/score
- ✅ Progress updates in real-time

---

### Phase 6: Assessments & Grading (Weeks 13-14)

**Objectives:**
- Exam taking flow
- Automatic grading
- Manual grading support
- Result publishing
- Feedback system

**Deliverables:**

1. **Services**
   - `assessments/exam.service.ts`
   - `assessments/grading.service.ts`
   - `assessments/submission.service.ts`

2. **Controllers**
   - `assessments/exam.controller.ts`
   - `assessments/grading.controller.ts`

3. **Routes**
   - `assessments.routes.ts`

4. **Utilities**
   - `autoGrader.ts` - Automatic grading logic
   - `scoreCalculator.ts`

**Success Criteria:**
- ✅ Learners can take exams
- ✅ Automatic grading works
- ✅ Manual grading supported
- ✅ Results publish correctly
- ✅ Feedback displays properly

---

### Phase 7: Analytics & Reporting (Weeks 15-17)

**Objectives:**
- Staff analytics dashboard
- Learner analytics
- SCORM reporting
- Course analytics
- Export functionality

**Deliverables:**

1. **Models - System** (`src/models/system/`)
   - `Report.model.ts`
   - `AuditLog.model.ts`

2. **Services**
   - `analytics/program.analytics.service.ts`
   - `analytics/course.analytics.service.ts`
   - `analytics/scorm.analytics.service.ts`
   - `analytics/learner.analytics.service.ts`
   - `reports/generator.service.ts`
   - `reports/export.service.ts` - Excel/CSV export

3. **Controllers**
   - `analytics/staff.analytics.controller.ts`
   - `analytics/learner.analytics.controller.ts`
   - `reports/report.controller.ts`

4. **Routes**
   - `analytics.routes.ts`
   - `reports.routes.ts`

5. **Utilities**
   - `metricsCalculator.ts` - Windowed metrics
   - `trendAnalyzer.ts` - Time-series analysis
   - `excelExporter.ts` - Excel generation

**Success Criteria:**
- ✅ Program analytics working
- ✅ Course analytics working
- ✅ SCORM reports accurate
- ✅ Learner progress visible
- ✅ Export functionality works
- ✅ Windowed metrics correct

---

### Phase 8: System Administration (Weeks 18-19)

**Objectives:**
- Settings management
- Permissions system
- Audit logging
- Health monitoring
- System metrics

**Deliverables:**

1. **Models - System** (continued)
   - `Setting.model.ts`
   - `Permission.model.ts`
   - `RolePermission.model.ts`

2. **Services**
   - `system/settings.service.ts`
   - `system/permissions.service.ts`
   - `system/audit.service.ts`
   - `system/health.service.ts`

3. **Controllers**
   - `system/settings.controller.ts`
   - `system/permissions.controller.ts`
   - `system/health.controller.ts`

4. **Routes**
   - `settings.routes.ts`
   - `permissions.routes.ts`
   - `health.routes.ts`

5. **Middleware**
   - `auditLog.middleware.ts` - Auto-log changes
   - `permissions.middleware.ts` - Permission checking

**Success Criteria:**
- ✅ Settings CRUD working
- ✅ Permissions matrix accurate
- ✅ Audit logs capture changes
- ✅ Health checks functional
- ✅ Metrics dashboard ready

---

### Phase 9: Testing & Optimization (Weeks 20-21)

**Objectives:**
- Comprehensive test coverage
- Performance optimization
- Load testing
- Security hardening

**Deliverables:**

1. **Unit Tests** (`tests/unit/`)
   - Test all services
   - Test all utilities
   - Mock dependencies

2. **Integration Tests** (`tests/integration/`)
   - Test all API endpoints
   - Test authentication flows
   - Test enrollment flows
   - Test SCORM flows

3. **Performance**
   - Database query optimization
   - Index analysis
   - Caching strategy (Redis)
   - Response time optimization

4. **Security**
   - Security audit
   - Dependency updates
   - OWASP compliance check
   - Penetration testing

**Success Criteria:**
- ✅ >80% code coverage
- ✅ All integration tests pass
- ✅ API response <200ms (p95)
- ✅ No critical security issues
- ✅ Load test: 100 concurrent users

---

### Phase 10: Documentation & Migration (Weeks 22-24)

**Objectives:**
- Complete API documentation
- Migration scripts
- Data migration from V1
- Deployment guide

**Deliverables:**

1. **Documentation**
   - API documentation (Swagger)
   - Developer guide
   - Deployment guide
   - Migration guide

2. **Migration Scripts** (`src/migrations/`)
   - `01-migrate-users.ts`
   - `02-migrate-departments.ts`
   - `03-migrate-programs.ts`
   - `04-migrate-courses.ts`
   - `05-migrate-content.ts`
   - `06-migrate-enrollments.ts`
   - `07-migrate-attempts.ts`

3. **Deployment**
   - Docker configuration
   - CI/CD pipeline
   - Environment setup
   - Monitoring setup

**Success Criteria:**
- ✅ Swagger docs complete
- ✅ Migration scripts tested
- ✅ V1 data migrated successfully
- ✅ Deployment automated
- ✅ Monitoring operational

---

## Feature Mapping V1 → V2

### Authentication
| V1 Endpoint | V2 Endpoint | Notes |
|-------------|-------------|-------|
| `POST /staff/admins/register` | `POST /api/v2/auth/register` | Unified registration |
| `POST /staff/admins/login` | `POST /api/v2/auth/login` | Role in request body |
| `POST /staff/login` | `POST /api/v2/auth/login` | Same endpoint |
| `POST /learners/login` | `POST /api/v2/auth/login` | Same endpoint |
| `GET /staff/admins/profile` | `GET /api/v2/users/me` | Unified profile |
| `GET /staff/profile` | `GET /api/v2/users/me` | Same endpoint |
| `GET /learners/profile` | `GET /api/v2/users/me` | Same endpoint |
| `POST /auth/refresh` | `POST /api/v2/auth/refresh` | No change |
| `POST /auth/logout` | `POST /api/v2/auth/logout` | No change |

### Departments
| V1 Endpoint | V2 Endpoint | Notes |
|-------------|-------------|-------|
| `GET /departments` | `GET /api/v2/departments` | No change |
| `POST /departments` | `POST /api/v2/departments` | No change |
| `GET /departments/:id` | `GET /api/v2/departments/:id` | No change |
| `PUT /departments/:id` | `PUT /api/v2/departments/:id` | No change |
| `GET /departments/hierarchy` | `GET /api/v2/departments/tree` | Renamed for clarity |

### Programs
| V1 Endpoint | V2 Endpoint | Notes |
|-------------|-------------|-------|
| `GET /programs` | `GET /api/v2/programs` | No change |
| `POST /programs` | `POST /api/v2/programs` | No change |
| `GET /programs/:id` | `GET /api/v2/programs/:id` | No change |
| `PUT /programs/:id` | `PUT /api/v2/programs/:id` | No change |
| `PATCH /programs/:id/activate` | `PATCH /api/v2/programs/:id/status` | Generalized |
| `PATCH /programs/:id/archive` | `PATCH /api/v2/programs/:id/status` | Same endpoint |

### Program Levels → SubPrograms
| V1 Endpoint | V2 Endpoint | Notes |
|-------------|-------------|-------|
| `GET /program-levels` | `GET /api/v2/programs/:programId/subprograms` | Nested resource |
| `POST /program-levels` | `POST /api/v2/programs/:programId/subprograms` | Nested resource |
| `GET /program-levels/:id` | `GET /api/v2/subprograms/:id` | Direct access |
| `PUT /program-levels/:id` | `PUT /api/v2/subprograms/:id` | Direct access |

### Courses
| V1 Endpoint | V2 Endpoint | Notes |
|-------------|-------------|-------|
| `GET /courses` | `GET /api/v2/courses` | Add advanced filters |
| `POST /courses` | `POST /api/v2/courses` | No change |
| `GET /courses/:id` | `GET /api/v2/courses/:id` | No change |
| `PUT /courses/:id` | `PUT /api/v2/courses/:id` | No change |

### Course Content → Course Modules
| V1 Endpoint | V2 Endpoint | Notes |
|-------------|-------------|-------|
| `GET /course-contents` | `GET /api/v2/courses/:courseId/modules` | Nested resource |
| `POST /course-contents` | `POST /api/v2/courses/:courseId/modules` | Nested resource |
| `GET /course-contents/:id` | `GET /api/v2/modules/:id` | Direct access |
| `PUT /course-contents/:id` | `PUT /api/v2/modules/:id` | Direct access |

### Enrollments
| V1 Endpoint | V2 Endpoint | Notes |
|-------------|-------------|-------|
| `POST /program-enrollments` | `POST /api/v2/enrollments/programs` | Grouped by type |
| `POST /course-enrollments` | `POST /api/v2/enrollments/courses` | Grouped by type |
| `POST /class-enrollments` | `POST /api/v2/enrollments/classes` | Grouped by type |
| `POST /.../batch` | `POST /api/v2/enrollments/batch` | Unified batch endpoint |

### SCORM
| V1 Endpoint | V2 Endpoint | Notes |
|-------------|-------------|-------|
| `POST /content/scorm/packages` | `POST /api/v2/scorm/packages` | Simplified path |
| `GET /content/scorm/packages` | `GET /api/v2/scorm/packages` | Simplified path |
| `GET /content/scorm/player/:id/launch` | `GET /api/v2/scorm/player/:id` | Simplified |
| `POST /content/scorm/runtime/:id/initialize` | `POST /api/v2/scorm/sessions/:id/init` | Clearer naming |
| `PUT /content/scorm/runtime/:id/value/:element` | `PUT /api/v2/scorm/sessions/:id/cmi` | Simplified |

### Analytics
| V1 Endpoint | V2 Endpoint | Notes |
|-------------|-------------|-------|
| `GET /staff/analytics/programs` | `GET /api/v2/analytics/programs` | Simplified path |
| `GET /content/scorm/reports/...` | `GET /api/v2/analytics/scorm/...` | Grouped under analytics |

---

## Analytics Requirements

### For Learners

**Dashboard Metrics:**
1. **Overall Progress**
   - Total courses enrolled
   - Courses in progress
   - Courses completed
   - Overall completion percentage
   - Time spent learning (total)

2. **Current Activity**
   - Current course
   - Current module
   - Time remaining estimate
   - Recent activity feed

3. **Performance**
   - Average scores
   - Recent exam results
   - Trending performance (improving/declining)
   - Badges/achievements earned

4. **Content Breakdown**
   - SCORM packages attempted
   - Exercises completed
   - Videos watched
   - Documents viewed

5. **Time Analytics**
   - Daily/weekly time spent
   - Time by course
   - Time by content type
   - Most active times of day

**API Endpoints:**
```
GET /api/v2/analytics/learners/me/dashboard
GET /api/v2/analytics/learners/me/progress
GET /api/v2/analytics/learners/me/performance
GET /api/v2/analytics/learners/me/activity
GET /api/v2/analytics/learners/me/time-breakdown
```

---

### For Staff (Instructors)

**Course Creation Analytics:**
1. **Content Usage Patterns**
   - Most viewed content
   - Highest completion rates
   - Content with highest scores
   - Content causing abandonment
   - Average time per content piece
   - Replay rates (re-attempts)

2. **Learner Behavior Patterns**
   - Peak activity times
   - Content sequence analysis (where do learners go next?)
   - Drop-off points (where do learners quit?)
   - Help requests by module
   - Question difficulty analysis

3. **Historical Trends**
   - Content performance over time
   - Seasonal patterns
   - Cohort comparisons (year-over-year)
   - A/B testing results (if applicable)

4. **Recommendations Engine**
   - Suggest optimal content order based on success patterns
   - Identify content needing revision
   - Recommend prerequisites based on correlation
   - Suggest difficulty adjustments

**API Endpoints:**
```
GET /api/v2/analytics/staff/content/:id/usage
GET /api/v2/analytics/staff/content/:id/behavior-patterns
GET /api/v2/analytics/staff/content/:id/trends
GET /api/v2/analytics/staff/courses/:id/recommendations
GET /api/v2/analytics/staff/courses/:id/heatmap
```

---

### For Staff (Department Admins)

**Department Analytics:**
1. **Department Overview**
   - Total programs
   - Total courses
   - Total learners
   - Active enrollments
   - Completion rates
   - Resource utilization

2. **Staff Performance**
   - Instructor course load
   - Student satisfaction (if surveys exist)
   - Grading turnaround time
   - Content creation activity

3. **Resource Planning**
   - Capacity utilization
   - Popular programs/courses
   - Underutilized resources
   - Growth trends

**API Endpoints:**
```
GET /api/v2/analytics/departments/:id/overview
GET /api/v2/analytics/departments/:id/staff-performance
GET /api/v2/analytics/departments/:id/resource-planning
```

---

### For System Admins

**Platform Analytics:**
1. **System Health**
   - API response times
   - Error rates
   - Database performance
   - Storage usage
   - Concurrent users

2. **Usage Statistics**
   - Total users by role
   - Active users (daily/weekly/monthly)
   - Content uploads
   - API calls per endpoint
   - Feature adoption rates

3. **Security Metrics**
   - Failed login attempts
   - Password reset frequency
   - Token refresh patterns
   - Suspicious activity

**API Endpoints:**
```
GET /api/v2/analytics/system/health
GET /api/v2/analytics/system/usage
GET /api/v2/analytics/system/security
```

---

## Migration Strategy

### Data Migration Approach

1. **Dual-Write Period** (Optional)
   - Run V1 and V2 simultaneously
   - Write to both databases
   - Compare data consistency

2. **One-Time Migration**
   - Export from V1
   - Transform data
   - Import to V2
   - Validate integrity

3. **Terminology Mapping**
   ```
   V1               →  V2
   ─────────────────────────────
   ProgramLevel     →  SubProgram
   CourseContent    →  CourseModule
   Exam             →  Exercise (type=exam)
   CustomContent    →  Exercise (type=quiz/assignment)
   ```

4. **Validation Steps**
   - Row count verification
   - Checksum comparison
   - Sample data review
   - Foreign key integrity
   - Index verification

---

## Success Criteria

### Functional Requirements
- ✅ 100% feature parity with V1
- ✅ All V1 endpoints have V2 equivalents
- ✅ SCORM 1.2 & 2004 fully compliant
- ✅ Analytics dashboards functional

### Non-Functional Requirements
- ✅ API response time <200ms (p95)
- ✅ Support 100+ concurrent users
- ✅ >80% test coverage
- ✅ Zero critical security issues
- ✅ <1% error rate

### Code Quality
- ✅ TypeScript strict mode enabled
- ✅ ESLint passing
- ✅ Prettier formatted
- ✅ No deprecated dependencies

### Documentation
- ✅ Swagger docs complete
- ✅ README comprehensive
- ✅ Migration guide available
- ✅ Deployment guide ready

---

## Open Questions (See V2_Implementation_Questions.md)

Refer to the companion questions document for items needing clarification before/during implementation.

---

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Foundation | 2 weeks | Auth + infrastructure |
| 2. Academic Structure | 2 weeks | Departments, Programs, Courses |
| 3. Content Management | 3 weeks | SCORM, Exercises, Media |
| 4. Enrollment | 2 weeks | All enrollment types |
| 5. Learning Activity | 3 weeks | SCORM runtime, attempts |
| 6. Assessments | 2 weeks | Exams, grading |
| 7. Analytics | 3 weeks | All analytics dashboards |
| 8. System Admin | 2 weeks | Settings, permissions |
| 9. Testing | 2 weeks | Tests, optimization |
| 10. Documentation | 3 weeks | Docs, migration |
| **Total** | **24 weeks** | **Full V2 implementation** |

---

**Next Steps:**
1. Review this implementation plan
2. Answer questions in `V2_Implementation_Questions.md`
3. Approve/revise plan
4. Begin Phase 1 implementation
