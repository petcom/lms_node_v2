import mongoose from 'mongoose';
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import GradeChangeLog from '@/models/audit/GradeChangeLog.model';
import { Staff } from '@/models/auth/Staff.model';
import { User } from '@/models/auth/User.model';
import { ApiError } from '@/utils/ApiError';

interface GradeOverrideInput {
  gradeLetter?: string;
  gradePercentage?: number;
  gradePoints?: number;
  reason: string;
  previousGradeLetter?: string;
  previousGradePercentage?: number;
  previousGradePoints?: number;
}

interface GradeOverrideResult {
  enrollmentId: string;
  gradeChanges: {
    gradeLetter?: { previous?: string; new?: string };
    gradePercentage?: { previous?: number; new?: number };
    gradePoints?: { previous?: number; new?: number };
  };
  overrideBy: string;
  overrideByName: string;
  overrideAt: Date;
  reason: string;
  changeLogId: string;
}

/**
 * GradeOverrideService
 *
 * Handles grade override operations with mandatory audit logging.
 * All grade changes create immutable audit trail entries.
 *
 * Security:
 * - Requires grades:override permission
 * - Requires dept-admin role in course's department
 * - All changes logged with: who, what, when, why
 */
export class GradeOverrideService {
  /**
   * Override grade for an enrollment with audit logging
   *
   * @param enrollmentId - ClassEnrollment ID
   * @param overrideData - New grade values and reason
   * @param adminUserId - User ID of admin making the change
   * @returns Grade override result with audit log ID
   * @throws ApiError if validation fails or permission denied
   */
  async overrideGrade(
    enrollmentId: string,
    overrideData: GradeOverrideInput,
    adminUserId: string
  ): Promise<GradeOverrideResult> {
    // 1. Validate input
    if (!overrideData.reason || overrideData.reason.trim().length < 10) {
      throw new ApiError(422, 'Reason is required and must be at least 10 characters');
    }

    if (!overrideData.gradeLetter && !overrideData.gradePercentage && !overrideData.gradePoints) {
      throw new ApiError(422, 'At least one grade field must be provided');
    }

    this.validateGradeValues(overrideData);

    // 2. Load enrollment with populated class → course → department
    const enrollment = await ClassEnrollment.findById(enrollmentId)
      .populate({
        path: 'classId',
        populate: {
          path: 'courseId',
          populate: { path: 'departmentId' }
        }
      })
      .exec();

    if (!enrollment) {
      throw new ApiError(404, 'Enrollment not found');
    }

    const classData = enrollment.classId as any;
    const courseData = classData?.courseId as any;
    const departmentId = courseData?.departmentId;

    if (!departmentId) {
      throw new ApiError(500, 'Could not determine department for enrollment');
    }

    // 3. Verify admin has permission
    const permissionCheck = await this.verifyOverridePermission(adminUserId, enrollmentId);
    if (!permissionCheck.allowed) {
      throw new ApiError(403, permissionCheck.reason || 'Permission denied');
    }

    // 4. Load admin user for audit trail
    const adminUser = await Staff.findById(adminUserId)
      .populate('person')
      .exec();

    if (!adminUser) {
      throw new ApiError(404, 'Admin user not found');
    }

    const adminName = `${adminUser.person?.firstName || ''} ${adminUser.person?.lastName || ''}`.trim() || 'Unknown Admin';

    // 5. Prepare grade changes
    const gradeChanges: any = {};
    const previousValues: any = {};
    const newValues: any = {};

    if (overrideData.gradeLetter !== undefined) {
      gradeChanges.gradeLetter = {
        previous: enrollment.gradeLetter,
        new: overrideData.gradeLetter
      };
      previousValues.gradeLetter = enrollment.gradeLetter;
      newValues.gradeLetter = overrideData.gradeLetter;
    }

    if (overrideData.gradePercentage !== undefined) {
      gradeChanges.gradePercentage = {
        previous: enrollment.gradePercentage,
        new: overrideData.gradePercentage
      };
      previousValues.gradePercentage = enrollment.gradePercentage;
      newValues.gradePercentage = overrideData.gradePercentage;
    }

    if (overrideData.gradePoints !== undefined) {
      gradeChanges.gradePoints = {
        previous: enrollment.gradePoints,
        new: overrideData.gradePoints
      };
      previousValues.gradePoints = enrollment.gradePoints;
      newValues.gradePoints = overrideData.gradePoints;
    }

    // 6. Create immutable audit log entry
    const changeLog = await GradeChangeLog.create({
      enrollmentId: enrollment._id,
      classId: enrollment.classId,
      courseId: courseData._id,
      learnerId: enrollment.learnerId,
      fieldChanged: Object.keys(gradeChanges).length > 1 ? 'all' : Object.keys(gradeChanges)[0],
      previousGradeLetter: previousValues.gradeLetter,
      newGradeLetter: newValues.gradeLetter,
      previousGradePercentage: previousValues.gradePercentage,
      newGradePercentage: newValues.gradePercentage,
      previousGradePoints: previousValues.gradePoints,
      newGradePoints: newValues.gradePoints,
      changedBy: adminUserId,
      changedByRole: 'dept-admin',
      changedAt: new Date(),
      reason: overrideData.reason.trim(),
      changeType: 'override',
      departmentId: departmentId._id || departmentId,
      termId: classData.termId
    });

    // 7. Update enrollment with new grade values
    if (newValues.gradeLetter !== undefined) {
      enrollment.gradeLetter = newValues.gradeLetter;
    }
    if (newValues.gradePercentage !== undefined) {
      enrollment.gradePercentage = newValues.gradePercentage;
    }
    if (newValues.gradePoints !== undefined) {
      enrollment.gradePoints = newValues.gradePoints;
    }

    await enrollment.save();

    // 8. Return result
    return {
      enrollmentId: enrollment._id.toString(),
      gradeChanges,
      overrideBy: adminUserId,
      overrideByName: adminName,
      overrideAt: changeLog.changedAt,
      reason: changeLog.reason,
      changeLogId: changeLog._id.toString()
    };
  }

