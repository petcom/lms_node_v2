# Role System UI Contracts - Complete Reference
**Version:** 2.0.0  
**Date:** 2026-01-10  
**Status:** Ready for UI Implementation  
**Audience:** UI Development Team

---

## Quick Start for UI Team

### 1. What Changed from V1

| V1 (Old) | V2 (New) |
|----------|----------|
| Single `role` string on user | `userTypes[]` array on user |
| Roles checked globally | Roles are per-department |
| One dashboard for all | Three dashboards: Learner, Staff, Admin |
| Permission strings | Access rights: `domain:resource:action` |
| No admin escalation | Admin requires separate password |

### 2. Key Files to Reference

| File | Purpose |
|------|---------|
| `contracts/api/auth-v2.contract.ts` | Login, escalation, department switching |
| `contracts/api/roles.contract.ts` | Role definitions, access rights |
| `devdocs/UI_Authorization_Recommendations.md` | UI patterns and components |
| `devdocs/Endpoint_Role_Authorization.md` | Which roles can access which API endpoints |

### 3. Dashboard Routing Decision Tree

```
On Login:
│
├─ userTypes = ['learner'] ONLY?
│   └─ YES → Learner Dashboard
│
└─ NO (has 'staff' or 'global-admin')
    └─ Staff Dashboard
        │
        └─ User clicks "Login as Admin"?
            └─ YES → Enter escalation password
                └─ Correct → Admin Dashboard
```

---

## Section 1: UserTypes and Dashboards

### 1.1 UserType Enum

```typescript
type UserType = 'learner' | 'staff' | 'global-admin';
```

- **`learner`**: Can access Learner Dashboard
- **`staff`**: Can access Staff Dashboard
- **`global-admin`**: Can access Admin Dashboard (via escalation from Staff)

### 1.2 Dashboard Access Rules

| UserTypes on User | Default Dashboard | Can Access |
|-------------------|------------------|------------|
| `['learner']` | Learner | Learner only |
| `['staff']` | Staff | Staff only |
| `['learner', 'staff']` | Staff | Both (can switch) |
| `['global-admin']` | Staff | Staff + Admin (via escalation) |
| `['staff', 'global-admin']` | Staff | Staff + Admin (via escalation) |
| `['learner', 'staff', 'global-admin']` | Staff | All three |

### 1.3 Dashboard Determination Code

```typescript
function getDefaultDashboard(userTypes: UserType[]): 'learner' | 'staff' {
  if (userTypes.length === 1 && userTypes[0] === 'learner') {
    return 'learner';
  }
  return 'staff';
}

function canAccessLearnerDashboard(userTypes: UserType[]): boolean {
  return userTypes.includes('learner');
}

function canAccessStaffDashboard(userTypes: UserType[]): boolean {
  return userTypes.includes('staff') || userTypes.includes('global-admin');
}

function canEscalateToAdmin(userTypes: UserType[]): boolean {
  return userTypes.includes('global-admin');
}
```

---

## Section 2: Role Definitions

### 2.1 Learner Roles (Department-Scoped)

| Role | Display Name | Description | Use Case |
|------|-------------|-------------|----------|
| `course-taker` | Course Taker | Standard learner | Default for enrolled students |
| `auditor` | Auditor | View-only access | Observers, reviewers |
| `learner-supervisor` | Learner Supervisor | Elevated peer access | TAs, peer mentors |

### 2.2 Staff Roles (Department-Scoped)

| Role | Display Name | Description | Use Case |
|------|-------------|-------------|----------|
| `instructor` | Instructor | Teaches and grades | Faculty, trainers |
| `department-admin` | Department Admin | Manages department | Department heads |
| `content-admin` | Content Admin | Manages content | Course developers |
| `billing-admin` | Billing Admin | Department billing | Department finance |

### 2.3 GlobalAdmin Roles (Master Department Only)

| Role | Display Name | Description | Use Case |
|------|-------------|-------------|----------|
| `system-admin` | System Admin | Full system access | IT administrators |
| `enrollment-admin` | Enrollment Admin | Enrollment system | Registrar |
| `course-admin` | Course Admin | Course system | Academic affairs |
| `theme-admin` | Theme Admin | Branding/themes | Marketing |
| `financial-admin` | Financial Admin | System-wide finance | CFO, accounting |

---

## Section 3: Access Rights Pattern

### 3.1 Naming Convention

```
{domain}:{resource}:{action}
```

**Examples:**
- `content:courses:read` - View courses
- `content:courses:manage` - Full control over courses
- `grades:own-classes:manage` - Grade your own classes
- `system:*` - All system access (wildcard)

### 3.2 Domains

