/**
 * Run Seeds - Master Seed Runner
 *
 * Orchestrates execution of all seed scripts in the correct order.
 * Provides options to run specific seeds or all seeds.
 *
 * Usage:
 *   npx ts-node scripts/seeds/run-seeds.ts
 *   npx ts-node scripts/seeds/run-seeds.ts --constants-only
 *   npm run seed:all
 *
 * @module scripts/seeds/run-seeds
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedConstants } from './constants.seed';
import { seedAdmin } from '../seed-admin';

// Load environment variables
dotenv.config();

// Configuration
const config = {
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/lms_v2'
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    constantsOnly: args.includes('--constants-only'),
    adminOnly: args.includes('--admin-only'),
    skipAdmin: args.includes('--skip-admin'),
    skipConstants: args.includes('--skip-constants')
  };
}

/**
 * Main seed orchestration
 */
async function main(): Promise<void> {
  const options = parseArgs();

  console.log('╔══════════════════════════════════════════╗');
  console.log('║   LMS V2 - Master Seed Runner            ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log(`  ✓ Connected to ${config.mongoUri}`);
    console.log('');

    // Determine which seeds to run
    const seedSequence: Array<{
      name: string;
      fn: () => Promise<void>;
      skip?: boolean;
    }> = [];

    // Add constants seed
    if (!options.skipConstants && !options.adminOnly) {
      seedSequence.push({
        name: 'Constants (LookupValues)',
        fn: async () => {
          // Disconnect temporarily as seedConstants manages its own connection
          await mongoose.disconnect();
          await seedConstants();
          // Reconnect for next seeds
          await mongoose.connect(config.mongoUri);
        },
        skip: options.skipConstants
      });
    }

    // Add admin seed
    if (!options.skipAdmin && !options.constantsOnly) {
      seedSequence.push({
        name: 'Admin User & Master Department',
        fn: async () => {
          // Disconnect temporarily as seedAdmin manages its own connection
          await mongoose.disconnect();
          await seedAdmin();
          // Reconnect if there are more seeds
          await mongoose.connect(config.mongoUri);
        },
        skip: options.skipAdmin
      });
    }

    // Run seeds in sequence
    console.log('Running seeds in sequence...');
    console.log('');

    for (const seed of seedSequence) {
      if (seed.skip) {
        console.log(`⏭  Skipping: ${seed.name}`);
        continue;
      }

      console.log(`▶ Running: ${seed.name}`);
      console.log('═'.repeat(50));
      await seed.fn();
      console.log('═'.repeat(50));
      console.log('');
    }

    console.log('╔══════════════════════════════════════════╗');
    console.log('║     All Seeds Complete!                  ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    console.log('Summary:');
    console.log(`  - Seeds executed: ${seedSequence.filter(s => !s.skip).length}`);
    console.log(`  - Seeds skipped: ${seedSequence.filter(s => s.skip).length}`);
    console.log('');

  } catch (error) {
    console.error('Error during seed execution:', error);
    process.exit(1);
  } finally {
    // Ensure disconnection
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Export for programmatic use
export { main as runAllSeeds };

// Run the script if executed directly
if (require.main === module) {
  main();
}
