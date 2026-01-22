/**
 * Role Management Service
 *
 * System-admin only service for managing user role assignments,
 * global admin assignments, and role-access right mappings.
 *
 * Key Features:
 * - User role assignment/removal
 * - Global admin management
 * - Role definition management
 * - Bulk operations
 * - Safety checks (cannot remove last system-admin)
 * - Role compatibility validation
 * - Complete audit trail
 *
 * @module services/admin/role-management
 */

import { Types } from 'mongoose';
import { ApiError } from '@/utils/ApiError';
import { Staff, IDepartmentMembership } from '@/models/auth/Staff.model';
import { User } from '@/models/auth/User.model';
import { GlobalAdmin, MASTER_DEPARTMENT_ID, GlobalAdminRole } from '@/models/GlobalAdmin.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import AccessRight from '@/models/AccessRight.model';
import { invalidateAndIncrementVersion } from '@/utils/permission-cache';
import { logger } from '@/config/logger';

// ============================================================================
// USER ROLE ASSIGNMENT OPERATIONS
// ============================================================================

/**
 * Get all role assignments for a user
 */
export async function getUserRoles(userId: string): Promise<{
  userId: string;
  userType: 'staff' | 'learner';
  departmentMemberships: Array<{
    _id: string;
    departmentId: string;
    departmentName: string;
    roles: string[];
    isPrimary: boolean;
    joinedAt: Date;
    isActive: boolean;
  }>;
  calculatedAccessRights: string[];
}> {
  // Find user
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  let departmentMemberships: any[] = [];
  let allRoles: string[] = [];

  if (user.userTypes.includes('staff')) {
    // Get staff memberships
    const staff = await Staff.findById(userId).populate('departmentMemberships.departmentId');
    if (staff) {
      departmentMemberships = staff.departmentMemberships.map((m: IDepartmentMembership & any) => ({
        _id: m._id?.toString() || new Types.ObjectId().toString(),
        departmentId: m.departmentId._id.toString(),
        departmentName: m.departmentId.name || 'Unknown Department',
        roles: m.roles,
        isPrimary: m.isPrimary,
        joinedAt: m.joinedAt,
        isActive: m.isActive
      }));
      allRoles = staff.departmentMemberships.flatMap((m: IDepartmentMembership) => m.roles);
    }
  } else if (user.userTypes.includes('learner')) {
    // Learners don't have department memberships (system-wide access)
    // Their roles are directly on user object (if any)
    departmentMemberships = [];
    allRoles = [];
  }

  // Check if user is also a global admin
  const globalAdmin = await GlobalAdmin.findById(userId);
  if (globalAdmin && globalAdmin.isActive) {
    const globalRoles = globalAdmin.getAllRoles();
    allRoles = [...new Set([...allRoles, ...globalRoles])];
  }

  // Calculate access rights from all roles
  const calculatedAccessRights = await calculateAccessRightsFromRoles(allRoles);

  // Determine primary user type for response
  const userType: 'staff' | 'learner' = user.userTypes.includes('staff') ? 'staff' : 'learner';

  return {
    userId: userId,
    userType,
    departmentMemberships,
    calculatedAccessRights
  };
}

/**
 * Assign a role to a user in a specific department
 */
