/**
 * isAuthenticated Middleware (V2)
 *
 * Enhanced authentication middleware for Role System V2.
 * Verifies JWT token and attaches comprehensive user context including
 * userTypes, allAccessRights, and optional admin context.
 *
 * Key features:
 * - Attaches userTypes[] to req.user
 * - Attaches allAccessRights[] to req.user (deprecated, for backward compatibility)
 * - Attaches globalRights[] to req.user (Phase 2: rights with scope '*')
 * - Attaches departmentRights{} to req.user (Phase 2: department-scoped rights)
 * - Attaches departmentHierarchy{} to req.user (Phase 2: for child lookups)
 * - Checks for admin token and attaches admin context if present
 * - Supports both V1 and V2 token formats during transition
 *
 * Usage:
 * ```typescript
 * router.get('/api/v2/me',
 *   isAuthenticated,
 *   getProfile
 * );
 * ```
 *
 * Phase 5, Task 5.6 - Full Implementation
 * Phase 2 Update - Unified permission structure (globalRights, departmentRights, departmentHierarchy)
 *
 * @module middlewares/isAuthenticated
 */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { verifyAccessToken } from '@/utils/jwt';
import { User, UserType } from '@/models/auth/User.model';
import { GlobalAdmin } from '@/models/GlobalAdmin.model';
import { EscalationService } from '@/services/auth/escalation.service';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/config/logger';
import { roleCache } from '@/services/auth/role-cache.service';
import { departmentCacheService } from '@/services/auth/department-cache.service';
import {
  getUserPermissions,
  setUserPermissions,
  getUserPermissionVersion,
  type UserPermissions
} from '@/utils/permission-cache';

/**
 * Department membership info for authorization
 */
export interface DepartmentMembership {
  departmentId: string;
  roles: string[];
}

/**
 * Enhanced user context attached to request
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  userTypes: UserType[];

  // Phase 2: Unified permission structure
  /** Global rights (scope: '*') - Rights that apply everywhere (GlobalAdmin only currently) */
  globalRights: string[];
  /** Department-scoped rights - Rights that apply to specific departments */
  departmentRights: Record<string, string[]>;
  /** Department hierarchy for child lookups (parent -> children mapping) */
  departmentHierarchy: Record<string, string[]>;

  /** @deprecated Use globalRights + departmentRights instead. Kept for backward compatibility. */
  allAccessRights: string[];
  departmentMemberships: DepartmentMembership[];
  canEscalateToAdmin: boolean;
  defaultDashboard: 'learner' | 'staff';
  lastSelectedDepartment?: string;

  // Permission versioning for cache validation
  permissionVersion?: number;

  // V1 compatibility (deprecated)
  /** @deprecated Use departmentMemberships instead */
  roles?: string[];
}

/**
 * Extend Express Request with enhanced user context
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware: Enhanced authentication (V2)
 *
 * Verifies JWT access token and attaches comprehensive user context to request.
 * This is the primary authentication middleware for Role System V2.
 *
 * Token sources:
 * 1. Authorization header: "Bearer <token>"
 *
 * User context includes:
 * - userId: User's ObjectId as string
 * - email: User's email address
 * - userTypes: Array of user types ['learner', 'staff', 'global-admin']
 * - allAccessRights: Combined access rights from all department roles
 * - canEscalateToAdmin: Whether user can access admin dashboard
 * - defaultDashboard: Default dashboard to show ('learner' or 'staff')
 * - lastSelectedDepartment: Last selected department ObjectId
 *
 * Optional admin context (if X-Admin-Token header present):
 * - req.adminRoles: Array of global admin roles
 * - req.adminAccessRights: Access rights from admin roles
 *
 * V1/V2 compatibility:
 * - V1 tokens: Includes roles[] field (deprecated)
 * - V2 tokens: Includes userTypes[] and allAccessRights[]
 * - Middleware works with both formats during transition
 *
 * @throws ApiError 401 if no token provided
 * @throws ApiError 401 if token is invalid or expired
 * @throws ApiError 404 if user not found in database
 *
 * @example
 * // Basic route protection
 * router.get('/profile',
 *   isAuthenticated,
 *   getProfile
 * );
 *
 * @example
 * // Access user context in controller
 * async function getProfile(req: Request, res: Response) {
 *   const { userId, userTypes, allAccessRights } = req.user;
 *   // Use user context
 * }
 */
