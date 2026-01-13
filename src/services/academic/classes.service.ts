import mongoose from 'mongoose';
import Class, { IClass } from '@/models/academic/Class.model';
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import Course from '@/models/academic/Course.model';
import Program from '@/models/academic/Program.model';
import ProgramLevel from '@/models/academic/ProgramLevel.model';
import AcademicTerm from '@/models/academic/AcademicTerm.model';
import Department from '@/models/organization/Department.model';
import { Staff } from '@/models/auth/Staff.model';
import { User } from '@/models/auth/User.model';
import { ApiError } from '@/utils/ApiError';
import { maskLastName } from '@/utils/dataMasking';

interface ListClassesFilters {
  course?: string;
  program?: string;
  instructor?: string;
  status?: 'upcoming' | 'active' | 'completed' | 'cancelled';
  department?: string;
  term?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

interface CreateClassData {
  name: string;
  course: string;
  program: string;
  programLevel?: string;
  instructors: Array<{ userId: string; role: 'primary' | 'secondary' }>;
  startDate: Date;
  endDate: Date;
  duration?: number;
  capacity?: number | null;
  academicTerm?: string;
}

interface UpdateClassData {
  name?: string;
  instructors?: Array<{ userId: string; role: 'primary' | 'secondary' }>;
  startDate?: Date;
  endDate?: Date;
  duration?: number;
  capacity?: number | null;
  academicTerm?: string;
  status?: 'upcoming' | 'active' | 'completed' | 'cancelled';
}

interface EnrollmentFilters {
  status?: 'active' | 'withdrawn' | 'completed';
  page?: number;
  limit?: number;
}

export class ClassesService {
  /**
   * List classes with filters and pagination
   */
  static async listClasses(filters: ListClassesFilters): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { isActive: true };

    if (filters.course) {
      if (!mongoose.Types.ObjectId.isValid(filters.course)) {
        throw ApiError.badRequest('Invalid course ID');
      }
      query.courseId = filters.course;
    }

    if (filters.instructor) {
      if (!mongoose.Types.ObjectId.isValid(filters.instructor)) {
        throw ApiError.badRequest('Invalid instructor ID');
      }
      query.instructorIds = filters.instructor;
    }

    if (filters.term) {
      if (!mongoose.Types.ObjectId.isValid(filters.term)) {
        throw ApiError.badRequest('Invalid term ID');
      }
      query.academicYearId = filters.term;
    }

    if (filters.search) {
      query.name = { $regex: filters.search, $options: 'i' };
    }

    // Parse sort
    const sortField = filters.sort || '-startDate';
    const sortDirection = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortObj: any = { [sortKey]: sortDirection };

    // Execute query
    const [classes, _total] = await Promise.all([
      Class.find(query)
        .populate('courseId')
        .populate('academicYearId')
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Class.countDocuments(query)
    ]);

    // Format data with enrollment counts and status
    const classesData = await Promise.all(
      classes.map(async (classDoc) => {
        const course = classDoc.courseId as any;
        const academicTerm = classDoc.academicYearId as any;

        // Get enrollment count
        const enrolledCount = await ClassEnrollment.countDocuments({
          classId: classDoc._id,
          status: { $in: ['enrolled', 'active'] }
        });

        // Compute status
        const status = this.computeClassStatus(classDoc);

        // Get department from course
        let department = null;
        if (course && course.departmentId) {
          const deptDoc = await Department.findById(course.departmentId);
          if (deptDoc) {
            department = {
              id: deptDoc._id.toString(),
              name: deptDoc.name
            };
          }
        }

        // Filter by status if requested
        if (filters.status && status !== filters.status) {
          return null;
        }

        // Filter by department if requested
        if (filters.department && department && department.id !== filters.department) {
          return null;
        }

        // Filter by program if requested (need to check via course)
        if (filters.program) {
          // This would require additional lookup - for now skip if doesn't match
          // In real implementation, would need to traverse course -> program relationship
        }

        // Get instructor details
        const instructorDetails = await Staff.find({
          _id: { $in: classDoc.instructorIds }
        }).lean();

        const instructorsWithRoles = instructorDetails.map((staff: any) => ({
          id: staff._id.toString(),
          firstName: staff.person.firstName,
          lastName: staff.person.lastName,
          email: '', // Would need to join with User model
          role: 'primary' // Default, would need to store this info
        }));

        return {
          id: classDoc._id.toString(),
          name: classDoc.name,
          course: course ? {
            id: course._id.toString(),
            title: course.name,
            code: course.code
          } : null,
          program: null, // Would need program relationship
          programLevel: null,
          instructors: instructorsWithRoles,
          startDate: classDoc.startDate,
          endDate: classDoc.endDate,
          duration: this.calculateDuration(classDoc.startDate, classDoc.endDate),
          capacity: classDoc.maxEnrollment,
          enrolledCount,
          academicTerm: academicTerm ? {
            id: academicTerm._id.toString(),
            name: academicTerm.name
          } : null,
          status,
          department,
          createdAt: classDoc.createdAt,
          updatedAt: classDoc.updatedAt
        };
      })
    );

