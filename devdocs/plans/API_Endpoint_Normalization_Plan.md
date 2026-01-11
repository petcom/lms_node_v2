# API Endpoint Normalization Plan

> **Created:** 2026-01-07  
> **Status:** Proposed  
> **Priority:** High

## Executive Summary

This document outlines a plan to normalize and consolidate duplicate course and content management endpoints across `/courses`, `/course-contents`, `/content`, and `/department-resources` routes. The current architecture has:

- **3 different endpoints** for managing courses
- **Inconsistent permission models** (some global-admin only, some staff-accessible)
- **Duplicate functionality** across multiple route families
- **Confusion about which endpoints to use** for course building

## Guiding Principles

### 1. **Separation of Concerns**

- **`/courses` & `/course-contents`** → Course structure and curriculum management
- **`/content/*`** → Content delivery, progress tracking, and learner-facing operations
- **`/department-resources/*`** → Administrative and organizational operations (staff, departments, resource reassignment)

### 2. **Role-Based Access Control**

All endpoints should respect department-level staff roles:

| Role | Read | Create/Update | Delete | Move Between Depts |
|------|------|---------------|--------|-------------------|
| `instructor` | ✅ Own dept | ❌ | ❌ | ❌ |
| `content-admin` | ✅ Own dept | ✅ Own dept | ⚠️ Own content | ❌ |
| `department-admin` | ✅ Own dept | ✅ Own dept | ✅ Own dept | ⚠️ Within hierarchy |
| `global-admin` | ✅ All | ✅ All | ✅ All | ✅ All |

### 3. **Department Scoping**

All endpoints use `departmentScope()` middleware to automatically filter by user's accessible departments.

---

## Current State Analysis

### **Problem 1: Course Management Duplication**

| Endpoint | Purpose | Access | Status |
|----------|---------|--------|--------|
| `GET /courses` | List courses | ✅ Staff | ✅ Keep |
| `GET /courses/:id` | Get course | ✅ Staff | ✅ Keep |
| `POST/PUT /courses` | Create/update | ❌ Global-admin | 🔧 Fix permissions |
| `GET /content/courses/:id` | Get course | ❌ Global-admin | ❌ Remove (duplicate) |
| `PATCH /content/courses/:id` | Update course | ❌ Global-admin | ❌ Remove (duplicate) |
| `POST /department-resources/courses` | Create course | ❌ Global-admin | ✅ Already deprecated |
| `PATCH /department-resources/courses/:id` | Update course | ❌ Global-admin | ✅ Already deprecated |

### **Problem 2: Course Content/Segments Duplication**

| Endpoint | Purpose | Access | Status |
|----------|---------|--------|--------|
| `GET /course-contents` | List segments | ✅ Staff | ✅ Keep |
| `GET /course-contents/:id` | Get segment | ✅ Staff | ✅ Keep |
| `POST/PUT /course-contents` | Create/update | ❌ Global-admin | 🔧 Fix permissions |
| `GET /content/` | List all content | ❌ Global-admin | 🔧 Fix (different purpose) |
| `POST /content/custom` | Create custom content | ❌ Global-admin | 🔧 Fix permissions |

### **Problem 3: Missing Capabilities**

**Course Rendering** - Only in `/content`:
- `GET /content/courses/:id/render` - ❌ Global-admin only
- `POST /content/courses/:id/render` - ❌ Global-admin only

**Progress Tracking** - Only in `/content`:
- `POST /content/custom/:id/progress` - ✅ All authenticated
- `GET /content/:id/attempts` - ❌ Global-admin only
- `GET /content/reports` - ❌ Global-admin only
- `GET /content/reports/learner/:learnerId` - ✅ Staff + Learner

**Administrative Operations** - Only in `/department-resources`:
- `PATCH /department-resources/courses/:id/department` - ❌ Global-admin only
- `PATCH /department-resources/courses/:id/program` - ❌ Global-admin only
- `PATCH /department-resources/staffusers/:id/role` - ❌ Global-admin only

---

## Normalized Architecture

### **Route Family: `/api/v1/courses` (Academic Routes)**

**Purpose:** Course structure and curriculum management

#### **Course CRUD Operations**

```
GET    /courses              - List courses in accessible departments
GET    /courses/:id          - Get course details
POST   /courses              - Create new course
PUT    /courses/:id          - Update course
PATCH  /courses/:id          - Partial update course
DELETE /courses/:id          - Delete course
```

**Permissions:**
- **Read (GET):** `instructor`, `content-admin`, `department-admin`, `global-admin`
- **Write (POST/PUT/PATCH):** `content-admin`, `department-admin`, `global-admin` (in accessible depts)
- **Delete:** `department-admin`, `global-admin` (in accessible depts)

#### **Course Status Management**

```
PATCH  /courses/:id/archive    - Archive course
PATCH  /courses/:id/unarchive  - Unarchive course
POST   /courses/:id/publish    - Publish course
POST   /courses/:id/unpublish  - Unpublish course
```

**Permissions:** `content-admin`, `department-admin`, `global-admin`

#### **Course Rendering (MOVE from /content)**

```
GET    /courses/:id/render        - Get rendered course HTML
POST   /courses/:id/render        - Force re-render course
```

**Permissions:** `instructor`, `content-admin`, `department-admin`, `global-admin`

