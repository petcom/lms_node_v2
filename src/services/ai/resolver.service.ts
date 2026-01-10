/**
 * AI-Friendly Name Resolution Service
 * Resolves human-readable names to MongoDB ObjectIds
 * Supports exact matching, fuzzy matching, and intelligent suggestions
 */

import mongoose, { Types } from 'mongoose';
import Department from '@/models/organization/Department.model';
import Program from '@/models/academic/Program.model';
import Course from '@/models/academic/Course.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import Content, { ContentType } from '@/models/content/Content.model';
import { Cache } from '@/config/redis';
import { fuzzyMatch, getSuggestions } from '@/utils/fuzzy-match.util';

/**
 * Resolution result interface
 */
export interface ResolutionResult {
  success: boolean;
  objectId?: Types.ObjectId;
  suggestions?: string[];
  error?: string;
}

/**
 * Resolution options
 */
export interface ResolutionOptions {
  fuzzyThreshold?: number;
  useCache?: boolean;
  type?: ContentType;
}

/**
 * Batch resolution item
 */
export interface BatchResolutionItem {
  type: 'department' | 'program' | 'instructor' | 'course' | 'content';
  nameOrId: string;
  context?: {
    departmentId?: string;
    type?: ContentType;
  };
}

/**
 * ResolverService - AI-friendly name resolution
 */
export class ResolverService {
  private static readonly CACHE_TTL = 3600; // 60 minutes
  private static readonly DEFAULT_FUZZY_THRESHOLD = 0.8;
  private static readonly MAX_SUGGESTIONS = 3;

  /**
   * Check if a string is a valid MongoDB ObjectId
   */
  private static isValidObjectId(id: string): boolean {
    return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
  }

  /**
   * Generate cache key for resolution
   */
  private static getCacheKey(type: string, nameOrId: string, context?: string): string {
    const contextStr = context ? `:${context}` : '';
    return `resolver:${type}:${nameOrId.toLowerCase().trim()}${contextStr}`;
  }

  /**
   * Resolve department by name or ID
   */
  static async resolveDepartment(
    nameOrId: string,
    options: ResolutionOptions = {}
  ): Promise<ResolutionResult> {
    const { fuzzyThreshold = this.DEFAULT_FUZZY_THRESHOLD, useCache = true } = options;

    // Validate input
    if (!nameOrId || typeof nameOrId !== 'string' || !nameOrId.trim()) {
      return {
        success: false,
        error: 'Invalid input: nameOrId must be a non-empty string',
      };
    }

    const trimmedInput = nameOrId.trim();

    // Check cache first
    if (useCache) {
      const cacheKey = this.getCacheKey('department', trimmedInput);
      const cached = await Cache.get<string>(cacheKey);
      if (cached) {
        return {
          success: true,
          objectId: new Types.ObjectId(cached),
        };
      }
    }

    // Try exact ObjectId match
    if (this.isValidObjectId(trimmedInput)) {
      const dept = await Department.findOne({ _id: trimmedInput, isActive: true });
      if (dept) {
        return {
          success: true,
          objectId: dept._id,
        };
      }
    }

    // Get all active departments
    const departments = await Department.find({ isActive: true }).lean();

    if (departments.length === 0) {
      return {
        success: false,
        error: 'No active departments found',
      };
    }

    // Try exact name match (case-insensitive)
    const exactNameMatch = departments.find(
      (d) => d.name.toLowerCase() === trimmedInput.toLowerCase()
    );
    if (exactNameMatch) {
      if (useCache) {
        const cacheKey = this.getCacheKey('department', trimmedInput);
        await Cache.set(cacheKey, exactNameMatch._id.toString(), this.CACHE_TTL);
      }
      return {
        success: true,
        objectId: exactNameMatch._id,
      };
    }

    // Try exact code match (case-insensitive)
    const exactCodeMatch = departments.find(
      (d) => d.code.toLowerCase() === trimmedInput.toLowerCase()
    );
    if (exactCodeMatch) {
      if (useCache) {
        const cacheKey = this.getCacheKey('department', trimmedInput);
        await Cache.set(cacheKey, exactCodeMatch._id.toString(), this.CACHE_TTL);
      }
      return {
        success: true,
        objectId: exactCodeMatch._id,
      };
    }

    // Try fuzzy matching
    const fuzzyMatches = fuzzyMatch(
      trimmedInput,
      departments,
      ['name', 'code'],
      fuzzyThreshold,
      1
    );

    if (fuzzyMatches.length > 0) {
      const match = fuzzyMatches[0];
      if (useCache) {
        const cacheKey = this.getCacheKey('department', trimmedInput);
        await Cache.set(cacheKey, match.item._id.toString(), this.CACHE_TTL);
      }
      return {
        success: true,
        objectId: match.item._id,
      };
    }

    // No match found - return suggestions
    const suggestions = getSuggestions(
      trimmedInput,
      departments,
      ['name', 'code'],
      0.5,
      this.MAX_SUGGESTIONS
    );

    return {
      success: false,
      error: `No match found for "${nameOrId}"`,
      suggestions: suggestions.map((s) => s.item.name),
    };
  }

