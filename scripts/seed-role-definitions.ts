/**
 * Seed Role Definitions Script
 *
 * Seeds all role definitions to the RoleDefinition collection.
 * This script is idempotent and can be run multiple times safely using upsert.
 *
 * Seeds:
 * - Learner roles: course-taker, auditor, learner-supervisor
 * - Staff roles: instructor, department-admin, content-admin, billing-admin
 * - GlobalAdmin roles: system-admin, enrollment-admin, course-admin, theme-admin, financial-admin
 *
 * Each role includes:
 * - Display name and description
 * - Access rights from Section 5.2 of Role_System_API_Model_Plan_V2.md
 * - Default flag (course-taker is default for learners)
 * - Sort order for UI display
 *
 * Usage:
 *   npx ts-node scripts/seed-role-definitions.ts
 *   npm run seed:roles
 *
 * Reference: devdocs/Role_System_API_Model_Plan_V2.md Section 4.7 and 5.2
 *
 * @module scripts/seed-role-definitions
 */

import mongoose from 'mongoose';

// Import models
import { RoleDefinition, LEARNER_ROLES, STAFF_ROLES, GLOBAL_ADMIN_ROLES } from '../src/models/RoleDefinition.model';

// Configuration
const config = {
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_v2_dev'
};

/**
 * Role definitions with access rights from Section 5.2
 * Based on Role_System_API_Model_Plan_V2.md
 */
const ROLE_DEFINITIONS = [
  // ============================================
  // LEARNER ROLES
  // ============================================
  {
    name: 'course-taker',
    userType: 'learner',
    displayName: 'Course Taker',
    description: 'Standard learner who enrolls in and completes courses',
    accessRights: [
      'content:courses:read',
      'content:lessons:read',
      'content:exams:attempt',
      'enrollment:own:read',
      'enrollment:own:update',
      'learner:profile:read',
      'learner:profile:update',
      'learner:progress:read',
      'learner:certificates:read',
      'learner:certificates:download'
    ],
    isDefault: true,  // Default role for new learner memberships
    sortOrder: 1
  },
  {
    name: 'auditor',
    userType: 'learner',
    displayName: 'Auditor',
    description: 'View-only access, cannot earn credit or complete exams',
    accessRights: [
      'content:courses:read',
      'content:lessons:read',
      'learner:profile:read'
    ],
    isDefault: false,
    sortOrder: 2
  },
  {
    name: 'learner-supervisor',
    userType: 'learner',
    displayName: 'Learner Supervisor',
    description: 'Elevated permissions for TAs, peer mentors, and learning assistants',
    accessRights: [
      'content:courses:read',
      'content:lessons:read',
      'content:exams:attempt',
      'enrollment:own:read',
      'enrollment:department:read',
      'learner:profile:read',
      'learner:department:read',
      'reports:department-progress:read'
    ],
    isDefault: false,
    sortOrder: 3
  },

  // ============================================
  // STAFF ROLES
  // ============================================
  {
    name: 'instructor',
    userType: 'staff',
    displayName: 'Instructor',
    description: 'Teaches classes, grades student work, and manages course delivery',
    accessRights: [
      'content:courses:read',
      'content:lessons:read',
      'content:classes:read',
      'content:classes:manage-own',
      'enrollment:department:read',
      'learner:department:read',
      'reports:class:read',
      'reports:class:export',
      'grades:department:read',
      'grades:own-classes:manage'
    ],
    isDefault: false,
    sortOrder: 1
  },
  {
    name: 'content-admin',
    userType: 'staff',
    displayName: 'Content Administrator',
    description: 'Creates and manages courses, programs, and educational content',
    accessRights: [
      'content:courses:manage',
      'content:programs:manage',
      'content:lessons:manage',
      'content:exams:manage',
      'content:scorm:manage',
      'reports:content:read',
      'analytics:courses:read',
      'analytics:courses:export'
    ],
    isDefault: false,
    sortOrder: 2
  },
  {
    name: 'department-admin',
    userType: 'staff',
    displayName: 'Department Administrator',
    description: 'Manages department operations, staff, learners, and settings',
    accessRights: [
      'content:courses:read',
      'content:classes:manage',
      'staff:department:manage',
      'learner:department:manage',
      'enrollment:department:manage',
      'reports:department:read',
      'reports:department:export',
      'settings:department:manage',
      'analytics:courses:read',
      'analytics:courses:export'
    ],
    isDefault: false,
    sortOrder: 3
  },
  {
    name: 'billing-admin',
    userType: 'staff',
    displayName: 'Billing Administrator',
    description: 'Department-level billing and financial operations',
    accessRights: [
      'billing:department:read',
      'billing:department:manage',
      'billing:invoices:manage',
      'billing:payments:read',
      'reports:billing-department:read'
    ],
    isDefault: false,
    sortOrder: 4
  },

  // ============================================
  // GLOBAL ADMIN ROLES
  // ============================================
  {
    name: 'system-admin',
    userType: 'global-admin',
    displayName: 'System Administrator',
    description: 'Full system access - highest privilege level with complete control',
    accessRights: [
      'system:*',      // Wildcard - grants all permissions
      'content:*',
      'enrollment:*',
      'staff:*',
      'learner:*',
      'reports:*',
      'billing:*',
      'audit:*'
    ],
    isDefault: false,
    sortOrder: 1
  },
  {
    name: 'enrollment-admin',
    userType: 'global-admin',
    displayName: 'Enrollment Administrator',
    description: 'Manages enrollment system, policies, and bulk operations globally',
    accessRights: [
      'enrollment:system:manage',
      'enrollment:bulk:manage',
      'enrollment:policies:manage',
      'reports:enrollment:read'
    ],
    isDefault: false,
    sortOrder: 2
  },
  {
    name: 'course-admin',
    userType: 'global-admin',
    displayName: 'Course Administrator',
    description: 'Manages course system, templates, and categories globally',
    accessRights: [
      'content:system:manage',
      'content:templates:manage',
      'content:categories:manage',
      'reports:content-system:read'
    ],
    isDefault: false,
    sortOrder: 3
  },
  {
    name: 'theme-admin',
    userType: 'global-admin',
    displayName: 'Theme Administrator',
    description: 'Manages themes, branding, UI customization, and email templates',
    accessRights: [
      'system:themes:manage',
      'system:branding:manage',
      'system:emails:manage'
    ],
    isDefault: false,
    sortOrder: 4
  },
  {
    name: 'financial-admin',
    userType: 'global-admin',
    displayName: 'Financial Administrator',
    description: 'System-wide financial operations, billing policies, and financial reporting',
    accessRights: [
      'billing:system:manage',
      'billing:policies:manage',
      'billing:reports:read',
      'billing:refunds:manage',
      'reports:financial:read',
      'reports:financial:export'
    ],
    isDefault: false,
    sortOrder: 5
  }
];

