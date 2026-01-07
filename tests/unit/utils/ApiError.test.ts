import { ApiError } from '@/utils/ApiError';

describe('ApiError', () => {
  describe('constructor', () => {
    it('should create a BadRequest error (400)', () => {
      const error = ApiError.badRequest('Invalid input');
      
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
      expect(error.isOperational).toBe(true);
    });

    it('should create an Unauthorized error (401)', () => {
      const error = ApiError.unauthorized('Please authenticate');
      
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Please authenticate');
    });

    it('should create a Forbidden error (403)', () => {
      const error = ApiError.forbidden('Access denied');
      
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Access denied');
    });

    it('should create a NotFound error (404)', () => {
      const error = ApiError.notFound('Resource not found');
      
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource not found');
    });

    it('should create a Conflict error (409)', () => {
      const error = ApiError.conflict('Resource already exists');
      
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Resource already exists');
    });

    it('should create an Internal Server error (500)', () => {
      const error = ApiError.internal('Something went wrong');
      
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Something went wrong');
    });

    it('should create a custom error with custom status code', () => {
      const error = new ApiError(418, 'I am a teapot');
      
      expect(error.statusCode).toBe(418);
      expect(error.message).toBe('I am a teapot');
    });

    it('should mark error as operational by default', () => {
      const error = new ApiError(400, 'Error');
      
      expect(error.isOperational).toBe(true);
    });

    it('should allow marking error as non-operational', () => {
      const error = new ApiError(500, 'Error', false);
      
      expect(error.isOperational).toBe(false);
    });

    it('should capture stack trace', () => {
      const error = new ApiError(400, 'Error');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ApiError');
    });
  });
});
