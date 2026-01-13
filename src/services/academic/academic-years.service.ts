import mongoose from 'mongoose';
import AcademicYear, { IAcademicYear } from '@/models/academic/AcademicYear.model';
import AcademicTerm, { IAcademicTerm } from '@/models/academic/AcademicTerm.model';
import Cohort from '@/models/academic/Cohort.model';
import Program from '@/models/academic/Program.model';
import Class from '@/models/academic/Class.model';
import { Learner } from '@/models/auth/Learner.model';
import { User } from '@/models/auth/User.model';
import Department from '@/models/organization/Department.model';
import { ApiError } from '@/utils/ApiError';

interface ListYearsFilters {
  isCurrent?: boolean;
  status?: 'active' | 'past' | 'future';
  sort?: string;
  page?: number;
  limit?: number;
}

interface CreateYearData {
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent?: boolean;
}

interface UpdateYearData {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  isCurrent?: boolean;
}

interface ListTermsFilters {
  academicYear?: string;
  termType?: string;
  status?: 'active' | 'past' | 'future';
  sort?: string;
  page?: number;
  limit?: number;
}

interface CreateTermData {
  name: string;
  academicYear: string;
  startDate: Date;
  endDate: Date;
  termType: string;
}

interface UpdateTermData {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  termType?: string;
}

interface ListCohortsFilters {
  academicYear?: string;
  program?: string;
  level?: string;
  status?: 'active' | 'graduated' | 'inactive';
  sort?: string;
  page?: number;
  limit?: number;
}

interface CreateCohortData {
  name: string;
  code: string;
  academicYear: string;
  program: string;
  level?: string;
  startYear: number;
  endYear: number;
  description?: string;
}

interface UpdateCohortData {
  name?: string;
  code?: string;
  academicYear?: string;
  level?: string;
  endYear?: number;
  status?: 'active' | 'graduated' | 'inactive';
  description?: string;
}

export class AcademicYearsService {
  /**
   * =====================
   * ACADEMIC YEARS
   * =====================
   */

  /**
   * List academic years with filters and pagination
   */
  static async listAcademicYears(filters: ListYearsFilters): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (filters.isCurrent !== undefined) {
      query.isCurrent = filters.isCurrent;
    }

    // Handle status filter
    if (filters.status) {
      const now = new Date();
      if (filters.status === 'active') {
        query.startDate = { $lte: now };
        query.endDate = { $gte: now };
      } else if (filters.status === 'past') {
        query.endDate = { $lt: now };
      } else if (filters.status === 'future') {
        query.startDate = { $gt: now };
      }
    }

    // Parse sort
    const sortField = filters.sort || '-startDate';
    const sortDirection = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortObj: any = { [sortKey]: sortDirection };

    // Execute query
    const [years, total] = await Promise.all([
      AcademicYear.find(query).sort(sortObj).skip(skip).limit(limit),
      AcademicYear.countDocuments(query)
    ]);

    // Get term counts
    const yearsData = await Promise.all(
      years.map(async (year) => {
        const termCount = await AcademicTerm.countDocuments({ academicYearId: year._id });
        const status = this.computeYearStatus(year);

        return {
          id: year._id.toString(),
          name: year.name,
          startDate: year.startDate,
          endDate: year.endDate,
          isCurrent: year.isCurrent,
          status,
          termCount,
          createdAt: year.createdAt,
          updatedAt: year.updatedAt
        };
      })
    );