---

### **Route Family: `/api/v1/course-contents` (Academic Routes)**

**Purpose:** Course segment/content management

#### **CourseContent CRUD Operations**

```
GET    /course-contents            - List course contents/segments
GET    /course-contents/:id        - Get segment details
POST   /course-contents            - Create new segment
PUT    /course-contents/:id        - Update segment
DELETE /course-contents/:id        - Delete segment
```

**Permissions:**
- **Read (GET):** `instructor`, `content-admin`, `department-admin`, `global-admin`
- **Write (POST/PUT):** `content-admin`, `department-admin`, `global-admin` (in accessible depts)
- **Delete:** `content-admin`, `department-admin`, `global-admin` (in accessible depts)

**Query Parameters:**
- `course` - Filter by course ID (required for listing)
- `contentType` - Filter by type (scorm/custom)

---

### **Route Family: `/api/v1/content` (Content Routes)**

**Purpose:** Content delivery, progress tracking, learner-facing operations

#### **Content Catalog (Read-Only for Learners)**

```
GET    /content/                   - List available content items (for learners)
GET    /content/:id                - Get content item details
```

**Permissions:** `learner`, `instructor`, `content-admin`, `department-admin`, `global-admin`

#### **Custom Content Management**

```
POST   /content/custom             - Create custom content (exam, quiz, exercise)
PATCH  /content/custom/:id         - Update custom content
DELETE /content/custom/:id         - Delete custom content
```

**Permissions:**
- **Create/Update:** `content-admin`, `department-admin`, `global-admin` (in accessible depts)
- **Delete:** `content-admin`, `department-admin`, `global-admin` (in accessible depts)

#### **Progress Tracking & Reports**

```
POST   /content/custom/:id/progress           - Record custom content progress
GET    /content/:id/attempts                  - List attempts for content
GET    /content/reports                       - List all progress reports
GET    /content/reports/learner/:learnerId    - Get learner progress report
```

**Permissions:**
- **Progress (POST):** `learner` (own progress only), `instructor`, `staff`, `global-admin`
- **Attempts (GET):** `instructor`, `content-admin`, `department-admin`, `global-admin` (dept-scoped)
- **Reports (GET):** `instructor`, `content-admin`, `department-admin`, `global-admin` (dept-scoped)
- **Learner Report (GET):** `learner` (self only), `instructor`, `staff`, `global-admin` (dept-scoped)

---

### **Route Family: `/api/v1/department-resources` (Admin Routes)**

**Purpose:** Administrative and organizational operations

#### **Staff Management**

```
GET    /department-resources/staffusers                 - List staff in departments
PATCH  /department-resources/staffusers/:id/role        - Update staff roles
PATCH  /department-resources/staffusers/:id/department  - Update staff department assignments
```

**Permissions:**
- **List (GET):** `staff`, `global-admin` (dept-scoped) ✅ Already fixed
- **Update Roles:** `department-admin`, `global-admin` (dept-scoped)
- **Update Department:** `global-admin` only (cross-department operation)

#### **Content Library View**

```
GET    /department-resources/content          - List all content in departments (unified view)
```

**Permissions:** `staff`, `global-admin` (dept-scoped) ✅ Already fixed

**Purpose:** Provides unified view of SCORM + Custom content in accessible departments for content discovery.

#### **Resource Reassignment**

```
PATCH  /department-resources/courses/:id/department     - Move course to different department
PATCH  /department-resources/courses/:id/program        - Move course to different program
PATCH  /department-resources/programs/:id/department    - Move program to different department
```

**Permissions:**
- **Move within hierarchy:** `department-admin` (if both depts in scope)
- **Move across hierarchy:** `global-admin` only

#### **Department Hierarchy**

```
GET    /department-resources/departments       - List department hierarchy
PATCH  /department-resources/departments/:id   - Update department
```

**Permissions:**
- **List:** `department-admin`, `global-admin` (dept-scoped)
- **Update:** `global-admin` only

---

## Implementation Plan

### **Phase 1: Permission Updates (High Priority)**

#### 1.1 Update `/api/v1/courses` Write Permissions

**File:** `routes/academics/course.ts`

**Changes:**
```typescript
// Current: roleRestriction('global-admin')
// New: roleRestriction('global-admin', 'staff') + requireStaffRole check

// For POST /courses
.post(
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin', 'staff'), // Allow staff
  requireStaffRole('content-admin', 'department-admin'), // But only these roles
  validate(createCourseValidation),
  createCourse
)

// For PUT/PATCH /courses/:id
.put(
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin', 'staff'),
  requireStaffRole('content-admin', 'department-admin'),
  validate(updateCourseValidation),
  updateCourse
)

// For DELETE /courses/:id
.delete(
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin', 'staff'),
  requireStaffRole('department-admin'), // More restrictive
  validate(idParam),
  deleteCourse
)
```

#### 1.2 Update `/api/v1/course-contents` Write Permissions

**File:** `routes/academics/courseContent.ts`

