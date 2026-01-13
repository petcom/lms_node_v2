import mongoose from 'mongoose';
import ContentAttempt from '@/models/content/ContentAttempt.model';
import ScormAttempt from '@/models/activity/ScormAttempt.model';
import Content from '@/models/content/Content.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import Enrollment from '@/models/enrollment/Enrollment.model';
// import Department from '@/models/organization/Department.model';
import { ApiError } from '@/utils/ApiError';

/**
 * Content Attempts Service
 * Handles content attempt tracking, SCORM CMI data, and progress management
 */

interface ListAttemptsFilters {
  learnerId?: string;
  contentId?: string;
  status?: string;
  enrollmentId?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

interface CreateAttemptData {
  contentId: string;
  enrollmentId?: string;
  scormVersion?: '1.2' | '2004';
  launchData?: string;
  metadata?: Record<string, any>;
}

interface UpdateAttemptData {
  status?: string;
  progressPercent?: number;
  score?: number;
  scoreRaw?: number;
  scoreMin?: number;
  scoreMax?: number;
  scoreScaled?: number;
  timeSpentSeconds?: number;
  location?: string;
  suspendData?: string;
  metadata?: Record<string, any>;
}

interface CompleteAttemptData {
  score?: number;
  scoreRaw?: number;
  scoreScaled?: number;
  passed?: boolean;
  timeSpentSeconds?: number;
}

interface UpdateCmiData {
  cmiData: Record<string, any>;
  autoCommit?: boolean;
}

interface SuspendAttemptData {
  suspendData?: string;
  location?: string;
  sessionTime?: number;
}

export class ContentAttemptsService {
  /**
   * List content attempts with filtering
   */
  static async listAttempts(filters: ListAttemptsFilters, userId: string): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    // Check user permissions - learners see only their own
    const user = await User.findById(userId).lean();
    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    const isLearner = user.roles?.includes('learner') && !user.roles?.includes('global-admin');

    if (isLearner) {
      // Learners can only see their own attempts
      query.learnerId = userId;
    } else if (filters.learnerId) {
      // Staff can filter by learner if they have access
      const staff = await Staff.findById(userId).lean();
      const departmentIds = staff?.departmentMemberships?.map((m: any) => m.departmentId.toString()) || [];

      // Check if staff has access to this learner's department
      const learnerStaff = await Staff.findById(filters.learnerId).lean();
      if (learnerStaff) {
        const learnerDeptIds = learnerStaff.departmentMemberships?.map((m: any) => m.departmentId.toString()) || [];
        const hasAccess = learnerDeptIds.some(id => departmentIds.includes(id)) || user.roles?.includes('global-admin');

        if (!hasAccess) {
          throw ApiError.forbidden('No access to this learner\'s attempts');
        }
      }

      query.learnerId = filters.learnerId;
    }

    // Content filter
    if (filters.contentId) {
      query.contentId = filters.contentId;
    }

    // Status filter
    if (filters.status) {
      query.status = filters.status;
    }

    // Enrollment filter
    if (filters.enrollmentId) {
      query['metadata.enrollmentId'] = filters.enrollmentId;
    }

    // Parse sort
    const sortField = filters.sort || '-createdAt';
    const sortDirection = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortObj: any = { [sortKey]: sortDirection };

    // Execute query
    const [attempts, total] = await Promise.all([
      ContentAttempt.find(query)
        .populate('contentId', 'title type')
        .populate('learnerId', 'firstName lastName email')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      ContentAttempt.countDocuments(query)
    ]);

    // Check for associated SCORM data
    const attemptIds = attempts.map((a: any) => a._id);
    const scormAttempts = await ScormAttempt.find({
      _id: { $in: attemptIds }
    }).lean();

    const scormMap = new Map(scormAttempts.map((s: any) => [s._id.toString(), s]));

