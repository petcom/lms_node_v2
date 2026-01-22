/**
 * Role Service
 *
 * Service for role management and department scoping logic.
 * Implements role cascading from parent departments and provides
 * comprehensive role querying capabilities across all user types.
 *
 * Key features:
 * - Role cascading from parent departments (Section 7.1)
 * - Department visibility calculation (Section 7.2)
 * - Multi-userType role aggregation
 * - Efficient path-based parent lookups
 *
 * Reference: devdocs/Role_System_API_Model_Plan_V2.md Section 7
 *
 * @module services/auth/role.service
 */

import mongoose from 'mongoose';
import { Staff } from '@/models/auth/Staff.model';
import { Learner } from '@/models/auth/Learner.model';
import { GlobalAdmin } from '@/models/GlobalAdmin.model';
import Department from '@/models/organization/Department.model';
import { UserType } from '@/models/auth/User.model';
import { IDepartmentMembership } from '@/models/auth/department-membership.schema';

/**
 * Department with roles information
 */
export interface DepartmentWithRoles {
  /** Department ID */
  id: mongoose.Types.ObjectId;

  /** Department name */
  name: string;

  /** Department code */
  code: string;

  /** Roles the user has in this department */
  roles: string[];

  /** Is this the user's primary department? */
  isPrimary: boolean;

  /** Hierarchy level (0 = direct, 1+ = cascaded) */
  level: number;

  /** Parent department ID (if cascaded) */
  parentId?: mongoose.Types.ObjectId;

  /** Child departments (if parent) */
  children?: DepartmentWithRoles[];
}

/**
 * Department membership across all userTypes
 */
export interface DepartmentMembership {
  /** User type this membership belongs to */
  userType: UserType;

  /** Department ID */
  departmentId: mongoose.Types.ObjectId;

  /** Department name */
  departmentName: string;

  /** Department code */
  departmentCode: string;

  /** Roles in this department */
  roles: string[];

  /** Is this primary department for this userType? */
  isPrimary: boolean;

  /** When joined */
  joinedAt: Date;

  /** Is active? */
  isActive: boolean;
}

/**
 * Role Service Class
 *
 * Provides comprehensive role querying and department scoping logic
 * for the LMS role system.
 */
export class RoleService {
  /**
   * Get user's roles in a specific department
   *
   * Implements role cascading logic:
   * 1. Check for direct membership in the department
   * 2. If not found, check parent departments for cascading roles
   * 3. Return empty array if no roles found
   *
   * @param userId - User's ObjectId
   * @param deptId - Department ObjectId
   * @param userType - User type (learner, staff, global-admin)
   * @returns Array of role names the user has in this department
   */
  static async getRolesForDepartment(
    userId: mongoose.Types.ObjectId,
    deptId: mongoose.Types.ObjectId,
    userType: UserType
  ): Promise<string[]> {
    try {
      // Handle global-admin separately
      if (userType === 'global-admin') {
        const globalAdmin = await GlobalAdmin.findById(userId);
        if (!globalAdmin || !globalAdmin.isActive) {
          return [];
        }

        // Global admin roles are only in master department
        const membership = globalAdmin.roleMemberships.find(
          (m) => m.isActive && m.departmentId.equals(deptId)
        );

        return membership ? membership.roles : [];
      }

      // Get record based on userType
      const record = userType === 'staff'
        ? await Staff.findById(userId)
        : await Learner.findById(userId);

      if (!record || !record.isActive) {
        return [];
      }

      // Check for direct membership
      const directMembership = record.departmentMemberships.find(
        (m: IDepartmentMembership) =>
          m.departmentId.equals(deptId) && m.isActive
      );

      if (directMembership) {
        return directMembership.roles;
      }

      // No direct membership - check parent departments for cascading
      return await this.checkRoleCascading(userId, deptId, userType);
    } catch (error) {
      console.error('Error in getRolesForDepartment:', error);
      throw error;
    }
  }

