import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import Department from '@/models/organization/Department.model';
import { ApiError } from '@/utils/ApiError';
import { getDepartmentAndSubdepartments, isTopLevelDepartmentMember } from '@/utils/departmentHierarchy';
import { invalidateAndIncrementVersion } from '@/utils/permission-cache';
import { logger } from '@/config/logger';

interface DepartmentAssignment {
  departmentId: string;
  role: 'instructor' | 'content-admin' | 'dept-admin';
}

interface RegisterStaffInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  departmentAssignments: DepartmentAssignment[];
  defaultDashboard?: 'content-admin' | 'instructor' | 'analytics';
  isActive?: boolean;
}

interface UpdateStaffInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  defaultDashboard?: 'content-admin' | 'instructor' | 'analytics';
  isActive?: boolean;
  profileImage?: string | null;
}

interface ListStaffFilters {
  page?: number;
  limit?: number;
  department?: string;
  role?: 'staff' | 'instructor' | 'content-admin' | 'dept-admin';
  status?: 'active' | 'inactive' | 'withdrawn';
  search?: string;
  sort?: string;
}

interface ListStaffOptions {
  hasGlobalAccess?: boolean;
}

interface UpdateDepartmentsInput {
  action: 'add' | 'remove' | 'update' | 'replace';
  departmentAssignments: DepartmentAssignment[];
}

