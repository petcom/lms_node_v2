import mongoose from 'mongoose';
import Course from '@/models/academic/Course.model';
import CourseContent from '@/models/content/CourseContent.model';
import Department from '@/models/organization/Department.model';
import Program from '@/models/academic/Program.model';
import { Staff } from '@/models/auth/Staff.model';
import { User } from '@/models/auth/User.model';
import { ApiError } from '@/utils/ApiError';
import { getDepartmentAndSubdepartments } from '@/utils/departmentHierarchy';

interface ListCoursesFilters {
  page?: number;
  limit?: number;
  department?: string;
  program?: string;
  status?: 'draft' | 'published' | 'archived';
  search?: string;
  instructor?: string;
  sort?: string;
}

interface CreateCourseInput {
  title: string;
  code: string;
  description?: string;
  department: string;
  program?: string;
  credits?: number;
  duration?: number;
  instructors?: string[];
  settings?: {
    allowSelfEnrollment?: boolean;
    passingScore?: number;
    maxAttempts?: number;
    certificateEnabled?: boolean;
  };
}

interface UpdateCourseInput {
  title: string;
  code: string;
  description?: string;
  department: string;
  program?: string;
  credits?: number;
  duration?: number;
  instructors?: string[];
  settings?: {
    allowSelfEnrollment?: boolean;
    passingScore?: number;
    maxAttempts?: number;
    certificateEnabled?: boolean;
  };
}

interface PatchCourseInput {
  title?: string;
  description?: string;
  credits?: number;
  duration?: number;
  instructors?: string[];
  settings?: {
    allowSelfEnrollment?: boolean;
    passingScore?: number;
    maxAttempts?: number;
    certificateEnabled?: boolean;
  };
}

interface DuplicateCourseOptions {
  newTitle?: string;
  newCode: string;
  includeModules?: boolean;
  includeSettings?: boolean;
  targetProgram?: string;
  targetDepartment?: string;
}

export class CoursesService {
  /**
   * List courses with filtering and pagination
   */
  static async listCourses(filters: ListCoursesFilters): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    // Department filter
    if (filters.department) {
      query.departmentId = filters.department;
    }

    // Program filter (stored in metadata for now, as the Course model doesn't have programId)
    // This would need to be adapted based on your actual schema
    if (filters.program) {
      query['metadata.programId'] = filters.program;
    }

    // Status filter (using isActive as status for now)
    if (filters.status === 'archived') {
      query.isActive = false;
    } else if (filters.status === 'published') {
      query.isActive = true;
      query['metadata.status'] = 'published';
    } else if (filters.status === 'draft') {
      query.isActive = true;
      query['metadata.status'] = { $ne: 'published' };
    }

    // Search filter
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Instructor filter
    if (filters.instructor) {
      query['metadata.instructors'] = filters.instructor;
    }

    // Sort
    const sortField = filters.sort || '-createdAt';
    const sortOrder = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortMap: any = {
      title: 'name',
      code: 'code',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    };
    const sort: any = { [sortMap[sortKey] || 'createdAt']: sortOrder };

    // Execute query
    const [courses, total] = await Promise.all([
      Course.find(query).sort(sort).skip(skip).limit(limit),
      Course.countDocuments(query)
    ]);

