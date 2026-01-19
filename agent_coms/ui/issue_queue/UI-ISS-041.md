# UI-ISS-041: Course Creation Requires Department Context

**Status:** 🔴 NOT STARTED  
**Priority:** High  
**Assigned:** UI Team  
**Created:** 2026-01-18  
**Estimated Effort:** Medium (2-3 days)

---

## Problem Statement

Currently, `/staff/courses/new` allows creating a course without explicitly requiring a department context. Courses **must belong to a department**, but the current flow doesn't enforce this properly.

### Current Behavior
1. User clicks "Create Course" from "My Courses" page
2. Goes to `/staff/courses/new`
3. Department is a dropdown field (may default to... something?)
4. User can potentially create course in wrong department

### Desired Behavior
1. **From Department View:** `/staff/departments/:deptId/courses/create` → Department pre-filled and locked
2. **From "My Courses":** Either disable button OR show department selector modal first

---

## Solution Design

### Scenario 1: Create from Department Context (Primary Flow)

**URL:** `/staff/departments/:deptId/courses/create`

```
┌─────────────────────────────────────────────┐
│ Create Course in [Engineering]              │
│ ─────────────────────────────────────────── │
│                                             │
│ Department: Engineering (locked 🔒)         │
│                                             │
│ Course Title: [________________]            │
│ Description:  [________________]            │
│ ...                                         │
└─────────────────────────────────────────────┘
```

- Department field is **read-only** (shown but not editable)
- Department ID comes from URL param
- User must have `course:create-department` in that department

### Scenario 2: Create from "My Courses" (Secondary Flow)

**URL:** `/staff/courses/new` (no department in URL)

**Option A: Department Selector Modal (Recommended)**
```
┌─────────────────────────────────────────────┐
│ Select Department                           │
│ ─────────────────────────────────────────── │
│ Choose where to create this course:         │
│                                             │
│ ○ Engineering                               │
│ ○ Computer Science                          │
│ ○ Marketing                                 │
│                                             │
│ [Cancel]                    [Continue →]    │
└─────────────────────────────────────────────┘
```
- Shows only departments where user has `course:create-department`
- After selection, navigates to `/staff/departments/:deptId/courses/create`

**Option B: Inline Department Selector**
- Show department as required dropdown at top of form
- Must be selected before other fields become enabled
- Validation prevents submission without department

**Option C: Disable "Create Course" from My Courses**
- Remove/hide button from StaffCoursesPage
- Only allow creation from department context
- Simpler but less discoverable

---

## Recommended Implementation

### Step 1: Update CourseEditorPage

```typescript
// CourseEditorPage.tsx

interface CourseEditorPageProps {
  // If provided, department is locked
  departmentId?: string;
}

const CourseEditorPage: React.FC = () => {
  const { deptId } = useParams(); // From URL
  const [selectedDepartment, setSelectedDepartment] = useState(deptId || null);
  
  const isDepartmentLocked = !!deptId;
  
  // If no deptId in URL and user has multiple departments, show selector
  if (!selectedDepartment && !courseId) {
    return <DepartmentSelectorModal onSelect={handleDepartmentSelect} />;
  }
  
  // ... rest of form
}
```

### Step 2: Add Route for Department-Scoped Creation

```typescript
// router/index.tsx

<Route
  path="/staff/departments/:deptId/courses/create"
  element={
    <StaffOnlyRoute>
      <CourseEditorPage />
    </StaffOnlyRoute>
  }
/>
```

### Step 3: Update "Create Course" Button in StaffCoursesPage

```typescript
// StaffCoursesPage.tsx

const handleCreateCourse = () => {
  // Get departments where user can create courses
  const creatableDepts = userDepartments.filter(d => 
    hasDeptPermission('course:create-department', d.id)
  );
  
  if (creatableDepts.length === 0) {
    toast.error("You don't have permission to create courses");
    return;
  }
  
  if (creatableDepts.length === 1) {
    // Only one option - go directly
    navigate(`/staff/departments/${creatableDepts[0].id}/courses/create`);
  } else {
    // Multiple options - show selector
    setShowDeptSelector(true);
  }
};
```

---

## Implementation Tasks

- [ ] Create `DepartmentSelectorModal` component
- [ ] Update `CourseEditorPage` to accept `deptId` from URL
- [ ] Add department-locked state to course form
- [ ] Add route `/staff/departments/:deptId/courses/create`
- [ ] Update `StaffCoursesPage` create button logic
- [ ] Update `DEPARTMENT_NAV_ITEMS` "Create Course" to work
- [ ] Add validation - require department before save

---

## API Considerations

### Course Creation Endpoint

**Current:** `POST /courses`
```json
{
  "title": "...",
  "departmentId": "..." // Optional? Required?
}
```

**Needed:** Confirm `departmentId` is **required** for course creation

See: `api/agent_coms/messages/2026-01-18_course_department_requirement.md`

---

## Acceptance Criteria

- [ ] Cannot create course without selecting department
- [ ] When accessed from department nav, department is pre-filled and locked
- [ ] When accessed from "My Courses", department selector appears first
- [ ] Only shows departments where user has create permission
- [ ] Single department users skip the selector
- [ ] Course is correctly associated with department in API

---

## Related Issues

- UI-ISS-040: Implement Department-Scoped Pages

---

## Files to Modify

```
src/pages/staff/courses/CourseEditorPage.tsx    (MODIFY)
src/pages/staff/courses/StaffCoursesPage.tsx    (MODIFY)
src/shared/ui/department-selector-modal.tsx     (NEW)
src/app/router/index.tsx                        (MODIFY)
```
