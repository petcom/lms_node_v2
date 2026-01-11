# Endpoint Role Authorization

**Version:** 1.0  
**Date:** 2026-01-10  
**Purpose:** Define which roles can access which API endpoints

---

## Table of Contents

1. [Authorization Approach](#1-authorization-approach)
2. [Authentication Endpoints](#2-authentication-endpoints)
3. [Learner Dashboard Endpoints](#3-learner-dashboard-endpoints)
4. [Staff Dashboard Endpoints](#4-staff-dashboard-endpoints)
5. [Admin Dashboard Endpoints](#5-admin-dashboard-endpoints)
6. [Sensitive Data Endpoints (FERPA/Billing)](#6-sensitive-data-endpoints)
7. [Future Billing Endpoints](#7-future-billing-endpoints)
8. [Middleware Reference](#8-middleware-reference)

---

## 1. Authorization Approach

### General Rules

| Operation Type | Authorization Rule |
|----------------|-------------------|
| **Read (GET)** | Usually any authenticated user with membership in the department |
| **Write (POST/PUT/PATCH)** | Require specific role(s) based on domain |
| **Delete (DELETE)** | Require elevated role(s) - typically admin level |
| **Admin (System)** | Require GlobalAdmin userType + escalation + specific admin role |

### Middleware Stack

```typescript
// Standard authenticated endpoint
router.get('/resource',
  isAuthenticated,            // Verify JWT
  requireDepartmentContext,   // Ensure department selected
  requireDepartmentMembership // User has membership in department
);

// Role-protected endpoint
router.post('/resource',
  isAuthenticated,
  requireDepartmentContext,
  requireDepartmentRole(['content-admin', 'department-admin'])
);

// Admin endpoint (requires escalation)
router.put('/admin/settings',
  isAuthenticated,
  requireEscalation,          // Verify admin token
  requireAdminRole(['system-admin', 'theme-admin'])
);
```

---

## 2. Authentication Endpoints

No department context required for these endpoints.

| Method | Endpoint | Required Auth | Description |
|--------|----------|---------------|-------------|
| POST | `/auth/login` | None | Login with email/password |
| POST | `/auth/register` | None | Register new user |
| POST | `/auth/refresh` | Refresh Token | Refresh access token |
| POST | `/auth/logout` | Access Token | Invalidate tokens |
| POST | `/auth/forgot-password` | None | Request password reset |
| POST | `/auth/reset-password` | Reset Token | Reset password |
| GET | `/auth/me` | Access Token | Get current user + access rights |
| POST | `/auth/escalate` | Access Token + GlobalAdmin | Escalate to admin dashboard |
| POST | `/auth/switch-department` | Access Token | Switch department context |

---

## 3. Learner Dashboard Endpoints

These endpoints are for learner-type users accessing learner dashboard.

### My Courses & Progress

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/learner/courses` | `course-taker`, `auditor`, `learner-supervisor` | View enrolled courses |
| GET | `/learner/courses/:id` | `course-taker`, `auditor`, `learner-supervisor` | View course details |
| GET | `/learner/courses/:id/lessons` | `course-taker`, `auditor`, `learner-supervisor` | View course lessons |
| GET | `/learner/progress` | `course-taker`, `learner-supervisor` | View overall progress |
| GET | `/learner/progress/:courseId` | `course-taker`, `learner-supervisor` | View course progress |

### Exams & Grades

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/learner/exams` | `course-taker`, `learner-supervisor` | View available exams |
| POST | `/learner/exams/:id/attempt` | `course-taker` | Start exam attempt |
| PUT | `/learner/exams/:id/submit` | `course-taker` | Submit exam |
| GET | `/learner/grades` | `course-taker`, `learner-supervisor` | View own grades |
| GET | `/learner/grades/:courseId` | `course-taker`, `learner-supervisor` | View course grades |

### Certificates

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/learner/certificates` | `course-taker`, `learner-supervisor` | View certificates |
| GET | `/learner/certificates/:id/download` | `course-taker`, `learner-supervisor` | Download certificate |

### Enrollments

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/learner/enrollments` | Any learner role | View own enrollments |
| POST | `/learner/enrollments` | `course-taker` | Self-enroll in course |
| DELETE | `/learner/enrollments/:id` | `course-taker` | Withdraw from course |

### Profile

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/learner/profile` | Any learner role | View own profile |
| PUT | `/learner/profile` | Any learner role | Update own profile |

### Learner Supervisor Features

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/learner/department/learners` | `learner-supervisor` | View department learners |
| GET | `/learner/department/progress` | `learner-supervisor` | View department progress |

---

## 4. Staff Dashboard Endpoints

These endpoints require staff userType and department membership.

### Course Management

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/departments/:deptId/courses` | Any staff role | View courses |
| POST | `/departments/:deptId/courses` | `content-admin` | Create course |
| GET | `/departments/:deptId/courses/:id` | Any staff role | View course details |
| PUT | `/departments/:deptId/courses/:id` | `content-admin` | Update course |
| DELETE | `/departments/:deptId/courses/:id` | `content-admin` | Delete course |
| POST | `/departments/:deptId/courses/:id/publish` | `content-admin` | Publish course |
| POST | `/departments/:deptId/courses/:id/unpublish` | `content-admin` | Unpublish course |

### Lesson Management

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/courses/:courseId/lessons` | Any staff role | View lessons |
| POST | `/courses/:courseId/lessons` | `content-admin` | Create lesson |
| PUT | `/courses/:courseId/lessons/:id` | `content-admin` | Update lesson |
| DELETE | `/courses/:courseId/lessons/:id` | `content-admin` | Delete lesson |

### Program Management

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/departments/:deptId/programs` | Any staff role | View programs |
| POST | `/departments/:deptId/programs` | `content-admin` | Create program |
| PUT | `/departments/:deptId/programs/:id` | `content-admin` | Update program |
| DELETE | `/departments/:deptId/programs/:id` | `content-admin` | Delete program |

### Class Management

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/departments/:deptId/classes` | Any staff role | View classes |
| POST | `/departments/:deptId/classes` | `department-admin` | Create class |
| GET | `/departments/:deptId/classes/:id` | Any staff role | View class details |
| PUT | `/departments/:deptId/classes/:id` | `department-admin`, `instructor` (own) | Update class |
| DELETE | `/departments/:deptId/classes/:id` | `department-admin` | Delete class |

### Instructor Features

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/instructor/classes` | `instructor` | View assigned classes |
| GET | `/instructor/classes/:id/roster` | `instructor` | View class roster |
| POST | `/instructor/classes/:id/attendance` | `instructor` | Record attendance |
| GET | `/instructor/classes/:id/grades` | `instructor` | View class grades |
| PUT | `/instructor/classes/:id/grades` | `instructor` | Update grades |

### Enrollment Management

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/departments/:deptId/enrollments` | `department-admin`, `instructor` | View enrollments |
| POST | `/departments/:deptId/enrollments` | `department-admin` | Create enrollment |
| PUT | `/departments/:deptId/enrollments/:id` | `department-admin` | Update enrollment |
| DELETE | `/departments/:deptId/enrollments/:id` | `department-admin` | Remove enrollment |
| POST | `/departments/:deptId/enrollments/bulk` | `department-admin` | Bulk enroll |

### Staff Management

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/departments/:deptId/staff` | `department-admin` | View staff |
| POST | `/departments/:deptId/staff` | `department-admin` | Add staff to department |
| PUT | `/departments/:deptId/staff/:id` | `department-admin` | Update staff roles |
| DELETE | `/departments/:deptId/staff/:id` | `department-admin` | Remove staff from department |

### Learner Management

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/departments/:deptId/learners` | `department-admin`, `instructor` | View learners |
| POST | `/departments/:deptId/learners` | `department-admin` | Add learner to department |
| PUT | `/departments/:deptId/learners/:id` | `department-admin` | Update learner roles |
| DELETE | `/departments/:deptId/learners/:id` | `department-admin` | Remove learner |

### Reports & Analytics

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/departments/:deptId/analytics` | Any staff role | View department analytics |
| GET | `/departments/:deptId/reports/courses` | `content-admin`, `department-admin` | Course reports |
| GET | `/departments/:deptId/reports/learners` | `department-admin` | Learner reports |
| GET | `/departments/:deptId/reports/instructors` | `department-admin` | Instructor reports |
| GET | `/instructor/reports/classes` | `instructor` | Class reports for instructor |
| POST | `/departments/:deptId/reports/export` | `department-admin` | Export reports |

### Department Settings

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/departments/:deptId/settings` | `department-admin` | View settings |
| PUT | `/departments/:deptId/settings` | `department-admin` | Update settings |
| GET | `/departments/:deptId/subdepartments` | `department-admin` | View subdepartments |
| POST | `/departments/:deptId/subdepartments` | `department-admin` | Create subdepartment |

---

## 5. Admin Dashboard Endpoints

These endpoints require GlobalAdmin userType + successful escalation.
All endpoints must pass through `requireEscalation` middleware.

### System Settings

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/admin/settings` | Any admin role | View system settings |
| PUT | `/admin/settings` | `system-admin` | Update all settings |
| PUT | `/admin/settings/theme` | `theme-admin`, `system-admin` | Update theme |
| PUT | `/admin/settings/branding` | `theme-admin`, `system-admin` | Update branding |
| PUT | `/admin/settings/emails` | `theme-admin`, `system-admin` | Update email templates |

### User Management

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/admin/users` | `system-admin` | List all users |
| GET | `/admin/users/:id` | `system-admin` | Get user details |
| POST | `/admin/users` | `system-admin` | Create user |
| PUT | `/admin/users/:id` | `system-admin` | Update user |
| DELETE | `/admin/users/:id` | `system-admin` | Deactivate user |
| PUT | `/admin/users/:id/userTypes` | `system-admin` | Modify user types |

### GlobalAdmin Management

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/admin/admins` | `system-admin` | List global admins |
| POST | `/admin/admins` | `system-admin` | Create global admin |
| PUT | `/admin/admins/:id/roles` | `system-admin` | Update admin roles |
| DELETE | `/admin/admins/:id` | `system-admin` | Remove admin access |

### Department Management

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/admin/departments` | Any admin role | List all departments |
| POST | `/admin/departments` | `system-admin` | Create department |
| PUT | `/admin/departments/:id` | `system-admin` | Update department |
| DELETE | `/admin/departments/:id` | `system-admin` | Delete department |

### Enrollment Administration

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/admin/enrollments` | `enrollment-admin`, `system-admin` | View all enrollments |
| POST | `/admin/enrollments/bulk` | `enrollment-admin`, `system-admin` | Bulk operations |
| GET | `/admin/enrollments/policies` | `enrollment-admin`, `system-admin` | View policies |
| PUT | `/admin/enrollments/policies` | `enrollment-admin`, `system-admin` | Update policies |

### Course Administration

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/admin/courses` | `course-admin`, `system-admin` | View all courses |
| GET | `/admin/courses/templates` | `course-admin`, `system-admin` | View templates |
| POST | `/admin/courses/templates` | `course-admin`, `system-admin` | Create template |
| GET | `/admin/courses/categories` | `course-admin`, `system-admin` | View categories |
| POST | `/admin/courses/categories` | `course-admin`, `system-admin` | Create category |

### Global Reports

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/admin/reports/overview` | Any admin role | System overview |
| GET | `/admin/reports/departments` | Any admin role | Cross-department reports |
| GET | `/admin/reports/users` | `system-admin` | User statistics |
| GET | `/admin/reports/enrollments` | `enrollment-admin`, `system-admin` | Enrollment analytics |
| GET | `/admin/reports/content` | `course-admin`, `system-admin` | Content analytics |
| POST | `/admin/reports/export` | `system-admin` | Export any report |

### Audit Logs

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/admin/audit` | `system-admin` | View audit logs |
| GET | `/admin/audit/:id` | `system-admin` | View log details |
| POST | `/admin/audit/export` | `system-admin` | Export audit logs |

### Role & Permission Management

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/admin/roles` | Any admin role | View role definitions |
| PUT | `/admin/roles/:name` | `system-admin` | Update role access rights |
| GET | `/admin/access-rights` | Any admin role | View access rights |
| PUT | `/admin/access-rights/:name` | `system-admin` | Update access right |

---

## 6. Sensitive Data Endpoints

These endpoints access FERPA-protected or PII data and require extra scrutiny.

### FERPA Protected (Educational Records)

| Method | Endpoint | Required Roles | Sensitive Category |
|--------|----------|----------------|-------------------|
| GET | `/learners/:id/transcript` | `department-admin` | FERPA |
| GET | `/learners/:id/grades/all` | `department-admin`, `instructor` (own) | FERPA |
| POST | `/learners/:id/transcript/export` | `department-admin` | FERPA |
| GET | `/admin/reports/learner-detail/:id` | `system-admin` | FERPA |

### PII Data

| Method | Endpoint | Required Roles | Sensitive Category |
|--------|----------|----------------|-------------------|
| GET | `/learners/:id/contact` | `department-admin` | PII |
| GET | `/learners/:id/emergency-contact` | `department-admin` | PII |
| GET | `/staff/:id/contact` | `department-admin` | PII |
| POST | `/admin/reports/pii/export` | `system-admin` | PII |

### Audit/Security

| Method | Endpoint | Required Roles | Sensitive Category |
|--------|----------|----------------|-------------------|
| GET | `/admin/audit/security` | `system-admin` | Audit |
| GET | `/admin/audit/logins` | `system-admin` | Audit |
| GET | `/admin/audit/user/:id` | `system-admin` | Audit |

---

## 7. Future Billing Endpoints

These endpoints are projected for the billing system (not yet implemented).

### Department-Level Billing (Staff Dashboard)

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/departments/:deptId/billing` | `billing-admin` | View billing overview |
| GET | `/departments/:deptId/billing/invoices` | `billing-admin` | View invoices |
| POST | `/departments/:deptId/billing/invoices` | `billing-admin` | Create invoice |
| PUT | `/departments/:deptId/billing/invoices/:id` | `billing-admin` | Update invoice |
| POST | `/departments/:deptId/billing/invoices/:id/send` | `billing-admin` | Send invoice |
| GET | `/departments/:deptId/billing/payments` | `billing-admin` | View payments |
| POST | `/departments/:deptId/billing/payments` | `billing-admin` | Record payment |
| GET | `/departments/:deptId/billing/reports` | `billing-admin` | Billing reports |

### System-Level Financial (Admin Dashboard)

| Method | Endpoint | Required Roles | Notes |
|--------|----------|----------------|-------|
| GET | `/admin/billing` | `financial-admin`, `system-admin` | System billing overview |
| GET | `/admin/billing/settings` | `financial-admin`, `system-admin` | Billing settings |
| PUT | `/admin/billing/settings` | `financial-admin`, `system-admin` | Update settings |
| GET | `/admin/billing/policies` | `financial-admin`, `system-admin` | Billing policies |
| PUT | `/admin/billing/policies` | `financial-admin`, `system-admin` | Update policies |
| GET | `/admin/billing/reports` | `financial-admin`, `system-admin` | Financial reports |
| POST | `/admin/billing/reports/export` | `financial-admin`, `system-admin` | Export reports |
| GET | `/admin/billing/refunds` | `financial-admin`, `system-admin` | View refunds |
| POST | `/admin/billing/refunds` | `financial-admin`, `system-admin` | Process refund |

---

## 8. Middleware Reference

### isAuthenticated

Verifies JWT access token. Required for all protected endpoints.

```typescript
export const isAuthenticated = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  const decoded = verifyAccessToken(token);
  req.user = await User.findById(decoded.userId);
  next();
};
```

### requireDepartmentContext

Ensures a department is selected in the request.

```typescript
export const requireDepartmentContext = (req, res, next) => {
  const deptId = req.params.deptId || req.headers['x-department-id'];
  if (!deptId) return res.status(400).json({ error: 'Department context required' });
  
  req.departmentId = deptId;
  next();
};
```

### requireDepartmentMembership

Verifies user has membership in the specified department.

```typescript
export const requireDepartmentMembership = async (req, res, next) => {
  const { user, departmentId } = req;
  
  // Check Staff membership
  const staff = await Staff.findById(user._id);
  const hasMembership = staff?.departmentMemberships.some(
    m => m.departmentId.equals(departmentId) && m.isActive
  );
  
  if (!hasMembership) {
    return res.status(403).json({ error: 'No membership in this department' });
  }
  
  next();
};
```

### requireDepartmentRole

Verifies user has one of the required roles in the department.

```typescript
export const requireDepartmentRole = (requiredRoles: string[]) => {
  return async (req, res, next) => {
    const { user, departmentId } = req;
    
    const staff = await Staff.findById(user._id);
    const membership = staff?.departmentMemberships.find(
      m => m.departmentId.equals(departmentId) && m.isActive
    );
    
    if (!membership) {
      return res.status(403).json({ error: 'No membership in this department' });
    }
    
    const hasRole = requiredRoles.some(role => membership.roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        requiredRoles 
      });
    }
    
    next();
  };
};
```

### requireEscalation

Verifies user has escalated to admin dashboard with valid admin token.

```typescript
export const requireEscalation = async (req, res, next) => {
  const adminToken = req.headers['x-admin-token'];
  if (!adminToken) {
    return res.status(403).json({ error: 'Admin escalation required' });
  }
  
  const decoded = verifyAdminToken(adminToken);
  if (!decoded || decoded.expiresAt < Date.now()) {
    return res.status(403).json({ error: 'Admin session expired' });
  }
  
  const globalAdmin = await GlobalAdmin.findById(req.user._id);
  if (!globalAdmin || !globalAdmin.isActive) {
    return res.status(403).json({ error: 'Not a global admin' });
  }
  
  req.globalAdmin = globalAdmin;
  next();
};
```

### requireAdminRole

Verifies user has one of the required GlobalAdmin roles.

```typescript
export const requireAdminRole = (requiredRoles: string[]) => {
  return async (req, res, next) => {
    const { globalAdmin } = req;
    
    const userRoles = globalAdmin.getAllRoles();
    
    // system-admin has access to everything
    if (userRoles.includes('system-admin')) {
      return next();
    }
    
    const hasRole = requiredRoles.some(role => userRoles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ 
        error: 'Insufficient admin permissions',
        requiredRoles 
      });
    }
    
    next();
  };
};
```

---

## Appendix: Role Summary

### Learner Roles → Access Scope

| Role | Scope | Dashboard Access |
|------|-------|------------------|
| `course-taker` | Own enrollments, department courses | Learner |
| `auditor` | View-only department courses | Learner |
| `learner-supervisor` | Department learners + progress | Learner |

### Staff Roles → Access Scope

| Role | Scope | Dashboard Access |
|------|-------|------------------|
| `instructor` | Own classes, grades | Staff |
| `content-admin` | Department content | Staff |
| `department-admin` | Full department management | Staff |
| `billing-admin` | Department billing | Staff |

### GlobalAdmin Roles → Access Scope

| Role | Scope | Dashboard Access |
|------|-------|------------------|
| `system-admin` | Everything | Admin (via escalation) |
| `enrollment-admin` | System enrollments | Admin (via escalation) |
| `course-admin` | System courses | Admin (via escalation) |
| `theme-admin` | Themes, branding | Admin (via escalation) |
| `financial-admin` | System billing | Admin (via escalation) |

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-10 | Initial document |
