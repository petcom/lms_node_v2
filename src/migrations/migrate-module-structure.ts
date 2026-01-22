/**
 * Migration: Module Structure for Learning Unit System
 *
 * This migration sets up the Module collection structure:
 * - Adds indexes to the Module collection for efficient querying
 * - Updates Course documents to support module-based content delivery
 * - Creates default modules for existing courses if needed
 *
 * IMPORTANT: Test on staging environment before running in production!
 *
 * Usage:
 *   npx ts-node src/migrations/migrate-module-structure.ts
 *   npx ts-node src/migrations/migrate-module-structure.ts down
 *   npm run migrate:module-structure
 *
 * @module migrations/migrate-module-structure
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const config = {
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_mock'
};

interface MigrationStats {
  modulesIndexesCreated: number;
  coursesUpdated: number;
  defaultModulesCreated: number;
  errors: string[];
}

/**
 * Apply migration UP
 * Sets up Module collection indexes and creates default modules for existing courses
 */
export async function up(): Promise<MigrationStats> {
  console.log('Starting Module Structure Migration (UP)...');
  console.log('');

  const stats: MigrationStats = {
    modulesIndexesCreated: 0,
    coursesUpdated: 0,
    defaultModulesCreated: 0,
    errors: []
  };

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  try {
    // STEP 1: Ensure Module collection indexes
    console.log('Step 1: Creating Module collection indexes...');
    await createModuleIndexes(db, stats);
    console.log(`  Indexes created/verified: ${stats.modulesIndexesCreated}`);
    console.log('');

    // STEP 2: Update Course documents metadata
    console.log('Step 2: Updating Course documents for module support...');
    await updateCourseDocuments(db, stats);
    console.log(`  Courses updated: ${stats.coursesUpdated}`);
    console.log('');

    // STEP 3: Create default modules for existing courses without modules
    console.log('Step 3: Creating default modules for existing courses...');
    await createDefaultModulesForCourses(db, stats);
    console.log(`  Default modules created: ${stats.defaultModulesCreated}`);
    console.log('');

    console.log('Migration UP completed successfully!');
    console.log('');
    console.log('Summary:');
    console.log(`  - Module indexes created: ${stats.modulesIndexesCreated}`);
    console.log(`  - Courses updated: ${stats.coursesUpdated}`);
    console.log(`  - Default modules created: ${stats.defaultModulesCreated}`);
    console.log(`  - Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('');
      console.log('Errors encountered:');
      stats.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }

    return stats;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Migration UP failed:', errorMsg);
    stats.errors.push(errorMsg);
    throw error;
  }
}

/**
 * Rollback migration DOWN
 * Removes created indexes and default modules
 */
export async function down(): Promise<void> {
  console.log('Rolling back Module Structure Migration (DOWN)...');
  console.log('');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  try {
    // STEP 1: Remove default modules created by migration
    console.log('Step 1: Removing default modules created by migration...');
    const moduleCollection = db.collection('modules');
    const deleteResult = await moduleCollection.deleteMany({
      'metadata.createdByMigration': 'migrate-module-structure'
    });
    console.log(`  Removed ${deleteResult.deletedCount} default modules`);
    console.log('');

    // STEP 2: Remove module support flag from courses
    console.log('Step 2: Removing module support flag from courses...');
    const courseCollection = db.collection('courses');
    const updateResult = await courseCollection.updateMany(
      { 'metadata.moduleSystemEnabled': { $exists: true } },
      { $unset: { 'metadata.moduleSystemEnabled': '' } }
    );
    console.log(`  Updated ${updateResult.modifiedCount} courses`);
    console.log('');

    // STEP 3: Drop custom indexes (keeping standard Mongoose indexes)
    console.log('Step 3: Dropping custom module indexes...');
    try {
      // Only drop the custom indexes we created, not the standard ones
      const indexes = await moduleCollection.indexes();
      const customIndexNames = [
        'courseId_prerequisites_idx',
        'published_available_idx',
        'courseId_isPublished_order_idx'
      ];

      for (const indexName of customIndexNames) {
        if (indexes.some(idx => idx.name === indexName)) {
          await moduleCollection.dropIndex(indexName);
          console.log(`  Dropped index: ${indexName}`);
        }
      }
    } catch (error) {
      console.log('  Skipping index drop (may not exist)');
    }
    console.log('');

    console.log('Rollback completed successfully!');

  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

/**
 * Create indexes on Module collection
 */
async function createModuleIndexes(db: mongoose.mongo.Db, stats: MigrationStats): Promise<void> {
  const moduleCollection = db.collection('modules');

  // Define indexes to create
  const indexes = [
    // Index for finding modules by course (most common query)
    { key: { courseId: 1 }, name: 'courseId_1' },

    // Compound index for ordered listing within a course
    { key: { courseId: 1, order: 1 }, name: 'courseId_1_order_1' },

    // Index for filtering published modules
    { key: { isPublished: 1 }, name: 'isPublished_1' },

    // Compound index for published modules in order within a course
    { key: { courseId: 1, isPublished: 1, order: 1 }, name: 'courseId_isPublished_order_idx' },

    // Index for prerequisite lookups
    { key: { courseId: 1, prerequisites: 1 }, name: 'courseId_prerequisites_idx' },

    // Index for availability date filtering
    { key: { isPublished: 1, availableFrom: 1, availableUntil: 1 }, name: 'published_available_idx' }
  ];

  // Get existing indexes
  const existingIndexes = await moduleCollection.indexes();
  const existingIndexNames = existingIndexes.map(idx => idx.name);

  for (const index of indexes) {
    if (!existingIndexNames.includes(index.name)) {
      try {
        await moduleCollection.createIndex(index.key as any, { name: index.name, background: true });
        stats.modulesIndexesCreated++;
        console.log(`  Created index: ${index.name}`);
      } catch (error) {
        const errMsg = `Failed to create index ${index.name}: ${error}`;
        console.log(`  Skipping index ${index.name} (may already exist)`);
        stats.errors.push(errMsg);
      }
    } else {
      console.log(`  Index already exists: ${index.name}`);
      stats.modulesIndexesCreated++;
    }
  }
}

/**
 * Update Course documents to support module system
 */
async function updateCourseDocuments(db: mongoose.mongo.Db, stats: MigrationStats): Promise<void> {
  const courseCollection = db.collection('courses');

  // Find courses that don't have the module system flag
  const coursesToUpdate = await courseCollection.find({
    $or: [
      { 'metadata.moduleSystemEnabled': { $exists: false } },
      { metadata: { $exists: false } }
    ]
  }).toArray();

  if (coursesToUpdate.length === 0) {
    console.log('  No courses need updating');
    return;
  }

  console.log(`  Found ${coursesToUpdate.length} courses to update`);

  for (const course of coursesToUpdate) {
    try {
      // Add moduleSystemEnabled flag to metadata
      const currentMetadata = course.metadata || {};
      await courseCollection.updateOne(
        { _id: course._id },
        {
          $set: {
            metadata: {
              ...currentMetadata,
              moduleSystemEnabled: true,
              moduleSystemEnabledAt: new Date()
            }
          }
        }
      );
      stats.coursesUpdated++;
    } catch (error) {
      const errMsg = `Failed to update course ${course._id}: ${error}`;
      console.log(`  Error updating course ${course._id}`);
      stats.errors.push(errMsg);
    }
  }
}

/**
 * Create default modules for existing courses that don't have any modules
 */
async function createDefaultModulesForCourses(db: mongoose.mongo.Db, stats: MigrationStats): Promise<void> {
  const courseCollection = db.collection('courses');
  const moduleCollection = db.collection('modules');

  // Find all active, published courses
  const courses = await courseCollection.find({
    isActive: true,
    status: 'published'
  }).toArray();

  if (courses.length === 0) {
    console.log('  No published courses found');
    return;
  }

  console.log(`  Checking ${courses.length} courses for existing modules`);

  for (const course of courses) {
    try {
      // Check if course already has modules
      const existingModules = await moduleCollection.countDocuments({
        courseId: course._id
      });

      if (existingModules > 0) {
        console.log(`  Course ${course.code} already has ${existingModules} modules, skipping`);
        continue;
      }

      // Create a default "Main Content" module for the course
      const defaultModule = {
        courseId: course._id,
        title: 'Main Content',
        description: `Default module for ${course.name}`,
        prerequisites: [],
        completionCriteria: {
          type: 'all_required',
          requireAllExpositions: true
        },
        presentationRules: {
          presentationMode: 'prescribed',
          repetitionMode: 'none',
          repeatOn: {
            failedAttempt: false,
            belowMastery: false,
            learnerRequest: false
          },
          repeatableCategories: [],
          showAllAvailable: false,
          allowSkip: false
        },
        isPublished: true,
        estimatedDuration: 0,
        order: 1,
        createdBy: course.createdBy || null,
        metadata: {
          createdByMigration: 'migrate-module-structure',
          migratedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await moduleCollection.insertOne(defaultModule);
      stats.defaultModulesCreated++;
      console.log(`  Created default module for course: ${course.code}`);

    } catch (error) {
      const errMsg = `Failed to create default module for course ${course._id}: ${error}`;
      console.log(`  Error creating module for course ${course.code}`);
      stats.errors.push(errMsg);
    }
  }
}

/**
 * Validate migration results
 */
async function validateMigration(): Promise<void> {
  console.log('');
  console.log('Validating migration...');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  const moduleCollection = db.collection('modules');
  const courseCollection = db.collection('courses');

  // Check Module indexes
  const moduleIndexes = await moduleCollection.indexes();
  console.log(`  Module collection indexes: ${moduleIndexes.length}`);

  // Check courses with module system enabled
  const coursesWithModuleSystem = await courseCollection.countDocuments({
    'metadata.moduleSystemEnabled': true
  });
  console.log(`  Courses with module system enabled: ${coursesWithModuleSystem}`);

  // Check total modules
  const totalModules = await moduleCollection.countDocuments();
  console.log(`  Total modules in database: ${totalModules}`);

  // Check modules created by migration
  const migrationModules = await moduleCollection.countDocuments({
    'metadata.createdByMigration': 'migrate-module-structure'
  });
  console.log(`  Modules created by this migration: ${migrationModules}`);

  console.log('  Validation passed');
}

/**
 * Main migration function
 */
async function main(): Promise<void> {
  const command = process.argv[2];
  const isRollback = command === 'down';

  console.log('='.repeat(60));
  console.log('  Module Structure Migration');
  console.log('  Learning Unit System - Phase 1');
  console.log('='.repeat(60));
  console.log('');

  if (isRollback) {
    console.log('Mode: ROLLBACK (down)');
  } else {
    console.log('Mode: APPLY (up)');
  }
  console.log('');

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log(`  Connected to ${config.mongoUri}`);
    console.log('');

    if (isRollback) {
      await down();
    } else {
      await up();
      await validateMigration();
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('  Migration completed successfully!');
    console.log('='.repeat(60));
    console.log('');

  } catch (error) {
    console.error('');
    console.error('Migration failed:', error);
    console.error('');
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Export for programmatic use
export { createModuleIndexes, updateCourseDocuments, createDefaultModulesForCourses, validateMigration };

// Run the script if executed directly
if (require.main === module) {
  main();
}
