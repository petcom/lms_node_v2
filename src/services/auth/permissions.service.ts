import mongoose from 'mongoose';
import Role from '@/models/system/Role.model';
import Permission from '@/models/system/Permission.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import Department from '@/models/organization/Department.model';
import { ApiError } from '@/utils/ApiError';

/**
 * Built-in role definitions with their permission sets
 */
const BUILT_IN_ROLES = {
  'system-admin': {
    level: 100,
    description: 'Full system administrator with unrestricted access',
    permissions: [
      'users:read', 'users:write', 'users:delete', 'users:manage',
      'courses:read', 'courses:write', 'courses:delete', 'courses:manage',
      'content:read', 'content:write', 'content:delete', 'content:manage',
      'enrollments:read', 'enrollments:write', 'enrollments:delete', 'enrollments:manage',
      'assessments:read', 'assessments:write', 'assessments:delete', 'assessments:manage',
      'reports:read', 'reports:write', 'reports:manage',
      'settings:read', 'settings:write', 'settings:manage',
      'system:read', 'system:write', 'system:manage',
      'permissions:read', 'permissions:write', 'permissions:delete'
    ]
  },
  'financial-admin': {
    level: 95,
    description: 'Financial administrator with full revenue configuration access',
    permissions: [
      'users:read',
      'courses:read',
      'enrollments:read',
      'reports:read', 'reports:write', 'reports:manage',
      'revenue:read', 'revenue:write', 'revenue:manage',
      'payouts:read', 'payouts:write', 'payouts:manage',
      'settings:read', 'settings:write'
    ]
  },
  'department-admin': {
    level: 80,
    description: 'Department administrator with department-scoped permissions',
    permissions: [
      'users:read', 'users:write',
      'courses:read', 'courses:write', 'courses:manage',
      'content:read', 'content:write', 'content:manage',
      'enrollments:read', 'enrollments:write', 'enrollments:manage',
      'assessments:read', 'assessments:write',
      'grades:override',
      'reports:read', 'reports:write'
    ]
  },
  'content-admin': {
    level: 70,
    description: 'Content library administrator',
    permissions: [
      'content:read', 'content:write', 'content:delete', 'content:manage',
      'courses:read', 'courses:write',
      'reports:read'
    ]
  },
  'instructor': {
    level: 60,
    description: 'Course instructor with teaching and grading capabilities',
    permissions: [
      'users:read',
      'courses:read', 'courses:write',
      'content:read', 'content:write',
      'enrollments:read', 'enrollments:write',
      'assessments:read', 'assessments:write',
      'reports:read'
    ]
  },
  'billing-admin': {
    level: 50,
    description: 'Billing and payment administrator',
    permissions: [
      'users:read',
      'courses:read',
      'enrollments:read',
      'reports:read', 'reports:write',
      'revenue:read'
    ]
  },
  'enrollment-admin': {
    level: 55,
    description: 'Enrollment and registration administrator',
    permissions: [
      'users:read',
      'courses:read',
      'enrollments:read', 'enrollments:write', 'enrollments:manage',
      'reports:read'
    ]
  },
  'learner': {
    level: 10,
    description: 'Standard learner account',
    permissions: [
      'courses:read',
      'content:read',
      'enrollments:read',
      'assessments:read'
    ]
  }
};

interface ListPermissionsFilters {
  category?: string;
}

interface ListRolesFilters {
  includeBuiltIn?: boolean;
  includeCustom?: boolean;
  departmentId?: string;
}

interface CreateRoleInput {
  name: string;
  description: string;
  level?: number;
  permissions: string[];
  departmentId?: string;
  inheritsFrom?: string;
}

interface UpdateRoleInput {
  description?: string;
  level?: number;
  permissions?: string[];
  isActive?: boolean;
}

interface CheckPermissionInput {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  departmentId?: string;
  resourceId?: string;
}

