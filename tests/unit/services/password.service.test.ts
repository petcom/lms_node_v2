import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import crypto from 'crypto';
import { PasswordService } from '@/services/auth/password.service';
import { User } from '@/models/auth/User.model';
import { ApiError } from '@/utils/ApiError';
import * as passwordUtils from '@/utils/password';
import { Cache } from '@/config/redis';
import { logger } from '@/config/logger';

jest.mock('@/utils/password');
jest.mock('@/config/redis', () => ({
  Cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));
jest.mock('@/config/logger');

let mongoServer: MongoMemoryServer;

describe('PasswordService', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    jest.clearAllMocks();
  });

  describe('forgotPassword', () => {
    const testEmail = 'user@example.com';
    let userId: string;

    beforeEach(async () => {
      userId = new mongoose.Types.ObjectId().toString();
      await User.create({
        _id: userId,
        email: testEmail,
        password: 'hashed_password',
        roles: ['learner'],
      });
    });

    it('should generate reset token and store in cache for existing user', async () => {
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      await PasswordService.forgotPassword(testEmail);

      expect(Cache.set).toHaveBeenCalledWith(
        expect.stringMatching(/^password_reset:/),
        userId,
        60 * 60
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringMatching(/Password reset token for/),
      );
    });

    it('should not throw error for non-existent email (security)', async () => {
      await expect(
        PasswordService.forgotPassword('nonexistent@example.com')
      ).resolves.toBeUndefined();

      expect(Cache.set).not.toHaveBeenCalled();
    });

    it('should log info for non-existent email without revealing it', async () => {
      await PasswordService.forgotPassword('nonexistent@example.com');

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('non-existent')
      );
    });

    it('should generate unique reset tokens', async () => {
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      // Mock crypto to return predictable values
      const originalRandomBytes = crypto.randomBytes;
      const tokens: string[] = [];
      
      jest.spyOn(crypto, 'randomBytes').mockImplementation((size) => {
        const token = originalRandomBytes(size);
        tokens.push(token.toString('hex'));
        return token;
      });

      await PasswordService.forgotPassword(testEmail);
      await PasswordService.forgotPassword(testEmail);

      expect(tokens[0]).not.toBe(tokens[1]);

      (crypto.randomBytes as jest.Mock).mockRestore();
    });

    it('should hash token before storing in cache', async () => {
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      await PasswordService.forgotPassword(testEmail);

      const cacheKey = (Cache.set as jest.Mock).mock.calls[0][0];
      
      // Cache key should start with 'password_reset:' followed by hash (64 hex chars)
      expect(cacheKey).toMatch(/^password_reset:[a-f0-9]{64}$/);
    });

    it('should log reset link for development', async () => {
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      await PasswordService.forgotPassword(testEmail);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Reset link:')
      );
    });
  });

  describe('resetPassword', () => {
    const testToken = 'test-reset-token';
    let userId: string;
    let hashedToken: string;

    beforeEach(async () => {
      userId = new mongoose.Types.ObjectId().toString();
      
      await User.create({
        _id: userId,
        email: 'user@example.com',
        password: 'old_hashed_password',
        roles: ['learner'],
      });

      hashedToken = crypto.createHash('sha256').update(testToken).digest('hex');
    });

    it('should successfully reset password with valid token', async () => {
      (Cache.get as jest.Mock).mockResolvedValue(userId);
      (Cache.del as jest.Mock).mockResolvedValue(undefined);
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('new_hashed_password');

      await PasswordService.resetPassword(testToken, 'newPassword123');

      const user = await User.findById(userId).select('+password');
      expect(user?.password).toBe('new_hashed_password');
    });

    it('should throw error for invalid token', async () => {
      (Cache.get as jest.Mock).mockResolvedValue(null);

      await expect(
        PasswordService.resetPassword('invalid-token', 'newPassword123')
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid or expired reset token',
      });
    });

    it('should throw error for expired token', async () => {
      (Cache.get as jest.Mock).mockResolvedValue(undefined);

      await expect(
        PasswordService.resetPassword(testToken, 'newPassword123')
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid or expired reset token',
      });
    });

    it('should throw error if user not found', async () => {
      const fakeUserId = new mongoose.Types.ObjectId().toString();
      
      (Cache.get as jest.Mock).mockResolvedValue(fakeUserId);
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('new_hashed_password');

      await expect(
        PasswordService.resetPassword(testToken, 'newPassword123')
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'User not found',
      });
    });

    it('should delete reset token from cache after use', async () => {
      (Cache.get as jest.Mock).mockResolvedValue(userId);
      (Cache.del as jest.Mock).mockResolvedValue(undefined);
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('new_hashed_password');

      await PasswordService.resetPassword(testToken, 'newPassword123');

      expect(Cache.del).toHaveBeenCalledWith(`password_reset:${hashedToken}`);
    });

    it('should invalidate all refresh tokens after password reset', async () => {
      (Cache.get as jest.Mock).mockResolvedValue(userId);
      (Cache.del as jest.Mock).mockResolvedValue(undefined);
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('new_hashed_password');

      await PasswordService.resetPassword(testToken, 'newPassword123');

      expect(Cache.del).toHaveBeenCalledWith(`refresh_token:${userId}`);
    });

    it('should hash new password before saving', async () => {
      (Cache.get as jest.Mock).mockResolvedValue(userId);
      (Cache.del as jest.Mock).mockResolvedValue(undefined);
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('new_hashed_password');

      await PasswordService.resetPassword(testToken, 'newPassword123');

      expect(passwordUtils.hashPassword).toHaveBeenCalledWith('newPassword123');
    });

    it('should log successful password reset', async () => {
      (Cache.get as jest.Mock).mockResolvedValue(userId);
      (Cache.del as jest.Mock).mockResolvedValue(undefined);
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('new_hashed_password');

      await PasswordService.resetPassword(testToken, 'newPassword123');

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Password reset successfully')
      );
    });

    it('should hash token correctly for cache lookup', async () => {
      (Cache.get as jest.Mock).mockResolvedValue(userId);
      (Cache.del as jest.Mock).mockResolvedValue(undefined);
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('new_hashed_password');

      await PasswordService.resetPassword(testToken, 'newPassword123');

      expect(Cache.get).toHaveBeenCalledWith(`password_reset:${hashedToken}`);
    });
  });

  describe('changePassword', () => {
    let userId: string;

    beforeEach(async () => {
      userId = new mongoose.Types.ObjectId().toString();
      
      await User.create({
        _id: userId,
        email: 'user@example.com',
        password: 'current_hashed_password',
        roles: ['learner'],
      });
    });

    it('should successfully change password with valid current password', async () => {
      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(true);
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('new_hashed_password');
      (Cache.del as jest.Mock).mockResolvedValue(undefined);

      await PasswordService.changePassword(userId, 'currentPassword', 'newPassword');

      const user = await User.findById(userId).select('+password');
      expect(user?.password).toBe('new_hashed_password');
    });

    it('should throw error for incorrect current password', async () => {
      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(
        PasswordService.changePassword(userId, 'wrongPassword', 'newPassword')
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Current password is incorrect',
      });
    });

    it('should throw error if user not found', async () => {
      const fakeUserId = new mongoose.Types.ObjectId().toString();
      
      await expect(
        PasswordService.changePassword(fakeUserId, 'currentPassword', 'newPassword')
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'User not found',
      });
    });

    it('should verify current password before changing', async () => {
      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(true);
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('new_hashed_password');
      (Cache.del as jest.Mock).mockResolvedValue(undefined);

      await PasswordService.changePassword(userId, 'currentPassword', 'newPassword');

      expect(passwordUtils.comparePassword).toHaveBeenCalledWith(
        'currentPassword',
        'current_hashed_password'
      );
    });

    it('should hash new password before saving', async () => {
      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(true);
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('new_hashed_password');
      (Cache.del as jest.Mock).mockResolvedValue(undefined);

      await PasswordService.changePassword(userId, 'currentPassword', 'newPassword');

      expect(passwordUtils.hashPassword).toHaveBeenCalledWith('newPassword');
    });

    it('should invalidate all refresh tokens after password change', async () => {
      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(true);
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('new_hashed_password');
      (Cache.del as jest.Mock).mockResolvedValue(undefined);

      await PasswordService.changePassword(userId, 'currentPassword', 'newPassword');

      expect(Cache.del).toHaveBeenCalledWith(`refresh_token:${userId}`);
    });

    it('should log successful password change', async () => {
      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(true);
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('new_hashed_password');
      (Cache.del as jest.Mock).mockResolvedValue(undefined);

      await PasswordService.changePassword(userId, 'currentPassword', 'newPassword');

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Password changed successfully')
      );
    });

    it('should save password using user.save() to trigger pre-save hooks', async () => {
      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(true);
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('new_hashed_password');
      (Cache.del as jest.Mock).mockResolvedValue(undefined);

      const saveSpy = jest.spyOn(User.prototype, 'save');

      await PasswordService.changePassword(userId, 'currentPassword', 'newPassword');

      expect(saveSpy).toHaveBeenCalled();
      
      saveSpy.mockRestore();
    });

    it('should not change password if verification fails', async () => {
      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(false);

      const userBefore = await User.findById(userId).select('+password');
      const passwordBefore = userBefore?.password;

      await expect(
        PasswordService.changePassword(userId, 'wrongPassword', 'newPassword')
      ).rejects.toThrow();

      const userAfter = await User.findById(userId).select('+password');
      expect(userAfter?.password).toBe(passwordBefore);
    });
  });

  describe('Security considerations', () => {
    it('should not reveal user existence in forgotPassword', async () => {
      const response1 = PasswordService.forgotPassword('exists@example.com');
      const response2 = PasswordService.forgotPassword('notexists@example.com');

      // Both should resolve without error
      await expect(response1).resolves.toBeUndefined();
      await expect(response2).resolves.toBeUndefined();
    });

    it('should use cryptographically secure random tokens', async () => {
      await User.create({
        email: 'user@example.com',
        password: 'password',
        roles: ['learner'],
      });

      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      const cryptoSpy = jest.spyOn(crypto, 'randomBytes');

      await PasswordService.forgotPassword('user@example.com');

      expect(cryptoSpy).toHaveBeenCalledWith(32);
      
      cryptoSpy.mockRestore();
    });

    it('should use sha256 for token hashing', async () => {
      await User.create({
        email: 'user@example.com',
        password: 'password',
        roles: ['learner'],
      });

      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      await PasswordService.forgotPassword('user@example.com');

      const cacheKey = (Cache.set as jest.Mock).mock.calls[0][0];
      
      // SHA256 produces 64 hex characters
      expect(cacheKey).toMatch(/^password_reset:[a-f0-9]{64}$/);
    });
  });
});
