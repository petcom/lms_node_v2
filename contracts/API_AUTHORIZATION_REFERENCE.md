# API Authorization Reference
**Version:** 2.0.0
**Date:** 2026-01-11
**Status:** Ready for Implementation
**Audience:** Both Backend and Frontend Teams

---

## Overview

This document provides a quick reference for authorization requirements across all LMS API endpoints. Use this to understand:
- Which endpoints require authentication
- What access rights are needed
- Which endpoints require admin escalation
- Department scoping rules

---

## Legend

| Symbol | Meaning |
|--------|---------|
| 🌐 | Public endpoint (no auth required) |
| 🔒 | Requires authentication |
| 🔑 | Requires specific access right(s) |
| ⚠️ | Requires admin escalation |
| 🏢 | Department-scoped |

---

## Authentication Endpoints

| Endpoint | Method | Auth | Access Rights | Notes |
|----------|--------|------|---------------|-------|
| `/api/v2/auth/login` | POST | 🌐 | None | Public |
| `/api/v2/auth/register` | POST | 🌐 | None | Public |
| `/api/v2/auth/logout` | POST | 🔒 | None | Any authenticated user |
| `/api/v2/auth/refresh` | POST | 🌐 | None | Requires refresh token |
| `/api/v2/auth/me` | GET | 🔒 | None | Any authenticated user |
| `/api/v2/auth/escalate` | POST | 🔒 | None | Requires `global-admin` userType |
| `/api/v2/auth/deescalate` | POST | 🔒⚠️ | None | Requires admin token |
| `/api/v2/auth/switch-department` | POST | 🔒 | None | Any authenticated user |
| `/api/v2/auth/continue` | POST | 🔒 | None | Refresh access rights |
| `/api/v2/auth/forgot-password` | POST | 🌐 | None | Public |
| `/api/v2/auth/reset-password` | POST | 🌐 | None | Public |
| `/api/v2/auth/change-password` | POST | 🔒 | None | Any authenticated user |
| `/api/v2/auth/set-escalation-password` | POST | 🔒 | None | Requires `global-admin` userType |

---

## Roles & Permissions Endpoints

| Endpoint | Method | Auth | Access Rights | Notes |
|----------|--------|------|---------------|-------|
| `/api/v2/roles` | GET | 🔒 | None | List role definitions |
| `/api/v2/roles/:name` | GET | 🔒 | None | Get single role definition |
| `/api/v2/roles/:name/access-rights` | PUT | 🔒⚠️🔑 | `system:roles:manage` | Admin only |
| `/api/v2/access-rights` | GET | 🔒 | None | List all access rights |
| `/api/v2/access-rights/role/:name` | GET | 🔒 | None | Get access rights for role |
| `/api/v2/roles/me` | GET | 🔒 | None | Get my roles & access rights |
| `/api/v2/roles/me/department/:id` | GET | 🔒 | None | Get my roles in department |

---

## Course Management Endpoints

| Endpoint | Method | Auth | Access Rights | Notes |
|----------|--------|------|---------------|-------|
| `/api/v2/courses` | GET | 🔒🔑🏢 | `content:courses:read` | Visibility filtered by user |
| `/api/v2/courses` | POST | 🔒🔑🏢 | `content:courses:manage` | Create in current department |
| `/api/v2/courses/:id` | GET | 🔒🔑🏢 | `content:courses:read` | Visibility rules apply |
| `/api/v2/courses/:id` | PUT | 🔒🔑🏢 | `content:courses:manage` | Edit permission rules apply |
| `/api/v2/courses/:id` | DELETE | 🔒⚠️🔑 | `content:courses:manage` | System admin only |
| `/api/v2/courses/:id/publish` | POST | 🔒🔑🏢 | `content:courses:manage` | Department admin or content admin |
| `/api/v2/courses/:id/archive` | POST | 🔒🔑🏢 | `content:courses:manage` | Department admin only |

**Course Visibility Rules:**
- **Draft**: Only department members can view
- **Published**: All authenticated users can view
- **Archived**: Only department members can view

**Course Edit Rules:**
- **Draft**: Content admins in department
- **Published**: Department admins only (content admins blocked)
- **Archived**: No one (completely locked)

---

