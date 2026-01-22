import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import { ApiError } from '@/utils/ApiError';

/**
 * Custom Joi validator for MongoDB ObjectId
 *
 * @param value - The value to validate
 * @param helpers - Joi helpers object
 * @returns The validated value or throws validation error
 */
const objectIdValidator = (value: string, helpers: Joi.CustomHelpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('string.objectId');
  }
  return value;
};

/**
 * Question selection schema for assessments
 */
const questionSelectionSchema = Joi.object({
  questionBankIds: Joi.array()
    .items(Joi.string().trim())
    .min(1)
    .required()
    .messages({
      'array.min': 'questionSelection.questionBankIds must contain at least 1 item',
      'array.base': 'questionSelection.questionBankIds must be an array',
      'any.required': 'questionSelection.questionBankIds is required'
    }),
  questionCount: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.min': 'questionSelection.questionCount must be at least 1',
      'number.base': 'questionSelection.questionCount must be a number',
      'any.required': 'questionSelection.questionCount is required'
    }),
  selectionMode: Joi.string()
    .valid('random', 'sequential', 'weighted')
    .required()
    .messages({
      'any.only': 'questionSelection.selectionMode must be one of: random, sequential, weighted',
      'any.required': 'questionSelection.selectionMode is required'
    }),
  filterByTags: Joi.array()
    .items(Joi.string().trim())
    .optional()
    .messages({
      'array.base': 'questionSelection.filterByTags must be an array'
    }),
  filterByDifficulty: Joi.array()
    .items(Joi.string().valid('beginner', 'intermediate', 'advanced'))
    .optional()
    .messages({
      'array.base': 'questionSelection.filterByDifficulty must be an array',
      'any.only': 'questionSelection.filterByDifficulty items must be one of: beginner, intermediate, advanced'
    })
});

/**
 * Timing schema for assessments
 */
const timingSchema = Joi.object({
  timeLimit: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .optional()
    .messages({
      'number.min': 'timing.timeLimit must be at least 1 minute',
      'number.base': 'timing.timeLimit must be a number or null'
    }),
  showTimer: Joi.boolean()
    .optional()
    .default(true)
    .messages({
      'boolean.base': 'timing.showTimer must be a boolean'
    }),
  autoSubmitOnExpiry: Joi.boolean()
    .optional()
    .default(true)
    .messages({
      'boolean.base': 'timing.autoSubmitOnExpiry must be a boolean'
    })
});

/**
 * Attempts schema for assessments
 */
const attemptsSchema = Joi.object({
  maxAttempts: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .optional()
    .messages({
      'number.min': 'attempts.maxAttempts must be at least 1',
      'number.base': 'attempts.maxAttempts must be a number or null'
    }),
  cooldownMinutes: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.min': 'attempts.cooldownMinutes cannot be negative',
      'number.base': 'attempts.cooldownMinutes must be a number'
    }),
  retakePolicy: Joi.string()
    .valid('anytime', 'after_cooldown', 'instructor_unlock')
    .optional()
    .messages({
      'any.only': 'attempts.retakePolicy must be one of: anytime, after_cooldown, instructor_unlock'
    })
});

/**
 * Scoring schema for assessments
 */
const scoringSchema = Joi.object({
  passingScore: Joi.number()
    .min(0)
    .max(100)
    .required()
    .messages({
      'number.min': 'scoring.passingScore must be at least 0',
      'number.max': 'scoring.passingScore cannot exceed 100',
      'number.base': 'scoring.passingScore must be a number',
      'any.required': 'scoring.passingScore is required'
    }),
  showScore: Joi.boolean()
    .optional()
    .default(true)
    .messages({
      'boolean.base': 'scoring.showScore must be a boolean'
    }),
  showCorrectAnswers: Joi.string()
    .valid('never', 'after_submit', 'after_all_attempts')
    .optional()
    .messages({
      'any.only': 'scoring.showCorrectAnswers must be one of: never, after_submit, after_all_attempts'
    }),
  partialCredit: Joi.boolean()
    .optional()
    .default(false)
    .messages({
      'boolean.base': 'scoring.partialCredit must be a boolean'
    })
});

/**
 * Feedback schema for assessments
 */
const feedbackSchema = Joi.object({
  showFeedback: Joi.boolean()
    .optional()
    .default(true)
    .messages({
      'boolean.base': 'feedback.showFeedback must be a boolean'
    }),
  feedbackTiming: Joi.string()
    .valid('immediate', 'after_submit', 'after_grading')
    .optional()
    .messages({
      'any.only': 'feedback.feedbackTiming must be one of: immediate, after_submit, after_grading'
    }),
  showExplanations: Joi.boolean()
    .optional()
    .default(false)
    .messages({
      'boolean.base': 'feedback.showExplanations must be a boolean'
    })
});

/**
 * Create assessment validation schema
 */
const createAssessmentSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.empty': 'title is required',
      'string.min': 'title must be at least 1 character',
      'string.max': 'title cannot exceed 200 characters',
      'any.required': 'title is required'
    }),
  description: Joi.string()
    .trim()
    .max(2000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'description cannot exceed 2000 characters'
    }),
  departmentId: Joi.string()
    .required()
    .custom(objectIdValidator, 'ObjectId validation')
    .messages({
      'string.empty': 'departmentId is required',
      'string.objectId': 'departmentId must be a valid MongoDB ObjectId',
      'any.required': 'departmentId is required'
    }),
  style: Joi.string()
    .valid('quiz', 'exam')
    .required()
    .messages({
      'any.only': 'style must be one of: quiz, exam',
      'any.required': 'style is required'
    }),
  questionSelection: questionSelectionSchema.required().messages({
    'any.required': 'questionSelection is required'
  }),
  timing: timingSchema.optional(),
  attempts: attemptsSchema.optional(),
  scoring: scoringSchema.required().messages({
    'any.required': 'scoring is required'
  }),
  feedback: feedbackSchema.optional()
});

/**
 * Update assessment validation schema (all fields optional)
 */
const updateAssessmentSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .messages({
      'string.empty': 'title cannot be empty',
      'string.min': 'title must be at least 1 character',
      'string.max': 'title cannot exceed 200 characters'
    }),
  description: Joi.string()
    .trim()
    .max(2000)
    .allow('')
    .allow(null)
    .optional()
    .messages({
      'string.max': 'description cannot exceed 2000 characters'
    }),
  style: Joi.string()
    .valid('quiz', 'exam')
    .optional()
    .messages({
      'any.only': 'style must be one of: quiz, exam'
    }),
  questionSelection: Joi.object({
    questionBankIds: Joi.array()
      .items(Joi.string().trim())
      .min(1)
      .optional()
      .messages({
        'array.min': 'questionSelection.questionBankIds must contain at least 1 item',
        'array.base': 'questionSelection.questionBankIds must be an array'
      }),
    questionCount: Joi.number()
      .integer()
      .min(1)
      .optional()
      .messages({
        'number.min': 'questionSelection.questionCount must be at least 1',
        'number.base': 'questionSelection.questionCount must be a number'
      }),
    selectionMode: Joi.string()
      .valid('random', 'sequential', 'weighted')
      .optional()
      .messages({
        'any.only': 'questionSelection.selectionMode must be one of: random, sequential, weighted'
      }),
    filterByTags: Joi.array()
      .items(Joi.string().trim())
      .optional()
      .messages({
        'array.base': 'questionSelection.filterByTags must be an array'
      }),
    filterByDifficulty: Joi.array()
      .items(Joi.string().valid('beginner', 'intermediate', 'advanced'))
      .optional()
      .messages({
        'array.base': 'questionSelection.filterByDifficulty must be an array',
        'any.only': 'questionSelection.filterByDifficulty items must be one of: beginner, intermediate, advanced'
      })
  }).optional(),
  timing: timingSchema.optional(),
  attempts: attemptsSchema.optional(),
  scoring: Joi.object({
    passingScore: Joi.number()
      .min(0)
      .max(100)
      .optional()
      .messages({
        'number.min': 'scoring.passingScore must be at least 0',
        'number.max': 'scoring.passingScore cannot exceed 100',
        'number.base': 'scoring.passingScore must be a number'
      }),
    showScore: Joi.boolean()
      .optional()
      .messages({
        'boolean.base': 'scoring.showScore must be a boolean'
      }),
    showCorrectAnswers: Joi.string()
      .valid('never', 'after_submit', 'after_all_attempts')
      .optional()
      .messages({
        'any.only': 'scoring.showCorrectAnswers must be one of: never, after_submit, after_all_attempts'
      }),
    partialCredit: Joi.boolean()
      .optional()
      .messages({
        'boolean.base': 'scoring.partialCredit must be a boolean'
      })
  }).optional(),
  feedback: feedbackSchema.optional()
});

/**
 * Validate create assessment request
 *
 * Validates:
 * - title: required, 1-200 chars
 * - description: optional, max 2000 chars
 * - departmentId: required, valid ObjectId
 * - style: required, 'quiz' or 'exam'
 * - questionSelection: required object with questionBankIds, questionCount, selectionMode
 * - timing: optional object with timeLimit, showTimer, autoSubmitOnExpiry
 * - attempts: optional object with maxAttempts, cooldownMinutes, retakePolicy
 * - scoring: required object with passingScore (0-100)
 * - feedback: optional object with showFeedback, feedbackTiming, showExplanations
 */
export const validateCreateAssessment = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error } = createAssessmentSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  next();
};

/**
 * Validate update assessment request
 *
 * Similar to create but all fields are optional.
 * Only validates fields that are provided.
 */
export const validateUpdateAssessment = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error } = updateAssessmentSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  next();
};