    // Format results
    const attemptsData = attempts.map((attempt: any) => {
      const content = attempt.contentId || {};
      const learner = attempt.learnerId || {};
      const scormData = scormMap.get(attempt._id.toString());

      return {
        id: attempt._id.toString(),
        contentId: content._id?.toString() || '',
        content: {
          id: content._id?.toString() || '',
          title: content.title || '',
          type: content.type || 'scorm'
        },
        learnerId: learner._id?.toString() || '',
        learner: {
          id: learner._id?.toString() || '',
          firstName: learner.person.firstName || '',
          lastName: learner.person.lastName || '',
          email: learner.email || ''
        },
        enrollmentId: attempt.metadata?.enrollmentId || null,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        progressPercent: attempt.progressPercent || null,
        score: attempt.score || null,
        scoreRaw: scormData?.scoreRaw || null,
        scoreMin: scormData?.scoreMin || null,
        scoreMax: scormData?.scoreMax || null,
        scoreScaled: scormData?.scoreScaled || null,
        timeSpentSeconds: attempt.timeSpentSeconds || 0,
        totalTime: scormData?.totalTime || null,
        sessionTime: scormData?.sessionTime || null,
        startedAt: attempt.startedAt || null,
        lastAccessedAt: attempt.lastAccessedAt || null,
        completedAt: attempt.completedAt || null,
        scormVersion: scormData?.scormVersion || null,
        hasScormData: !!scormData,
        createdAt: attempt.createdAt,
        updatedAt: attempt.updatedAt
      };
    });

    return {
      attempts: attemptsData,
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
   * Create a new content attempt
   */
  static async createAttempt(data: CreateAttemptData, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(data.contentId)) {
      throw ApiError.notFound('Content not found');
    }

    // Validate content exists
    const content = await Content.findOne({ _id: data.contentId, isActive: true }).lean();
    if (!content) {
      throw ApiError.notFound('Content not found');
    }

    // Check if enrollment is valid if provided
    if (data.enrollmentId) {
      if (!mongoose.Types.ObjectId.isValid(data.enrollmentId)) {
        throw ApiError.badRequest('Invalid enrollment ID');
      }

      const enrollment = await Enrollment.findOne({
        _id: data.enrollmentId,
        learnerId: userId
      }).lean();

      if (!enrollment) {
        throw ApiError.forbidden('Not enrolled in this content');
      }
    }

    // Check for active attempts
    const activeAttempt = await ContentAttempt.findOne({
      contentId: data.contentId,
      learnerId: userId,
      status: { $in: ['in-progress', 'not-started'] }
    });

    if (activeAttempt) {
      throw ApiError.conflict('Active attempt already exists');
    }

    // Get next attempt number
    const lastAttempt = await ContentAttempt.findOne({
      contentId: data.contentId,
      learnerId: userId
    }).sort({ attemptNumber: -1 }).lean();

    const attemptNumber = lastAttempt ? lastAttempt.attemptNumber + 1 : 1;

    // Create attempt
    const attempt = await ContentAttempt.create({
      contentId: data.contentId,
      learnerId: userId,
      attemptNumber,
      status: 'started',
      progressPercent: 0,
      timeSpentSeconds: 0,
      startedAt: new Date(),
      lastAccessedAt: new Date(),
      metadata: {
        ...data.metadata,
        enrollmentId: data.enrollmentId || null
      }
    });

    // Create SCORM attempt if applicable
    if (content.type === 'scorm' && data.scormVersion) {
      const user = await User.findById(userId).lean();
      const staff = user ? await Staff.findById(userId).lean() : null;
      const learnerName = staff ? `${staff.person.lastName}, ${staff.person.firstName}` : 'Learner';

      // Initialize CMI data based on version
      const cmiData: Record<string, any> = {};

      if (data.scormVersion === '1.2') {
        cmiData['cmi.core.student_id'] = userId;
        cmiData['cmi.core.student_name'] = learnerName;
        cmiData['cmi.core.lesson_status'] = 'incomplete';
        cmiData['cmi.core.lesson_location'] = '';
        cmiData['cmi.core.score.raw'] = '';
        cmiData['cmi.core.score.min'] = '';
        cmiData['cmi.core.score.max'] = '';
        cmiData['cmi.core.session_time'] = '00:00:00';
        cmiData['cmi.core.total_time'] = '00:00:00';
        cmiData['cmi.suspend_data'] = '';
        cmiData['cmi.launch_data'] = data.launchData || '';
        cmiData['cmi.comments'] = '';
        cmiData['cmi.comments_from_lms'] = '';
      } else {
        // SCORM 2004
        cmiData['cmi.learner_id'] = userId;
        cmiData['cmi.learner_name'] = learnerName;
        cmiData['cmi.completion_status'] = 'incomplete';
        cmiData['cmi.success_status'] = 'unknown';
        cmiData['cmi.location'] = '';
        cmiData['cmi.score.raw'] = '';
        cmiData['cmi.score.min'] = '';
        cmiData['cmi.score.max'] = '';
        cmiData['cmi.score.scaled'] = '';
        cmiData['cmi.session_time'] = 'PT0H0M0S';
        cmiData['cmi.total_time'] = 'PT0H0M0S';
        cmiData['cmi.suspend_data'] = '';
        cmiData['cmi.launch_data'] = data.launchData || '';
      }

      await ScormAttempt.create({
        _id: attempt._id,
        contentId: data.contentId,
        learnerId: userId,
        attemptNumber,
        scormVersion: data.scormVersion,
        status: 'incomplete',
        cmiData,
        startedAt: new Date(),
        lastAccessedAt: new Date(),
        metadata: data.metadata
      });
    }

    const launchUrl = content.type === 'scorm'
      ? `/scorm/${data.contentId}/launch?attempt=${attempt._id.toString()}`
      : null;

    return {
      id: attempt._id.toString(),
      contentId: data.contentId,
      learnerId: userId,
      enrollmentId: data.enrollmentId || null,
      attemptNumber,
      status: 'started',
      progressPercent: 0,
      timeSpentSeconds: 0,
      startedAt: attempt.startedAt,
      lastAccessedAt: attempt.lastAccessedAt,
      scormVersion: data.scormVersion || null,
      launchUrl,
      createdAt: attempt.createdAt,
      updatedAt: attempt.updatedAt
    };
  }