  /**
   * Get all departments visible to the user with their roles
   *
   * Returns departments where user has membership plus child departments
   * where roles cascade down (if requireExplicitMembership is false).
   *
   * @param userId - User's ObjectId
   * @param userType - User type (learner, staff, global-admin)
   * @returns Array of departments with role information
   */
  static async getVisibleDepartments(
    userId: mongoose.Types.ObjectId,
    userType: UserType
  ): Promise<DepartmentWithRoles[]> {
    try {
      // Handle global-admin separately
      if (userType === 'global-admin') {
        const globalAdmin = await GlobalAdmin.findById(userId);
        if (!globalAdmin || !globalAdmin.isActive) {
          return [];
        }

        const visible: DepartmentWithRoles[] = [];

        for (const membership of globalAdmin.roleMemberships) {
          if (!membership.isActive) continue;

          const dept = await Department.findById(membership.departmentId);
          if (!dept || !dept.isActive) continue;

          visible.push({
            id: dept._id,
            name: dept.name,
            code: dept.code,
            roles: membership.roles,
            isPrimary: true, // Master department
            level: 0
          });
        }

        return visible;
      }

      // Get record based on userType
      const record = userType === 'staff'
        ? await Staff.findById(userId)
        : await Learner.findById(userId);

      if (!record || !record.isActive) {
        return [];
      }

      const visible: DepartmentWithRoles[] = [];
      const processedDeptIds = new Set<string>();

      // Process each direct membership
      for (const membership of record.departmentMemberships) {
        if (!membership.isActive) continue;

        const dept = await Department.findById(membership.departmentId);
        if (!dept || !dept.isActive || !dept.isVisible) continue;

        const deptIdStr = dept._id.toString();
        if (processedDeptIds.has(deptIdStr)) continue;
        processedDeptIds.add(deptIdStr);

        // Add the department itself
        const deptWithRoles: DepartmentWithRoles = {
          id: dept._id,
          name: dept.name,
          code: dept.code,
          roles: membership.roles,
          isPrimary: membership.isPrimary,
          level: 0,
          children: []
        };

        // Find child departments where roles cascade
        if (!dept.requireExplicitMembership) {
          const children = await Department.find({
            parentDepartmentId: dept._id,
            isActive: true,
            isVisible: true
          });

          for (const child of children) {
            const childIdStr = child._id.toString();
            if (processedDeptIds.has(childIdStr)) continue;
            processedDeptIds.add(childIdStr);

            deptWithRoles.children!.push({
              id: child._id,
              name: child.name,
              code: child.code,
              roles: membership.roles, // Cascaded roles
              isPrimary: false,
              level: 1,
              parentId: dept._id
            });
          }
        }

        visible.push(deptWithRoles);
      }

      return visible;
    } catch (error) {
      console.error('Error in getVisibleDepartments:', error);
      throw error;
    }
  }

  /**
   * Check parent departments for role cascading
   *
   * Recursively checks parent departments to find cascading roles.
   * Stops if requireExplicitMembership is true on a parent.
   *
   * @param userId - User's ObjectId
   * @param deptId - Department ObjectId to check parents for
   * @param userType - User type (learner or staff)
   * @returns Array of cascaded role names
   */
  static async checkRoleCascading(
    userId: mongoose.Types.ObjectId,
    deptId: mongoose.Types.ObjectId,
    userType: UserType
  ): Promise<string[]> {
    try {
      // Global admins don't have cascading (only master department)
      if (userType === 'global-admin') {
        return [];
      }

      // Get the department with parent info
      const department = await Department.findById(deptId);

      if (!department || !department.parentDepartmentId) {
        return []; // No parent to cascade from
      }

      // Get parent department
      const parent = await Department.findById(department.parentDepartmentId);

      if (!parent || !parent.isActive) {
        return [];
      }

      // Check if parent requires explicit membership
      if (parent.requireExplicitMembership) {
        return []; // Cascading blocked by parent
      }

      // Get user's roles in parent department
      const record = userType === 'staff'
        ? await Staff.findById(userId)
        : await Learner.findById(userId);

      if (!record || !record.isActive) {
        return [];
      }

      // Check for direct membership in parent
      const parentMembership = record.departmentMemberships.find(
        (m: IDepartmentMembership) =>
          m.departmentId.equals(parent._id) && m.isActive
      );

      if (parentMembership) {
        // Found roles in parent - these cascade down
        return parentMembership.roles;
      }

      // No direct membership in parent - check grandparent recursively
      return await this.checkRoleCascading(userId, parent._id, userType);
    } catch (error) {
      console.error('Error in checkRoleCascading:', error);
      throw error;
    }
  }

  /**
   * Get all department memberships for a user across all userTypes
   *
   * Checks Staff, Learner, AND GlobalAdmin models to get complete
   * picture of user's department memberships and roles.
   *
   * @param userId - User's ObjectId
   * @returns Array of department memberships across all userTypes
   */
  static async getAllRolesForUser(
    userId: mongoose.Types.ObjectId
  ): Promise<DepartmentMembership[]> {
    try {
      const allMemberships: DepartmentMembership[] = [];

      // Check Staff model
      const staff = await Staff.findById(userId);
      if (staff && staff.isActive) {
        for (const membership of staff.departmentMemberships) {
          if (!membership.isActive) continue;

          const dept = await Department.findById(membership.departmentId);
          if (!dept) continue;

          allMemberships.push({
            userType: 'staff',
            departmentId: membership.departmentId,
            departmentName: dept.name,
            departmentCode: dept.code,
            roles: membership.roles,
            isPrimary: membership.isPrimary,
            joinedAt: membership.joinedAt,
            isActive: membership.isActive
          });
        }
      }

      // Check Learner model
      const learner = await Learner.findById(userId);
      if (learner && learner.isActive) {
        for (const membership of learner.departmentMemberships) {
          if (!membership.isActive) continue;

          const dept = await Department.findById(membership.departmentId);
          if (!dept) continue;

          allMemberships.push({
            userType: 'learner',
            departmentId: membership.departmentId,
            departmentName: dept.name,
            departmentCode: dept.code,
            roles: membership.roles,
            isPrimary: membership.isPrimary,
            joinedAt: membership.joinedAt,
            isActive: membership.isActive
          });
        }
      }

      // Check GlobalAdmin model
      const globalAdmin = await GlobalAdmin.findById(userId);
      if (globalAdmin && globalAdmin.isActive) {
        for (const membership of globalAdmin.roleMemberships) {
          if (!membership.isActive) continue;

          const dept = await Department.findById(membership.departmentId);
          if (!dept) continue;

          allMemberships.push({
            userType: 'global-admin',
            departmentId: membership.departmentId,
            departmentName: dept.name,
            departmentCode: dept.code,
            roles: membership.roles,
            isPrimary: true, // Master department is always "primary" for global-admin
            joinedAt: membership.assignedAt,
            isActive: membership.isActive
          });
        }
      }

      return allMemberships;
    } catch (error) {
      console.error('Error in getAllRolesForUser:', error);
      throw error;
    }
  }

