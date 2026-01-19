# UI-ISS-040: Implement Department-Scoped Staff Pages

**Status:** 🔴 NOT STARTED  
**Priority:** High  
**Assigned:** UI Team  
**Created:** 2026-01-18  
**Estimated Effort:** Large (5-8 days)

---

## Problem Statement

The `DEPARTMENT_NAV_ITEMS` in `navItems.ts` define sidebar links for department-scoped actions, but **no routes or pages exist** to handle them. Clicking these links results in 404 errors.

## Phantom Links (Currently Broken)

| Nav Item | pathTemplate | Status |
|----------|--------------|--------|
| Create Course | `/staff/departments/:deptId/courses/create` | ❌ 404 |
| Manage Courses | `/staff/departments/:deptId/courses` | ❌ 404 |
| Manage Classes | `/staff/departments/:deptId/classes` | ❌ 404 |
| Student Progress | `/staff/departments/:deptId/students` | ❌ 404 |
| Department Reports | `/staff/departments/:deptId/reports` | ❌ 404 |
| Department Settings | `/staff/departments/:deptId/settings` | ❌ 404 |

## Solution Options

### Option A: Create New Department-Scoped Pages (Recommended)

Create dedicated pages that are explicitly department-scoped with the department ID in the URL.

**Pros:**
- Clean URLs that indicate scope
- Easy to bookmark/share department-specific views
- Clear separation between "My X" (personal) and "Manage X" (admin)

**Cons:**
- More pages to maintain
- Some code duplication with existing pages

### Option B: Reuse Existing Pages with Query Params

Redirect department nav items to existing pages with `?departmentId=xxx` query param.

**Pros:**
- Less code to write
- Reuse existing pages

**Cons:**
- URLs less clear about scope
- Need to modify existing pages to handle filtering
- Muddies the "My" vs "Manage" distinction

### Option C: Hybrid Approach

- **Manage Courses** → Redirect to `/staff/courses?departmentId=xxx` (filter existing)
- **Create Course** → New page or modal with department pre-selected
- **Department Settings** → New dedicated page (unique functionality)

---

## Recommended Implementation (Option A)

### Phase 1: Core Department Pages

#### 1.1 Department Courses Page
- **Route:** `/staff/departments/:deptId/courses`
- **Page:** `DepartmentCoursesPage.tsx`
- **Features:**
  - Lists ALL courses in the department (not just user's)
  - Filter by status, instructor, date
  - Bulk actions (archive, publish)
  - "Create Course" button (pre-fills department)
- **Permission:** `course:view-department`

#### 1.2 Create Course (Department Context)
- **Route:** `/staff/departments/:deptId/courses/create`
- **Page:** Reuse `CourseEditorPage.tsx` with `departmentId` prop
- **Features:**
  - Department field is pre-filled and locked
  - All other course creation features
- **Permission:** `course:create-department`

#### 1.3 Department Classes Page
- **Route:** `/staff/departments/:deptId/classes`
- **Page:** `DepartmentClassesPage.tsx`
- **Features:**
  - Lists ALL classes in department
  - Filter by course, instructor, status, date range
  - Create class button
- **Permission:** `class:view-department`

### Phase 2: Analytics & Management Pages

#### 2.1 Department Students Page
- **Route:** `/staff/departments/:deptId/students`
- **Page:** `DepartmentStudentsPage.tsx`
- **Features:**
  - List all learners enrolled in department courses
  - Progress overview per student
  - Drill into student details
- **Permission:** `student:view-department`

#### 2.2 Department Reports Page
- **Route:** `/staff/departments/:deptId/reports`
- **Page:** `DepartmentReportsPage.tsx`
- **Features:**
  - Department-specific report templates
  - Generate/schedule reports
  - View report history
- **Permission:** `report:view-department-all`

#### 2.3 Department Settings Page
- **Route:** `/staff/departments/:deptId/settings`
- **Page:** `DepartmentSettingsPage.tsx`
- **Features:**
  - Department metadata (name, description)
  - Default settings for courses/classes
  - Notification preferences
- **Permission:** `department:edit`

---

## Implementation Tasks

### Router Updates
- [ ] Add routes for all 6 department-scoped pages
- [ ] Create `DepartmentScopedRoute` wrapper component
- [ ] Validate department access in route guard

### New Pages
- [ ] `DepartmentCoursesPage.tsx`
- [ ] `DepartmentClassesPage.tsx`
- [ ] `DepartmentStudentsPage.tsx`
- [ ] `DepartmentReportsPage.tsx`
- [ ] `DepartmentSettingsPage.tsx`

### Existing Page Updates
- [ ] `CourseEditorPage.tsx` - Accept `departmentId` param, lock field when provided

### Shared Components
- [ ] `DepartmentBreadcrumb` - Shows "Department > Courses" etc.
- [ ] `DepartmentHeader` - Consistent header with department name

---

## API Dependencies

See: `api/agent_coms/messages/2026-01-18_department_scoped_endpoints.md`

| Endpoint | Status |
|----------|--------|
| `GET /departments/:id/courses` | ⚠️ May need filtering params |
| `GET /departments/:id/classes` | ⚠️ May need creation |
| `GET /departments/:id/students` | ⚠️ May need creation |
| `GET /departments/:id/settings` | ⚠️ May need creation |
| `PUT /departments/:id/settings` | ⚠️ May need creation |

---

## Acceptance Criteria

- [ ] All 6 department nav items link to working pages
- [ ] Pages correctly filter data to selected department
- [ ] Permission checks prevent unauthorized access
- [ ] Breadcrumbs show department context
- [ ] Back navigation returns to department view
- [ ] URLs are bookmarkable and shareable

---

## Related Issues

- UI-ISS-041: Course Creation Department Context
- UI-ISS-039: Course Summary Analytics (blocked on API)

---

## Files to Create/Modify

```
src/pages/staff/departments/
├── DepartmentCoursesPage.tsx      (NEW)
├── DepartmentClassesPage.tsx      (NEW)
├── DepartmentStudentsPage.tsx     (NEW)
├── DepartmentReportsPage.tsx      (NEW)
├── DepartmentSettingsPage.tsx     (NEW)
└── index.ts                       (NEW)

src/app/router/index.tsx           (MODIFY - add routes)
src/shared/ui/department-breadcrumb.tsx (NEW)
```
