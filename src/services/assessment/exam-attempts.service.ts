import mongoose from 'mongoose';
import ExamResult from '@/models/activity/ExamResult.model';
import Exercise from '@/models/assessment/Exercise.model';
import Question from '@/models/assessment/Question.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { ApiError } from '@/utils/ApiError';

/**
 * Exam Attempts Service
 * Handles exam attempt lifecycle: start, submit answers, grading, and results
 */

interface ListAttemptsFilters {
  learnerId?: string;
  examId?: string;
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

interface CreateAttemptData {
  examId: string;
}

interface SubmitAnswersData {
  answers: Array<{
    questionId: string;
    answer: string | string[];
  }>;
}

interface GradeExamData {
  questionGrades: Array<{
    questionId: string;
    scoreEarned: number;
    feedback?: string;
  }>;
  overallFeedback?: string;
  notifyLearner?: boolean;
}

/**
 * Helper function to calculate grade letter based on percentage
 */
function calculateGradeLetter(percentage: number): string {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

/**
 * Helper function to shuffle array (Fisher-Yates algorithm)
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export class ExamAttemptsService {
  /**
   * List exam attempts with filtering
   */
  static async listAttempts(filters: ListAttemptsFilters, userId: string): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    // Check user permissions
    const user = await User.findById(userId).lean();
    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    const isLearner = user.roles?.includes('learner') && !user.roles?.includes('global-admin');

    if (isLearner) {
      // Learners can only see their own attempts
      query.learnerId = userId;
    } else if (filters.learnerId) {
      // Staff can filter by learner if they have access
      const staff = await Staff.findById(userId).lean();
      const departmentIds = staff?.departmentMemberships?.map((m: any) => m.departmentId.toString()) || [];

      // Check if staff has access to this learner's department
      const learnerStaff = await Staff.findById(filters.learnerId).lean();
      if (learnerStaff) {
        const learnerDeptIds = learnerStaff.departmentMemberships?.map((m: any) => m.departmentId.toString()) || [];
        const hasAccess = learnerDeptIds.some(id => departmentIds.includes(id)) || user.roles?.includes('global-admin');

        if (!hasAccess) {
          throw ApiError.forbidden('No access to this learner\'s attempts');
        }
      }

      query.learnerId = filters.learnerId;
    }

    // Exam filter
    if (filters.examId) {
      query.examId = filters.examId;
    }

    // Status filter
    if (filters.status) {
      // Map contract status to model status
      const statusMap: Record<string, string> = {
        'started': 'in-progress',
        'in_progress': 'in-progress',
        'submitted': 'submitted',
        'grading': 'submitted',
        'graded': 'graded'
      };
      query.status = statusMap[filters.status] || filters.status;
    }

    // Parse sort
    const sortField = filters.sort || '-startedAt';
    const sortDirection = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortObj: any = { [sortKey]: sortDirection };

    // Execute query
    const [attempts, total] = await Promise.all([
      ExamResult.find(query)
        .populate('examId', 'title type')
        .populate('learnerId', 'firstName lastName email')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      ExamResult.countDocuments(query)
    ]);

    // Format results
    const attemptsData = attempts.map((attempt: any) => {
      const exam = attempt.examId || {};
      const learner = attempt.learnerId || {};

      // Calculate remaining time if in progress
      let remainingTime: number | null = null;
      if (attempt.status === 'in-progress' && attempt.startedAt) {
        const exercise = exam as any;
        if (exercise.timeLimit && exercise.timeLimit > 0) {
          const elapsed = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
          remainingTime = Math.max(0, exercise.timeLimit - elapsed);
        }
      }

      return {
        id: attempt._id.toString(),
        examId: exam._id?.toString() || '',
        examTitle: exam.title || '',
        learnerId: learner._id?.toString() || '',
        learnerName: learner.person.firstName && learner.person.lastName ? `${learner.person.firstName} ${learner.person.lastName}` : '',
        attemptNumber: attempt.attemptNumber,
        status: attempt.status === 'in-progress' ? 'in_progress' : attempt.status,
        score: attempt.score || 0,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage || 0,
        passed: attempt.passed || false,
        gradeLetter: attempt.gradeLetter || null,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt || null,
        gradedAt: attempt.gradedAt || null,
        timeSpent: attempt.timeSpent || 0,
        remainingTime,
        createdAt: attempt.createdAt,
        updatedAt: attempt.updatedAt
      };
    });

    return {
      attempts: attemptsData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Create a new exam attempt
   */
  static async createAttempt(data: CreateAttemptData, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(data.examId)) {
      throw ApiError.notFound('Exam not found');
    }

    // Validate exam exists and is published
    const exam = await Exercise.findOne({ _id: data.examId, status: 'published' })
      .populate('questions.questionId')
      .lean();

    if (!exam) {
      throw ApiError.notFound('Exam not found');
    }

    // Check for active attempts
    const activeAttempt = await ExamResult.findOne({
      examId: data.examId,
      learnerId: userId,
      status: { $in: ['in-progress'] }
    });

    if (activeAttempt) {
      throw ApiError.conflict('Cannot start new attempt while another is in progress');
    }

    // Get next attempt number
    const lastAttempt = await ExamResult.findOne({
      examId: data.examId,
      learnerId: userId
    }).sort({ attemptNumber: -1 }).lean();

    const attemptNumber = lastAttempt ? lastAttempt.attemptNumber + 1 : 1;

    // Get questions with details
    const questionIds = exam.questions.map(q => q.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } }).lean();
    const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

