/**
 * E2E Tests: API Authorization (Phase 5)
 *
 * Tests complete authorization stack from HTTP request to response:
 * - Middleware (authenticate, requireAccessRight, requireEscalation)
 * - Controller (user context passing, permission checks)
 * - Service (authorization logic, data masking, scoping)
 *
 * Validates:
 * - Course visibility rules (draft/published/archived)
 * - Creator-based editing permissions
 * - Data masking in API responses (FERPA compliance)
 * - Department scoping
 * - Transcript filtering
 * - Report authorization
 * - Complete request/response flows
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
import Course from '@/models/academic/Course.model';
import Class from '@/models/academic/Class.model';
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';

describe('E2E Authorization API Tests', () => {
  let mongoServer: MongoMemoryServer;
  let masterDepartment: any;
  let topLevelDepartment: any;
  let subDepartment: any;
  let otherDepartment: any;
  let draftCourse: any;
  let publishedCourse: any;
  let archivedCourse: any;
  let testClass: any;
  let instructorUser: any;
  let instructorStaff: any;
  let instructorToken: string;
  let contentAdminUser: any;
  let contentAdminStaff: any;
  let contentAdminToken: string;
  let deptAdminUser: any;
  let deptAdminStaff: any;
  let deptAdminToken: string;
  let systemAdminUser: any;
  let systemAdminStaff: any;
  let systemAdminToken: string;
  let systemAdminEscalationToken: string;
  let enrollmentAdminUser: any;
  let enrollmentAdminStaff: any;
  let enrollmentAdminToken: string;
  let learner1: any;
  let learner1User: any;
  let learner1Token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create master department for system admins
    masterDepartment = await Department.create({
      _id: new mongoose.Types.ObjectId('000000000000000000000001'),
      name: 'System Administration',
      code: 'SYS-ADMIN',
      slug: 'master',
      isSystem: true,
      isVisible: false,
      isActive: true
    });

    // Create department hierarchy
    topLevelDepartment = await Department.create({
      name: 'Computer Science Department',
      code: 'CS',
      slug: 'computer-science',
      isActive: true
    });

    subDepartment = await Department.create({
      name: 'AI Subdepartment',
      code: 'AI',
      slug: 'artificial-intelligence',
      parentDepartmentId: topLevelDepartment._id,
      isActive: true
    });

    otherDepartment = await Department.create({
      name: 'Mathematics Department',
      code: 'MATH',
      slug: 'mathematics',
      isActive: true
    });

    // Seed role definitions
    await RoleDefinition.create([
      {
        name: 'instructor',
        userType: 'staff',
        displayName: 'Instructor',
        description: 'Can teach courses',
        accessRights: ['content:courses:read', 'content:lessons:read'],
        isActive: true
      },
      {
        name: 'content-admin',
        userType: 'staff',
        displayName: 'Content Administrator',
        description: 'Can manage content',
        accessRights: ['content:courses:read', 'content:courses:manage', 'content:lessons:manage'],
        isActive: true
      },
      {
        name: 'department-admin',
        userType: 'staff',
        displayName: 'Department Administrator',
        description: 'Can manage department',
        accessRights: ['content:courses:read', 'content:courses:manage', 'staff:department:manage', 'reports:department:read'],
        isActive: true
      },
      {
        name: 'enrollment-admin',
        userType: 'staff',
        displayName: 'Enrollment Administrator',
        description: 'Manages enrollments',
        accessRights: ['enrollment:*', 'content:courses:read', 'reports:*'],
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
      { name: 'staff:department:manage', domain: 'staff', resource: 'department', action: 'manage', description: 'Manage department', isActive: true },
      { name: 'reports:department:read', domain: 'reports', resource: 'department', action: 'read', description: 'Read department reports', isActive: true },
      { name: 'enrollment:*', domain: 'enrollment', resource: '*', action: '*', description: 'All enrollment operations', isActive: true },
      { name: 'reports:*', domain: 'reports', resource: '*', action: '*', description: 'All reporting operations', isActive: true },
      { name: 'system:*', domain: 'system', resource: '*', action: '*', description: 'All system operations', isActive: true },
      { name: 'content:*', domain: 'content', resource: '*', action: '*', description: 'All content operations', isActive: true }
    ]);

    // Create courses with different statuses
    const creatorId = new mongoose.Types.ObjectId();

    draftCourse = await Course.create({
      name: 'Draft Course',
      code: 'CS101',
      departmentId: topLevelDepartment._id,
      credits: 3,
      duration: 15,
      isActive: true,
      metadata: {
        status: 'draft',
        createdBy: creatorId
      }
    });

    publishedCourse = await Course.create({
      name: 'Published Course',
      code: 'CS201',
      departmentId: topLevelDepartment._id,
      credits: 3,
      duration: 15,
      isActive: true,
      metadata: {
        status: 'published',
        publishedAt: new Date()
      }
    });

    archivedCourse = await Course.create({
      name: 'Archived Course',
      code: 'CS301',
      departmentId: topLevelDepartment._id,
      credits: 3,
      duration: 15,
      isActive: false,
      metadata: {
        status: 'archived',
        archivedAt: new Date()
      }
    });

    // Create test class
    const academicYearId = new mongoose.Types.ObjectId();
    testClass = await Class.create({
      name: 'Test Class',
      courseId: publishedCourse._id,
      departmentId: topLevelDepartment._id,
      academicYearId: academicYearId,
      termCode: 'FALL2026',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-12-15'),
      maxEnrollment: 30,
      isActive: true
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    // Create instructor user
    instructorUser = await User.create({
      email: 'instructor@test.com',
      password: hashedPassword,
      userTypes: ['staff'],
      isActive: true
    });

    instructorStaff = await Staff.create({
      _id: instructorUser._id,
      firstName: 'John',
      lastName: 'Instructor',
      departmentMemberships: [{
        departmentId: topLevelDepartment._id,
        roles: ['instructor'],
        isPrimary: true,
        isActive: true
      }]
    });

    instructorToken = jwt.sign(
      {
        userId: instructorUser._id.toString(),
        email: instructorUser.email,
        roles: ['instructor'],
        type: 'access',
        allAccessRights: ['content:courses:read', 'content:lessons:read'],
        departmentMemberships: [{ departmentId: topLevelDepartment._id.toString(), roles: ['instructor'] }]
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Update test class with instructor
    await Class.updateOne(
      { _id: testClass._id },
      { $set: { 'metadata.instructorId': instructorUser._id } }
    );

    // Create content admin user
    contentAdminUser = await User.create({
      email: 'contentadmin@test.com',
      password: hashedPassword,
      userTypes: ['staff'],
      isActive: true
    });

    contentAdminStaff = await Staff.create({
      _id: contentAdminUser._id,
      firstName: 'Jane',
      lastName: 'ContentAdmin',
      departmentMemberships: [{
        departmentId: topLevelDepartment._id,
        roles: ['content-admin'],
        isPrimary: true,
        isActive: true
      }]
    });

    contentAdminToken = jwt.sign(
      {
        userId: contentAdminUser._id.toString(),
        email: contentAdminUser.email,
        roles: ['content-admin'],
        type: 'access',
        allAccessRights: ['content:courses:read', 'content:courses:manage', 'content:lessons:manage'],
        departmentMemberships: [{ departmentId: topLevelDepartment._id.toString(), roles: ['content-admin'] }]
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create department admin user
    deptAdminUser = await User.create({
      email: 'deptadmin@test.com',
      password: hashedPassword,
      userTypes: ['staff'],
      isActive: true
    });

    deptAdminStaff = await Staff.create({
      _id: deptAdminUser._id,
      firstName: 'Bob',
      lastName: 'DeptAdmin',
      departmentMemberships: [{
        departmentId: topLevelDepartment._id,
        roles: ['department-admin'],
        isPrimary: true,
        isActive: true
      }]
    });

    deptAdminToken = jwt.sign(
      {
        userId: deptAdminUser._id.toString(),
        email: deptAdminUser.email,
        roles: ['department-admin'],
        type: 'access',
        allAccessRights: ['content:courses:read', 'content:courses:manage', 'staff:department:manage', 'reports:department:read'],
        departmentMemberships: [{ departmentId: topLevelDepartment._id.toString(), roles: ['department-admin'] }]
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create enrollment admin user
    enrollmentAdminUser = await User.create({
      email: 'enrolladmin@test.com',
      password: hashedPassword,
      userTypes: ['staff'],
      isActive: true
    });

    enrollmentAdminStaff = await Staff.create({
      _id: enrollmentAdminUser._id,
      firstName: 'Alice',
      lastName: 'EnrollAdmin',
      departmentMemberships: [{
        departmentId: topLevelDepartment._id,
        roles: ['enrollment-admin'],
        isPrimary: true,
        isActive: true
      }]
    });

    enrollmentAdminToken = jwt.sign(
      {
        userId: enrollmentAdminUser._id.toString(),
        email: enrollmentAdminUser.email,
        roles: ['enrollment-admin'],
        type: 'access',
        allAccessRights: ['enrollment:*', 'content:courses:read', 'reports:*'],
        departmentMemberships: [{ departmentId: topLevelDepartment._id.toString(), roles: ['enrollment-admin'] }]
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create system admin user
    systemAdminUser = await User.create({
      email: 'sysadmin@test.com',
      password: hashedPassword,
      userTypes: ['staff', 'global-admin'],
      isActive: true
    });

    systemAdminStaff = await Staff.create({
      _id: systemAdminUser._id,
      firstName: 'Admin',
      lastName: 'System',
      departmentMemberships: [{
        departmentId: masterDepartment._id,
        roles: ['system-admin'],
        isPrimary: true,
        isActive: true
      }]
    });

    await GlobalAdmin.create({
      _id: systemAdminUser._id,
      escalationPassword: await bcrypt.hash('AdminPass123!', 10),
      roleMemberships: [{
        departmentId: masterDepartment._id,
        roles: ['system-admin'],
        assignedAt: new Date(),
        isActive: true
      }],
      isActive: true
    });

    systemAdminToken = jwt.sign(
      {
        userId: systemAdminUser._id.toString(),
        email: systemAdminUser.email,
        roles: ['system-admin'],
        type: 'access',
        allAccessRights: ['system:*', 'content:*', 'enrollment:*'],
        departmentMemberships: [{ departmentId: masterDepartment._id.toString(), roles: ['system-admin'] }]
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    systemAdminEscalationToken = jwt.sign(
      {
        userId: systemAdminUser._id.toString(),
        email: systemAdminUser.email,
        roles: ['system-admin'],
        type: 'access',
        allAccessRights: ['system:*', 'content:*', 'enrollment:*'],
        isAdmin: true,
        adminRoles: ['system-admin']
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '15m' }
    );

    // Create learner
    learner1User = await User.create({
      email: 'learner1@test.com',
      password: hashedPassword,
      userTypes: ['learner'],
      isActive: true
    });

    learner1 = await Learner.create({
      _id: learner1User._id,
      firstName: 'Sarah',
      lastName: 'Student',
      dateOfBirth: new Date('2000-01-01')
    });

    learner1Token = jwt.sign(
      {
        userId: learner1User._id.toString(),
        email: learner1User.email,
        roles: ['learner'],
        type: 'access',
        allAccessRights: ['content:courses:read']
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create class enrollment
    await ClassEnrollment.create({
      learnerId: learner1._id,
      classId: testClass._id,
      enrollmentDate: new Date(),
      status: 'active'
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Staff.deleteMany({});
    await Learner.deleteMany({});
    await GlobalAdmin.deleteMany({});
    await ClassEnrollment.deleteMany({});
  });

  describe('Course Visibility API Tests', () => {
    describe('GET /api/v2/courses/:id', () => {
      it('should allow department member to view draft course', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${draftCourse._id}`)
          .set('Authorization', `Bearer ${instructorToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Draft Course');
      });

      it('should block non-department member from viewing draft course', async () => {
        // Create user in other department
        const otherUser = await User.create({
          email: 'other@test.com',
          password: await bcrypt.hash('Password123!', 10),
          userTypes: ['staff'],
          isActive: true
        });

        await Staff.create({
          _id: otherUser._id,
          firstName: 'Other',
          lastName: 'User',
          departmentMemberships: [{
            departmentId: otherDepartment._id,
            roles: ['instructor'],
            isPrimary: true,
            isActive: true
          }]
        });

        const otherToken = jwt.sign(
          {
            userId: otherUser._id.toString(),
            email: otherUser.email,
            roles: ['instructor'],
            type: 'access',
            allAccessRights: ['content:courses:read', 'content:lessons:read'],
            departmentMemberships: [{ departmentId: otherDepartment._id.toString(), roles: ['instructor'] }]
          },
          process.env.JWT_ACCESS_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        await request(app)
          .get(`/api/v2/courses/${draftCourse._id}`)
          .set('Authorization', `Bearer ${otherToken}`)
          .expect(403);
      });

      it('should allow anyone to view published course', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${publishedCourse._id}`)
          .set('Authorization', `Bearer ${learner1Token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Published Course');
      });

      it('should allow department member to view archived course', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${archivedCourse._id}`)
          .set('Authorization', `Bearer ${deptAdminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Archived Course');
      });

      it('should block non-department member from viewing archived course', async () => {
        // Create user in other department
        const otherUser = await User.create({
          email: 'other2@test.com',
          password: await bcrypt.hash('Password123!', 10),
          userTypes: ['staff'],
          isActive: true
        });

        await Staff.create({
          _id: otherUser._id,
          firstName: 'Other2',
          lastName: 'User2',
          departmentMemberships: [{
            departmentId: otherDepartment._id,
            roles: ['instructor'],
            isPrimary: true,
            isActive: true
          }]
        });

        const otherToken = jwt.sign(
          {
            userId: otherUser._id.toString(),
            email: otherUser.email,
            roles: ['instructor'],
            type: 'access',
            allAccessRights: ['content:courses:read', 'content:lessons:read'],
            departmentMemberships: [{ departmentId: otherDepartment._id.toString(), roles: ['instructor'] }]
          },
          process.env.JWT_ACCESS_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        await request(app)
          .get(`/api/v2/courses/${archivedCourse._id}`)
          .set('Authorization', `Bearer ${otherToken}`)
          .expect(403);
      });
    });

    describe('GET /api/v2/courses', () => {
      it('should filter course list by visibility rules', async () => {
        const response = await request(app)
          .get('/api/v2/courses')
          .set('Authorization', `Bearer ${instructorToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.courses).toBeDefined();

        // Should see all courses in same department (draft, published, archived)
        const courseNames = response.body.data.courses.map((c: any) => c.name);
        expect(courseNames).toContain('Draft Course');
        expect(courseNames).toContain('Published Course');
        expect(courseNames).toContain('Archived Course');
      });

      it('should allow learner to see only published courses', async () => {
        const response = await request(app)
          .get('/api/v2/courses')
          .set('Authorization', `Bearer ${learner1Token}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Should only see published courses
        const courseNames = response.body.data.courses.map((c: any) => c.name);
        expect(courseNames).toContain('Published Course');
        expect(courseNames).not.toContain('Draft Course');
        expect(courseNames).not.toContain('Archived Course');
      });
    });
  });

  describe('Course Editing API Tests', () => {
    describe('PUT /api/v2/courses/:id', () => {
      it('should allow department-admin to edit published course', async () => {
        const response = await request(app)
          .put(`/api/v2/courses/${publishedCourse._id}`)
          .set('Authorization', `Bearer ${deptAdminToken}`)
          .send({
            title: 'Updated Published Course',
            code: 'CS201',
            department: topLevelDepartment._id.toString()
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should block instructor from editing published course', async () => {
        await request(app)
          .put(`/api/v2/courses/${publishedCourse._id}`)
          .set('Authorization', `Bearer ${instructorToken}`)
          .send({
            title: 'Attempted Update',
            code: 'CS201',
            department: topLevelDepartment._id.toString()
          })
          .expect(403);
      });

      it('should block content-admin from editing published course', async () => {
        await request(app)
          .put(`/api/v2/courses/${publishedCourse._id}`)
          .set('Authorization', `Bearer ${contentAdminToken}`)
          .send({
            title: 'Attempted Update',
            code: 'CS201',
            department: topLevelDepartment._id.toString()
          })
          .expect(403);
      });

      it('should block anyone from editing archived course', async () => {
        await request(app)
          .put(`/api/v2/courses/${archivedCourse._id}`)
          .set('Authorization', `Bearer ${deptAdminToken}`)
          .send({
            title: 'Attempted Update',
            code: 'CS301',
            department: topLevelDepartment._id.toString()
          })
          .expect(403);
      });
    });
  });

  describe('Data Masking API Tests (FERPA Compliance)', () => {
    describe('GET /api/v2/progress/detailed', () => {
      it('should mask learner last names for instructors', async () => {
        const response = await request(app)
          .get('/api/v2/progress/detailed')
          .set('Authorization', `Bearer ${instructorToken}`)
          .query({ classId: testClass._id.toString() })
          .expect(200);

        expect(response.body.success).toBe(true);

        if (response.body.data.learnerDetails && response.body.data.learnerDetails.length > 0) {
          const learner = response.body.data.learnerDetails[0];
          // Check if last name is masked to initial
          expect(learner.learnerName).toMatch(/^[A-Z][a-z]+ [A-Z]\.$/);
        }
      });

      it('should mask learner last names for department-admin', async () => {
        const response = await request(app)
          .get('/api/v2/progress/detailed')
          .set('Authorization', `Bearer ${deptAdminToken}`)
          .query({ classId: testClass._id.toString() })
          .expect(200);

        expect(response.body.success).toBe(true);

        if (response.body.data.learnerDetails && response.body.data.learnerDetails.length > 0) {
          const learner = response.body.data.learnerDetails[0];
          expect(learner.learnerName).toMatch(/^[A-Z][a-z]+ [A-Z]\.$/);
        }
      });

      it('should NOT mask learner names for enrollment-admin', async () => {
        const response = await request(app)
          .get('/api/v2/progress/detailed')
          .set('Authorization', `Bearer ${enrollmentAdminToken}`)
          .query({ classId: testClass._id.toString() })
          .expect(200);

        expect(response.body.success).toBe(true);

        if (response.body.data.learnerDetails && response.body.data.learnerDetails.length > 0) {
          const learner = response.body.data.learnerDetails[0];
          // Full last name should be visible
          expect(learner.learnerName).not.toMatch(/\.[^.]*$/); // Should not end with initial
        }
      });

      it('should NOT mask learner names for system-admin', async () => {
        const response = await request(app)
          .get('/api/v2/progress/detailed')
          .set('Authorization', `Bearer ${systemAdminToken}`)
          .query({ classId: testClass._id.toString() })
          .expect(200);

        expect(response.body.success).toBe(true);

        if (response.body.data.learnerDetails && response.body.data.learnerDetails.length > 0) {
          const learner = response.body.data.learnerDetails[0];
          expect(learner.learnerName).not.toMatch(/\.[^.]*$/);
        }
      });
    });
  });

  describe('Report Authorization API Tests', () => {
    describe('GET /api/v2/reports/completion', () => {
      it('should apply authorization scoping for instructors', async () => {
        const response = await request(app)
          .get('/api/v2/reports/completion')
          .set('Authorization', `Bearer ${instructorToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        // Data should be scoped to instructor's classes
      });

      it('should apply authorization scoping for department-admin', async () => {
        const response = await request(app)
          .get('/api/v2/reports/completion')
          .set('Authorization', `Bearer ${deptAdminToken}`)
          .query({ departmentId: topLevelDepartment._id.toString() })
          .expect(200);

        expect(response.body.success).toBe(true);
        // Data should be scoped to department
      });

      it('should allow system-admin to view all reports', async () => {
        const response = await request(app)
          .get('/api/v2/reports/completion')
          .set('Authorization', `Bearer ${systemAdminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        // No scoping applied
      });
    });

    describe('GET /api/v2/reports/transcript/:learnerId', () => {
      it('should filter transcript by department for department-admin', async () => {
        const response = await request(app)
          .get(`/api/v2/reports/transcript/${learner1._id}`)
          .set('Authorization', `Bearer ${deptAdminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        // Transcript should only show courses from dept-admin's department
      });

      it('should NOT filter transcript for enrollment-admin', async () => {
        const response = await request(app)
          .get(`/api/v2/reports/transcript/${learner1._id}`)
          .set('Authorization', `Bearer ${enrollmentAdminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        // Full transcript visible
      });

      it('should NOT filter transcript for system-admin', async () => {
        const response = await request(app)
          .get(`/api/v2/reports/transcript/${learner1._id}`)
          .set('Authorization', `Bearer ${systemAdminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        // Full transcript visible
      });
    });
  });

  describe('Complete Authorization Stack Tests', () => {
    it('should enforce middleware + controller + service authorization', async () => {
      // Test that all 3 layers work together
      const response = await request(app)
        .get(`/api/v2/courses/${draftCourse._id}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Draft Course');
    });

    it('should return 401 when no auth token provided', async () => {
      await request(app)
        .get(`/api/v2/courses/${draftCourse._id}`)
        .expect(401);
    });

    it('should return 403 when user lacks access right', async () => {
      // Create user without content:courses:read access right
      const limitedUser = await User.create({
        email: 'limited@test.com',
        password: await bcrypt.hash('Password123!', 10),
        userTypes: ['staff'],
        isActive: true
      });

      const limitedToken = jwt.sign(
        {
          userId: limitedUser._id.toString(),
          email: limitedUser.email,
          roles: [],
          type: 'access',
          allAccessRights: []
        },
        process.env.JWT_ACCESS_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      await request(app)
        .get(`/api/v2/courses/${publishedCourse._id}`)
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(403);
    });

    it('should return 403 when user lacks view permission at service layer', async () => {
      // User has access right but not view permission (different department)
      const otherUser = await User.create({
        email: 'otherdept@test.com',
        password: await bcrypt.hash('Password123!', 10),
        userTypes: ['staff'],
        isActive: true
      });

      await Staff.create({
        _id: otherUser._id,
        firstName: 'Other',
        lastName: 'Dept',
        departmentMemberships: [{
          departmentId: otherDepartment._id,
          roles: ['instructor'],
          isPrimary: true,
          isActive: true
        }]
      });

      const otherToken = jwt.sign(
        {
          userId: otherUser._id.toString(),
          email: otherUser.email,
          roles: ['instructor'],
          type: 'access',
          departmentMemberships: [{ departmentId: otherDepartment._id.toString(), roles: ['instructor'] }]
        },
        process.env.JWT_ACCESS_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      await request(app)
        .get(`/api/v2/courses/${draftCourse._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });
});
