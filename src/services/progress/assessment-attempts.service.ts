import mongoose from 'mongoose';
import AssessmentAttempt, {
  IAssessmentAttempt,
  IQuestionAttempt
} from '@/models/progress/AssessmentAttempt.model';
import Assessment, { IAssessment } from '@/models/content/Assessment.model';
import Question from '@/models/assessment/Question.model';
import { ApiError } from '@/utils/ApiError';

interface ListAttemptsFilters {
  status?: 'in_progress' | 'submitted' | 'graded';
  page?: number;
  limit?: number;
}

interface ResponseInput {
  questionId: string;
  response: any;
}

interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * AssessmentAttemptsService
 * Handles assessment attempt lifecycle: start, save, submit, grade, and results
 */
export class AssessmentAttemptsService {
  /**
   * Start a new assessment attempt
   */
  static async startAttempt(
    assessmentId: string,
    learnerId: string,
    enrollmentId: string,
    moduleId?: string,
    learningUnitId?: string
  ): Promise<IAssessmentAttempt> {
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      throw ApiError.notFound('Assessment not found');
    }

    // Fetch the assessment
    const assessment = await Assessment.findOne({
      _id: assessmentId,
      isPublished: true,
      isArchived: false
    }).lean() as IAssessment | null;

    if (!assessment) {
      throw ApiError.notFound('Assessment not found or not published');
    }

    // Check for existing in-progress attempt
    const existingAttempt = await AssessmentAttempt.findOne({
      assessmentId,
      learnerId,
      status: 'in_progress'
    });

    if (existingAttempt) {
      throw ApiError.conflict('An attempt is already in progress for this assessment');
    }

    // Count previous attempts
    const previousAttemptCount = await AssessmentAttempt.countDocuments({
      assessmentId,
      learnerId,
      status: { $in: ['submitted', 'graded', 'abandoned'] }
    });

    // Check max attempts limit
    if (assessment.attempts.maxAttempts !== null && previousAttemptCount >= assessment.attempts.maxAttempts) {
      throw ApiError.conflict('Maximum attempts reached for this assessment');
    }

    // Get questions from question banks
    const questions = await this.selectQuestions(assessment);

    // Create question attempts
    const questionAttempts: IQuestionAttempt[] = questions.map((q) => ({
      questionId: q._id as mongoose.Types.ObjectId,
      questionSnapshot: {
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        correctAnswer: q.correctAnswer,
        correctAnswers: q.correctAnswers,
        modelAnswer: q.modelAnswer,
        matchingPairs: q.matchingPairs,
        maxWordCount: q.maxWordCount,
        explanation: q.explanation,
        hints: q.hints
      },
      pointsPossible: q.points
    }));

    // Determine if manual grading will be required
    const requiresManualGrading = questions.some(
      (q) => q.questionType === 'essay' || q.questionType === 'short-answer'
    );

    // Create the attempt
    const now = new Date();
    const attempt = await AssessmentAttempt.create({
      assessmentId,
      learnerId,
      enrollmentId,
      moduleId: moduleId || undefined,
      learningUnitId: learningUnitId || undefined,
      attemptNumber: previousAttemptCount + 1,
      status: 'in_progress',
      questions: questionAttempts,
      timing: {
        startedAt: now,
        lastActivityAt: now,
        timeSpentSeconds: 0,
        timeLimitSeconds: assessment.timing.timeLimit || undefined
      },
      scoring: {
        gradingComplete: false,
        requiresManualGrading
      }
    });

