/**
 * AI-Friendly Validation Pipeline Service
 * Validates complete course structures in one pass
 * Collects ALL errors (doesn't fail fast)
 * Provides helpful suggestions and actionable error messages
 */

import { Types } from 'mongoose';
import { ResolverService } from './resolver.service';
import {
  AICourseInput,
  AIModuleInput,
  AIExerciseInput,
  AIQuestionInput,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationContext,
} from '@/types/ai.types';

/**
 * ValidationService - Comprehensive validation for AI course creation
 */
export class ValidationService {
  // Course code pattern: alphanumeric, max 35 characters
  private static readonly COURSE_CODE_PATTERN = /^[A-Za-z0-9]+$/;

  /**
   * Validate complete course structure in one pass
   * Collects ALL errors without failing fast
   */
  static async validateCourseStructure(input: AICourseInput): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const resolutions: Record<string, Types.ObjectId> = {};

    if (!input || typeof input !== 'object') {
      errors.push({
        path: 'input',
        message: 'Invalid input: must be an object',
        code: 'INVALID_INPUT',
        severity: 'error',
      });
      return { valid: false, errors, warnings, resolutions };
    }

    // Validate course object exists
    if (!input.course) {
      errors.push({
        path: 'course',
        message: 'Course object is required',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
      });
      return { valid: false, errors, warnings, resolutions };
    }

    // Validate course fields
    await this.validateCourseData(input.course, errors, warnings, resolutions);

