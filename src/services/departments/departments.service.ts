import mongoose from 'mongoose';
import Department, { IDepartment } from '@/models/organization/Department.model';
import Program from '@/models/academic/Program.model';
import Course from '@/models/academic/Course.model';
import { Staff } from '@/models/auth/Staff.model';
import Enrollment from '@/models/enrollment/Enrollment.model';
import { ApiError } from '@/utils/ApiError';

interface ListDepartmentsFilters {
  page?: number;
  limit?: number;
  search?: string;
  parentId?: string;
  status?: 'active' | 'inactive';
  sort?: string;
}

interface CreateDepartmentInput {
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  status?: 'active' | 'inactive';
}

interface UpdateDepartmentInput {
  name?: string;
  code?: string;
  description?: string;
  parentId?: string;
  status?: 'active' | 'inactive';
}

interface GetProgramsFilters {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive' | 'archived';
  includeChildDepartments?: boolean;
}

interface GetStaffFilters {
  page?: number;
  limit?: number;
  role?: 'content-admin' | 'instructor' | 'observer';
  status?: 'active' | 'inactive';
  search?: string;
}

interface GetStatsParams {
  includeChildDepartments?: boolean;
  period?: 'week' | 'month' | 'quarter' | 'year' | 'all';
}

export class DepartmentsService {
  /**
   * List departments with filtering and pagination
   */
  static async listDepartments(filters: ListDepartmentsFilters): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    // Search filter
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Parent filter
    if (filters.parentId === 'null' || filters.parentId === null) {
      query.parentDepartmentId = null;
    } else if (filters.parentId) {
      query.parentDepartmentId = filters.parentId;
    }

    // Status filter
    if (filters.status === 'active') {
      query.isActive = true;
    } else if (filters.status === 'inactive') {
      query.isActive = false;
    }

    // Sort
    const sortField = filters.sort || 'name';
    const sortOrder = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sort: any = { [sortKey]: sortOrder };

    // Execute query
    const [departments, total] = await Promise.all([
      Department.find(query).sort(sort).skip(skip).limit(limit),
      Department.countDocuments(query)
    ]);

    // Build response with metadata
    const departmentsData = await Promise.all(
      departments.map(async (dept) => {
        const hasChildren = await Department.countDocuments({
          parentDepartmentId: dept._id
        }) > 0;

        const totalStaff = await Staff.countDocuments({
          'departmentMemberships.departmentId': dept._id
        });

        const totalPrograms = await Program.countDocuments({
          departmentId: dept._id,
          isActive: true
        });

        const totalCourses = await Course.countDocuments({
          departmentId: dept._id,
          isActive: true
        });

        return {
          id: dept._id.toString(),
          name: dept.name,
          code: dept.code,
          description: dept.description || null,
          parentId: dept.parentDepartmentId?.toString() || null,
          status: dept.isActive ? 'active' : 'inactive',
          level: dept.level + 1, // Convert 0-based to 1-based
          hasChildren,
          metadata: {
            totalStaff,
            totalPrograms,
            totalCourses
          },
          createdAt: dept.createdAt,
          updatedAt: dept.updatedAt
        };
      })
    );

