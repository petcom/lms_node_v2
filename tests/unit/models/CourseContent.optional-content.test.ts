import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import CourseContent from '@/models/content/CourseContent.model';

describe('CourseContent Model - Optional contentId', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await CourseContent.deleteMany({});
  });

  it('should create module without contentId', async () => {
    const courseId = new mongoose.Types.ObjectId();

    const module = await CourseContent.create({
      courseId,
      sequence: 1,
      isRequired: true,
      isActive: true,
      metadata: {
        title: 'Test Module',
        type: 'exercise'
      }
    });

    expect(module._id).toBeDefined();
    expect(module.contentId).toBeUndefined();
    expect(module.courseId.toString()).toBe(courseId.toString());
  });

  it('should create module with contentId', async () => {
    const courseId = new mongoose.Types.ObjectId();
    const contentId = new mongoose.Types.ObjectId();

    const module = await CourseContent.create({
      courseId,
      contentId,
      sequence: 1,
      isRequired: true,
      isActive: true,
      metadata: {
        title: 'Test Module with Content',
        type: 'video'
      }
    });

    expect(module._id).toBeDefined();
    expect(module.contentId?.toString()).toBe(contentId.toString());
  });

  it('should allow multiple modules without contentId in same course', async () => {
    const courseId = new mongoose.Types.ObjectId();

    const module1 = await CourseContent.create({
      courseId,
      sequence: 1,
      isActive: true,
      metadata: { title: 'Module 1', type: 'exercise' }
    });

    const module2 = await CourseContent.create({
      courseId,
      sequence: 2,
      isActive: true,
      metadata: { title: 'Module 2', type: 'exercise' }
    });

    expect(module1._id).toBeDefined();
    expect(module2._id).toBeDefined();
    expect(module1.contentId).toBeUndefined();
    expect(module2.contentId).toBeUndefined();
  });

  it('should prevent duplicate contentId in same course', async () => {
    const courseId = new mongoose.Types.ObjectId();
    const contentId = new mongoose.Types.ObjectId();

    await CourseContent.create({
      courseId,
      contentId,
      sequence: 1,
      isActive: true,
      metadata: { title: 'Module 1', type: 'video' }
    });

    await expect(
      CourseContent.create({
        courseId,
        contentId,  // Same content in same course
        sequence: 2,
        isActive: true,
        metadata: { title: 'Module 2', type: 'video' }
      })
    ).rejects.toThrow();
  });

  it('should allow same contentId in different courses', async () => {
    const courseId1 = new mongoose.Types.ObjectId();
    const courseId2 = new mongoose.Types.ObjectId();
    const contentId = new mongoose.Types.ObjectId();

    const module1 = await CourseContent.create({
      courseId: courseId1,
      contentId,
      sequence: 1,
      isActive: true,
      metadata: { title: 'Module in Course 1', type: 'video' }
    });

    const module2 = await CourseContent.create({
      courseId: courseId2,
      contentId,  // Same content, different course - OK
      sequence: 1,
      isActive: true,
      metadata: { title: 'Module in Course 2', type: 'video' }
    });

    expect(module1._id).toBeDefined();
    expect(module2._id).toBeDefined();
  });
});
