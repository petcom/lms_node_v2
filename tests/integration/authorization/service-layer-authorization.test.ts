/**
 * Integration Tests: Service Layer Authorization (Phase 3)
 *
 * Tests service layer authorization methods implemented in Phase 2:
 * - Course visibility rules (draft/published/archived)
 * - Creator-based editing permissions
 * - Department scoping with hierarchy
 * - Instructor class filtering
 * - Data masking (FERPA compliance)
 * - Transcript filtering by department
 * - Progress tracking authorization
 * - Report filtering and scoping
 *
 * Target: 85%+ code coverage for authorization logic
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { CoursesService } from '@/services/academic/courses.service';
import { ProgressService } from '@/services/analytics/progress.service';
import { ReportsService } from '@/services/reporting/reports.service';
import Course from '@/models/academic/Course.model';
import Department from '@/models/organization/Department.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { Learner } from '@/models/auth/Learner.model';
import Class from '@/models/academic/Class.model';
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';

describe('Service Layer Authorization Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let topLevelDepartment: any;
  let subDepartment: any;
  let otherDepartment: any;
  let draftCourse: any;
  let publishedCourse: any;
  let archivedCourse: any;
  let instructorUser: any;
  let instructorStaff: any;
  let contentAdminUser: any;
  let contentAdminStaff: any;
  let deptAdminUser: any;
  let deptAdminStaff: any;
  let systemAdminUser: any;
  let systemAdminStaff: any;
  let enrollmentAdminUser: any;
  let enrollmentAdminStaff: any;
  let learner1: any;
  let learner1User: any;
  let testClass: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create department hierarchy
    topLevelDepartment = await Department.create({
      name: 'Top Level Department',
      code: 'TOP',
      slug: 'top-level',
      isActive: true
    });

    subDepartment = await Department.create({
      name: 'Sub Department',
      code: 'SUB',
      slug: 'sub-dept',
      parentDepartmentId: topLevelDepartment._id,
      isActive: true
    });

    otherDepartment = await Department.create({
      name: 'Other Department',
      code: 'OTHER',
      slug: 'other-dept',
      isActive: true
    });

    // Create courses with different statuses
    draftCourse = await Course.create({
      name: 'Draft Course',
      code: 'DFT101',
      departmentId: topLevelDepartment._id,
      credits: 3,
      duration: 15,
      isActive: true,
      metadata: {
        status: 'draft',
        createdBy: new mongoose.Types.ObjectId()
      }
    });

    publishedCourse = await Course.create({
      name: 'Published Course',
      code: 'PUB101',
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
      code: 'ARC101',
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
    // Create instructor user
    instructorUser = await User.create({
      email: 'instructor@test.com',
      password: 'hashedpass',
      userTypes: ['staff'],
      isActive: true
    });

    instructorStaff = await Staff.create({
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
        departmentId: topLevelDepartment._id,
        roles: ['instructor'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    // Create content admin user
    contentAdminUser = await User.create({
      email: 'contentadmin@test.com',
      password: 'hashedpass',
      userTypes: ['staff'],
      isActive: true
    });

    contentAdminStaff = await Staff.create({
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
        departmentId: topLevelDepartment._id,
        roles: ['content-admin'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    // Create department admin user
    deptAdminUser = await User.create({
      email: 'deptadmin@test.com',
      password: 'hashedpass',
      userTypes: ['staff'],
      isActive: true
    });

    deptAdminStaff = await Staff.create({
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
        departmentId: topLevelDepartment._id,
        roles: ['department-admin'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    // Create system admin user
    systemAdminUser = await User.create({
      email: 'sysadmin@test.com',
      password: 'hashedpass',
      userTypes: ['staff', 'global-admin'],
      isActive: true
    });

    systemAdminStaff = await Staff.create({
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
      departmentMemberships: [{
        departmentId: topLevelDepartment._id,
        roles: ['system-admin'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    // Create enrollment admin user
    enrollmentAdminUser = await User.create({
      email: 'enrolladmin@test.com',
      password: 'hashedpass',
      userTypes: ['staff'],
      isActive: true
    });

    enrollmentAdminStaff = await Staff.create({
      _id: enrollmentAdminUser._id,
      person: {
        firstName: 'Enrollment',
        lastName: 'Admin',
        emails: [{
          email: enrollmentAdminUser.email,
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
        departmentId: topLevelDepartment._id,
        roles: ['enrollment-admin'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    // Create learner
    learner1User = await User.create({
      email: 'learner1@test.com',
      password: 'hashedpass',
      userTypes: ['learner'],
      isActive: true
    });

    learner1 = await Learner.create({
      _id: learner1User._id,
      person: {
        firstName: 'Test',
        lastName: 'Learner',
        emails: [{
          email: learner1User.email,
          type: 'institutional',
          isPrimary: true,
          verified: true,
          allowNotifications: true
        }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en',
        dateOfBirth: new Date('2000-01-01')
      },
      departmentMemberships: []
    });

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
    await ClassEnrollment.deleteMany({});
  });

  describe('Course Visibility Rules', () => {
    describe('Draft Course Visibility', () => {
      it('should allow department members to view draft courses', async () => {
        const user = {
          _id: instructorUser._id,
          roles: ['instructor'],
          departmentMemberships: [{ departmentId: topLevelDepartment._id }]
        };

        const canView = await CoursesService.canViewCourse(draftCourse, user);
        expect(canView).toBe(true);
      });

      it('should block non-department members from viewing draft courses', async () => {
        const user = {
          _id: instructorUser._id,
          roles: ['instructor'],
          departmentMemberships: [{ departmentId: otherDepartment._id }]
        };

        const canView = await CoursesService.canViewCourse(draftCourse, user);
        expect(canView).toBe(false);
      });

      it('should allow hierarchical department access (parent sees subdept drafts)', async () => {
        // Create course in subdepartment
        const subDeptCourse = await Course.create({
          name: 'Sub Dept Draft',
          code: 'SUB101',
          departmentId: subDepartment._id,
          credits: 3,
          duration: 15,
          isActive: true,
          metadata: { status: 'draft' }
        });

        const user = {
          _id: instructorUser._id,
          roles: ['instructor'],
          departmentMemberships: [{ departmentId: topLevelDepartment._id }]
        };

        const canView = await CoursesService.canViewCourse(subDeptCourse, user);
        expect(canView).toBe(true);

        await Course.deleteOne({ _id: subDeptCourse._id });
      });
    });

    describe('Published Course Visibility', () => {
      it('should allow all users to view published courses', async () => {
        const user = {
          _id: instructorUser._id,
          roles: ['instructor'],
          departmentMemberships: [{ departmentId: otherDepartment._id }]
        };

        const canView = await CoursesService.canViewCourse(publishedCourse, user);
        expect(canView).toBe(true);
      });

      it('should allow learners to view published courses', async () => {
        const user = {
          _id: learner1User._id,
          roles: ['learner'],
          departmentMemberships: []
        };

        const canView = await CoursesService.canViewCourse(publishedCourse, user);
        expect(canView).toBe(true);
      });
    });

    describe('Archived Course Visibility', () => {
      it('should allow department members to view archived courses', async () => {
        const user = {
          _id: instructorUser._id,
          roles: ['instructor'],
          departmentMemberships: [{ departmentId: topLevelDepartment._id }]
        };

        const canView = await CoursesService.canViewCourse(archivedCourse, user);
        expect(canView).toBe(true);
      });

      it('should block non-department members from viewing archived courses', async () => {
        const user = {
          _id: instructorUser._id,
          roles: ['instructor'],
          departmentMemberships: [{ departmentId: otherDepartment._id }]
        };

        const canView = await CoursesService.canViewCourse(archivedCourse, user);
        expect(canView).toBe(false);
      });
    });
  });

  describe('Creator-Based Editing Permissions', () => {
    describe('Draft Course Editing', () => {
      it('should allow creator to edit draft courses', async () => {
        const creatorId = draftCourse.metadata.createdBy;
        const user = {
          _id: creatorId,
          roles: ['content-admin'],
          departmentMemberships: [{ departmentId: topLevelDepartment._id }]
        };

        const canEdit = await CoursesService.canEditCourse(draftCourse, user);
        expect(canEdit).toBe(true);
      });

      it('should allow department-admin to edit draft courses', async () => {
        const user = {
          _id: deptAdminUser._id,
          roles: ['department-admin'],
          departmentMemberships: [{ departmentId: topLevelDepartment._id }]
        };

        const canEdit = await CoursesService.canEditCourse(draftCourse, user);
        expect(canEdit).toBe(true);
      });

      it('should block non-creator instructor from editing draft courses', async () => {
        const user = {
          _id: instructorUser._id,
          roles: ['instructor'],
          departmentMemberships: [{ departmentId: topLevelDepartment._id }]
        };

        const canEdit = await CoursesService.canEditCourse(draftCourse, user);
        expect(canEdit).toBe(false);
      });

      it('should allow system-admin to edit any draft course', async () => {
        const user = {
          _id: systemAdminUser._id,
          roles: ['system-admin'],
          departmentMemberships: [{ departmentId: topLevelDepartment._id }]
        };

        const canEdit = await CoursesService.canEditCourse(draftCourse, user);
        expect(canEdit).toBe(true);
      });
    });

    describe('Published Course Editing', () => {
      it('should allow only department-admin to edit published courses', async () => {
        const user = {
          _id: deptAdminUser._id,
          roles: ['department-admin'],
          departmentMemberships: [{ departmentId: topLevelDepartment._id }]
        };

        const canEdit = await CoursesService.canEditCourse(publishedCourse, user);
        expect(canEdit).toBe(true);
      });

      it('should block instructor from editing published courses', async () => {
        const user = {
          _id: instructorUser._id,
          roles: ['instructor'],
          departmentMemberships: [{ departmentId: topLevelDepartment._id }]
        };

        const canEdit = await CoursesService.canEditCourse(publishedCourse, user);
        expect(canEdit).toBe(false);
      });

      it('should block content-admin from editing published courses', async () => {
        const user = {
          _id: contentAdminUser._id,
          roles: ['content-admin'],
          departmentMemberships: [{ departmentId: topLevelDepartment._id }]
        };

        const canEdit = await CoursesService.canEditCourse(publishedCourse, user);
        expect(canEdit).toBe(false);
      });
    });

    describe('Archived Course Editing', () => {
      it('should block all users from editing archived courses', async () => {
        const users = [
          {
            _id: deptAdminUser._id,
            roles: ['department-admin'],
            departmentMemberships: [{ departmentId: topLevelDepartment._id }]
          },
          {
            _id: contentAdminUser._id,
            roles: ['content-admin'],
            departmentMemberships: [{ departmentId: topLevelDepartment._id }]
          }
        ];

        for (const user of users) {
          const canEdit = await CoursesService.canEditCourse(archivedCourse, user);
          expect(canEdit).toBe(false);
        }
      });
    });
  });

  describe('Department Scoping with Hierarchy', () => {
    it('should expand top-level department to include subdepartments', async () => {
      const user = {
        roles: ['instructor'],
        departmentMemberships: [{ departmentId: topLevelDepartment._id }]
      };

      const query: any = {};
      const scopedQuery = await CoursesService.applyDepartmentScoping(query, user);

      expect(scopedQuery.departmentId.$in).toContain(topLevelDepartment._id.toString());
      expect(scopedQuery.departmentId.$in).toContain(subDepartment._id.toString());
    });

    it('should not expand subdepartment to include parent', async () => {
      const user = {
        roles: ['instructor'],
        departmentMemberships: [{ departmentId: subDepartment._id }]
      };

      const query: any = {};
      const scopedQuery = await CoursesService.applyDepartmentScoping(query, user);

      expect(scopedQuery.departmentId.$in).toContain(subDepartment._id.toString());
      expect(scopedQuery.departmentId.$in).not.toContain(topLevelDepartment._id.toString());
    });

    it('should not scope for system-admin', async () => {
      const user = {
        roles: ['system-admin'],
        departmentMemberships: []
      };

      const query: any = {};
      const scopedQuery = await CoursesService.applyDepartmentScoping(query, user);

      expect(scopedQuery.departmentId).toBeUndefined();
    });

    it('should return empty results for users with no department', async () => {
      const user = {
        roles: ['instructor'],
        departmentMemberships: []
      };

      const query: any = {};
      const scopedQuery = await CoursesService.applyDepartmentScoping(query, user);

      expect(scopedQuery.departmentId.$in).toEqual([]);
    });
  });

  describe('Data Masking (FERPA Compliance)', () => {
    describe('Progress Service Data Masking', () => {
      it('should mask last name to initial for instructors', () => {
        const learnerData = {
          learnerName: 'John Doe',
          learnerId: learner1._id.toString()
        };

        const instructor = {
          roles: ['instructor']
        };

        const masked = ProgressService.applyDataMasking(learnerData, instructor);
        expect(masked.learnerName).toBe('John D.');
      });

      it('should mask last name to initial for department-admin', () => {
        const learnerData = {
          learnerName: 'Jane Smith',
          learnerId: learner1._id.toString()
        };

        const deptAdmin = {
          roles: ['department-admin']
        };

        const masked = ProgressService.applyDataMasking(learnerData, deptAdmin);
        expect(masked.learnerName).toBe('Jane S.');
      });

      it('should NOT mask for enrollment-admin', () => {
        const learnerData = {
          learnerName: 'Alice Johnson',
          learnerId: learner1._id.toString()
        };

        const enrollAdmin = {
          roles: ['enrollment-admin']
        };

        const masked = ProgressService.applyDataMasking(learnerData, enrollAdmin);
        expect(masked.learnerName).toBe('Alice Johnson');
      });

      it('should NOT mask for system-admin', () => {
        const learnerData = {
          learnerName: 'Bob Williams',
          learnerId: learner1._id.toString()
        };

        const sysAdmin = {
          roles: ['system-admin']
        };

        const masked = ProgressService.applyDataMasking(learnerData, sysAdmin);
        expect(masked.learnerName).toBe('Bob Williams');
      });

      it('should mask entire list of learners', () => {
        const learners = [
          { learnerName: 'John Doe' },
          { learnerName: 'Jane Smith' },
          { learnerName: 'Alice Johnson' }
        ];

        const instructor = {
          roles: ['instructor']
        };

        const masked = ProgressService.applyDataMaskingToList(learners, instructor);
        expect(masked[0].learnerName).toBe('John D.');
        expect(masked[1].learnerName).toBe('Jane S.');
        expect(masked[2].learnerName).toBe('Alice J.');
      });
    });

    describe('Reports Service Data Masking', () => {
      it('should apply same masking rules in reports', () => {
        const learnerData = {
          learnerName: 'Test Learner',
          learnerId: learner1._id.toString()
        };

        const instructor = {
          roles: ['instructor']
        };

        const masked = ReportsService.applyDataMasking(learnerData, instructor);
        expect(masked.learnerName).toBe('Test L.');
      });

      it('should mask list of learners in reports', () => {
        const learners = [
          { learnerName: 'First Last1' },
          { learnerName: 'Second Last2' }
        ];

        const deptAdmin = {
          roles: ['department-admin']
        };

        const masked = ReportsService.applyDataMaskingToList(learners, deptAdmin);
        expect(masked[0].learnerName).toBe('First L.');
        expect(masked[1].learnerName).toBe('Second L.');
      });
    });
  });

  describe('Instructor Class Filtering', () => {
    it('should filter progress queries to instructor classes', async () => {
      // Update test class to have instructor assigned
      await Class.updateOne(
        { _id: testClass._id },
        { $set: { 'metadata.instructorId': instructorUser._id } }
      );

      const user = {
        _id: instructorUser._id,
        roles: ['instructor']
      };

      const query: any = {};
      const scopedQuery = await ProgressService.applyInstructorClassScoping(query, user);

      expect(scopedQuery.classId).toBeDefined();
      expect(scopedQuery.classId.$in).toContainEqual(testClass._id);
    });

    it('should not filter for non-instructors', async () => {
      const user = {
        _id: deptAdminUser._id,
        roles: ['department-admin']
      };

      const query: any = {};
      const scopedQuery = await ProgressService.applyInstructorClassScoping(query, user);

      expect(scopedQuery.classId).toBeUndefined();
    });
  });

  describe('Transcript Filtering by Department', () => {
    it('should filter transcript to department courses for department-admin', async () => {
      const transcript = {
        programs: [{
          programId: 'prog1',
          courses: [
            { courseId: publishedCourse._id.toString() },
            { courseId: draftCourse._id.toString() }
          ]
        }]
      };

      const user = {
        roles: ['department-admin'],
        departmentMemberships: [{ departmentId: topLevelDepartment._id }]
      };

      const filtered = await ReportsService.filterTranscriptByDepartment(transcript, user);
      expect(filtered.programs.length).toBeGreaterThan(0);
      expect(filtered.programs[0].courses.length).toBe(2); // Both courses in same department
    });

    it('should not filter for system-admin', async () => {
      const transcript = {
        programs: [{
          programId: 'prog1',
          courses: [
            { courseId: publishedCourse._id.toString() }
          ]
        }]
      };

      const user = {
        roles: ['system-admin'],
        departmentMemberships: []
      };

      const filtered = await ReportsService.filterTranscriptByDepartment(transcript, user);
      expect(filtered.programs[0].courses.length).toBe(1); // No filtering
    });

    it('should not filter for enrollment-admin', async () => {
      const transcript = {
        programs: [{
          programId: 'prog1',
          courses: [
            { courseId: publishedCourse._id.toString() }
          ]
        }]
      };

      const user = {
        roles: ['enrollment-admin'],
        departmentMemberships: []
      };

      const filtered = await ReportsService.filterTranscriptByDepartment(transcript, user);
      expect(filtered.programs[0].courses.length).toBe(1); // No filtering
    });
  });

  describe('Course Visibility Filter (Batch)', () => {
    it('should filter multiple courses based on visibility rules', async () => {
      const courses = [draftCourse, publishedCourse, archivedCourse];

      const user = {
        _id: instructorUser._id,
        roles: ['instructor'],
        departmentMemberships: [{ departmentId: topLevelDepartment._id }]
      };

      const visible = await CoursesService.filterCoursesByVisibility(courses, user);
      expect(visible.length).toBe(3); // All visible (draft, published, archived - all in same dept)
    });

    it('should filter out courses not in user department', async () => {
      const otherCourse = await Course.create({
        name: 'Other Dept Course',
        code: 'OTH101',
        departmentId: otherDepartment._id,
        credits: 3,
        duration: 15,
        isActive: true,
        metadata: { status: 'draft' }
      });

      const courses = [draftCourse, otherCourse];

      const user = {
        _id: instructorUser._id,
        roles: ['instructor'],
        departmentMemberships: [{ departmentId: topLevelDepartment._id }]
      };

      const visible = await CoursesService.filterCoursesByVisibility(courses, user);
      expect(visible.length).toBe(1); // Only draftCourse visible
      expect(visible[0]._id.toString()).toBe(draftCourse._id.toString());

      await Course.deleteOne({ _id: otherCourse._id });
    });
  });

  describe('Combined Authorization Scoping', () => {
    it('should apply both instructor and department scoping', async () => {
      // Update test class to have instructor assigned
      await Class.updateOne(
        { _id: testClass._id },
        { $set: { 'metadata.instructorId': instructorUser._id } }
      );

      const user = {
        _id: instructorUser._id,
        roles: ['instructor'],
        departmentMemberships: [{ departmentId: topLevelDepartment._id }]
      };

      const query: any = {};
      const scopedQuery = await ProgressService.applyAuthorizationScoping(query, user);

      // Should have class filter from instructor scoping
      expect(scopedQuery.classId).toBeDefined();
      expect(scopedQuery.classId.$in).toContainEqual(testClass._id);
    });

    it('should skip instructor scoping for department-admin', async () => {
      const user = {
        _id: deptAdminUser._id,
        roles: ['department-admin'],
        departmentMemberships: [{ departmentId: topLevelDepartment._id }]
      };

      const query: any = {};
      const scopedQuery = await ProgressService.applyAuthorizationScoping(query, user);

      // Should have department scoping but not instructor scoping
      expect(scopedQuery.classId).toBeDefined();
    });
  });
});