/**
 * Validate that role definitions match expected constants
 */
function validateRoleDefinitions(): void {
  console.log('Validating role definitions...');

  const definedRoles = ROLE_DEFINITIONS.map(r => r.name);
  const expectedRoles: string[] = [...LEARNER_ROLES, ...STAFF_ROLES, ...GLOBAL_ADMIN_ROLES];

  // Check for missing roles
  const missingRoles = expectedRoles.filter(r => !definedRoles.includes(r));
  if (missingRoles.length > 0) {
    throw new Error(`Missing role definitions: ${missingRoles.join(', ')}`);
  }

  // Check for extra roles
  const extraRoles = definedRoles.filter(r => !(expectedRoles as string[]).includes(r));
  if (extraRoles.length > 0) {
    throw new Error(`Unexpected role definitions: ${extraRoles.join(', ')}`);
  }

  // Check for duplicate roles
  const duplicates = definedRoles.filter((r, i) => definedRoles.indexOf(r) !== i);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate role definitions: ${duplicates.join(', ')}`);
  }

  console.log('  ✓ All role definitions are valid');
  console.log(`  ✓ Total roles: ${definedRoles.length}`);
  console.log(`    - Learner roles: ${LEARNER_ROLES.length}`);
  console.log(`    - Staff roles: ${STAFF_ROLES.length}`);
  console.log(`    - GlobalAdmin roles: ${GLOBAL_ADMIN_ROLES.length}`);
}

/**
 * Seed role definitions using upsert for idempotency
 */
async function seedRoleDefinitions(): Promise<void> {
  console.log('Seeding role definitions...');
  console.log('');

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  for (const roleDef of ROLE_DEFINITIONS) {
    try {
      // Check if role exists
      const existing = await RoleDefinition.findOne({ name: roleDef.name });

      if (existing) {
        // Check if update is needed
        const needsUpdate = (
          existing.displayName !== roleDef.displayName ||
          existing.description !== roleDef.description ||
          existing.userType !== roleDef.userType ||
          existing.isDefault !== roleDef.isDefault ||
          existing.sortOrder !== roleDef.sortOrder ||
          JSON.stringify(existing.accessRights.sort()) !== JSON.stringify(roleDef.accessRights.sort())
        );

        if (needsUpdate) {
          // Update existing role
          await RoleDefinition.updateOne(
            { name: roleDef.name },
            {
              $set: {
                displayName: roleDef.displayName,
                description: roleDef.description,
                userType: roleDef.userType,
                accessRights: roleDef.accessRights,
                isDefault: roleDef.isDefault,
                sortOrder: roleDef.sortOrder,
                isActive: true,
                updatedAt: new Date()
              }
            }
          );
          console.log(`  ↻ Updated: ${roleDef.name} (${roleDef.displayName})`);
          updated++;
        } else {
          console.log(`  ✓ Unchanged: ${roleDef.name} (${roleDef.displayName})`);
          unchanged++;
        }
      } else {
        // Create new role
        await RoleDefinition.create({
          ...roleDef,
          isActive: true
        });
        console.log(`  + Created: ${roleDef.name} (${roleDef.displayName})`);
        created++;
      }
    } catch (error) {
      console.error(`  ✗ Error processing ${roleDef.name}:`, error instanceof Error ? error.message : error);
      errors++;
    }
  }

  console.log('');
  console.log('Summary:');
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Unchanged: ${unchanged}`);
  if (errors > 0) {
    console.log(`  Errors: ${errors}`);
  }
}

