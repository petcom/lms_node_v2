/**
 * Migration: GlobalAdmin Field Renames
 *
 * Renames fields in the GlobalAdmin collection for consistency:
 * - roleMemberships → departmentMemberships
 * - roleMemberships[].assignedAt → departmentMemberships[].joinedAt
 * - Add isPrimary field (first membership = true, others = false)
 *
 * This migration updates the GlobalAdmin model to match the naming
 * conventions used in Staff and Learner models.
 *
 * Usage:
 *   npx ts-node src/migrations/migrate-globaladmin.ts
 *   npm run migrate:globaladmin
 *
 * @module migrations/migrate-globaladmin
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const config = {
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/lms_v2'
};

/**
 * Step 1: Rename roleMemberships to departmentMemberships
 */
async function renameRoleMemberships(): Promise<number> {
  console.log('Step 1: Renaming roleMemberships → departmentMemberships...');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  const collection = db.collection('globaladmins');

  // Count documents that need migration
  const needsMigration = await collection.countDocuments({
    roleMemberships: { $exists: true }
  });

  if (needsMigration === 0) {
    console.log('  ✓ No documents need migration (already migrated or no data)');
    return 0;
  }

  console.log(`  Found ${needsMigration} documents to migrate`);

  // Rename field
  const result = await collection.updateMany(
    { roleMemberships: { $exists: true } },
    { $rename: { roleMemberships: 'departmentMemberships' } }
  );

  console.log(`  ✓ Renamed field in ${result.modifiedCount} documents`);
  return result.modifiedCount;
}

/**
 * Step 2: Rename nested assignedAt to joinedAt
 */
async function renameAssignedAt(): Promise<number> {
  console.log('Step 2: Renaming departmentMemberships[].assignedAt → joinedAt...');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  const collection = db.collection('globaladmins');

  // Update each document's array elements
  const result = await collection.updateMany(
    { 'departmentMemberships.assignedAt': { $exists: true } },
    { $rename: { 'departmentMemberships.$[].assignedAt': 'departmentMemberships.$[].joinedAt' } }
  );

  console.log(`  ✓ Renamed nested field in ${result.modifiedCount} documents`);
  return result.modifiedCount;
}

/**
 * Step 3: Add isPrimary field
 */
async function addIsPrimaryField(): Promise<number> {
  console.log('Step 3: Adding isPrimary field...');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  const collection = db.collection('globaladmins');

  // Find all documents with departmentMemberships
  const docs = await collection
    .find({ departmentMemberships: { $exists: true, $ne: [] } })
    .toArray();

  if (docs.length === 0) {
    console.log('  ✓ No documents with departmentMemberships found');
    return 0;
  }

  console.log(`  Found ${docs.length} documents to update`);

  let updatedCount = 0;

  for (const doc of docs) {
    const departmentMemberships = doc.departmentMemberships || [];

    // Check if isPrimary already exists
    const hasIsPrimary = departmentMemberships.some(
      (dm: any) => dm.hasOwnProperty('isPrimary')
    );

    if (hasIsPrimary) {
      console.log(`  ⏭  Skipping ${doc._id} (isPrimary already exists)`);
      continue;
    }

    // Add isPrimary to each membership (first = true, others = false)
    const updatedMemberships = departmentMemberships.map((dm: any, index: number) => ({
      ...dm,
      isPrimary: index === 0
    }));

    await collection.updateOne(
      { _id: doc._id },
      { $set: { departmentMemberships: updatedMemberships } }
    );

    updatedCount++;
  }

  console.log(`  ✓ Added isPrimary to ${updatedCount} documents`);
  return updatedCount;
}

/**
 * Validation: Check migration results
 */
async function validateMigration(): Promise<void> {
  console.log('Validating migration...');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  const collection = db.collection('globaladmins');

  // Check for old fields
  const oldFieldCount = await collection.countDocuments({
    roleMemberships: { $exists: true }
  });

  if (oldFieldCount > 0) {
    console.error(`  ✗ Found ${oldFieldCount} documents still using roleMemberships`);
    throw new Error('Migration incomplete - roleMemberships field still exists');
  }

  // Check for new fields
  const newFieldCount = await collection.countDocuments({
    departmentMemberships: { $exists: true }
  });

  console.log(`  Documents with departmentMemberships: ${newFieldCount}`);

  // Check for isPrimary field
  const withIsPrimary = await collection.countDocuments({
    'departmentMemberships.isPrimary': { $exists: true }
  });

  console.log(`  Documents with isPrimary field: ${withIsPrimary}`);

  // Check for joinedAt field
  const withJoinedAt = await collection.countDocuments({
    'departmentMemberships.joinedAt': { $exists: true }
  });

  console.log(`  Documents with joinedAt field: ${withJoinedAt}`);

  // Sample document check
  const sampleDoc = await collection.findOne({
    departmentMemberships: { $exists: true, $ne: [] }
  });

  if (sampleDoc) {
    console.log('  Sample departmentMemberships structure:');
    console.log('  ', JSON.stringify(sampleDoc.departmentMemberships[0], null, 2));
  }

  console.log('  ✓ Migration validation passed');
}

/**
 * Main migration function
 */
async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Migrate GlobalAdmin Fields             ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log('This migration will:');
  console.log('  1. Rename roleMemberships → departmentMemberships');
  console.log('  2. Rename assignedAt → joinedAt (nested)');
  console.log('  3. Add isPrimary field');
  console.log('');

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log(`  ✓ Connected to ${config.mongoUri}`);
    console.log('');

    // Run migration steps
    await renameRoleMemberships();
    console.log('');

    await renameAssignedAt();
    console.log('');

    await addIsPrimaryField();
    console.log('');

    // Validate
    await validateMigration();

    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     Migration Complete!                  ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    console.log('Summary:');
    console.log('  ✓ roleMemberships → departmentMemberships');
    console.log('  ✓ assignedAt → joinedAt');
    console.log('  ✓ isPrimary field added');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Update GlobalAdmin.model.ts to use new field names');
    console.log('  2. Test all GlobalAdmin queries and updates');
    console.log('  3. Run rollback script if issues occur');
    console.log('');

  } catch (error) {
    console.error('Error during migration:', error);
    console.error('');
    console.error('Migration failed. Run rollback script to revert changes:');
    console.error('  npm run rollback:globaladmin');
    console.error('');
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Export for programmatic use
export {
  renameRoleMemberships,
  renameAssignedAt,
  addIsPrimaryField,
  validateMigration
};

// Run the script if executed directly
if (require.main === module) {
  main();
}
