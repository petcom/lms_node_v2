/**
 * Role System V2 - End-to-End Integration Tests
 *
 * This test suite validates the entire user journey through the role system:
 * 1. User creation with multiple userTypes
 * 2. Login → escalation → admin actions flow
 * 3. Department switching flow
 * 4. Role-based access control across multiple departments
 * 5. Role cascading in hierarchical departments
 * 6. Performance testing with multiple departments
 *
 * Run with: npm test -- role-system-e2e.test.ts
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../src/app';
import { User } from '../../src/models/auth/User.model';
import { Staff } from '../../src/models/auth/Staff.model';
import { Learner } from '../../src/models/auth/Learner.model';
import { GlobalAdmin } from '../../src/models/GlobalAdmin.model';
import { Department } from '../../src/models/organization/Department.model';
import { RoleDefinition } from '../../src/models/RoleDefinition.model';
import { AccessRight } from '../../src/models/AccessRight.model';

// Test data
let testUser: any;
let testDepartment1: any;
let testDepartment2: any;
let childDepartment: any;
let accessToken: string;
let refreshToken: string;
let adminToken: string;

const TEST_USER_EMAIL = 'test-e2e@example.com';
const TEST_USER_PASSWORD = 'TestPassword123!';
const TEST_ESCALATION_PASSWORD = 'AdminPassword456!';

describe('Role System V2 - End-to-End Tests', () => {
  // =========================================================================
  // SETUP & TEARDOWN
  // =========================================================================

  beforeAll(async () => {
    // Connect to test database
    const MONGODB_TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/lms_test';
    await mongoose.connect(MONGODB_TEST_URI);

    // Clean up test data
    await User.deleteMany({ email: TEST_USER_EMAIL });
    await Department.deleteMany({ slug: { $in: ['test-dept-1', 'test-dept-2', 'test-child'] } });
  });

  afterAll(async () => {
    // Clean up and disconnect
    await User.deleteMany({ email: TEST_USER_EMAIL });
    await Department.deleteMany({ slug: { $in: ['test-dept-1', 'test-dept-2', 'test-child'] } });
    await mongoose.connection.close();
  });

  // =========================================================================
  // TEST 1: Create Test User with Multiple UserTypes
  // =========================================================================

  describe('Test 1: User Creation and Setup', () => {
    it('should create test departments', async () => {
      // Create parent department
      testDepartment1 = await Department.create({
        name: 'Test Department 1',
        slug: 'test-dept-1',
        description: 'First test department',
        isActive: true
      });

      // Create second department
      testDepartment2 = await Department.create({
        name: 'Test Department 2',
        slug: 'test-dept-2',
        description: 'Second test department',
        isActive: true
      });

      // Create child department
      childDepartment = await Department.create({
        name: 'Test Child Department',
        slug: 'test-child',
        description: 'Child department for role cascading tests',
        parentDepartmentId: testDepartment1._id,
        requireExplicitMembership: false, // Allow role cascading
        isActive: true
      });

      expect(testDepartment1).toBeDefined();
      expect(testDepartment2).toBeDefined();
      expect(childDepartment).toBeDefined();
    });

    it('should create user with all userTypes', async () => {
      // Create user
      testUser = await User.create({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD, // Should be hashed by pre-save hook
        userTypes: ['learner', 'staff', 'global-admin'],
        defaultDashboard: 'staff',
        isActive: true
      });

      expect(testUser).toBeDefined();
      expect(testUser.userTypes).toEqual(['learner', 'staff', 'global-admin']);
      expect(testUser.defaultDashboard).toBe('staff');
    });

    it('should create Staff record with department memberships', async () => {
      const staff = await Staff.create({
        userId: testUser._id,
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor', 'content-admin'],
            isPrimary: true,
            isActive: true,
            joinedAt: new Date()
          },
          {
            departmentId: testDepartment2._id,
            roles: ['instructor'],
            isPrimary: false,
            isActive: true,
            joinedAt: new Date()
          }
        ]
      });

      expect(staff).toBeDefined();
      expect(staff.departmentMemberships).toHaveLength(2);
    });

    it('should create Learner record with department membership', async () => {
      const learner = await Learner.create({
        userId: testUser._id,
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            isPrimary: true,
            isActive: true,
            joinedAt: new Date()
          }
        ]
      });

      expect(learner).toBeDefined();
      expect(learner.departmentMemberships).toHaveLength(1);
    });

    it('should create GlobalAdmin record', async () => {
      const MASTER_DEPARTMENT_ID = new mongoose.Types.ObjectId('000000000000000000000001');

      const globalAdmin = await GlobalAdmin.create({
        userId: testUser._id,
        departmentMemberships: [
          {
            departmentId: MASTER_DEPARTMENT_ID,
            roles: ['system-admin'],
            isPrimary: true,
            isActive: true,
            joinedAt: new Date()
          }
        ],
        escalationPassword: TEST_ESCALATION_PASSWORD, // Should be hashed by pre-save hook
        isActive: true
      });

      expect(globalAdmin).toBeDefined();
      expect(globalAdmin.departmentMemberships[0].roles).toContain('system-admin');
    });
  });

  // =========================================================================
  // TEST 2: Login → Escalation → Admin Action Flow
  // =========================================================================

  describe('Test 2: Login → Escalation → Admin Action Flow', () => {
    it('should login and receive V2 response', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('session');
      expect(response.body.data).toHaveProperty('userTypes');
      expect(response.body.data).toHaveProperty('departmentMemberships');
      expect(response.body.data).toHaveProperty('allAccessRights');
      expect(response.body.data).toHaveProperty('canEscalateToAdmin');

      // Store tokens
      accessToken = response.body.data.session.accessToken;
      refreshToken = response.body.data.session.refreshToken;

      // Verify userTypes
      expect(response.body.data.userTypes).toEqual(
        expect.arrayContaining(['learner', 'staff', 'global-admin'])
      );

      // Verify can escalate
      expect(response.body.data.canEscalateToAdmin).toBe(true);

      // Verify department memberships
      expect(response.body.data.departmentMemberships).toBeInstanceOf(Array);
      expect(response.body.data.departmentMemberships.length).toBeGreaterThan(0);

      // Verify access rights
      expect(response.body.data.allAccessRights).toBeInstanceOf(Array);
      expect(response.body.data.allAccessRights.length).toBeGreaterThan(0);
    });

    it('should escalate to admin with correct password', async () => {
      const response = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          escalationPassword: TEST_ESCALATION_PASSWORD
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('adminSession');
      expect(response.body.data.adminSession).toHaveProperty('adminToken');
      expect(response.body.data.adminSession).toHaveProperty('adminRoles');
      expect(response.body.data.adminSession).toHaveProperty('adminAccessRights');

      // Store admin token
      adminToken = response.body.data.adminSession.adminToken;

      // Verify admin roles
      expect(response.body.data.adminRoles).toContain('system-admin');

      // Verify session timeout
      expect(response.body.data.sessionTimeoutMinutes).toBe(15);
    });

    it('should fail escalation with wrong password', async () => {
      const response = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          escalationPassword: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ESCALATION_PASSWORD');
    });

    it('should perform admin action with admin token', async () => {
      // Example: Get all roles (system-admin permission required)
      const response = await request(app)
        .get('/api/v2/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Admin-Token', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('roles');
    });

    it('should fail admin action without admin token', async () => {
      // Attempt to update role access rights without admin token
      const response = await request(app)
        .put('/api/v2/roles/instructor/access-rights')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accessRights: ['content:courses:read']
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should de-escalate from admin', async () => {
      const response = await request(app)
        .post('/api/v2/auth/deescalate')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Admin-Token', adminToken)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify admin token no longer works
      const adminActionResponse = await request(app)
        .get('/api/v2/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Admin-Token', adminToken)
        .expect(401);

      expect(adminActionResponse.body.success).toBe(false);
    });
  });

  // =========================================================================
  // TEST 3: Department Switching Flow
  // =========================================================================

  describe('Test 3: Department Switching Flow', () => {
    it('should switch to first department', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          departmentId: testDepartment1._id.toString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('currentDepartment');
      expect(response.body.data.currentDepartment.departmentId).toBe(
        testDepartment1._id.toString()
      );
      expect(response.body.data.currentDepartment.roles).toEqual(
        expect.arrayContaining(['instructor', 'content-admin'])
      );
      expect(response.body.data.isDirectMember).toBe(true);
    });

    it('should switch to second department', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          departmentId: testDepartment2._id.toString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentDepartment.departmentId).toBe(
        testDepartment2._id.toString()
      );
      expect(response.body.data.currentDepartment.roles).toContain('instructor');
    });

    it('should fail to switch to non-member department', async () => {
      // Create another department
      const nonMemberDept = await Department.create({
        name: 'Non-Member Department',
        slug: 'non-member-dept',
        isActive: true
      });

      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          departmentId: nonMemberDept._id.toString()
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_A_MEMBER');

      // Clean up
      await Department.deleteOne({ _id: nonMemberDept._id });
    });
  });

  // =========================================================================
  // TEST 4: Role-Based Access Control Across Multiple Departments
  // =========================================================================

  describe('Test 4: Role-Based Access Control', () => {
    it('should have different roles in different departments', async () => {
      // Get roles for department 1
      const dept1Response = await request(app)
        .get(`/api/v2/roles/me/department/${testDepartment1._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(dept1Response.body.data.roles).toEqual(
        expect.arrayContaining(['instructor', 'content-admin'])
      );

      // Get roles for department 2
      const dept2Response = await request(app)
        .get(`/api/v2/roles/me/department/${testDepartment2._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(dept2Response.body.data.roles).toEqual(['instructor']);
    });

    it('should have correct access rights for each department', async () => {
      const response = await request(app)
        .get(`/api/v2/roles/me/department/${testDepartment1._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const accessRights = response.body.data.accessRights;

      // Instructor rights
      expect(accessRights).toContain('content:courses:read');
      expect(accessRights).toContain('grades:own-classes:manage');

      // Content-admin rights
      expect(accessRights).toContain('content:courses:manage');
      expect(accessRights).toContain('content:lessons:manage');
    });

    it('should aggregate all access rights from all departments', async () => {
      const response = await request(app)
        .get('/api/v2/roles/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const allAccessRights = response.body.data.allAccessRights;

      // Should include rights from both departments
      expect(allAccessRights).toBeInstanceOf(Array);
      expect(allAccessRights.length).toBeGreaterThan(0);

      // Should not have duplicates
      const uniqueRights = new Set(allAccessRights);
      expect(uniqueRights.size).toBe(allAccessRights.length);
    });
  });

  // =========================================================================
  // TEST 5: Role Cascading in Hierarchical Departments
  // =========================================================================

  describe('Test 5: Role Cascading', () => {
    it('should cascade roles from parent to child department', async () => {
      const response = await request(app)
        .get(`/api/v2/roles/me/department/${childDepartment._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Should have same roles as parent (testDepartment1)
      expect(response.body.data.roles).toEqual(
        expect.arrayContaining(['instructor', 'content-admin'])
      );

      // Should indicate roles are inherited
      expect(response.body.data.isDirectMember).toBe(false);
      expect(response.body.data.inheritedFrom).toBe(testDepartment1._id.toString());
    });

    it('should include child departments when switching to parent', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          departmentId: testDepartment1._id.toString()
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('childDepartments');
      expect(response.body.data.childDepartments).toBeInstanceOf(Array);

      // Should include child department
      const childDeptInResponse = response.body.data.childDepartments.find(
        (dept: any) => dept.departmentId === childDepartment._id.toString()
      );

      expect(childDeptInResponse).toBeDefined();
      expect(childDeptInResponse.roles).toEqual(
        expect.arrayContaining(['instructor', 'content-admin'])
      );
    });

    it('should not cascade if requireExplicitMembership is true', async () => {
      // Create department with requireExplicitMembership
      const strictDept = await Department.create({
        name: 'Strict Child Department',
        slug: 'strict-child',
        parentDepartmentId: testDepartment1._id,
        requireExplicitMembership: true, // Disable cascading
        isActive: true
      });

      const response = await request(app)
        .get(`/api/v2/roles/me/department/${strictDept._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_A_MEMBER');

      // Clean up
      await Department.deleteOne({ _id: strictDept._id });
    });
  });

  // =========================================================================
  // TEST 6: Performance Test with Multiple Departments
  // =========================================================================

  describe('Test 6: Performance Tests', () => {
    let largeDepartmentSet: any[] = [];

    beforeAll(async () => {
      // Create 50 departments
      const deptPromises = [];
      for (let i = 0; i < 50; i++) {
        deptPromises.push(
          Department.create({
            name: `Performance Test Dept ${i}`,
            slug: `perf-test-dept-${i}`,
            isActive: true
          })
        );
      }
      largeDepartmentSet = await Promise.all(deptPromises);

      // Add user to all departments
      const staff = await Staff.findOne({ userId: testUser._id });
      if (staff) {
        const newMemberships = largeDepartmentSet.map(dept => ({
          departmentId: dept._id,
          roles: ['instructor'],
          isPrimary: false,
          isActive: true,
          joinedAt: new Date()
        }));
        staff.departmentMemberships.push(...newMemberships);
        await staff.save();
      }
    });

    afterAll(async () => {
      // Clean up performance test departments
      await Department.deleteMany({
        slug: { $regex: /^perf-test-dept-/ }
      });
    });

    it('should load user with 50+ departments in < 1 second', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/v2/roles/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.data.departmentMemberships.length).toBeGreaterThan(50);
      expect(duration).toBeLessThan(1000); // Should complete in < 1 second

      console.log(`✓ Loaded ${response.body.data.departmentMemberships.length} departments in ${duration}ms`);
    });

    it('should switch departments quickly even with large dataset', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          departmentId: largeDepartmentSet[25]._id.toString()
        })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(500); // Should complete in < 500ms

      console.log(`✓ Switched department in ${duration}ms`);
    });
  });

  // =========================================================================
  // TEST 7: Token Continuation (Access Rights Refresh)
  // =========================================================================

  describe('Test 7: Token Continuation', () => {
    it('should refresh access rights without re-authentication', async () => {
      const response = await request(app)
        .post('/api/v2/auth/continue')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('session');
      expect(response.body.data).toHaveProperty('departmentMemberships');
      expect(response.body.data).toHaveProperty('allAccessRights');
      expect(response.body.data).toHaveProperty('changes');

      // Update access token
      accessToken = response.body.data.session.accessToken;
    });

    it('should detect changes in roles', async () => {
      // Add a new role to staff
      const staff = await Staff.findOne({ userId: testUser._id });
      if (staff && staff.departmentMemberships.length > 0) {
        staff.departmentMemberships[0].roles.push('department-admin');
        await staff.save();
      }

      const response = await request(app)
        .post('/api/v2/auth/continue')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.changes.rolesAdded).toContain('department-admin');

      // Update access token
      accessToken = response.body.data.session.accessToken;
    });
  });

  // =========================================================================
  // TEST 8: Complete User Journey
  // =========================================================================

  describe('Test 8: Complete User Journey', () => {
    it('should complete full workflow: login → select dept → escalate → admin action → deescalate → logout', async () => {
      // 1. Login
      const loginResponse = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD
        })
        .expect(200);

      const newAccessToken = loginResponse.body.data.session.accessToken;

      // 2. Select department
      const switchResponse = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send({
          departmentId: testDepartment1._id.toString()
        })
        .expect(200);

      expect(switchResponse.body.success).toBe(true);

      // 3. Escalate to admin
      const escalateResponse = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send({
          escalationPassword: TEST_ESCALATION_PASSWORD
        })
        .expect(200);

      const newAdminToken = escalateResponse.body.data.adminSession.adminToken;

      // 4. Perform admin action
      const adminActionResponse = await request(app)
        .get('/api/v2/roles')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .set('X-Admin-Token', newAdminToken)
        .expect(200);

      expect(adminActionResponse.body.success).toBe(true);

      // 5. De-escalate
      const deescalateResponse = await request(app)
        .post('/api/v2/auth/deescalate')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .set('X-Admin-Token', newAdminToken)
        .expect(200);

      expect(deescalateResponse.body.success).toBe(true);

      // 6. Logout
      const logoutResponse = await request(app)
        .post('/api/v2/auth/logout')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);

      // 7. Verify token no longer works
      await request(app)
        .get('/api/v2/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(401);
    });
  });
});