    // Build response with populated data
    const coursesData = await Promise.all(
      courses.map(async (course) => {
        // Get department info
        const department = await Department.findById(course.departmentId);

        // Get program info if exists
        let program = null;
        if (course.metadata?.programId) {
          const programDoc = await Program.findById(course.metadata.programId);
          if (programDoc) {
            program = {
              id: programDoc._id.toString(),
              name: programDoc.name
            };
          }
        }

        // Get instructors
        const instructorIds = course.metadata?.instructors || [];
        const instructors = await Promise.all(
          instructorIds.map(async (id: string) => {
            const staff = await Staff.findById(id);
            const user = await User.findById(id);
            if (staff && user) {
              return {
                id: staff._id.toString(),
                firstName: staff.person.firstName,
                lastName: staff.person.lastName,
                email: user.email
              };
            }
            return null;
          })
        );

        // Get module count
        const moduleCount = await CourseContent.countDocuments({
          courseId: course._id
        });

        // Get enrollment count (Note: This would need actual course enrollment model)
        const enrollmentCount = 0; // Placeholder

        return {
          id: course._id.toString(),
          title: course.name,
          code: course.code,
          description: course.description || '',
          department: {
            id: department?._id.toString() || '',
            name: department?.name || ''
          },
          program,
          credits: course.credits,
          duration: course.metadata?.duration || 0,
          status: !course.isActive ? 'archived' : (course.metadata?.status === 'published' ? 'published' : 'draft'),
          instructors: instructors.filter(Boolean),
          settings: {
            allowSelfEnrollment: course.metadata?.settings?.allowSelfEnrollment || false,
            passingScore: course.metadata?.settings?.passingScore || 70,
            maxAttempts: course.metadata?.settings?.maxAttempts || 3,
            certificateEnabled: course.metadata?.settings?.certificateEnabled || false
          },
          moduleCount,
          enrollmentCount,
          publishedAt: course.metadata?.publishedAt || null,
          archivedAt: course.metadata?.archivedAt || null,
          createdBy: course.metadata?.createdBy || '',
          createdAt: course.createdAt,
          updatedAt: course.updatedAt
        };
      })
    );