**Changes:**
```typescript
// For POST /course-contents
.post(
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin', 'staff'),
  requireStaffRole('content-admin', 'department-admin'),
  validate(createCourseContentValidation),
  createCourseContent
)

// For PUT /course-contents/:id
.put(
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin', 'staff'),
  requireStaffRole('content-admin', 'department-admin'),
  validate(updateCourseContentValidation),
  updateCourseContent
)

// For DELETE /course-contents/:id
.delete(
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin', 'staff'),
  requireStaffRole('content-admin', 'department-admin'),
  validate(idParam),
  deleteCourseContent
)
```

#### 1.3 Update `/api/v1/content/*` Read Permissions

**File:** `routes/content/contentRouter.ts`

**Changes:**
```typescript
// For GET /content/ (unified catalog)
contentRouter.get(
  '/',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin', 'staff', 'learner'), // Open to all authenticated
  validate(contentListQuery),
  listContent
);

// For POST /content/custom
contentRouter.post(
  '/custom',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin', 'staff'),
  requireStaffRole('content-admin', 'department-admin'),
  validate(customContentCreate),
  createCustomContent
);

// For PATCH /content/custom/:id
contentRouter.patch(
  '/custom/:id',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin', 'staff'),
  requireStaffRole('content-admin', 'department-admin'),
  validate(customContentUpdate),
  updateCustomContent
);

// For GET /content/:id/attempts
contentRouter.get(
  '/:id/attempts',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin', 'staff'), // Allow all staff
  validate(contentIdParam),
  listAttempts
);

// For GET /content/reports
contentRouter.get(
  '/reports',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin', 'staff'), // Allow all staff
  validate(reportsQuery),
  listReports
);
```

---

### **Phase 2: Middleware Enhancement**

#### 2.1 Create `requireStaffRole` Middleware

**File:** `middlewares/roleRestriction.ts` (Already exists!)

**Verify implementation:**
```typescript
export const requireStaffRole = (requiredStaffRole: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.userAuth) {
      return next(new AuthenticationError('Authentication required'));
    }

    // Global admins bypass staff role checks
    const userRoles = req.userAuth.roles || [req.userAuth.role];
    if (userRoles.includes('global-admin')) {
      return next();
    }

    // Check staffRoles array
    const staffRoles = req.userAuth.staffRoles || [];
    if (!staffRoles.includes(requiredStaffRole)) {
      return next(new AuthorizationError(`Access denied. Required staff role: ${requiredStaffRole}`));
    }

    next();
  };
};
```

**Enhancement needed:** Support multiple required roles (OR logic)

```typescript
export const requireStaffRole = (...requiredStaffRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.userAuth) {
      return next(new AuthenticationError('Authentication required'));
    }

    // Global admins bypass staff role checks
    const userRoles = req.userAuth.roles || [req.userAuth.role];
    if (userRoles.includes('global-admin')) {
      return next();
    }

    // Check if user has ANY of the required staff roles
    const staffRoles = req.userAuth.staffRoles || [];
    const hasRequiredRole = requiredStaffRoles.some(role => staffRoles.includes(role));
    
    if (!hasRequiredRole) {
      return next(new AuthorizationError(`Access denied. Required staff role(s): ${requiredStaffRoles.join(', ')}`));
    }

    next();
  };
};
```

#### 2.2 Enhance Department Scope for Department-Level Roles

**File:** `middlewares/departmentScope.ts`

**Current:** Uses `req.userAuth.departmentMemberships` to determine scope

**Enhancement needed:** Load department-specific roles from `departmentMemberships`:

```typescript
// Add to req.departmentScope
req.departmentScope = {
  userDepartmentId,
  accessibleDepartmentIds: Array.from(accessible),
  departmentRoles: new Map(), // Map<departmentId, roles[]>
};

// Populate department roles
staff.departmentMemberships?.forEach(membership => {
  req.departmentScope.departmentRoles.set(
    membership.departmentId.toString(),
    membership.roles
  );
});
```

This allows controllers to check: "Does user have `content-admin` role in THIS specific department?"

---

### **Phase 3: Move Course Rendering**

#### 3.1 Move Rendering Endpoints from `/content` to `/courses`

**Source:** `routes/content/contentRouter.ts`  
**Destination:** `routes/academics/course.ts`

**Add to course router:**
```typescript
courseRouter.get(
  '/:id/render',
  isAuthenticated(),
  departmentScope(),
  isInstructorOrAdmin,
  validate(idParam),
  renderCourse
);

courseRouter.post(
  '/:id/render',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin', 'staff'),
  requireStaffRole('content-admin', 'department-admin'),
  validate(idParam),
  forceRenderCourse
);
```

**Update controller imports:**
- Move `renderCourse` and `forceRenderCourse` from `controller/content/contentCtrl` to `controller/academics/courseCtrl`
- OR keep in content controller and import in course routes

---

### **Phase 4: Deprecate Duplicates**

#### 4.1 Add Deprecation Warnings

**Files to update:**
- `routes/content/contentRouter.ts` - `/courses/:id` endpoints
- `routes/departmentResources/departmentResourcesRouter.ts` - course/program endpoints

**Pattern:**
```typescript
import { deprecatedEndpoint } from '../../middlewares/deprecation';

// Example for /content/courses/:id
contentRouter.get(
  '/courses/:id',
  deprecatedEndpoint('/api/v1/courses/:id', '2026-06-01'),
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(courseIdParam),
  getCourse
);
```

#### 4.2 Update Documentation

