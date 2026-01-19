import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Course from '@/models/academic/Course.model';
import Department from '@/models/organization/Department.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Course Model', () => {
  let mongoServer: MongoMemoryServer;
  let testDepartment: any;

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
  });

  afterEach(async () => {
    await Course.deleteMany({});
    await Department.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid course with required fields', async () => {
      const course = await Course.create({
        name: 'Introduction to Programming',
        code: 'CS101',
        departmentId: testDepartment._id,
        credits: 3,
        isActive: true
      });

      expect(course.name).toBe('Introduction to Programming');
      expect(course.code).toBe('CS101');
      expect(course.departmentId).toEqual(testDepartment._id);
      expect(course.credits).toBe(3);
      expect(course.isActive).toBe(true);
    });

    it('should require name field', async () => {
      const course = new Course({
        code: 'CS101',
        departmentId: testDepartment._id,
        credits: 3
      });

      await expect(course.save()).rejects.toThrow(/name/);
    });

    it('should require code field', async () => {
      const course = new Course({
        name: 'Introduction to Programming',
        departmentId: testDepartment._id,
        credits: 3
      });

      await expect(course.save()).rejects.toThrow(/code/);
    });

    it('should require departmentId field', async () => {
      const course = new Course({
        name: 'Introduction to Programming',
        code: 'CS101',
        credits: 3
      });

      await expect(course.save()).rejects.toThrow(/departmentId/);
    });

    it('should require credits field', async () => {
      const course = new Course({
        name: 'Introduction to Programming',
        code: 'CS101',
        departmentId: testDepartment._id
      });

      await expect(course.save()).rejects.toThrow(/credits/);
    });

    it('should enforce unique code within department', async () => {
      await Course.create({
        name: 'Introduction to Programming',
        code: 'CS101',
        departmentId: testDepartment._id,
        credits: 3
      });

      await expect(
        Course.create({
          name: 'Advanced Programming',
          code: 'CS101',
          departmentId: testDepartment._id,
          credits: 4
        })
      ).rejects.toThrow(/duplicate/);
    });

    it('should allow same code in different departments', async () => {
      const dept2 = await Department.create({
        name: 'Science',
        code: 'SCI'
      });

      const course1 = await Course.create({
        name: 'Introduction to Programming',
        code: 'CS101',
        departmentId: testDepartment._id,
        credits: 3
      });

      const course2 = await Course.create({
        name: 'Computational Science 101',
        code: 'CS101',
        departmentId: dept2._id,
        credits: 3
      });

      expect(course1.code).toBe('CS101');
      expect(course2.code).toBe('CS101');
      expect(course1.departmentId).not.toEqual(course2.departmentId);
    });

    it('should convert code to uppercase', async () => {
      const course = await Course.create({
        name: 'Introduction to Programming',
        code: 'cs101',
        departmentId: testDepartment._id,
        credits: 3
      });

      expect(course.code).toBe('CS101');
    });

    it('should trim whitespace', async () => {
      const course = await Course.create({
        name: '  Introduction to Programming  ',
        code: '  cs101  ',
        departmentId: testDepartment._id,
        credits: 3
      });

      expect(course.name).toBe('Introduction to Programming');
      expect(course.code).toBe('CS101');
    });

    it('should validate credits are non-negative', async () => {
      const course = new Course({
        name: 'Introduction to Programming',
        code: 'CS101',
        departmentId: testDepartment._id,
        credits: -1
      });

      await expect(course.save()).rejects.toThrow(/credits/);
    });
  });

  describe('Course Metadata', () => {
    it('should store description', async () => {
      const course = await Course.create({
        name: 'Introduction to Programming',
        code: 'CS101',
        departmentId: testDepartment._id,
        credits: 3,
        description: 'Learn the basics of programming'
      });

      expect(course.description).toBe('Learn the basics of programming');
    });

    it('should store prerequisites', async () => {
      const prereq = await Course.create({
        name: 'Math 101',
        code: 'MATH101',
        departmentId: testDepartment._id,
        credits: 3
      });

      const course = await Course.create({
        name: 'Introduction to Programming',
        code: 'CS101',
        departmentId: testDepartment._id,
        credits: 3,
        prerequisites: [prereq._id]
      });

      expect(course.prerequisites).toHaveLength(1);
      expect(course.prerequisites[0]).toEqual(prereq._id);
    });

    it('should store multiple prerequisites', async () => {
      const prereq1 = await Course.create({
        name: 'Math 101',
        code: 'MATH101',
        departmentId: testDepartment._id,
        credits: 3
      });

      const prereq2 = await Course.create({
        name: 'Physics 101',
        code: 'PHYS101',
        departmentId: testDepartment._id,
        credits: 3
      });

      const course = await Course.create({
        name: 'Advanced Science',
        code: 'SCI201',
        departmentId: testDepartment._id,
        credits: 4,
        prerequisites: [prereq1._id, prereq2._id]
      });

      expect(course.prerequisites).toHaveLength(2);
    });

    it('should set default isActive to true', async () => {
      const course = await Course.create({
        name: 'Introduction to Programming',
        code: 'CS101',
        departmentId: testDepartment._id,
        credits: 3
      });

      expect(course.isActive).toBe(true);
    });

    it('should store custom metadata', async () => {
      const course = await Course.create({
        name: 'Introduction to Programming',
        code: 'CS101',
        departmentId: testDepartment._id,
        credits: 3,
        metadata: {
          difficulty: 'beginner',
          language: 'Python'
        }
      });

      expect(course.metadata).toEqual({
        difficulty: 'beginner',
        language: 'Python'
      });
    });

    it('should auto-generate timestamps', async () => {
      const course = await Course.create({
        name: 'Introduction to Programming',
        code: 'CS101',
        departmentId: testDepartment._id,
        credits: 3
      });

      expect(course.createdAt).toBeDefined();
      expect(course.updatedAt).toBeDefined();
    });
  });

  describe('Query Methods', () => {
    it('should find courses by department', async () => {
      await Course.create({
        name: 'CS Course',
        code: 'CS101',
        departmentId: testDepartment._id,
        credits: 3
      });

      const courses = await Course.find({ departmentId: testDepartment._id });
      expect(courses).toHaveLength(1);
      expect(courses[0].name).toBe('CS Course');
    });

    it('should find active courses', async () => {
      await Course.create({
        name: 'Active Course',
        code: 'ACT101',
        departmentId: testDepartment._id,
        credits: 3,
        isActive: true
      });

      await Course.create({
        name: 'Inactive Course',
        code: 'INACT101',
        departmentId: testDepartment._id,
        credits: 3,
        isActive: false
      });

      const active = await Course.find({ isActive: true });
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('Active Course');
    });

    it('should find courses by credits', async () => {
      await Course.create({
        name: '3 Credit Course',
        code: 'CRS301',
        departmentId: testDepartment._id,
        credits: 3
      });

      await Course.create({
        name: '4 Credit Course',
        code: 'CRS401',
        departmentId: testDepartment._id,
        credits: 4
      });

      const threeCredit = await Course.find({ credits: 3 });
      expect(threeCredit).toHaveLength(1);
      expect(threeCredit[0].name).toBe('3 Credit Course');
    });
  });
});