## Class Management Endpoints

| Endpoint | Method | Auth | Access Rights | Notes |
|----------|--------|------|---------------|-------|
| `/api/v2/classes` | GET | 🔒🔑🏢 | `content:classes:read` | Scoped to user's department |
| `/api/v2/classes` | POST | 🔒🔑🏢 | `content:classes:manage` | Create in current department |
| `/api/v2/classes/:id` | GET | 🔒🔑🏢 | `content:classes:read` | Department scoped |
| `/api/v2/classes/:id` | PUT | 🔒🔑🏢 | `content:classes:manage` | Department scoped |
| `/api/v2/classes/:id` | DELETE | 🔒⚠️🔑 | `content:classes:manage` | System admin only |
| `/api/v2/classes/:id/roster` | GET | 🔒🔑 | `enrollment:classes:read` | Instructors + dept admins |

---

## Progress Tracking Endpoints

| Endpoint | Method | Auth | Access Rights | Notes |
|----------|--------|------|---------------|-------|
| `/api/v2/progress/program/:programId` | GET | 🔒🔑 | `reports:own:read` OR `reports:department:read` | Own vs others |
| `/api/v2/progress/course/:courseId` | GET | 🔒🔑 | `reports:own:read` OR `reports:department:read` | Own vs others |
| `/api/v2/progress/class/:classId` | GET | 🔒🔑 | `reports:own:read` OR `reports:own-classes:read` | Instructor scoped |
| `/api/v2/progress/learner/:learnerId` | GET | 🔒🔑 | `reports:own:read` OR `reports:department:read` | Own vs others |
| `/api/v2/progress/learner/:learnerId/program/:programId` | GET | 🔒🔑 | `reports:own:read` OR `reports:department:read` | Own vs others |
| `/api/v2/progress/summary` | GET | 🔒🔑 | `reports:department:read` | Department scoped |
| `/api/v2/progress/reports/detailed` | GET | 🔒🔑🏢 | `reports:department:read` | Data masking applied |

**Data Masking Rules:**
- If `learner:pii:read` NOT present → Last names masked to "L."
- If `learner:pii:read` present → Full names visible
- Email always hidden unless `learner:pii:read` present

---

## Reporting Endpoints

| Endpoint | Method | Auth | Access Rights | Notes |
|----------|--------|------|---------------|-------|
| `/api/v2/reports/completion` | GET | 🔒🔑🏢 | `reports:department:read` | Authorization scoping applied |
| `/api/v2/reports/performance` | GET | 🔒🔑🏢 | `reports:department:read` | Authorization scoping + masking |
| `/api/v2/reports/learner/:id/transcript` | GET | 🔒🔑 | `learner:transcripts:read` OR own | FERPA-protected |
| `/api/v2/reports/learner/:id/transcript/pdf` | POST | 🔒🔑 | `learner:transcripts:read` OR own | FERPA-protected |
| `/api/v2/reports/course/:id` | GET | 🔒🔑🏢 | `reports:department:read` | Authorization scoping applied |
| `/api/v2/reports/program/:id` | GET | 🔒🔑🏢 | `reports:department:read` | Authorization scoping applied |
| `/api/v2/reports/department/:id` | GET | 🔒🔑🏢 | `reports:department:read` | Authorization scoping applied |
| `/api/v2/reports/export` | POST | 🔒🔑 | `reports:department:export` | Export permissions required |

**Authorization Scoping:**
- System admins: See all data
- Department admins: See own department + subdepartments
- Instructors: See only assigned classes
- Learners: See only own data

---

## Enrollment Endpoints

| Endpoint | Method | Auth | Access Rights | Notes |
|----------|--------|------|---------------|-------|
| `/api/v2/enrollments` | GET | 🔒🔑🏢 | `enrollment:read` | Scoped to department |
| `/api/v2/enrollments` | POST | 🔒🔑 | `enrollment:manage` | Create enrollment |
| `/api/v2/enrollments/:id` | GET | 🔒🔑 | `enrollment:read` OR own | Own vs others |
| `/api/v2/enrollments/:id` | PUT | 🔒🔑 | `enrollment:manage` | Update enrollment |
| `/api/v2/enrollments/:id` | DELETE | 🔒🔑 | `enrollment:manage` | Delete enrollment |
| `/api/v2/enrollments/learner/:id` | GET | 🔒🔑 | `enrollment:read` OR own | Get learner's enrollments |
| `/api/v2/enrollments/class/:id` | GET | 🔒🔑 | `enrollment:classes:read` | Get class enrollments |