| Domain | Description |
|--------|-------------|
| `content` | Courses, programs, lessons, SCORM |
| `enrollment` | Enrollments, class enrollments |
| `staff` | Staff management |
| `learner` | Learner management |
| `reports` | Analytics and reporting |
| `system` | System settings |
| `billing` | Financial operations |
| `audit` | Audit logs |
| `grades` | Grading operations |

### 3.3 Checking Access Rights

```typescript
function hasAccessRight(userRights: string[], required: string): boolean {
  // Direct match
  if (userRights.includes(required)) return true;
  
  // Wildcard check (e.g., 'system:*' grants all system rights)
  const [domain] = required.split(':');
  if (userRights.includes(`${domain}:*`)) return true;
  
  return false;
}

function hasAnyAccessRight(userRights: string[], required: string[]): boolean {
  return required.some(r => hasAccessRight(userRights, r));
}

function hasAllAccessRights(userRights: string[], required: string[]): boolean {
  return required.every(r => hasAccessRight(userRights, r));
}
```

---

## Section 4: API Endpoint Contracts

### 4.1 Login Response (V2)

```typescript
// POST /api/v2/auth/login
interface LoginResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      isActive: boolean;
      lastLogin: string | null;
      createdAt: string;
    };
    
    session: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      tokenType: 'Bearer';
    };
    
    // NEW IN V2
    userTypes: UserType[];
    defaultDashboard: 'learner' | 'staff';
    canEscalateToAdmin: boolean;
    
    departmentMemberships: DepartmentMembership[];
    allAccessRights: string[];
    lastSelectedDepartment: string | null;
  };
}

interface DepartmentMembership {
  departmentId: string;
  departmentName: string;
  departmentSlug: string;
  roles: string[];
  accessRights: string[];
  isPrimary: boolean;
  isActive: boolean;
  joinedAt: string;
  childDepartments?: {
    departmentId: string;
    departmentName: string;
    roles: string[];
  }[];
}
```

### 4.2 Escalation Response

```typescript
// POST /api/v2/auth/escalate
// Requires: Authorization: Bearer <token>
// Body: { escalationPassword: string }

interface EscalateResponse {
  success: boolean;
  data: {
    adminSession: {
      adminToken: string;      // Store in MEMORY ONLY
      expiresIn: number;       // Default: 900 (15 minutes)
      adminRoles: string[];
      adminAccessRights: string[];
    };
    sessionTimeoutMinutes: number;
  };
}
```

### 4.3 Switch Department Response

```typescript
// POST /api/v2/auth/switch-department
// Body: { departmentId: string }

interface SwitchDepartmentResponse {
  success: boolean;
  data: {
    currentDepartment: {
      departmentId: string;
      departmentName: string;
      departmentSlug: string;
      roles: string[];
      accessRights: string[];
    };
    childDepartments: {
      departmentId: string;
      departmentName: string;
      roles: string[];
    }[];
    isDirectMember: boolean;
    inheritedFrom: string | null;
  };
}
```

### 4.4 Get My Roles Response

```typescript
// GET /api/v2/roles/me

interface MyRolesResponse {
  success: boolean;
  data: {
    userTypes: UserType[];
    defaultDashboard: 'learner' | 'staff';
    canEscalateToAdmin: boolean;
    departmentMemberships: DepartmentMembership[];
    allAccessRights: string[];
    lastSelectedDepartment: string | null;
    adminRoles: string[] | null;
  };
}
```

---

## Section 5: UI Component Visibility

### 5.1 Sidebar Links by Access Right

**Staff Dashboard Sidebar:**

| Link | Required Access Right | Notes |
|------|----------------------|-------|
| Dashboard Home | (any authenticated) | Always visible |
| My Classes | `content:classes:read` | Instructor view |
| Gradebook | `grades:own-classes:manage` | Instructor view |
| Course Library | `content:courses:read` | Available after dept select |
| Create Course | `content:courses:manage` | Content admin |
| Manage Staff | `staff:department:manage` | Department admin |
| Manage Learners | `learner:department:manage` | Department admin |
| Department Settings | `settings:department:manage` | Department admin |
| Billing | `billing:department:read` | Billing admin |

**Admin Dashboard Sidebar:**

| Link | Required Role | Notes |
|------|--------------|-------|
| System Settings | `system-admin` | Full system access |
| User Management | `system-admin` | Manage all users |
| Global Enrollment | `enrollment-admin` | Enrollment policies |
| Course Templates | `course-admin` | System-wide templates |
| Themes & Branding | `theme-admin` | UI customization |
| Financial Reports | `financial-admin` | System-wide finance |

### 5.2 Two-Tier Visibility Pattern

