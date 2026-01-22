/**
 * Program Levels Service
 *
 * Business logic for program level management.
 * Program levels represent sequential stages within academic programs.
 *
 * @module services/academic/program-levels
 */

import mongoose from 'mongoose';
import ProgramLevel from '@/models/academic/ProgramLevel.model';
import Program from '@/models/academic/Program.model';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/config/logger';

/**
 * Level input for create/update operations
 */
export interface LevelInput {
  name: string;
  description?: string;
  requiredCredits?: number;
  courses?: string[];
}

/**
 * Level filters for queries
 */
export interface LevelFilters {
  programId?: string;
  isActive?: boolean;
}

/**
 * Program Levels Service
 */
export class ProgramLevelsService {
  /**
   * Get a program level by ID with populated program
   */
  static async getById(levelId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(levelId)) {
      throw ApiError.badRequest('Invalid level ID format');
    }

    const level = await ProgramLevel.findById(levelId).lean();

    if (!level) {
      throw ApiError.notFound('Program level not found');
    }

    // Get program details
    const program = await Program.findById(level.programId)
      .select('name code departmentId')
      .lean();

    return {
      id: level._id.toString(),
      name: level.name,
      order: level.levelNumber,
      programId: level.programId.toString(),
      program: program ? {
        id: program._id.toString(),
        name: program.name,
        code: program.code,
        departmentId: program.departmentId?.toString()
      } : null,
      description: level.description || null,
      requiredCredits: (level as any).requiredCredits || null,
      courses: (level as any).courses || [],
      isActive: level.isActive,
      createdAt: level.createdAt,
      updatedAt: level.updatedAt
    };
  }

  /**
   * List all levels for a program
   */
  static async listByProgram(programId: string): Promise<any[]> {
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID format');
    }

    const levels = await ProgramLevel.find({
      programId: new mongoose.Types.ObjectId(programId),
      isActive: true
    })
      .sort({ levelNumber: 1 })
      .lean();

    return levels.map(level => ({
      id: level._id.toString(),
      name: level.name,
      order: level.levelNumber,
      programId: level.programId.toString(),
      description: level.description || null,
      requiredCredits: (level as any).requiredCredits || null,
      courses: (level as any).courses || [],
      isActive: level.isActive,
      createdAt: level.createdAt,
      updatedAt: level.updatedAt
    }));
  }

  /**
   * Create a new program level
   */
  static async create(programId: string, data: LevelInput): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID format');
    }

    // Verify program exists
    const program = await Program.findById(programId);
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    // Get next level number
    const maxLevel = await ProgramLevel.findOne({ programId })
      .sort({ levelNumber: -1 })
      .select('levelNumber')
      .lean();

    const nextLevelNumber = maxLevel ? maxLevel.levelNumber + 1 : 1;

    // Check for duplicate name in program
    const existingName = await ProgramLevel.findOne({
      programId,
      name: data.name,
      isActive: true
    });

    if (existingName) {
      throw ApiError.conflict('Level name already exists in this program');
    }

    const level = await ProgramLevel.create({
      programId: new mongoose.Types.ObjectId(programId),
      name: data.name,
      levelNumber: nextLevelNumber,
      description: data.description,
      isActive: true
    });

    logger.info('Program level created', {
      levelId: level._id,
      programId,
      name: data.name,
      levelNumber: nextLevelNumber
    });

    return this.getById(level._id.toString());
  }

  /**
   * Update a program level
   */
  static async update(levelId: string, data: Partial<LevelInput>): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(levelId)) {
      throw ApiError.badRequest('Invalid level ID format');
    }

    const level = await ProgramLevel.findById(levelId);
    if (!level) {
      throw ApiError.notFound('Program level not found');
    }

    // Check for duplicate name if changing name
    if (data.name && data.name !== level.name) {
      const existingName = await ProgramLevel.findOne({
        programId: level.programId,
        name: data.name,
        isActive: true,
        _id: { $ne: levelId }
      });

      if (existingName) {
        throw ApiError.conflict('Level name already exists in this program');
      }
    }

    // Update allowed fields
    if (data.name !== undefined) level.name = data.name;
    if (data.description !== undefined) level.description = data.description;

    await level.save();

    logger.info('Program level updated', {
      levelId,
      changes: Object.keys(data)
    });

    return this.getById(levelId);
  }

  /**
   * Delete a program level (soft delete)
   */
  static async delete(levelId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(levelId)) {
      throw ApiError.badRequest('Invalid level ID format');
    }

    const level = await ProgramLevel.findById(levelId);
    if (!level) {
      throw ApiError.notFound('Program level not found');
    }

    // Check if this is the only level in the program
    const levelCount = await ProgramLevel.countDocuments({
      programId: level.programId,
      isActive: true
    });

    if (levelCount <= 1) {
      throw ApiError.conflict(
        'Cannot delete the only level in a program. Programs must have at least one level.'
      );
    }

    // Soft delete
    level.isActive = false;
    await level.save();

    // Reorder remaining levels
    await this.reorderAfterDelete(level.programId.toString(), level.levelNumber);

    logger.info('Program level deleted', {
      levelId,
      programId: level.programId
    });
  }

  /**
   * Reorder a level within the program
   */
  static async reorder(levelId: string, newOrder: number): Promise<any[]> {
    if (!mongoose.Types.ObjectId.isValid(levelId)) {
      throw ApiError.badRequest('Invalid level ID format');
    }

    if (newOrder < 1) {
      throw ApiError.badRequest('Order must be at least 1');
    }

    const level = await ProgramLevel.findById(levelId);
    if (!level) {
      throw ApiError.notFound('Program level not found');
    }

    const programId = level.programId;
    const currentOrder = level.levelNumber;

    // Get total levels in program
    const totalLevels = await ProgramLevel.countDocuments({
      programId,
      isActive: true
    });

    if (newOrder > totalLevels) {
      throw ApiError.badRequest(
        `Order value ${newOrder} exceeds number of levels in program (${totalLevels})`
      );
    }

    if (currentOrder === newOrder) {
      // No change needed
      return this.listByProgram(programId.toString());
    }

    // Use session for atomic operation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (newOrder > currentOrder) {
        // Moving down: decrease order of levels between current and new
        await ProgramLevel.updateMany(
          {
            programId,
            levelNumber: { $gt: currentOrder, $lte: newOrder },
            isActive: true
          },
          { $inc: { levelNumber: -1 } },
          { session }
        );
      } else {
        // Moving up: increase order of levels between new and current
        await ProgramLevel.updateMany(
          {
            programId,
            levelNumber: { $gte: newOrder, $lt: currentOrder },
            isActive: true
          },
          { $inc: { levelNumber: 1 } },
          { session }
        );
      }

      // Update the target level
      level.levelNumber = newOrder;
      await level.save({ session });

      await session.commitTransaction();

      logger.info('Program level reordered', {
        levelId,
        programId,
        fromOrder: currentOrder,
        toOrder: newOrder
      });

      return this.listByProgram(programId.toString());
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Reorder levels after a deletion
   */
  private static async reorderAfterDelete(programId: string, deletedOrder: number): Promise<void> {
    await ProgramLevel.updateMany(
      {
        programId: new mongoose.Types.ObjectId(programId),
        levelNumber: { $gt: deletedOrder },
        isActive: true
      },
      { $inc: { levelNumber: -1 } }
    );
  }

  /**
   * Get department ID for a level (for authorization)
   */
  static async getDepartmentId(levelId: string): Promise<string | null> {
    const level = await ProgramLevel.findById(levelId).lean();
    if (!level) return null;

    const program = await Program.findById(level.programId)
      .select('departmentId')
      .lean();

    return program?.departmentId?.toString() || null;
  }
}

export default ProgramLevelsService;
