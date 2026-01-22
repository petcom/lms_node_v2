/**
 * Migration: Assessment Configuration Indexes
 *
 * This migration sets up indexes for the Assessment system:
 * - Adds indexes to the Assessment collection for efficient querying
 * - Adds indexes to the AssessmentAttempt collection for progress tracking
 * - Ensures ModuleAccess collection is properly indexed for analytics
 *
 * IMPORTANT: Test on staging environment before running in production!
 *
 * Usage:
 *   npx ts-node src/migrations/migrate-assessment-config.ts
 *   npx ts-node src/migrations/migrate-assessment-config.ts down
 *   npm run migrate:assessment-config
 *
 * @module migrations/migrate-assessment-config
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
  assessmentIndexes: number;
  attemptIndexes: number;
  moduleAccessIndexes: number;
  errors: string[];
}

/**
 * Apply migration UP
 * Creates indexes for Assessment, AssessmentAttempt, and ModuleAccess collections
 */
export async function up(): Promise<MigrationStats> {
  console.log('Starting Assessment Configuration Migration (UP)...');
  console.log('');

  const stats: MigrationStats = {
    assessmentIndexes: 0,
    attemptIndexes: 0,
    moduleAccessIndexes: 0,
    errors: []
  };

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  try {
    // STEP 1: Assessment collection indexes
    console.log('Step 1: Creating Assessment collection indexes...');
    await createAssessmentIndexes(db, stats);
    console.log(`  Assessment indexes created/verified: ${stats.assessmentIndexes}`);
    console.log('');

    // STEP 2: AssessmentAttempt collection indexes
    console.log('Step 2: Creating AssessmentAttempt collection indexes...');
    await createAssessmentAttemptIndexes(db, stats);
    console.log(`  AssessmentAttempt indexes created/verified: ${stats.attemptIndexes}`);
    console.log('');

    // STEP 3: ModuleAccess collection indexes
    console.log('Step 3: Creating ModuleAccess collection indexes...');
    await createModuleAccessIndexes(db, stats);
    console.log(`  ModuleAccess indexes created/verified: ${stats.moduleAccessIndexes}`);
    console.log('');

    console.log('Migration UP completed successfully!');
    console.log('');
    console.log('Summary:');
    console.log(`  - Assessment indexes: ${stats.assessmentIndexes}`);
    console.log(`  - AssessmentAttempt indexes: ${stats.attemptIndexes}`);
    console.log(`  - ModuleAccess indexes: ${stats.moduleAccessIndexes}`);
    console.log(`  - Total indexes: ${stats.assessmentIndexes + stats.attemptIndexes + stats.moduleAccessIndexes}`);
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
 * Removes custom indexes created by this migration
 */
export async function down(): Promise<void> {
  console.log('Rolling back Assessment Configuration Migration (DOWN)...');
  console.log('');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  try {
    // STEP 1: Drop Assessment custom indexes
    console.log('Step 1: Dropping Assessment custom indexes...');
    await dropCustomIndexes(db, 'assessments', [
      'dept_style_published_idx',
      'dept_archived_idx',
      'createdBy_dept_idx',
      'title_text_idx'
    ]);
    console.log('');

    // STEP 2: Drop AssessmentAttempt custom indexes
    console.log('Step 2: Dropping AssessmentAttempt custom indexes...');
    await dropCustomIndexes(db, 'assessmentattempts', [
      'learner_assessment_status_idx',
      'assessment_status_scoring_idx',
      'enrollment_module_idx',
      'timing_submitted_idx',
      'scoring_grading_idx'
    ]);
    console.log('');

    // STEP 3: Drop ModuleAccess custom indexes
    console.log('Step 3: Dropping ModuleAccess custom indexes...');
    await dropCustomIndexes(db, 'moduleaccesses', [
      'course_module_status_idx',
      'learner_course_status_idx',
      'module_completion_analytics_idx',
      'enrollment_progress_idx'
    ]);
    console.log('');

    console.log('Rollback completed successfully!');

  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

/**
 * Helper to drop custom indexes
 */
async function dropCustomIndexes(db: mongoose.mongo.Db, collectionName: string, indexNames: string[]): Promise<void> {
  try {
    const collection = db.collection(collectionName);
    const existingIndexes = await collection.indexes();
    const existingIndexNames = existingIndexes.map(idx => idx.name);

    for (const indexName of indexNames) {
      if (existingIndexNames.includes(indexName)) {
        try {
          await collection.dropIndex(indexName);
          console.log(`  Dropped index: ${indexName}`);
        } catch (error) {
          console.log(`  Could not drop index ${indexName}: ${error}`);
        }
      } else {
        console.log(`  Index not found: ${indexName}`);
      }
    }
  } catch (error) {
    console.log(`  Collection ${collectionName} may not exist, skipping`);
  }
}

/**
 * Create indexes on Assessment collection
 */
async function createAssessmentIndexes(db: mongoose.mongo.Db, stats: MigrationStats): Promise<void> {
  const collection = db.collection('assessments');

  // Define indexes to create
  const indexes = [
    // Standard indexes (likely already exist from model definition)
    { key: { departmentId: 1 }, name: 'departmentId_1' },
    { key: { style: 1 }, name: 'style_1' },
    { key: { isPublished: 1 }, name: 'isPublished_1' },
    { key: { isArchived: 1 }, name: 'isArchived_1' },
    { key: { createdBy: 1 }, name: 'createdBy_1' },

    // Compound indexes for common queries
    { key: { departmentId: 1, style: 1 }, name: 'departmentId_1_style_1' },
    { key: { departmentId: 1, isPublished: 1 }, name: 'departmentId_1_isPublished_1' },
    { key: { departmentId: 1, isArchived: 1 }, name: 'departmentId_1_isArchived_1' },

    // Custom migration indexes
    { key: { departmentId: 1, style: 1, isPublished: 1 }, name: 'dept_style_published_idx' },
    { key: { departmentId: 1, isArchived: 1 }, name: 'dept_archived_idx' },
    { key: { createdBy: 1, departmentId: 1 }, name: 'createdBy_dept_idx' },

    // Text index for searching assessments by title
    { key: { title: 'text', description: 'text' }, name: 'title_text_idx' }
  ];

  await createIndexes(collection, indexes, stats, 'assessmentIndexes');
}

/**
 * Create indexes on AssessmentAttempt collection
 */
async function createAssessmentAttemptIndexes(db: mongoose.mongo.Db, stats: MigrationStats): Promise<void> {
  const collection = db.collection('assessmentattempts');

  // Define indexes to create
  const indexes = [
    // Standard indexes (likely already exist from model definition)
    { key: { assessmentId: 1, learnerId: 1, attemptNumber: 1 }, name: 'assessmentId_1_learnerId_1_attemptNumber_1' },
    { key: { learnerId: 1, status: 1 }, name: 'learnerId_1_status_1' },
    { key: { assessmentId: 1, status: 1 }, name: 'assessmentId_1_status_1' },
    { key: { enrollmentId: 1 }, name: 'enrollmentId_1' },

    // Custom migration indexes for common query patterns
    // Index for finding learner's assessment progress
    { key: { learnerId: 1, assessmentId: 1, status: 1 }, name: 'learner_assessment_status_idx' },

    // Index for analytics: assessment performance by status and score
    { key: { assessmentId: 1, status: 1, 'scoring.percentageScore': 1 }, name: 'assessment_status_scoring_idx' },

    // Index for module-based assessment tracking
    { key: { enrollmentId: 1, moduleId: 1 }, name: 'enrollment_module_idx' },

    // Index for time-based queries (when was the attempt submitted)
    { key: { 'timing.submittedAt': 1 }, name: 'timing_submitted_idx' },

    // Index for grading queue (attempts needing manual grading)
    { key: { 'scoring.gradingComplete': 1, 'scoring.requiresManualGrading': 1 }, name: 'scoring_grading_idx' }
  ];

  await createIndexes(collection, indexes, stats, 'attemptIndexes');
}

/**
 * Create indexes on ModuleAccess collection
 */
async function createModuleAccessIndexes(db: mongoose.mongo.Db, stats: MigrationStats): Promise<void> {
  const collection = db.collection('moduleaccesses');

  // Define indexes to create
  const indexes = [
    // Standard indexes (likely already exist from model definition)
    { key: { learnerId: 1, moduleId: 1 }, name: 'learnerId_1_moduleId_1', options: { unique: true } },
    { key: { moduleId: 1, hasStartedLearningUnit: 1 }, name: 'moduleId_1_hasStartedLearningUnit_1' },
    { key: { moduleId: 1, status: 1 }, name: 'moduleId_1_status_1' },
    { key: { enrollmentId: 1 }, name: 'enrollmentId_1' },

    // Custom migration indexes for analytics
    // Index for course-level module progress tracking
    { key: { courseId: 1, moduleId: 1, status: 1 }, name: 'course_module_status_idx' },

    // Index for learner progress across a course
    { key: { learnerId: 1, courseId: 1, status: 1 }, name: 'learner_course_status_idx' },

    // Index for module completion analytics
    { key: { moduleId: 1, completedAt: 1 }, name: 'module_completion_analytics_idx' },

    // Index for enrollment progress tracking
    { key: { enrollmentId: 1, status: 1 }, name: 'enrollment_progress_idx' },

    // Index for drop-off analysis (accessed but never started)
    { key: { moduleId: 1, hasStartedLearningUnit: 1, status: 1 }, name: 'module_dropoff_idx' },

    // Index for time-based access tracking
    { key: { lastAccessedAt: 1 }, name: 'lastAccessedAt_1' },
    { key: { firstAccessedAt: 1 }, name: 'firstAccessedAt_1' }
  ];

  await createIndexes(collection, indexes, stats, 'moduleAccessIndexes');
}

/**
 * Helper to create indexes on a collection
 */
async function createIndexes(
  collection: mongoose.mongo.Collection,
  indexes: Array<{ key: any; name: string; options?: any }>,
  stats: MigrationStats,
  statsKey: 'assessmentIndexes' | 'attemptIndexes' | 'moduleAccessIndexes'
): Promise<void> {
  // Get existing indexes
  let existingIndexes: any[] = [];
  try {
    existingIndexes = await collection.indexes();
  } catch (error) {
    // Collection may not exist yet, which is fine
    console.log(`  Collection may not exist yet, will create indexes`);
  }
  const existingIndexNames = existingIndexes.map(idx => idx.name);

  for (const index of indexes) {
    if (!existingIndexNames.includes(index.name)) {
      try {
        const indexOptions: any = { name: index.name, background: true };
        if (index.options?.unique) {
          indexOptions.unique = true;
        }
        await collection.createIndex(index.key, indexOptions);
        stats[statsKey]++;
        console.log(`  Created index: ${index.name}`);
      } catch (error) {
        // Index might already exist with different options, skip
        console.log(`  Skipping index ${index.name}: ${error}`);
        stats.errors.push(`Index ${index.name}: ${error}`);
      }
    } else {
      console.log(`  Index already exists: ${index.name}`);
      stats[statsKey]++;
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

  // Check Assessment indexes
  try {
    const assessmentIndexes = await db.collection('assessments').indexes();
    console.log(`  Assessment collection indexes: ${assessmentIndexes.length}`);
  } catch (error) {
    console.log('  Assessment collection may not exist yet');
  }

  // Check AssessmentAttempt indexes
  try {
    const attemptIndexes = await db.collection('assessmentattempts').indexes();
    console.log(`  AssessmentAttempt collection indexes: ${attemptIndexes.length}`);
  } catch (error) {
    console.log('  AssessmentAttempt collection may not exist yet');
  }

  // Check ModuleAccess indexes
  try {
    const moduleAccessIndexes = await db.collection('moduleaccesses').indexes();
    console.log(`  ModuleAccess collection indexes: ${moduleAccessIndexes.length}`);
  } catch (error) {
    console.log('  ModuleAccess collection may not exist yet');
  }

  // Count documents in each collection
  try {
    const assessmentCount = await db.collection('assessments').countDocuments();
    console.log(`  Assessments in database: ${assessmentCount}`);
  } catch (error) {
    console.log('  Assessments: 0 (collection may not exist)');
  }

  try {
    const attemptCount = await db.collection('assessmentattempts').countDocuments();
    console.log(`  AssessmentAttempts in database: ${attemptCount}`);
  } catch (error) {
    console.log('  AssessmentAttempts: 0 (collection may not exist)');
  }

  try {
    const moduleAccessCount = await db.collection('moduleaccesses').countDocuments();
    console.log(`  ModuleAccess records in database: ${moduleAccessCount}`);
  } catch (error) {
    console.log('  ModuleAccess: 0 (collection may not exist)');
  }

  console.log('  Validation complete');
}

/**
 * Main migration function
 */
async function main(): Promise<void> {
  const command = process.argv[2];
  const isRollback = command === 'down';

  console.log('='.repeat(60));
  console.log('  Assessment Configuration Migration');
  console.log('  Learning Unit System - Assessment Indexes');
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
export {
  createAssessmentIndexes,
  createAssessmentAttemptIndexes,
  createModuleAccessIndexes,
  validateMigration
};

// Run the script if executed directly
if (require.main === module) {
  main();
}
