/**
 * Role System V2 Migration
 *
 * This migration script updates the database schema from V1 (single-role model)
 * to V2 (multi-role, department-scoped model).
 *
 * IMPORTANT: Test on staging environment before running in production!
 *
 * What this migration does:
 * 1. Updates User model: adds userTypes, defaultDashboard, lastSelectedDepartment
 * 2. Updates Staff model: adds departmentMemberships array
 * 3. Updates Learner model: adds departmentMemberships array
 * 4. Creates GlobalAdmin records for existing admin users
 * 5. Runs Phase 2 seed scripts (master department, role definitions, access rights)
 * 6. Maps legacy roles to new role system
 *
 * This migration is REVERSIBLE - see down() function.
 *
 * Usage:
 *   npm run migrate:v2-role-system       # Run migration
 *   npm run migrate:v2-role-system:down  # Rollback migration
 */

import mongoose from 'mongoose';
import { User } from '../models/auth/User.model';
import { Staff } from '../models/auth/Staff.model';
import { Learner } from '../models/auth/Learner.model';
import { GlobalAdmin } from '../models/GlobalAdmin.model';
import Department from '../models/organization/Department.model';
import { RoleDefinition } from '../models/RoleDefinition.model';
import { AccessRight } from '../models/AccessRight.model';

// Master Department constants
const MASTER_DEPARTMENT_ID = new mongoose.Types.ObjectId('000000000000000000000001');
const MASTER_DEPARTMENT_NAME = 'System Administration';

// Legacy role mapping (V1 → V2)
const LEGACY_ROLE_MAPPING: Record<string, { userTypes: string[], roles: string[] }> = {
  'student': { userTypes: ['learner'], roles: ['course-taker'] },
  'learner': { userTypes: ['learner'], roles: ['course-taker'] },
  'instructor': { userTypes: ['staff'], roles: ['instructor'] },
  'teacher': { userTypes: ['staff'], roles: ['instructor'] },
  'content-admin': { userTypes: ['staff'], roles: ['content-admin'] },
  'department-admin': { userTypes: ['staff'], roles: ['department-admin'] },
  'admin': { userTypes: ['staff', 'global-admin'], roles: ['system-admin'] },
  'super-admin': { userTypes: ['staff', 'global-admin'], roles: ['system-admin'] },
  'system-admin': { userTypes: ['staff', 'global-admin'], roles: ['system-admin'] }
};

interface MigrationStats {
  usersUpdated: number;
  staffUpdated: number;
  learnersUpdated: number;
  globalAdminsCreated: number;
  rolesSeeded: number;
  accessRightsSeeded: number;
  errors: string[];
}

/**
 * Run migration UP (V1 → V2)
 */