export class PermissionsService {
  /**
   * List all available permissions
   * GET /api/v2/permissions
   */
  static async listPermissions(filters: ListPermissionsFilters): Promise<any> {
    const query: any = { isActive: true };

    // Filter by category if provided
    if (filters.category) {
      query.group = filters.category;
    }

    // Get all permissions
    const permissions = await Permission.find(query).sort({ group: 1, resource: 1, action: 1 });

    // Format permissions with consistent structure
    const formattedPermissions = permissions.map((perm) => ({
      id: perm._id.toString(),
      name: perm.name,
      description: perm.description || '',
      category: perm.group || 'system',
      level: perm.action,
      key: `${perm.resource}:${perm.action}`,
      isSystemPermission: perm.isSystemPermission
    }));

    // Group permissions by category
    const categorized: any = {
      users: [],
      courses: [],
      content: [],
      enrollments: [],
      assessments: [],
      reports: [],
      settings: [],
      system: []
    };

    formattedPermissions.forEach((perm) => {
      const category = perm.category;
      if (categorized[category]) {
        categorized[category].push(perm);
      } else {
        categorized[category] = [perm];
      }
    });

    return {
      permissions: formattedPermissions,
      categorized
    };
  }

  /**
   * List all roles with their permissions
   * GET /api/v2/permissions/roles
   */
  static async listRoles(filters: ListRolesFilters): Promise<any> {
    const includeBuiltIn = filters.includeBuiltIn !== false;
    const includeCustom = filters.includeCustom !== false;

    const query: any = {};
    const types: string[] = [];

    if (includeBuiltIn) types.push('built-in');
    if (includeCustom) types.push('custom');

    if (types.length > 0) {
      query.type = { $in: types };
    }

    // Filter by department if provided
    if (filters.departmentId) {
      query.$or = [
        { departmentId: filters.departmentId },
        { departmentId: null } // Include global roles
      ];
    }

    // Get all roles matching filters
    const roles = await Role.find(query).sort({ level: -1, name: 1 });

    // Get user count for each role
    const rolesData = await Promise.all(
      roles.map(async (role) => {
        // Count users with this role
        const userCount = await User.countDocuments({
          roles: role.name,
          isActive: true
        });

        return {
          id: role._id.toString(),
          name: role.name,
          description: role.description,
          type: role.type,
          level: role.level,
          permissions: role.permissions,
          departmentId: role.departmentId?.toString() || null,
          inheritsFrom: role.inheritsFrom?.toString() || null,
          isActive: role.isActive,
          userCount,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt
        };
      })
    );

    return {
      roles: rolesData
    };
  }

  /**
   * Get role details with full permission information
   * GET /api/v2/permissions/roles/:roleId
   */
  static async getRoleDetails(roleId: string, includeUsers: boolean = false): Promise<any> {
    // Handle built-in role names
    let role;
    if (mongoose.Types.ObjectId.isValid(roleId)) {
      role = await Role.findById(roleId);
    } else {
      // Try to find by name (for built-in roles)
      role = await Role.findOne({ name: roleId });
    }

    if (!role) {
      throw ApiError.notFound('Role not found');
    }

    // Get department info if role is department-scoped
    let department = null;
    if (role.departmentId) {
      const dept = await Department.findById(role.departmentId);
      if (dept) {
        department = {
          id: dept._id.toString(),
          name: dept.name
        };
      }
    }

    // Get parent role info if role inherits
    let parentRole = null;
    let inheritedPermissions: string[] = [];
    if (role.inheritsFrom) {
      const parent = await Role.findById(role.inheritsFrom);
      if (parent) {
        parentRole = {
          id: parent._id.toString(),
          name: parent.name
        };
        inheritedPermissions = parent.permissions;
      }
    }

    // Calculate effective permissions (own + inherited)
    const ownPermissions = role.permissions;
    const effectivePermissions = [...new Set([...ownPermissions, ...inheritedPermissions])];

    // Get detailed permission information
    const permissionDetails = await Promise.all(
      effectivePermissions.map(async (permKey) => {
        const [resource, action] = permKey.split(':');
        const perm = await Permission.findOne({ resource, action });

        return {
          id: perm?._id.toString() || permKey,
          key: permKey,
          name: perm?.name || permKey,
          description: perm?.description || '',
          category: perm?.group || resource,
          level: action,
          inherited: !ownPermissions.includes(permKey)
        };
      })
    );

    // Get user count
    const userCount = await User.countDocuments({
      roles: role.name,
      isActive: true
    });

    // Get users if requested
    let users: any[] = [];
    if (includeUsers) {
      const usersWithRole = await User.find({
        roles: role.name,
        isActive: true
      }).limit(100);

      users = await Promise.all(
        usersWithRole.map(async (user) => {
          const staff = await Staff.findById(user._id);
          return {
            id: user._id.toString(),
            email: user.email,
            firstName: staff?.firstName || '',
            lastName: staff?.lastName || '',
            assignedAt: user.createdAt // Placeholder, would need UserRole junction table for accurate date
          };
        })
      );
    }

    return {
      role: {
        id: role._id.toString(),
        name: role.name,
        description: role.description,
        type: role.type,
        level: role.level,
        permissions: permissionDetails,
        departmentId: role.departmentId?.toString() || null,
        department,
        inheritsFrom: role.inheritsFrom?.toString() || null,
        parentRole,
        inheritedPermissions,
        ownPermissions,
        effectivePermissions,
        isActive: role.isActive,
        canDelete: role.type === 'custom',
        canEdit: role.type === 'custom',
        userCount,
        users,
        createdBy: role.createdBy?.toString() || null,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt
      }
    };
  }