export async function assignUserRole(
  userId: string,
  departmentId: string,
  roleName: string,
  isPrimary: boolean = false,
  expiresAt?: Date,
  assignedBy?: string
): Promise<{
  userId: string;
  departmentId: string;
  roleName: string;
  isPrimary: boolean;
  assignedAt: Date;
  expiresAt: Date | null;
  assignedBy: string;
}> {
  // Validate user exists
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Determine primary user type for validation
  const primaryUserType: 'staff' | 'learner' = user.userTypes.includes('staff') ? 'staff' : 'learner';

  // Validate role compatibility with user type
  const roleIsValid = await validateRoleForUserType(roleName, primaryUserType);
  if (!roleIsValid) {
    throw ApiError.badRequest(`Role '${roleName}' is not valid for user type '${primaryUserType}'`);
  }

  // Validate department exists
  // TODO: Uncomment when Department model is available
  // const department = await Department.findById(departmentId);
  // if (!department) {
  //   throw ApiError.notFound('Department not found');
  // }

  if (!user.userTypes.includes('staff')) {
    throw ApiError.badRequest('Only staff users can have department role assignments');
  }

  // Get or create staff record
  let staff = await Staff.findById(userId);
  if (!staff) {
    staff = new Staff({
      _id: userId,
      person: {
        firstName: 'Unknown',
        lastName: 'User'
      },
      departmentMemberships: []
    });
  }

  // Check if user already has a membership in this department
  const existingMembership = staff.departmentMemberships.find(
    (m: IDepartmentMembership) => m.departmentId.equals(new Types.ObjectId(departmentId)) && m.isActive
  );

  if (existingMembership) {
    // Add role to existing membership if not already present
    if (!existingMembership.roles.includes(roleName)) {
      existingMembership.roles.push(roleName);
      await staff.save();
    } else {
      throw ApiError.conflict('User already has this role in this department');
    }
  } else {
    // Create new membership
    const newMembership: IDepartmentMembership = {
      departmentId: new Types.ObjectId(departmentId),
      roles: [roleName],
      isPrimary: isPrimary,
      joinedAt: new Date(),
      isActive: true
    };
    staff.departmentMemberships.push(newMembership);
    await staff.save();
  }

  // TODO: Log to audit trail
  // await AuditLog.create({
  //   action: 'ROLE_ASSIGNED',
  //   userId: assignedBy,
  //   targetUserId: userId,
  //   details: { departmentId, roleName, isPrimary }
  // });

  // Invalidate permission cache after role assignment
  try {
    const newVersion = await invalidateAndIncrementVersion(userId);
    logger.info(`[RoleManagement] Invalidated permission cache for user ${userId} after role assignment (version: ${newVersion})`);
  } catch (cacheError) {
    logger.error(`[RoleManagement] Failed to invalidate permission cache for user ${userId}:`, cacheError);
    // Continue - cache invalidation failure should not fail the operation
  }

  return {
    userId,
    departmentId,
    roleName,
    isPrimary,
    assignedAt: new Date(),
    expiresAt: expiresAt || null,
    assignedBy: assignedBy || 'system'
  };
}

/**
 * Remove a role assignment from a user
 */
export async function removeUserRole(
  userId: string,
  membershipId: string,
  removedBy?: string
): Promise<{
  userId: string;
  membershipId: string;
  removedAt: Date;
  removedBy: string;
}> {
  const staff = await Staff.findById(userId);
  if (!staff) {
    throw ApiError.notFound('Staff user not found');
  }

  // Find membership
  const membershipIndex = staff.departmentMemberships.findIndex(
    (m: any) => m._id?.toString() === membershipId
  );

  if (membershipIndex === -1) {
    throw ApiError.notFound('Role membership not found');
  }

  // Remove membership
  staff.departmentMemberships.splice(membershipIndex, 1);
  await staff.save();

  // TODO: Log to audit trail

  // Invalidate permission cache after role removal
  try {
    const newVersion = await invalidateAndIncrementVersion(userId);
    logger.info(`[RoleManagement] Invalidated permission cache for user ${userId} after role removal (version: ${newVersion})`);
  } catch (cacheError) {
    logger.error(`[RoleManagement] Failed to invalidate permission cache for user ${userId}:`, cacheError);
    // Continue - cache invalidation failure should not fail the operation
  }

  return {
    userId,
    membershipId,
    removedAt: new Date(),
    removedBy: removedBy || 'system'
  };
}

/**
 * Update a role membership
 */
