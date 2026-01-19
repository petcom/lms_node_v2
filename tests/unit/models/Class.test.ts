import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Class from '@/models/academic/Class.model';
import Course from '@/models/academic/Course.model';
import Department from '@/models/organization/Department.model';
import AcademicYear from '@/models/academic/AcademicYear.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Class Model', () => {
  let mongoServer: MongoMemoryServer;
  let testDepartment: any;
  let testCourse: any;
  let testAcademicYear: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    testDepartment = await Department.create({
      name: 'Engineering',
      code: 'ENG'
    });

    testCourse = await Course.create({
      name: 'Introduction to Programming',
      code: 'CS101',
      departmentId: testDepartment._id,
      credits: 3
    });

    testAcademicYear = await AcademicYear.create({
      name: '2024-2025',
      code: '2024-25',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-06-30'),
      terms: [
        {
          name: 'Fall 2024',
          code: 'FALL24',
          startDate: new Date('2024-09-01'),
          endDate: new Date('2024-12-20')
        }
      ]
    });
  });

  afterEach(async () => {
    await Class.deleteMany({});
    await Course.deleteMany({});
    await AcademicYear.deleteMany({});
    await Department.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid class with required fields', async () => {
      const classDoc = await Class.create({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30,
        isActive: true
      });

      expect(classDoc.name).toBe('CS101-001');
      expect(classDoc.courseId).toEqual(testCourse._id);
      expect(classDoc.academicYearId).toEqual(testAcademicYear._id);
      expect(classDoc.termCode).toBe('FALL24');
      expect(classDoc.maxEnrollment).toBe(30);
      expect(classDoc.isActive).toBe(true);
      expect(classDoc.currentEnrollment).toBe(0);
    });

    it('should require name field', async () => {
      const classDoc = new Class({
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30
      });

      await expect(classDoc.save()).rejects.toThrow(/name/);
    });

    it('should require courseId field', async () => {
      const classDoc = new Class({
        name: 'CS101-001',
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30
      });

      await expect(classDoc.save()).rejects.toThrow(/courseId/);
    });

    it('should require academicYearId field', async () => {
      const classDoc = new Class({
        name: 'CS101-001',
        courseId: testCourse._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30
      });

      await expect(classDoc.save()).rejects.toThrow(/academicYearId/);
    });

    it('should require termCode field', async () => {
      const classDoc = new Class({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30
      });

      await expect(classDoc.save()).rejects.toThrow(/termCode/);
    });

    it('should require startDate field', async () => {
      const classDoc = new Class({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30
      });

      await expect(classDoc.save()).rejects.toThrow(/startDate/);
    });

    it('should require endDate field', async () => {
      const classDoc = new Class({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        maxEnrollment: 30
      });

      await expect(classDoc.save()).rejects.toThrow(/endDate/);
    });

    it('should require maxEnrollment field', async () => {
      const classDoc = new Class({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20')
      });

      await expect(classDoc.save()).rejects.toThrow(/maxEnrollment/);
    });

    it('should trim whitespace', async () => {
      const classDoc = await Class.create({
        name: '  CS101-001  ',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: '  fall24  ',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30
      });

      expect(classDoc.name).toBe('CS101-001');
      expect(classDoc.termCode).toBe('FALL24');
    });

    it('should convert termCode to uppercase', async () => {
      const classDoc = await Class.create({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'fall24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30
      });

      expect(classDoc.termCode).toBe('FALL24');
    });

    it('should validate maxEnrollment is positive', async () => {
      const classDoc = new Class({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 0
      });

      await expect(classDoc.save()).rejects.toThrow(/maxEnrollment/);
    });

    it('should validate currentEnrollment is non-negative', async () => {
      const classDoc = new Class({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30,
        currentEnrollment: -1
      });

      await expect(classDoc.save()).rejects.toThrow(/currentEnrollment/);
    });

    it('should validate endDate is after startDate', async () => {
      const classDoc = new Class({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-12-20'),
        endDate: new Date('2024-09-01'),
        maxEnrollment: 30
      });

      await expect(classDoc.save()).rejects.toThrow(/must be after/);
    });
  });

  describe('Enrollment Management', () => {
    it('should set default currentEnrollment to 0', async () => {
      const classDoc = await Class.create({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30
      });

      expect(classDoc.currentEnrollment).toBe(0);
    });

    it('should track current enrollment', async () => {
      const classDoc = await Class.create({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30,
        currentEnrollment: 15
      });

      expect(classDoc.currentEnrollment).toBe(15);
    });

    it('should store instructor IDs', async () => {
      const instructor1 = new mongoose.Types.ObjectId();
      const instructor2 = new mongoose.Types.ObjectId();

      const classDoc = await Class.create({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30,
        instructorIds: [instructor1, instructor2]
      });

      expect(classDoc.instructorIds).toHaveLength(2);
      expect(classDoc.instructorIds[0]).toEqual(instructor1);
      expect(classDoc.instructorIds[1]).toEqual(instructor2);
    });
  });

  describe('Schedule and Location', () => {
    it('should store schedule information', async () => {
      const classDoc = await Class.create({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30,
        schedule: 'Mon/Wed/Fri 10:00-11:00'
      });

      expect(classDoc.schedule).toBe('Mon/Wed/Fri 10:00-11:00');
    });

    it('should store location information', async () => {
      const classDoc = await Class.create({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30,
        location: 'Room 301, Engineering Building'
      });

      expect(classDoc.location).toBe('Room 301, Engineering Building');
    });
  });

  describe('Metadata', () => {
    it('should set default isActive to true', async () => {
      const classDoc = await Class.create({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30
      });

      expect(classDoc.isActive).toBe(true);
    });

    it('should store custom metadata', async () => {
      const classDoc = await Class.create({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30,
        metadata: {
          format: 'hybrid',
          zoomLink: 'https://zoom.us/j/123456'
        }
      });

      expect(classDoc.metadata).toEqual({
        format: 'hybrid',
        zoomLink: 'https://zoom.us/j/123456'
      });
    });

    it('should auto-generate timestamps', async () => {
      const classDoc = await Class.create({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30
      });

      expect(classDoc.createdAt).toBeDefined();
      expect(classDoc.updatedAt).toBeDefined();
    });
  });

  describe('Query Methods', () => {
    it('should find classes by course', async () => {
      await Class.create({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30
      });

      const classes = await Class.find({ courseId: testCourse._id });
      expect(classes).toHaveLength(1);
      expect(classes[0].name).toBe('CS101-001');
    });

    it('should find classes by academic year', async () => {
      await Class.create({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30
      });

      const classes = await Class.find({ academicYearId: testAcademicYear._id });
      expect(classes).toHaveLength(1);
    });

    it('should find classes by term', async () => {
      await Class.create({
        name: 'CS101-001',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30
      });

      const classes = await Class.find({ termCode: 'FALL24' });
      expect(classes).toHaveLength(1);
    });

    it('should find active classes', async () => {
      await Class.create({
        name: 'Active Class',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30,
        isActive: true
      });

      await Class.create({
        name: 'Inactive Class',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30,
        isActive: false
      });

      const active = await Class.find({ isActive: true });
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('Active Class');
    });

    it('should find classes with available seats', async () => {
      await Class.create({
        name: 'Full Class',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30,
        currentEnrollment: 30
      });

      await Class.create({
        name: 'Available Class',
        courseId: testCourse._id,
        academicYearId: testAcademicYear._id,
        termCode: 'FALL24',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-20'),
        maxEnrollment: 30,
        currentEnrollment: 15
      });

      // Find classes where currentEnrollment < maxEnrollment
      const available = await Class.find({
        $expr: { $lt: ['$currentEnrollment', '$maxEnrollment'] }
      });

      expect(available).toHaveLength(1);
      expect(available[0].name).toBe('Available Class');
    });
  });
});