  /**
   * Create a new custom role
   * POST /api/v2/permissions/roles
   */
  static async createRole(roleData: CreateRoleInput, createdBy?: string): Promise<any> {
    // Validate role name pattern
    const namePattern = /^[a-z0-9-]+$/;
    if (!namePattern.test(roleData.name)) {
      throw ApiError.badRequest('Role name must be lowercase with hyphens only');
    }

    // Validate level is in custom range (11-99)
    const level = roleData.level || 50;
    if (level < 11 || level > 99) {
      throw ApiError.badRequest('Custom role level must be between 11 and 99');
    }

    // Check if role name already exists in the scope
    const existingRole = await Role.findOne({
      name: roleData.name,
      departmentId: roleData.departmentId || null
    });

    if (existingRole) {
      throw ApiError.conflict('Role with this name already exists in this scope');
    }

    // Validate department if provided
    if (roleData.departmentId) {
      const department = await Department.findById(roleData.departmentId);
      if (!department) {
        throw ApiError.notFound('Department does not exist');
      }
    }

    // Validate parent role if provided
    if (roleData.inheritsFrom) {
      const parentRole = await Role.findById(roleData.inheritsFrom);
      if (!parentRole) {
        throw ApiError.notFound('Parent role does not exist');
      }
    }

    // Validate all permissions exist
    const permissionKeys = roleData.permissions;
    for (const key of permissionKeys) {
      const [resource, action] = key.split(':');
      const perm = await Permission.findOne({ resource, action });
      if (!perm) {
        throw ApiError.badRequest(`Invalid permission: ${key}`);
      }
    }

    // Create role
    const role = new Role({
      name: roleData.name,
      description: roleData.description,
      type: 'custom',
      level,
      permissions: permissionKeys,
      departmentId: roleData.departmentId || null,
      inheritsFrom: roleData.inheritsFrom || null,
      isActive: true,
      createdBy: createdBy || null
    });

    await role.save();

    return {
      role: {
        id: role._id.toString(),
        name: role.name,
        description: role.description,
        type: role.type,
        level: role.level,
        permissions: role.permissions,
        departmentId: role.departmentId?.toString() || null,
        inheritsFrom: role.inheritsFrom?.toString() || null,
        isActive: role.isActive,
        createdBy: role.createdBy?.toString() || null,
        createdAt: role.createdAt
      }
    };
  }

  /**
   * Update a custom role
   * PUT /api/v2/permissions/roles/:roleId
   */
  static async updateRole(roleId: string, updateData: UpdateRoleInput, updatedBy?: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      throw ApiError.badRequest('Invalid role ID');
    }

    const role = await Role.findById(roleId);
    if (!role) {
      throw ApiError.notFound('Role not found');
    }

    // Cannot modify built-in roles
    if (role.type === 'built-in') {
      throw ApiError.forbidden('Cannot modify built-in roles');
    }

    // Update description if provided
    if (updateData.description !== undefined) {
      role.description = updateData.description;
    }

