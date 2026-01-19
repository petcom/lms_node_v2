# Contract Change Recommendations: ISS-021

**Date:** 2026-01-14
**Issue:** API-ISS-021 - Grade Override & Billing Course View
**Impact:** BREAKING CHANGES - New endpoints, new permissions
**Compatibility:** No backward compatibility required (pre-production)

---

## Executive Summary

This document outlines all API contract changes required for ISS-021 implementation.

**Philosophy:** We are prioritizing **ideal API structure** over backward compatibility, as requested. Since the system is pre-production, we can make breaking changes freely to achieve the best possible API design.

---

## Overview of Changes

### New Contracts (1 file)

**File:** `contracts/api/grade-override.contract.ts` (NEW)
- Purpose: Document new grade override endpoints
- Endpoints: 2 new endpoints (PUT override, GET history)
- Breaking: Yes - entirely new functionality

---

### Updated Contracts (1 file)

**File:** `contracts/api/courses.contract.ts` (MODIFIED)
- Purpose: Document billing-admin access to course endpoints
- Changes: Authorization notes updated
- Breaking: No - additive only (new role gains access)

---

## Detailed Contract Changes

### 1. New Grade Override Contract

**File:** `contracts/api/grade-override.contract.ts` (NEW)

#### Endpoint 1: Override Grade

**Method:** PUT
**Path:** `/api/v1/enrollments/:enrollmentId/grades/override`
**Breaking Change:** Yes (new endpoint)

**Authorization:**
```typescript
{
  authentication: 'required',
  permission: 'grades:override',
  roleRequirement: 'dept-admin in course\'s department'
}
```

**Request Body:**
```typescript
interface GradeOverrideRequest {
  gradeLetter?: 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F';
  gradePercentage?: number;  // 0-100
  gradePoints?: number;      // 0-4.0
  reason: string;            // Required, 10-1000 chars

  // Optional validation fields
  previousGradeLetter?: string;
  previousGradePercentage?: number;
  previousGradePoints?: number;
}
```

**Validation Rules:**
| Field | Required | Type | Constraints | Error Code |
|-------|----------|------|-------------|------------|
| reason | Yes | string | 10-1000 chars, trimmed | 422 |
| gradeLetter | No | string | Valid letter grade | 422 |
| gradePercentage | No | number | 0-100 | 422 |
| gradePoints | No | number | 0-4.0 | 422 |
| *At least one grade field* | - | - | gradeLetter OR gradePercentage OR gradePoints | 422 |

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    enrollmentId: string;
    gradeChanges: {
      gradeLetter?: {
        previous?: string;
        new: string;
      };
      gradePercentage?: {
        previous?: number;
        new: number;
      };
      gradePoints?: {
        previous?: number;
        new: number;
      };
    };
    overrideBy: string;         // User ID of admin
    overrideByName: string;     // Full name of admin
    overrideAt: string;         // ISO 8601 timestamp
    reason: string;             // Justification provided
    changeLogId: string;        // Audit log entry ID
  }
}
```

**Error Responses:**
| Status | Condition | Response Body |
|--------|-----------|---------------|
| 401 | Not authenticated | `{ success: false, message: "Authentication required" }` |
| 403 | Missing grades:override permission | `{ success: false, message: "Permission denied: grades:override capability required" }` |
| 403 | Not dept-admin in department | `{ success: false, message: "Permission denied: Must be department admin for this course's department" }` |
| 404 | Enrollment not found | `{ success: false, message: "Enrollment not found" }` |
| 422 | Validation error | `{ success: false, message: "Reason is required and must be at least 10 characters" }` |
| 422 | No grade fields | `{ success: false, message: "At least one grade field must be provided" }` |
| 422 | Invalid grade value | `{ success: false, message: "Grade percentage must be between 0 and 100" }` |

**Example Request:**
```bash
PUT /api/v1/enrollments/64a5f8b2c3d4e5f6a7b8c9d0/grades/override
Authorization: Bearer <token>
Content-Type: application/json