Mark as deprecated in:
- `lms_node_devdocs/Content-api-contract.md`
- `lms_node_devdocs/System-api-contract.md`

#### 4.3 Sunset Timeline

- **2026-01-07:** Add deprecation warnings
- **2026-03-01:** Send notice to API consumers
- **2026-06-01:** Remove deprecated endpoints

---

### **Phase 5: Documentation Updates**

#### 5.1 Update API Contracts

**Files to update:**
- `Academic-api-contract.md` - Add rendering endpoints, update permissions
- `Content-api-contract.md` - Update permissions, mark duplicates as deprecated
- `System-api-contract.md` - Update department-resources permissions

#### 5.2 Create Course Builder Guide

**New file:** `lms_node_devdocs/Course_Builder_API_Guide.md`

**Contents:**
- Which endpoints to use for course building
- Permission requirements by staff role
- Example workflows
- Common queries

---

## Permission Matrix Summary

### **Course Management Endpoints**

| Endpoint | Instructor | Content-Admin | Dept-Admin | Global-Admin |
|----------|------------|---------------|------------|--------------|
| GET /courses | ✅ Dept | ✅ Dept | ✅ Dept | ✅ All |
| POST /courses | ❌ | ✅ Dept | ✅ Dept | ✅ All |
| PUT /courses/:id | ❌ | ✅ Dept | ✅ Dept | ✅ All |
| DELETE /courses/:id | ❌ | ❌ | ✅ Dept | ✅ All |
| PATCH /courses/:id/archive | ❌ | ✅ Dept | ✅ Dept | ✅ All |
| POST /courses/:id/publish | ❌ | ✅ Dept | ✅ Dept | ✅ All |
| GET /courses/:id/render | ✅ Dept | ✅ Dept | ✅ Dept | ✅ All |
| POST /courses/:id/render | ❌ | ✅ Dept | ✅ Dept | ✅ All |

### **Course Content Endpoints**

| Endpoint | Instructor | Content-Admin | Dept-Admin | Global-Admin |
|----------|------------|---------------|------------|--------------|
| GET /course-contents | ✅ Dept | ✅ Dept | ✅ Dept | ✅ All |
| POST /course-contents | ❌ | ✅ Dept | ✅ Dept | ✅ All |
| PUT /course-contents/:id | ❌ | ✅ Dept | ✅ Dept | ✅ All |
| DELETE /course-contents/:id | ❌ | ✅ Dept | ✅ Dept | ✅ All |

### **Content Library Endpoints**

| Endpoint | Instructor | Content-Admin | Dept-Admin | Global-Admin |
|----------|------------|---------------|------------|--------------|
| GET /content/ | ✅ Dept | ✅ Dept | ✅ Dept | ✅ All |
| GET /content/:id | ✅ Dept | ✅ Dept | ✅ Dept | ✅ All |
| POST /content/custom | ❌ | ✅ Dept | ✅ Dept | ✅ All |
| PATCH /content/custom/:id | ❌ | ✅ Dept | ✅ Dept | ✅ All |

### **Progress & Reports Endpoints**

| Endpoint | Instructor | Content-Admin | Dept-Admin | Global-Admin |
|----------|------------|---------------|------------|--------------|
| GET /content/:id/attempts | ✅ Dept | ✅ Dept | ✅ Dept | ✅ All |
| GET /content/reports | ✅ Dept | ✅ Dept | ✅ Dept | ✅ All |
| GET /content/reports/learner/:id | ✅ Dept | ✅ Dept | ✅ Dept | ✅ All |

### **Administrative Endpoints**

| Endpoint | Instructor | Content-Admin | Dept-Admin | Global-Admin |
|----------|------------|---------------|------------|--------------|
| GET /department-resources/staffusers | ✅ Dept | ✅ Dept | ✅ Dept | ✅ All |
| PATCH /staffusers/:id/role | ❌ | ❌ | ✅ Dept | ✅ All |
| GET /department-resources/content | ✅ Dept | ✅ Dept | ✅ Dept | ✅ All |
| GET /department-resources/departments | ❌ | ❌ | ✅ Dept | ✅ All |
| PATCH /courses/:id/department | ❌ | ❌ | ⚠️ Hierarchy | ✅ All |
| PATCH /courses/:id/program | ❌ | ❌ | ✅ Dept | ✅ All |

**Legend:**
- ✅ Dept = Allowed, scoped to user's departments
- ✅ All = Allowed, access to all departments
- ⚠️ Hierarchy = Allowed only if both source and target in user's scope
- ❌ = Not allowed

---

## Testing Plan

### **Unit Tests**

For each updated endpoint, add tests for:
- ✅ Global admin can access
- ✅ Content admin can access own department
- ✅ Content admin cannot access other departments
- ✅ Department admin can access own department
- ✅ Instructor can read but not write
- ❌ Instructor cannot write
- ❌ Learner cannot access (where applicable)

### **Integration Tests**

**Files to update:**
- `tests/integration/academics/course.test.ts`
- `tests/integration/academics/courseContent.test.ts`
- `tests/integration/content/content.test.ts`
- `tests/integration/department-resources/department-resources.test.ts`

**Test scenarios:**
1. Multi-department staff sees courses from all their departments
2. Content admin can create/update courses in their department
3. Content admin cannot modify courses in other departments
4. Department admin can delete courses in their department
5. Instructor can view but not modify

