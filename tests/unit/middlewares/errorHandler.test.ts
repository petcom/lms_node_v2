import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler } from '@/middlewares/errorHandler';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/config/logger';
import { config } from '@/config/environment';

jest.mock('@/config/logger');
jest.mock('@/config/environment', () => ({
  config: {
    env: 'test'
  }
}));

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      url: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('errorHandler', () => {
    describe('ApiError handling', () => {
      it('should handle ApiError with correct status code', () => {
        const error = new ApiError(404, 'Resource not found');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(404);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'error',
            message: 'Resource not found',
          })
        );
      });

      it('should handle operational errors with warning log', () => {
        const error = new ApiError(400, 'Bad request', true);

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(logger.warn).toHaveBeenCalledWith(
          'Operational error:',
          expect.objectContaining({
            message: 'Bad request',
            statusCode: 400,
            url: '/api/test',
            method: 'GET',
          })
        );
      });

      it('should handle non-operational errors with error log', () => {
        const error = new ApiError(500, 'Database connection failed', false);

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(logger.error).toHaveBeenCalledWith(
          'Unhandled error:',
          expect.objectContaining({
            message: 'Database connection failed',
            url: '/api/test',
            method: 'GET',
            ip: '127.0.0.1',
          })
        );
      });

      it('should include user info in error logs when available', () => {
        (mockRequest as any).user = { userId: 'user123' };
        const error = new ApiError(403, 'Forbidden', false);

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(logger.error).toHaveBeenCalledWith(
          'Unhandled error:',
          expect.objectContaining({
            userId: 'user123',
          })
        );
      });
    });

    describe('Generic Error handling', () => {
      it('should convert generic Error to ApiError with 500 status', () => {
        const error = new Error('Something went wrong');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(500);
      });

      it('should use generic message in production', () => {
        (config as any).env = 'production';
        const error = new Error('Sensitive error details');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Internal server error',
          })
        );

        (config as any).env = 'test'; // Reset
      });

      it('should include error message in development', () => {
        (config as any).env = 'development';
        const error = new Error('Detailed error message');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Detailed error message',
          })
        );

        (config as any).env = 'test'; // Reset
      });

      it('should mark converted errors as non-operational', () => {
        const error = new Error('Unexpected error');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(logger.error).toHaveBeenCalledWith(
          'Unhandled error:',
          expect.any(Object)
        );
      });
    });

    describe('Stack trace handling', () => {
      it('should include stack trace in development mode', () => {
        (config as any).env = 'development';
        const error = new ApiError(500, 'Error with stack');
        error.stack = 'Error: Error with stack\n    at someFunction (file.ts:10:5)';

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                stack: expect.any(String),
              }),
            ]),
          })
        );

        (config as any).env = 'test'; // Reset
      });

      it('should exclude stack trace in production mode', () => {
        (config as any).env = 'production';
        const error = new ApiError(500, 'Error with stack');
        error.stack = 'Error: Error with stack\n    at someFunction (file.ts:10:5)';

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'error',
            message: 'Error with stack',
          })
        );
        
        // Should not include errors array in production
        const callArgs = (jsonMock as jest.Mock).mock.calls[0][0];
        expect(callArgs.errors).toBeUndefined();

        (config as any).env = 'test'; // Reset
      });

      it('should log stack trace for unhandled errors', () => {
        const error = new Error('Error with stack');
        error.stack = 'Error: Error with stack\n    at testFunction (test.ts:5:10)';

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(logger.error).toHaveBeenCalledWith(
          'Unhandled error:',
          expect.objectContaining({
            stack: expect.any(String),
            message: 'Error with stack',
          })
        );
      });
    });

    describe('Request context in logs', () => {
      it('should log request URL', () => {
        mockRequest.url = '/api/users/123';
        const error = new ApiError(404, 'User not found', false);

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(logger.error).toHaveBeenCalledWith(
          'Unhandled error:',
          expect.objectContaining({
            url: '/api/users/123',
          })
        );
      });

      it('should log request method', () => {
        mockRequest.method = 'POST';
        const error = new ApiError(400, 'Validation failed', true);

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(logger.warn).toHaveBeenCalledWith(
          'Operational error:',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });

      it('should log IP address for security-related errors', () => {
        mockRequest.ip = '192.168.1.100';
        const error = new ApiError(401, 'Unauthorized', false);

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(logger.error).toHaveBeenCalledWith(
          'Unhandled error:',
          expect.objectContaining({
            ip: '192.168.1.100',
          })
        );
      });
    });

    describe('Response format', () => {
      it('should return JSON response with status: error', () => {
        const error = new ApiError(400, 'Bad request');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'error',
          })
        );
      });

      it('should include error message in response', () => {
        const error = new ApiError(404, 'Not found');

        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Not found',
          })
        );
      });
    });
  });

  describe('notFoundHandler', () => {
    it('should create 404 ApiError for undefined route', () => {
      mockRequest.originalUrl = '/api/undefined-route';

      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Route /api/undefined-route not found',
        })
      );
    });

    it('should pass error to next middleware', () => {
      mockRequest.originalUrl = '/api/missing';

      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should handle root path 404', () => {
      mockRequest.originalUrl = '/';

      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route / not found',
        })
      );
    });

    it('should handle nested path 404', () => {
      mockRequest.originalUrl = '/api/v1/users/123/profile/settings';

      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route /api/v1/users/123/profile/settings not found',
        })
      );
    });

    it('should handle paths with query parameters', () => {
      mockRequest.originalUrl = '/api/search?q=test&limit=10';

      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route /api/search?q=test&limit=10 not found',
        })
      );
    });

    it('should create operational error', () => {
      mockRequest.originalUrl = '/api/test';

      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      const calledError = (mockNext as jest.Mock).mock.calls[0][0];
      expect(calledError.isOperational).toBe(true);
    });
  });

  describe('Integration: notFoundHandler + errorHandler', () => {
    it('should work together in error handling chain', () => {
      mockRequest.originalUrl = '/api/not-exists';

      // First: notFoundHandler creates error
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);

      const error = (mockNext as jest.Mock).mock.calls[0][0];

      // Then: errorHandler processes it
      errorHandler(error, mockRequest as Request, mockResponse as Response, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Route /api/not-exists not found',
        })
      );
    });
  });
});