```
Staff Dashboard Sidebar:
┌────────────────────────────────────┐
│ ALWAYS VISIBLE (no dept selected) │
├────────────────────────────────────┤
│ • Dashboard Home                   │
│ • Global Reports                   │
│ • Profile Settings                 │
└────────────────────────────────────┘
┌────────────────────────────────────┐
│ AFTER DEPARTMENT SELECTED          │
├────────────────────────────────────┤
│ • Course Library (if has right)    │
│ • My Classes (if instructor)       │
│ • Gradebook (if instructor)        │
│ • Department Settings (if admin)   │
│ • Manage Staff (if admin)          │
│ • Billing (if billing-admin)       │
└────────────────────────────────────┘
```

### 5.3 React Component Pattern

```tsx
interface ProtectedLinkProps {
  requiredRights: string[];
  requireAll?: boolean;  // default: false (any match)
  currentRights: string[];
  children: React.ReactNode;
}

function ProtectedLink({ 
  requiredRights, 
  requireAll = false, 
  currentRights, 
  children 
}: ProtectedLinkProps) {
  const hasAccess = requireAll 
    ? hasAllAccessRights(currentRights, requiredRights)
    : hasAnyAccessRight(currentRights, requiredRights);
    
  if (!hasAccess) return null;
  
  return <>{children}</>;
}

// Usage:
<ProtectedLink 
  requiredRights={['content:courses:manage']} 
  currentRights={currentDepartmentAccessRights}
>
  <NavLink to="/courses/create">Create Course</NavLink>
</ProtectedLink>
```

---

## Section 6: State Management

### 6.1 Recommended Auth State

```typescript
interface AuthState {
  // Session
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  
  // User
  user: User | null;
  userTypes: UserType[];
  defaultDashboard: 'learner' | 'staff' | null;
  
  // Department Context
  departmentMemberships: DepartmentMembership[];
  currentDepartmentId: string | null;
  currentDepartmentRoles: string[];
  currentDepartmentAccessRights: string[];
  
  // Admin Session (MEMORY ONLY for adminToken)
  canEscalateToAdmin: boolean;
  isAdminSessionActive: boolean;
  adminToken: string | null;
  adminSessionExpiresAt: Date | null;
  adminRoles: string[];
  adminAccessRights: string[];
}
```

### 6.2 State Transitions

```
[Not Authenticated]
        │
        ▼ (Login)
[Authenticated - No Department]
        │
        ├─ Load lastSelectedDepartment if exists
        │
        ▼ (Select Department)
[Authenticated - Department Selected]
        │
        ├─ Show department-specific links
        │
        ▼ (Click "Login as Admin")
[Enter Escalation Password]
        │
        ├─ Correct → [Admin Session Active]
        │              │
        │              ├─ Show admin dashboard
        │              │
        │              ▼ (15 min timeout)
        │            [Admin Session Expired]
        │              └─ Redirect to Staff Dashboard
        │
        └─ Wrong → Show error, stay on Staff
```

### 6.3 Token Storage Rules

| Token | Storage Location | Persistence |
|-------|-----------------|-------------|
| `accessToken` | localStorage or secure cookie | Persistent |
| `refreshToken` | localStorage or secure cookie | Persistent |
| `adminToken` | **Memory only** (JavaScript variable) | **Never persist** |

**Why adminToken in memory only?**
- XSS attacks can read localStorage/sessionStorage
- Admin token grants elevated privileges
- If page refreshes, user must re-escalate (acceptable tradeoff)

---

## Section 7: Common UI Flows

### 7.1 Login Flow

```
1. User submits email/password
2. POST /api/v2/auth/login
3. Store accessToken, refreshToken
4. Read userTypes → determine dashboard
5. Read lastSelectedDepartment → restore context
6. If lastSelectedDepartment exists:
   a. Set currentDepartmentId
   b. Load department-specific accessRights
7. If no lastSelectedDepartment:
   a. Show "Select Department" prompt
   b. Show only "always visible" links
8. Navigate to appropriate dashboard
```

### 7.2 Department Switch Flow

```
1. User selects department from dropdown
2. POST /api/v2/auth/switch-department
3. Update currentDepartmentId
4. Update currentDepartmentRoles
5. Update currentDepartmentAccessRights
6. Re-render sidebar with new permissions
7. If on a page user no longer has access to:
   a. Redirect to department home
```

### 7.3 Admin Escalation Flow

```
1. User clicks "Login as Admin"
2. Show modal: "Enter Admin Password"
3. User enters escalation password
4. POST /api/v2/auth/escalate
5. If success:
   a. Store adminToken in memory
   b. Set isAdminSessionActive = true
   c. Set adminSessionExpiresAt
   d. Navigate to Admin Dashboard
   e. Start inactivity timer (15 min)
6. If failure:
   a. Show error message
   b. Clear password field
   c. Allow retry
```

### 7.4 Admin Session Timeout Flow

