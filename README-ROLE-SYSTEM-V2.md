# LMS Role System V2 - Developer Guide

**Version:** 2.0.0
**Last Updated:** 2026-01-10

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Key Concepts](#key-concepts)
5. [Database Models](#database-models)
6. [API Endpoints](#api-endpoints)
7. [Authentication & Authorization](#authentication--authorization)
8. [Frontend Integration](#frontend-integration)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)
12. [API Reference](#api-reference)

---

## Overview

The Role System V2 is a complete redesign of the LMS authorization system, replacing the legacy single-role model with a flexible, department-scoped, multi-role approach.

### What's New in V2

- **Multiple User Types**: Users can be learners, staff, and global admins simultaneously
- **Department-Scoped Roles**: Different roles in different departments
- **Fine-Grained Permissions**: GNAP-compatible access rights (`domain:resource:action`)
- **Role Cascading**: Parent department roles cascade to children
- **Admin Escalation**: Separate authentication for admin dashboard access
- **Department Switching**: Dynamic context switching without re-authentication

### Key Benefits

- **Flexibility**: Users can have multiple roles across multiple departments
- **Security**: Escalation required for admin access, separate admin tokens
- **Performance**: Optimized queries with caching and indexes
- **Scalability**: Handles thousands of departments efficiently
- **Compliance**: FERPA-aware sensitive data categorization

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Migration

Migrate existing data to V2 schema:

```bash
npm run migrate:v2-role-system
```

This will:
- Create master department for global admins
- Seed role definitions (12 roles)
- Seed access rights (40+ permissions)
- Migrate existing User, Staff, Learner records
- Create GlobalAdmin records for admin users

### 3. Verify Migration

Check that role definitions and access rights were seeded:

```bash
npm run seed:verify
```

### 4. Run Tests

```bash
npm test
```

### 5. Start Development Server

```bash
npm run dev
```

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         User                                 │
│  - email, password                                           │
│  - userTypes: ['learner', 'staff', 'global-admin']         │
│  - defaultDashboard: 'learner' | 'staff'                   │
│  - lastSelectedDepartment: ObjectId                         │
└──────────────────┬──────────────────────────────────────────┘
                   │
         ┌─────────┴─────────┬──────────────┐
         │                   │              │
         ▼                   ▼              ▼
    ┌────────┐         ┌─────────┐    ┌──────────────┐
    │ Learner│         │  Staff  │    │ GlobalAdmin  │
    └────┬───┘         └────┬────┘    └──────┬───────┘
         │                  │                 │
         │  departmentMemberships             │
         │  - departmentId                    │
         │  - roles: []                       │
         │  - accessRights: []               │
         └──────────────────┴─────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Department  │
                    │  - parent   │
                    │  - children │
                    └─────────────┘
```

### Data Flow

1. **Login**: User authenticates → receives token with roles and access rights
2. **Department Selection**: User selects department → receives department-specific roles
3. **Authorization**: API checks access rights → grants/denies access
4. **Admin Escalation**: User enters escalation password → receives admin token
5. **Admin Actions**: API checks admin token → grants admin access

---

## Key Concepts

### UserTypes

UserTypes determine which dashboard(s) a user can access:

- **learner**: Access to Learner Dashboard only
- **staff**: Access to Staff Dashboard
- **global-admin**: Can escalate to Admin Dashboard

A user can have multiple userTypes (e.g., `['learner', 'staff']`).

### Roles

Roles are department-scoped capabilities within a userType:

**Learner Roles:**
- `course-taker`: Standard learner
- `auditor`: View-only access
- `learner-supervisor`: Elevated permissions (TA, peer mentor)

**Staff Roles:**
- `instructor`: Teaches classes, grades work
- `content-admin`: Creates/manages courses
- `department-admin`: Manages department operations
- `billing-admin`: Department billing

**Global Admin Roles:**
- `system-admin`: Full system access
- `enrollment-admin`: Manages enrollment system
- `course-admin`: Manages course system
- `theme-admin`: Manages themes/branding
- `financial-admin`: System-wide financial operations

### Access Rights

Access rights follow the GNAP pattern: `domain:resource:action`

**Examples:**
- `content:courses:read` - View course details
- `content:courses:manage` - Full course CRUD
- `enrollment:department:read` - View department enrollments
- `system:*` - All system permissions (wildcard)

**Domains:**
- `content`, `enrollment`, `staff`, `learner`, `reports`, `system`, `billing`, `audit`, `grades`

### Department Memberships

Users can have roles in multiple departments:

```typescript
{
  departmentId: ObjectId,
  roles: ['instructor', 'content-admin'],
  accessRights: ['content:courses:read', 'content:courses:manage'],
  isPrimary: true,
  isActive: true,
  joinedAt: Date
}
```

### Role Cascading

Roles cascade from parent to child departments unless `requireExplicitMembership` is true.

**Example:**
```
Department A (user has 'instructor' role)
  └── Department B (user automatically has 'instructor' role)
      └── Department C (user automatically has 'instructor' role)
```

### Master Department

Special system department (ID: `000000000000000000000001`) for global admin roles.

- `isSystem: true` - Cannot be deleted
- `isVisible: false` - Hidden from normal department lists
- Contains all GlobalAdmin role assignments

---

## Database Models

### User Model

```typescript
interface IUser {
  email: string;
  password: string; // hashed
  userTypes: ('learner' | 'staff' | 'global-admin')[];
  defaultDashboard: 'learner' | 'staff';
  lastSelectedDepartment?: ObjectId;
  isActive: boolean;
}
```

**Methods:**
- `hasUserType(type)`: Check if user has a specific userType
- `canEscalateToAdmin()`: Check if user can access admin dashboard

### Staff Model

```typescript
interface IStaff {
  userId: ObjectId;
  departmentMemberships: IDepartmentMembership[];
}

interface IDepartmentMembership {
  departmentId: ObjectId;
  roles: string[]; // Staff roles only
  isPrimary: boolean;
  isActive: boolean;
  joinedAt: Date;
}
```

**Methods:**
- `getRolesForDepartment(deptId)`: Get roles for specific department
- `hasDepartmentRole(deptId, role)`: Check for role in department

### Learner Model

```typescript
interface ILearner {
  userId: ObjectId;
  departmentMemberships: IDepartmentMembership[];
}
```

Same structure as Staff, but with learner roles only.

### GlobalAdmin Model

```typescript
interface IGlobalAdmin {
  userId: ObjectId;
  departmentMemberships: IDepartmentMembership[]; // Master department
  escalationPassword: string; // hashed, different from login password
  lastEscalation: Date;
  isActive: boolean;
}
```

### RoleDefinition Model

```typescript
interface IRoleDefinition {
  name: string; // e.g., 'instructor'
  userType: 'learner' | 'staff' | 'global-admin';
  displayName: string; // e.g., 'Instructor'
  description: string;
  accessRights: string[]; // e.g., ['content:courses:read']
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
}
```

### AccessRight Model

```typescript
interface IAccessRight {
  name: string; // e.g., 'content:courses:read'
  domain: string; // e.g., 'content'
  resource: string; // e.g., 'courses'
  action: string; // e.g., 'read'
  description: string;
  isSensitive: boolean;
  sensitiveCategory?: 'ferpa' | 'billing' | 'pii' | 'audit';
  isActive: boolean;
}
```

### Department Model

```typescript
interface IDepartment {
  name: string;
  slug: string;
  description: string;
  parentDepartmentId?: ObjectId;
  isSystem: boolean; // Cannot be deleted
  isVisible: boolean; // Show in lists
  requireExplicitMembership: boolean; // Disable role cascading
  isActive: boolean;
}
```

---

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v2/auth/login` | Login and receive tokens + roles |
| POST | `/api/v2/auth/escalate` | Escalate to admin dashboard |
| POST | `/api/v2/auth/deescalate` | Exit admin dashboard |
| POST | `/api/v2/auth/switch-department` | Switch department context |
| POST | `/api/v2/auth/continue` | Refresh access rights |
| GET | `/api/v2/auth/me` | Get current user info |
| POST | `/api/v2/auth/set-escalation-password` | Set admin password |
| POST | `/api/v2/auth/refresh` | Refresh access token |
| POST | `/api/v2/auth/logout` | Logout and invalidate tokens |

### Roles Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/roles` | List all role definitions |
| GET | `/api/v2/roles/:name` | Get single role definition |
| PUT | `/api/v2/roles/:name/access-rights` | Update role permissions (admin) |
| GET | `/api/v2/roles/me` | Get current user's roles |
| GET | `/api/v2/roles/me/department/:id` | Get roles for department |

### Access Rights Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/access-rights` | List all access rights |
| GET | `/api/v2/access-rights/role/:name` | Get access rights for role |

See [API Documentation](docs/api/auth-v2.md) for full details.

---

## Authentication & Authorization

### Backend Middleware

#### isAuthenticated

Validates access token and attaches user data to request:

```typescript
app.get('/api/protected', isAuthenticated, (req, res) => {
  // req.user contains user data
  // req.user.accessRights contains all access rights
});
```

#### requireDepartmentMembership

Verifies user is a member of the department:

```typescript
app.post('/api/departments/:deptId/courses',
  requireDepartmentMembership,
  createCourse
);
```

#### requireDepartmentRole

Checks user has specific role(s) in department:

```typescript
app.post('/api/departments/:deptId/courses',
  requireDepartmentRole(['content-admin', 'department-admin']),
  createCourse
);
```

#### requireAccessRight

Checks user has specific access right(s):

```typescript
app.post('/api/courses',
  requireAccessRight(['content:courses:manage']),
  createCourse
);

// Require ANY of the rights
app.get('/api/reports/billing',
  requireAccessRight(
    ['billing:department:read', 'reports:billing:read'],
    { requireAny: true }
  ),
  getBillingReport
);
```

#### requireEscalation

Requires valid admin token:

```typescript
app.get('/api/admin/settings',
  requireEscalation,
  getSettings
);
```

#### requireAdminRole

Requires specific admin role (must follow requireEscalation):

```typescript
app.put('/api/admin/settings',
  requireEscalation,
  requireAdminRole(['system-admin']),
  updateSettings
);
```

### Frontend Integration

#### Login Flow

```typescript
async function login(email: string, password: string) {
  const response = await fetch('/api/v2/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const { data } = await response.json();

  // Store tokens
  localStorage.setItem('accessToken', data.session.accessToken);
  localStorage.setItem('refreshToken', data.session.refreshToken);

  // Store user data
  setState({
    user: data.user,
    userTypes: data.userTypes,
    departmentMemberships: data.departmentMemberships,
    allAccessRights: data.allAccessRights,
    canEscalateToAdmin: data.canEscalateToAdmin
  });

  // Navigate based on userTypes
  if (data.defaultDashboard === 'learner') {
    navigate('/learner-dashboard');
  } else {
    navigate('/staff-dashboard');
  }
}
```

#### Admin Escalation Flow

```typescript
async function escalateToAdmin(escalationPassword: string) {
  const response = await fetch('/api/v2/auth/escalate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ escalationPassword })
  });

  const { data } = await response.json();

  // Store admin token in MEMORY ONLY (not localStorage!)
  window.__adminToken = data.adminSession.adminToken;

  // Navigate to admin dashboard
  navigate('/admin-dashboard');

  // Start timeout warning
  startAdminSessionTimeout(data.adminSession.expiresIn);
}
```

#### Using Admin Token

```typescript
async function makeAdminAPICall(endpoint: string, data: any) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Admin-Token': window.__adminToken, // Admin token
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  return response.json();
}
```

#### Permission Checks

```typescript
function hasAccessRight(userRights: string[], requiredRight: string): boolean {
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
    return null; // Hide if no permission
  }

  return <button>Manage Courses</button>;
}
```

---

## Testing

### Unit Tests

Run unit tests for individual components:

```bash
npm test -- models/User.model.test.ts
npm test -- services/role.service.test.ts
```

### Integration Tests

Run integration tests for API endpoints:

```bash
npm test -- integration/auth-v2.test.ts
npm test -- integration/roles-api.test.ts
```

### End-to-End Tests

Run complete user journey tests:

```bash
npm test -- integration/role-system-e2e.test.ts
```

### Test Coverage

Generate coverage report:

```bash
npm run test:coverage
```

Target: 80%+ coverage for role system code.

---

## Deployment

### Pre-Deployment Checklist

- [ ] Run migration on staging environment
- [ ] Verify all seed data loaded correctly
- [ ] Run full test suite
- [ ] Test admin escalation flow
- [ ] Test department switching with production-like data
- [ ] Verify performance with large datasets
- [ ] Check error handling and logging

### Migration Steps

1. **Backup Database:**
   ```bash
   mongodump --uri="mongodb://..." --out=/backup/pre-v2-migration
   ```

2. **Run Migration:**
   ```bash
   NODE_ENV=production npm run migrate:v2-role-system
   ```

3. **Verify Migration:**
   ```bash
   npm run seed:verify
   ```

4. **Test Critical Paths:**
   - Admin login and escalation
   - Staff login and department switching
   - Learner login and course enrollment
   - Role-based access control

5. **Monitor for Issues:**
   - Check application logs
   - Monitor error rates
   - Watch for permission-related errors

### Rollback Plan

If issues occur:

```bash
npm run migrate:v2-role-system:down
```

Then restore from backup:

```bash
mongorestore --uri="mongodb://..." /backup/pre-v2-migration
```

---

## Troubleshooting

### Common Issues

#### Issue: "Invalid or expired token"

**Cause:** Access token expired or invalid

**Solution:**
- Refresh token using `/auth/refresh` endpoint
- If refresh token also expired, user must re-login

#### Issue: "User does not have global-admin userType"

**Cause:** User trying to escalate without global-admin userType

**Solution:**
- Add 'global-admin' to user's userTypes array
- Create GlobalAdmin record for user

#### Issue: "Not a member of this department"

**Cause:** User trying to access department without membership

**Solution:**
- Add department membership to Staff or Learner record
- Check if role cascading is enabled (requireExplicitMembership)

#### Issue: "Admin session expired"

**Cause:** Admin token expired (default 15 minutes)

**Solution:**
- Re-escalate with escalation password
- Increase admin session timeout in config (not recommended)

#### Issue: Performance slow with many departments

**Cause:** N+1 queries or missing indexes

**Solution:**
- Ensure indexes on departmentMemberships.departmentId
- Use aggregation pipelines for complex queries
- Implement caching for role definitions and access rights

### Debug Mode

Enable debug logging:

```bash
DEBUG=role-system:* npm run dev
```

This will log:
- Permission checks
- Role cascading logic
- Token validation
- Department switching

---

## API Reference

### Full API Documentation

- [Authentication API V2](docs/api/auth-v2.md) - Complete auth endpoint reference
- [Roles API](docs/api/roles.md) - Roles and access rights endpoints
- [Postman Collection](docs/postman/LMS-V2-Auth.postman_collection.json) - Importable API collection

### Additional Resources

- [Migration Guide](MIGRATION-GUIDE.md) - Step-by-step V1 → V2 migration
- [Phased Implementation Plan](devdocs/Role_System_V2_Phased_Implementation.md) - Development roadmap
- [UI Recommendations](devdocs/UI_Authorization_Recommendations.md) - Frontend best practices
- [E2E Tests](tests/integration/role-system-e2e.test.ts) - Complete test examples

---

## Support

### Getting Help

1. Check this documentation first
2. Review API documentation for endpoint details
3. Check test files for usage examples
4. Review troubleshooting section
5. Contact development team

### Contributing

When contributing to the role system:

1. Follow existing patterns and conventions
2. Add tests for new features
3. Update documentation
4. Run full test suite before submitting PR
5. Consider performance implications

### Version History

- **v2.0.0** (2026-01-10) - Initial V2 release
  - Multi-role, department-scoped authorization
  - Admin escalation system
  - Role cascading
  - GNAP-compatible access rights

---

## License

Copyright © 2026 LMS Development Team