  /**
   * Resolve program by name or ID
   */
  static async resolveProgram(
    nameOrId: string,
    departmentId?: string,
    options: ResolutionOptions = {}
  ): Promise<ResolutionResult> {
    const { fuzzyThreshold = this.DEFAULT_FUZZY_THRESHOLD, useCache = true } = options;

    if (!nameOrId || typeof nameOrId !== 'string' || !nameOrId.trim()) {
      return {
        success: false,
        error: 'Invalid input: nameOrId must be a non-empty string',
      };
    }

    const trimmedInput = nameOrId.trim();

    // Check cache
    if (useCache) {
      const cacheKey = this.getCacheKey('program', trimmedInput, departmentId);
      const cached = await Cache.get<string>(cacheKey);
      if (cached) {
        return {
          success: true,
          objectId: new Types.ObjectId(cached),
        };
      }
    }

    // Try exact ObjectId match
    if (this.isValidObjectId(trimmedInput)) {
      const query: any = { _id: trimmedInput, isActive: true };
      if (departmentId) {
        query.departmentId = departmentId;
      }
      const program = await Program.findOne(query);
      if (program) {
        return {
          success: true,
          objectId: program._id,
        };
      }
    }

    // Build query
    const query: any = { isActive: true };
    if (departmentId) {
      query.departmentId = departmentId;
    }

    // Get all matching programs
    const programs = await Program.find(query).lean();

    if (programs.length === 0) {
      return {
        success: false,
        error: departmentId
          ? 'No active programs found in specified department'
          : 'No active programs found',
      };
    }

    // Try exact name match
    const exactNameMatch = programs.find(
      (p) => p.name.toLowerCase() === trimmedInput.toLowerCase()
    );
    if (exactNameMatch) {
      if (useCache) {
        const cacheKey = this.getCacheKey('program', trimmedInput, departmentId);
        await Cache.set(cacheKey, exactNameMatch._id.toString(), this.CACHE_TTL);
      }
      return {
        success: true,
        objectId: exactNameMatch._id,
      };
    }

    // Try exact code match
    const exactCodeMatch = programs.find(
      (p) => p.code.toLowerCase() === trimmedInput.toLowerCase()
    );
    if (exactCodeMatch) {
      if (useCache) {
        const cacheKey = this.getCacheKey('program', trimmedInput, departmentId);
        await Cache.set(cacheKey, exactCodeMatch._id.toString(), this.CACHE_TTL);
      }
      return {
        success: true,
        objectId: exactCodeMatch._id,
      };
    }

    // Try fuzzy matching
    const fuzzyMatches = fuzzyMatch(
      trimmedInput,
      programs,
      ['name', 'code'],
      fuzzyThreshold,
      1
    );

    if (fuzzyMatches.length > 0) {
      const match = fuzzyMatches[0];
      if (useCache) {
        const cacheKey = this.getCacheKey('program', trimmedInput, departmentId);
        await Cache.set(cacheKey, match.item._id.toString(), this.CACHE_TTL);
      }
      return {
        success: true,
        objectId: match.item._id,
      };
    }

    // No match found - return suggestions
    const suggestions = getSuggestions(
      trimmedInput,
      programs,
      ['name', 'code'],
      0.5,
      this.MAX_SUGGESTIONS
    );

    return {
      success: false,
      error: `No match found for "${nameOrId}"`,
      suggestions: suggestions.map((s) => s.item.name),
    };
  }