```
1. Track last activity timestamp
2. Every 60 seconds, check: now - lastActivity > 15 min?
3. If yes:
   a. Clear adminToken from memory
   b. Set isAdminSessionActive = false
   c. Show "Session expired" toast
   d. Navigate to Staff Dashboard
4. Optional: Show warning at 2 min remaining
```

---

## Section 8: Sensitive Data Handling

### 8.1 FERPA-Protected Access Rights

These rights grant access to protected student data:

```typescript
const FERPA_RIGHTS = [
  'learner:pii:read',
  'learner:grades:read',
  'learner:transcripts:read',
  'learner:transcripts:export',
  'reports:learner-detail:read'
];
```

**UI Requirements:**
- Show FERPA warning when accessing these areas
- Log access for audit trail
- No bulk export without explicit confirmation

### 8.2 Billing/Financial Rights

```typescript
const BILLING_RIGHTS = [
  'billing:payments:read',
  'billing:payments:process',
  'billing:refunds:manage',
  'billing:financial-reports:read'
];
```

**UI Requirements:**
- Financial data should have confirmation dialogs
- Payment processing requires double-confirmation
- Export should require reason/justification

---

## Section 9: Error Handling

### 9.1 Common Error Codes

| Code | HTTP Status | Meaning | UI Action |
|------|-------------|---------|-----------|
| `UNAUTHORIZED` | 401 | Token invalid/expired | Redirect to login |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password | Show error, clear password |
| `INVALID_ESCALATION_PASSWORD` | 401 | Wrong admin password | Show error, allow retry |
| `NOT_ADMIN` | 403 | Not a global-admin | Hide escalation option |
| `NOT_A_MEMBER` | 403 | No dept membership | Show error, redirect |
| `DEPARTMENT_NOT_FOUND` | 404 | Dept doesn't exist | Show error, reset selection |

### 9.2 Token Expiration Handling

```typescript
// Axios interceptor example
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const originalRequest = error.config;
      
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          const { data } = await refreshAccessToken();
          updateAuthState({ accessToken: data.accessToken });
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return axios(originalRequest);
        } catch (refreshError) {
          logout();
          redirectToLogin();
        }
      }
    }
    return Promise.reject(error);
  }
);
```

---

## Section 10: Testing Checklist

### 10.1 Authentication Tests

- [ ] Login with learner-only user → goes to Learner Dashboard
- [ ] Login with staff user → goes to Staff Dashboard
- [ ] Login with global-admin → shows "Login as Admin" button
- [ ] Login preserves lastSelectedDepartment
- [ ] Logout clears all tokens and state

### 10.2 Department Tests

- [ ] Department selector shows all memberships
- [ ] Switching department updates accessRights
- [ ] Child departments visible when parent selected
- [ ] Links gray out/hide when switching to dept without that role

### 10.3 Admin Escalation Tests

- [ ] "Login as Admin" only visible if canEscalateToAdmin
- [ ] Wrong password shows error, allows retry
- [ ] Correct password shows Admin Dashboard
- [ ] Admin session times out after 15 minutes
- [ ] Timeout redirects to Staff Dashboard
- [ ] adminToken not persisted in localStorage

### 10.4 Access Right Tests

- [ ] Links hidden when user lacks required right
- [ ] Wildcard rights (e.g., `system:*`) grant all in domain
- [ ] Sensitive data areas show appropriate warnings
- [ ] API 403 errors handled gracefully

---

## Appendix A: Example Login Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "jane.instructor@university.edu",
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
          },
          {
            "departmentId": "507f1f77bcf86cd799439102",
            "departmentName": "CBT Fundamentals",
            "roles": ["instructor", "content-admin"]
          }
        ]
      },
      {
        "departmentId": "507f1f77bcf86cd799439200",
        "departmentName": "Behavioral Psychology",
        "departmentSlug": "behavioral-psychology",
        "roles": ["instructor"],
        "accessRights": [
          "content:courses:read",
          "grades:own-classes:manage"
        ],
        "isPrimary": false,
        "isActive": true,
        "joinedAt": "2025-09-01T00:00:00.000Z",
        "childDepartments": []
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

---

## Appendix B: Migration from V1

If your UI was built for V1, here are the key changes:

| V1 Pattern | V2 Replacement |
|------------|----------------|
| `user.role` | `userTypes[]` array |
| `permissions: string[]` | `accessRights: string[]` with `domain:resource:action` pattern |
| `defaultDashboard: 'content-admin'` | `defaultDashboard: 'staff'` (roles checked separately) |
| Single global role check | Department-scoped role check |
| No admin escalation | `canEscalateToAdmin` + `/auth/escalate` |

---

## Appendix C: Contact & Support

For questions about these contracts:
- Backend Team: Refer to `devdocs/Role_System_API_Model_Plan_V2.md`
- API Issues: Create issue with `api-contract` label
- Clarifications: Check `devdocs/Role_System_Clarification_Questions.md` for Q&A history
