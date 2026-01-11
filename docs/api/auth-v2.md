# Authentication API V2 Documentation

**Version:** 2.0.0
**Base URL:** `/api/v2/auth`
**Last Updated:** 2026-01-10

---

## Table of Contents

1. [Overview](#overview)
2. [Breaking Changes from V1](#breaking-changes-from-v1)
3. [Authentication Flow Diagrams](#authentication-flow-diagrams)
4. [Endpoints](#endpoints)
   - [POST /auth/login](#post-authlogin)
   - [POST /auth/escalate](#post-authescalate)
   - [POST /auth/deescalate](#post-authdeescalate)
   - [POST /auth/switch-department](#post-authswitch-department)
   - [POST /auth/continue](#post-authcontinue)
   - [GET /auth/me](#get-authme)
   - [POST /auth/set-escalation-password](#post-authset-escalation-password)
5. [Error Codes](#error-codes)
6. [Migration Guide](#migration-guide)

---

## Overview

The Authentication API V2 introduces a completely redesigned role and authorization system that replaces the single-role model with a flexible multi-role, department-scoped approach.

### Key Concepts

- **UserTypes**: Determine which dashboard(s) a user can access
  - `learner`: Learner Dashboard only
  - `staff`: Staff Dashboard access
  - `global-admin`: Can escalate to Admin Dashboard

- **Roles**: Department-scoped capabilities within a userType
  - Learner roles: `course-taker`, `auditor`, `learner-supervisor`
  - Staff roles: `instructor`, `department-admin`, `content-admin`, `billing-admin`
  - Global admin roles: `system-admin`, `enrollment-admin`, `course-admin`, `theme-admin`, `financial-admin`

- **Access Rights**: Fine-grained permissions following GNAP pattern
  - Format: `domain:resource:action`
  - Example: `content:courses:manage`

- **Department Memberships**: Users can have roles in multiple departments
  - Each membership includes department-specific roles and access rights
  - Roles cascade from parent to child departments (unless explicitly disabled)

- **Admin Escalation**: Separate authentication step for Admin Dashboard
  - Requires different password (escalation password)
  - Time-limited admin session (default 15 minutes)
  - Admin token stored in memory only for security

---

## Breaking Changes from V1

### Response Structure Changes

**V1 Login Response:**
```json
{
  "user": {
    "id": "...",
    "role": "instructor"  // Single role string
  }
}
```

**V2 Login Response:**
```json
{
  "user": {
    "id": "..."
  },
  "userTypes": ["staff"],  // Array of types
  "departmentMemberships": [
    {
      "departmentId": "...",
      "roles": ["instructor", "content-admin"],  // Multiple roles per department
      "accessRights": ["content:courses:read", ...]
    }
  ],
  "allAccessRights": [...],  // Union of all department rights
  "canEscalateToAdmin": false
}
```

### Authorization Changes

- **V1**: Single role checked via `req.user.role`
- **V2**: Multiple roles per department, checked via access rights
- **V1**: Admin access via special role
- **V2**: Admin access requires escalation with separate password

### Migration Strategy

1. Keep V1 endpoints working during transition period
2. Add V2 endpoints in parallel
3. Update frontend to use V2 endpoints
4. Run migration script to update database schema
5. Deprecate V1 endpoints after full migration

---

## Authentication Flow Diagrams

### Standard User Login Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Auth API
    participant DB as Database

    U->>FE: Enter credentials
    FE->>API: POST /auth/login
    API->>DB: Validate credentials
    API->>DB: Load user, staff/learner records
    API->>DB: Get department memberships
    API->>DB: Calculate access rights
    API-->>FE: Return session + roles + rights
    FE->>FE: Store tokens
    FE->>FE: Determine dashboard from userTypes
    FE-->>U: Navigate to appropriate dashboard
```

### Admin Escalation Flow

```mermaid
sequenceDiagram
    participant U as Admin User
    participant FE as Frontend
    participant API as Auth API
    participant DB as Database

    Note over U,DB: User already logged in
    U->>FE: Click "Login as Admin"
    FE->>U: Prompt for escalation password
    U->>FE: Enter escalation password
    FE->>API: POST /auth/escalate + escalationPassword
    API->>DB: Verify user has global-admin userType
    API->>DB: Validate escalation password
    API->>DB: Load GlobalAdmin record
    API->>DB: Get admin roles & rights
    API-->>FE: Return adminToken + admin rights
    FE->>FE: Store adminToken in MEMORY only
    FE-->>U: Navigate to Admin Dashboard

    Note over FE: Admin session active (15 min timeout)

    U->>FE: Click "Exit Admin"
    FE->>API: POST /auth/deescalate
    API->>DB: Invalidate admin session
    API-->>FE: Success
    FE->>FE: Clear adminToken from memory
    FE-->>U: Navigate to Staff Dashboard
```

### Department Switching Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Auth API
    participant DB as Database

    U->>FE: Select department from dropdown
    FE->>API: POST /auth/switch-department
    API->>DB: Verify membership in department
    API->>DB: Load department roles
    API->>DB: Check role cascading from parents
    API->>DB: Get department access rights
    API->>DB: Update lastSelectedDepartment
    API-->>FE: Return department context
    FE->>FE: Update current department state
    FE->>FE: Re-evaluate UI permissions
    FE-->>U: Update visible components
```

---

## Endpoints

### POST /auth/login

Authenticate user and receive access token with complete role and permission information.

**Endpoint:** `POST /api/v2/auth/login`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "string (required, email format)",
  "password": "string (required)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "instructor@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "isActive": true,
      "lastLogin": "2026-01-09T14:30:00.000Z",
      "createdAt": "2025-06-01T00:00:00.000Z"
    },
    "session": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600,
      "tokenType": "Bearer"
    },
    "userTypes": ["staff", "learner"],
    "defaultDashboard": "staff",
    "canEscalateToAdmin": false,
    "departmentMemberships": [
      {
        "departmentId": "507f1f77bcf86cd799439100",
        "departmentName": "Cognitive Therapy",
        "departmentSlug": "cognitive-therapy",
        "roles": ["instructor", "content-admin"],
        "accessRights": [
          "content:courses:read",
          "content:courses:manage",
          "content:lessons:manage",
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
      "content:lessons:manage",
      "grades:own-classes:manage"
    ],
    "lastSelectedDepartment": "507f1f77bcf86cd799439100"
  }
}
```

**Error Responses:**

| Status | Code | Message | Description |
|--------|------|---------|-------------|
| 400 | VALIDATION_ERROR | Invalid input data | Email or password format invalid |
| 401 | INVALID_CREDENTIALS | Invalid email or password | Authentication failed |
| 403 | ACCOUNT_DISABLED | Account is disabled | User account is inactive |
| 500 | INTERNAL_ERROR | Internal server error | Unexpected error occurred |

**Implementation Notes:**

1. **Dashboard Routing Logic:**
   - If `userTypes === ['learner']` → Navigate to Learner Dashboard
   - Otherwise → Navigate to Staff Dashboard

2. **Department Selection:**
   - If `departmentMemberships.length > 1` → Show department selector
   - Load `lastSelectedDepartment` if available
   - Otherwise, default to primary department (`isPrimary: true`)

3. **Admin Access Indicator:**
   - If `canEscalateToAdmin === true` → Show "Login as Admin" button in UI

4. **Access Rights Usage:**
   - Store `allAccessRights` for baseline permission checks
   - When department selected, use that department's `accessRights` array
   - Check permissions before rendering UI components

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "instructor@example.com",
    "password": "SecurePass123!"
  }'
```

---

### POST /auth/escalate

Escalate to Admin Dashboard with separate escalation password. Requires user to have `global-admin` userType.

**Endpoint:** `POST /api/v2/auth/escalate`

**Request Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "escalationPassword": "string (required, min 8 characters)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "adminSession": {
      "adminToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin...",
      "expiresIn": 900,
      "adminRoles": ["system-admin"],
      "adminAccessRights": ["system:*", "content:*", "enrollment:*"]
    },
    "adminRoles": ["system-admin"],
    "adminAccessRights": ["system:*", "content:*", "enrollment:*"],
    "sessionTimeoutMinutes": 15
  }
}
```

**Error Responses:**

| Status | Code | Message | Description |
|--------|------|---------|-------------|
| 401 | UNAUTHORIZED | Invalid or expired token | Access token invalid |
| 401 | INVALID_ESCALATION_PASSWORD | Incorrect escalation password | Wrong escalation password |
| 403 | NOT_ADMIN | User does not have global-admin userType | User cannot escalate |
| 403 | ADMIN_DISABLED | Admin access has been disabled | Admin account disabled |
| 500 | INTERNAL_ERROR | Internal server error | Unexpected error occurred |

**CRITICAL Security Requirements:**

1. **Admin Token Storage:**
   - Store `adminToken` in **MEMORY ONLY**
   - NEVER store in `localStorage` or `sessionStorage`
   - Prevents XSS attacks from accessing admin privileges

2. **Admin Token Usage:**
   - Send in `X-Admin-Token` header for admin API calls
   - Regular `Authorization` header still required
   - Both tokens must be valid

3. **Session Timeout:**
   - Admin session expires after 15 minutes of inactivity
   - Track user activity (mouse moves, clicks, API calls)
   - Reset timeout on each activity
   - Show warning at 2 minutes remaining

4. **Timeout Handling:**
   - Clear `adminToken` from memory
   - Hide admin UI elements
   - Show "Admin session expired" message
   - Redirect to Staff Dashboard (not login page)

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/v2/auth/escalate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "escalationPassword": "AdminSecretPass123!"
  }'
```

**Using Admin Token in Subsequent Requests:**
```bash
curl -X GET https://api.example.com/api/v2/admin/system-settings \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Admin-Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin..."
```

---

### POST /auth/deescalate

Leave Admin Dashboard and return to Staff Dashboard. Invalidates the admin token.

**Endpoint:** `POST /api/v2/auth/deescalate`

**Request Headers:**
```
Authorization: Bearer <accessToken>
X-Admin-Token: <adminToken>
```

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully de-escalated from admin session"
}
```

**Error Responses:**

| Status | Code | Message | Description |
|--------|------|---------|-------------|
| 401 | UNAUTHORIZED | Invalid or expired token | Access token invalid |
| 401 | INVALID_ADMIN_TOKEN | Invalid or expired admin token | Admin token invalid |
| 500 | INTERNAL_ERROR | Internal server error | Unexpected error occurred |

**Implementation Notes:**

1. Server invalidates the admin token in the database
2. Client must clear `adminToken` from memory
3. Redirect user to Staff Dashboard
4. Regular access token remains valid

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/v2/auth/deescalate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Admin-Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin..."
```

---

### POST /auth/switch-department

Switch current department context and get updated roles and access rights for that department.

**Endpoint:** `POST /api/v2/auth/switch-department`

**Request Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "departmentId": "string (required, ObjectId format)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "currentDepartment": {
      "departmentId": "507f1f77bcf86cd799439100",
      "departmentName": "Cognitive Therapy",
      "departmentSlug": "cognitive-therapy",
      "roles": ["instructor", "content-admin"],
      "accessRights": [
        "content:courses:read",
        "content:courses:manage",
        "grades:own-classes:manage"
      ]
    },
    "childDepartments": [
      {
        "departmentId": "507f1f77bcf86cd799439101",
        "departmentName": "CBT Advanced",
        "roles": ["instructor", "content-admin"]
      },
      {
        "departmentId": "507f1f77bcf86cd799439102",
        "departmentName": "CBT Fundamentals",
        "roles": ["instructor", "content-admin"]
      }
    ],
    "isDirectMember": true,
    "inheritedFrom": null
  }
}
```

**Error Responses:**

| Status | Code | Message | Description |
|--------|------|---------|-------------|
| 400 | VALIDATION_ERROR | Invalid department ID | Department ID format invalid |
| 401 | UNAUTHORIZED | Invalid or expired token | Access token invalid |
| 403 | NOT_A_MEMBER | User is not a member of this department | No membership found |
| 404 | DEPARTMENT_NOT_FOUND | Department not found | Department doesn't exist |
| 500 | INTERNAL_ERROR | Internal server error | Unexpected error occurred |

**Implementation Notes:**

1. **Server-side:**
   - Updates `User.lastSelectedDepartment` in database
   - Checks for direct membership or parent department membership
   - Returns cascaded roles from parent if applicable

2. **Client-side:**
   - Update current department state
   - Replace `currentDepartmentAccessRights` with new rights
   - Re-evaluate which UI components/links are visible
   - Gray out or hide components user doesn't have rights for

3. **Child Departments:**
   - If user has roles in parent, they cascade to children
   - Show child departments in dropdown as nested/indented
   - User can switch to child for narrower context

4. **"No Department Selected" State:**
   - On first login or if removed from last department
   - Show only "global reporting items" in sidebar
   - Prompt user to select a department to continue

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/v2/auth/switch-department \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "departmentId": "507f1f77bcf86cd799439100"
  }'
```

---

### POST /auth/continue

Refresh access rights without full re-authentication. Use when roles change mid-session to get updated permissions (GNAP continuation pattern).

**Endpoint:** `POST /api/v2/auth/continue`

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "session": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600,
      "tokenType": "Bearer"
    },
    "departmentMemberships": [
      {
        "departmentId": "507f1f77bcf86cd799439100",
        "departmentName": "Cognitive Therapy",
        "roles": ["instructor", "content-admin", "billing-admin"],
        "accessRights": ["content:courses:read", "content:courses:manage", "billing:department:read"]
      }
    ],
    "allAccessRights": [
      "content:courses:read",
      "content:courses:manage",
      "billing:department:read"
    ],
    "changes": {
      "rolesAdded": ["billing-admin"],
      "rolesRemoved": [],
      "departmentsAdded": [],
      "departmentsRemoved": []
    }
  }
}
```

**Error Responses:**

| Status | Code | Message | Description |
|--------|------|---------|-------------|
| 401 | UNAUTHORIZED | Invalid or expired token | Access token invalid |
| 500 | INTERNAL_ERROR | Internal server error | Unexpected error occurred |

**Use Cases:**

1. After system-admin changes role permissions
2. After user is added to/removed from a department
3. After user's roles in a department change
4. Periodic refresh to ensure token has current rights (recommended every 5-10 minutes)

**Implementation:**
- Call this instead of full re-login when roles change
- Compare `changes` object to know what to update in UI
- Update stored access rights without disrupting user workflow

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/v2/auth/continue \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### GET /auth/me

Get current authenticated user with complete role and permission information.

**Endpoint:** `GET /api/v2/auth/me`

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "instructor@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "isActive": true,
      "lastLogin": "2026-01-09T14:30:00.000Z",
      "createdAt": "2025-06-01T00:00:00.000Z"
    },
    "userTypes": ["staff"],
    "defaultDashboard": "staff",
    "canEscalateToAdmin": false,
    "departmentMemberships": [
      {
        "departmentId": "507f1f77bcf86cd799439100",
        "departmentName": "Cognitive Therapy",
        "roles": ["instructor", "content-admin"],
        "accessRights": ["content:courses:read", "content:courses:manage"]
      }
    ],
    "allAccessRights": ["content:courses:read", "content:courses:manage"],
    "lastSelectedDepartment": "507f1f77bcf86cd799439100",
    "isAdminSessionActive": false,
    "adminSessionExpiresAt": null
  }
}
```

**Error Responses:**

| Status | Code | Message | Description |
|--------|------|---------|-------------|
| 401 | UNAUTHORIZED | Invalid or expired token | Access token invalid |
| 500 | INTERNAL_ERROR | Internal server error | Unexpected error occurred |

**Implementation Notes:**

- Use this on page load to restore session state
- Check `isAdminSessionActive` to know if admin UI should show
- If `adminSessionExpiresAt` is near, prompt for re-escalation
- Compare with stored state to detect role changes

**cURL Example:**
```bash
curl -X GET https://api.example.com/api/v2/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### POST /auth/set-escalation-password

Set or change escalation password for Admin Dashboard access. Only available to users with `global-admin` userType.

**Endpoint:** `POST /api/v2/auth/set-escalation-password`

**Request Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "currentEscalationPassword": "string (optional, required if changing existing password)",
  "newEscalationPassword": "string (required, min 12 characters)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Escalation password set successfully"
}
```

**Error Responses:**

| Status | Code | Message | Description |
|--------|------|---------|-------------|
| 400 | VALIDATION_ERROR | Invalid input data | Password format invalid |
| 400 | SAME_AS_LOGIN | Escalation password must be different from login password | Security requirement |
| 400 | WEAK_PASSWORD | Escalation password does not meet complexity requirements | Password too weak |
| 401 | UNAUTHORIZED | Invalid or expired token | Access token invalid |
| 401 | INVALID_CURRENT_PASSWORD | Current escalation password is incorrect | Wrong current password |
| 403 | NOT_ADMIN | User does not have global-admin userType | User not authorized |
| 500 | INTERNAL_ERROR | Internal server error | Unexpected error occurred |

**Password Requirements:**

- Minimum 12 characters
- Must be different from login password
- Recommended: Mix of upper/lower/number/symbol
- Cannot be common password

**Implementation Notes:**

1. **First-time setup:**
   - `currentEscalationPassword` not required
   - User prompted to set on first admin escalation attempt

2. **Changing password:**
   - `currentEscalationPassword` required
   - Validates current password before allowing change

**cURL Example:**
```bash
# First-time setup
curl -X POST https://api.example.com/api/v2/auth/set-escalation-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "newEscalationPassword": "SuperSecureAdminPass456!"
  }'

# Changing existing password
curl -X POST https://api.example.com/api/v2/auth/set-escalation-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentEscalationPassword": "SuperSecureAdminPass456!",
    "newEscalationPassword": "EvenMoreSecurePass789!"
  }'
```

---

## Error Codes

### Standard Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional details
  }
}
```

### Common Error Codes

| Status | Code | Message | When It Occurs |
|--------|------|---------|----------------|
| 400 | VALIDATION_ERROR | Invalid input data | Request body validation fails |
| 400 | SAME_AS_LOGIN | Escalation password must be different from login password | Escalation password validation |
| 400 | WEAK_PASSWORD | Password does not meet complexity requirements | Password strength check fails |
| 400 | INVALID_ACCESS_RIGHTS | One or more access rights are invalid | Access right validation fails |
| 401 | UNAUTHORIZED | Invalid or expired token | Token validation fails |
| 401 | INVALID_CREDENTIALS | Invalid email or password | Login authentication fails |
| 401 | INVALID_ESCALATION_PASSWORD | Incorrect escalation password | Escalation authentication fails |
| 401 | INVALID_CURRENT_PASSWORD | Current password is incorrect | Password change validation fails |
| 401 | INVALID_ADMIN_TOKEN | Invalid or expired admin token | Admin token validation fails |
| 403 | FORBIDDEN | Access denied | Permission check fails |
| 403 | NOT_ADMIN | User does not have global-admin userType | Admin privilege check fails |
| 403 | NOT_A_MEMBER | User is not a member of this department | Department membership check fails |
| 403 | ACCOUNT_DISABLED | Account is disabled | User account is inactive |
| 403 | ADMIN_DISABLED | Admin access has been disabled | Admin account is inactive |
| 404 | NOT_FOUND | Resource not found | Resource doesn't exist |
| 404 | DEPARTMENT_NOT_FOUND | Department not found | Department doesn't exist |
| 404 | ROLE_NOT_FOUND | Role not found | Role doesn't exist |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests | Rate limit exceeded |
| 500 | INTERNAL_ERROR | Internal server error | Unexpected error occurred |

### Error Handling Best Practices

1. **Always check `success` field first:**
   ```javascript
   if (!response.success) {
     handleError(response.error);
   }
   ```

2. **Handle specific error codes:**
   ```javascript
   switch (error.code) {
     case 'INVALID_CREDENTIALS':
       showMessage('Invalid email or password. Please try again.');
       break;
     case 'ACCOUNT_DISABLED':
       showMessage('Your account has been disabled. Contact support.');
       break;
     case 'INVALID_ESCALATION_PASSWORD':
       showMessage('Incorrect admin password. Please try again.');
       retryCount++;
       break;
   }
   ```

3. **Log errors for debugging:**
   ```javascript
   console.error('[Auth Error]', error.code, error.message, error.details);
   ```

---

## Migration Guide

### Overview

Migrating from V1 to V2 requires updates to both the database schema and frontend code. Follow these steps for a smooth migration.

### Step 1: Update Database Schema

Run the migration script to update existing data:

```bash
npm run migrate:v2-role-system
```

This script will:
- Add `userTypes` field to existing User records
- Add `departmentMemberships` to Staff and Learner records
- Create GlobalAdmin records for existing admin users
- Seed role definitions and access rights
- Create master department for global admins

**IMPORTANT:** Test on staging environment first!

### Step 2: Update Frontend Authentication Code

#### V1 Code (Before):
```javascript
// Login
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
const { user, token } = response.data;