  /**
   * Resolve instructor by name or email
   */
  static async resolveInstructor(
    nameOrEmail: string,
    departmentId?: string,
    options: ResolutionOptions = {}
  ): Promise<ResolutionResult> {
    const { fuzzyThreshold = this.DEFAULT_FUZZY_THRESHOLD, useCache = true } = options;

    if (!nameOrEmail || typeof nameOrEmail !== 'string' || !nameOrEmail.trim()) {
      return {
        success: false,
        error: 'Invalid input: nameOrEmail must be a non-empty string',
      };
    }

    const trimmedInput = nameOrEmail.trim();

    // Check cache
    if (useCache) {
      const cacheKey = this.getCacheKey('instructor', trimmedInput, departmentId);
      const cached = await Cache.get<string>(cacheKey);
      if (cached) {
        return {
          success: true,
          objectId: new Types.ObjectId(cached),
        };
      }
    }

    // Try exact ObjectId match
    if (this.isValidObjectId(trimmedInput)) {
      const user = await User.findOne({
        _id: trimmedInput,
        roles: 'instructor',
        isActive: true,
      });
      if (user) {
        return {
          success: true,
          objectId: user._id,
        };
      }
    }

    // Try exact email match
    const userByEmail = await User.findOne({
      email: trimmedInput.toLowerCase(),
      roles: 'instructor',
      isActive: true,
    });
    if (userByEmail) {
      if (useCache) {
        const cacheKey = this.getCacheKey('instructor', trimmedInput, departmentId);
        await Cache.set(cacheKey, userByEmail._id.toString(), this.CACHE_TTL);
      }
      return {
        success: true,
        objectId: userByEmail._id,
      };
    }

    // Build staff query with department filter
    const staffQuery: any = { isActive: true };
    if (departmentId) {
      staffQuery['departmentMemberships.departmentId'] = departmentId;
    }

    // Get staff members
    const staffMembers = await Staff.find(staffQuery).lean();

    // Get all staff user IDs
    const staffUserIds = staffMembers.map((s) => s._id);

    // Get users with instructor role
    const instructorUsers = await User.find({
      _id: { $in: staffUserIds },
      roles: 'instructor',
      isActive: true,
    }).lean();

    const instructorUserIds = new Set(instructorUsers.map((u) => u._id.toString()));

    // Filter staff members to only those who are instructors
    const instructorStaff = staffMembers.filter((staff) =>
      instructorUserIds.has(staff._id.toString())
    );

    if (instructorStaff.length === 0) {
      return {
        success: false,
        error: departmentId
          ? 'No active instructors found in specified department'
          : 'No active instructors found',
      };
    }

    // Try exact name matches
    for (const staff of instructorStaff) {
      const fullName = `${staff.firstName} ${staff.lastName}`.toLowerCase();
      const reverseName = `${staff.lastName}, ${staff.firstName}`.toLowerCase();

      if (
        fullName === trimmedInput.toLowerCase() ||
        reverseName === trimmedInput.toLowerCase()
      ) {
        if (useCache) {
          const cacheKey = this.getCacheKey('instructor', trimmedInput, departmentId);
          await Cache.set(cacheKey, staff._id.toString(), this.CACHE_TTL);
        }
        return {
          success: true,
          objectId: staff._id,
        };
      }
    }

    // Try fuzzy matching on names
    const fuzzyMatches = fuzzyMatch(
      trimmedInput,
      instructorStaff,
      [(item) => `${item.firstName} ${item.lastName}`],
      fuzzyThreshold,
      1
    );

    if (fuzzyMatches.length > 0) {
      const match = fuzzyMatches[0];
      if (useCache) {
        const cacheKey = this.getCacheKey('instructor', trimmedInput, departmentId);
        await Cache.set(cacheKey, match.item._id.toString(), this.CACHE_TTL);
      }
      return {
        success: true,
        objectId: match.item._id,
      };
    }

    // No match found - return suggestions
    const suggestions = getSuggestions(
      trimmedInput,
      instructorStaff,
      [(item) => `${item.firstName} ${item.lastName}`],
      0.5,
      this.MAX_SUGGESTIONS
    );

    return {
      success: false,
      error: `No match found for "${nameOrEmail}"`,
      suggestions: suggestions.map((s) => `${s.item.firstName} ${s.item.lastName}`),
    };
  }