export const isAuthenticated = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify access token
    const payload = verifyAccessToken(token);

    // Fetch user from database to get complete profile
    const user = await User.findById(payload.userId);

    if (!user) {
      logger.warn(`Authentication failed: User ${payload.userId} not found`);
      throw ApiError.notFound('User not found');
    }

    // Check if user is active
    if (!user.isActive) {
      logger.warn(`Authentication failed: User ${payload.userId} is not active`);
      throw ApiError.unauthorized('User account is not active');
    }

    // Get all access rights and department memberships for user
    // This is populated from Staff/Learner departmentMemberships via RoleDefinition
    // Now uses Redis caching for improved performance
    const authInfo = await getUserAuthorizationInfo(user._id);

    // Get permission version for cache validation (null if Redis unavailable)
    const permissionVersion = await getUserPermissionVersion(user._id.toString());

    // Get department hierarchy for child lookups
    const departmentHierarchy = departmentCacheService.getDepartmentHierarchy();

    // Build enhanced user context
    const authenticatedUser: AuthenticatedUser = {
      userId: user._id.toString(),
      email: user.email,
      userTypes: user.userTypes,

      // Phase 2: Unified permission structure
      globalRights: authInfo.globalRights,
      departmentRights: authInfo.departmentRights,
      departmentHierarchy,

      // Backward compatibility (deprecated)
      allAccessRights: authInfo.accessRights,
      departmentMemberships: authInfo.departmentMemberships,
      canEscalateToAdmin: user.canEscalateToAdmin(),
      defaultDashboard: user.defaultDashboard,
      lastSelectedDepartment: user.lastSelectedDepartment?.toString(),
      permissionVersion: permissionVersion ?? undefined
    };

    // V1 compatibility: Include roles if present in token (deprecated)
    if (payload.roles) {
      authenticatedUser.roles = payload.roles;
    }

    // Attach user to request
    req.user = authenticatedUser;

    // Optional: Check for admin token and attach admin context
    await attachAdminContextIfPresent(req);

    logger.debug(
      `User authenticated: ${user.email} (${user._id}) with userTypes [${user.userTypes.join(', ')}]`
    );

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Result of fetching user authorization info
 */
interface UserAuthorizationInfo {
  accessRights: string[];
  departmentMemberships: DepartmentMembership[];
  /** Global rights (scope: '*') - empty for non-admin users */
  globalRights: string[];
  /** Department-scoped rights */
  departmentRights: Record<string, string[]>;
}

/**
 * Get all access rights and department memberships for user from their roles
 *
 * Aggregates from:
 * 1. Staff department memberships
 * 2. Learner department memberships
 * 3. GlobalAdmin roles (if applicable - handled separately via escalation)
 *
 * Now uses Redis caching (Tier 2) and role cache (Tier 1) for improved performance:
 * - Checks Redis cache first for computed permissions
 * - Falls back to database computation on cache miss
 * - Caches computed permissions for future requests
 * - Uses roleCache.getCombinedAccessRights() for role lookups
 *
 * @param userId - User's ObjectId
 * @returns Object with access rights (deduplicated) and department memberships
 */