// Check role
if (user.role === 'instructor') {
  // Show instructor features
}

// Navigate based on role
if (user.role === 'learner') {
  navigate('/learner-dashboard');
} else {
  navigate('/staff-dashboard');
}
```

#### V2 Code (After):
```javascript
// Login
const response = await fetch('/api/v2/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
const {
  user,
  session,
  userTypes,
  defaultDashboard,
  departmentMemberships,
  allAccessRights
} = response.data;

// Store tokens
localStorage.setItem('accessToken', session.accessToken);
localStorage.setItem('refreshToken', session.refreshToken);

// Check access rights (not roles)
if (allAccessRights.includes('content:courses:manage')) {
  // Show course management features
}

// Navigate based on userTypes
if (defaultDashboard === 'learner') {
  navigate('/learner-dashboard');
} else {
  navigate('/staff-dashboard');
}

// Show department selector if multiple memberships
if (departmentMemberships.length > 1) {
  showDepartmentSelector(departmentMemberships);
}
```

### Step 3: Update Authorization Checks

#### V1 Code (Before):
```javascript
// Check if user is instructor
if (req.user.role === 'instructor') {
  // Allow access
}

// Check if user is admin
if (req.user.role === 'admin') {
  // Allow access
}
```

#### V2 Code (After):
```javascript
// Check access rights
if (req.user.accessRights.includes('content:courses:manage')) {
  // Allow access
}

// Check admin access (requires escalation)
if (req.adminSession && req.adminSession.roles.includes('system-admin')) {
  // Allow access
}

// Check department-specific role
const deptRoles = req.user.getDepartmentRoles(departmentId);
if (deptRoles.includes('instructor')) {
  // Allow access
}
```

### Step 4: Add Admin Escalation Flow

Add UI flow for admin users:

```javascript
// Check if user can escalate
if (authState.canEscalateToAdmin) {
  // Show "Login as Admin" button
}

// Escalate to admin
async function escalateToAdmin(escalationPassword) {
  const response = await fetch('/api/v2/auth/escalate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ escalationPassword })
  });

  const { adminSession } = response.data;

  // Store admin token in MEMORY only
  window.__adminToken = adminSession.adminToken;

  // Navigate to admin dashboard
  navigate('/admin-dashboard');

  // Start admin session timeout
  startAdminSessionTimeout(adminSession.expiresIn);
}