---

## Migration Guide for API Consumers

### **Breaking Changes**

None initially - all changes are additive or permission expansions.

### **Deprecation Notice**

The following endpoints will be removed on **2026-06-01**:

#### **Deprecated Course Endpoints**
- ~~`GET /content/courses/:id`~~ → Use `GET /courses/:id`
- ~~`PATCH /content/courses/:id`~~ → Use `PUT /courses/:id`
- ~~`GET /content/courses/:id/render`~~ → Use `GET /courses/:id/render`
- ~~`POST /content/courses/:id/render`~~ → Use `POST /courses/:id/render`
- ~~`POST /department-resources/courses`~~ → Use `POST /courses`
- ~~`PATCH /department-resources/courses/:id`~~ → Use `PUT /courses/:id`

#### **What to Update**

If you're using:
```javascript
// OLD - Will be removed
GET /api/v1/content/courses/:id
PATCH /api/v1/content/courses/:id

// NEW - Use these instead
GET /api/v1/courses/:id
PUT /api/v1/courses/:id
```

### **New Capabilities**

After this update, staff with `content-admin` or `department-admin` roles can:
- ✅ Create and update courses in their departments
- ✅ Manage course contents/segments
- ✅ Create custom content (exams, quizzes)
- ✅ View progress reports and attempts

---

## Success Metrics

- ✅ All course management consolidated under `/courses`
- ✅ Staff roles can manage content in their departments
- ✅ Zero breaking changes for existing consumers
- ✅ Deprecated endpoints clearly marked
- ✅ Documentation updated and comprehensive
- ✅ All tests passing with new permissions

---

## Rollback Plan

If issues arise:

1. **Immediate:** Revert permission changes in routes
2. **Short-term:** Keep both old and new endpoints active
3. **Long-term:** Investigate issues, fix, and re-deploy

All changes are backward-compatible initially, so rollback is low-risk.

---

## Next Steps

1. **Review this plan** with team
2. **Prioritize phases** based on urgency
3. **Create tickets** for each phase
4. **Implement Phase 1** (permission updates) first
5. **Test thoroughly** before moving to next phase
6. **Update documentation** in parallel
7. **Communicate changes** to API consumers

---

## Appendix: Code Examples

### Example: Using requireStaffRole

```typescript
// Require content-admin OR department-admin
router.post(
  '/courses',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin', 'staff'),
  requireStaffRole('content-admin', 'department-admin'),
  createCourse
);

// Require ONLY department-admin
router.delete(
  '/courses/:id',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin', 'staff'),
  requireStaffRole('department-admin'),
  deleteCourse
);
```

### Example: Course Builder Workflow

```javascript
// 1. Get staff profile with departments
const profile = await fetch('/api/v1/staff/profile');
const departments = profile.data.departmentMemberships;

// 2. Check if user has content-admin in any department
const canCreateCourses = departments.some(m => 
  m.roles.includes('content-admin') || m.roles.includes('department-admin')
);

// 3. List courses (auto-filtered by department)
const courses = await fetch('/api/v1/courses');

// 4. Create a course (if allowed)
if (canCreateCourses) {
  const newCourse = await fetch('/api/v1/courses', {
    method: 'POST',
    body: JSON.stringify({
      title: 'New Course',
      program: programId,
      programLevel: levelId,
      // department inherited from program
    })
  });
}

// 5. Add segments to course
const segment = await fetch('/api/v1/course-contents', {
  method: 'POST',
  body: JSON.stringify({
    course: courseId,
    contentType: 'custom',
    customContentId: contentId,
    order: 1,
    isRequired: true
  })
});
```

---

## Appendix: Ideal RESTful API Design (From Scratch)

> **Note:** This section describes how the API would be designed from scratch using modern REST best practices, without legacy constraints. Since you control the only consumer, this is the recommended long-term target architecture.

### **Design Principles**

1. **Resource-Based URLs** - Use nouns, not verbs
2. **Consistent Hierarchy** - Logical nesting, max 2-3 levels deep
3. **Standard HTTP Methods** - GET, POST, PUT, PATCH, DELETE
4. **Predictable Patterns** - Same structure across all resources
5. **Query Parameters** - For filtering, sorting, pagination
6. **Nested Resources** - For clear relationships, with shortcuts for common queries
7. **Singular Route Names** - Use `/course/:id` not `/courses/:id` for single resources
8. **Plural Collections** - Use `/courses` for collections

---

### **Organizational Hierarchy (Top Level)**

Base: `/api/v1`

```
/departments                    - Department management (admin)
  /:id
  /:id/programs                 - Programs in department
  /:id/staff                    - Staff in department
  /:id/hierarchy               - Department tree

/programs                       - Program catalog
  /:id
  /:id/levels                   - Program levels
  /:id/courses                  - Courses in program
  /:id/enrollments              - Enrollments in program

/courses                        - Course catalog & management
  /:id
  /:id/modules                  - Course modules/segments
  /:id/modules/:moduleId        - Specific module
  /:id/publish                  - Publish actions
  /:id/render                   - Rendered output

/content                        - Content library (SCORM, media, exercises)
  /:id
  /scorm                        - SCORM packages
  /exercises                    - Exercises/quizzes/exams
  /media                        - Media items

/enrollments                    - Student enrollment management
  /:id
  /programs/:programId          - Enrollments by program
  /courses/:courseId            - Enrollments by course

/progress                       - Learning progress & tracking
  /learners/:learnerId          - Learner's progress
  /courses/:courseId            - Course completion data
  /modules/:moduleId            - Module attempts

/users                          - User management
  /me                           - Current user profile
  /staff                        - Staff directory
  /learners                     - Learner directory

/reports                        - Reporting & analytics
  /completion                   - Completion reports
  /performance                  - Performance reports
  /engagement                   - Engagement metrics
```