export async function up(): Promise<MigrationStats> {
  console.log('🚀 Starting Role System V2 Migration (UP)...\n');

  const stats: MigrationStats = {
    usersUpdated: 0,
    staffUpdated: 0,
    learnersUpdated: 0,
    globalAdminsCreated: 0,
    rolesSeeded: 0,
    accessRightsSeeded: 0,
    errors: []
  };

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // STEP 1: Create Master Department
    console.log('📁 Step 1: Creating Master Department...');
    await createMasterDepartment(session);
    console.log('✅ Master Department created\n');

    // STEP 2: Seed Role Definitions
    console.log('📋 Step 2: Seeding Role Definitions...');
    stats.rolesSeeded = await seedRoleDefinitions(session);
    console.log(`✅ Seeded ${stats.rolesSeeded} role definitions\n`);

    // STEP 3: Seed Access Rights
    console.log('🔐 Step 3: Seeding Access Rights...');
    stats.accessRightsSeeded = await seedAccessRights(session);
    console.log(`✅ Seeded ${stats.accessRightsSeeded} access rights\n`);

    // STEP 4: Migrate User records
    console.log('👤 Step 4: Migrating User records...');
    stats.usersUpdated = await migrateUsers(session);
    console.log(`✅ Updated ${stats.usersUpdated} user records\n`);

    // STEP 5: Migrate Staff records
    console.log('👔 Step 5: Migrating Staff records...');
    stats.staffUpdated = await migrateStaff(session);
    console.log(`✅ Updated ${stats.staffUpdated} staff records\n`);

    // STEP 6: Migrate Learner records
    console.log('🎓 Step 6: Migrating Learner records...');
    stats.learnersUpdated = await migrateLearners(session);
    console.log(`✅ Updated ${stats.learnersUpdated} learner records\n`);

    // STEP 7: Create GlobalAdmin records
    console.log('⚡ Step 7: Creating GlobalAdmin records...');
    stats.globalAdminsCreated = await createGlobalAdminRecords(session);
    console.log(`✅ Created ${stats.globalAdminsCreated} global admin records\n`);

    // Commit transaction
    await session.commitTransaction();

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Users updated: ${stats.usersUpdated}`);
    console.log(`   - Staff updated: ${stats.staffUpdated}`);
    console.log(`   - Learners updated: ${stats.learnersUpdated}`);
    console.log(`   - Global admins created: ${stats.globalAdminsCreated}`);
    console.log(`   - Roles seeded: ${stats.rolesSeeded}`);
    console.log(`   - Access rights seeded: ${stats.accessRightsSeeded}`);

    return stats;

  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Migration failed:', error);
    stats.errors.push(error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Rollback migration DOWN (V2 → V1)
 */
export async function down(): Promise<void> {
  console.log('⏪ Rolling back Role System V2 Migration (DOWN)...\n');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // STEP 1: Remove GlobalAdmin records
    console.log('🗑️  Step 1: Removing GlobalAdmin records...');
    const globalAdminCount = await GlobalAdmin.deleteMany({}, { session });
    console.log(`✅ Removed ${globalAdminCount.deletedCount} global admin records\n`);

    // STEP 2: Remove V2 fields from User records
    console.log('👤 Step 2: Reverting User records...');
    const userUpdate = await User.updateMany(
      {},
      {
        $unset: {
          userTypes: '',
          defaultDashboard: '',
          lastSelectedDepartment: ''
        }
      },
      { session }
    );
    console.log(`✅ Reverted ${userUpdate.modifiedCount} user records\n`);

    // STEP 3: Remove V2 fields from Staff records
    console.log('👔 Step 3: Reverting Staff records...');
    const staffUpdate = await Staff.updateMany(
      {},
      {
        $unset: {
          departmentMemberships: ''
        }
      },
      { session }
    );
    console.log(`✅ Reverted ${staffUpdate.modifiedCount} staff records\n`);

    // STEP 4: Remove V2 fields from Learner records
    console.log('🎓 Step 4: Reverting Learner records...');
    const learnerUpdate = await Learner.updateMany(
      {},
      {
        $unset: {
          departmentMemberships: ''
        }
      },
      { session }
    );
    console.log(`✅ Reverted ${learnerUpdate.modifiedCount} learner records\n`);

    // STEP 5: Remove role definitions
    console.log('📋 Step 5: Removing role definitions...');
    const roleDefCount = await RoleDefinition.deleteMany({}, { session });
    console.log(`✅ Removed ${roleDefCount.deletedCount} role definitions\n`);

    // STEP 6: Remove access rights
    console.log('🔐 Step 6: Removing access rights...');
    const accessRightCount = await AccessRight.deleteMany({}, { session });
    console.log(`✅ Removed ${accessRightCount.deletedCount} access rights\n`);

    // STEP 7: Remove master department
    console.log('📁 Step 7: Removing master department...');
    await Department.deleteOne({ _id: MASTER_DEPARTMENT_ID }, { session });
    console.log('✅ Removed master department\n');

    // Commit transaction
    await session.commitTransaction();

    console.log('✅ Rollback completed successfully!\n');

  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create master department for global admin roles
 */
async function createMasterDepartment(session: mongoose.ClientSession): Promise<void> {
  const existing = await Department.findById(MASTER_DEPARTMENT_ID).session(session);

  if (existing) {
    console.log('   ℹ️  Master department already exists');
    return;
  }

  await Department.create([{
    _id: MASTER_DEPARTMENT_ID,
    name: MASTER_DEPARTMENT_NAME,
    slug: 'master',
    description: 'System administration department for global admin roles',
    isSystem: true,
    isVisible: false,
    requireExplicitMembership: false,
    parentDepartmentId: null,
    isActive: true
  }], { session });

  console.log('   ✓ Master department created');
}

/**
 * Seed role definitions
 */
async function seedRoleDefinitions(session: mongoose.ClientSession): Promise<number> {
  const roleDefinitions = [
    // Learner Roles
    {
      name: 'course-taker',
      userType: 'learner',
      displayName: 'Course Taker',
      description: 'Standard learner who enrolls in and completes courses',
      accessRights: ['content:courses:read', 'content:lessons:read', 'enrollment:own:read', 'enrollment:own:manage', 'grades:own:read'],
      isDefault: true,
      sortOrder: 1,
      isActive: true
    },
    {
      name: 'auditor',
      userType: 'learner',
      displayName: 'Auditor',
      description: 'View-only access, cannot earn credit or complete exams',
      accessRights: ['content:courses:read', 'content:lessons:read', 'enrollment:own:read'],
      isDefault: false,
      sortOrder: 2,
      isActive: true
    },
    {
      name: 'learner-supervisor',
      userType: 'learner',
      displayName: 'Learner Supervisor',
      description: 'Elevated permissions for TAs, peer mentors',
      accessRights: ['content:courses:read', 'content:lessons:read', 'enrollment:own:read', 'enrollment:own:manage', 'grades:own:read', 'learner:peer-progress:read', 'content:discussions:moderate'],
      isDefault: false,
      sortOrder: 3,
      isActive: true
    },

    // Staff Roles
    {
      name: 'instructor',
      userType: 'staff',
      displayName: 'Instructor',
      description: 'Teaches classes, grades student work',
      accessRights: ['content:courses:read', 'content:lessons:read', 'enrollment:department:read', 'grades:own-classes:read', 'grades:own-classes:manage', 'reports:own-classes:read'],
      isDefault: false,
      sortOrder: 1,
      isActive: true
    },
    {
      name: 'content-admin',
      userType: 'staff',
      displayName: 'Content Administrator',
      description: 'Creates and manages courses, programs',
      accessRights: ['content:courses:manage', 'content:lessons:manage', 'content:programs:manage', 'content:assessments:manage', 'enrollment:department:read', 'reports:content:read'],
      isDefault: false,
      sortOrder: 2,
      isActive: true
    },
    {
      name: 'department-admin',
      userType: 'staff',
      displayName: 'Department Administrator',
      description: 'Manages department operations, staff, settings',
      accessRights: ['staff:department:read', 'staff:department:manage', 'enrollment:department:read', 'enrollment:department:manage', 'reports:department:read', 'system:department-settings:manage', 'content:*'],
      isDefault: false,
      sortOrder: 3,
      isActive: true
    },
    {
      name: 'billing-admin',
      userType: 'staff',
      displayName: 'Billing Administrator',
      description: 'Department-level billing operations',
      accessRights: ['billing:department:read', 'billing:department:manage', 'billing:payments:read', 'reports:billing:read', 'enrollment:department:read'],
      isDefault: false,
      sortOrder: 4,
      isActive: true
    },

    // Global Admin Roles
    {
      name: 'system-admin',
      userType: 'global-admin',
      displayName: 'System Administrator',
      description: 'Full system access - highest privilege',
      accessRights: [
        'system:*',
        'content:*',
        'enrollment:*',
        'staff:*',
        'billing:*',
        'audit:*',
        'reports:jobs:read',
        'reports:jobs:create',
        'reports:jobs:cancel'
      ],
      isDefault: false,
      sortOrder: 1,
      isActive: true
    },
    {
      name: 'enrollment-admin',
      userType: 'global-admin',
      displayName: 'Enrollment Administrator',
      description: 'Manages enrollment system globally',
      accessRights: ['enrollment:*', 'learner:*', 'reports:enrollment:read', 'audit:enrollment:read'],
      isDefault: false,
      sortOrder: 2,
      isActive: true
    },
    {
      name: 'course-admin',
      userType: 'global-admin',
      displayName: 'Course Administrator',
      description: 'Manages course system globally',
      accessRights: ['content:*', 'reports:content:read', 'audit:content:read'],
      isDefault: false,
      sortOrder: 3,
      isActive: true
    },
    {
      name: 'theme-admin',
      userType: 'global-admin',
      displayName: 'Theme Administrator',
      description: 'Manages themes, branding, UI',
      accessRights: ['system:themes:manage', 'system:branding:manage', 'system:ui-settings:manage', 'content:templates:manage'],
      isDefault: false,
      sortOrder: 4,
      isActive: true
    },
    {
      name: 'financial-admin',
      userType: 'global-admin',
      displayName: 'Financial Administrator',
      description: 'System-wide financial operations',
      accessRights: ['billing:*', 'reports:financial:read', 'audit:billing:read', 'system:payment-gateway:manage'],
      isDefault: false,
      sortOrder: 5,
      isActive: true
    }
  ];

  // Use insertMany with ordered: false to continue on duplicates
  try {
    const result = await RoleDefinition.insertMany(roleDefinitions, {
      session,
      ordered: false
    });
    return result.length;
  } catch (error: any) {
    // If error is due to duplicates, count successful inserts
    if (error.writeErrors) {
      const successful = roleDefinitions.length - error.writeErrors.length;
      console.log(`   ℹ️  ${error.writeErrors.length} roles already existed, ${successful} new roles created`);
      return successful;
    }
    throw error;
  }
}

/**
 * Seed access rights
 */
async function seedAccessRights(session: mongoose.ClientSession): Promise<number> {
  const accessRights = [
    // Content Domain
    { name: 'content:courses:read', domain: 'content', resource: 'courses', action: 'read', description: 'View course details and content', isSensitive: false },
    { name: 'content:courses:manage', domain: 'content', resource: 'courses', action: 'manage', description: 'Full control over courses (CRUD)', isSensitive: false },
    { name: 'content:lessons:read', domain: 'content', resource: 'lessons', action: 'read', description: 'Access lesson content', isSensitive: false },
    { name: 'content:lessons:manage', domain: 'content', resource: 'lessons', action: 'manage', description: 'Full control over lessons', isSensitive: false },
    { name: 'content:programs:manage', domain: 'content', resource: 'programs', action: 'manage', description: 'Manage programs', isSensitive: false },
    { name: 'content:assessments:manage', domain: 'content', resource: 'assessments', action: 'manage', description: 'Manage assessments', isSensitive: false },
    { name: 'content:discussions:moderate', domain: 'content', resource: 'discussions', action: 'moderate', description: 'Moderate course discussions', isSensitive: false },
    { name: 'content:templates:manage', domain: 'content', resource: 'templates', action: 'manage', description: 'Manage content templates', isSensitive: false },

    // Enrollment Domain
    { name: 'enrollment:own:read', domain: 'enrollment', resource: 'own', action: 'read', description: 'View own enrollments', isSensitive: false },
    { name: 'enrollment:own:manage', domain: 'enrollment', resource: 'own', action: 'manage', description: 'Enroll/drop courses', isSensitive: false },
    { name: 'enrollment:department:read', domain: 'enrollment', resource: 'department', action: 'read', description: 'View department enrollments', isSensitive: false },
    { name: 'enrollment:department:manage', domain: 'enrollment', resource: 'department', action: 'manage', description: 'Manage department enrollments', isSensitive: false },

    // Staff Domain
    { name: 'staff:department:read', domain: 'staff', resource: 'department', action: 'read', description: 'View department staff', isSensitive: false },
    { name: 'staff:department:manage', domain: 'staff', resource: 'department', action: 'manage', description: 'Manage staff in department', isSensitive: false },

    // Learner Domain
    { name: 'learner:peer-progress:read', domain: 'learner', resource: 'peer-progress', action: 'read', description: 'View peer learner progress', isSensitive: false },
    { name: 'learner:pii:read', domain: 'learner', resource: 'pii', action: 'read', description: 'View student PII', isSensitive: true, sensitiveCategory: 'ferpa' },
    { name: 'learner:grades:read', domain: 'learner', resource: 'grades', action: 'read', description: 'View student grades', isSensitive: true, sensitiveCategory: 'ferpa' },
    { name: 'learner:contact:read', domain: 'learner', resource: 'contact', action: 'read', description: 'View contact information', isSensitive: true, sensitiveCategory: 'pii' },

    // Grades Domain
    { name: 'grades:own:read', domain: 'grades', resource: 'own', action: 'read', description: 'View own grades', isSensitive: false },
    { name: 'grades:own-classes:read', domain: 'grades', resource: 'own-classes', action: 'read', description: 'View grades for own classes', isSensitive: false },
    { name: 'grades:own-classes:manage', domain: 'grades', resource: 'own-classes', action: 'manage', description: 'Grade student work in own classes', isSensitive: false },

    // Reports Domain
    { name: 'reports:own-classes:read', domain: 'reports', resource: 'own-classes', action: 'read', description: 'View reports for own classes', isSensitive: false },
    { name: 'reports:department:read', domain: 'reports', resource: 'department', action: 'read', description: 'View all department reports', isSensitive: false },
    { name: 'reports:content:read', domain: 'reports', resource: 'content', action: 'read', description: 'View content analytics', isSensitive: false },
    { name: 'reports:billing:read', domain: 'reports', resource: 'billing', action: 'read', description: 'View billing reports', isSensitive: true, sensitiveCategory: 'billing' },
    { name: 'reports:financial:read', domain: 'reports', resource: 'financial', action: 'read', description: 'View financial reports', isSensitive: true, sensitiveCategory: 'billing' },
    { name: 'reports:enrollment:read', domain: 'reports', resource: 'enrollment', action: 'read', description: 'View enrollment reports', isSensitive: false },
    { name: 'reports:jobs:read', domain: 'reports', resource: 'jobs', action: 'read', description: 'View report jobs', isSensitive: false },
    { name: 'reports:jobs:create', domain: 'reports', resource: 'jobs', action: 'create', description: 'Create report jobs', isSensitive: false },
    { name: 'reports:jobs:cancel', domain: 'reports', resource: 'jobs', action: 'cancel', description: 'Cancel report jobs', isSensitive: false },

    // System Domain
    { name: 'system:department-settings:manage', domain: 'system', resource: 'department-settings', action: 'manage', description: 'Manage department settings', isSensitive: false },
    { name: 'system:themes:manage', domain: 'system', resource: 'themes', action: 'manage', description: 'Manage themes', isSensitive: false },
    { name: 'system:branding:manage', domain: 'system', resource: 'branding', action: 'manage', description: 'Manage branding', isSensitive: false },
    { name: 'system:ui-settings:manage', domain: 'system', resource: 'ui-settings', action: 'manage', description: 'Manage UI settings', isSensitive: false },
    { name: 'system:payment-gateway:manage', domain: 'system', resource: 'payment-gateway', action: 'manage', description: 'Manage payment gateways', isSensitive: true, sensitiveCategory: 'billing' },

    // Billing Domain
    { name: 'billing:department:read', domain: 'billing', resource: 'department', action: 'read', description: 'View department billing', isSensitive: true, sensitiveCategory: 'billing' },
    { name: 'billing:department:manage', domain: 'billing', resource: 'department', action: 'manage', description: 'Manage department billing', isSensitive: true, sensitiveCategory: 'billing' },
    { name: 'billing:payments:read', domain: 'billing', resource: 'payments', action: 'read', description: 'View payment records', isSensitive: true, sensitiveCategory: 'billing' },
    { name: 'billing:payments:process', domain: 'billing', resource: 'payments', action: 'process', description: 'Process payments', isSensitive: true, sensitiveCategory: 'billing' },

    // Audit Domain
    { name: 'audit:enrollment:read', domain: 'audit', resource: 'enrollment', action: 'read', description: 'View enrollment audit logs', isSensitive: true, sensitiveCategory: 'audit' },
    { name: 'audit:content:read', domain: 'audit', resource: 'content', action: 'read', description: 'View content audit logs', isSensitive: true, sensitiveCategory: 'audit' },
    { name: 'audit:billing:read', domain: 'audit', resource: 'billing', action: 'read', description: 'View billing audit logs', isSensitive: true, sensitiveCategory: 'audit' },
    { name: 'audit:logs:read', domain: 'audit', resource: 'logs', action: 'read', description: 'View audit logs', isSensitive: true, sensitiveCategory: 'audit' }
  ];

  try {
    const result = await AccessRight.insertMany(accessRights, {
      session,
      ordered: false
    });
    return result.length;
  } catch (error: any) {
    if (error.writeErrors) {
      const successful = accessRights.length - error.writeErrors.length;
      console.log(`   ℹ️  ${error.writeErrors.length} access rights already existed, ${successful} new rights created`);
      return successful;
    }
    throw error;
  }
}

/**
 * Migrate User records
 */
async function migrateUsers(session: mongoose.ClientSession): Promise<number> {
  const users = await User.find({}).session(session);
  let updated = 0;

  for (const user of users) {
    // Skip if already migrated
    if (user.userTypes && user.userTypes.length > 0) {
      console.log(`   ℹ️  User ${user.email} already migrated, skipping`);
      continue;
    }

    // Determine userTypes based on legacy role or default to learner
    const legacyRole = (user as any).role || 'learner';
    const mapping = LEGACY_ROLE_MAPPING[legacyRole] || { userTypes: ['learner'], roles: ['course-taker'] };

    // Update user
    user.userTypes = mapping.userTypes as any;
    user.defaultDashboard = mapping.userTypes.length === 1 && mapping.userTypes[0] === 'learner' ? 'learner' : 'staff';

    await user.save({ session });
    updated++;
    console.log(`   ✓ Migrated user: ${user.email} → userTypes: ${mapping.userTypes.join(', ')}`);
  }

  return updated;
}

/**
 * Migrate Staff records
 */
async function migrateStaff(session: mongoose.ClientSession): Promise<number> {
  const staffRecords = await Staff.find({}).session(session);
  let updated = 0;

  for (const staff of staffRecords) {
    // Skip if already migrated
    if ((staff as any).departmentMemberships && (staff as any).departmentMemberships.length > 0) {
      console.log(`   ℹ️  Staff ${staff._id} already migrated, skipping`);
      continue;
    }

    // Get legacy department and role
    const legacyDepartmentId = (staff as any).departmentId;
    const legacyRole = (staff as any).role || 'instructor';
    const mapping = LEGACY_ROLE_MAPPING[legacyRole] || { userTypes: ['staff'], roles: ['instructor'] };

    // Create department membership
    const departmentMemberships = [];

    if (legacyDepartmentId) {
      departmentMemberships.push({
        departmentId: legacyDepartmentId,
        roles: mapping.roles,
        isPrimary: true,
        joinedAt: staff.createdAt || new Date(),
        isActive: true
      });
    }

    // Update staff record
    (staff as any).departmentMemberships = departmentMemberships;
    await staff.save({ session });
    updated++;
    console.log(`   ✓ Migrated staff: ${staff._id} → roles: ${mapping.roles.join(', ')}`);
  }

  return updated;
}

/**
 * Migrate Learner records
 */
async function migrateLearners(session: mongoose.ClientSession): Promise<number> {
  const learnerRecords = await Learner.find({}).session(session);
  let updated = 0;

  for (const learner of learnerRecords) {
    // Skip if already migrated
    if ((learner as any).departmentMemberships && (learner as any).departmentMemberships.length > 0) {
      console.log(`   ℹ️  Learner ${learner._id} already migrated, skipping`);
      continue;
    }

    // Get legacy department
    const legacyDepartmentId = (learner as any).departmentId;

    // Create department membership
    const departmentMemberships = [];

    if (legacyDepartmentId) {
      departmentMemberships.push({
        departmentId: legacyDepartmentId,
        roles: ['course-taker'],
        isPrimary: true,
        joinedAt: learner.createdAt || new Date(),
        isActive: true
      });
    }

    // Update learner record
    (learner as any).departmentMemberships = departmentMemberships;
    await learner.save({ session });
    updated++;
    console.log(`   ✓ Migrated learner: ${learner._id}`);
  }

  return updated;
}

/**
 * Create GlobalAdmin records for users with global-admin userType
 */
async function createGlobalAdminRecords(session: mongoose.ClientSession): Promise<number> {
  const adminUsers = await User.find({
    userTypes: 'global-admin'
  }).session(session);

  let created = 0;

  for (const user of adminUsers) {
    // Check if GlobalAdmin record already exists
    const existing = await GlobalAdmin.findOne({ userId: user._id }).session(session);

    if (existing) {
      console.log(`   ℹ️  GlobalAdmin record for ${user.email} already exists, skipping`);
      continue;
    }

    // Determine admin roles based on legacy role
    const legacyRole = (user as any).role || 'system-admin';
    const mapping = LEGACY_ROLE_MAPPING[legacyRole];
    const adminRoles = mapping?.roles || ['system-admin'];

    // Create GlobalAdmin record
    await GlobalAdmin.create([{
      userId: user._id,
      departmentMemberships: [{
        departmentId: MASTER_DEPARTMENT_ID,
        roles: adminRoles,
        isPrimary: true,
        joinedAt: user.createdAt || new Date(),
        isActive: true
      }],
      escalationPassword: null, // User must set on first escalation
      lastEscalation: null,
      isActive: true
    }], { session });

    created++;
    console.log(`   ✓ Created GlobalAdmin record for: ${user.email} → roles: ${adminRoles.join(', ')}`);
  }

  return created;
}

// ============================================================================
// CLI RUNNER
// ============================================================================

/**
 * Run migration from command line
 */
if (require.main === module) {
  const command = process.argv[2];

  // Connect to database
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';

  mongoose.connect(MONGODB_URI)
    .then(async () => {
      console.log('✅ Connected to MongoDB\n');

      if (command === 'down') {
        await down();
      } else {
        await up();
      }

      console.log('\n🎉 Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export default { up, down };
