/**
 * Migration: Encrypt Identification Numbers (ISS-011)
 *
 * Encrypts all plaintext idNumber fields in learner identifications
 * and alienRegistrationNumber fields in demographics using AES-256-GCM.
 *
 * This migration is:
 * - Idempotent: Safe to run multiple times (skips already encrypted data)
 * - Reversible: Can decrypt if needed (with decryption script)
 * - Logged: Tracks progress and errors
 * - Dry-run capable: Test without making changes
 *
 * Usage:
 *   # Dry run (no changes)
 *   npm run migrate:encrypt-ids -- --dry-run
 *
 *   # Live run (encrypts data)
 *   npm run migrate:encrypt-ids
 *
 *   # With custom batch size
 *   npm run migrate:encrypt-ids -- --batch-size=50
 *
 * IMPORTANT:
 * - Backup your database before running
 * - Ensure ENCRYPTION_KEY is set in environment
 * - Test with --dry-run first
 * - Monitor progress and errors
 *
 * @module scripts/migrations/encrypt-identification-numbers
 */

import mongoose from 'mongoose';
import { Learner } from '@/models/auth/Learner.model';
import { Staff } from '@/models/auth/Staff.model';
import { encrypt, isEncrypted } from '@/utils/encryption/EncryptionFactory';
import { logger } from '@/utils/logger';

// =============================================================================
// CONFIGURATION
// =============================================================================

interface MigrationConfig {
  dryRun: boolean;
  batchSize: number;
  logInterval: number;
}

interface MigrationStats {
  learnersProcessed: number;
  staffProcessed: number;
  identificationsEncrypted: number;
  alienRegistrationNumbersEncrypted: number;
  alreadyEncrypted: number;
  errors: number;
  startTime: Date;
  endTime?: Date;
}

// =============================================================================
// MIGRATION LOGIC
// =============================================================================

/**
 * Encrypts identification numbers for a batch of learners
 */
async function encryptLearnerIdentifications(
  config: MigrationConfig,
  stats: MigrationStats
): Promise<void> {
  logger.info('Starting learner identifications encryption...');

  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const learners = await Learner.find({})
      .select('_id person.identifications demographics.alienRegistrationNumber')
      .limit(config.batchSize)
      .skip(skip)
      .lean();

    if (learners.length === 0) {
      hasMore = false;
      break;
    }

    for (const learner of learners) {
      try {
        let needsSave = false;

        // Encrypt identification numbers
        if (learner.identifications && learner.identifications.length > 0) {
          for (const identification of learner.identifications) {
            if (identification.idNumber && !isEncrypted(identification.idNumber)) {
              if (!config.dryRun) {
                identification.idNumber = encrypt(identification.idNumber);
              }
              stats.identificationsEncrypted++;
              needsSave = true;
            } else if (identification.idNumber && isEncrypted(identification.idNumber)) {
              stats.alreadyEncrypted++;
            }
          }
        }

        // Encrypt alien registration number
        if (learner.demographics?.alienRegistrationNumber) {
          const aNumber = learner.demographics.alienRegistrationNumber;
          if (!isEncrypted(aNumber)) {
            if (!config.dryRun) {
              learner.demographics.alienRegistrationNumber = encrypt(aNumber);
            }
            stats.alienRegistrationNumbersEncrypted++;
            needsSave = true;
          } else {
            stats.alreadyEncrypted++;
          }
        }

        // Save if modifications made
        if (needsSave && !config.dryRun) {
          await Learner.updateOne(
            { _id: learner._id },
            {
              $set: {
                identifications: learner.identifications,
                'demographics.alienRegistrationNumber': learner.demographics?.alienRegistrationNumber
              }
            }
          );
        }

        stats.learnersProcessed++;

        // Log progress
        if (stats.learnersProcessed % config.logInterval === 0) {
          logger.info(`Progress: Processed ${stats.learnersProcessed} learners, ` +
            `encrypted ${stats.identificationsEncrypted} IDs, ` +
            `encrypted ${stats.alienRegistrationNumbersEncrypted} A-numbers, ` +
            `skipped ${stats.alreadyEncrypted} already encrypted`);
        }
      } catch (error) {
        stats.errors++;
        logger.error(`Error processing learner ${learner._id}: ${error}`);
      }
    }

    skip += config.batchSize;
  }

  logger.info(`Completed learner encryption: ${stats.learnersProcessed} processed, ` +
    `${stats.identificationsEncrypted} IDs encrypted, ` +
    `${stats.alienRegistrationNumbersEncrypted} A-numbers encrypted`);
}

/**
 * Encrypts alien registration numbers for staff
 */