{
  "gradePercentage": 85,
  "reason": "Grade appeal approved by academic committee after review of exam 2. Student demonstrated proficiency in missed concepts through supplemental assessment."
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "enrollmentId": "64a5f8b2c3d4e5f6a7b8c9d0",
    "gradeChanges": {
      "gradePercentage": {
        "previous": 72,
        "new": 85
      }
    },
    "overrideBy": "64a5f8b2c3d4e5f6a7b8c9e1",
    "overrideByName": "Dr. Jane Smith",
    "overrideAt": "2026-01-14T15:30:00.000Z",
    "reason": "Grade appeal approved by academic committee after review of exam 2. Student demonstrated proficiency in missed concepts through supplemental assessment.",
    "changeLogId": "64a5f8b2c3d4e5f6a7b8c9e2"
  }
}
```

**Rate Limiting:**
- 10 requests per minute per user
- Prevents bulk grade manipulation

**Audit Logging:**
- ✅ All changes create immutable audit log entry
- ✅ Audit log includes: who, what, when, why
- ✅ Audit log cannot be edited or deleted
- ✅ Compliant with FERPA requirements

---

#### Endpoint 2: Get Grade Change History

**Method:** GET
**Path:** `/api/v1/enrollments/:enrollmentId/grades/history`
**Breaking Change:** Yes (new endpoint)

**Authorization:**
```typescript
{
  authentication: 'required',
  permission: 'grades:override',  // Only dept-admin can view history
  roleRequirement: 'dept-admin'
}
```

**Query Parameters:**
```typescript
interface GradeHistoryQuery {
  startDate?: string;  // ISO 8601 date string
  endDate?: string;    // ISO 8601 date string
}
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: Array<{
    id: string;
    enrollmentId: string;
    classId: string;
    courseId: string;
    learnerId: string;
    fieldChanged: 'gradeLetter' | 'gradePercentage' | 'gradePoints' | 'all';
    previousGradeLetter?: string;
    newGradeLetter?: string;
    previousGradePercentage?: number;
    newGradePercentage?: number;
    previousGradePoints?: number;
    newGradePoints?: number;
    changedBy: string;
    changedByRole: string;
    changedAt: string;      // ISO 8601 timestamp
    reason: string;
    changeType: 'override';
    departmentId: string;
    termId?: string;
  }>
}
```

**Example Request:**
```bash
GET /api/v1/enrollments/64a5f8b2c3d4e5f6a7b8c9d0/grades/history?startDate=2026-01-01
Authorization: Bearer <token>
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "64a5f8b2c3d4e5f6a7b8c9e2",
      "enrollmentId": "64a5f8b2c3d4e5f6a7b8c9d0",
      "classId": "64a5f8b2c3d4e5f6a7b8c9d3",
      "courseId": "64a5f8b2c3d4e5f6a7b8c9d4",
      "learnerId": "64a5f8b2c3d4e5f6a7b8c9d5",
      "fieldChanged": "gradePercentage",
      "previousGradePercentage": 72,
      "newGradePercentage": 85,
      "changedBy": "64a5f8b2c3d4e5f6a7b8c9e1",
      "changedByRole": "dept-admin",
      "changedAt": "2026-01-14T15:30:00.000Z",
      "reason": "Grade appeal approved by academic committee after review of exam 2",
      "changeType": "override",
      "departmentId": "64a5f8b2c3d4e5f6a7b8c9d6"
    }
  ]
}
```

---

### 2. Updated Courses Contract

**File:** `contracts/api/courses.contract.ts` (MODIFIED)

#### Changes Required

**Endpoint:** `GET /api/v1/courses` (List Courses)

**BEFORE:**
```typescript
/**
 * GET /api/v1/courses
 *
 * AUTHORIZATION:
 * - Requires: courses:read permission
 * - Available to: system-admin, dept-admin, content-admin, instructor
 */
```

**AFTER:**
```typescript
/**
 * GET /api/v1/courses
 *
 * AUTHORIZATION:
 * - Requires: courses:read permission
 * - Available to: system-admin, dept-admin, content-admin, instructor, billing-admin
 *
 * CHANGE LOG:
 * - 2026-01-14 (ISS-021): Added billing-admin access for revenue correlation
 */
