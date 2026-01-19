import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Content from '@/models/content/Content.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Content Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Content.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create valid SCORM content', async () => {
      const content = await Content.create({
        title: 'Introduction to Programming',
        type: 'scorm',
        scormData: {
          version: '1.2',
          manifestPath: '/scorm/manifest.xml',
          launchPath: '/scorm/index.html'
        },
        isActive: true
      });

      expect(content.title).toBe('Introduction to Programming');
      expect(content.type).toBe('scorm');
      expect(content.scormData?.version).toBe('1.2');
      expect(content.isActive).toBe(true);
    });

    it('should create valid video content', async () => {
      const content = await Content.create({
        title: 'Lecture 1',
        type: 'video',
        fileUrl: 'https://example.com/video.mp4',
        duration: 3600,
        isActive: true
      });

      expect(content.type).toBe('video');
      expect(content.fileUrl).toBe('https://example.com/video.mp4');
      expect(content.duration).toBe(3600);
    });

    it('should create valid document content', async () => {
      const content = await Content.create({
        title: 'Course Syllabus',
        type: 'document',
        fileUrl: 'https://example.com/syllabus.pdf',
        mimeType: 'application/pdf',
        isActive: true
      });

      expect(content.type).toBe('document');
      expect(content.mimeType).toBe('application/pdf');
    });

    it('should create valid quiz content', async () => {
      const content = await Content.create({
        title: 'Chapter 1 Quiz',
        type: 'quiz',
        quizData: {
          passingScore: 70,
          timeLimit: 1800,
          randomizeQuestions: true,
          showCorrectAnswers: false
        },
        isActive: true
      });

      expect(content.type).toBe('quiz');
      expect(content.quizData?.passingScore).toBe(70);
      expect(content.quizData?.timeLimit).toBe(1800);
    });

    it('should require title field', async () => {
      const content = new Content({
        type: 'video'
      });

      await expect(content.save()).rejects.toThrow(/title/);
    });

    it('should require type field', async () => {
      const content = new Content({
        title: 'Test Content'
      });

      await expect(content.save()).rejects.toThrow(/type/);
    });

    it('should validate type enum', async () => {
      const content = new Content({
        title: 'Test',
        type: 'invalid-type'
      });

      await expect(content.save()).rejects.toThrow();
    });

    it('should accept valid content types', async () => {
      const types = ['scorm', 'video', 'document', 'quiz', 'assignment', 'external-link', 'text'];

      for (const type of types) {
        const content = await Content.create({
          title: `${type} content`,
          type
        });

        expect(content.type).toBe(type);
      }
    });

    it('should trim whitespace', async () => {
      const content = await Content.create({
        title: '  Test Content  ',
        type: 'video'
      });

      expect(content.title).toBe('Test Content');
    });
  });

  describe('SCORM Specific Fields', () => {
    it('should store SCORM data', async () => {
      const content = await Content.create({
        title: 'SCORM Module',
        type: 'scorm',
        scormData: {
          version: '2004',
          manifestPath: '/content/manifest.xml',
          launchPath: '/content/index.html',
          masteryScore: 80
        }
      });

      expect(content.scormData).toBeDefined();
      expect(content.scormData?.version).toBe('2004');
      expect(content.scormData?.masteryScore).toBe(80);
    });
  });

  describe('File Management', () => {
    it('should store file URL', async () => {
      const content = await Content.create({
        title: 'Video Lecture',
        type: 'video',
        fileUrl: 'https://cdn.example.com/videos/lecture1.mp4'
      });

      expect(content.fileUrl).toBe('https://cdn.example.com/videos/lecture1.mp4');
    });

    it('should store file size', async () => {
      const content = await Content.create({
        title: 'Large Video',
        type: 'video',
        fileUrl: 'https://example.com/video.mp4',
        fileSize: 524288000 // 500 MB
      });

      expect(content.fileSize).toBe(524288000);
    });

    it('should store mime type', async () => {
      const content = await Content.create({
        title: 'PDF Document',
        type: 'document',
        fileUrl: 'https://example.com/doc.pdf',
        mimeType: 'application/pdf'
      });

      expect(content.mimeType).toBe('application/pdf');
    });

    it('should validate file size is non-negative', async () => {
      const content = new Content({
        title: 'Test',
        type: 'video',
        fileSize: -1
      });

      await expect(content.save()).rejects.toThrow(/fileSize/);
    });
  });

  describe('Duration and Timing', () => {
    it('should store duration in seconds', async () => {
      const content = await Content.create({
        title: 'Video',
        type: 'video',
        duration: 7200 // 2 hours
      });

      expect(content.duration).toBe(7200);
    });

    it('should validate duration is non-negative', async () => {
      const content = new Content({
        title: 'Test',
        type: 'video',
        duration: -10
      });

      await expect(content.save()).rejects.toThrow(/duration/);
    });
  });

  describe('Metadata', () => {
    it('should set default isActive to true', async () => {
      const content = await Content.create({
        title: 'Test',
        type: 'video'
      });

      expect(content.isActive).toBe(true);
    });

    it('should store description', async () => {
      const content = await Content.create({
        title: 'Course Introduction',
        type: 'video',
        description: 'This video introduces the course objectives and structure'
      });

      expect(content.description).toBe('This video introduces the course objectives and structure');
    });

    it('should store custom metadata', async () => {
      const content = await Content.create({
        title: 'Advanced Topic',
        type: 'video',
        metadata: {
          difficulty: 'advanced',
          tags: ['programming', 'algorithms'],
          language: 'en'
        }
      });

      expect(content.metadata).toEqual({
        difficulty: 'advanced',
        tags: ['programming', 'algorithms'],
        language: 'en'
      });
    });

    it('should auto-generate timestamps', async () => {
      const content = await Content.create({
        title: 'Test',
        type: 'video'
      });

      expect(content.createdAt).toBeDefined();
      expect(content.updatedAt).toBeDefined();
    });
  });

  describe('Creator Tracking', () => {
    it('should store creator ID', async () => {
      const creatorId = new mongoose.Types.ObjectId();
      const content = await Content.create({
        title: 'My Content',
        type: 'video',
        createdBy: creatorId
      });

      expect(content.createdBy).toEqual(creatorId);
    });

    it('should store updater ID', async () => {
      const updaterId = new mongoose.Types.ObjectId();
      const content = await Content.create({
        title: 'My Content',
        type: 'video',
        updatedBy: updaterId
      });

      expect(content.updatedBy).toEqual(updaterId);
    });
  });

  describe('Query Methods', () => {
    it('should find by type', async () => {
      await Content.create({ title: 'Video 1', type: 'video' });
      await Content.create({ title: 'Video 2', type: 'video' });
      await Content.create({ title: 'Doc 1', type: 'document' });

      const videos = await Content.find({ type: 'video' });
      expect(videos).toHaveLength(2);
    });

    it('should find active content', async () => {
      await Content.create({ title: 'Active', type: 'video', isActive: true });
      await Content.create({ title: 'Inactive', type: 'video', isActive: false });

      const active = await Content.find({ isActive: true });
      expect(active).toHaveLength(1);
      expect(active[0].title).toBe('Active');
    });

    it('should find by creator', async () => {
      const creator1 = new mongoose.Types.ObjectId();
      const creator2 = new mongoose.Types.ObjectId();

      await Content.create({ title: 'Content 1', type: 'video', createdBy: creator1 });
      await Content.create({ title: 'Content 2', type: 'video', createdBy: creator1 });
      await Content.create({ title: 'Content 3', type: 'video', createdBy: creator2 });

      const creator1Content = await Content.find({ createdBy: creator1 });
      expect(creator1Content).toHaveLength(2);
    });
  });
});