async function getUserAuthorizationInfo(userId: Types.ObjectId): Promise<UserAuthorizationInfo> {
  const userIdStr = userId.toString();

  try {
    // Step 1: Check Redis cache for computed permissions
    const cachedPermissions = await getUserPermissions(userIdStr);

    if (cachedPermissions) {
      // Cache HIT - extract accessRights and departmentMemberships from cached data
      logger.debug(`getUserAuthorizationInfo: Cache HIT for user ${userIdStr}`);

      // Combine globalRights and all departmentRights into a single accessRights array (backward compat)
      const accessRightsSet = new Set<string>(cachedPermissions.globalRights || []);
      const departmentMemberships: DepartmentMembership[] = [];
      const departmentRights = cachedPermissions.departmentRights || {};

      // Add department-scoped rights and build department memberships
      for (const [deptId, rights] of Object.entries(departmentRights)) {
        rights.forEach((right) => accessRightsSet.add(right));
        // Note: cached permissions don't store role names, only rights
        // We need to reconstruct memberships with empty roles array
        // The actual roles can be computed from permissions if needed
        departmentMemberships.push({
          departmentId: deptId,
          roles: [] // Roles not stored in cache, but rights are what matter for authorization
        });
      }

      return {
        accessRights: Array.from(accessRightsSet),
        departmentMemberships,
        globalRights: cachedPermissions.globalRights || [],
        departmentRights
      };
    }

    // Cache MISS - compute permissions from database
    logger.debug(`getUserAuthorizationInfo: Cache MISS for user ${userIdStr}, computing from database`);

    const accessRightsSet = new Set<string>();
    const departmentMemberships: DepartmentMembership[] = [];
    const departmentRights: Record<string, string[]> = {};

    // Import models dynamically to avoid circular dependencies
    const { Staff } = await import('@/models/auth/Staff.model');
    const { Learner } = await import('@/models/auth/Learner.model');

    // Get Staff access rights and memberships
    const staff = await Staff.findById(userId);
    if (staff && staff.isActive) {
      for (const membership of staff.departmentMemberships) {
        if (membership.isActive) {
          const deptId = membership.departmentId.toString();

          // Add to department memberships
          departmentMemberships.push({
            departmentId: deptId,
            roles: membership.roles
          });

          // Get access rights for roles using roleCache
          const rights = await roleCache.getCombinedAccessRights(membership.roles);
          rights.forEach((right) => accessRightsSet.add(right));

          // Track department-specific rights for caching
          if (!departmentRights[deptId]) {
            departmentRights[deptId] = [];
          }
          departmentRights[deptId].push(...rights);
        }
      }
    }

    // Get Learner access rights and memberships
    const learner = await Learner.findById(userId);
    if (learner && learner.isActive) {
      for (const membership of learner.departmentMemberships) {
        if (membership.isActive) {
          const deptId = membership.departmentId.toString();

          // Add to department memberships (may already exist from staff, merge roles)
          const existing = departmentMemberships.find(
            m => m.departmentId === deptId
          );
          if (existing) {
            // Merge roles
            for (const role of membership.roles) {
              if (!existing.roles.includes(role)) {
                existing.roles.push(role);
              }
            }
          } else {
            departmentMemberships.push({
              departmentId: deptId,
              roles: membership.roles
            });
          }

          // Get access rights for roles using roleCache
          const rights = await roleCache.getCombinedAccessRights(membership.roles);
          rights.forEach((right) => accessRightsSet.add(right));

          // Track department-specific rights for caching
          if (!departmentRights[deptId]) {
            departmentRights[deptId] = [];
          }
          departmentRights[deptId].push(...rights);
        }
      }
    }

    // Deduplicate department rights
    for (const deptId of Object.keys(departmentRights)) {
      departmentRights[deptId] = [...new Set(departmentRights[deptId])];
    }

    // Step 2: Cache the computed permissions in Redis
    const accessRightsArray = Array.from(accessRightsSet);

    // globalRights is empty for non-admin users (staff/learner rights are department-scoped)
    // GlobalAdmin rights are handled via escalation service, not here
    const globalRights: string[] = [];

    const permissionsToCache: UserPermissions = {
      userId: userIdStr,
      permissions: [], // Full permissions list not needed for basic auth
      globalRights, // Empty for non-admin users
      departmentRights,
      departmentHierarchy: {}, // Hierarchy handled by departmentCacheService
      computedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min TTL
      version: 1
    };

    // Cache asynchronously (don't wait for completion)
    setUserPermissions(userIdStr, permissionsToCache).catch((error) => {
      logger.warn(`Failed to cache permissions for user ${userIdStr}: ${error}`);
    });

    // Note: GlobalAdmin access rights are handled separately via escalation
    // They are NOT included in allAccessRights until user escalates

    return {
      accessRights: accessRightsArray,
      departmentMemberships,
      globalRights,
      departmentRights
    };
  } catch (error) {
    // Graceful degradation - log error and return empty permissions
    logger.error(`Error fetching user authorization info for user ${userIdStr}: ${error}`);
    return { accessRights: [], departmentMemberships: [], globalRights: [], departmentRights: {} };
  }
}

