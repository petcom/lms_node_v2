import Enrollment from '@/models/enrollment/Enrollment.model';
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import Program from '@/models/academic/Program.model';
import Course from '@/models/academic/Course.model';
import Class from '@/models/academic/Class.model';
// import Department from '@/models/organization/Department.model';
import { User } from '@/models/auth/User.model';
import { Learner } from '@/models/auth/Learner.model';
import { ApiError } from '@/utils/ApiError';
import mongoose from 'mongoose';

interface ListEnrollmentsFilters {
  page?: number;
  limit?: number;
  learner?: string;
  program?: string;
  course?: string;
  class?: string;
  status?: 'active' | 'completed' | 'withdrawn' | 'suspended' | 'expired';
  type?: 'program' | 'course' | 'class';
  department?: string;
  enrolledAfter?: Date;
  enrolledBefore?: Date;
  sort?: string;
}

interface EnrollProgramData {
  learnerId: string;
  programId: string;
  enrolledAt?: Date;
  expiresAt?: Date;
}

interface EnrollCourseData {
  learnerId: string;
  courseId: string;
  enrolledAt?: Date;
  expiresAt?: Date;
}

interface EnrollClassData {
  learnerId: string;
  classId: string;
  enrolledAt?: Date;
}

interface UpdateStatusData {
  status: 'active' | 'completed' | 'withdrawn' | 'suspended';
  reason?: string;
  grade?: {
    score: number;
    letter: string;
    passed: boolean;
  };
}

interface WithdrawData {
  reason?: string;
}

interface ProgramEnrollmentFilters {
  page?: number;
  limit?: number;
  status?: 'active' | 'completed' | 'withdrawn' | 'suspended' | 'expired';
  sort?: string;
}

