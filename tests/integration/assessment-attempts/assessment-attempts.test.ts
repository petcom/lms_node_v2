import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '@/app';
import { User } from '@/models/auth/User.model';
import { Learner } from '@/models/auth/Learner.model';
import { Staff } from '@/models/auth/Staff.model';
import Department from '@/models/organization/Department.model';
import Assessment from '@/models/content/Assessment.model';
import Question from '@/models/assessment/Question.model';
import AssessmentAttempt from '@/models/progress/AssessmentAttempt.model';
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import { hashPassword } from '@/utils/password';
import { describeIfMongo } from '../../helpers/mongo-guard';

/**
 * Assessment Attempts E2E Integration Tests
 *
 * Tests the complete assessment attempt lifecycle:
 * - Starting attempts
 * - Saving progress (auto-save)
 * - Submitting attempts
 * - Auto-grading (multiple choice, true/false, etc.)
 * - Manual grading (essay questions)
 * - Viewing results
 * - Time limits and expiration
 * - Attempt limits and cooldown periods
 * - Error cases and edge conditions
 */

// ============ HELPER FUNCTIONS ============

interface TestUserOptions {
  email?: string;
  type: 'learner' | 'staff';
  roles?: string[];
  departmentId?: mongoose.Types.ObjectId;
  accessRights?: string[];
}

interface TestAssessmentOptions {
  title?: string;
  departmentId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  questionBankId: string;
  questionCount?: number;
  timeLimit?: number | null;
  maxAttempts?: number | null;
  cooldownMinutes?: number;
  passingScore?: number;
  isPublished?: boolean;
}

interface TestQuestionOptions {
  questionText?: string;
  questionType: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay' | 'fill-blank' | 'matching';
  departmentId: mongoose.Types.ObjectId;
  questionBankId: string;
  points?: number;
  options?: string[];
  correctAnswer?: string;
  correctAnswers?: string[];
  matchingPairs?: Record<string, string>;
}

/**
 * Create a test user (learner or staff) with JWT token
 */
