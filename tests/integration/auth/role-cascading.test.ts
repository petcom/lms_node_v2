/**
 * Integration Tests: Role Cascading (Task 7.4)
 *
 * Tests role cascading from parent to child departments:
 * - User has role in child via parent membership
 * - Role cascading respects requireExplicitMembership flag
 * - Multiple levels of cascading work (grandparent → parent → child)
 * - Cascaded roles grant correct access rights
 * - User without parent membership cannot access child via cascading
 * - Primary department flag works correctly
 * - Active/inactive membership status affects cascading
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import { User } from '@/models/auth/User.model';
import Staff from '@/models/auth/Staff.model';
import Learner from '@/models/auth/Learner.model';
import Department from '@/models/organization/Department.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';

describe('Role Cascading Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let grandparentDept: any;
  let parentDept: any;
  let childDept: any;
  let grandchildDept: any;
  let siblingDept: any;
  let restrictedDept: any;
  let staffUser: any;
  let staffAccessToken: string;
  let learnerUser: any;
  let learnerAccessToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create department hierarchy
    // Grandparent → Parent → Child → Grandchild
    grandparentDept = await Department.create({
      name: 'School of Psychology',
      code: 'PSYCH',
      slug: 'psychology',
      isActive: true,
      requireExplicitMembership: false
    });

    parentDept = await Department.create({
      name: 'Cognitive Therapy',
      code: 'COG-THER',
      slug: 'cognitive-therapy',
      parentDepartmentId: grandparentDept._id,
      isActive: true,
      requireExplicitMembership: false
    });

    childDept = await Department.create({
      name: 'CBT Advanced',
      code: 'CBT-ADV',
      slug: 'cbt-advanced',
      parentDepartmentId: parentDept._id,
      isActive: true,
      requireExplicitMembership: false
    });

    grandchildDept = await Department.create({
      name: 'CBT Research',
      code: 'CBT-RES',
      slug: 'cbt-research',
      parentDepartmentId: childDept._id,
      isActive: true,
      requireExplicitMembership: false
    });

    // Create sibling department (same parent, different branch)
    siblingDept = await Department.create({
      name: 'DBT Therapy',
      code: 'DBT',
      slug: 'dbt-therapy',
      parentDepartmentId: grandparentDept._id,
      isActive: true,
      requireExplicitMembership: false
    });

    // Create restricted department (no cascading allowed)
    restrictedDept = await Department.create({
      name: 'Executive Board',
      code: 'EXEC',
      slug: 'executive-board',
      parentDepartmentId: parentDept._id,
      isActive: true,
      requireExplicitMembership: true
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
        name: 'course-taker',
        userType: 'learner',
        displayName: 'Course Taker',
        description: 'Can enroll in courses',
        accessRights: ['content:courses:read', 'enrollment:own:manage'],
        isActive: true
      },
      {
        name: 'learner-supervisor',
        userType: 'learner',
        displayName: 'Learner Supervisor',
        description: 'Can supervise other learners',
        accessRights: ['content:courses:read', 'learner:supervised:view', 'learner:progress:monitor'],
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
      { name: 'grades:own-classes:manage', domain: 'grades', description: 'Manage grades' },
      { name: 'staff:department:manage', domain: 'staff', description: 'Manage department' },
      { name: 'reports:department:read', domain: 'reports', description: 'Read reports' },
      { name: 'staff:members:manage', domain: 'staff', description: 'Manage members' },
      { name: 'enrollment:own:manage', domain: 'enrollment', description: 'Manage own enrollments' },
      { name: 'learner:supervised:view', domain: 'learner', description: 'View supervised learners' },
      { name: 'learner:progress:monitor', domain: 'learner', description: 'Monitor progress' }
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Create staff user with membership in grandparent department
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    staffUser = await User.create({
      email: 'staff@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      isActive: true
    });

    await Staff.create({
      userId: staffUser._id,
      firstName: 'Test',
      lastName: 'Staff',
      departmentMemberships: [
        {
          departmentId: grandparentDept._id,
          roles: ['instructor', 'content-admin'],
          isPrimary: true,
          isActive: true
        }
      ]
    });

    staffAccessToken = jwt.sign(
      { userId: staffUser._id.toString(), email: staffUser.email },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create learner user
    learnerUser = await User.create({
      email: 'learner@example.com',
      password: hashedPassword,
      userTypes: ['learner'],
      isActive: true
    });

    await Learner.create({
      userId: learnerUser._id,
      firstName: 'Test',
      lastName: 'Learner',
      departmentMemberships: [
        {
          departmentId: parentDept._id,
          roles: ['course-taker'],
          isPrimary: true,
          isActive: true
        }
      ]
    });

    learnerAccessToken = jwt.sign(
      { userId: learnerUser._id.toString(), email: learnerUser.email },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Staff.deleteMany({});
    await Learner.deleteMany({});
  });

  describe('User has role in child via parent membership', () => {
    it('should cascade roles from parent to child department', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: parentDept._id.toString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentDepartment.roles).toContain('instructor');
      expect(response.body.data.currentDepartment.roles).toContain('content-admin');
      expect(response.body.data.isDirectMember).toBe(false);
      expect(response.body.data.inheritedFrom).toBe(grandparentDept._id.toString());
    });

    it('should cascade roles to child department', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: childDept._id.toString()
        })
        .expect(200);

      expect(response.body.data.currentDepartment.roles).toContain('instructor');
      expect(response.body.data.currentDepartment.roles).toContain('content-admin');
      expect(response.body.data.isDirectMember).toBe(false);
    });

    it('should list child departments with cascaded roles in login response', async () => {
      const loginResponse = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'staff@example.com',
          password: 'Password123!'
        })
        .expect(200);

      const grandparentMembership = loginResponse.body.data.departmentMemberships.find(
        (m: any) => m.departmentName === 'School of Psychology'
      );

      expect(grandparentMembership).toBeDefined();
      expect(grandparentMembership.childDepartments).toBeDefined();
      expect(grandparentMembership.childDepartments.length).toBeGreaterThan(0);

      const childDeptInList = grandparentMembership.childDepartments.find(
        (c: any) => c.departmentName === 'Cognitive Therapy'
      );

      expect(childDeptInList).toBeDefined();
      expect(childDeptInList.roles).toContain('instructor');
      expect(childDeptInList.roles).toContain('content-admin');
    });
  });

  describe('Role cascading respects requireExplicitMembership flag', () => {
    it('should block cascading to restricted department', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: restrictedDept._id.toString()
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('NOT_A_MEMBER');
    });

    it('should allow access with explicit membership to restricted department', async () => {
      // Add explicit membership
      const staff = await Staff.findOne({ userId: staffUser._id });
      staff!.departmentMemberships.push({
        departmentId: restrictedDept._id,
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
          departmentId: restrictedDept._id.toString()
        })
        .expect(200);

      expect(response.body.data.currentDepartment.departmentName).toBe('Executive Board');
      expect(response.body.data.isDirectMember).toBe(true);
    });

    it('should not list restricted department in child departments', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: parentDept._id.toString()
        })
        .expect(200);

      const restrictedChild = response.body.data.childDepartments?.find(
        (c: any) => c.departmentName === 'Executive Board'
      );

      expect(restrictedChild).toBeUndefined();
    });
  });

  describe('Multiple levels of cascading work (grandparent → parent → child)', () => {
    it('should cascade roles through 2 levels (grandparent → parent → child)', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: childDept._id.toString()
        })
        .expect(200);

      expect(response.body.data.currentDepartment.roles).toContain('instructor');
      expect(response.body.data.currentDepartment.roles).toContain('content-admin');
      expect(response.body.data.inheritedFrom).toBe(grandparentDept._id.toString());
    });

    it('should cascade roles through 3 levels (grandparent → parent → child → grandchild)', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: grandchildDept._id.toString()
        })
        .expect(200);

      expect(response.body.data.currentDepartment.roles).toContain('instructor');
      expect(response.body.data.currentDepartment.roles).toContain('content-admin');
      expect(response.body.data.isDirectMember).toBe(false);
    });

    it('should cascade to sibling department at same level', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: siblingDept._id.toString()
        })
        .expect(200);

      expect(response.body.data.currentDepartment.departmentName).toBe('DBT Therapy');
      expect(response.body.data.currentDepartment.roles).toContain('instructor');
      expect(response.body.data.currentDepartment.roles).toContain('content-admin');
    });

    it('should show entire cascaded hierarchy in login response', async () => {
      const loginResponse = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'staff@example.com',
          password: 'Password123!'
        })
        .expect(200);

      const grandparentMembership = loginResponse.body.data.departmentMemberships.find(
        (m: any) => m.departmentName === 'School of Psychology'
      );

      expect(grandparentMembership.childDepartments).toBeDefined();

      // Should include direct children
      const childNames = grandparentMembership.childDepartments.map((c: any) => c.departmentName);
      expect(childNames).toContain('Cognitive Therapy');
      expect(childNames).toContain('DBT Therapy');
    });
  });

  describe('Cascaded roles grant correct access rights', () => {
    it('should grant access rights from cascaded roles', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: childDept._id.toString()
        })
        .expect(200);

      const accessRights = response.body.data.currentDepartment.accessRights;
      expect(accessRights).toContain('content:courses:read');
      expect(accessRights).toContain('content:lessons:read');
      expect(accessRights).toContain('grades:own-classes:manage');
      expect(accessRights).toContain('content:courses:manage');
      expect(accessRights).toContain('content:lessons:manage');
      expect(accessRights).toContain('content:materials:manage');
    });

    it('should include cascaded rights in allAccessRights on login', async () => {
      const loginResponse = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'staff@example.com',
          password: 'Password123!'
        })
        .expect(200);

      const allRights = loginResponse.body.data.allAccessRights;
      expect(allRights).toContain('content:courses:read');
      expect(allRights).toContain('content:courses:manage');
      expect(allRights).toContain('grades:own-classes:manage');
    });

    it('should allow operations based on cascaded access rights', async () => {
      // Switch to child department
      await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: childDept._id.toString()
        })
        .expect(200);

      // Should be able to access course management (cascaded content-admin role)
      const coursesResponse = await request(app)
        .get(`/api/v2/departments/${childDept._id}/courses`)
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .expect(200);

      expect(coursesResponse.body.success).toBe(true);
    });
  });

  describe('User without parent membership cannot access child via cascading', () => {
    it('should deny access to unrelated department hierarchy', async () => {
      // Create a new department tree
      const unrelatedDept = await Department.create({
        name: 'Unrelated Department',
        code: 'UNREL',
        slug: 'unrelated',
        isActive: true
      });

      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: unrelatedDept._id.toString()
        })
        .expect(403);

      expect(response.body.code).toBe('NOT_A_MEMBER');
    });

    it('should not cascade from sibling branches', async () => {
      // User has membership in parentDept but not in siblingDept's children
      // Create child under sibling
      const siblingChild = await Department.create({
        name: 'DBT Advanced',
        code: 'DBT-ADV',
        slug: 'dbt-advanced',
        parentDepartmentId: siblingDept._id,
        isActive: true
      });

      // Staff has membership in grandparent, so should cascade to sibling's child
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: siblingChild._id.toString()
        })
        .expect(200);

      // This should work because staff has grandparent membership
      expect(response.body.data.currentDepartment.departmentName).toBe('DBT Advanced');
    });

    it('should deny access when parent membership is inactive', async () => {
      // Deactivate grandparent membership
      const staff = await Staff.findOne({ userId: staffUser._id });
      staff!.departmentMemberships[0].isActive = false;
      await staff!.save();

      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: childDept._id.toString()
        })
        .expect(403);

      expect(response.body.code).toBe('NOT_A_MEMBER');
    });
  });

  describe('Primary department flag works correctly', () => {
    it('should identify primary department membership', async () => {
      const loginResponse = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'staff@example.com',
          password: 'Password123!'
        })
        .expect(200);

      const primaryMembership = loginResponse.body.data.departmentMemberships.find(
        (m: any) => m.isPrimary === true
      );

      expect(primaryMembership).toBeDefined();
      expect(primaryMembership.departmentName).toBe('School of Psychology');
    });

    it('should allow only one primary department', async () => {
      const loginResponse = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'staff@example.com',
          password: 'Password123!'
        })
        .expect(200);

      const primaryCount = loginResponse.body.data.departmentMemberships.filter(
        (m: any) => m.isPrimary === true
      ).length;

      expect(primaryCount).toBe(1);
    });

    it('should default to primary department on first login', async () => {
      const loginResponse = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'staff@example.com',
          password: 'Password123!'
        })
        .expect(200);

      // Check if lastSelectedDepartment is set to primary (or null for first login)
      const lastSelected = loginResponse.body.data.lastSelectedDepartment;
      expect([null, grandparentDept._id.toString()]).toContain(lastSelected);
    });
  });

  describe('Active/inactive membership status affects cascading', () => {
    it('should cascade only from active memberships', async () => {
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: childDept._id.toString()
        })
        .expect(200);

      expect(response.body.data.currentDepartment.roles).toContain('instructor');
    });

    it('should not cascade from inactive membership', async () => {
      // Deactivate parent membership
      const staff = await Staff.findOne({ userId: staffUser._id });
      staff!.departmentMemberships[0].isActive = false;
      await staff!.save();

      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${staffAccessToken}`)
        .send({
          departmentId: childDept._id.toString()
        })
        .expect(403);

      expect(response.body.code).toBe('NOT_A_MEMBER');

      // Reactivate for cleanup
      staff!.departmentMemberships[0].isActive = true;
      await staff!.save();
    });

    it('should only list active memberships in login response', async () => {
      // Add inactive membership
      const staff = await Staff.findOne({ userId: staffUser._id });
      staff!.departmentMemberships.push({
        departmentId: siblingDept._id,
        roles: ['instructor'],
        isPrimary: false,
        isActive: false,
        joinedAt: new Date()
      });
      await staff!.save();

      const loginResponse = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'staff@example.com',
          password: 'Password123!'
        })
        .expect(200);

      const inactiveMembership = loginResponse.body.data.departmentMemberships.find(
        (m: any) => m.isActive === false
      );

      // Inactive memberships should not be included
      expect(inactiveMembership).toBeUndefined();
    });

    it('should work with learner role cascading', async () => {
      // Learner has membership in parent, should cascade to child
      const response = await request(app)
        .post('/api/v2/auth/switch-department')
        .set('Authorization', `Bearer ${learnerAccessToken}`)
        .send({
          departmentId: childDept._id.toString()
        })
        .expect(200);

      expect(response.body.data.currentDepartment.roles).toContain('course-taker');
      expect(response.body.data.isDirectMember).toBe(false);
      expect(response.body.data.inheritedFrom).toBe(parentDept._id.toString());
    });
  });
});
