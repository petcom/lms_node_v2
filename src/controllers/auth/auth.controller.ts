import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthService } from '@/services/auth/auth.service';
import { EscalationService } from '@/services/auth/escalation.service';
import { DepartmentSwitchService } from '@/services/auth/department-switch.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Auth Controller V2
 * Handles authentication and authorization endpoints with full Role System support
 *
 * Phase 4, Task 4.1 - Controller Implementation
 */
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
   * Login - V2 Response with Full Role System Support
   * POST /api/v2/auth/login
   *
   * Returns V2 response with:
   * - userTypes[] instead of single role
   * - departmentMemberships with roles and access rights
   * - canEscalateToAdmin flag
   * - lastSelectedDepartment for UI state
   *
   * @see contracts/api/auth-v2.contract.ts
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
   *
   * V2: Also invalidates admin token if active
   */
  static logout = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    await AuthService.logout(userId);
    res.status(200).json(ApiResponse.success(null, 'Logged out successfully'));
  });

  /**
   * Get current user - V2 with userTypes and access rights
   * GET /api/v2/auth/me
   *
   * Returns V2 response with:
   * - userTypes[] instead of single role
   * - departmentMemberships with roles and access rights
   * - canEscalateToAdmin flag
   * - isAdminSessionActive flag
   * - adminSessionExpiresAt timestamp
   *
   * Use this on page load to restore session state.
   *
   * @see contracts/api/auth-v2.contract.ts
   */
  static getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const result = await AuthService.getCurrentUser(userId);
    res.status(200).json(ApiResponse.success(result));
  });

  /**
   * Escalate to Admin Dashboard
   * POST /api/v2/auth/escalate
   *
   * NEW V2 ENDPOINT
   *
   * Requires:
   * - User must have 'global-admin' userType
   * - Valid escalation password (separate from login password)
   *
   * Returns:
   * - Admin JWT token with shorter TTL (default 15 minutes)
   * - Admin roles and access rights
   * - Session timeout information
   *
   * Security:
   * - Admin token should be stored in memory ONLY (not localStorage)
   * - Separate password from login credentials
   * - Automatic session timeout
   *
   * @see contracts/api/auth-v2.contract.ts - escalate endpoint
   */
  static escalate = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { escalationPassword } = req.body;

    // Validate input
    if (!escalationPassword || typeof escalationPassword !== 'string') {
      throw ApiError.badRequest('Escalation password is required');
    }

    // Convert userId string to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Call escalation service
    const session = await EscalationService.escalate(userObjectId, escalationPassword);

    // Build response according to contract
    const response = {
      adminSession: {
        adminToken: session.adminToken,
        expiresIn: session.sessionTimeout * 60, // Convert minutes to seconds
        adminRoles: session.roles,
        adminAccessRights: session.accessRights
      },
      adminRoles: session.roles,
      adminAccessRights: session.accessRights,
      sessionTimeoutMinutes: session.sessionTimeout
    };

    res.status(200).json(ApiResponse.success(response, 'Admin escalation successful'));
  });

  /**
   * De-escalate from Admin Dashboard
   * POST /api/v2/auth/deescalate
   *
   * NEW V2 ENDPOINT
   *
   * Ends the admin session and invalidates the admin token.
   * User returns to Staff Dashboard context.
   *
   * UI should:
   * - Clear admin token from memory
   * - Hide admin UI components
   * - Redirect to Staff Dashboard
   *
   * @see contracts/api/auth-v2.contract.ts - deescalate endpoint
   */
  static deescalate = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;

    // Convert userId string to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Call deescalation service
    await EscalationService.deescalate(userObjectId);

    res.status(200).json(ApiResponse.success(null, 'Admin deescalation successful'));
  });

  /**
   * Switch Department Context
   * POST /api/v2/auth/switch-department
   *
   * NEW V2 ENDPOINT
   *
   * Updates the user's current department and returns department-specific
   * roles and access rights.
   *
   * Business Logic:
   * - Validates user has membership in target department (direct or cascaded)
   * - Returns roles and access rights for that department
   * - Returns child departments if role cascading is enabled
   * - Updates User.lastSelectedDepartment for UI state persistence
   *
   * UI should use this to:
   * - Update current department context
   * - Re-evaluate which UI components are visible
   * - Update navigation based on new access rights
   *
   * @see contracts/api/auth-v2.contract.ts - switchDepartment endpoint
   */
  static switchDepartment = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { departmentId } = req.body;

    // Validate input
    if (!departmentId || typeof departmentId !== 'string') {
      throw ApiError.badRequest('Department ID is required');
    }

    // Validate departmentId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.badRequest('Invalid department ID format');
    }

    // Convert IDs to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const deptObjectId = new mongoose.Types.ObjectId(departmentId);

    // Call department switch service
    const result = await DepartmentSwitchService.switchDepartment(userObjectId, deptObjectId);

    // Build response according to contract
    const response = {
      currentDepartment: {
        departmentId: result.departmentId,
        departmentName: result.departmentName,
        departmentSlug: result.departmentName.toLowerCase().replace(/\s+/g, '-'), // Generate slug
        roles: result.roles,
        accessRights: result.accessRights
      },
      childDepartments: result.childDepartments?.map(child => ({
        departmentId: child.id,
        departmentName: child.name,
        roles: child.roles
      })) || [],
      isDirectMember: result.isDirectMember !== undefined ? result.isDirectMember : true,
      inheritedFrom: result.inheritedFrom || null
    };

    res.status(200).json(ApiResponse.success(response, 'Department switched successfully'));
  });

  /**
   * Continue/Refresh with Updated Access Rights
   * POST /api/v2/auth/continue
   *
   * NEW V2 ENDPOINT (GNAP-compatible)
   *
   * Use when roles change mid-session to get updated access rights
   * without requiring full re-authentication.
   *
   * Use cases:
   * - After system-admin changes role permissions
   * - After user is added to/removed from a department
   * - After user's roles in a department change
   * - Periodic refresh to ensure token has current rights
   *
   * Returns:
   * - New access token with updated rights
   * - Updated department memberships
   * - Changes summary (what was added/removed)
   *
   * This is the GNAP "continuation" pattern for access updates.
   *
   * @see contracts/api/auth-v2.contract.ts - continue endpoint
   */
  static continue = asyncHandler(async (_req: Request, res: Response) => {
    // TODO: Full implementation in Phase 4, Task 4.2
    // For now, return a 501 Not Implemented with message
    //
    // In a full implementation, this would:
    // 1. Re-fetch current user data (this gets latest roles/rights)
    // 2. Compare old token rights with new rights
    // 3. Generate a new access token
    // 4. Return a changes summary
    //
    // Example structure:
    // const userId = (req as any).user.userId;
    // const currentData = await AuthService.getCurrentUser(userId);
    // const response = {
    //   session: { accessToken, refreshToken, expiresIn: 3600, tokenType: 'Bearer' },
    //   departmentMemberships: [...],
    //   allAccessRights: [...],
    //   changes: { rolesAdded: [], rolesRemoved: [], departmentsAdded: [], departmentsRemoved: [] }
    // };

    res.status(501).json(
      ApiResponse.error('Token continuation not yet implemented - use /auth/refresh for now')
    );
  });
}
