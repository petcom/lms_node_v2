import Program from '@/models/academic/Program.model';
import ProgramLevel from '@/models/academic/ProgramLevel.model';
import Department from '@/models/organization/Department.model';
import Course from '@/models/academic/Course.model';
import Enrollment from '@/models/enrollment/Enrollment.model';
import { User } from '@/models/auth/User.model';
import { Learner } from '@/models/auth/Learner.model';
import { ApiError } from '@/utils/ApiError';
import mongoose from 'mongoose';

interface ListProgramsFilters {
  page?: number;
  limit?: number;
  department?: string;
  status?: 'active' | 'inactive' | 'archived';
  search?: string;
  sort?: string;
}

interface CreateProgramData {
  name: string;
  code: string;
  description?: string;
  department: string;
  credential: 'certificate' | 'diploma' | 'degree';
  duration: number;
  durationUnit: 'hours' | 'weeks' | 'months' | 'years';
  isPublished?: boolean;
}

interface UpdateProgramData {
  name?: string;
  code?: string;
  description?: string;
  credential?: 'certificate' | 'diploma' | 'degree';
  duration?: number;
  durationUnit?: 'hours' | 'weeks' | 'months' | 'years';
  isPublished?: boolean;
  status?: 'active' | 'inactive' | 'archived';
}

interface CreateLevelData {
  name: string;
  levelNumber: number;
  description?: string;
}

interface EnrollmentFilters {
  page?: number;
  limit?: number;
  status?: 'active' | 'completed' | 'withdrawn';
  search?: string;
}