---

## Grading Endpoints

| Endpoint | Method | Auth | Access Rights | Notes |
|----------|--------|------|---------------|-------|
| `/api/v2/grades/learner/:id` | GET | 🔒🔑 | `grades:own:read` OR `learner:grades:read` | Own vs others |
| `/api/v2/grades/class/:id` | GET | 🔒🔑 | `grades:own-classes:manage` | Instructor's classes only |
| `/api/v2/grades/assignment/:id` | POST | 🔒🔑 | `grades:own-classes:manage` | Grade assignment |
| `/api/v2/grades/assignment/:id` | PUT | 🔒🔑 | `grades:own-classes:manage` | Update grade |
| `/api/v2/grades/bulk` | POST | 🔒🔑 | `grades:own-classes:manage` | Bulk grade upload |

**Grading Rules:**
- Instructors can only grade their own assigned classes
- Cannot grade own work
- Grade changes create audit trail

---

## Learner Management Endpoints

| Endpoint | Method | Auth | Access Rights | Notes |
|----------|--------|------|---------------|-------|
| `/api/v2/learners` | GET | 🔒🔑🏢 | `learner:department:read` | Department scoped |
| `/api/v2/learners` | POST | 🔒⚠️🔑 | `learner:system:manage` | System admin only |
| `/api/v2/learners/:id` | GET | 🔒🔑 | `learner:department:read` OR own | Data masking applied |
| `/api/v2/learners/:id` | PUT | 🔒🔑 | `learner:department:manage` OR own | Limited self-edit |
| `/api/v2/learners/:id` | DELETE | 🔒⚠️🔑 | `learner:system:manage` | System admin only |
| `/api/v2/learners/:id/pii` | GET | 🔒🔑 | `learner:pii:read` | FERPA-protected |

**PII Access:**
- `learner:pii:read` required for full name, email, address, SSN
- Audit logged when PII accessed

---

## Staff Management Endpoints

| Endpoint | Method | Auth | Access Rights | Notes |
|----------|--------|------|---------------|-------|
| `/api/v2/staff` | GET | 🔒🔑🏢 | `staff:department:read` | Department scoped |
| `/api/v2/staff` | POST | 🔒⚠️🔑 | `staff:system:manage` | System admin only |
| `/api/v2/staff/:id` | GET | 🔒🔑 | `staff:department:read` | Department scoped |
| `/api/v2/staff/:id` | PUT | 🔒🔑 | `staff:department:manage` | Department admin |
| `/api/v2/staff/:id` | DELETE | 🔒⚠️🔑 | `staff:system:manage` | System admin only |
| `/api/v2/staff/:id/roles` | PUT | 🔒🔑🏢 | `staff:department:manage` | Assign/remove roles |

---

## Content Library Endpoints

| Endpoint | Method | Auth | Access Rights | Notes |
|----------|--------|------|---------------|-------|
| `/api/v2/content` | GET | 🔒🔑 | `content:library:read` | List content items |
| `/api/v2/content/scorm` | POST | 🔒🔑 | `content:library:manage` | Upload SCORM package |
| `/api/v2/content/media` | POST | 🔒🔑 | `content:library:manage` | Upload media file |
| `/api/v2/content/:id` | GET | 🔒🔑 | `content:library:read` | Get content item |
| `/api/v2/content/:id` | DELETE | 🔒🔑 | `content:library:manage` | Delete content item |

---

## System Administration Endpoints

| Endpoint | Method | Auth | Access Rights | Notes |
|----------|--------|------|---------------|-------|
| `/api/v2/admin/settings` | GET | 🔒⚠️🔑 | `system:settings:read` | Admin only |
| `/api/v2/admin/settings` | PUT | 🔒⚠️🔑 | `system:settings:manage` | System admin only |
| `/api/v2/admin/audit-logs` | GET | 🔒⚠️🔑 | `audit:logs:read` | Audit access logged |
| `/api/v2/admin/departments` | POST | 🔒⚠️🔑 | `system:departments:manage` | Create department |
| `/api/v2/admin/departments/:id` | PUT | 🔒⚠️🔑 | `system:departments:manage` | Update department |
| `/api/v2/admin/departments/:id` | DELETE | 🔒⚠️🔑 | `system:departments:manage` | Delete department |