// Use admin token in API calls
async function makeAdminAPICall(endpoint, data) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Admin-Token': window.__adminToken
    },
    body: JSON.stringify(data)
  });
  return response;
}
```

### Step 5: Add Department Switching

Add department selector UI:

```javascript
function DepartmentSelector({ departments, currentDepartmentId, onSwitch }) {
  async function handleDepartmentSwitch(departmentId) {
    const response = await fetch('/api/v2/auth/switch-department', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ departmentId })
    });

    const { currentDepartment, childDepartments } = response.data;

    // Update current department state
    updateCurrentDepartment(currentDepartment);

    // Update visible UI components based on new access rights
    updateUIPermissions(currentDepartment.accessRights);

    onSwitch(currentDepartment);
  }

  return (
    <select
      value={currentDepartmentId}
      onChange={(e) => handleDepartmentSwitch(e.target.value)}
    >
      {departments.map(dept => (
        <option key={dept.departmentId} value={dept.departmentId}>
          {dept.departmentName}
        </option>
      ))}
    </select>
  );
}
```

### Step 6: Update Permission Checks in UI

Create helper functions for permission checks:

```javascript
// Helper to check access rights
function hasAccessRight(userRights, requiredRight) {
  // Direct match
  if (userRights.includes(requiredRight)) return true;

  // Check wildcards
  const [domain] = requiredRight.split(':');
  if (userRights.includes(`${domain}:*`)) return true;

  return false;
}

