# UI Team - Department & Program Management API Requirements

## Date: 2026-01-20
## From: UI Team
## To: API Team
## Priority: Medium
## Related Issues: UI-ISS-048, UI-ISS-049, UI-ISS-050, UI-ISS-051, UI-ISS-052
## Related Spec: SPECS/DEPARTMENT_PROGRAM_MANAGEMENT_SPEC.md

---

## Overview

We are implementing a Department Management feature that allows department-admins and system-admins to manage subdepartments, programs, and certificates. This message outlines the API endpoints we need and proposes ideal contracts for your review.

---

## 1. Existing Endpoints (Please Confirm Availability)

### 1.1 Department Hierarchy
```
GET /api/v2/departments/:id/hierarchy
```
**Status:** Believed to exist
**Usage:** Fetching subdepartments for display

### 1.2 Department CRUD
```
POST /api/v2/departments
PUT /api/v2/departments/:id
DELETE /api/v2/departments/:id
```
**Status:** Believed to exist
**Usage:** Creating/editing subdepartments

### 1.3 Department Programs
```
GET /api/v2/departments/:id/programs
```
**Status:** Believed to exist (referenced in earlier messages)
**Usage:** Listing programs within a department

---

## 2. Required New Endpoints

### 2.1 Program CRUD

#### List Programs
```
GET /api/v2/programs?department={departmentId}
```

**Proposed Response:**
```json
{
  "success": true,
  "data": {
    "programs": [
      {
        "id": "prog_123",
        "name": "CBT Fundamentals",
        "code": "CBTF001",
        "description": "Introduction to Cognitive Behavioral Therapy",
        "departmentId": "dept_456",
        "departmentName": "Cognitive Therapy",
        "courses": [
          { "id": "course_1", "code": "COG101", "title": "Intro to CBT" },
          { "id": "course_2", "code": "COG102", "title": "CBT Techniques" }
        ],
        "courseCount": 2,
        "requiredCredits": 6,
        "status": "active",
        "certificate": {
          "enabled": true,
          "templateId": "tmpl_001",
          "autoIssue": true
        },
        "createdAt": "2026-01-15T10:00:00Z",
        "updatedAt": "2026-01-20T14:30:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "totalPages": 1
  }
}
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| department | string | Filter by department ID (required) |
| status | string | Filter by status (draft, active, archived) |
| search | string | Search by name/code |
| page | number | Pagination |
| limit | number | Items per page |

---

#### Get Single Program
```
GET /api/v2/programs/:id
```

**Proposed Response:**
```json
{
  "success": true,
  "data": {
    "id": "prog_123",
    "name": "CBT Fundamentals",
    "code": "CBTF001",
    "description": "Introduction to Cognitive Behavioral Therapy",
    "departmentId": "dept_456",
    "department": {
      "id": "dept_456",
      "name": "Cognitive Therapy"
    },
    "courses": [
      {
        "id": "course_1",
        "code": "COG101",
        "title": "Intro to CBT",
        "credits": 3,
        "order": 1
      },
      {
        "id": "course_2",
        "code": "COG102",
        "title": "CBT Techniques",
        "credits": 3,
        "order": 2
      }
    ],
    "requiredCredits": 6,
    "status": "active",
    "certificate": {
      "enabled": true,
      "templateId": "tmpl_001",
      "templateName": "Standard Certificate",
      "title": "Certificate of Completion",
      "signatoryName": "Dr. Jane Smith",
      "signatoryTitle": "Department Director",
      "validityPeriod": 24,
      "autoIssue": true
    },
    "stats": {
      "enrolledLearners": 45,
      "completedLearners": 12,
      "certificatesIssued": 12
    },
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-01-20T14:30:00Z",
    "createdBy": "user_789"
  }
}
```

---

#### Create Program
```
POST /api/v2/programs
```

**Proposed Request:**
```json
{
  "name": "CBT Fundamentals",
  "code": "CBTF001",
  "description": "Introduction to Cognitive Behavioral Therapy",
  "departmentId": "dept_456",
  "courses": ["course_1", "course_2"],
  "requiredCredits": 6,
  "status": "draft"
}
```

**Proposed Response:**
```json
{
  "success": true,
  "data": {
    "id": "prog_123",
    "name": "CBT Fundamentals",
    "code": "CBTF001",
    ...
  }
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| name | Required, 1-200 chars |
| code | Required, alphanumeric, max 35 chars, unique within department |
| departmentId | Required, must exist |
| courses | Optional, array of valid course IDs |
| status | Required, enum: draft, active, archived |

---

#### Update Program
```
PUT /api/v2/programs/:id
```

**Proposed Request:**
```json
{
  "name": "CBT Fundamentals - Updated",
  "description": "Updated description",
  "courses": ["course_1", "course_2", "course_3"],
  "requiredCredits": 9,
  "status": "active"
}
```

---

#### Delete/Archive Program
```
DELETE /api/v2/programs/:id
```

**Behavior:** Soft delete - sets status to "archived"

---

### 2.2 Program Certificate Configuration

#### Update Certificate Config
```
PUT /api/v2/programs/:id/certificate
```

**Proposed Request:**
```json
{
  "enabled": true,
  "templateId": "tmpl_001",
  "title": "Certificate of Completion",
  "signatoryName": "Dr. Jane Smith",
  "signatoryTitle": "Department Director",
  "validityPeriod": 24,
  "autoIssue": true
}
```

**Proposed Response:**
```json
{
  "success": true,
  "data": {
    "programId": "prog_123",
    "certificate": {
      "enabled": true,
      "templateId": "tmpl_001",
      ...
    }
  }
}
```

---

### 2.3 Certificate Templates

#### List Certificate Templates
```
GET /api/v2/certificate-templates
```

**Proposed Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "tmpl_001",
        "name": "Standard Certificate",
        "description": "Default certificate template",
        "thumbnailUrl": "/templates/standard-thumb.png",
        "scope": "system",
        "isDefault": true
      },
      {
        "id": "tmpl_002",
        "name": "Department Custom",
        "description": "Custom template for department",
        "thumbnailUrl": "/templates/custom-thumb.png",
        "scope": "department",
        "departmentId": "dept_456"
      }
    ]
  }
}
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| scope | string | Filter: system, organization, department |
| departmentId | string | Filter by department (for department-scoped) |

