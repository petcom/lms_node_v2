import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Enrollment from '@/models/enrollment/Enrollment.model';
import Program from '@/models/academic/Program.model';
import Department from '@/models/organization/Department.model';
import AcademicYear from '@/models/academic/AcademicYear.model';

describe('Enrollment Model', () => {
  let mongoServer: MongoMemoryServer;
  let testProgram: any;
  let testAcademicYear: any;
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

    testProgram = await Program.create({
      name: 'Computer Science',
      code: 'CS',
      departmentId: dept._id,
      type: 'bachelors'
    });

    testAcademicYear = await AcademicYear.create({
      name: '2024-2025',
      code: '2024-25',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-06-30')
    });

    testLearnerId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await Enrollment.deleteMany({});
    await Program.deleteMany({});
    await AcademicYear.deleteMany({});
    await Department.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create valid enrollment', async () => {
      const enrollment = await Enrollment.create({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      expect(enrollment.learnerId).toEqual(testLearnerId);
      expect(enrollment.programId).toEqual(testProgram._id);
      expect(enrollment.academicYearId).toEqual(testAcademicYear._id);
      expect(enrollment.status).toBe('active');
    });

    it('should require learnerId field', async () => {
      const enrollment = new Enrollment({
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      await expect(enrollment.save()).rejects.toThrow(/learnerId/);
    });

    it('should require programId field', async () => {
      const enrollment = new Enrollment({
        learnerId: testLearnerId,
        academicYearId: testAcademicYear._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      await expect(enrollment.save()).rejects.toThrow(/programId/);
    });

    it('should require academicYearId field', async () => {
      const enrollment = new Enrollment({
        learnerId: testLearnerId,
        programId: testProgram._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      await expect(enrollment.save()).rejects.toThrow(/academicYearId/);
    });

    it('should require status field', async () => {
      const enrollment = new Enrollment({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        enrollmentDate: new Date()
      });

      await expect(enrollment.save()).rejects.toThrow(/status/);
    });

    it('should require enrollmentDate field', async () => {
      const enrollment = new Enrollment({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'active'
      });

      await expect(enrollment.save()).rejects.toThrow(/enrollmentDate/);
    });

    it('should validate status enum', async () => {
      const enrollment = new Enrollment({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'invalid-status',
        enrollmentDate: new Date()
      });

      await expect(enrollment.save()).rejects.toThrow();
    });

    it('should accept valid statuses', async () => {
      const statuses = ['pending', 'active', 'suspended', 'withdrawn', 'completed', 'graduated'];

      for (const status of statuses) {
        const enrollment = await Enrollment.create({
          learnerId: new mongoose.Types.ObjectId(),
          programId: testProgram._id,
          academicYearId: testAcademicYear._id,
          status,
          enrollmentDate: new Date()
        });

        expect(enrollment.status).toBe(status);
      }
    });

    it('should enforce unique (learnerId, programId, academicYearId)', async () => {
      await Enrollment.create({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      await expect(
        Enrollment.create({
          learnerId: testLearnerId,
          programId: testProgram._id,
          academicYearId: testAcademicYear._id,
          status: 'withdrawn',
          enrollmentDate: new Date()
        })
      ).rejects.toThrow(/duplicate/);
    });
  });

  describe('Enrollment Lifecycle', () => {
    it('should track enrollment date', async () => {
      const enrollDate = new Date('2024-09-01');
      const enrollment = await Enrollment.create({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'active',
        enrollmentDate: enrollDate
      });

      expect(enrollment.enrollmentDate).toEqual(enrollDate);
    });

    it('should track start date', async () => {
      const startDate = new Date('2024-09-05');
      const enrollment = await Enrollment.create({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'active',
        enrollmentDate: new Date('2024-09-01'),
        startDate: startDate
      });

      expect(enrollment.startDate).toEqual(startDate);
    });

    it('should track completion date', async () => {
      const completionDate = new Date('2025-05-31');
      const enrollment = await Enrollment.create({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'completed',
        enrollmentDate: new Date('2024-09-01'),
        completionDate: completionDate
      });

      expect(enrollment.completionDate).toEqual(completionDate);
    });

    it('should track graduation date', async () => {
      const graduationDate = new Date('2025-06-15');
      const enrollment = await Enrollment.create({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'graduated',
        enrollmentDate: new Date('2024-09-01'),
        graduationDate: graduationDate
      });

      expect(enrollment.graduationDate).toEqual(graduationDate);
    });

    it('should track withdrawal date and reason', async () => {
      const withdrawalDate = new Date('2024-12-15');
      const enrollment = await Enrollment.create({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'withdrawn',
        enrollmentDate: new Date('2024-09-01'),
        withdrawalDate: withdrawalDate,
        withdrawalReason: 'Personal reasons'
      });

      expect(enrollment.withdrawalDate).toEqual(withdrawalDate);
      expect(enrollment.withdrawalReason).toBe('Personal reasons');
    });
  });

  describe('Academic Progress', () => {
    it('should track current term', async () => {
      const enrollment = await Enrollment.create({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'active',
        enrollmentDate: new Date(),
        currentTerm: 'FALL24'
      });

      expect(enrollment.currentTerm).toBe('FALL24');
    });

    it('should track cumulative GPA', async () => {
      const enrollment = await Enrollment.create({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'active',
        enrollmentDate: new Date(),
        cumulativeGPA: 3.75
      });

      expect(enrollment.cumulativeGPA).toBe(3.75);
    });

    it('should validate GPA is between 0 and 4', async () => {
      const enrollment = new Enrollment({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'active',
        enrollmentDate: new Date(),
        cumulativeGPA: 5.0
      });

      await expect(enrollment.save()).rejects.toThrow(/cumulativeGPA/);
    });

    it('should track total credits earned', async () => {
      const enrollment = await Enrollment.create({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'active',
        enrollmentDate: new Date(),
        totalCreditsEarned: 45
      });

      expect(enrollment.totalCreditsEarned).toBe(45);
    });

    it('should validate credits earned is non-negative', async () => {
      const enrollment = new Enrollment({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'active',
        enrollmentDate: new Date(),
        totalCreditsEarned: -5
      });

      await expect(enrollment.save()).rejects.toThrow(/totalCreditsEarned/);
    });
  });

  describe('Metadata', () => {
    it('should store custom metadata', async () => {
      const enrollment = await Enrollment.create({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'active',
        enrollmentDate: new Date(),
        metadata: {
          advisor: 'Dr. Smith',
          concentration: 'Software Engineering',
          expectedGraduation: '2028'
        }
      });

      expect(enrollment.metadata).toEqual({
        advisor: 'Dr. Smith',
        concentration: 'Software Engineering',
        expectedGraduation: '2028'
      });
    });

    it('should auto-generate timestamps', async () => {
      const enrollment = await Enrollment.create({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      expect(enrollment.createdAt).toBeDefined();
      expect(enrollment.updatedAt).toBeDefined();
    });
  });

  describe('Query Methods', () => {
    it('should find enrollments by learner', async () => {
      await Enrollment.create({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      const enrollments = await Enrollment.find({ learnerId: testLearnerId });
      expect(enrollments).toHaveLength(1);
    });

    it('should find enrollments by program', async () => {
      await Enrollment.create({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      await Enrollment.create({
        learnerId: new mongoose.Types.ObjectId(),
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      const enrollments = await Enrollment.find({ programId: testProgram._id });
      expect(enrollments).toHaveLength(2);
    });

    it('should find enrollments by status', async () => {
      await Enrollment.create({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      await Enrollment.create({
        learnerId: new mongoose.Types.ObjectId(),
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'withdrawn',
        enrollmentDate: new Date()
      });

      const active = await Enrollment.find({ status: 'active' });
      expect(active).toHaveLength(1);
    });

    it('should find enrollments by academic year', async () => {
      const year2 = await AcademicYear.create({
        name: '2025-2026',
        code: '2025-26',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2026-06-30')
      });

      await Enrollment.create({
        learnerId: testLearnerId,
        programId: testProgram._id,
        academicYearId: testAcademicYear._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      await Enrollment.create({
        learnerId: new mongoose.Types.ObjectId(),
        programId: testProgram._id,
        academicYearId: year2._id,
        status: 'active',
        enrollmentDate: new Date()
      });

      const year1Enrollments = await Enrollment.find({ 
        academicYearId: testAcademicYear._id 
      });
      expect(year1Enrollments).toHaveLength(1);
    });
  });
});