async function encryptStaffAlienRegistrationNumbers(
  config: MigrationConfig,
  stats: MigrationStats
): Promise<void> {
  logger.info('Starting staff alien registration numbers encryption...');

  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const staffMembers = await Staff.find({})
      .select('_id demographics.alienRegistrationNumber')
      .limit(config.batchSize)
      .skip(skip)
      .lean();

    if (staffMembers.length === 0) {
      hasMore = false;
      break;
    }

    for (const staff of staffMembers) {
      try {
        let needsSave = false;

        // Encrypt alien registration number
        if (staff.demographics?.alienRegistrationNumber) {
          const aNumber = staff.demographics.alienRegistrationNumber;
          if (!isEncrypted(aNumber)) {
            if (!config.dryRun) {
              staff.demographics.alienRegistrationNumber = encrypt(aNumber);
            }
            stats.alienRegistrationNumbersEncrypted++;
            needsSave = true;
          } else {
            stats.alreadyEncrypted++;
          }
        }

        // Save if modifications made
        if (needsSave && !config.dryRun) {
          await Staff.updateOne(
            { _id: staff._id },
            {
              $set: {
                'demographics.alienRegistrationNumber': staff.demographics?.alienRegistrationNumber
              }
            }
          );
        }

        stats.staffProcessed++;

        // Log progress
        if (stats.staffProcessed % config.logInterval === 0) {
          logger.info(`Progress: Processed ${stats.staffProcessed} staff, ` +
            `encrypted ${stats.alienRegistrationNumbersEncrypted} total A-numbers`);
        }
      } catch (error) {
        stats.errors++;
        logger.error(`Error processing staff ${staff._id}: ${error}`);
      }
    }

    skip += config.batchSize;
  }

  logger.info(`Completed staff encryption: ${stats.staffProcessed} processed`);
}

/**
 * Main migration function
 */
async function runMigration(config: MigrationConfig): Promise<MigrationStats> {
  const stats: MigrationStats = {
    learnersProcessed: 0,
    staffProcessed: 0,
    identificationsEncrypted: 0,
    alienRegistrationNumbersEncrypted: 0,
    alreadyEncrypted: 0,
    errors: 0,
    startTime: new Date()
  };

  logger.info('===============================================');
  logger.info('Encryption Migration: Identification Numbers');
  logger.info('===============================================');
  logger.info(`Mode: ${config.dryRun ? 'DRY RUN (no changes)' : 'LIVE RUN'}`);
  logger.info(`Batch Size: ${config.batchSize}`);
  logger.info(`Start Time: ${stats.startTime.toISOString()}`);
  logger.info('===============================================');

  if (config.dryRun) {
    logger.warn('DRY RUN MODE: No data will be modified');
  } else {
    logger.warn('LIVE MODE: Data will be encrypted!');
  }

  // Verify encryption key is available
  try {
    const testEncrypted = encrypt('test');
    logger.info('✓ Encryption key verified');
  } catch (error) {
    logger.error('✗ Encryption key not found or invalid');
    throw new Error('Cannot proceed without valid encryption key. Set ENCRYPTION_KEY environment variable.');
  }

  // Run migrations
  await encryptLearnerIdentifications(config, stats);
  await encryptStaffAlienRegistrationNumbers(config, stats);

  stats.endTime = new Date();

  // Log final summary
  const duration = stats.endTime.getTime() - stats.startTime.getTime();
  const durationSeconds = (duration / 1000).toFixed(2);

  logger.info('===============================================');
  logger.info('Migration Complete');
  logger.info('===============================================');
  logger.info(`Duration: ${durationSeconds} seconds`);
  logger.info(`Learners Processed: ${stats.learnersProcessed}`);
  logger.info(`Staff Processed: ${stats.staffProcessed}`);
  logger.info(`Identification Numbers Encrypted: ${stats.identificationsEncrypted}`);
  logger.info(`Alien Registration Numbers Encrypted: ${stats.alienRegistrationNumbersEncrypted}`);
  logger.info(`Already Encrypted (skipped): ${stats.alreadyEncrypted}`);
  logger.info(`Errors: ${stats.errors}`);
  logger.info('===============================================');

  if (config.dryRun) {
    logger.warn('This was a DRY RUN. No data was modified.');
    logger.info('To apply changes, run without --dry-run flag');
  }

  return stats;
}

// =============================================================================
// CLI ENTRY POINT
// =============================================================================

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
    const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 100;

    const config: MigrationConfig = {
      dryRun,
      batchSize,
      logInterval: 10
    };

    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_mock';
    logger.info(`Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    logger.info('✓ Connected to MongoDB');

    // Run migration
    const stats = await runMigration(config);

    // Disconnect
    await mongoose.disconnect();
    logger.info('✓ Disconnected from MongoDB');

    // Exit with appropriate code
    if (stats.errors > 0) {
      logger.error(`Migration completed with ${stats.errors} errors`);
      process.exit(1);
    } else {
      logger.info('Migration completed successfully');
      process.exit(0);
    }
  } catch (error) {
    logger.error('Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { runMigration, MigrationConfig, MigrationStats };
