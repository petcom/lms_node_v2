import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { Learner } from '@/models/auth/Learner.model';
import Department from '@/models/organization/Department.model';
import Course from '@/models/academic/Course.model';
import Program from '@/models/academic/Program.model';
import Enrollment from '@/models/enrollment/Enrollment.model';
import Class from '@/models/academic/Class.model';
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import ContentAttempt from '@/models/content/ContentAttempt.model';
import { ApiError } from '@/utils/ApiError';
import { hashPassword, comparePassword } from '@/utils/password';
import { IPerson, getPrimaryPhone, getPrimaryEmail } from '@/models/auth/Person.types';
import { IStaffPersonExtended } from '@/models/auth/PersonExtended.types';
import { ILearnerPersonExtended } from '@/models/auth/PersonExtended.types';
import { IDemographics } from '@/models/auth/Demographics.types';

/**
 * ⚠️ DEPRECATED - Use person object instead
 * Kept temporarily for backward compatibility
 */
interface UpdateMeInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  profileImage?: string | null;
}

/**
 * NEW: Update person data (v2.0.0)
 */
interface UpdatePersonInput {
  person?: Partial<IPerson>;
}

interface MyCoursesFilters {
  status?: 'draft' | 'published' | 'archived';
  departmentId?: string;
  includeStats?: boolean;
}

interface MyEnrollmentsFilters {
  type?: 'program' | 'course';
  status?: 'enrolled' | 'in_progress' | 'completed' | 'withdrawn';
  includeProgress?: boolean;
}

interface MyProgressTimeframe {
  timeframe?: 'week' | 'month' | 'quarter' | 'year' | 'all';
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export class UsersService {
  /**
   * Get current user profile (role-adaptive)
   * v2.0.0: Returns nested person object
   */
  static async getMe(userId: string): Promise<any> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // ⚠️ BUG FIX: user.roles → user.userTypes
    const userObj: any = {
      id: user._id.toString(),
      email: user.email,
      role: this.determineUserRole(user.userTypes), // ✅ FIXED
      status: user.isActive ? 'active' : 'inactive',
      isActive: user.isActive,
      person: null, // Will be populated below
      createdAt: user.createdAt,
      lastLoginAt: null,
      updatedAt: user.updatedAt
    };

    // Get staff data if applicable
    if (user.userTypes.includes('staff')) {
      const staff = await Staff.findById(user._id);
      if (staff) {
        // ✅ NEW: Return nested person object (v2.0.0)
        userObj.person = staff.person;
        userObj.departments = staff.departmentMemberships.map((dm) => dm.departmentId);
        userObj.departmentRoles = staff.departmentMemberships.map((dm) => ({
          departmentId: dm.departmentId,
          role: dm.roles[0] || 'instructor'
        }));
        userObj.permissions = this.extractPermissions(staff.departmentMemberships);
      }
    }

    // Get learner data if applicable
    if (user.userTypes.includes('learner')) {
      const learner = await Learner.findById(user._id);
      if (learner) {
        // ✅ NEW: Return nested person object (v2.0.0)
        userObj.person = learner.person;
        userObj.studentId = user._id.toString();

        // Get program and course enrollments
        const programEnrollments = await Enrollment.find({
          learnerId: user._id,
          status: { $in: ['active', 'pending'] }
        }).select('programId');

        const courseEnrollments = await ClassEnrollment.find({
          learnerId: user._id,
          status: { $in: ['enrolled', 'active'] }
        }).select('classId');

        userObj.programEnrollments = programEnrollments.map((e) => e.programId);
        userObj.courseEnrollments = courseEnrollments.map((e) => e.classId);
      }
    }

    return userObj;
  }

  /**
   * Update current user profile
   * ⚠️ DEPRECATED: Use updateMyPerson instead for v2.0.0 structure
   * This method provides backward compatibility for legacy flat structure
   */
  static async updateMe(userId: string, updateData: UpdateMeInput): Promise<any> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Validate input
    if (updateData.firstName !== undefined && updateData.firstName.trim().length === 0) {
      throw ApiError.badRequest('First name cannot be empty');
    }
    if (updateData.lastName !== undefined && updateData.lastName.trim().length === 0) {
      throw ApiError.badRequest('Last name cannot be empty');
    }

