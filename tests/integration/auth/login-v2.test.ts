/**
 * Integration Tests: Auth V2 Login (Task 7.1)
 *
 * Tests the V2 login endpoint with the new role system:
 * - userTypes array (not single role)
 * - departmentMemberships with roles and access rights
 * - allAccessRights (union of all departments)
 * - canEscalateToAdmin flag
 * - defaultDashboard calculation
 * - lastSelectedDepartment
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '@/app';
import { User } from '@/models/auth/User.model';
import Staff from '@/models/auth/Staff.model';
import Learner from '@/models/auth/Learner.model';
import { GlobalAdmin } from '@/models/GlobalAdmin.model';
import Department from '@/models/organization/Department.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';

describe('Auth V2 Login Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let testDepartment1: any;
  let testDepartment2: any;
  let masterDepartment: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create master department (System Administration)
    masterDepartment = await Department.create({
      _id: new mongoose.Types.ObjectId('000000000000000000000001'),
      name: 'System Administration',
      code: 'SYS-ADMIN',
      slug: 'master',
      description: 'System administration department',
      isSystem: true,
      isVisible: false,
      isActive: true
    });

    // Create test departments
    testDepartment1 = await Department.create({
      name: 'Cognitive Therapy',
      code: 'COG-THER',
      slug: 'cognitive-therapy',
      isActive: true
    });

    testDepartment2 = await Department.create({
      name: 'Advanced CBT',
      code: 'ADV-CBT',
      slug: 'advanced-cbt',
      parentDepartmentId: testDepartment1._id,
      isActive: true
    });

    // Seed role definitions
    await RoleDefinition.create([
      {
        name: 'course-taker',
        userType: 'learner',
        displayName: 'Course Taker',
        description: 'Can enroll in and take courses',
        accessRights: ['content:courses:read', 'enrollment:own:manage'],
        isActive: true
      },
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
        description: 'Can manage department settings',
        accessRights: ['staff:department:manage', 'reports:department:read'],
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
      { name: 'content:courses:read', domain: 'content', description: 'Read courses' },
      { name: 'content:courses:manage', domain: 'content', description: 'Manage courses' },
      { name: 'content:lessons:read', domain: 'content', description: 'Read lessons' },
      { name: 'content:lessons:manage', domain: 'content', description: 'Manage lessons' },
      { name: 'content:materials:manage', domain: 'content', description: 'Manage materials' },
      { name: 'enrollment:own:manage', domain: 'enrollment', description: 'Manage own enrollments' },
      { name: 'grades:own-classes:manage', domain: 'grades', description: 'Manage grades for own classes' },
      { name: 'staff:department:manage', domain: 'staff', description: 'Manage department' },
      { name: 'reports:department:read', domain: 'reports', description: 'Read department reports' },
      { name: 'system:*', domain: 'system', description: 'All system operations' },
      { name: 'content:*', domain: 'content', description: 'All content operations' },
      { name: 'enrollment:*', domain: 'enrollment', description: 'All enrollment operations' }
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Staff.deleteMany({});
    await Learner.deleteMany({});
    await GlobalAdmin.deleteMany({});
  });

  describe('Login returns userTypes array (not single role)', () => {
    it('should return userTypes array for learner-only user', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await User.create({
        email: 'learner@example.com',
        password: hashedPassword,
        userTypes: ['learner'],
        isActive: true
      });

      const learner = await Learner.create({
        userId: user._id,
        firstName: 'John',
        lastName: 'Learner',
        departmentMemberships: [{
          departmentId: testDepartment1._id,
          roles: ['course-taker'],
          isPrimary: true,
          isActive: true
        }]
      });

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'learner@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userTypes).toEqual(['learner']);
      expect(response.body.data.userTypes).toBeInstanceOf(Array);
    });

    it('should return userTypes array for staff-only user', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await User.create({
        email: 'staff@example.com',
        password: hashedPassword,
        userTypes: ['staff'],
        isActive: true
      });

      const staff = await Staff.create({
        userId: user._id,
        firstName: 'Jane',
        lastName: 'Staff',
        departmentMemberships: [{
          departmentId: testDepartment1._id,
          roles: ['instructor'],
          isPrimary: true,
          isActive: true
        }]
      });

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'staff@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userTypes).toEqual(['staff']);
    });

    it('should return userTypes array for multi-type user (staff + global-admin)', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await User.create({
        email: 'admin@example.com',
        password: hashedPassword,
        userTypes: ['staff', 'global-admin'],
        isActive: true
      });

      const staff = await Staff.create({
        userId: user._id,
        firstName: 'Admin',
        lastName: 'User',
        departmentMemberships: [{
          departmentId: testDepartment1._id,
          roles: ['instructor', 'content-admin'],
          isPrimary: true,
          isActive: true
        }]
      });

      const globalAdmin = await GlobalAdmin.create({
        userId: user._id,
        roles: ['system-admin'],
        escalationPassword: await bcrypt.hash('AdminPass123!', 10),
        isActive: true
      });

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userTypes).toContain('staff');
      expect(response.body.data.userTypes).toContain('global-admin');
      expect(response.body.data.userTypes).toHaveLength(2);
    });
  });

  describe('Login returns departmentMemberships with roles and access rights', () => {
    it('should return departmentMemberships with roles for staff user', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await User.create({
        email: 'instructor@example.com',
        password: hashedPassword,
        userTypes: ['staff'],
        isActive: true
      });

      const staff = await Staff.create({
        userId: user._id,
        firstName: 'Jane',
        lastName: 'Instructor',
        departmentMemberships: [{
          departmentId: testDepartment1._id,
          roles: ['instructor', 'content-admin'],
          isPrimary: true,
          isActive: true
        }]
      });

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'instructor@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.data.departmentMemberships).toBeDefined();
      expect(response.body.data.departmentMemberships).toHaveLength(1);

      const membership = response.body.data.departmentMemberships[0];
      expect(membership.departmentId).toBeDefined();
      expect(membership.departmentName).toBe('Cognitive Therapy');
      expect(membership.roles).toContain('instructor');
      expect(membership.roles).toContain('content-admin');
      expect(membership.isPrimary).toBe(true);
      expect(membership.isActive).toBe(true);
    });

    it('should include access rights for each department membership', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await User.create({
        email: 'instructor@example.com',
        password: hashedPassword,
        userTypes: ['staff'],
        isActive: true
      });

      const staff = await Staff.create({
        userId: user._id,
        firstName: 'Jane',
        lastName: 'Instructor',
        departmentMemberships: [{
          departmentId: testDepartment1._id,
          roles: ['instructor', 'content-admin'],
          isPrimary: true,
          isActive: true
        }]
      });

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'instructor@example.com',
          password: 'Password123!'
        })
        .expect(200);

      const membership = response.body.data.departmentMemberships[0];
      expect(membership.accessRights).toBeDefined();
      expect(membership.accessRights).toBeInstanceOf(Array);

      // Should have access rights from both instructor and content-admin roles
      expect(membership.accessRights).toContain('content:courses:read');
      expect(membership.accessRights).toContain('content:lessons:read');
      expect(membership.accessRights).toContain('grades:own-classes:manage');
      expect(membership.accessRights).toContain('content:courses:manage');
      expect(membership.accessRights).toContain('content:lessons:manage');
      expect(membership.accessRights).toContain('content:materials:manage');
    });

    it('should return multiple department memberships for multi-department user', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await User.create({
        email: 'multidept@example.com',
        password: hashedPassword,
        userTypes: ['staff'],
        isActive: true
      });

      const staff = await Staff.create({
        userId: user._id,
        firstName: 'Multi',
        lastName: 'Department',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isPrimary: true,
            isActive: true
          },
          {
            departmentId: testDepartment2._id,
            roles: ['content-admin'],
            isPrimary: false,
            isActive: true
          }
        ]
      });

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'multidept@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.data.departmentMemberships).toHaveLength(2);

      const dept1Membership = response.body.data.departmentMemberships.find(
        (m: any) => m.departmentName === 'Cognitive Therapy'
      );
      const dept2Membership = response.body.data.departmentMemberships.find(
        (m: any) => m.departmentName === 'Advanced CBT'
      );

      expect(dept1Membership).toBeDefined();
      expect(dept1Membership.roles).toContain('instructor');
      expect(dept1Membership.isPrimary).toBe(true);

      expect(dept2Membership).toBeDefined();
      expect(dept2Membership.roles).toContain('content-admin');
      expect(dept2Membership.isPrimary).toBe(false);
    });
  });

  describe('Login returns allAccessRights (union of all departments)', () => {
    it('should return union of access rights from all departments', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await User.create({
        email: 'multidept@example.com',
        password: hashedPassword,
        userTypes: ['staff'],
        isActive: true
      });

      const staff = await Staff.create({
        userId: user._id,
        firstName: 'Multi',
        lastName: 'Department',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isPrimary: true,
            isActive: true
          },
          {
            departmentId: testDepartment2._id,
            roles: ['content-admin'],
            isPrimary: false,
            isActive: true
          }
        ]
      });

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'multidept@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.data.allAccessRights).toBeDefined();
      expect(response.body.data.allAccessRights).toBeInstanceOf(Array);

      // Should contain rights from instructor role
      expect(response.body.data.allAccessRights).toContain('content:courses:read');
      expect(response.body.data.allAccessRights).toContain('grades:own-classes:manage');

      // Should contain rights from content-admin role
      expect(response.body.data.allAccessRights).toContain('content:courses:manage');
      expect(response.body.data.allAccessRights).toContain('content:lessons:manage');

      // Should not have duplicates
      const uniqueRights = [...new Set(response.body.data.allAccessRights)];
      expect(response.body.data.allAccessRights.length).toBe(uniqueRights.length);
    });
  });

  describe('Login returns canEscalateToAdmin correctly', () => {
    it('should return canEscalateToAdmin=false for learner-only user', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await User.create({
        email: 'learner@example.com',
        password: hashedPassword,
        userTypes: ['learner'],
        isActive: true
      });

      const learner = await Learner.create({
        userId: user._id,
        firstName: 'John',
        lastName: 'Learner',
        departmentMemberships: [{
          departmentId: testDepartment1._id,
          roles: ['course-taker'],
          isPrimary: true,
          isActive: true
        }]
      });

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'learner@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.data.canEscalateToAdmin).toBe(false);
    });

    it('should return canEscalateToAdmin=false for staff-only user', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await User.create({
        email: 'staff@example.com',
        password: hashedPassword,
        userTypes: ['staff'],
        isActive: true
      });

      const staff = await Staff.create({
        userId: user._id,
        firstName: 'Jane',
        lastName: 'Staff',
        departmentMemberships: [{
          departmentId: testDepartment1._id,
          roles: ['instructor'],
          isPrimary: true,
          isActive: true
        }]
      });

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'staff@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.data.canEscalateToAdmin).toBe(false);
    });

    it('should return canEscalateToAdmin=true for global-admin user', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await User.create({
        email: 'admin@example.com',
        password: hashedPassword,
        userTypes: ['staff', 'global-admin'],
        isActive: true
      });

      const staff = await Staff.create({
        userId: user._id,
        firstName: 'Admin',
        lastName: 'User',
        departmentMemberships: [{
          departmentId: testDepartment1._id,
          roles: ['instructor'],
          isPrimary: true,
          isActive: true
        }]
      });

      const globalAdmin = await GlobalAdmin.create({
        userId: user._id,
        roles: ['system-admin'],
        escalationPassword: await bcrypt.hash('AdminPass123!', 10),
        isActive: true
      });

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.data.canEscalateToAdmin).toBe(true);
    });
  });

  describe('Login calculates defaultDashboard correctly', () => {
    it('should return defaultDashboard="learner" for learner-only user', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await User.create({
        email: 'learner@example.com',
        password: hashedPassword,
        userTypes: ['learner'],
        isActive: true
      });

      const learner = await Learner.create({
        userId: user._id,
        firstName: 'John',
        lastName: 'Learner',
        departmentMemberships: [{
          departmentId: testDepartment1._id,
          roles: ['course-taker'],
          isPrimary: true,
          isActive: true
        }]
      });

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'learner@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.data.defaultDashboard).toBe('learner');
    });

    it('should return defaultDashboard="staff" for staff-only user', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await User.create({
        email: 'staff@example.com',
        password: hashedPassword,
        userTypes: ['staff'],
        isActive: true
      });

      const staff = await Staff.create({
        userId: user._id,
        firstName: 'Jane',
        lastName: 'Staff',
        departmentMemberships: [{
          departmentId: testDepartment1._id,
          roles: ['instructor'],
          isPrimary: true,
          isActive: true
        }]
      });

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'staff@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.data.defaultDashboard).toBe('staff');
    });

    it('should return defaultDashboard="staff" for global-admin user', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await User.create({
        email: 'admin@example.com',
        password: hashedPassword,
        userTypes: ['global-admin'],
        isActive: true
      });

      const globalAdmin = await GlobalAdmin.create({
        userId: user._id,
        roles: ['system-admin'],
        escalationPassword: await bcrypt.hash('AdminPass123!', 10),
        isActive: true
      });

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.data.defaultDashboard).toBe('staff');
    });

    it('should return defaultDashboard="staff" for multi-type user (learner + staff)', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await User.create({
        email: 'hybrid@example.com',
        password: hashedPassword,
        userTypes: ['learner', 'staff'],
        isActive: true
      });

      const learner = await Learner.create({
        userId: user._id,
        firstName: 'Hybrid',
        lastName: 'User',
        departmentMemberships: [{
          departmentId: testDepartment1._id,
          roles: ['course-taker'],
          isPrimary: true,
          isActive: true
        }]
      });

      const staff = await Staff.create({
        userId: user._id,
        firstName: 'Hybrid',
        lastName: 'User',
        departmentMemberships: [{
          departmentId: testDepartment1._id,
          roles: ['instructor'],
          isPrimary: true,
          isActive: true
        }]
      });

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'hybrid@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.data.defaultDashboard).toBe('staff');
    });
  });

  describe('Login includes lastSelectedDepartment', () => {
    it('should return null lastSelectedDepartment for new user', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await User.create({
        email: 'newuser@example.com',
        password: hashedPassword,
        userTypes: ['staff'],
        isActive: true
      });

      const staff = await Staff.create({
        userId: user._id,
        firstName: 'New',
        lastName: 'User',
        departmentMemberships: [{
          departmentId: testDepartment1._id,
          roles: ['instructor'],
          isPrimary: true,
          isActive: true
        }]
      });

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'newuser@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.data.lastSelectedDepartment).toBeNull();
    });

    it('should return lastSelectedDepartment if previously set', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await User.create({
        email: 'existinguser@example.com',
        password: hashedPassword,
        userTypes: ['staff'],
        lastSelectedDepartment: testDepartment2._id,
        isActive: true
      });

      const staff = await Staff.create({
        userId: user._id,
        firstName: 'Existing',
        lastName: 'User',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isPrimary: true,
            isActive: true
          },
          {
            departmentId: testDepartment2._id,
            roles: ['content-admin'],
            isPrimary: false,
            isActive: true
          }
        ]
      });

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'existinguser@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.data.lastSelectedDepartment).toBeDefined();
      expect(response.body.data.lastSelectedDepartment).toBe(testDepartment2._id.toString());
    });
  });

  describe('Edge cases and error handling', () => {
    it('should return 401 for invalid credentials', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await User.create({
        email: 'user@example.com',
        password: hashedPassword,
        userTypes: ['staff'],
        isActive: true
      });

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for inactive user', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await User.create({
        email: 'inactive@example.com',
        password: hashedPassword,
        userTypes: ['staff'],
        isActive: false
      });

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'inactive@example.com',
          password: 'Password123!'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should include session tokens in response', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await User.create({
        email: 'user@example.com',
        password: hashedPassword,
        userTypes: ['staff'],
        isActive: true
      });

      const staff = await Staff.create({
        userId: user._id,
        firstName: 'Test',
        lastName: 'User',
        departmentMemberships: [{
          departmentId: testDepartment1._id,
          roles: ['instructor'],
          isPrimary: true,
          isActive: true
        }]
      });

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'user@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.data.session).toBeDefined();
      expect(response.body.data.session.accessToken).toBeDefined();
      expect(response.body.data.session.refreshToken).toBeDefined();
      expect(response.body.data.session.expiresIn).toBeDefined();
      expect(response.body.data.session.tokenType).toBe('Bearer');
    });
  });
});