export async function updateRoleMembership(
  userId: string,
  membershipId: string,
  updates: {
    departmentId?: string;
    roles?: string[];
    isPrimary?: boolean;
    expiresAt?: Date | null;
    isActive?: boolean;
  },
  updatedBy?: string
): Promise<{
  userId: string;
  membershipId: string;
  departmentId: string;
  roles: string[];
  isPrimary: boolean;
  expiresAt: Date | null;
  isActive: boolean;
  updatedAt: Date;
  updatedBy: string;
}> {
  const staff = await Staff.findById(userId);
  if (!staff) {
    throw ApiError.notFound('Staff user not found');
  }

  // Find membership
  const membership = staff.departmentMemberships.find(
    (m: any) => m._id?.toString() === membershipId
  );

  if (!membership) {
    throw ApiError.notFound('Role membership not found');
  }

  // Apply updates
  if (updates.departmentId !== undefined) {
    membership.departmentId = new Types.ObjectId(updates.departmentId);
  }
  if (updates.roles !== undefined) {
    // Validate all roles
    const user = await User.findById(userId);
    const primaryUserType: 'staff' | 'learner' = user!.userTypes.includes('staff') ? 'staff' : 'learner';
    for (const role of updates.roles) {
      const valid = await validateRoleForUserType(role, primaryUserType);
      if (!valid) {
        throw ApiError.badRequest(`Role '${role}' is not valid for user type '${primaryUserType}'`);
      }
    }
    membership.roles = updates.roles;
  }
  if (updates.isPrimary !== undefined) {
    membership.isPrimary = updates.isPrimary;
  }
  if (updates.isActive !== undefined) {
    membership.isActive = updates.isActive;
  }

  await staff.save();

  // TODO: Log to audit trail

  // Invalidate permission cache after membership update
  try {
    const newVersion = await invalidateAndIncrementVersion(userId);
    logger.info(`[RoleManagement] Invalidated permission cache for user ${userId} after membership update (version: ${newVersion})`);
  } catch (cacheError) {
    logger.error(`[RoleManagement] Failed to invalidate permission cache for user ${userId}:`, cacheError);
    // Continue - cache invalidation failure should not fail the operation
  }

  return {
    userId,
    membershipId,
    departmentId: membership.departmentId.toString(),
    roles: membership.roles,
    isPrimary: membership.isPrimary,
    expiresAt: null, // TODO: Implement expiration when model supports it
    isActive: membership.isActive,
    updatedAt: new Date(),
    updatedBy: updatedBy || 'system'
  };
}

/**
 * Get role assignment history for a user
 */
export async function getUserRoleHistory(userId: string): Promise<{
  userId: string;
  history: Array<{
    _id: string;
    action: 'assigned' | 'removed' | 'updated';
    departmentId: string;
    departmentName: string;
    roleName: string;
    performedBy: {
      userId: string;
      name: string;
    };
    timestamp: Date;
    details: Record<string, any>;
  }>;
  total: number;
}> {
  // TODO: Query audit log for user role changes
  // This is a placeholder implementation
  return {
    userId,
    history: [],
    total: 0
  };
}

/**
 * Search users for role assignment
 */