    // Update staff or learner record with new person structure
    if (user.userTypes.includes('staff')) {
      const staff = await Staff.findById(user._id);
      if (staff && staff.person) {
        // Update person object fields
        if (updateData.firstName) staff.person.firstName = updateData.firstName;
        if (updateData.lastName) staff.person.lastName = updateData.lastName;
        if (updateData.phone !== undefined) {
          // Update primary phone or create new one
          const primaryPhone = getPrimaryPhone(staff.person);
          if (primaryPhone) {
            primaryPhone.number = updateData.phone;
          } else if (updateData.phone) {
            staff.person.phones.push({
              number: updateData.phone,
              type: 'mobile',
              isPrimary: true,
              verified: false,
              allowSMS: true
            });
          }
        }
        if (updateData.profileImage !== undefined) {
          staff.person.avatar = updateData.profileImage;
        }
        await staff.save();
      }
    }

    if (user.userTypes.includes('learner')) {
      const learner = await Learner.findById(user._id);
      if (learner && learner.person) {
        // Update person object fields
        if (updateData.firstName) learner.person.firstName = updateData.firstName;
        if (updateData.lastName) learner.person.lastName = updateData.lastName;
        if (updateData.phone !== undefined) {
          // Update primary phone or create new one
          const primaryPhone = getPrimaryPhone(learner.person);
          if (primaryPhone) {
            primaryPhone.number = updateData.phone;
          } else if (updateData.phone) {
            learner.person.phones.push({
              number: updateData.phone,
              type: 'mobile',
              isPrimary: true,
              verified: false,
              allowSMS: true
            });
          }
        }
        if (updateData.profileImage !== undefined) {
          learner.person.avatar = updateData.profileImage;
        }
        await learner.save();
      }
    }

