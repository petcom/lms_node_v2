/**
 * Rollback: GlobalAdmin Field Migration
 *
 * Reverts the GlobalAdmin field renames back to original state:
 * - departmentMemberships → roleMemberships
 * - departmentMemberships[].joinedAt → roleMemberships[].assignedAt
 * - Remove isPrimary field
 *
 * Use this rollback script if issues occur after migration.
 *
 * Usage:
 *   npx ts-node src/migrations/rollback-globaladmin.ts
 *   npm run rollback:globaladmin
 *
 * @module migrations/rollback-globaladmin
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
 * Step 1: Rename departmentMemberships back to roleMemberships
 */
async function rollbackDepartmentMemberships(): Promise<number> {
  console.log('Step 1: Renaming departmentMemberships → roleMemberships...');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  const collection = db.collection('globaladmins');

  // Count documents that need rollback
  const needsRollback = await collection.countDocuments({
    departmentMemberships: { $exists: true }
  });

  if (needsRollback === 0) {
    console.log('  ✓ No documents need rollback (already rolled back or no data)');
    return 0;
  }

  console.log(`  Found ${needsRollback} documents to rollback`);

  // Rename field back
  const result = await collection.updateMany(
    { departmentMemberships: { $exists: true } },
    { $rename: { departmentMemberships: 'roleMemberships' } }
  );

  console.log(`  ✓ Rolled back field in ${result.modifiedCount} documents`);
  return result.modifiedCount;
}

/**
 * Step 2: Rename nested joinedAt back to assignedAt
 */
async function rollbackJoinedAt(): Promise<number> {
  console.log('Step 2: Renaming roleMemberships[].joinedAt → assignedAt...');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  const collection = db.collection('globaladmins');

  // Update each document's array elements
  const result = await collection.updateMany(
    { 'roleMemberships.joinedAt': { $exists: true } },
    { $rename: { 'roleMemberships.$[].joinedAt': 'roleMemberships.$[].assignedAt' } }
  );

  console.log(`  ✓ Rolled back nested field in ${result.modifiedCount} documents`);
  return result.modifiedCount;
}

/**
 * Step 3: Remove isPrimary field
 */
async function removeIsPrimaryField(): Promise<number> {
  console.log('Step 3: Removing isPrimary field...');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  const collection = db.collection('globaladmins');

  // Find all documents with roleMemberships
  const docs = await collection
    .find({ roleMemberships: { $exists: true, $ne: [] } })
    .toArray();

  if (docs.length === 0) {
    console.log('  ✓ No documents with roleMemberships found');
    return 0;
  }

  console.log(`  Found ${docs.length} documents to update`);

  let updatedCount = 0;

  for (const doc of docs) {
    const roleMemberships = doc.roleMemberships || [];

    // Check if isPrimary exists
    const hasIsPrimary = roleMemberships.some(
      (rm: any) => rm.hasOwnProperty('isPrimary')
    );

    if (!hasIsPrimary) {
      console.log(`  ⏭  Skipping ${doc._id} (isPrimary already removed)`);
      continue;
    }

    // Remove isPrimary from each membership
    const updatedMemberships = roleMemberships.map((rm: any) => {
      const { isPrimary, ...rest } = rm;
      return rest;
    });

    await collection.updateOne(
      { _id: doc._id },
      { $set: { roleMemberships: updatedMemberships } }
    );

    updatedCount++;
  }

  console.log(`  ✓ Removed isPrimary from ${updatedCount} documents`);
  return updatedCount;
}

/**
 * Validation: Check rollback results
 */
async function validateRollback(): Promise<void> {
  console.log('Validating rollback...');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  const collection = db.collection('globaladmins');

  // Check for new fields (should be gone)
  const newFieldCount = await collection.countDocuments({
    departmentMemberships: { $exists: true }
  });

  if (newFieldCount > 0) {
    console.error(`  ✗ Found ${newFieldCount} documents still using departmentMemberships`);
    throw new Error('Rollback incomplete - departmentMemberships field still exists');
  }

  // Check for old fields (should be back)
  const oldFieldCount = await collection.countDocuments({
    roleMemberships: { $exists: true }
  });

  console.log(`  Documents with roleMemberships: ${oldFieldCount}`);

  // Check for isPrimary field (should be gone)
  const withIsPrimary = await collection.countDocuments({
    'roleMemberships.isPrimary': { $exists: true }
  });

  if (withIsPrimary > 0) {
    console.error(`  ✗ Found ${withIsPrimary} documents still have isPrimary field`);
    throw new Error('Rollback incomplete - isPrimary field still exists');
  }

  // Check for assignedAt field (should be back)
  const withAssignedAt = await collection.countDocuments({
    'roleMemberships.assignedAt': { $exists: true }
  });

  console.log(`  Documents with assignedAt field: ${withAssignedAt}`);

  // Sample document check
  const sampleDoc = await collection.findOne({
    roleMemberships: { $exists: true, $ne: [] }
  });

  if (sampleDoc) {
    console.log('  Sample roleMemberships structure:');
    console.log('  ', JSON.stringify(sampleDoc.roleMemberships[0], null, 2));
  }

  console.log('  ✓ Rollback validation passed');
}

/**
 * Confirmation prompt
 */
function confirmRollback(): Promise<boolean> {
  return new Promise((resolve) => {
    console.log('⚠️  WARNING: This will revert the GlobalAdmin field migration!');
    console.log('');
    console.log('This rollback will:');
    console.log('  - Rename departmentMemberships → roleMemberships');
    console.log('  - Rename joinedAt → assignedAt');
    console.log('  - Remove isPrimary field');
    console.log('');
    console.log('Type "yes" to confirm rollback, or anything else to cancel:');

    process.stdin.once('data', (data) => {
      const answer = data.toString().trim().toLowerCase();
      resolve(answer === 'yes');
    });
  });
}

/**
 * Main rollback function
 */
async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Rollback GlobalAdmin Migration         ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log(`  ✓ Connected to ${config.mongoUri}`);
    console.log('');

    // Confirm rollback
    const confirmed = await confirmRollback();

    if (!confirmed) {
      console.log('');
      console.log('Rollback cancelled by user.');
      return;
    }

    console.log('');
    console.log('Starting rollback...');
    console.log('');

    // Run rollback steps
    await rollbackDepartmentMemberships();
    console.log('');

    await rollbackJoinedAt();
    console.log('');

    await removeIsPrimaryField();
    console.log('');

    // Validate
    await validateRollback();

    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     Rollback Complete!                   ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    console.log('Summary:');
    console.log('  ✓ departmentMemberships → roleMemberships');
    console.log('  ✓ joinedAt → assignedAt');
    console.log('  ✓ isPrimary field removed');
    console.log('');
    console.log('The GlobalAdmin model is now back to its original state.');
    console.log('');

  } catch (error) {
    console.error('Error during rollback:', error);
    console.error('');
    console.error('Rollback failed. You may need to manually inspect the database.');
    console.error('');
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Export for programmatic use
export {
  rollbackDepartmentMemberships,
  rollbackJoinedAt,
  removeIsPrimaryField,
  validateRollback
};

// Run the script if executed directly
if (require.main === module) {
  main();
}