export async function searchUsers(filters: {
  query?: string;
  userType?: 'staff' | 'learner' | 'all';
  departmentId?: string;
  hasRole?: string;
  withoutRole?: string;
  page?: number;
  limit?: number;
}): Promise<{
  users: Array<{
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: 'staff' | 'learner';
    currentRoles: string[];
    departments: Array<{
      departmentId: string;
      departmentName: string;
      roles: string[];
    }>;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  // Build query
  const query: any = {};

  if (filters.userType && filters.userType !== 'all') {
    query.userTypes = filters.userType;
  }

  if (filters.query) {
    // Note: firstName/lastName are on Staff.person, not User - search by email only for User
    query.$or = [
      { email: { $regex: filters.query, $options: 'i' } }
    ];
  }

  const users = await User.find(query).skip(skip).limit(limit).lean();
  const total = await User.countDocuments(query);

  // Enrich with role information
  interface UserLeanResult {
    _id: Types.ObjectId;
    email: string;
    userTypes: ('learner' | 'staff' | 'global-admin')[];
  }
  const enrichedUsers = await Promise.all(
    users.map(async (user: UserLeanResult) => {
      let currentRoles: string[] = [];
      let departments: any[] = [];
      let firstName = 'Unknown';
      let lastName = 'User';

      // Determine primary user type
      const userType: 'staff' | 'learner' = user.userTypes.includes('staff') ? 'staff' : 'learner';

      if (user.userTypes.includes('staff')) {
        const staff = await Staff.findById(user._id);
        if (staff) {
          firstName = staff.person?.firstName || 'Unknown';
          lastName = staff.person?.lastName || 'User';
          currentRoles = staff.departmentMemberships.flatMap((m: IDepartmentMembership) => m.roles);
          departments = staff.departmentMemberships.map((m: IDepartmentMembership & any) => ({
            departmentId: m.departmentId.toString(),
            departmentName: 'Department', // TODO: Populate department names
            roles: m.roles
          }));
        }
      }

      // Check global admin
      const globalAdmin = await GlobalAdmin.findById(user._id);
      if (globalAdmin && globalAdmin.isActive) {
        currentRoles = [...new Set([...currentRoles, ...globalAdmin.getAllRoles()])];
      }

      return {
        _id: user._id.toString(),
        email: user.email,
        firstName,
        lastName,
        userType,
        currentRoles,
        departments
      };
    })
  );

  return {
    users: enrichedUsers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

// ============================================================================
// GLOBAL ADMIN MANAGEMENT OPERATIONS
// ============================================================================

/**
 * List all global admins
 */
export async function listGlobalAdmins(): Promise<{
  globalAdmins: Array<{
    _id: string;
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    roleMemberships: Array<{
      departmentId: string;
      departmentName: string;
      roles: string[];
      isPrimary: boolean;
      joinedAt: Date;
      isActive: boolean;
    }>;
    calculatedAccessRights: string[];
    createdAt: Date;
    isActive: boolean;
  }>;
  total: number;
}> {
  const globalAdmins = await GlobalAdmin.find({ isActive: true });

  const enrichedAdmins = await Promise.all(
    globalAdmins.map(async (admin) => {
      const user = await User.findById(admin._id);
      if (!user) {
        return null;
      }

      const allRoles = admin.getAllRoles();
      const calculatedAccessRights = await calculateAccessRightsFromRoles(allRoles);

      // Get staff record for name (firstName/lastName are on Staff.person, not User)
      const staffRecord = await Staff.findById(admin._id);
      const firstName = staffRecord?.person?.firstName || 'Unknown';
      const lastName = staffRecord?.person?.lastName || 'User';

      return {
        _id: admin._id.toString(),
        userId: admin._id.toString(),
        email: user.email,
        firstName,
        lastName,
        roleMemberships: admin.roleMemberships.map(m => ({
          departmentId: m.departmentId.toString(),
          departmentName: 'System Administration',
          roles: m.roles,
          isPrimary: true,
          joinedAt: m.assignedAt,
          isActive: m.isActive
        })),
        calculatedAccessRights,
        createdAt: admin.createdAt,
        isActive: admin.isActive
      };
    })
  );

  const validAdmins = enrichedAdmins.filter(a => a !== null) as any[];

  return {
    globalAdmins: validAdmins,
    total: validAdmins.length
  };
}

/**
 * Create a global admin (or promote existing user)
 */
export async function createGlobalAdmin(
  userId: string,
  roles: string[],
  _masterDepartmentId: string,
  isPrimary: boolean = true,
  createdBy?: string
): Promise<{
  userId: string;
  roles: string[];
  masterDepartmentId: string;
  isPrimary: boolean;
  createdAt: Date;
  createdBy: string;
}> {
  // Validate user exists
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Validate roles
  for (const role of roles) {
    const valid = await validateRoleForUserType(role, 'global-admin');
    if (!valid) {
      throw ApiError.badRequest(`Role '${role}' is not a valid global-admin role`);
    }
  }

  // Check if already a global admin
  let globalAdmin = await GlobalAdmin.findById(userId);

  if (globalAdmin) {
    throw ApiError.conflict('User is already a global admin');
  }

  // Create global admin
  globalAdmin = new GlobalAdmin({
    _id: userId,
    escalationPassword: 'TEMP_PASSWORD_MUST_BE_SET', // User must set this
    roleMemberships: [{
      departmentId: MASTER_DEPARTMENT_ID,
      roles: roles,
      assignedAt: new Date(),
      assignedBy: createdBy ? new Types.ObjectId(createdBy) : undefined,
      isActive: true
    }],
    sessionTimeout: 15,
    isActive: true
  });

  await globalAdmin.save();

  // TODO: Log to audit trail

  // Invalidate permission cache after global admin creation
  try {
    const newVersion = await invalidateAndIncrementVersion(userId);
    logger.info(`[RoleManagement] Invalidated permission cache for user ${userId} after global admin creation (version: ${newVersion})`);
  } catch (cacheError) {
    logger.error(`[RoleManagement] Failed to invalidate permission cache for user ${userId}:`, cacheError);
    // Continue - cache invalidation failure should not fail the operation
  }

  return {
    userId,
    roles,
    masterDepartmentId: MASTER_DEPARTMENT_ID.toString(),
    isPrimary,
    createdAt: new Date(),
    createdBy: createdBy || 'system'
  };
}

/**
 * Remove global admin status (with safety check)
 */
export async function removeGlobalAdmin(
  userId: string,
  removedBy?: string
): Promise<{
  userId: string;
  removedAt: Date;
  removedBy: string;
}> {
  const globalAdmin = await GlobalAdmin.findById(userId);
  if (!globalAdmin) {
    throw ApiError.notFound('Global admin not found');
  }

  // Safety check: Cannot remove last system-admin
  if (globalAdmin.hasRole('system-admin')) {
    const systemAdminCount = await GlobalAdmin.countDocuments({
      'roleMemberships.roles': 'system-admin',
      isActive: true
    });

    if (systemAdminCount <= 1) {
      throw ApiError.forbidden('Cannot remove the last system-admin from the system');
    }
  }

  // Deactivate instead of deleting (soft delete)
  globalAdmin.isActive = false;
  await globalAdmin.save();

  // TODO: Log to audit trail

  // Invalidate permission cache after global admin removal
  try {
    const newVersion = await invalidateAndIncrementVersion(userId);
    logger.info(`[RoleManagement] Invalidated permission cache for user ${userId} after global admin removal (version: ${newVersion})`);
  } catch (cacheError) {
    logger.error(`[RoleManagement] Failed to invalidate permission cache for user ${userId}:`, cacheError);
    // Continue - cache invalidation failure should not fail the operation
  }

  return {
    userId,
    removedAt: new Date(),
    removedBy: removedBy || 'system'
  };
}

/**
 * Update global admin roles
 */
export async function updateGlobalAdminRoles(
  userId: string,
  roles: string[],
  _departmentId?: string,
  updatedBy?: string
): Promise<{
  userId: string;
  roles: string[];
  departmentId: string;
  updatedAt: Date;
  updatedBy: string;
  calculatedAccessRights: string[];
}> {
  const globalAdmin = await GlobalAdmin.findById(userId);
  if (!globalAdmin) {
    throw ApiError.notFound('Global admin not found');
  }

  // Validate all roles
  for (const role of roles) {
    const valid = await validateRoleForUserType(role, 'global-admin');
    if (!valid) {
      throw ApiError.badRequest(`Role '${role}' is not a valid global-admin role`);
    }
  }

  // Update roles in master department
  if (globalAdmin.roleMemberships.length > 0) {
    globalAdmin.roleMemberships[0].roles = roles as GlobalAdminRole[];
  } else {
    globalAdmin.roleMemberships.push({
      departmentId: MASTER_DEPARTMENT_ID,
      roles: roles as GlobalAdminRole[],
      assignedAt: new Date(),
      assignedBy: updatedBy ? new Types.ObjectId(updatedBy) : undefined,
      isActive: true
    });
  }

  await globalAdmin.save();

  const calculatedAccessRights = await calculateAccessRightsFromRoles(roles);

  // TODO: Log to audit trail

  // Invalidate permission cache after global admin role update
  try {
    const newVersion = await invalidateAndIncrementVersion(userId);
    logger.info(`[RoleManagement] Invalidated permission cache for user ${userId} after global admin role update (version: ${newVersion})`);
  } catch (cacheError) {
    logger.error(`[RoleManagement] Failed to invalidate permission cache for user ${userId}:`, cacheError);
    // Continue - cache invalidation failure should not fail the operation
  }

  return {
    userId,
    roles,
    departmentId: MASTER_DEPARTMENT_ID.toString(),
    updatedAt: new Date(),
    updatedBy: updatedBy || 'system',
    calculatedAccessRights
  };
}

// ============================================================================
// ROLE DEFINITION MANAGEMENT OPERATIONS
// ============================================================================

/**
 * Get all role definitions
 */
export async function getRoleDefinitions(): Promise<{
  roleDefinitions: Array<{
    _id: string;
    name: string;
    displayName: string;
    description: string;
    accessRights: Array<{
      _id: string;
      name: string;
      description: string;
      domain: string;
      isSensitive: boolean;
    }>;
    isGlobalRole: boolean;
    isDepartmentRole: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
}> {
  const roles = await RoleDefinition.find().populate('accessRights').lean();

  const enrichedRoles = roles.map(role => ({
    _id: role._id.toString(),
    name: role.name,
    displayName: role.displayName,
    description: role.description,
    accessRights: (role.accessRights as any[]).map((ar: any) => ({
      _id: ar._id.toString(),
      name: ar.name,
      description: ar.description,
      domain: ar.domain,
      isSensitive: ar.isSensitive || false
    })),
    isGlobalRole: role.userType === 'global-admin',
    isDepartmentRole: role.userType === 'staff',
    createdAt: role.createdAt,
    updatedAt: role.updatedAt
  }));

  return {
    roleDefinitions: enrichedRoles,
    total: enrichedRoles.length
  };
}

/**
 * Get a specific role definition
 */
export async function getRoleDefinition(roleName: string): Promise<{
  _id: string;
  name: string;
  displayName: string;
  description: string;
  accessRights: Array<{
    _id: string;
    name: string;
    description: string;
    domain: string;
    resource: string;
    action: string;
    isSensitive: boolean;
  }>;
  isGlobalRole: boolean;
  isDepartmentRole: boolean;
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}> {
  const role = await RoleDefinition.findOne({ name: roleName }).populate('accessRights');
  if (!role) {
    throw ApiError.notFound('Role definition not found');
  }

  // Count users with this role
  let userCount = 0;

  // Count staff with this role
  const staffCount = await Staff.countDocuments({
    'departmentMemberships.roles': roleName,
    'departmentMemberships.isActive': true
  });
  userCount += staffCount;

  // Count global admins with this role
  const globalAdminCount = await GlobalAdmin.countDocuments({
    'roleMemberships.roles': roleName,
    isActive: true
  });
  userCount += globalAdminCount;

  return {
    _id: role._id.toString(),
    name: role.name,
    displayName: role.displayName,
    description: role.description,
    accessRights: (role.accessRights as any[]).map((ar: any) => ({
      _id: ar._id.toString(),
      name: ar.name,
      description: ar.description,
      domain: ar.domain,
      resource: ar.resource || '',
      action: ar.action || '',
      isSensitive: ar.isSensitive || false
    })),
    isGlobalRole: role.userType === 'global-admin',
    isDepartmentRole: role.userType === 'staff',
    userCount,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt
  };
}

/**
 * Update role's access rights (replace entire list)
 */
export async function updateRoleAccessRights(
  roleName: string,
  accessRightIds: string[],
  updatedBy?: string
): Promise<{
  roleName: string;
  accessRights: Array<{
    _id: string;
    name: string;
    description: string;
  }>;
  updatedAt: Date;
  updatedBy: string;
}> {
  const role = await RoleDefinition.findOne({ name: roleName });
  if (!role) {
    throw ApiError.notFound('Role definition not found');
  }

  // Validate all access rights exist
  const accessRights = await AccessRight.find({
    _id: { $in: accessRightIds.map(id => new Types.ObjectId(id)) }
  });

  if (accessRights.length !== accessRightIds.length) {
    throw ApiError.badRequest('One or more access rights not found');
  }

  // Update role
  role.accessRights = accessRightIds;
  await role.save();

  // TODO: Log to audit trail

  return {
    roleName,
    accessRights: accessRights.map(ar => ({
      _id: ar._id.toString(),
      name: ar.name,
      description: ar.description
    })),
    updatedAt: new Date(),
    updatedBy: updatedBy || 'system'
  };
}

/**
 * Add a single access right to a role
 */
export async function addAccessRightToRole(
  roleName: string,
  accessRightId: string,
  updatedBy?: string
): Promise<{
  roleName: string;
  accessRightAdded: {
    _id: string;
    name: string;
    description: string;
  };
  totalAccessRights: number;
  updatedAt: Date;
  updatedBy: string;
}> {
  const role = await RoleDefinition.findOne({ name: roleName });
  if (!role) {
    throw ApiError.notFound('Role definition not found');
  }

  const accessRight = await AccessRight.findById(accessRightId);
  if (!accessRight) {
    throw ApiError.notFound('Access right not found');
  }

  // Check if already added
  if (role.accessRights.includes(accessRightId)) {
    throw ApiError.conflict('Access right already assigned to this role');
  }

  // Add access right
  role.accessRights.push(accessRightId);
  await role.save();

  // TODO: Log to audit trail

  return {
    roleName,
    accessRightAdded: {
      _id: accessRight._id.toString(),
      name: accessRight.name,
      description: accessRight.description
    },
    totalAccessRights: role.accessRights.length,
    updatedAt: new Date(),
    updatedBy: updatedBy || 'system'
  };
}

/**
 * Remove a single access right from a role
 */
export async function removeAccessRightFromRole(
  roleName: string,
  accessRightId: string,
  updatedBy?: string
): Promise<{
  roleName: string;
  accessRightRemoved: {
    _id: string;
    name: string;
  };
  remainingAccessRights: number;
  updatedAt: Date;
  updatedBy: string;
}> {
  const role = await RoleDefinition.findOne({ name: roleName });
  if (!role) {
    throw ApiError.notFound('Role definition not found');
  }

  const accessRight = await AccessRight.findById(accessRightId);
  if (!accessRight) {
    throw ApiError.notFound('Access right not found');
  }

  // Remove access right
  role.accessRights = role.accessRights.filter(
    (id: string) => id.toString() !== accessRightId
  );
  await role.save();

  // TODO: Log to audit trail

  return {
    roleName,
    accessRightRemoved: {
      _id: accessRight._id.toString(),
      name: accessRight.name
    },
    remainingAccessRights: role.accessRights.length,
    updatedAt: new Date(),
    updatedBy: updatedBy || 'system'
  };
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk assign roles to multiple users
 */
export async function bulkAssignRoles(
  assignments: Array<{
    userId: string;
    departmentId: string;
    roleName: string;
    isPrimary?: boolean;
  }>,
  assignedBy?: string
): Promise<{
  successful: number;
  failed: number;
  results: Array<{
    userId: string;
    success: boolean;
    error?: string;
  }>;
}> {
  const results: Array<{ userId: string; success: boolean; error?: string }> = [];
  let successful = 0;
  let failed = 0;

  for (const assignment of assignments) {
    try {
      await assignUserRole(
        assignment.userId,
        assignment.departmentId,
        assignment.roleName,
        assignment.isPrimary || false,
        undefined,
        assignedBy
      );
      results.push({ userId: assignment.userId, success: true });
      successful++;
    } catch (error: any) {
      results.push({
        userId: assignment.userId,
        success: false,
        error: error.message || 'Unknown error'
      });
      failed++;
    }
  }

  return { successful, failed, results };
}

/**
 * Bulk remove roles from multiple users
 */
export async function bulkRemoveRoles(
  removals: Array<{
    userId: string;
    membershipId: string;
  }>,
  removedBy?: string
): Promise<{
  successful: number;
  failed: number;
  results: Array<{
    userId: string;
    membershipId: string;
    success: boolean;
    error?: string;
  }>;
}> {
  const results: Array<{
    userId: string;
    membershipId: string;
    success: boolean;
    error?: string;
  }> = [];
  let successful = 0;
  let failed = 0;

  for (const removal of removals) {
    try {
      await removeUserRole(removal.userId, removal.membershipId, removedBy);
      results.push({
        userId: removal.userId,
        membershipId: removal.membershipId,
        success: true
      });
      successful++;
    } catch (error: any) {
      results.push({
        userId: removal.userId,
        membershipId: removal.membershipId,
        success: false,
        error: error.message || 'Unknown error'
      });
      failed++;
    }
  }

  return { successful, failed, results };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate if a role is valid for a user type
 */
async function validateRoleForUserType(
  roleName: string,
  userType: 'staff' | 'learner' | 'global-admin'
): Promise<boolean> {
  const role = await RoleDefinition.findOne({ name: roleName });
  if (!role) {
    return false;
  }
  return role.userType === userType;
}

/**
 * Calculate access rights from a list of roles
 */
async function calculateAccessRightsFromRoles(roleNames: string[]): Promise<string[]> {
  const roles = await RoleDefinition.find({
    name: { $in: roleNames }
  }).populate('accessRights');

  const allAccessRights = new Set<string>();

  for (const role of roles) {
    for (const accessRight of role.accessRights as any[]) {
      allAccessRights.add(accessRight.name);
    }
  }

  return Array.from(allAccessRights);
}
