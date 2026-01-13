import mongoose from 'mongoose';
import Content from '@/models/content/Content.model';
import ContentAttempt from '@/models/content/ContentAttempt.model';
import Department from '@/models/organization/Department.model';
import { Staff } from '@/models/auth/Staff.model';
import { User } from '@/models/auth/User.model';
import { ApiError } from '@/utils/ApiError';
import jwt from 'jsonwebtoken';

/**
 * Content Service
 * Handles all content library operations (SCORM, Media, Overview)
 */

interface ListContentFilters {
  type?: 'scorm' | 'media' | 'exercise';
  departmentId?: string;
  status?: 'draft' | 'published' | 'archived';
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

interface ListScormFilters {
  departmentId?: string;
  status?: 'draft' | 'published' | 'archived';
  version?: '1.2' | '2004';
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

interface ListMediaFilters {
  type?: 'video' | 'audio' | 'image' | 'document';
  departmentId?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

interface UploadScormData {
  file: Express.Multer.File;
  title?: string;
  description?: string;
  departmentId?: string;
  thumbnail?: Express.Multer.File;
  uploadedBy: string;
}

interface UpdateScormData {
  title?: string;
  description?: string;
  departmentId?: string | null;
  thumbnailUrl?: string;
}

interface UploadMediaData {
  file: Express.Multer.File;
  title: string;
  description?: string;
  departmentId?: string;
  type: 'video' | 'audio' | 'image' | 'document';
  uploadedBy: string;
}

interface UpdateMediaData {
  title?: string;
  description?: string;
  departmentId?: string | null;
}

interface LaunchScormData {
  courseContentId?: string;
  resumeAttempt?: boolean;
  userId: string;
}

export class ContentService {
  /**
   * =====================
   * CONTENT OVERVIEW
   * =====================
   */

  /**
   * List all content items across all types
   */
  static async listAllContent(filters: ListContentFilters, userId: string): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { isActive: true };

    // Type filter
    if (filters.type) {
      if (filters.type === 'scorm') {
        query.type = 'scorm';
      } else if (filters.type === 'media') {
        query.type = { $in: ['video', 'document'] };
      } else if (filters.type === 'exercise') {
        query.type = { $in: ['quiz', 'assignment'] };
      }
    }

    // Status filter (using metadata.status for now)
    if (filters.status) {
      query['metadata.status'] = filters.status;
    }

    // Department filter - check user access
    const departmentIds = await this.getUserAccessibleDepartments(userId);
    if (filters.departmentId) {
      if (!departmentIds.includes(filters.departmentId)) {
        throw ApiError.forbidden('No access to this department');
      }
      query['metadata.departmentId'] = filters.departmentId;
    } else {
      // Limit to accessible departments
      query.$or = [
        { 'metadata.departmentId': { $in: departmentIds } },
        { 'metadata.departmentId': null }
      ];
    }

