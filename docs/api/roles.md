# Roles & Access Rights API Documentation

**Version:** 2.0.0
**Base URL:** `/api/v2`
**Last Updated:** 2026-01-10

---

## Table of Contents

1. [Overview](#overview)
2. [Role System Architecture](#role-system-architecture)
3. [Role Definitions](#role-definitions)
4. [Access Rights Reference](#access-rights-reference)
5. [API Endpoints](#api-endpoints)
   - [Role Endpoints](#role-endpoints)
   - [Access Rights Endpoints](#access-rights-endpoints)
   - [User Role Endpoints](#user-role-endpoints)
6. [Usage Examples](#usage-examples)
7. [Best Practices](#best-practices)

---

## Overview

The Role System V2 provides a flexible, department-scoped authorization model that replaces the legacy single-role system. This document covers the Roles and Access Rights APIs.

### Key Concepts

- **UserTypes**: Top-level classifications (`learner`, `staff`, `global-admin`)
- **Roles**: Department-scoped capabilities within a userType
- **Access Rights**: Fine-grained permissions (GNAP pattern: `domain:resource:action`)
- **Department Memberships**: Users can have different roles in different departments
- **Role Cascading**: Parent department roles cascade to child departments (unless disabled)

---

## Role System Architecture

```
User
├── UserTypes: ['learner', 'staff', 'global-admin']
├── DefaultDashboard: 'learner' | 'staff'
└── Department Memberships
    ├── Department A
    │   ├── Roles: ['instructor', 'content-admin']
    │   └── Access Rights: ['content:courses:read', 'content:courses:manage', ...]
    └── Department B
        ├── Roles: ['instructor']
        └── Access Rights: ['content:courses:read', ...]
```

### Role Hierarchy by UserType

```
LEARNER ROLES (Department-scoped)
├── course-taker (default)
│   └── Standard learner who enrolls in and completes courses
├── auditor
│   └── View-only access, cannot earn credit
└── learner-supervisor
    └── Elevated permissions for TAs, peer mentors

STAFF ROLES (Department-scoped)
├── instructor
│   └── Teaches classes, grades student work
├── content-admin
│   └── Creates and manages courses, programs
├── department-admin
│   └── Manages department operations, staff, settings
└── billing-admin
    └── Department-level billing operations

GLOBAL ADMIN ROLES (Master Department only)
├── system-admin
│   └── Full system access - highest privilege
├── enrollment-admin
│   └── Manages enrollment system globally
├── course-admin
│   └── Manages course system globally
├── theme-admin
│   └── Manages themes, branding, UI
└── financial-admin
    └── System-wide financial operations
```

---

## Role Definitions

### Learner Roles

#### course-taker
**UserType:** `learner`
**Description:** Standard learner who enrolls in and completes courses
**Default Access Rights:**
- `content:courses:read` - View course details
- `content:lessons:read` - Access lesson content
- `enrollment:own:read` - View own enrollments
- `enrollment:own:manage` - Enroll/drop courses
- `grades:own:read` - View own grades

#### auditor
**UserType:** `learner`
**Description:** View-only access, cannot earn credit or complete exams
**Default Access Rights:**
- `content:courses:read` - View course details
- `content:lessons:read` - Access lesson content (view only)
- `enrollment:own:read` - View own enrollments

#### learner-supervisor
**UserType:** `learner`
**Description:** Elevated permissions for TAs, peer mentors
**Default Access Rights:**
- All `course-taker` rights
- `learner:peer-progress:read` - View peer learner progress
- `content:discussions:moderate` - Moderate course discussions

---

### Staff Roles

#### instructor
**UserType:** `staff`
**Description:** Teaches classes, grades student work
**Default Access Rights:**
- `content:courses:read` - View all courses in department
- `content:lessons:read` - Access all lesson content
- `enrollment:department:read` - View department enrollments
- `grades:own-classes:read` - View grades for own classes
- `grades:own-classes:manage` - Grade student work in own classes
- `reports:own-classes:read` - View reports for own classes

#### content-admin
**UserType:** `staff`
**Description:** Creates and manages courses, programs
**Default Access Rights:**
- `content:courses:manage` - Full control over courses (CRUD)
- `content:lessons:manage` - Full control over lessons
- `content:programs:manage` - Manage programs
- `content:assessments:manage` - Manage assessments
- `enrollment:department:read` - View department enrollments
- `reports:content:read` - View content analytics

#### department-admin
**UserType:** `staff`
**Description:** Manages department operations, staff, settings
**Default Access Rights:**
- `staff:department:read` - View department staff
- `staff:department:manage` - Manage staff in department
- `enrollment:department:read` - View department enrollments
- `enrollment:department:manage` - Manage enrollments
- `reports:department:read` - View all department reports
- `system:department-settings:manage` - Manage department settings
- `content:*` - All content permissions (wildcard)

#### billing-admin
**UserType:** `staff`
**Description:** Department-level billing operations
**Default Access Rights:**
- `billing:department:read` - View department billing
- `billing:department:manage` - Manage department billing
- `billing:payments:read` - View payment records (SENSITIVE)
- `reports:billing:read` - View billing reports
- `enrollment:department:read` - View enrollments for billing

---

### Global Admin Roles

#### system-admin
**UserType:** `global-admin`
**Description:** Full system access - highest privilege
**Default Access Rights:**
- `system:*` - All system permissions (wildcard)
- `content:*` - All content permissions
- `enrollment:*` - All enrollment permissions
- `staff:*` - All staff permissions
- `billing:*` - All billing permissions
- `audit:*` - All audit permissions

#### enrollment-admin
**UserType:** `global-admin`
**Description:** Manages enrollment system globally
**Default Access Rights:**
- `enrollment:*` - All enrollment permissions
- `learner:*` - All learner permissions
- `reports:enrollment:read` - View enrollment reports
- `audit:enrollment:read` - View enrollment audit logs

#### course-admin
**UserType:** `global-admin`
**Description:** Manages course system globally
**Default Access Rights:**
- `content:*` - All content permissions
- `reports:content:read` - View content reports
- `audit:content:read` - View content audit logs

#### theme-admin
**UserType:** `global-admin`
**Description:** Manages themes, branding, UI
**Default Access Rights:**
- `system:themes:manage` - Manage themes
- `system:branding:manage` - Manage branding
- `system:ui-settings:manage` - Manage UI settings
- `content:templates:manage` - Manage content templates

#### financial-admin
**UserType:** `global-admin`
**Description:** System-wide financial operations
**Default Access Rights:**
- `billing:*` - All billing permissions (SENSITIVE)
- `reports:financial:read` - View financial reports
- `audit:billing:read` - View billing audit logs
- `system:payment-gateway:manage` - Manage payment gateways

---

## Access Rights Reference

Access rights follow the pattern: `domain:resource:action`

### Access Right Domains

| Domain | Description | Examples |
|--------|-------------|----------|
| `content` | Course content, lessons, programs | `content:courses:read`, `content:lessons:manage` |
| `enrollment` | Enrollments, class rosters | `enrollment:department:read`, `enrollment:own:manage` |
| `staff` | Staff management, assignments | `staff:department:manage`, `staff:own:read` |
| `learner` | Learner data, progress, PII | `learner:pii:read`, `learner:progress:read` |
| `reports` | Reporting and analytics | `reports:department:read`, `reports:financial:read` |
| `system` | System settings, configuration | `system:settings:manage`, `system:themes:manage` |
| `billing` | Billing, payments, invoices | `billing:department:read`, `billing:payments:process` |
| `audit` | Audit logs, compliance | `audit:logs:read`, `audit:logs:export` |
| `grades` | Grading, transcripts | `grades:own-classes:manage`, `grades:all:read` |

### Common Actions

- `read` - View/retrieve data
- `manage` - Full CRUD operations
- `create` - Create new records
- `update` - Modify existing records
- `delete` - Remove records
- `export` - Export data
- `moderate` - Moderate content
- `process` - Process transactions

### Sensitive Access Rights

These rights grant access to sensitive data and should be carefully controlled:

#### FERPA-Protected Rights (Student Privacy)
- `learner:pii:read` - View student PII
- `learner:grades:read` - View student grades
- `learner:transcripts:read` - View transcripts
- `learner:emergency:read` - View emergency contacts

#### Billing/Financial Rights
- `billing:payments:read` - View payment information
- `billing:payments:process` - Process payments
- `billing:refunds:manage` - Issue refunds
- `reports:financial:read` - View financial reports

#### PII Rights (Personal Information)
- `learner:contact:read` - View contact information
- `staff:contact:read` - View staff contact info
- `learner:ssn:read` - View SSN (highly restricted)

#### Audit Rights (Compliance)
- `audit:logs:read` - View audit logs
- `audit:logs:export` - Export audit data
- `audit:sensitive:read` - View sensitive audit records

### Wildcard Access Rights

Wildcards grant all permissions in a domain:

- `system:*` - All system permissions
- `content:*` - All content permissions
- `enrollment:*` - All enrollment permissions
- `billing:*` - All billing permissions

**Use wildcards sparingly** - they grant broad access and should be limited to admin roles.

---

## API Endpoints

### Role Endpoints

#### GET /api/v2/roles

List all role definitions, optionally filtered by userType.

**Authentication:** Required (any authenticated user)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userType` | string | No | Filter by userType: `learner`, `staff`, `global-admin` |
| `includeInactive` | boolean | No | Include inactive roles (default: false) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "instructor",
        "userType": "staff",
        "displayName": "Instructor",
        "description": "Teaches classes, grades student work",
        "accessRights": [
          "content:courses:read",
          "grades:own-classes:manage"
        ],
        "isDefault": false,
        "sortOrder": 1,
        "isActive": true
      }
    ],
    "byUserType": {
      "learner": [],
      "staff": [],
      "global-admin": []
    }
  }
}
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/v2/roles?userType=staff" \
  -H "Authorization: Bearer <token>"
```

---

#### GET /api/v2/roles/:name

Get a single role definition by name.

**Authentication:** Required (any authenticated user)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Role name (e.g., "instructor", "content-admin") |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "instructor",
    "userType": "staff",
    "displayName": "Instructor",
    "description": "Teaches classes, grades student work",
    "accessRights": [
      "content:courses:read",
      "content:lessons:read",
      "grades:own-classes:manage"
    ],
    "isDefault": false,
    "sortOrder": 1,
    "isActive": true
  }
}
```

**Error Responses:**
- `404 ROLE_NOT_FOUND` - Role not found

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/v2/roles/instructor" \
  -H "Authorization: Bearer <token>"
```

---

#### PUT /api/v2/roles/:name/access-rights

Update which access rights a role grants. **REQUIRES: system-admin role with escalated admin token.**

**Authentication:** Required (system-admin with admin token)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Role name to update |

**Request Body:**
```json
{
  "accessRights": [
    "content:courses:read",
    "content:courses:manage",
    "content:lessons:manage"
  ]
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "instructor",
    "accessRights": [
      "content:courses:read",
      "content:courses:manage",
      "content:lessons:manage"
    ]
  },
  "message": "Role access rights updated successfully"
}
```

**Error Responses:**
- `401 UNAUTHORIZED` - Invalid or expired token
- `403 FORBIDDEN` - Requires system-admin role
- `404 ROLE_NOT_FOUND` - Role not found
- `400 INVALID_ACCESS_RIGHTS` - One or more access rights are invalid

**IMPORTANT:** Changes take effect immediately for all users with this role. Consider using `/auth/continue` endpoint to refresh user tokens after changes.

**cURL Example:**
```bash
curl -X PUT "https://api.example.com/api/v2/roles/instructor/access-rights" \
  -H "Authorization: Bearer <token>" \
  -H "X-Admin-Token: <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "accessRights": [
      "content:courses:read",
      "content:courses:manage",
      "content:lessons:manage"
    ]
  }'
```

---

### Access Rights Endpoints

#### GET /api/v2/access-rights

List all available access rights, optionally filtered by domain.

**Authentication:** Required (any authenticated user)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | string | No | Filter by domain: `content`, `enrollment`, `staff`, `learner`, `reports`, `system`, `billing`, `audit`, `grades` |
| `sensitiveOnly` | boolean | No | Only return sensitive rights (default: false) |

**Success Response (200 OK):**
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
        "id": "507f1f77bcf86cd799439030",
        "name": "learner:pii:read",
        "domain": "learner",
        "resource": "pii",
        "action": "read",
        "description": "View student personally identifiable information",
        "isSensitive": true,
        "sensitiveCategory": "ferpa",
        "isActive": true
      }
    ],
    "byDomain": {
      "content": [],
      "enrollment": [],
      "staff": [],
      "learner": [],
      "reports": [],
      "system": [],
      "billing": [],
      "audit": [],
      "grades": []
    },
    "sensitive": {
      "ferpa": [],
      "billing": [],
      "pii": [],
      "audit": []
    }
  }
}
```

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/v2/access-rights?domain=content" \
  -H "Authorization: Bearer <token>"
```

---

#### GET /api/v2/access-rights/role/:roleName

Get all access rights granted by a specific role.

**Authentication:** Required (any authenticated user)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roleName` | string | Yes | Role name (e.g., "instructor") |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "role": {
      "id": "507f1f77bcf86cd799439011",
      "name": "instructor",
      "userType": "staff",
      "displayName": "Instructor"
    },
    "accessRights": [
      {
        "id": "507f1f77bcf86cd799439020",
        "name": "content:courses:read",
        "domain": "content",
        "resource": "courses",
        "action": "read",
        "description": "View course details and content"
      }
    ],
    "effectiveRights": [
      "content:courses:read",
      "content:lessons:read",
      "grades:own-classes:manage"
    ]
  }
}
```

**Note:** `effectiveRights` expands wildcards (e.g., `system:*` → all system rights).

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/v2/access-rights/role/instructor" \
  -H "Authorization: Bearer <token>"
```

---

### User Role Endpoints

#### GET /api/v2/roles/me

Get all roles and access rights for the current authenticated user.

**Authentication:** Required

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userTypes": ["staff", "global-admin"],
    "defaultDashboard": "staff",
    "canEscalateToAdmin": true,
    "departmentMemberships": [
      {
        "departmentId": "507f1f77bcf86cd799439100",
        "departmentName": "Cognitive Therapy",
        "departmentSlug": "cognitive-therapy",
        "roles": ["instructor", "content-admin"],
        "accessRights": [
          "content:courses:read",
          "content:courses:manage",
          "grades:own-classes:manage"
        ],
        "isPrimary": true,
        "isActive": true,
        "joinedAt": "2025-06-15T00:00:00.000Z",
        "childDepartments": [
          {
            "departmentId": "507f1f77bcf86cd799439101",
            "departmentName": "CBT Advanced",
            "roles": ["instructor", "content-admin"]
          }
        ]
      }
    ],
    "allAccessRights": [
      "content:courses:read",
      "content:courses:manage",
      "grades:own-classes:manage"
    ],
    "lastSelectedDepartment": "507f1f77bcf86cd799439100",
    "adminRoles": ["system-admin"]
  }
}
```

**Usage Notes:**
- This is the primary endpoint for UI to determine what to show
- `departmentMemberships` includes child departments (role cascading)
- `allAccessRights` is the union of rights from all departments
- Check `canEscalateToAdmin` to show/hide "Login as Admin" button
- `lastSelectedDepartment` helps restore UI state on page load

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/v2/roles/me" \
  -H "Authorization: Bearer <token>"
```

---

#### GET /api/v2/roles/me/department/:departmentId

Get roles and access rights for current user in a specific department.

**Authentication:** Required

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `departmentId` | string | Yes | Department ID |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "departmentId": "507f1f77bcf86cd799439100",
    "departmentName": "Cognitive Therapy",
    "roles": ["instructor", "content-admin"],
    "accessRights": [
      "content:courses:read",
      "content:courses:manage",
      "grades:own-classes:manage"
    ],
    "effectiveRights": [
      "content:courses:read",
      "content:courses:manage",
      "content:lessons:read",
      "content:lessons:manage",
      "grades:own-classes:manage"
    ],
    "isDirectMember": true,
    "inheritedFrom": null
  }
}
```

**Error Responses:**
- `403 NOT_A_MEMBER` - User is not a member of this department
- `404 DEPARTMENT_NOT_FOUND` - Department not found

**Usage Notes:**
- Use this when user selects a department in the UI
- `isDirectMember` indicates whether roles come from direct membership or parent
- `effectiveRights` is what the UI should use for permission checks (includes expanded wildcards)

**cURL Example:**
```bash
curl -X GET "https://api.example.com/api/v2/roles/me/department/507f1f77bcf86cd799439100" \
  -H "Authorization: Bearer <token>"
```

---

## Usage Examples

### Example 1: Load User Roles on Login

```javascript
// After successful login
async function loadUserRoles() {
  const response = await fetch('/api/v2/roles/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const { data } = await response.json();

  // Store in app state
  setState({
    userTypes: data.userTypes,
    departmentMemberships: data.departmentMemberships,
    allAccessRights: data.allAccessRights,
    canEscalateToAdmin: data.canEscalateToAdmin
  });

  // Show department selector if multiple memberships
  if (data.departmentMemberships.length > 1) {
    showDepartmentSelector(data.departmentMemberships);
  }

  // Load last selected department
  if (data.lastSelectedDepartment) {
    selectDepartment(data.lastSelectedDepartment);
  }
}
```

### Example 2: Check Permission Before Showing UI Component

```javascript
function hasAccessRight(userRights, requiredRight) {
  // Direct match
  if (userRights.includes(requiredRight)) return true;

  // Check wildcards
  const [domain] = requiredRight.split(':');
  if (userRights.includes(`${domain}:*`)) return true;

  return false;
}

function CourseManagementButton({ currentDepartmentAccessRights }) {
  if (!hasAccessRight(currentDepartmentAccessRights, 'content:courses:manage')) {
    return null; // Hide button if no permission
  }

  return <button onClick={handleManageCourses}>Manage Courses</button>;
}
```

### Example 3: Load Role Definitions for Admin UI

```javascript
// System admin managing role permissions
async function loadRoleDefinitions() {
  const response = await fetch('/api/v2/roles?userType=staff', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const { data } = await response.json();

  // Display roles in admin UI
  data.roles.forEach(role => {
    console.log(`${role.displayName}: ${role.accessRights.join(', ')}`);
  });
}
```

### Example 4: Update Role Permissions (System Admin)

```javascript
// System admin updating instructor role permissions
async function updateInstructorPermissions() {
  const response = await fetch('/api/v2/roles/instructor/access-rights', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Admin-Token': adminToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      accessRights: [
        'content:courses:read',
        'content:courses:manage',  // NEW: Added course management
        'content:lessons:read',
        'content:lessons:manage',  // NEW: Added lesson management
        'grades:own-classes:manage'
      ]
    })
  });

  const { data } = await response.json();
  console.log('Instructor role updated:', data);

  // Notify affected users to refresh their tokens
  await notifyUsersToRefreshTokens(['instructor']);
}
```

### Example 5: Get Department-Specific Permissions

```javascript
// When user switches department
async function switchToDepartment(departmentId) {
  const response = await fetch(
    `/api/v2/roles/me/department/${departmentId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  const { data } = await response.json();

  // Update UI based on new permissions
  setState({
    currentDepartmentId: data.departmentId,
    currentDepartmentRoles: data.roles,
    currentDepartmentAccessRights: data.effectiveRights
  });

  // Re-evaluate which UI components to show
  updateUIPermissions(data.effectiveRights);
}
```

### Example 6: Display Available Roles for Assignment

```javascript
// Department admin assigning roles to staff member
async function loadAvailableStaffRoles() {
  const response = await fetch('/api/v2/roles?userType=staff', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const { data } = await response.json();

  // Display roles in dropdown
  return data.roles.map(role => ({
    value: role.name,
    label: role.displayName,
    description: role.description,
    accessRights: role.accessRights
  }));
}
```

---

## Best Practices

### 1. Check Access Rights, Not Roles

**BAD:**
```javascript
if (user.roles.includes('instructor')) {
  // Show feature
}
```

**GOOD:**
```javascript
if (hasAccessRight(user.accessRights, 'content:courses:manage')) {
  // Show feature
}
```

**Why:** Access rights are more granular and flexible. Roles can change permissions without code updates.

---

### 2. Cache Role Definitions

```javascript
// Cache role definitions on app load
const roleDefinitionsCache = {};

async function getRoleDefinition(roleName) {
  if (roleDefinitionsCache[roleName]) {
    return roleDefinitionsCache[roleName];
  }

  const response = await fetch(`/api/v2/roles/${roleName}`);
  const { data } = await response.json();

  roleDefinitionsCache[roleName] = data;
  return data;
}
```

---

### 3. Handle Wildcard Permissions

```javascript
function hasAccessRight(userRights, requiredRight) {
  // Direct match
  if (userRights.includes(requiredRight)) return true;

  // Check wildcards at domain level
  const [domain] = requiredRight.split(':');
  if (userRights.includes(`${domain}:*`)) return true;

  // Check wildcards at resource level
  const [, resource] = requiredRight.split(':');
  if (userRights.includes(`${domain}:${resource}:*`)) return true;

  return false;
}
```

---

### 4. Refresh Tokens After Role Changes

```javascript
// After system admin changes role permissions
async function refreshUserPermissions() {
  const response = await fetch('/api/v2/auth/continue', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const { data } = await response.json();

  // Update stored access rights
  updateAccessRights(data.allAccessRights);

  // Log changes for debugging
  console.log('Roles added:', data.changes.rolesAdded);
  console.log('Roles removed:', data.changes.rolesRemoved);
}
```

---

### 5. Gracefully Handle Missing Permissions

```javascript
async function performAction() {
  try {
    const response = await fetch('/api/v2/courses/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(courseData)
    });

    if (response.status === 403) {
      // User doesn't have permission
      showMessage('You do not have permission to create courses.');
      return;
    }

    const { data } = await response.json();
    showSuccess('Course created successfully!');
  } catch (error) {
    showError('An error occurred. Please try again.');
  }
}
```

---

### 6. Display Role Information to Users

```javascript
function UserRoleDisplay({ departmentMemberships }) {
  return (
    <div>
      <h3>Your Roles</h3>
      {departmentMemberships.map(dept => (
        <div key={dept.departmentId}>
          <h4>{dept.departmentName}</h4>
          <ul>
            {dept.roles.map(role => (
              <li key={role}>
                {getRoleDisplayName(role)}
                <button onClick={() => showRoleDetails(role)}>
                  View Permissions
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

async function showRoleDetails(roleName) {
  const response = await fetch(`/api/v2/roles/${roleName}`);
  const { data } = await response.json();

  // Show modal with role details
  showModal({
    title: data.displayName,
    description: data.description,
    permissions: data.accessRights
  });
}
```

---

### 7. Audit Sensitive Access Right Usage

When using sensitive access rights, always log the access:

```javascript
async function viewStudentPII(studentId) {
  // Check permission
  if (!hasAccessRight(user.accessRights, 'learner:pii:read')) {
    throw new Error('Permission denied');
  }

  // Log the access for audit trail
  await fetch('/api/v2/audit/log', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      action: 'VIEW_STUDENT_PII',
      resourceId: studentId,
      accessRight: 'learner:pii:read',
      timestamp: new Date().toISOString()
    })
  });

  // Perform the action
  const response = await fetch(`/api/v2/learners/${studentId}/pii`);
  return response.json();
}
```

---

## Additional Resources

- [Authentication API Documentation](./auth-v2.md)
- [Migration Guide](../../MIGRATION-GUIDE.md)
- [Role System Developer Guide](../../README-ROLE-SYSTEM-V2.md)
- [Postman Collection](../postman/LMS-V2-Auth.postman_collection.json)

---

## Support

For questions or issues:
- Create an issue in the repository
- Contact the development team
- Refer to the phase implementation plan: `devdocs/Role_System_V2_Phased_Implementation.md`
