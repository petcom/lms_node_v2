import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';

describe('asyncHandler Utility', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('Successful async operations', () => {
    it('should call the handler function with req, res, next', async () => {
      const mockHandler = jest.fn().mockResolvedValue(undefined);
      const wrappedHandler = asyncHandler(mockHandler);

      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle successful async operations without errors', async () => {
      const mockHandler = jest.fn(async (req, res) => {
        res.status(200).json({ success: true });
      });
      const wrappedHandler = asyncHandler(mockHandler);

      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow handler to return a value', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ data: 'test' });
      const wrappedHandler = asyncHandler(mockHandler);

      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockHandler).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should catch errors and pass to next middleware', async () => {
      const testError = new Error('Test error');
      const mockHandler = jest.fn().mockRejectedValue(testError);
      const wrappedHandler = asyncHandler(mockHandler);

      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(testError);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should catch custom errors and pass to next', async () => {
      const customError = { message: 'Custom error', statusCode: 400 };
      const mockHandler = jest.fn().mockRejectedValue(customError);
      const wrappedHandler = asyncHandler(mockHandler);

      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(customError);
    });

    it('should handle thrown errors in async handler', async () => {
      const testError = new Error('Thrown error');
      const mockHandler = jest.fn(async () => {
        throw testError;
      });
      const wrappedHandler = asyncHandler(mockHandler);

      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(testError);
    });

    it('should handle errors with status codes', async () => {
      const errorWithStatus = Object.assign(new Error('Not found'), {
        statusCode: 404,
      });
      const mockHandler = jest.fn().mockRejectedValue(errorWithStatus);
      const wrappedHandler = asyncHandler(mockHandler);

      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(errorWithStatus);
    });

    it('should not call next if handler succeeds', async () => {
      const mockHandler = jest.fn().mockResolvedValue('success');
      const wrappedHandler = asyncHandler(mockHandler);

      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Promise handling', () => {
    it('should resolve promises correctly', async () => {
      const mockHandler = jest.fn(() =>
        Promise.resolve({ data: 'resolved' })
      );
      const wrappedHandler = asyncHandler(mockHandler);

      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockHandler).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch rejected promises', async () => {
      const rejectionReason = new Error('Promise rejected');
      const mockHandler = jest.fn(() => Promise.reject(rejectionReason));
      const wrappedHandler = asyncHandler(mockHandler);

      await wrappedHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(rejectionReason);
    });
  });

  describe('Multiple handlers', () => {
    it('should work with multiple wrapped handlers', async () => {
      const handler1 = jest.fn().mockResolvedValue(undefined);
      const handler2 = jest.fn().mockResolvedValue(undefined);

      const wrapped1 = asyncHandler(handler1);
      const wrapped2 = asyncHandler(handler2);

      await wrapped1(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      await wrapped2(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors independently in multiple handlers', async () => {
      const error1 = new Error('Error 1');
      const handler1 = jest.fn().mockRejectedValue(error1);
      const handler2 = jest.fn().mockResolvedValue(undefined);

      const wrapped1 = asyncHandler(handler1);
      const wrapped2 = asyncHandler(handler2);

      const next1 = jest.fn();
      const next2 = jest.fn();

      await wrapped1(mockRequest as Request, mockResponse as Response, next1);
      await wrapped2(mockRequest as Request, mockResponse as Response, next2);

      expect(next1).toHaveBeenCalledWith(error1);
      expect(next2).not.toHaveBeenCalled();
    });
  });
});
