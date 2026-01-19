import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '@/app';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { Learner } from '@/models/auth/Learner.model';
import Department from '@/models/organization/Department.model';
import Course from '@/models/academic/Course.model';
import Class from '@/models/academic/Class.model';
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import GradeChangeLog from '@/models/audit/GradeChangeLog.model';
import { hashPassword } from '@/utils/password';
import AccessRight from '@/models/AccessRight.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

/**
 * ISS-021 Integration Tests: Grade Override API
 *
 * Endpoints:
 * - PUT /api/v2/enrollments/:enrollmentId/grades/override
 * - GET /api/v2/enrollments/:enrollmentId/grades/history
 *
 * Requirements:
 * - User must be authenticated
 * - User must have academic:grades:override access right
 * - User must be dept-admin in the course's department
 * - Reason must be 10-1000 characters
 * - At least one grade field must be provided
 * - Grade values must be within valid ranges
 * - Audit trail is immutable
 */

describeIfMongo('Grade Override API - Integration Tests (ISS-021)', () => {
  let mongoServer: MongoMemoryServer;
  let department: any;
  let course: any;
  let classRecord: any;
  let adminUser: any;
  let adminStaff: any;
  let adminToken: string;
  let learnerUser: any;
  let learner: any;
  let enrollment: any;
  let gradeOverrideAccessRight: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Create grade override access right
    gradeOverrideAccessRight = await AccessRight.create({
      name: 'academic:grades:override',
      domain: 'academic',
      resource: 'grades',
      action: 'override',
      description: 'Override student grades with audit trail',
      isSensitive: true,
      sensitiveCategory: 'ferpa',
      isActive: true
    });

    // Create department
    department = await Department.create({
      name: 'Computer Science',
      code: 'CS',
      isVisible: true
    });

    // Create course
    course = await Course.create({
      name: 'Introduction to Programming',
      code: 'CS101',
      departmentId: department._id,
      credits: 3,
      isActive: true
    });

    // Create class
    classRecord = await Class.create({
      name: 'CS101-Fall2026',
      courseId: course._id,
      academicYearId: new mongoose.Types.ObjectId(),
      termCode: 'FALL2026',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-12-15'),
      maxEnrollment: 30,
      currentEnrollment: 1,
      isActive: true
    });

    // Create admin user (dept-admin)
    const hashedPassword = await hashPassword('AdminPassword123!');
    adminUser = await User.create({
      _id: new mongoose.Types.ObjectId(),
      email: 'admin@test.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true,
      accessRights: [gradeOverrideAccessRight._id]
    });

    adminStaff = await Staff.create({
      _id: adminUser._id,
      person: {
        firstName: 'Admin',
        lastName: 'User',
        emails: [{
          email: 'admin@test.com',
          type: 'institutional',
          isPrimary: true,
          verified: true
        }],
        phones: [],
        addresses: []
      },
      departmentMemberships: [{
        departmentId: department._id,
        roles: ['dept-admin']
      }],
      isActive: true
    });

    // Create learner
    learnerUser = await User.create({
      _id: new mongoose.Types.ObjectId(),
      email: 'learner@test.com',
      password: hashedPassword,
      userTypes: ['learner'],
      defaultDashboard: 'learner',
      isActive: true
    });

    learner = await Learner.create({
      _id: learnerUser._id,
      person: {
        firstName: 'Test',
        lastName: 'Learner',
        emails: [{
          email: 'learner@test.com',
          type: 'institutional',
          isPrimary: true,
          verified: true
        }],
        phones: [],
        addresses: []
      },
      cohorts: [],
      isActive: true
    });

    // Create enrollment
    enrollment = await ClassEnrollment.create({
      learnerId: learner._id,
      classId: classRecord._id,
      status: 'active',
      enrollmentDate: new Date(),
      gradePercentage: 75,
      gradePoints: 2.5,
      gradeLetter: 'C+'
    });

    // Generate admin JWT token
    adminToken = jwt.sign(
      {
        userId: adminUser._id.toString(),
        email: adminUser.email,
        roles: ['dept-admin'],
        allAccessRights: ['academic:grades:override'], // Use allAccessRights for middleware
        type: 'access'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('PUT /api/v2/enrollments/:enrollmentId/grades/override', () => {
    describe('Success Cases', () => {
      it('should override grade percentage and create audit log', async () => {
        const response = await request(app)
          .put(`/api/v2/enrollments/${enrollment._id}/grades/override`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            gradePercentage: 85,
            reason: 'Grade appeal approved by academic committee after review'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.enrollmentId).toBe(enrollment._id.toString());
        expect(response.body.data.gradeChanges.gradePercentage).toBeDefined();
        expect(response.body.data.gradeChanges.gradePercentage.previous).toBe(75);
        expect(response.body.data.gradeChanges.gradePercentage.new).toBe(85);
        expect(response.body.data.overrideBy).toBe(adminUser._id.toString());
        expect(response.body.data.reason).toBe('Grade appeal approved by academic committee after review');
        expect(response.body.data.changeLogId).toBeDefined();

        // Verify audit log created
        const logs = await GradeChangeLog.find({ enrollmentId: enrollment._id });
        expect(logs).toHaveLength(1);
        expect(logs[0].previousGradePercentage).toBe(75);
        expect(logs[0].newGradePercentage).toBe(85);

        // Verify enrollment updated
        const updatedEnrollment = await ClassEnrollment.findById(enrollment._id);
        expect(updatedEnrollment!.gradePercentage).toBe(85);
      });

      it('should override grade letter', async () => {
        const response = await request(app)
          .put(`/api/v2/enrollments/${enrollment._id}/grades/override`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            gradeLetter: 'B+',
            reason: 'Grade correction after exam review'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.gradeChanges.gradeLetter).toBeDefined();
        expect(response.body.data.gradeChanges.gradeLetter.previous).toBe('C+');
        expect(response.body.data.gradeChanges.gradeLetter.new).toBe('B+');
      });

      it('should override grade points', async () => {
        const response = await request(app)
          .put(`/api/v2/enrollments/${enrollment._id}/grades/override`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            gradePoints: 3.5,
            reason: 'Grade points correction'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.gradeChanges.gradePoints).toBeDefined();
        expect(response.body.data.gradeChanges.gradePoints.previous).toBe(2.5);
        expect(response.body.data.gradeChanges.gradePoints.new).toBe(3.5);
      });

      it('should override multiple grade fields at once', async () => {
        const response = await request(app)
          .put(`/api/v2/enrollments/${enrollment._id}/grades/override`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            gradeLetter: 'A',
            gradePercentage: 95,
            gradePoints: 4.0,
            reason: 'Complete grade correction after appeal'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.gradeChanges.gradeLetter).toBeDefined();
        expect(response.body.data.gradeChanges.gradePercentage).toBeDefined();
        expect(response.body.data.gradeChanges.gradePoints).toBeDefined();
      });

      it('should trim whitespace from reason', async () => {
        const response = await request(app)
          .put(`/api/v2/enrollments/${enrollment._id}/grades/override`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            gradePercentage: 85,
            reason: '   Grade appeal approved   '
          });

        expect(response.status).toBe(200);
        expect(response.body.data.reason).toBe('Grade appeal approved');
      });
    });

    describe('Validation Errors', () => {
      it('should return 422 if reason is too short', async () => {
        const response = await request(app)
          .put(`/api/v2/enrollments/${enrollment._id}/grades/override`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            gradePercentage: 85,
            reason: 'Short'
          });

        expect(response.status).toBe(422);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('reason');
      });

      it('should return 422 if reason is missing', async () => {
        const response = await request(app)
          .put(`/api/v2/enrollments/${enrollment._id}/grades/override`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            gradePercentage: 85
          });

        expect(response.status).toBe(422);
        expect(response.body.success).toBe(false);
      });

      it('should return 422 if no grade fields provided', async () => {
        const response = await request(app)
          .put(`/api/v2/enrollments/${enrollment._id}/grades/override`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            reason: 'Valid reason but no grade fields'
          });

        expect(response.status).toBe(422);
        expect(response.body.success).toBe(false);
      });

      it('should return 422 if grade percentage is out of range', async () => {
        const response = await request(app)
          .put(`/api/v2/enrollments/${enrollment._id}/grades/override`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            gradePercentage: 150,
            reason: 'Valid reason for override'
          });

        expect(response.status).toBe(422);
        expect(response.body.success).toBe(false);
      });

      it('should return 422 if grade points is out of range', async () => {
        const response = await request(app)
          .put(`/api/v2/enrollments/${enrollment._id}/grades/override`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            gradePoints: 5.0,
            reason: 'Valid reason for override'
          });

        expect(response.status).toBe(422);
        expect(response.body.success).toBe(false);
      });

      it('should return 422 if grade letter is invalid', async () => {
        const response = await request(app)
          .put(`/api/v2/enrollments/${enrollment._id}/grades/override`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            gradeLetter: 'Z',
            reason: 'Valid reason for override'
          });

        expect(response.status).toBe(422);
        expect(response.body.success).toBe(false);
      });
    });

    describe('Authentication & Authorization Errors', () => {
      it('should return 401 if not authenticated', async () => {
        const response = await request(app)
          .put(`/api/v2/enrollments/${enrollment._id}/grades/override`)
          .send({
            gradePercentage: 85,
            reason: 'Valid reason for override'
          });

        expect(response.status).toBe(401);
      });

      it('should return 403 if user does not have grades:override access right', async () => {
        // Create user without access right
        const hashedPassword = await hashPassword('Password123!');
        const regularUser = await User.create({
          email: 'regular@test.com',
          password: hashedPassword,
          userTypes: ['staff'],
          defaultDashboard: 'staff',
          isActive: true,
          accessRights: [] // No access rights
        });

        const regularToken = jwt.sign(
          {
            userId: regularUser._id.toString(),
            email: regularUser.email,
            roles: ['instructor'],
            allAccessRights: [],
            type: 'access'
          },
          process.env.JWT_ACCESS_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        const response = await request(app)
          .put(`/api/v2/enrollments/${enrollment._id}/grades/override`)
          .set('Authorization', `Bearer ${regularToken}`)
          .send({
            gradePercentage: 85,
            reason: 'Valid reason for override'
          });

        expect(response.status).toBe(403);
      });

      it('should return 403 if user is not dept-admin in course department', async () => {
        // Create another department
        const otherDepartment = await Department.create({
          name: 'Mathematics',
          code: 'MATH',
          isVisible: true
        });

        // Create admin in different department
        const hashedPassword = await hashPassword('Password123!');
        const otherAdmin = await User.create({
          email: 'otheradmin@test.com',
          password: hashedPassword,
          userTypes: ['staff'],
          defaultDashboard: 'staff',
          isActive: true,
          accessRights: [gradeOverrideAccessRight._id]
        });

        await Staff.create({
          _id: otherAdmin._id,
          person: {
            firstName: 'Other',
            lastName: 'Admin',
            emails: [{
              email: 'otheradmin@test.com',
              type: 'institutional',
              isPrimary: true,
              verified: true
            }],
            phones: [],
            addresses: []
          },
          departmentMemberships: [{
            departmentId: otherDepartment._id, // Different department!
            roles: ['dept-admin']
          }],
          isActive: true
        });

        const otherToken = jwt.sign(
          {
            userId: otherAdmin._id.toString(),
            email: otherAdmin.email,
            roles: ['dept-admin'],
            allAccessRights: ['academic:grades:override'],
            type: 'access'
          },
          process.env.JWT_ACCESS_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        const response = await request(app)
          .put(`/api/v2/enrollments/${enrollment._id}/grades/override`)
          .set('Authorization', `Bearer ${otherToken}`)
          .send({
            gradePercentage: 85,
            reason: 'Valid reason for override'
          });

        expect(response.status).toBe(403);
        expect(response.body.message).toContain('department');
      });
    });

    describe('Not Found Errors', () => {
      it('should return 404 if enrollment not found', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .put(`/api/v2/enrollments/${nonExistentId}/grades/override`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            gradePercentage: 85,
            reason: 'Valid reason for override'
          });

        expect(response.status).toBe(404);
      });
    });
  });

  describe('GET /api/v2/enrollments/:enrollmentId/grades/history', () => {
    beforeEach(async () => {
      // Create some grade change history
      await GradeChangeLog.create({
        enrollmentId: enrollment._id,
        classId: classRecord._id,
        courseId: course._id,
        learnerId: learner._id,
        fieldChanged: 'gradePercentage',
        previousGradePercentage: 70,
        newGradePercentage: 75,
        changedBy: adminUser._id,
        changedByRole: 'dept-admin',
        changedAt: new Date('2026-01-01'),
        reason: 'First grade correction',
        changeType: 'override',
        departmentId: department._id
      });

      await GradeChangeLog.create({
        enrollmentId: enrollment._id,
        classId: classRecord._id,
        courseId: course._id,
        learnerId: learner._id,
        fieldChanged: 'gradePercentage',
        previousGradePercentage: 75,
        newGradePercentage: 85,
        changedBy: adminUser._id,
        changedByRole: 'dept-admin',
        changedAt: new Date('2026-01-15'),
        reason: 'Second grade correction',
        changeType: 'override',
        departmentId: department._id
      });
    });

    describe('Success Cases', () => {
      it('should return grade change history for enrollment', async () => {
        const response = await request(app)
          .get(`/api/v2/enrollments/${enrollment._id}/grades/history`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data[0].reason).toBe('Second grade correction'); // Most recent first
        expect(response.body.data[1].reason).toBe('First grade correction');
      });

      it('should filter history by date range', async () => {
        const response = await request(app)
          .get(`/api/v2/enrollments/${enrollment._id}/grades/history`)
          .set('Authorization', `Bearer ${adminToken}`)
          .query({
            startDate: '2026-01-10',
            endDate: '2026-01-20'
          });

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].reason).toBe('Second grade correction');
      });

      it('should return empty array if no history exists', async () => {
        // Create new class for a different enrollment
        const newClass = await Class.create({
          name: 'CS102-Fall2026',
          courseId: course._id,
          academicYearId: new mongoose.Types.ObjectId(),
          termCode: 'FALL2026',
          startDate: new Date('2026-09-01'),
          endDate: new Date('2026-12-15'),
          maxEnrollment: 30,
          currentEnrollment: 1,
          isActive: true
        });

        // Create new enrollment with no history (different class)
        const newEnrollment = await ClassEnrollment.create({
          learnerId: learner._id,
          classId: newClass._id,
          status: 'active',
          enrollmentDate: new Date(),
          gradePercentage: 80
        });

        const response = await request(app)
          .get(`/api/v2/enrollments/${newEnrollment._id}/grades/history`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(0);
      });
    });

    describe('Authentication & Authorization Errors', () => {
      it('should return 401 if not authenticated', async () => {
        const response = await request(app)
          .get(`/api/v2/enrollments/${enrollment._id}/grades/history`);

        expect(response.status).toBe(401);
      });

      it('should return 403 if user does not have grades:override access right', async () => {
        const hashedPassword = await hashPassword('Password123!');
        const regularUser = await User.create({
          email: 'regular2@test.com',
          password: hashedPassword,
          userTypes: ['staff'],
          defaultDashboard: 'staff',
          isActive: true,
          accessRights: []
        });

        const regularToken = jwt.sign(
          {
            userId: regularUser._id.toString(),
            email: regularUser.email,
            roles: ['instructor'],
            allAccessRights: [],
            type: 'access'
          },
          process.env.JWT_ACCESS_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        const response = await request(app)
          .get(`/api/v2/enrollments/${enrollment._id}/grades/history`)
          .set('Authorization', `Bearer ${regularToken}`);

        expect(response.status).toBe(403);
      });
    });

    describe('Not Found Errors', () => {
      it('should return 404 if enrollment not found', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .get(`/api/v2/enrollments/${nonExistentId}/grades/history`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(404);
      });
    });
  });

  describe('Audit Trail Immutability', () => {
    it('should create immutable audit log entries', async () => {
      // Create grade override
      await request(app)
        .put(`/api/v2/enrollments/${enrollment._id}/grades/override`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          gradePercentage: 85,
          reason: 'Grade appeal approved by academic committee'
        });

      // Try to modify audit log (should fail)
      const log = await GradeChangeLog.findOne({ enrollmentId: enrollment._id });
      expect(log).toBeDefined();

      // Attempt to update should throw error
      await expect(
        GradeChangeLog.findByIdAndUpdate(log!._id, { reason: 'Modified reason' })
      ).rejects.toThrow('immutable');
    });
  });
});