    return attempt;
  }

  /**
   * Get the current in-progress attempt for a learner
   */
  static async getCurrentAttempt(
    assessmentId: string,
    learnerId: string
  ): Promise<IAssessmentAttempt | null> {
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      return null;
    }

    const attempt = await AssessmentAttempt.findOne({
      assessmentId,
      learnerId,
      status: 'in_progress'
    });

    return attempt;
  }

  /**
   * Save progress (auto-save responses)
   */
  static async saveProgress(
    attemptId: string,
    responses: ResponseInput[]
  ): Promise<IAssessmentAttempt> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw ApiError.notFound('Attempt not found');
    }

    const attempt = await AssessmentAttempt.findById(attemptId);

    if (!attempt) {
      throw ApiError.notFound('Attempt not found');
    }

    if (attempt.status !== 'in_progress') {
      throw ApiError.conflict('Attempt is not in progress');
    }

    // Check time limit if applicable
    if (attempt.timing.timeLimitSeconds) {
      const elapsed = Math.floor(
        (Date.now() - new Date(attempt.timing.startedAt).getTime()) / 1000
      );
      if (elapsed > attempt.timing.timeLimitSeconds) {
        throw ApiError.conflict('Time limit exceeded');
      }
    }

    // Update responses
    for (const resp of responses) {
      const questionIndex = attempt.questions.findIndex(
        (q) => q.questionId.toString() === resp.questionId
      );
      if (questionIndex !== -1) {
        attempt.questions[questionIndex].response = resp.response;
      }
    }

    // Update timing
    const now = new Date();
    const timeSpent = Math.floor(
      (now.getTime() - new Date(attempt.timing.startedAt).getTime()) / 1000
    );
    attempt.timing.lastActivityAt = now;
    attempt.timing.timeSpentSeconds = timeSpent;

    await attempt.save();
    return attempt;
  }

  /**
   * Submit attempt for grading
   */
  static async submitAttempt(attemptId: string): Promise<IAssessmentAttempt> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw ApiError.notFound('Attempt not found');
    }

    const attempt = await AssessmentAttempt.findById(attemptId);

    if (!attempt) {
      throw ApiError.notFound('Attempt not found');
    }

    if (attempt.status !== 'in_progress') {
      throw ApiError.conflict('Attempt has already been submitted');
    }

    // Auto-grade objective questions
    let totalPointsEarned = 0;
    let totalPointsPossible = 0;
    let allQuestionsGraded = true;
    let requiresManualGrading = false;

    for (const question of attempt.questions) {
      totalPointsPossible += question.pointsPossible;
      const gradeResult = this.autoGradeQuestion(question);

      if (gradeResult.graded) {
        question.isCorrect = gradeResult.isCorrect;
        question.pointsEarned = gradeResult.pointsEarned;
        question.gradedAt = new Date();
        totalPointsEarned += gradeResult.pointsEarned;
      } else {
        allQuestionsGraded = false;
        requiresManualGrading = true;
      }
    }

    // Update timing
    const now = new Date();
    attempt.timing.submittedAt = now;
    attempt.timing.lastActivityAt = now;
    attempt.timing.timeSpentSeconds = Math.floor(
      (now.getTime() - new Date(attempt.timing.startedAt).getTime()) / 1000
    );

    // Update scoring
    attempt.scoring.requiresManualGrading = requiresManualGrading;
    attempt.scoring.gradingComplete = allQuestionsGraded;

    if (allQuestionsGraded) {
      attempt.status = 'graded';
      attempt.scoring.rawScore = totalPointsEarned;
      attempt.scoring.percentageScore = totalPointsPossible > 0
        ? Math.round((totalPointsEarned / totalPointsPossible) * 10000) / 100
        : 0;

      // Determine pass/fail using assessment's passing score
      const assessment = await Assessment.findById(attempt.assessmentId).lean() as IAssessment | null;
      if (assessment) {
        attempt.scoring.passed = attempt.scoring.percentageScore >= assessment.scoring.passingScore;
      }
    } else {
      attempt.status = 'submitted';
    }

    await attempt.save();
    return attempt;
  }

  /**
   * Get attempt results (respects feedback settings)
   */
  static async getAttemptResults(
    attemptId: string,
    learnerId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw ApiError.notFound('Attempt not found');
    }

    const attempt = await AssessmentAttempt.findById(attemptId).lean();

    if (!attempt) {
      throw ApiError.notFound('Attempt not found');
    }

    // Check ownership
    if (attempt.learnerId.toString() !== learnerId) {
      throw ApiError.forbidden('Access denied');
    }

    // Get assessment for feedback settings
    const assessment = await Assessment.findById(attempt.assessmentId).lean() as IAssessment | null;

    if (!assessment) {
      throw ApiError.notFound('Assessment not found');
    }

    // Determine what to show based on settings
    const showCorrectAnswers = this.shouldShowCorrectAnswers(
      assessment,
      attempt as unknown as IAssessmentAttempt,
      learnerId
    );

    // Build response
    return {
      ...attempt,
      showCorrectAnswers,
      feedbackSettings: assessment.feedback
    };
  }

  /**
   * List attempts for an assessment
   */
  static async listAttempts(
    assessmentId: string,
    learnerId?: string,
    filters?: ListAttemptsFilters
  ): Promise<{ attempts: IAssessmentAttempt[]; pagination: PaginationResult }> {
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      throw ApiError.notFound('Assessment not found');
    }

    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { assessmentId };

    if (learnerId) {
      query.learnerId = learnerId;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    // Execute query
    const [attempts, total] = await Promise.all([
      AssessmentAttempt.find(query)
        .sort({ attemptNumber: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AssessmentAttempt.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      attempts: attempts as unknown as IAssessmentAttempt[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Grade a specific question manually (for essay/short-answer)
   */
  static async gradeQuestion(
    attemptId: string,
    questionIndex: number,
    score: number,
    feedback: string,
    gradedBy: string
  ): Promise<IAssessmentAttempt> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw ApiError.notFound('Attempt not found');
    }

    const attempt = await AssessmentAttempt.findById(attemptId);

    if (!attempt) {
      throw ApiError.notFound('Attempt not found');
    }

    if (attempt.status !== 'submitted' && attempt.status !== 'graded') {
      throw ApiError.conflict('Attempt must be submitted before grading');
    }

    if (questionIndex < 0 || questionIndex >= attempt.questions.length) {
      throw ApiError.badRequest('Invalid question index');
    }

    const question = attempt.questions[questionIndex];

    if (score < 0 || score > question.pointsPossible) {
      throw ApiError.badRequest(
        `Score cannot exceed points possible (${question.pointsPossible})`
      );
    }

    // Update question grading
    question.pointsEarned = score;
    question.feedback = feedback;
    question.gradedBy = new mongoose.Types.ObjectId(gradedBy);
    question.gradedAt = new Date();
    question.isCorrect = score === question.pointsPossible;

    // Check if all questions are now graded
    const allGraded = this.checkAllQuestionsGraded(attempt);

    if (allGraded) {
      attempt.status = 'graded';
      attempt.scoring.gradingComplete = true;

      // Recalculate total score
      const { rawScore, percentageScore } = this.calculateTotalScore(attempt);
      attempt.scoring.rawScore = rawScore;
      attempt.scoring.percentageScore = percentageScore;

      // Determine pass/fail
      const assessment = await Assessment.findById(attempt.assessmentId).lean() as IAssessment | null;
      if (assessment) {
        attempt.scoring.passed = percentageScore >= assessment.scoring.passingScore;
      }
    }

    await attempt.save();
    return attempt;
  }

  // ============ HELPER METHODS ============

  /**
   * Select questions from question banks based on assessment configuration
   */
  private static async selectQuestions(assessment: IAssessment): Promise<any[]> {
    const { questionBankIds, questionCount, selectionMode, filterByTags, filterByDifficulty } =
      assessment.questionSelection;

    // Build query for questions
    const query: any = {
      questionBankIds: { $in: questionBankIds },
      isActive: true
    };

    if (filterByTags && filterByTags.length > 0) {
      query.tags = { $in: filterByTags };
    }

    if (filterByDifficulty && filterByDifficulty.length > 0) {
      query.difficulty = { $in: filterByDifficulty };
    }

    let questions = await Question.find(query).lean();

    // Apply selection mode
    if (selectionMode === 'random') {
      questions = this.shuffleArray(questions);
    }
    // 'sequential' keeps original order
    // 'weighted' would require additional logic based on difficulty weights

    // Limit to questionCount
    return questions.slice(0, questionCount);
  }

  /**
   * Auto-grade a question based on its type
   */
  private static autoGradeQuestion(
    question: IQuestionAttempt
  ): { graded: boolean; isCorrect: boolean; pointsEarned: number } {
    const questionType = question.questionSnapshot?.questionType;
    const response = question.response;

    // If no response, mark as incorrect
    if (response === undefined || response === null || response === '') {
      if (questionType === 'essay') {
        return { graded: false, isCorrect: false, pointsEarned: 0 };
      }
      return { graded: true, isCorrect: false, pointsEarned: 0 };
    }

    switch (questionType) {
      case 'multiple-choice':
      case 'true-false': {
        const correctAnswer = question.questionSnapshot?.correctAnswer;
        const isCorrect = String(response).toLowerCase() === String(correctAnswer).toLowerCase();
        return {
          graded: true,
          isCorrect,
          pointsEarned: isCorrect ? question.pointsPossible : 0
        };
      }

      case 'short-answer': {
        const correctAnswers = question.questionSnapshot?.correctAnswers || [];
        const correctAnswer = question.questionSnapshot?.correctAnswer;

        // Check against array of correct answers
        const allAnswers = correctAnswer
          ? [correctAnswer, ...correctAnswers]
          : correctAnswers;

        const isCorrect = allAnswers.some(
          (ans: string) => String(ans).toLowerCase().trim() === String(response).toLowerCase().trim()
        );

        return {
          graded: true,
          isCorrect,
          pointsEarned: isCorrect ? question.pointsPossible : 0
        };
      }

      case 'essay':
        // Essay questions require manual grading
        return { graded: false, isCorrect: false, pointsEarned: 0 };

      case 'fill-blank': {
        const correctAnswer = question.questionSnapshot?.correctAnswer;
        const isCorrect = String(response).toLowerCase().trim() === String(correctAnswer).toLowerCase().trim();
        return {
          graded: true,
          isCorrect,
          pointsEarned: isCorrect ? question.pointsPossible : 0
        };
      }

      case 'matching': {
        // Matching requires comparing pairs
        const correctPairs = question.questionSnapshot?.matchingPairs || {};
        const responsePairs = response || {};

        let correctCount = 0;
        const totalPairs = Object.keys(correctPairs).length;

        for (const [key, value] of Object.entries(correctPairs)) {
          if (responsePairs[key] === value) {
            correctCount++;
          }
        }

        const isCorrect = correctCount === totalPairs;
        const partialScore = totalPairs > 0
          ? Math.round((correctCount / totalPairs) * question.pointsPossible)
          : 0;

        return {
          graded: true,
          isCorrect,
          pointsEarned: partialScore
        };
      }

      default:
        // Unknown question type - require manual grading
        return { graded: false, isCorrect: false, pointsEarned: 0 };
    }
  }

  /**
   * Calculate total score from all graded questions
   */
  private static calculateTotalScore(
    attempt: IAssessmentAttempt
  ): { rawScore: number; percentageScore: number } {
    let rawScore = 0;
    let totalPossible = 0;

    for (const question of attempt.questions) {
      totalPossible += question.pointsPossible;
      rawScore += question.pointsEarned || 0;
    }

    const percentageScore = totalPossible > 0
      ? Math.round((rawScore / totalPossible) * 10000) / 100
      : 0;

    return { rawScore, percentageScore };
  }

  /**
   * Check if all questions have been graded
   */
  private static checkAllQuestionsGraded(attempt: IAssessmentAttempt): boolean {
    return attempt.questions.every((q) => q.gradedAt !== undefined);
  }

  /**
   * Determine if correct answers should be shown based on settings
   */
  private static shouldShowCorrectAnswers(
    assessment: IAssessment,
    attempt: IAssessmentAttempt,
    _learnerId: string
  ): boolean {
    const setting = assessment.scoring.showCorrectAnswers;

    switch (setting) {
      case 'never':
        return false;

      case 'after_submit':
        return attempt.status === 'submitted' || attempt.status === 'graded';

      case 'after_all_attempts':
        // Would need to check if user has exhausted all attempts
        // For simplicity, check if graded and max attempts reached
        if (assessment.attempts.maxAttempts === null) {
          return false; // Unlimited attempts, never show
        }
        return attempt.status === 'graded' && attempt.attemptNumber >= assessment.attempts.maxAttempts;

      default:
        return false;
    }
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