    return {
      departments: departmentsData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Create a new department
   */
  static async createDepartment(deptData: CreateDepartmentInput): Promise<any> {
    // Validate code pattern
    const codePattern = /^[A-Z0-9-]+$/;
    if (!codePattern.test(deptData.code)) {
      throw ApiError.badRequest('Department code must contain only uppercase letters, numbers, and hyphens');
    }

    // Check if code already exists
    const existingCode = await Department.findOne({ code: deptData.code });
    if (existingCode) {
      throw ApiError.conflict('Department code already exists');
    }

    // Validate parent if provided
    let parentDepartment: IDepartment | null = null;
    if (deptData.parentId) {
      parentDepartment = await Department.findById(deptData.parentId);
      if (!parentDepartment) {
        throw ApiError.notFound('Parent department not found');
      }

      if (!parentDepartment.isActive) {
        throw ApiError.badRequest('Parent department must be active');
      }

      // Check max nesting depth (5 levels)
      if (parentDepartment.level >= 4) { // 0-indexed, so level 4 = 5th level
        throw ApiError.badRequest('Maximum nesting depth (5 levels) would be exceeded');
      }
    }

    // Create department
    const department = new Department({
      name: deptData.name,
      code: deptData.code,
      description: deptData.description,
      parentDepartmentId: deptData.parentId || undefined,
      isActive: deptData.status === 'inactive' ? false : true
    });

    await department.save();

    // Check for children (will be false for new department)
    const hasChildren = false;

    return {
      id: department._id.toString(),
      name: department.name,
      code: department.code,
      description: department.description || null,
      parentId: department.parentDepartmentId?.toString() || null,
      status: department.isActive ? 'active' : 'inactive',
      level: department.level + 1, // Convert 0-based to 1-based
      hasChildren,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt
    };
  }

  /**
   * Get department details by ID
   */
  static async getDepartmentById(deptId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(deptId)) {
      throw ApiError.badRequest('Invalid department ID');
    }

    const department = await Department.findById(deptId);
    if (!department) {
      throw ApiError.notFound('Department not found');
    }

    // Get parent info
    let parent = null;
    if (department.parentDepartmentId) {
      const parentDept = await Department.findById(department.parentDepartmentId);
      if (parentDept) {
        parent = {
          id: parentDept._id.toString(),
          name: parentDept.name,
          code: parentDept.code
        };
      }
    }

    // Get child count
    const childCount = await Department.countDocuments({
      parentDepartmentId: department._id
    });

    const hasChildren = childCount > 0;

    // Get metadata
    const totalStaff = await Staff.countDocuments({
      'departmentMemberships.departmentId': department._id
    });

    const totalPrograms = await Program.countDocuments({
      departmentId: department._id,
      isActive: true
    });

    const totalCourses = await Course.countDocuments({
      departmentId: department._id,
      isActive: true
    });

    // Get active enrollments (programs in this department)
    const programs = await Program.find({
      departmentId: department._id
    }).select('_id');

    const activeEnrollments = await Enrollment.countDocuments({
      programId: { $in: programs.map((p) => p._id) },
      status: 'active'
    });

    return {
      id: department._id.toString(),
      name: department.name,
      code: department.code,
      description: department.description || null,
      parentId: department.parentDepartmentId?.toString() || null,
      parent,
      status: department.isActive ? 'active' : 'inactive',
      level: department.level + 1, // Convert 0-based to 1-based
      hasChildren,
      childCount,
      metadata: {
        totalStaff,
        totalPrograms,
        totalCourses,
        activeEnrollments
      },
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
      createdBy: null, // Would need audit model
      updatedBy: null  // Would need audit model
    };
  }

