import mongoose from 'mongoose';
import Enrollment from '@/models/enrollment/Enrollment.model';
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import ScormAttempt from '@/models/activity/ScormAttempt.model';
import ExamResult from '@/models/activity/ExamResult.model';
import Program from '@/models/academic/Program.model';
import Course from '@/models/academic/Course.model';
import Class from '@/models/academic/Class.model';
import CourseContent from '@/models/content/CourseContent.model';
import { Learner } from '@/models/auth/Learner.model';
import { User } from '@/models/auth/User.model';
import { ApiError } from '@/utils/ApiError';

/**
 * Progress Tracking Service
 * Implements all progress tracking logic for programs, courses, classes, and learners
 */

interface ProgramProgressParams {
  programId: string;
  learnerId: string;
}

interface CourseProgressParams {
  courseId: string;
  learnerId: string;
}

interface ClassProgressParams {
  classId: string;
  learnerId: string;
}

interface ProgressSummaryFilters {
  programId?: string;
  courseId?: string;
  classId?: string;
  departmentId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  minProgress?: number;
  maxProgress?: number;
  page?: number;
  limit?: number;
}

interface DetailedReportFilters {
  programId?: string;
  courseId?: string;
  classId?: string;
  departmentId?: string;
  learnerIds?: string[];
  includeModules?: boolean;
  includeAssessments?: boolean;
  includeAttendance?: boolean;
}