---

## 3. Summary of Requests

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `/api/v2/programs` | GET | List programs | High |
| `/api/v2/programs/:id` | GET | Get program | High |
| `/api/v2/programs` | POST | Create program | High |
| `/api/v2/programs/:id` | PUT | Update program | High |
| `/api/v2/programs/:id` | DELETE | Archive program | Medium |
| `/api/v2/programs/:id/certificate` | PUT | Configure certificate | Medium |
| `/api/v2/certificate-templates` | GET | List templates | Medium |

---

## 4. Questions for API Team

1. **Existing Endpoints:** Can you confirm which of the endpoints in Section 1 already exist and their current contracts?

2. **Program Entity:** Does a Program model already exist in the database? If so, what fields does it have?

3. **Certificate Templates:** Is there an existing certificate template system? If so, how is it structured?

4. **Courses in Programs:** Should course ordering be stored in the program (as proposed) or in a separate junction table?

5. **Soft Delete:** Is soft delete (archiving) the preferred approach for programs, or hard delete?

6. **Permissions:** What permission/access right names should we check for program management?

---

## 5. Timeline

We can begin UI development for:
- Sidebar navigation (no API needed)
- Page shell with existing department hierarchy endpoint
- Form components (mock data initially)

We are blocked on:
- Program list/display (needs GET /programs)
- Program CRUD operations (needs POST/PUT/DELETE /programs)
- Certificate configuration (needs PUT /programs/:id/certificate)

---

*This message was generated by the UI development team*
*Awaiting API team response before finalizing contracts*