---

### **Course Management (Detailed)**

#### **Course Catalog & CRUD**

```
GET    /courses                           - List all courses (filtered by access)
  ?department=:id                         - Filter by department
  &program=:id                            - Filter by program
  &level=:id                              - Filter by level
  &status=draft|published|archived        - Filter by status
  &search=:term                           - Search courses
  &page=1&limit=20                        - Pagination

POST   /courses                           - Create new course
  Body: { title, program, level, description, ... }

GET    /courses/:id                       - Get course details
  ?include=modules,instructors,stats      - Include related data

PUT    /courses/:id                       - Replace course (full update)
PATCH  /courses/:id                       - Update course (partial)
DELETE /courses/:id                       - Delete course

POST   /courses/:id/publish               - Publish course
POST   /courses/:id/unpublish             - Unpublish course
POST   /courses/:id/archive               - Archive course
POST   /courses/:id/duplicate             - Duplicate course
```

#### **Course Modules (Nested Resource)**

```
GET    /courses/:id/modules               - List course modules
  ?contentType=scorm|exercise|media       - Filter by type
  &orderBy=sequence                       - Sort order

POST   /courses/:id/modules               - Add module to course
  Body: { 
    title,
    contentType: 'scorm|exercise|media',
    contentId,                            - Reference to content item
    sequence: 1,
    isRequired: true,
    weight: 0.25                          - Grading weight
  }

GET    /courses/:courseId/modules/:id    - Get module details
PUT    /courses/:courseId/modules/:id    - Update module
DELETE /courses/:courseId/modules/:id    - Remove module from course

PATCH  /courses/:id/modules/reorder      - Reorder modules
  Body: { moduleIds: ['id1', 'id2', ...] }
```

#### **Course Rendering & Output**

```
GET    /courses/:id/render                - Get rendered course HTML
  ?format=html|json|scorm                 - Output format
  &template=:templateId                   - Specific template
  &nocache=true                           - Force fresh render

POST   /courses/:id/render                - Trigger re-render
  Body: { templateId, force: true }

GET    /courses/:id/export                - Export course package
  ?format=scorm1.2|scorm2004|xapi
```

---

### **Content Library (Detailed)**

#### **Content Catalog (All Types)**

```
GET    /content                           - Browse all content
  ?type=scorm|exercise|media              - Filter by type
  &department=:id                         - Filter by department
  &tag=:tag                               - Filter by tag
  &search=:term                           - Search content

GET    /content/:id                       - Get content item
  ?include=usage,stats                    - Include related data
```

#### **SCORM Packages**

```
GET    /content/scorm                     - List SCORM packages
POST   /content/scorm                     - Upload new SCORM
  Body: FormData with file

GET    /content/scorm/:id                 - Get SCORM details
PUT    /content/scorm/:id                 - Update SCORM metadata
DELETE /content/scorm/:id                 - Delete SCORM package

POST   /content/scorm/:id/launch          - Get launch URL
  Body: { learnerId, context }
```

#### **Exercises (Exams, Quizzes, etc.)**

```
GET    /content/exercises                 - List exercises
  ?exerciseType=exam|quiz|practice        - Filter by type

POST   /content/exercises                 - Create exercise
  Body: {
    title,
    exerciseType: 'exam|quiz|practice',
    questions: ['q1', 'q2'],
    settings: { timeLimit, shuffleQuestions }
  }

GET    /content/exercises/:id             - Get exercise
PUT    /content/exercises/:id             - Update exercise
DELETE /content/exercises/:id             - Delete exercise

GET    /content/exercises/:id/questions   - List exercise questions
POST   /content/exercises/:id/questions   - Add question
```

#### **Media Items**

```
GET    /content/media                     - List media
  ?mediaType=video|audio|document         - Filter by type

POST   /content/media                     - Create media reference
  Body: { title, mediaType, sourceUrl, provider }

GET    /content/media/:id                 - Get media details
PUT    /content/media/:id                 - Update media
DELETE /content/media/:id                 - Delete media
```

---

### **Progress & Tracking (Detailed)**

#### **Learner Progress**

```
GET    /progress/learners/:id             - Get learner's overall progress
  ?program=:id                            - Filter by program
  &course=:id                             - Filter by course

GET    /progress/learners/:id/courses/:courseId
                                          - Learner's progress in specific course

POST   /progress/learners/:id/modules/:moduleId
                                          - Record module progress/completion
  Body: {
    status: 'in_progress|completed|failed',
    score: 85,
    timeSpent: 3600,
    completedAt: '2026-01-07T12:00:00Z'
  }
```

#### **Module Attempts**

