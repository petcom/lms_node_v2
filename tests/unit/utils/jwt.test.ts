import jwt from 'jsonwebtoken';
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '@/utils/jwt';
import { config } from '@/config/environment';

// Mock the config
jest.mock('@/config/environment', () => ({
  config: {
    jwt: {
      accessSecret: 'test-access-secret',
      refreshSecret: 'test-refresh-secret',
      accessExpiry: '2h',
      refreshExpiry: '7d'
    }
  }
}));

describe('JWT Utils', () => {
  const userId = '507f1f77bcf86cd799439011';
  const email = 'test@example.com';
  const roles = ['learner'];

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(userId, email, roles);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, config.jwt.accessSecret) as any;
      expect(decoded.userId).toBe(userId);
      expect(decoded.email).toBe(email);
      expect(decoded.roles).toEqual(roles);
      expect(decoded.type).toBe('access');
    });

    it('should set correct expiration time', () => {
      const token = generateAccessToken(userId, email, roles);
      const decoded = jwt.verify(token, config.jwt.accessSecret) as any;

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp - decoded.iat).toBe(2 * 60 * 60); // 2 hours in seconds
    });

    it('should handle multiple roles', () => {
      const multiRoles = ['learner', 'instructor', 'content-admin'];
      const token = generateAccessToken(userId, email, multiRoles);
      const decoded = jwt.verify(token, config.jwt.accessSecret) as any;

      expect(decoded.roles).toEqual(multiRoles);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, config.jwt.refreshSecret) as any;
      expect(decoded.userId).toBe(userId);
      expect(decoded.type).toBe('refresh');
    });

    it('should set correct expiration time for refresh token', () => {
      const token = generateRefreshToken(userId);
      const decoded = jwt.verify(token, config.jwt.refreshSecret) as any;

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = generateAccessToken(userId, email, roles);
      const payload = verifyAccessToken(token);

      expect(payload).toBeDefined();
      expect(payload.userId).toBe(userId);
      expect(payload.email).toBe(email);
      expect(payload.roles).toEqual(roles);
      expect(payload.type).toBe('access');
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        verifyAccessToken('invalid.token.here');
      }).toThrow();
    });

    it('should throw error for expired token', () => {
      const expiredToken = jwt.sign(
        { userId, email, roles, type: 'access' },
        config.jwt.accessSecret,
        { expiresIn: '0s' }
      );

      expect(() => {
        verifyAccessToken(expiredToken);
      }).toThrow();
    });

    it('should throw error for refresh token when expecting access token', () => {
      const refreshToken = generateRefreshToken(userId);

      expect(() => {
        verifyAccessToken(refreshToken);
      }).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const token = generateRefreshToken(userId);
      const payload = verifyRefreshToken(token);

      expect(payload).toBeDefined();
      expect(payload.userId).toBe(userId);
      expect(payload.type).toBe('refresh');
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => {
        verifyRefreshToken('invalid.token.here');
      }).toThrow();
    });

    it('should throw error for expired refresh token', () => {
      const expiredToken = jwt.sign(
        { userId, type: 'refresh' },
        config.jwt.refreshSecret,
        { expiresIn: '0s' }
      );

      expect(() => {
        verifyRefreshToken(expiredToken);
      }).toThrow();
    });

    it('should throw error for access token when expecting refresh token', () => {
      const accessToken = generateAccessToken(userId, email, roles);

      expect(() => {
        verifyRefreshToken(accessToken);
      }).toThrow();
    });
  });
});