    return {
      courses: coursesData,
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
   * Create a new course
   */
  static async createCourse(courseData: CreateCourseInput, createdBy?: string): Promise<any> {
    // Validate code format (ABC123)
    const codePattern = /^[A-Z]{2,4}[0-9]{3}$/;
    if (!codePattern.test(courseData.code)) {
      throw ApiError.badRequest('Course code must match pattern: 2-4 uppercase letters followed by 3 digits (e.g., CS101)');
    }

    // Validate department exists
    const department = await Department.findById(courseData.department);
    if (!department) {
      throw ApiError.notFound('Department does not exist');
    }

    // Check if code already exists in department
    const existingCourse = await Course.findOne({
      departmentId: courseData.department,
      code: courseData.code
    });
    if (existingCourse) {
      throw ApiError.conflict('Course code already exists in this department');
    }

    // Validate program if provided
    if (courseData.program) {
      const program = await Program.findById(courseData.program);
      if (!program) {
        throw ApiError.notFound('Program does not exist');
      }
      // Verify program belongs to same department
      if (program.departmentId.toString() !== courseData.department) {
        throw ApiError.badRequest('Program must belong to the same department as the course');
      }
    }

    // Validate instructors if provided
    if (courseData.instructors && courseData.instructors.length > 0) {
      const instructorChecks = await Promise.all(
        courseData.instructors.map(async (id) => {
          const user = await User.findById(id);
          return user && (user.roles.includes('instructor') || user.roles.includes('content-admin'));
        })
      );
      if (instructorChecks.some((valid) => !valid)) {
        throw ApiError.badRequest('One or more instructor IDs are invalid or do not have instructor role');
      }
    }

    // Create course
    const course = new Course({
      name: courseData.title,
      code: courseData.code,
      description: courseData.description,
      departmentId: courseData.department,
      credits: courseData.credits || 0,
      metadata: {
        programId: courseData.program || null,
        duration: courseData.duration || 0,
        status: 'draft',
        instructors: courseData.instructors || [],
        settings: {
          allowSelfEnrollment: courseData.settings?.allowSelfEnrollment || false,
          passingScore: courseData.settings?.passingScore || 70,
          maxAttempts: courseData.settings?.maxAttempts || 3,
          certificateEnabled: courseData.settings?.certificateEnabled || false
        },
        createdBy: createdBy || null,
        publishedAt: null,
        archivedAt: null
      }
    });

    await course.save();

    return {
      id: course._id.toString(),
      title: course.name,
      code: course.code,
      description: course.description || '',
      department: courseData.department,
      program: courseData.program || null,
      credits: course.credits,
      duration: course.metadata?.duration || 0,
      status: 'draft',
      instructors: courseData.instructors || [],
      settings: course.metadata?.settings || {},
      createdBy: course.metadata?.createdBy || '',
      createdAt: course.createdAt,
      updatedAt: course.updatedAt
    };
  }

  /**
   * Get course by ID with full details
   */
  static async getCourseById(courseId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // Get department info
    const department = await Department.findById(course.departmentId);

    // Get program info if exists
    let program = null;
    if (course.metadata?.programId) {
      const programDoc = await Program.findById(course.metadata.programId);
      if (programDoc) {
        program = {
          id: programDoc._id.toString(),
          name: programDoc.name
        };
      }
    }

    // Get instructors with full details
    const instructorIds = course.metadata?.instructors || [];
    const instructors = await Promise.all(
      instructorIds.map(async (id: string) => {
        const staff = await Staff.findById(id);
        const user = await User.findById(id);
        if (staff && user) {
          return {
            id: staff._id.toString(),
            firstName: staff.person.firstName,
            lastName: staff.person.lastName,
            email: user.email,
            role: user.roles.includes('instructor') ? 'instructor' : 'content-admin'
          };
        }
        return null;
      })
    );

    // Get modules
    const modules = await CourseContent.find({ courseId: course._id }).sort({ sequence: 1 });
    const modulesData = modules.map((module) => ({
      id: module._id.toString(),
      title: module.metadata?.title || `Module ${module.moduleNumber}`,
      type: module.metadata?.type || 'custom',
      order: module.sequence,
      isPublished: module.isActive
    }));

    // Get enrollment count
    const enrollmentCount = 0; // Placeholder

    // Calculate completion rate
    const completionRate = 0; // Placeholder

    // Get created by info
    let createdBy = null;
    if (course.metadata?.createdBy) {
      const creator = await Staff.findById(course.metadata.createdBy);
      if (creator) {
        createdBy = {
          id: creator._id.toString(),
          firstName: creator.firstName,
          lastName: creator.lastName
        };
      }
    }

    return {
      id: course._id.toString(),
      title: course.name,
      code: course.code,
      description: course.description || '',
      department: {
        id: department?._id.toString() || '',
        name: department?.name || ''
      },
      program,
      credits: course.credits,
      duration: course.metadata?.duration || 0,
      status: !course.isActive ? 'archived' : (course.metadata?.status === 'published' ? 'published' : 'draft'),
      instructors: instructors.filter(Boolean),
      settings: {
        allowSelfEnrollment: course.metadata?.settings?.allowSelfEnrollment || false,
        passingScore: course.metadata?.settings?.passingScore || 70,
        maxAttempts: course.metadata?.settings?.maxAttempts || 3,
        certificateEnabled: course.metadata?.settings?.certificateEnabled || false
      },
      modules: modulesData,
      enrollmentCount,
      completionRate,
      publishedAt: course.metadata?.publishedAt || null,
      archivedAt: course.metadata?.archivedAt || null,
      createdBy,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt
    };
  }

  /**
   * Update course (full replacement)
   */
  static async updateCourse(courseId: string, updateData: UpdateCourseInput): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // Cannot update archived courses
    if (!course.isActive) {
      throw ApiError.badRequest('Cannot update archived course. Unarchive it first');
    }

    // Validate code format
    const codePattern = /^[A-Z]{2,4}[0-9]{3}$/;
    if (!codePattern.test(updateData.code)) {
      throw ApiError.badRequest('Course code must match pattern: 2-4 uppercase letters followed by 3 digits (e.g., CS101)');
    }

    // Validate department exists
    const department = await Department.findById(updateData.department);
    if (!department) {
      throw ApiError.notFound('Department does not exist');
    }

    // Check if code already exists in department (excluding current course)
    const existingCourse = await Course.findOne({
      departmentId: updateData.department,
      code: updateData.code,
      _id: { $ne: courseId }
    });
    if (existingCourse) {
      throw ApiError.conflict('Course code already exists in this department');
    }

    // Validate program if provided
    if (updateData.program) {
      const program = await Program.findById(updateData.program);
      if (!program) {
        throw ApiError.notFound('Program does not exist');
      }
      if (program.departmentId.toString() !== updateData.department) {
        throw ApiError.badRequest('Program must belong to the same department as the course');
      }
    }

    // Validate instructors if provided
    if (updateData.instructors && updateData.instructors.length > 0) {
      const instructorChecks = await Promise.all(
        updateData.instructors.map(async (id) => {
          const user = await User.findById(id);
          return user && (user.roles.includes('instructor') || user.roles.includes('content-admin'));
        })
      );
      if (instructorChecks.some((valid) => !valid)) {
        throw ApiError.badRequest('One or more instructor IDs are invalid or do not have instructor role');
      }
    }

    // Update fields
    course.name = updateData.title;
    course.code = updateData.code;
    course.description = updateData.description;
    course.departmentId = new mongoose.Types.ObjectId(updateData.department);
    course.credits = updateData.credits || 0;
    course.metadata = {
      ...course.metadata,
      programId: updateData.program || null,
      duration: updateData.duration || 0,
      instructors: updateData.instructors || [],
      settings: {
        allowSelfEnrollment: updateData.settings?.allowSelfEnrollment || false,
        passingScore: updateData.settings?.passingScore || 70,
        maxAttempts: updateData.settings?.maxAttempts || 3,
        certificateEnabled: updateData.settings?.certificateEnabled || false
      }
    };

    await course.save();

    // Return updated course details
    return this.getCourseById(courseId);
  }