    return {
      years: yearsData,
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
   * Create a new academic year
   */
  static async createAcademicYear(yearData: CreateYearData): Promise<any> {
    // Validate dates
    const startDate = new Date(yearData.startDate);
    const endDate = new Date(yearData.endDate);

    if (endDate <= startDate) {
      throw ApiError.badRequest('End date must be after start date');
    }

    // Check for duplicate name
    const existingYear = await AcademicYear.findOne({ name: yearData.name });
    if (existingYear) {
      throw ApiError.conflict('Academic year with this name already exists');
    }

    // Check for date overlap
    const overlappingYear = await AcademicYear.findOne({
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
      ]
    });

    if (overlappingYear) {
      throw ApiError.conflict('Academic year dates overlap with existing year');
    }

    // If setting as current, unset any existing current year
    if (yearData.isCurrent) {
      await AcademicYear.updateMany({ isCurrent: true }, { isCurrent: false });
    }

    // Create year
    const year = await AcademicYear.create({
      name: yearData.name,
      startDate,
      endDate,
      isCurrent: yearData.isCurrent || false
    });

    const status = this.computeYearStatus(year);

    return {
      id: year._id.toString(),
      name: year.name,
      startDate: year.startDate,
      endDate: year.endDate,
      isCurrent: year.isCurrent,
      status,
      termCount: 0,
      createdAt: year.createdAt,
      updatedAt: year.updatedAt
    };
  }

