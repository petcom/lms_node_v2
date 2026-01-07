import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '@/utils/jwt';
import { ApiError } from '@/utils/ApiError';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyAccessToken(token);

    // Attach user info to request
    (req as any).user = {
      userId: payload.userId,
      email: payload.email,
      roles: payload.roles
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization middleware - check if user has required roles
 * @param allowedRoles - Array of roles that are allowed to access the route
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const hasRole = user.roles.some((role: string) => allowedRoles.includes(role));

    if (!hasRole) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }

    next();
  };
};