    // Filter out nulls (from status/department filtering)
    const filteredClasses = classesData.filter((c) => c !== null);

    return {
      classes: filteredClasses,
      pagination: {
        page,
        limit,
        total: filteredClasses.length,
        totalPages: Math.ceil(filteredClasses.length / limit),
        hasNext: page < Math.ceil(filteredClasses.length / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Create a new class
   */
  static async createClass(classData: CreateClassData): Promise<any> {
    // Validate course exists
    if (!mongoose.Types.ObjectId.isValid(classData.course)) {
      throw ApiError.notFound('Course not found');
    }

    const course = await Course.findById(classData.course);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    if (!course.isActive) {
      throw ApiError.badRequest('Course must be active to create a class');
    }

    // Validate program exists
    if (!mongoose.Types.ObjectId.isValid(classData.program)) {
      throw ApiError.notFound('Program not found');
    }

    const program = await Program.findById(classData.program);
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    if (!program.isActive) {
      throw ApiError.badRequest('Program must be active to create a class');
    }

    // Validate program level if provided
    let programLevel = null;
    if (classData.programLevel) {
      if (!mongoose.Types.ObjectId.isValid(classData.programLevel)) {
        throw ApiError.notFound('Program level not found');
      }
      programLevel = await ProgramLevel.findById(classData.programLevel);
      if (!programLevel) {
        throw ApiError.notFound('Program level not found');
      }
    }

    // Validate academic term if provided
    let academicTerm = null;
    if (classData.academicTerm) {
      if (!mongoose.Types.ObjectId.isValid(classData.academicTerm)) {
        throw ApiError.notFound('Academic term not found');
      }
      academicTerm = await AcademicTerm.findById(classData.academicTerm);
      if (!academicTerm) {
        throw ApiError.notFound('Academic term not found');
      }
    }

    // Validate dates
    const startDate = new Date(classData.startDate);
    const endDate = new Date(classData.endDate);

    if (endDate <= startDate) {
      throw ApiError.badRequest('End date must be after start date');
    }

    // Validate instructors
    if (!classData.instructors || classData.instructors.length === 0) {
      throw ApiError.badRequest('At least one instructor is required');
    }

    // Check for at least one primary instructor
    const hasPrimary = classData.instructors.some((i) => i.role === 'primary');
    if (!hasPrimary) {
      throw ApiError.badRequest('At least one primary instructor is required');
    }

    // Validate all instructors exist and are staff
    const instructorIds = classData.instructors.map((i) => i.userId);
    for (const instructorId of instructorIds) {
      if (!mongoose.Types.ObjectId.isValid(instructorId)) {
        throw ApiError.badRequest(`Invalid instructor ID: ${instructorId}`);
      }

      const staff = await Staff.findById(instructorId);
      if (!staff || !staff.isActive) {
        throw ApiError.badRequest(`Instructor not found or inactive: ${instructorId}`);
      }

      // Check if user has instructor role
      const user = await User.findById(instructorId);
      if (!user || !user.roles.includes('instructor')) {
        throw ApiError.badRequest(`User is not an instructor: ${instructorId}`);
      }
    }

    // Check for duplicate class name
    const existingClass = await Class.findOne({
      name: classData.name,
      courseId: course._id,
      academicYearId: academicTerm ? academicTerm._id : undefined
    });

    if (existingClass) {
      throw ApiError.conflict('A class with this name already exists for this course and term');
    }

    // Calculate duration if not provided
    const duration = classData.duration || this.calculateDuration(startDate, endDate);

    // Create class
    const newClass = await Class.create({
      name: classData.name,
      courseId: course._id,
      academicYearId: academicTerm ? academicTerm._id : undefined,
      termCode: academicTerm ? academicTerm.termType.toUpperCase() : 'CUSTOM',
      startDate,
      endDate,
      duration,
      instructorIds: instructorIds.map((id) => new mongoose.Types.ObjectId(id)),
      maxEnrollment: classData.capacity || 999999,
      currentEnrollment: 0,
      isActive: true
    });

    // Get department from course
    const department = await Department.findById(course.departmentId);

    // Format response
    const instructorDetails = await Staff.find({
      _id: { $in: instructorIds }
    }).lean();

    const instructorsWithRoles = await Promise.all(
      classData.instructors.map(async (inst) => {
        const staff: any = instructorDetails.find(
          (s: any) => s._id.toString() === inst.userId
        );
        const user = await User.findById(inst.userId);

        return {
          id: staff._id.toString(),
          firstName: staff.person.firstName,
          lastName: staff.person.lastName,
          email: user ? user.email : '',
          role: inst.role
        };
      })
    );

    return {
      id: newClass._id.toString(),
      name: newClass.name,
      course: {
        id: course._id.toString(),
        title: course.name,
        code: course.code
      },
      program: {
        id: program._id.toString(),
        name: program.name
      },
      programLevel: programLevel ? {
        id: programLevel._id.toString(),
        name: programLevel.name,
        levelNumber: programLevel.levelNumber
      } : null,
      instructors: instructorsWithRoles,
      startDate: newClass.startDate,
      endDate: newClass.endDate,
      duration: duration,
      capacity: classData.capacity || null,
      enrolledCount: 0,
      academicTerm: academicTerm ? {
        id: academicTerm._id.toString(),
        name: academicTerm.name
      } : null,
      status: 'upcoming',
      department: department ? {
        id: department._id.toString(),
        name: department.name
      } : null,
      createdAt: newClass.createdAt,
      updatedAt: newClass.updatedAt
    };
  }

  /**
   * Get class by ID with enrollment count
   */
  static async getClassById(classId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw ApiError.notFound('Class not found');
    }

    const classDoc = await Class.findById(classId)
      .populate('courseId')
      .populate('academicYearId');

    if (!classDoc || !classDoc.isActive) {
      throw ApiError.notFound('Class not found');
    }

    const course = classDoc.courseId as any;
    const academicTerm = classDoc.academicYearId as any;

    // Get enrollment and waitlist counts
    const enrolledCount = await ClassEnrollment.countDocuments({
      classId: classDoc._id,
      status: { $in: ['enrolled', 'active'] }
    });

    const waitlistCount = 0; // Placeholder - would need waitlist model

    // Get department from course
    let department = null;
    if (course && course.departmentId) {
      const deptDoc = await Department.findById(course.departmentId);
      if (deptDoc) {
        department = {
          id: deptDoc._id.toString(),
          name: deptDoc.name,
          code: deptDoc.code || ''
        };
      }
    }

    // Get instructor details
    const instructorDetails = await Staff.find({
      _id: { $in: classDoc.instructorIds }
    }).lean();

    const instructors = await Promise.all(
      instructorDetails.map(async (staff: any) => {
        const user = await User.findById(staff._id);
        return {
          id: staff._id.toString(),
          firstName: staff.person.firstName,
          lastName: staff.person.lastName,
          email: user ? user.email : '',
          role: 'primary', // Default, would need to store this
          profileImage: null
        };
      })
    );

    const status = this.computeClassStatus(classDoc);

    return {
      id: classDoc._id.toString(),
      name: classDoc.name,
      course: course ? {
        id: course._id.toString(),
        title: course.name,
        code: course.code,
        description: course.description || '',
        credits: course.credits || 0
      } : null,
      program: null, // Would need program relationship
      programLevel: null,
      instructors,
      startDate: classDoc.startDate,
      endDate: classDoc.endDate,
      duration: this.calculateDuration(classDoc.startDate, classDoc.endDate),
      capacity: classDoc.maxEnrollment < 999999 ? classDoc.maxEnrollment : null,
      enrolledCount,
      waitlistCount,
      academicTerm: academicTerm ? {
        id: academicTerm._id.toString(),
        name: academicTerm.name,
        startDate: academicTerm.startDate,
        endDate: academicTerm.endDate
      } : null,
      status,
      department,
      createdAt: classDoc.createdAt,
      updatedAt: classDoc.updatedAt
    };
  }

  /**
   * Update class
   */
  static async updateClass(classId: string, updateData: UpdateClassData): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw ApiError.notFound('Class not found');
    }

    const classDoc = await Class.findById(classId);
    if (!classDoc || !classDoc.isActive) {
      throw ApiError.notFound('Class not found');
    }

    // Validate dates if changing
    const startDate = updateData.startDate ? new Date(updateData.startDate) : classDoc.startDate;
    const endDate = updateData.endDate ? new Date(updateData.endDate) : classDoc.endDate;

    if (endDate <= startDate) {
      throw ApiError.badRequest('End date must be after start date');
    }

    // Validate capacity if changing
    if (updateData.capacity !== undefined && updateData.capacity !== null) {
      const currentEnrollment = await ClassEnrollment.countDocuments({
        classId: classDoc._id,
        status: { $in: ['enrolled', 'active'] }
      });

      if (updateData.capacity < currentEnrollment) {
        throw ApiError.badRequest('Cannot reduce capacity below current enrollment count');
      }
    }

    // Validate instructors if changing
    if (updateData.instructors && updateData.instructors.length > 0) {
      const hasPrimary = updateData.instructors.some((i) => i.role === 'primary');
      if (!hasPrimary) {
        throw ApiError.badRequest('At least one primary instructor is required');
      }

      const instructorIds = updateData.instructors.map((i) => i.userId);
      for (const instructorId of instructorIds) {
        if (!mongoose.Types.ObjectId.isValid(instructorId)) {
          throw ApiError.badRequest(`Invalid instructor ID: ${instructorId}`);
        }

        const staff = await Staff.findById(instructorId);
        if (!staff || !staff.isActive) {
          throw ApiError.badRequest(`Instructor not found or inactive: ${instructorId}`);
        }

        const user = await User.findById(instructorId);
        if (!user || !user.roles.includes('instructor')) {
          throw ApiError.badRequest(`User is not an instructor: ${instructorId}`);
        }
      }

      classDoc.instructorIds = instructorIds.map((id) => new mongoose.Types.ObjectId(id));
    }

    // Validate academic term if changing
    if (updateData.academicTerm) {
      if (!mongoose.Types.ObjectId.isValid(updateData.academicTerm)) {
        throw ApiError.notFound('Academic term not found');
      }
      const academicTerm = await AcademicTerm.findById(updateData.academicTerm);
      if (!academicTerm) {
        throw ApiError.notFound('Academic term not found');
      }
      classDoc.academicYearId = academicTerm._id;
      classDoc.termCode = academicTerm.termType.toUpperCase();
    }

    // Update fields
    if (updateData.name !== undefined) classDoc.name = updateData.name;
    if (updateData.startDate !== undefined) classDoc.startDate = startDate;
    if (updateData.endDate !== undefined) classDoc.endDate = endDate;
    if (updateData.capacity !== undefined) {
      classDoc.maxEnrollment = updateData.capacity || 999999;
    }

    await classDoc.save();

    // Return updated class
    return this.getClassById(classId);
  }

