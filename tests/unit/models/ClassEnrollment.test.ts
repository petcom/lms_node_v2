import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import Class from '@/models/academic/Class.model';
import Course from '@/models/academic/Course.model';
import Department from '@/models/organization/Department.model';
import AcademicYear from '@/models/academic/AcademicYear.model';

describe('ClassEnrollment Model', () => {
  let mongoServer: MongoMemoryServer;
  let testClass: any;
  let testLearnerId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const dept = await Department.create({
      name: 'Engineering',
      code: 'ENG'
    });

    const course = await Course.create({
      name: 'Data Structures',
      code: 'CS201',
      departmentId: dept._id,
      credits: 3
    });

    const academicYear = await AcademicYear.create({
      name: '2024-2025',
      code: '2024-25',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-06-30')
    });

    testClass = await Class.create({
      name: 'Data Structures - Fall 2024 Section A',
      courseId: course._id,
      academicYearId: academicYear._id,
      termCode: 'FALL24',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-12-15'),
      maxEnrollment: 30
    });

    testLearnerId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await ClassEnrollment.deleteMany({});
    await Class.deleteMany({});
    await Course.deleteMany({});
    await AcademicYear.deleteMany({});
    await Department.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create valid class enrollment', async () => {
      const enrollment = await ClassEnrollment.create({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      expect(enrollment.learnerId).toEqual(testLearnerId);
      expect(enrollment.classId).toEqual(testClass._id);
      expect(enrollment.status).toBe('active');
    });

    it('should require learnerId field', async () => {
      const enrollment = new ClassEnrollment({
        classId: testClass._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      await expect(enrollment.save()).rejects.toThrow(/learnerId/);
    });

    it('should require classId field', async () => {
      const enrollment = new ClassEnrollment({
        learnerId: testLearnerId,
        status: 'active',
        enrollmentDate: new Date()
      });

      await expect(enrollment.save()).rejects.toThrow(/classId/);
    });

    it('should require status field', async () => {
      const enrollment = new ClassEnrollment({
        learnerId: testLearnerId,
        classId: testClass._id,
        enrollmentDate: new Date()
      });

      await expect(enrollment.save()).rejects.toThrow(/status/);
    });

    it('should require enrollmentDate field', async () => {
      const enrollment = new ClassEnrollment({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'active'
      });

      await expect(enrollment.save()).rejects.toThrow(/enrollmentDate/);
    });

    it('should validate status enum', async () => {
      const enrollment = new ClassEnrollment({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'invalid-status',
        enrollmentDate: new Date()
      });

      await expect(enrollment.save()).rejects.toThrow();
    });

    it('should accept valid statuses', async () => {
      const statuses = ['enrolled', 'active', 'dropped', 'withdrawn', 'completed', 'failed'];

      for (const status of statuses) {
        const enrollment = await ClassEnrollment.create({
          learnerId: new mongoose.Types.ObjectId(),
          classId: testClass._id,
          status,
          enrollmentDate: new Date()
        });

        expect(enrollment.status).toBe(status);
      }
    });

    it('should enforce unique (learnerId, classId)', async () => {
      await ClassEnrollment.create({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      await expect(
        ClassEnrollment.create({
          learnerId: testLearnerId,
          classId: testClass._id,
          status: 'dropped',
          enrollmentDate: new Date()
        })
      ).rejects.toThrow(/duplicate/);
    });
  });

  describe('Enrollment Lifecycle', () => {
    it('should track enrollment date', async () => {
      const enrollDate = new Date('2024-09-01');
      const enrollment = await ClassEnrollment.create({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'active',
        enrollmentDate: enrollDate
      });

      expect(enrollment.enrollmentDate).toEqual(enrollDate);
    });

    it('should track drop date and reason', async () => {
      const dropDate = new Date('2024-10-15');
      const enrollment = await ClassEnrollment.create({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'dropped',
        enrollmentDate: new Date('2024-09-01'),
        dropDate: dropDate,
        dropReason: 'Schedule conflict'
      });

      expect(enrollment.dropDate).toEqual(dropDate);
      expect(enrollment.dropReason).toBe('Schedule conflict');
    });

    it('should track completion date', async () => {
      const completionDate = new Date('2024-12-15');
      const enrollment = await ClassEnrollment.create({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'completed',
        enrollmentDate: new Date('2024-09-01'),
        completionDate: completionDate
      });

      expect(enrollment.completionDate).toEqual(completionDate);
    });
  });

  describe('Grade Management', () => {
    it('should track grade letter', async () => {
      const enrollment = await ClassEnrollment.create({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'completed',
        enrollmentDate: new Date(),
        gradeLetter: 'A'
      });

      expect(enrollment.gradeLetter).toBe('A');
    });

    it('should track grade percentage', async () => {
      const enrollment = await ClassEnrollment.create({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'active',
        enrollmentDate: new Date(),
        gradePercentage: 92.5
      });

      expect(enrollment.gradePercentage).toBe(92.5);
    });

    it('should validate grade percentage is between 0 and 100', async () => {
      const enrollment = new ClassEnrollment({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'active',
        enrollmentDate: new Date(),
        gradePercentage: 105
      });

      await expect(enrollment.save()).rejects.toThrow(/gradePercentage/);
    });

    it('should track grade points', async () => {
      const enrollment = await ClassEnrollment.create({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'completed',
        enrollmentDate: new Date(),
        gradePoints: 4.0
      });

      expect(enrollment.gradePoints).toBe(4.0);
    });

    it('should validate grade points is between 0 and 4', async () => {
      const enrollment = new ClassEnrollment({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'completed',
        enrollmentDate: new Date(),
        gradePoints: 5.0
      });

      await expect(enrollment.save()).rejects.toThrow(/gradePoints/);
    });

    it('should track credits earned', async () => {
      const enrollment = await ClassEnrollment.create({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'completed',
        enrollmentDate: new Date(),
        creditsEarned: 3
      });

      expect(enrollment.creditsEarned).toBe(3);
    });

    it('should validate credits earned is non-negative', async () => {
      const enrollment = new ClassEnrollment({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'completed',
        enrollmentDate: new Date(),
        creditsEarned: -2
      });

      await expect(enrollment.save()).rejects.toThrow(/creditsEarned/);
    });
  });

  describe('Attendance Tracking', () => {
    it('should track attendance records', async () => {
      const enrollment = await ClassEnrollment.create({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'active',
        enrollmentDate: new Date(),
        attendanceRecords: [
          { date: new Date('2024-09-01'), status: 'present' },
          { date: new Date('2024-09-03'), status: 'absent' },
          { date: new Date('2024-09-05'), status: 'present' }
        ]
      });

      expect(enrollment.attendanceRecords).toHaveLength(3);
      expect(enrollment.attendanceRecords[0].status).toBe('present');
      expect(enrollment.attendanceRecords[1].status).toBe('absent');
    });

    it('should validate attendance status enum', async () => {
      const enrollment = new ClassEnrollment({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'active',
        enrollmentDate: new Date(),
        attendanceRecords: [
          { date: new Date('2024-09-01'), status: 'invalid-status' }
        ]
      });

      await expect(enrollment.save()).rejects.toThrow();
    });

    it('should allow attendance notes', async () => {
      const enrollment = await ClassEnrollment.create({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'active',
        enrollmentDate: new Date(),
        attendanceRecords: [
          { 
            date: new Date('2024-09-01'), 
            status: 'late',
            notes: 'Arrived 15 minutes late'
          }
        ]
      });

      expect(enrollment.attendanceRecords[0].notes).toBe('Arrived 15 minutes late');
    });
  });

  describe('Participation Tracking', () => {
    it('should track participation score', async () => {
      const enrollment = await ClassEnrollment.create({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'active',
        enrollmentDate: new Date(),
        participationScore: 85
      });

      expect(enrollment.participationScore).toBe(85);
    });

    it('should validate participation score is between 0 and 100', async () => {
      const enrollment = new ClassEnrollment({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'active',
        enrollmentDate: new Date(),
        participationScore: 110
      });

      await expect(enrollment.save()).rejects.toThrow(/participationScore/);
    });
  });

  describe('Metadata', () => {
    it('should store custom metadata', async () => {
      const enrollment = await ClassEnrollment.create({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'active',
        enrollmentDate: new Date(),
        metadata: {
          seatNumber: '12A',
          specialAccommodations: ['Extra time on exams'],
          notes: 'Student athlete'
        }
      });

      expect(enrollment.metadata).toEqual({
        seatNumber: '12A',
        specialAccommodations: ['Extra time on exams'],
        notes: 'Student athlete'
      });
    });

    it('should auto-generate timestamps', async () => {
      const enrollment = await ClassEnrollment.create({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      expect(enrollment.createdAt).toBeDefined();
      expect(enrollment.updatedAt).toBeDefined();
    });
  });

  describe('Query Methods', () => {
    it('should find enrollments by learner', async () => {
      await ClassEnrollment.create({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      const enrollments = await ClassEnrollment.find({ learnerId: testLearnerId });
      expect(enrollments).toHaveLength(1);
    });

    it('should find enrollments by class', async () => {
      await ClassEnrollment.create({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      await ClassEnrollment.create({
        learnerId: new mongoose.Types.ObjectId(),
        classId: testClass._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      const enrollments = await ClassEnrollment.find({ classId: testClass._id });
      expect(enrollments).toHaveLength(2);
    });

    it('should find enrollments by status', async () => {
      await ClassEnrollment.create({
        learnerId: testLearnerId,
        classId: testClass._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      await ClassEnrollment.create({
        learnerId: new mongoose.Types.ObjectId(),
        classId: testClass._id,
        status: 'dropped',
        enrollmentDate: new Date()
      });

      const active = await ClassEnrollment.find({ status: 'active' });
      expect(active).toHaveLength(1);
    });
  });
});
