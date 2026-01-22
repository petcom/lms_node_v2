/**
 * Department Hierarchy Utility
 *
 * Provides utilities for working with hierarchical department structures.
 *
 * Business Rules:
 * - Department members see their department and all of its subdepartments
 * - No access to parent or sibling departments unless separately assigned
 * - System-admin: See everything across all departments
 *
 * This utility supports the hierarchical scoping requirements for staff management,
 * reporting, and department-based filtering.
 *
 * Usage:
 * ```typescript
 * import { getDepartmentAndSubdepartments } from '@/utils/departmentHierarchy';
 *
 * const deptIds = await getDepartmentAndSubdepartments(departmentId);
 * const staff = await Staff.find({ departmentId: { $in: deptIds } });
 * ```
 *
 * @module utils/departmentHierarchy
 */

import { Types } from 'mongoose';

/**
 * Get department and all its subdepartments (recursive)
 *
 * Returns an array of department IDs including the given department and
 * all its subdepartments (recursively traversing the hierarchy).
 *
 * Use this for filtering data by department with hierarchical access.
 *
 * @param departmentId - The root department ID
 * @returns Array of department IDs (strings)
 *
 * @example
 * // User in top-level department sees all subdepartments
 * const deptIds = await getDepartmentAndSubdepartments('dept-id-123');
 * // Returns: ['dept-id-123', 'subdept-id-456', 'subdept-id-789', ...]
 *
 * const staff = await Staff.find({ departmentId: { $in: deptIds } });
 */
export async function getDepartmentAndSubdepartments(
  departmentId: string | Types.ObjectId
): Promise<string[]> {
  // Dynamically import Department model to avoid circular dependencies
  const { default: Department } = await import('@/models/organization/Department.model');

  // Convert to ObjectId if string
  const deptId = typeof departmentId === 'string'
    ? new Types.ObjectId(departmentId)
    : departmentId;

  // Start with the root department
  const allDeptIds: string[] = [deptId.toString()];

  try {
    // Find all immediate subdepartments
    const subdepartments = await Department.find({
      parentDepartmentId: deptId
    }).select('_id');

    // Recursively get subdepartments for each child
    for (const subdept of subdepartments) {
      const childDeptIds = await getDepartmentAndSubdepartments(subdept._id);
      allDeptIds.push(...childDeptIds);
    }

    // Remove duplicates (in case of circular references)
    return [...new Set(allDeptIds)];
  } catch (error) {
    console.error('Error getting department hierarchy:', error);
    // Return at least the root department on error
    return [deptId.toString()];
  }
}

/**
 * Check if user is a member of a top-level department
 *
 * Top-level departments have no parent department. Members of top-level
 * departments should see data from all subdepartments.
 *
 * @param userId - The user ID to check
 * @param deptId - The department ID to check
 * @returns True if the department is top-level (has no parent)
 *
 * @example
 * const isTopLevel = await isTopLevelDepartmentMember(userId, deptId);
 * if (isTopLevel) {
 *   // User can see all subdepartment data
 *   deptIds = await getDepartmentAndSubdepartments(deptId);
 * } else {
 *   // User can only see their own department data
 *   deptIds = [deptId];
 * }
 */
export async function isTopLevelDepartmentMember(
  _userId: string | Types.ObjectId,
  deptId: string | Types.ObjectId
): Promise<boolean> {
  // Dynamically import Department model
  const { default: Department } = await import('@/models/organization/Department.model');

  try {
    const department = await Department.findById(deptId).select('parentDepartmentId');

    if (!department) {
      return false;
    }

    // Top-level department has no parent
    return !department.parentDepartmentId;
  } catch (error) {
    console.error('Error checking top-level department:', error);
    return false;
  }
}

/**
 * Get all parent departments (recursive)
 *
 * Returns an array of department IDs representing the chain of parent
 * departments from the given department up to the root.
 *
 * Useful for breadcrumb navigation or checking access rights up the hierarchy.
 *
 * @param departmentId - The starting department ID
 * @returns Array of department IDs from child to root
 *
 * @example
 * const parents = await getParentDepartments('subdept-id-789');
 * // Returns: ['subdept-id-789', 'dept-id-456', 'root-dept-123']
 */