  /**
   * Get academic year by ID
   */
  static async getAcademicYearById(yearId: string, includeTerms: boolean = false): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(yearId)) {
      throw ApiError.notFound('Academic year not found');
    }

    const year = await AcademicYear.findById(yearId);
    if (!year) {
      throw ApiError.notFound('Academic year not found');
    }

    const termCount = await AcademicTerm.countDocuments({ academicYearId: year._id });
    const status = this.computeYearStatus(year);

    const result: any = {
      id: year._id.toString(),
      name: year.name,
      startDate: year.startDate,
      endDate: year.endDate,
      isCurrent: year.isCurrent,
      status,
      termCount,
      createdAt: year.createdAt,
      updatedAt: year.updatedAt
    };

    // Include terms if requested
    if (includeTerms) {
      const terms = await AcademicTerm.find({ academicYearId: year._id }).sort({ startDate: 1 });
      result.terms = terms.map((term) => ({
        id: term._id.toString(),
        name: term.name,
        startDate: term.startDate,
        endDate: term.endDate,
        termType: term.termType
      }));
    }

    return result;
  }

  /**
   * Update academic year
   */
  static async updateAcademicYear(yearId: string, updateData: UpdateYearData): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(yearId)) {
      throw ApiError.notFound('Academic year not found');
    }

    const year = await AcademicYear.findById(yearId);
    if (!year) {
      throw ApiError.notFound('Academic year not found');
    }

    // Validate name uniqueness if changing
    if (updateData.name && updateData.name !== year.name) {
      const existingYear = await AcademicYear.findOne({ name: updateData.name });
      if (existingYear) {
        throw ApiError.conflict('Academic year with this name already exists');
      }
    }

    // Validate dates if changing
    const startDate = updateData.startDate ? new Date(updateData.startDate) : year.startDate;
    const endDate = updateData.endDate ? new Date(updateData.endDate) : year.endDate;

    if (endDate <= startDate) {
      throw ApiError.badRequest('End date must be after start date');
    }

    // Check for date overlap with other years
    if (updateData.startDate || updateData.endDate) {
      const overlappingYear = await AcademicYear.findOne({
        _id: { $ne: year._id },
        $or: [
          { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
        ]
      });

      if (overlappingYear) {
        throw ApiError.conflict('Updated dates overlap with existing year');
      }

      // Check if date changes would affect existing terms
      const termsOutsideRange = await AcademicTerm.findOne({
        academicYearId: year._id,
        $or: [
          { startDate: { $lt: startDate } },
          { endDate: { $gt: endDate } }
        ]
      });

      if (termsOutsideRange) {
        throw ApiError.conflict('Date changes would create conflicts with existing terms');
      }
    }

    // If setting as current, unset any existing current year
    if (updateData.isCurrent === true) {
      await AcademicYear.updateMany({ _id: { $ne: year._id }, isCurrent: true }, { isCurrent: false });
    }

    // Update year
    if (updateData.name !== undefined) year.name = updateData.name;
    if (updateData.startDate !== undefined) year.startDate = startDate;
    if (updateData.endDate !== undefined) year.endDate = endDate;
    if (updateData.isCurrent !== undefined) year.isCurrent = updateData.isCurrent;

    await year.save();

    const termCount = await AcademicTerm.countDocuments({ academicYearId: year._id });
    const status = this.computeYearStatus(year);

    return {
      id: year._id.toString(),
      name: year.name,
      startDate: year.startDate,
      endDate: year.endDate,
      isCurrent: year.isCurrent,
      status,
      termCount,
      createdAt: year.createdAt,
      updatedAt: year.updatedAt
    };
  }

  /**
   * Delete academic year
   */
  static async deleteAcademicYear(yearId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(yearId)) {
      throw ApiError.notFound('Academic year not found');
    }

    const year = await AcademicYear.findById(yearId);
    if (!year) {
      throw ApiError.notFound('Academic year not found');
    }

    // Check if current year
    if (year.isCurrent) {
      throw ApiError.conflict('Cannot delete current academic year');
    }

    // Check for existing terms
    const termCount = await AcademicTerm.countDocuments({ academicYearId: year._id });
    if (termCount > 0) {
      throw ApiError.conflict('Cannot delete year with existing terms');
    }

    await AcademicYear.findByIdAndDelete(yearId);
  }

  /**
   * =====================
   * ACADEMIC TERMS
   * =====================
   */

  /**
   * List academic terms with filters and pagination
   */
  static async listAcademicTerms(filters: ListTermsFilters): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (filters.academicYear) {
      if (!mongoose.Types.ObjectId.isValid(filters.academicYear)) {
        throw ApiError.badRequest('Invalid academic year ID');
      }
      query.academicYearId = filters.academicYear;
    }

    if (filters.termType) {
      query.termType = filters.termType;
    }

    // Handle status filter
    if (filters.status) {
      const now = new Date();
      if (filters.status === 'active') {
        query.startDate = { $lte: now };
        query.endDate = { $gte: now };
      } else if (filters.status === 'past') {
        query.endDate = { $lt: now };
      } else if (filters.status === 'future') {
        query.startDate = { $gt: now };
      }
    }

    // Parse sort
    const sortField = filters.sort || '-startDate';
    const sortDirection = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortObj: any = { [sortKey]: sortDirection };

    // Execute query
    const [terms, total] = await Promise.all([
      AcademicTerm.find(query).populate('academicYearId').sort(sortObj).skip(skip).limit(limit),
      AcademicTerm.countDocuments(query)
    ]);

    // Get class counts and format data
    const termsData = await Promise.all(
      terms.map(async (term) => {
        const classCount = await Class.countDocuments({ academicTermId: term._id });
        const status = this.computeTermStatus(term);
        const academicYear = term.academicYearId as any;

        return {
          id: term._id.toString(),
          name: term.name,
          academicYear: {
            id: academicYear._id.toString(),
            name: academicYear.name
          },
          startDate: term.startDate,
          endDate: term.endDate,
          termType: term.termType,
          status,
          classCount,
          createdAt: term.createdAt,
          updatedAt: term.updatedAt
        };
      })
    );

    return {
      terms: termsData,
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
   * Create a new academic term
   */
  static async createAcademicTerm(termData: CreateTermData): Promise<any> {
    // Validate academic year exists
    if (!mongoose.Types.ObjectId.isValid(termData.academicYear)) {
      throw ApiError.notFound('Academic year not found');
    }

    const academicYear = await AcademicYear.findById(termData.academicYear);
    if (!academicYear) {
      throw ApiError.notFound('Academic year not found');
    }

    // Validate dates
    const startDate = new Date(termData.startDate);
    const endDate = new Date(termData.endDate);

    if (endDate <= startDate) {
      throw ApiError.badRequest('End date must be after start date');
    }

    // Check if term dates are within academic year dates
    if (startDate < academicYear.startDate || endDate > academicYear.endDate) {
      throw ApiError.conflict('Term dates must be within academic year dates');
    }

    // Check for duplicate name in same year
    const existingTerm = await AcademicTerm.findOne({
      academicYearId: academicYear._id,
      name: termData.name
    });

    if (existingTerm) {
      throw ApiError.conflict('Term with this name already exists in this year');
    }

    // Check for date overlap with other terms in same year
    const overlappingTerm = await AcademicTerm.findOne({
      academicYearId: academicYear._id,
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
      ]
    });

    if (overlappingTerm) {
      throw ApiError.conflict('Term dates overlap with existing term in this year');
    }

    // Create term
    const term = await AcademicTerm.create({
      name: termData.name,
      academicYearId: academicYear._id,
      startDate,
      endDate,
      termType: termData.termType
    });

    const status = this.computeTermStatus(term);

    return {
      id: term._id.toString(),
      name: term.name,
      academicYear: {
        id: academicYear._id.toString(),
        name: academicYear.name
      },
      startDate: term.startDate,
      endDate: term.endDate,
      termType: term.termType,
      status,
      classCount: 0,
      createdAt: term.createdAt,
      updatedAt: term.updatedAt
    };
  }

  /**
   * Get academic term by ID
   */
  static async getAcademicTermById(termId: string, includeClasses: boolean = false): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(termId)) {
      throw ApiError.notFound('Academic term not found');
    }

    const term = await AcademicTerm.findById(termId).populate('academicYearId');
    if (!term) {
      throw ApiError.notFound('Academic term not found');
    }

    const classCount = await Class.countDocuments({ academicTermId: term._id });
    const status = this.computeTermStatus(term);
    const academicYear = term.academicYearId as any;

    const result: any = {
      id: term._id.toString(),
      name: term.name,
      academicYear: {
        id: academicYear._id.toString(),
        name: academicYear.name,
        startDate: academicYear.startDate,
        endDate: academicYear.endDate
      },
      startDate: term.startDate,
      endDate: term.endDate,
      termType: term.termType,
      status,
      classCount,
      createdAt: term.createdAt,
      updatedAt: term.updatedAt
    };

    // Include classes if requested
    if (includeClasses) {
      const classes = await Class.find({ academicTermId: term._id })
        .populate('courseId')
        .sort({ startDate: 1 });

      result.classes = classes.map((classDoc) => {
        const course = classDoc.courseId as any;
        return {
          id: classDoc._id.toString(),
          name: classDoc.name || (course ? course.name : 'Unnamed Class'),
          course: course ? {
            id: course._id.toString(),
            title: course.name
          } : null,
          startDate: classDoc.startDate,
          endDate: classDoc.endDate
        };
      });
    }

    return result;
  }

  /**
   * Update academic term
   */
  static async updateAcademicTerm(termId: string, updateData: UpdateTermData): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(termId)) {
      throw ApiError.notFound('Academic term not found');
    }

    const term = await AcademicTerm.findById(termId).populate('academicYearId');
    if (!term) {
      throw ApiError.notFound('Academic term not found');
    }

    const academicYear = term.academicYearId as any;

    // Validate name uniqueness if changing
    if (updateData.name && updateData.name !== term.name) {
      const existingTerm = await AcademicTerm.findOne({
        academicYearId: term.academicYearId,
        name: updateData.name
      });
      if (existingTerm) {
        throw ApiError.conflict('Term with this name already exists in this year');
      }
    }

    // Validate dates if changing
    const startDate = updateData.startDate ? new Date(updateData.startDate) : term.startDate;
    const endDate = updateData.endDate ? new Date(updateData.endDate) : term.endDate;

    if (endDate <= startDate) {
      throw ApiError.badRequest('End date must be after start date');
    }

    // Check if dates are within academic year
    if (startDate < academicYear.startDate || endDate > academicYear.endDate) {
      throw ApiError.conflict('Updated dates must be within academic year dates');
    }

    // Check for date overlap with other terms
    if (updateData.startDate || updateData.endDate) {
      const overlappingTerm = await AcademicTerm.findOne({
        _id: { $ne: term._id },
        academicYearId: term.academicYearId,
        $or: [
          { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
        ]
      });

      if (overlappingTerm) {
        throw ApiError.conflict('Updated dates overlap with existing term');
      }

      // Check if date changes would affect existing classes
      const classesOutsideRange = await Class.findOne({
        academicTermId: term._id,
        $or: [
          { startDate: { $lt: startDate } },
          { endDate: { $gt: endDate } }
        ]
      });

      if (classesOutsideRange) {
        throw ApiError.conflict('Date changes would create conflicts with existing classes');
      }
    }

    // Update term
    if (updateData.name !== undefined) term.name = updateData.name;
    if (updateData.startDate !== undefined) term.startDate = startDate;
    if (updateData.endDate !== undefined) term.endDate = endDate;
    if (updateData.termType !== undefined) term.termType = updateData.termType as any;

    await term.save();

    const classCount = await Class.countDocuments({ academicTermId: term._id });
    const status = this.computeTermStatus(term);

    return {
      id: term._id.toString(),
      name: term.name,
      academicYear: {
        id: academicYear._id.toString(),
        name: academicYear.name
      },
      startDate: term.startDate,
      endDate: term.endDate,
      termType: term.termType,
      status,
      classCount,
      createdAt: term.createdAt,
      updatedAt: term.updatedAt
    };
  }

  /**
   * Delete academic term
   */
  static async deleteAcademicTerm(termId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(termId)) {
      throw ApiError.notFound('Academic term not found');
    }

    const term = await AcademicTerm.findById(termId);
    if (!term) {
      throw ApiError.notFound('Academic term not found');
    }

    // Check for existing classes
    const classCount = await Class.countDocuments({ academicTermId: term._id });
    if (classCount > 0) {
      throw ApiError.conflict('Cannot delete term with existing classes');
    }

    await AcademicTerm.findByIdAndDelete(termId);
  }

  /**
   * =====================
   * COHORTS
   * =====================
   */

  /**
   * List cohorts with filters and pagination
   */
  static async listCohorts(filters: ListCohortsFilters): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (filters.academicYear) {
      if (!mongoose.Types.ObjectId.isValid(filters.academicYear)) {
        throw ApiError.badRequest('Invalid academic year ID');
      }
      query.academicYearId = filters.academicYear;
    }

    if (filters.program) {
      if (!mongoose.Types.ObjectId.isValid(filters.program)) {
        throw ApiError.badRequest('Invalid program ID');
      }
      query.programId = filters.program;
    }

    if (filters.level) {
      query.level = filters.level;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    // Parse sort
    const sortField = filters.sort || '-startYear';
    const sortDirection = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortObj: any = { [sortKey]: sortDirection };

    // Execute query
    const [cohorts, total] = await Promise.all([
      Cohort.find(query)
        .populate('academicYearId')
        .populate('programId')
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Cohort.countDocuments(query)
    ]);

    // Get learner counts and format data
    const cohortsData = await Promise.all(
      cohorts.map(async (cohort) => {
        const learnerCount = await Learner.countDocuments({ cohortId: cohort._id });
        const academicYear = cohort.academicYearId as any;
        const program = cohort.programId as any;

        return {
          id: cohort._id.toString(),
          name: cohort.name,
          code: cohort.code,
          academicYear: {
            id: academicYear._id.toString(),
            name: academicYear.name
          },
          program: {
            id: program._id.toString(),
            name: program.name
          },
          level: cohort.level || null,
          startYear: cohort.startYear,
          endYear: cohort.endYear,
          status: cohort.status,
          learnerCount,
          description: cohort.description || null,
          createdAt: cohort.createdAt,
          updatedAt: cohort.updatedAt
        };
      })
    );

    return {
      cohorts: cohortsData,
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
   * Create a new cohort
   */
  static async createCohort(cohortData: CreateCohortData): Promise<any> {
    // Validate academic year exists
    if (!mongoose.Types.ObjectId.isValid(cohortData.academicYear)) {
      throw ApiError.notFound('Academic year not found');
    }

    const academicYear = await AcademicYear.findById(cohortData.academicYear);
    if (!academicYear) {
      throw ApiError.notFound('Academic year not found');
    }

    // Validate program exists
    if (!mongoose.Types.ObjectId.isValid(cohortData.program)) {
      throw ApiError.notFound('Program not found');
    }

    const program = await Program.findById(cohortData.program);
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    // Validate years
    if (cohortData.endYear < cohortData.startYear) {
      throw ApiError.badRequest('End year must be after or equal to start year');
    }

    // Check for duplicate code
    const existingCohort = await Cohort.findOne({ code: cohortData.code });
    if (existingCohort) {
      throw ApiError.conflict('Cohort with this code already exists');
    }

    // Create cohort
    const cohort = await Cohort.create({
      name: cohortData.name,
      code: cohortData.code,
      academicYearId: academicYear._id,
      programId: program._id,
      level: cohortData.level,
      startYear: cohortData.startYear,
      endYear: cohortData.endYear,
      status: 'active',
      description: cohortData.description
    });

    return {
      id: cohort._id.toString(),
      name: cohort.name,
      code: cohort.code,
      academicYear: {
        id: academicYear._id.toString(),
        name: academicYear.name
      },
      program: {
        id: program._id.toString(),
        name: program.name
      },
      level: cohort.level || null,
      startYear: cohort.startYear,
      endYear: cohort.endYear,
      status: cohort.status,
      learnerCount: 0,
      description: cohort.description || null,
      createdAt: cohort.createdAt,
      updatedAt: cohort.updatedAt
    };
  }

  /**
   * Get cohort by ID
   */
  static async getCohortById(cohortId: string, includeLearners: boolean = false): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(cohortId)) {
      throw ApiError.notFound('Cohort not found');
    }

    const cohort = await Cohort.findById(cohortId)
      .populate('academicYearId')
      .populate('programId');

    if (!cohort) {
      throw ApiError.notFound('Cohort not found');
    }

    const learnerCount = await Learner.countDocuments({ cohortId: cohort._id });
    const academicYear = cohort.academicYearId as any;
    const program = cohort.programId as any;

    // Get department info
    const department = await Department.findById(program.departmentId);

    const result: any = {
      id: cohort._id.toString(),
      name: cohort.name,
      code: cohort.code,
      academicYear: {
        id: academicYear._id.toString(),
        name: academicYear.name,
        startDate: academicYear.startDate,
        endDate: academicYear.endDate
      },
      program: {
        id: program._id.toString(),
        name: program.name,
        department: department ? {
          id: department._id.toString(),
          name: department.name
        } : null
      },
      level: cohort.level || null,
      startYear: cohort.startYear,
      endYear: cohort.endYear,
      status: cohort.status,
      learnerCount,
      description: cohort.description || null,
      createdAt: cohort.createdAt,
      updatedAt: cohort.updatedAt
    };

    // Include learners if requested
    if (includeLearners) {
      const learners = await Learner.find({ cohortId: cohort._id })
        .sort({ lastName: 1, firstName: 1 })
        .lean();

      // Get user data for each learner
      const learnerIds = learners.map((l: any) => l._id);
      const users = await User.find({ _id: { $in: learnerIds } }).lean();
      const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

      result.learners = learners.map((learner: any) => {
        const user = userMap.get(learner._id.toString());
        return {
          id: learner._id.toString(),
          firstName: learner.person.firstName,
          lastName: learner.person.lastName,
          email: user?.email || null,
          studentId: learner._id.toString(), // Using _id as studentId for now
          enrolledAt: learner.createdAt
        };
      });
    }

    return result;
  }

  /**
   * Update cohort
   */
  static async updateCohort(cohortId: string, updateData: UpdateCohortData): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(cohortId)) {
      throw ApiError.notFound('Cohort not found');
    }

    const cohort = await Cohort.findById(cohortId)
      .populate('academicYearId')
      .populate('programId');

    if (!cohort) {
      throw ApiError.notFound('Cohort not found');
    }

    // Validate code uniqueness if changing
    if (updateData.code && updateData.code !== cohort.code) {
      const existingCohort = await Cohort.findOne({ code: updateData.code });
      if (existingCohort) {
        throw ApiError.conflict('Cohort with this code already exists');
      }
    }

    // Validate academic year if changing
    if (updateData.academicYear) {
      if (!mongoose.Types.ObjectId.isValid(updateData.academicYear)) {
        throw ApiError.notFound('Academic year not found');
      }

      const academicYear = await AcademicYear.findById(updateData.academicYear);
      if (!academicYear) {
        throw ApiError.notFound('Academic year not found');
      }

      cohort.academicYearId = academicYear._id;
    }

    // Validate end year if changing
    if (updateData.endYear !== undefined) {
      if (updateData.endYear < cohort.startYear) {
        throw ApiError.badRequest('End year must be after or equal to start year');
      }
    }

    // Update cohort
    if (updateData.name !== undefined) cohort.name = updateData.name;
    if (updateData.code !== undefined) cohort.code = updateData.code;
    if (updateData.level !== undefined) cohort.level = updateData.level;
    if (updateData.endYear !== undefined) cohort.endYear = updateData.endYear;
    if (updateData.status !== undefined) cohort.status = updateData.status;
    if (updateData.description !== undefined) cohort.description = updateData.description;

    await cohort.save();

    // Reload populated data
    await cohort.populate('academicYearId');
    await cohort.populate('programId');

    const learnerCount = await Learner.countDocuments({ cohortId: cohort._id });
    const academicYear = cohort.academicYearId as any;
    const program = cohort.programId as any;

    return {
      id: cohort._id.toString(),
      name: cohort.name,
      code: cohort.code,
      academicYear: {
        id: academicYear._id.toString(),
        name: academicYear.name
      },
      program: {
        id: program._id.toString(),
        name: program.name
      },
      level: cohort.level || null,
      startYear: cohort.startYear,
      endYear: cohort.endYear,
      status: cohort.status,
      learnerCount,
      description: cohort.description || null,
      createdAt: cohort.createdAt,
      updatedAt: cohort.updatedAt
    };
  }

  /**
   * Delete cohort
   */
  static async deleteCohort(cohortId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(cohortId)) {
      throw ApiError.notFound('Cohort not found');
    }

    const cohort = await Cohort.findById(cohortId);
    if (!cohort) {
      throw ApiError.notFound('Cohort not found');
    }

    // Check for enrolled learners
    const learnerCount = await Learner.countDocuments({ cohortId: cohort._id });
    if (learnerCount > 0) {
      throw ApiError.conflict('Cannot delete cohort with enrolled learners');
    }

    await Cohort.findByIdAndDelete(cohortId);
  }

  /**
   * =====================
   * HELPER METHODS
   * =====================
   */

  /**
   * Compute year status based on dates
   */
  private static computeYearStatus(year: IAcademicYear): 'active' | 'past' | 'future' {
    const now = new Date();
    if (now >= year.startDate && now <= year.endDate) {
      return 'active';
    } else if (now > year.endDate) {
      return 'past';
    } else {
      return 'future';
    }
  }

  /**
   * Compute term status based on dates
   */
  private static computeTermStatus(term: IAcademicTerm): 'active' | 'past' | 'future' {
    const now = new Date();
    if (now >= term.startDate && now <= term.endDate) {
      return 'active';
    } else if (now > term.endDate) {
      return 'past';
    } else {
      return 'future';
    }
  }
}
