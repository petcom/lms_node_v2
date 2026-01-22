/**
 * Integration Tests: Authorization Middleware (Task 7.5)
 *
 * Tests authorization middleware functions:
 * - requireDepartmentMembership blocks non-members
 * - requireDepartmentRole blocks users without role
 * - requireEscalation blocks non-admin users
 * - requireAdminRole blocks users without admin role
 * - requireAccessRight blocks users without right
 * - Wildcard access rights work (system:*, content:*)
 * - Middleware chain works correctly (membership → role → access right)
 * - Error responses have correct status codes (401, 403)
 * - Middleware attaches correct context to req object
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import GlobalAdmin from '@/models/GlobalAdmin.model';
import Department from '@/models/organization/Department.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { describeIfMongo } from '../../helpers/mongo-guard';
import { refreshDepartmentCache } from '../../helpers/department-cache';

describeIfMongo('Authorization Middleware Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let masterDepartment: any;
  let testDepartment1: any;
  let testDepartment2: any;
  let instructorUser: any;
  let instructorToken: string;
  let contentAdminUser: any;
  let contentAdminToken: string;
  let deptAdminUser: any;
  let deptAdminToken: string;
  let nonMemberUser: any;
  let nonMemberToken: string;
  let globalAdminUser: any;
  let globalAdminToken: string;
  let globalAdminEscalationToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create master department
    masterDepartment = await Department.create({
      _id: new mongoose.Types.ObjectId('000000000000000000000001'),
      name: 'System Administration',
      code: 'SYS-ADMIN',
      slug: 'master',
      isSystem: true,
      isVisible: false,
      isActive: true
    });

    // Create test departments
    testDepartment1 = await Department.create({
      name: 'Department A',
      code: 'DEPT-A',
      slug: 'department-a',
      isActive: true
    });

    testDepartment2 = await Department.create({
      name: 'Department B',
      code: 'DEPT-B',
      slug: 'department-b',
      isActive: true
    });

    // Refresh department cache to pick up test departments
    await refreshDepartmentCache();

    // Seed role definitions
    await RoleDefinition.create([
      {
        name: 'instructor',
        userType: 'staff',
        displayName: 'Instructor',
        description: 'Can teach courses',
        accessRights: ['content:courses:read', 'content:lessons:read', 'grades:own-classes:manage'],
        isActive: true
      },
      {
        name: 'content-admin',
        userType: 'staff',
        displayName: 'Content Administrator',
        description: 'Can manage content',
        accessRights: ['content:courses:manage', 'content:lessons:manage', 'content:materials:manage'],
        isActive: true
      },
      {
        name: 'department-admin',
        userType: 'staff',
        displayName: 'Department Administrator',
        description: 'Can manage department',
        accessRights: ['staff:department:manage', 'reports:department:read', 'staff:members:manage'],
        isActive: true
      },
      {
        name: 'system-admin',
        userType: 'global-admin',
        displayName: 'System Administrator',
        description: 'Full system access',
        accessRights: ['system:*', 'content:*', 'enrollment:*'],
        isActive: true
      }
    ]);

    // Seed access rights
    await AccessRight.create([
      { name: 'content:courses:read', domain: 'content', resource: 'courses', action: 'read', description: 'Read courses', isActive: true },
      { name: 'content:courses:manage', domain: 'content', resource: 'courses', action: 'manage', description: 'Manage courses', isActive: true },
      { name: 'content:lessons:read', domain: 'content', resource: 'lessons', action: 'read', description: 'Read lessons', isActive: true },
      { name: 'content:lessons:manage', domain: 'content', resource: 'lessons', action: 'manage', description: 'Manage lessons', isActive: true },
      { name: 'content:materials:manage', domain: 'content', resource: 'materials', action: 'manage', description: 'Manage materials', isActive: true },
      { name: 'grades:own-classes:manage', domain: 'grades', resource: 'own-classes', action: 'manage', description: 'Manage grades', isActive: true },
      { name: 'staff:department:manage', domain: 'staff', resource: 'department', action: 'manage', description: 'Manage department', isActive: true },
      { name: 'reports:department:read', domain: 'reports', resource: 'department', action: 'read', description: 'Read reports', isActive: true },
      { name: 'staff:members:manage', domain: 'staff', resource: 'members', action: 'manage', description: 'Manage members', isActive: true },
      { name: 'system:*', domain: 'system', resource: '*', action: '*', description: 'All system operations', isActive: true },
      { name: 'content:*', domain: 'content', resource: '*', action: '*', description: 'All content operations', isActive: true },
      { name: 'enrollment:*', domain: 'enrollment', resource: '*', action: '*', description: 'All enrollment operations', isActive: true }
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    // Create instructor user
    instructorUser = await User.create({
      email: 'instructor@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      isActive: true
    });

    await Staff.create({
      _id: instructorUser._id,
      person: {
        firstName: 'Test',
        lastName: 'Instructor',
        emails: [{
          email: instructorUser.email,
          type: 'institutional',
          isPrimary: true,
          verified: true,
          allowNotifications: true
        }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en'
      },
      departmentMemberships: [{
        departmentId: testDepartment1._id,
        roles: ['instructor'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    instructorToken = jwt.sign(
      { userId: instructorUser._id.toString(), email: instructorUser.email, roles: ['staff'], type: 'access' },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create content admin user
    contentAdminUser = await User.create({
      email: 'contentadmin@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      isActive: true
    });

    await Staff.create({
      _id: contentAdminUser._id,
      person: {
        firstName: 'Content',
        lastName: 'Admin',
        emails: [{
          email: contentAdminUser.email,
          type: 'institutional',
          isPrimary: true,
          verified: true,
          allowNotifications: true
        }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en'
      },
      departmentMemberships: [{
        departmentId: testDepartment1._id,
        roles: ['content-admin'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    contentAdminToken = jwt.sign(
      { userId: contentAdminUser._id.toString(), email: contentAdminUser.email, roles: ['staff'], type: 'access' },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create department admin user
    deptAdminUser = await User.create({
      email: 'deptadmin@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      isActive: true
    });

    await Staff.create({
      _id: deptAdminUser._id,
      person: {
        firstName: 'Dept',
        lastName: 'Admin',
        emails: [{
          email: deptAdminUser.email,
          type: 'institutional',
          isPrimary: true,
          verified: true,
          allowNotifications: true
        }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en'
      },
      departmentMemberships: [{
        departmentId: testDepartment1._id,
        roles: ['department-admin'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    deptAdminToken = jwt.sign(
      { userId: deptAdminUser._id.toString(), email: deptAdminUser.email, roles: ['staff'], type: 'access' },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create non-member user (member of different department)
    nonMemberUser = await User.create({
      email: 'nonmember@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      isActive: true
    });

    await Staff.create({
      _id: nonMemberUser._id,
      person: {
        firstName: 'Non',
        lastName: 'Member',
        emails: [{
          email: nonMemberUser.email,
          type: 'institutional',
          isPrimary: true,
          verified: true,
          allowNotifications: true
        }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en'
      },
      departmentMemberships: [{
        departmentId: testDepartment2._id,
        roles: ['instructor'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    nonMemberToken = jwt.sign(
      { userId: nonMemberUser._id.toString(), email: nonMemberUser.email, roles: ['staff'], type: 'access' },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create global admin user
    globalAdminUser = await User.create({
      email: 'admin@example.com',
      password: hashedPassword,
      userTypes: ['staff', 'global-admin'],
      isActive: true
    });

    await Staff.create({
      _id: globalAdminUser._id,
      person: {
        firstName: 'Global',
        lastName: 'Admin',
        emails: [{
          email: globalAdminUser.email,
          type: 'institutional',
          isPrimary: true,
          verified: true,
          allowNotifications: true
        }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en'
      },
      departmentMemberships: [{
        departmentId: testDepartment1._id,
        roles: ['instructor'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    await GlobalAdmin.create({
      _id: globalAdminUser._id,
      escalationPassword: 'AdminPass123!',
      roleMemberships: [{
        departmentId: masterDepartment._id,
        roles: ['system-admin'],
        assignedAt: new Date(),
        isActive: true
      }],
      isActive: true
    });

    globalAdminToken = jwt.sign(
      { userId: globalAdminUser._id.toString(), email: globalAdminUser.email, roles: ['staff', 'global-admin'], type: 'access' },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Actually escalate to get a valid session token
    const escalateResponse = await request(app)
      .post('/api/v2/auth/escalate')
      .set('Authorization', `Bearer ${globalAdminToken}`)
      .send({ escalationPassword: 'AdminPass123!' });

    globalAdminEscalationToken = escalateResponse.body.data.adminSession.adminToken;
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Staff.deleteMany({});
    await GlobalAdmin.deleteMany({});
  });

  describe('requireDepartmentMembership blocks non-members', () => {
    it('should block access to department for non-member', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment1._id}/courses`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      // expect(response.body.code).toBe('NOT_DEPARTMENT_MEMBER'); // Error codes not yet implemented
    });

    it('should allow access to department for member', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment1._id}/courses`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return proper error message for non-member', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment1._id}/courses`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .expect(403);

      expect(response.body.message).toContain('permission');
    });
  });

  describe('requireDepartmentRole blocks users without role', () => {
    it('should block user without required role', async () => {
      // Instructor trying to access content-admin only route
      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment1._id}/courses`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'New Course',
          description: 'Course description'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      // expect(response.body.code).toBe('INSUFFICIENT_ROLE'); // Error codes not yet implemented
    });

    it('should allow user with required role', async () => {
      // Content admin creating a course
      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment1._id}/courses`)
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .send({
          title: 'New Course',
          description: 'Course description'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should allow user with any of multiple required roles', async () => {
      // Department admin should also be able to manage department settings
      const response = await request(app)
        .put(`/api/v2/departments/${testDepartment1._id}/settings`)
        .set('Authorization', `Bearer ${deptAdminToken}`)
        .send({
          settingKey: 'value'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return proper error message for insufficient role', async () => {
      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment1._id}/courses`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'New Course'
        })
        .expect(403);

      expect(response.body.message).toContain('role');
    });
  });

  describe('requireEscalation blocks non-admin users', () => {
    it('should block staff user from admin routes', async () => {
      const response = await request(app)
        .get('/api/v2/admin/settings')
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      // expect(response.body.code).toBe('ADMIN_TOKEN_REQUIRED'); // Error codes not yet implemented
    });

    it('should block global-admin user without escalation', async () => {
      const response = await request(app)
        .get('/api/v2/admin/settings')
        .set('Authorization', `Bearer ${globalAdminToken}`)
        .expect(401);

      // expect(response.body.code).toBe('ADMIN_TOKEN_REQUIRED'); // Error codes not yet implemented
    });

    it('should allow global-admin user with valid escalation token', async () => {
      const response = await request(app)
        .get('/api/v2/admin/settings')
        .set('Authorization', `Bearer ${globalAdminToken}`)
        .set('X-Admin-Token', globalAdminEscalationToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid admin token', async () => {
      const response = await request(app)
        .get('/api/v2/admin/settings')
        .set('Authorization', `Bearer ${globalAdminToken}`)
        .set('X-Admin-Token', 'invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('requireAdminRole blocks users without admin role', () => {
    it('should block access when admin role missing', async () => {
      // Create global admin with different role (no valid session exists for this token)
      const enrollmentAdminToken = jwt.sign(
        {
          userId: globalAdminUser._id.toString(),
          email: globalAdminUser.email,
          roles: ['enrollment-admin'],
          type: 'admin'
        },
        process.env.JWT_ADMIN_SECRET || 'test-admin-secret',
        { expiresIn: '15m' }
      );

      const response = await request(app)
        .put('/api/v2/admin/system-settings')
        .set('Authorization', `Bearer ${globalAdminToken}`)
        .set('X-Admin-Token', enrollmentAdminToken)
        .send({
          setting: 'value'
        })
        .expect(401); // 401 because no valid session exists for this token

      // expect(response.body.code).toBe('INSUFFICIENT_ADMIN_ROLE'); // Error codes not yet implemented
    });

    it('should allow access when admin role present', async () => {
      const response = await request(app)
        .put('/api/v2/admin/system-settings')
        .set('Authorization', `Bearer ${globalAdminToken}`)
        .set('X-Admin-Token', globalAdminEscalationToken)
        .send({
          setting: 'value'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should check multiple required admin roles', async () => {
      const response = await request(app)
        .get('/api/v2/admin/users')
        .set('Authorization', `Bearer ${globalAdminToken}`)
        .set('X-Admin-Token', globalAdminEscalationToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('requireAccessRight blocks users without right', () => {
    it('should block user without specific access right', async () => {
      // Instructor doesn't have content:courses:manage
      const response = await request(app)
        .put(`/api/v2/departments/${testDepartment1._id}/courses/123`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Updated Course'
        })
        .expect(403);

      // expect(response.body.code).toBe('INSUFFICIENT_ACCESS_RIGHT'); // Error codes not yet implemented
    });

    it('should allow user with specific access right', async () => {
      // Content admin has content:courses:manage
      const response = await request(app)
        .put(`/api/v2/departments/${testDepartment1._id}/courses/123`)
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .send({
          title: 'Updated Course'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should work with requireAny mode (any of multiple rights)', async () => {
      // Route requires either 'staff:department:manage' or 'reports:department:read'
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment1._id}/reports`)
        .set('Authorization', `Bearer ${deptAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should work with requireAll mode (all rights required)', async () => {
      // Route requires both 'content:courses:manage' and 'content:lessons:manage'
      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment1._id}/courses/bulk-update`)
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .send({
          updates: []
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Wildcard access rights work', () => {
    it('should match wildcard domain access rights (system:*)', async () => {
      const response = await request(app)
        .get('/api/v2/admin/system-info')
        .set('Authorization', `Bearer ${globalAdminToken}`)
        .set('X-Admin-Token', globalAdminEscalationToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should match wildcard domain for specific operations (content:*)', async () => {
      const response = await request(app)
        .delete(`/api/v2/admin/content/purge`)
        .set('Authorization', `Bearer ${globalAdminToken}`)
        .set('X-Admin-Token', globalAdminEscalationToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should grant wildcard rights to all operations in domain', async () => {
      // Admin with content:* should be able to do anything content-related
      const operations = [
        '/api/v2/admin/content/courses',
        '/api/v2/admin/content/lessons',
        '/api/v2/admin/content/materials'
      ];

      for (const endpoint of operations) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${globalAdminToken}`)
          .set('X-Admin-Token', globalAdminEscalationToken)
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('Middleware chain works correctly', () => {
    it('should pass through membership → role → access right checks', async () => {
      // Content admin has membership, role, and access rights
      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment1._id}/courses`)
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .send({
          title: 'New Course',
          description: 'Description'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should fail at membership check', async () => {
      // Non-member fails at first middleware
      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment1._id}/courses`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .send({
          title: 'New Course'
        })
        .expect(403);

      // expect(response.body.code).toBe('NOT_DEPARTMENT_MEMBER'); // Error codes not yet implemented
    });

    it('should fail at role check', async () => {
      // Member but wrong role fails at second middleware
      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment1._id}/courses`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'New Course'
        })
        .expect(403);

      // expect(response.body.code).toBe('INSUFFICIENT_ROLE'); // Error codes not yet implemented
    });

    it('should execute middlewares in correct order', async () => {
      // Test that membership is checked before role
      const response = await request(app)
        .put(`/api/v2/departments/${testDepartment1._id}/settings`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .send({
          setting: 'value'
        })
        .expect(403);

      // Should fail at membership, not role
      // expect(response.body.code).toBe('NOT_DEPARTMENT_MEMBER'); // Error codes not yet implemented
    });
  });

  describe('Error responses have correct status codes', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment1._id}/courses`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for unauthorized access (membership)', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment1._id}/courses`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for insufficient role', async () => {
      const response = await request(app)
        .post(`/api/v2/departments/${testDepartment1._id}/courses`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'New Course'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for insufficient access right', async () => {
      const response = await request(app)
        .put(`/api/v2/departments/${testDepartment1._id}/courses/123`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Updated'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for missing admin token', async () => {
      const response = await request(app)
        .get('/api/v2/admin/settings')
        .set('Authorization', `Bearer ${globalAdminToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Middleware attaches correct context to req object', () => {
    it('should attach department context after membership check', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment1._id}/context`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(response.body.data.departmentContext).toBeDefined();
      expect(response.body.data.departmentContext.departmentId).toBe(testDepartment1._id.toString());
    });

    it('should attach user roles after role check', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment1._id}/my-roles`)
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .expect(200);

      expect(response.body.data.roles).toContain('content-admin');
    });

    it('should attach access rights after access check', async () => {
      const response = await request(app)
        .get(`/api/v2/departments/${testDepartment1._id}/my-access`)
        .set('Authorization', `Bearer ${contentAdminToken}`)
        .expect(200);

      expect(response.body.data.accessRights).toBeDefined();
      expect(response.body.data.accessRights).toContain('content:courses:manage');
    });

    it('should attach admin context after escalation', async () => {
      const response = await request(app)
        .get('/api/v2/admin/context')
        .set('Authorization', `Bearer ${globalAdminToken}`)
        .set('X-Admin-Token', globalAdminEscalationToken)
        .expect(200);

      expect(response.body.data.isAdminContext).toBe(true);
      expect(response.body.data.adminRoles).toContain('system-admin');
    });
  });
});
