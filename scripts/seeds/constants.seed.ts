/**
 * Constants Seed Script - LookupValues Collection
 *
 * Seeds the LookupValues collection with all enumerated constants:
 * - 3 UserTypes (learner, staff, global-admin)
 * - 3 Learner Roles
 * - 4 Staff Roles
 * - 5 GlobalAdmin Roles
 * Total: 15 lookup values
 *
 * This script is idempotent - safe to run multiple times.
 * It will create missing records and skip existing ones.
 *
 * Usage:
 *   npx ts-node scripts/seeds/constants.seed.ts
 *   npm run seed:constants
 *
 * Reference: contracts/api/lookup-values.contract.ts
 *
 * @module scripts/seeds/constants
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { LookupValue } from '../../src/models/LookupValue.model';

// Load environment variables
dotenv.config();

// Configuration
const config = {
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/lms_v2'
};

/**
 * Lookup values data - Source of truth for all constants
 */
const LOOKUP_VALUES = [
  // =========================================================================
  // USER TYPES (Root Level - No Parent)
  // =========================================================================
  {
    lookupId: 'userType.learner',
    category: 'userType',
    key: 'learner',
    parentLookupId: null,
    displayAs: 'Learner',
    description: 'Standard learner user with access to Learner Dashboard',
    sortOrder: 1,
    isActive: true,
    metadata: {
      isDefault: true,
      icon: 'GraduationCap',
      color: '#3B82F6'
    }
  },
  {
    lookupId: 'userType.staff',
    category: 'userType',
    key: 'staff',
    parentLookupId: null,
    displayAs: 'Staff',
    description: 'Staff user with access to Staff Dashboard',
    sortOrder: 2,
    isActive: true,
    metadata: {
      isDefault: false,
      icon: 'Users',
      color: '#10B981'
    }
  },
  {
    lookupId: 'userType.global-admin',
    category: 'userType',
    key: 'global-admin',
    parentLookupId: null,
    displayAs: 'System Admin',
    description: 'Global administrator with access to Admin Dashboard via escalation',
    sortOrder: 3,
    isActive: true,
    metadata: {
      isDefault: false,
      icon: 'Shield',
      color: '#EF4444'
    }
  },

  // =========================================================================
  // LEARNER ROLES (Children of userType.learner)
  // =========================================================================
  {
    lookupId: 'role.course-taker',
    category: 'role',
    key: 'course-taker',
    parentLookupId: 'userType.learner',
    displayAs: 'Course Taker',
    description: 'Standard learner who enrolls in and completes courses',
    sortOrder: 1,
    isActive: true,
    metadata: {
      isDefault: true,
      icon: 'BookOpen',
      color: '#3B82F6'
    }
  },
  {
    lookupId: 'role.auditor',
    category: 'role',
    key: 'auditor',
    parentLookupId: 'userType.learner',
    displayAs: 'Auditor',
    description: 'View-only access, cannot earn credit or complete exams',
    sortOrder: 2,
    isActive: true,
    metadata: {
      isDefault: false,
      icon: 'Eye',
      color: '#6B7280'
    }
  },
  {
    lookupId: 'role.learner-supervisor',
    category: 'role',
    key: 'learner-supervisor',
    parentLookupId: 'userType.learner',
    displayAs: 'Learner Supervisor',
    description: 'Elevated permissions for TAs, peer mentors',
    sortOrder: 3,
    isActive: true,
    metadata: {
      isDefault: false,
      icon: 'UserCheck',
      color: '#8B5CF6'
    }
  },

  // =========================================================================
  // STAFF ROLES (Children of userType.staff)
  // =========================================================================
  {
    lookupId: 'role.instructor',
    category: 'role',
    key: 'instructor',
    parentLookupId: 'userType.staff',
    displayAs: 'Instructor',
    description: 'Teaches classes, grades student work',
    sortOrder: 1,
    isActive: true,
    metadata: {
      isDefault: false,
      icon: 'UserGraduate',
      color: '#10B981'
    }
  },
  {
    lookupId: 'role.department-admin',
    category: 'role',
    key: 'department-admin',
    parentLookupId: 'userType.staff',
    displayAs: 'Department Admin',
    description: 'Manages department operations, staff, settings',
    sortOrder: 2,
    isActive: true,
    metadata: {
      isDefault: false,
      icon: 'Settings',
      color: '#F59E0B'
    }
  },
  {
    lookupId: 'role.content-admin',
    category: 'role',
    key: 'content-admin',
    parentLookupId: 'userType.staff',
    displayAs: 'Content Admin',
    description: 'Creates and manages courses, programs',
    sortOrder: 3,
    isActive: true,
    metadata: {
      isDefault: false,
      icon: 'FileText',
      color: '#8B5CF6'
    }
  },
  {
    lookupId: 'role.billing-admin',
    category: 'role',
    key: 'billing-admin',
    parentLookupId: 'userType.staff',
    displayAs: 'Billing Admin',
    description: 'Department-level billing operations',
    sortOrder: 4,
    isActive: true,
    metadata: {
      isDefault: false,
      icon: 'DollarSign',
      color: '#06B6D4'
    }
  },

  // =========================================================================
  // GLOBAL ADMIN ROLES (Children of userType.global-admin)
  // =========================================================================
  {
    lookupId: 'role.system-admin',
    category: 'role',
    key: 'system-admin',
    parentLookupId: 'userType.global-admin',
    displayAs: 'System Admin',
    description: 'Full system access - highest privilege',
    sortOrder: 1,
    isActive: true,
    metadata: {
      isDefault: false,
      icon: 'Shield',
      color: '#EF4444'
    }
  },
  {
    lookupId: 'role.enrollment-admin',
    category: 'role',
    key: 'enrollment-admin',
    parentLookupId: 'userType.global-admin',
    displayAs: 'Enrollment Admin',
    description: 'Manages enrollment system globally',
    sortOrder: 2,
    isActive: true,
    metadata: {
      isDefault: false,
      icon: 'UserPlus',
      color: '#F59E0B'
    }
  },
  {
    lookupId: 'role.course-admin',
    category: 'role',
    key: 'course-admin',
    parentLookupId: 'userType.global-admin',
    displayAs: 'Course Admin',
    description: 'Manages course system globally',
    sortOrder: 3,
    isActive: true,
    metadata: {
      isDefault: false,
      icon: 'BookOpen',
      color: '#8B5CF6'
    }
  },
  {
    lookupId: 'role.theme-admin',
    category: 'role',
    key: 'theme-admin',
    parentLookupId: 'userType.global-admin',
    displayAs: 'Theme Admin',
    description: 'Manages themes, branding, UI',
    sortOrder: 4,
    isActive: true,
    metadata: {
      isDefault: false,
      icon: 'Palette',
      color: '#EC4899'
    }
  },
  {
    lookupId: 'role.financial-admin',
    category: 'role',
    key: 'financial-admin',
    parentLookupId: 'userType.global-admin',
    displayAs: 'Financial Admin',
    description: 'System-wide financial operations',
    sortOrder: 5,
    isActive: true,
    metadata: {
      isDefault: false,
      icon: 'DollarSign',
      color: '#10B981'
    }
  }
];