  /**
   * Resolve course by code or title
   */
  static async resolveCourse(
    codeOrTitle: string,
    departmentId?: string,
    options: ResolutionOptions = {}
  ): Promise<ResolutionResult> {
    const { fuzzyThreshold = this.DEFAULT_FUZZY_THRESHOLD, useCache = true } = options;

    if (!codeOrTitle || typeof codeOrTitle !== 'string' || !codeOrTitle.trim()) {
      return {
        success: false,
        error: 'Invalid input: codeOrTitle must be a non-empty string',
      };
    }

    const trimmedInput = codeOrTitle.trim();

    // Check cache
    if (useCache) {
      const cacheKey = this.getCacheKey('course', trimmedInput, departmentId);
      const cached = await Cache.get<string>(cacheKey);
      if (cached) {
        return {
          success: true,
          objectId: new Types.ObjectId(cached),
        };
      }
    }

    // Try exact ObjectId match
    if (this.isValidObjectId(trimmedInput)) {
      const query: any = { _id: trimmedInput, isActive: true };
      if (departmentId) {
        query.departmentId = departmentId;
      }
      const course = await Course.findOne(query);
      if (course) {
        return {
          success: true,
          objectId: course._id,
        };
      }
    }

    // Build query
    const query: any = { isActive: true };
    if (departmentId) {
      query.departmentId = departmentId;
    }

    // Get all matching courses
    const courses = await Course.find(query).lean();

    if (courses.length === 0) {
      return {
        success: false,
        error: departmentId
          ? 'No active courses found in specified department'
          : 'No active courses found',
      };
    }

    // Try exact code match
    const exactCodeMatch = courses.find(
      (c) => c.code.toLowerCase() === trimmedInput.toLowerCase()
    );
    if (exactCodeMatch) {
      if (useCache) {
        const cacheKey = this.getCacheKey('course', trimmedInput, departmentId);
        await Cache.set(cacheKey, exactCodeMatch._id.toString(), this.CACHE_TTL);
      }
      return {
        success: true,
        objectId: exactCodeMatch._id,
      };
    }

    // Try exact name match
    const exactNameMatch = courses.find(
      (c) => c.name.toLowerCase() === trimmedInput.toLowerCase()
    );
    if (exactNameMatch) {
      if (useCache) {
        const cacheKey = this.getCacheKey('course', trimmedInput, departmentId);
        await Cache.set(cacheKey, exactNameMatch._id.toString(), this.CACHE_TTL);
      }
      return {
        success: true,
        objectId: exactNameMatch._id,
      };
    }

    // Try fuzzy matching
    const fuzzyMatches = fuzzyMatch(
      trimmedInput,
      courses,
      ['code', 'name'],
      fuzzyThreshold,
      1
    );

    if (fuzzyMatches.length > 0) {
      const match = fuzzyMatches[0];
      if (useCache) {
        const cacheKey = this.getCacheKey('course', trimmedInput, departmentId);
        await Cache.set(cacheKey, match.item._id.toString(), this.CACHE_TTL);
      }
      return {
        success: true,
        objectId: match.item._id,
      };
    }

    // No match found - return suggestions
    const suggestions = getSuggestions(
      trimmedInput,
      courses,
      ['code', 'name'],
      0.5,
      this.MAX_SUGGESTIONS
    );

    return {
      success: false,
      error: `No match found for "${codeOrTitle}"`,
      suggestions: suggestions.map((s) => `${s.item.code} - ${s.item.name}`),
    };
  }

