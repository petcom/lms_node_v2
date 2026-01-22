# API-ISS-001: Department Learners Endpoint Enhancement

## Status: COMPLETE
## Priority: High
## Created: 2026-01-20
## Requested By: UI Team (2026-01-18_department_scoped_endpoints.md)
## Related: UI-ISS-040

---

## Overview

**UPDATE:** The endpoint `GET /api/v2/users/learners?department=xxx` **already exists** in the codebase. This issue is now focused on **optimization and enhancement**:

1. Replace N+1 query pattern with MongoDB aggregation pipeline
2. Add `includeSubdepartments` parameter for hierarchy filtering
3. Improve performance from 500-2000ms to 50-100ms

---

## Endpoint Specification

### `GET /api/v2/users/learners`

**Query Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `department` | string | No | - | Filter by department ID |
| `courseId` | string | No | - | Filter by specific course enrollment |
| `status` | string | No | all | active, completed, withdrawn |
| `search` | string | No | - | Search by name/email |
| `page` | number | No | 1 | Pagination |
| `limit` | number | No | 20 | Items per page |
| `sortBy` | string | No | name | name, email, progress, lastActivity |
| `sortOrder` | string | No | asc | asc, desc |

**Authorization:**
- Required permission: `student:view-department`
- Data scoped to departments user has access to

**Response:**
```json
{
  "status": "success",
  "success": true,
  "data": {
    "learners": [
      {
        "id": "user_abc123",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "avatar": "https://...",
        "activeEnrollments": 3,
        "completedEnrollments": 5,
        "overallProgress": 67.5,
        "averageScore": 82.3,
        "lastActivityDate": "2026-01-19T14:30:00Z",
        "enrolledSince": "2025-09-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## Implementation Tasks

### 1. Service Layer
- [ ] Create `src/services/users/learners.service.ts` or extend existing users service
- [ ] Aggregate enrollment data from Enrollment collection
- [ ] Calculate progress percentages from Progress collection
- [ ] Get last activity from user activity logs

### 2. Controller Layer
- [ ] Add handler in users controller or create dedicated learners controller
- [ ] Validate query parameters
- [ ] Handle pagination

### 3. Routes
- [ ] Add route `GET /api/v2/users/learners`
- [ ] Apply `requireAccessRight('student:view-department')`

### 4. Data Aggregation Logic
```
For each learner in department's courses:
  - activeEnrollments = Count of enrollments with status=active
  - completedEnrollments = Count of enrollments with status=completed
  - overallProgress = Average progress across all active enrollments
  - averageScore = Average assessment score across all assessments
  - lastActivityDate = Max of all activity timestamps
```

---

## Database Queries Required

1. Get all courses in department(s)
2. Get all enrollments for those courses
3. Get unique learners from enrollments
4. Aggregate progress data per learner
5. Get activity data per learner

Consider creating an aggregation pipeline for performance.

---

## Testing Requirements

- [ ] Unit tests for service layer
- [ ] Integration tests for endpoint
- [ ] Test department scoping (user can only see learners in accessible departments)
- [ ] Test pagination
- [ ] Test filters (status, search, courseId)
- [ ] Test sorting

---

## Acceptance Criteria

1. Endpoint returns learners enrolled in department's courses
2. Data is scoped to departments user has permission to view
3. All specified response fields are populated
4. Pagination works correctly
5. Filters work correctly
6. Sort options work correctly
7. Performance is acceptable (<500ms for typical queries)

---

## Notes

- This endpoint should NOT return learners who are only in other departments
- Consider caching aggregated data if performance becomes an issue
- Consider adding `enrolledCourses[]` field for detailed view (optional)
