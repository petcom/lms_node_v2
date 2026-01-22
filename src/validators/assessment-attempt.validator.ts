import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import { ApiError } from '@/utils/ApiError';

/**
 * Custom Joi validator for MongoDB ObjectId
 *
 * Validates that a string is a valid MongoDB ObjectId format
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
 * Schema for starting an assessment attempt
 *
 * Validates:
 * - moduleId (optional, valid ObjectId)
 * - learningUnitId (optional, valid ObjectId)
 */
const startAttemptSchema = Joi.object({
  moduleId: Joi.string()
    .optional()
    .custom(objectIdValidator, 'ObjectId validation')
    .messages({
      'string.objectId': 'moduleId must be a valid MongoDB ObjectId'
    }),

  learningUnitId: Joi.string()
    .optional()
    .custom(objectIdValidator, 'ObjectId validation')
    .messages({
      'string.objectId': 'learningUnitId must be a valid MongoDB ObjectId'
    })
});

/**
 * Schema for saving progress (auto-save)
 *
 * Validates:
 * - responses (required array)
 * - responses[].questionId (required, valid ObjectId)
 * - responses[].response (required, can be any type)
 */
const saveProgressSchema = Joi.object({
  responses: Joi.array()
    .items(
      Joi.object({
        questionId: Joi.string()
          .required()
          .custom(objectIdValidator, 'ObjectId validation')
          .messages({
            'string.empty': 'questionId cannot be empty',
            'string.objectId': 'questionId must be a valid MongoDB ObjectId',
            'any.required': 'questionId is required'
          }),

        response: Joi.any()
          .required()
          .messages({
            'any.required': 'response is required'
          })
      })
    )
    .required()
    .min(1)
    .messages({
      'array.base': 'responses must be an array',
      'array.min': 'responses must contain at least one item',
      'any.required': 'responses is required'
    })
});

/**
 * Schema for grading a question (manual grading of essay questions)
 *
 * Validates:
 * - questionIndex (required, min 0)
 * - score (required, min 0)
 * - feedback (optional, max 2000 chars)
 */
const gradeQuestionSchema = Joi.object({
  questionIndex: Joi.number()
    .required()
    .integer()
    .min(0)
    .messages({
      'number.base': 'questionIndex must be a number',
      'number.integer': 'questionIndex must be an integer',
      'number.min': 'questionIndex must be at least 0',
      'any.required': 'questionIndex is required'
    }),

  score: Joi.number()
    .required()
    .min(0)
    .messages({
      'number.base': 'score must be a number',
      'number.min': 'score must be at least 0',
      'any.required': 'score is required'
    }),

  feedback: Joi.string()
    .optional()
    .max(2000)
    .trim()
    .messages({
      'string.max': 'feedback cannot exceed 2000 characters'
    })
});

/**
 * Validate start attempt request
 *
 * Validates:
 * - moduleId (optional, valid ObjectId)
 * - learningUnitId (optional, valid ObjectId)
 */
export const validateStartAttempt = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error } = startAttemptSchema.validate(req.body, {
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
 * Validate save progress request
 *
 * Validates:
 * - responses (required array)
 * - responses[].questionId (required, valid ObjectId)
 * - responses[].response (required, can be any type - string, array, or object)
 */
export const validateSaveProgress = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error } = saveProgressSchema.validate(req.body, {
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
 * Validate grade question request (manual grading of essay questions)
 *
 * Validates:
 * - questionIndex (required, min 0)
 * - score (required, min 0)
 * - feedback (optional, max 2000 chars)
 */
export const validateGradeQuestion = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error } = gradeQuestionSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  next();
};