  /**
   * Delete class (soft delete)
   */
  static async deleteClass(classId: string, force: boolean = false): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw ApiError.notFound('Class not found');
    }

    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      throw ApiError.notFound('Class not found');
    }

    // Check for enrollments
    const enrollmentCount = await ClassEnrollment.countDocuments({
      classId: classDoc._id,
      status: { $in: ['enrolled', 'active'] }
    });

    if (enrollmentCount > 0 && !force) {
      throw ApiError.badRequest('Cannot delete class with active enrollments. Set status to cancelled instead.');
    }

    // Soft delete
    classDoc.isActive = false;
    await classDoc.save();

    return {
      id: classDoc._id.toString(),
      deleted: true,
      deletedAt: new Date()
    };
  }

  /**
   * List class enrollments
   */
  static async listClassEnrollments(classId: string, filters: EnrollmentFilters): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw ApiError.notFound('Class not found');
    }

    const classDoc = await Class.findById(classId);
    if (!classDoc || !classDoc.isActive) {
      throw ApiError.notFound('Class not found');
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { classId: classDoc._id };

    if (filters.status) {
      query.status = filters.status === 'active' ? { $in: ['enrolled', 'active'] } : filters.status;
    }

    // Execute query
    const [enrollments, total] = await Promise.all([
      ClassEnrollment.find(query)
        .populate('learnerId')
        .sort({ enrollmentDate: 1 })
        .skip(skip)
        .limit(limit),
      ClassEnrollment.countDocuments(query)
    ]);

    // Format data
    const enrollmentsData = await Promise.all(
      enrollments.map(async (enrollment) => {
        const learner = enrollment.learnerId as any;
        const user = await User.findById(learner._id);

        return {
          id: enrollment._id.toString(),
          learner: {
            id: learner._id.toString(),
            firstName: learner.person.firstName || '',
            lastName: learner.person.lastName || '',
            email: user ? user.email : '',
            studentId: learner._id.toString()
          },
          enrolledAt: enrollment.enrollmentDate,
          status: enrollment.status === 'enrolled' || enrollment.status === 'active' ? 'active' : enrollment.status,
          withdrawnAt: enrollment.dropDate || null,
          completedAt: enrollment.completionDate || null
        };
      })
    );

    return {
      classId: classDoc._id.toString(),
      enrollments: enrollmentsData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Enroll learners in class (bulk)
   */
  static async enrollLearnersInClass(
    classId: string,
    learnerIds: string[],
    enrolledAt?: Date
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw ApiError.notFound('Class not found');
    }

    const classDoc = await Class.findById(classId);
    if (!classDoc || !classDoc.isActive) {
      throw ApiError.notFound('Class not found');
    }

    if (!learnerIds || learnerIds.length === 0) {
      throw ApiError.badRequest('At least one learner ID is required');
    }

    // Check capacity
    const currentEnrollment = await ClassEnrollment.countDocuments({
      classId: classDoc._id,
      status: { $in: ['enrolled', 'active'] }
    });

    const availableSpots = classDoc.maxEnrollment - currentEnrollment;
    if (availableSpots < learnerIds.length) {
      throw ApiError.badRequest(`Class has reached capacity. Only ${availableSpots} spots available.`);
    }

    const enrollmentDate = enrolledAt || new Date();
    const successfulEnrollments = [];
    const errors = [];

    // Process each learner
    for (const learnerId of learnerIds) {
      try {
        if (!mongoose.Types.ObjectId.isValid(learnerId)) {
          errors.push({
            learnerId,
            reason: 'Invalid learner ID'
          });
          continue;
        }

        // Check if learner exists
        const user = await User.findById(learnerId);
        if (!user || !user.roles.includes('learner')) {
          errors.push({
            learnerId,
            reason: 'Learner not found or invalid role'
          });
          continue;
        }

        // Check if already enrolled
        const existingEnrollment = await ClassEnrollment.findOne({
          classId: classDoc._id,
          learnerId: new mongoose.Types.ObjectId(learnerId),
          status: { $in: ['enrolled', 'active'] }
        });

        if (existingEnrollment) {
          errors.push({
            learnerId,
            reason: 'Already enrolled in this class'
          });
          continue;
        }

        // Create enrollment
        const enrollment = await ClassEnrollment.create({
          learnerId: new mongoose.Types.ObjectId(learnerId),
          classId: classDoc._id,
          status: 'active',
          enrollmentDate
        });

        // Update class enrollment count
        await Class.findByIdAndUpdate(classDoc._id, {
          $inc: { currentEnrollment: 1 }
        });

        successfulEnrollments.push({
          id: enrollment._id.toString(),
          learner: {
            id: learnerId,
            firstName: '',
            lastName: '',
            email: user.email
          },
          enrolledAt: enrollment.enrollmentDate,
          status: 'active'
        });
      } catch (error: any) {
        errors.push({
          learnerId,
          reason: error.message || 'Failed to enroll learner'
        });
      }
    }

    return {
      classId: classDoc._id.toString(),
      enrollments: successfulEnrollments,
      successCount: successfulEnrollments.length,
      failedCount: errors.length,
      errors
    };
  }

  /**
   * Drop learner from class
   */
  static async dropLearnerFromClass(
    classId: string,
    enrollmentId: string,
    reason?: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw ApiError.notFound('Class not found');
    }

    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      throw ApiError.notFound('Enrollment not found');
    }

    const classDoc = await Class.findById(classId);
    if (!classDoc || !classDoc.isActive) {
      throw ApiError.notFound('Class not found');
    }

    const enrollment = await ClassEnrollment.findOne({
      _id: enrollmentId,
      classId: classDoc._id
    });

    if (!enrollment) {
      throw ApiError.notFound('Enrollment not found');
    }

    if (enrollment.status === 'withdrawn' || enrollment.status === 'dropped') {
      throw ApiError.badRequest('Enrollment already withdrawn');
    }

    if (enrollment.status === 'completed') {
      throw ApiError.badRequest('Cannot withdraw completed enrollment');
    }

    // Update enrollment
    enrollment.status = 'withdrawn';
    enrollment.dropDate = new Date();
    enrollment.dropReason = reason;
    await enrollment.save();

    // Update class enrollment count
    await Class.findByIdAndUpdate(classDoc._id, {
      $inc: { currentEnrollment: -1 }
    });

    return {
      enrollmentId: enrollment._id.toString(),
      status: 'withdrawn',
      withdrawnAt: enrollment.dropDate
    };
  }

  /**
   * Get class roster with progress and attendance
   */
  static async getClassRoster(
    classId: string,
    includeProgress: boolean = true,
    statusFilter?: string,
    viewer?: any
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw ApiError.notFound('Class not found');
    }

    const classDoc = await Class.findById(classId);
    if (!classDoc || !classDoc.isActive) {
      throw ApiError.notFound('Class not found');
    }

    // Build query
    const query: any = { classId: classDoc._id };
    if (statusFilter) {
      query.status = statusFilter === 'active' ? { $in: ['enrolled', 'active'] } : statusFilter;
    }

    const enrollments = await ClassEnrollment.find(query)
      .populate('learnerId')
      .sort({ enrollmentDate: 1 });

    const totalEnrolled = enrollments.length;

    // Format roster
    const roster = await Promise.all(
      enrollments.map(async (enrollment) => {
        const learner = enrollment.learnerId as any;
        const user = await User.findById(learner._id);

        // Apply data masking if viewer is provided
        const maskedLearner = viewer ? maskLastName(learner, viewer) : learner;

        const rosterEntry: any = {
          enrollmentId: enrollment._id.toString(),
          learner: {
            id: learner._id.toString(),
            firstName: maskedLearner.firstName || '',
            lastName: maskedLearner.lastName || '',
            email: user ? user.email : '',
            studentId: learner._id.toString(),
            profileImage: null
          },
          enrolledAt: enrollment.enrollmentDate,
          status: enrollment.status === 'enrolled' || enrollment.status === 'active' ? 'active' : enrollment.status
        };

        if (includeProgress) {
          // Mock progress data - would need actual progress tracking
          rosterEntry.progress = {
            completionPercent: 0,
            modulesCompleted: 0,
            modulesTotal: 0,
            currentScore: null,
            lastAccessedAt: null
          };

          rosterEntry.attendance = {
            sessionsAttended: 0,
            totalSessions: 0,
            attendanceRate: 0
          };
        }

        return rosterEntry;
      })
    );

    return {
      classId: classDoc._id.toString(),
      className: classDoc.name,
      totalEnrolled,
      roster
    };
  }

  /**
   * Get class progress summary
   */
  static async getClassProgress(classId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw ApiError.notFound('Class not found');
    }

    const classDoc = await Class.findById(classId);
    if (!classDoc || !classDoc.isActive) {
      throw ApiError.notFound('Class not found');
    }

    const totalLearners = await ClassEnrollment.countDocuments({
      classId: classDoc._id
    });

    const activeEnrollments = await ClassEnrollment.countDocuments({
      classId: classDoc._id,
      status: { $in: ['enrolled', 'active'] }
    });

    // Mock progress data - would need actual progress tracking
    return {
      classId: classDoc._id.toString(),
      className: classDoc.name,
      totalLearners,
      activeEnrollments,
      averageProgress: 0.0,
      averageScore: 0.0,
      completedCount: 0,
      inProgressCount: activeEnrollments,
      notStartedCount: 0,
      averageTimeSpent: 0,
      byModule: [],
      progressDistribution: {
        '0-25': 0,
        '26-50': 0,
        '51-75': 0,
        '76-100': 0
      },
      scoreDistribution: {
        'A (90-100)': 0,
        'B (80-89)': 0,
        'C (70-79)': 0,
        'D (60-69)': 0,
        'F (0-59)': 0
      }
    };
  }

  /**
   * Helper: Calculate class status based on dates
   */
  private static computeClassStatus(classDoc: IClass): 'upcoming' | 'active' | 'completed' | 'cancelled' {
    const now = new Date();

    if (!classDoc.isActive) {
      return 'cancelled';
    }

    if (now < classDoc.startDate) {
      return 'upcoming';
    } else if (now >= classDoc.startDate && now <= classDoc.endDate) {
      return 'active';
    } else {
      return 'completed';
    }
  }

  /**
   * Helper: Calculate duration in weeks
   */
  private static calculateDuration(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 7);
  }
}