/**
 * Seed lookup values - Idempotent
 */
async function seedLookupValues(): Promise<void> {
  console.log('Seeding lookup values...');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const lookupData of LOOKUP_VALUES) {
    try {
      // Check if lookup already exists
      const existing = await LookupValue.findOne({ lookupId: lookupData.lookupId });

      if (existing) {
        // Update if properties have changed (idempotent)
        let hasChanges = false;

        if (existing.displayAs !== lookupData.displayAs) {
          existing.displayAs = lookupData.displayAs;
          hasChanges = true;
        }

        if (existing.description !== lookupData.description) {
          existing.description = lookupData.description;
          hasChanges = true;
        }

        if (existing.sortOrder !== lookupData.sortOrder) {
          existing.sortOrder = lookupData.sortOrder;
          hasChanges = true;
        }

        if (existing.isActive !== lookupData.isActive) {
          existing.isActive = lookupData.isActive;
          hasChanges = true;
        }

        // Update metadata if changed
        if (JSON.stringify(existing.metadata) !== JSON.stringify(lookupData.metadata)) {
          existing.metadata = lookupData.metadata;
          hasChanges = true;
        }

        if (hasChanges) {
          await existing.save();
          updated++;
          console.log(`  ↻ Updated: ${lookupData.lookupId}`);
        } else {
          skipped++;
        }

        continue;
      }

      // Create new lookup
      await LookupValue.create(lookupData);
      created++;
      console.log(`  ✓ Created: ${lookupData.lookupId}`);

    } catch (error) {
      console.error(`  ✗ Error seeding ${lookupData.lookupId}:`, error);
      throw error;
    }
  }

  console.log('');
  console.log(`Lookup values seeded: ${created} created, ${updated} updated, ${skipped} skipped`);
  console.log(`Total lookup values in database: ${await LookupValue.countDocuments()}`);
}

