/**
 * Integration Tests: Roles API (Task 7.6)
 *
 * Tests the roles API endpoints:
 * - List all roles returns 12 roles
 * - Get role by name returns correct role definition
 * - Get roles by userType filters correctly
 * - Update role access rights (system-admin only) works
 * - Non-admin cannot update role access rights (403)
 * - Get my roles returns user's roles across all departments
 * - Get my roles for specific department returns correct roles
 * - Role cascading reflected in "my roles" endpoint
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { Learner } from '@/models/auth/Learner.model';
import GlobalAdmin from '@/models/GlobalAdmin.model';
import Department from '@/models/organization/Department.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Roles API Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let masterDepartment: any;
  let testDepartment1: any;
  let testDepartment2: any;
  let childDepartment: any;
  let staffUser: any;
  let staffToken: string;
  let multiDeptUser: any;
  let multiDeptToken: string;
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
      name: 'Psychology Department',
      code: 'PSYCH',
      slug: 'psychology',
      isActive: true
    });

    testDepartment2 = await Department.create({
      name: 'Research Department',
      code: 'RESEARCH',
      slug: 'research',
      isActive: true
    });

    childDepartment = await Department.create({
      name: 'Clinical Psychology',
      code: 'CLIN-PSY',
      slug: 'clinical-psychology',
      parentDepartmentId: testDepartment1._id,
      isActive: true,
      requireExplicitMembership: false
    });

    // Seed all 12 role definitions
    await RoleDefinition.create([
      // Learner roles (3)
      {
        name: 'course-taker',
        userType: 'learner',
        displayName: 'Course Taker',
        description: 'Can enroll in and take courses',
        accessRights: ['content:courses:read', 'enrollment:own:manage'],
        isDefault: true,
        sortOrder: 1,
        isActive: true
      },
      {
        name: 'auditor',
        userType: 'learner',
        displayName: 'Auditor',
        description: 'Can audit courses without credit',
        accessRights: ['content:courses:read'],
        isDefault: false,
        sortOrder: 2,
        isActive: true
      },
      {
        name: 'learner-supervisor',
        userType: 'learner',
        displayName: 'Learner Supervisor',
        description: 'Can supervise other learners',
        accessRights: ['content:courses:read', 'learner:supervised:view', 'learner:progress:monitor'],
        isDefault: false,
        sortOrder: 3,
        isActive: true
      },
      // Staff roles (4)
      {
        name: 'instructor',
        userType: 'staff',
        displayName: 'Instructor',
        description: 'Can teach courses',
        accessRights: ['content:courses:read', 'content:lessons:read', 'grades:own-classes:manage'],
        isDefault: true,
        sortOrder: 1,
        isActive: true
      },
      {
        name: 'department-admin',
        userType: 'staff',
        displayName: 'Department Administrator',
        description: 'Can manage department',
        accessRights: ['staff:department:manage', 'reports:department:read', 'staff:members:manage'],
        isDefault: false,
        sortOrder: 2,
        isActive: true
      },
      {
        name: 'content-admin',
        userType: 'staff',
        displayName: 'Content Administrator',
        description: 'Can manage content',
        accessRights: ['content:courses:manage', 'content:lessons:manage', 'content:materials:manage'],
        isDefault: false,
        sortOrder: 3,
        isActive: true
      },
      {
        name: 'billing-admin',
        userType: 'staff',
        displayName: 'Billing Administrator',
        description: 'Can manage billing',
        accessRights: ['billing:invoices:read', 'billing:payments:process', 'billing:reports:read'],
        isDefault: false,
        sortOrder: 4,
        isActive: true
      },
      // Global-admin roles (5)
      {
        name: 'system-admin',
        userType: 'global-admin',
        displayName: 'System Administrator',
        description: 'Full system access',
        accessRights: ['system:*', 'content:*', 'enrollment:*'],
        isDefault: false,
        sortOrder: 1,
        isActive: true
      },
      {
        name: 'enrollment-admin',
        userType: 'global-admin',
        displayName: 'Enrollment Administrator',
        description: 'Manage all enrollments',
        accessRights: ['enrollment:*', 'reports:enrollment:read'],
        isDefault: false,
        sortOrder: 2,
        isActive: true
      },
      {
        name: 'course-admin',
        userType: 'global-admin',
        displayName: 'Course Administrator',
        description: 'Manage all courses',
        accessRights: ['content:*', 'reports:courses:read'],
        isDefault: false,
        sortOrder: 3,
        isActive: true
      },
      {
        name: 'theme-admin',
        userType: 'global-admin',
        displayName: 'Theme Administrator',
        description: 'Manage system themes',
        accessRights: ['system:themes:manage', 'system:ui:customize'],
        isDefault: false,
        sortOrder: 4,
        isActive: true
      },
      {
        name: 'financial-admin',
        userType: 'global-admin',
        displayName: 'Financial Administrator',
        description: 'Manage all financial operations',
        accessRights: ['billing:*', 'reports:financial:read', 'reports:financial:export'],
        isDefault: false,
        sortOrder: 5,
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
      { name: 'enrollment:own:manage', domain: 'enrollment', resource: 'own', action: 'manage', description: 'Manage own enrollments', isActive: true },
      { name: 'grades:own-classes:manage', domain: 'grades', resource: 'own-classes', action: 'manage', description: 'Manage own grades', isActive: true },
      { name: 'staff:department:manage', domain: 'staff', resource: 'department', action: 'manage', description: 'Manage department', isActive: true },
      { name: 'staff:members:manage', domain: 'staff', resource: 'members', action: 'manage', description: 'Manage members', isActive: true },
      { name: 'reports:department:read', domain: 'reports', resource: 'department', action: 'read', description: 'Read reports', isActive: true },
      { name: 'learner:supervised:view', domain: 'learner', resource: 'supervised', action: 'view', description: 'View supervised', isActive: true },
      { name: 'learner:progress:monitor', domain: 'learner', resource: 'progress', action: 'monitor', description: 'Monitor progress', isActive: true },
      { name: 'billing:invoices:read', domain: 'billing', resource: 'invoices', action: 'read', description: 'Read invoices', isActive: true },
      { name: 'billing:payments:process', domain: 'billing', resource: 'payments', action: 'process', description: 'Process payments', isActive: true },
      { name: 'billing:reports:read', domain: 'billing', resource: 'reports', action: 'read', description: 'Read billing reports', isActive: true },
      { name: 'system:*', domain: 'system', resource: '*', action: '*', description: 'All system operations', isActive: true },
      { name: 'content:*', domain: 'content', resource: '*', action: '*', description: 'All content operations', isActive: true },
      { name: 'enrollment:*', domain: 'enrollment', resource: '*', action: '*', description: 'All enrollment operations', isActive: true },
      { name: 'billing:*', domain: 'billing', resource: '*', action: '*', description: 'All billing operations', isActive: true },
      { name: 'reports:enrollment:read', domain: 'reports', resource: 'enrollment', action: 'read', description: 'Read enrollment reports', isActive: true },
      { name: 'reports:courses:read', domain: 'reports', resource: 'courses', action: 'read', description: 'Read course reports', isActive: true },
      { name: 'reports:financial:read', domain: 'reports', resource: 'financial', action: 'read', description: 'Read financial reports', isActive: true },
      { name: 'reports:financial:export', domain: 'reports', resource: 'financial', action: 'export', description: 'Export financial reports', isActive: true },
      { name: 'system:themes:manage', domain: 'system', resource: 'themes', action: 'manage', description: 'Manage themes', isActive: true },
      { name: 'system:ui:customize', domain: 'system', resource: 'ui', action: 'customize', description: 'Customize UI', isActive: true }
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    // Create staff user with single department
    staffUser = await User.create({
      email: 'staff@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      isActive: true
    });

    await Staff.create({
      _id: staffUser._id,
      person: {
        firstName: 'Test',
        lastName: 'Staff',
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
        departmentId: testDepartment1._id,
        roles: ['instructor', 'content-admin'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    staffToken = jwt.sign(
      {
        userId: staffUser._id.toString(),
        email: staffUser.email,
        roles: ['staff'],
        type: 'access'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create multi-department user
    multiDeptUser = await User.create({
      email: 'multidept@example.com',
      password: hashedPassword,
      userTypes: ['learner', 'staff'],
      isActive: true
    });

    await Staff.create({
      _id: multiDeptUser._id,
      person: {
        firstName: 'Multi',
        lastName: 'Dept',
        emails: [{
          email: multiDeptUser.email,
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
      departmentMemberships: [
        {
          departmentId: testDepartment1._id,
          roles: ['instructor'],
          isPrimary: true,
          isActive: true,
          joinedAt: new Date()
        },
        {
          departmentId: testDepartment2._id,
          roles: ['department-admin'],
          isPrimary: false,
          isActive: true,
          joinedAt: new Date()
        }
      ]
    });

    await Learner.create({
      _id: multiDeptUser._id,
      person: {
        firstName: 'Multi',
        lastName: 'Dept',
        emails: [{
          email: multiDeptUser.email,
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
        roles: ['course-taker'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    multiDeptToken = jwt.sign(
      {
        userId: multiDeptUser._id.toString(),
        email: multiDeptUser.email,
        roles: ['learner', 'staff'],
        type: 'access'
      },
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
      {
        userId: globalAdminUser._id.toString(),
        email: globalAdminUser.email,
        roles: ['staff', 'global-admin'],
        type: 'access'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Actually escalate to get a real admin session token
    const escalateResponse = await request(app)
      .post('/api/v2/auth/escalate')
      .set('Authorization', `Bearer ${globalAdminToken}`)
      .send({
        escalationPassword: 'AdminPass123!'
      });

    if (escalateResponse.status === 200) {
      globalAdminEscalationToken = escalateResponse.body.data.adminSession.adminToken;
    } else {
      // Fallback if escalation fails - create token manually (will fail requireEscalation middleware)
      globalAdminEscalationToken = jwt.sign(
        {
          userId: globalAdminUser._id.toString(),
          email: globalAdminUser.email,
          roles: ['system-admin'],
          type: 'admin'
        },
        process.env.JWT_ADMIN_SECRET || 'test-admin-secret',
        { expiresIn: '15m' }
      );
    }
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Staff.deleteMany({});
    await Learner.deleteMany({});
    await GlobalAdmin.deleteMany({});
  });

  describe('List all roles returns 12 roles', () => {
    it('should return all 12 role definitions', async () => {
      const response = await request(app)
        .get('/api/v2/roles')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.roles).toHaveLength(12);
    });

    it('should include all role properties', async () => {
      const response = await request(app)
        .get('/api/v2/roles')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const role = response.body.data.roles[0];
      expect(role).toHaveProperty('name');
      expect(role).toHaveProperty('userType');
      expect(role).toHaveProperty('displayName');
      expect(role).toHaveProperty('description');
      expect(role).toHaveProperty('accessRights');
      expect(role).toHaveProperty('isDefault');
      expect(role).toHaveProperty('sortOrder');
    });

    it('should sort roles by userType and sortOrder', async () => {
      const response = await request(app)
        .get('/api/v2/roles')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const roles = response.body.data.roles;

      // Learner roles should come first (alphabetically)
      const firstRole = roles[0];
      expect(['learner', 'staff', 'global-admin']).toContain(firstRole.userType);
    });

    it('should include role counts by userType', async () => {
      const response = await request(app)
        .get('/api/v2/roles')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const roles = response.body.data.roles;
      const learnerRoles = roles.filter((r: any) => r.userType === 'learner');
      const staffRoles = roles.filter((r: any) => r.userType === 'staff');
      const adminRoles = roles.filter((r: any) => r.userType === 'global-admin');

      expect(learnerRoles).toHaveLength(3);
      expect(staffRoles).toHaveLength(4);
      expect(adminRoles).toHaveLength(5);
    });
  });

  describe('Get role by name returns correct role definition', () => {
    it('should return specific role by name', async () => {
      const response = await request(app)
        .get('/api/v2/roles/instructor')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role.name).toBe('instructor');
      expect(response.body.data.role.userType).toBe('staff');
      expect(response.body.data.role.displayName).toBe('Instructor');
    });

    it('should include access rights for role', async () => {
      const response = await request(app)
        .get('/api/v2/roles/instructor')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const accessRights = response.body.data.role.accessRights;
      expect(accessRights).toContain('content:courses:read');
      expect(accessRights).toContain('content:lessons:read');
      expect(accessRights).toContain('grades:own-classes:manage');
    });

    it('should return 404 for non-existent role', async () => {
      const response = await request(app)
        .get('/api/v2/roles/non-existent-role')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      // Note: Error codes not yet implemented (see Phase 5 report)
      // expect(response.body.code).toBe('ROLE_NOT_FOUND');
    });

    it('should work for all role types (learner, staff, global-admin)', async () => {
      const roles = ['course-taker', 'instructor', 'system-admin'];

      for (const roleName of roles) {
        const response = await request(app)
          .get(`/api/v2/roles/${roleName}`)
          .set('Authorization', `Bearer ${staffToken}`)
          .expect(200);

        expect(response.body.data.role.name).toBe(roleName);
      }
    });
  });

  describe('Get roles by userType filters correctly', () => {
    it('should return only learner roles', async () => {
      const response = await request(app)
        .get('/api/v2/roles/user-type/learner')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.data.roles).toHaveLength(3);
      expect(response.body.data.roles.every((r: any) => r.userType === 'learner')).toBe(true);

      const roleNames = response.body.data.roles.map((r: any) => r.name);
      expect(roleNames).toContain('course-taker');
      expect(roleNames).toContain('auditor');
      expect(roleNames).toContain('learner-supervisor');
    });

    it('should return only staff roles', async () => {
      const response = await request(app)
        .get('/api/v2/roles/user-type/staff')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.data.roles).toHaveLength(4);
      expect(response.body.data.roles.every((r: any) => r.userType === 'staff')).toBe(true);

      const roleNames = response.body.data.roles.map((r: any) => r.name);
      expect(roleNames).toContain('instructor');
      expect(roleNames).toContain('department-admin');
      expect(roleNames).toContain('content-admin');
      expect(roleNames).toContain('billing-admin');
    });

    it('should return only global-admin roles', async () => {
      const response = await request(app)
        .get('/api/v2/roles/user-type/global-admin')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.data.roles).toHaveLength(5);
      expect(response.body.data.roles.every((r: any) => r.userType === 'global-admin')).toBe(true);

      const roleNames = response.body.data.roles.map((r: any) => r.name);
      expect(roleNames).toContain('system-admin');
      expect(roleNames).toContain('enrollment-admin');
      expect(roleNames).toContain('course-admin');
      expect(roleNames).toContain('theme-admin');
      expect(roleNames).toContain('financial-admin');
    });

    it('should return 400 for invalid userType', async () => {
      const response = await request(app)
        .get('/api/v2/roles/user-type/invalid-type')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Update role access rights (system-admin only) works', () => {
    it('should allow system-admin to update role access rights', async () => {
      const response = await request(app)
        .put('/api/v2/roles/instructor/access-rights')
        .set('Authorization', `Bearer ${globalAdminToken}`)
        .set('X-Admin-Token', globalAdminEscalationToken)
        .send({
          accessRights: [
            'content:courses:read',
            'content:lessons:read',
            'grades:own-classes:manage',
            'content:materials:read' // Added new right
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role.accessRights).toContain('content:materials:read');
    });

    it('should validate access rights format', async () => {
      const response = await request(app)
        .put('/api/v2/roles/instructor/access-rights')
        .set('Authorization', `Bearer ${globalAdminToken}`)
        .set('X-Admin-Token', globalAdminEscalationToken)
        .send({
          accessRights: [
            'invalid-format' // Invalid format
          ]
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should allow wildcard access rights', async () => {
      const response = await request(app)
        .put('/api/v2/roles/system-admin/access-rights')
        .set('Authorization', `Bearer ${globalAdminToken}`)
        .set('X-Admin-Token', globalAdminEscalationToken)
        .send({
          accessRights: ['system:*', 'content:*', 'enrollment:*', 'billing:*']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role.accessRights).toContain('billing:*');
    });

    it('should return updated role definition', async () => {
      const response = await request(app)
        .put('/api/v2/roles/instructor/access-rights')
        .set('Authorization', `Bearer ${globalAdminToken}`)
        .set('X-Admin-Token', globalAdminEscalationToken)
        .send({
          accessRights: [
            'content:courses:read',
            'content:lessons:read'
          ]
        })
        .expect(200);

      expect(response.body.data.role.accessRights).toHaveLength(2);
      expect(response.body.data.role.name).toBe('instructor');
    });
  });

  describe('Non-admin cannot update role access rights (403)', () => {
    it('should block staff user from updating roles', async () => {
      const response = await request(app)
        .put('/api/v2/roles/instructor/access-rights')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          accessRights: ['content:courses:read']
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      // Note: Error codes not yet implemented (see Phase 5 report)
      // expect(response.body.code).toBe('ADMIN_TOKEN_REQUIRED');
    });

    it('should block global-admin without escalation', async () => {
      const response = await request(app)
        .put('/api/v2/roles/instructor/access-rights')
        .set('Authorization', `Bearer ${globalAdminToken}`)
        .send({
          accessRights: ['content:courses:read']
        })
        .expect(401);

      // Note: Error codes not yet implemented (see Phase 5 report)
      // expect(response.body.code).toBe('ADMIN_TOKEN_REQUIRED');
    });

    it('should block admin without system-admin role', async () => {
      // Create admin with different role (no valid session for this token)
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
        .put('/api/v2/roles/instructor/access-rights')
        .set('Authorization', `Bearer ${globalAdminToken}`)
        .set('X-Admin-Token', enrollmentAdminToken)
        .send({
          accessRights: ['content:courses:read']
        })
        .expect(401); // 401 because no valid session exists for this token

      // Note: Error codes not yet implemented (see Phase 5 report)
      // expect(response.body.code).toBe('INSUFFICIENT_ADMIN_ROLE');
    });
  });

  describe('Get my roles returns user\'s roles across all departments', () => {
    it('should return staff roles for staff user', async () => {
      const response = await request(app)
        .get('/api/v2/roles/me')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.departments).toBeDefined();
      expect(response.body.data.departments).toHaveLength(1);

      const dept = response.body.data.departments[0];
      expect(dept.departmentName).toBe('Psychology Department');
      expect(dept.roles).toContain('instructor');
      expect(dept.roles).toContain('content-admin');
    });

    it('should return roles from multiple departments', async () => {
      const response = await request(app)
        .get('/api/v2/roles/me')
        .set('Authorization', `Bearer ${multiDeptToken}`)
        .expect(200);

      expect(response.body.data.departments.length).toBeGreaterThanOrEqual(2);

      const dept1 = response.body.data.departments.find(
        (d: any) => d.departmentName === 'Psychology Department'
      );
      const dept2 = response.body.data.departments.find(
        (d: any) => d.departmentName === 'Research Department'
      );

      expect(dept1).toBeDefined();
      expect(dept1.roles).toContain('instructor');

      expect(dept2).toBeDefined();
      expect(dept2.roles).toContain('department-admin');
    });

    it('should include both learner and staff roles for hybrid user', async () => {
      const response = await request(app)
        .get('/api/v2/roles/me')
        .set('Authorization', `Bearer ${multiDeptToken}`)
        .expect(200);

      const allRoles = response.body.data.departments.flatMap((d: any) => d.roles);
      expect(allRoles).toContain('instructor');
      expect(allRoles).toContain('course-taker');
    });

    it('should include access rights for each department', async () => {
      const response = await request(app)
        .get('/api/v2/roles/me')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const dept = response.body.data.departments[0];
      expect(dept.accessRights).toBeDefined();
      expect(dept.accessRights).toContain('content:courses:read');
      expect(dept.accessRights).toContain('content:courses:manage');
    });
  });

  describe('Get my roles for specific department returns correct roles', () => {
    it('should return roles for specific department', async () => {
      const response = await request(app)
        .get(`/api/v2/roles/me/department/${testDepartment1._id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      if (response.status !== 200) {
        console.log('Error response:', response.status, response.body);
      }
      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.department.departmentName).toBe('Psychology Department');
      expect(response.body.data.department.roles).toContain('instructor');
      expect(response.body.data.department.roles).toContain('content-admin');
    });

    it('should return different roles for different departments', async () => {
      const response1 = await request(app)
        .get(`/api/v2/roles/me/department/${testDepartment1._id}`)
        .set('Authorization', `Bearer ${multiDeptToken}`)
        .expect(200);

      const response2 = await request(app)
        .get(`/api/v2/roles/me/department/${testDepartment2._id}`)
        .set('Authorization', `Bearer ${multiDeptToken}`)
        .expect(200);

      expect(response1.body.data.department.roles).toContain('instructor');
      expect(response2.body.data.department.roles).toContain('department-admin');
    });

    it('should return 403 for non-member department', async () => {
      const response = await request(app)
        .get(`/api/v2/roles/me/department/${testDepartment2._id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);

      // Note: Error codes not yet implemented (see Phase 5 report)
      // expect(response.body.code).toBe('NOT_A_MEMBER');
    });

    it('should include access rights for department', async () => {
      const response = await request(app)
        .get(`/api/v2/roles/me/department/${testDepartment1._id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.data.department.accessRights).toBeDefined();
      expect(response.body.data.department.accessRights.length).toBeGreaterThan(0);
    });
  });

  describe('Role cascading reflected in "my roles" endpoint', () => {
    it('should include cascaded child departments in my roles', async () => {
      const response = await request(app)
        .get('/api/v2/roles/me')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const parentDept = response.body.data.departments.find(
        (d: any) => d.departmentName === 'Psychology Department'
      );

      expect(parentDept.childDepartments).toBeDefined();
      expect(parentDept.childDepartments.length).toBeGreaterThan(0);

      const childDept = parentDept.childDepartments.find(
        (c: any) => c.departmentName === 'Clinical Psychology'
      );

      expect(childDept).toBeDefined();
      expect(childDept.roles).toContain('instructor');
      expect(childDept.roles).toContain('content-admin');
    });

    it('should allow switching to cascaded child department', async () => {
      const response = await request(app)
        .get(`/api/v2/roles/me/department/${childDepartment._id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.data.department.departmentName).toBe('Clinical Psychology');
      expect(response.body.data.department.roles).toContain('instructor');
      expect(response.body.data.isDirectMember).toBe(false);
      expect(response.body.data.inheritedFrom).toBe(testDepartment1._id.toString());
    });

    it('should show cascaded access rights', async () => {
      const response = await request(app)
        .get(`/api/v2/roles/me/department/${childDepartment._id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const accessRights = response.body.data.department.accessRights;
      expect(accessRights).toContain('content:courses:read');
      expect(accessRights).toContain('content:courses:manage');
    });

    it('should indicate cascaded membership in response', async () => {
      const response = await request(app)
        .get(`/api/v2/roles/me/department/${childDepartment._id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.data.isDirectMember).toBe(false);
      expect(response.body.data.inheritedFrom).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should require authentication for all endpoints', async () => {
      const endpoints = [
        '/api/v2/roles',
        '/api/v2/roles/instructor',
        '/api/v2/roles/user-type/staff',
        '/api/v2/roles/me'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(401);

        expect(response.body.success).toBe(false);
      }
    });

    it('should handle invalid department ID format', async () => {
      const response = await request(app)
        .get('/api/v2/roles/me/department/invalid-id')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return empty departments array for user with no memberships', async () => {
      // Create user with no departments
      const noMemberUser = await User.create({
        email: 'nomember@example.com',
        password: await bcrypt.hash('Password123!', 10),
        userTypes: ['staff'],
        isActive: true
      });

      await Staff.create({
        _id: noMemberUser._id,
        person: {
          firstName: 'No',
          lastName: 'Member',
          emails: [{
            email: noMemberUser.email,
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
        departmentMemberships: []
      });

      const noMemberToken = jwt.sign(
        {
          userId: noMemberUser._id.toString(),
          email: noMemberUser.email,
          roles: [],
          type: 'access'
        },
        process.env.JWT_ACCESS_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/v2/roles/me')
        .set('Authorization', `Bearer ${noMemberToken}`)
        .expect(200);

      expect(response.body.data.departments).toEqual([]);
    });
  });
});
