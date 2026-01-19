# UI Team → API Team: Department-Scoped Endpoints Review

**From:** UI Team  
**To:** API Team  
**Date:** 2026-01-18  
**Priority:** High  
**Type:** Endpoint Review & Creation Request  

---

## Context

We are implementing department-scoped pages for staff users (UI-ISS-040). These pages will allow department admins to manage all courses, classes, students, and settings within their department.

## Required Endpoints

Please review and confirm availability of the following endpoints. If they don't exist, please create them per the specifications below.

---

### 1. Department Courses

**Endpoint:** `GET /api/v2/departments/:departmentId/courses`

**Purpose:** List all courses belonging to a department (not just user's courses)

**Query Params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| page | number | No | Pagination (default: 1) |
| limit | number | No | Items per page (default: 20) |
| status | string | No | Filter: draft, published, archived |
| search | string | No | Search course title/description |
| instructorId | string | No | Filter by assigned instructor |
| sortBy | string | No | Sort field (title, createdAt, updatedAt) |
| sortOrder | string | No | asc or desc |

**Authorization:** User must have `course:view-department` permission in the specified department.

**Response:**
```json
{
  "success": true,
  "data": {
    "courses": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

**Status:** ⚠️ Please confirm if this exists or needs creation

---

### 2. Department Classes

**Endpoint:** `GET /api/v2/departments/:departmentId/classes`

**Purpose:** List all class instances in a department

**Query Params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| page | number | No | Pagination |
| limit | number | No | Items per page |
| courseId | string | No | Filter by course |
| status | string | No | scheduled, active, completed, cancelled |
| instructorId | string | No | Filter by instructor |
| startDateFrom | date | No | Classes starting after |
| startDateTo | date | No | Classes starting before |

**Authorization:** User must have `class:view-department` permission.

**Status:** ⚠️ Please confirm if this exists or needs creation

---

### 3. Department Students/Learners

**Endpoint:** `GET /api/v2/departments/:departmentId/learners`

**Purpose:** List all learners enrolled in courses within this department

**Query Params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| page | number | No | Pagination |
| limit | number | No | Items per page |
| search | string | No | Search by name/email |
| courseId | string | No | Filter by specific course enrollment |
| status | string | No | active, completed, withdrawn |

**Response should include:**
- Learner basic info (id, name, email)
- Number of active enrollments in department
- Overall progress percentage
- Last activity date

**Authorization:** User must have `student:view-department` permission.

**Status:** ⚠️ Please confirm if this exists or needs creation

---

### 4. Department Settings

**Endpoint:** `GET /api/v2/departments/:departmentId/settings`

**Purpose:** Get department-specific settings

**Response:**
```json
{
  "success": true,
  "data": {
    "departmentId": "...",
    "departmentName": "Engineering",
    "description": "...",
    "settings": {
      "defaultCourseVisibility": "department",
      "allowSelfEnrollment": true,
      "requireApprovalForEnrollment": false,
      "defaultClassCapacity": 30,
      "notificationPreferences": {...}
    }
  }
}
```

**Endpoint:** `PUT /api/v2/departments/:departmentId/settings`

**Purpose:** Update department settings

**Authorization:** User must have `department:edit` permission.

**Status:** ⚠️ Please confirm if this exists or needs creation

---

## Existing Endpoints - Confirmation Needed

Please confirm these existing endpoints support department filtering:

| Endpoint | Filter Param | Confirmed? |
|----------|--------------|------------|
| `GET /api/v2/courses` | `?departmentId=xxx` | ❓ |
| `GET /api/v2/classes` | `?departmentId=xxx` | ❓ |
| `POST /api/v2/courses` | `departmentId` in body | ❓ |

---

## Timeline Request

These endpoints are blocking UI-ISS-040 (Department-Scoped Pages). Please provide:
1. Which endpoints already exist
2. Timeline for creating missing endpoints
3. Any concerns about the proposed structure

---

**Contact:** UI Team  
**Related Issues:** UI-ISS-040, UI-ISS-041