```
GET    /progress/modules/:id/attempts     - List attempts for module
  ?learner=:id                            - Filter by learner
  &since=2026-01-01                       - Filter by date

POST   /progress/modules/:id/attempts     - Record attempt
  Body: {
    learnerId,
    startedAt,
    completedAt,
    score,
    responses: { ... }
  }

GET    /progress/attempts/:id             - Get specific attempt details
```

#### **Course Progress**

```
GET    /progress/courses/:id              - Course completion statistics
  ?department=:id                         - Filter by department

GET    /progress/courses/:id/learners     - Learners in course with progress
  ?status=completed|in_progress|not_started
```

---

### **User Management (Detailed)**

#### **Current User (Me)**

```
GET    /users/me                          - Get current user profile
  ?include=departments,roles,enrollments  - Include related data

PUT    /users/me                          - Update profile
  Body: { name, preferences, ... }

GET    /users/me/departments              - My departments & roles
GET    /users/me/courses                  - My assigned courses (instructor)
GET    /users/me/enrollments              - My enrollments (learner)
GET    /users/me/progress                 - My learning progress
```

#### **Staff Directory**

```
GET    /users/staff                       - List staff
  ?department=:id                         - Filter by department
  &role=instructor|content-admin          - Filter by role
  &search=:name                           - Search by name

POST   /users/staff                       - Create staff user
  Body: {
    name, email, password,
    departments: [
      { departmentId, roles: ['instructor'] }
    ]
  }

GET    /users/staff/:id                   - Get staff profile
PUT    /users/staff/:id                   - Update staff
DELETE /users/staff/:id                   - Delete staff

PATCH  /users/staff/:id/departments       - Update department assignments
  Body: {
    add: [{ departmentId, roles }],
    remove: [departmentId]
  }
```

#### **Learner Directory**

```
GET    /users/learners                    - List learners
  ?department=:id
  &program=:id
  &status=active|suspended

POST   /users/learners                    - Create learner
GET    /users/learners/:id                - Get learner profile
PUT    /users/learners/:id                - Update learner
DELETE /users/learners/:id                - Delete learner
```

---

### **Enrollment Management (Detailed)**

```
GET    /enrollments                       - List all enrollments
  ?learner=:id                            - Filter by learner
  &program=:id                            - Filter by program
  &course=:id                             - Filter by course
  &status=active|completed|withdrawn      - Filter by status

POST   /enrollments                       - Create enrollment
  Body: {
    learnerId,
    programId,                            - OR courseId
    enrollmentDate,
    status: 'active'
  }

GET    /enrollments/:id                   - Get enrollment details
PUT    /enrollments/:id                   - Update enrollment
DELETE /enrollments/:id                   - Delete enrollment

POST   /enrollments/:id/withdraw          - Withdraw enrollment
POST   /enrollments/:id/complete          - Mark as complete

GET    /enrollments/programs/:id          - Enrollments for program
GET    /enrollments/courses/:id           - Enrollments for course
```

---

### **Reporting & Analytics (Detailed)**

```
GET    /reports/completion                - Completion reports
  ?department=:id
  &program=:id
  &course=:id
  &from=2026-01-01&to=2026-12-31
  &format=json|csv|pdf

GET    /reports/performance               - Performance metrics
  ?learner=:id
  &course=:id
  &groupBy=learner|course|department

GET    /reports/engagement                - Engagement statistics
  ?course=:id
  &metric=time_spent|attempts|completion_rate

GET    /reports/departments/:id           - Department dashboard
  ?include=staff,courses,enrollments,progress
```

---

### **Department Management (Detailed)**

```
GET    /departments                       - List departments
  ?level=master|top|sub                   - Filter by level
  &status=active|archived                 - Filter by status

POST   /departments                       - Create department
  Body: { name, code, level, parentId }

GET    /departments/:id                   - Get department
PUT    /departments/:id                   - Update department
DELETE /departments/:id                   - Delete department

GET    /departments/:id/hierarchy         - Department tree structure
GET    /departments/:id/programs          - Programs in department
GET    /departments/:id/staff             - Staff in department
  ?role=instructor|content-admin|department-admin

GET    /departments/:id/stats             - Department statistics
  ?include=courses,enrollments,completion
```

---

### **Program Management (Detailed)**

```
GET    /programs                          - List programs
  ?department=:id
  &status=active|archived

POST   /programs                          - Create program
  Body: { name, code, department, description }

GET    /programs/:id                      - Get program
PUT    /programs/:id                      - Update program
DELETE /programs/:id                      - Delete program

GET    /programs/:id/levels               - Program levels
POST   /programs/:id/levels               - Add level
  Body: { name, order, description }

GET    /programs/:id/courses              - Courses in program
  ?level=:levelId                         - Filter by level

GET    /programs/:id/enrollments          - Enrollments in program
  ?status=active|completed
```

---

### **Key Design Decisions Explained**

#### **1. Clear Resource Hierarchy**

```
/courses                          - Top-level resource
/courses/:id                      - Specific course
/courses/:id/modules              - Nested collection
/courses/:id/modules/:moduleId    - Nested specific item
```

**Why:** Makes relationships explicit and URLs predictable

#### **2. Action Endpoints Use POST**

```
POST /courses/:id/publish         - State change actions
POST /courses/:id/duplicate       - Operations
```

**Why:** POST for non-idempotent operations, even without body