  /**
   * Get attempt details by ID
   */
  static async getAttemptById(attemptId: string, userId: string, includeCmi: boolean = false): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw ApiError.notFound('Attempt not found');
    }

    const attempt = await ContentAttempt.findById(attemptId)
      .populate('contentId', 'title type description duration')
      .populate('learnerId', 'firstName lastName email')
      .lean();

    if (!attempt) {
      throw ApiError.notFound('Attempt not found');
    }

    // Check access permissions
    const user = await User.findById(userId).lean();
    const isOwner = attempt.learnerId._id.toString() === userId;
    const isStaff = user?.roles?.some(r => ['global-admin', 'department-admin', 'content-admin'].includes(r));

    if (!isOwner && !isStaff) {
      throw ApiError.forbidden('Cannot access this attempt');
    }

    // Get SCORM data if exists
    const scormAttempt = await ScormAttempt.findById(attemptId).lean();

    // Get enrollment if applicable
    let enrollment = null;
    if (attempt.metadata?.enrollmentId) {
      const enrollmentDoc = await Enrollment.findById(attempt.metadata.enrollmentId)
        .populate('programId', 'name')
        .lean();

      if (enrollmentDoc) {
        const program = enrollmentDoc.programId as any;
        enrollment = {
          id: enrollmentDoc._id.toString(),
          courseId: program?._id?.toString() || '',
          courseTitle: program?.name || ''
        };
      }
    }

    const content = attempt.contentId as any || {};
    const learner = attempt.learnerId as any || {};