/**
 * Attach admin context if X-Admin-Token header is present
 *
 * This allows endpoints to optionally accept admin escalation without requiring it.
 * If admin token is present and valid, admin context is attached.
 * If admin token is missing or invalid, request continues without admin context.
 *
 * @param req - Express request
 */
async function attachAdminContextIfPresent(req: Request): Promise<void> {
  try {
    const adminToken = req.headers['x-admin-token'] as string;

    if (!adminToken) {
      // No admin token, skip admin context
      return;
    }

    // Validate admin token
    const tokenPayload = await EscalationService.validateAdminToken(adminToken);
    const userId = new Types.ObjectId(tokenPayload.userId);

    // Verify GlobalAdmin record
    const globalAdmin = await GlobalAdmin.findById(userId);

    if (!globalAdmin || !globalAdmin.isActive) {
      // Invalid admin token, skip admin context
      logger.debug(`Invalid admin token for user ${userId}, skipping admin context`);
      return;
    }

    // Verify admin session is active
    const isSessionActive = await EscalationService.isAdminSessionActive(userId);

    if (!isSessionActive) {
      logger.debug(`Admin session expired for user ${userId}, skipping admin context`);
      return;
    }

    // Get admin roles and access rights using roleCache for performance
    const adminRoles = globalAdmin.getAllRoles();
    const adminAccessRights = await roleCache.getCombinedAccessRights(adminRoles);

    // Attach admin context
    req.adminRoles = adminRoles;
    req.adminAccessRights = adminAccessRights;

    // Merge admin access rights into user's globalRights for the authorize middleware
    // This allows the unified authorization system to see admin permissions
    if (req.user) {
      req.user.globalRights = [...(req.user.globalRights || []), ...adminAccessRights];
    }

    logger.debug(
      `Admin context attached: User ${userId} with admin roles [${adminRoles.join(', ')}]`
    );
  } catch (error) {
    // Silently skip admin context if any error occurs
    // The admin token is optional for this middleware
    logger.debug(`Could not attach admin context: ${error}`);
  }
}

/**
 * Helper: Check if user is authenticated
 *
 * Utility function to check authentication status.
 *
 * @param req - Express request
 * @returns True if user is authenticated
 */
export function isUserAuthenticated(req: Request): boolean {
  return !!(req.user && req.user.userId);
}

/**
 * Helper: Get user ID from request
 *
 * @param req - Express request
 * @returns User ID or null if not authenticated
 */
export function getUserId(req: Request): string | null {
  return req.user?.userId || null;
}

/**
 * Helper: Get user types from request
 *
 * @param req - Express request
 * @returns Array of user types or empty array
 */
export function getUserTypes(req: Request): UserType[] {
  return req.user?.userTypes || [];
}

/**
 * Helper: Check if user has specific user type
 *
 * @param req - Express request
 * @param userType - User type to check
 * @returns True if user has the user type
 */
export function hasUserType(req: Request, userType: UserType): boolean {
  return req.user?.userTypes.includes(userType) || false;
}

/**
 * Helper: Check if user can escalate to admin
 *
 * @param req - Express request
 * @returns True if user can escalate to admin dashboard
 */
export function canUserEscalate(req: Request): boolean {
  return req.user?.canEscalateToAdmin || false;
}

/**
 * Export default
 */
export default isAuthenticated;