export class StaffService {
  /**
   * List staff users with department-scoped access
   */
  static async listStaff(
    filters: ListStaffFilters,
    requesterId: string,
    options: ListStaffOptions = {}
  ): Promise<any> {
    const requester = await User.findById(requesterId);
    if (!requester) {
      throw ApiError.notFound('Requester not found');
    }

    const isGlobalAdmin = options.hasGlobalAccess === true;

    // Build department scope with hierarchical access
    let allowedDepartmentIds: string[] = [];
    if (!isGlobalAdmin) {
      const requesterStaff = await Staff.findById(requesterId);
      if (!requesterStaff) {
        throw ApiError.forbidden('Staff record not found');
      }

      // Get user's department memberships
      const userDepartmentIds = requesterStaff.departmentMemberships.map((dm) => dm.departmentId);

      // For each department, check if it's top-level and include subdepartments
      for (const deptId of userDepartmentIds) {
        const isTopLevel = await isTopLevelDepartmentMember(requesterId, deptId);

        if (isTopLevel) {
          // Top-level department member sees all subdepartments
          const allDeptIds = await getDepartmentAndSubdepartments(deptId);
          allowedDepartmentIds.push(...allDeptIds);
        } else {
          // Subdepartment member sees only their own department
          allowedDepartmentIds.push(deptId.toString());
        }
      }

      // Remove duplicates
      allowedDepartmentIds = [...new Set(allowedDepartmentIds)];

      if (allowedDepartmentIds.length === 0) {
        throw ApiError.forbidden('No departments under management');
      }
    }

    // Parse pagination
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 10));
    const skip = (page - 1) * limit;

    // Build user query - filter by userTypes containing 'staff'
    const userQuery: any = {
      userTypes: 'staff'
    };

    // Filter by status
    if (filters.status) {
      if (filters.status === 'active') {
        userQuery.isActive = true;
      } else if (filters.status === 'inactive') {
        userQuery.isActive = false;
      }
      // withdrawn handled by marking isActive as false
    }

    // Get users matching base criteria
    const users = await User.find(userQuery);
    const userIds = users.map((u) => u._id);

    // Build staff query - filter by role if specified
    const staffQuery: any = {
      _id: { $in: userIds },
      isActive: true
    };

    // Filter by specific role if provided
    if (filters.role && filters.role !== 'staff') {
      staffQuery['departmentMemberships.roles'] = filters.role;
    }

    // Apply department scoping
    if (filters.department) {
      staffQuery['departmentMemberships.departmentId'] = new mongoose.Types.ObjectId(filters.department);
    } else if (!isGlobalAdmin) {
      // Convert string IDs back to ObjectIds for query
      const allowedDeptObjectIds = allowedDepartmentIds.map(id => new mongoose.Types.ObjectId(id));
      staffQuery['departmentMemberships.departmentId'] = { $in: allowedDeptObjectIds };
    }

    // Apply search filter
    if (filters.search && filters.search.length >= 2) {
      const searchRegex = new RegExp(filters.search, 'i');
      staffQuery.$or = [
        { 'person.firstName': searchRegex },
        { 'person.lastName': searchRegex }
      ];

      // Also search by email in User
      const emailUsers = await User.find({ email: searchRegex, _id: { $in: userIds } });
      const emailUserIds = emailUsers.map((u) => u._id);
      if (emailUserIds.length > 0) {
        if (staffQuery.$or) {
          staffQuery._id = { $in: [...(Array.isArray(staffQuery._id.$in) ? staffQuery._id.$in : []), ...emailUserIds] };
        } else {
          staffQuery._id = { $in: emailUserIds };
        }
      }
    }

    // Get total count
    const total = await Staff.countDocuments(staffQuery);

    // Apply sorting - map simple field names to nested person fields
    const sortField = filters.sort || 'lastName';
    const sortOrder = sortField.startsWith('-') ? -1 : 1;
    let sortKey = sortField.startsWith('-') ? sortField.substring(1) : sortField;
    
    // Map common sort fields to nested person fields
    if (sortKey === 'lastName') sortKey = 'person.lastName';
    if (sortKey === 'firstName') sortKey = 'person.firstName';

    // Get paginated staff
    const staffList = await Staff.find(staffQuery)
      .sort({ [sortKey]: sortOrder })
      .skip(skip)
      .limit(limit);

    // Build response
    const staffData = await Promise.all(
      staffList.map(async (staff) => {
        const user = await User.findById(staff._id);
        if (!user) return null;

        // Get department details
        const departments = await Promise.all(
          staff.departmentMemberships.map(async (dm) => {
            const dept = await Department.findById(dm.departmentId);
            return {
              departmentId: dm.departmentId.toString(),
              departmentName: dept?.name || 'Unknown',
              rolesInDepartment: dm.roles
            };
          })
        );

        // Calculate permissions
        const permissions = this.calculatePermissions(staff.departmentMemberships);

        return {
          id: staff._id.toString(),
          email: user.email,
          firstName: staff.person.firstName,
          lastName: staff.person.lastName,
          role: 'staff',
          departments,
          permissions,
          isActive: user.isActive,
          status: user.isActive ? 'active' : 'inactive',
          lastLogin: null, // Not tracked yet
          createdAt: staff.createdAt
        };
      })
    );

    // Filter out nulls
    const filteredStaff = staffData.filter((s) => s !== null);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);

    return {
      staff: filteredStaff,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Register a new staff user
   */
  static async registerStaff(staffData: RegisterStaffInput, requesterId: string): Promise<any> {
    const requester = await User.findById(requesterId);
    if (!requester) {
      throw ApiError.notFound('Requester not found');
    }

    // Check permissions
    const isGlobalAdmin = requester.userTypes.includes('global-admin');
    const requesterStaffForCheck = await Staff.findById(requesterId);
    const isDeptAdmin = requesterStaffForCheck?.departmentMemberships.some(
      (dm) => dm.roles.includes('dept-admin')
    ) ?? false;

    if (!isGlobalAdmin && !isDeptAdmin) {
      throw ApiError.forbidden('Insufficient permissions to create staff');
    }

    // Validate department assignments
    if (!staffData.departmentAssignments || staffData.departmentAssignments.length === 0) {
      throw ApiError.badRequest('At least one department assignment is required');
    }

    // Verify departments exist
    const departmentIds = staffData.departmentAssignments.map((da) => new mongoose.Types.ObjectId(da.departmentId));
    const existingDepartments = await Department.find({ _id: { $in: departmentIds } });

    if (existingDepartments.length !== departmentIds.length) {
      throw ApiError.notFound('One or more departments not found');
    }

    // Check if dept-admin can assign to these departments
    if (!isGlobalAdmin) {
      const requesterStaff = await Staff.findById(requesterId);
      if (!requesterStaff) {
        throw ApiError.forbidden('Staff record not found');
      }

      const managedDeptIds = requesterStaff.departmentMemberships
        .filter((dm) => dm.roles.includes('department-admin'))
        .map((dm) => dm.departmentId.toString());

      for (const deptId of departmentIds) {
        if (!managedDeptIds.includes(deptId.toString())) {
          throw ApiError.forbidden('Cannot assign to departments you do not manage');
        }
      }
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: staffData.email.toLowerCase() });
    if (existingUser) {
      throw ApiError.conflict('Email already registered');
    }

    // Validate password
    if (!this.validatePassword(staffData.password)) {
      throw ApiError.badRequest(
        'Password must be at least 8 characters and contain uppercase, lowercase, and number'
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(staffData.password, 10);

    // Create User document
    const user = new User({
      email: staffData.email.toLowerCase(),
      password: hashedPassword,
      roles: ['staff'],
      isActive: staffData.isActive !== undefined ? staffData.isActive : true
    });

    await user.save();

    // Create Staff document
    const departmentMemberships = staffData.departmentAssignments.map((da) => ({
      departmentId: new mongoose.Types.ObjectId(da.departmentId),
      roles: [da.role],
      isPrimary: false,
      joinedAt: new Date(),
      isActive: true
    }));

    // Set first as primary
    if (departmentMemberships.length > 0) {
      departmentMemberships[0].isPrimary = true;
    }

    const staff = new Staff({
      _id: user._id,
      firstName: staffData.firstName,
      lastName: staffData.lastName,
      departmentMemberships,
      isActive: staffData.isActive !== undefined ? staffData.isActive : true
    });

    await staff.save();

    // Build response
    const departments = await Promise.all(
      departmentMemberships.map(async (dm) => {
        const dept = await Department.findById(dm.departmentId);
        return {
          departmentId: dm.departmentId.toString(),
          departmentName: dept?.name || 'Unknown',
          rolesInDepartment: dm.roles
        };
      })
    );

    const permissions = this.calculatePermissions(departmentMemberships);

    return {
      id: user._id.toString(),
      email: user.email,
      firstName: staff.person.firstName,
      lastName: staff.person.lastName,
      role: 'staff',
      departments,
      permissions,
      defaultDashboard: staffData.defaultDashboard || 'content-admin',
      isActive: user.isActive,
      status: user.isActive ? 'active' : 'inactive',
      createdAt: staff.createdAt
    };
  }

  /**
   * Get staff user by ID (department-scoped)
   */
  static async getStaffById(staffId: string, requesterId: string): Promise<any> {
    const requester = await User.findById(requesterId);
    if (!requester) {
      throw ApiError.notFound('Requester not found');
    }

    // Check permissions
    const isGlobalAdmin = requester.userTypes.includes('global-admin');
    const requesterStaffForCheck = await Staff.findById(requesterId);
    const isDeptAdmin = requesterStaffForCheck?.departmentMemberships.some(
      (dm) => dm.roles.includes('dept-admin')
    ) ?? false;
    const isStaff = requesterStaffForCheck?.departmentMemberships.some(
      (dm) => dm.roles.some((r: string) => ['instructor', 'content-admin'].includes(r))
    ) ?? false;

    if (!isGlobalAdmin && !isDeptAdmin && !isStaff) {
      throw ApiError.forbidden('Insufficient permissions to view staff');
    }

    // Get staff user
    const staff = await Staff.findById(staffId);
    if (!staff) {
      throw ApiError.notFound('Staff user not found');
    }

    const user = await User.findById(staffId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Check department scoping
    if (!isGlobalAdmin) {
      const requesterStaff = await Staff.findById(requesterId);
      if (!requesterStaff) {
        throw ApiError.forbidden('Insufficient permissions');
      }

      const requesterDeptIds = requesterStaff.departmentMemberships.map((dm) => dm.departmentId.toString());
      const staffDeptIds = staff.departmentMemberships.map((dm) => dm.departmentId.toString());

      const hasCommonDept = staffDeptIds.some((deptId) => requesterDeptIds.includes(deptId));
      if (!hasCommonDept) {
        throw ApiError.notFound('Staff user not found');
      }
    }

    // Get department details
    const departments = await Promise.all(
      staff.departmentMemberships.map(async (dm) => {
        const dept = await Department.findById(dm.departmentId);
        return {
          departmentId: dm.departmentId.toString(),
          departmentName: dept?.name || 'Unknown',
          rolesInDepartment: dm.roles
        };
      })
    );

    const permissions = this.calculatePermissions(staff.departmentMemberships);

    // Calculate metadata (placeholder values)
    const metadata = {
      coursesCreated: 0,
      coursesManaged: 0,
      contentCreated: 0,
      lastActivityAt: null
    };

    return {
      id: staff._id.toString(),
      email: user.email,
      firstName: staff.person.firstName,
      lastName: staff.person.lastName,
      role: 'staff',
      departments,
      permissions,
      defaultDashboard: 'content-admin',
      isActive: user.isActive,
      status: user.isActive ? 'active' : 'inactive',
      profileImage: null,
      lastLogin: null,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
      metadata
    };
  }

  /**
   * Update staff user
   */
  static async updateStaff(staffId: string, updateData: UpdateStaffInput, requesterId: string): Promise<any> {
    const requester = await User.findById(requesterId);
    if (!requester) {
      throw ApiError.notFound('Requester not found');
    }

    // Check permissions
    const isGlobalAdmin = requester.userTypes.includes('global-admin');
    const requesterStaffForCheck = await Staff.findById(requesterId);
    const isDeptAdmin = requesterStaffForCheck?.departmentMemberships.some(
      (dm) => dm.roles.includes('dept-admin')
    ) ?? false;

    if (!isGlobalAdmin && !isDeptAdmin) {
      throw ApiError.forbidden('Insufficient permissions to update staff');
    }

    // Get staff user
    const staff = await Staff.findById(staffId);
    if (!staff) {
      throw ApiError.notFound('Staff user not found');
    }

    const user = await User.findById(staffId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Check department scoping for dept-admin
    if (!isGlobalAdmin) {
      const requesterStaff = requesterStaffForCheck;
      if (!requesterStaff) {
        throw ApiError.forbidden('Insufficient permissions');
      }

      const managedDeptIds = requesterStaff.departmentMemberships
        .filter((dm) => dm.roles.includes('department-admin'))
        .map((dm) => dm.departmentId.toString());

      const staffDeptIds = staff.departmentMemberships.map((dm) => dm.departmentId.toString());

      const hasCommonDept = staffDeptIds.some((deptId) => managedDeptIds.includes(deptId));
      if (!hasCommonDept) {
        throw ApiError.forbidden('Cannot update staff outside your managed departments');
      }

      // Dept-admin cannot change isActive
      if (updateData.isActive !== undefined) {
        throw ApiError.forbidden('Only global admins can change isActive status');
      }
    }

    // Check email uniqueness
    if (updateData.email) {
      const existingUser = await User.findOne({
        email: updateData.email.toLowerCase(),
        _id: { $ne: staffId }
      });
      if (existingUser) {
        throw ApiError.conflict('Email already in use by another user');
      }
      user.email = updateData.email.toLowerCase();
    }

    // Update user fields
    if (updateData.isActive !== undefined) {
      user.isActive = updateData.isActive;
    }

    // Update staff fields
    if (updateData.firstName) {
      staff.person.firstName = updateData.firstName;
    }
    if (updateData.lastName) {
      staff.person.lastName = updateData.lastName;
    }

    await user.save();
    await staff.save();

    // Build response
    const departments = await Promise.all(
      staff.departmentMemberships.map(async (dm) => {
        const dept = await Department.findById(dm.departmentId);
        return {
          departmentId: dm.departmentId.toString(),
          departmentName: dept?.name || 'Unknown',
          rolesInDepartment: dm.roles
        };
      })
    );

    const permissions = this.calculatePermissions(staff.departmentMemberships);

    return {
      id: staff._id.toString(),
      email: user.email,
      firstName: staff.person.firstName,
      lastName: staff.person.lastName,
      role: 'staff',
      departments,
      permissions,
      defaultDashboard: updateData.defaultDashboard || 'content-admin',
      isActive: user.isActive,
      status: user.isActive ? 'active' : 'inactive',
      profileImage: updateData.profileImage !== undefined ? updateData.profileImage : null,
      updatedAt: staff.updatedAt
    };
  }

  /**
   * Soft delete staff user
   */
  static async deleteStaff(staffId: string, requesterId: string, _reason?: string): Promise<any> {
    const requester = await User.findById(requesterId);
    if (!requester) {
      throw ApiError.notFound('Requester not found');
    }

    // Check permissions
    const isGlobalAdmin = requester.userTypes.includes('global-admin');
    const requesterStaffForCheck = await Staff.findById(requesterId);
    const isDeptAdmin = requesterStaffForCheck?.departmentMemberships.some(
      (dm) => dm.roles.includes('dept-admin')
    ) ?? false;

    if (!isGlobalAdmin && !isDeptAdmin) {
      throw ApiError.forbidden('Insufficient permissions to delete staff');
    }

    // Get staff user
    const staff = await Staff.findById(staffId);
    if (!staff) {
      throw ApiError.notFound('Staff user not found');
    }

    const user = await User.findById(staffId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Check department scoping for dept-admin
    if (!isGlobalAdmin) {
      const requesterStaff = requesterStaffForCheck;
      if (!requesterStaff) {
        throw ApiError.forbidden('Insufficient permissions');
      }

      const managedDeptIds = requesterStaff.departmentMemberships
        .filter((dm) => dm.roles.includes('department-admin'))
        .map((dm) => dm.departmentId.toString());

      const staffDeptIds = staff.departmentMemberships.map((dm) => dm.departmentId.toString());

      const hasCommonDept = staffDeptIds.some((deptId) => managedDeptIds.includes(deptId));
      if (!hasCommonDept) {
        throw ApiError.forbidden('Cannot delete staff outside your managed departments');
      }
    }

    // Check if staff is last dept-admin in any department
    for (const membership of staff.departmentMemberships) {
      if (membership.roles.includes('department-admin')) {
        const otherAdmins = await Staff.countDocuments({
          _id: { $ne: staffId },
          'departmentMemberships.departmentId': membership.departmentId,
          'departmentMemberships.roles': 'department-admin',
          isActive: true
        });

        if (otherAdmins === 0) {
          const dept = await Department.findById(membership.departmentId);
          throw ApiError.conflict(
            `Cannot delete the last dept-admin from department: ${dept?.name || 'Unknown'}`
          );
        }
      }
    }

    // Soft delete: Set status to withdrawn
    user.isActive = false;
    staff.isActive = false;

    await user.save();
    await staff.save();

    // Invalidate permission cache after staff deletion/deactivation
    try {
      const newVersion = await invalidateAndIncrementVersion(staffId);
      logger.info(`[StaffService] Invalidated permission cache for user ${staffId} after deletion (version: ${newVersion})`);
    } catch (cacheError) {
      logger.error(`[StaffService] Failed to invalidate permission cache for user ${staffId}:`, cacheError);
      // Continue - cache invalidation failure should not fail the operation
    }

    return {
      id: staff._id.toString(),
      status: 'withdrawn',
      deletedAt: new Date()
    };
  }

  /**
   * Update staff department assignments
   */
  static async updateStaffDepartments(
    staffId: string,
    updateData: UpdateDepartmentsInput,
    requesterId: string
  ): Promise<any> {
    const requester = await User.findById(requesterId);
    if (!requester) {
      throw ApiError.notFound('Requester not found');
    }

    // Check permissions
    const isGlobalAdmin = requester.userTypes.includes('global-admin');
    const requesterStaffForCheck = await Staff.findById(requesterId);
    const isDeptAdmin = requesterStaffForCheck?.departmentMemberships.some(
      (dm) => dm.roles.includes('dept-admin')
    ) ?? false;

    if (!isGlobalAdmin && !isDeptAdmin) {
      throw ApiError.forbidden('Insufficient permissions to update departments');
    }

    // Get staff user
    const staff = await Staff.findById(staffId);
    if (!staff) {
      throw ApiError.notFound('Staff user not found');
    }

    // Verify departments exist
    const departmentIds = updateData.departmentAssignments.map((da) => new mongoose.Types.ObjectId(da.departmentId));
    const validDepartments = await Department.find({ _id: { $in: departmentIds } });

    if (validDepartments.length !== departmentIds.length) {
      throw ApiError.notFound('One or more departments not found');
    }

    // Check if dept-admin can modify these departments
    if (!isGlobalAdmin) {
      const requesterStaff = requesterStaffForCheck;
      if (!requesterStaff) {
        throw ApiError.forbidden('Insufficient permissions');
      }

      const managedDeptIds = requesterStaff.departmentMemberships
        .filter((dm) => dm.roles.includes('dept-admin'))
        .map((dm) => dm.departmentId.toString());

      for (const deptId of departmentIds) {
        if (!managedDeptIds.includes(deptId.toString())) {
          throw ApiError.forbidden('Cannot modify departments you do not manage');
        }
      }
    }

    // Apply action
    switch (updateData.action) {
      case 'add':
        for (const assignment of updateData.departmentAssignments) {
          const existingIdx = staff.departmentMemberships.findIndex(
            (dm) => dm.departmentId.toString() === assignment.departmentId
          );

          if (existingIdx === -1) {
            staff.departmentMemberships.push({
              departmentId: new mongoose.Types.ObjectId(assignment.departmentId),
              roles: [assignment.role],
              isPrimary: staff.departmentMemberships.length === 0,
              joinedAt: new Date(),
              isActive: true
            });
          }
        }
        break;

      case 'remove':
        for (const assignment of updateData.departmentAssignments) {
          // Check if removing last dept-admin
          const membership = staff.departmentMemberships.find(
            (dm) => dm.departmentId.toString() === assignment.departmentId
          );

          if (membership && membership.roles.includes('department-admin')) {
            const otherAdmins = await Staff.countDocuments({
              _id: { $ne: staffId },
              'departmentMemberships.departmentId': membership.departmentId,
              'departmentMemberships.roles': 'department-admin',
              isActive: true
            });

            if (otherAdmins === 0) {
              const dept = await Department.findById(membership.departmentId);
              throw ApiError.conflict(
                `Cannot remove last dept-admin from department: ${dept?.name || 'Unknown'}`
              );
            }
          }

          staff.departmentMemberships = staff.departmentMemberships.filter(
            (dm) => dm.departmentId.toString() !== assignment.departmentId
          );
        }
        break;

      case 'update':
        for (const assignment of updateData.departmentAssignments) {
          const existingIdx = staff.departmentMemberships.findIndex(
            (dm) => dm.departmentId.toString() === assignment.departmentId
          );

          if (existingIdx !== -1) {
            staff.departmentMemberships[existingIdx].roles = [assignment.role];
          }
        }
        break;

      case 'replace':
        staff.departmentMemberships = updateData.departmentAssignments.map((da, idx) => ({
          departmentId: new mongoose.Types.ObjectId(da.departmentId),
          roles: [da.role],
          isPrimary: idx === 0,
          joinedAt: new Date(),
          isActive: true
        }));
        break;
    }

    // Validate at least one department
    if (staff.departmentMemberships.length === 0) {
      throw ApiError.badRequest('Staff must have at least one department assignment');
    }

    await staff.save();

    // Invalidate permission cache after department membership change
    try {
      const newVersion = await invalidateAndIncrementVersion(staffId);
      logger.info(`[StaffService] Invalidated permission cache for user ${staffId} after department update (version: ${newVersion})`);
    } catch (cacheError) {
      logger.error(`[StaffService] Failed to invalidate permission cache for user ${staffId}:`, cacheError);
      // Continue - cache invalidation failure should not fail the operation
    }

    // Build response
    const departmentsData = await Promise.all(
      staff.departmentMemberships.map(async (dm) => {
        const dept = await Department.findById(dm.departmentId);
        return {
          departmentId: dm.departmentId.toString(),
          departmentName: dept?.name || 'Unknown',
          rolesInDepartment: dm.roles
        };
      })
    );

    const permissions = this.calculatePermissions(staff.departmentMemberships);

    return {
      id: staff._id.toString(),
      departments: departmentsData,
      permissions,
      updatedAt: staff.updatedAt
    };
  }

  // Helper methods

  private static calculatePermissions(memberships: any[]): string[] {
    const permissions = new Set<string>();

    for (const membership of memberships) {
      for (const role of membership.roles) {
        const rolePermissions = this.getRolePermissions(role);
        rolePermissions.forEach((p) => permissions.add(p));
      }
    }

    return Array.from(permissions);
  }

  private static getRolePermissions(role: string): string[] {
    const permissionMap: Record<string, string[]> = {
      instructor: ['content:read', 'content:write', 'courses:manage'],
      'content-admin': ['content:read', 'content:write', 'content:admin'],
      'department-admin': ['content:read', 'content:write', 'content:admin', 'courses:manage', 'dept:manage'],
      'dept-admin': ['content:read', 'content:write', 'content:admin', 'courses:manage', 'dept:manage']
    };

    return permissionMap[role] || ['content:read'];
  }

  private static validatePassword(password: string): boolean {
    if (password.length < 8) return false;

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return hasUppercase && hasLowercase && hasNumber;
  }
}
