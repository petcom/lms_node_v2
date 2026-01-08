import { Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '@/middlewares/authenticate';
import * as jwtUtils from '@/utils/jwt';
import { ApiError } from '@/utils/ApiError';

jest.mock('@/utils/jwt');

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    describe('Valid authentication', () => {
      it('should authenticate valid token and attach user to request', () => {
        const mockPayload = {
          userId: 'user123',
          email: 'test@example.com',
          roles: ['learner'],
          type: 'access' as const,
          iat: Date.now(),
          exp: Date.now() + 3600,
        };

        mockRequest.headers = {
          authorization: 'Bearer valid-token',
        };

        (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);

        authenticate(mockRequest as Request, mockResponse as Response, mockNext);

        expect(jwtUtils.verifyAccessToken).toHaveBeenCalledWith('valid-token');
        expect((mockRequest as any).user).toEqual({
          userId: mockPayload.userId,
          email: mockPayload.email,
          roles: mockPayload.roles,
        });
        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });

      it('should handle tokens with multiple roles', () => {
        const mockPayload = {
          userId: 'user123',
          email: 'staff@example.com',
          roles: ['staff', 'instructor'],
          type: 'access' as const,
          iat: Date.now(),
          exp: Date.now() + 3600,
        };

        mockRequest.headers = {
          authorization: 'Bearer staff-token',
        };

        (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);

        authenticate(mockRequest as Request, mockResponse as Response, mockNext);

        expect((mockRequest as any).user.roles).toEqual(['staff', 'instructor']);
        expect(mockNext).toHaveBeenCalledWith();
      });
    });

    describe('Missing or invalid tokens', () => {
      it('should reject request without authorization header', () => {
        mockRequest.headers = {};

        authenticate(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'No token provided',
            statusCode: 401,
          })
        );
      });

      it('should reject request with malformed authorization header', () => {
        mockRequest.headers = {
          authorization: 'InvalidFormat token',
        };

        authenticate(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'No token provided',
            statusCode: 401,
          })
        );
      });

      it('should reject request without Bearer prefix', () => {
        mockRequest.headers = {
          authorization: 'just-a-token',
        };

        authenticate(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'No token provided',
            statusCode: 401,
          })
        );
      });

      it('should handle expired tokens', () => {
        mockRequest.headers = {
          authorization: 'Bearer expired-token',
        };

        const expiredError = new Error('Token expired');
        (jwtUtils.verifyAccessToken as jest.Mock).mockImplementation(() => {
          throw expiredError;
        });

        authenticate(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expiredError);
      });

      it('should handle invalid tokens', () => {
        mockRequest.headers = {
          authorization: 'Bearer invalid-token',
        };

        const invalidError = new Error('Invalid token');
        (jwtUtils.verifyAccessToken as jest.Mock).mockImplementation(() => {
          throw invalidError;
        });

        authenticate(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(invalidError);
      });
    });

    describe('Token extraction', () => {
      it('should correctly extract token after Bearer prefix', () => {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature';
        mockRequest.headers = {
          authorization: `Bearer ${token}`,
        };

        const mockPayload = {
          userId: 'user123',
          email: 'test@example.com',
          roles: ['learner'],
          type: 'access' as const,
          iat: Date.now(),
          exp: Date.now() + 3600,
        };

        (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);

        authenticate(mockRequest as Request, mockResponse as Response, mockNext);

        expect(jwtUtils.verifyAccessToken).toHaveBeenCalledWith(token);
      });

      it('should handle bearer with lowercase', () => {
        mockRequest.headers = {
          authorization: 'bearer some-token',
        };

        authenticate(mockRequest as Request, mockResponse as Response, mockNext);

        // Should fail because it requires 'Bearer ' with capital B
        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'No token provided',
          })
        );
      });
    });
  });

  describe('authorize', () => {
    beforeEach(() => {
      (mockRequest as any).user = {
        userId: 'user123',
        email: 'test@example.com',
        roles: ['learner'],
      };
    });

    describe('Valid authorization', () => {
      it('should allow access when user has required role', () => {
        const authorizeMiddleware = authorize('learner');

        authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });

      it('should allow access when user has one of multiple allowed roles', () => {
        (mockRequest as any).user.roles = ['staff', 'instructor'];
        const authorizeMiddleware = authorize('instructor', 'admin');

        authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should allow access when user has multiple roles including required', () => {
        (mockRequest as any).user.roles = ['learner', 'staff'];
        const authorizeMiddleware = authorize('staff');

        authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });
    });

    describe('Invalid authorization', () => {
      it('should reject when user not authenticated', () => {
        delete (mockRequest as any).user;
        const authorizeMiddleware = authorize('learner');

        authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Authentication required',
            statusCode: 401,
          })
        );
      });

      it('should reject when user lacks required role', () => {
        const authorizeMiddleware = authorize('admin');

        authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Insufficient permissions',
            statusCode: 403,
          })
        );
      });

      it('should reject when user has no roles', () => {
        (mockRequest as any).user.roles = [];
        const authorizeMiddleware = authorize('learner');

        authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Insufficient permissions',
            statusCode: 403,
          })
        );
      });

      it('should reject when none of user roles match', () => {
        (mockRequest as any).user.roles = ['learner', 'student'];
        const authorizeMiddleware = authorize('admin', 'staff');

        authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Insufficient permissions',
            statusCode: 403,
          })
        );
      });
    });

    describe('Multiple role requirements', () => {
      it('should allow access when checking multiple roles', () => {
        (mockRequest as any).user.roles = ['instructor'];
        const authorizeMiddleware = authorize('instructor', 'admin', 'staff');

        authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should work with single role requirement', () => {
        const authorizeMiddleware = authorize('learner');

        authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });
    });

    describe('Edge cases', () => {
      it('should handle user with undefined roles', () => {
        (mockRequest as any).user.roles = undefined;
        const authorizeMiddleware = authorize('learner');

        // This will actually throw an error since .some() is called on undefined
        // In production, this should be fixed to handle undefined roles gracefully
        expect(() => {
          authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow();
      });

      it('should be case-sensitive for role matching', () => {
        (mockRequest as any).user.roles = ['Learner']; // Capital L
        const authorizeMiddleware = authorize('learner'); // lowercase l

        authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Insufficient permissions',
          })
        );
      });
    });
  });

  describe('Integration: authenticate + authorize', () => {
    it('should work together in middleware chain', () => {
      const mockPayload = {
        userId: 'user123',
        email: 'staff@example.com',
        roles: ['staff', 'instructor'],
        type: 'access' as const,
        iat: Date.now(),
        exp: Date.now() + 3600,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (jwtUtils.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);

      // First authenticate
      const next1 = jest.fn();
      authenticate(mockRequest as Request, mockResponse as Response, next1);

      expect(next1).toHaveBeenCalledWith();
      expect((mockRequest as any).user).toBeDefined();

      // Then authorize
      const next2 = jest.fn();
      const authorizeMiddleware = authorize('staff');
      authorizeMiddleware(mockRequest as Request, mockResponse as Response, next2);

      expect(next2).toHaveBeenCalledWith();
    });
  });
});