    // Update level if provided
    if (updateData.level !== undefined) {
      if (updateData.level < 11 || updateData.level > 99) {
        throw ApiError.badRequest('Custom role level must be between 11 and 99');
      }
      role.level = updateData.level;
    }

    // Update permissions if provided
    if (updateData.permissions !== undefined) {
      // Validate all permissions exist
      for (const key of updateData.permissions) {
        const [resource, action] = key.split(':');
        const perm = await Permission.findOne({ resource, action });
        if (!perm) {
          throw ApiError.badRequest(`Invalid permission: ${key}`);
        }
      }
      role.permissions = updateData.permissions;
    }

    // Update isActive if provided
    if (updateData.isActive !== undefined) {
      role.isActive = updateData.isActive;
    }

    // Set updatedBy
    role.updatedBy = updatedBy ? new mongoose.Types.ObjectId(updatedBy) : undefined;

    await role.save();

    // Count affected users
    const affectedUsers = await User.countDocuments({
      roles: role.name,
      isActive: true
    });

    return {
      role: {
        id: role._id.toString(),
        name: role.name,
        description: role.description,
        type: role.type,
        level: role.level,
        permissions: role.permissions,
        departmentId: role.departmentId?.toString() || null,
        inheritsFrom: role.inheritsFrom?.toString() || null,
        isActive: role.isActive,
        updatedBy: role.updatedBy?.toString() || null,
        updatedAt: role.updatedAt
      },
      affectedUsers
    };
  }

  /**
   * Delete a custom role
   * DELETE /api/v2/permissions/roles/:roleId
   */
  static async deleteRole(roleId: string, reassignTo?: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      throw ApiError.badRequest('Invalid role ID');
    }

    const role = await Role.findById(roleId);
    if (!role) {
      throw ApiError.notFound('Role not found');
    }

    // Cannot delete built-in roles
    if (role.type === 'built-in') {
      throw ApiError.forbidden('Cannot delete built-in roles');
    }

    // Check if role has users
    const userCount = await User.countDocuments({
      roles: role.name,
      isActive: true
    });

    if (userCount > 0 && !reassignTo) {
      throw ApiError.badRequest('Cannot delete role with active users. Specify reassignTo role.');
    }

    // Validate reassignTo role if provided
    let reassignToRole = null;
    if (reassignTo) {
      if (!mongoose.Types.ObjectId.isValid(reassignTo)) {
        throw ApiError.badRequest('Invalid reassignTo role ID');
      }
      reassignToRole = await Role.findById(reassignTo);
      if (!reassignToRole) {
        throw ApiError.notFound('Reassign target role not found');
      }
    }

    // Reassign users if needed
    if (userCount > 0 && reassignToRole) {
      await User.updateMany(
        { roles: role.name },
        {
          $pull: { roles: role.name },
          $addToSet: { roles: reassignToRole.name }
        }
      );
    }

    // Delete the role
    await Role.deleteOne({ _id: roleId });

    return {
      deletedRole: {
        id: role._id.toString(),
        name: role.name
      },
      affectedUsers: userCount,
      reassignedTo: reassignToRole ? {
        id: reassignToRole._id.toString(),
        name: reassignToRole.name
      } : null
    };
  }

  /**
   * Get user's effective permissions
   * GET /api/v2/permissions/user/:userId
   */
  static async getUserPermissions(userId: string, _departmentId?: string): Promise<any> {
    // Handle "me" keyword
    let actualUserId = userId;
    if (userId === 'me') {
      // Would be replaced by actual authenticated user ID from middleware
      throw ApiError.badRequest('User ID "me" requires authentication context');
    }

    if (!mongoose.Types.ObjectId.isValid(actualUserId)) {
      throw ApiError.badRequest('Invalid user ID');
    }

    const user = await User.findById(actualUserId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Get all roles for the user
    const roles = await Role.find({
      name: { $in: user.roles }
    });

    // Calculate effective permissions from all roles
    const allPermissions = new Set<string>();
    const permissionsByRole: any[] = [];
    const roleDetails: any[] = [];

    for (const role of roles) {
      // Add role details
      roleDetails.push({
        id: role._id.toString(),
        name: role.name,
        type: role.type,
        departmentId: role.departmentId?.toString() || null
      });

      // Get inherited permissions if role has parent
      let rolePermissions = [...role.permissions];
      if (role.inheritsFrom) {
        const parentRole = await Role.findById(role.inheritsFrom);
        if (parentRole) {
          rolePermissions = [...rolePermissions, ...parentRole.permissions];
        }
      }

      // Add to overall permissions
      rolePermissions.forEach(p => allPermissions.add(p));

      // Track by role
      permissionsByRole.push({
        roleId: role._id.toString(),
        roleName: role.name,
        permissions: rolePermissions
      });
    }

    // Categorize permissions
    const byCategory: any = {
      users: [],
      courses: [],
      content: [],
      enrollments: [],
      assessments: [],
      reports: [],
      settings: [],
      system: []
    };

    Array.from(allPermissions).forEach((perm) => {
      const [category] = perm.split(':');
      if (byCategory[category]) {
        byCategory[category].push(perm);
      }
    });

    // Get department-scoped permissions
    const departments: any[] = [];
    const departmentRoles = roles.filter(r => r.departmentId);
    for (const role of departmentRoles) {
      if (role.departmentId) {
        const dept = await Department.findById(role.departmentId);
        if (dept) {
          departments.push({
            id: dept._id.toString(),
            name: dept.name,
            permissions: role.permissions
          });
        }
      }
    }

    // Calculate effective level (highest role level)
    const effectiveLevel = roles.length > 0 ? Math.max(...roles.map(r => r.level)) : 0;
    const isAdmin = effectiveLevel >= 50;
    const isSuperAdmin = effectiveLevel >= 100;

    return {
      userId: user._id.toString(),
      roles: roleDetails,
      permissions: {
        all: Array.from(allPermissions),
        byCategory,
        byRole: permissionsByRole
      },
      departments,
      effectiveLevel,
      isAdmin,
      isSuperAdmin
    };
  }

  /**
   * Check if user has specific permission(s)
   * POST /api/v2/permissions/check
   */
  static async checkPermission(userId: string, checkData: CheckPermissionInput): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw ApiError.badRequest('Invalid user ID');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Determine which permissions to check
    let permissionsToCheck: string[] = [];
    if (checkData.permission) {
      permissionsToCheck = [checkData.permission];
    } else if (checkData.permissions) {
      permissionsToCheck = checkData.permissions;
    } else {
      throw ApiError.badRequest('Must provide permission or permissions array');
    }

    // Get user's effective permissions
    const userPerms = await this.getUserPermissions(userId, checkData.departmentId);
    const userPermissions = new Set(userPerms.permissions.all);

    // Check each permission
    const grantedPermissions: string[] = [];
    const deniedPermissions: string[] = [];

    for (const perm of permissionsToCheck) {
      if (userPermissions.has(perm)) {
        grantedPermissions.push(perm);
      } else {
        deniedPermissions.push(perm);
      }
    }

    // Determine if user has permission
    const requireAll = checkData.requireAll || false;
    let hasPermission: boolean;
    let reason: string | null = null;

    if (requireAll) {
      hasPermission = deniedPermissions.length === 0;
      if (!hasPermission) {
        reason = `Missing required permissions: ${deniedPermissions.join(', ')}`;
      }
    } else {
      hasPermission = grantedPermissions.length > 0;
      if (!hasPermission) {
        reason = `User does not have any of the required permissions`;
      }
    }

    return {
      hasPermission,
      checkedPermissions: permissionsToCheck,
      grantedPermissions,
      deniedPermissions,
      reason,
      context: {
        userId: user._id.toString(),
        departmentId: checkData.departmentId || null,
        resourceId: checkData.resourceId || null,
        userLevel: userPerms.effectiveLevel
      }
    };
  }

  /**
   * Initialize built-in roles
   * Helper method to seed the database with built-in roles
   */
  static async initializeBuiltInRoles(): Promise<void> {
    for (const [name, config] of Object.entries(BUILT_IN_ROLES)) {
      const existing = await Role.findOne({ name, type: 'built-in' });
      if (!existing) {
        const role = new Role({
          name,
          description: config.description,
          type: 'built-in',
          level: config.level,
          permissions: config.permissions,
          isActive: true
        });
        await role.save();
      }
    }
  }
}