export async function getParentDepartments(
  departmentId: string | Types.ObjectId
): Promise<string[]> {
  // Dynamically import Department model
  const { default: Department } = await import('@/models/organization/Department.model');

  const deptId = typeof departmentId === 'string'
    ? new Types.ObjectId(departmentId)
    : departmentId;

  const parentIds: string[] = [deptId.toString()];

  try {
    let currentDept = await Department.findById(deptId).select('parentDepartmentId');

    // Traverse up the hierarchy
    while (currentDept?.parentDepartmentId) {
      parentIds.push(currentDept.parentDepartmentId.toString());
      currentDept = await Department.findById(currentDept.parentDepartmentId)
        .select('parentDepartmentId');
    }

    return parentIds;
  } catch (error) {
    console.error('Error getting parent departments:', error);
    return [deptId.toString()];
  }
}

/**
 * Get root department for a given department
 *
 * Traverses up the hierarchy to find the top-level (root) department.
 *
 * @param departmentId - The starting department ID
 * @returns The root department ID
 *
 * @example
 * const rootId = await getRootDepartment('subdept-id-789');
 * // Returns: 'root-dept-123'
 */
export async function getRootDepartment(
  departmentId: string | Types.ObjectId
): Promise<string> {
  const parents = await getParentDepartments(departmentId);
  // Last item in array is the root
  return parents[parents.length - 1];
}

/**
 * Check if user has access to department (considering hierarchy)
 *
 * Checks if user is a member of the department OR any of its subdepartments.
 *
 * @param userId - The user ID to check
 * @param userDepartmentIds - Array of department IDs the user belongs to
 * @param targetDepartmentId - The target department ID to check access for
 * @returns True if user has access to the target department
 *
 * @example
 * const hasAccess = await hasHierarchicalAccess(
 *   userId,
 *   user.departmentMemberships?.map(m => m.departmentId) || [],
 *   targetDepartmentId
 * );
 * if (!hasAccess) {
 *   throw ApiError.forbidden('No access to this department');
 * }
 */
export async function hasHierarchicalAccess(
  userId: string | Types.ObjectId,
  userDepartmentIds: (string | Types.ObjectId)[],
  targetDepartmentId: string | Types.ObjectId
): Promise<boolean> {
  void userId;
  const targetId = typeof targetDepartmentId === 'string'
    ? targetDepartmentId
    : targetDepartmentId.toString();

  const userDeptIds = userDepartmentIds.map(id =>
    typeof id === 'string' ? id : id.toString()
  );

  // Direct membership check
  if (userDeptIds.includes(targetId)) {
    return true;
  }

  // Check if target is within any assigned department subtree
  for (const userDeptId of userDeptIds) {
    const subdepartments = await getDepartmentAndSubdepartments(userDeptId);

    if (subdepartments.includes(targetId)) {
      return true;
    }
  }

  return false;
}

/**
 * Get department IDs for scoped query
 *
 * Returns the appropriate department IDs for filtering based on user's
 * department membership and department subtrees.
 *
 * Use this in service layer to scope queries by department.
 *
 * @param userDepartmentIds - Array of department IDs the user belongs to
 * @param userId - The user ID (for checking top-level membership)
 * @returns Array of department IDs to use in query
 *
 * @example
 * const deptIds = await getDepartmentIdsForQuery(
 *   user.departmentMemberships?.map(m => m.departmentId) || [],
 *   user._id
 * );
 * const staff = await Staff.find({ departmentId: { $in: deptIds } });
 */
export async function getDepartmentIdsForQuery(
  userDepartmentIds: (string | Types.ObjectId)[],
  userId?: string | Types.ObjectId
): Promise<string[]> {
  void userId;
  const allDeptIds: string[] = [];

  for (const deptId of userDepartmentIds) {
    const subdepts = await getDepartmentAndSubdepartments(deptId);
    allDeptIds.push(...subdepts);
  }

  // Remove duplicates
  return [...new Set(allDeptIds)];
}

/**
 * Export default object with all hierarchy functions
 */
export default {
  getDepartmentAndSubdepartments,
  isTopLevelDepartmentMember,
  getParentDepartments,
  getRootDepartment,
  hasHierarchicalAccess,
  getDepartmentIdsForQuery
};
