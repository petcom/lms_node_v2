import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/utils/ApiError';

// Helper for MongoDB ObjectId validation
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = Joi.string().pattern(objectIdPattern).messages({
  'string.pattern.base': '{{#label}} must be a valid ObjectId'
});

// Completion criteria schema
const completionCriteriaSchema = Joi.object({
  type: Joi.string()
    .valid('all_required', 'percentage', 'gate_learning_unit', 'points')
    .required()
    .messages({
      'any.only': 'completionCriteria.type must be one of: all_required, percentage, gate_learning_unit, points',
      'any.required': 'completionCriteria.type is required'
    }),

  percentageRequired: Joi.number()
    .min(0)
    .max(100)
    .when('type', {
      is: 'percentage',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'number.min': 'percentageRequired must be at least 0',
      'number.max': 'percentageRequired cannot exceed 100',
      'any.required': 'percentageRequired is required when type is percentage'
    }),

  pointsRequired: Joi.number()
    .min(0)
    .when('type', {
      is: 'points',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'number.min': 'pointsRequired must be at least 0',
      'any.required': 'pointsRequired is required when type is points'
    }),

  gateLearningUnitScore: Joi.number()
    .min(0)
    .max(100)
    .when('type', {
      is: 'gate_learning_unit',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'number.min': 'gateLearningUnitScore must be at least 0',
      'number.max': 'gateLearningUnitScore cannot exceed 100',
      'any.required': 'gateLearningUnitScore is required when type is gate_learning_unit'
    }),

  requireAllExpositions: Joi.boolean().optional()
});

// Repeat on schema
const repeatOnSchema = Joi.object({
  failedAttempt: Joi.boolean().optional(),
  belowMastery: Joi.boolean().optional(),
  learnerRequest: Joi.boolean().optional()
});

// Presentation rules schema
const presentationRulesSchema = Joi.object({
  presentationMode: Joi.string()
    .valid('prescribed', 'learner_choice', 'random')
    .required()
    .messages({
      'any.only': 'presentationMode must be one of: prescribed, learner_choice, random',
      'any.required': 'presentationRules.presentationMode is required'
    }),

  prescribedOrder: Joi.array()
    .items(objectIdSchema)
    .when('presentationMode', {
      is: 'prescribed',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'prescribedOrder is required when presentationMode is prescribed'
    }),

  repetitionMode: Joi.string()
    .valid('none', 'until_passed', 'until_mastery', 'spaced')
    .optional()
    .messages({
      'any.only': 'repetitionMode must be one of: none, until_passed, until_mastery, spaced'
    }),

  masteryThreshold: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.min': 'masteryThreshold must be at least 0',
      'number.max': 'masteryThreshold cannot exceed 100'
    }),

  maxRepetitions: Joi.number()
    .min(1)
    .allow(null)
    .optional()
    .messages({
      'number.min': 'maxRepetitions must be at least 1'
    }),

  cooldownBetweenRepetitions: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'cooldownBetweenRepetitions must be at least 0'
    }),

  repeatOn: repeatOnSchema.optional(),

  repeatableCategories: Joi.array()
    .items(Joi.string().valid('exposition', 'practice', 'assessment'))
    .optional()
    .messages({
      'any.only': 'repeatableCategories items must be one of: exposition, practice, assessment'
    }),

  showAllAvailable: Joi.boolean().optional(),

  allowSkip: Joi.boolean().optional()
});

// Create module schema
const createModuleSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .required()
    .trim()
    .messages({
      'string.empty': 'title is required',
      'string.min': 'title must be at least 1 character',
      'string.max': 'title cannot exceed 200 characters',
      'any.required': 'title is required'
    }),

  description: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .trim()
    .messages({
      'string.max': 'description cannot exceed 2000 characters'
    }),

  prerequisites: Joi.array()
    .items(objectIdSchema)
    .optional()
    .messages({
      'array.base': 'prerequisites must be an array of ObjectIds'
    }),

  completionCriteria: completionCriteriaSchema.optional(),

  presentationRules: presentationRulesSchema.optional(),

  isPublished: Joi.boolean()
    .optional()
    .default(false),

  availableFrom: Joi.date()
    .iso()
    .optional()
    .allow(null)
    .messages({
      'date.format': 'availableFrom must be a valid ISO date'
    }),

  availableUntil: Joi.date()
    .iso()
    .optional()
    .allow(null)
    .messages({
      'date.format': 'availableUntil must be a valid ISO date'
    }),

  estimatedDuration: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'estimatedDuration must be at least 0'
    }),

  objectives: Joi.array()
    .items(Joi.string().max(500))
    .optional()
    .messages({
      'array.base': 'objectives must be an array of strings'
    })
});