    // Prepare questions for the attempt
    let orderedQuestions = exam.questions.map((eq, index) => {
      const question = questionMap.get(eq.questionId.toString());
      if (!question) return null;

      return {
        id: question._id.toString(),
        questionText: question.questionText,
        questionType: question.questionType.replace('-', '_'), // Convert to contract format
        order: index + 1,
        points: eq.points,
        options: question.options || [],
        hasAnswer: false
      };
    }).filter(Boolean);

    // Shuffle questions if configured
    if (exam.shuffleQuestions) {
      orderedQuestions = shuffleArray(orderedQuestions);
      // Update order after shuffle
      orderedQuestions.forEach((q: any, index) => {
        q.order = index + 1;
      });
    }

    // Create attempt
    const attempt = await ExamResult.create({
      examId: data.examId,
      learnerId: userId,
      attemptNumber,
      status: 'in-progress',
      score: 0,
      maxScore: exam.totalPoints,
      percentage: 0,
      passed: false,
      answers: {},
      questionScores: {},
      startedAt: new Date(),
      timeSpent: 0,
      metadata: {
        questionOrder: orderedQuestions.map((q: any) => q.id)
      }
    });

    return {
      id: attempt._id.toString(),
      examId: data.examId,
      examTitle: exam.title,
      learnerId: userId,
      attemptNumber,
      status: 'started',
      score: 0,
      maxScore: exam.totalPoints,
      timeLimit: exam.timeLimit,
      remainingTime: exam.timeLimit,
      shuffleQuestions: exam.shuffleQuestions,
      questions: orderedQuestions,
      instructions: exam.instructions || '',
      allowReview: exam.allowReview,
      startedAt: attempt.startedAt,
      createdAt: attempt.createdAt
    };
  }

  /**
   * Get exam attempt details by ID
   */
  static async getAttemptById(attemptId: string, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw ApiError.notFound('Exam attempt not found');
    }

    const attempt = await ExamResult.findById(attemptId)
      .populate('examId')
      .populate('learnerId', 'firstName lastName email')
      .populate('gradedBy', 'firstName lastName')
      .lean();

    if (!attempt) {
      throw ApiError.notFound('Exam attempt not found');
    }

    // Check access permissions
    const user = await User.findById(userId).lean();
    const isOwner = attempt.learnerId._id.toString() === userId;
    const isStaff = user?.roles?.some(r => ['global-admin', 'department-admin', 'content-admin'].includes(r));

    if (!isOwner && !isStaff) {
      throw ApiError.forbidden('Cannot view this exam attempt');
    }

    const exam = attempt.examId as any;
    const learner = attempt.learnerId as any;

    // Get questions with details
    const questionOrder = attempt.metadata?.questionOrder || [];
    const questions = await Question.find({ _id: { $in: questionOrder } }).lean();
    const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

    // Build questions array with answers
    const questionsData = questionOrder.map((qId: string, index: number) => {
      const question = questionMap.get(qId);
      if (!question) return null;

      const userAnswer = attempt.answers?.[qId] || null;
      const scoreEarned = attempt.questionScores?.[qId]?.scoreEarned || 0;
      const isCorrect = attempt.questionScores?.[qId]?.isCorrect || null;
      const feedback = attempt.questionFeedback?.[qId] || null;

      // Show correct answer only if graded and review allowed
      let correctAnswer = null;
      if (attempt.status === 'graded' && exam.allowReview && isStaff) {
        correctAnswer = question.correctAnswer || question.correctAnswers?.[0] || null;
      }

      return {
        id: question._id.toString(),
        questionText: question.questionText,
        questionType: question.questionType.replace('-', '_'),
        order: index + 1,
        points: question.points,
        options: question.options || [],
        userAnswer,
        correctAnswer,
        isCorrect,
        scoreEarned,
        feedback,
        explanation: exam.showFeedback ? question.explanation || '' : ''
      };
    }).filter(Boolean);

    // Calculate remaining time if in progress
    let remainingTime: number | null = null;
    if (attempt.status === 'in-progress' && attempt.startedAt && exam.timeLimit > 0) {
      const elapsed = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
      remainingTime = Math.max(0, exam.timeLimit - elapsed);
    }

    // Format graded by
    let gradedBy = null;
    if (attempt.gradedBy) {
      const grader = attempt.gradedBy as any;
      gradedBy = {
        id: grader._id?.toString() || '',
        firstName: grader.firstName || '',
        lastName: grader.lastName || ''
      };
    }

    return {
      id: attempt._id.toString(),
      examId: exam._id?.toString() || '',
      examTitle: exam.title || '',
      examType: exam.type || 'quiz',
      learnerId: learner._id?.toString() || '',
      learnerName: learner.person.firstName && learner.person.lastName ? `${learner.person.firstName} ${learner.person.lastName}` : '',
      attemptNumber: attempt.attemptNumber,
      status: attempt.status === 'in-progress' ? 'in_progress' : attempt.status,
      score: attempt.score || 0,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage || 0,
      passed: attempt.passed || false,
      gradeLetter: attempt.gradeLetter || null,
      timeLimit: exam.timeLimit || 0,
      remainingTime,
      timeSpent: attempt.timeSpent || 0,
      questions: questionsData,
      instructions: exam.instructions || '',
      allowReview: exam.allowReview,
      showFeedback: exam.showFeedback,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt || null,
      gradedAt: attempt.gradedAt || null,
      gradedBy,
      feedback: attempt.feedback || null,
      metadata: attempt.metadata || {},
      createdAt: attempt.createdAt,
      updatedAt: attempt.updatedAt
    };
  }

  /**
   * Submit answers for questions
   */
  static async submitAnswers(attemptId: string, data: SubmitAnswersData, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw ApiError.notFound('Exam attempt not found');
    }

    const attempt = await ExamResult.findById(attemptId)
      .populate('examId')
      .lean();

    if (!attempt) {
      throw ApiError.notFound('Exam attempt not found');
    }

    // Only the attempt owner can submit answers
    if (attempt.learnerId.toString() !== userId) {
      throw ApiError.forbidden('Cannot modify this exam attempt');
    }

    // Cannot submit answers to completed attempts
    if (['completed', 'graded', 'submitted'].includes(attempt.status)) {
      throw ApiError.conflict('Cannot submit answers to completed attempt');
    }

    // Check time limit
    const exam = attempt.examId as any;
    if (exam.timeLimit > 0 && attempt.startedAt) {
      const elapsed = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
      if (elapsed > exam.timeLimit) {
        // Auto-submit the attempt
        await ExamResult.updateOne(
          { _id: attemptId },
          {
            $set: {
              status: 'submitted',
              submittedAt: new Date(),
              timeSpent: elapsed
            }
          }
        );
        throw ApiError.conflict('Time limit exceeded, attempt auto-submitted');
      }
    }

    // Update answers
    const answers = attempt.answers || {};
    const updatedAnswers = data.answers.map(a => {
      answers[a.questionId] = a.answer;
      return {
        questionId: a.questionId,
        answer: a.answer,
        savedAt: new Date()
      };
    });

    // Count answered questions
    const totalQuestions = attempt.metadata?.questionOrder?.length || 0;
    const answeredCount = Object.keys(answers).length;

    // Calculate remaining time
    let remainingTime: number | null = null;
    if (exam.timeLimit > 0 && attempt.startedAt) {
      const elapsed = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
      remainingTime = Math.max(0, exam.timeLimit - elapsed);
    }

    // Update attempt
    await ExamResult.updateOne(
      { _id: attemptId },
      {
        $set: {
          answers,
          status: 'in-progress'
        }
      }
    );

    return {
      attemptId: attemptId,
      status: 'in_progress',
      answeredCount,
      totalQuestions,
      remainingTime,
      updatedAnswers
    };
  }

  /**
   * Submit exam for grading
   */
  static async submitExam(attemptId: string, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw ApiError.notFound('Exam attempt not found');
    }

    const attempt = await ExamResult.findById(attemptId)
      .populate('examId');

    if (!attempt) {
      throw ApiError.notFound('Exam attempt not found');
    }

    // Only the attempt owner can submit
    if (attempt.learnerId.toString() !== userId) {
      throw ApiError.forbidden('Cannot submit this exam attempt');
    }

    // Check if already submitted
    if (['completed', 'graded', 'submitted'].includes(attempt.status)) {
      throw ApiError.conflict('Exam attempt already submitted');
    }

    const exam = attempt.examId as any;

    // Calculate time spent
    const timeSpent = attempt.startedAt
      ? Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000)
      : 0;

    // Get questions for grading
    const questionOrder = attempt.metadata?.questionOrder || [];
    const questions = await Question.find({ _id: { $in: questionOrder } }).lean();
    const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

    // Auto-grade objective questions
    const questionScores: Record<string, any> = {};
    let totalScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let requiresManualGrading = false;

    const exerciseQuestions = exam.questions || [];
    const exerciseQMap = new Map(exerciseQuestions.map((eq: any) => [eq.questionId.toString(), eq]));

    for (const qId of questionOrder) {
      const question = questionMap.get(qId);
      const exerciseQ = exerciseQMap.get(qId);
      if (!question || !exerciseQ) continue;

      const userAnswer = attempt.answers?.[qId];
      const points = (exerciseQ as any).points || 0;

      // Auto-grade based on question type
      if (question.questionType === 'multiple-choice' || question.questionType === 'true-false') {
        const isCorrect = userAnswer === question.correctAnswer;
        const scoreEarned = isCorrect ? points : 0;

        questionScores[qId] = {
          scoreEarned,
          isCorrect,
          maxPoints: points
        };

        totalScore += scoreEarned;
        if (isCorrect) correctCount++;
        else incorrectCount++;
      } else {
        // Manual grading required for essay, short-answer
        questionScores[qId] = {
          scoreEarned: 0,
          isCorrect: null,
          maxPoints: points
        };
        requiresManualGrading = true;
      }
    }

    // Calculate percentage and grade
    const percentage = (totalScore / attempt.maxScore) * 100;
    const passed = percentage >= exam.passingScore;
    const gradeLetter = calculateGradeLetter(percentage);

    // Determine status
    const status = requiresManualGrading ? 'submitted' : 'graded';
    const gradedAt = requiresManualGrading ? null : new Date();

    // Count unanswered
    const answeredCount = Object.keys(attempt.answers || {}).length;
    const unansweredCount = questionOrder.length - answeredCount;

    // Update attempt
    attempt.status = status as any;
    attempt.score = totalScore;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.gradeLetter = gradeLetter;
    attempt.questionScores = questionScores;
    attempt.submittedAt = new Date();
    attempt.gradedAt = gradedAt || undefined;
    attempt.timeSpent = timeSpent;

    await attempt.save();

    return {
      attemptId: attemptId,
      status: status,
      score: totalScore,
      maxScore: attempt.maxScore,
      percentage,
      passed,
      gradeLetter,
      autoGraded: !requiresManualGrading,
      requiresManualGrading,
      submittedAt: attempt.submittedAt,
      gradedAt: gradedAt,
      timeSpent,
      answeredCount,
      totalQuestions: questionOrder.length,
      correctCount,
      incorrectCount,
      unansweredCount
    };
  }

  /**
   * Get exam results with feedback
   */
  static async getResults(attemptId: string, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw ApiError.notFound('Exam attempt not found');
    }

    const attempt = await ExamResult.findById(attemptId)
      .populate('examId')
      .populate('learnerId', 'firstName lastName')
      .populate('gradedBy', 'firstName lastName')
      .lean();

    if (!attempt) {
      throw ApiError.notFound('Exam attempt not found');
    }

    // Check access permissions
    const user = await User.findById(userId).lean();
    const isOwner = attempt.learnerId._id.toString() === userId;
    const isStaff = user?.roles?.some(r => ['global-admin', 'department-admin', 'content-admin'].includes(r));

    if (!isOwner && !isStaff) {
      throw ApiError.forbidden('Cannot view results for this attempt');
    }

    const exam = attempt.examId as any;
    const learner = attempt.learnerId as any;

    // Only available for graded attempts
    if (attempt.status !== 'graded') {
      throw ApiError.conflict('Attempt has not been graded yet');
    }

    // Check if review is allowed
    if (!exam.allowReview && !isStaff) {
      throw ApiError.conflict('Review not allowed for this exam');
    }

    // Get questions with details
    const questionOrder = attempt.metadata?.questionOrder || [];
    const questions = await Question.find({ _id: { $in: questionOrder } }).lean();
    const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

    // Build question results
    const questionResults = questionOrder.map((qId: string, index: number) => {
      const question = questionMap.get(qId);
      if (!question) return null;

      const userAnswer = attempt.answers?.[qId] || null;
      const scoreData = attempt.questionScores?.[qId] || {};
      const feedback = attempt.questionFeedback?.[qId] || null;

      // Show correct answer only if review allowed
      const correctAnswer = exam.allowReview
        ? (question.correctAnswer || question.correctAnswers?.[0] || null)
        : null;

      return {
        questionId: question._id.toString(),
        questionNumber: index + 1,
        questionText: question.questionText,
        questionType: question.questionType.replace('-', '_'),
        points: scoreData.maxPoints || question.points,
        scoreEarned: scoreData.scoreEarned || 0,
        userAnswer,
        correctAnswer,
        isCorrect: scoreData.isCorrect !== null ? scoreData.isCorrect : false,
        feedback,
        explanation: exam.showFeedback ? question.explanation || '' : ''
      };
    }).filter(Boolean);

    // Calculate summary stats
    const answeredCount = Object.keys(attempt.answers || {}).length;
    const unansweredCount = questionOrder.length - answeredCount;
    const correctCount = questionResults.filter((q: any) => q.isCorrect === true).length;
    const incorrectCount = questionResults.filter((q: any) => q.isCorrect === false).length;
    const partialCreditCount = questionResults.filter((q: any) =>
      q.scoreEarned > 0 && q.scoreEarned < q.points && q.isCorrect === null
    ).length;

    // Format graded by
    let gradedBy = null;
    if (attempt.gradedBy) {
      const grader = attempt.gradedBy as any;
      gradedBy = {
        id: grader._id?.toString() || '',
        firstName: grader.firstName || '',
        lastName: grader.lastName || ''
      };
    }

    return {
      attemptId: attempt._id.toString(),
      examTitle: exam.title,
      learnerName: learner.person.firstName && learner.person.lastName ? `${learner.person.firstName} ${learner.person.lastName}` : '',
      attemptNumber: attempt.attemptNumber,
      status: 'graded',
      score: attempt.score || 0,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage || 0,
      passed: attempt.passed || false,
      gradeLetter: attempt.gradeLetter || '',
      passingScore: exam.passingScore,
      submittedAt: attempt.submittedAt,
      gradedAt: attempt.gradedAt,
      timeSpent: attempt.timeSpent || 0,
      timeLimit: exam.timeLimit || 0,
      summary: {
        totalQuestions: questionOrder.length,
        answeredCount,
        unansweredCount,
        correctCount,
        incorrectCount,
        partialCreditCount
      },
      questionResults,
      overallFeedback: attempt.feedback || null,
      gradedBy,
      allowReview: exam.allowReview,
      showCorrectAnswers: exam.allowReview
    };
  }

  /**
   * Manual grading by instructor
   */
  static async gradeExam(attemptId: string, data: GradeExamData, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw ApiError.notFound('Exam attempt not found');
    }

    const attempt = await ExamResult.findById(attemptId)
      .populate('examId');

    if (!attempt) {
      throw ApiError.notFound('Exam attempt not found');
    }

    // Check permissions
    const user = await User.findById(userId).lean();
    const isStaff = user?.roles?.some(r => ['global-admin', 'department-admin', 'content-admin'].includes(r));

    if (!isStaff) {
      throw ApiError.forbidden('Insufficient permissions to grade this attempt');
    }

    // Must be submitted
    if (!['submitted', 'graded'].includes(attempt.status)) {
      throw ApiError.conflict('Cannot grade attempt that has not been submitted');
    }

    const exam = attempt.examId as any;

    // Update question grades
    const questionScores = attempt.questionScores || {};
    const questionFeedback = attempt.questionFeedback || {};

    for (const grade of data.questionGrades) {
      if (!mongoose.Types.ObjectId.isValid(grade.questionId)) {
        throw ApiError.badRequest('Invalid question ID');
      }

      // Validate score
      const existingScore = questionScores[grade.questionId];
      if (existingScore && grade.scoreEarned > existingScore.maxPoints) {
        throw ApiError.badRequest(`Score earned cannot exceed ${existingScore.maxPoints} points`);
      }

      questionScores[grade.questionId] = {
        ...questionScores[grade.questionId],
        scoreEarned: grade.scoreEarned,
        isCorrect: grade.scoreEarned === existingScore?.maxPoints
      };

      if (grade.feedback) {
        questionFeedback[grade.questionId] = grade.feedback;
      }
    }

    // Recalculate total score
    let totalScore = 0;
    for (const [, scoreData] of Object.entries(questionScores)) {
      const score = scoreData as any;
      totalScore += score.scoreEarned || 0;
    }

    // Recalculate percentage and grade
    const percentage = (totalScore / attempt.maxScore) * 100;
    const passed = percentage >= exam.passingScore;
    const gradeLetter = calculateGradeLetter(percentage);

    // Update attempt
    attempt.status = 'graded';
    attempt.score = totalScore;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.gradeLetter = gradeLetter;
    attempt.questionScores = questionScores;
    attempt.questionFeedback = questionFeedback;
    attempt.gradedAt = new Date();
    attempt.gradedBy = new mongoose.Types.ObjectId(userId);

    if (data.overallFeedback) {
      attempt.feedback = data.overallFeedback;
    }

    await attempt.save();

    // Get grader info
    const grader = await Staff.findById(userId).lean();

    // Format question grades for response
    const questionGradesResponse = data.questionGrades.map(g => ({
      questionId: g.questionId,
      scoreEarned: g.scoreEarned,
      maxPoints: questionScores[g.questionId]?.maxPoints || 0,
      feedback: g.feedback || null
    }));

    return {
      attemptId: attempt._id.toString(),
      status: 'graded',
      score: totalScore,
      maxScore: attempt.maxScore,
      percentage,
      passed,
      gradeLetter,
      gradedAt: attempt.gradedAt,
      gradedBy: {
        id: userId,
        firstName: grader?.firstName || '',
        lastName: grader?.lastName || ''
      },
      questionGrades: questionGradesResponse
    };
  }

  /**
   * List all attempts for a specific exam
   */
  static async listByExam(examId: string, filters: any, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(examId)) {
      throw ApiError.notFound('Exam not found');
    }

    // Validate exam exists
    const exam = await Exercise.findById(examId).lean();
    if (!exam) {
      throw ApiError.notFound('Exam not found');
    }

    // Check permissions
    const user = await User.findById(userId).lean();
    const isStaff = user?.roles?.some(r => ['global-admin', 'department-admin', 'content-admin'].includes(r));

    if (!isStaff) {
      throw ApiError.forbidden('Insufficient permissions to view exam attempts');
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { examId };

    // Status filter
    if (filters.status) {
      const statusMap: Record<string, string> = {
        'started': 'in-progress',
        'in_progress': 'in-progress',
        'submitted': 'submitted',
        'grading': 'submitted',
        'graded': 'graded'
      };
      query.status = statusMap[filters.status] || filters.status;
    }

    // Passed filter
    if (filters.passed !== undefined) {
      query.passed = filters.passed === 'true' || filters.passed === true;
    }

    // Parse sort
    const sortField = filters.sort || '-submittedAt';
    const sortDirection = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortObj: any = { [sortKey]: sortDirection };

    // Execute query
    const [attempts, total] = await Promise.all([
      ExamResult.find(query)
        .populate('learnerId', 'firstName lastName email')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      ExamResult.countDocuments(query)
    ]);

    // Calculate statistics from completed attempts
    const completedAttempts = await ExamResult.find({
      examId,
      status: { $in: ['graded', 'submitted'] }
    }).lean();

    const inProgressAttempts = await ExamResult.countDocuments({
      examId,
      status: 'in-progress'
    });

    const avgScore = completedAttempts.length > 0
      ? completedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / completedAttempts.length
      : 0;

    const avgPercentage = completedAttempts.length > 0
      ? completedAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / completedAttempts.length
      : 0;

    const passedCount = completedAttempts.filter(a => a.passed).length;
    const passRate = completedAttempts.length > 0 ? passedCount / completedAttempts.length : 0;

    const avgTimeSpent = completedAttempts.length > 0
      ? completedAttempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / completedAttempts.length
      : 0;

    // Format attempts
    const attemptsData = attempts.map((attempt: any) => {
      const learner = attempt.learnerId || {};
      const requiresGrading = attempt.status === 'submitted';

      return {
        id: attempt._id.toString(),
        learnerId: learner._id?.toString() || '',
        learnerName: learner.person.firstName && learner.person.lastName ? `${learner.person.firstName} ${learner.person.lastName}` : '',
        learnerEmail: learner.email || '',
        attemptNumber: attempt.attemptNumber,
        status: attempt.status === 'in-progress' ? 'in_progress' : attempt.status,
        score: attempt.score || 0,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage || 0,
        passed: attempt.passed || false,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt || null,
        gradedAt: attempt.gradedAt || null,
        timeSpent: attempt.timeSpent || 0,
        requiresGrading
      };
    });

    return {
      examId: examId,
      examTitle: exam.title,
      statistics: {
        totalAttempts: total,
        completedAttempts: completedAttempts.length,
        inProgressAttempts,
        averageScore: Math.round(avgScore * 100) / 100,
        averagePercentage: Math.round(avgPercentage * 100) / 100,
        passRate: Math.round(passRate * 100) / 100,
        averageTimeSpent: Math.round(avgTimeSpent)
      },
      attempts: attemptsData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }
}