/**
 * Display role statistics
 */
async function displayStatistics(): Promise<void> {
  console.log('');
  console.log('Role Statistics:');

  const totalRoles = await RoleDefinition.countDocuments({ isActive: true });
  const learnerRoles = await RoleDefinition.countDocuments({ userType: 'learner', isActive: true });
  const staffRoles = await RoleDefinition.countDocuments({ userType: 'staff', isActive: true });
  const adminRoles = await RoleDefinition.countDocuments({ userType: 'global-admin', isActive: true });
  const defaultRoles = await RoleDefinition.countDocuments({ isDefault: true, isActive: true });

  console.log(`  Total active roles: ${totalRoles}`);
  console.log(`  Learner roles: ${learnerRoles}`);
  console.log(`  Staff roles: ${staffRoles}`);
  console.log(`  GlobalAdmin roles: ${adminRoles}`);
  console.log(`  Default roles: ${defaultRoles}`);

  // Display access rights statistics
  console.log('');
  console.log('Access Rights Coverage:');

  const allRoles = await RoleDefinition.find({ isActive: true });
  const allAccessRights = new Set<string>();
  const accessRightsByDomain: Record<string, Set<string>> = {};

  for (const role of allRoles) {
    for (const right of role.accessRights) {
      allAccessRights.add(right);

      // Extract domain (first part before colon)
      const domain = right.split(':')[0];
      if (!accessRightsByDomain[domain]) {
        accessRightsByDomain[domain] = new Set();
      }
      accessRightsByDomain[domain].add(right);
    }
  }

  console.log(`  Total unique access rights: ${allAccessRights.size}`);
  console.log('  By domain:');

  const sortedDomains = Object.keys(accessRightsByDomain).sort();
  for (const domain of sortedDomains) {
    console.log(`    - ${domain}: ${accessRightsByDomain[domain].size} rights`);
  }
}

/**
 * Main seed function
 */
async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   LMS V2 - Seed Role Definitions Script         ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log('Reference: devdocs/Role_System_API_Model_Plan_V2.md');
  console.log('           Section 4.7 (RoleDefinition Model)');
  console.log('           Section 5.2 (Access Rights by Role)');
  console.log('');

  try {
    // Validate role definitions before connecting to DB
    validateRoleDefinitions();
    console.log('');

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log(`  ✓ Connected to ${config.mongoUri}`);
    console.log('');

    // Seed role definitions
    await seedRoleDefinitions();

    // Display statistics
    await displayStatistics();

    // Success message
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   Seed Complete!                                 ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
    console.log('All role definitions have been seeded successfully.');
    console.log('The RoleDefinition collection is ready for use.');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════╗');
    console.error('║   Error During Seeding                           ║');
    console.error('╚══════════════════════════════════════════════════╝');
    console.error('');

    if (error instanceof Error) {
      console.error('Error:', error.message);
      if (error.stack) {
        console.error('');
        console.error('Stack trace:');
        console.error(error.stack);
      }
    } else {
      console.error('Unknown error:', error);
    }

    console.error('');
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
main();
