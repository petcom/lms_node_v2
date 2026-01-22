/**
 * Request Validation Middleware
 *
 * Provides middleware for validating request body, query, and params using Zod schemas.
 *
 * @module middlewares/validateRequest
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ApiError } from '@/utils/ApiError';

/**
 * Validate request using Zod schema
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * router.post('/',
 *   validateRequest(createUserSchema),
 *   controller.createUser
 * );
 * ```
 */
export const validateRequest = (schema: z.ZodTypeAny) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((err: z.ZodIssue) => ({
          path: err.path.join('.'),
          message: err.message
        }));

        return next(
          new ApiError(400, 'Validation failed', formattedErrors)
        );
      }
      next(error);
    }
  };
};
