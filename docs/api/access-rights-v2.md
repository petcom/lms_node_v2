# Access Rights API Documentation

**Version:** 2.0.0
**Base URL:** `/api/v2/access-rights`
**Last Updated:** 2026-01-11

---

## Table of Contents

1. [Overview](#overview)
2. [Access Rights Pattern](#access-rights-pattern)
3. [Sensitive Data Categories](#sensitive-data-categories)
4. [Access Rights by Domain](#access-rights-by-domain)
5. [API Endpoints](#api-endpoints)
6. [Usage Examples](#usage-examples)
7. [Best Practices](#best-practices)

---

## Overview

The Access Rights system provides fine-grained, GNAP-compatible authorization for the LMS. Access rights follow a standardized pattern and are organized by functional domains.

### Key Concepts

- **Access Rights**: Granular permissions following `domain:resource:action` pattern
- **Domains**: Functional areas (content, enrollment, staff, learner, reports, system, billing, audit, grades)
- **Wildcards**: Use `domain:*` to grant all rights within a domain (admin use only)
- **Sensitive Rights**: Special rights flagged for FERPA, PII, billing, or audit compliance
- **Role-Based Assignment**: Access rights are assigned to roles, not directly to users

---

## Access Rights Pattern

### Format

All access rights follow this pattern:
```
domain:resource:action
```

### Components

- **Domain**: Functional area (e.g., `content`, `enrollment`, `billing`)
- **Resource**: Specific entity within domain (e.g., `courses`, `students`, `payments`)
- **Action**: Operation type (e.g., `read`, `manage`, `process`)

### Examples

```
content:courses:read        → View course details and content
content:courses:manage      → Full control over courses (CRUD)
enrollment:own:read         → View own enrollments
enrollment:department:manage → Manage department enrollments
billing:payments:process    → Process payment transactions
system:*                    → All system administration rights (wildcard)
```

### Validation Rules

- Only lowercase letters and hyphens allowed
- Must have exactly 3 parts separated by colons
- No spaces or special characters
- Format enforced by validator: `/^[a-z-]+:[a-z-]+:[a-z-]+$/`

---

## Sensitive Data Categories

Access rights can be flagged as sensitive for compliance purposes:

### FERPA (Family Educational Rights and Privacy Act)

Protected educational records and student information:

- `learner:pii:read` - View student personally identifiable information
- `learner:grades:read` - View student grades
- `learner:transcripts:read` - View student transcripts
- `learner:disciplinary:read` - View disciplinary records
- `learner:contact:read` - View student contact information
- `learner:emergency:read` - View emergency contact information

**Compliance Notes:**
- FERPA rights require explicit consent or legitimate educational interest
- Audit all access to FERPA-protected data
- Implement role-based restrictions

### Billing

Financial and payment information:

- `billing:payments:read` - View payment records
- `billing:payments:process` - Process payment transactions
- `billing:refunds:process` - Process refund transactions
- `billing:department:read` - View department billing information
- `billing:department:manage` - Manage department billing settings
- `reports:billing:read` - View billing reports
- `reports:financial:read` - View financial reports

**Compliance Notes:**
- PCI DSS compliance required for payment processing
- Restrict to authorized financial staff only
- Implement multi-factor authentication for sensitive operations

### PII (Personally Identifiable Information)

Personal information requiring protection:

- `learner:contact:read` - View contact information
- `learner:emergency:read` - View emergency contacts
- `staff:personal:read` - View staff personal information
- `staff:contact:read` - View staff contact information

**Compliance Notes:**
- GDPR/CCPA compliance for personal data
- Minimize data collection and retention
- Implement right to erasure

### Audit

System audit and compliance logging:

- `audit:logs:read` - View audit logs
- `audit:logs:export` - Export audit logs
- `audit:enrollment:read` - View enrollment audit trail
- `audit:content:read` - View content change audit trail
- `audit:billing:read` - View billing audit trail

**Compliance Notes:**
- Audit log access should be restricted
- Maintain integrity of audit records
- Retain according to compliance requirements

---

## Access Rights by Domain

### Content Domain

Course content and learning materials:

| Access Right | Description | Roles |
|--------------|-------------|-------|
| `content:courses:read` | View course details and content | All learner roles, instructor |
| `content:courses:manage` | Full control over courses (CRUD) | content-admin, department-admin |
| `content:lessons:read` | Access lesson content | All learner roles, instructor |
| `content:lessons:manage` | Create, edit, delete lessons | content-admin, department-admin |
| `content:programs:manage` | Manage academic programs | content-admin, department-admin |
| `content:assessments:manage` | Manage quizzes, exams, assignments | content-admin, instructor |
| `content:discussions:moderate` | Moderate course discussions | learner-supervisor, instructor |
| `content:templates:manage` | Manage content templates | theme-admin, content-admin |
| `content:*` | All content rights (wildcard) | department-admin, course-admin |

### Enrollment Domain

Student enrollment and registration:

| Access Right | Description | Roles |
|--------------|-------------|-------|
| `enrollment:own:read` | View own enrollments | course-taker, auditor |
| `enrollment:own:manage` | Enroll/drop courses | course-taker |
| `enrollment:department:read` | View department enrollments | instructor, department-admin |
| `enrollment:department:manage` | Manage department enrollments | department-admin |
| `enrollment:*` | All enrollment rights (wildcard) | enrollment-admin |

### Staff Domain

Staff and instructor management:

| Access Right | Description | Roles |
|--------------|-------------|-------|
| `staff:department:read` | View department staff roster | department-admin |
| `staff:department:manage` | Manage staff in department | department-admin |
| `staff:personal:read` | View staff personal information (sensitive) | system-admin |
| `staff:contact:read` | View staff contact information (sensitive) | department-admin |
| `staff:*` | All staff rights (wildcard) | system-admin |

### Learner Domain

Student information and progress:

| Access Right | Description | Roles |
|--------------|-------------|-------|
| `learner:peer-progress:read` | View peer learner progress | learner-supervisor |
| `learner:pii:read` | View student PII (FERPA-sensitive) | department-admin, enrollment-admin |
| `learner:grades:read` | View student grades (FERPA-sensitive) | instructor, department-admin |
| `learner:contact:read` | View contact information (PII-sensitive) | instructor, department-admin |
| `learner:transcripts:read` | View student transcripts (FERPA) | enrollment-admin |
| `learner:emergency:read` | View emergency contacts (PII) | department-admin |
| `learner:*` | All learner rights (wildcard) | enrollment-admin, system-admin |

### Grades Domain

Grade management and viewing:

| Access Right | Description | Roles |
|--------------|-------------|-------|
| `grades:own:read` | View own grades | course-taker, auditor |
| `grades:own-classes:read` | View grades for own classes | instructor |
| `grades:own-classes:manage` | Grade student work in own classes | instructor |
| `grades:department:read` | View all department grades | department-admin |
| `grades:*` | All grade rights (wildcard) | enrollment-admin, system-admin |

### Reports Domain

Analytics and reporting:

| Access Right | Description | Roles |
|--------------|-------------|-------|
| `reports:own-classes:read` | View reports for own classes | instructor |
| `reports:department:read` | View all department reports | department-admin |
| `reports:content:read` | View content analytics | content-admin |
| `reports:billing:read` | View billing reports (sensitive) | billing-admin, financial-admin |
| `reports:financial:read` | View financial reports (sensitive) | financial-admin |
| `reports:enrollment:read` | View enrollment reports | enrollment-admin |
| `reports:*` | All report rights (wildcard) | system-admin |

### System Domain

System administration and configuration:

| Access Right | Description | Roles |
|--------------|-------------|-------|
| `system:department-settings:manage` | Manage department settings | department-admin |
| `system:themes:manage` | Manage themes | theme-admin |
| `system:branding:manage` | Manage branding | theme-admin |
| `system:ui-settings:manage` | Manage UI settings | theme-admin |
| `system:payment-gateway:manage` | Manage payment gateways (sensitive) | financial-admin |
| `system:*` | All system rights (wildcard) | system-admin |

### Billing Domain

Financial transactions and billing:

| Access Right | Description | Roles |
|--------------|-------------|-------|
| `billing:department:read` | View department billing (sensitive) | billing-admin |
| `billing:department:manage` | Manage department billing (sensitive) | billing-admin |
| `billing:payments:read` | View payment records (sensitive) | billing-admin, financial-admin |
| `billing:payments:process` | Process payments (sensitive) | billing-admin, financial-admin |
| `billing:refunds:process` | Process refunds (sensitive) | financial-admin |
| `billing:*` | All billing rights (wildcard) | financial-admin |

### Audit Domain

System auditing and compliance:

| Access Right | Description | Roles |
|--------------|-------------|-------|
| `audit:logs:read` | View audit logs (sensitive) | system-admin |
| `audit:logs:export` | Export audit logs (sensitive) | system-admin |
| `audit:enrollment:read` | View enrollment audit trail (sensitive) | enrollment-admin |
| `audit:content:read` | View content audit trail (sensitive) | course-admin |
| `audit:billing:read` | View billing audit trail (sensitive) | financial-admin |
| `audit:*` | All audit rights (wildcard) | system-admin |

---

## API Endpoints

### GET /access-rights

List all available access rights in the system.

**Authentication:** Required (Bearer token)

**Query Parameters:**
- `domain` (optional): Filter by domain (e.g., `content`, `enrollment`)
- `sensitiveOnly` (optional): Only return sensitive rights (default: `false`)

**Response:**
```json
{
  "success": true,
  "data": {
    "accessRights": [
      {
        "id": "507f1f77bcf86cd799439020",
        "name": "content:courses:read",
        "domain": "content",
        "resource": "courses",
        "action": "read",
        "description": "View course details and content",
        "isSensitive": false,
        "isActive": true
      }
    ],
    "byDomain": {
      "content": [...],
      "enrollment": [...],
      "staff": [...],
      "learner": [...],
      "reports": [...],
      "system": [...],
      "billing": [...],
      "audit": [...],
      "grades": [...]
    },
    "sensitive": {
      "ferpa": [...],
      "billing": [...],
      "pii": [...],
      "audit": [...]
    }
  }
}
```

**Example Request:**
```bash
curl -X GET \
  http://localhost:3000/api/v2/access-rights?domain=content \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Example Response (filtered by domain):**
```json
{
  "success": true,
  "data": {
    "accessRights": [
      {
        "id": "507f1f77bcf86cd799439020",
        "name": "content:courses:read",
        "domain": "content",
        "resource": "courses",
        "action": "read",
        "description": "View course details and content",
        "isSensitive": false,
        "isActive": true
      },
      {
        "id": "507f1f77bcf86cd799439021",
        "name": "content:courses:manage",
        "domain": "content",
        "resource": "courses",
        "action": "manage",
        "description": "Full control over courses (CRUD)",
        "isSensitive": false,
        "isActive": true
      }
    ],
    "byDomain": {
      "content": [...]
    },
    "sensitive": {}
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token

---

### GET /access-rights/domain/:domain

Get all access rights for a specific domain.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `domain` (required): Domain name (e.g., `content`, `enrollment`)

**Response:**
```json
{
  "success": true,
  "data": {
    "domain": "content",
    "accessRights": [...]
  }
}
```

**Example Request:**
```bash
curl -X GET \
  http://localhost:3000/api/v2/access-rights/domain/content \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `404 Not Found`: Domain not found

---

### GET /access-rights/role/:roleName

Get all access rights granted by a specific role.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `roleName` (required): Role name (e.g., `instructor`, `content-admin`)

**Response:**
```json
{
  "success": true,
  "data": {
    "role": {
      "id": "507f1f77bcf86cd799439011",
      "name": "instructor",
      "userType": "staff",
      "displayName": "Instructor",
      "description": "Teaches classes, grades student work",
      "accessRights": [
        "content:courses:read",
        "grades:own-classes:manage"
      ],
      "isActive": true
    },
    "accessRights": [
      {
        "id": "507f1f77bcf86cd799439020",
        "name": "content:courses:read",
        "domain": "content",
        "resource": "courses",
        "action": "read",
        "description": "View course details",
        "isSensitive": false,
        "isActive": true
      },
      {
        "id": "507f1f77bcf86cd799439030",
        "name": "grades:own-classes:manage",
        "domain": "grades",
        "resource": "own-classes",
        "action": "manage",
        "description": "Grade student work",
        "isSensitive": false,
        "isActive": true
      }
    ],
    "effectiveRights": [
      "content:courses:read",
      "grades:own-classes:manage"
    ]
  }
}
```

**Example Request:**
```bash
curl -X GET \
  http://localhost:3000/api/v2/access-rights/role/instructor \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Notes:**
- `effectiveRights` array expands wildcards (e.g., `system:*` becomes all system rights)
- Use this to determine exact permissions for a role

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token
- `404 Not Found`: Role not found

---

## Usage Examples

### Client-Side Permission Checking

```javascript
/**
 * Check if user has a specific access right
 */
function hasAccessRight(userRights, requiredRight) {
  // Direct match
  if (userRights.includes(requiredRight)) {
    return true;
  }

  // Check wildcard
  const [domain] = requiredRight.split(':');
  if (userRights.includes(`${domain}:*`)) {
    return true;
  }

  return false;
}

// Example usage
const userRights = [
  'content:courses:read',
  'content:courses:manage',
  'enrollment:department:read'
];

console.log(hasAccessRight(userRights, 'content:courses:read'));    // true
console.log(hasAccessRight(userRights, 'content:lessons:manage'));  // false

// With wildcard
const adminRights = ['system:*', 'content:*'];
console.log(hasAccessRight(adminRights, 'content:courses:manage')); // true (wildcard match)
console.log(hasAccessRight(adminRights, 'system:themes:manage'));   // true (wildcard match)
```

### Checking Multiple Rights

```javascript
/**
 * Check if user has ANY of the required rights
 */
function hasAnyAccessRight(userRights, requiredRights) {
  return requiredRights.some(right => hasAccessRight(userRights, right));
}

/**
 * Check if user has ALL of the required rights
 */
function hasAllAccessRights(userRights, requiredRights) {
  return requiredRights.every(right => hasAccessRight(userRights, right));
}

// Example: Show "Create Course" button if user can manage courses
const showCreateButton = hasAccessRight(
  user.currentDepartmentAccessRights,
  'content:courses:manage'
);

// Example: Show "Billing Report" if user has either billing or report access
const showBillingReport = hasAnyAccessRight(
  user.currentDepartmentAccessRights,
  ['billing:department:read', 'reports:billing:read']
);
```

### React Hook Example

```javascript
import { useAuth } from './AuthContext';

/**
 * Hook to check access rights
 */
function useAccessRight(requiredRight) {
  const { user } = useAuth();

  if (!user || !user.currentDepartmentAccessRights) {
    return false;
  }

  return hasAccessRight(user.currentDepartmentAccessRights, requiredRight);
}

/**
 * Component that conditionally renders based on access
 */
function CourseManagement() {
  const canManageCourses = useAccessRight('content:courses:manage');
  const canViewReports = useAccessRight('reports:content:read');

  return (
    <div>
      <h1>Courses</h1>

      {canManageCourses && (
        <button>Create Course</button>
      )}

      {canViewReports && (
        <a href="/reports/content">View Analytics</a>
      )}
    </div>
  );
}
```

### Fetching Access Rights for a Role

```javascript
/**
 * Get access rights for a specific role
 */
async function getRoleAccessRights(roleName) {
  const response = await fetch(
    `http://localhost:3000/api/v2/access-rights/role/${roleName}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();
  return data.data.effectiveRights;
}

// Example usage
const instructorRights = await getRoleAccessRights('instructor');
console.log(instructorRights);
// ['content:courses:read', 'grades:own-classes:manage', ...]
```

---

## Best Practices

### 1. Use Access Rights, Not Role Names

**Bad:**
```javascript
// Don't check role names directly
if (user.roles.includes('instructor')) {
  // show grading interface
}
```

**Good:**
```javascript
// Check access rights instead
if (hasAccessRight(user.accessRights, 'grades:own-classes:manage')) {
  // show grading interface
}
```

**Why:** Roles can have different permissions over time, but access rights are stable.

### 2. Check Department Context

```javascript
// Always use department-specific access rights
const departmentRights = user.departmentMemberships.find(
  m => m.departmentId === currentDepartmentId
)?.accessRights || [];

const canManageCourses = hasAccessRight(departmentRights, 'content:courses:manage');
```

### 3. Handle Wildcards Correctly

```javascript
// Wildcard rights grant all permissions in that domain
function hasAccessRight(userRights, requiredRight) {
  if (userRights.includes(requiredRight)) return true;

  const [domain] = requiredRight.split(':');
  return userRights.includes(`${domain}:*`);
}
```

### 4. Sensitive Rights Require Extra Validation

```javascript
// For sensitive operations, check both access right and context
function canViewStudentGrades(user, studentId) {
  // Has the access right?
  if (!hasAccessRight(user.accessRights, 'learner:grades:read')) {
    return false;
  }

  // Additional validation for FERPA compliance
  const hasLegitimateEducationalInterest =
    isInstructorForStudent(user, studentId) ||
    isDepartmentAdminForStudent(user, studentId);

  return hasLegitimateEducationalInterest;
}
```

### 5. Cache Access Rights Locally

```javascript
// Cache user's access rights in application state
const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessRights, setAccessRights] = useState([]);

  useEffect(() => {
    if (user?.currentDepartmentId) {
      const membership = user.departmentMemberships.find(
        m => m.departmentId === user.currentDepartmentId
      );
      setAccessRights(membership?.accessRights || []);
    }
  }, [user?.currentDepartmentId]);

  return (
    <AuthContext.Provider value={{ user, accessRights }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 6. Server-Side Validation is Required

```javascript
// Client-side checks are for UX only
// ALWAYS validate on the server

// Client (hide button)
const canCreateCourse = hasAccessRight(user.accessRights, 'content:courses:manage');

// Server (enforce permission)
router.post('/courses',
  isAuthenticated,
  requireAccessRight(['content:courses:manage']),
  createCourse
);
```

### 7. Use Descriptive Error Messages

```javascript
// Tell users WHY they can't do something
if (!hasAccessRight(user.accessRights, 'billing:payments:process')) {
  throw new Error(
    'You do not have permission to process payments. ' +
    'Contact your department administrator to request billing access.'
  );
}
```

### 8. Audit Sensitive Access

```javascript
// Log all access to sensitive data
if (accessRight.isSensitive) {
  await auditLog.create({
    userId: user.id,
    action: 'ACCESS_SENSITIVE_DATA',
    accessRight: accessRight.name,
    category: accessRight.sensitiveCategory,
    resource: resourceId,
    timestamp: new Date()
  });
}
```

---

## Migration from V1

### V1 Role-Based Checks

```javascript
// V1: Role-based
if (req.user.role === 'instructor') {
  // allow grading
}
```

### V2 Access Right-Based Checks

```javascript
// V2: Access right-based
if (hasAccessRight(req.user.accessRights, 'grades:own-classes:manage')) {
  // allow grading
}
```

### Migration Strategy

1. **Identify all role checks** in your codebase
2. **Map roles to access rights** using the tables above
3. **Update checks** to use access rights instead of role names
4. **Test thoroughly** with different role combinations
5. **Add department context** where needed

---

## Appendix: Complete Access Rights List

See the [Role System V2 Final Report](../../devdocs/impl_reports/ROLE_SYSTEM_V2_Final_Report.md) for a complete, categorized list of all 40+ access rights in the system.

---

**Last Updated:** 2026-01-11
**Version:** 2.0.0
**Status:** Production Ready
