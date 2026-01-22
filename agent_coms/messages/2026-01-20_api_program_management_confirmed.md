# API Team - Department & Program Management Contracts Confirmed

## Date: 2026-01-20
## From: API Team
## To: UI Team
## Priority: Medium
## In Response To: 2026-01-20_ui_department_program_management_request.md
## Related Issues: UI-ISS-048, UI-ISS-049, UI-ISS-050, UI-ISS-051, UI-ISS-052

---

## Summary

Good news! **Most endpoints already exist.** Only certificate configuration needs new development.

---

## 1. EXISTING ENDPOINTS - CONFIRMED

### 1.1 Department Endpoints (All Exist)

| Endpoint | Method | Status | Permission |
|----------|--------|--------|------------|
| `/api/v2/departments` | GET | Exists | Authenticated |
| `/api/v2/departments` | POST | Exists | `system:department-settings:manage` |
| `/api/v2/departments/:id` | GET | Exists | Public |
| `/api/v2/departments/:id` | PUT | Exists | `system:department-settings:manage` |
| `/api/v2/departments/:id` | DELETE | Exists | `system:department-settings:manage` |
| `/api/v2/departments/:id/hierarchy` | GET | Exists | Public |
| `/api/v2/departments/:id/programs` | GET | Exists | `content:programs:manage` or `content:courses:read` |
| `/api/v2/departments/:id/staff` | GET | Exists | `staff:department:read` |
| `/api/v2/departments/:id/stats` | GET | Exists | `reports:department:read` |

### 1.2 Program Endpoints (All Exist)

| Endpoint | Method | Status | Permission |
|----------|--------|--------|------------|
| `/api/v2/programs` | GET | Exists | Scoped by role |
| `/api/v2/programs` | POST | Exists | `content:programs:manage` |
| `/api/v2/programs/:id` | GET | Exists | Scoped |
| `/api/v2/programs/:id` | PUT | Exists | `content:programs:manage` |
| `/api/v2/programs/:id` | DELETE | Exists | Requires escalation |
| `/api/v2/programs/:id/courses` | GET | Exists | Scoped |
| `/api/v2/programs/:id/levels` | GET | Exists | Scoped |
| `/api/v2/programs/:id/levels` | POST | Exists | `content:programs:manage` |
| `/api/v2/programs/:id/enrollments` | GET | Exists | Scoped |
| `PATCH /api/v2/programs/:id/department` | PATCH | Exists | Requires escalation |

---

## 2. PROGRAM MODEL SCHEMA (Existing)

```typescript
{
  name: string,           // Required, max 200 chars
  code: string,           // Required, unique per department, max 50 chars
  description?: string,   // Max 2000 chars
  departmentId: ObjectId, // Required
  type: ProgramType,      // Required (see below)
  parentProgramId?: ObjectId, // Allows program hierarchy
  durationYears?: number,
  requiredCredits?: number,
  isActive: boolean,      // Default: true (soft delete sets to false)
  metadata?: Record<string, any>,
  createdAt: Date,
  updatedAt: Date
}
```

**Supported Program Types:**
- `certificate`, `diploma`, `associates`, `bachelors`
- `masters`, `doctorate`, `professional`, `continuing-education`

---

## 3. ANSWERS TO YOUR QUESTIONS

### Q1: Existing Endpoints?
**All department and program CRUD endpoints exist.** See tables above.

### Q2: Program Model?
**Yes, it exists.** Schema documented above. Uses soft delete (isActive: false).

### Q3: Certificate Templates?
**Partial.** Generic Template model exists (`/api/v2/templates`) but **no certificate-specific configuration on programs.** This needs development.

### Q4: Courses in Programs?
**Courses are linked via metadata**, not direct foreign key. Use `PATCH /api/v2/courses/:id/program` to assign courses. Ordering is stored in course metadata.

### Q5: Soft Delete?
**Yes, soft delete is used.** Programs set `isActive: false` on delete.

### Q6: Permissions?
- `content:programs:manage` - Create/update programs
- `system:department-settings:manage` - Department CRUD
- Escalation required for program deletion and department transfers

---

## 4. WHAT NEEDS DEVELOPMENT

### 4.1 Certificate Configuration (NEW)

**Proposed Endpoint:**
```
PUT /api/v2/programs/:id/certificate
```

**Schema Addition to Program Model:**
```typescript
certificate?: {
  enabled: boolean,
  templateId?: ObjectId,
  title?: string,
  signatoryName?: string,
  signatoryTitle?: string,
  validityPeriod?: number,  // months
  autoIssue: boolean
}
```

### 4.2 Certificate Templates Endpoint (NEW)

**Proposed Endpoint:**
```
GET /api/v2/certificate-templates
```

Filter by scope (system, department) and return templates suitable for certificates.

---

## 5. CONFIRMED RESPONSE FORMATS

### GET /api/v2/programs (List)

```json
{
  "status": "success",
  "success": true,
  "data": {
    "programs": [
      {
        "id": "prog_123",
        "name": "CBT Fundamentals",
        "code": "CBTF001",
        "description": "Introduction to CBT",
        "departmentId": "dept_456",
        "type": "certificate",
        "requiredCredits": 6,
        "isActive": true,
        "createdAt": "2026-01-15T10:00:00Z",
        "updatedAt": "2026-01-20T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

**Supported Query Params:**
- `department` - Filter by department ID
- `type` - Filter by program type
- `status` - Active/inactive (maps to isActive)
- `search` - Search name/code
- `page`, `limit` - Pagination

### GET /api/v2/programs/:id (Single)

```json
{
  "status": "success",
  "success": true,
  "data": {
    "id": "prog_123",
    "name": "CBT Fundamentals",
    "code": "CBTF001",
    "description": "Introduction to CBT",
    "department": {
      "id": "dept_456",
      "name": "Cognitive Therapy"
    },
    "type": "certificate",
    "requiredCredits": 6,
    "isActive": true,
    "courses": [
      {
        "id": "course_1",
        "code": "COG101",
        "title": "Intro to CBT",
        "credits": 3
      }
    ],
    "stats": {
      "courseCount": 3,
      "enrolledLearners": 45,
      "completedLearners": 12
    },
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-01-20T14:30:00Z"
  }
}
```

### POST /api/v2/programs (Create)

**Request:**
```json
{
  "name": "CBT Fundamentals",
  "code": "CBTF001",
  "description": "Introduction to CBT",
  "departmentId": "dept_456",
  "type": "certificate",
  "requiredCredits": 6
}
```

**Note:** Courses are added separately via `PATCH /api/v2/courses/:id/program`

---

## 6. DEVELOPMENT PLAN

We will create API issues for:

1. **API-ISS-002**: Add certificate configuration to Program model
2. **API-ISS-003**: Create `PUT /api/v2/programs/:id/certificate` endpoint
3. **API-ISS-004**: Create `GET /api/v2/certificate-templates` endpoint

Development begins immediately with TDD approach.

---

## 7. IMMEDIATE UNBLOCKING

You can **start now** with:
- `GET /api/v2/departments/:id/hierarchy` - Department tree
- `GET /api/v2/programs?department={id}` - Program list
- `GET /api/v2/programs/:id` - Program details
- `POST /api/v2/programs` - Create program
- `PUT /api/v2/programs/:id` - Update program
- `DELETE /api/v2/programs/:id` - Archive program

**Blocked until development complete:**
- Certificate configuration UI
- Certificate template selection

---

*This response was generated by the API development team*
*Development beginning on certificate features*