export class ProgressService {
  /**
   * Get Program Progress for a learner
   */
  static async getProgramProgress(params: ProgramProgressParams): Promise<any> {
    const { programId, learnerId } = params;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    // Get program
    const program = await Program.findById(programId);
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    // Get enrollment
    const enrollment = await Enrollment.findOne({
      learnerId,
      programId,
      status: { $in: ['active', 'completed'] }
    });
    if (!enrollment) {
      throw ApiError.notFound('Learner not enrolled in this program');
    }

    // Get learner info
    const learner = await Learner.findById(learnerId);
    const user = await User.findById(learnerId);
    if (!learner || !user) {
      throw ApiError.notFound('Learner not found');
    }

    // Get all courses in program (stored in course metadata)
    const programCourses = await Course.find({
      'metadata.programId': programId,
      isActive: true
    });

    // Get course enrollments for this learner (via classes)
    const courseProgress = [];
    let totalCreditsEarned = 0;
    let totalCreditsRequired = 0;
    let coursesCompleted = 0;
    let totalTimeSpent = 0;
    let lastActivityAt: Date | null = null;

    for (const course of programCourses) {
      totalCreditsRequired += course.credits || 0;

      // Find class enrollments for this course
      const classes = await Class.find({ courseId: course._id });
      const classIds = classes.map(c => c._id);

      const classEnrollment = await ClassEnrollment.findOne({
        learnerId,
        classId: { $in: classIds },
        status: { $in: ['enrolled', 'active', 'completed'] }
      });

      if (classEnrollment) {
        // Get course content attempts
        const courseContents = await CourseContent.find({ courseId: course._id });
        const contentIds = courseContents.map(cc => cc.contentId);

        // Get all attempts for this course
        const scormAttempts = await ScormAttempt.find({
          learnerId,
          contentId: { $in: contentIds }
        });

        const examResults = await ExamResult.find({
          learnerId,
          examId: { $in: contentIds }
        });

        // Calculate progress
        const totalModules = courseContents.length;
        const completedModules = scormAttempts.filter(a =>
          ['completed', 'passed'].includes(a.status)
        ).length;

        const completionPercent = totalModules > 0
          ? Math.round((completedModules / totalModules) * 100)
          : 0;

        // Calculate time spent
        const courseTimeSpent = scormAttempts.reduce((sum, attempt) =>
          sum + (attempt.totalTime || 0), 0
        );
        totalTimeSpent += courseTimeSpent;

        // Calculate score
        const gradedExams = examResults.filter(e => e.status === 'graded' && e.percentage !== undefined);
        const avgScore = gradedExams.length > 0
          ? gradedExams.reduce((sum, e) => sum + (e.percentage || 0), 0) / gradedExams.length
          : null;

        // Determine status
        let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
        if (completionPercent === 100) {
          status = 'completed';
          totalCreditsEarned += course.credits || 0;
          coursesCompleted++;
        } else if (completionPercent > 0) {
          status = 'in_progress';
        }

        // Find last activity
        const lastScormAccess = scormAttempts.reduce((latest, attempt) => {
          const attemptDate = attempt.lastAccessedAt || attempt.updatedAt;
          return (!latest || attemptDate > latest) ? attemptDate : latest;
        }, null as Date | null);

        const lastExamAccess = examResults.reduce((latest, result) => {
          const resultDate = result.submittedAt || result.updatedAt;
          return (!latest || resultDate > latest) ? resultDate : latest;
        }, null as Date | null);

        const courseLastAccess = [lastScormAccess, lastExamAccess]
          .filter(Boolean)
          .reduce((latest, date) =>
            (!latest || date! > latest) ? date! : latest, null as Date | null
          );

        if (courseLastAccess && (!lastActivityAt || courseLastAccess > lastActivityAt)) {
          lastActivityAt = courseLastAccess;
        }

        courseProgress.push({
          courseId: course._id.toString(),
          courseTitle: course.name,
          courseCode: course.code,
          levelId: null, // Would need ProgramLevel model
          levelNumber: 0,
          status,
          completionPercent,
          score: avgScore ? Math.round(avgScore) : null,
          creditsEarned: status === 'completed' ? (course.credits || 0) : 0,
          timeSpent: courseTimeSpent,
          enrolledAt: classEnrollment.enrollmentDate,
          startedAt: scormAttempts.length > 0 ? scormAttempts[0].startedAt : null,
          completedAt: status === 'completed' ? classEnrollment.completionDate : null,
          lastAccessedAt: courseLastAccess
        });
      }
    }

    // Calculate overall progress
    const overallCompletionPercent = programCourses.length > 0
      ? Math.round((coursesCompleted / programCourses.length) * 100)
      : 0;

    // Determine enrollment status
    let enrollmentStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    if (overallCompletionPercent === 100) {
      enrollmentStatus = 'completed';
    } else if (overallCompletionPercent > 0) {
      enrollmentStatus = 'in_progress';
    }

    // Calculate estimated completion date (simple projection)
    let estimatedCompletionDate: Date | null = null;
    if (enrollmentStatus === 'in_progress' && lastActivityAt) {
      const daysSinceStart = Math.floor(
        (new Date().getTime() - enrollment.enrollmentDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const coursesRemaining = programCourses.length - coursesCompleted;
      if (daysSinceStart > 0 && coursesCompleted > 0) {
        const daysPerCourse = daysSinceStart / coursesCompleted;
        const estimatedDaysRemaining = daysPerCourse * coursesRemaining;
        estimatedCompletionDate = new Date(Date.now() + estimatedDaysRemaining * 24 * 60 * 60 * 1000);
      }
    }

    // Generate milestones
    const milestones = [
      {
        id: 'halfway_point',
        name: 'Halfway There',
        description: 'Complete 50% of program',
        achieved: overallCompletionPercent >= 50,
        achievedAt: overallCompletionPercent >= 50 ? lastActivityAt : null,
        progress: Math.min(overallCompletionPercent * 2, 100)
      },
      {
        id: 'full_completion',
        name: 'Program Completion',
        description: 'Complete all program courses',
        achieved: overallCompletionPercent === 100,
        achievedAt: overallCompletionPercent === 100 ? enrollment.completionDate : null,
        progress: overallCompletionPercent
      }
    ];

    return {
      programId: program._id.toString(),
      programName: program.name,
      programCode: program.code,
      learnerId: learner._id.toString(),
      learnerName: `${learner.firstName} ${learner.lastName}`,
      enrolledAt: enrollment.enrollmentDate,
      status: enrollmentStatus,
      overallProgress: {
        completionPercent: overallCompletionPercent,
        creditsEarned: totalCreditsEarned,
        creditsRequired: totalCreditsRequired,
        coursesCompleted,
        coursesTotal: programCourses.length,
        timeSpent: totalTimeSpent,
        lastActivityAt,
        estimatedCompletionDate
      },
      levelProgress: [], // Would need ProgramLevel implementation
      courseProgress,
      milestones
    };
  }

  /**
   * Get Course Progress for a learner
   */
  static async getCourseProgress(params: CourseProgressParams): Promise<any> {
    const { courseId, learnerId } = params;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    // Get course
    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // Get learner info
    const learner = await Learner.findById(learnerId);
    const user = await User.findById(learnerId);
    if (!learner || !user) {
      throw ApiError.notFound('Learner not found');
    }

    // Find enrollment via class
    const classes = await Class.find({ courseId });
    const classIds = classes.map(c => c._id);

    const classEnrollment = await ClassEnrollment.findOne({
      learnerId,
      classId: { $in: classIds },
      status: { $in: ['enrolled', 'active', 'completed'] }
    });

    if (!classEnrollment) {
      throw ApiError.notFound('Learner not enrolled in this course');
    }

    // Get course content
    const courseContents = await CourseContent.find({
      courseId,
      isActive: true
    }).sort({ sequence: 1 });

    const contentIds = courseContents.map(cc => cc.contentId);

    // Get all attempts
    const scormAttempts = await ScormAttempt.find({
      learnerId,
      contentId: { $in: contentIds }
    }).sort({ createdAt: 1 });

    const examResults = await ExamResult.find({
      learnerId,
      examId: { $in: contentIds }
    }).sort({ createdAt: 1 });

    // Build module progress
    const moduleProgress = courseContents.map(content => {
      const attempts = scormAttempts.filter(a =>
        a.contentId.toString() === content.contentId.toString()
      );

      const latestAttempt = attempts[attempts.length - 1];

      let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
      let completionPercent = 0;
      let score: number | null = null;
      let timeSpent = 0;
      let bestAttemptScore: number | null = null;
      let lastAttemptScore: number | null = null;

      if (attempts.length > 0) {
        if (['completed', 'passed'].includes(latestAttempt.status)) {
          status = 'completed';
          completionPercent = 100;
        } else if (latestAttempt.progressMeasure !== undefined) {
          status = 'in_progress';
          completionPercent = Math.round((latestAttempt.progressMeasure || 0) * 100);
        }

        timeSpent = attempts.reduce((sum, a) => sum + (a.totalTime || 0), 0);

        const scores = attempts
          .filter(a => a.scoreScaled !== undefined)
          .map(a => (a.scoreScaled || 0) * 100);

        if (scores.length > 0) {
          bestAttemptScore = Math.round(Math.max(...scores));
          lastAttemptScore = Math.round(scores[scores.length - 1]);
          score = bestAttemptScore;
        }
      }

      return {
        moduleId: content.contentId.toString(),
        moduleTitle: content.metadata?.title || `Module ${content.moduleNumber || content.sequence}`,
        moduleType: content.metadata?.type || 'custom',
        order: content.sequence,
        status,
        completionPercent,
        score,
        timeSpent,
        attempts: attempts.length,
        bestAttemptScore,
        lastAttemptScore,
        startedAt: attempts.length > 0 ? attempts[0].startedAt : null,
        completedAt: status === 'completed' ? latestAttempt?.completedAt : null,
        lastAccessedAt: latestAttempt?.lastAccessedAt || null,
        isRequired: content.isRequired,
        passingScore: content.metadata?.passingScore || null,
        passed: score !== null && content.metadata?.passingScore
          ? score >= content.metadata.passingScore
          : null
      };
    });

    // Calculate overall progress
    const completedModules = moduleProgress.filter(m => m.status === 'completed').length;
    const completionPercent = moduleProgress.length > 0
      ? Math.round((completedModules / moduleProgress.length) * 100)
      : 0;

    // Calculate overall score
    const scoredModules = moduleProgress.filter(m => m.score !== null);
    const avgScore = scoredModules.length > 0
      ? Math.round(scoredModules.reduce((sum, m) => sum + m.score!, 0) / scoredModules.length)
      : null;

    // Calculate time spent
    const totalTimeSpent = moduleProgress.reduce((sum, m) => sum + m.timeSpent, 0);

    // Find last accessed
    const lastAccessedAt = moduleProgress.reduce((latest, m) => {
      return (m.lastAccessedAt && (!latest || m.lastAccessedAt > latest))
        ? m.lastAccessedAt
        : latest;
    }, null as Date | null);

    // Calculate days active and streak
    const activityDates = scormAttempts
      .map(a => a.lastAccessedAt || a.updatedAt)
      .filter(Boolean)
      .map(d => d!.toISOString().split('T')[0])
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();

    const daysActive = activityDates.length;

    // Calculate streak (consecutive days)
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    for (let i = 0; i <= 30; i++) {
      const checkDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      if (activityDates.includes(checkDate)) {
        streak = i + 1;
      } else if (checkDate !== today) {
        break;
      }
    }

    // Build assessments
    const assessments = examResults.map(result => ({
      assessmentId: result.examId.toString(),
      title: result.metadata?.title || 'Assessment',
      type: result.metadata?.type || 'exam',
      status: result.status,
      score: result.percentage || null,
      maxScore: 100,
      passingScore: result.metadata?.passingScore || 70,
      passed: result.passed || null,
      attempts: result.attemptNumber,
      maxAttempts: result.metadata?.maxAttempts || null,
      lastAttemptAt: result.submittedAt || null,
      submittedAt: result.submittedAt || null,
      gradedAt: result.gradedAt || null
    }));

    // Build activity log (recent 10 events)
    const activityLog: any[] = [];

    scormAttempts.slice(-10).forEach(attempt => {
      if (attempt.startedAt) {
        activityLog.push({
          timestamp: attempt.startedAt,
          eventType: 'started',
          moduleId: attempt.contentId.toString(),
          moduleTitle: null,
          details: 'Module started'
        });
      }
      if (attempt.completedAt) {
        activityLog.push({
          timestamp: attempt.completedAt,
          eventType: 'completed',
          moduleId: attempt.contentId.toString(),
          moduleTitle: null,
          details: `Module completed`
        });
      }
    });

    activityLog.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const recentActivityLog = activityLog.slice(0, 10);

    // Determine overall status
    let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    if (completionPercent === 100) {
      status = 'completed';
    } else if (completionPercent > 0) {
      status = 'in_progress';
    }

    return {
      courseId: course._id.toString(),
      courseTitle: course.name,
      courseCode: course.code,
      learnerId: learner._id.toString(),
      learnerName: `${learner.firstName} ${learner.lastName}`,
      enrolledAt: classEnrollment.enrollmentDate,
      startedAt: scormAttempts.length > 0 ? scormAttempts[0].startedAt : null,
      completedAt: status === 'completed' ? classEnrollment.completionDate : null,
      status,
      overallProgress: {
        completionPercent,
        modulesCompleted: completedModules,
        modulesTotal: moduleProgress.length,
        score: avgScore,
        timeSpent: totalTimeSpent,
        lastAccessedAt,
        daysActive,
        streak
      },
      moduleProgress,
      assessments,
      activityLog: recentActivityLog
    };
  }

  /**
   * Get Class Progress for a learner
   */
  static async getClassProgress(params: ClassProgressParams): Promise<any> {
    const { classId, learnerId } = params;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw ApiError.badRequest('Invalid class ID');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    // Get class
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      throw ApiError.notFound('Class not found');
    }

    // Get course
    const course = await Course.findById(classDoc.courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // Get learner info
    const learner = await Learner.findById(learnerId);
    const user = await User.findById(learnerId);
    if (!learner || !user) {
      throw ApiError.notFound('Learner not found');
    }

    // Get enrollment
    const enrollment = await ClassEnrollment.findOne({
      learnerId,
      classId
    });

    if (!enrollment) {
      throw ApiError.notFound('Learner not enrolled in this class');
    }

    // Get course progress (reuse course progress logic)
    const courseContents = await CourseContent.find({
      courseId: course._id,
      isActive: true
    });

    const contentIds = courseContents.map(cc => cc.contentId);

    const scormAttempts = await ScormAttempt.find({
      learnerId,
      contentId: { $in: contentIds }
    });

    const examResults = await ExamResult.find({
      learnerId,
      examId: { $in: contentIds }
    });

    // Calculate course progress
    const completedModules = scormAttempts.filter(a =>
      ['completed', 'passed'].includes(a.status)
    ).length;

    const completionPercent = courseContents.length > 0
      ? Math.round((completedModules / courseContents.length) * 100)
      : 0;

    const gradedExams = examResults.filter(e => e.status === 'graded' && e.percentage !== undefined);
    const avgScore = gradedExams.length > 0
      ? Math.round(gradedExams.reduce((sum, e) => sum + (e.percentage || 0), 0) / gradedExams.length)
      : null;

    const totalTimeSpent = scormAttempts.reduce((sum, a) => sum + (a.totalTime || 0), 0);

    const lastAccessedAt = scormAttempts.reduce((latest, attempt) => {
      const attemptDate = attempt.lastAccessedAt || attempt.updatedAt;
      return (!latest || attemptDate > latest) ? attemptDate : latest;
    }, null as Date | null);

    // Calculate attendance
    const attendanceRecords = enrollment.attendanceRecords || [];
    const sessionsAttended = attendanceRecords.filter(r =>
      r.status === 'present' || r.status === 'late'
    ).length;
    const totalSessions = attendanceRecords.length;
    const attendanceRate = totalSessions > 0
      ? Math.round((sessionsAttended / totalSessions) * 100) / 100
      : 0;

    const sessions = attendanceRecords.map(record => ({
      sessionId: null,
      sessionDate: record.date,
      sessionTitle: `Session on ${record.date.toISOString().split('T')[0]}`,
      attended: ['present', 'late'].includes(record.status),
      markedAt: record.date,
      markedBy: null,
      notes: record.notes || null
    }));

    // Assignments (stored in metadata for now)
    const assignments = enrollment.metadata?.assignments || [];

    // Determine status
    let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    if (completionPercent === 100) {
      status = 'completed';
    } else if (completionPercent > 0) {
      status = 'in_progress';
    }

    return {
      classId: classDoc._id.toString(),
      className: classDoc.name,
      courseId: course._id.toString(),
      courseTitle: course.name,
      learnerId: learner._id.toString(),
      learnerName: `${learner.firstName} ${learner.lastName}`,
      enrolledAt: enrollment.enrollmentDate,
      status,
      courseProgress: {
        completionPercent,
        modulesCompleted: completedModules,
        modulesTotal: courseContents.length,
        score: avgScore,
        timeSpent: totalTimeSpent,
        lastAccessedAt
      },
      attendance: {
        sessionsAttended,
        totalSessions,
        attendanceRate,
        sessions
      },
      assignments
    };
  }

  /**
   * Get Learner Overall Progress
   */
  static async getLearnerProgress(learnerId: string): Promise<any> {
    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    // Get learner info
    const learner = await Learner.findById(learnerId);
    const user = await User.findById(learnerId);
    if (!learner || !user) {
      throw ApiError.notFound('Learner not found');
    }

    // Get all program enrollments
    const programEnrollments = await Enrollment.find({ learnerId });

    // Get all class enrollments
    const classEnrollments = await ClassEnrollment.find({ learnerId });

    // Get all unique course IDs
    const classes = await Class.find({
      _id: { $in: classEnrollments.map(e => e.classId) }
    });
//     const courseIdsSet = new Set(classes.map(c => c.courseId.toString()));

    // Get all attempts
    const allScormAttempts = await ScormAttempt.find({ learnerId });
    const allExamResults = await ExamResult.find({ learnerId });

    // Calculate summary
    const programsCompleted = programEnrollments.filter(e =>
      e.status === 'completed' || e.status === 'graduated'
    ).length;

    const coursesCompleted = classEnrollments.filter(e =>
      e.status === 'completed'
    ).length;

    const totalCreditsEarned = classEnrollments
      .filter(e => e.status === 'completed')
      .reduce((sum, e) => sum + (e.creditsEarned || 0), 0);

    const totalTimeSpent = allScormAttempts.reduce((sum, a) =>
      sum + (a.totalTime || 0), 0
    );

    const gradedExams = allExamResults.filter(e =>
      e.status === 'graded' && e.percentage !== undefined
    );
    const averageScore = gradedExams.length > 0
      ? Math.round(gradedExams.reduce((sum, e) => sum + (e.percentage || 0), 0) / gradedExams.length)
      : 0;

    // Calculate streaks
    const activityDates = allScormAttempts
      .map(a => a.lastAccessedAt || a.updatedAt)
      .filter(Boolean)
      .map(d => d!.toISOString().split('T')[0])
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();

    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    for (let i = 0; i <= 30; i++) {
      const checkDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      if (activityDates.includes(checkDate)) {
        currentStreak = i + 1;
      } else if (checkDate !== today) {
        break;
      }
    }

    let longestStreak = 0;
    let tempStreak = 0;
    for (let i = 1; i < activityDates.length; i++) {
      const prevDate = new Date(activityDates[i - 1]);
      const currDate = new Date(activityDates[i]);
      const daysDiff = Math.floor(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak + 1);
      } else {
        tempStreak = 0;
      }
    }

    const lastActivityAt = allScormAttempts.reduce((latest, attempt) => {
      const attemptDate = attempt.lastAccessedAt || attempt.updatedAt;
      return (!latest || attemptDate > latest) ? attemptDate : latest;
    }, null as Date | null);

    // Build program progress
    const programProgress = await Promise.all(
      programEnrollments.map(async (enrollment) => {
        const program = await Program.findById(enrollment.programId);
        if (!program) return null;

        // Get courses for this program
        const programCourses = await Course.find({
          'metadata.programId': enrollment.programId,
          isActive: true
        });

        const programClasses = await Class.find({
          courseId: { $in: programCourses.map(c => c._id) }
        });

        const programClassEnrollments = classEnrollments.filter(ce =>
          programClasses.some(pc => pc._id.toString() === ce.classId.toString())
        );

        const completedCourses = programClassEnrollments.filter(e =>
          e.status === 'completed'
        ).length;

        const completionPercent = programCourses.length > 0
          ? Math.round((completedCourses / programCourses.length) * 100)
          : 0;

        const creditsEarned = programClassEnrollments
          .filter(e => e.status === 'completed')
          .reduce((sum, e) => sum + (e.creditsEarned || 0), 0);

        let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
        if (enrollment.status === 'completed' || enrollment.status === 'graduated') {
          status = 'completed';
        } else if (completionPercent > 0) {
          status = 'in_progress';
        }

        return {
          programId: program._id.toString(),
          programName: program.name,
          programCode: program.code,
          status,
          completionPercent,
          creditsEarned,
          creditsRequired: program.requiredCredits || 0,
          enrolledAt: enrollment.enrollmentDate,
          completedAt: enrollment.completionDate || null,
          lastAccessedAt: null // Would need to calculate
        };
      })
    );

    // Build course progress
    const courseProgress = await Promise.all(
      classes.map(async (classDoc) => {
        const course = await Course.findById(classDoc.courseId);
        if (!course) return null;

        const enrollment = classEnrollments.find(e =>
          e.classId.toString() === classDoc._id.toString()
        );
        if (!enrollment) return null;

        // Get course contents
        const courseContents = await CourseContent.find({
          courseId: course._id
        });
        const contentIds = courseContents.map(cc => cc.contentId);

        const courseAttempts = allScormAttempts.filter(a =>
          contentIds.some(id => id.toString() === a.contentId.toString())
        );

        const completedModules = courseAttempts.filter(a =>
          ['completed', 'passed'].includes(a.status)
        ).length;

        const completionPercent = courseContents.length > 0
          ? Math.round((completedModules / courseContents.length) * 100)
          : 0;

        const courseExams = allExamResults.filter(e =>
          contentIds.some(id => id.toString() === e.examId.toString())
        );

        const gradedCourseExams = courseExams.filter(e =>
          e.status === 'graded' && e.percentage !== undefined
        );
        const courseScore = gradedCourseExams.length > 0
          ? Math.round(gradedCourseExams.reduce((sum, e) => sum + (e.percentage || 0), 0) / gradedCourseExams.length)
          : null;

        let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
        if (enrollment.status === 'completed') {
          status = 'completed';
        } else if (completionPercent > 0) {
          status = 'in_progress';
        }

        // Find program
        const program = course.metadata?.programId
          ? await Program.findById(course.metadata.programId)
          : null;

        const lastCourseActivity = courseAttempts.reduce((latest, attempt) => {
          const attemptDate = attempt.lastAccessedAt || attempt.updatedAt;
          return (!latest || attemptDate > latest) ? attemptDate : latest;
        }, null as Date | null);

        return {
          courseId: course._id.toString(),
          courseTitle: course.name,
          courseCode: course.code,
          programId: program?._id.toString() || null,
          programName: program?.name || null,
          status,
          completionPercent,
          score: courseScore,
          creditsEarned: status === 'completed' ? (enrollment.creditsEarned || 0) : 0,
          enrolledAt: enrollment.enrollmentDate,
          completedAt: enrollment.completionDate || null,
          lastAccessedAt: lastCourseActivity
        };
      })
    );

    // Build recent activity
    const recentActivity = allScormAttempts
      .slice(-20)
      .map(attempt => ({
        timestamp: attempt.lastAccessedAt || attempt.updatedAt,
        activityType: 'module_completed' as const,
        resourceId: attempt.contentId.toString(),
        resourceType: 'module' as const,
        resourceTitle: 'Module',
        details: `Progress: ${Math.round((attempt.progressMeasure || 0) * 100)}%`
      }))
      .reverse();

    // Build achievements
    const achievements = [];
    if (coursesCompleted > 0) {
      achievements.push({
        id: 'first_course_complete',
        type: 'course_completion',
        title: 'First Course Complete',
        description: 'Complete your first course',
        earnedAt: classEnrollments.find(e => e.status === 'completed')?.completionDate || new Date(),
        badge: null
      });
    }
    if (currentStreak >= 7) {
      achievements.push({
        id: 'week_streak',
        type: 'streak',
        title: '7 Day Streak',
        description: 'Learn for 7 consecutive days',
        earnedAt: new Date(),
        badge: null
      });
    }

    return {
      learnerId: learner._id.toString(),
      learnerName: `${learner.firstName} ${learner.lastName}`,
      learnerEmail: user.email,
      summary: {
        programsEnrolled: programEnrollments.length,
        programsCompleted,
        coursesEnrolled: classEnrollments.length,
        coursesCompleted,
        classesEnrolled: classEnrollments.length,
        totalCreditsEarned,
        totalTimeSpent,
        averageScore,
        currentStreak,
        longestStreak,
        lastActivityAt,
        joinedAt: user.createdAt
      },
      programProgress: programProgress.filter(Boolean),
      courseProgress: courseProgress.filter(Boolean),
      recentActivity,
      achievements
    };
  }

  /**
   * Get Progress Summary Report
   */
  static async getProgressSummary(filters: ProgressSummaryFilters): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (filters.programId) {
      // Find courses in program
      const courses = await Course.find({
        'metadata.programId': filters.programId
      });
      const courseIds = courses.map(c => c._id);
      const classes = await Class.find({ courseId: { $in: courseIds } });
      query.classId = { $in: classes.map(c => c._id) };
    }

    if (filters.courseId) {
      const classes = await Class.find({ courseId: filters.courseId });
      query.classId = { $in: classes.map(c => c._id) };
    }

    if (filters.classId) {
      query.classId = filters.classId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      query.enrollmentDate = {};
      if (filters.startDate) query.enrollmentDate.$gte = filters.startDate;
      if (filters.endDate) query.enrollmentDate.$lte = filters.endDate;
    }

    // Get enrollments
    const [enrollments, _total] = await Promise.all([
      ClassEnrollment.find(query).skip(skip).limit(limit),
      ClassEnrollment.countDocuments(query)
    ]);

    // Build learner data
    const learners = await Promise.all(
      enrollments.map(async (enrollment) => {
        const learner = await Learner.findById(enrollment.learnerId);
        const user = await User.findById(enrollment.learnerId);
        if (!learner || !user) return null;

        // Get class and course
        const classDoc = await Class.findById(enrollment.classId);
        if (!classDoc) return null;

        const course = await Course.findById(classDoc.courseId);
        if (!course) return null;

        // Get progress
        const courseContents = await CourseContent.find({ courseId: course._id });
        const contentIds = courseContents.map(cc => cc.contentId);

        const attempts = await ScormAttempt.find({
          learnerId: enrollment.learnerId,
          contentId: { $in: contentIds }
        });

        const completedModules = attempts.filter(a =>
          ['completed', 'passed'].includes(a.status)
        ).length;

        const completionPercent = courseContents.length > 0
          ? Math.round((completedModules / courseContents.length) * 100)
          : 0;

        // Filter by progress if specified
        if (filters.minProgress !== undefined && completionPercent < filters.minProgress) {
          return null;
        }
        if (filters.maxProgress !== undefined && completionPercent > filters.maxProgress) {
          return null;
        }

        const timeSpent = attempts.reduce((sum, a) => sum + (a.totalTime || 0), 0);
        const lastAccessedAt = attempts.reduce((latest, attempt) => {
          const attemptDate = attempt.lastAccessedAt || attempt.updatedAt;
          return (!latest || attemptDate > latest) ? attemptDate : latest;
        }, null as Date | null);

        let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
        if (enrollment.status === 'completed') {
          status = 'completed';
        } else if (completionPercent > 0) {
          status = 'in_progress';
        }

        return {
          learnerId: learner._id.toString(),
          learnerName: `${learner.firstName} ${learner.lastName}`,
          learnerEmail: user.email,
          enrolledAt: enrollment.enrollmentDate,
          status,
          completionPercent,
          score: enrollment.gradePercentage || null,
          timeSpent,
          lastAccessedAt,
          completedAt: enrollment.completionDate || null
        };
      })
    );

    const filteredLearners = learners.filter(Boolean);

    // Calculate summary
    const totalLearners = filteredLearners.length;
    const averageProgress = totalLearners > 0
      ? Math.round(filteredLearners.reduce((sum, l) => sum + l!.completionPercent, 0) / totalLearners)
      : 0;

    const learnersWithScores = filteredLearners.filter(l => l!.score !== null);
    const averageScore = learnersWithScores.length > 0
      ? Math.round(learnersWithScores.reduce((sum, l) => sum + l!.score!, 0) / learnersWithScores.length)
      : 0;

    const completedCount = filteredLearners.filter(l => l!.status === 'completed').length;
    const inProgressCount = filteredLearners.filter(l => l!.status === 'in_progress').length;
    const notStartedCount = filteredLearners.filter(l => l!.status === 'not_started').length;
    const totalTimeSpent = filteredLearners.reduce((sum, l) => sum + l!.timeSpent, 0);

    return {
      filters: {
        programId: filters.programId || null,
        courseId: filters.courseId || null,
        classId: filters.classId || null,
        departmentId: filters.departmentId || null,
        status: filters.status || null,
        dateRange: {
          start: filters.startDate || null,
          end: filters.endDate || null
        }
      },
      summary: {
        totalLearners,
        averageProgress,
        averageScore,
        completedCount,
        inProgressCount,
        notStartedCount,
        totalTimeSpent
      },
      learners: filteredLearners,
      pagination: {
        page,
        limit,
        total: totalLearners,
        totalPages: Math.ceil(totalLearners / limit),
        hasNext: page * limit < totalLearners,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get Detailed Progress Report
   */
  static async getDetailedProgressReport(filters: DetailedReportFilters): Promise<any> {
    // Build query for enrollments
    const query: any = {};

    if (filters.courseId) {
      const classes = await Class.find({ courseId: filters.courseId });
      query.classId = { $in: classes.map(c => c._id) };
    }

    if (filters.classId) {
      query.classId = filters.classId;
    }

    if (filters.learnerIds && filters.learnerIds.length > 0) {
      query.learnerId = { $in: filters.learnerIds };
    }

    // Get enrollments
    const enrollments = await ClassEnrollment.find(query);

    // Build detailed learner data
    const learnerDetails = await Promise.all(
      enrollments.map(async (enrollment) => {
        const learner = await Learner.findById(enrollment.learnerId);
        const user = await User.findById(enrollment.learnerId);
        if (!learner || !user) return null;

        const classDoc = await Class.findById(enrollment.classId);
        if (!classDoc) return null;

        const course = await Course.findById(classDoc.courseId);
        if (!course) return null;

        // Get course contents
        const courseContents = await CourseContent.find({
          courseId: course._id
        }).sort({ sequence: 1 });
        const contentIds = courseContents.map(cc => cc.contentId);

        // Get attempts
        const attempts = await ScormAttempt.find({
          learnerId: enrollment.learnerId,
          contentId: { $in: contentIds }
        });

        const examResults = await ExamResult.find({
          learnerId: enrollment.learnerId,
          examId: { $in: contentIds }
        });

        // Calculate progress
        const completedModules = attempts.filter(a =>
          ['completed', 'passed'].includes(a.status)
        ).length;

        const completionPercent = courseContents.length > 0
          ? Math.round((completedModules / courseContents.length) * 100)
          : 0;

        const timeSpent = attempts.reduce((sum, a) => sum + (a.totalTime || 0), 0);

        let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
        if (enrollment.status === 'completed') {
          status = 'completed';
        } else if (completionPercent > 0) {
          status = 'in_progress';
        }

        // Build module progress if requested
        const moduleProgress = filters.includeModules !== false
          ? courseContents.map(content => {
              const contentAttempts = attempts.filter(a =>
                a.contentId.toString() === content.contentId.toString()
              );
              const latest = contentAttempts[contentAttempts.length - 1];

              let moduleStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started';
              let moduleCompletion = 0;

              if (latest) {
                if (['completed', 'passed'].includes(latest.status)) {
                  moduleStatus = 'completed';
                  moduleCompletion = 100;
                } else if (latest.progressMeasure !== undefined) {
                  moduleStatus = 'in_progress';
                  moduleCompletion = Math.round((latest.progressMeasure || 0) * 100);
                }
              }

              return {
                moduleId: content.contentId.toString(),
                moduleTitle: content.metadata?.title || `Module ${content.sequence}`,
                moduleType: content.metadata?.type || 'custom',
                order: content.sequence,
                status: moduleStatus,
                completionPercent: moduleCompletion,
                score: latest?.scoreScaled ? Math.round(latest.scoreScaled * 100) : null,
                timeSpent: contentAttempts.reduce((sum, a) => sum + (a.totalTime || 0), 0),
                attempts: contentAttempts.length,
                startedAt: contentAttempts.length > 0 ? contentAttempts[0].startedAt : null,
                completedAt: moduleStatus === 'completed' ? latest?.completedAt : null,
                lastAccessedAt: latest?.lastAccessedAt || null
              };
            })
          : [];

        // Build assessment results if requested
        const assessmentResults = filters.includeAssessments !== false
          ? examResults.map(result => ({
              assessmentId: result.examId.toString(),
              title: result.metadata?.title || 'Assessment',
              type: result.metadata?.type || 'exam',
              score: result.percentage || null,
              maxScore: 100,
              passed: result.passed || null,
              attempts: result.attemptNumber,
              submittedAt: result.submittedAt || null,
              gradedAt: result.gradedAt || null
            }))
          : [];

        // Build attendance if requested
        const attendance = filters.includeAttendance
          ? {
              sessionsAttended: (enrollment.attendanceRecords || []).filter(r =>
                ['present', 'late'].includes(r.status)
              ).length,
              totalSessions: (enrollment.attendanceRecords || []).length,
              attendanceRate: 0
            }
          : {
              sessionsAttended: 0,
              totalSessions: 0,
              attendanceRate: 0
            };

        if (attendance.totalSessions > 0) {
          attendance.attendanceRate = Math.round(
            (attendance.sessionsAttended / attendance.totalSessions) * 100
          ) / 100;
        }

        return {
          learnerId: learner._id.toString(),
          learnerName: `${learner.firstName} ${learner.lastName}`,
          learnerEmail: user.email,
          studentId: null,
          department: {
            id: null,
            name: null
          },
          enrolledAt: enrollment.enrollmentDate,
          overallProgress: {
            completionPercent,
            score: enrollment.gradePercentage || null,
            timeSpent,
            status
          },
          moduleProgress,
          assessmentResults,
          attendance
        };
      })
    );

    const reportId = `RPT-${new Date().toISOString().split('T')[0]}-${Date.now()}`;

    return {
      reportId,
      generatedAt: new Date(),
      generatedBy: {
        id: null,
        name: 'System'
      },
      filters: {
        programId: filters.programId || null,
        courseId: filters.courseId || null,
        classId: filters.classId || null,
        departmentId: filters.departmentId || null,
        learnerIds: filters.learnerIds || []
      },
      learnerDetails: learnerDetails.filter(Boolean),
      downloadUrl: null
    };
  }
}
