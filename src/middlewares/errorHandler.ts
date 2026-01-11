import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse } from '@/utils/ApiResponse';
import { logger } from '@/config/logger';
import { config } from '@/config/environment';

/**
 * Global error handling middleware
 * Must be registered last in middleware chain
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  let error = err;

  // Convert non-ApiError errors to ApiError
  if (!(error instanceof ApiError)) {
    const statusCode = 500;
    const message = config.env === 'production' 
      ? 'Internal server error' 
      : error.message;
    error = new ApiError(statusCode, message, false);
  }

  const apiError = error as ApiError;

  // Log error
  if (!apiError.isOperational) {
    logger.error('Unhandled error:', {
      message: apiError.message,
      stack: apiError.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userId: (req as any).user?.userId
    });
  } else {
    logger.warn('Operational error:', {
      message: apiError.message,
      statusCode: apiError.statusCode,
      url: req.url,
      method: req.method
    });
  }

  // Send error response - include validation errors if present
  const errorDetails = apiError.errors 
    ? apiError.errors 
    : (config.env === 'development' && apiError.stack ? [{ stack: apiError.stack }] : undefined);
    
  const response = ApiResponse.error(apiError.message, errorDetails);

  res.status(apiError.statusCode).json(response);
};

/**
 * Not found handler for undefined routes
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  const error = ApiError.notFound(`Route ${req.originalUrl} not found`);
  next(error);
};
