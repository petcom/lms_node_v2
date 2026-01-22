/**
 * Seed Admin Script - V2 Role System
 *
 * Creates the initial admin user and master department on installation.
 * This script is idempotent and can be run multiple times safely.
 *
 * Creates/Updates:
 * 1. Master Department (System Administration) - ID: 000000000000000000000001
 * 2. Default admin user (admin@system.local) with ALL userTypes
 * 3. User record with userTypes: ['learner', 'staff', 'global-admin']
 * 4. GlobalAdmin record with system-admin role in master department
 * 5. Staff record for the admin user
 * 6. Learner record for the admin user (for testing)
 * 7. Role definitions (learner, staff, global-admin roles)
 * 8. Access rights (GNAP-compatible permission strings)
 *
 * Usage:
 *   npx ts-node scripts/seed-admin.ts
 *   npm run seed:admin
 *
 * Environment variables:
 *   ADMIN_EMAIL - Admin email (default: admin@system.local)
 *   ADMIN_PASSWORD - Admin login password (default: Admin123!)
 *   ADMIN_ESCALATION_PASSWORD - Admin escalation password (default: Escalate123!)
 *   MONGO_URI - MongoDB connection string (default: mongodb://localhost:27017/lms_mock)
 *
 * Security Notes:
 * - Escalation password is hashed using bcrypt (salt rounds: 12)
 * - Change default passwords in production immediately
 * - Escalation password should be changed on first admin login
 *
 * Reference: devdocs/Role_System_API_Model_Plan_V2.md Section 4.5, 9 (Phase 2, Task 2.4)
 *
 * @module scripts/seed-admin
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

// Import models
import { User } from '../src/models/auth/User.model';
import { Staff } from '../src/models/auth/Staff.model';
import { Learner } from '../src/models/auth/Learner.model';
import Department from '../src/models/organization/Department.model';
import { GlobalAdmin, MASTER_DEPARTMENT_ID, MASTER_DEPARTMENT_NAME } from '../src/models/GlobalAdmin.model';
import { RoleDefinition } from '../src/models/RoleDefinition.model';
import { AccessRight } from '../src/models/AccessRight.model';

// Configuration
const config = {
  adminEmail: process.env.ADMIN_EMAIL || 'admin@lms.edu',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin123!',
  adminEscalationPassword: process.env.ADMIN_ESCALATION_PASSWORD || 'Escalate123!',
  adminFirstName: 'System',
  adminLastName: 'Administrator',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/lms_mock'
};

/**
 * Create the master department
 */
async function createMasterDepartment(): Promise<void> {
  console.log('Creating master department...');

  const existing = await Department.findById(MASTER_DEPARTMENT_ID);
  if (existing) {
    console.log('  ✓ Master department already exists');

    // Update properties if needed (idempotent)
    let updated = false;
    if (!existing.isSystem) {
      existing.isSystem = true;
      updated = true;
    }
    if (existing.isVisible !== false) {
      existing.isVisible = false;
      updated = true;
    }
    if (!existing.isActive) {
      existing.isActive = true;
      updated = true;
    }
    if (existing.requireExplicitMembership) {
      existing.requireExplicitMembership = false;
      updated = true;
    }

    if (updated) {
      await existing.save();
      console.log('  ✓ Master department updated');
    }

    return;
  }

  await Department.create({
    _id: MASTER_DEPARTMENT_ID,
    name: MASTER_DEPARTMENT_NAME,
    code: 'MASTER',
    description:
      'System administration department for global admin roles. This department cannot be deleted.',
    isSystem: true,
    isVisible: false,
    requireExplicitMembership: false,
    parentDepartmentId: null,
    level: 0,
    path: [MASTER_DEPARTMENT_ID],
    isActive: true
  });

  console.log('  ✓ Master department created');
}

/**
 * Create the default admin user
 */
async function createAdminUser(): Promise<mongoose.Types.ObjectId> {
  console.log('Creating admin user...');

  // Check if admin already exists
  let existing = await User.findOne({ email: config.adminEmail });
  if (existing) {
    console.log('  ✓ Admin user already exists');

    // Update userTypes if needed (make idempotent)
    const hasAllTypes =
      existing.userTypes.includes('learner') &&
      existing.userTypes.includes('staff') &&
      existing.userTypes.includes('global-admin');

    if (!hasAllTypes) {
      existing.userTypes = ['learner', 'staff', 'global-admin'];
      existing.defaultDashboard = 'staff';
      await existing.save();
      console.log('  ✓ Admin user types updated');
    }

    return existing._id;
  }

  // Hash password
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(config.adminPassword, salt);

  // Create user with all userTypes
  const user = await User.create({
    email: config.adminEmail,
    password: hashedPassword,
    userTypes: ['learner', 'staff', 'global-admin'],
    defaultDashboard: 'staff',
    isActive: true
  });

  console.log(`  ✓ Admin user created: ${config.adminEmail}`);
  return user._id;
}

