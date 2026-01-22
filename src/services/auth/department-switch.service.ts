/**
 * Department Switch Service
 *
 * Handles department context switching for authenticated users.
 * Allows users to switch between departments where they have active membership
 * and retrieves the appropriate roles and access rights for the selected department.
 *
 * Business Logic:
 * - Validates user has membership in target department (direct or via role cascading)
 * - Queries User, Staff, and Learner models for department memberships
 * - Uses RoleService to get roles with cascading support
 * - Uses AccessRightsService to resolve access rights for roles
 * - Returns child departments if role cascading is enabled
 * - Updates User.lastSelectedDepartment for UI state persistence
 *
 * Reference: devdocs/Role_System_API_Model_Plan_V2.md Section 6.3
 * Phase 3, Task 3.5 of Implementation Plan
 *
 * @module services/auth/department-switch
 */

import mongoose from 'mongoose';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { Learner } from '@/models/auth/Learner.model';
import Department from '@/models/organization/Department.model';
import { ApiError } from '@/utils/ApiError';
import { UserType } from '@/models/auth/role-constants';

/**
 * Response structure for department switch operation
 */
export interface SwitchDepartmentResponse {
  /** ID of the switched department */
  departmentId: string;

  /** Name of the department */
  departmentName: string;

  /** Roles the user has in this department */
  roles: string[];

  /** Access rights granted by those roles */
  accessRights: string[];

  /** Whether user has direct membership (true) or inherited via cascading (false) */
  isDirectMember?: boolean;

  /** Parent department ID if membership is inherited via cascading */
  inheritedFrom?: string;

  /** Child departments where roles cascade (optional) */
  childDepartments?: Array<{
    id: string;
    name: string;
    roles: string[];
  }>;
}

/**
 * Child department information
 */
interface ChildDepartmentInfo {
  id: string;
  name: string;
  roles: string[];
}

/**
 * Department Switch Service
 *
 * Provides functionality for switching user's active department context
 */
export class DepartmentSwitchService {
  /**
   * Switch user's active department context
   *
   * This method performs the following:
   * 1. Validates that the target department exists and is active
   * 2. Checks user has membership in the department (direct or cascaded)
   * 3. Retrieves the user's roles for that department
   * 4. Resolves access rights for those roles
   * 5. Gets child departments if role cascading is enabled
   * 6. Updates User.lastSelectedDepartment field
   *
   * Special handling for Master Department (ISS-005):
   * - Master Department has isVisible: false in database
   * - Accessible ONLY to users with system-admin role OR global-admin userType
   * - Regular users without these privileges cannot access it
   *
   * @param userId - User's ObjectId
   * @param deptId - Target department's ObjectId
   * @returns SwitchDepartmentResponse with department context
   * @throws ApiError 404 if department not found
   * @throws ApiError 403 if user has no membership in department
   * @throws ApiError 500 for internal errors
   */
  static async switchDepartment(
    userId: mongoose.Types.ObjectId,
    deptId: mongoose.Types.ObjectId
  ): Promise<SwitchDepartmentResponse> {
    try {
      // Step 1: Get user to determine userTypes and check privileges
      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Step 2: Validate department exists
      const department = await Department.findById(deptId);

      if (!department) {
        throw ApiError.notFound('Department not found or is not accessible', 'DEPARTMENT_NOT_FOUND');
      }

      // Step 3: Check if user has special privileges for hidden departments
      const hasSpecialPrivileges = await this.hasSpecialDepartmentPrivileges(
        userId,
        user.userTypes
      );

      // Step 4: Check if department is visible (unless user has special privileges)
      // Return 404 to hide existence of non-visible departments from unauthorized users
      if (!hasSpecialPrivileges && !department.isVisible) {
        throw ApiError.notFound('Department not found or is not accessible', 'DEPARTMENT_NOT_FOUND');
      }

      // Step 5: Check department membership and get roles
      const { roles, userType, isDirectMember, inheritedFrom } = await this.getUserRolesForDepartment(
        userId,
        deptId,
        user.userTypes
      );

      if (roles.length === 0) {
        throw ApiError.forbidden(
          'You are not a member of this department',
          'NOT_A_MEMBER'
        );
      }

      // Step 6: Check if department is active
      if (!department.isActive) {
        throw ApiError.forbidden(
          'Department is not active',
          'DEPARTMENT_INACTIVE'
        );
      }

      // Step 7: Get access rights for the roles
      const accessRights = await this.getAccessRightsForRoles(roles);

      // Step 8: Get child departments if role cascading is enabled
      const childDepartments = await this.getChildDepartments(
        userId,
        deptId,
        roles,
        userType,
        department.requireExplicitMembership
      );

      // Step 9: Update User.lastSelectedDepartment
      await User.findByIdAndUpdate(userId, {
        lastSelectedDepartment: deptId
      });

      // Return the complete response
      return {
        departmentId: deptId.toString(),
        departmentName: department.name,
        roles,
        accessRights,
        ...(isDirectMember !== undefined && { isDirectMember }),
        ...(inheritedFrom && { inheritedFrom }),
        ...(childDepartments.length > 0 && { childDepartments })
      };

    } catch (error) {
      // Re-throw ApiErrors as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Wrap other errors
      console.error('Error in switchDepartment:', error);
      throw ApiError.internal('Failed to switch department');
    }
  }