  /**
   * Get grade change history for an enrollment
   *
   * @param enrollmentId - ClassEnrollment ID
   * @param filters - Optional date range filters
   * @returns Array of grade change log entries
   */
  async getGradeChangeHistory(
    enrollmentId: string,
    filters?: { startDate?: Date; endDate?: Date }
  ): Promise<any[]> {
    const query: any = { enrollmentId };

    if (filters?.startDate || filters?.endDate) {
      query.changedAt = {};
      if (filters.startDate) {
        query.changedAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.changedAt.$lte = filters.endDate;
      }
    }

    const history = await GradeChangeLog.find(query)
      .sort({ changedAt: -1 })
      .exec();

    return history.map(log => ({
      id: log._id.toString(),
      enrollmentId: log.enrollmentId.toString(),
      classId: log.classId.toString(),
      courseId: log.courseId.toString(),
      learnerId: log.learnerId.toString(),
      fieldChanged: log.fieldChanged,
      previousGradeLetter: log.previousGradeLetter,
      newGradeLetter: log.newGradeLetter,
      previousGradePercentage: log.previousGradePercentage,
      newGradePercentage: log.newGradePercentage,
      previousGradePoints: log.previousGradePoints,
      newGradePoints: log.newGradePoints,
      changedBy: log.changedBy.toString(),
      changedByRole: log.changedByRole,
      changedAt: log.changedAt.toISOString(),
      reason: log.reason,
      changeType: log.changeType,
      departmentId: log.departmentId.toString(),
      termId: log.termId?.toString()
    }));
  }