export class ProgramsService {
  /**
   * List programs with filtering and pagination
   */
  static async listPrograms(filters: ListProgramsFilters, _userId: string): Promise<any> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 10));
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    // Filter by department
    if (filters.department) {
      if (!mongoose.Types.ObjectId.isValid(filters.department)) {
        throw ApiError.badRequest('Invalid department ID');
      }
      query.departmentId = new mongoose.Types.ObjectId(filters.department);
    }

    // Filter by status
    if (filters.status) {
      if (filters.status === 'active') {
        query.isActive = true;
        query['metadata.status'] = { $ne: 'archived' };
      } else if (filters.status === 'inactive') {
        query.isActive = false;
      } else if (filters.status === 'archived') {
        query['metadata.status'] = 'archived';
      }
    } else {
      // Default: exclude archived
      query['metadata.status'] = { $ne: 'archived' };
    }

    // Search by name or code
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Parse sort
    const sortField = filters.sort || '-createdAt';
    const sortOrder = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sort: any = { [sortKey]: sortOrder };

    // Execute query
    const [programs, total] = await Promise.all([
      Program.find(query)
        .populate('departmentId', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Program.countDocuments(query)
    ]);

    // Enrich programs with statistics
    const enrichedPrograms = await Promise.all(
      programs.map(async (program) => {
        const [totalLevels, totalCourses, activeEnrollments] = await Promise.all([
          ProgramLevel.countDocuments({ programId: program._id, isActive: true }),
          Course.countDocuments({
            departmentId: program.departmentId,
            isActive: true
          }),
          Enrollment.countDocuments({
            programId: program._id,
            status: 'active'
          })
        ]);

        const department = program.departmentId as any;

        return {
          id: program._id.toString(),
          name: program.name,
          code: program.code,
          description: program.description || null,
          department: {
            id: department._id.toString(),
            name: department.name
          },
          credential: this.mapProgramTypeToCredential(program.type),
          duration: program.durationYears ? program.durationYears * 12 : 6,
          durationUnit: 'months' as const,
          isPublished: program.metadata?.isPublished !== false,
          status: this.determineStatus(program),
          totalLevels,
          totalCourses,
          activeEnrollments,
          createdAt: program.createdAt,
          updatedAt: program.updatedAt
        };
      })
    );

    const totalPages = Math.ceil(total / limit);

    return {
      programs: enrichedPrograms,
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
   * Create a new program
   */
  static async createProgram(programData: CreateProgramData, _userId: string): Promise<any> {
    // Validate department exists
    if (!mongoose.Types.ObjectId.isValid(programData.department)) {
      throw ApiError.badRequest('Invalid department ID');
    }

    const department = await Department.findById(programData.department);
    if (!department) {
      throw ApiError.notFound('Department not found');
    }

    // Check code uniqueness within department
    const existingProgram = await Program.findOne({
      departmentId: programData.department,
      code: programData.code.toUpperCase()
    });

    if (existingProgram) {
      throw ApiError.conflict('Program code already exists in this department');
    }

    // Map credential to program type
    const programType = this.mapCredentialToProgramType(programData.credential) as any;

    // Create program
    const program = new Program({
      name: programData.name,
      code: programData.code.toUpperCase(),
      description: programData.description,
      departmentId: programData.department,
      type: programType,
      durationYears: this.convertDurationToYears(programData.duration, programData.durationUnit),
      isActive: true,
      metadata: {
        isPublished: programData.isPublished !== false,
        status: 'active',
        credential: programData.credential,
        duration: programData.duration,
        durationUnit: programData.durationUnit
      }
    });

    await program.save();

    return {
      id: program._id.toString(),
      name: program.name,
      code: program.code,
      description: program.description || null,
      department: program.departmentId.toString(),
      credential: programData.credential,
      duration: programData.duration,
      durationUnit: programData.durationUnit,
      isPublished: program.metadata?.isPublished !== false,
      status: 'active',
      createdAt: program.createdAt,
      updatedAt: program.updatedAt
    };
  }

  /**
   * Get program by ID with statistics
   */
  static async getProgramById(programId: string, _userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    const program = await Program.findById(programId)
      .populate('departmentId', 'name code')
      .lean();

    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    // Get levels
    const levels = await ProgramLevel.find({
      programId: program._id,
      isActive: true
    })
      .sort({ levelNumber: 1 })
      .lean();

    // Get statistics
    const [totalCourses, totalEnrollments, activeEnrollments, completedEnrollments] =
      await Promise.all([
        Course.countDocuments({ departmentId: program.departmentId, isActive: true }),
        Enrollment.countDocuments({ programId: program._id }),
        Enrollment.countDocuments({ programId: program._id, status: 'active' }),
        Enrollment.countDocuments({ programId: program._id, status: 'completed' })
      ]);

    const completionRate = totalEnrollments > 0
      ? completedEnrollments / totalEnrollments
      : 0;

    // Get level details with course counts
    const levelsWithCounts = await Promise.all(
      levels.map(async (level) => {
        const courseCount = await Course.countDocuments({
          departmentId: program.departmentId,
          isActive: true,
          'metadata.levelId': level._id
        });

        return {
          id: level._id.toString(),
          name: level.name,
          levelNumber: level.levelNumber,
          courseCount
        };
      })
    );

    const department = program.departmentId as any;

    return {
      id: program._id.toString(),
      name: program.name,
      code: program.code,
      description: program.description || null,
      department: {
        id: department._id.toString(),
        name: department.name,
        code: department.code
      },
      credential: program.metadata?.credential || this.mapProgramTypeToCredential(program.type),
      duration: program.metadata?.duration || (program.durationYears ? program.durationYears * 12 : 6),
      durationUnit: program.metadata?.durationUnit || 'months',
      isPublished: program.metadata?.isPublished !== false,
      status: this.determineStatus(program),
      levels: levelsWithCounts,
      statistics: {
        totalLevels: levels.length,
        totalCourses,
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        completionRate: parseFloat(completionRate.toFixed(3))
      },
      createdAt: program.createdAt,
      updatedAt: program.updatedAt,
      createdBy: null // Would need to track creator
    };
  }

  /**
   * Update program
   */
  static async updateProgram(
    programId: string,
    updateData: UpdateProgramData,
    _userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    const program = await Program.findById(programId);
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    // Check code uniqueness if code is being updated
    if (updateData.code && updateData.code !== program.code) {
      const existingProgram = await Program.findOne({
        departmentId: program.departmentId,
        code: updateData.code.toUpperCase(),
        _id: { $ne: programId }
      });

      if (existingProgram) {
        throw ApiError.conflict('Program code already exists in this department');
      }
    }

    // Update fields
    if (updateData.name) program.name = updateData.name;
    if (updateData.code) program.code = updateData.code.toUpperCase();
    if (updateData.description !== undefined) program.description = updateData.description;
    if (updateData.credential) {
      program.type = this.mapCredentialToProgramType(updateData.credential) as any;
      if (!program.metadata) program.metadata = {};
      program.metadata.credential = updateData.credential;
    }
    if (updateData.duration !== undefined && updateData.durationUnit) {
      program.durationYears = this.convertDurationToYears(updateData.duration, updateData.durationUnit);
      if (!program.metadata) program.metadata = {};
      program.metadata.duration = updateData.duration;
      program.metadata.durationUnit = updateData.durationUnit;
    }
    if (updateData.isPublished !== undefined) {
      if (!program.metadata) program.metadata = {};
      program.metadata.isPublished = updateData.isPublished;
    }
    if (updateData.status) {
      if (updateData.status === 'active') {
        program.isActive = true;
        if (!program.metadata) program.metadata = {};
        program.metadata.status = 'active';
      } else if (updateData.status === 'inactive') {
        program.isActive = false;
        if (!program.metadata) program.metadata = {};
        program.metadata.status = 'inactive';
      } else if (updateData.status === 'archived') {
        if (!program.metadata) program.metadata = {};
        program.metadata.status = 'archived';
      }
    }

    await program.save();

    const credential = program.metadata?.credential || this.mapProgramTypeToCredential(program.type);
    const duration = program.metadata?.duration || (program.durationYears ? program.durationYears * 12 : 6);
    const durationUnit = program.metadata?.durationUnit || 'months';

    return {
      id: program._id.toString(),
      name: program.name,
      code: program.code,
      description: program.description || null,
      department: program.departmentId.toString(),
      credential,
      duration,
      durationUnit,
      isPublished: program.metadata?.isPublished !== false,
      status: this.determineStatus(program),
      createdAt: program.createdAt,
      updatedAt: program.updatedAt
    };
  }

  /**
   * Delete program (soft delete)
   */
  static async deleteProgram(programId: string, _userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    const program = await Program.findById(programId);
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    // Check for active enrollments
    const activeEnrollments = await Enrollment.countDocuments({
      programId: program._id,
      status: 'active'
    });

    if (activeEnrollments > 0) {
      throw ApiError.conflict('Cannot delete program with active enrollments');
    }

    // Soft delete
    if (!program.metadata) program.metadata = {};
    program.metadata.status = 'archived';
    program.metadata.isDeleted = true;
    program.metadata.deletedAt = new Date();
    program.isActive = false;

    await program.save();
  }

  /**
   * Get program levels
   */
  static async getProgramLevels(programId: string, _userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    const program = await Program.findById(programId).lean();
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    const levels = await ProgramLevel.find({
      programId: program._id,
      isActive: true
    })
      .sort({ levelNumber: 1 })
      .lean();

    // Get courses for each level
    const levelsWithCourses = await Promise.all(
      levels.map(async (level) => {
        const courses = await Course.find({
          departmentId: program.departmentId,
          isActive: true,
          'metadata.levelId': level._id
        })
          .select('name code metadata')
          .lean();

        return {
          id: level._id.toString(),
          name: level.name,
          levelNumber: level.levelNumber,
          description: level.description || null,
          courses: courses.map(course => ({
            id: course._id.toString(),
            title: course.name,
            code: course.code,
            isPublished: course.metadata?.isPublished !== false
          })),
          courseCount: courses.length,
          createdAt: level.createdAt,
          updatedAt: level.updatedAt
        };
      })
    );

    return {
      programId: program._id.toString(),
      programName: program.name,
      levels: levelsWithCourses
    };
  }

  /**
   * Create program level
   */
  static async createProgramLevel(
    programId: string,
    levelData: CreateLevelData,
    _userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    const program = await Program.findById(programId);
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    // Check level number uniqueness
    const existingLevel = await ProgramLevel.findOne({
      programId: program._id,
      levelNumber: levelData.levelNumber
    });

    if (existingLevel) {
      throw ApiError.conflict('Level number already exists in this program');
    }

    // Create level
    const level = new ProgramLevel({
      programId: program._id,
      name: levelData.name,
      levelNumber: levelData.levelNumber,
      description: levelData.description,
      isActive: true
    });

    await level.save();

    return {
      id: level._id.toString(),
      name: level.name,
      levelNumber: level.levelNumber,
      description: level.description || null,
      program: program._id.toString(),
      createdAt: level.createdAt,
      updatedAt: level.updatedAt
    };
  }

  /**
   * Get program courses
   */
  static async getProgramCourses(
    programId: string,
    levelId?: string,
    status?: string,
    _userId?: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    const program = await Program.findById(programId).lean();
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    // Build query
    const query: any = {
      departmentId: program.departmentId,
      isActive: true
    };

    if (levelId) {
      if (!mongoose.Types.ObjectId.isValid(levelId)) {
        throw ApiError.badRequest('Invalid level ID');
      }
      query['metadata.levelId'] = new mongoose.Types.ObjectId(levelId);
    }

    if (status) {
      if (status === 'published') {
        query['metadata.isPublished'] = true;
      } else if (status === 'draft') {
        query['metadata.isPublished'] = { $ne: true };
      } else if (status === 'archived') {
        query.isActive = false;
      }
    }

    const courses = await Course.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Enrich courses with level and enrollment data
    const enrichedCourses = await Promise.all(
      courses.map(async (course) => {
        let level = null;
        if (course.metadata?.levelId) {
          const levelDoc = await ProgramLevel.findById(course.metadata.levelId).lean();
          if (levelDoc) {
            level = {
              id: levelDoc._id.toString(),
              name: levelDoc.name,
              levelNumber: levelDoc.levelNumber
            };
          }
        }

        const enrollmentCount = 0; // Would need ClassEnrollment for accurate count

        return {
          id: course._id.toString(),
          title: course.name,
          code: course.code,
          description: course.description || null,
          level,
          isPublished: course.metadata?.isPublished !== false,
          status: course.metadata?.isPublished ? 'published' : 'draft',
          moduleCount: 0, // Would need CourseContent for accurate count
          enrollmentCount,
          createdAt: course.createdAt,
          updatedAt: course.updatedAt
        };
      })
    );

    return {
      programId: program._id.toString(),
      programName: program.name,
      courses: enrichedCourses,
      totalCourses: enrichedCourses.length
    };
  }

  /**
   * Get program enrollments
   */
  static async getProgramEnrollments(
    programId: string,
    filters: EnrollmentFilters,
    _userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    const program = await Program.findById(programId).lean();
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { programId: program._id };

    if (filters.status) {
      query.status = filters.status;
    }

    // Execute query
    const [enrollments, total] = await Promise.all([
      Enrollment.find(query)
        .sort({ enrollmentDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Enrollment.countDocuments(query)
    ]);

    // Enrich enrollments with learner data
    const enrichedEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const user = await User.findById(enrollment.learnerId).lean();
        const learner = await Learner.findById(enrollment.learnerId).lean();

        if (!user || !learner) {
          return null;
        }

        // Calculate progress
        const totalCourses = await Course.countDocuments({
          departmentId: program.departmentId,
          isActive: true
        });

        const coursesCompleted = 0; // Would need to query ClassEnrollments
        const progress = totalCourses > 0 ? coursesCompleted / totalCourses : 0;

        return {
          id: enrollment._id.toString(),
          learner: {
            id: user._id.toString(),
            firstName: learner.person.firstName,
            lastName: learner.person.lastName,
            email: user.email,
            studentId: user._id.toString()
          },
          credentialGoal: program.metadata?.credential || this.mapProgramTypeToCredential(program.type),
          status: enrollment.status,
          progress: parseFloat(progress.toFixed(2)),
          enrolledAt: enrollment.enrollmentDate,
          completedAt: enrollment.completionDate || null,
          withdrawnAt: enrollment.withdrawalDate || null,
          coursesCompleted,
          coursesTotal: totalCourses
        };
      })
    );

    // Filter out null values
    const validEnrollments = enrichedEnrollments.filter(e => e !== null);

    const totalPages = Math.ceil(total / limit);

    return {
      programId: program._id.toString(),
      programName: program.name,
      enrollments: validEnrollments,
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
   * Move program to different department
   */
  static async updateProgramDepartment(
    programId: string,
    departmentId: string,
    _userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.badRequest('Invalid department ID');
    }

    const program = await Program.findById(programId);
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      throw ApiError.notFound('Target department not found');
    }

    // Check code uniqueness in target department
    const existingProgram = await Program.findOne({
      departmentId: departmentId,
      code: program.code,
      _id: { $ne: programId }
    });

    if (existingProgram) {
      throw ApiError.conflict('Program code already exists in target department');
    }

    // Update department
    program.departmentId = new mongoose.Types.ObjectId(departmentId);
    await program.save();

    return {
      id: program._id.toString(),
      name: program.name,
      code: program.code,
      department: {
        id: department._id.toString(),
        name: department.name
      },
      updatedAt: program.updatedAt
    };
  }

  // Helper methods
  private static mapProgramTypeToCredential(type: string): 'certificate' | 'diploma' | 'degree' {
    if (type === 'certificate') return 'certificate';
    if (type === 'diploma') return 'diploma';
    return 'degree';
  }

  private static mapCredentialToProgramType(credential: string): string {
    if (credential === 'certificate') return 'certificate';
    if (credential === 'diploma') return 'diploma';
    return 'bachelors'; // Default for degree
  }

  private static convertDurationToYears(duration: number, unit: string): number {
    switch (unit) {
      case 'hours':
        return duration / (40 * 52); // 40 hours/week, 52 weeks/year
      case 'weeks':
        return duration / 52;
      case 'months':
        return duration / 12;
      case 'years':
        return duration;
      default:
        return duration / 12; // Default to months
    }
  }

  private static determineStatus(program: any): 'active' | 'inactive' | 'archived' {
    if (program.metadata?.status === 'archived') return 'archived';
    if (!program.isActive) return 'inactive';
    return 'active';
  }
}