```

---

**Endpoint:** `GET /api/v1/courses/:id` (Get Course Details)

**BEFORE:**
```typescript
/**
 * GET /api/v1/courses/:id
 *
 * AUTHORIZATION:
 * - Requires: courses:read permission
 * - Available to: system-admin, dept-admin, content-admin, instructor
 */
```

**AFTER:**
```typescript
/**
 * GET /api/v1/courses/:id
 *
 * AUTHORIZATION:
 * - Requires: courses:read permission
 * - Available to: system-admin, dept-admin, content-admin, instructor, billing-admin
 *
 * CHANGE LOG:
 * - 2026-01-14 (ISS-021): Added billing-admin access for revenue correlation
 *
 * NOTE FOR BILLING-ADMIN:
 * - Can view course details (title, description, credits, pricing)
 * - CANNOT access modules or content (requires content:read permission)
 * - CANNOT edit courses (requires courses:write permission)
 */
```

---

**No Changes to Other Endpoints:**

These endpoints remain unchanged (billing-admin does NOT gain access):
- `PUT /api/v1/courses/:id` - Still requires `courses:write` (billing-admin excluded)
- `DELETE /api/v1/courses/:id` - Still requires `courses:delete` (billing-admin excluded)
- `POST /api/v1/courses` - Still requires `courses:write` (billing-admin excluded)
- `GET /api/v1/courses/:id/modules` - Still requires `content:read` (billing-admin excluded)

---

## Permission System Changes

### New Permission: grades:override

**Permission String:** `grades:override`

**Definition:**
```typescript
{
  resource: 'grades',
  action: 'override',
  name: 'grades:override',
  description: 'Ability to override/correct student grades with mandatory audit logging',
  scope: 'department',  // Admin must be in course's department
  group: 'academic',
  isSystemPermission: true,
  conditions: {
    requiresRole: 'dept-admin',
    requiresAuditLog: true,
    requiresReason: true
  }
}
```

**Assigned To:**
- `department-admin` role (dept-admin)

**NOT Assigned To:**
- instructor (can grade initially, cannot override)
- content-admin (content only, no grading)
- billing-admin (financial only, no academic)
- learner (no admin capabilities)

**Use Cases:**
1. Grade appeals/disputes
2. Grading errors correction
3. Administrative adjustments
4. Academic integrity case resolutions

---

### Updated Permission: courses:read

**Permission String:** `courses:read` (existing, assignment updated)

**Definition:**
```typescript
{
  resource: 'courses',
  action: 'read',
  name: 'courses:read',
  description: 'Ability to view course list and course details',
  scope: 'all',
  group: 'courses',
  isSystemPermission: true
}
```

**Already Assigned To:**
- system-admin
- dept-admin
- content-admin
- instructor

**NEW Assignment:**
- billing-admin (ISS-021)

**Rationale:**
- Billing needs to correlate revenue with courses
- View-only access is safe (no edit capability)
- Separate from content:read (billing cannot access modules/lessons)

---

## Role Capability Updates

### dept-admin Role

**BEFORE:**
```typescript
'department-admin': {
  level: 80,
  description: 'Department administrator with department-scoped permissions',
  permissions: [
    'users:read', 'users:write',
    'courses:read', 'courses:write', 'courses:manage',
    'content:read', 'content:write', 'content:manage',
    'enrollments:read', 'enrollments:write', 'enrollments:manage',
    'assessments:read', 'assessments:write',
    'reports:read', 'reports:write'
  ]
}
```

**AFTER:**
```typescript
'department-admin': {
  level: 80,
  description: 'Department administrator with department-scoped permissions',
  permissions: [
    'users:read', 'users:write',
    'courses:read', 'courses:write', 'courses:manage',
    'content:read', 'content:write', 'content:manage',
    'enrollments:read', 'enrollments:write', 'enrollments:manage',
    'assessments:read', 'assessments:write',
    'grades:override',     // ← NEW (ISS-021)
    'reports:read', 'reports:write'
  ]
}
```

---

### billing-admin Role

**BEFORE:**
```typescript
'billing-admin': {
  level: 50,
  description: 'Billing and payment administrator',
  permissions: [
    'users:read',
    'enrollments:read',
    'reports:read', 'reports:write'
  ]
}
```

**AFTER:**
```typescript
'billing-admin': {
  level: 50,
  description: 'Billing and payment administrator',
  permissions: [
    'users:read',
    'courses:read',        // ← NEW (ISS-021)
    'enrollments:read',
    'reports:read', 'reports:write'
  ]
}
```

---

## Database Schema Changes

### New Collection: GradeChangeLog

**Collection Name:** `gradechangelogs`

**Purpose:** Immutable audit trail for all grade overrides

**Schema:**
```typescript
{
  _id: ObjectId,
  enrollmentId: ObjectId (ref: ClassEnrollment, indexed, immutable),
  classId: ObjectId (ref: Class, indexed, immutable),
  courseId: ObjectId (ref: Course, indexed, immutable),
  learnerId: ObjectId (ref: User, indexed, immutable),

  fieldChanged: 'gradeLetter' | 'gradePercentage' | 'gradePoints' | 'all',
  previousGradeLetter?: string,
  newGradeLetter?: string,
  previousGradePercentage?: number,
  newGradePercentage?: number,
  previousGradePoints?: number,
  newGradePoints?: number,

  changedBy: ObjectId (ref: User, indexed, immutable),
  changedByRole: string (immutable),
  changedAt: Date (indexed, immutable),
  reason: string (required, 10-1000 chars, immutable),
  changeType: 'override' (immutable),

  departmentId: ObjectId (ref: Department, indexed, immutable),
  termId?: ObjectId (ref: AcademicTerm, indexed, immutable),

  metadata?: object,
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes:**
```javascript
{ enrollmentId: 1, changedAt: -1 }      // Most common query
{ learnerId: 1, changedAt: -1 }         // Learner audit
{ changedBy: 1, changedAt: -1 }         // Admin accountability
{ classId: 1, changedAt: -1 }           // Class reports
{ departmentId: 1, changedAt: -1 }      // Dept oversight
```

**Immutability Enforcement:**
- All fields marked `immutable: true` in Mongoose schema
- Pre-hooks prevent `findOneAndUpdate`
- Pre-hooks prevent `findOneAndDelete`
- No update/delete API endpoints exposed

**Estimated Size:**
- Document size: ~300 bytes per record
- Expected growth: 50-200 records per term
- Storage impact: Minimal (<100KB per term)

---

## Breaking Changes Summary

### ✅ New Endpoints (Breaking)

1. `PUT /api/v1/enrollments/:enrollmentId/grades/override`
   - **Impact:** New functionality, no backward compatibility issue
   - **Required For:** Grade override feature
   - **Breaking:** Yes (new endpoint)

2. `GET /api/v1/enrollments/:enrollmentId/grades/history`
   - **Impact:** New functionality, no backward compatibility issue
   - **Required For:** Grade audit trail viewing
   - **Breaking:** Yes (new endpoint)

---

### ✅ Permission Changes (Breaking)

1. **New Permission:** `grades:override`
   - **Impact:** New permission, must be seeded/migrated
   - **Assigned To:** dept-admin
   - **Breaking:** Yes (requires permission system update)

2. **Updated Permission:** `courses:read` → billing-admin
   - **Impact:** Additive only, no removal
   - **Breaking:** No (billing-admin gains access, no one loses access)

---

### ✅ Database Changes (Breaking)

1. **New Collection:** `gradechangelogs`
   - **Impact:** New collection, no migration of existing data
   - **Breaking:** Yes (new schema)

---

### ❌ No Backward Compatibility Required

**Rationale:**
- System is pre-production
- No existing UI depends on these endpoints
- No existing users have grades:override permission yet
- New functionality is purely additive

**Philosophy Applied:**
> "Prefer breaking changes for maintaining an ideal API structure, rather than compatibility"

We are implementing the **ideal** API design:
- Clean endpoint structure (`/enrollments/:id/grades/override`)
- Proper HTTP verbs (PUT for updates)
- Comprehensive validation
- Strong typing
- Immutable audit trail

---

## Migration Requirements

### Development Environment

**No data migration required** - all changes are additive

**Steps:**
1. Deploy schema changes (GradeChangeLog model)
2. Deploy code changes (services, controllers, routes)
3. Seed new permissions (`grades:override`)
4. Update role definitions (dept-admin, billing-admin)
5. Run integration tests

**Estimated Time:** 30 minutes

---

### Staging Environment

**Steps:**
1. Backup database (precautionary)
2. Deploy API changes
3. Create `gradechangelogs` collection
4. Seed/migrate permissions
5. Test grade override workflow manually
6. Test billing-admin course access
7. Verify audit logging

**Estimated Time:** 1 hour

---

### Production Environment

**Steps:**
1. **Pre-deployment:**
   - Full database backup
   - Create `gradechangelogs` collection
   - Verify permission system operational

2. **Deployment:**
   - Deploy API code (zero downtime deployment)
   - Run permission migration script:
     ```bash
     npm run migrate:permissions -- --add grades:override --role dept-admin
     npm run migrate:permissions -- --add courses:read --role billing-admin
     ```

3. **Post-deployment:**
   - Smoke tests on grade override endpoint (expect 403 for non-admins)
   - Verify billing-admin can access course endpoints
   - Monitor logs for permission errors
   - Notify dept-admin users of new capability (via email/announcement)

4. **Rollback Plan:**
   - Remove `grades:override` from dept-admin role
   - Remove `courses:read` from billing-admin role
   - Disable grade override routes (comment out in app)
   - Audit log data can remain (immutable, no harm)

**Estimated Time:** 2 hours (includes monitoring)

---

## Testing Requirements

### Contract Validation Tests

**Purpose:** Ensure API responses match contract specifications exactly

**Test Cases:**
1. Grade override response matches contract schema
2. Grade history response matches contract schema
3. Error responses match contract error format
4. All required fields present in responses
5. Field types match contract definitions
6. Enum values validated against contract

**Expected Test Count:** 10 contract validation tests

---

### Authorization Tests

**Purpose:** Verify permission system works as specified

**Test Cases:**
1. dept-admin WITH grades:override CAN override grades
2. dept-admin WITHOUT grades:override CANNOT override grades
3. instructor CANNOT override grades (no permission)
4. billing-admin CAN access GET /api/v1/courses
5. billing-admin CAN access GET /api/v1/courses/:id
6. billing-admin CANNOT access PUT /api/v1/courses/:id
7. dept-admin must be in course's department to override

**Expected Test Count:** 7 authorization tests

---

### Integration Tests

**Purpose:** Verify end-to-end functionality

**Test Cases:**
- See IMPLEMENTATION_PLAN_ISS-021.md for full list (40 tests total)

---

## UI Team Integration Notes

### Grade Override Integration

**New API Available:**
```typescript
// TypeScript interface for UI
interface GradeOverrideAPI {
  overrideGrade(
    enrollmentId: string,
    data: {
      gradeLetter?: string;
      gradePercentage?: number;
      gradePoints?: number;
      reason: string;
    }
  ): Promise<{
    success: boolean;
    data: GradeOverrideResult;
  }>;

  getGradeHistory(
    enrollmentId: string,
    filters?: { startDate?: string; endDate?: string }
  ): Promise<{
    success: boolean;
    data: GradeChangeLog[];
  }>;
}
```

**UI Requirements:**
1. Show grade override button/link for dept-admin users only
2. Modal/form with:
   - Current grade display (read-only)
   - New grade input (percentage, letter, or points)
   - Reason textarea (required, 10-1000 chars, with character counter)
   - Confirmation step ("Are you sure?")
3. Success message with change summary
4. Error handling for validation failures
5. Optional: Grade history view (show audit trail)

**Validation Feedback:**
- "Reason must be at least 10 characters" (realtime validation)
- "Grade percentage must be between 0 and 100"
- "At least one grade field is required"

---

### Billing Course View Integration

**No Code Changes Required!**

The UI already has course list/detail routes:
- `/staff/courses` (list)
- `/staff/courses/:id` (details)

billing-admin users will automatically gain access to these routes once permission is deployed.

**Optional Enhancements:**
- Add note in UI: "You have view-only access to courses"
- Disable edit buttons for billing-admin (show view-only mode)

---

## Comparison: Current vs. Ideal API Structure

### Why This is the Ideal Design

**1. RESTful Nested Resources:**
```
✅ IDEAL:  PUT /api/v1/enrollments/:id/grades/override
❌ AVOID:  POST /api/v1/override-grade
❌ AVOID:  PUT /api/v1/grades/override/:enrollmentId
```
- Nested under enrollments (grades belong to enrollments)
- Clear hierarchy and resource relationships
- Standard REST conventions

**2. Proper HTTP Verbs:**
```
✅ IDEAL:  PUT /grades/override  (updating a grade)
❌ AVOID:  POST /grades/override (POST implies creation)
```
- PUT for updates, POST for creation
- Idempotent operation (can retry safely)

**3. Descriptive Endpoint Names:**
```
✅ IDEAL:  /grades/override (clear intent)
❌ AVOID:  /grades/change
❌ AVOID:  /grades/edit
❌ AVOID:  /modify-grade
```
- "Override" conveys the special nature (not a normal grade update)
- Distinguishes from instructor grading

**4. Comprehensive Validation:**
- Reason field required (audit compliance)
- Grade range validation (prevent invalid data)
- Permission + role checks (multi-layer security)

**5. Immutable Audit Trail:**
- Separate collection (not embedded in enrollment)
- Cannot be modified (true audit log)
- Indexed for fast queries

**6. Clear Error Messages:**
- HTTP status codes match error type (401, 403, 404, 422)
- Detailed error messages (not generic "error occurred")
- Actionable feedback for UI developers

---

## Backward Compatibility Analysis

### ✅ Zero Impact on Existing Endpoints

**Unchanged Endpoints:**
- All existing enrollment endpoints work as before
- No changes to request/response formats
- No changes to existing permission checks

**Proof:**
```typescript
// Existing endpoint (unchanged):
GET /api/v1/enrollments/:id
Response: { success: true, data: { ...enrollment } }

// No changes to response format
// No changes to authorization
// No changes to behavior
```

---

### ✅ Additive Permission Changes

**billing-admin gains access, no one loses access:**
```typescript
// BEFORE:
GET /api/v1/courses → Allowed: [system-admin, dept-admin, content-admin, instructor]

// AFTER:
GET /api/v1/courses → Allowed: [system-admin, dept-admin, content-admin, instructor, billing-admin]

// ✅ No existing users lose access
// ✅ Only billing-admin gains new access
```

---

### ✅ No Data Migration Required

**Reasoning:**
- New collection (gradechangelogs) starts empty
- No changes to existing ClassEnrollment documents
- No changes to existing User/Staff documents
- Permissions are in-memory (BUILT_IN_ROLES)

---

## Approval Checklist

Before implementation begins:

- [ ] API contract changes reviewed and approved
- [ ] Breaking changes acknowledged (new endpoints, new permissions)
- [ ] Database schema changes approved
- [ ] Permission updates approved (dept-admin, billing-admin)
- [ ] UI team notified of new endpoints
- [ ] Security review complete (audit log immutability)
- [ ] Testing requirements agreed upon (40 tests)
- [ ] Timeline approved (6-8 hours parallelized)

---

## Questions for Review

1. **Grade Override Scope:**
   - Should grade overrides be department-scoped only, or should system-admin have global override capability?
   - Current plan: dept-admin only (department-scoped)

2. **Grade History Access:**
   - Should learners be able to see their own grade change history?
   - Current plan: dept-admin only (privacy consideration)

3. **Audit Log Retention:**
   - Should grade change logs have a retention policy (e.g., delete after 7 years)?
   - Current plan: Retain indefinitely (immutable audit trail)

4. **Bulk Grade Overrides:**
   - Should we support bulk grade overrides (multiple enrollments at once)?
   - Current plan: Single enrollment per request (simpler, safer)

5. **Rate Limiting:**
   - Is 10 requests per minute sufficient for grade overrides?
   - Current plan: 10/minute (prevents abuse, allows legitimate use)

---

**Document Status:** ✅ Complete, Ready for Review
**Next Step:** Get approval from stakeholders before implementation
**Approval Required From:**
- Technical Lead (API structure)
- Security Team (audit logging)
- Compliance Team (FERPA requirements)
- UI Team (integration feasibility)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-14
**Author:** API Agent
**Reviewed By:** Pending
