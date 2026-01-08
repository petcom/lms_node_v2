import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ScormAttempt from '@/models/activity/ScormAttempt.model';
import Content from '@/models/content/Content.model';
import Department from '@/models/organization/Department.model';

describe('ScormAttempt Model', () => {
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
    const dept = await Department.create({
      name: 'Engineering',
      code: 'ENG'
    });

    testContent = await Content.create({
      title: 'Introduction to Programming',
      type: 'scorm',
      scormData: {
        version: '1.2',
        manifestPath: '/manifest.xml',
        launchPath: '/index.html'
      }
    });

    testLearnerId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await ScormAttempt.deleteMany({});
    await Content.deleteMany({});
    await Department.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create valid SCORM attempt', async () => {
      const attempt = await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'not-attempted'
      });

      expect(attempt.contentId).toEqual(testContent._id);
      expect(attempt.learnerId).toEqual(testLearnerId);
      expect(attempt.attemptNumber).toBe(1);
      expect(attempt.scormVersion).toBe('1.2');
      expect(attempt.status).toBe('not-attempted');
    });

    it('should require contentId field', async () => {
      const attempt = new ScormAttempt({
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'not-attempted'
      });

      await expect(attempt.save()).rejects.toThrow(/contentId/);
    });

    it('should require learnerId field', async () => {
      const attempt = new ScormAttempt({
        contentId: testContent._id,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'not-attempted'
      });

      await expect(attempt.save()).rejects.toThrow(/learnerId/);
    });

    it('should require attemptNumber field', async () => {
      const attempt = new ScormAttempt({
        contentId: testContent._id,
        learnerId: testLearnerId,
        scormVersion: '1.2',
        status: 'not-attempted'
      });

      await expect(attempt.save()).rejects.toThrow(/attemptNumber/);
    });

    it('should require scormVersion field', async () => {
      const attempt = new ScormAttempt({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'not-attempted'
      });

      await expect(attempt.save()).rejects.toThrow(/scormVersion/);
    });

    it('should require status field', async () => {
      const attempt = new ScormAttempt({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2'
      });

      await expect(attempt.save()).rejects.toThrow(/status/);
    });

    it('should validate scormVersion enum', async () => {
      const attempt = new ScormAttempt({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '3.0',
        status: 'not-attempted'
      });

      await expect(attempt.save()).rejects.toThrow();
    });

    it('should accept valid SCORM versions', async () => {
      const versions = ['1.2', '2004'];

      for (const version of versions) {
        const attempt = await ScormAttempt.create({
          contentId: testContent._id,
          learnerId: new mongoose.Types.ObjectId(),
          attemptNumber: 1,
          scormVersion: version,
          status: 'not-attempted'
        });

        expect(attempt.scormVersion).toBe(version);
      }
    });

    it('should validate status enum', async () => {
      const attempt = new ScormAttempt({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'invalid-status'
      });

      await expect(attempt.save()).rejects.toThrow();
    });

    it('should accept valid statuses', async () => {
      const statuses = ['not-attempted', 'incomplete', 'completed', 'passed', 'failed', 'browsed', 'abandoned'];

      for (const status of statuses) {
        const attempt = await ScormAttempt.create({
          contentId: testContent._id,
          learnerId: new mongoose.Types.ObjectId(),
          attemptNumber: 1,
          scormVersion: '1.2',
          status
        });

        expect(attempt.status).toBe(status);
      }
    });

    it('should validate attemptNumber is positive', async () => {
      const attempt = new ScormAttempt({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 0,
        scormVersion: '1.2',
        status: 'not-attempted'
      });

      await expect(attempt.save()).rejects.toThrow(/attemptNumber/);
    });
  });

  describe('Score Tracking', () => {
    it('should track raw score', async () => {
      const attempt = await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'completed',
        scoreRaw: 85
      });

      expect(attempt.scoreRaw).toBe(85);
    });

    it('should track min score', async () => {
      const attempt = await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'completed',
        scoreMin: 0
      });

      expect(attempt.scoreMin).toBe(0);
    });

    it('should track max score', async () => {
      const attempt = await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'completed',
        scoreMax: 100
      });

      expect(attempt.scoreMax).toBe(100);
    });

    it('should track scaled score', async () => {
      const attempt = await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '2004',
        status: 'completed',
        scoreScaled: 0.85
      });

      expect(attempt.scoreScaled).toBe(0.85);
    });

    it('should validate scoreScaled is between -1 and 1', async () => {
      const attempt = new ScormAttempt({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '2004',
        status: 'completed',
        scoreScaled: 1.5
      });

      await expect(attempt.save()).rejects.toThrow(/scoreScaled/);
    });
  });

  describe('Time Tracking', () => {
    it('should track session time', async () => {
      const attempt = await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'incomplete',
        sessionTime: 1800
      });

      expect(attempt.sessionTime).toBe(1800);
    });

    it('should track total time', async () => {
      const attempt = await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'incomplete',
        totalTime: 3600
      });

      expect(attempt.totalTime).toBe(3600);
    });

    it('should validate time fields are non-negative', async () => {
      const attempt = new ScormAttempt({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'incomplete',
        sessionTime: -100
      });

      await expect(attempt.save()).rejects.toThrow(/sessionTime/);
    });
  });

  describe('Progress Tracking', () => {
    it('should track progress measure', async () => {
      const attempt = await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '2004',
        status: 'incomplete',
        progressMeasure: 0.65
      });

      expect(attempt.progressMeasure).toBe(0.65);
    });

    it('should validate progressMeasure is between 0 and 1', async () => {
      const attempt = new ScormAttempt({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '2004',
        status: 'incomplete',
        progressMeasure: 1.5
      });

      await expect(attempt.save()).rejects.toThrow(/progressMeasure/);
    });

    it('should track completion status', async () => {
      const attempt = await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'completed',
        completionStatus: 'completed'
      });

      expect(attempt.completionStatus).toBe('completed');
    });

    it('should track success status', async () => {
      const attempt = await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'passed',
        successStatus: 'passed'
      });

      expect(attempt.successStatus).toBe('passed');
    });
  });

  describe('CMI Data Storage', () => {
    it('should store CMI data object', async () => {
      const cmiData = {
        'cmi.core.lesson_status': 'completed',
        'cmi.core.score.raw': '85',
        'cmi.core.score.min': '0',
        'cmi.core.score.max': '100',
        'cmi.suspend_data': 'bookmark:page5'
      };

      const attempt = await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'completed',
        cmiData: cmiData
      });

      expect(attempt.cmiData).toEqual(cmiData);
    });

    it('should store suspend data', async () => {
      const attempt = await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'incomplete',
        suspendData: 'currentSlide:15;quiz:started'
      });

      expect(attempt.suspendData).toBe('currentSlide:15;quiz:started');
    });

    it('should store launch data', async () => {
      const attempt = await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'not-attempted',
        launchData: 'mode:normal;language:en'
      });

      expect(attempt.launchData).toBe('mode:normal;language:en');
    });

    it('should store location', async () => {
      const attempt = await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'incomplete',
        location: 'module3.page12'
      });

      expect(attempt.location).toBe('module3.page12');
    });
  });

  describe('Session Management', () => {
    it('should track start timestamp', async () => {
      const startTime = new Date('2024-09-01T10:00:00Z');
      const attempt = await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'incomplete',
        startedAt: startTime
      });

      expect(attempt.startedAt).toEqual(startTime);
    });

    it('should track last accessed timestamp', async () => {
      const lastAccessed = new Date('2024-09-01T11:30:00Z');
      const attempt = await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'incomplete',
        lastAccessedAt: lastAccessed
      });

      expect(attempt.lastAccessedAt).toEqual(lastAccessed);
    });

    it('should track completion timestamp', async () => {
      const completedTime = new Date('2024-09-01T12:00:00Z');
      const attempt = await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'completed',
        completedAt: completedTime
      });

      expect(attempt.completedAt).toEqual(completedTime);
    });
  });

  describe('Metadata', () => {
    it('should store custom metadata', async () => {
      const attempt = await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'incomplete',
        metadata: {
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          device: 'desktop'
        }
      });

      expect(attempt.metadata).toEqual({
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        device: 'desktop'
      });
    });

    it('should auto-generate timestamps', async () => {
      const attempt = await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'not-attempted'
      });

      expect(attempt.createdAt).toBeDefined();
      expect(attempt.updatedAt).toBeDefined();
    });
  });

  describe('Query Methods', () => {
    it('should find attempts by content', async () => {
      await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'completed'
      });

      const attempts = await ScormAttempt.find({ contentId: testContent._id });
      expect(attempts).toHaveLength(1);
    });

    it('should find attempts by learner', async () => {
      await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'completed'
      });

      const attempts = await ScormAttempt.find({ learnerId: testLearnerId });
      expect(attempts).toHaveLength(1);
    });

    it('should find attempts by status', async () => {
      await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'completed'
      });

      await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: new mongoose.Types.ObjectId(),
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'incomplete'
      });

      const completed = await ScormAttempt.find({ status: 'completed' });
      expect(completed).toHaveLength(1);
    });

    it('should find latest attempt by learner and content', async () => {
      await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        scormVersion: '1.2',
        status: 'completed'
      });

      await ScormAttempt.create({
        contentId: testContent._id,
        learnerId: testLearnerId,
        attemptNumber: 2,
        scormVersion: '1.2',
        status: 'incomplete'
      });

      const latest = await ScormAttempt.findOne({
        contentId: testContent._id,
        learnerId: testLearnerId
      }).sort({ attemptNumber: -1 });

      expect(latest?.attemptNumber).toBe(2);
    });
  });
});
