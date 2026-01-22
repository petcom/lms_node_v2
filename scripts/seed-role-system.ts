#!/usr/bin/env ts-node
/**
 * Combined Role System Seed Script
 *
 * This script runs all role system seed scripts in the correct order:
 * 1. seed-master-department.ts - Create master department
 * 2. seed-role-definitions.ts - Seed all role definitions
 * 3. seed-access-rights.ts - Seed all access rights
 * 4. seed-admin.ts - Create default admin user
 *
 * Phase: Phase 2, Task 2.5
 * Reference: devdocs/Role_System_V2_Phased_Implementation.md
 */

import mongoose from 'mongoose';
import { seedMasterDepartment } from './seed-master-department';
import { seedRoleDefinitions } from './seed-role-definitions';
import { seedAccessRights } from './seed-access-rights';
import { seedAdmin } from './seed-admin';

// MongoDB connection URI
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_mock';

/**
 * Combined seed function that runs all seed scripts in order
 */
export async function seedRoleSystem(): Promise<void> {
  console.log('\n========================================');
  console.log('🚀 Role System V2 - Combined Seed Script');
  console.log('========================================\n');

  const startTime = Date.now();
  let isConnected = false;

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    console.log(`   URI: ${MONGO_URI}\n`);

    await mongoose.connect(MONGO_URI);
    isConnected = true;
    console.log('✅ Connected to MongoDB\n');

    // Track errors
    const errors: Array<{ step: string; error: Error }> = [];

    // Step 1: Master Department
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 1/4: Creating Master Department');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    try {
      await seedMasterDepartment();
      console.log('✅ Master department seeded successfully\n');
    } catch (error) {
      console.error('❌ Error seeding master department:', error);
      errors.push({ step: 'Master Department', error: error as Error });
    }

    // Step 2: Role Definitions
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 2/4: Seeding Role Definitions');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    try {
      await seedRoleDefinitions();
      console.log('✅ Role definitions seeded successfully\n');
    } catch (error) {
      console.error('❌ Error seeding role definitions:', error);
      errors.push({ step: 'Role Definitions', error: error as Error });
    }

    // Step 3: Access Rights
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 3/4: Seeding Access Rights');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    try {
      await seedAccessRights();
      console.log('✅ Access rights seeded successfully\n');
    } catch (error) {
      console.error('❌ Error seeding access rights:', error);
      errors.push({ step: 'Access Rights', error: error as Error });
    }

    // Step 4: Admin User
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 4/4: Creating Admin User');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    try {
      await seedAdmin();
      console.log('✅ Admin user seeded successfully\n');
    } catch (error) {
      console.error('❌ Error seeding admin user:', error);
      errors.push({ step: 'Admin User', error: error as Error });
    }

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n========================================');
    console.log('📊 Seeding Summary');
    console.log('========================================\n');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`✅ Successful steps: ${4 - errors.length}/4`);
    console.log(`❌ Failed steps: ${errors.length}/4\n`);

    if (errors.length > 0) {
      console.log('Failed Steps:');
      errors.forEach(({ step, error }) => {
        console.log(`  ❌ ${step}: ${error.message}`);
      });
      console.log('');
    }

    if (errors.length === 0) {
      console.log('🎉 All seed scripts completed successfully!');
      console.log('');
      console.log('Next Steps:');
      console.log('  1. Login with admin@system.local / Admin123!');
      console.log('  2. Escalate to admin with Escalate123!');
      console.log('  3. Change passwords on first login');
      console.log('');
    } else {
      console.log('⚠️  Some seed scripts failed. Check logs above for details.');
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Fatal error during seeding:', error);
    throw error;
  } finally {
    // Disconnect from MongoDB
    if (isConnected) {
      console.log('📡 Disconnecting from MongoDB...');
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB\n');
    }
  }
}

/**
 * Run script if called directly
 */
if (require.main === module) {
  seedRoleSystem()
    .then(() => {
      console.log('✨ Seeding complete!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Seeding failed:', error);
      process.exit(1);
    });
}