  /**
   * Check if user has special privileges for hidden departments
   *
   * Users with special privileges can access departments with isVisible: false:
   * - Users with 'system-admin' role in any department
   * - Users with 'global-admin' userType
   *
   * This addresses ISS-005 - Master Department visibility fix
   *
   * @param userId - User's ObjectId
   * @param userTypes - User's userTypes array
   * @returns True if user has special privileges, false otherwise
   * @private
   */
  private static async hasSpecialDepartmentPrivileges(
    userId: mongoose.Types.ObjectId,
    userTypes: UserType[]
  ): Promise<boolean> {
    try {
      // Check if user has global-admin userType
      if (userTypes.includes('global-admin')) {
        return true;
      }

      // Check if user has system-admin role in any department
      if (userTypes.includes('staff') || userTypes.includes('global-admin')) {
        const staff = await Staff.findById(userId);
        if (staff) {
          // Check if any department membership includes system-admin role
          for (const membership of staff.departmentMemberships) {
            if (membership.isActive && membership.roles.includes('system-admin')) {
              return true;
            }
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking special department privileges:', error);
      return false;
    }
  }

  /**
   * Get user's roles for a specific department
   *
   * Checks Staff and Learner models for direct membership.
   * If no direct membership found, checks for role cascading from parent departments.
   *
   * @param userId - User's ObjectId
   * @param deptId - Department ObjectId
   * @param userTypes - User's userTypes array
   * @returns Object containing roles and the userType used
   * @private
   */
  private static async getUserRolesForDepartment(
    userId: mongoose.Types.ObjectId,
    deptId: mongoose.Types.ObjectId,
    userTypes: UserType[]
  ): Promise<{ roles: string[]; userType: UserType | null; isDirectMember?: boolean; inheritedFrom?: string }> {
    // Try staff roles first if user has staff or global-admin type
    if (userTypes.includes('staff') || userTypes.includes('global-admin')) {
      const staffRoles = await this.getStaffRolesForDepartment(userId, deptId);
      if (staffRoles.length > 0) {
        return { roles: staffRoles, userType: 'staff', isDirectMember: true };
      }
    }

    // Try learner roles if user has learner type
    if (userTypes.includes('learner')) {
      const learnerRoles = await this.getLearnerRolesForDepartment(userId, deptId);
      if (learnerRoles.length > 0) {
        return { roles: learnerRoles, userType: 'learner', isDirectMember: true };
      }
    }

    // If no direct membership found, check for role cascading
    const cascadedRoles = await this.checkRoleCascading(userId, deptId, userTypes);
    return cascadedRoles;
  }

  /**
   * Get staff roles for a department (direct membership only)
   *
   * @param userId - User's ObjectId
   * @param deptId - Department ObjectId
   * @returns Array of staff role names
   * @private
   */
  private static async getStaffRolesForDepartment(
    userId: mongoose.Types.ObjectId,
    deptId: mongoose.Types.ObjectId
  ): Promise<string[]> {
    const staff = await Staff.findById(userId);
    if (!staff) {
      return [];
    }

    return staff.getRolesForDepartment(deptId);
  }

  /**
   * Get learner roles for a department (direct membership only)
   *
   * @param userId - User's ObjectId
   * @param deptId - Department ObjectId
   * @returns Array of learner role names
   * @private
   */
  private static async getLearnerRolesForDepartment(
    userId: mongoose.Types.ObjectId,
    deptId: mongoose.Types.ObjectId
  ): Promise<string[]> {
    const learner = await Learner.findById(userId);
    if (!learner) {
      return [];
    }

    return learner.getRolesForDepartment(deptId);
  }

  /**
   * Check for role cascading from parent departments
   *
   * Recursively checks parent departments to see if user has membership
   * in a parent that grants cascaded access to this department.
   * Only applies if parent department has requireExplicitMembership: false
   *
   * @param userId - User's ObjectId
   * @param deptId - Department ObjectId
   * @param userTypes - User's userTypes array
   * @returns Object containing cascaded roles and userType, or empty array if none
   * @private
   */
  private static async checkRoleCascading(
    userId: mongoose.Types.ObjectId,
    deptId: mongoose.Types.ObjectId,
    userTypes: UserType[]
  ): Promise<{ roles: string[]; userType: UserType | null; isDirectMember?: boolean; inheritedFrom?: string }> {
    const department = await Department.findById(deptId).populate('parentDepartmentId');

    if (!department || !department.parentDepartmentId) {
      return { roles: [], userType: null };
    }

    // Only cascade if CHILD department doesn't require explicit membership
    if (department.requireExplicitMembership) {
      return { roles: [], userType: null };
    }

    const parent = await Department.findById(department.parentDepartmentId);
    if (!parent) {
      return { roles: [], userType: null };
    }

    // Check if user has DIRECT roles in parent department
    // We need to check only direct membership, not cascaded
    let hasDirectParentMembership = false;
    let parentRoles: string[] = [];
    let parentUserType: UserType | null = null;

    if (userTypes.includes('staff') || userTypes.includes('global-admin')) {
      const staffRoles = await this.getStaffRolesForDepartment(userId, parent._id);
      if (staffRoles.length > 0) {
        hasDirectParentMembership = true;
        parentRoles = staffRoles;
        parentUserType = 'staff';
      }
    }

    if (!hasDirectParentMembership && userTypes.includes('learner')) {
      const learnerRoles = await this.getLearnerRolesForDepartment(userId, parent._id);
      if (learnerRoles.length > 0) {
        hasDirectParentMembership = true;
        parentRoles = learnerRoles;
        parentUserType = 'learner';
      }
    }

    if (hasDirectParentMembership) {
      // Return roles with cascading info - this is inherited, not direct
      return {
        roles: parentRoles,
        userType: parentUserType,
        isDirectMember: false,
        inheritedFrom: parent._id.toString()
      };
    }

    // Continue checking up the hierarchy
    return this.checkRoleCascading(userId, parent._id, userTypes);
  }

  /**
   * Get access rights for an array of roles
   *
   * This is a placeholder that should use AccessRightsService.getAccessRightsForRoles()
   * once Task 3.1 is complete. For now, it uses RoleDefinition model directly.
   *
   * @param roles - Array of role names
   * @returns Array of access right strings
   * @private
   */
  private static async getAccessRightsForRoles(roles: string[]): Promise<string[]> {
    try {
      // Import RoleDefinition dynamically to avoid circular dependencies
      const { RoleDefinition } = await import('@/models/RoleDefinition.model');

      // Get role definitions for all roles
      const roleDefinitions = await RoleDefinition.find({
        name: { $in: roles.map(r => r.toLowerCase()) },
        isActive: true
      });

      // Collect all unique access rights
      const accessRightsSet = new Set<string>();
      for (const roleDef of roleDefinitions) {
        for (const right of roleDef.accessRights) {
          accessRightsSet.add(right);
        }
      }

      return Array.from(accessRightsSet);
    } catch (error) {
      console.error('Error getting access rights:', error);
      return [];
    }
  }

  /**
   * Get child departments where user's roles apply via cascading
   *
   * If the department allows role cascading (requireExplicitMembership: false),
   * returns all active child departments where the user's roles cascade down.
   *
   * Respects ISS-005: Users with special privileges see hidden child departments too.
   *
   * @param userId - User's ObjectId
   * @param deptId - Parent department ObjectId
   * @param roles - User's roles in parent department
   * @param userType - User's active userType (staff or learner)
   * @param requireExplicitMembership - Whether department requires explicit membership
   * @returns Array of child department info
   * @private
   */
  private static async getChildDepartments(
    userId: mongoose.Types.ObjectId,
    deptId: mongoose.Types.ObjectId,
    roles: string[],
    userType: UserType | null,
    _requireExplicitMembership: boolean
  ): Promise<ChildDepartmentInfo[]> {
    // Don't return children if no userType (shouldn't happen but safety check)
    if (!userType) {
      return [];
    }

    try {
      // Check if user has special privileges for hidden departments
      const user = await User.findById(userId);
      const hasSpecialPrivileges = user
        ? await this.hasSpecialDepartmentPrivileges(userId, user.userTypes)
        : false;

      // Find all active child departments
      const childQuery: any = {
        parentDepartmentId: deptId,
        isActive: true
      };

      // Only filter by isVisible if user doesn't have special privileges
      if (!hasSpecialPrivileges) {
        childQuery.isVisible = true;
      }

      const children = await Department.find(childQuery);

      // Get user's direct memberships to check for explicit membership
      let directMemberships: Set<string> = new Set();
      if (userType === 'staff') {
        const staff = await Staff.findById(userId);
        if (staff) {
          directMemberships = new Set(
            staff.departmentMemberships
              .filter(m => m.isActive)
              .map(m => m.departmentId.toString())
          );
        }
      } else if (userType === 'learner') {
        const learner = await Learner.findById(userId);
        if (learner) {
          directMemberships = new Set(
            learner.departmentMemberships
              .filter(m => m.isActive)
              .map(m => m.departmentId.toString())
          );
        }
      }

      // Filter children based on requireExplicitMembership flag
      const accessibleChildren = children.filter(child => {
        const childId = child._id.toString();

        // If child requires explicit membership, only include if user has direct membership
        if (child.requireExplicitMembership) {
          return directMemberships.has(childId);
        }

        // Otherwise, roles cascade from parent
        return true;
      });

      // Map to child department info
      return accessibleChildren.map(child => ({
        id: child._id.toString(),
        name: child.name,
        roles // Same roles cascade down
      }));

    } catch (error) {
      console.error('Error getting child departments:', error);
      return [];
    }
  }

  /**
   * Validate user has access to department
   *
   * Convenience method to check if a user has any access to a department
   * without performing the full switch operation.
   *
   * @param userId - User's ObjectId
   * @param deptId - Department ObjectId
   * @returns True if user has access, false otherwise
   */
  static async validateDepartmentAccess(
    userId: mongoose.Types.ObjectId,
    deptId: mongoose.Types.ObjectId
  ): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return false;
      }

      const { roles } = await this.getUserRolesForDepartment(
        userId,
        deptId,
        user.userTypes
      );

      return roles.length > 0;
    } catch (error) {
      console.error('Error validating department access:', error);
      return false;
    }
  }