    return {
      id: attempt._id.toString(),
      contentId: content._id?.toString() || '',
      content: {
        id: content._id?.toString() || '',
        title: content.title || '',
        type: content.type || 'scorm',
        description: content.description || null,
        duration: content.duration || null
      },
      learnerId: learner._id?.toString() || '',
      learner: {
        id: learner._id?.toString() || '',
        firstName: learner.person.firstName || '',
        lastName: learner.person.lastName || '',
        email: learner.email || ''
      },
      enrollmentId: attempt.metadata?.enrollmentId || null,
      enrollment,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      progressPercent: attempt.progressPercent || null,
      score: attempt.score || null,
      scoreRaw: scormAttempt?.scoreRaw || null,
      scoreMin: scormAttempt?.scoreMin || null,
      scoreMax: scormAttempt?.scoreMax || null,
      scoreScaled: scormAttempt?.scoreScaled || null,
      completionStatus: scormAttempt?.completionStatus || null,
      successStatus: scormAttempt?.successStatus || null,
      timeSpentSeconds: attempt.timeSpentSeconds || 0,
      totalTime: scormAttempt?.totalTime || null,
      sessionTime: scormAttempt?.sessionTime || null,
      startedAt: attempt.startedAt || null,
      lastAccessedAt: attempt.lastAccessedAt || null,
      completedAt: attempt.completedAt || null,
      scormVersion: scormAttempt?.scormVersion || null,
      location: scormAttempt?.location || null,
      suspendData: scormAttempt?.suspendData || null,
      cmiData: includeCmi ? scormAttempt?.cmiData || null : null,
      metadata: attempt.metadata || null,
      createdAt: attempt.createdAt,
      updatedAt: attempt.updatedAt
    };
  }

  /**
   * Update attempt progress
   */
  static async updateAttempt(attemptId: string, updateData: UpdateAttemptData, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw ApiError.notFound('Attempt not found');
    }

    const attempt = await ContentAttempt.findById(attemptId);
    if (!attempt) {
      throw ApiError.notFound('Attempt not found');
    }

    // Only the attempt owner can update
    if (attempt.learnerId.toString() !== userId) {
      throw ApiError.forbidden('Cannot update this attempt');
    }

    // Cannot update completed attempts
    if (['completed', 'passed', 'failed'].includes(attempt.status)) {
      throw ApiError.conflict('Cannot update completed attempt');
    }

    // Update fields
    if (updateData.status) {
      attempt.status = updateData.status as any;

      // Set completed timestamp if completing
      if (['completed', 'passed', 'failed'].includes(updateData.status)) {
        attempt.completedAt = new Date();
      }
    }

    if (updateData.progressPercent !== undefined) {
      attempt.progressPercent = updateData.progressPercent;
    }

    if (updateData.score !== undefined) {
      attempt.score = updateData.score;
    }

    if (updateData.timeSpentSeconds !== undefined) {
      attempt.timeSpentSeconds = (attempt.timeSpentSeconds || 0) + updateData.timeSpentSeconds;
    }

    if (updateData.metadata) {
      attempt.metadata = { ...attempt.metadata, ...updateData.metadata };
    }

    attempt.lastAccessedAt = new Date();
    await attempt.save();

    // Update SCORM data if provided
    const scormAttempt = await ScormAttempt.findById(attemptId);
    if (scormAttempt) {
      if (updateData.scoreRaw !== undefined) scormAttempt.scoreRaw = updateData.scoreRaw;
      if (updateData.scoreMin !== undefined) scormAttempt.scoreMin = updateData.scoreMin;
      if (updateData.scoreMax !== undefined) scormAttempt.scoreMax = updateData.scoreMax;
      if (updateData.scoreScaled !== undefined) scormAttempt.scoreScaled = updateData.scoreScaled;
      if (updateData.location !== undefined) scormAttempt.location = updateData.location;
      if (updateData.suspendData !== undefined) scormAttempt.suspendData = updateData.suspendData;

      scormAttempt.lastAccessedAt = new Date();
      await scormAttempt.save();
    }

    return {
      id: attempt._id.toString(),
      status: attempt.status,
      progressPercent: attempt.progressPercent || null,
      score: attempt.score || null,
      timeSpentSeconds: attempt.timeSpentSeconds || 0,
      lastAccessedAt: attempt.lastAccessedAt,
      completedAt: attempt.completedAt || null,
      updatedAt: attempt.updatedAt
    };
  }

  /**
   * Complete an attempt
   */
  static async completeAttempt(attemptId: string, data: CompleteAttemptData, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw ApiError.notFound('Attempt not found');
    }

    const attempt = await ContentAttempt.findById(attemptId);
    if (!attempt) {
      throw ApiError.notFound('Attempt not found');
    }

    // Only the attempt owner can complete
    if (attempt.learnerId.toString() !== userId) {
      throw ApiError.forbidden('Cannot complete this attempt');
    }

    // Check if already completed
    if (['completed', 'passed', 'failed'].includes(attempt.status)) {
      throw ApiError.conflict('Attempt already completed');
    }

    // Add final session time
    if (data.timeSpentSeconds) {
      attempt.timeSpentSeconds = (attempt.timeSpentSeconds || 0) + data.timeSpentSeconds;
    }

    // Set progress to 100%
    attempt.progressPercent = 100;

    // Determine status based on score/passed flag
    let status: string;
    let passed: boolean;

    if (data.passed !== undefined) {
      passed = data.passed;
      status = data.passed ? 'passed' : 'failed';
    } else if (data.score !== undefined) {
      // Assume passing score is 70 if not specified
      const passingScore = 70;
      passed = data.score >= passingScore;
      status = passed ? 'passed' : 'failed';
    } else {
      passed = false;
      status = 'completed';
    }

    attempt.status = status as any;
    attempt.score = data.score;
    attempt.completedAt = new Date();
    attempt.lastAccessedAt = new Date();

    await attempt.save();

    // Update SCORM attempt if exists
    const scormAttempt = await ScormAttempt.findById(attemptId);
    if (scormAttempt) {
      if (data.scoreRaw !== undefined) scormAttempt.scoreRaw = data.scoreRaw;
      if (data.scoreScaled !== undefined) scormAttempt.scoreScaled = data.scoreScaled;

      scormAttempt.status = status === 'passed' ? 'passed' : status === 'failed' ? 'failed' : 'completed';
      scormAttempt.completionStatus = 'completed';
      scormAttempt.successStatus = passed ? 'passed' : 'failed';
      scormAttempt.completedAt = new Date();
      scormAttempt.lastAccessedAt = new Date();

      await scormAttempt.save();
    }

    return {
      id: attempt._id.toString(),
      status: attempt.status,
      progressPercent: 100,
      score: data.score || null,
      scoreRaw: data.scoreRaw || null,
      scoreScaled: data.scoreScaled || null,
      passed,
      timeSpentSeconds: attempt.timeSpentSeconds || 0,
      completedAt: attempt.completedAt,
      certificate: null // TODO: Implement certificate generation
    };
  }

  /**
   * Get CMI data for SCORM attempt
   */
  static async getCmiData(attemptId: string, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw ApiError.notFound('Attempt not found');
    }

    const attempt = await ContentAttempt.findById(attemptId).lean();
    if (!attempt) {
      throw ApiError.notFound('Attempt not found');
    }

    // Check access permissions
    const user = await User.findById(userId).lean();
    const isOwner = attempt.learnerId.toString() === userId;
    const isStaff = user?.roles?.some(r => ['global-admin', 'department-admin', 'content-admin'].includes(r));

    if (!isOwner && !isStaff) {
      throw ApiError.forbidden('Cannot access this attempt');
    }

    const scormAttempt = await ScormAttempt.findById(attemptId).lean();
    if (!scormAttempt) {
      throw ApiError.notFound('Attempt not found or no CMI data');
    }

    return {
      attemptId: attemptId,
      scormVersion: scormAttempt.scormVersion,
      cmiData: scormAttempt.cmiData || {},
      lastUpdated: scormAttempt.updatedAt
    };
  }

  /**
   * Update CMI data for SCORM attempt
   */
  static async updateCmiData(attemptId: string, data: UpdateCmiData, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw ApiError.notFound('Attempt not found');
    }

    const attempt = await ContentAttempt.findById(attemptId);
    if (!attempt) {
      throw ApiError.notFound('Attempt not found');
    }

    // Only the attempt owner can update
    if (attempt.learnerId.toString() !== userId) {
      throw ApiError.forbidden('Cannot update this attempt');
    }

    const scormAttempt = await ScormAttempt.findById(attemptId);
    if (!scormAttempt) {
      throw ApiError.notFound('SCORM attempt not found');
    }

    // Validate read-only fields
    const readOnlyFields = [
      'cmi.core.student_id', 'cmi.core.student_name',
      'cmi.learner_id', 'cmi.learner_name'
    ];

    const updatedFields: string[] = [];
    for (const [key, value] of Object.entries(data.cmiData)) {
      if (readOnlyFields.includes(key)) {
        throw ApiError.conflict(`Cannot update read-only CMI field: ${key}`);
      }

      scormAttempt.cmiData = scormAttempt.cmiData || {};
      scormAttempt.cmiData[key] = value;
      updatedFields.push(key);

      // Update related fields based on CMI data
      if (key === 'cmi.core.lesson_status' || key === 'cmi.completion_status') {
        const status = value.toLowerCase();
        if (['completed', 'passed', 'failed'].includes(status)) {
          scormAttempt.status = status as any;
          scormAttempt.completionStatus = 'completed';
        } else {
          scormAttempt.status = 'incomplete';
          scormAttempt.completionStatus = 'incomplete';
        }
      }

      if (key === 'cmi.core.score.raw' || key === 'cmi.score.raw') {
        scormAttempt.scoreRaw = parseFloat(value) || 0;
      }

      if (key === 'cmi.core.lesson_location' || key === 'cmi.location') {
        scormAttempt.location = value;
      }

      if (key === 'cmi.suspend_data') {
        scormAttempt.suspendData = value;
      }
    }

    scormAttempt.lastAccessedAt = new Date();
    attempt.lastAccessedAt = new Date();

    await Promise.all([scormAttempt.save(), attempt.save()]);

    return {
      attemptId: attemptId,
      updatedFields,
      lastUpdated: scormAttempt.updatedAt
    };
  }

  /**
   * Suspend an attempt
   */
  static async suspendAttempt(attemptId: string, data: SuspendAttemptData, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw ApiError.notFound('Attempt not found');
    }

    const attempt = await ContentAttempt.findById(attemptId);
    if (!attempt) {
      throw ApiError.notFound('Attempt not found');
    }

    // Only the attempt owner can suspend
    if (attempt.learnerId.toString() !== userId) {
      throw ApiError.forbidden('Cannot suspend this attempt');
    }

    // Cannot suspend completed attempts
    if (['completed', 'passed', 'failed'].includes(attempt.status)) {
      throw ApiError.conflict('Cannot suspend completed attempt');
    }

    // Update attempt status
    attempt.status = 'suspended' as any;

    if (data.sessionTime) {
      attempt.timeSpentSeconds = (attempt.timeSpentSeconds || 0) + data.sessionTime;
    }

    attempt.lastAccessedAt = new Date();
    await attempt.save();

    // Update SCORM data if exists
    const scormAttempt = await ScormAttempt.findById(attemptId);
    if (scormAttempt) {
      if (data.suspendData !== undefined) {
        scormAttempt.suspendData = data.suspendData;
      }
      if (data.location !== undefined) {
        scormAttempt.location = data.location;
      }
      if (data.sessionTime) {
        scormAttempt.sessionTime = data.sessionTime;
        scormAttempt.totalTime = (scormAttempt.totalTime || 0) + data.sessionTime;
      }

      scormAttempt.status = 'incomplete';
      scormAttempt.lastAccessedAt = new Date();
      await scormAttempt.save();
    }

    return {
      id: attempt._id.toString(),
      status: 'suspended',
      suspendData: scormAttempt?.suspendData || null,
      location: scormAttempt?.location || null,
      timeSpentSeconds: attempt.timeSpentSeconds || 0,
      lastAccessedAt: attempt.lastAccessedAt
    };
  }

  /**
   * Resume a suspended attempt
   */
  static async resumeAttempt(attemptId: string, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw ApiError.notFound('Attempt not found');
    }

    const attempt = await ContentAttempt.findById(attemptId)
      .populate('contentId', '_id')
      .lean();

    if (!attempt) {
      throw ApiError.notFound('Attempt not found');
    }

    // Only the attempt owner can resume
    if (attempt.learnerId.toString() !== userId) {
      throw ApiError.forbidden('Cannot resume this attempt');
    }

    // Can only resume suspended attempts
    if (attempt.status !== 'suspended') {
      throw ApiError.conflict('Attempt is not suspended');
    }

    // Update attempt status
    await ContentAttempt.updateOne(
      { _id: attemptId },
      {
        $set: {
          status: 'in-progress',
          lastAccessedAt: new Date()
        }
      }
    );

    // Get SCORM data if exists
    const scormAttempt = await ScormAttempt.findById(attemptId).lean();
    if (scormAttempt) {
      await ScormAttempt.updateOne(
        { _id: attemptId },
        {
          $set: {
            status: 'incomplete',
            lastAccessedAt: new Date()
          }
        }
      );
    }

    const content = attempt.contentId as any;
    const launchUrl = content?.type === 'scorm'
      ? `/scorm/${content._id.toString()}/launch?attempt=${attemptId}`
      : null;

    return {
      id: attemptId,
      status: 'in-progress',
      suspendData: scormAttempt?.suspendData || null,
      location: scormAttempt?.location || null,
      cmiData: scormAttempt?.cmiData || null,
      launchUrl,
      lastAccessedAt: new Date()
    };
  }

  /**
   * Delete an attempt (admin only)
   */
  static async deleteAttempt(attemptId: string, userId: string, permanent: boolean = false): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      throw ApiError.notFound('Attempt not found');
    }

    // Check admin permissions
    const user = await User.findById(userId).lean();
    const isAdmin = user?.roles?.some(r => ['global-admin', 'system-admin'].includes(r));

    if (!isAdmin) {
      throw ApiError.forbidden('Insufficient permissions to delete attempts');
    }

    const attempt = await ContentAttempt.findById(attemptId);
    if (!attempt) {
      throw ApiError.notFound('Attempt not found');
    }

    if (permanent) {
      // Hard delete
      await ContentAttempt.deleteOne({ _id: attemptId });
      await ScormAttempt.deleteOne({ _id: attemptId });
    } else {
      // Soft delete - mark as abandoned
      attempt.status = 'abandoned' as any;
      attempt.metadata = {
        ...attempt.metadata,
        deletedAt: new Date(),
        deletedBy: userId
      };
      await attempt.save();
    }

    return {
      id: attemptId,
      deleted: true,
      deletedAt: new Date()
    };
  }
}