    // Validate modules if provided
    if (input.modules && Array.isArray(input.modules)) {
      await this.validateModules(input.modules, errors, warnings, resolutions);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      resolutions,
    };
  }

  /**
   * Validate course data
   */
  private static async validateCourseData(
    course: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    resolutions: Record<string, Types.ObjectId>
  ): Promise<void> {
    // Validate required fields
    if (!course.title || typeof course.title !== 'string' || course.title.trim() === '') {
      errors.push({
        path: 'course.title',
        field: 'title',
        message: 'Course title is required and must be a non-empty string',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        value: course.title,
      });
    }

    if (!course.code || typeof course.code !== 'string' || course.code.trim() === '') {
      errors.push({
        path: 'course.code',
        field: 'code',
        message: 'Course code is required and must be a non-empty string',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        value: course.code,
      });
    } else if (!this.COURSE_CODE_PATTERN.test(course.code)) {
      errors.push({
        path: 'course.code',
        field: 'code',
        message: `Course code must be 2-4 uppercase letters followed by 3 digits (e.g., CS101, MATH200, ENG301A)`,
        code: 'INVALID_COURSE_CODE',
        severity: 'error',
        value: course.code,
        suggestions: [
          'Ensure code starts with 2-4 uppercase letters',
          'Follow letters with exactly 3 digits',
          'Optionally end with a single uppercase letter',
        ],
      });
    }

    if (!course.department || typeof course.department !== 'string' || course.department.trim() === '') {
      errors.push({
        path: 'course.department',
        field: 'department',
        message: 'Department is required and must be a non-empty string',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        value: course.department,
      });
    } else {
      // Validate department exists
      const deptResult = await ResolverService.resolveDepartment(course.department, {
        useCache: true,
      });

      if (deptResult.success && deptResult.objectId) {
        resolutions['course.department'] = deptResult.objectId;

        // Validate program if provided
        if (course.program) {
          const programResult = await ResolverService.resolveProgram(
            course.program,
            deptResult.objectId.toString(),
            { useCache: true }
          );

          if (programResult.success && programResult.objectId) {
            resolutions['course.program'] = programResult.objectId;
          } else {
            errors.push({
              path: 'course.program',
              field: 'program',
              message: programResult.error || 'Program not found in specified department',
              code: 'PROGRAM_NOT_FOUND',
              severity: 'error',
              value: course.program,
              suggestions: programResult.suggestions,
            });
          }
        }

        // Validate instructors if provided (warnings only)
        if (course.instructors && Array.isArray(course.instructors)) {
          for (let i = 0; i < course.instructors.length; i++) {
            const instructor = course.instructors[i];
            const instructorResult = await ResolverService.resolveInstructor(
              instructor,
              deptResult.objectId.toString(),
              { useCache: true }
            );

            if (instructorResult.success && instructorResult.objectId) {
              resolutions[`course.instructors[${i}]`] = instructorResult.objectId;
            } else {
              warnings.push({
                path: `course.instructors[${i}]`,
                message:
                  instructorResult.error || `Instructor "${instructor}" not found in department`,
                code: 'INSTRUCTOR_NOT_FOUND',
                suggestions: instructorResult.suggestions,
                impact: 'Course will be created without this instructor',
              });
            }
          }
        }

        // Validate prerequisites if provided
        if (course.prerequisites && Array.isArray(course.prerequisites)) {
          for (let i = 0; i < course.prerequisites.length; i++) {
            const prereq = course.prerequisites[i];
            const prereqResult = await ResolverService.resolveCourse(
              prereq,
              deptResult.objectId.toString(),
              { useCache: true }
            );

            if (prereqResult.success && prereqResult.objectId) {
              resolutions[`course.prerequisites[${i}]`] = prereqResult.objectId;
            } else {
              errors.push({
                path: `course.prerequisites[${i}]`,
                field: 'prerequisites',
                message: prereqResult.error || `Prerequisite course "${prereq}" not found`,
                code: 'PREREQUISITE_NOT_FOUND',
                severity: 'error',
                value: prereq,
                suggestions: prereqResult.suggestions,
              });
            }
          }
        }
      } else {
        errors.push({
          path: 'course.department',
          field: 'department',
          message: deptResult.error || `Department "${course.department}" not found`,
          code: 'DEPARTMENT_NOT_FOUND',
          severity: 'error',
          value: course.department,
          suggestions: deptResult.suggestions,
        });
      }
    }

    // Validate credits
    if (course.credits === undefined || course.credits === null) {
      errors.push({
        path: 'course.credits',
        field: 'credits',
        message: 'Credits are required',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
      });
    } else if (typeof course.credits !== 'number' || course.credits <= 0) {
      errors.push({
        path: 'course.credits',
        field: 'credits',
        message: 'Credits must be a positive number',
        code: 'INVALID_CREDITS',
        severity: 'error',
        value: course.credits,
        suggestions: ['Credits must be greater than 0'],
      });
    }
  }

  /**
   * Validate modules array
   */
  private static async validateModules(
    modules: AIModuleInput[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
    _resolutions: Record<string, Types.ObjectId>
  ): Promise<void> {
    // Check for module ordering if orderIndex is provided
    const modulesWithOrder = modules.filter((m) => m.orderIndex !== undefined);
    if (modulesWithOrder.length > 0) {
      const orders = modulesWithOrder.map((m) => m.orderIndex as number).sort((a, b) => a - b);

      // Check if ordering is sequential (1, 2, 3...)
      for (let i = 0; i < orders.length; i++) {
        if (orders[i] !== i + 1) {
          errors.push({
            path: 'modules',
            message: `Module ordering must be sequential starting from 1. Found gap or duplicate at position ${i + 1}`,
            code: 'INVALID_MODULE_ORDERING',
            severity: 'error',
            value: orders,
            suggestions: [
              'Ensure module orderIndex values are sequential: 1, 2, 3, ...',
              'Or omit orderIndex to let the system auto-assign sequential values',
            ],
          });
          break;
        }
      }
    }

    // Validate each module
    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];
      const moduleResult = await this.validateModule(module, {});

      // Prefix all paths with modules[i]
      moduleResult.errors.forEach((err) => {
        errors.push({
          ...err,
          path: `modules[${i}].${err.path}`,
        });
      });

      moduleResult.warnings.forEach((warn) => {
        warnings.push({
          ...warn,
          path: `modules[${i}].${warn.path}`,
        });
      });
    }
  }

  /**
   * Validate a single module
   */
  static async validateModule(
    module: AIModuleInput,
    _context: ValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const resolutions: Record<string, Types.ObjectId> = {};

    if (!module || typeof module !== 'object') {
      errors.push({
        path: 'module',
        message: 'Invalid module: must be an object',
        code: 'INVALID_INPUT',
        severity: 'error',
      });
      return { valid: false, errors, warnings, resolutions };
    }

    // Validate required fields
    if (!module.title || typeof module.title !== 'string' || module.title.trim() === '') {
      errors.push({
        path: 'title',
        field: 'title',
        message: 'Module title is required and must be a non-empty string',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        value: module.title,
      });
    }

    if (!module.type) {
      errors.push({
        path: 'type',
        field: 'type',
        message: 'Module type is required',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
      });
    } else {
      const validTypes = ['custom', 'scorm', 'video', 'document', 'exercise'];
      if (!validTypes.includes(module.type)) {
        errors.push({
          path: 'type',
          field: 'type',
          message: `Invalid module type. Must be one of: ${validTypes.join(', ')}`,
          code: 'INVALID_MODULE_TYPE',
          severity: 'error',
          value: module.type,
          suggestions: validTypes,
        });
      } else {
        // Validate content based on type
        await this.validateModuleContent(module, errors, warnings);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      resolutions,
    };
  }

  /**
   * Validate module content based on type
   */
  private static async validateModuleContent(
    module: AIModuleInput,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    switch (module.type) {
      case 'scorm':
        if (!module.content || !module.content.scormPackage) {
          errors.push({
            path: 'content.scormPackage',
            field: 'scormPackage',
            message: 'SCORM module must have a scormPackage URL',
            code: 'MISSING_SCORM_PACKAGE',
            severity: 'error',
            suggestions: ['Provide a valid URL to the SCORM package'],
          });
        }
        break;

      case 'video':
        if (!module.content || !module.content.videoUrl) {
          errors.push({
            path: 'content.videoUrl',
            field: 'videoUrl',
            message: 'Video module must have a videoUrl',
            code: 'MISSING_VIDEO_URL',
            severity: 'error',
            suggestions: ['Provide a valid URL to the video'],
          });
        }
        break;

      case 'document':
        if (!module.content || !module.content.documentUrl) {
          errors.push({
            path: 'content.documentUrl',
            field: 'documentUrl',
            message: 'Document module must have a documentUrl',
            code: 'MISSING_DOCUMENT_URL',
            severity: 'error',
            suggestions: ['Provide a valid URL to the document'],
          });
        }
        break;

      case 'custom':
        if (
          !module.content ||
          (!module.content.text &&
            (!module.content.attachments || module.content.attachments.length === 0))
        ) {
          errors.push({
            path: 'content',
            field: 'content',
            message: 'Custom module must have either text content or attachments',
            code: 'MISSING_CUSTOM_CONTENT',
            severity: 'error',
            suggestions: ['Provide text content', 'Or provide at least one attachment'],
          });
        }
        break;

      case 'exercise':
        if (!module.exercise) {
          errors.push({
            path: 'exercise',
            field: 'exercise',
            message: 'Exercise module must have an exercise object',
            code: 'MISSING_EXERCISE',
            severity: 'error',
            suggestions: ['Provide an exercise object with questions'],
          });
        } else {
          // Validate the exercise
          const exerciseResult = await this.validateExercise(module.exercise, {});
          exerciseResult.errors.forEach((err) => {
            errors.push({
              ...err,
              path: `exercise.${err.path}`,
            });
          });
          exerciseResult.warnings.forEach((warn) => {
            warnings.push({
              ...warn,
              path: `exercise.${warn.path}`,
            });
          });
        }
        break;
    }
  }

  /**
   * Validate an exercise/quiz
   */
  static async validateExercise(
    exercise: AIExerciseInput,
    _context: ValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const resolutions: Record<string, Types.ObjectId> = {};

    if (!exercise || typeof exercise !== 'object') {
      errors.push({
        path: 'exercise',
        message: 'Invalid exercise: must be an object',
        code: 'INVALID_INPUT',
        severity: 'error',
      });
      return { valid: false, errors, warnings, resolutions };
    }

    // Validate required fields
    if (!exercise.title || typeof exercise.title !== 'string' || exercise.title.trim() === '') {
      errors.push({
        path: 'title',
        field: 'title',
        message: 'Exercise title is required and must be a non-empty string',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        value: exercise.title,
      });
    }

    if (!exercise.type) {
      errors.push({
        path: 'type',
        field: 'type',
        message: 'Exercise type is required',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
      });
    } else {
      const validTypes = ['quiz', 'exam', 'practice', 'assessment'];
      if (!validTypes.includes(exercise.type)) {
        errors.push({
          path: 'type',
          field: 'type',
          message: `Invalid exercise type. Must be one of: ${validTypes.join(', ')}`,
          code: 'INVALID_EXERCISE_TYPE',
          severity: 'error',
          value: exercise.type,
          suggestions: validTypes,
        });
      }
    }

    // Validate passingScore
    if (exercise.passingScore === undefined || exercise.passingScore === null) {
      errors.push({
        path: 'passingScore',
        field: 'passingScore',
        message: 'Passing score is required',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
      });
    } else if (
      typeof exercise.passingScore !== 'number' ||
      exercise.passingScore < 0 ||
      exercise.passingScore > 100
    ) {
      errors.push({
        path: 'passingScore',
        field: 'passingScore',
        message: 'Passing score must be a number between 0 and 100',
        code: 'INVALID_PASSING_SCORE',
        severity: 'error',
        value: exercise.passingScore,
        suggestions: ['Set passing score between 0 and 100'],
      });
    }

    // Validate timeLimit if provided
    if (exercise.timeLimit !== undefined && exercise.timeLimit !== null) {
      if (typeof exercise.timeLimit !== 'number' || exercise.timeLimit <= 0) {
        errors.push({
          path: 'timeLimit',
          field: 'timeLimit',
          message: 'Time limit must be a positive number (in minutes)',
          code: 'INVALID_TIME_LIMIT',
          severity: 'error',
          value: exercise.timeLimit,
          suggestions: ['Set time limit to a positive number', 'Or omit timeLimit for no time limit'],
        });
      }
    }

    // Validate questions
    if (!exercise.questions || !Array.isArray(exercise.questions)) {
      errors.push({
        path: 'questions',
        field: 'questions',
        message: 'Questions array is required',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
      });
    } else if (exercise.questions.length === 0) {
      errors.push({
        path: 'questions',
        field: 'questions',
        message: 'Exercise must have at least one question',
        code: 'NO_QUESTIONS',
        severity: 'error',
        suggestions: ['Add at least one question to the exercise'],
      });
    } else {
      // Validate each question
      for (let i = 0; i < exercise.questions.length; i++) {
        const question = exercise.questions[i];
        this.validateQuestion(question, i, errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      resolutions,
    };
  }

  /**
   * Validate a single question
   */
  private static validateQuestion(
    question: AIQuestionInput,
    index: number,
    errors: ValidationError[]
  ): void {
    const basePath = `questions[${index}]`;

    // Validate required fields
    if (!question.type) {
      errors.push({
        path: `${basePath}.type`,
        field: 'type',
        message: 'Question type is required',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
      });
      return;
    }

    if (!question.questionText || question.questionText.trim() === '') {
      errors.push({
        path: `${basePath}.questionText`,
        field: 'questionText',
        message: 'Question text is required',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
        value: question.questionText,
      });
    }

    if (question.points === undefined || question.points === null) {
      errors.push({
        path: `${basePath}.points`,
        field: 'points',
        message: 'Question points are required',
        code: 'MISSING_REQUIRED_FIELD',
        severity: 'error',
      });
    } else if (typeof question.points !== 'number' || question.points <= 0) {
      errors.push({
        path: `${basePath}.points`,
        field: 'points',
        message: 'Question points must be a positive number',
        code: 'INVALID_POINTS',
        severity: 'error',
        value: question.points,
        suggestions: ['Set points to a positive number'],
      });
    }

    // Validate based on question type
    const validTypes = ['multiple_choice', 'true_false', 'essay', 'short_answer', 'fill_blank'];
    if (!validTypes.includes(question.type)) {
      errors.push({
        path: `${basePath}.type`,
        field: 'type',
        message: `Invalid question type. Must be one of: ${validTypes.join(', ')}`,
        code: 'INVALID_QUESTION_TYPE',
        severity: 'error',
        value: question.type,
        suggestions: validTypes,
      });
      return;
    }

    switch (question.type) {
      case 'multiple_choice':
        this.validateMultipleChoiceQuestion(question, basePath, errors);
        break;

      case 'true_false':
        this.validateTrueFalseQuestion(question, basePath, errors);
        break;

      case 'essay':
        // Essay questions don't require correctAnswer, just points and text
        // sampleAnswer is optional
        break;

      case 'short_answer':
      case 'fill_blank':
        this.validateTextAnswerQuestion(question, basePath, errors);
        break;
    }
  }

  /**
   * Validate multiple choice question
   */
  private static validateMultipleChoiceQuestion(
    question: AIQuestionInput,
    basePath: string,
    errors: ValidationError[]
  ): void {
    if (!question.options || !Array.isArray(question.options)) {
      errors.push({
        path: `${basePath}.options`,
        field: 'options',
        message: 'Multiple choice question must have options array',
        code: 'MISSING_OPTIONS',
        severity: 'error',
        suggestions: ['Provide at least 2 options for the multiple choice question'],
      });
      return;
    }

    if (question.options.length < 2) {
      errors.push({
        path: `${basePath}.options`,
        field: 'options',
        message: 'Multiple choice question must have at least 2 options',
        code: 'INSUFFICIENT_OPTIONS',
        severity: 'error',
        value: question.options,
        suggestions: ['Add at least 2 options to the question'],
      });
    }

    // Check if at least one option is correct
    const hasCorrectAnswer = question.options.some((opt) => opt.isCorrect === true);
    if (!hasCorrectAnswer) {
      errors.push({
        path: `${basePath}.options`,
        field: 'options',
        message: 'Multiple choice question must have at least one correct answer',
        code: 'NO_CORRECT_ANSWER',
        severity: 'error',
        suggestions: ['Mark at least one option as correct (isCorrect: true)'],
      });
    }
  }

  /**
   * Validate true/false question
   */
  private static validateTrueFalseQuestion(
    question: AIQuestionInput,
    basePath: string,
    errors: ValidationError[]
  ): void {
    if (question.correctAnswer === undefined || question.correctAnswer === null) {
      errors.push({
        path: `${basePath}.correctAnswer`,
        field: 'correctAnswer',
        message: 'True/false question must have a correctAnswer (true or false)',
        code: 'MISSING_CORRECT_ANSWER',
        severity: 'error',
        suggestions: ['Set correctAnswer to true or false'],
      });
    } else if (typeof question.correctAnswer !== 'boolean') {
      errors.push({
        path: `${basePath}.correctAnswer`,
        field: 'correctAnswer',
        message: 'True/false question correctAnswer must be a boolean',
        code: 'INVALID_CORRECT_ANSWER_TYPE',
        severity: 'error',
        value: question.correctAnswer,
        suggestions: ['Set correctAnswer to true or false (boolean)'],
      });
    }
  }

  /**
   * Validate text answer question (short_answer, fill_blank)
   */
  private static validateTextAnswerQuestion(
    question: AIQuestionInput,
    basePath: string,
    errors: ValidationError[]
  ): void {
    if (!question.correctAnswer || typeof question.correctAnswer !== 'string') {
      errors.push({
        path: `${basePath}.correctAnswer`,
        field: 'correctAnswer',
        message: `${question.type} question must have a correctAnswer (string)`,
        code: 'MISSING_CORRECT_ANSWER',
        severity: 'error',
        suggestions: ['Provide the correct answer as a string'],
      });
    }
  }
}
