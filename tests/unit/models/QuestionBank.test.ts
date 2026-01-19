import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import QuestionBank from '@/models/assessment/QuestionBank.model';
import Question from '@/models/assessment/Question.model';
import Department from '@/models/organization/Department.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('QuestionBank Model', () => {
  let mongoServer: MongoMemoryServer;
  let testDept: any;
  let testQuestion1: any;
  let testQuestion2: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    testDept = await Department.create({
      name: 'Engineering',
      code: 'ENG'
    });

    testQuestion1 = await Question.create({
      questionText: 'What is 2 + 2?',
      questionType: 'multiple-choice',
      departmentId: testDept._id,
      points: 5
    });

    testQuestion2 = await Question.create({
      questionText: 'Define recursion',
      questionType: 'short-answer',
      departmentId: testDept._id,
      points: 10
    });
  });

  afterEach(async () => {
    await QuestionBank.deleteMany({});
    await Question.deleteMany({});
    await Department.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create valid question bank', async () => {
      const bank = await QuestionBank.create({
        name: 'Midterm Question Pool',
        departmentId: testDept._id,
        questionIds: [testQuestion1._id, testQuestion2._id]
      });

      expect(bank.name).toBe('Midterm Question Pool');
      expect(bank.questionIds).toHaveLength(2);
    });

    it('should require name field', async () => {
      const bank = new QuestionBank({
        departmentId: testDept._id,
        questionIds: [testQuestion1._id]
      });

      await expect(bank.save()).rejects.toThrow(/name/);
    });

    it('should require departmentId field', async () => {
      const bank = new QuestionBank({
        name: 'Test Bank',
        questionIds: [testQuestion1._id]
      });

      await expect(bank.save()).rejects.toThrow(/departmentId/);
    });

    it('should allow empty question list', async () => {
      const bank = await QuestionBank.create({
        name: 'Empty Bank',
        departmentId: testDept._id,
        questionIds: []
      });

      expect(bank.questionIds).toHaveLength(0);
    });
  });

  describe('Question Management', () => {
    it('should store multiple question references', async () => {
      const bank = await QuestionBank.create({
        name: 'Math Questions',
        departmentId: testDept._id,
        questionIds: [testQuestion1._id, testQuestion2._id]
      });

      expect(bank.questionIds).toHaveLength(2);
      expect(bank.questionIds[0]).toEqual(testQuestion1._id);
      expect(bank.questionIds[1]).toEqual(testQuestion2._id);
    });

    it('should allow adding questions', async () => {
      const bank = await QuestionBank.create({
        name: 'Test Bank',
        departmentId: testDept._id,
        questionIds: [testQuestion1._id]
      });

      bank.questionIds.push(testQuestion2._id);
      await bank.save();

      expect(bank.questionIds).toHaveLength(2);
    });
  });

  describe('Metadata Fields', () => {
    it('should store description', async () => {
      const bank = await QuestionBank.create({
        name: 'Final Exam Pool',
        departmentId: testDept._id,
        description: 'Questions for final exam',
        questionIds: []
      });

      expect(bank.description).toBe('Questions for final exam');
    });

    it('should store tags', async () => {
      const bank = await QuestionBank.create({
        name: 'Algorithm Bank',
        departmentId: testDept._id,
        questionIds: [],
        tags: ['algorithms', 'data-structures', 'advanced']
      });

      expect(bank.tags).toEqual(['algorithms', 'data-structures', 'advanced']);
    });

    it('should default to active', async () => {
      const bank = await QuestionBank.create({
        name: 'Test Bank',
        departmentId: testDept._id,
        questionIds: []
      });

      expect(bank.isActive).toBe(true);
    });

    it('should allow deactivation', async () => {
      const bank = await QuestionBank.create({
        name: 'Old Bank',
        departmentId: testDept._id,
        questionIds: [],
        isActive: false
      });

      expect(bank.isActive).toBe(false);
    });

    it('should store custom metadata', async () => {
      const bank = await QuestionBank.create({
        name: 'Test Bank',
        departmentId: testDept._id,
        questionIds: [],
        metadata: {
          lastReviewed: '2024-09-15',
          reviewer: 'Dr. Smith'
        }
      });

      expect(bank.metadata).toEqual({
        lastReviewed: '2024-09-15',
        reviewer: 'Dr. Smith'
      });
    });

    it('should auto-generate timestamps', async () => {
      const bank = await QuestionBank.create({
        name: 'Test Bank',
        departmentId: testDept._id,
        questionIds: []
      });

      expect(bank.createdAt).toBeDefined();
      expect(bank.updatedAt).toBeDefined();
    });
  });

  describe('Query Methods', () => {
    it('should find banks by department', async () => {
      await QuestionBank.create({
        name: 'Bank 1',
        departmentId: testDept._id,
        questionIds: []
      });

      const banks = await QuestionBank.find({ departmentId: testDept._id });
      expect(banks).toHaveLength(1);
    });

    it('should find active banks only', async () => {
      await QuestionBank.create({
        name: 'Active Bank',
        departmentId: testDept._id,
        questionIds: [],
        isActive: true
      });

      await QuestionBank.create({
        name: 'Inactive Bank',
        departmentId: testDept._id,
        questionIds: [],
        isActive: false
      });

      const activeBanks = await QuestionBank.find({ isActive: true });
      expect(activeBanks).toHaveLength(1);
    });

    it('should find banks by tags', async () => {
      await QuestionBank.create({
        name: 'Tagged Bank',
        departmentId: testDept._id,
        questionIds: [],
        tags: ['algorithms', 'sorting']
      });

      const banks = await QuestionBank.find({ tags: 'algorithms' });
      expect(banks).toHaveLength(1);
    });

    it('should populate question references', async () => {
      const bank = await QuestionBank.create({
        name: 'Test Bank',
        departmentId: testDept._id,
        questionIds: [testQuestion1._id, testQuestion2._id]
      });

      const populatedBank = await QuestionBank.findById(bank._id).populate('questionIds');
      
      expect(populatedBank?.questionIds).toHaveLength(2);
    });
  });
});
