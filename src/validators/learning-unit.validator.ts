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
 * Valid learning unit categories
 */
const VALID_CATEGORIES = ['exposition', 'practice', 'assessment'] as const;

/**
 * Valid content types for learning units
 */
const VALID_CONTENT_TYPES = ['video', 'document', 'scorm', 'custom', 'exercise', 'assessment'] as const;

/**
 * Schema for creating a learning unit
 */
const createLearningUnitSchema = Joi.object({
  title: Joi.string()
    .required()
    .min(1)
    .max(200)
    .trim()
    .messages({
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least 1 character',
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Title is required'
    }),

  description: Joi.string()
    .optional()
    .max(2000)
    .trim()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 2000 characters'
    }),

  category: Joi.string()
    .required()
    .valid(...VALID_CATEGORIES)
    .messages({
      'string.empty': 'Category is required',
      'any.only': `Category must be one of: ${VALID_CATEGORIES.join(', ')}`,
      'any.required': 'Category is required'
    }),

  contentType: Joi.string()
    .required()
    .valid(...VALID_CONTENT_TYPES)
    .messages({
      'string.empty': 'Content type is required',
      'any.only': `Content type must be one of: ${VALID_CONTENT_TYPES.join(', ')}`,
      'any.required': 'Content type is required'
    }),

  contentId: Joi.string()
    .optional()
    .custom(objectIdValidator, 'ObjectId validation')
    .messages({
      'string.objectId': 'Content ID must be a valid MongoDB ObjectId'
    }),

  isRequired: Joi.boolean()
    .optional()
    .default(true)
    .messages({
      'boolean.base': 'isRequired must be a boolean'
    }),

  isReplayable: Joi.boolean()
    .optional()
    .default(false)
    .messages({
      'boolean.base': 'isReplayable must be a boolean'
    }),

  weight: Joi.number()
    .optional()
    .min(0)
    .max(100)
    .default(0)
    .messages({
      'number.base': 'Weight must be a number',
      'number.min': 'Weight must be at least 0',
      'number.max': 'Weight cannot exceed 100'
    }),

  estimatedDuration: Joi.number()
    .optional()
    .min(0)
    .messages({
      'number.base': 'Estimated duration must be a number',
      'number.min': 'Estimated duration must be at least 0'
    }),

  metadata: Joi.object()
    .optional()
    .messages({
      'object.base': 'Metadata must be an object'
    })
});

/**
 * Schema for updating a learning unit (all fields optional)
 */
const updateLearningUnitSchema = Joi.object({
  title: Joi.string()
    .optional()
    .min(1)
    .max(200)
    .trim()
    .messages({
      'string.empty': 'Title cannot be empty',
      'string.min': 'Title must be at least 1 character',
      'string.max': 'Title cannot exceed 200 characters'
    }),

  description: Joi.string()
    .optional()
    .max(2000)
    .trim()
    .allow('')
    .allow(null)
    .messages({
      'string.max': 'Description cannot exceed 2000 characters'
    }),

  category: Joi.string()
    .optional()
    .valid(...VALID_CATEGORIES)
    .messages({
      'any.only': `Category must be one of: ${VALID_CATEGORIES.join(', ')}`
    }),

  contentType: Joi.string()
    .optional()
    .valid(...VALID_CONTENT_TYPES)
    .messages({
      'any.only': `Content type must be one of: ${VALID_CONTENT_TYPES.join(', ')}`
    }),

  contentId: Joi.string()
    .optional()
    .allow(null)
    .custom(objectIdValidator, 'ObjectId validation')
    .messages({
      'string.objectId': 'Content ID must be a valid MongoDB ObjectId'
    }),

  isRequired: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isRequired must be a boolean'
    }),

  isReplayable: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isReplayable must be a boolean'
    }),

  weight: Joi.number()
    .optional()
    .min(0)
    .max(100)
    .messages({
      'number.base': 'Weight must be a number',
      'number.min': 'Weight must be at least 0',
      'number.max': 'Weight cannot exceed 100'
    }),

  estimatedDuration: Joi.number()
    .optional()
    .allow(null)
    .min(0)
    .messages({
      'number.base': 'Estimated duration must be a number',
      'number.min': 'Estimated duration must be at least 0'
    }),

  metadata: Joi.object()
    .optional()
    .allow(null)
    .messages({
      'object.base': 'Metadata must be an object'
    })
});

/**
 * Schema for reordering learning units
 */
const reorderLearningUnitsSchema = Joi.object({
  learningUnitIds: Joi.array()
    .items(
      Joi.string()
        .custom(objectIdValidator, 'ObjectId validation')
        .messages({
          'string.objectId': 'Each learning unit ID must be a valid MongoDB ObjectId'
        })
    )
    .required()
    .min(1)
    .messages({
      'array.base': 'learningUnitIds must be an array',
      'array.min': 'At least one learning unit ID is required',
      'any.required': 'learningUnitIds is required'
    })
});

/**
 * Schema for moving a learning unit to another module
 */
const moveLearningUnitSchema = Joi.object({
  targetModuleId: Joi.string()
    .required()
    .custom(objectIdValidator, 'ObjectId validation')
    .messages({
      'string.empty': 'Target module ID is required',
      'string.objectId': 'Target module ID must be a valid MongoDB ObjectId',
      'any.required': 'Target module ID is required'
    })
});

/**
 * Validate create learning unit request
 *
 * Validates:
 * - title: required, 1-200 characters
 * - description: optional, max 2000 characters
 * - category: required, one of: exposition, practice, assessment
 * - contentType: required, one of: video, document, scorm, custom, exercise, assessment
 * - contentId: optional, valid ObjectId
 * - isRequired: optional, boolean (default true)
 * - isReplayable: optional, boolean (default false)
 * - weight: optional, 0-100 (default 0)
 * - estimatedDuration: optional, minutes
 * - metadata: optional, object
 */
export const validateCreateLearningUnit = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error } = createLearningUnitSchema.validate(req.body, {
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
 * Validate update learning unit request
 *
 * All fields are optional. Validates same fields as create but none are required.
 */
export const validateUpdateLearningUnit = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error } = updateLearningUnitSchema.validate(req.body, {
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
 * Validate reorder learning units request
 *
 * Validates:
 * - learningUnitIds: required, array of valid ObjectIds
 */
export const validateReorderLearningUnits = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error } = reorderLearningUnitsSchema.validate(req.body, {
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
 * Validate move learning unit request
 *
 * Validates:
 * - targetModuleId: required, valid ObjectId
 */
export const validateMoveLearningUnit = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error } = moveLearningUnitSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  next();
};
