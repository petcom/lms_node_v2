import crypto from 'crypto';
import { User } from '@/models/auth/User.model';
import { hashPassword, comparePassword } from '@/utils/password';
import { ApiError } from '@/utils/ApiError';
import { Cache } from '@/config/redis';
import { logger } from '@/config/logger';

export class PasswordService {
  /**
   * Send password reset email
   */
  static async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email });

    // Don't reveal if user exists (security)
    if (!user) {
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store hashed token in cache (expires in 1 hour)
    await Cache.set(`password_reset:${hashedToken}`, user._id.toString(), 60 * 60);

    // TODO: Send email with reset link
    // For now, just log it
    logger.info(`Password reset token for ${email}: ${resetToken}`);
    logger.info(`Reset link: http://localhost:3000/reset-password/${resetToken}`);
  }

  /**
   * Reset password using token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    // Hash the token to match stored version
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Get userId from cache
    const userId = await Cache.get<string>(`password_reset:${hashedToken}`);

    if (!userId) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    const user = await User.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true }
    );

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Delete reset token from cache
    await Cache.del(`password_reset:${hashedToken}`);

    // Invalidate all refresh tokens for this user
    await Cache.del(`refresh_token:${userId}`);

    logger.info(`Password reset successfully for user: ${userId}`);
  }

  /**
   * Change password (authenticated user)
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get user with password
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Verify current password
    const isValid = await comparePassword(currentPassword, user.password);

    if (!isValid) {
      throw ApiError.unauthorized('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Invalidate all refresh tokens for this user (force re-login)
    await Cache.del(`refresh_token:${userId}`);

    logger.info(`Password changed successfully for user: ${userId}`);
  }
}