  /**
   * Get all departments accessible by user
   *
   * Returns all departments where the user has either direct membership
   * or cascaded access from parent departments.
   *
   * Respects ISS-005 Master Department visibility:
   * - Regular users only see isVisible: true departments
   * - Users with system-admin role or global-admin userType also see hidden departments
   *
   * @param userId - User's ObjectId
   * @returns Array of accessible departments with roles
   */
  static async getAccessibleDepartments(
    userId: mongoose.Types.ObjectId
  ): Promise<Array<{ departmentId: string; departmentName: string; roles: string[] }>> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return [];
      }

      const accessibleDepartments: Array<{
        departmentId: string;
        departmentName: string;
        roles: string[];
      }> = [];

      // Check if user has special privileges for hidden departments
      const hasSpecialPrivileges = await this.hasSpecialDepartmentPrivileges(
        userId,
        user.userTypes
      );

      // Get all active departments (visible or all if user has special privileges)
      const departmentQuery: any = {
        isActive: true
      };

      if (!hasSpecialPrivileges) {
        departmentQuery.isVisible = true;
      }

      const allDepartments = await Department.find(departmentQuery);

      // Check access for each department
      for (const dept of allDepartments) {
        const { roles } = await this.getUserRolesForDepartment(
          userId,
          dept._id,
          user.userTypes
        );

        if (roles.length > 0) {
          accessibleDepartments.push({
            departmentId: dept._id.toString(),
            departmentName: dept.name,
            roles
          });
        }
      }

      return accessibleDepartments;
    } catch (error) {
      console.error('Error getting accessible departments:', error);
      return [];
    }
  }
}

export default DepartmentSwitchService;
