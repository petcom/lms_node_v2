import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ContentAttempt from '@/models/content/ContentAttempt.model';
import Content from '@/models/content/Content.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('ContentAttempt Model', () => {
  let mongoServer: MongoMemoryServer;
  let testContent: any;
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
    testContent = await Content.create({
      title: 'Test Content',
      type: 'scorm'
    });

    testLearnerId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await ContentAttempt.deleteMany({});
    await Content.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create valid content attempt', async () => {
      const attempt = await ContentAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'in-progress',
        attemptNumber: 1
      });

      expect(attempt.contentId).toEqual(testContent._id);
      expect(attempt.learnerId).toEqual(testLearnerId);
      expect(attempt.status).toBe('in-progress');
      expect(attempt.attemptNumber).toBe(1);
    });

    it('should require contentId field', async () => {
      const attempt = new ContentAttempt({
        learnerId: testLearnerId,
        status: 'in-progress',
        attemptNumber: 1
      });

      await expect(attempt.save()).rejects.toThrow(/contentId/);
    });

    it('should require learnerId field', async () => {
      const attempt = new ContentAttempt({
        contentId: testContent._id,
        status: 'in-progress',
        attemptNumber: 1
      });

      await expect(attempt.save()).rejects.toThrow(/learnerId/);
    });

    it('should require status field', async () => {
      const attempt = new ContentAttempt({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1
      });

      await expect(attempt.save()).rejects.toThrow(/status/);
    });

    it('should require attemptNumber field', async () => {
      const attempt = new ContentAttempt({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'in-progress'
      });

      await expect(attempt.save()).rejects.toThrow(/attemptNumber/);
    });

    it('should validate status enum', async () => {
      const attempt = new ContentAttempt({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'invalid-status',
        attemptNumber: 1
      });

      await expect(attempt.save()).rejects.toThrow();
    });

    it('should accept valid statuses', async () => {
      const statuses = ['not-started', 'in-progress', 'completed', 'failed', 'abandoned'];

      for (const status of statuses) {
        const attempt = await ContentAttempt.create({
          contentId: testContent._id,
          learnerId: new mongoose.Types.ObjectId(),
          status,
          attemptNumber: 1
        });

        expect(attempt.status).toBe(status);
      }
    });

    it('should validate attemptNumber is positive', async () => {
      const attempt = new ContentAttempt({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'in-progress',
        attemptNumber: 0
      });

      await expect(attempt.save()).rejects.toThrow(/attemptNumber/);
    });
  });

  describe('Progress Tracking', () => {
    it('should track progress percentage', async () => {
      const attempt = await ContentAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'in-progress',
        attemptNumber: 1,
        progressPercent: 65
      });

      expect(attempt.progressPercent).toBe(65);
    });

    it('should validate progress is between 0 and 100', async () => {
      const attempt = new ContentAttempt({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'in-progress',
        attemptNumber: 1,
        progressPercent: 150
      });

      await expect(attempt.save()).rejects.toThrow(/progressPercent/);
    });

    it('should track score', async () => {
      const attempt = await ContentAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'completed',
        attemptNumber: 1,
        score: 85
      });

      expect(attempt.score).toBe(85);
    });

    it('should validate score is between 0 and 100', async () => {
      const attempt = new ContentAttempt({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'completed',
        attemptNumber: 1,
        score: -10
      });

      await expect(attempt.save()).rejects.toThrow(/score/);
    });

    it('should track time spent in seconds', async () => {
      const attempt = await ContentAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'completed',
        attemptNumber: 1,
        timeSpentSeconds: 3600
      });

      expect(attempt.timeSpentSeconds).toBe(3600);
    });

    it('should validate time spent is non-negative', async () => {
      const attempt = new ContentAttempt({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'in-progress',
        attemptNumber: 1,
        timeSpentSeconds: -100
      });

      await expect(attempt.save()).rejects.toThrow(/timeSpentSeconds/);
    });
  });

  describe('Timestamps', () => {
    it('should track start time', async () => {
      const startTime = new Date();
      const attempt = await ContentAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'in-progress',
        attemptNumber: 1,
        startedAt: startTime
      });

      expect(attempt.startedAt).toEqual(startTime);
    });

    it('should track completion time', async () => {
      const completedTime = new Date();
      const attempt = await ContentAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'completed',
        attemptNumber: 1,
        completedAt: completedTime
      });

      expect(attempt.completedAt).toEqual(completedTime);
    });

    it('should track last accessed time', async () => {
      const lastAccessed = new Date();
      const attempt = await ContentAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'in-progress',
        attemptNumber: 1,
        lastAccessedAt: lastAccessed
      });

      expect(attempt.lastAccessedAt).toEqual(lastAccessed);
    });
  });

  describe('SCORM Specific Data', () => {
    it('should store SCORM CMI data', async () => {
      const attempt = await ContentAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'in-progress',
        attemptNumber: 1,
        scormData: {
          cmi: {
            'core.lesson_status': 'incomplete',
            'core.score.raw': '75',
            'suspend_data': 'bookmark=page5'
          }
        }
      });

      expect(attempt.scormData).toBeDefined();
      expect(attempt.scormData?.cmi['core.lesson_status']).toBe('incomplete');
    });
  });

  describe('Metadata', () => {
    it('should store custom metadata', async () => {
      const attempt = await ContentAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'in-progress',
        attemptNumber: 1,
        metadata: {
          device: 'mobile',
          browser: 'Chrome',
          ipAddress: '192.168.1.1'
        }
      });

      expect(attempt.metadata).toEqual({
        device: 'mobile',
        browser: 'Chrome',
        ipAddress: '192.168.1.1'
      });
    });

    it('should auto-generate timestamps', async () => {
      const attempt = await ContentAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'in-progress',
        attemptNumber: 1
      });

      expect(attempt.createdAt).toBeDefined();
      expect(attempt.updatedAt).toBeDefined();
    });
  });

  describe('Query Methods', () => {
    it('should find attempts by learner', async () => {
      const content2 = await Content.create({ title: 'Content 2', type: 'video' });

      await ContentAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'completed',
        attemptNumber: 1
      });

      await ContentAttempt.create({
        contentId: content2._id,
        learnerId: testLearnerId,
        status: 'in-progress',
        attemptNumber: 1
      });

      const attempts = await ContentAttempt.find({ learnerId: testLearnerId });
      expect(attempts).toHaveLength(2);
    });

    it('should find attempts by content', async () => {
      const learner2 = new mongoose.Types.ObjectId();

      await ContentAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'completed',
        attemptNumber: 1
      });

      await ContentAttempt.create({
        contentId: testContent._id,
        learnerId: learner2,
        status: 'in-progress',
        attemptNumber: 1
      });

      const attempts = await ContentAttempt.find({ contentId: testContent._id });
      expect(attempts).toHaveLength(2);
    });

    it('should find by status', async () => {
      await ContentAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'completed',
        attemptNumber: 1
      });

      await ContentAttempt.create({
        contentId: testContent._id,
        learnerId: new mongoose.Types.ObjectId(),
        status: 'in-progress',
        attemptNumber: 1
      });

      const completed = await ContentAttempt.find({ status: 'completed' });
      expect(completed).toHaveLength(1);
    });

    it('should find multiple attempts for same content', async () => {
      await ContentAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'failed',
        attemptNumber: 1
      });

      await ContentAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        status: 'completed',
        attemptNumber: 2
      });

      const attempts = await ContentAttempt.find({
        contentId: testContent._id,
        learnerId: testLearnerId
      }).sort({ attemptNumber: 1 });

      expect(attempts).toHaveLength(2);
      expect(attempts[0].attemptNumber).toBe(1);
      expect(attempts[1].attemptNumber).toBe(2);
    });
  });
});
