import jwt from 'jsonwebtoken';
import { config } from '@/config/environment';
import { ApiError } from './ApiError';

export interface JWTAccessPayload {
  userId: string;
  email: string;
  roles: string[];
  type: 'access';
  iat: number;
  exp: number;
}

export interface JWTRefreshPayload {
  userId: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

/**
 * Generate an access token
 */
export function generateAccessToken(
  userId: string,
  email: string,
  roles: string[]
): string {
  const payload = {
    userId,
    email,
    roles,
    type: 'access' as const
  };

  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry
  });
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(userId: string): string {
  const payload = {
    userId,
    type: 'refresh' as const
  };

  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry
  });
}

/**
 * Verify and decode an access token
 */
export function verifyAccessToken(token: string): JWTAccessPayload {
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as JWTAccessPayload;

    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return payload;
  } catch (error) {
    throw ApiError.unauthorized('Invalid or expired token');
  }
}

/**
 * Verify and decode a refresh token
 */
export function verifyRefreshToken(token: string): JWTRefreshPayload {
  try {
    const payload = jwt.verify(token, config.jwt.refreshSecret) as JWTRefreshPayload;

    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return payload;
  } catch (error) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
}
