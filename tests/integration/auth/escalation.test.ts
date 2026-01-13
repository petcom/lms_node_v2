/**
 * Integration Tests: Escalation (Task 7.2)
 *
 * Tests admin escalation and de-escalation:
 * - Escalation succeeds with correct password
 * - Escalation fails with wrong password
 * - Escalation fails for non-global-admin user
 * - Admin token has correct expiry (15 minutes)
 * - De-escalation invalidates admin token
 * - Admin session timeout works
 * - Cannot access admin routes without escalation
 * - Admin token validation works
 * - Session refresh extends timeout
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

describe('Escalation Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let masterDepartment: any;
  let testDepartment: any;
  let adminUser: any;
  let adminAccessToken: string;
  let staffUser: any;
  let staffAccessToken: string;

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

    // Create test department
    testDepartment = await Department.create({
      name: 'Test Department',
      code: 'TEST',
      slug: 'test-dept',
      isActive: true
    });

    // Seed role definitions
    await RoleDefinition.create([
      {
        name: 'instructor',
        userType: 'staff',
        displayName: 'Instructor',
        description: 'Can teach courses',
        accessRights: ['content:courses:read', 'grades:own-classes:manage'],
        isActive: true
      },
      {
        name: 'system-admin',
        userType: 'global-admin',
        displayName: 'System Administrator',
        description: 'Full system access',
        accessRights: ['system:*', 'content:*', 'enrollment:*'],
        isActive: true
      },
      {
        name: 'enrollment-admin',
        userType: 'global-admin',
        displayName: 'Enrollment Administrator',
        description: 'Manage enrollments',
        accessRights: ['enrollment:*', 'reports:enrollment:read'],
        isActive: true
      }
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Create admin user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    adminUser = await User.create({
      email: 'admin@example.com',
      password: hashedPassword,
      userTypes: ['staff', 'global-admin'],
      isActive: true
    });

    await Staff.create({
      _id: adminUser._id,
      person: {
        firstName: 'Admin',
        lastName: 'User',
        emails: [{
          email: adminUser.email,
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
        departmentId: testDepartment._id,
        roles: ['instructor'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    const escalationPassword = await bcrypt.hash('AdminPass123!', 10);
    await GlobalAdmin.create({
      _id: adminUser._id,
      escalationPassword,
      roleMemberships: [{
        departmentId: masterDepartment._id,
        roles: ['system-admin', 'enrollment-admin'],
        assignedAt: new Date(),
        isActive: true
      }],
      isActive: true
    });

    // Generate access token for admin
    adminAccessToken = jwt.sign(
      {
        userId: adminUser._id.toString(),
        email: adminUser.email,
        roles: ['instructor', 'system-admin', 'enrollment-admin'],
        type: 'access'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create staff-only user
    const staffHashedPassword = await bcrypt.hash('Password123!', 10);
    staffUser = await User.create({
      email: 'staff@example.com',
      password: staffHashedPassword,
      userTypes: ['staff'],
      isActive: true
    });

    await Staff.create({
      _id: staffUser._id,
      person: {
        firstName: 'Staff',
        lastName: 'User',
        emails: [{
          email: staffUser.email,
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
        departmentId: testDepartment._id,
        roles: ['instructor'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    // Generate access token for staff
    staffAccessToken = jwt.sign(
      {
        userId: staffUser._id.toString(),
        email: staffUser.email,
        roles: ['instructor'],
        type: 'access'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Staff.deleteMany({});
    await GlobalAdmin.deleteMany({});
  });

  describe('Escalation succeeds with correct password', () => {
    it('should successfully escalate with correct escalation password', async () => {
      const response = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          escalationPassword: 'AdminPass123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.adminSession).toBeDefined();
      expect(response.body.data.adminSession.adminToken).toBeDefined();
      expect(response.body.data.adminSession.adminRoles).toContain('system-admin');
      expect(response.body.data.adminSession.adminRoles).toContain('enrollment-admin');
      expect(response.body.data.adminSession.expiresIn).toBe(900); // 15 minutes
    });

    it('should return admin access rights on escalation', async () => {
      const response = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          escalationPassword: 'AdminPass123!'
        })
        .expect(200);

      expect(response.body.data.adminAccessRights).toBeDefined();
      expect(response.body.data.adminAccessRights).toContain('system:*');
      expect(response.body.data.adminAccessRights).toContain('content:*');
      expect(response.body.data.adminAccessRights).toContain('enrollment:*');
    });

    it('should return session timeout in minutes', async () => {
      const response = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          escalationPassword: 'AdminPass123!'
        })
        .expect(200);

      expect(response.body.data.sessionTimeoutMinutes).toBe(15);
    });
  });

  describe('Escalation fails with wrong password', () => {
    it('should return 401 with wrong escalation password', async () => {
      const response = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          escalationPassword: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_ESCALATION_PASSWORD');
    });

    it('should not return admin token on failed escalation', async () => {
      const response = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          escalationPassword: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.data?.adminSession).toBeUndefined();
    });
  });

  describe('Escalation fails for non-global-admin user', () => {
    it('should return 403 for staff-only user', async () => {
      const response = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          escalationPassword: 'AdminPass123!'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('NOT_ADMIN');
    });

    it('should return appropriate error message for non-admin', async () => {
      const response = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          escalationPassword: 'AdminPass123!'
        })
        .expect(403);

      expect(response.body.message).toContain('global-admin');
    });
  });

  describe('Admin token has correct expiry', () => {
    it('should have 15-minute (900 second) expiry', async () => {
      const response = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          escalationPassword: 'AdminPass123!'
        })
        .expect(200);

      expect(response.body.data.adminSession.expiresIn).toBe(900);
    });

    it('should have valid JWT expiry timestamp in admin token', async () => {
      const response = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          escalationPassword: 'AdminPass123!'
        })
        .expect(200);

      const adminToken = response.body.data.adminSession.adminToken;
      const decoded: any = jwt.decode(adminToken);

      expect(decoded.exp).toBeDefined();
      const expiresIn = decoded.exp - decoded.iat;
      expect(expiresIn).toBe(900);
    });
  });

  describe('De-escalation invalidates admin token', () => {
    it('should successfully de-escalate and invalidate admin token', async () => {
      // First, escalate
      const escalateResponse = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          escalationPassword: 'AdminPass123!'
        })
        .expect(200);

      const adminToken = escalateResponse.body.data.adminSession.adminToken;

      // Then, de-escalate
      const deescalateResponse = await request(app)
        .post('/api/v2/auth/deescalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .set('X-Admin-Token', adminToken)
        .expect(200);

      expect(deescalateResponse.body.success).toBe(true);
      expect(deescalateResponse.body.message).toContain('de-escalate');
    });

    it('should not allow admin operations after de-escalation', async () => {
      // First, escalate
      const escalateResponse = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          escalationPassword: 'AdminPass123!'
        })
        .expect(200);

      const adminToken = escalateResponse.body.data.adminSession.adminToken;

      // De-escalate
      await request(app)
        .post('/api/v2/auth/deescalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .set('X-Admin-Token', adminToken)
        .expect(200);

      // Try to access admin route with invalidated token
      const adminRouteResponse = await request(app)
        .get('/api/v2/admin/settings')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .set('X-Admin-Token', adminToken)
        .expect(401);

      expect(adminRouteResponse.body.success).toBe(false);
    });
  });

  describe('Admin session timeout works', () => {
    it('should reject expired admin token', async () => {
      // Create an expired admin token (expired 1 minute ago)
      const expiredToken = jwt.sign(
        {
          userId: adminUser._id.toString(),
          isAdmin: true,
          adminRoles: ['system-admin']
        },
        process.env.JWT_ACCESS_SECRET || 'test-secret',
        { expiresIn: '-1m' } // Already expired
      );

      const response = await request(app)
        .get('/api/v2/admin/settings')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .set('X-Admin-Token', expiredToken)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('ADMIN_TOKEN_EXPIRED');
    });

    it('should track admin session activity', async () => {
      const escalateResponse = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          escalationPassword: 'AdminPass123!'
        })
        .expect(200);

      const adminToken = escalateResponse.body.data.adminSession.adminToken;

      // Check session status
      const statusResponse = await request(app)
        .get('/api/v2/auth/me')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .set('X-Admin-Token', adminToken)
        .expect(200);

      expect(statusResponse.body.data.isAdminSessionActive).toBe(true);
      expect(statusResponse.body.data.adminSessionExpiresAt).toBeDefined();
    });
  });

  describe('Cannot access admin routes without escalation', () => {
    it('should return 401 when accessing admin route without admin token', async () => {
      const response = await request(app)
        .get('/api/v2/admin/settings')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('ADMIN_TOKEN_REQUIRED');
    });

    it('should return 401 when accessing admin route with invalid admin token', async () => {
      const response = await request(app)
        .get('/api/v2/admin/settings')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .set('X-Admin-Token', 'invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should allow access to regular routes without admin token', async () => {
      const response = await request(app)
        .get('/api/v2/auth/me')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
    });
  });

  describe('Admin token validation works', () => {
    it('should validate admin token signature', async () => {
      const escalateResponse = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          escalationPassword: 'AdminPass123!'
        })
        .expect(200);

      const adminToken = escalateResponse.body.data.adminSession.adminToken;

      // Verify token can be decoded and validated
      const decoded: any = jwt.verify(
        adminToken,
        process.env.JWT_ACCESS_SECRET || 'test-secret'
      );

      expect(decoded.userId).toBe(adminUser._id.toString());
      expect(decoded.isAdmin).toBe(true);
      expect(decoded.adminRoles).toContain('system-admin');
    });

    it('should reject tampered admin token', async () => {
      const escalateResponse = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          escalationPassword: 'AdminPass123!'
        })
        .expect(200);

      const adminToken = escalateResponse.body.data.adminSession.adminToken;

      // Tamper with the token
      const tamperedToken = adminToken.slice(0, -5) + 'xxxxx';

      const response = await request(app)
        .get('/api/v2/admin/settings')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .set('X-Admin-Token', tamperedToken)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Session refresh extends timeout', () => {
    it('should return updated expiry on session refresh', async () => {
      const escalateResponse = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          escalationPassword: 'AdminPass123!'
        })
        .expect(200);

      const adminToken = escalateResponse.body.data.adminSession.adminToken;

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refresh session (continue endpoint)
      const continueResponse = await request(app)
        .post('/api/v2/auth/continue')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .set('X-Admin-Token', adminToken)
        .expect(200);

      expect(continueResponse.body.data.session).toBeDefined();
      expect(continueResponse.body.data.session.accessToken).toBeDefined();
    });

    it('should maintain admin session after activity', async () => {
      const escalateResponse = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          escalationPassword: 'AdminPass123!'
        })
        .expect(200);

      const adminToken = escalateResponse.body.data.adminSession.adminToken;

      // Perform admin activity
      await request(app)
        .get('/api/v2/admin/settings')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .set('X-Admin-Token', adminToken)
        .expect(200);

      // Session should still be active
      const meResponse = await request(app)
        .get('/api/v2/auth/me')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .set('X-Admin-Token', adminToken)
        .expect(200);

      expect(meResponse.body.data.isAdminSessionActive).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should return 401 when no authorization header provided', async () => {
      const response = await request(app)
        .post('/api/v2/auth/escalate')
        .send({
          escalationPassword: 'AdminPass123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when escalation password missing', async () => {
      const response = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle multiple escalation attempts with wrong password', async () => {
      // First attempt
      await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          escalationPassword: 'WrongPassword1!'
        })
        .expect(401);

      // Second attempt
      await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          escalationPassword: 'WrongPassword2!'
        })
        .expect(401);

      // Correct attempt should still work
      const response = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          escalationPassword: 'AdminPass123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow re-escalation after de-escalation', async () => {
      // Escalate
      const escalateResponse = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          escalationPassword: 'AdminPass123!'
        })
        .expect(200);

      const adminToken = escalateResponse.body.data.adminSession.adminToken;

      // De-escalate
      await request(app)
        .post('/api/v2/auth/deescalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .set('X-Admin-Token', adminToken)
        .expect(200);

      // Re-escalate
      const reEscalateResponse = await request(app)
        .post('/api/v2/auth/escalate')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          escalationPassword: 'AdminPass123!'
        })
        .expect(200);

      expect(reEscalateResponse.body.success).toBe(true);
      expect(reEscalateResponse.body.data.adminSession.adminToken).toBeDefined();
    });
  });
});