    // Return updated profile
    return this.getMe(userId);
  }

  /**
   * Get department assignments for staff
   */
  static async getMyDepartments(userId: string): Promise<any> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Check if user is staff
    if (!user.userTypes.includes('staff')) {
      throw ApiError.forbidden('Only staff users can access this endpoint');
    }

    const staff = await Staff.findById(user._id);
    if (!staff) {
      throw ApiError.notFound('Staff record not found');
    }

    const departments = [];
    for (const membership of staff.departmentMemberships) {
      const department = await Department.findById(membership.departmentId);
      if (department) {
        // Get department stats
        const totalPrograms = await Program.countDocuments({
          departmentId: department._id,
          isActive: true
        });

        const totalCourses = await Course.countDocuments({
          departmentId: department._id,
          isActive: true
        });

        const activeEnrollments = await Enrollment.countDocuments({
          programId: { $in: await Program.find({ departmentId: department._id }).select('_id') },
          status: 'active'
        });

        departments.push({
          id: department._id.toString(),
          name: department.name,
          code: department.code,
          description: department.description || null,
          parentDepartment: department.parentDepartmentId || null,
          userRole: membership.roles[0] || 'instructor',
          assignedAt: staff.createdAt,
          permissions: this.getRolePermissions(membership.roles[0]),
          isActive: department.isActive,
          stats: {
            totalPrograms,
            totalCourses,
            activeEnrollments
          }
        });
      }
    }

    return { departments };
  }

  /**
   * Get courses assigned to instructor
   */
  static async getMyCourses(userId: string, filters: MyCoursesFilters): Promise<any> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Check if user is staff
    if (!user.userTypes.includes('staff')) {
      throw ApiError.forbidden('Only staff users can access this endpoint');
    }

    const staff = await Staff.findById(user._id);
    if (!staff) {
      throw ApiError.notFound('Staff record not found');
    }

    // Build query for classes where user is instructor
    const query: any = { instructorIds: user._id, isActive: true };

    if (filters.departmentId) {
      const courses = await Course.find({
        departmentId: filters.departmentId
      }).select('_id');
      query.courseId = { $in: courses.map((c) => c._id) };
    }

    const classes = await Class.find(query)
      .populate('courseId')
      .populate('academicYearId')
      .sort({ createdAt: -1 });

    const coursesData = [];
    for (const classDoc of classes) {
      const course = classDoc.courseId as any;
      if (!course) continue;

      // Filter by status if provided
      const courseStatus = this.determineCourseStatus(classDoc);
      if (filters.status && courseStatus !== filters.status) continue;

      const department = await Department.findById(course.departmentId);
      const program = await Program.findOne({
        departmentId: course.departmentId
      }).limit(1);

      // Determine instructor role (primary if first in list, otherwise secondary)
      const instructorIds = classDoc.instructorIds.map((id) => id.toString());
      const role = instructorIds[0] === userId ? 'primary' : 'secondary';

      const courseData: any = {
        id: classDoc._id.toString(),
        title: course.name,
        code: course.code,
        description: course.description || null,
        status: courseStatus,
        role,
        department: {
          id: department?._id.toString() || '',
          name: department?.name || '',
          code: department?.code || ''
        },
        program: {
          id: program?._id.toString() || '',
          name: program?.name || ''
        },
        level: {
          id: classDoc.academicYearId.toString(),
          name: 'Year 1'
        },
        assignedAt: classDoc.createdAt,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt
      };

      // Add stats if requested
      if (filters.includeStats) {
        const activeEnrollments = await ClassEnrollment.countDocuments({
          classId: classDoc._id,
          status: { $in: ['enrolled', 'active'] }
        });

        const totalEnrollments = await ClassEnrollment.countDocuments({
          classId: classDoc._id
        });

        const completedEnrollments = await ClassEnrollment.countDocuments({
          classId: classDoc._id,
          status: 'completed'
        });

        courseData.stats = {
          activeEnrollments,
          totalModules: 0, // Would need CourseContent model
          completionRate: totalEnrollments > 0 ? completedEnrollments / totalEnrollments : 0,
          averageProgress: 0.5 // Placeholder
        };
      }

      coursesData.push(courseData);
    }

    return { courses: coursesData };
  }

  /**
   * Get enrollments for learner
   */
  static async getMyEnrollments(userId: string, filters: MyEnrollmentsFilters): Promise<any> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const programs = [];
    const courses = [];

    // Get program enrollments
    if (!filters.type || filters.type === 'program') {
      const query: any = { learnerId: user._id };
      if (filters.status) {
        query.status = this.mapEnrollmentStatus(filters.status);
      }

      const programEnrollments = await Enrollment.find(query)
        .populate('programId')
        .populate('academicYearId');

      for (const enrollment of programEnrollments) {
        const program = enrollment.programId as any;
        if (!program) continue;

        const department = await Department.findById(program.departmentId);

        const programData: any = {
          enrollmentId: enrollment._id.toString(),
          enrollmentType: 'program',
          program: {
            id: program._id.toString(),
            name: program.name,
            code: program.code,
            department: {
              id: department?._id.toString() || '',
              name: department?.name || ''
            }
          },
          level: {
            id: enrollment.academicYearId.toString(),
            name: 'Year 1'
          },
          credentialGoal: this.mapProgramTypeToCredential(program.type),
          status: this.mapEnrollmentStatusToContract(enrollment.status),
          enrolledAt: enrollment.enrollmentDate,
          startedAt: enrollment.startDate || null,
          completedAt: enrollment.completionDate || null
        };

        // Add progress if requested
        if (filters.includeProgress !== false) {
          const courseEnrollments = await ClassEnrollment.find({
            learnerId: user._id
          });

          const completed = courseEnrollments.filter((e) => e.status === 'completed').length;
          const total = courseEnrollments.length;

          programData.progress = {
            completionPercent: total > 0 ? completed / total : 0,
            coursesCompleted: completed,
            coursesTotal: total,
            currentCourses: courseEnrollments
              .filter((e) => e.status === 'active')
              .map((e) => e.classId.toString())
          };
        }

        programs.push(programData);
      }
    }

    // Get course enrollments
    if (!filters.type || filters.type === 'course') {
      const query: any = { learnerId: user._id };
      if (filters.status) {
        query.status = this.mapCourseEnrollmentStatus(filters.status);
      }

      const courseEnrollments = await ClassEnrollment.find(query)
        .populate('classId');

      for (const enrollment of courseEnrollments) {
        const classDoc = enrollment.classId as any;
        if (!classDoc) continue;

        const course = await Course.findById(classDoc.courseId);
        if (!course) continue;

        const department = await Department.findById(course.departmentId);
        const program = await Program.findOne({
          departmentId: course.departmentId
        }).limit(1);

        const courseData: any = {
          enrollmentId: enrollment._id.toString(),
          enrollmentType: 'course',
          course: {
            id: classDoc._id.toString(),
            title: course.name,
            code: course.code,
            department: {
              id: department?._id.toString() || '',
              name: department?.name || ''
            }
          },
          program: {
            id: program?._id.toString() || '',
            name: program?.name || ''
          },
          status: this.mapEnrollmentStatusToContract(enrollment.status),
          enrolledAt: enrollment.enrollmentDate,
          startedAt: enrollment.enrollmentDate,
          completedAt: enrollment.completionDate || null
        };

        // Add progress if requested
        if (filters.includeProgress !== false) {
          const attempts = await ContentAttempt.find({
            learnerId: user._id
          });

          const completedAttempts = attempts.filter((a) => a.status === 'completed').length;

          courseData.progress = {
            progressPercent: enrollment.gradePercentage ? enrollment.gradePercentage / 100 : 0,
            modulesCompleted: completedAttempts,
            modulesTotal: 10, // Placeholder
            currentScore: enrollment.gradePercentage || null,
            lastAccessedAt: enrollment.updatedAt
          };
        }

        courses.push(courseData);
      }
    }

    return { programs, courses };
  }

  /**
   * Change user password
   * Requires current password for verification
   * ISS-001: Password change endpoint implementation
   */
  static async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    // Get user with password field (normally excluded by select: false)
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Verify current password
    const isValidPassword = await comparePassword(input.currentPassword, user.password);
    if (!isValidPassword) {
      throw ApiError.unauthorized('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await hashPassword(input.newPassword);

    // Update password
    user.password = hashedPassword;
    await user.save();
  }

  /**
   * Get learning progress summary
   */
  static async getMyProgress(userId: string, params: MyProgressTimeframe): Promise<any> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Get all enrollments
    const programEnrollments = await Enrollment.find({ learnerId: user._id });
    const courseEnrollments = await ClassEnrollment.find({ learnerId: user._id });

    // Calculate overview
    const totalEnrollments = programEnrollments.length + courseEnrollments.length;
    const activeEnrollments =
      programEnrollments.filter((e) => e.status === 'active').length +
      courseEnrollments.filter((e) => e.status === 'active').length;
    const completedCourses = courseEnrollments.filter((e) => e.status === 'completed').length;

    // Calculate average score
    const gradesArray = courseEnrollments
      .filter((e) => e.gradePercentage !== undefined && e.gradePercentage !== null)
      .map((e) => e.gradePercentage!);
    const averageScore = gradesArray.length > 0
      ? gradesArray.reduce((sum, grade) => sum + grade, 0) / gradesArray.length
      : null;

    const overallProgress = totalEnrollments > 0
      ? (completedCourses / totalEnrollments)
      : 0;

    // Programs breakdown
    const programsDetails = [];
    for (const enrollment of programEnrollments) {
      const program = await Program.findById(enrollment.programId);
      if (program) {
        programsDetails.push({
          programId: program._id.toString(),
          programName: program.name,
          progress: enrollment.totalCreditsEarned || 0,
          status: enrollment.status
        });
      }
    }

    // Get recent activity
    const timeframeDate = this.getTimeframeDate(params.timeframe || 'all');
    const attempts = await ContentAttempt.find({
      learnerId: user._id,
      createdAt: { $gte: timeframeDate }
    })
      .sort({ createdAt: -1 })
      .limit(10);

    const recentActivity = await Promise.all(
      attempts.map(async (attempt) => {
        return {
          activityType: this.mapAttemptStatusToActivityType(attempt.status),
          contentId: attempt.contentId.toString(),
          contentTitle: 'Content Item', // Would need to populate
          contentType: 'module' as const,
          timestamp: attempt.createdAt,
          score: attempt.score || null,
          status: attempt.status
        };
      })
    );

    // Calculate stats
    const totalTimeSpent = attempts.reduce((sum, a) => sum + (a.timeSpentSeconds || 0), 0);
    const totalAttempts = attempts.length;
    const assessmentsPassed = attempts.filter((a) => a.status === 'completed' && (a.score || 0) >= 70).length;

    return {
      overview: {
        totalEnrollments,
        activeEnrollments,
        completedCourses,
        overallProgress,
        averageScore
      },
      programs: {
        total: programEnrollments.length,
        inProgress: programEnrollments.filter((e) => e.status === 'active').length,
        completed: programEnrollments.filter((e) => e.status === 'completed').length,
        details: programsDetails
      },
      courses: {
        total: courseEnrollments.length,
        inProgress: courseEnrollments.filter((e) => e.status === 'active').length,
        completed: completedCourses,
        notStarted: courseEnrollments.filter((e) => e.status === 'enrolled').length
      },
      recentActivity,
      stats: {
        totalTimeSpent,
        totalAttempts,
        assessmentsPassed,
        currentStreak: 0, // Would need daily activity tracking
        lastActivityAt: attempts.length > 0 ? attempts[0].createdAt : null
      }
    };
  }

  // Helper methods
  private static determineUserRole(userTypes: string[]): string {
    if (userTypes.includes('global-admin')) return 'global-admin';
    if (userTypes.includes('staff')) return 'staff';
    if (userTypes.includes('learner')) return 'learner';
    return 'learner';
  }

  private static extractPermissions(memberships: any[]): string[] {
    const permissions = new Set<string>();
    memberships.forEach((m) => {
      m.roles.forEach((role: string) => {
        this.getRolePermissions(role).forEach((p) => permissions.add(p));
      });
    });
    return Array.from(permissions);
  }

  private static getRolePermissions(role: string): string[] {
    const permissionMap: Record<string, string[]> = {
      'instructor': ['content:read', 'content:write', 'courses:manage', 'learners:view'],
      'content-admin': ['content:read', 'content:write', 'content:publish'],
      'department-admin': ['content:read', 'content:write', 'courses:manage', 'learners:view', 'staff:manage'],
      'billing-admin': ['billing:read', 'billing:write'],
      'system-admin': ['*']
    };
    return permissionMap[role] || ['content:read'];
  }

  private static determineCourseStatus(classDoc: any): 'draft' | 'published' | 'archived' {
    const now = new Date();
    if (classDoc.endDate < now) return 'archived';
    if (classDoc.startDate > now) return 'draft';
    return 'published';
  }

  private static mapEnrollmentStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'enrolled': 'pending',
      'in_progress': 'active',
      'completed': 'completed',
      'withdrawn': 'withdrawn'
    };
    return statusMap[status] || status;
  }

  private static mapCourseEnrollmentStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'enrolled': 'enrolled',
      'in_progress': 'active',
      'completed': 'completed',
      'withdrawn': 'withdrawn'
    };
    return statusMap[status] || status;
  }

  private static mapEnrollmentStatusToContract(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'enrolled',
      'active': 'in_progress',
      'completed': 'completed',
      'withdrawn': 'withdrawn',
      'enrolled': 'enrolled'
    };
    return statusMap[status] || status;
  }

  private static mapProgramTypeToCredential(type: string): 'certificate' | 'diploma' | 'degree' {
    if (type === 'certificate') return 'certificate';
    if (type === 'diploma') return 'diploma';
    return 'degree';
  }

  private static mapAttemptStatusToActivityType(status: string): string {
    if (status === 'completed') return 'completion';
    if (status === 'in-progress') return 'attempt';
    return 'attempt';
  }

  private static getTimeframeDate(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
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

  // ============================================================================
  // NEW v2.0.0: Person & Demographics Endpoints
  // ============================================================================

  /**
   * Get current user's person data (IPerson Basic)
   */
  static async getMyPerson(userId: string): Promise<IPerson> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Get person data from staff or learner record
    if (user.userTypes.includes('staff')) {
      const staff = await Staff.findById(user._id);
      if (!staff || !staff.person) {
        throw ApiError.notFound('Person data not found');
      }
      return staff.person;
    }

    if (user.userTypes.includes('learner')) {
      const learner = await Learner.findById(user._id);
      if (!learner || !learner.person) {
        throw ApiError.notFound('Person data not found');
      }
      return learner.person;
    }

    throw ApiError.notFound('Person data not found');
  }

  /**
   * Update current user's person data
   */
  static async updateMyPerson(userId: string, personData: Partial<IPerson>): Promise<IPerson> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Update person data in staff or learner record
    if (user.userTypes.includes('staff')) {
      const staff = await Staff.findById(user._id);
      if (!staff || !staff.person) {
        throw ApiError.notFound('Person data not found');
      }

      // Merge updates
      Object.assign(staff.person, personData);
      await staff.save();
      return staff.person;
    }

    if (user.userTypes.includes('learner')) {
      const learner = await Learner.findById(user._id);
      if (!learner || !learner.person) {
        throw ApiError.notFound('Person data not found');
      }

      // Merge updates
      Object.assign(learner.person, personData);
      await learner.save();
      return learner.person;
    }

    throw ApiError.notFound('Person data not found');
  }

  /**
   * Get current user's extended person data (role-specific)
   */
  static async getMyPersonExtended(userId: string): Promise<any> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Get extended data from staff or learner record
    if (user.userTypes.includes('staff')) {
      const staff = await Staff.findById(user._id);
      if (!staff) {
        throw ApiError.notFound('Staff record not found');
      }

      return {
        role: 'staff',
        staff: staff.personExtended || {}
      };
    }

    if (user.userTypes.includes('learner')) {
      const learner = await Learner.findById(user._id);
      if (!learner) {
        throw ApiError.notFound('Learner record not found');
      }

      return {
        role: 'learner',
        learner: learner.personExtended || {}
      };
    }

    throw ApiError.notFound('Extended person data not found');
  }

  /**
   * Update current user's extended person data
   */
  static async updateMyPersonExtended(userId: string, extendedData: any): Promise<any> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Update extended data in staff or learner record
    if (user.userTypes.includes('staff')) {
      const staff = await Staff.findById(user._id);
      if (!staff) {
        throw ApiError.notFound('Staff record not found');
      }

      // Initialize if not exists
      if (!staff.personExtended) {
        staff.personExtended = {} as IStaffPersonExtended;
      }

      // Merge updates
      Object.assign(staff.personExtended, extendedData);
      await staff.save();

      return staff.personExtended;
    }

    if (user.userTypes.includes('learner')) {
      const learner = await Learner.findById(user._id);
      if (!learner) {
        throw ApiError.notFound('Learner record not found');
      }

      // Initialize if not exists
      if (!learner.personExtended) {
        learner.personExtended = {} as ILearnerPersonExtended;
      }

      // Merge updates
      Object.assign(learner.personExtended, extendedData);
      await learner.save();

      return learner.personExtended;
    }

    throw ApiError.notFound('Extended person data not found');
  }

  /**
   * Get current user's demographics data
   */
  static async getMyDemographics(userId: string): Promise<IDemographics> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Get demographics from staff or learner record
    if (user.userTypes.includes('staff')) {
      const staff = await Staff.findById(user._id);
      if (!staff) {
        throw ApiError.notFound('Staff record not found');
      }
      return staff.demographics || {} as IDemographics;
    }

    if (user.userTypes.includes('learner')) {
      const learner = await Learner.findById(user._id);
      if (!learner) {
        throw ApiError.notFound('Learner record not found');
      }
      return learner.demographics || {} as IDemographics;
    }

    throw ApiError.notFound('Demographics data not found');
  }

  /**
   * Update current user's demographics data
   */
  static async updateMyDemographics(userId: string, demographicsData: Partial<IDemographics>): Promise<IDemographics> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Update demographics in staff or learner record
    if (user.userTypes.includes('staff')) {
      const staff = await Staff.findById(user._id);
      if (!staff) {
        throw ApiError.notFound('Staff record not found');
      }

      // Initialize if not exists
      if (!staff.demographics) {
        staff.demographics = {} as IDemographics;
      }

      // Merge updates and set lastUpdated
      Object.assign(staff.demographics, demographicsData);
      staff.demographics.lastUpdated = new Date();
      await staff.save();

      return staff.demographics;
    }

    if (user.userTypes.includes('learner')) {
      const learner = await Learner.findById(user._id);
      if (!learner) {
        throw ApiError.notFound('Learner record not found');
      }

      // Initialize if not exists
      if (!learner.demographics) {
        learner.demographics = {} as IDemographics;
      }

      // Merge updates and set lastUpdated
      Object.assign(learner.demographics, demographicsData);
      learner.demographics.lastUpdated = new Date();
      await learner.save();

      return learner.demographics;
    }

    throw ApiError.notFound('Demographics data not found');
  }
}