/**
 * Create Staff record for admin
 */
async function createAdminStaff(userId: mongoose.Types.ObjectId): Promise<void> {
  console.log('Creating admin staff record...');

  const existing = await Staff.findById(userId);
  if (existing) {
    console.log('  ✓ Admin staff record already exists');

    // Update if needed (idempotent)
    let updated = false;
    if (existing.firstName !== config.adminFirstName) {
      existing.firstName = config.adminFirstName;
      updated = true;
    }
    if (existing.lastName !== config.adminLastName) {
      existing.lastName = config.adminLastName;
      updated = true;
    }
    if (existing.title !== 'System Administrator') {
      existing.title = 'System Administrator';
      updated = true;
    }
    if (!existing.isActive) {
      existing.isActive = true;
      updated = true;
    }
    
    // Ensure Master Department membership exists
    const hasMasterDept = existing.departmentMemberships.some(
      (m: any) => m.departmentId.equals(MASTER_DEPARTMENT_ID)
    );
    if (!hasMasterDept) {
      existing.departmentMemberships.push({
        departmentId: MASTER_DEPARTMENT_ID,
        roles: ['instructor', 'department-admin', 'content-admin', 'billing-admin'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      });
      updated = true;
      console.log('  ✓ Added Master Department membership');
    }

    if (updated) {
      await existing.save();
      console.log('  ✓ Admin staff record updated');
    }

    return;
  }

  await Staff.create({
    _id: userId,
    firstName: config.adminFirstName,
    lastName: config.adminLastName,
    title: 'System Administrator',
    departmentMemberships: [{
      departmentId: MASTER_DEPARTMENT_ID,
      roles: ['instructor', 'department-admin', 'content-admin', 'billing-admin'],
      isPrimary: true,
      isActive: true,
      joinedAt: new Date()
    }],
    isActive: true
  });

  console.log('  ✓ Admin staff record created with Master Department membership');
}

/**
 * Create Learner record for admin (for testing purposes)
 */
async function createAdminLearner(userId: mongoose.Types.ObjectId): Promise<void> {
  console.log('Creating admin learner record...');

  const existing = await Learner.findById(userId);
  if (existing) {
    console.log('  ✓ Admin learner record already exists');

    // Update if needed (idempotent)
    let updated = false;
    if (existing.firstName !== config.adminFirstName) {
      existing.firstName = config.adminFirstName;
      updated = true;
    }
    if (existing.lastName !== config.adminLastName) {
      existing.lastName = config.adminLastName;
      updated = true;
    }
    if (!existing.isActive) {
      existing.isActive = true;
      updated = true;
    }

    if (updated) {
      await existing.save();
      console.log('  ✓ Admin learner record updated');
    }

    return;
  }

  await Learner.create({
    _id: userId,
    firstName: config.adminFirstName,
    lastName: config.adminLastName,
    departmentMemberships: [], // No learner enrollments
    isActive: true
  });

  console.log('  ✓ Admin learner record created');
}

/**
 * Create GlobalAdmin record
 */
async function createGlobalAdmin(userId: mongoose.Types.ObjectId): Promise<void> {
  console.log('Creating GlobalAdmin record...');

  const existing = await GlobalAdmin.findById(userId).select('+escalationPassword');
  if (existing) {
    console.log('  ✓ GlobalAdmin record already exists');

    // Update if needed (idempotent)
    let updated = false;

    // Check if system-admin role exists
    const hasSystemAdmin = existing.roleMemberships.some(
      m => m.isActive && m.roles.includes('system-admin')
    );

    if (!hasSystemAdmin) {
      // Add or update role membership
      const masterMembership = existing.roleMemberships.find(
        m => m.departmentId.equals(MASTER_DEPARTMENT_ID)
      );

      if (masterMembership) {
        if (!masterMembership.roles.includes('system-admin')) {
          masterMembership.roles.push('system-admin');
          masterMembership.isActive = true;
          updated = true;
        }
      } else {
        existing.roleMemberships.push({
          departmentId: MASTER_DEPARTMENT_ID,
          roles: ['system-admin'],
          assignedAt: new Date(),
          isActive: true
        });
        updated = true;
      }
    }

    if (!existing.isActive) {
      existing.isActive = true;
      updated = true;
    }

    if (updated) {
      await existing.save();
      console.log('  ✓ GlobalAdmin record updated');
    }

    return;
  }

  // Hash escalation password (pre-save hook will handle this, but we pass plaintext)
  await GlobalAdmin.create({
    _id: userId,
    escalationPassword: config.adminEscalationPassword,
    roleMemberships: [
      {
        departmentId: MASTER_DEPARTMENT_ID,
        roles: ['system-admin'], // Full system access
        assignedAt: new Date(),
        isActive: true
      }
    ],
    sessionTimeout: 15,
    isActive: true
  });

  console.log('  ✓ GlobalAdmin record created with system-admin role');
  console.log('  ⚠️  Escalation password should be changed on first login');
}

/**
 * Seed role definitions
 */
async function seedRoleDefinitions(): Promise<void> {
  console.log('Seeding role definitions...');
  
  const roleData = [
    // Learner roles
    {
      name: 'course-taker',
      userType: 'learner',
      displayName: 'Course Taker',
      description: 'Standard learner who can enroll in and complete courses',
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
      isDefault: true,
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
      description: 'Elevated permissions for TAs and peer mentors',
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
    
    // Staff roles
    {
      name: 'instructor',
      userType: 'staff',
      displayName: 'Instructor',
      description: 'Teaches classes and grades student work',
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
      description: 'Creates and manages courses and content',
      accessRights: [
        'content:courses:manage',
        'content:programs:manage',
        'content:lessons:manage',
        'content:exams:manage',
        'content:scorm:manage',
        'reports:content:read'
      ],
      isDefault: false,
      sortOrder: 2
    },
    {
      name: 'department-admin',
      userType: 'staff',
      displayName: 'Department Administrator',
      description: 'Manages department operations, staff, and settings',
      accessRights: [
        'content:courses:read',
        'content:classes:manage',
        'staff:department:manage',
        'learner:department:manage',
        'enrollment:department:manage',
        'reports:department:read',
        'reports:department:export',
        'settings:department:manage'
      ],
      isDefault: false,
      sortOrder: 3
    },
    {
      name: 'billing-admin',
      userType: 'staff',
      displayName: 'Billing Administrator',
      description: 'Department-level billing operations',
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
    
    // GlobalAdmin roles
    {
      name: 'system-admin',
      userType: 'global-admin',
      displayName: 'System Administrator',
      description: 'Full system access - highest privilege level',
      accessRights: ['system:*'],
      isDefault: false,
      sortOrder: 1
    },
    {
      name: 'enrollment-admin',
      userType: 'global-admin',
      displayName: 'Enrollment Administrator',
      description: 'Manages enrollment system globally',
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
      description: 'Manages course system globally',
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
      description: 'Manages themes, branding, and UI',
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
      description: 'System-wide financial operations',
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
  
  let created = 0;
  let skipped = 0;
  
  for (const role of roleData) {
    const existing = await RoleDefinition.findOne({ name: role.name });
    if (existing) {
      skipped++;
      continue;
    }
    
    await RoleDefinition.create({ ...role, isActive: true });
    created++;
  }
  
  console.log(`  ✓ Role definitions seeded: ${created} created, ${skipped} skipped`);
}

/**
 * Seed access rights
 */
async function seedAccessRights(): Promise<void> {
  console.log('Seeding access rights...');
  
  const accessRightData = [
    // Content domain
    { domain: 'content', resource: 'courses', action: 'read', description: 'View courses' },
    { domain: 'content', resource: 'courses', action: 'create', description: 'Create courses' },
    { domain: 'content', resource: 'courses', action: 'update', description: 'Update courses' },
    { domain: 'content', resource: 'courses', action: 'delete', description: 'Delete courses' },
    { domain: 'content', resource: 'courses', action: 'manage', description: 'Full course management' },
    { domain: 'content', resource: 'lessons', action: 'read', description: 'View lessons' },
    { domain: 'content', resource: 'lessons', action: 'manage', description: 'Manage lessons' },
    { domain: 'content', resource: 'exams', action: 'attempt', description: 'Attempt exams' },
    { domain: 'content', resource: 'exams', action: 'manage', description: 'Manage exams' },
    { domain: 'content', resource: 'programs', action: 'manage', description: 'Manage programs' },
    { domain: 'content', resource: 'scorm', action: 'manage', description: 'Manage SCORM content' },
    { domain: 'content', resource: 'classes', action: 'read', description: 'View classes' },
    { domain: 'content', resource: 'classes', action: 'manage', description: 'Manage classes' },
    { domain: 'content', resource: 'classes', action: 'manage-own', description: 'Manage own classes' },
    
    // Enrollment domain
    { domain: 'enrollment', resource: 'own', action: 'read', description: 'View own enrollments' },
    { domain: 'enrollment', resource: 'own', action: 'update', description: 'Update own enrollments' },
    { domain: 'enrollment', resource: 'department', action: 'read', description: 'View department enrollments' },
    { domain: 'enrollment', resource: 'department', action: 'manage', description: 'Manage department enrollments' },
    { domain: 'enrollment', resource: 'system', action: 'manage', description: 'Manage all enrollments' },
    { domain: 'enrollment', resource: 'bulk', action: 'manage', description: 'Bulk enrollment operations' },
    { domain: 'enrollment', resource: 'policies', action: 'manage', description: 'Manage enrollment policies' },
    
    // Staff domain
    { domain: 'staff', resource: 'department', action: 'manage', description: 'Manage department staff' },
    
    // Learner domain
    { domain: 'learner', resource: 'profile', action: 'read', description: 'View learner profile' },
    { domain: 'learner', resource: 'profile', action: 'update', description: 'Update learner profile' },
    { domain: 'learner', resource: 'department', action: 'read', description: 'View department learners' },
    { domain: 'learner', resource: 'department', action: 'manage', description: 'Manage department learners' },
    { domain: 'learner', resource: 'progress', action: 'read', description: 'View own progress' },
    { domain: 'learner', resource: 'certificates', action: 'read', description: 'View certificates' },
    { domain: 'learner', resource: 'certificates', action: 'download', description: 'Download certificates' },
    
    // Grades domain
    { domain: 'grades', resource: 'department', action: 'read', description: 'View department grades' },
    { domain: 'grades', resource: 'own-classes', action: 'manage', description: 'Manage grades for own classes' },
    
    // Reports domain
    { domain: 'reports', resource: 'class', action: 'read', description: 'View class reports' },
    { domain: 'reports', resource: 'class', action: 'export', description: 'Export class reports' },
    { domain: 'reports', resource: 'department', action: 'read', description: 'View department reports' },
    { domain: 'reports', resource: 'department', action: 'export', description: 'Export department reports' },
    { domain: 'reports', resource: 'department-progress', action: 'read', description: 'View department progress' },
    { domain: 'reports', resource: 'content', action: 'read', description: 'View content reports' },
    { domain: 'reports', resource: 'billing-department', action: 'read', description: 'View department billing reports', isSensitive: true, sensitiveCategory: 'billing' },
    { domain: 'reports', resource: 'enrollment', action: 'read', description: 'View enrollment reports' },
    { domain: 'reports', resource: 'content-system', action: 'read', description: 'View system content reports' },
    { domain: 'reports', resource: 'financial', action: 'read', description: 'View financial reports', isSensitive: true, sensitiveCategory: 'billing' },
    { domain: 'reports', resource: 'financial', action: 'export', description: 'Export financial reports', isSensitive: true, sensitiveCategory: 'billing' },
    
    // Settings domain
    { domain: 'settings', resource: 'department', action: 'manage', description: 'Manage department settings' },
    
    // System domain
    { domain: 'system', resource: 'themes', action: 'manage', description: 'Manage themes' },
    { domain: 'system', resource: 'branding', action: 'manage', description: 'Manage branding' },
    { domain: 'system', resource: 'emails', action: 'manage', description: 'Manage email templates' },
    
    // Billing domain
    { domain: 'billing', resource: 'department', action: 'read', description: 'View department billing', isSensitive: true, sensitiveCategory: 'billing' },
    { domain: 'billing', resource: 'department', action: 'manage', description: 'Manage department billing', isSensitive: true, sensitiveCategory: 'billing' },
    { domain: 'billing', resource: 'invoices', action: 'manage', description: 'Manage invoices', isSensitive: true, sensitiveCategory: 'billing' },
    { domain: 'billing', resource: 'payments', action: 'read', description: 'View payments', isSensitive: true, sensitiveCategory: 'billing' },
    { domain: 'billing', resource: 'system', action: 'manage', description: 'Manage billing system', isSensitive: true, sensitiveCategory: 'billing' },
    { domain: 'billing', resource: 'policies', action: 'manage', description: 'Manage billing policies', isSensitive: true, sensitiveCategory: 'billing' },
    { domain: 'billing', resource: 'reports', action: 'read', description: 'View billing reports', isSensitive: true, sensitiveCategory: 'billing' },
    { domain: 'billing', resource: 'refunds', action: 'manage', description: 'Manage refunds', isSensitive: true, sensitiveCategory: 'billing' },
    
    // Content system (for global admins)
    { domain: 'content', resource: 'system', action: 'manage', description: 'Manage content system' },
    { domain: 'content', resource: 'templates', action: 'manage', description: 'Manage content templates' },
    { domain: 'content', resource: 'categories', action: 'manage', description: 'Manage content categories' }
  ];
  
  let created = 0;
  let skipped = 0;
  
  for (const right of accessRightData) {
    const name = `${right.domain}:${right.resource}:${right.action}`;
    const existing = await AccessRight.findOne({ name });
    if (existing) {
      skipped++;
      continue;
    }
    
    await AccessRight.create({
      name,
      domain: right.domain,
      resource: right.resource,
      action: right.action,
      description: right.description,
      isSensitive: right.isSensitive || false,
      sensitiveCategory: right.sensitiveCategory,
      isActive: true
    });
    created++;
  }
  
  // Add wildcard right for system-admin
  const wildcardExists = await AccessRight.findOne({ name: 'system:*' });
  if (!wildcardExists) {
    await AccessRight.create({
      name: 'system:*',
      domain: 'system',
      resource: '*',
      action: '*',
      description: 'Full system access (wildcard)',
      isSensitive: true,
      sensitiveCategory: 'audit',
      isActive: true
    });
    created++;
  }
  
  console.log(`  ✓ Access rights seeded: ${created} created, ${skipped} skipped`);
}

/**
 * Main seed function
 */
async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     LMS V2 - Seed Admin Script           ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  let userId: mongoose.Types.ObjectId | null = null;

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log(`  ✓ Connected to ${config.mongoUri}`);
    console.log('');

    // Create master department
    try {
      await createMasterDepartment();
    } catch (error) {
      console.error('  ✗ Failed to create master department:', error);
      throw error;
    }
    console.log('');

    // Create admin user
    try {
      userId = await createAdminUser();
    } catch (error) {
      console.error('  ✗ Failed to create admin user:', error);
      throw error;
    }
    console.log('');

    // Create Staff record
    try {
      await createAdminStaff(userId);
    } catch (error) {
      console.error('  ✗ Failed to create admin staff record:', error);
      throw error;
    }
    console.log('');

    // Create Learner record
    try {
      await createAdminLearner(userId);
    } catch (error) {
      console.error('  ✗ Failed to create admin learner record:', error);
      throw error;
    }
    console.log('');

    // Create GlobalAdmin record
    try {
      await createGlobalAdmin(userId);
    } catch (error) {
      console.error('  ✗ Failed to create GlobalAdmin record:', error);
      throw error;
    }
    console.log('');

    // Seed role definitions
    try {
      await seedRoleDefinitions();
    } catch (error) {
      console.error('  ✗ Failed to seed role definitions:', error);
      throw error;
    }
    console.log('');

    // Seed access rights
    try {
      await seedAccessRights();
    } catch (error) {
      console.error('  ✗ Failed to seed access rights:', error);
      throw error;
    }
    console.log('');
    
    // Summary
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     Seed Complete!                       ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    console.log('Admin Credentials:');
    console.log(`  Email: ${config.adminEmail}`);
    console.log(`  Login Password: ${config.adminPassword}`);
    console.log(`  Escalation Password: ${config.adminEscalationPassword}`);
    console.log('');
    console.log('User Types: learner, staff, global-admin');
    console.log('Default Dashboard: Staff Dashboard');
    console.log('Admin Dashboard: Requires escalation password');
    console.log('');
    console.log('⚠️  IMPORTANT: Change these passwords in production!');
    console.log('⚠️  Escalation password should be changed on first admin login');
    console.log('');
    
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Export functions for use in combined seed scripts
export {
  createMasterDepartment,
  createAdminUser,
  createAdminStaff,
  createAdminLearner,
  createGlobalAdmin,
  seedRoleDefinitions,
  seedAccessRights,
  main as seedAdmin
};

// Run the script if executed directly
if (require.main === module) {
  main();
}
