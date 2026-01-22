/**
 * Migration: RoleDefinitions to LookupValues
 *
 * Migrates existing RoleDefinition records to the new LookupValues collection.
 * This migration is optional since we're seeding fresh data, but provides
 * a path for migrating existing role definitions if needed.
 *
 * Usage:
 *   npx ts-node src/migrations/migrate-roledefinitions.ts
 *   npm run migrate:roledefinitions
 *
 * @module migrations/migrate-roledefinitions
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { RoleDefinition } from '../models/RoleDefinition.model';
import { LookupValue } from '../models/LookupValue.model';

// Load environment variables
dotenv.config();

// Configuration
const config = {
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/lms_mock'
};

/**
 * Migrate a single role definition to lookup value
 */
async function migrateRoleDefinition(roleDef: any): Promise<void> {
  const lookupId = `role.${roleDef.name}`;

  // Check if lookup already exists
  const existing = await LookupValue.findOne({ lookupId });
  if (existing) {
    console.log(`  ⏭  Skipping ${lookupId} (already exists)`);
    return;
  }

  // Determine parent based on userType
  const parentLookupId = `userType.${roleDef.userType}`;

  // Create lookup value
  await LookupValue.create({
    lookupId,
    category: 'role',
    key: roleDef.name,
    parentLookupId,
    displayAs: roleDef.displayName || roleDef.name,
    description: roleDef.description,
    sortOrder: roleDef.sortOrder || 0,
    isActive: roleDef.isActive !== false,
    metadata: {
      isDefault: roleDef.isDefault || false
    }
  });

  console.log(`  ✓ Migrated: ${lookupId}`);
}

/**
 * Migrate all role definitions
 */
async function migrateAllRoleDefinitions(): Promise<void> {
  console.log('Migrating role definitions to lookup values...');
  console.log('');

  const roleDefs = await RoleDefinition.find({}).sort({ userType: 1, sortOrder: 1 });
  console.log(`Found ${roleDefs.length} role definitions`);
  console.log('');

  let migrated = 0;
  let skipped = 0;

  for (const roleDef of roleDefs) {
    try {
      const existing = await LookupValue.findOne({ lookupId: `role.${roleDef.name}` });
      if (existing) {
        skipped++;
      } else {
        await migrateRoleDefinition(roleDef);
        migrated++;
      }
    } catch (error) {
      console.error(`  ✗ Error migrating ${roleDef.name}:`, error);
      throw error;
    }
  }

  console.log('');
  console.log(`Migration complete: ${migrated} migrated, ${skipped} skipped`);
}

/**
 * Ensure userType lookups exist before migrating roles
 */
async function ensureUserTypesExist(): Promise<void> {
  console.log('Checking for userType lookups...');

  const userTypes = ['learner', 'staff', 'global-admin'];
  const userTypeDisplays = {
    learner: 'Learner',
    staff: 'Staff',
    'global-admin': 'System Admin'
  };

  let created = 0;
  let existing = 0;

  for (let i = 0; i < userTypes.length; i++) {
    const userType = userTypes[i];
    const lookupId = `userType.${userType}`;

    const lookup = await LookupValue.findOne({ lookupId });
    if (!lookup) {
      await LookupValue.create({
        lookupId,
        category: 'userType',
        key: userType,
        parentLookupId: null,
        displayAs: userTypeDisplays[userType as keyof typeof userTypeDisplays],
        sortOrder: i + 1,
        isActive: true,
        metadata: {
          isDefault: userType === 'learner'
        }
      });
      created++;
      console.log(`  ✓ Created userType: ${lookupId}`);
    } else {
      existing++;
    }
  }

  console.log(`UserTypes: ${created} created, ${existing} existing`);
  console.log('');
}

/**
 * Validation: Check migration results
 */
async function validateMigration(): Promise<void> {
  console.log('Validating migration...');

  const roleDefCount = await RoleDefinition.countDocuments();
  const roleLookupCount = await LookupValue.countDocuments({ category: 'role' });

  console.log(`  RoleDefinitions in database: ${roleDefCount}`);
  console.log(`  Role lookups created: ${roleLookupCount}`);

  if (roleLookupCount === 0) {
    console.warn('  ⚠  Warning: No role lookups found. Run seed:constants instead.');
  } else if (roleLookupCount < roleDefCount) {
    console.warn(`  ⚠  Warning: Fewer lookups (${roleLookupCount}) than definitions (${roleDefCount})`);
  } else {
    console.log('  ✓ Migration validation passed');
  }
}

/**
 * Main migration function
 */
async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Migrate RoleDefinitions → LookupValues  ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log(`  ✓ Connected to ${config.mongoUri}`);
    console.log('');

    // Ensure userTypes exist
    await ensureUserTypesExist();

    // Migrate role definitions
    await migrateAllRoleDefinitions();

    // Validate
    await validateMigration();

    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     Migration Complete!                  ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    console.log('Note: RoleDefinition collection is still intact.');
    console.log('You can safely keep both collections during the transition.');
    console.log('');

  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Export for programmatic use
export { migrateAllRoleDefinitions, ensureUserTypesExist, validateMigration };

// Run the script if executed directly
if (require.main === module) {
  main();
}
