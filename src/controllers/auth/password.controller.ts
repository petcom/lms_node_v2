import { Request, Response } from 'express';
import { PasswordService } from '@/services/auth/password.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';

export class PasswordController {
  /**
   * Forgot password
   * POST /api/v2/auth/password/forgot
   */
  static forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    await PasswordService.forgotPassword(email);
    res.status(200).json(
      ApiResponse.success(null, 'If the email exists, a password reset email has been sent')
    );
  });

  /**
   * Reset password
   * PUT /api/v2/auth/password/reset/:token
   */
  static resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const { newPassword } = req.body;
    await PasswordService.resetPassword(token, newPassword);
    res.status(200).json(ApiResponse.success(null, 'Password reset successfully'));
  });

  /**
   * Change password
   * PUT /api/v2/auth/password/change
   */
  static changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { currentPassword, newPassword } = req.body;
    await PasswordService.changePassword(userId, currentPassword, newPassword);
    res.status(200).json(ApiResponse.success(null, 'Password changed successfully'));
  });
}