---

## Access Rights Catalog

### Content Domain

| Access Right | Description | Typical Roles |
|--------------|-------------|---------------|
| `content:courses:read` | View course details | All staff, learners |
| `content:courses:manage` | Create/edit courses | Content admin, department admin |
| `content:lessons:read` | View lessons | All staff, learners |
| `content:lessons:manage` | Create/edit lessons | Content admin |
| `content:classes:read` | View classes | Staff, enrolled learners |
| `content:classes:manage` | Create/edit classes | Instructor, department admin |
| `content:library:read` | Access content library | All staff |
| `content:library:manage` | Manage content library | Content admin |

### Enrollment Domain

| Access Right | Description | Typical Roles |
|--------------|-------------|---------------|
| `enrollment:read` | View enrollments | Staff |
| `enrollment:manage` | Create/edit enrollments | Department admin, enrollment admin |
| `enrollment:classes:read` | View class rosters | Instructor, department admin |

### Grades Domain

| Access Right | Description | Typical Roles |
|--------------|-------------|---------------|
| `grades:own:read` | View own grades | All learners |
| `grades:own-classes:manage` | Grade own classes | Instructor |
| `learner:grades:read` | View all learner grades | Department admin |

### Reports Domain

| Access Right | Description | Typical Roles |
|--------------|-------------|---------------|
| `reports:own:read` | View own progress/reports | All learners |
| `reports:own-classes:read` | View reports for own classes | Instructor |
| `reports:department:read` | View department reports | Department admin |
| `reports:department:export` | Export department reports | Department admin |

### Learner Domain (FERPA-Protected)

| Access Right | Description | Typical Roles |
|--------------|-------------|---------------|
| `learner:department:read` | View learners in department | Staff |
| `learner:department:manage` | Manage learners in department | Department admin |
| `learner:pii:read` | View PII (full name, email, SSN) | Department admin, enrollment admin |
| `learner:transcripts:read` | View/export transcripts | Department admin, enrollment admin |
| `learner:transcripts:export` | Export transcripts | Department admin |

### Staff Domain

| Access Right | Description | Typical Roles |
|--------------|-------------|---------------|
| `staff:department:read` | View staff in department | Department admin |
| `staff:department:manage` | Manage staff in department | Department admin |
| `staff:system:manage` | Manage all staff | System admin |

### System Domain

| Access Right | Description | Typical Roles |
|--------------|-------------|---------------|
| `system:settings:read` | View system settings | System admin |
| `system:settings:manage` | Manage system settings | System admin |
| `system:departments:manage` | Manage departments | System admin |
| `system:roles:manage` | Manage role definitions | System admin |
| `system:*` | Full system access | System admin |

### Audit Domain

| Access Right | Description | Typical Roles |
|--------------|-------------|---------------|
| `audit:logs:read` | View audit logs | System admin |
| `audit:logs:export` | Export audit logs | System admin |

---

## Authorization Flow

### 1. Middleware Layer (Route Protection)

```typescript
// Example: Course management route
router.get('/courses',
  authenticate,                                    // 1. Verify JWT
  requireAccessRight('content:courses:read'),      // 2. Check access right
  listCourses                                      // 3. Call controller
);
```

### 2. Controller Layer (Business Logic)

```typescript
// Example: List courses controller
export const listCourses = asyncHandler(async (req: Request, res: Response) => {
  // 1. Validate user context
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  // 2. Extract and validate parameters
  const filters = { /* ... */ };

  // 3. Call service with user context
  const result = await CoursesService.listCourses(filters);

  // 4. Apply visibility filtering
  result.courses = await CoursesService.filterCoursesByVisibility(result.courses, user);

  // 5. Return filtered results
  res.status(200).json(ApiResponse.success(result));
});
```

### 3. Service Layer (Data Access)

