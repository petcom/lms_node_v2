import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import CourseContent from '@/models/content/CourseContent.model';
import Course from '@/models/academic/Course.model';
import Content from '@/models/content/Content.model';
import Department from '@/models/organization/Department.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('CourseContent Model', () => {
  let mongoServer: MongoMemoryServer;
  let testCourse: any;
  let testContent: any;

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

    testCourse = await Course.create({
      name: 'Introduction to Programming',
      code: 'CS101',
      departmentId: dept._id,
      credits: 3
    });

    testContent = await Content.create({
      title: 'Lecture 1',
      type: 'video'
    });
  });

  afterEach(async () => {
    await CourseContent.deleteMany({});
    await Content.deleteMany({});
    await Course.deleteMany({});
    await Department.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create valid course content association', async () => {
      const courseContent = await CourseContent.create({
        courseId: testCourse._id,
        contentId: testContent._id,
        sequence: 1,
        isRequired: true,
        isActive: true
      });

      expect(courseContent.courseId).toEqual(testCourse._id);
      expect(courseContent.contentId).toEqual(testContent._id);
      expect(courseContent.sequence).toBe(1);
      expect(courseContent.isRequired).toBe(true);
    });

    it('should require courseId field', async () => {
      const courseContent = new CourseContent({
        contentId: testContent._id,
        sequence: 1
      });

      await expect(courseContent.save()).rejects.toThrow(/courseId/);
    });

    it('should require contentId field', async () => {
      const courseContent = new CourseContent({
        courseId: testCourse._id,
        sequence: 1
      });

      await expect(courseContent.save()).rejects.toThrow(/contentId/);
    });

    it('should require sequence field', async () => {
      const courseContent = new CourseContent({
        courseId: testCourse._id,
        contentId: testContent._id
      });

      await expect(courseContent.save()).rejects.toThrow(/sequence/);
    });

    it('should enforce unique (courseId, contentId)', async () => {
      await CourseContent.create({
        courseId: testCourse._id,
        contentId: testContent._id,
        sequence: 1
      });

      await expect(
        CourseContent.create({
          courseId: testCourse._id,
          contentId: testContent._id,
          sequence: 2
        })
      ).rejects.toThrow(/duplicate/);
    });

    it('should allow same content in different courses', async () => {
      const dept = await Department.create({
        name: 'Science',
        code: 'SCI'
      });

      const course2 = await Course.create({
        name: 'Computer Science',
        code: 'CS102',
        departmentId: dept._id,
        credits: 3
      });

      const cc1 = await CourseContent.create({
        courseId: testCourse._id,
        contentId: testContent._id,
        sequence: 1
      });

      const cc2 = await CourseContent.create({
        courseId: course2._id,
        contentId: testContent._id,
        sequence: 1
      });

      expect(cc1.courseId).not.toEqual(cc2.courseId);
      expect(cc1.contentId).toEqual(cc2.contentId);
    });

    it('should validate sequence is positive', async () => {
      const courseContent = new CourseContent({
        courseId: testCourse._id,
        contentId: testContent._id,
        sequence: 0
      });

      await expect(courseContent.save()).rejects.toThrow(/sequence/);
    });
  });

  describe('Sequencing and Organization', () => {
    it('should support module organization', async () => {
      const courseContent = await CourseContent.create({
        courseId: testCourse._id,
        contentId: testContent._id,
        moduleNumber: 1,
        sequence: 1
      });

      expect(courseContent.moduleNumber).toBe(1);
    });

    it('should support section within module', async () => {
      const courseContent = await CourseContent.create({
        courseId: testCourse._id,
        contentId: testContent._id,
        moduleNumber: 1,
        sectionNumber: 2,
        sequence: 1
      });

      expect(courseContent.moduleNumber).toBe(1);
      expect(courseContent.sectionNumber).toBe(2);
    });

    it('should track sequence order', async () => {
      const content2 = await Content.create({
        title: 'Lecture 2',
        type: 'video'
      });

      const cc1 = await CourseContent.create({
        courseId: testCourse._id,
        contentId: testContent._id,
        sequence: 1
      });

      const cc2 = await CourseContent.create({
        courseId: testCourse._id,
        contentId: content2._id,
        sequence: 2
      });

      expect(cc1.sequence).toBe(1);
      expect(cc2.sequence).toBe(2);
    });
  });

  describe('Requirements and Availability', () => {
    it('should set default isRequired to false', async () => {
      const courseContent = await CourseContent.create({
        courseId: testCourse._id,
        contentId: testContent._id,
        sequence: 1
      });

      expect(courseContent.isRequired).toBe(false);
    });

    it('should mark content as required', async () => {
      const courseContent = await CourseContent.create({
        courseId: testCourse._id,
        contentId: testContent._id,
        sequence: 1,
        isRequired: true
      });

      expect(courseContent.isRequired).toBe(true);
    });

    it('should store availability dates', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later

      const courseContent = await CourseContent.create({
        courseId: testCourse._id,
        contentId: testContent._id,
        sequence: 1,
        availableFrom: now,
        availableUntil: future
      });

      expect(courseContent.availableFrom).toEqual(now);
      expect(courseContent.availableUntil).toEqual(future);
    });

    it('should set default isActive to true', async () => {
      const courseContent = await CourseContent.create({
        courseId: testCourse._id,
        contentId: testContent._id,
        sequence: 1
      });

      expect(courseContent.isActive).toBe(true);
    });
  });

  describe('Metadata', () => {
    it('should store custom metadata', async () => {
      const courseContent = await CourseContent.create({
        courseId: testCourse._id,
        contentId: testContent._id,
        sequence: 1,
        metadata: {
          points: 100,
          category: 'lecture',
          estimatedTime: 45
        }
      });

      expect(courseContent.metadata).toEqual({
        points: 100,
        category: 'lecture',
        estimatedTime: 45
      });
    });

    it('should auto-generate timestamps', async () => {
      const courseContent = await CourseContent.create({
        courseId: testCourse._id,
        contentId: testContent._id,
        sequence: 1
      });

      expect(courseContent.createdAt).toBeDefined();
      expect(courseContent.updatedAt).toBeDefined();
    });
  });

  describe('Query Methods', () => {
    it('should find content by course', async () => {
      const content2 = await Content.create({ title: 'Lecture 2', type: 'video' });

      await CourseContent.create({
        courseId: testCourse._id,
        contentId: testContent._id,
        sequence: 1
      });

      await CourseContent.create({
        courseId: testCourse._id,
        contentId: content2._id,
        sequence: 2
      });

      const courseContents = await CourseContent.find({ courseId: testCourse._id }).sort({ sequence: 1 });
      expect(courseContents).toHaveLength(2);
      expect(courseContents[0].sequence).toBe(1);
      expect(courseContents[1].sequence).toBe(2);
    });

    it('should find by module number', async () => {
      const content2 = await Content.create({ title: 'Lecture 2', type: 'video' });

      await CourseContent.create({
        courseId: testCourse._id,
        contentId: testContent._id,
        moduleNumber: 1,
        sequence: 1
      });

      await CourseContent.create({
        courseId: testCourse._id,
        contentId: content2._id,
        moduleNumber: 2,
        sequence: 2
      });

      const module1Content = await CourseContent.find({ 
        courseId: testCourse._id, 
        moduleNumber: 1 
      });
      expect(module1Content).toHaveLength(1);
    });

    it('should find required content', async () => {
      const content2 = await Content.create({ title: 'Lecture 2', type: 'video' });

      await CourseContent.create({
        courseId: testCourse._id,
        contentId: testContent._id,
        sequence: 1,
        isRequired: true
      });

      await CourseContent.create({
        courseId: testCourse._id,
        contentId: content2._id,
        sequence: 2,
        isRequired: false
      });

      const required = await CourseContent.find({ 
        courseId: testCourse._id, 
        isRequired: true 
      });
      expect(required).toHaveLength(1);
    });

    it('should find active content', async () => {
      const content2 = await Content.create({ title: 'Lecture 2', type: 'video' });

      await CourseContent.create({
        courseId: testCourse._id,
        contentId: testContent._id,
        sequence: 1,
        isActive: true
      });

      await CourseContent.create({
        courseId: testCourse._id,
        contentId: content2._id,
        sequence: 2,
        isActive: false
      });

      const active = await CourseContent.find({ 
        courseId: testCourse._id, 
        isActive: true 
      });
      expect(active).toHaveLength(1);
    });
  });
});
