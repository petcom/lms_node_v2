/**
 * Seed Master Department Script
 *
 * Creates the master department (System Administration) required for GlobalAdmin roles.
 * This is a standalone script that can be run independently of the full seed-admin script.
 *
 * Purpose:
 * - Create the master department with fixed ID: 000000000000000000000001
 * - Set proper system flags (isSystem, isVisible, etc.)
 * - Ensure idempotent behavior (can be run multiple times safely)
 *
 * Reference: devdocs/Role_System_API_Model_Plan_V2.md Section 4.6
 * Implementation: Phase 2, Task 2.3
 *
 * Usage:
 *   npx ts-node scripts/seed-master-department.ts
 *   npm run seed:master-department
 *
 * Environment variables:
 *   MONGO_URI - MongoDB connection string (default: mongodb://localhost:27017/lms_mock)
 *
 * @module scripts/seed-master-department
 */

import mongoose from 'mongoose';
import { loadEnv } from './utils/load-env';

// Load environment variables
loadEnv();

// Import Department model and constants
import Department from '../src/models/organization/Department.model';
import { MASTER_DEPARTMENT_ID, MASTER_DEPARTMENT_NAME } from '../src/models/auth/role-constants';

// Configuration
const config = {
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/lms_mock'
};

/**
 * Create or update the master department
 * This function is idempotent - it can be run multiple times safely
 */
async function seedMasterDepartment(): Promise<void> {
  console.log('Seeding master department...');
  console.log(`  Target ID: ${MASTER_DEPARTMENT_ID.toString()}`);
  console.log(`  Name: ${MASTER_DEPARTMENT_NAME}`);
  console.log('');

  try {
    // Check if master department already exists
    const existing = await Department.findById(MASTER_DEPARTMENT_ID);

    if (existing) {
      console.log('✓ Master department already exists');
      console.log(`  Current name: ${existing.name}`);
      console.log(`  Current code: ${existing.code}`);
      console.log(`  isSystem: ${existing.isSystem}`);
      console.log(`  isVisible: ${existing.isVisible}`);
      console.log(`  isActive: ${existing.isActive}`);
      console.log('');

      // Update if any properties don't match expected values
      let needsUpdate = false;
      const updates: any = {};

      if (existing.name !== MASTER_DEPARTMENT_NAME) {
        updates.name = MASTER_DEPARTMENT_NAME;
        needsUpdate = true;
      }

      if (existing.code !== 'MASTER') {
        updates.code = 'MASTER';
        needsUpdate = true;
      }

      if (existing.isSystem !== true) {
        updates.isSystem = true;
        needsUpdate = true;
      }

      if (existing.isVisible !== false) {
        updates.isVisible = false;
        needsUpdate = true;
      }

      if (existing.requireExplicitMembership !== false) {
        updates.requireExplicitMembership = false;
        needsUpdate = true;
      }

      if (existing.parentDepartmentId !== null && existing.parentDepartmentId !== undefined) {
        updates.parentDepartmentId = null;
        needsUpdate = true;
      }

      if (existing.isActive !== true) {
        updates.isActive = true;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await Department.findByIdAndUpdate(MASTER_DEPARTMENT_ID, updates);
        console.log('✓ Master department updated with correct properties');
        console.log('  Updated fields:', Object.keys(updates).join(', '));
      } else {
        console.log('✓ Master department properties are correct - no updates needed');
      }

      return;
    }

    // Create new master department
    console.log('Creating new master department...');

    const masterDepartment = await Department.create({
      _id: MASTER_DEPARTMENT_ID,
      name: MASTER_DEPARTMENT_NAME,
      code: 'MASTER',
      description: 'System administration department for global admin roles. This department cannot be deleted and is hidden from normal department lists.',
      parentDepartmentId: null,
      level: 0,
      path: [MASTER_DEPARTMENT_ID],
      isSystem: true,              // Cannot be deleted
      isVisible: false,             // Hidden from normal lists
      requireExplicitMembership: false, // Roles cascade to child departments
      isActive: true,
      metadata: {
        purpose: 'global-admin-roles',
        createdBy: 'seed-master-department-script',
        version: '1.0'
      }
    });

    console.log('✓ Master department created successfully!');
    console.log('');
    console.log('Department details:');
    console.log(`  ID: ${masterDepartment._id}`);
    console.log(`  Name: ${masterDepartment.name}`);
    console.log(`  Code: ${masterDepartment.code}`);
    console.log(`  Level: ${masterDepartment.level}`);
    console.log(`  isSystem: ${masterDepartment.isSystem}`);
    console.log(`  isVisible: ${masterDepartment.isVisible}`);
    console.log(`  requireExplicitMembership: ${masterDepartment.requireExplicitMembership}`);
    console.log(`  isActive: ${masterDepartment.isActive}`);

  } catch (error: any) {
    if (error.code === 11000) {
      // Duplicate key error - might be on the 'code' field
      console.error('');
      console.error('✗ Error: Duplicate key detected');
      console.error('  A department with code "MASTER" already exists.');
      console.error('  This might indicate a conflict. Please check your database.');
      throw error;
    }

    console.error('');
    console.error('✗ Error creating master department:', error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   LMS V2 - Seed Master Department Script            ║');
  console.log('║   Phase 2, Task 2.3                                  ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    console.log(`  URI: ${config.mongoUri}`);

    await mongoose.connect(config.mongoUri);

    console.log('✓ Connected successfully');
    console.log('');

    // Seed the master department
    await seedMasterDepartment();

    // Success summary
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║   Seed Complete!                                     ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run seed-admin.ts to create admin users');
    console.log('  2. Verify master department in database:');
    console.log(`     db.departments.findOne({_id: ObjectId("${MASTER_DEPARTMENT_ID.toString()}")})`);
    console.log('');

  } catch (error: any) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════════╗');
    console.error('║   Seed Failed                                        ║');
    console.error('╚══════════════════════════════════════════════════════╝');
    console.error('');
    console.error('Error:', error.message);

    if (error.stack) {
      console.error('');
      console.error('Stack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the script if executed directly
if (require.main === module) {
  main();
}

// Export for potential use in other scripts
export { seedMasterDepartment };
