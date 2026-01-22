import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/utils/ApiError';

const gradeOverrideSchema = Joi.object({
  gradeLetter: Joi.string()
    .optional()
    .uppercase()
    .valid('A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F')
    .messages({
      'any.only': 'gradeLetter must be a valid letter grade (A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F)'
    }),

  gradePercentage: Joi.number()
    .optional()
    .min(0)
    .max(100)
    .messages({
      'number.min': 'gradePercentage must be at least 0',
      'number.max': 'gradePercentage cannot exceed 100'
    }),

  gradePoints: Joi.number()
    .optional()
    .min(0)
    .max(4.0)
    .messages({
      'number.min': 'gradePoints must be at least 0',
      'number.max': 'gradePoints cannot exceed 4.0'
    }),

  reason: Joi.string()
    .required()
    .min(10)
    .max(1000)
    .trim()
    .messages({
      'string.empty': 'reason is required',
      'string.min': 'reason must be at least 10 characters',
      'string.max': 'reason cannot exceed 1000 characters',
      'any.required': 'reason is required'
    }),

  // Optional validation fields
  previousGradeLetter: Joi.string().optional(),
  previousGradePercentage: Joi.number().optional(),
  previousGradePoints: Joi.number().optional()
}).custom((value, helpers) => {
  // At least one grade field must be provided
  if (!value.gradeLetter && !value.gradePercentage && !value.gradePoints) {
    return helpers.error('custom.noGradeFields');
  }
  return value;
}).messages({
  'custom.noGradeFields': 'At least one grade field (gradeLetter, gradePercentage, or gradePoints) must be provided'
});

/**
 * Validate grade override request
 *
 * Validates:
 * - Reason field (required, 10-1000 chars)
 * - At least one grade field provided
 * - Grade value ranges (percentage: 0-100, points: 0-4.0)
 * - Valid letter grade values
 */
export const validateGradeOverride = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { error } = gradeOverrideSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  next();
};