/**
 * Validate seed data integrity
 */
async function validateSeededData(): Promise<void> {
  console.log('');
  console.log('Validating seeded data...');

  // Check counts
  const userTypeCount = await LookupValue.countDocuments({ category: 'userType' });
  const roleCount = await LookupValue.countDocuments({ category: 'role' });

  console.log(`  UserTypes: ${userTypeCount} (expected: 3)`);
  console.log(`  Roles: ${roleCount} (expected: 12)`);

  if (userTypeCount !== 3) {
    throw new Error(`Expected 3 userTypes, found ${userTypeCount}`);
  }

  if (roleCount !== 12) {
    throw new Error(`Expected 12 roles, found ${roleCount}`);
  }

  // Validate parent-child relationships
  const learnerRoles = await LookupValue.countDocuments({
    parentLookupId: 'userType.learner'
  });
  const staffRoles = await LookupValue.countDocuments({
    parentLookupId: 'userType.staff'
  });
  const globalAdminRoles = await LookupValue.countDocuments({
    parentLookupId: 'userType.global-admin'
  });

  console.log(`  Learner roles: ${learnerRoles} (expected: 3)`);
  console.log(`  Staff roles: ${staffRoles} (expected: 4)`);
  console.log(`  GlobalAdmin roles: ${globalAdminRoles} (expected: 5)`);

  if (learnerRoles !== 3) {
    throw new Error(`Expected 3 learner roles, found ${learnerRoles}`);
  }

  if (staffRoles !== 4) {
    throw new Error(`Expected 4 staff roles, found ${staffRoles}`);
  }

  if (globalAdminRoles !== 5) {
    throw new Error(`Expected 5 global-admin roles, found ${globalAdminRoles}`);
  }

  console.log('  ✓ All validations passed');
}

/**
 * Main seed function
 */
async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   LMS V2 - Seed Constants (LookupValues)║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log(`  ✓ Connected to ${config.mongoUri}`);
    console.log('');

    // Seed lookup values
    await seedLookupValues();

    // Validate seeded data
    await validateSeededData();

    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     Seed Complete!                       ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    console.log('LookupValues Summary:');
    console.log('  - 3 UserTypes (learner, staff, global-admin)');
    console.log('  - 3 Learner Roles');
    console.log('  - 4 Staff Roles');
    console.log('  - 5 GlobalAdmin Roles');
    console.log('  Total: 15 lookup values');
    console.log('');

  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Export for use in combined seed scripts
export { seedLookupValues, validateSeededData, main as seedConstants };

// Run the script if executed directly
if (require.main === module) {
  main();
}