  /**
   * Resolve content by title or ID
   */
  static async resolveContent(
    titleOrId: string,
    options: ResolutionOptions = {}
  ): Promise<ResolutionResult> {
    const { fuzzyThreshold = this.DEFAULT_FUZZY_THRESHOLD, useCache = true, type } = options;

    if (!titleOrId || typeof titleOrId !== 'string' || !titleOrId.trim()) {
      return {
        success: false,
        error: 'Invalid input: titleOrId must be a non-empty string',
      };
    }

    const trimmedInput = titleOrId.trim();

    // Check cache
    if (useCache) {
      const cacheKey = this.getCacheKey('content', trimmedInput, type);
      const cached = await Cache.get<string>(cacheKey);
      if (cached) {
        return {
          success: true,
          objectId: new Types.ObjectId(cached),
        };
      }
    }

    // Try exact ObjectId match
    if (this.isValidObjectId(trimmedInput)) {
      const query: any = { _id: trimmedInput, isActive: true };
      if (type) {
        query.type = type;
      }
      const content = await Content.findOne(query);
      if (content) {
        return {
          success: true,
          objectId: content._id,
        };
      }
    }

    // Build query
    const query: any = { isActive: true };
    if (type) {
      query.type = type;
    }

    // Get all matching content
    const contents = await Content.find(query).lean();

    if (contents.length === 0) {
      return {
        success: false,
        error: type ? `No active content found of type "${type}"` : 'No active content found',
      };
    }

    // Try exact title match
    const exactTitleMatch = contents.find(
      (c) => c.title.toLowerCase() === trimmedInput.toLowerCase()
    );
    if (exactTitleMatch) {
      if (useCache) {
        const cacheKey = this.getCacheKey('content', trimmedInput, type);
        await Cache.set(cacheKey, exactTitleMatch._id.toString(), this.CACHE_TTL);
      }
      return {
        success: true,
        objectId: exactTitleMatch._id,
      };
    }

    // Try fuzzy matching
    const fuzzyMatches = fuzzyMatch(
      trimmedInput,
      contents,
      ['title'],
      fuzzyThreshold,
      1
    );

    if (fuzzyMatches.length > 0) {
      const match = fuzzyMatches[0];
      if (useCache) {
        const cacheKey = this.getCacheKey('content', trimmedInput, type);
        await Cache.set(cacheKey, match.item._id.toString(), this.CACHE_TTL);
      }
      return {
        success: true,
        objectId: match.item._id,
      };
    }

    // No match found - return suggestions
    const suggestions = getSuggestions(
      trimmedInput,
      contents,
      ['title'],
      0.5,
      this.MAX_SUGGESTIONS
    );

    return {
      success: false,
      error: `No match found for "${titleOrId}"`,
      suggestions: suggestions.map((s) => s.item.title),
    };
  }

  /**
   * Resolve multiple items in batch
   */
  static async resolveBatch(items: BatchResolutionItem[]): Promise<ResolutionResult[]> {
    if (!items || !Array.isArray(items)) {
      return [];
    }

    const results: ResolutionResult[] = [];

    for (const item of items) {
      let result: ResolutionResult;

      switch (item.type) {
        case 'department':
          result = await this.resolveDepartment(item.nameOrId);
          break;

        case 'program':
          result = await this.resolveProgram(
            item.nameOrId,
            item.context?.departmentId
          );
          break;

        case 'instructor':
          result = await this.resolveInstructor(
            item.nameOrId,
            item.context?.departmentId
          );
          break;

        case 'course':
          result = await this.resolveCourse(
            item.nameOrId,
            item.context?.departmentId
          );
          break;

        case 'content':
          result = await this.resolveContent(item.nameOrId, {
            type: item.context?.type,
          });
          break;

        default:
          result = {
            success: false,
            error: `Unknown resolution type: ${item.type}`,
          };
      }

      results.push(result);
    }

    return results;
  }
}
