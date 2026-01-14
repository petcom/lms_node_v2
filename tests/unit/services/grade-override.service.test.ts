import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { GradeOverrideService } from '@/services/grades/grade-override.service';
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import GradeChangeLog from '@/models/audit/GradeChangeLog.model';
import { Staff } from '@/models/auth/Staff.model';
import { User } from '@/models/auth/User.model';
import Department from '@/models/organization/Department.model';
import Course from '@/models/academic/Course.model';
import Class from '@/models/academic/Class.model';
import { hashPassword } from '@/utils/password';

describe('GradeOverrideService - Unit Tests', () => {
  let mongoServer: MongoMemoryServer;
  let gradeOverrideService: GradeOverrideService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    gradeOverrideService = new GradeOverrideService();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('overrideGrade()', () => {
    it('should create audit log entry when overriding grade', async () => {
      // Setup
      const department = await Department.create({
        name: 'Computer Science',
        code: 'CS',
        isVisible: true
      });

      const course = await Course.create({
        name: 'Introduction to Programming',
        code: 'CS101',
        departmentId: department._id,
        credits: 3,
        isActive: true
      });

      const classRecord = await Class.create({
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

      const hashedPassword = await hashPassword('Password123!');
      const adminUser = await User.create({
        email: 'admin@test.com',
        password: hashedPassword,
        userTypes: ['staff'],
        defaultDashboard: 'staff',
        isActive: true
      });

      const staff = await Staff.create({
        _id: adminUser._id,
        person: {
          firstName: 'Admin',
          lastName: 'User',
          emails: [{
            email: 'admin@test.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        departmentMemberships: [{
          departmentId: department._id,
          roles: ['dept-admin']
        }],
        isActive: true
      });

      const learnerUser = await User.create({
        email: 'learner@test.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      const enrollment = await ClassEnrollment.create({
        learnerId: learnerUser._id,
        classId: classRecord._id,
        status: 'active',
        enrollmentDate: new Date(),
        gradePercentage: 75
      });

      // Execute
      const result = await gradeOverrideService.overrideGrade(
        enrollment._id.toString(),
        {
          gradePercentage: 85,
          reason: 'Grade appeal approved by academic committee'
        },
        adminUser._id.toString()
      );

      // Verify audit log created
      const logs = await GradeChangeLog.find({ enrollmentId: enrollment._id });
      expect(logs).toHaveLength(1);
      expect(logs[0].previousGradePercentage).toBe(75);
      expect(logs[0].newGradePercentage).toBe(85);
      expect(logs[0].reason).toBe('Grade appeal approved by academic committee');
      expect(logs[0].changedBy.toString()).toBe(adminUser._id.toString());
    });

    it('should update enrollment with new grade values', async () => {
      // Setup
      const department = await Department.create({
        name: 'Math',
        code: 'MATH',
        isVisible: true
      });

      const course = await Course.create({
        name: 'Calculus I',
        code: 'MATH101',
        departmentId: department._id,
        credits: 4,
        isActive: true
      });

      const classRecord = await Class.create({
        name: 'MATH101-Spring2026',
        courseId: course._id,
        academicYearId: new mongoose.Types.ObjectId(),
        termCode: 'SPRING2026',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-05-15'),
        maxEnrollment: 25,
        currentEnrollment: 1,
        isActive: true
      });

      const hashedPassword = await hashPassword('Password123!');
      const adminUser = await User.create({
        email: 'admin2@test.com',
        password: hashedPassword,
        userTypes: ['staff'],
        defaultDashboard: 'staff',
        isActive: true
      });

      await Staff.create({
        _id: adminUser._id,
        person: {
          firstName: 'Admin',
          lastName: 'Two',
          emails: [{
            email: 'admin2@test.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        departmentMemberships: [{
          departmentId: department._id,
          roles: ['dept-admin']
        }],
        isActive: true
      });

      const learnerUser = await User.create({
        email: 'learner2@test.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      const enrollment = await ClassEnrollment.create({
        learnerId: learnerUser._id,
        classId: classRecord._id,
        status: 'active',
        enrollmentDate: new Date(),
        gradePercentage: 70,
        gradePoints: 2.0
      });

      // Execute
      await gradeOverrideService.overrideGrade(
        enrollment._id.toString(),
        {
          gradePercentage: 90,
          gradePoints: 4.0,
          reason: 'Correction after exam review'
        },
        adminUser._id.toString()
      );

      // Verify enrollment was updated
      const updatedEnrollment = await ClassEnrollment.findById(enrollment._id);
      expect(updatedEnrollment!.gradePercentage).toBe(90);
      expect(updatedEnrollment!.gradePoints).toBe(4.0);
    });

    it('should validate reason is at least 10 characters', async () => {
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const adminUserId = new mongoose.Types.ObjectId().toString();

      await expect(
        gradeOverrideService.overrideGrade(
          enrollmentId,
          {
            gradePercentage: 85,
            reason: 'Short'  // Too short
          },
          adminUserId
        )
      ).rejects.toThrow('Reason is required and must be at least 10 characters');
    });

    it('should validate reason is not empty', async () => {
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const adminUserId = new mongoose.Types.ObjectId().toString();

      await expect(
        gradeOverrideService.overrideGrade(
          enrollmentId,
          {
            gradePercentage: 85,
            reason: ''
          },
          adminUserId
        )
      ).rejects.toThrow('Reason is required and must be at least 10 characters');
    });

    it('should validate grade percentage is 0-100', async () => {
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const adminUserId = new mongoose.Types.ObjectId().toString();

      await expect(
        gradeOverrideService.overrideGrade(
          enrollmentId,
          {
            gradePercentage: 150,  // Out of range
            reason: 'Valid reason for override'
          },
          adminUserId
        )
      ).rejects.toThrow('Grade percentage must be between 0 and 100');
    });

    it('should validate grade points is 0-4.0', async () => {
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const adminUserId = new mongoose.Types.ObjectId().toString();

      await expect(
        gradeOverrideService.overrideGrade(
          enrollmentId,
          {
            gradePoints: 5.0,  // Out of range
            reason: 'Valid reason for override'
          },
          adminUserId
        )
      ).rejects.toThrow('Grade points must be between 0 and 4.0');
    });

    it('should require at least one grade field', async () => {
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const adminUserId = new mongoose.Types.ObjectId().toString();

      await expect(
        gradeOverrideService.overrideGrade(
          enrollmentId,
          {
            reason: 'Valid reason but no grade fields'
          },
          adminUserId
        )
      ).rejects.toThrow('At least one grade field must be provided');
    });

    it('should throw 404 if enrollment not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const adminUserId = new mongoose.Types.ObjectId().toString();

      await expect(
        gradeOverrideService.overrideGrade(
          nonExistentId,
          {
            gradePercentage: 85,
            reason: 'Valid reason for override'
          },
          adminUserId
        )
      ).rejects.toThrow('Enrollment not found');
    });

    it('should validate grade letter is valid', async () => {
      const enrollmentId = new mongoose.Types.ObjectId().toString();
      const adminUserId = new mongoose.Types.ObjectId().toString();

      await expect(
        gradeOverrideService.overrideGrade(
          enrollmentId,
          {
            gradeLetter: 'Z',  // Invalid letter grade
            reason: 'Valid reason for override'
          },
          adminUserId
        )
      ).rejects.toThrow('Grade letter must be one of');
    });

    it('should handle multiple grade fields being updated', async () => {
      const department = await Department.create({
        name: 'Biology',
        code: 'BIO',
        isVisible: true
      });

      const course = await Course.create({
        name: 'General Biology',
        code: 'BIO101',
        departmentId: department._id,
        credits: 4,
        isActive: true
      });

      const classRecord = await Class.create({
        name: 'BIO101-Fall2026',
        courseId: course._id,
        academicYearId: new mongoose.Types.ObjectId(),
        termCode: 'FALL2026',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-15'),
        maxEnrollment: 30,
        currentEnrollment: 1,
        isActive: true
      });

      const hashedPassword = await hashPassword('Password123!');
      const adminUser = await User.create({
        email: 'admin3@test.com',
        password: hashedPassword,
        userTypes: ['staff'],
        defaultDashboard: 'staff',
        isActive: true
      });

      await Staff.create({
        _id: adminUser._id,
        person: {
          firstName: 'Admin',
          lastName: 'Three',
          emails: [{
            email: 'admin3@test.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        departmentMemberships: [{
          departmentId: department._id,
          roles: ['dept-admin']
        }],
        isActive: true
      });

      const learnerUser = await User.create({
        email: 'learner3@test.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      const enrollment = await ClassEnrollment.create({
        learnerId: learnerUser._id,
        classId: classRecord._id,
        status: 'active',
        enrollmentDate: new Date(),
        gradeLetter: 'C',
        gradePercentage: 75,
        gradePoints: 2.0
      });

      // Execute - update all three fields
      const result = await gradeOverrideService.overrideGrade(
        enrollment._id.toString(),
        {
          gradeLetter: 'A',
          gradePercentage: 95,
          gradePoints: 4.0,
          reason: 'Complete grade correction after review'
        },
        adminUser._id.toString()
      );

      // Verify all changes tracked
      expect(result.gradeChanges.gradeLetter).toBeDefined();
      expect(result.gradeChanges.gradePercentage).toBeDefined();
      expect(result.gradeChanges.gradePoints).toBeDefined();
    });

    it('should trim reason string before saving', async () => {
      const department = await Department.create({
        name: 'Chemistry',
        code: 'CHEM',
        isVisible: true
      });

      const course = await Course.create({
        name: 'General Chemistry',
        code: 'CHEM101',
        departmentId: department._id,
        credits: 4,
        isActive: true
      });

      const classRecord = await Class.create({
        name: 'CHEM101-Spring2026',
        courseId: course._id,
        academicYearId: new mongoose.Types.ObjectId(),
        termCode: 'SPRING2026',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-05-15'),
        maxEnrollment: 25,
        currentEnrollment: 1,
        isActive: true
      });

      const hashedPassword = await hashPassword('Password123!');
      const adminUser = await User.create({
        email: 'admin4@test.com',
        password: hashedPassword,
        userTypes: ['staff'],
        defaultDashboard: 'staff',
        isActive: true
      });

      await Staff.create({
        _id: adminUser._id,
        person: {
          firstName: 'Admin',
          lastName: 'Four',
          emails: [{
            email: 'admin4@test.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        departmentMemberships: [{
          departmentId: department._id,
          roles: ['dept-admin']
        }],
        isActive: true
      });

      const learnerUser = await User.create({
        email: 'learner4@test.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      const enrollment = await ClassEnrollment.create({
        learnerId: learnerUser._id,
        classId: classRecord._id,
        status: 'active',
        enrollmentDate: new Date(),
        gradePercentage: 75
      });

      // Execute with whitespace in reason
      await gradeOverrideService.overrideGrade(
        enrollment._id.toString(),
        {
          gradePercentage: 85,
          reason: '   Grade appeal approved   '  // Has leading/trailing whitespace
        },
        adminUser._id.toString()
      );

      // Verify reason was trimmed
      const logs = await GradeChangeLog.find({ enrollmentId: enrollment._id });
      expect(logs[0].reason).toBe('Grade appeal approved');
      expect(logs[0].reason).not.toContain('   ');
    });
  });

  describe('verifyOverridePermission()', () => {
    it('should return allowed=true for dept-admin with permission in correct department', async () => {
      const department = await Department.create({
        name: 'Engineering',
        code: 'ENG',
        isVisible: true
      });

      const course = await Course.create({
        name: 'Engineering Fundamentals',
        code: 'ENG101',
        departmentId: department._id,
        credits: 3,
        isActive: true
      });

      const classRecord = await Class.create({
        name: 'ENG101-Fall2026',
        courseId: course._id,
        academicYearId: new mongoose.Types.ObjectId(),
        termCode: 'FALL2026',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-15'),
        maxEnrollment: 30,
        currentEnrollment: 1,
        isActive: true
      });

      const hashedPassword = await hashPassword('Password123!');
      const adminUser = await User.create({
        email: 'admin5@test.com',
        password: hashedPassword,
        userTypes: ['staff'],
        defaultDashboard: 'staff',
        isActive: true
      });

      await Staff.create({
        _id: adminUser._id,
        person: {
          firstName: 'Admin',
          lastName: 'Five',
          emails: [{
            email: 'admin5@test.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        departmentMemberships: [{
          departmentId: department._id,
          roles: ['dept-admin']
        }],
        isActive: true
      });

      const learnerUser = await User.create({
        email: 'learner5@test.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      const enrollment = await ClassEnrollment.create({
        learnerId: learnerUser._id,
        classId: classRecord._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      const result = await gradeOverrideService.verifyOverridePermission(
        adminUser._id.toString(),
        enrollment._id.toString()
      );

      expect(result.allowed).toBe(true);
    });

    it('should return allowed=false if user not staff member', async () => {
      const department = await Department.create({
        name: 'Physics',
        code: 'PHYS',
        isVisible: true
      });

      const course = await Course.create({
        name: 'Physics I',
        code: 'PHYS101',
        departmentId: department._id,
        credits: 4,
        isActive: true
      });

      const classRecord = await Class.create({
        name: 'PHYS101-Spring2026',
        courseId: course._id,
        academicYearId: new mongoose.Types.ObjectId(),
        termCode: 'SPRING2026',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-05-15'),
        maxEnrollment: 25,
        currentEnrollment: 1,
        isActive: true
      });

      const hashedPassword = await hashPassword('Password123!');
      const learnerUser = await User.create({
        email: 'learner6@test.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      const enrollment = await ClassEnrollment.create({
        learnerId: new mongoose.Types.ObjectId(),
        classId: classRecord._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      const result = await gradeOverrideService.verifyOverridePermission(
        learnerUser._id.toString(),
        enrollment._id.toString()
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not a staff member');
    });

    it('should return allowed=false if user not dept-admin in course department', async () => {
      const department1 = await Department.create({
        name: 'Math Dept',
        code: 'MATH',
        isVisible: true
      });

      const department2 = await Department.create({
        name: 'Science Dept',
        code: 'SCI',
        isVisible: true
      });

      // Course in department2 (Science)
      const course = await Course.create({
        name: 'Physics',
        code: 'SCI201',
        departmentId: department2._id,
        credits: 4,
        isActive: true
      });

      const classRecord = await Class.create({
        name: 'SCI201-Fall2026',
        courseId: course._id,
        academicYearId: new mongoose.Types.ObjectId(),
        termCode: 'FALL2026',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-15'),
        maxEnrollment: 30,
        currentEnrollment: 1,
        isActive: true
      });

      const hashedPassword = await hashPassword('Password123!');
      const adminUser = await User.create({
        email: 'admin7@test.com',
        password: hashedPassword,
        userTypes: ['staff'],
        defaultDashboard: 'staff',
        isActive: true
      });

      // Admin is dept-admin in department1 (Math), but enrollment is in department2 (Science)
      await Staff.create({
        _id: adminUser._id,
        person: {
          firstName: 'Admin',
          lastName: 'Seven',
          emails: [{
            email: 'admin7@test.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        departmentMemberships: [{
          departmentId: department1._id,
          roles: ['dept-admin']
        }],
        isActive: true
      });

      const enrollment = await ClassEnrollment.create({
        learnerId: new mongoose.Types.ObjectId(),
        classId: classRecord._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      const result = await gradeOverrideService.verifyOverridePermission(
        adminUser._id.toString(),
        enrollment._id.toString()
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('department admin for this course');
    });
  });

  describe('getGradeChangeHistory()', () => {
    it('should return all changes for an enrollment', async () => {
      // Create enrollment first
      const enrollment = await ClassEnrollment.create({
        learnerId: new mongoose.Types.ObjectId(),
        classId: new mongoose.Types.ObjectId(),
        status: 'active',
        enrollmentDate: new Date(),
        gradePercentage: 70
      });

      // Create multiple audit log entries
      await GradeChangeLog.create({
        enrollmentId: enrollment._id,
        classId: new mongoose.Types.ObjectId(),
        courseId: new mongoose.Types.ObjectId(),
        learnerId: new mongoose.Types.ObjectId(),
        fieldChanged: 'gradePercentage',
        previousGradePercentage: 70,
        newGradePercentage: 80,
        changedBy: new mongoose.Types.ObjectId(),
        changedByRole: 'dept-admin',
        changedAt: new Date('2026-01-01'),
        reason: 'First correction',
        changeType: 'override',
        departmentId: new mongoose.Types.ObjectId()
      });

      await GradeChangeLog.create({
        enrollmentId: enrollment._id,
        classId: new mongoose.Types.ObjectId(),
        courseId: new mongoose.Types.ObjectId(),
        learnerId: new mongoose.Types.ObjectId(),
        fieldChanged: 'gradePercentage',
        previousGradePercentage: 80,
        newGradePercentage: 90,
        changedBy: new mongoose.Types.ObjectId(),
        changedByRole: 'dept-admin',
        changedAt: new Date('2026-01-05'),
        reason: 'Second correction',
        changeType: 'override',
        departmentId: new mongoose.Types.ObjectId()
      });

      const history = await gradeOverrideService.getGradeChangeHistory(
        enrollment._id.toString()
      );

      expect(history).toHaveLength(2);
      expect(history[0].reason).toBe('Second correction');  // Most recent first
      expect(history[1].reason).toBe('First correction');
    });

    it('should filter by date range if provided', async () => {
      // Create enrollment first
      const enrollment = await ClassEnrollment.create({
        learnerId: new mongoose.Types.ObjectId(),
        classId: new mongoose.Types.ObjectId(),
        status: 'active',
        enrollmentDate: new Date(),
        gradePercentage: 70
      });

      await GradeChangeLog.create({
        enrollmentId: enrollment._id,
        classId: new mongoose.Types.ObjectId(),
        courseId: new mongoose.Types.ObjectId(),
        learnerId: new mongoose.Types.ObjectId(),
        fieldChanged: 'gradePercentage',
        previousGradePercentage: 70,
        newGradePercentage: 80,
        changedBy: new mongoose.Types.ObjectId(),
        changedByRole: 'dept-admin',
        changedAt: new Date('2026-01-01'),
        reason: 'Early change',
        changeType: 'override',
        departmentId: new mongoose.Types.ObjectId()
      });

      await GradeChangeLog.create({
        enrollmentId: enrollment._id,
        classId: new mongoose.Types.ObjectId(),
        courseId: new mongoose.Types.ObjectId(),
        learnerId: new mongoose.Types.ObjectId(),
        fieldChanged: 'gradePercentage',
        previousGradePercentage: 80,
        newGradePercentage: 90,
        changedBy: new mongoose.Types.ObjectId(),
        changedByRole: 'dept-admin',
        changedAt: new Date('2026-02-15'),
        reason: 'Later change',
        changeType: 'override',
        departmentId: new mongoose.Types.ObjectId()
      });

      const history = await gradeOverrideService.getGradeChangeHistory(
        enrollment._id.toString(),
        {
          startDate: new Date('2026-02-01'),
          endDate: new Date('2026-02-28')
        }
      );

      expect(history).toHaveLength(1);
      expect(history[0].reason).toBe('Later change');
    });

    it('should return empty array if no changes exist', async () => {
      // Create enrollment with no history
      const enrollment = await ClassEnrollment.create({
        learnerId: new mongoose.Types.ObjectId(),
        classId: new mongoose.Types.ObjectId(),
        status: 'active',
        enrollmentDate: new Date(),
        gradePercentage: 70
      });

      const history = await gradeOverrideService.getGradeChangeHistory(
        enrollment._id.toString()
      );

      expect(history).toHaveLength(0);
      expect(history).toEqual([]);
    });
  });

  describe('getAdminGradeOverrides()', () => {
    it('should return all changes made by an admin', async () => {
      const adminId = new mongoose.Types.ObjectId();

      await GradeChangeLog.create({
        enrollmentId: new mongoose.Types.ObjectId(),
        classId: new mongoose.Types.ObjectId(),
        courseId: new mongoose.Types.ObjectId(),
        learnerId: new mongoose.Types.ObjectId(),
        fieldChanged: 'gradePercentage',
        previousGradePercentage: 70,
        newGradePercentage: 80,
        changedBy: adminId,
        changedByRole: 'dept-admin',
        changedAt: new Date(),
        reason: 'Override 1',
        changeType: 'override',
        departmentId: new mongoose.Types.ObjectId()
      });

      await GradeChangeLog.create({
        enrollmentId: new mongoose.Types.ObjectId(),
        classId: new mongoose.Types.ObjectId(),
        courseId: new mongoose.Types.ObjectId(),
        learnerId: new mongoose.Types.ObjectId(),
        fieldChanged: 'gradeLetter',
        previousGradeLetter: 'C',
        newGradeLetter: 'B',
        changedBy: adminId,
        changedByRole: 'dept-admin',
        changedAt: new Date(),
        reason: 'Override 2',
        changeType: 'override',
        departmentId: new mongoose.Types.ObjectId()
      });

      const overrides = await gradeOverrideService.getAdminGradeOverrides(
        adminId.toString()
      );

      expect(overrides).toHaveLength(2);
    });

    it('should filter by department if provided', async () => {
      const adminId = new mongoose.Types.ObjectId();
      const dept1 = new mongoose.Types.ObjectId();
      const dept2 = new mongoose.Types.ObjectId();

      await GradeChangeLog.create({
        enrollmentId: new mongoose.Types.ObjectId(),
        classId: new mongoose.Types.ObjectId(),
        courseId: new mongoose.Types.ObjectId(),
        learnerId: new mongoose.Types.ObjectId(),
        fieldChanged: 'gradePercentage',
        previousGradePercentage: 70,
        newGradePercentage: 80,
        changedBy: adminId,
        changedByRole: 'dept-admin',
        changedAt: new Date(),
        reason: 'Dept 1 override',
        changeType: 'override',
        departmentId: dept1
      });

      await GradeChangeLog.create({
        enrollmentId: new mongoose.Types.ObjectId(),
        classId: new mongoose.Types.ObjectId(),
        courseId: new mongoose.Types.ObjectId(),
        learnerId: new mongoose.Types.ObjectId(),
        fieldChanged: 'gradePercentage',
        previousGradePercentage: 75,
        newGradePercentage: 85,
        changedBy: adminId,
        changedByRole: 'dept-admin',
        changedAt: new Date(),
        reason: 'Dept 2 override',
        changeType: 'override',
        departmentId: dept2
      });

      const overrides = await gradeOverrideService.getAdminGradeOverrides(
        adminId.toString(),
        { departmentId: dept1.toString() }
      );

      expect(overrides).toHaveLength(1);
      expect(overrides[0].reason).toBe('Dept 1 override');
    });
  });
});
