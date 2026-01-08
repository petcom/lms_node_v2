import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import LearningEvent from '@/models/activity/LearningEvent.model';
import Content from '@/models/content/Content.model';
import Class from '@/models/academic/Class.model';
import Course from '@/models/academic/Course.model';
import Department from '@/models/organization/Department.model';
import AcademicYear from '@/models/academic/AcademicYear.model';

describe('LearningEvent Model', () => {
  let mongoServer: MongoMemoryServer;
  let testContent: any;
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
      name: 'Data Structures - Fall 2024',
      courseId: course._id,
      academicYearId: academicYear._id,
      termCode: 'FALL24',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-12-15'),
      maxEnrollment: 30
    });

    testContent = await Content.create({
      title: 'Module 1: Arrays',
      type: 'video'
    });

    testLearnerId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await LearningEvent.deleteMany({});
    await Content.deleteMany({});
    await Class.deleteMany({});
    await Course.deleteMany({});
    await AcademicYear.deleteMany({});
    await Department.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create valid learning event', async () => {
      const event = await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'content-viewed',
        contentId: testContent._id,
        timestamp: new Date()
      });

      expect(event.learnerId).toEqual(testLearnerId);
      expect(event.eventType).toBe('content-viewed');
      expect(event.contentId).toEqual(testContent._id);
      expect(event.timestamp).toBeDefined();
    });

    it('should require learnerId field', async () => {
      const event = new LearningEvent({
        eventType: 'content-viewed',
        contentId: testContent._id,
        timestamp: new Date()
      });

      await expect(event.save()).rejects.toThrow(/learnerId/);
    });

    it('should require eventType field', async () => {
      const event = new LearningEvent({
        learnerId: testLearnerId,
        contentId: testContent._id,
        timestamp: new Date()
      });

      await expect(event.save()).rejects.toThrow(/eventType/);
    });

    it('should require timestamp field', async () => {
      const event = new LearningEvent({
        learnerId: testLearnerId,
        eventType: 'content-viewed',
        contentId: testContent._id
      });

      await expect(event.save()).rejects.toThrow(/timestamp/);
    });

    it('should validate eventType enum', async () => {
      const event = new LearningEvent({
        learnerId: testLearnerId,
        eventType: 'invalid-event',
        timestamp: new Date()
      });

      await expect(event.save()).rejects.toThrow();
    });

    it('should accept valid event types', async () => {
      const eventTypes = [
        'content-viewed',
        'content-started',
        'content-completed',
        'exam-started',
        'exam-submitted',
        'video-played',
        'video-paused',
        'video-completed',
        'assignment-submitted',
        'scorm-launched',
        'scorm-exited',
        'login',
        'logout'
      ];

      for (const eventType of eventTypes) {
        const event = await LearningEvent.create({
          learnerId: testLearnerId,
          eventType,
          timestamp: new Date()
        });

        expect(event.eventType).toBe(eventType);
      }
    });
  });

  describe('Reference Fields', () => {
    it('should reference content', async () => {
      const event = await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'content-viewed',
        contentId: testContent._id,
        timestamp: new Date()
      });

      expect(event.contentId).toEqual(testContent._id);
    });

    it('should reference class', async () => {
      const event = await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'login',
        classId: testClass._id,
        timestamp: new Date()
      });

      expect(event.classId).toEqual(testClass._id);
    });

    it('should reference both content and class', async () => {
      const event = await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'content-viewed',
        contentId: testContent._id,
        classId: testClass._id,
        timestamp: new Date()
      });

      expect(event.contentId).toEqual(testContent._id);
      expect(event.classId).toEqual(testClass._id);
    });
  });

  describe('Event Data', () => {
    it('should store event data object', async () => {
      const eventData = {
        duration: 1800,
        progress: 75,
        score: 85
      };

      const event = await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'video-completed',
        contentId: testContent._id,
        timestamp: new Date(),
        data: eventData
      });

      expect(event.data).toEqual(eventData);
    });

    it('should store video playback data', async () => {
      const event = await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'video-paused',
        contentId: testContent._id,
        timestamp: new Date(),
        data: {
          currentTime: 120.5,
          totalDuration: 600,
          playbackRate: 1.0
        }
      });

      expect(event.data.currentTime).toBe(120.5);
      expect(event.data.totalDuration).toBe(600);
    });

    it('should store SCORM event data', async () => {
      const event = await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'scorm-launched',
        contentId: testContent._id,
        timestamp: new Date(),
        data: {
          scormVersion: '1.2',
          attemptNumber: 2,
          suspendData: 'bookmark:slide5'
        }
      });

      expect(event.data.scormVersion).toBe('1.2');
      expect(event.data.attemptNumber).toBe(2);
    });
  });

  describe('Session Tracking', () => {
    it('should track session ID', async () => {
      const sessionId = 'session-abc123';
      const event = await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'login',
        timestamp: new Date(),
        sessionId: sessionId
      });

      expect(event.sessionId).toBe(sessionId);
    });

    it('should track IP address', async () => {
      const event = await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'login',
        timestamp: new Date(),
        ipAddress: '192.168.1.100'
      });

      expect(event.ipAddress).toBe('192.168.1.100');
    });

    it('should track user agent', async () => {
      const event = await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'content-viewed',
        contentId: testContent._id,
        timestamp: new Date(),
        userAgent: 'Mozilla/5.0'
      });

      expect(event.userAgent).toBe('Mozilla/5.0');
    });
  });

  describe('Duration Tracking', () => {
    it('should track duration in seconds', async () => {
      const event = await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'content-completed',
        contentId: testContent._id,
        timestamp: new Date(),
        duration: 3600
      });

      expect(event.duration).toBe(3600);
    });

    it('should validate duration is non-negative', async () => {
      const event = new LearningEvent({
        learnerId: testLearnerId,
        eventType: 'content-completed',
        contentId: testContent._id,
        timestamp: new Date(),
        duration: -100
      });

      await expect(event.save()).rejects.toThrow(/duration/);
    });
  });

  describe('Metadata', () => {
    it('should store custom metadata', async () => {
      const event = await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'exam-submitted',
        contentId: testContent._id,
        timestamp: new Date(),
        metadata: {
          browser: 'Chrome',
          device: 'desktop',
          location: 'campus-lab'
        }
      });

      expect(event.metadata).toEqual({
        browser: 'Chrome',
        device: 'desktop',
        location: 'campus-lab'
      });
    });

    it('should auto-generate timestamps', async () => {
      const event = await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'login',
        timestamp: new Date()
      });

      expect(event.createdAt).toBeDefined();
      expect(event.updatedAt).toBeDefined();
    });
  });

  describe('Query Methods', () => {
    it('should find events by learner', async () => {
      await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'login',
        timestamp: new Date()
      });

      const events = await LearningEvent.find({ learnerId: testLearnerId });
      expect(events).toHaveLength(1);
    });

    it('should find events by event type', async () => {
      await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'content-viewed',
        contentId: testContent._id,
        timestamp: new Date()
      });

      await LearningEvent.create({
        learnerId: new mongoose.Types.ObjectId(),
        eventType: 'content-viewed',
        contentId: testContent._id,
        timestamp: new Date()
      });

      const events = await LearningEvent.find({ eventType: 'content-viewed' });
      expect(events).toHaveLength(2);
    });

    it('should find events by content', async () => {
      await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'content-viewed',
        contentId: testContent._id,
        timestamp: new Date()
      });

      const events = await LearningEvent.find({ contentId: testContent._id });
      expect(events).toHaveLength(1);
    });

    it('should find events by class', async () => {
      await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'content-viewed',
        contentId: testContent._id,
        classId: testClass._id,
        timestamp: new Date()
      });

      const events = await LearningEvent.find({ classId: testClass._id });
      expect(events).toHaveLength(1);
    });

    it('should find events by timestamp range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'login',
        timestamp: now
      });

      const events = await LearningEvent.find({
        timestamp: { $gte: yesterday, $lte: tomorrow }
      });

      expect(events).toHaveLength(1);
    });

    it('should sort events by timestamp descending', async () => {
      const time1 = new Date('2024-09-01T10:00:00Z');
      const time2 = new Date('2024-09-01T11:00:00Z');
      const time3 = new Date('2024-09-01T12:00:00Z');

      await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'login',
        timestamp: time2
      });

      await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'content-viewed',
        contentId: testContent._id,
        timestamp: time3
      });

      await LearningEvent.create({
        learnerId: testLearnerId,
        eventType: 'logout',
        timestamp: time1
      });

      const events = await LearningEvent.find({ learnerId: testLearnerId }).sort({
        timestamp: -1
      });

      expect(events[0].timestamp).toEqual(time3);
      expect(events[1].timestamp).toEqual(time2);
      expect(events[2].timestamp).toEqual(time1);
    });
  });
});
