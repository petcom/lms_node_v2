/**
 * Integration Tests: Department Switch (Task 7.3)
 *
 * Tests department switching functionality:
 * - Switch succeeds for member department
 * - Switch fails for non-member department
 * - Switch updates lastSelectedDepartment in database
 * - Switch returns correct roles for department
 * - Switch includes child departments when cascading enabled
 * - Switch respects requireExplicitMembership flag
 * - Switch works with role cascading from parent
 * - Returns proper error codes (403 for non-member, 404 for not found)
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import Department from '@/models/organization/Department.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';

describe('Department Switch Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let testDepartment1: any;
  let testDepartment2: any;
  let testDepartment3: any;
  let childDepartment1: any;
  let childDepartment2: any;
  let restrictedDepartment: any;
  let staffUser: any;
  let staffAccessToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create parent departments
    testDepartment1 = await Department.create({
      name: 'Cognitive Therapy',
      code: 'COG-THER',
      slug: 'cognitive-therapy',
      isActive: true,
      requireExplicitMembership: false // Allows role cascading
    });

    testDepartment2 = await Department.create({
      name: 'Behavioral Health',
      code: 'BEH-HEALTH',
      slug: 'behavioral-health',
      isActive: true,
      requireExplicitMembership: false
    });

    testDepartment3 = await Department.create({
      name: 'Clinical Psychology',
      code: 'CLIN-PSY',
      slug: 'clinical-psychology',
      isActive: true,
      requireExplicitMembership: false
    });

    // Create child departments under testDepartment1
    childDepartment1 = await Department.create({
      name: 'CBT Advanced',
      code: 'CBT-ADV',
      slug: 'cbt-advanced',
      parentDepartmentId: testDepartment1._id,
      isActive: true,
      requireExplicitMembership: false
    });

    childDepartment2 = await Department.create({
      name: 'CBT Fundamentals',
      code: 'CBT-FUND',
      slug: 'cbt-fundamentals',
      parentDepartmentId: testDepartment1._id,
      isActive: true,
      requireExplicitMembership: false
    });

    // Create restricted department (requires explicit membership)
    restrictedDepartment = await Department.create({
      name: 'Executive Leadership',
      code: 'EXEC-LEAD',
      slug: 'executive-leadership',
      parentDepartmentId: testDepartment1._id,
      isActive: true,
      requireExplicitMembership: true // No cascading allowed
    });

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
        description: 'Can manage course content',
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
      }
    ]);

    // Seed access rights
    await AccessRight.create([
      { name: 'content:courses:read', domain: 'content', resource: 'courses', action: 'read', description: 'Read courses' },
      { name: 'content:courses:manage', domain: 'content', resource: 'courses', action: 'manage', description: 'Manage courses' },
      { name: 'content:lessons:read', domain: 'content', resource: 'lessons', action: 'read', description: 'Read lessons' },
      { name: 'content:lessons:manage', domain: 'content', resource: 'lessons', action: 'manage', description: 'Manage lessons' },
      { name: 'content:materials:manage', domain: 'content', resource: 'materials', action: 'manage', description: 'Manage materials' },
      { name: 'grades:own-classes:manage', domain: 'grades', resource: 'own-classes', action: 'manage', description: 'Manage grades' },
      { name: 'staff:department:manage', domain: 'staff', resource: 'department', action: 'manage', description: 'Manage department' },
      { name: 'reports:department:read', domain: 'reports', resource: 'department', action: 'read', description: 'Read reports' },
      { name: 'staff:members:manage', domain: 'staff', resource: 'members', action: 'manage', description: 'Manage members' }
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Create staff user with memberships in multiple departments
    const hashedPassword = await bcrypt.hash('Password123!', 10);
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

    // Generate access token
    staffAccessToken = jwt.sign(
      {
        userId: staffUser._id.toString(),
        email: staffUser.email,
        roles: ['staff'],
        type: 'access'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Staff.deleteMany({});
  });

  describe('Switch succeeds for member department', () => {
    it('should successfully switch to department where user is member', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: testDepartment1._id.toString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentDepartment).toBeDefined();
      expect(response.body.data.currentDepartment.departmentId).toBe(testDepartment1._id.toString());
      expect(response.body.data.currentDepartment.departmentName).toBe('Cognitive Therapy');
      expect(response.body.data.currentDepartment.departmentSlug).toBe('cognitive-therapy');
    });

    it('should switch to second department membership', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: testDepartment2._id.toString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentDepartment.departmentName).toBe('Behavioral Health');
    });

    it('should indicate direct membership', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: testDepartment1._id.toString()
        })
        .expect(200);

      expect(response.body.data.isDirectMember).toBe(true);
      expect(response.body.data.inheritedFrom).toBeNull();
    });
  });

  describe('Switch fails for non-member department', () => {
    it('should return 403 when switching to non-member department', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: testDepartment3._id.toString()
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('NOT_A_MEMBER');
      expect(response.body.message).toContain('not a member');
    });

    it('should return 404 when department does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: fakeId.toString()
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('DEPARTMENT_NOT_FOUND');
    });

    it('should return 400 for invalid department ID format', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: 'invalid-id'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Switch updates lastSelectedDepartment in database', () => {
    it('should update user lastSelectedDepartment field', async () => {
      await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: testDepartment2._id.toString()
        })
        .expect(200);

      // Verify database was updated
      const updatedUser = await User.findById(staffUser._id);
      expect(updatedUser?.lastSelectedDepartment?.toString()).toBe(testDepartment2._id.toString());
    });

    it('should persist lastSelectedDepartment across requests', async () => {
      // First switch
      await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: testDepartment2._id.toString()
        })
        .expect(200);

      // Check /me endpoint
      const meResponse = await request(app)
        .get('/api/v2/auth/me')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .expect(200);

      expect(meResponse.body.data.lastSelectedDepartment).toBe(testDepartment2._id.toString());
    });

    it('should update lastSelectedDepartment on subsequent switches', async () => {
      // First switch
      await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: testDepartment1._id.toString()
        })
        .expect(200);

      // Second switch
      await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: testDepartment2._id.toString()
        })
        .expect(200);

      const updatedUser = await User.findById(staffUser._id);
      expect(updatedUser?.lastSelectedDepartment?.toString()).toBe(testDepartment2._id.toString());
    });
  });

  describe('Switch returns correct roles for department', () => {
    it('should return roles for switched department', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: testDepartment1._id.toString()
        })
        .expect(200);

      expect(response.body.data.currentDepartment.roles).toContain('instructor');
      expect(response.body.data.currentDepartment.roles).toContain('content-admin');
      expect(response.body.data.currentDepartment.roles).toHaveLength(2);
    });

    it('should return different roles for different departments', async () => {
      // Switch to department 1
      const response1 = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: testDepartment1._id.toString()
        })
        .expect(200);

      expect(response1.body.data.currentDepartment.roles).toHaveLength(2);

      // Switch to department 2
      const response2 = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: testDepartment2._id.toString()
        })
        .expect(200);

      expect(response2.body.data.currentDepartment.roles).toContain('instructor');
      expect(response2.body.data.currentDepartment.roles).toHaveLength(1);
    });

    it('should return access rights for switched department', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: testDepartment1._id.toString()
        })
        .expect(200);

      const accessRights = response.body.data.currentDepartment.accessRights;
      expect(accessRights).toBeDefined();
      expect(accessRights).toContain('content:courses:read');
      expect(accessRights).toContain('content:courses:manage');
      expect(accessRights).toContain('grades:own-classes:manage');
    });
  });

  describe('Switch includes child departments when cascading enabled', () => {
    it('should return child departments for parent membership', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: testDepartment1._id.toString()
        })
        .expect(200);

      expect(response.body.data.childDepartments).toBeDefined();
      expect(response.body.data.childDepartments).toBeInstanceOf(Array);
      expect(response.body.data.childDepartments.length).toBeGreaterThan(0);

      const childNames = response.body.data.childDepartments.map((c: any) => c.departmentName);
      expect(childNames).toContain('CBT Advanced');
      expect(childNames).toContain('CBT Fundamentals');
    });

    it('should include inherited roles for child departments', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: testDepartment1._id.toString()
        })
        .expect(200);

      const childDept = response.body.data.childDepartments.find(
        (c: any) => c.departmentName === 'CBT Advanced'
      );

      expect(childDept).toBeDefined();
      expect(childDept.roles).toContain('instructor');
      expect(childDept.roles).toContain('content-admin');
    });

    it('should not include restricted child departments in cascading', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: testDepartment1._id.toString()
        })
        .expect(200);

      const restrictedChild = response.body.data.childDepartments.find(
        (c: any) => c.departmentName === 'Executive Leadership'
      );

      // Should not be included because it requires explicit membership
      expect(restrictedChild).toBeUndefined();
    });
  });

  describe('Switch respects requireExplicitMembership flag', () => {
    it('should prevent cascaded access to restricted department', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: restrictedDepartment._id.toString()
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('NOT_A_MEMBER');
    });

    it('should allow access to restricted department with explicit membership', async () => {
      // Add explicit membership to restricted department
      const staff = await Staff.findById(staffUser._id);
      staff!.departmentMemberships.push({
        departmentId: restrictedDepartment._id,
        roles: ['department-admin'],
        isPrimary: false,
        isActive: true,
        joinedAt: new Date()
      });
      await staff!.save();

      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: restrictedDepartment._id.toString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentDepartment.departmentName).toBe('Executive Leadership');
      expect(response.body.data.isDirectMember).toBe(true);
    });
  });

  describe('Switch works with role cascading from parent', () => {
    it('should allow switching to child department via parent membership', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: childDepartment1._id.toString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentDepartment.departmentName).toBe('CBT Advanced');
      expect(response.body.data.isDirectMember).toBe(false);
      expect(response.body.data.inheritedFrom).toBe(testDepartment1._id.toString());
    });

    it('should cascade roles from parent to child', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: childDepartment1._id.toString()
        })
        .expect(200);

      // Should have same roles as parent department
      expect(response.body.data.currentDepartment.roles).toContain('instructor');
      expect(response.body.data.currentDepartment.roles).toContain('content-admin');
    });

    it('should cascade access rights from parent to child', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: childDepartment1._id.toString()
        })
        .expect(200);

      const accessRights = response.body.data.currentDepartment.accessRights;
      expect(accessRights).toContain('content:courses:read');
      expect(accessRights).toContain('content:courses:manage');
      expect(accessRights).toContain('grades:own-classes:manage');
    });
  });

  describe('Master Department visibility (ISS-005)', () => {
    let masterDepartment: any;
    let systemAdminUser: any;
    let systemAdminToken: string;
    let globalAdminUser: any;
    let globalAdminToken: string;
    let regularStaffUser: any;
    let regularStaffToken: string;

    beforeEach(async () => {
      // Create Master Department with isVisible: false
      masterDepartment = await Department.create({
        name: 'Master Department',
        code: 'MASTER',
        slug: 'master-department',
        isActive: true,
        isVisible: false, // Hidden by default
        requireExplicitMembership: false
      });

      // Seed system-admin role
      await RoleDefinition.create({
        name: 'system-admin',
        userType: 'staff',
        displayName: 'System Administrator',
        description: 'Full system access',
        accessRights: ['staff:department:manage', 'reports:department:read'],
        isActive: true
      });

      // Create user with system-admin role
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      systemAdminUser = await User.create({
        email: 'sysadmin@example.com',
        password: hashedPassword,
        userTypes: ['staff'],
        isActive: true
      });

      await Staff.create({
        _id: systemAdminUser._id,
        person: {
          firstName: 'System',
          lastName: 'Admin',
          emails: [{
            email: systemAdminUser.email,
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
            departmentId: masterDepartment._id,
            roles: ['system-admin'],
            isPrimary: true,
            isActive: true,
            joinedAt: new Date()
          }
        ]
      });

      systemAdminToken = jwt.sign(
        {
          userId: systemAdminUser._id.toString(),
          email: systemAdminUser.email,
          roles: ['staff'],
          type: 'access'
        },
        process.env.JWT_ACCESS_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Create user with global-admin userType
      globalAdminUser = await User.create({
        email: 'globaladmin@example.com',
        password: hashedPassword,
        userTypes: ['global-admin'],
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
        departmentMemberships: [
          {
            departmentId: masterDepartment._id,
            roles: ['system-admin'],
            isPrimary: true,
            isActive: true,
            joinedAt: new Date()
          }
        ]
      });

      globalAdminToken = jwt.sign(
        {
          userId: globalAdminUser._id.toString(),
          email: globalAdminUser.email,
          roles: ['global-admin'],
          type: 'access'
        },
        process.env.JWT_ACCESS_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Create regular staff user without system-admin role
      regularStaffUser = await User.create({
        email: 'regularstaff@example.com',
        password: hashedPassword,
        userTypes: ['staff'],
        isActive: true
      });

      await Staff.create({
        _id: regularStaffUser._id,
        person: {
          firstName: 'Regular',
          lastName: 'Staff',
          emails: [{
            email: regularStaffUser.email,
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
            departmentId: masterDepartment._id,
            roles: ['instructor'], // Regular role, not system-admin
            isPrimary: true,
            isActive: true,
            joinedAt: new Date()
          }
        ]
      });

      regularStaffToken = jwt.sign(
        {
          userId: regularStaffUser._id.toString(),
          email: regularStaffUser.email,
          roles: ['staff'],
          type: 'access'
        },
        process.env.JWT_ACCESS_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
    });

    afterEach(async () => {
      // Clean up Master Department test data
      await Department.deleteOne({ code: 'MASTER' });
      await RoleDefinition.deleteOne({ name: 'system-admin' });
      await User.deleteMany({
        email: { $in: ['sysadmin@example.com', 'globaladmin@example.com', 'regularstaff@example.com'] }
      });
      await Staff.deleteMany({
        _id: { $in: [systemAdminUser?._id, globalAdminUser?._id, regularStaffUser?._id] }
      });
    });

    it('should allow system-admin role to access Master Department despite isVisible:false', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send({
          departmentId: masterDepartment._id.toString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentDepartment.departmentName).toBe('Master Department');
      expect(response.body.data.currentDepartment.roles).toContain('system-admin');
    });

    it('should allow global-admin userType to access Master Department despite isVisible:false', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${globalAdminToken}`)
        .send({
          departmentId: masterDepartment._id.toString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentDepartment.departmentName).toBe('Master Department');
    });

    it('should block regular staff from accessing Master Department when isVisible:false', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${regularStaffToken}`)
        .send({
          departmentId: masterDepartment._id.toString()
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found or is not accessible');
    });

    it('should allow regular staff to access visible departments normally', async () => {
      // Regular departments should work for everyone
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${regularStaffToken}`)
        .send({
          departmentId: testDepartment1._id.toString()
        });

      // This will fail (403) because regularStaffUser isn't a member,
      // but it shouldn't be a 404 (department exists and is visible)
      expect(response.status).toBe(403);
      expect(response.body.message).not.toContain('not found');
    });
  });

  describe('Edge cases', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .send({
          departmentId: testDepartment1._id.toString()
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when departmentId missing', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle switching to inactive department', async () => {
      // Deactivate department
      await Department.findByIdAndUpdate(testDepartment1._id, { isActive: false });

      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: testDepartment1._id.toString()
        })
        .expect(403);

      expect(response.body.success).toBe(false);

      // Reactivate for cleanup
      await Department.findByIdAndUpdate(testDepartment1._id, { isActive: true });
    });

    it('should handle user with no department memberships', async () => {
      // Create user with no memberships
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const noMemberUser = await User.create({
        email: 'nomember@example.com',
        password: hashedPassword,
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
          roles: ['staff'],
          type: 'access'
        },
        process.env.JWT_ACCESS_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${noMemberToken}`)
        .send({
          departmentId: testDepartment1._id.toString()
        })
        .expect(403);

      expect(response.body.code).toBe('NOT_A_MEMBER');
    });
  });
});