async function createTestUser(options: TestUserOptions): Promise<{
  user: any;
  profile: any;
  token: string;
}> {
  const hashedPassword = await hashPassword('TestPassword123!');
  const userId = new mongoose.Types.ObjectId();

  const user = await User.create({
    _id: userId,
    email: options.email || `test-${Date.now()}@example.com`,
    password: hashedPassword,
    userTypes: [options.type],
    defaultDashboard: options.type,
    isActive: true,
    accessRights: []
  });

  let profile: any;

  if (options.type === 'learner') {
    profile = await Learner.create({
      _id: userId,
      person: {
        firstName: 'Test',
        lastName: 'Learner',
        emails: [{
          email: user.email,
          type: 'institutional',
          isPrimary: true,
          verified: true
        }],
        phones: [],
        addresses: []
      },
      cohorts: [],
      isActive: true
    });
  } else {
    profile = await Staff.create({
      _id: userId,
      person: {
        firstName: 'Test',
        lastName: 'Staff',
        emails: [{
          email: user.email,
          type: 'institutional',
          isPrimary: true,
          verified: true
        }],
        phones: [],
        addresses: []
      },
      departmentMemberships: options.departmentId ? [{
        departmentId: options.departmentId,
        roles: options.roles || ['instructor']
      }] : [],
      isActive: true
    });
  }

  const token = jwt.sign(
    {
      userId: userId.toString(),
      email: user.email,
      roles: options.roles || [],
      allAccessRights: options.accessRights || [],
      type: 'access'
    },
    process.env.JWT_ACCESS_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  return { user, profile, token };
}

/**
 * Create a test assessment with configuration
 */
async function createTestAssessment(options: TestAssessmentOptions): Promise<any> {
  return Assessment.create({
    departmentId: options.departmentId,
    title: options.title || 'Test Assessment',
    description: 'Test assessment description',
    style: 'quiz',
    questionSelection: {
      questionBankIds: [options.questionBankId],
      questionCount: options.questionCount || 5,
      selectionMode: 'sequential'
    },
    timing: {
      timeLimit: options.timeLimit !== undefined ? options.timeLimit : null,
      showTimer: true,
      autoSubmitOnExpiry: true
    },
    attempts: {
      maxAttempts: options.maxAttempts !== undefined ? options.maxAttempts : 3,
      cooldownMinutes: options.cooldownMinutes || 0,
      retakePolicy: 'anytime'
    },
    scoring: {
      passingScore: options.passingScore || 70,
      showScore: true,
      showCorrectAnswers: 'after_submit',
      partialCredit: false
    },
    feedback: {
      showFeedback: true,
      feedbackTiming: 'after_submit',
      showExplanations: true
    },
    isPublished: options.isPublished !== undefined ? options.isPublished : true,
    isArchived: false,
    createdBy: options.createdBy
  });
}

/**
 * Create a test question
 */
async function createTestQuestion(options: TestQuestionOptions): Promise<any> {
  const questionData: any = {
    questionText: options.questionText || 'Test question?',
    questionType: options.questionType,
    departmentId: options.departmentId,
    points: options.points || 10,
    questionBankIds: [options.questionBankId],
    isActive: true
  };

  if (options.questionType === 'multiple-choice') {
    questionData.options = options.options || ['Option A', 'Option B', 'Option C', 'Option D'];
    questionData.correctAnswer = options.correctAnswer || 'Option A';
  } else if (options.questionType === 'true-false') {
    questionData.options = ['true', 'false'];
    questionData.correctAnswer = options.correctAnswer || 'true';
  } else if (options.questionType === 'short-answer') {
    questionData.correctAnswers = options.correctAnswers || ['correct answer'];
  } else if (options.questionType === 'essay') {
    questionData.modelAnswer = 'This is a model answer for the essay question.';
    questionData.maxWordCount = 500;
  } else if (options.questionType === 'fill-blank') {
    questionData.correctAnswer = options.correctAnswer || 'blank';
  } else if (options.questionType === 'matching') {
    questionData.matchingPairs = options.matchingPairs || {
      'Term A': 'Definition A',
      'Term B': 'Definition B'
    };
  }

  return Question.create(questionData);
}

/**
 * Create test enrollment
 */
async function createTestEnrollment(
  learnerId: mongoose.Types.ObjectId,
  classId?: mongoose.Types.ObjectId
): Promise<any> {
  return ClassEnrollment.create({
    learnerId,
    classId: classId || new mongoose.Types.ObjectId(),
    status: 'active',
    enrollmentDate: new Date()
  });
}

/**
 * Create multiple choice questions for auto-grading tests
 */
async function createMultipleChoiceQuestions(
  departmentId: mongoose.Types.ObjectId,
  questionBankId: string,
  count: number = 5
): Promise<any[]> {
  const questions: any[] = [];
  for (let i = 0; i < count; i++) {
    const q = await createTestQuestion({
      questionText: `Multiple choice question ${i + 1}?`,
      questionType: 'multiple-choice',
      departmentId,
      questionBankId,
      points: 20,
      options: ['Correct Answer', 'Wrong 1', 'Wrong 2', 'Wrong 3'],
      correctAnswer: 'Correct Answer'
    });
    questions.push(q);
  }
  return questions;
}

/**
 * Create essay questions for manual grading tests
 */
async function createEssayQuestions(
  departmentId: mongoose.Types.ObjectId,
  questionBankId: string,
  count: number = 2
): Promise<any[]> {
  const questions: any[] = [];
  for (let i = 0; i < count; i++) {
    const q = await createTestQuestion({
      questionText: `Essay question ${i + 1}: Explain the concept in detail.`,
      questionType: 'essay',
      departmentId,
      questionBankId,
      points: 25
    });
    questions.push(q);
  }
  return questions;
}

// ============ TEST SUITE ============

describeIfMongo('Assessment Attempts E2E Tests', () => {
  let mongoServer: MongoMemoryServer;
  let department: any;
  let learner: { user: any; profile: any; token: string };
  let staff: { user: any; profile: any; token: string };
  let questionBankId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Create department
    department = await Department.create({
      name: 'Test Department',
      code: 'TEST',
      isVisible: true
    });

    questionBankId = new mongoose.Types.ObjectId().toString();

    // Create learner
    learner = await createTestUser({
      email: 'learner@test.com',
      type: 'learner'
    });

    // Create staff (instructor with grading rights)
    staff = await createTestUser({
      email: 'staff@test.com',
      type: 'staff',
      roles: ['instructor'],
      departmentId: department._id,
      accessRights: ['grade:assessments']
    });
  });

  // ============ FULL ATTEMPT LIFECYCLE ============

  describe('Full Attempt Lifecycle', () => {
    let assessment: any;
    let questions: any[];
    let enrollment: any;

    beforeEach(async () => {
      questions = await createMultipleChoiceQuestions(department._id, questionBankId, 5);
      assessment = await createTestAssessment({
        title: 'Lifecycle Test Assessment',
        departmentId: department._id,
        createdBy: staff.user._id,
        questionBankId,
        questionCount: 5,
        maxAttempts: 3
      });
      enrollment = await createTestEnrollment(learner.profile._id);
    });

    it('should complete full attempt lifecycle: start -> save -> submit -> view results', async () => {
      // Step 1: Start attempt
      const startResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      expect(startResponse.status).toBe(201);
      expect(startResponse.body.success).toBe(true);
      expect(startResponse.body.data.attemptId).toBeDefined();
      expect(startResponse.body.data.status).toBe('in_progress');
      expect(startResponse.body.data.attemptNumber).toBe(1);

      const attemptId = startResponse.body.data.attemptId;

      // Step 2: Save progress (first save)
      const firstSaveResponse = await request(app)
        .put(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/save`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: [
            { questionId: questions[0]._id.toString(), response: 'Correct Answer' },
            { questionId: questions[1]._id.toString(), response: 'Wrong 1' }
          ]
        });

      expect(firstSaveResponse.status).toBe(200);
      expect(firstSaveResponse.body.data.savedResponses).toBe(2);

      // Step 3: Save progress (second save - update answers)
      const secondSaveResponse = await request(app)
        .put(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/save`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: [
            { questionId: questions[2]._id.toString(), response: 'Correct Answer' },
            { questionId: questions[3]._id.toString(), response: 'Correct Answer' },
            { questionId: questions[4]._id.toString(), response: 'Correct Answer' }
          ]
        });

      expect(secondSaveResponse.status).toBe(200);
      expect(secondSaveResponse.body.data.savedResponses).toBe(3);

      // Step 4: Submit attempt
      const submitResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({});

      expect(submitResponse.status).toBe(200);
      expect(submitResponse.body.success).toBe(true);
      expect(submitResponse.body.data.status).toBe('graded');
      expect(submitResponse.body.data.scoring.gradingComplete).toBe(true);
      // 4 correct out of 5 = 80%
      expect(submitResponse.body.data.scoring.percentageScore).toBe(80);
      expect(submitResponse.body.data.scoring.passed).toBe(true);

      // Step 5: View results
      const resultsResponse = await request(app)
        .get(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}`)
        .set('Authorization', `Bearer ${learner.token}`);

      expect(resultsResponse.status).toBe(200);
      expect(resultsResponse.body.data.status).toBe('graded');
    });

    it('should allow submitting with final responses in submit request', async () => {
      // Start attempt
      const startResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      // Submit with responses directly
      const submitResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: questions.map(q => ({
            questionId: q._id.toString(),
            response: 'Correct Answer'
          }))
        });

      expect(submitResponse.status).toBe(200);
      expect(submitResponse.body.data.scoring.percentageScore).toBe(100);
      expect(submitResponse.body.data.scoring.passed).toBe(true);
    });

    it('should list user attempts for an assessment', async () => {
      // Create and submit first attempt
      const start1 = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${start1.body.data.attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({});

      // Create second attempt
      const start2 = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      // List my attempts
      const listResponse = await request(app)
        .get(`/api/v2/assessments/${assessment._id}/attempts/my`)
        .set('Authorization', `Bearer ${learner.token}`);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data.attempts).toHaveLength(2);
      // Most recent first
      expect(listResponse.body.data.attempts[0].attemptNumber).toBe(2);
      expect(listResponse.body.data.attempts[1].attemptNumber).toBe(1);
    });
  });

  // ============ AUTO-GRADING FLOW ============

  describe('Auto-grading Flow', () => {
    it('should auto-grade multiple choice questions correctly', async () => {
      const questions = await createMultipleChoiceQuestions(department._id, questionBankId, 5);
      const assessment = await createTestAssessment({
        departmentId: department._id,
        createdBy: staff.user._id,
        questionBankId,
        questionCount: 5,
        passingScore: 60
      });
      const enrollment = await createTestEnrollment(learner.profile._id);

      // Start attempt
      const startResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      // Answer 3 correct, 2 wrong
      const submitResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: [
            { questionId: questions[0]._id.toString(), response: 'Correct Answer' },
            { questionId: questions[1]._id.toString(), response: 'Correct Answer' },
            { questionId: questions[2]._id.toString(), response: 'Correct Answer' },
            { questionId: questions[3]._id.toString(), response: 'Wrong 1' },
            { questionId: questions[4]._id.toString(), response: 'Wrong 2' }
          ]
        });

      expect(submitResponse.status).toBe(200);
      expect(submitResponse.body.data.scoring.percentageScore).toBe(60);
      expect(submitResponse.body.data.scoring.passed).toBe(true);
      expect(submitResponse.body.data.scoring.gradingComplete).toBe(true);
      expect(submitResponse.body.data.scoring.requiresManualGrading).toBe(false);
    });

    it('should auto-grade true/false questions correctly', async () => {
      const q1 = await createTestQuestion({
        questionText: 'True or false question 1',
        questionType: 'true-false',
        departmentId: department._id,
        questionBankId,
        points: 10,
        correctAnswer: 'true'
      });
      const q2 = await createTestQuestion({
        questionText: 'True or false question 2',
        questionType: 'true-false',
        departmentId: department._id,
        questionBankId,
        points: 10,
        correctAnswer: 'false'
      });

      const assessment = await createTestAssessment({
        departmentId: department._id,
        createdBy: staff.user._id,
        questionBankId,
        questionCount: 2
      });
      const enrollment = await createTestEnrollment(learner.profile._id);

      const startResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      // Answer both correctly
      const submitResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: [
            { questionId: q1._id.toString(), response: 'true' },
            { questionId: q2._id.toString(), response: 'false' }
          ]
        });

      expect(submitResponse.status).toBe(200);
      expect(submitResponse.body.data.scoring.percentageScore).toBe(100);
    });

    it('should auto-grade short answer questions with multiple correct answers', async () => {
      const question = await createTestQuestion({
        questionText: 'What is the capital of France?',
        questionType: 'short-answer',
        departmentId: department._id,
        questionBankId,
        points: 10,
        correctAnswers: ['Paris', 'paris', 'PARIS']
      });

      const assessment = await createTestAssessment({
        departmentId: department._id,
        createdBy: staff.user._id,
        questionBankId,
        questionCount: 1
      });
      const enrollment = await createTestEnrollment(learner.profile._id);

      const startResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      const submitResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: [{ questionId: question._id.toString(), response: 'paris' }]
        });

      expect(submitResponse.status).toBe(200);
      expect(submitResponse.body.data.scoring.percentageScore).toBe(100);
    });

    it('should mark unanswered questions as incorrect', async () => {
      const questions = await createMultipleChoiceQuestions(department._id, questionBankId, 3);
      const assessment = await createTestAssessment({
        departmentId: department._id,
        createdBy: staff.user._id,
        questionBankId,
        questionCount: 3
      });
      const enrollment = await createTestEnrollment(learner.profile._id);

      const startResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      // Answer only 1 question
      const submitResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: [{ questionId: questions[0]._id.toString(), response: 'Correct Answer' }]
        });

      expect(submitResponse.status).toBe(200);
      // 1 correct out of 3 = 33.33%
      expect(submitResponse.body.data.scoring.percentageScore).toBeCloseTo(33.33, 1);
    });
  });

  // ============ MANUAL GRADING FLOW ============

  describe('Manual Grading Flow', () => {
    let assessment: any;
    let essayQuestions: any[];
    let enrollment: any;

    beforeEach(async () => {
      essayQuestions = await createEssayQuestions(department._id, questionBankId, 2);
      assessment = await createTestAssessment({
        title: 'Essay Assessment',
        departmentId: department._id,
        createdBy: staff.user._id,
        questionBankId,
        questionCount: 2
      });
      enrollment = await createTestEnrollment(learner.profile._id);
    });

    it('should mark essay assessment as requiring manual grading', async () => {
      // Start and submit attempt
      const startResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      const submitResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: [
            { questionId: essayQuestions[0]._id.toString(), response: 'This is my essay response for question 1.' },
            { questionId: essayQuestions[1]._id.toString(), response: 'This is my essay response for question 2.' }
          ]
        });

      expect(submitResponse.status).toBe(200);
      expect(submitResponse.body.data.status).toBe('submitted');
      expect(submitResponse.body.data.scoring.requiresManualGrading).toBe(true);
      expect(submitResponse.body.data.scoring.gradingComplete).toBe(false);
    });

    it('should allow instructor to grade essay questions manually', async () => {
      // Start and submit attempt
      const startResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: [
            { questionId: essayQuestions[0]._id.toString(), response: 'Essay response 1' },
            { questionId: essayQuestions[1]._id.toString(), response: 'Essay response 2' }
          ]
        });

      // Grade first question
      const grade1Response = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/grade`)
        .set('Authorization', `Bearer ${staff.token}`)
        .send({
          questionIndex: 0,
          score: 20,
          feedback: 'Good effort, but missing key points.'
        });

      expect(grade1Response.status).toBe(200);
      expect(grade1Response.body.data.pointsEarned).toBe(20);
      expect(grade1Response.body.data.updatedScoring.gradingComplete).toBe(false);

      // Grade second question
      const grade2Response = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/grade`)
        .set('Authorization', `Bearer ${staff.token}`)
        .send({
          questionIndex: 1,
          score: 25,
          feedback: 'Excellent response!'
        });

      expect(grade2Response.status).toBe(200);
      expect(grade2Response.body.data.updatedScoring.gradingComplete).toBe(true);
      // 20 + 25 = 45 out of 50 = 90%
      expect(grade2Response.body.data.updatedScoring.percentageScore).toBe(90);
    });

    it('should update attempt status to graded when all questions are graded', async () => {
      const startResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: [
            { questionId: essayQuestions[0]._id.toString(), response: 'Response 1' },
            { questionId: essayQuestions[1]._id.toString(), response: 'Response 2' }
          ]
        });

      // Grade both questions
      await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/grade`)
        .set('Authorization', `Bearer ${staff.token}`)
        .send({ questionIndex: 0, score: 15 });

      await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/grade`)
        .set('Authorization', `Bearer ${staff.token}`)
        .send({ questionIndex: 1, score: 20 });

      // Check attempt status
      const attempt = await AssessmentAttempt.findById(attemptId);
      expect(attempt?.status).toBe('graded');
      expect(attempt?.scoring.gradingComplete).toBe(true);
    });

    it('should reject grading with score exceeding max points', async () => {
      const startResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: [{ questionId: essayQuestions[0]._id.toString(), response: 'Response' }]
        });

      const gradeResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/grade`)
        .set('Authorization', `Bearer ${staff.token}`)
        .send({
          questionIndex: 0,
          score: 100, // Exceeds max points (25)
          feedback: 'This should fail'
        });

      expect(gradeResponse.status).toBe(400);
    });
  });

  // ============ TIME LIMITS ============

  describe('Time Limits', () => {
    it('should reject save progress after time limit exceeded', async () => {
      const questions = await createMultipleChoiceQuestions(department._id, questionBankId, 2);
      const assessment = await createTestAssessment({
        departmentId: department._id,
        createdBy: staff.user._id,
        questionBankId,
        questionCount: 2,
        timeLimit: 60 // 60 seconds
      });
      const enrollment = await createTestEnrollment(learner.profile._id);

      // Start attempt
      const startResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      // Manually expire the attempt by updating startedAt
      const pastTime = new Date(Date.now() - 120000); // 2 minutes ago
      await AssessmentAttempt.findByIdAndUpdate(attemptId, {
        'timing.startedAt': pastTime,
        'timing.lastActivityAt': pastTime
      });

      // Try to save progress - should fail
      const saveResponse = await request(app)
        .put(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/save`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: [{ questionId: questions[0]._id.toString(), response: 'Correct Answer' }]
        });

      expect(saveResponse.status).toBe(409);
      expect(saveResponse.body.message).toContain('Time limit exceeded');
    });

    it('should include time remaining in save progress response', async () => {
      const questions = await createMultipleChoiceQuestions(department._id, questionBankId, 2);
      const assessment = await createTestAssessment({
        departmentId: department._id,
        createdBy: staff.user._id,
        questionBankId,
        questionCount: 2,
        timeLimit: 1800 // 30 minutes
      });
      const enrollment = await createTestEnrollment(learner.profile._id);

      const startResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      const saveResponse = await request(app)
        .put(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/save`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: [{ questionId: questions[0]._id.toString(), response: 'Correct Answer' }]
        });

      expect(saveResponse.status).toBe(200);
      expect(saveResponse.body.data.timeRemainingSeconds).toBeDefined();
      expect(saveResponse.body.data.timeRemainingSeconds).toBeGreaterThan(0);
      expect(saveResponse.body.data.timeRemainingSeconds).toBeLessThanOrEqual(1800);
    });

    it('should return null time remaining for untimed assessments', async () => {
      const questions = await createMultipleChoiceQuestions(department._id, questionBankId, 2);
      const assessment = await createTestAssessment({
        departmentId: department._id,
        createdBy: staff.user._id,
        questionBankId,
        questionCount: 2,
        timeLimit: null // No time limit
      });
      const enrollment = await createTestEnrollment(learner.profile._id);

      const startResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      const saveResponse = await request(app)
        .put(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/save`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: [{ questionId: questions[0]._id.toString(), response: 'Correct Answer' }]
        });

      expect(saveResponse.status).toBe(200);
      expect(saveResponse.body.data.timeRemainingSeconds).toBeNull();
    });
  });

  // ============ ATTEMPT LIMITS ============

  describe('Attempt Limits', () => {
    it('should enforce max attempts limit', async () => {
      const questions = await createMultipleChoiceQuestions(department._id, questionBankId, 2);
      const assessment = await createTestAssessment({
        departmentId: department._id,
        createdBy: staff.user._id,
        questionBankId,
        questionCount: 2,
        maxAttempts: 2
      });
      const enrollment = await createTestEnrollment(learner.profile._id);

      // Complete first attempt
      const start1 = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${start1.body.data.attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({});

      // Complete second attempt
      const start2 = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${start2.body.data.attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({});

      // Try to start third attempt - should fail
      const start3 = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      expect(start3.status).toBe(409);
      expect(start3.body.message).toContain('Maximum attempts reached');
    });

    it('should allow unlimited attempts when maxAttempts is null', async () => {
      const questions = await createMultipleChoiceQuestions(department._id, questionBankId, 2);
      const assessment = await createTestAssessment({
        departmentId: department._id,
        createdBy: staff.user._id,
        questionBankId,
        questionCount: 2,
        maxAttempts: null // Unlimited
      });
      const enrollment = await createTestEnrollment(learner.profile._id);

      // Complete multiple attempts
      for (let i = 0; i < 5; i++) {
        const startResponse = await request(app)
          .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
          .set('Authorization', `Bearer ${learner.token}`)
          .send({ enrollmentId: enrollment._id.toString() });

        expect(startResponse.status).toBe(201);
        expect(startResponse.body.data.attemptNumber).toBe(i + 1);

        await request(app)
          .post(`/api/v2/assessments/${assessment._id}/attempts/${startResponse.body.data.attemptId}/submit`)
          .set('Authorization', `Bearer ${learner.token}`)
          .send({});
      }
    });

    it('should track attempt numbers correctly', async () => {
      const questions = await createMultipleChoiceQuestions(department._id, questionBankId, 2);
      const assessment = await createTestAssessment({
        departmentId: department._id,
        createdBy: staff.user._id,
        questionBankId,
        questionCount: 2,
        maxAttempts: 5
      });
      const enrollment = await createTestEnrollment(learner.profile._id);

      // Start first attempt
      const start1 = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      expect(start1.body.data.attemptNumber).toBe(1);

      // Submit first attempt
      await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${start1.body.data.attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({});

      // Start second attempt
      const start2 = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      expect(start2.body.data.attemptNumber).toBe(2);
    });
  });

  // ============ ERROR CASES ============

  describe('Error Cases', () => {
    let assessment: any;
    let questions: any[];
    let enrollment: any;

    beforeEach(async () => {
      questions = await createMultipleChoiceQuestions(department._id, questionBankId, 3);
      assessment = await createTestAssessment({
        departmentId: department._id,
        createdBy: staff.user._id,
        questionBankId,
        questionCount: 3
      });
      enrollment = await createTestEnrollment(learner.profile._id);
    });

    it('should not allow starting more than one in-progress attempt', async () => {
      // Start first attempt
      const start1 = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      expect(start1.status).toBe(201);

      // Try to start second attempt without submitting first
      const start2 = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      expect(start2.status).toBe(409);
      expect(start2.body.message).toContain('already in progress');
    });

    it('should not allow submitting already submitted attempt', async () => {
      const startResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      // Submit first time
      await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({});

      // Try to submit again
      const secondSubmit = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({});

      expect(secondSubmit.status).toBe(409);
      expect(secondSubmit.body.message).toContain('already been submitted');
    });

    it('should not allow saving progress on submitted attempt', async () => {
      const startResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      // Submit the attempt
      await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({});

      // Try to save progress
      const saveResponse = await request(app)
        .put(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/save`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: [{ questionId: questions[0]._id.toString(), response: 'Answer' }]
        });

      expect(saveResponse.status).toBe(409);
      expect(saveResponse.body.message).toContain('not in progress');
    });

    it('should return 404 for non-existent assessment', async () => {
      const fakeAssessmentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/api/v2/assessments/${fakeAssessmentId}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent attempt', async () => {
      const fakeAttemptId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/v2/assessments/${assessment._id}/attempts/${fakeAttemptId}`)
        .set('Authorization', `Bearer ${learner.token}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .send({ enrollmentId: enrollment._id.toString() });

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing enrollmentId', async () => {
      const response = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('enrollmentId');
    });

    it('should return 400 for invalid responses format', async () => {
      const startResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      const saveResponse = await request(app)
        .put(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/save`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: 'not an array'
        });

      expect(saveResponse.status).toBe(400);
      expect(saveResponse.body.message).toContain('array');
    });

    it('should not allow starting attempt on unpublished assessment', async () => {
      const unpublishedAssessment = await createTestAssessment({
        departmentId: department._id,
        createdBy: staff.user._id,
        questionBankId,
        questionCount: 3,
        isPublished: false
      });

      const response = await request(app)
        .post(`/api/v2/assessments/${unpublishedAssessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      expect(response.status).toBe(404);
    });

    it('should require questionIndex for grading', async () => {
      const essayQuestions = await createEssayQuestions(department._id, questionBankId, 1);
      const essayAssessment = await createTestAssessment({
        departmentId: department._id,
        createdBy: staff.user._id,
        questionBankId,
        questionCount: 1
      });

      const startResponse = await request(app)
        .post(`/api/v2/assessments/${essayAssessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      await request(app)
        .post(`/api/v2/assessments/${essayAssessment._id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: [{ questionId: essayQuestions[0]._id.toString(), response: 'Response' }]
        });

      // Try grading without questionIndex
      const gradeResponse = await request(app)
        .post(`/api/v2/assessments/${essayAssessment._id}/attempts/${attemptId}/grade`)
        .set('Authorization', `Bearer ${staff.token}`)
        .send({
          score: 10,
          feedback: 'Good job'
        });

      expect(gradeResponse.status).toBe(400);
      expect(gradeResponse.body.message).toContain('questionIndex');
    });

    it('should require score for grading', async () => {
      const essayQuestions = await createEssayQuestions(department._id, questionBankId, 1);
      const essayAssessment = await createTestAssessment({
        departmentId: department._id,
        createdBy: staff.user._id,
        questionBankId,
        questionCount: 1
      });

      const startResponse = await request(app)
        .post(`/api/v2/assessments/${essayAssessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      await request(app)
        .post(`/api/v2/assessments/${essayAssessment._id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: [{ questionId: essayQuestions[0]._id.toString(), response: 'Response' }]
        });

      // Try grading without score
      const gradeResponse = await request(app)
        .post(`/api/v2/assessments/${essayAssessment._id}/attempts/${attemptId}/grade`)
        .set('Authorization', `Bearer ${staff.token}`)
        .send({
          questionIndex: 0,
          feedback: 'Good job'
        });

      expect(gradeResponse.status).toBe(400);
      expect(gradeResponse.body.message).toContain('score');
    });

    it('should reject invalid question index for grading', async () => {
      const essayQuestions = await createEssayQuestions(department._id, questionBankId, 1);
      const essayAssessment = await createTestAssessment({
        departmentId: department._id,
        createdBy: staff.user._id,
        questionBankId,
        questionCount: 1
      });

      const startResponse = await request(app)
        .post(`/api/v2/assessments/${essayAssessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      await request(app)
        .post(`/api/v2/assessments/${essayAssessment._id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: [{ questionId: essayQuestions[0]._id.toString(), response: 'Response' }]
        });

      // Try grading with invalid question index
      const gradeResponse = await request(app)
        .post(`/api/v2/assessments/${essayAssessment._id}/attempts/${attemptId}/grade`)
        .set('Authorization', `Bearer ${staff.token}`)
        .send({
          questionIndex: 999,
          score: 10
        });

      expect(gradeResponse.status).toBe(400);
    });

    it('should reject negative scores', async () => {
      const essayQuestions = await createEssayQuestions(department._id, questionBankId, 1);
      const essayAssessment = await createTestAssessment({
        departmentId: department._id,
        createdBy: staff.user._id,
        questionBankId,
        questionCount: 1
      });

      const startResponse = await request(app)
        .post(`/api/v2/assessments/${essayAssessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      await request(app)
        .post(`/api/v2/assessments/${essayAssessment._id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: [{ questionId: essayQuestions[0]._id.toString(), response: 'Response' }]
        });

      const gradeResponse = await request(app)
        .post(`/api/v2/assessments/${essayAssessment._id}/attempts/${attemptId}/grade`)
        .set('Authorization', `Bearer ${staff.token}`)
        .send({
          questionIndex: 0,
          score: -5
        });

      expect(gradeResponse.status).toBe(400);
    });
  });

  // ============ MIXED QUESTION TYPES ============

  describe('Mixed Question Types Assessment', () => {
    it('should handle assessment with both auto-gradeable and manual-grade questions', async () => {
      // Create mixed questions
      const mcQuestion = await createTestQuestion({
        questionText: 'Multiple choice question',
        questionType: 'multiple-choice',
        departmentId: department._id,
        questionBankId,
        points: 10,
        options: ['Correct', 'Wrong 1', 'Wrong 2'],
        correctAnswer: 'Correct'
      });

      const essayQuestion = await createTestQuestion({
        questionText: 'Essay question',
        questionType: 'essay',
        departmentId: department._id,
        questionBankId,
        points: 20
      });

      const tfQuestion = await createTestQuestion({
        questionText: 'True/false question',
        questionType: 'true-false',
        departmentId: department._id,
        questionBankId,
        points: 10,
        correctAnswer: 'true'
      });

      const assessment = await createTestAssessment({
        departmentId: department._id,
        createdBy: staff.user._id,
        questionBankId,
        questionCount: 3
      });
      const enrollment = await createTestEnrollment(learner.profile._id);

      // Start and submit attempt
      const startResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/start`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ enrollmentId: enrollment._id.toString() });

      const attemptId = startResponse.body.data.attemptId;

      const submitResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          responses: [
            { questionId: mcQuestion._id.toString(), response: 'Correct' },
            { questionId: essayQuestion._id.toString(), response: 'My essay response' },
            { questionId: tfQuestion._id.toString(), response: 'true' }
          ]
        });

      expect(submitResponse.status).toBe(200);
      expect(submitResponse.body.data.status).toBe('submitted');
      expect(submitResponse.body.data.scoring.requiresManualGrading).toBe(true);
      expect(submitResponse.body.data.scoring.gradingComplete).toBe(false);

      // Grade the essay question
      const gradeResponse = await request(app)
        .post(`/api/v2/assessments/${assessment._id}/attempts/${attemptId}/grade`)
        .set('Authorization', `Bearer ${staff.token}`)
        .send({
          questionIndex: 1, // Essay question index
          score: 15,
          feedback: 'Good essay'
        });

      expect(gradeResponse.status).toBe(200);
      expect(gradeResponse.body.data.updatedScoring.gradingComplete).toBe(true);
      // MC: 10, Essay: 15, TF: 10 = 35 out of 40 = 87.5%
      expect(gradeResponse.body.data.updatedScoring.percentageScore).toBe(87.5);
    });
  });
});
