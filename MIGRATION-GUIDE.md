# LMS Role System V2 - Migration Guide

**Version:** 2.0.0
**Last Updated:** 2026-01-10

This guide provides step-by-step instructions for migrating from Role System V1 (single-role model) to V2 (multi-role, department-scoped model).

---

## Table of Contents

1. [Overview](#overview)
2. [Breaking Changes](#breaking-changes)
3. [Pre-Migration Checklist](#pre-migration-checklist)
4. [Migration Steps](#migration-steps)
5. [Database Migration](#database-migration)
6. [Backend Code Migration](#backend-code-migration)
7. [Frontend Code Migration](#frontend-code-migration)
8. [Testing](#testing)
9. [Rollback Plan](#rollback-plan)
10. [Post-Migration](#post-migration)

---

## Overview

### What's Changing

**V1 (Current):**
- Users have a single role (e.g., "instructor", "admin", "student")
- Roles are global (not department-scoped)
- Simple permission checks based on role name
- Single dashboard per role

**V2 (New):**
- Users can have multiple userTypes (`learner`, `staff`, `global-admin`)
- Roles are department-scoped (different roles in different departments)
- Fine-grained access rights (`domain:resource:action`)
- Admin dashboard requires separate escalation
- Department context switching

### Migration Timeline

- **Phase 1**: Pre-migration preparation (1 day)
- **Phase 2**: Database migration (1 hour)
- **Phase 3**: Backend code updates (2-3 days)
- **Phase 4**: Frontend code updates (3-5 days)
- **Phase 5**: Testing and verification (2 days)
- **Phase 6**: Deployment (1 day)

**Total Estimated Time**: 1-2 weeks

---

## Breaking Changes

### API Response Changes

#### Login Response

**V1:**
```json
{
  "user": {
    "id": "123",
    "email": "user@example.com",
    "role": "instructor"
  },
  "token": "abc..."
}
```

**V2:**
```json
{
  "user": {
    "id": "123",
    "email": "user@example.com"
  },
  "session": {
    "accessToken": "abc...",
    "refreshToken": "def..."
  },
  "userTypes": ["staff"],
  "departmentMemberships": [
    {
      "departmentId": "456",
      "roles": ["instructor", "content-admin"],
      "accessRights": ["content:courses:read", ...]
    }
  ],
  "allAccessRights": ["content:courses:read", ...],
  "canEscalateToAdmin": false
}
```

### Authorization Changes

**V1:**
```typescript
// Check role
if (req.user.role === 'instructor') {
  // Allow access
}
```

**V2:**
```typescript
// Check access right
if (req.user.accessRights.includes('content:courses:manage')) {
  // Allow access
}
```

### Admin Access Changes

**V1:**
```typescript
// Admin role grants immediate access
if (req.user.role === 'admin') {
  // Allow admin action
}
```

**V2:**
```typescript
// Admin requires escalation
if (req.adminSession && req.adminSession.roles.includes('system-admin')) {
  // Allow admin action
}
```

---

## Pre-Migration Checklist

### 1. Backup Database

**CRITICAL: Always backup before migration!**

```bash
# Full database backup
mongodump --uri="mongodb://localhost:27017/lms" --out=/backup/lms-pre-v2-$(date +%Y%m%d)

# Verify backup
mongorestore --uri="mongodb://localhost:27017/lms_test" /backup/lms-pre-v2-*
```

### 2. Document Current System

- [ ] List all current roles in use
- [ ] Document permission mappings for each role
- [ ] Identify all API endpoints that check roles
- [ ] List all frontend components with role-based visibility
- [ ] Document admin users and their privileges

### 3. Test Environment Setup

- [ ] Set up staging environment identical to production
- [ ] Restore production backup to staging
- [ ] Verify staging environment works correctly
- [ ] Test migration script on staging

### 4. Dependency Check

- [ ] Node.js >= 14.x
- [ ] MongoDB >= 4.4
- [ ] All npm packages up to date

### 5. Communication

- [ ] Notify team of migration schedule
- [ ] Plan maintenance window (estimated 2-4 hours)
- [ ] Prepare rollback communication
- [ ] Document support contacts

---

## Migration Steps

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Review Migration Script

Review the migration script before running:

```bash
cat src/migrations/v2-role-system.migration.ts
```

The script will:
1. Create master department for global admins
2. Seed role definitions (12 roles)
3. Seed access rights (40+ permissions)
4. Update User records (add userTypes, defaultDashboard)
5. Update Staff records (add departmentMemberships)
6. Update Learner records (add departmentMemberships)
7. Create GlobalAdmin records for admin users

### Step 3: Run Migration on Staging

```bash
# Connect to staging database
export MONGODB_URI="mongodb://staging:27017/lms"

# Run migration
npm run migrate:v2-role-system
```

**Expected Output:**
```
🚀 Starting Role System V2 Migration (UP)...

📁 Step 1: Creating Master Department...
✅ Master Department created

📋 Step 2: Seeding Role Definitions...
✅ Seeded 12 role definitions

🔐 Step 3: Seeding Access Rights...
✅ Seeded 45 access rights

👤 Step 4: Migrating User records...
✅ Updated 1234 user records

👔 Step 5: Migrating Staff records...
✅ Updated 567 staff records

🎓 Step 6: Migrating Learner records...
✅ Updated 890 learner records

⚡ Step 7: Creating GlobalAdmin records...
✅ Created 12 global admin records

✅ Migration completed successfully!

📊 Summary:
   - Users updated: 1234
   - Staff updated: 567
   - Learners updated: 890
   - Global admins created: 12
   - Roles seeded: 12
   - Access rights seeded: 45
```

### Step 4: Verify Migration

```bash
# Check that role definitions exist
npm run seed:verify

# Check that users have userTypes
node -e "
const mongoose = require('mongoose');
const User = require('./src/models/auth/User.model').User;
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const users = await User.find({}).limit(5);
  console.log('Sample users:', users.map(u => ({
    email: u.email,
    userTypes: u.userTypes,
    defaultDashboard: u.defaultDashboard
  })));
  process.exit(0);
});
"
```

### Step 5: Test on Staging

Run integration tests against staging:

```bash
export MONGODB_TEST_URI="mongodb://staging:27017/lms"
npm test
```

Run manual tests:
1. Login as staff user
2. Verify department memberships load
3. Switch departments
4. Login as admin user
5. Escalate to admin dashboard
6. Perform admin action
7. De-escalate
8. Logout

### Step 6: Deploy to Production

Once staging tests pass:

```bash
# 1. Put site in maintenance mode
npm run maintenance:on

# 2. Backup production database
mongodump --uri="mongodb://production:27017/lms" --out=/backup/lms-prod-$(date +%Y%m%d-%H%M)

# 3. Run migration
export MONGODB_URI="mongodb://production:27017/lms"
npm run migrate:v2-role-system

# 4. Verify migration
npm run seed:verify

# 5. Restart application
pm2 restart lms-api

# 6. Run smoke tests
npm run test:smoke

# 7. Take site out of maintenance mode
npm run maintenance:off
```

---

## Database Migration

### Legacy Role Mapping

The migration script maps V1 roles to V2 roles:

| V1 Role | V2 UserTypes | V2 Roles |
|---------|-------------|----------|
| `student` | `['learner']` | `['course-taker']` |
| `learner` | `['learner']` | `['course-taker']` |
| `instructor` | `['staff']` | `['instructor']` |
| `teacher` | `['staff']` | `['instructor']` |
| `content-admin` | `['staff']` | `['content-admin']` |
| `department-admin` | `['staff']` | `['department-admin']` |
| `admin` | `['staff', 'global-admin']` | `['system-admin']` |
| `super-admin` | `['staff', 'global-admin']` | `['system-admin']` |

### Custom Role Mapping

If you have custom roles, update the mapping in `src/migrations/v2-role-system.migration.ts`:

```typescript
const LEGACY_ROLE_MAPPING: Record<string, { userTypes: string[], roles: string[] }> = {
  // Add custom mappings
  'custom-role': { userTypes: ['staff'], roles: ['instructor', 'content-admin'] },
};
```

### Manual Data Fixes

After migration, you may need to manually adjust:

1. **User with wrong userTypes:**
   ```javascript
   db.users.updateOne(
     { email: 'user@example.com' },
     { $set: { userTypes: ['staff', 'learner'] } }
   )
   ```

2. **Staff missing department membership:**
   ```javascript
   db.staff.updateOne(
     { userId: ObjectId('...') },
     { $push: {
       departmentMemberships: {
         departmentId: ObjectId('...'),
         roles: ['instructor'],
         isPrimary: true,
         isActive: true,
         joinedAt: new Date()
       }
     }}
   )
   ```

3. **GlobalAdmin without escalation password:**
   ```javascript
   db.globaladmins.updateOne(
     { userId: ObjectId('...') },
     { $set: { escalationPassword: null } } // User will be prompted to set
   )
   ```

---

## Backend Code Migration

### Update Authentication Middleware

**Before (V1):**
```typescript
export const isAuthenticated = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const decoded = jwt.verify(token, JWT_SECRET);
  const user = await User.findById(decoded.userId);

  req.user = user;
  next();
};
```

**After (V2):**
```typescript
export const isAuthenticated = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const decoded = jwt.verify(token, JWT_SECRET);
  const user = await User.findById(decoded.userId);

  // Load department memberships and access rights
  const staff = await Staff.findOne({ userId: user._id });
  const learner = await Learner.findOne({ userId: user._id });

  req.user = user;
  req.user.staff = staff;
  req.user.learner = learner;
  req.user.accessRights = calculateAccessRights(staff, learner);

  next();
};
```

### Update Authorization Checks

**Before (V1):**
```typescript
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

// Usage
app.post('/api/courses',
  requireRole(['instructor', 'admin']),
  createCourse
);
```

**After (V2):**
```typescript
export const requireAccessRight = (requiredRights, options = {}) => {
  return (req, res, next) => {
    const hasRight = requiredRights.some(right =>
      req.user.accessRights.includes(right) ||
      req.user.accessRights.includes(`${right.split(':')[0]}:*`)
    );

    if (!hasRight) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

// Usage
app.post('/api/courses',
  requireAccessRight(['content:courses:manage']),
  createCourse
);
```

### Update Controllers

**Before (V1):**
```typescript
export const createCourse = async (req, res) => {
  // Check role
  if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const course = await Course.create({
    name: req.body.name,
    instructorId: req.user._id
  });

  res.json({ course });
};
```

**After (V2):**
```typescript
export const createCourse = async (req, res) => {
  // No need to check role - middleware handles it
  // Access right 'content:courses:manage' already verified

  const course = await Course.create({
    name: req.body.name,
    departmentId: req.body.departmentId,
    instructorId: req.user._id
  });

  res.json({ course });
};
```

### Add Admin Escalation

**Before (V1):**
```typescript
// Admin endpoints directly check role
app.get('/api/admin/settings', isAuthenticated, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Admin action
});
```

**After (V2):**
```typescript
// Admin endpoints require escalation
app.get('/api/admin/settings',
  isAuthenticated,
  requireEscalation,
  requireAdminRole(['system-admin']),
  (req, res) => {
    // Admin action
  }
);

// Escalation endpoint
app.post('/api/v2/auth/escalate', isAuthenticated, async (req, res) => {
  const { escalationPassword } = req.body;

  // Verify user has global-admin userType
  if (!req.user.userTypes.includes('global-admin')) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  // Verify escalation password
  const globalAdmin = await GlobalAdmin.findOne({ userId: req.user._id });
  const isValid = await bcrypt.compare(escalationPassword, globalAdmin.escalationPassword);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid escalation password' });
  }

  // Generate admin token
  const adminToken = jwt.sign(
    { userId: req.user._id, type: 'admin' },
    ADMIN_JWT_SECRET,
    { expiresIn: '15m' }
  );

  res.json({
    adminSession: {
      adminToken,
      expiresIn: 900,
      adminRoles: globalAdmin.departmentMemberships[0].roles
    }
  });
});
```

---

## Frontend Code Migration

### Update Login Flow

**Before (V1):**
```typescript
const login = async (email, password) => {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  const { user, token } = await response.json();

  localStorage.setItem('token', token);
  setState({ user });

  // Navigate based on role
  if (user.role === 'learner') {
    navigate('/learner-dashboard');
  } else {
    navigate('/staff-dashboard');
  }
};
```

**After (V2):**
```typescript
const login = async (email, password) => {
  const response = await fetch('/api/v2/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  const { data } = await response.json();

  localStorage.setItem('accessToken', data.session.accessToken);
  localStorage.setItem('refreshToken', data.session.refreshToken);

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

  // Show department selector if multiple memberships
  if (data.departmentMemberships.length > 1) {
    showDepartmentSelector();
  }
};
```

### Update Permission Checks

**Before (V1):**
```typescript
{user.role === 'instructor' && (
  <button>Manage Courses</button>
)}
```

**After (V2):**
```typescript
{hasAccessRight(currentDepartmentAccessRights, 'content:courses:manage') && (
  <button>Manage Courses</button>
)}

// Helper function
function hasAccessRight(userRights, requiredRight) {
  if (userRights.includes(requiredRight)) return true;

  const [domain] = requiredRight.split(':');
  if (userRights.includes(`${domain}:*`)) return true;

  return false;
}
```

### Add Department Selector

```typescript
function DepartmentSelector() {
  const { departmentMemberships, currentDepartmentId } = useAuth();

  const handleSwitch = async (departmentId) => {
    const response = await fetch('/api/v2/auth/switch-department', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ departmentId })
    });

    const { data } = await response.json();

    // Update current department state
    setCurrentDepartment({
      id: data.currentDepartment.departmentId,
      roles: data.currentDepartment.roles,
      accessRights: data.currentDepartment.accessRights
    });

    // Re-evaluate UI permissions
    updateUIPermissions(data.currentDepartment.accessRights);
  };

  return (
    <select
      value={currentDepartmentId}
      onChange={(e) => handleSwitch(e.target.value)}
    >
      {departmentMemberships.map(dept => (
        <option key={dept.departmentId} value={dept.departmentId}>
          {dept.departmentName}
        </option>
      ))}
    </select>
  );
}
```

### Add Admin Escalation UI

```typescript
function AdminEscalationButton() {
  const { canEscalateToAdmin } = useAuth();
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  const handleEscalate = async (escalationPassword) => {
    const response = await fetch('/api/v2/auth/escalate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ escalationPassword })
    });

    const { data } = await response.json();

    // Store admin token in MEMORY only
    window.__adminToken = data.adminSession.adminToken;

    // Navigate to admin dashboard
    navigate('/admin-dashboard');

    // Start session timeout
    startAdminSessionTimeout(data.adminSession.expiresIn);
  };

  if (!canEscalateToAdmin) return null;

  return (
    <>
      <button onClick={() => setShowPasswordPrompt(true)}>
        Login as Admin
      </button>

      {showPasswordPrompt && (
        <PasswordPrompt
          onSubmit={handleEscalate}
          onCancel={() => setShowPasswordPrompt(false)}
        />
      )}
    </>
  );
}
```

---

## Testing

### Test Checklist

After migration, test these scenarios:

#### Authentication
- [ ] User can login with existing credentials
- [ ] Login response includes V2 fields (userTypes, departmentMemberships, etc.)
- [ ] Token refresh works correctly
- [ ] Logout invalidates tokens

#### Learner Users
- [ ] Learner can login and access Learner Dashboard
- [ ] Learner can enroll in courses
- [ ] Learner can view own grades
- [ ] Learner cannot access Staff Dashboard

#### Staff Users
- [ ] Instructor can login and access Staff Dashboard
- [ ] Instructor can view assigned courses
- [ ] Instructor can grade student work
- [ ] Content-admin can create/edit courses
- [ ] Department-admin can manage department settings

#### Multi-Department Users
- [ ] User with multiple departments sees department selector
- [ ] Department switching updates roles and permissions
- [ ] Different roles in different departments work correctly
- [ ] Child departments show cascaded roles

#### Admin Users
- [ ] Admin user can escalate to Admin Dashboard
- [ ] Escalation with wrong password fails
- [ ] Admin token works for admin endpoints
- [ ] Admin session timeout works (15 minutes)
- [ ] De-escalation clears admin token
- [ ] Regular endpoints still work after de-escalation

#### Permission Checks
- [ ] UI components show/hide based on access rights
- [ ] API endpoints block requests without required rights
- [ ] Wildcard rights work correctly (e.g., `system:*`)
- [ ] Sensitive data access is properly restricted

### Automated Tests

Run full test suite:

```bash
# Unit tests
npm test

# Integration tests
npm test -- --grep "integration"

# E2E tests
npm test -- integration/role-system-e2e.test.ts

# Coverage
npm run test:coverage
```

### Load Testing

Test performance with many departments:

```bash
# Install k6
brew install k6  # or apt-get install k6

# Run load test
k6 run tests/load/role-system-load.js
```

Expected results:
- Login: < 500ms
- Department switching: < 300ms
- Permission check: < 50ms
- 50+ departments: < 1s load time

---

## Rollback Plan

If critical issues occur during migration:

### Step 1: Stop Application

```bash
pm2 stop lms-api
```

### Step 2: Rollback Database

```bash
# Drop current database
mongo lms --eval "db.dropDatabase()"

# Restore from backup
mongorestore --uri="mongodb://localhost:27017/lms" /backup/lms-prod-YYYYMMDD-HHMM
```

### Step 3: Rollback Code

```bash
# Revert to previous version
git checkout v1.x.x
npm install
npm run build
```

### Step 4: Restart Application

```bash
pm2 start lms-api
```

### Step 5: Verify

```bash
# Test critical paths
npm run test:smoke

# Check error logs
pm2 logs lms-api --lines 100
```

### Step 6: Communicate

- Notify team of rollback
- Document what went wrong
- Schedule retry with fixes

---

## Post-Migration

### Immediate Actions (Day 1)

- [ ] Monitor error logs closely
- [ ] Watch for permission-related errors
- [ ] Track login success/failure rates
- [ ] Monitor API response times
- [ ] Be available for immediate fixes

### First Week

- [ ] Gather user feedback
- [ ] Address minor issues
- [ ] Optimize slow queries
- [ ] Update documentation based on learnings
- [ ] Train support team on new features

### First Month

- [ ] Review error logs for patterns
- [ ] Optimize caching strategies
- [ ] Add missing access rights as needed
- [ ] Refine role definitions based on usage
- [ ] Plan removal of V1 compatibility code

### Deprecation Plan

After 3 months of stable V2 operation:

1. Mark V1 endpoints as deprecated
2. Add deprecation warnings to V1 responses
3. Set end-of-life date (6 months from V2 launch)
4. Remove V1 code after EOL date

---

## Support

### Getting Help During Migration

**Before Migration:**
- Review this guide thoroughly
- Test on staging environment
- Contact development team with questions

**During Migration:**
- Have rollback plan ready
- Monitor logs in real-time
- Keep communication channels open

**After Migration:**
- Report issues immediately
- Document solutions for team
- Update this guide with learnings

### Contact Information

- Development Team: dev-team@example.com
- Emergency Hotline: +1-555-0100
- Slack Channel: #role-system-v2-migration

---

## Appendix

### A. Complete Role Mapping Reference

| V1 Role | V2 UserTypes | V2 Roles | Default Dashboard |
|---------|-------------|----------|-------------------|
| student | ['learner'] | ['course-taker'] | learner |
| learner | ['learner'] | ['course-taker'] | learner |
| auditor | ['learner'] | ['auditor'] | learner |
| instructor | ['staff'] | ['instructor'] | staff |
| teacher | ['staff'] | ['instructor'] | staff |
| content-admin | ['staff'] | ['content-admin'] | staff |
| department-admin | ['staff'] | ['department-admin'] | staff |
| billing-admin | ['staff'] | ['billing-admin'] | staff |
| admin | ['staff', 'global-admin'] | ['system-admin'] | staff |
| super-admin | ['staff', 'global-admin'] | ['system-admin'] | staff |

### B. Access Rights Mapping

| V1 Permission | V2 Access Rights |
|---------------|------------------|
| Can view courses | `content:courses:read` |
| Can create courses | `content:courses:manage` |
| Can grade students | `grades:own-classes:manage` |
| Can view reports | `reports:department:read` |
| Can manage users | `staff:department:manage` |
| Can manage billing | `billing:department:manage` |
| Full admin access | `system:*` |

### C. Troubleshooting Common Migration Issues

**Issue: Migration script fails with "Duplicate key error"**

**Solution:** Some data already exists. Run migration with `--force` flag to skip duplicates:
```bash
npm run migrate:v2-role-system -- --force
```

**Issue: Users missing userTypes after migration**

**Solution:** Re-run user migration step:
```bash
node src/migrations/v2-role-system.migration.ts --step=users
```

**Issue: Performance degradation after migration**

**Solution:** Add missing indexes:
```bash
mongo lms --eval "
  db.staff.createIndex({ 'departmentMemberships.departmentId': 1 });
  db.learners.createIndex({ 'departmentMemberships.departmentId': 1 });
  db.globaladmins.createIndex({ 'userId': 1 });
"
```

---

## Version History

- **v2.0.0** (2026-01-10) - Initial migration guide
  - Complete V1 → V2 migration instructions
  - Database migration script
  - Code migration examples
  - Rollback procedures

---

**End of Migration Guide**

For questions or issues, contact the development team or refer to the main documentation in `README-ROLE-SYSTEM-V2.md`.