```typescript
// Example: Filter courses by visibility
export async function filterCoursesByVisibility(courses: Course[], user: any): Promise<Course[]> {
  return courses.filter(course => {
    // Draft: Only department members
    if (course.status === 'draft') {
      return isUserInDepartment(user, course.departmentId);
    }

    // Published: All authenticated users
    if (course.status === 'published') {
      return true;
    }

    // Archived: Only department members
    if (course.status === 'archived') {
      return isUserInDepartment(user, course.departmentId);
    }

    return false;
  });
}
```

---

## Common Authorization Patterns

### Pattern 1: Own vs Others

```typescript
// Check if accessing own data or has permission to view others
const isOwnData = targetUserId === user.userId;
const canViewOthers = user.allAccessRights?.includes('reports:department:read') ||
                      user.roles?.includes('system-admin');

if (!isOwnData && !canViewOthers) {
  throw ApiError.forbidden('You do not have permission to view this data');
}
```

### Pattern 2: Department Scoping

```typescript
// Apply department-based filtering
let query = { /* base query */ };

if (!user.roles?.includes('system-admin')) {
  // Non-admins: filter to accessible departments
  const accessibleDepartments = getUserAccessibleDepartments(user);
  query.departmentId = { $in: accessibleDepartments };
}
```

### Pattern 3: Instructor Class Scoping

```typescript
// Instructors can only access their assigned classes
if (user.roles?.includes('instructor') && !user.roles?.includes('department-admin')) {
  const assignedClasses = await getInstructorClasses(user.userId);
  query.classId = { $in: assignedClasses };
}
```

### Pattern 4: Data Masking

```typescript
// Apply FERPA data masking if user lacks PII access
if (!user.allAccessRights?.includes('learner:pii:read')) {
  learners = learners.map(learner => ({
    ...learner,
    lastName: learner.lastName ? `${learner.lastName.charAt(0)}.` : '',
    email: '(hidden)',
    ssn: undefined,
    address: undefined
  }));
}
```

---

## Testing Authorization

### Frontend Testing

```typescript
// Mock auth context for testing
const mockAuth = {
  currentDepartmentAccessRights: ['content:courses:read'],
  currentDepartmentRoles: ['instructor'],
  isAuthenticated: true
};

render(
  <AuthProvider value={mockAuth}>
    <ProtectedComponent requiredRights={['content:courses:read']}>
      <CourseList />
    </ProtectedComponent>
  </AuthProvider>
);
```

### Backend Testing

```typescript
// E2E test with JWT
it('should allow instructor to view courses', async () => {
  const instructorToken = generateJWT({
    userId: instructorId,
    roles: ['instructor'],
    allAccessRights: ['content:courses:read']
  });

  const response = await request(app)
    .get('/api/v2/courses')
    .set('Authorization', `Bearer ${instructorToken}`);

  expect(response.status).toBe(200);
});
```

---

## Quick Reference

### Checking Access Rights (UI)

```typescript
// Check single right
hasAccessRight(userRights, 'content:courses:manage')

// Check any of multiple rights
hasAnyAccessRight(userRights, ['content:courses:read', 'content:courses:manage'])

// Check all of multiple rights
hasAllAccessRights(userRights, ['content:courses:manage', 'content:lessons:manage'])
```

### Adding Authorization to New Endpoints

1. **Route**: Add `requireAccessRight('domain:resource:action')` middleware
2. **Controller**: Validate user context at start of method
3. **Service**: Apply scoping/filtering based on user context
4. **Response**: Apply data masking if needed
5. **Test**: Write E2E test with proper JWT
6. **Document**: Update this reference

---

## Additional Resources

- **UI Implementation**: `/contracts/UI_AUTHORIZATION_IMPLEMENTATION_GUIDE.md`
- **Role System Contracts**: `/contracts/UI_ROLE_SYSTEM_CONTRACTS.md`
- **Auth V2 Contract**: `/contracts/api/auth-v2.contract.ts`
- **Roles Contract**: `/contracts/api/roles.contract.ts`
- **Endpoint Documentation**: `/devdocs/Endpoint_Role_Authorization.md`

---

**Last Updated:** 2026-01-11
**Maintained By:** Backend & API Team
**Questions?** See `/contracts/README.md` for contact info