#### **3. Specialized Endpoints for Common Queries**

```
GET /users/me                     - Instead of /users/:id with auth check
GET /enrollments/courses/:id      - Instead of /enrollments?course=:id
```

**Why:** Shorter, clearer, more efficient common operations

#### **4. Include Related Data via Query Params**

```
GET /courses/:id?include=modules,instructors,stats
```

**Why:** Reduces over-fetching and allows client control

#### **5. Consistent Pagination & Filtering**

```
?page=1&limit=20                  - Pagination
&orderBy=createdAt&order=desc     - Sorting
&status=active                    - Filtering
```

**Why:** Same pattern across all list endpoints

#### **6. Separate Progress from Content**

```
/courses                          - Course structure
/progress                         - Learning progress
```

**Why:** Different concerns, different access patterns

#### **7. Nested Routes Max 2-3 Levels**

```
✅ /courses/:id/modules/:moduleId
✅ /programs/:id/levels
❌ /departments/:id/programs/:pid/courses/:cid/modules/:mid  (too deep)
```

**Why:** Deep nesting becomes unwieldy; use shortcuts instead

#### **8. Singular Names for Single Resources**

```
/users/me                         - Not /users/mes
/courses/:id                      - Not /course/:id
```

**Why:** Standard REST convention

---

### **Migration Path from Current to Ideal**

#### **Phase 1: Add Ideal Endpoints Alongside Current**

```typescript
// New ideal structure
app.use('/api/v1/courses', idealCourseRouter);
app.use('/api/v1/content', idealContentRouter);
app.use('/api/v1/progress', idealProgressRouter);
app.use('/api/v1/users', idealUserRouter);

// Keep old endpoints with deprecation warnings
app.use('/api/v1/courses', legacyCourseRouter);  // overlapping paths
app.use('/api/v1/content', legacyContentRouter);
app.use('/api/v1/department-resources', legacyDeptResourceRouter);
```

#### **Phase 2: Update Client to Use New Endpoints**

Since you control the only consumer:
- Switch one endpoint at a time
- Test thoroughly
- No need to maintain both long-term

#### **Phase 3: Remove Legacy Endpoints**

Once client fully migrated:
- Remove old route handlers
- Clean up controllers
- Update all documentation

#### **Phase 4: Further Refinement**

- Optimize based on actual usage patterns
- Add caching headers
- Implement HATEOAS links if needed
- Add versioning strategy (v2, v3, etc.)

---

### **Example: Unified Course Builder Workflow (Ideal API)**

```javascript
// 1. Get current user and departments
const user = await fetch('/api/v1/users/me?include=departments,roles');
const { departments } = user.data;

// 2. Check permissions
const canManageCourses = departments.some(d => 
  d.roles.includes('content-admin') || d.roles.includes('department-admin')
);

// 3. List courses (auto-scoped to user's departments)
const courses = await fetch('/api/v1/courses?status=published&include=modules');

// 4. Get specific course with all details
const course = await fetch(`/api/v1/courses/${courseId}?include=modules,instructors,stats`);

// 5. Create new course
const newCourse = await fetch('/api/v1/courses', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Introduction to CBT',
    program: programId,
    level: levelId,
    description: 'Learn CBT fundamentals'
  })
});

// 6. Add module to course
const module = await fetch(`/api/v1/courses/${courseId}/modules`, {
  method: 'POST',
  body: JSON.stringify({
    title: 'Module 1: Basics',
    contentType: 'exercise',
    contentId: exerciseId,
    sequence: 1,
    isRequired: true,
    weight: 0.2
  })
});

// 7. Publish course
await fetch(`/api/v1/courses/${courseId}/publish`, { method: 'POST' });

// 8. Track learner progress
await fetch(`/api/v1/progress/learners/${learnerId}/modules/${moduleId}`, {
  method: 'POST',
  body: JSON.stringify({
    status: 'completed',
    score: 95,
    timeSpent: 1800,
    completedAt: new Date().toISOString()
  })
});

// 9. Get learner's course progress
const progress = await fetch(`/api/v1/progress/learners/${learnerId}/courses/${courseId}`);

// 10. Run completion report
const report = await fetch(`/api/v1/reports/completion?course=${courseId}&from=2026-01-01`);
```

---

### **Benefits of Ideal Structure**

1. ✅ **Intuitive** - URLs describe exactly what resource you're accessing
2. ✅ **Consistent** - Same patterns across all resources
3. ✅ **Scalable** - Easy to add new resources following same conventions
4. ✅ **RESTful** - Follows HTTP and REST best practices
5. ✅ **Self-Documenting** - Clear what each endpoint does
6. ✅ **Flexible** - Query params allow customization without new endpoints
7. ✅ **Maintainable** - Organized by domain/resource, not by user type
8. ✅ **Efficient** - Reduces over-fetching with include parameters

---

### **Recommendation**

Since you control the only consumer, **implement the ideal structure** in these steps:

1. **Immediate:** Fix permissions on existing endpoints (Phase 1 of main plan)
2. **Short-term:** Add new ideal endpoints alongside current ones
3. **Medium-term:** Migrate client to ideal endpoints
4. **Long-term:** Remove legacy endpoints and clean up

This gives you a modern, maintainable API that will scale as your platform grows.
