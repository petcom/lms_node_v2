# Unified Authorization Model Specification

**Version:** 1.0 (Draft)
**Date:** 2026-01-22
**Status:** Review Required
**Author:** API Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current System Analysis](#current-system-analysis)
3. [Problem Statement](#problem-statement)
4. [Proposed Models](#proposed-models)
5. [Recommended Model](#recommended-model)
6. [Data Structures](#data-structures)
7. [Authorization Flow](#authorization-flow)
8. [Caching Strategy](#caching-strategy)
9. [Migration Path](#migration-path)
10. [Open Questions](#open-questions)

---

## Executive Summary

This document proposes a unified authorization model to replace the current dual system (access rights + department/role checks). The goal is to:

1. **Simplify** - One authorization paradigm instead of two
2. **Optimize** - Reduce database queries from 3-10+ to 0-1 per request
3. **Scale** - Support horizontal scaling with stateless/cached auth
4. **Maintain** - Easier to reason about and debug

---

## Current System Analysis

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Current System                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  JWT Token                    Database (per request)            │
│  ┌──────────────┐            ┌─────────────────────────────┐   │
│  │ userId       │            │ User.findById()             │   │
│  │ email        │ ────────►  │ Staff.findById()            │   │
│  │ roles[]      │            │ Learner.findById()          │   │
│  └──────────────┘            │ RoleDefinition.find() x N   │   │
│                              └─────────────────────────────┘   │
│                                          │                      │
│                                          ▼                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    req.user                             │    │
│  │  ┌─────────────────────┐  ┌─────────────────────────┐  │    │
│  │  │ allAccessRights[]   │  │ departmentMemberships[] │  │    │
│  │  │ content:courses:read│  │ {deptId, roles[]}       │  │    │
│  │  │ content:courses:mgmt│  │ {deptId, roles[]}       │  │    │
│  │  └─────────────────────┘  └─────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────┘    │
│                    │                         │                  │
│                    ▼                         ▼                  │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │ Route Middleware        │  │ Service Layer               │  │
│  │ requireAccessRight()    │  │ canViewCourse()             │  │
│  │ Checks: allAccessRights │  │ Checks: departmentMemberships│  │
│  └─────────────────────────┘  └─────────────────────────────┘  │
│                                                                 │
│  TWO DIFFERENT AUTHORIZATION PARADIGMS                          │
└─────────────────────────────────────────────────────────────────┘
```

### Current Data Flow

| Step | Operation | Queries |
|------|-----------|---------|
| 1 | Verify JWT | 0 |
| 2 | Fetch User | 1 |
| 3 | Fetch Staff | 1 |
| 4 | Fetch Learner | 1 |
| 5 | Fetch RoleDefinitions (per role) | N |
| 6 | Build accessRights[] | 0 |
| 7 | Route: check accessRights | 0 |
| 8 | Service: check departmentMemberships | 0-M |
| **Total** | | **3 + N + M** |

### Current Access Right Format

```
domain:resource:action

Examples:
- content:courses:read
- content:courses:manage
- enrollment:students:read
- reports:department:read
- system:*
```

### Current Role Definitions

```typescript
// Stored in RoleDefinition collection
{
  name: 'instructor',
  userType: 'staff',
  accessRights: [
    'content:courses:read',
    'content:lessons:read',
    'grades:own-classes:manage',
    'reports:own-classes:read'
  ]
}
```

### Current Department Memberships

```typescript
// Stored in Staff/Learner documents
{
  departmentMemberships: [
    {
      departmentId: ObjectId,
      roles: ['instructor', 'content-admin'],
      isPrimary: true,
      isActive: true
    }
  ]
}
```

---

## Problem Statement

### Issues with Current System

1. **Dual Authorization Logic**
   - Route middleware checks `allAccessRights`
   - Service layer checks `departmentMemberships` + roles
   - Two mental models to maintain
   - Inconsistent patterns across codebase

2. **Performance**
   - 3-10+ database queries per authenticated request
   - No caching layer
   - RoleDefinitions fetched repeatedly

3. **Department Scope Gap**
   - Access rights are global (not department-scoped)
   - Department scoping only in service layer
   - Can't express "can read courses in department X only"

4. **Complexity**
   - `canViewCourse()` has 100+ lines of authorization logic
   - Hard to audit "what can user X do?"
   - Hard to answer "who can access resource Y?"

---

## Proposed Models

### Option A: Access Rights Only (Scoped)

Extend access rights to include scope:

```
domain:resource:action:scope

Examples:
- content:courses:read:*              (all departments)
- content:courses:read:dept-123       (specific department)
- content:courses:read:dept-hierarchy (department + children)
- content:courses:manage:own          (own resources only)
```

**Pros:**
- Single authorization paradigm
- Cacheable in JWT or Redis
- Fine-grained control
- Easy to audit

**Cons:**
- Larger permission sets
- More complex permission strings
- Need to compute scoped rights on login

### Option B: RBAC Only (Contextual)

Drop access rights, use role + context checks everywhere:

```typescript
// All authorization via roles
authorize({
  user,
  action: 'read',
  resource: 'course',
  resourceDepartment: course.departmentId
})

// Checks:
// 1. User has role with 'course:read' capability
// 2. User's role is in resource's department (or parent)
```

**Pros:**
- Simpler mental model
- Fewer stored permissions
- Natural department scoping

**Cons:**
- Requires resource context for all checks
- Can't do route-level authorization easily
- More database lookups for context

### Option C: Unified Scoped Permissions (Recommended)

Combine best of both: compute scoped permissions once, use everywhere.

```typescript
// Computed on login, cached
{
  permissions: [
    { right: 'content:courses:read', scope: 'dept-123' },
    { right: 'content:courses:read', scope: 'dept-456' },
    { right: 'content:courses:manage', scope: 'dept-123' },
    { right: 'system:settings:read', scope: '*' }
  ],

  // Denormalized for fast lookup
  globalRights: ['system:settings:read'],
  departmentRights: {
    'dept-123': ['content:courses:read', 'content:courses:manage'],
    'dept-456': ['content:courses:read']
  }
}
```

**Pros:**
- Single source of truth
- Computed once, used everywhere
- Fast lookups (O(1) with maps)
- Cacheable
- Supports both global and scoped checks

**Cons:**
- Migration effort
- Need to recompute on role/membership changes

---

## Recommended Model

### Option C: Unified Scoped Permissions

#### Core Concepts

1. **Permission** = Right + Scope
2. **Right** = `domain:resource:action`
3. **Scope** = `*` (global) | `dept:{id}` | `own`

#### Permission Resolution

```
User's Roles (per department)
         │
         ▼
┌─────────────────────────────────┐
│     Role Definition             │
│  instructor:                    │
│    - content:courses:read       │
│    - grades:own-classes:manage  │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Scoped Permission             │
│  User in dept-123 as instructor │
│    → content:courses:read       │
│      scope: dept-123            │
│    → grades:own-classes:manage  │
│      scope: dept-123            │
└─────────────────────────────────┘
```

#### Authorization Check Flow

```typescript
// Single function for all authorization
async function authorize(params: {
  user: AuthenticatedUser,
  right: string,
  scope?: string,  // optional: specific department or '*'
  resource?: {     // optional: for resource-level checks
    type: string,
    id: string,
    departmentId?: string,
    createdBy?: string
  }
}): Promise<boolean> {

  // 1. Check global rights (scope: '*')
  if (user.globalRights.includes(right)) {
    return true;
  }

  // 2. If specific scope requested
  if (scope && scope !== '*') {
    return user.departmentRights[scope]?.includes(right) ?? false;
  }

  // 3. If resource provided, check resource's department
  if (resource?.departmentId) {
    // Check direct department
    if (user.departmentRights[resource.departmentId]?.includes(right)) {
      return true;
    }
    // Check parent departments (hierarchy)
    for (const [deptId, rights] of Object.entries(user.departmentRights)) {
      if (rights.includes(right) && isParentDepartment(deptId, resource.departmentId)) {
        return true;
      }
    }
  }

  // 4. Check 'own' scope if resource has creator
  if (resource?.createdBy === user.userId) {
    const ownRight = right.replace(':manage', ':own').replace(':read', ':own');
    // Check if user has 'own' variant of the right
  }

  return false;
}
```

---

## Data Structures

### UserPermissions (Computed & Cached)

```typescript
interface UserPermissions {
  userId: string;

  // All permissions with scopes
  permissions: Permission[];

  // Denormalized for O(1) lookup
  globalRights: string[];                    // Rights with scope: '*'
  departmentRights: Record<string, string[]>; // deptId → rights[]

  // Department hierarchy cache
  departmentHierarchy: Record<string, string[]>; // deptId → childDeptIds[]

  // Metadata
  computedAt: Date;
  expiresAt: Date;
}

interface Permission {
  right: string;      // e.g., 'content:courses:read'
  scope: string;      // '*' | 'dept:{id}' | 'own'
  source: {
    role: string;     // e.g., 'instructor'
    departmentId?: string;
  };
}
```

### RoleDefinition (Simplified)

```typescript
interface RoleDefinition {
  name: string;           // e.g., 'instructor'
  userType: 'staff' | 'learner' | 'global-admin';

  // Rights this role grants (applied to role's department scope)
  rights: string[];

  // Special flags
  inheritToSubdepartments: boolean;  // default: true

  // Metadata
  description: string;
  isActive: boolean;
}
```

### Cached Permission Format (Redis)

```
Key: auth:permissions:{userId}
TTL: 15 minutes (configurable)

Value: {
  "globalRights": ["system:settings:read", "reports:*"],
  "departmentRights": {
    "dept-123": ["content:courses:read", "content:courses:manage"],
    "dept-456": ["content:courses:read"]
  },
  "departmentHierarchy": {
    "dept-123": ["dept-789", "dept-abc"]
  },
  "computedAt": "2026-01-22T10:00:00Z",
  "version": 42
}
```

---

## Authorization Flow

### New Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Unified System                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  JWT Token              Cache (Redis)         Database          │
│  ┌──────────────┐      ┌─────────────┐      ┌──────────────┐   │
│  │ userId       │      │ permissions │      │ (fallback)   │   │
│  │ permVersion  │ ───► │ (15 min TTL)│ ───► │ Staff/Learner│   │
│  └──────────────┘      └─────────────┘      │ RoleDefinition│   │
│                               │              └──────────────┘   │
│                               ▼                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    req.user                             │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ globalRights: ['system:*']                      │   │    │
│  │  │ departmentRights: {                             │   │    │
│  │  │   'dept-123': ['content:courses:read', ...]     │   │    │
│  │  │ }                                               │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              ▼                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              authorize() - Single Function              │    │
│  │  • Route level: authorize(user, 'content:courses:read')│    │
│  │  • Service level: authorize(user, 'content:courses:read',   │
│  │                             { resource: course })       │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ONE AUTHORIZATION PARADIGM                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow

```
1. Request arrives with JWT
   │
2. Extract userId, permVersion from JWT
   │
3. Check Redis cache: auth:permissions:{userId}
   │
   ├─► Cache HIT + version matches
   │   └─► Use cached permissions (0 DB queries)
   │
   └─► Cache MISS or version mismatch
       │
       ├─► Fetch Staff/Learner from DB
       ├─► Fetch RoleDefinitions (cached in memory)
       ├─► Compute permissions
       ├─► Store in Redis with TTL
       └─► Use computed permissions
   │
4. Attach permissions to req.user
   │
5. Route middleware: authorize(user, 'content:courses:read')
   │
6. Controller/Service: authorize(user, 'content:courses:read', { resource })
   │
7. Return response
```

### Permission Computation

```typescript
async function computeUserPermissions(userId: string): Promise<UserPermissions> {
  const globalRights: string[] = [];
  const departmentRights: Record<string, string[]> = {};
  const permissions: Permission[] = [];

  // 1. Fetch user's Staff record
  const staff = await Staff.findById(userId);
  if (staff?.isActive) {
    for (const membership of staff.departmentMemberships) {
      if (!membership.isActive) continue;

      const deptId = membership.departmentId.toString();
      departmentRights[deptId] = departmentRights[deptId] || [];

      // 2. Get rights for each role (from cached RoleDefinitions)
      for (const roleName of membership.roles) {
        const role = getRoleDefinition(roleName); // Memory cache

        for (const right of role.rights) {
          // Add to department-scoped rights
          if (!departmentRights[deptId].includes(right)) {
            departmentRights[deptId].push(right);
          }

          permissions.push({
            right,
            scope: `dept:${deptId}`,
            source: { role: roleName, departmentId: deptId }
          });
        }

        // 3. Handle subdepartment inheritance
        if (role.inheritToSubdepartments) {
          const children = await getDepartmentChildren(deptId); // Cached
          for (const childId of children) {
            departmentRights[childId] = departmentRights[childId] || [];
            for (const right of role.rights) {
              if (!departmentRights[childId].includes(right)) {
                departmentRights[childId].push(right);
              }
            }
          }
        }
      }
    }
  }

  // 4. Fetch Learner record (similar logic)
  // ...

  // 5. Handle GlobalAdmin (if escalated)
  // ...

  return {
    userId,
    permissions,
    globalRights,
    departmentRights,
    departmentHierarchy: await getDepartmentHierarchy(),
    computedAt: new Date(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000)
  };
}
```

---

## Caching Strategy

### Three-Tier Cache

```
┌─────────────────────────────────────────────────────────────┐
│                    Caching Layers                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tier 1: Memory (per-instance)                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • RoleDefinitions (rarely change)                   │   │
│  │ • Department hierarchy (changes infrequently)       │   │
│  │ • TTL: 1 hour or event-based invalidation           │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│  Tier 2: Redis (shared)  ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • User permissions (auth:permissions:{userId})      │   │
│  │ • TTL: 15 minutes                                   │   │
│  │ • Invalidate on: role change, membership change     │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│  Tier 3: Database        ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • Source of truth                                   │   │
│  │ • Only accessed on cache miss                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Cache Invalidation Events

| Event | Invalidation Action |
|-------|---------------------|
| User role changed | Delete `auth:permissions:{userId}` |
| User department membership changed | Delete `auth:permissions:{userId}` |
| RoleDefinition updated | Clear memory cache, delete all `auth:permissions:*` |
| Department hierarchy changed | Clear memory cache, delete all `auth:permissions:*` |

### Cache Key Schema

```
auth:permissions:{userId}     - User's computed permissions
auth:roles:version            - Version counter for role definitions
auth:depts:version            - Version counter for department hierarchy
auth:user:{userId}:version    - User's permission version (for JWT validation)
```

---

## Migration Path

### Phase 1: Add Caching (Non-Breaking)

**Duration:** 1-2 days
**Risk:** Low

1. Add memory cache for RoleDefinitions
2. Add Redis cache for user permissions
3. Keep existing `isAuthenticated` middleware
4. Add cache invalidation on role/membership changes

**Result:** 3-10 queries → 0-1 queries per request

### Phase 2: Unified Permission Structure (Non-Breaking)

**Duration:** 2-3 days
**Risk:** Low-Medium

1. Add `globalRights` and `departmentRights` to cached permissions
2. Add `authorize()` helper function
3. Keep existing `requireAccessRight()` working
4. Add new permission checks alongside existing ones

**Result:** New authorization pattern available, old pattern still works

### Phase 3: Migrate Authorization Checks (Breaking for Internal Code)

**Duration:** 1-2 weeks
**Risk:** Medium

1. Replace `requireAccessRight()` calls with `authorize()`
2. Replace service-level department checks with `authorize()`
3. Remove dual authorization logic
4. Update tests

**Result:** Single authorization paradigm

### Phase 4: Cleanup (Breaking for Internal Code)

**Duration:** 2-3 days
**Risk:** Low

1. Remove deprecated `allAccessRights` from user context
2. Remove deprecated `departmentMemberships` (if fully migrated)
3. Remove old middleware
4. Update documentation

**Result:** Clean, unified system

---

## Open Questions

### For Review

1. **Cache TTL:** Is 15 minutes appropriate? Should we use shorter TTL with refresh-ahead?

2. **Real-time Invalidation:** Do we need WebSocket push to invalidate client-side cached permissions?

3. **Audit Trail:** Should we log authorization decisions for compliance?

4. **Global Admin Handling:** Should escalated admin rights be cached separately or computed per-request?

5. **Permission Versioning:** Should we include a version in JWT and check against cache version?

6. **Hierarchical Inheritance:** Should all roles inherit to subdepartments by default, or opt-in?

7. **Resource-Level Permissions:** Do we need per-resource permissions (e.g., "can edit course X specifically")?

8. **Negative Permissions:** Do we need deny rules (e.g., "instructor except for dept-123")?

---

## Appendix A: Permission Examples

### Current vs Proposed

| Scenario | Current | Proposed |
|----------|---------|----------|
| Instructor views course in their dept | `allAccessRights.includes('content:courses:read') && departmentMemberships.includes(course.dept)` | `authorize(user, 'content:courses:read', { resource: course })` |
| Admin views any course | `roles.includes('system-admin')` | `user.globalRights.includes('content:courses:read')` |
| Creator edits own course | `course.createdBy === user.id` | `authorize(user, 'content:courses:manage', { resource: course })` with 'own' scope |

### Permission Matrix

| Role | Department | Computed Rights |
|------|------------|-----------------|
| instructor | dept-123 | `departmentRights['dept-123'] = ['content:courses:read', 'grades:own-classes:manage']` |
| department-admin | dept-123 | `departmentRights['dept-123'] = ['content:courses:read', 'content:courses:manage', 'staff:department:manage']` |
| system-admin | (global) | `globalRights = ['*']` |

---

## Appendix B: API Changes

### New Middleware

```typescript
// Replace requireAccessRight()
import { authorize } from '@/middlewares/authorize';

router.get('/courses/:id',
  isAuthenticated,
  authorize('content:courses:read'),  // Route-level check
  getCourseById
);

// In controller
async function getCourseById(req, res) {
  const course = await Course.findById(req.params.id);

  // Resource-level check
  if (!await authorize.check(req.user, 'content:courses:read', { resource: course })) {
    throw ApiError.forbidden();
  }

  res.json(course);
}
```

### Deprecation Timeline

| Item | Deprecated In | Removed In |
|------|---------------|------------|
| `requireAccessRight()` | Phase 2 | Phase 4 |
| `req.user.allAccessRights` | Phase 2 | Phase 4 |
| `canViewCourse()` manual checks | Phase 3 | Phase 4 |

---

**End of Document**

---

*Please review and provide feedback on:*
1. *Overall approach (Option C recommendation)*
2. *Data structures*
3. *Caching strategy*
4. *Migration path*
5. *Open questions*