// Update module schema - all fields optional for partial updates
const completionCriteriaUpdateSchema = Joi.object({
  type: Joi.string()
    .valid('all_required', 'percentage', 'gate_learning_unit', 'points')
    .optional()
    .messages({
      'any.only': 'completionCriteria.type must be one of: all_required, percentage, gate_learning_unit, points'
    }),

  percentageRequired: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.min': 'percentageRequired must be at least 0',
      'number.max': 'percentageRequired cannot exceed 100'
    }),

  pointsRequired: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'pointsRequired must be at least 0'
    }),

  gateLearningUnitScore: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.min': 'gateLearningUnitScore must be at least 0',
      'number.max': 'gateLearningUnitScore cannot exceed 100'
    }),

  requireAllExpositions: Joi.boolean().optional()
});

const presentationRulesUpdateSchema = Joi.object({
  presentationMode: Joi.string()
    .valid('prescribed', 'learner_choice', 'random')
    .optional()
    .messages({
      'any.only': 'presentationMode must be one of: prescribed, learner_choice, random'
    }),

  prescribedOrder: Joi.array()
    .items(objectIdSchema)
    .optional(),

  repetitionMode: Joi.string()
    .valid('none', 'until_passed', 'until_mastery', 'spaced')
    .optional()
    .messages({
      'any.only': 'repetitionMode must be one of: none, until_passed, until_mastery, spaced'
    }),

  masteryThreshold: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.min': 'masteryThreshold must be at least 0',
      'number.max': 'masteryThreshold cannot exceed 100'
    }),

  maxRepetitions: Joi.number()
    .min(1)
    .allow(null)
    .optional()
    .messages({
      'number.min': 'maxRepetitions must be at least 1'
    }),

  cooldownBetweenRepetitions: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'cooldownBetweenRepetitions must be at least 0'
    }),

  repeatOn: repeatOnSchema.optional(),

  repeatableCategories: Joi.array()
    .items(Joi.string().valid('exposition', 'practice', 'assessment'))
    .optional()
    .messages({
      'any.only': 'repeatableCategories items must be one of: exposition, practice, assessment'
    }),

  showAllAvailable: Joi.boolean().optional(),

  allowSkip: Joi.boolean().optional()
});

const updateModuleSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .optional()
    .trim()
    .messages({
      'string.min': 'title must be at least 1 character',
      'string.max': 'title cannot exceed 200 characters'
    }),

  description: Joi.string()
    .max(2000)
    .optional()
    .allow('', null)
    .trim()
    .messages({
      'string.max': 'description cannot exceed 2000 characters'
    }),

  prerequisites: Joi.array()
    .items(objectIdSchema)
    .optional()
    .messages({
      'array.base': 'prerequisites must be an array of ObjectIds'
    }),

  completionCriteria: completionCriteriaUpdateSchema.optional(),

  presentationRules: presentationRulesUpdateSchema.optional(),

  isPublished: Joi.boolean().optional(),

  availableFrom: Joi.date()
    .iso()
    .optional()
    .allow(null)
    .messages({
      'date.format': 'availableFrom must be a valid ISO date'
    }),

  availableUntil: Joi.date()
    .iso()
    .optional()
    .allow(null)
    .messages({
      'date.format': 'availableUntil must be a valid ISO date'
    }),

  estimatedDuration: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'estimatedDuration must be at least 0'
    }),

  objectives: Joi.array()
    .items(Joi.string().max(500))
    .optional()
    .messages({
      'array.base': 'objectives must be an array of strings'
    })
});

// Reorder modules schema
const reorderModulesSchema = Joi.object({
  moduleIds: Joi.array()
    .items(objectIdSchema)
    .min(1)
    .required()
    .messages({
      'array.base': 'moduleIds must be an array of ObjectIds',
      'array.min': 'moduleIds must contain at least one module',
      'any.required': 'moduleIds is required'
    })
});

/**
 * Validate create module request
 *
 * Validates:
 * - title (required, 1-200 chars)
 * - description (optional, max 2000 chars)
 * - prerequisites (optional, array of ObjectIds)
 * - completionCriteria (optional, with conditional requirements)
 * - presentationRules (optional, with conditional requirements)
 * - isPublished (optional, boolean)
 * - availableFrom/Until (optional, ISO dates)
 * - estimatedDuration (optional, minutes)
 * - objectives (optional, array of strings)
 */
export const validateCreateModule = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = createModuleSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  req.body = value;
  next();
};

/**
 * Validate update module request
 *
 * All fields are optional for partial updates.
 * Validates same fields as create but without required constraints.
 */
export const validateUpdateModule = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = updateModuleSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  req.body = value;
  next();
};

/**
 * Validate reorder modules request
 *
 * Validates:
 * - moduleIds (required, array of ObjectIds)
 */
export const validateReorderModules = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error, value } = reorderModulesSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  req.body = value;
  next();
};