  /**
   * Patch course (partial update)
   */
  static async patchCourse(courseId: string, patchData: PatchCourseInput): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // Cannot update archived courses
    if (!course.isActive) {
      throw ApiError.badRequest('Cannot update archived course. Unarchive it first');
    }

    // Validate instructors if provided
    if (patchData.instructors && patchData.instructors.length > 0) {
      const instructorChecks = await Promise.all(
        patchData.instructors.map(async (id) => {
          const user = await User.findById(id);
          return user && (user.roles.includes('instructor') || user.roles.includes('content-admin'));
        })
      );
      if (instructorChecks.some((valid) => !valid)) {
        throw ApiError.badRequest('One or more instructor IDs are invalid or do not have instructor role');
      }
    }

    // Update only provided fields
    if (patchData.title !== undefined) course.name = patchData.title;
    if (patchData.description !== undefined) course.description = patchData.description;
    if (patchData.credits !== undefined) course.credits = patchData.credits;
    if (patchData.duration !== undefined) {
      course.metadata = { ...course.metadata, duration: patchData.duration };
    }
    if (patchData.instructors !== undefined) {
      course.metadata = { ...course.metadata, instructors: patchData.instructors };
    }
    if (patchData.settings !== undefined) {
      // Merge settings
      course.metadata = {
        ...course.metadata,
        settings: {
          ...(course.metadata?.settings || {}),
          ...patchData.settings
        }
      };
    }

    await course.save();