// Use in components
function CourseManagementButton() {
  const { currentDepartmentAccessRights } = useAuth();

  if (!hasAccessRight(currentDepartmentAccessRights, 'content:courses:manage')) {
    return null; // Hide button if no permission
  }

  return <button>Manage Courses</button>;
}
```

### Step 7: Test Migration

Verify these scenarios:

1. **Login Flow:**
   - ✓ Users can log in and receive V2 response
   - ✓ Dashboard routing works based on userTypes
   - ✓ Department memberships load correctly

2. **Department Switching:**
   - ✓ Users with multiple departments can switch
   - ✓ Access rights update when switching
   - ✓ UI updates based on new permissions

3. **Admin Escalation:**
   - ✓ Global admins can escalate
   - ✓ Admin token works for admin endpoints
   - ✓ Admin session timeout works
   - ✓ De-escalation clears admin token

4. **Permission Checks:**
   - ✓ UI hides components without required rights
   - ✓ API blocks requests without required rights
   - ✓ Wildcard rights work correctly

### Rollback Plan

If issues occur, rollback using:

```bash
npm run migrate:v2-role-system:down
```

This will:
- Restore V1 schema
- Remove V2-specific fields
- Restore original role structure

---

## Additional Resources

- [Roles API Documentation](./roles.md)
- [Access Rights Reference](./access-rights.md)
- [UI Implementation Guide](../UI_Authorization_Recommendations.md)
- [Postman Collection](../postman/LMS-V2-Auth.postman_collection.json)
- [Migration Script](../../src/migrations/v2-role-system.migration.ts)

---

## Support

For questions or issues:
- Create an issue in the repository
- Contact the development team
- Refer to the main documentation: `README-ROLE-SYSTEM-V2.md`