  /**
   * Get all grade overrides made by a specific admin
   *
   * @param adminUserId - User ID
   * @param filters - Optional filters
   * @returns Array of grade change log entries
   */
  async getAdminGradeOverrides(
    adminUserId: string,
    filters?: { startDate?: Date; endDate?: Date; departmentId?: string }
  ): Promise<any[]> {
    const query: any = { changedBy: adminUserId };

    if (filters?.departmentId) {
      query.departmentId = filters.departmentId;
    }

    if (filters?.startDate || filters?.endDate) {
      query.changedAt = {};
      if (filters.startDate) {
        query.changedAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.changedAt.$lte = filters.endDate;
      }
    }

    const history = await GradeChangeLog.find(query)
      .sort({ changedAt: -1 })
      .exec();

    return history.map(log => ({
      id: log._id.toString(),
      enrollmentId: log.enrollmentId.toString(),
      classId: log.classId.toString(),
      courseId: log.courseId.toString(),
      learnerId: log.learnerId.toString(),
      fieldChanged: log.fieldChanged,
      previousGradeLetter: log.previousGradeLetter,
      newGradeLetter: log.newGradeLetter,
      previousGradePercentage: log.previousGradePercentage,
      newGradePercentage: log.newGradePercentage,
      previousGradePoints: log.previousGradePoints,
      newGradePoints: log.newGradePoints,
      changedBy: log.changedBy.toString(),
      changedByRole: log.changedByRole,
      changedAt: log.changedAt.toISOString(),
      reason: log.reason,
      changeType: log.changeType,
      departmentId: log.departmentId.toString(),
      termId: log.termId?.toString()
    }));
  }

  /**
   * Verify admin has permission to override grade
   *
   * @param userId - User ID to check
   * @param enrollmentId - Target enrollment
   * @returns Permission check result
   */
  async verifyOverridePermission(
    userId: string,
    enrollmentId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    // 1. Load user
    const user = await User.findById(userId).exec();
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // 2. Load enrollment with course department
    const enrollment = await ClassEnrollment.findById(enrollmentId)
      .populate({
        path: 'classId',
        populate: {
          path: 'courseId',
          populate: { path: 'departmentId' }
        }
      })
      .exec();

    if (!enrollment) {
      return { allowed: false, reason: 'Enrollment not found' };
    }

    const classData = enrollment.classId as any;
    const courseData = classData?.courseId as any;
    const departmentId = courseData?.departmentId?._id || courseData?.departmentId;

    if (!departmentId) {
      return { allowed: false, reason: 'Could not determine department' };
    }

    // 3. Load staff record to check dept-admin membership
    const staff = await Staff.findById(userId).exec();
    if (!staff) {
      return {
        allowed: false,
        reason: 'User is not a staff member'
      };
    }

    // 4. Check if user has dept-admin role in the course's department
    const isDeptAdminInDepartment = staff.departmentMemberships?.some(
      (membership: any) =>
        membership.departmentId.toString() === departmentId.toString() &&
        membership.roles.includes('dept-admin')
    );

    if (!isDeptAdminInDepartment) {
      return {
        allowed: false,
        reason: 'Must be department admin for this course\'s department'
      };
    }

    // All checks passed
    return { allowed: true };
  }

  /**
   * Validate grade values are in acceptable ranges
   *
   * @param gradeData - Grade values to validate
   * @throws ApiError if validation fails
   */
  private validateGradeValues(gradeData: Partial<GradeOverrideInput>): void {
    if (gradeData.gradePercentage !== undefined) {
      if (gradeData.gradePercentage < 0 || gradeData.gradePercentage > 100) {
        throw new ApiError(422, 'Grade percentage must be between 0 and 100');
      }
    }

    if (gradeData.gradePoints !== undefined) {
      if (gradeData.gradePoints < 0 || gradeData.gradePoints > 4.0) {
        throw new ApiError(422, 'Grade points must be between 0 and 4.0');
      }
    }

    if (gradeData.gradeLetter !== undefined) {
      const validLetterGrades = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
      if (!validLetterGrades.includes(gradeData.gradeLetter)) {
        throw new ApiError(422, `Grade letter must be one of: ${validLetterGrades.join(', ')}`);
      }
    }
  }
}

export default new GradeOverrideService();