    // Return updated course details
    return this.getCourseById(courseId);
  }

  /**
   * Delete course (soft delete)
   */
  static async deleteCourse(courseId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // Check for active enrollments (placeholder - would need actual enrollment model)
    const hasEnrollments = false; // Placeholder
    if (hasEnrollments) {
      throw ApiError.conflict('Cannot delete course with active enrollments');
    }

    // Soft delete - set to archived
    course.isActive = false;
    course.metadata = {
      ...course.metadata,
      status: 'archived',
      archivedAt: new Date()
    };
    await course.save();
  }

  /**
   * Publish course
   */
  static async publishCourse(courseId: string, publishedAt?: Date): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // Cannot publish archived courses
    if (!course.isActive) {
      throw ApiError.badRequest('Cannot publish archived course');
    }

    // Check if already published
    if (course.metadata?.status === 'published') {
      throw ApiError.conflict('Course is already published');
    }

    // Validate course has at least one module
    const moduleCount = await CourseContent.countDocuments({ courseId: course._id });
    if (moduleCount === 0) {
      throw ApiError.badRequest('Course cannot be published: must have at least one module');
    }

    // Publish course
    course.metadata = {
      ...course.metadata,
      status: 'published',
      publishedAt: publishedAt || new Date()
    };
    await course.save();

    return {
      id: course._id.toString(),
      status: 'published',
      publishedAt: course.metadata.publishedAt
    };
  }

  /**
   * Unpublish course
   */
  static async unpublishCourse(courseId: string, reason?: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // Check if course is published
    if (course.metadata?.status !== 'published') {
      throw ApiError.conflict('Course is not currently published');
    }

    // Unpublish course
    course.metadata = {
      ...course.metadata,
      status: 'draft',
      publishedAt: null,
      unpublishReason: reason
    };
    await course.save();

    return {
      id: course._id.toString(),
      status: 'draft',
      publishedAt: null
    };
  }

  /**
   * Archive course
   */
  static async archiveCourse(courseId: string, reason?: string, archivedAt?: Date): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // Check if already archived
    if (!course.isActive) {
      throw ApiError.conflict('Course is already archived');
    }

    // Archive course
    course.isActive = false;
    course.metadata = {
      ...course.metadata,
      status: 'archived',
      archivedAt: archivedAt || new Date(),
      archiveReason: reason,
      publishedAt: null
    };
    await course.save();

    return {
      id: course._id.toString(),
      status: 'archived',
      archivedAt: course.metadata.archivedAt
    };
  }

  /**
   * Unarchive course
   */
  static async unarchiveCourse(courseId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // Check if course is archived
    if (course.isActive) {
      throw ApiError.conflict('Course is not currently archived');
    }

    // Unarchive course
    course.isActive = true;
    course.metadata = {
      ...course.metadata,
      status: 'draft',
      archivedAt: null
    };
    await course.save();

    return {
      id: course._id.toString(),
      status: 'draft',
      archivedAt: null
    };
  }

  /**
   * Duplicate course
   */
  static async duplicateCourse(courseId: string, options: DuplicateCourseOptions, createdBy?: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    const sourceCourse = await Course.findById(courseId);
    if (!sourceCourse) {
      throw ApiError.notFound('Source course not found');
    }

    // Validate new code format
    const codePattern = /^[A-Z]{2,4}[0-9]{3}$/;
    if (!codePattern.test(options.newCode)) {
      throw ApiError.badRequest('Course code must match pattern: 2-4 uppercase letters followed by 3 digits (e.g., CS101)');
    }

    // Determine target department
    const targetDepartmentId = options.targetDepartment || sourceCourse.departmentId.toString();
    const targetDepartment = await Department.findById(targetDepartmentId);
    if (!targetDepartment) {
      throw ApiError.notFound('Target department does not exist');
    }

    // Check if new code already exists in target department
    const existingCourse = await Course.findOne({
      departmentId: targetDepartmentId,
      code: options.newCode
    });
    if (existingCourse) {
      throw ApiError.conflict('New course code already exists in target department');
    }

    // Validate target program if provided
    let targetProgramId = null;
    if (options.targetProgram) {
      const targetProgram = await Program.findById(options.targetProgram);
      if (!targetProgram) {
        throw ApiError.notFound('Target program does not exist');
      }
      if (targetProgram.departmentId.toString() !== targetDepartmentId) {
        throw ApiError.badRequest('Target program must belong to the target department');
      }
      targetProgramId = options.targetProgram;
    } else if (!options.targetDepartment) {
      // Keep same program if department hasn't changed
      targetProgramId = sourceCourse.metadata?.programId || null;
    }

    // Create duplicate course
    const newTitle = options.newTitle || `Copy of ${sourceCourse.name}`;
    const duplicateCourse = new Course({
      name: newTitle,
      code: options.newCode,
      description: sourceCourse.description,
      departmentId: targetDepartmentId,
      credits: sourceCourse.credits,
      metadata: {
        programId: targetProgramId,
        duration: sourceCourse.metadata?.duration || 0,
        status: 'draft',
        instructors: [], // Instructors are NOT copied
        settings: options.includeSettings !== false ? sourceCourse.metadata?.settings || {} : {
          allowSelfEnrollment: false,
          passingScore: 70,
          maxAttempts: 3,
          certificateEnabled: false
        },
        createdBy: createdBy || null,
        sourceCourseId: sourceCourse._id.toString()
      }
    });

    await duplicateCourse.save();

    // Copy modules if requested
    let moduleCount = 0;
    if (options.includeModules !== false) {
      const sourceModules = await CourseContent.find({ courseId: sourceCourse._id });
      const duplicateModules = sourceModules.map((module) => ({
        courseId: duplicateCourse._id,
        contentId: module.contentId,
        moduleNumber: module.moduleNumber,
        sectionNumber: module.sectionNumber,
        sequence: module.sequence,
        isRequired: module.isRequired,
        isActive: module.isActive,
        metadata: module.metadata
      }));
      if (duplicateModules.length > 0) {
        await CourseContent.insertMany(duplicateModules);
        moduleCount = duplicateModules.length;
      }
    }

    return {
      id: duplicateCourse._id.toString(),
      title: duplicateCourse.name,
      code: duplicateCourse.code,
      status: 'draft',
      moduleCount,
      sourceCourseId: sourceCourse._id.toString()
    };
  }

  /**
   * Export course
   */
  static async exportCourse(courseId: string, format: string, _includeModules: boolean = true, _includeAssessments: boolean = true): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // Only published courses can be exported
    if (course.metadata?.status !== 'published') {
      throw ApiError.conflict('Only published courses can be exported');
    }

    // Validate format
    const validFormats = ['scorm1.2', 'scorm2004', 'xapi', 'pdf', 'json'];
    if (!validFormats.includes(format)) {
      throw ApiError.badRequest('Invalid export format. Must be one of: scorm1.2, scorm2004, xapi, pdf, json');
    }

    // Generate export (this is a placeholder - actual implementation would generate files)
    const filename = `${course.code}-${format}-${new Date().toISOString().split('T')[0]}.zip`;
    const downloadUrl = `https://storage.example.com/exports/${filename}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    return {
      downloadUrl,
      filename,
      format,
      size: 45678912, // Placeholder size
      expiresAt
    };
  }

  /**
   * Update course department
   */
  static async updateCourseDepartment(courseId: string, departmentId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.badRequest('Invalid department ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // Validate target department exists
    const targetDepartment = await Department.findById(departmentId);
    if (!targetDepartment) {
      throw ApiError.notFound('Target department does not exist');
    }

    // Check if course code already exists in target department
    const existingCourse = await Course.findOne({
      departmentId: departmentId,
      code: course.code,
      _id: { $ne: courseId }
    });
    if (existingCourse) {
      throw ApiError.conflict('Course code conflicts with existing course in target department');
    }

    // Clear program if it doesn't belong to new department
    if (course.metadata?.programId) {
      const program = await Program.findById(course.metadata.programId);
      if (program && program.departmentId.toString() !== departmentId) {
        course.metadata = {
          ...course.metadata,
          programId: null
        };
      }
    }

    // Update department
    course.departmentId = new mongoose.Types.ObjectId(departmentId);
    await course.save();

    return {
      id: course._id.toString(),
      department: {
        id: targetDepartment._id.toString(),
        name: targetDepartment.name
      }
    };
  }

  /**
   * Update course program
   */
  static async updateCourseProgram(courseId: string, programId: string | null): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // If null, remove program assignment
    if (programId === null || programId === '') {
      course.metadata = {
        ...course.metadata,
        programId: null
      };
      await course.save();

      return {
        id: course._id.toString(),
        program: null
      };
    }

    // Validate program ID
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    // Validate program exists
    const program = await Program.findById(programId);
    if (!program) {
      throw ApiError.notFound('Program does not exist');
    }

    // Verify program belongs to same department as course
    if (program.departmentId.toString() !== course.departmentId.toString()) {
      throw ApiError.conflict('Program must belong to same department as course');
    }

    // Update program
    course.metadata = {
      ...course.metadata,
      programId: programId
    };
    await course.save();

    return {
      id: course._id.toString(),
      program: {
        id: program._id.toString(),
        name: program.name
      }
    };
  }

  /**
   * Check if user can view a course based on visibility rules
   *
   * Business Rules:
   * - Draft courses: visible to all department members
   * - Published courses: visible to all users
   * - Archived courses: visible to department members only
   */
  static async canViewCourse(course: any, user: any): Promise<boolean> {
    // Handle transformed API object (has 'status' field) vs raw DB object (has 'isActive' field)
    const courseStatus = course.status || (!course.isActive ? 'archived' : (course.metadata?.status === 'published' ? 'published' : 'draft'));

    // Published courses are visible to everyone
    if (courseStatus === 'published') {
      return true;
    }

    // Draft and archived courses visible to department members only
    if (courseStatus === 'draft' || courseStatus === 'archived') {
      // Get user's department IDs
      const userDepartmentIds = user.departmentMemberships?.map((m: any) => m.departmentId?.toString() || m.departmentId) || [];

      // Check if user is in the course's department or subdepartment
      // Handle both raw DB object (departmentId) and transformed API object (department.id)
      const courseDeptId = course.departmentId?.toString() || course.department?.id;

      // If we can't determine course department, deny access
      if (!courseDeptId) {
        return false;
      }

      // Check direct membership
      if (userDepartmentIds.includes(courseDeptId)) {
        return true;
      }

      // Check hierarchical membership (user in parent department sees subdepartment courses)
      for (const userDeptId of userDepartmentIds) {
        const deptHierarchy = await getDepartmentAndSubdepartments(userDeptId);
        if (deptHierarchy.includes(courseDeptId)) {
          return true;
        }
      }

      return false;
    }

    return false;
  }

  /**
   * Check if user can edit a course based on creator and status rules
   *
   * Business Rules:
   * - Draft courses: editable by creator + department-admin
   * - Published courses: editable by department-admin only
   * - Archived courses: not editable (must unarchive first)
   */
  static async canEditCourse(course: any, user: any): Promise<boolean> {
    // Handle transformed API object (has 'status' field) vs raw DB object (has 'isActive' field)
    const courseStatus = course.status || (!course.isActive ? 'archived' : (course.metadata?.status === 'published' ? 'published' : 'draft'));

    // Archived courses cannot be edited
    if (courseStatus === 'archived') {
      return false;
    }

    // Get user roles
    const userRoles = user.roles || [];
    const isDepartmentAdmin = userRoles.includes('department-admin');
    const isSystemAdmin = userRoles.includes('system-admin');

    // System admin can edit anything
    if (isSystemAdmin) {
      return true;
    }

    // Check if user is in the same department
    const userDepartmentIds = user.departmentMemberships?.map((m: any) => m.departmentId?.toString() || m.departmentId) || [];
    // Handle both raw DB object (departmentId) and transformed API object (department.id)
    const courseDeptId = course.departmentId?.toString() || course.department?.id;

    // If we can't determine course department, deny access
    if (!courseDeptId) {
      return false;
    }

    const isInDepartment = userDepartmentIds.includes(courseDeptId);

    // For published courses: only department-admin can edit
    if (courseStatus === 'published') {
      return isDepartmentAdmin && isInDepartment;
    }

    // For draft courses: creator or department-admin can edit
    if (courseStatus === 'draft') {
      // Handle both raw DB object (metadata.createdBy as ObjectId) and transformed API object (createdBy.id)
      const creatorId = course.metadata?.createdBy?.toString() || course.createdBy?.id;
      const userId = user._id?.toString() || user.userId;
      const isCreator = creatorId && userId && creatorId === userId;
      return isCreator || (isDepartmentAdmin && isInDepartment);
    }

    return false;
  }

  /**
   * Apply department scoping to course list query
   *
   * Filters courses based on user's department membership and hierarchical access
   */
  static async applyDepartmentScoping(query: any, user: any): Promise<any> {
    // System admin sees all
    if (user.roles?.includes('system-admin')) {
      return query;
    }

    // Get user's department IDs with hierarchical expansion
    const userDepartmentIds = user.departmentMemberships?.map((m: any) => m.departmentId.toString()) || [];

    if (userDepartmentIds.length === 0) {
      // No department membership - no courses visible
      query.departmentId = { $in: [] };
      return query;
    }

    // Expand department IDs to include subdepartments for top-level members
    const expandedDeptIds: string[] = [];
    for (const deptId of userDepartmentIds) {
      const deptHierarchy = await getDepartmentAndSubdepartments(deptId);
      expandedDeptIds.push(...deptHierarchy);
    }

    // Remove duplicates
    const uniqueDeptIds = [...new Set(expandedDeptIds)];

    // Add department filter to query
    query.departmentId = { $in: uniqueDeptIds };

    return query;
  }

  /**
   * Filter courses based on visibility rules
   *
   * Applies business rules for draft/published/archived course visibility
   */
  static async filterCoursesByVisibility(courses: any[], user: any): Promise<any[]> {
    const visibleCourses: any[] = [];

    for (const course of courses) {
      const canView = await this.canViewCourse(course, user);
      if (canView) {
        visibleCourses.push(course);
      }
    }

    return visibleCourses;
  }
}