export class EnrollmentsService {
  /**
   * List enrollments with comprehensive filtering
   */
  static async listEnrollments(filters: ListEnrollmentsFilters, _userId: string): Promise<any> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 10));
    const skip = (page - 1) * limit;

    // Build query based on type filter
    let enrollments: any[] = [];
    let total = 0;

    const sortField = filters.sort || '-enrolledAt';
    const sortOrder = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sort: any = { [sortKey]: sortOrder };

    if (!filters.type || filters.type === 'program') {
      // Query program enrollments
      const programQuery: any = {};
      if (filters.learner) programQuery.learnerId = new mongoose.Types.ObjectId(filters.learner);
      if (filters.program) programQuery.programId = new mongoose.Types.ObjectId(filters.program);
      if (filters.status) {
        programQuery.status = this.mapStatusToEnrollmentStatus(filters.status);
      }
      if (filters.enrolledAfter) programQuery.enrollmentDate = { $gte: filters.enrolledAfter };
      if (filters.enrolledBefore) {
        programQuery.enrollmentDate = programQuery.enrollmentDate || {};
        programQuery.enrollmentDate.$lte = filters.enrolledBefore;
      }

      const [programEnrollments, programTotal] = await Promise.all([
        Enrollment.find(programQuery)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Enrollment.countDocuments(programQuery)
      ]);

      total += programTotal;
      enrollments.push(...programEnrollments.map(e => ({ ...e, type: 'program' })));
    }

    if (!filters.type || filters.type === 'class') {
      // Query class enrollments
      const classQuery: any = {};
      if (filters.learner) classQuery.learnerId = new mongoose.Types.ObjectId(filters.learner);
      if (filters.class) classQuery.classId = new mongoose.Types.ObjectId(filters.class);
      if (filters.status) {
        classQuery.status = this.mapStatusToClassStatus(filters.status);
      }
      if (filters.enrolledAfter) classQuery.enrollmentDate = { $gte: filters.enrolledAfter };
      if (filters.enrolledBefore) {
        classQuery.enrollmentDate = classQuery.enrollmentDate || {};
        classQuery.enrollmentDate.$lte = filters.enrolledBefore;
      }

      const [classEnrollments, classTotal] = await Promise.all([
        ClassEnrollment.find(classQuery)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        ClassEnrollment.countDocuments(classQuery)
      ]);

      total += classTotal;
      enrollments.push(...classEnrollments.map(e => ({ ...e, type: 'class' })));
    }

    // Enrich enrollments with data
    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        return await this.enrichEnrollment(enrollment);
      })
    );

    const totalPages = Math.ceil(total / limit);

    return {
      enrollments: enrichedEnrollments.filter(e => e !== null),
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
   * Enroll learner in program
   */
  static async enrollProgram(data: EnrollProgramData, _userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(data.learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    if (!mongoose.Types.ObjectId.isValid(data.programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    // Verify learner exists
    const learner = await User.findById(data.learnerId);
    if (!learner) {
      throw ApiError.notFound('Learner not found');
    }

    // Verify program exists
    const program = await Program.findById(data.programId).populate('departmentId');
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    // Check for existing enrollment
    const existingEnrollment = await Enrollment.findOne({
      learnerId: data.learnerId,
      programId: data.programId,
      status: { $in: ['active', 'pending', 'suspended'] }
    });

    if (existingEnrollment) {
      throw ApiError.conflict('Learner already enrolled in this program');
    }

    // Get current academic year (simplified - would need actual AcademicYear lookup)
    const academicYearId = new mongoose.Types.ObjectId();

    // Create enrollment
    const enrollment = new Enrollment({
      learnerId: data.learnerId,
      programId: data.programId,
      academicYearId,
      status: 'active',
      enrollmentDate: data.enrolledAt || new Date(),
      startDate: data.enrolledAt || new Date(),
      metadata: {
        expiresAt: data.expiresAt
      }
    });

    await enrollment.save();

    // Get learner details
    const learnerDetails = await Learner.findById(data.learnerId);

    return {
      enrollment: {
        id: enrollment._id.toString(),
        type: 'program',
        learner: {
          id: learner._id.toString(),
          firstName: learnerDetails?.firstName || '',
          lastName: learnerDetails?.lastName || '',
          email: learner.email
        },
        program: {
          id: program._id.toString(),
          name: program.name,
          code: program.code,
          levels: 0, // Would need ProgramLevel count
          department: {
            id: (program.departmentId as any)._id.toString(),
            name: (program.departmentId as any).name
          }
        },
        status: enrollment.status,
        enrolledAt: enrollment.enrollmentDate,
        completedAt: null,
        withdrawnAt: null,
        expiresAt: data.expiresAt || null,
        progress: {
          percentage: 0,
          completedItems: 0,
          totalItems: 0
        },
        createdAt: enrollment.createdAt,
        updatedAt: enrollment.updatedAt
      }
    };
  }

  /**
   * Enroll learner in course (creates program-level course enrollment)
   */
  static async enrollCourse(data: EnrollCourseData, _userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(data.learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    if (!mongoose.Types.ObjectId.isValid(data.courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    // Verify learner exists
    const learner = await User.findById(data.learnerId);
    if (!learner) {
      throw ApiError.notFound('Learner not found');
    }

    // Verify course exists
    const course = await Course.findById(data.courseId).populate('departmentId');
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // For course enrollments, we store in metadata of a generic enrollment
    // Get current academic year
    const academicYearId = new mongoose.Types.ObjectId();

    // Check for existing course enrollment
    const existingEnrollment = await Enrollment.findOne({
      learnerId: data.learnerId,
      'metadata.courseId': data.courseId,
      status: { $in: ['active', 'pending', 'suspended'] }
    });

    if (existingEnrollment) {
      throw ApiError.conflict('Learner already enrolled in this course');
    }

    // Create a placeholder program enrollment for the course
    const enrollment = new Enrollment({
      learnerId: data.learnerId,
      programId: new mongoose.Types.ObjectId(), // Placeholder
      academicYearId,
      status: 'active',
      enrollmentDate: data.enrolledAt || new Date(),
      startDate: data.enrolledAt || new Date(),
      metadata: {
        courseId: data.courseId,
        enrollmentType: 'course',
        expiresAt: data.expiresAt
      }
    });

    await enrollment.save();

    // Get learner details
    const learnerDetails = await Learner.findById(data.learnerId);

    return {
      enrollment: {
        id: enrollment._id.toString(),
        type: 'course',
        learner: {
          id: learner._id.toString(),
          firstName: learnerDetails?.firstName || '',
          lastName: learnerDetails?.lastName || '',
          email: learner.email
        },
        course: {
          id: course._id.toString(),
          title: course.name,
          code: course.code,
          modules: 0, // Would need CourseContent count
          department: {
            id: (course.departmentId as any)._id.toString(),
            name: (course.departmentId as any).name
          }
        },
        status: enrollment.status,
        enrolledAt: enrollment.enrollmentDate,
        completedAt: null,
        withdrawnAt: null,
        expiresAt: data.expiresAt || null,
        progress: {
          percentage: 0,
          completedItems: 0,
          totalItems: 0
        },
        createdAt: enrollment.createdAt,
        updatedAt: enrollment.updatedAt
      }
    };
  }

  /**
   * Enroll learner in class
   */
  static async enrollClass(data: EnrollClassData, _userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(data.learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    if (!mongoose.Types.ObjectId.isValid(data.classId)) {
      throw ApiError.badRequest('Invalid class ID');
    }

    // Verify learner exists
    const learner = await User.findById(data.learnerId);
    if (!learner) {
      throw ApiError.notFound('Learner not found');
    }

    // Verify class exists
    const classDoc = await Class.findById(data.classId)
      .populate('courseId')
      .populate('instructorIds');

    if (!classDoc) {
      throw ApiError.notFound('Class not found');
    }

    // Check capacity
    if (classDoc.currentEnrollment >= classDoc.maxEnrollment) {
      throw ApiError.unprocessable('Class has reached maximum capacity');
    }

    // Check if class has started
    const now = new Date();
    if (classDoc.startDate < now) {
      throw ApiError.unprocessable('Class has already started');
    }

    // Check for existing enrollment
    const existingEnrollment = await ClassEnrollment.findOne({
      learnerId: data.learnerId,
      classId: data.classId,
      status: { $in: ['enrolled', 'active'] }
    });

    if (existingEnrollment) {
      throw ApiError.conflict('Learner already enrolled in this class');
    }

    // Create class enrollment
    const enrollment = new ClassEnrollment({
      learnerId: data.learnerId,
      classId: data.classId,
      status: 'enrolled',
      enrollmentDate: data.enrolledAt || new Date()
    });

    await enrollment.save();

    // Update class enrollment count
    classDoc.currentEnrollment += 1;
    await classDoc.save();

    // Get learner details
    const learnerDetails = await Learner.findById(data.learnerId);
    const course = classDoc.courseId as any;
    const instructor = classDoc.instructorIds.length > 0 ? classDoc.instructorIds[0] : null;

    // Get department
    const courseDoc = await Course.findById(course._id).populate('departmentId');
    const department = courseDoc?.departmentId as any;

    return {
      enrollment: {
        id: enrollment._id.toString(),
        type: 'class',
        learner: {
          id: learner._id.toString(),
          firstName: learnerDetails?.firstName || '',
          lastName: learnerDetails?.lastName || '',
          email: learner.email
        },
        class: {
          id: classDoc._id.toString(),
          name: classDoc.name,
          course: {
            id: course._id.toString(),
            title: course.name,
            code: course.code
          },
          instructor: instructor ? {
            id: (instructor as any)._id.toString(),
            firstName: (instructor as any).firstName || '',
            lastName: (instructor as any).lastName || ''
          } : null,
          schedule: {
            startDate: classDoc.startDate,
            endDate: classDoc.endDate,
            capacity: classDoc.maxEnrollment,
            enrolled: classDoc.currentEnrollment
          },
          department: department ? {
            id: department._id.toString(),
            name: department.name
          } : null
        },
        status: enrollment.status,
        enrolledAt: enrollment.enrollmentDate,
        completedAt: null,
        withdrawnAt: null,
        expiresAt: classDoc.endDate,
        progress: {
          percentage: 0,
          completedItems: 0,
          totalItems: 0
        },
        createdAt: enrollment.createdAt,
        updatedAt: enrollment.updatedAt
      }
    };
  }

  /**
   * Get enrollment by ID with detailed information
   */
  static async getEnrollmentById(enrollmentId: string, _userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      throw ApiError.badRequest('Invalid enrollment ID');
    }

    // Try to find in program enrollments first
    let enrollment: any = await Enrollment.findById(enrollmentId).lean();
    let type = 'program';

    // If not found, try class enrollments
    if (!enrollment) {
      enrollment = await ClassEnrollment.findById(enrollmentId).lean();
      type = 'class';
    }

    if (!enrollment) {
      throw ApiError.notFound('Enrollment not found');
    }

    // Enrich with full details
    return await this.enrichEnrollmentDetails({ ...enrollment, type });
  }

  /**
   * Update enrollment status
   */
  static async updateEnrollmentStatus(
    enrollmentId: string,
    data: UpdateStatusData,
    userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      throw ApiError.badRequest('Invalid enrollment ID');
    }

    // Try program enrollment first
    let enrollment: any = await Enrollment.findById(enrollmentId);
    let type = 'program';

    if (!enrollment) {
      enrollment = await ClassEnrollment.findById(enrollmentId);
      type = 'class';
    }

    if (!enrollment) {
      throw ApiError.notFound('Enrollment not found');
    }

    // Validate status transition
    this.validateStatusTransition(enrollment.status, data.status);

    // Update status
    enrollment.status = this.mapStatusToModelStatus(data.status, type);

    // Update timestamps based on new status
    if (data.status === 'completed') {
      enrollment.completionDate = new Date();
      if (data.grade) {
        enrollment.gradeLetter = data.grade.letter;
        enrollment.gradePercentage = data.grade.score;
      }
    } else if (data.status === 'withdrawn') {
      enrollment.withdrawalDate = new Date();
      if (data.reason) {
        enrollment.withdrawalReason = data.reason;
      }
    }

    await enrollment.save();

    // Get user details for graded by
    const user = await User.findById(userId);
    const grader = user ? await Learner.findById(userId) : null;

    return {
      id: enrollment._id.toString(),
      status: data.status,
      completedAt: enrollment.completionDate || null,
      withdrawnAt: enrollment.withdrawalDate || null,
      grade: data.grade ? {
        score: data.grade.score,
        letter: data.grade.letter,
        passed: data.grade.passed,
        gradedAt: new Date(),
        gradedBy: grader ? {
          id: userId,
          firstName: grader.firstName || '',
          lastName: grader.lastName || ''
        } : null
      } : null,
      updatedAt: enrollment.updatedAt
    };
  }

  /**
   * Withdraw from enrollment
   */
  static async withdrawEnrollment(
    enrollmentId: string,
    data: WithdrawData,
    _userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      throw ApiError.badRequest('Invalid enrollment ID');
    }

    // Try program enrollment first
    let enrollment: any = await Enrollment.findById(enrollmentId);
    let type = 'program';

    if (!enrollment) {
      enrollment = await ClassEnrollment.findById(enrollmentId);
      type = 'class';
    }

    if (!enrollment) {
      throw ApiError.notFound('Enrollment not found');
    }

    // Check if already completed or withdrawn
    if (enrollment.status === 'completed' || enrollment.status === 'graduated') {
      throw ApiError.unprocessable('Cannot withdraw from completed enrollment');
    }

    if (enrollment.status === 'withdrawn' || enrollment.status === 'dropped') {
      throw ApiError.unprocessable('Enrollment already withdrawn');
    }

    // Update to withdrawn status
    enrollment.status = type === 'program' ? 'withdrawn' : 'withdrawn';
    enrollment.withdrawalDate = new Date();
    if (data.reason) {
      enrollment.withdrawalReason = data.reason;
    }

    await enrollment.save();

    // If class enrollment, update class count
    if (type === 'class') {
      const classDoc = await Class.findById(enrollment.classId);
      if (classDoc && classDoc.currentEnrollment > 0) {
        classDoc.currentEnrollment -= 1;
        await classDoc.save();
      }
    }

    return {
      id: enrollment._id.toString(),
      status: 'withdrawn',
      withdrawnAt: enrollment.withdrawalDate,
      finalGrade: {
        score: enrollment.gradePercentage || null,
        letter: enrollment.gradeLetter || null
      }
    };
  }

  /**
   * List enrollments for a specific program
   */
  static async listProgramEnrollments(
    programId: string,
    filters: ProgramEnrollmentFilters,
    _userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    const program = await Program.findById(programId);
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 10));
    const skip = (page - 1) * limit;

    const query: any = { programId };
    if (filters.status) {
      query.status = this.mapStatusToEnrollmentStatus(filters.status);
    }

    const sortField = filters.sort || '-enrolledAt';
    const sortOrder = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '').replace('enrolledAt', 'enrollmentDate');
    const sort: any = { [sortKey]: sortOrder };

    const [enrollments, total] = await Promise.all([
      Enrollment.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Enrollment.countDocuments(query)
    ]);

    // Calculate statistics
    const stats = await this.calculateProgramStats(programId);

    // Enrich enrollments
    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const user = await User.findById(enrollment.learnerId);
        const learner = await Learner.findById(enrollment.learnerId);

        if (!user || !learner) return null;

        return {
          id: enrollment._id.toString(),
          learner: {
            id: user._id.toString(),
            firstName: learner.firstName,
            lastName: learner.lastName,
            email: user.email
          },
          status: this.mapModelStatusToContractStatus(enrollment.status),
          enrolledAt: enrollment.enrollmentDate,
          completedAt: enrollment.completionDate || null,
          progress: {
            percentage: 0,
            completedItems: 0,
            totalItems: 0
          },
          grade: {
            score: enrollment.cumulativeGPA ? enrollment.cumulativeGPA * 25 : null,
            letter: null,
            passed: null
          }
        };
      })
    );

    const totalPages = Math.ceil(total / limit);

    return {
      program: {
        id: program._id.toString(),
        name: program.name,
        code: program.code
      },
      enrollments: enrichedEnrollments.filter(e => e !== null),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      stats
    };
  }

  /**
   * List enrollments for a specific course
   */
  static async listCourseEnrollments(
    courseId: string,
    filters: ProgramEnrollmentFilters,
    _userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 10));
    const skip = (page - 1) * limit;

    const query: any = { 'metadata.courseId': courseId };
    if (filters.status) {
      query.status = this.mapStatusToEnrollmentStatus(filters.status);
    }

    const sortField = filters.sort || '-enrolledAt';
    const sortOrder = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '').replace('enrolledAt', 'enrollmentDate');
    const sort: any = { [sortKey]: sortOrder };

    const [enrollments, total] = await Promise.all([
      Enrollment.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Enrollment.countDocuments(query)
    ]);

    // Calculate statistics
    const stats = await this.calculateCourseStats(courseId);

    // Enrich enrollments
    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const user = await User.findById(enrollment.learnerId);
        const learner = await Learner.findById(enrollment.learnerId);

        if (!user || !learner) return null;

        return {
          id: enrollment._id.toString(),
          learner: {
            id: user._id.toString(),
            firstName: learner.firstName,
            lastName: learner.lastName,
            email: user.email
          },
          status: this.mapModelStatusToContractStatus(enrollment.status),
          enrolledAt: enrollment.enrollmentDate,
          completedAt: enrollment.completionDate || null,
          progress: {
            percentage: 0,
            completedItems: 0,
            totalItems: 0,
            lastActivityAt: null
          },
          grade: {
            score: enrollment.cumulativeGPA ? enrollment.cumulativeGPA * 25 : null,
            letter: null,
            passed: null
          }
        };
      })
    );

    const totalPages = Math.ceil(total / limit);

    return {
      course: {
        id: course._id.toString(),
        title: course.name,
        code: course.code
      },
      enrollments: enrichedEnrollments.filter(e => e !== null),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      stats
    };
  }

  /**
   * List enrollments for a specific class
   */
  static async listClassEnrollments(
    classId: string,
    filters: ProgramEnrollmentFilters,
    _userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw ApiError.badRequest('Invalid class ID');
    }

    const classDoc = await Class.findById(classId).populate('courseId');
    if (!classDoc) {
      throw ApiError.notFound('Class not found');
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 10));
    const skip = (page - 1) * limit;

    const query: any = { classId };
    if (filters.status) {
      query.status = this.mapStatusToClassStatus(filters.status);
    }

    const sortField = filters.sort || 'learner.lastName';
    const sortOrder = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '').replace('learner.lastName', 'learnerId');
    const sort: any = { [sortKey]: sortOrder };

    const [enrollments, total] = await Promise.all([
      ClassEnrollment.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      ClassEnrollment.countDocuments(query)
    ]);

    // Calculate statistics
    const stats = await this.calculateClassStats(classId, classDoc.maxEnrollment);

    // Enrich enrollments
    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const user = await User.findById(enrollment.learnerId);
        const learner = await Learner.findById(enrollment.learnerId);

        if (!user || !learner) return null;

        const attendanceRecords = enrollment.attendanceRecords || [];
        const totalSessions = 10; // Would need actual session count
        const sessionsAttended = attendanceRecords.filter(r => r.status === 'present').length;

        return {
          id: enrollment._id.toString(),
          learner: {
            id: user._id.toString(),
            firstName: learner.firstName,
            lastName: learner.lastName,
            email: user.email
          },
          status: this.mapModelStatusToContractStatus(enrollment.status),
          enrolledAt: enrollment.enrollmentDate,
          completedAt: enrollment.completionDate || null,
          progress: {
            percentage: 0,
            completedItems: 0,
            totalItems: 0,
            lastActivityAt: null
          },
          grade: {
            score: enrollment.gradePercentage || null,
            letter: enrollment.gradeLetter || null,
            passed: null
          },
          attendance: {
            sessionsAttended,
            totalSessions,
            attendanceRate: totalSessions > 0 ? (sessionsAttended / totalSessions) * 100 : 0
          }
        };
      })
    );

    const course = classDoc.courseId as any;

    const totalPages = Math.ceil(total / limit);

    return {
      class: {
        id: classDoc._id.toString(),
        name: classDoc.name,
        course: {
          id: course._id.toString(),
          title: course.name,
          code: course.code
        },
        schedule: {
          startDate: classDoc.startDate,
          endDate: classDoc.endDate,
          capacity: classDoc.maxEnrollment
        }
      },
      enrollments: enrichedEnrollments.filter(e => e !== null),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      stats
    };
  }

  // Helper methods

  private static async enrichEnrollment(enrollment: any): Promise<any> {
    try {
      if (enrollment.type === 'program') {
        const user = await User.findById(enrollment.learnerId);
        const learner = await Learner.findById(enrollment.learnerId);
        const program = await Program.findById(enrollment.programId).populate('departmentId');

        if (!user || !learner || !program) return null;

        const department = program.departmentId as any;

        return {
          id: enrollment._id.toString(),
          type: 'program',
          learner: {
            id: user._id.toString(),
            firstName: learner.firstName,
            lastName: learner.lastName,
            email: user.email
          },
          target: {
            id: program._id.toString(),
            name: program.name,
            code: program.code,
            type: 'program'
          },
          status: this.mapModelStatusToContractStatus(enrollment.status),
          enrolledAt: enrollment.enrollmentDate,
          completedAt: enrollment.completionDate || null,
          withdrawnAt: enrollment.withdrawalDate || null,
          expiresAt: enrollment.metadata?.expiresAt || null,
          progress: {
            percentage: 0,
            completedItems: 0,
            totalItems: 0
          },
          grade: {
            score: enrollment.cumulativeGPA ? enrollment.cumulativeGPA * 25 : null,
            letter: null,
            passed: null
          },
          department: {
            id: department._id.toString(),
            name: department.name
          },
          createdAt: enrollment.createdAt,
          updatedAt: enrollment.updatedAt
        };
      } else {
        // Class enrollment
        const user = await User.findById(enrollment.learnerId);
        const learner = await Learner.findById(enrollment.learnerId);
        const classDoc = await Class.findById(enrollment.classId).populate('courseId');

        if (!user || !learner || !classDoc) return null;

        const course = classDoc.courseId as any;
        const courseDoc = await Course.findById(course._id).populate('departmentId');
        const department = courseDoc?.departmentId as any;

        return {
          id: enrollment._id.toString(),
          type: 'class',
          learner: {
            id: user._id.toString(),
            firstName: learner.firstName,
            lastName: learner.lastName,
            email: user.email
          },
          target: {
            id: classDoc._id.toString(),
            name: classDoc.name,
            code: course.code,
            type: 'class'
          },
          status: this.mapModelStatusToContractStatus(enrollment.status),
          enrolledAt: enrollment.enrollmentDate,
          completedAt: enrollment.completionDate || null,
          withdrawnAt: enrollment.dropDate || null,
          expiresAt: classDoc.endDate,
          progress: {
            percentage: 0,
            completedItems: 0,
            totalItems: 0
          },
          grade: {
            score: enrollment.gradePercentage || null,
            letter: enrollment.gradeLetter || null,
            passed: null
          },
          department: department ? {
            id: department._id.toString(),
            name: department.name
          } : null,
          createdAt: enrollment.createdAt,
          updatedAt: enrollment.updatedAt
        };
      }
    } catch (error) {
      console.error('Error enriching enrollment:', error);
      return null;
    }
  }

  private static async enrichEnrollmentDetails(enrollment: any): Promise<any> {
    // Similar to enrichEnrollment but with more details
    const basic = await this.enrichEnrollment(enrollment);
    if (!basic) throw ApiError.notFound('Enrollment details not available');

    // Add extra details
    return {
      ...basic,
      progress: {
        ...basic.progress,
        lastActivityAt: null,
        moduleProgress: []
      },
      notes: enrollment.metadata?.notes || null,
      metadata: enrollment.metadata || {}
    };
  }

  private static async calculateProgramStats(programId: string): Promise<any> {
    const total = await Enrollment.countDocuments({ programId });
    const active = await Enrollment.countDocuments({ programId, status: 'active' });
    const completed = await Enrollment.countDocuments({ programId, status: 'completed' });
    const withdrawn = await Enrollment.countDocuments({ programId, status: 'withdrawn' });

    return {
      total,
      active,
      completed,
      withdrawn,
      averageProgress: 0,
      completionRate: total > 0 ? (completed / total) * 100 : 0
    };
  }

  private static async calculateCourseStats(courseId: string): Promise<any> {
    const total = await Enrollment.countDocuments({ 'metadata.courseId': courseId });
    const active = await Enrollment.countDocuments({ 'metadata.courseId': courseId, status: 'active' });
    const completed = await Enrollment.countDocuments({ 'metadata.courseId': courseId, status: 'completed' });
    const withdrawn = await Enrollment.countDocuments({ 'metadata.courseId': courseId, status: 'withdrawn' });

    return {
      total,
      active,
      completed,
      withdrawn,
      averageProgress: 0,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      averageScore: 0
    };
  }

  private static async calculateClassStats(classId: string, capacity: number): Promise<any> {
    const total = await ClassEnrollment.countDocuments({ classId });
    const active = await ClassEnrollment.countDocuments({ classId, status: { $in: ['enrolled', 'active'] } });
    const completed = await ClassEnrollment.countDocuments({ classId, status: 'completed' });
    const withdrawn = await ClassEnrollment.countDocuments({ classId, status: { $in: ['dropped', 'withdrawn'] } });

    return {
      total,
      active,
      completed,
      withdrawn,
      capacity,
      seatsAvailable: capacity - active,
      averageProgress: 0,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      averageScore: 0,
      averageAttendance: 0
    };
  }

  private static mapStatusToEnrollmentStatus(status: string): string {
    const map: any = {
      'active': 'active',
      'completed': 'completed',
      'withdrawn': 'withdrawn',
      'suspended': 'suspended',
      'expired': 'expired'
    };
    return map[status] || 'active';
  }

  private static mapStatusToClassStatus(status: string): string {
    const map: any = {
      'active': 'active',
      'completed': 'completed',
      'withdrawn': 'withdrawn',
      'suspended': 'active',
      'expired': 'dropped'
    };
    return map[status] || 'active';
  }

  private static mapModelStatusToContractStatus(status: string): string {
    const map: any = {
      'pending': 'active',
      'active': 'active',
      'enrolled': 'active',
      'completed': 'completed',
      'graduated': 'completed',
      'withdrawn': 'withdrawn',
      'dropped': 'withdrawn',
      'suspended': 'suspended',
      'failed': 'withdrawn'
    };
    return map[status] || 'active';
  }

  private static mapStatusToModelStatus(status: string, type: string): string {
    if (type === 'program') {
      const map: any = {
        'active': 'active',
        'completed': 'completed',
        'withdrawn': 'withdrawn',
        'suspended': 'suspended'
      };
      return map[status] || 'active';
    } else {
      const map: any = {
        'active': 'active',
        'completed': 'completed',
        'withdrawn': 'withdrawn',
        'suspended': 'active'
      };
      return map[status] || 'active';
    }
  }

  private static validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: any = {
      'active': ['completed', 'withdrawn', 'suspended'],
      'pending': ['active', 'withdrawn'],
      'enrolled': ['active', 'completed', 'withdrawn'],
      'suspended': ['active', 'withdrawn'],
      'completed': [],
      'graduated': [],
      'withdrawn': [],
      'dropped': []
    };

    const mappedNewStatus = this.mapStatusToModelStatus(newStatus, 'program');
    const allowed = validTransitions[currentStatus] || [];

    if (!allowed.includes(mappedNewStatus)) {
      throw ApiError.unprocessable(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }
}
