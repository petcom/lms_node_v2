import { Request, Response } from 'express';
import { AuthService } from '@/services/auth/auth.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';

export class AuthController {
  /**
   * Register staff
   * POST /api/v2/auth/register/staff
   */
  static registerStaff = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.registerStaff(req.body);
    res.status(201).json(ApiResponse.created(result, 'Staff registered successfully'));
  });

  /**
   * Register learner
   * POST /api/v2/auth/register/learner
   */
  static registerLearner = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.registerLearner(req.body);
    res.status(201).json(ApiResponse.created(result, 'Learner registered successfully'));
  });

  /**
   * Login
   * POST /api/v2/auth/login
   */
  static login = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.login(req.body);
    res.status(200).json(ApiResponse.success(result, 'Login successful'));
  });

  /**
   * Refresh token
   * POST /api/v2/auth/refresh
   */
  static refresh = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const result = await AuthService.refresh(refreshToken);
    res.status(200).json(ApiResponse.success(result, 'Token refreshed successfully'));
  });

  /**
   * Logout
   * POST /api/v2/auth/logout
   */
  static logout = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    await AuthService.logout(userId);
    res.status(200).json(ApiResponse.success(null, 'Logged out successfully'));
  });

  /**
   * Get current user
   * GET /api/v2/auth/me
   */
  static getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const result = await AuthService.getCurrentUser(userId);
    res.status(200).json(ApiResponse.success(result));
  });
}