  /**
   * Update department
   */
  static async updateDepartment(deptId: string, updateData: UpdateDepartmentInput): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(deptId)) {
      throw ApiError.badRequest('Invalid department ID');
    }

    const department = await Department.findById(deptId);
    if (!department) {
      throw ApiError.notFound('Department not found');
    }

    // Validate code pattern if provided
    if (updateData.code) {
      const codePattern = /^[A-Z0-9-]+$/;
      if (!codePattern.test(updateData.code)) {
        throw ApiError.badRequest('Department code must contain only uppercase letters, numbers, and hyphens');
      }

      // Check if code already exists (excluding current department)
      const existingCode = await Department.findOne({
        code: updateData.code,
        _id: { $ne: deptId }
      });
      if (existingCode) {
        throw ApiError.conflict('Department code already exists');
      }
    }

    // Validate parent change if provided
    if (updateData.parentId !== undefined) {
      if (updateData.parentId === null || updateData.parentId === '') {
        // Making top-level
        department.parentDepartmentId = undefined;
      } else {
        // Check if parent exists
        const parentDepartment = await Department.findById(updateData.parentId);
        if (!parentDepartment) {
          throw ApiError.notFound('Parent department not found');
        }

        // Prevent circular reference (can't set parent to self)
        if (updateData.parentId === deptId) {
          throw ApiError.badRequest('Department cannot be its own parent');
        }

        // Prevent circular reference (can't set parent to any descendant)
        const isDescendant = await this.isDescendantOf(updateData.parentId, deptId);
        if (isDescendant) {
          throw ApiError.badRequest('Cannot set parent that would create circular reference');
        }

        // Check max depth
        if (parentDepartment.level >= 4) {
          throw ApiError.badRequest('Maximum nesting depth (5 levels) would be exceeded');
        }

        department.parentDepartmentId = new mongoose.Types.ObjectId(updateData.parentId);
      }
    }

    // Update fields
    if (updateData.name) department.name = updateData.name;
    if (updateData.code) department.code = updateData.code;
    if (updateData.description !== undefined) department.description = updateData.description;
    if (updateData.status) department.isActive = updateData.status === 'active';

    await department.save();

    // Get children status
    const hasChildren = await Department.countDocuments({
      parentDepartmentId: department._id
    }) > 0;

    return {
      id: department._id.toString(),
      name: department.name,
      code: department.code,
      description: department.description || null,
      parentId: department.parentDepartmentId?.toString() || null,
      status: department.isActive ? 'active' : 'inactive',
      level: department.level + 1, // Convert 0-based to 1-based
      hasChildren,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt
    };
  }

  /**
   * Delete department (soft delete)
   */
  static async deleteDepartment(deptId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(deptId)) {
      throw ApiError.badRequest('Invalid department ID');
    }

    const department = await Department.findById(deptId);
    if (!department) {
      throw ApiError.notFound('Department not found');
    }

    // Check for child departments
    const childCount = await Department.countDocuments({
      parentDepartmentId: department._id
    });
    if (childCount > 0) {
      throw ApiError.badRequest('Cannot delete department with child departments');
    }

    // Check for active programs
    const programCount = await Program.countDocuments({
      departmentId: department._id,
      isActive: true
    });
    if (programCount > 0) {
      throw ApiError.badRequest('Cannot delete department with active programs');
    }

    // Check for assigned staff
    const staffCount = await Staff.countDocuments({
      'departmentMemberships.departmentId': department._id
    });
    if (staffCount > 0) {
      throw ApiError.badRequest('Cannot delete department with assigned staff');
    }

    // Perform soft delete (set inactive)
    department.isActive = false;
    await department.save();
  }

  /**
   * Get department hierarchy (ancestors + descendants)
   */
  static async getDepartmentHierarchy(
    deptId: string,
    depth?: number,
    includeInactive: boolean = false
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(deptId)) {
      throw ApiError.badRequest('Invalid department ID');
    }

    const department = await Department.findById(deptId);
    if (!department) {
      throw ApiError.notFound('Department not found');
    }

    // Get ancestors
    const ancestors = [];
    if (department.parentDepartmentId) {
      const ancestorDepts = await Department.find({
        _id: { $in: department.path.filter((id) => id.toString() !== deptId) }
      }).sort({ level: 1 });

      for (const ancestor of ancestorDepts) {
        if (includeInactive || ancestor.isActive) {
          ancestors.push({
            id: ancestor._id.toString(),
            name: ancestor.name,
            code: ancestor.code,
            level: ancestor.level + 1 // Convert 0-based to 1-based
          });
        }
      }
    }

    // Get current department info
    const hasChildren = await Department.countDocuments({
      parentDepartmentId: department._id
    }) > 0;

    const current = {
      id: department._id.toString(),
      name: department.name,
      code: department.code,
      description: department.description || null,
      parentId: department.parentDepartmentId?.toString() || null,
      status: department.isActive ? 'active' : 'inactive',
      level: department.level + 1, // Convert 0-based to 1-based
      hasChildren
    };

    // Get children (recursive)
    const children = await this.getChildrenRecursive(
      department._id.toString(),
      depth,
      includeInactive,
      department.level + 1
    );

    return {
      ancestors,
      current,
      children
    };
  }

  /**
   * Get programs in department
   */
  static async getDepartmentPrograms(deptId: string, filters: GetProgramsFilters): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(deptId)) {
      throw ApiError.badRequest('Invalid department ID');
    }

    const department = await Department.findById(deptId);
    if (!department) {
      throw ApiError.notFound('Department not found');
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build query
    let departmentIds = [department._id];

    // Include child departments if requested
    if (filters.includeChildDepartments) {
      const childDepts = await Department.find({
        path: department._id
      }).select('_id');
      departmentIds = [department._id, ...childDepts.map((d) => d._id)];
    }

    const query: any = {
      departmentId: { $in: departmentIds }
    };

    // Status filter
    if (filters.status === 'active') {
      query.isActive = true;
    } else if (filters.status === 'inactive') {
      query.isActive = false;
    }
    // Note: 'archived' status would need additional field in Program model

    // Execute query
    const [programs, total] = await Promise.all([
      Program.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Program.countDocuments(query)
    ]);

    // Build response
    const programsData = await Promise.all(
      programs.map(async (program) => {
        const dept = await Department.findById(program.departmentId);

        // Get course count (would need ProgramLevel model for accurate count)
        const courseCount = await Course.countDocuments({
          departmentId: program.departmentId
        });

        // Get enrollment count
        const enrollmentCount = await Enrollment.countDocuments({
          programId: program._id,
          status: 'active'
        });

        return {
          id: program._id.toString(),
          name: program.name,
          code: program.code,
          description: program.description || null,
          departmentId: program.departmentId.toString(),
          departmentName: dept?.name || '',
          status: program.isActive ? 'active' : 'inactive',
          levelCount: 0, // Placeholder - would need ProgramLevel model
          courseCount,
          enrollmentCount,
          createdAt: program.createdAt,
          updatedAt: program.updatedAt
        };
      })
    );

    return {
      departmentId: department._id.toString(),
      departmentName: department.name,
      programs: programsData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get staff assigned to department
   */
  static async getDepartmentStaff(deptId: string, filters?: GetStaffFilters): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(deptId)) {
      throw ApiError.badRequest('Invalid department ID');
    }

    const department = await Department.findById(deptId);
    if (!department) {
      throw ApiError.notFound('Department not found');
    }

    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {
      'departmentMemberships.departmentId': department._id
    };

    // Status filter
    if (filters?.status === 'active') {
      query.isActive = true;
    } else if (filters?.status === 'inactive') {
      query.isActive = false;
    }

    // Search filter
    if (filters?.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Execute query
    const allStaff = await Staff.find(query);

    // Filter by role if provided and paginate
    let filteredStaff = allStaff;
    if (filters?.role) {
      filteredStaff = allStaff.filter((staff) => {
        const membership = staff.departmentMemberships.find(
          (m) => m.departmentId.toString() === deptId
        );
        return membership && membership.roles.includes(filters.role!);
      });
    }

    const paginatedStaff = filteredStaff.slice(skip, skip + limit);

    // Build response
    const staffData = paginatedStaff.map((staff) => {
      const membership = staff.departmentMemberships.find(
        (m) => m.departmentId.toString() === deptId
      );

      const departmentRole = membership?.roles[0] || 'instructor';

      return {
        id: staff._id.toString(),
        email: '', // Would need to join with User model
        firstName: staff.person.firstName,
        lastName: staff.person.lastName,
        fullName: `${staff.person.firstName} ${staff.person.lastName}`,
        departmentRole,
        status: staff.isActive ? 'active' : 'inactive',
        assignedCourses: 0, // Placeholder - would need to query Class model
        lastLogin: null, // Would need User model
        joinedDepartmentAt: staff.createdAt,
        permissions: this.getRolePermissions(departmentRole)
      };
    });

    return {
      departmentId: department._id.toString(),
      departmentName: department.name,
      staff: staffData,
      pagination: {
        page,
        limit,
        total: filteredStaff.length,
        totalPages: Math.ceil(filteredStaff.length / limit),
        hasNext: page * limit < filteredStaff.length,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get department statistics
   */
  static async getDepartmentStats(deptId: string, params: GetStatsParams): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(deptId)) {
      throw ApiError.badRequest('Invalid department ID');
    }

    const department = await Department.findById(deptId);
    if (!department) {
      throw ApiError.notFound('Department not found');
    }

    // Get department IDs to include
    let departmentIds = [department._id];
    if (params.includeChildDepartments) {
      const childDepts = await Department.find({
        path: department._id
      }).select('_id');
      departmentIds = [department._id, ...childDepts.map((d) => d._id)];
    }

    // Calculate period date
    const periodDate = this.getPeriodDate(params.period || 'all');

    // Staff statistics
    const allStaff = await Staff.find({
      'departmentMemberships.departmentId': { $in: departmentIds }
    });

    const staffByRole = {
      contentAdmin: 0,
      instructor: 0,
      observer: 0
    };

    let activeStaff = 0;
    let inactiveStaff = 0;

    allStaff.forEach((staff) => {
      if (staff.isActive) activeStaff++;
      else inactiveStaff++;

      const memberships = staff.departmentMemberships.filter((m) =>
        departmentIds.some((id) => id.toString() === m.departmentId.toString())
      );

      memberships.forEach((m) => {
        if (m.roles.includes('content-admin')) staffByRole.contentAdmin++;
        if (m.roles.includes('instructor')) staffByRole.instructor++;
        if (m.roles.includes('observer')) staffByRole.observer++;
      });
    });

    // Program statistics
    const allPrograms = await Program.find({
      departmentId: { $in: departmentIds }
    });

    const programStats = {
      total: allPrograms.length,
      active: allPrograms.filter((p) => p.isActive).length,
      inactive: allPrograms.filter((p) => !p.isActive).length,
      archived: 0 // Would need archived field
    };

    // Course statistics
    const allCourses = await Course.find({
      departmentId: { $in: departmentIds }
    });

    const courseStats = {
      total: allCourses.length,
      published: allCourses.filter((c) => c.isActive).length,
      draft: 0, // Would need status field
      archived: allCourses.filter((c) => !c.isActive).length
    };

    // Enrollment statistics
    const programIds = allPrograms.map((p) => p._id);
    const allEnrollments = await Enrollment.find({
      programId: { $in: programIds }
    });

    const enrollmentStats = {
      total: allEnrollments.length,
      active: allEnrollments.filter((e) => e.status === 'active').length,
      completed: allEnrollments.filter((e) => e.status === 'completed').length,
      withdrawn: allEnrollments.filter((e) => e.status === 'withdrawn').length,
      newThisPeriod: allEnrollments.filter((e) => e.enrollmentDate >= periodDate).length,
      completedThisPeriod: allEnrollments.filter(
        (e) => e.status === 'completed' && e.completionDate && e.completionDate >= periodDate
      ).length
    };

    // Performance metrics
    const completedEnrollments = allEnrollments.filter((e) => e.status === 'completed');
    const averageCompletionRate = allEnrollments.length > 0
      ? completedEnrollments.length / allEnrollments.length
      : 0;

    const enrollmentsWithGPA = completedEnrollments.filter((e) => e.cumulativeGPA !== undefined);
    const averageScore = enrollmentsWithGPA.length > 0
      ? enrollmentsWithGPA.reduce((sum, e) => sum + (e.cumulativeGPA! * 25), 0) / enrollmentsWithGPA.length
      : 0;

    // Top courses (placeholder - would need more complex query)
    const topCourses = await Course.find({
      departmentId: { $in: departmentIds },
      isActive: true
    })
      .limit(5)
      .sort({ createdAt: -1 });

    const topCoursesData = topCourses.map((course) => ({
      courseId: course._id.toString(),
      courseName: course.name,
      enrollmentCount: 0, // Would need to count class enrollments
      completionRate: 0,
      averageScore: 0
    }));

    return {
      departmentId: department._id.toString(),
      departmentName: department.name,
      period: params.period || 'all',
      includesChildren: params.includeChildDepartments || false,
      staff: {
        total: allStaff.length,
        byRole: staffByRole,
        active: activeStaff,
        inactive: inactiveStaff
      },
      programs: programStats,
      courses: courseStats,
      enrollments: enrollmentStats,
      performance: {
        averageCompletionRate,
        averageScore,
        totalTimeSpent: 0, // Would need progress tracking data
        averageTimePerCourse: 0
      },
      topCourses: topCoursesData
    };
  }

  // Helper methods

  /**
   * Check if departmentId is a descendant of ancestorId
   */
  private static async isDescendantOf(departmentId: string, ancestorId: string): Promise<boolean> {
    const dept = await Department.findById(departmentId);
    if (!dept) return false;
    return dept.path.some((id) => id.toString() === ancestorId);
  }

  /**
   * Get children recursively
   */
  private static async getChildrenRecursive(
    parentId: string,
    maxDepth: number | undefined,
    includeInactive: boolean,
    currentLevel: number
  ): Promise<any[]> {
    // Check depth limit
    if (maxDepth !== undefined && currentLevel >= maxDepth + 1) {
      return [];
    }

    const query: any = { parentDepartmentId: parentId };
    if (!includeInactive) {
      query.isActive = true;
    }

    const children = await Department.find(query).sort({ name: 1 });

    const childrenData = await Promise.all(
      children.map(async (child) => {
        const childCount = await Department.countDocuments({
          parentDepartmentId: child._id
        });

        const hasChildren = childCount > 0;

        // Recursively get children
        const grandChildren = await this.getChildrenRecursive(
          child._id.toString(),
          maxDepth,
          includeInactive,
          currentLevel + 1
        );

        return {
          id: child._id.toString(),
          name: child.name,
          code: child.code,
          description: child.description || null,
          status: child.isActive ? 'active' : 'inactive',
          level: child.level + 1, // Convert 0-based to 1-based
          hasChildren,
          childCount,
          children: grandChildren
        };
      })
    );

    return childrenData;
  }

  /**
   * Get role permissions
   */
  private static getRolePermissions(role: string): string[] {
    const permissionMap: Record<string, string[]> = {
      'content-admin': ['read:courses', 'write:courses', 'read:learners', 'read:progress'],
      'instructor': ['read:courses', 'read:learners', 'read:progress'],
      'observer': ['read:courses', 'read:learners', 'read:progress']
    };
    return permissionMap[role] || [];
  }

  /**
   * Get date for period filter
   */
  private static getPeriodDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'quarter':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0); // All time
    }
  }
}
