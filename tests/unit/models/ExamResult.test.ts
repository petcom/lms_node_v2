import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ExamResult from '@/models/activity/ExamResult.model';
import Content from '@/models/content/Content.model';
import Department from '@/models/organization/Department.model';

describe('ExamResult Model', () => {
  let mongoServer: MongoMemoryServer;
  let testExam: any;
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

    testExam = await Content.create({
      title: 'Midterm Exam',
      type: 'quiz',
      quizData: {
        passingScore: 70,
        timeLimit: 3600
      }
    });

    testLearnerId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await ExamResult.deleteMany({});
    await Content.deleteMany({});
    await Department.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create valid exam result', async () => {
      const result = await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'completed',
        score: 85,
        maxScore: 100
      });

      expect(result.examId).toEqual(testExam._id);
      expect(result.learnerId).toEqual(testLearnerId);
      expect(result.attemptNumber).toBe(1);
      expect(result.status).toBe('completed');
      expect(result.score).toBe(85);
      expect(result.maxScore).toBe(100);
    });

    it('should require examId field', async () => {
      const result = new ExamResult({
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'completed',
        score: 85,
        maxScore: 100
      });

      await expect(result.save()).rejects.toThrow(/examId/);
    });

    it('should require learnerId field', async () => {
      const result = new ExamResult({
        examId: testExam._id,
        attemptNumber: 1,
        status: 'completed',
        score: 85,
        maxScore: 100
      });

      await expect(result.save()).rejects.toThrow(/learnerId/);
    });

    it('should require attemptNumber field', async () => {
      const result = new ExamResult({
        examId: testExam._id,
        learnerId: testLearnerId,
        status: 'completed',
        score: 85,
        maxScore: 100
      });

      await expect(result.save()).rejects.toThrow(/attemptNumber/);
    });

    it('should require status field', async () => {
      const result = new ExamResult({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        score: 85,
        maxScore: 100
      });

      await expect(result.save()).rejects.toThrow(/status/);
    });

    it('should require score field', async () => {
      const result = new ExamResult({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'completed',
        maxScore: 100
      });

      await expect(result.save()).rejects.toThrow(/score/);
    });

    it('should require maxScore field', async () => {
      const result = new ExamResult({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'completed',
        score: 85
      });

      await expect(result.save()).rejects.toThrow(/maxScore/);
    });

    it('should validate status enum', async () => {
      const result = new ExamResult({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'invalid-status',
        score: 85,
        maxScore: 100
      });

      await expect(result.save()).rejects.toThrow();
    });

    it('should accept valid statuses', async () => {
      const statuses = ['in-progress', 'completed', 'graded', 'submitted'];

      for (const status of statuses) {
        const result = await ExamResult.create({
          examId: testExam._id,
          learnerId: new mongoose.Types.ObjectId(),
          attemptNumber: 1,
          status,
          score: 85,
          maxScore: 100
        });

        expect(result.status).toBe(status);
      }
    });

    it('should validate attemptNumber is positive', async () => {
      const result = new ExamResult({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 0,
        status: 'completed',
        score: 85,
        maxScore: 100
      });

      await expect(result.save()).rejects.toThrow(/attemptNumber/);
    });

    it('should validate score is non-negative', async () => {
      const result = new ExamResult({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'completed',
        score: -5,
        maxScore: 100
      });

      await expect(result.save()).rejects.toThrow(/score/);
    });

    it('should validate maxScore is positive', async () => {
      const result = new ExamResult({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'completed',
        score: 85,
        maxScore: 0
      });

      await expect(result.save()).rejects.toThrow(/maxScore/);
    });
  });

  describe('Score Calculations', () => {
    it('should calculate percentage score', async () => {
      const result = await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'graded',
        score: 85,
        maxScore: 100,
        percentage: 85.0
      });

      expect(result.percentage).toBe(85.0);
    });

    it('should track passing status', async () => {
      const result = await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'graded',
        score: 85,
        maxScore: 100,
        passed: true
      });

      expect(result.passed).toBe(true);
    });

    it('should track grade letter', async () => {
      const result = await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'graded',
        score: 85,
        maxScore: 100,
        gradeLetter: 'B'
      });

      expect(result.gradeLetter).toBe('B');
    });
  });

  describe('Answer Storage', () => {
    it('should store learner answers', async () => {
      const answers = {
        q1: 'A',
        q2: 'B',
        q3: ['A', 'C'],
        q4: 'Short answer text'
      };

      const result = await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'submitted',
        score: 0,
        maxScore: 100,
        answers: answers
      });

      expect(result.answers).toEqual(answers);
    });

    it('should store question scores', async () => {
      const questionScores = {
        q1: { earned: 5, possible: 5 },
        q2: { earned: 3, possible: 5 },
        q3: { earned: 10, possible: 10 },
        q4: { earned: 8, possible: 10 }
      };

      const result = await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'graded',
        score: 26,
        maxScore: 30,
        questionScores: questionScores
      });

      expect(result.questionScores).toEqual(questionScores);
    });
  });

  describe('Time Tracking', () => {
    it('should track start time', async () => {
      const startTime = new Date('2024-09-15T10:00:00Z');
      const result = await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'in-progress',
        score: 0,
        maxScore: 100,
        startedAt: startTime
      });

      expect(result.startedAt).toEqual(startTime);
    });

    it('should track submission time', async () => {
      const submitTime = new Date('2024-09-15T11:00:00Z');
      const result = await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'submitted',
        score: 0,
        maxScore: 100,
        submittedAt: submitTime
      });

      expect(result.submittedAt).toEqual(submitTime);
    });

    it('should track grading time', async () => {
      const gradeTime = new Date('2024-09-15T14:00:00Z');
      const result = await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'graded',
        score: 85,
        maxScore: 100,
        gradedAt: gradeTime
      });

      expect(result.gradedAt).toEqual(gradeTime);
    });

    it('should track time spent', async () => {
      const result = await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'completed',
        score: 85,
        maxScore: 100,
        timeSpent: 3240
      });

      expect(result.timeSpent).toBe(3240);
    });
  });

  describe('Grading Information', () => {
    it('should track grader', async () => {
      const graderId = new mongoose.Types.ObjectId();
      const result = await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'graded',
        score: 85,
        maxScore: 100,
        gradedBy: graderId
      });

      expect(result.gradedBy).toEqual(graderId);
    });

    it('should store feedback', async () => {
      const result = await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'graded',
        score: 85,
        maxScore: 100,
        feedback: 'Good work! Review material on async programming.'
      });

      expect(result.feedback).toBe('Good work! Review material on async programming.');
    });

    it('should store question feedback', async () => {
      const questionFeedback = {
        q1: 'Correct!',
        q2: 'Partially correct. Missing edge case.',
        q3: 'Excellent reasoning.',
        q4: 'See lecture notes on recursion.'
      };

      const result = await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'graded',
        score: 85,
        maxScore: 100,
        questionFeedback: questionFeedback
      });

      expect(result.questionFeedback).toEqual(questionFeedback);
    });
  });

  describe('Metadata', () => {
    it('should store custom metadata', async () => {
      const result = await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'completed',
        score: 85,
        maxScore: 100,
        metadata: {
          ipAddress: '192.168.1.50',
          browser: 'Chrome',
          proctored: true
        }
      });

      expect(result.metadata).toEqual({
        ipAddress: '192.168.1.50',
        browser: 'Chrome',
        proctored: true
      });
    });

    it('should auto-generate timestamps', async () => {
      const result = await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'completed',
        score: 85,
        maxScore: 100
      });

      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('Query Methods', () => {
    it('should find results by exam', async () => {
      await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'graded',
        score: 85,
        maxScore: 100
      });

      const results = await ExamResult.find({ examId: testExam._id });
      expect(results).toHaveLength(1);
    });

    it('should find results by learner', async () => {
      await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'graded',
        score: 85,
        maxScore: 100
      });

      const results = await ExamResult.find({ learnerId: testLearnerId });
      expect(results).toHaveLength(1);
    });

    it('should find results by status', async () => {
      await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'graded',
        score: 85,
        maxScore: 100
      });

      await ExamResult.create({
        examId: testExam._id,
        learnerId: new mongoose.Types.ObjectId(),
        attemptNumber: 1,
        status: 'submitted',
        score: 0,
        maxScore: 100
      });

      const graded = await ExamResult.find({ status: 'graded' });
      expect(graded).toHaveLength(1);
    });

    it('should find latest attempt by learner and exam', async () => {
      await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 1,
        status: 'graded',
        score: 75,
        maxScore: 100
      });

      await ExamResult.create({
        examId: testExam._id,
        learnerId: testLearnerId,
        attemptNumber: 2,
        status: 'graded',
        score: 85,
        maxScore: 100
      });

      const latest = await ExamResult.findOne({
        examId: testExam._id,
        learnerId: testLearnerId
      }).sort({ attemptNumber: -1 });

      expect(latest?.attemptNumber).toBe(2);
      expect(latest?.score).toBe(85);
    });
  });
});