  /**
   * Get all child departments where user's roles cascade
   *
   * Helper method to find all descendant departments where the user's
   * roles from a parent department cascade down.
   *
   * @param userId - User's ObjectId
   * @param parentDeptId - Parent department ObjectId
   * @param userType - User type (learner or staff)
   * @returns Array of child departments with cascaded roles
   */
  static async getCascadedChildDepartments(
    userId: mongoose.Types.ObjectId,
    parentDeptId: mongoose.Types.ObjectId,
    userType: UserType
  ): Promise<DepartmentWithRoles[]> {
    try {
      // Get user's roles in parent department
      const parentRoles = await this.getRolesForDepartment(userId, parentDeptId, userType);

      if (parentRoles.length === 0) {
        return [];
      }

      // Get parent department
      const parent = await Department.findById(parentDeptId);
      if (!parent || !parent.isActive || parent.requireExplicitMembership) {
        return [];
      }

      // Find all active, visible child departments
      const children = await Department.find({
        parentDepartmentId: parentDeptId,
        isActive: true,
        isVisible: true
      });

      const cascadedChildren: DepartmentWithRoles[] = [];

      for (const child of children) {
        cascadedChildren.push({
          id: child._id,
          name: child.name,
          code: child.code,
          roles: parentRoles, // Cascaded from parent
          isPrimary: false,
          level: 1,
          parentId: parentDeptId
        });
      }

      return cascadedChildren;
    } catch (error) {
      console.error('Error in getCascadedChildDepartments:', error);
      throw error;
    }
  }

  /**
   * Check if user has a specific role in a department
   *
   * Convenience method that checks if user has a specific role
   * in the given department (including cascaded roles).
   *
   * @param userId - User's ObjectId
   * @param deptId - Department ObjectId
   * @param userType - User type
   * @param roleName - Role name to check
   * @returns True if user has the role in this department
   */
  static async hasRole(
    userId: mongoose.Types.ObjectId,
    deptId: mongoose.Types.ObjectId,
    userType: UserType,
    roleName: string
  ): Promise<boolean> {
    try {
      const roles = await this.getRolesForDepartment(userId, deptId, userType);
      return roles.includes(roleName);
    } catch (error) {
      console.error('Error in hasRole:', error);
      throw error;
    }
  }

  /**
   * Get primary department for a user
   *
   * Returns the user's primary department for the given userType.
   *
   * @param userId - User's ObjectId
   * @param userType - User type
   * @returns Department info or null if no primary department
   */
  static async getPrimaryDepartment(
    userId: mongoose.Types.ObjectId,
    userType: UserType
  ): Promise<DepartmentWithRoles | null> {
    try {
      if (userType === 'global-admin') {
        const globalAdmin = await GlobalAdmin.findById(userId);
        if (!globalAdmin || !globalAdmin.isActive) {
          return null;
        }

        const activeMembership = globalAdmin.roleMemberships.find(m => m.isActive);
        if (!activeMembership) {
          return null;
        }

        const dept = await Department.findById(activeMembership.departmentId);
        if (!dept) {
          return null;
        }

        return {
          id: dept._id,
          name: dept.name,
          code: dept.code,
          roles: activeMembership.roles,
          isPrimary: true,
          level: 0
        };
      }

      const record = userType === 'staff'
        ? await Staff.findById(userId)
        : await Learner.findById(userId);

      if (!record || !record.isActive) {
        return null;
      }

      const primaryMembership = record.departmentMemberships.find(
        (m: IDepartmentMembership) => m.isPrimary && m.isActive
      );

      if (!primaryMembership) {
        return null;
      }

      const dept = await Department.findById(primaryMembership.departmentId);
      if (!dept) {
        return null;
      }

      return {
        id: dept._id,
        name: dept.name,
        code: dept.code,
        roles: primaryMembership.roles,
        isPrimary: true,
        level: 0
      };
    } catch (error) {
      console.error('Error in getPrimaryDepartment:', error);
      throw error;
    }
  }
}

export default RoleService;