    // Search filter
    if (filters.search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } }
        ]
      });
    }

    // Parse sort
    const sortField = filters.sort || '-createdAt';
    const sortDirection = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortObj: any = { [sortKey]: sortDirection };

    // Execute query
    const [content, total] = await Promise.all([
      Content.find(query)
        .populate('createdBy', 'firstName lastName email')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Content.countDocuments(query)
    ]);

    // Format results
    const contentData = await Promise.all(
      content.map(async (item: any) => {
        const departmentId = item.metadata?.departmentId;
        let department = null;
        if (departmentId) {
          const dept = await Department.findById(departmentId).lean();
          if (dept) {
            department = { id: dept._id.toString(), name: dept.name };
          }
        }

        const creator = item.createdBy || {};
        return {
          id: item._id.toString(),
          title: item.title,
          type: this.mapContentTypeToContract(item.type),
          status: item.metadata?.status || 'draft',
          departmentId: departmentId || null,
          department,
          thumbnailUrl: item.metadata?.thumbnailUrl || null,
          description: item.description || null,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          createdBy: {
            id: creator._id?.toString() || '',
            name: `${creator.firstName || ''} ${creator.lastName || ''}`.trim()
          }
        };
      })
    );

    return {
      content: contentData,
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
   * Get content item by ID
   */
  static async getContentById(contentId: string, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      throw ApiError.notFound('Content not found');
    }

    const content = await Content.findOne({ _id: contentId, isActive: true })
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .lean();

    if (!content) {
      throw ApiError.notFound('Content not found');
    }

    // Check department access
    const departmentId = content.metadata?.departmentId;
    if (departmentId) {
      const departmentIds = await this.getUserAccessibleDepartments(userId);
      if (!departmentIds.includes(departmentId)) {
        throw ApiError.forbidden('No access to this content');
      }
    }

    // Get usage count (how many course contents reference this)
    const usageCount = 0; // TODO: Query CourseContent model when available

    const dept = departmentId ? await Department.findById(departmentId).lean() : null;
    const creator = content.createdBy as any || {};
    const updater = content.updatedBy as any || {};

    return {
      id: content._id.toString(),
      title: content.title,
      type: this.mapContentTypeToContract(content.type),
      status: content.metadata?.status || 'draft',
      departmentId: departmentId || null,
      department: dept ? { id: dept._id.toString(), name: dept.name } : null,
      description: content.description || null,
      thumbnailUrl: content.metadata?.thumbnailUrl || null,
      metadata: content.metadata || {},
      usageCount,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
      createdBy: {
        id: creator._id?.toString() || '',
        name: `${creator.firstName || ''} ${creator.lastName || ''}`.trim(),
        email: creator.email || ''
      },
      updatedBy: {
        id: updater._id?.toString() || '',
        name: `${updater.firstName || ''} ${updater.lastName || ''}`.trim(),
        email: updater.email || ''
      }
    };
  }

  /**
   * =====================
   * SCORM PACKAGES
   * =====================
   */

  /**
   * List SCORM packages
   */
  static async listScormPackages(filters: ListScormFilters, userId: string): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { type: 'scorm', isActive: true };

    // Status filter
    if (filters.status) {
      query['metadata.status'] = filters.status;
    }

    // Version filter
    if (filters.version) {
      query['scormData.version'] = filters.version;
    }

    // Department filter
    const departmentIds = await this.getUserAccessibleDepartments(userId);
    if (filters.departmentId) {
      if (!departmentIds.includes(filters.departmentId)) {
        throw ApiError.forbidden('No access to this department');
      }
      query['metadata.departmentId'] = filters.departmentId;
    } else {
      query.$or = [
        { 'metadata.departmentId': { $in: departmentIds } },
        { 'metadata.departmentId': null }
      ];
    }

    // Search filter
    if (filters.search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: filters.search, $options: 'i' } },
          { 'metadata.identifier': { $regex: filters.search, $options: 'i' } }
        ]
      });
    }

    // Parse sort
    const sortField = filters.sort || '-createdAt';
    const sortDirection = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortObj: any = { [sortKey]: sortDirection };

    // Execute query
    const [packages, total] = await Promise.all([
      Content.find(query).sort(sortObj).skip(skip).limit(limit).lean(),
      Content.countDocuments(query)
    ]);

    // Format results
    const packagesData = await Promise.all(
      packages.map(async (pkg: any) => {
        const departmentId = pkg.metadata?.departmentId;
        let department = null;
        if (departmentId) {
          const dept = await Department.findById(departmentId).lean();
          if (dept) {
            department = { id: dept._id.toString(), name: dept.name };
          }
        }

        return {
          id: pkg._id.toString(),
          title: pkg.title,
          identifier: pkg.metadata?.identifier || pkg._id.toString(),
          version: pkg.scormData?.version || '1.2',
          status: pkg.metadata?.status || 'draft',
          isPublished: pkg.metadata?.status === 'published',
          departmentId: departmentId || null,
          department,
          packagePath: pkg.scormData?.manifestPath || '',
          launchUrl: `/scorm-player/${pkg._id.toString()}`,
          thumbnailUrl: pkg.metadata?.thumbnailUrl || null,
          description: pkg.description || null,
          fileSize: pkg.fileSize || 0,
          createdAt: pkg.createdAt,
          updatedAt: pkg.updatedAt
        };
      })
    );

    return {
      packages: packagesData,
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
   * Upload SCORM package
   */
  static async uploadScormPackage(data: UploadScormData): Promise<any> {
    // Validate file type
    if (!data.file.originalname.toLowerCase().endsWith('.zip')) {
      throw ApiError.badRequest('File must be a ZIP archive');
    }

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024;
    if (data.file.size > maxSize) {
      throw ApiError.badRequest('Package exceeds maximum size limit (100MB)');
    }

    // Validate department access if specified
    if (data.departmentId) {
      const departmentIds = await this.getUserAccessibleDepartments(data.uploadedBy);
      if (!departmentIds.includes(data.departmentId)) {
        throw ApiError.forbidden('No access to this department');
      }
    }

    // TODO: Extract and parse SCORM package
    // For now, we'll create a placeholder implementation
    const extractedPath = `/scorm-packages/${Date.now()}/`;
    const manifestData = await this.parseScormManifest(data.file);

    // Create content record
    const content = await Content.create({
      title: data.title || manifestData.title || data.file.originalname.replace('.zip', ''),
      description: data.description,
      type: 'scorm',
      fileUrl: extractedPath,
      fileSize: data.file.size,
      mimeType: 'application/zip',
      scormData: {
        version: manifestData.version,
        manifestPath: `${extractedPath}imsmanifest.xml`,
        launchPath: `${extractedPath}${manifestData.launchPath || 'index.html'}`
      },
      createdBy: data.uploadedBy,
      isActive: true,
      metadata: {
        status: 'draft',
        identifier: manifestData.identifier || `scorm-${Date.now()}`,
        departmentId: data.departmentId || null,
        thumbnailUrl: data.thumbnail ? `/uploads/thumbnails/${data.thumbnail.filename}` : null,
        uploadedFile: data.file.filename
      }
    });

    return {
      id: content._id.toString(),
      title: content.title,
      identifier: content.metadata?.identifier || '',
      version: content.scormData!.version,
      status: 'draft',
      isPublished: false,
      departmentId: data.departmentId || null,
      packagePath: content.scormData!.manifestPath,
      launchUrl: `/scorm-player/${content._id.toString()}`,
      manifestData: {
        schemaVersion: manifestData.version,
        metadata: manifestData.metadata || {},
        organizations: manifestData.organizations || [],
        resources: manifestData.resources || []
      },
      fileSize: content.fileSize,
      createdAt: content.createdAt
    };
  }

  /**
   * Get SCORM package details
   */
  static async getScormPackageById(scormId: string, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(scormId)) {
      throw ApiError.notFound('SCORM package not found');
    }

    const content = await Content.findOne({ _id: scormId, type: 'scorm', isActive: true })
      .populate('createdBy', 'firstName lastName email')
      .lean();

    if (!content) {
      throw ApiError.notFound('SCORM package not found');
    }

    // Check department access
    const departmentId = content.metadata?.departmentId;
    if (departmentId) {
      const departmentIds = await this.getUserAccessibleDepartments(userId);
      if (!departmentIds.includes(departmentId)) {
        throw ApiError.forbidden('No access to this SCORM package');
      }
    }

    const dept = departmentId ? await Department.findById(departmentId).lean() : null;
    const creator = content.createdBy as any || {};

    // Get usage statistics
    const totalAttempts = await ContentAttempt.countDocuments({ contentId: content._id });
    const completedAttempts = await ContentAttempt.find({
      contentId: content._id,
      status: 'completed'
    }).lean();

    const averageScore = completedAttempts.length > 0
      ? completedAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / completedAttempts.length
      : null;

    const usageCount = 0; // TODO: Query CourseContent

    return {
      id: content._id.toString(),
      title: content.title,
      identifier: content.metadata?.identifier || content._id.toString(),
      version: content.scormData?.version || '1.2',
      status: content.metadata?.status || 'draft',
      isPublished: content.metadata?.status === 'published',
      departmentId: departmentId || null,
      department: dept ? { id: dept._id.toString(), name: dept.name } : null,
      packagePath: content.scormData?.manifestPath || '',
      launchUrl: `/scorm-player/${content._id.toString()}`,
      thumbnailUrl: content.metadata?.thumbnailUrl || null,
      description: content.description || null,
      manifestData: {
        schemaVersion: content.scormData?.version || '1.2',
        metadata: content.metadata || {},
        organizations: [],
        resources: []
      },
      fileSize: content.fileSize || 0,
      usageCount,
      totalAttempts,
      averageScore,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
      createdBy: {
        id: creator._id?.toString() || '',
        name: `${creator.firstName || ''} ${creator.lastName || ''}`.trim(),
        email: creator.email || ''
      },
      publishedAt: content.metadata?.publishedAt || null,
      publishedBy: content.metadata?.publishedBy
        ? { id: content.metadata.publishedBy, name: 'Unknown' }
        : null
    };
  }

  /**
   * Update SCORM package metadata
   */
  static async updateScormPackage(
    scormId: string,
    updateData: UpdateScormData,
    userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(scormId)) {
      throw ApiError.notFound('SCORM package not found');
    }

    const content = await Content.findOne({ _id: scormId, type: 'scorm', isActive: true });
    if (!content) {
      throw ApiError.notFound('SCORM package not found');
    }

    // Check department access
    const departmentId = content.metadata?.departmentId;
    if (departmentId) {
      const departmentIds = await this.getUserAccessibleDepartments(userId);
      if (!departmentIds.includes(departmentId)) {
        throw ApiError.forbidden('No access to this SCORM package');
      }
    }

    // Update fields
    if (updateData.title !== undefined) content.title = updateData.title;
    if (updateData.description !== undefined) content.description = updateData.description;
    if (updateData.departmentId !== undefined) {
      content.metadata = content.metadata || {};
      content.metadata.departmentId = updateData.departmentId;
    }
    if (updateData.thumbnailUrl !== undefined) {
      content.metadata = content.metadata || {};
      content.metadata.thumbnailUrl = updateData.thumbnailUrl;
    }
    content.updatedBy = new mongoose.Types.ObjectId(userId);

    await content.save();

    return {
      id: content._id.toString(),
      title: content.title,
      description: content.description || null,
      departmentId: content.metadata?.departmentId || null,
      thumbnailUrl: content.metadata?.thumbnailUrl || null,
      updatedAt: content.updatedAt
    };
  }

  /**
   * Delete SCORM package (soft delete)
   */
  static async deleteScormPackage(scormId: string, userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(scormId)) {
      throw ApiError.notFound('SCORM package not found');
    }

    const content = await Content.findOne({ _id: scormId, type: 'scorm', isActive: true });
    if (!content) {
      throw ApiError.notFound('SCORM package not found');
    }

    // Check department access
    const departmentId = content.metadata?.departmentId;
    if (departmentId) {
      const departmentIds = await this.getUserAccessibleDepartments(userId);
      if (!departmentIds.includes(departmentId)) {
        throw ApiError.forbidden('No access to this SCORM package');
      }
    }

    // Check if in use
    const usageCount = 0; // TODO: Query CourseContent
    if (usageCount > 0) {
      throw ApiError.conflict('Cannot delete package that is in use by courses');
    }

    // Check for active attempts
    const activeAttempts = await ContentAttempt.countDocuments({
      contentId: content._id,
      status: { $in: ['in-progress', 'not-started'] }
    });

    if (activeAttempts > 0) {
      throw ApiError.conflict('Cannot delete package with active learner attempts');
    }

    // Soft delete
    content.isActive = false;
    content.metadata = content.metadata || {};
    content.metadata.status = 'archived';
    await content.save();
  }

  /**
   * Launch SCORM package
   */
  static async launchScormPackage(scormId: string, data: LaunchScormData): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(scormId)) {
      throw ApiError.notFound('SCORM package not found');
    }

    const content = await Content.findOne({
      _id: scormId,
      type: 'scorm',
      isActive: true
    }).lean();

    if (!content) {
      throw ApiError.notFound('SCORM package not found');
    }

    // Check if published
    if (content.metadata?.status !== 'published') {
      throw ApiError.forbidden('SCORM package is not published');
    }

    // Check department access
    const departmentId = content.metadata?.departmentId;
    if (departmentId) {
      const departmentIds = await this.getUserAccessibleDepartments(data.userId);
      if (!departmentIds.includes(departmentId)) {
        throw ApiError.forbidden('No access to this SCORM package');
      }
    }

    let attempt: any;
    let isResumed = false;

    // Check for existing incomplete attempt if resuming
    if (data.resumeAttempt) {
      attempt = await ContentAttempt.findOne({
        contentId: content._id,
        learnerId: data.userId,
        status: 'in_progress'
      });

      if (attempt) {
        isResumed = true;
      }
    }

    // Create new attempt if not resuming or no incomplete attempt found
    if (!attempt) {
      // Get next attempt number for this learner
      const lastAttempt = await ContentAttempt.findOne({
        contentId: content._id,
        learnerId: data.userId
      }).sort({ attemptNumber: -1 }).lean();

      const attemptNumber = lastAttempt ? lastAttempt.attemptNumber + 1 : 1;

      attempt = await ContentAttempt.create({
        contentId: content._id,
        learnerId: data.userId,
        attemptNumber,
        status: 'in_progress',
        startedAt: new Date(),
        lastAccessedAt: new Date(),
        metadata: {
          courseContentId: data.courseContentId || null
        }
      });
    }

    // Generate session token (expires in 4 hours)
    const sessionToken = jwt.sign(
      {
        attemptId: attempt._id.toString(),
        userId: data.userId,
        contentId: content._id.toString()
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '4h' }
    );

    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);

    return {
      playerUrl: `${process.env.APP_URL || 'https://lms.example.com'}/scorm-player/${content._id.toString()}?session=${sessionToken}`,
      attemptId: attempt._id.toString(),
      sessionToken,
      isResumed,
      scormVersion: content.scormData?.version || '1.2',
      launchData: {
        entryPoint: content.scormData?.launchPath || '/index.html',
        parameters: {
          student_id: data.userId,
          student_name: 'Learner',
          credit: 'credit',
          mode: 'normal'
        }
      },
      expiresAt
    };
  }

  /**
   * Publish SCORM package
   */
  static async publishScormPackage(scormId: string, userId: string, publishedAt?: Date): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(scormId)) {
      throw ApiError.notFound('SCORM package not found');
    }

    const content = await Content.findOne({ _id: scormId, type: 'scorm', isActive: true });
    if (!content) {
      throw ApiError.notFound('SCORM package not found');
    }

    // Check department access
    const departmentId = content.metadata?.departmentId;
    if (departmentId) {
      const departmentIds = await this.getUserAccessibleDepartments(userId);
      if (!departmentIds.includes(departmentId)) {
        throw ApiError.forbidden('No access to this SCORM package');
      }
    }

    // Check if already published
    if (content.metadata?.status === 'published') {
      throw ApiError.conflict('Package is already published');
    }

    // Validate package integrity (basic check)
    if (!content.scormData?.manifestPath || !content.scormData?.launchPath) {
      throw ApiError.badRequest('Package cannot be published (invalid manifest or missing files)');
    }

    // Update status
    content.metadata = content.metadata || {};
    content.metadata.status = 'published';
    content.metadata.publishedAt = publishedAt || new Date();
    content.metadata.publishedBy = userId;
    content.updatedBy = new mongoose.Types.ObjectId(userId);

    await content.save();

    const user = await User.findById(userId).lean();
    const staff = user ? await Staff.findById(userId).lean() : null;
    const publisherName = staff
      ? `${staff.person.firstName} ${staff.person.lastName}`.trim()
      : 'Unknown';

    return {
      id: content._id.toString(),
      status: 'published',
      isPublished: true,
      publishedAt: content.metadata.publishedAt,
      publishedBy: {
        id: userId,
        name: publisherName
      }
    };
  }

  /**
   * Unpublish SCORM package
   */
  static async unpublishScormPackage(scormId: string, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(scormId)) {
      throw ApiError.notFound('SCORM package not found');
    }

    const content = await Content.findOne({ _id: scormId, type: 'scorm', isActive: true });
    if (!content) {
      throw ApiError.notFound('SCORM package not found');
    }

    // Check department access
    const departmentId = content.metadata?.departmentId;
    if (departmentId) {
      const departmentIds = await this.getUserAccessibleDepartments(userId);
      if (!departmentIds.includes(departmentId)) {
        throw ApiError.forbidden('No access to this SCORM package');
      }
    }

    // Check for active learner sessions
    const activeAttempts = await ContentAttempt.countDocuments({
      contentId: content._id,
      status: 'in-progress'
    });

    if (activeAttempts > 0) {
      throw ApiError.conflict('Cannot unpublish package with active learner sessions');
    }

    // Update status
    content.metadata = content.metadata || {};
    content.metadata.status = 'draft';
    content.metadata.unpublishedAt = new Date();
    content.metadata.unpublishedBy = userId;
    content.updatedBy = new mongoose.Types.ObjectId(userId);

    await content.save();

    const user = await User.findById(userId).lean();
    const staff = user ? await Staff.findById(userId).lean() : null;
    const unpublisherName = staff
      ? `${staff.person.firstName} ${staff.person.lastName}`.trim()
      : 'Unknown';

    return {
      id: content._id.toString(),
      status: 'draft',
      isPublished: false,
      unpublishedAt: content.metadata.unpublishedAt,
      unpublishedBy: {
        id: userId,
        name: unpublisherName
      }
    };
  }

  /**
   * =====================
   * MEDIA LIBRARY
   * =====================
   */

  /**
   * List media files
   */
  static async listMediaFiles(filters: ListMediaFilters, userId: string): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {
      type: { $in: ['video', 'document'] },
      isActive: true
    };

    // Type filter
    if (filters.type) {
      const typeMap: any = {
        video: 'video',
        audio: 'video', // Map audio to video type for now
        image: 'document', // Map image to document type
        document: 'document'
      };
      query.type = typeMap[filters.type];
      // Store actual subtype in metadata
      if (filters.type === 'audio') {
        query['metadata.subtype'] = 'audio';
      } else if (filters.type === 'image') {
        query['metadata.subtype'] = 'image';
      }
    }

    // Department filter
    const departmentIds = await this.getUserAccessibleDepartments(userId);
    if (filters.departmentId) {
      if (!departmentIds.includes(filters.departmentId)) {
        throw ApiError.forbidden('No access to this department');
      }
      query['metadata.departmentId'] = filters.departmentId;
    } else {
      query.$or = [
        { 'metadata.departmentId': { $in: departmentIds } },
        { 'metadata.departmentId': null }
      ];
    }

    // Search filter
    if (filters.search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: filters.search, $options: 'i' } },
          { 'metadata.filename': { $regex: filters.search, $options: 'i' } }
        ]
      });
    }

    // Parse sort
    const sortField = filters.sort || '-createdAt';
    const sortDirection = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortObj: any = { [sortKey]: sortDirection };

    // Execute query
    const [media, total] = await Promise.all([
      Content.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Content.countDocuments(query)
    ]);

    // Format results
    const mediaData = await Promise.all(
      media.map(async (item: any) => {
        const departmentId = item.metadata?.departmentId;
        let department = null;
        if (departmentId) {
          const dept = await Department.findById(departmentId).lean();
          if (dept) {
            department = { id: dept._id.toString(), name: dept.name };
          }
        }

        const creator = item.createdBy || {};
        const mediaType = item.metadata?.subtype || item.type;

        return {
          id: item._id.toString(),
          title: item.title,
          filename: item.metadata?.filename || item.fileUrl?.split('/').pop() || '',
          type: mediaType === 'audio' ? 'audio' : mediaType === 'image' ? 'image' : item.type === 'video' ? 'video' : 'document',
          mimeType: item.mimeType || 'application/octet-stream',
          url: this.generateCDNUrl(item.fileUrl || ''),
          thumbnailUrl: item.metadata?.thumbnailUrl || null,
          size: item.fileSize || 0,
          duration: item.duration || null,
          departmentId: departmentId || null,
          department,
          createdAt: item.createdAt,
          createdBy: {
            id: creator._id?.toString() || '',
            name: `${creator.firstName || ''} ${creator.lastName || ''}`.trim()
          }
        };
      })
    );

    return {
      media: mediaData,
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
   * Upload media file
   */
  static async uploadMediaFile(data: UploadMediaData): Promise<any> {
    // Validate file type
    const allowedMimeTypes: Record<string, string[]> = {
      video: ['video/mp4', 'video/webm', 'video/quicktime'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
    };

    if (!allowedMimeTypes[data.type]?.includes(data.file.mimetype)) {
      throw ApiError.badRequest('File type not supported');
    }

    // Validate file size
    const maxSizes: Record<string, number> = {
      video: 500 * 1024 * 1024, // 500MB
      audio: 100 * 1024 * 1024, // 100MB
      image: 10 * 1024 * 1024,  // 10MB
      document: 50 * 1024 * 1024 // 50MB
    };

    if (data.file.size > maxSizes[data.type]) {
      throw ApiError.badRequest(`File exceeds maximum size limit`);
    }

    // Validate department access
    if (data.departmentId) {
      const departmentIds = await this.getUserAccessibleDepartments(data.uploadedBy);
      if (!departmentIds.includes(data.departmentId)) {
        throw ApiError.forbidden('No access to this department');
      }
    }

    // Determine content type for storage
    const contentType = data.type === 'audio' || data.type === 'video' ? 'video' : 'document';

    // Create content record
    const content = await Content.create({
      title: data.title,
      description: data.description,
      type: contentType,
      fileUrl: `/uploads/media/${data.file.filename}`,
      fileSize: data.file.size,
      mimeType: data.file.mimetype,
      duration: data.type === 'video' || data.type === 'audio' ? null : undefined, // TODO: Extract from file
      createdBy: data.uploadedBy,
      isActive: true,
      metadata: {
        subtype: data.type,
        filename: data.file.originalname,
        departmentId: data.departmentId || null,
        thumbnailUrl: null // TODO: Auto-generate for videos/images
      }
    });

    return {
      id: content._id.toString(),
      title: content.title,
      filename: data.file.originalname,
      type: data.type,
      mimeType: data.file.mimetype,
      url: this.generateCDNUrl(content.fileUrl!),
      thumbnailUrl: null,
      size: content.fileSize!,
      duration: content.duration || null,
      departmentId: data.departmentId || null,
      createdAt: content.createdAt
    };
  }

  /**
   * Get media file details
   */
  static async getMediaFileById(mediaId: string, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      throw ApiError.notFound('Media file not found');
    }

    const content = await Content.findOne({
      _id: mediaId,
      type: { $in: ['video', 'document'] },
      isActive: true
    })
      .populate('createdBy', 'firstName lastName email')
      .lean();

    if (!content) {
      throw ApiError.notFound('Media file not found');
    }

    // Check department access
    const departmentId = content.metadata?.departmentId;
    if (departmentId) {
      const departmentIds = await this.getUserAccessibleDepartments(userId);
      if (!departmentIds.includes(departmentId)) {
        throw ApiError.forbidden('No access to this media file');
      }
    }

    const dept = departmentId ? await Department.findById(departmentId).lean() : null;
    const creator = content.createdBy as any || {};
    const usageCount = 0; // TODO: Query CourseContent

    const mediaType = content.metadata?.subtype || content.type;

    return {
      id: content._id.toString(),
      title: content.title,
      filename: content.metadata?.filename || '',
      description: content.description || null,
      type: mediaType === 'audio' ? 'audio' : mediaType === 'image' ? 'image' : content.type === 'video' ? 'video' : 'document',
      mimeType: content.mimeType || '',
      url: this.generateCDNUrl(content.fileUrl || ''),
      thumbnailUrl: content.metadata?.thumbnailUrl || null,
      size: content.fileSize || 0,
      duration: content.duration || null,
      metadata: {
        width: null,
        height: null,
        bitrate: null,
        codec: null
      },
      departmentId: departmentId || null,
      department: dept ? { id: dept._id.toString(), name: dept.name } : null,
      usageCount,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
      createdBy: {
        id: creator._id?.toString() || '',
        name: `${creator.firstName || ''} ${creator.lastName || ''}`.trim(),
        email: creator.email || ''
      }
    };
  }

  /**
   * Update media metadata
   */
  static async updateMediaFile(
    mediaId: string,
    updateData: UpdateMediaData,
    userId: string
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      throw ApiError.notFound('Media file not found');
    }

    const content = await Content.findOne({
      _id: mediaId,
      type: { $in: ['video', 'document'] },
      isActive: true
    });

    if (!content) {
      throw ApiError.notFound('Media file not found');
    }

    // Check department access
    const departmentId = content.metadata?.departmentId;
    if (departmentId) {
      const departmentIds = await this.getUserAccessibleDepartments(userId);
      if (!departmentIds.includes(departmentId)) {
        throw ApiError.forbidden('No access to this media file');
      }
    }

    // Update fields
    if (updateData.title !== undefined) content.title = updateData.title;
    if (updateData.description !== undefined) content.description = updateData.description;
    if (updateData.departmentId !== undefined) {
      content.metadata = content.metadata || {};
      content.metadata.departmentId = updateData.departmentId;
    }
    content.updatedBy = new mongoose.Types.ObjectId(userId);

    await content.save();

    return {
      id: content._id.toString(),
      title: content.title,
      description: content.description || null,
      departmentId: content.metadata?.departmentId || null,
      updatedAt: content.updatedAt
    };
  }

  /**
   * Delete media file (soft delete)
   */
  static async deleteMediaFile(mediaId: string, userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      throw ApiError.notFound('Media file not found');
    }

    const content = await Content.findOne({
      _id: mediaId,
      type: { $in: ['video', 'document'] },
      isActive: true
    });

    if (!content) {
      throw ApiError.notFound('Media file not found');
    }

    // Check department access
    const departmentId = content.metadata?.departmentId;
    if (departmentId) {
      const departmentIds = await this.getUserAccessibleDepartments(userId);
      if (!departmentIds.includes(departmentId)) {
        throw ApiError.forbidden('No access to this media file');
      }
    }

    // Check if in use
    const usageCount = 0; // TODO: Query CourseContent
    if (usageCount > 0) {
      throw ApiError.conflict('Cannot delete media that is in use by courses');
    }

    // Soft delete
    content.isActive = false;
    content.metadata = content.metadata || {};
    content.metadata.deletedAt = new Date();
    await content.save();
  }

  /**
   * =====================
   * HELPER METHODS
   * =====================
   */

  /**
   * Get departments accessible to user
   */
  private static async getUserAccessibleDepartments(userId: string): Promise<string[]> {
    const user = await User.findById(userId).lean();
    if (!user) {
      return [];
    }

    // Check if global admin
    if (user.roles?.includes('global-admin')) {
      // Return all department IDs
      const allDepartments = await Department.find({ isActive: true }).lean();
      return allDepartments.map(dept => dept._id.toString());
    }

    // Get staff department memberships
    const staff = await Staff.findById(userId).lean();
    if (!staff) {
      return [];
    }

    return staff.departmentMemberships?.map((m: any) => m.departmentId.toString()) || [];
  }

  /**
   * Map internal content type to contract type
   */
  private static mapContentTypeToContract(type: string): string {
    const typeMap: Record<string, string> = {
      scorm: 'scorm',
      video: 'media',
      document: 'media',
      quiz: 'exercise',
      assignment: 'exercise'
    };
    return typeMap[type] || 'media';
  }

  /**
   * Parse SCORM manifest (placeholder)
   */
  private static async parseScormManifest(file: Express.Multer.File): Promise<any> {
    // TODO: Implement actual SCORM manifest parsing
    // For now, return placeholder data
    return {
      version: '1.2',
      title: file.originalname.replace('.zip', ''),
      identifier: `scorm-${Date.now()}`,
      launchPath: 'index.html',
      metadata: {},
      organizations: [],
      resources: []
    };
  }

  /**
   * Generate CDN URL for file
   */
  private static generateCDNUrl(filePath: string): string {
    const cdnBase = process.env.CDN_URL || 'https://cdn.example.com';
    return `${cdnBase}${filePath}`;
  }
}
