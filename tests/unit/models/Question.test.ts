import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Question from '@/models/assessment/Question.model';
import Department from '@/models/organization/Department.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Question Model', () => {
  let mongoServer: MongoMemoryServer;
  let testDept: any;

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
  });

  afterEach(async () => {
    await Question.deleteMany({});
    await Department.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create valid question', async () => {
      const question = await Question.create({
        questionText: 'What is 2 + 2?',
        questionType: 'multiple-choice',
        departmentId: testDept._id,
        points: 5
      });

      expect(question.questionText).toBe('What is 2 + 2?');
      expect(question.questionType).toBe('multiple-choice');
      expect(question.points).toBe(5);
    });

    it('should require questionText field', async () => {
      const question = new Question({
        questionType: 'multiple-choice',
        departmentId: testDept._id,
        points: 5
      });

      await expect(question.save()).rejects.toThrow(/questionText/);
    });

    it('should require questionType field', async () => {
      const question = new Question({
        questionText: 'What is 2 + 2?',
        departmentId: testDept._id,
        points: 5
      });

      await expect(question.save()).rejects.toThrow(/questionType/);
    });

    it('should require departmentId field', async () => {
      const question = new Question({
        questionText: 'What is 2 + 2?',
        questionType: 'multiple-choice',
        points: 5
      });

      await expect(question.save()).rejects.toThrow(/departmentId/);
    });

    it('should require points field', async () => {
      const question = new Question({
        questionText: 'What is 2 + 2?',
        questionType: 'multiple-choice',
        departmentId: testDept._id
      });

      await expect(question.save()).rejects.toThrow(/points/);
    });

    it('should validate questionType enum', async () => {
      const question = new Question({
        questionText: 'Test question',
        questionType: 'invalid-type',
        departmentId: testDept._id,
        points: 5
      });

      await expect(question.save()).rejects.toThrow();
    });

    it('should accept valid question types', async () => {
      const types = ['multiple-choice', 'true-false', 'short-answer', 'essay', 'fill-blank', 'matching'];

      for (const type of types) {
        const question = await Question.create({
          questionText: `Question of type ${type}`,
          questionType: type,
          departmentId: testDept._id,
          points: 5
        });

        expect(question.questionType).toBe(type);
      }
    });

    it('should validate points is positive', async () => {
      const question = new Question({
        questionText: 'Test question',
        questionType: 'multiple-choice',
        departmentId: testDept._id,
        points: 0
      });

      await expect(question.save()).rejects.toThrow(/points/);
    });
  });

  describe('Multiple Choice Questions', () => {
    it('should store multiple choice options', async () => {
      const question = await Question.create({
        questionText: 'What is the capital of France?',
        questionType: 'multiple-choice',
        departmentId: testDept._id,
        points: 5,
        options: ['Paris', 'London', 'Berlin', 'Madrid']
      });

      expect(question.options).toEqual(['Paris', 'London', 'Berlin', 'Madrid']);
    });

    it('should store correct answer', async () => {
      const question = await Question.create({
        questionText: 'What is 2 + 2?',
        questionType: 'multiple-choice',
        departmentId: testDept._id,
        points: 5,
        options: ['3', '4', '5', '6'],
        correctAnswer: '4'
      });

      expect(question.correctAnswer).toBe('4');
    });

    it('should store multiple correct answers', async () => {
      const question = await Question.create({
        questionText: 'Select all prime numbers',
        questionType: 'multiple-choice',
        departmentId: testDept._id,
        points: 10,
        options: ['2', '3', '4', '5', '6'],
        correctAnswers: ['2', '3', '5']
      });

      expect(question.correctAnswers).toEqual(['2', '3', '5']);
    });
  });

  describe('True/False Questions', () => {
    it('should create true/false question', async () => {
      const question = await Question.create({
        questionText: 'TypeScript is a superset of JavaScript',
        questionType: 'true-false',
        departmentId: testDept._id,
        points: 2,
        correctAnswer: 'true'
      });

      expect(question.correctAnswer).toBe('true');
    });
  });

  describe('Short Answer and Essay', () => {
    it('should create short answer question', async () => {
      const question = await Question.create({
        questionText: 'Define polymorphism',
        questionType: 'short-answer',
        departmentId: testDept._id,
        points: 10
      });

      expect(question.questionType).toBe('short-answer');
    });

    it('should create essay question with word limit', async () => {
      const question = await Question.create({
        questionText: 'Discuss the impact of cloud computing',
        questionType: 'essay',
        departmentId: testDept._id,
        points: 25,
        maxWordCount: 500
      });

      expect(question.maxWordCount).toBe(500);
    });

    it('should store model answer', async () => {
      const question = await Question.create({
        questionText: 'What is recursion?',
        questionType: 'short-answer',
        departmentId: testDept._id,
        points: 10,
        modelAnswer: 'A function that calls itself'
      });

      expect(question.modelAnswer).toBe('A function that calls itself');
    });
  });

  describe('Fill in the Blank', () => {
    it('should create fill-blank question', async () => {
      const question = await Question.create({
        questionText: 'The time complexity of binary search is ____',
        questionType: 'fill-blank',
        departmentId: testDept._id,
        points: 5,
        correctAnswer: 'O(log n)'
      });

      expect(question.correctAnswer).toBe('O(log n)');
    });

    it('should allow multiple acceptable answers', async () => {
      const question = await Question.create({
        questionText: 'JavaScript was created by ____',
        questionType: 'fill-blank',
        departmentId: testDept._id,
        points: 5,
        correctAnswers: ['Brendan Eich', 'Eich']
      });

      expect(question.correctAnswers).toEqual(['Brendan Eich', 'Eich']);
    });
  });

  describe('Matching Questions', () => {
    it('should store matching pairs', async () => {
      const question = await Question.create({
        questionText: 'Match the data structure to its operation',
        questionType: 'matching',
        departmentId: testDept._id,
        points: 10,
        matchingPairs: {
          'Stack': 'LIFO',
          'Queue': 'FIFO',
          'Array': 'Random Access'
        }
      });

      expect(question.matchingPairs).toEqual({
        'Stack': 'LIFO',
        'Queue': 'FIFO',
        'Array': 'Random Access'
      });
    });
  });

  describe('Question Metadata', () => {
    it('should store difficulty level', async () => {
      const question = await Question.create({
        questionText: 'Advanced recursion question',
        questionType: 'essay',
        departmentId: testDept._id,
        points: 20,
        difficulty: 'hard'
      });

      expect(question.difficulty).toBe('hard');
    });

    it('should validate difficulty enum', async () => {
      const question = new Question({
        questionText: 'Test',
        questionType: 'multiple-choice',
        departmentId: testDept._id,
        points: 5,
        difficulty: 'impossible'
      });

      await expect(question.save()).rejects.toThrow();
    });

    it('should store tags', async () => {
      const question = await Question.create({
        questionText: 'Test question',
        questionType: 'multiple-choice',
        departmentId: testDept._id,
        points: 5,
        tags: ['algorithms', 'sorting', 'complexity']
      });

      expect(question.tags).toEqual(['algorithms', 'sorting', 'complexity']);
    });

    it('should store explanation', async () => {
      const question = await Question.create({
        questionText: 'What is Big O notation?',
        questionType: 'short-answer',
        departmentId: testDept._id,
        points: 10,
        explanation: 'Big O describes the upper bound of time complexity'
      });

      expect(question.explanation).toBe('Big O describes the upper bound of time complexity');
    });

    it('should store hints', async () => {
      const question = await Question.create({
        questionText: 'Solve the sorting problem',
        questionType: 'essay',
        departmentId: testDept._id,
        points: 15,
        hints: ['Consider divide and conquer', 'Think about merge sort']
      });

      expect(question.hints).toEqual(['Consider divide and conquer', 'Think about merge sort']);
    });
  });

  describe('Active Status', () => {
    it('should default to active', async () => {
      const question = await Question.create({
        questionText: 'Test question',
        questionType: 'multiple-choice',
        departmentId: testDept._id,
        points: 5
      });

      expect(question.isActive).toBe(true);
    });

    it('should allow deactivation', async () => {
      const question = await Question.create({
        questionText: 'Old question',
        questionType: 'multiple-choice',
        departmentId: testDept._id,
        points: 5,
        isActive: false
      });

      expect(question.isActive).toBe(false);
    });
  });

  describe('Metadata Field', () => {
    it('should store custom metadata', async () => {
      const question = await Question.create({
        questionText: 'Test question',
        questionType: 'multiple-choice',
        departmentId: testDept._id,
        points: 5,
        metadata: {
          source: 'Textbook Chapter 5',
          lastUsed: '2024-09-15',
          averageScore: 0.85
        }
      });

      expect(question.metadata).toEqual({
        source: 'Textbook Chapter 5',
        lastUsed: '2024-09-15',
        averageScore: 0.85
      });
    });

    it('should auto-generate timestamps', async () => {
      const question = await Question.create({
        questionText: 'Test question',
        questionType: 'multiple-choice',
        departmentId: testDept._id,
        points: 5
      });

      expect(question.createdAt).toBeDefined();
      expect(question.updatedAt).toBeDefined();
    });
  });

  describe('Query Methods', () => {
    it('should find questions by department', async () => {
      await Question.create({
        questionText: 'Question 1',
        questionType: 'multiple-choice',
        departmentId: testDept._id,
        points: 5
      });

      const questions = await Question.find({ departmentId: testDept._id });
      expect(questions).toHaveLength(1);
    });

    it('should find questions by type', async () => {
      await Question.create({
        questionText: 'MC Question',
        questionType: 'multiple-choice',
        departmentId: testDept._id,
        points: 5
      });

      await Question.create({
        questionText: 'Essay Question',
        questionType: 'essay',
        departmentId: testDept._id,
        points: 20
      });

      const mcQuestions = await Question.find({ questionType: 'multiple-choice' });
      expect(mcQuestions).toHaveLength(1);
    });

    it('should find questions by difficulty', async () => {
      await Question.create({
        questionText: 'Easy Q',
        questionType: 'multiple-choice',
        departmentId: testDept._id,
        points: 5,
        difficulty: 'easy'
      });

      await Question.create({
        questionText: 'Hard Q',
        questionType: 'essay',
        departmentId: testDept._id,
        points: 20,
        difficulty: 'hard'
      });

      const easyQuestions = await Question.find({ difficulty: 'easy' });
      expect(easyQuestions).toHaveLength(1);
    });

    it('should find active questions only', async () => {
      await Question.create({
        questionText: 'Active Q',
        questionType: 'multiple-choice',
        departmentId: testDept._id,
        points: 5,
        isActive: true
      });

      await Question.create({
        questionText: 'Inactive Q',
        questionType: 'multiple-choice',
        departmentId: testDept._id,
        points: 5,
        isActive: false
      });

      const activeQuestions = await Question.find({ isActive: true });
      expect(activeQuestions).toHaveLength(1);
    });
  });
});
