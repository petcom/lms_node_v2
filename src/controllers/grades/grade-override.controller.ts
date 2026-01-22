import { Request, Response, NextFunction } from 'express';
import { GradeOverrideService } from '@/services/grades/grade-override.service';

const gradeOverrideService = new GradeOverrideService();

/**
 * Override grade for an enrollment
 *
 * @route PUT /api/v1/enrollments/:enrollmentId/grades/override
 * @access Private - Requires grades:override permission + dept-admin role
 */
export const overrideGrade = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { enrollmentId } = req.params;
    const { gradeLetter, gradePercentage, gradePoints, reason, previousGradeLetter, previousGradePercentage, previousGradePoints } = req.body;
    const adminUserId = req.user!.userId;

    const result = await gradeOverrideService.overrideGrade(
      enrollmentId,
      {
        gradeLetter,
        gradePercentage,
        gradePoints,
        reason,
        previousGradeLetter,
        previousGradePercentage,
        previousGradePoints
      },
      adminUserId
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get grade change history for an enrollment
 *
 * @route GET /api/v1/enrollments/:enrollmentId/grades/history
 * @access Private - Requires grades:override permission (dept-admin)
 */
export const getGradeHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { enrollmentId } = req.params;
    const { startDate, endDate } = req.query;

    const history = await gradeOverrideService.getGradeChangeHistory(
      enrollmentId,
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      }
    );

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all grade overrides made by the current admin
 *
 * @route GET /api/v1/admin/grade-overrides
 * @access Private - Requires grades:override permission (dept-admin)
 */
export const getMyGradeOverrides = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const adminUserId = req.user!.userId;
    const { startDate, endDate, departmentId } = req.query;

    const overrides = await gradeOverrideService.getAdminGradeOverrides(
      adminUserId,
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        departmentId: departmentId as string | undefined
      }
    );

    res.status(200).json({
      success: true,
      data: overrides
    });
  } catch (error) {
    next(error);
  }
};
