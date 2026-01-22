/**
 * Seed Access Rights Script
 *
 * Creates comprehensive access rights in the AccessRight collection.
 * This script is idempotent - it uses upsert to avoid duplicates.
 *
 * Access rights follow the pattern: {domain}:{resource}:{action}
 *
 * Domains:
 * - content: Courses, programs, lessons, SCORM
 * - enrollment: Enrollments, class enrollments
 * - staff: Staff management
 * - learner: Learner management
 * - reports: Analytics and reporting
 * - system: System settings and configuration
 * - billing: Financial operations
 * - audit: Audit logs
 * - grades: Grade management
 *
 * Features:
 * - Comprehensive access rights from spec sections 5.2 and 5.3
 * - Sensitive rights marked appropriately (FERPA, billing, PII, audit)
 * - Helper function to generate rights from role definitions
 * - Idempotent (uses upsert)
 * - Proper error handling and logging
 *
 * Usage:
 *   npx ts-node scripts/seed-access-rights.ts
 *   npm run seed:access-rights
 *
 * @module scripts/seed-access-rights
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import { AccessRight, AccessRightDomain } from '../src/models/AccessRight.model';
import { RoleDefinition } from '../src/models/RoleDefinition.model';

// Database connection
const DB_URI = process.env.DB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_mock';

/**
 * Access right definition interface
 */
interface AccessRightDefinition {
  domain: AccessRightDomain;
  resource: string;
  action: string;
  description: string;
  isSensitive?: boolean;
  sensitiveCategory?: 'ferpa' | 'billing' | 'pii' | 'audit';
}

/**
 * Comprehensive access rights organized by domain
 */
const ACCESS_RIGHTS: AccessRightDefinition[] = [
  // ========================================
  // CONTENT DOMAIN
  // ========================================
  {
    domain: 'content',
    resource: 'courses',
    action: 'read',
    description: 'View courses and course details'
  },
  {
    domain: 'content',
    resource: 'courses',
    action: 'create',
    description: 'Create new courses'
  },
  {
    domain: 'content',
    resource: 'courses',
    action: 'update',
    description: 'Update existing courses'
  },
  {
    domain: 'content',
    resource: 'courses',
    action: 'delete',
    description: 'Delete courses'
  },
  {
    domain: 'content',
    resource: 'courses',
    action: 'manage',
    description: 'Full course management (CRUD)'
  },
  {
    domain: 'content',
    resource: 'courses',
    action: 'publish',
    description: 'Publish courses'
  },
  {
    domain: 'content',
    resource: 'courses',
    action: 'archive',
    description: 'Archive courses'
  },
  {
    domain: 'content',
    resource: 'lessons',
    action: 'read',
    description: 'View lessons and lesson content'
  },
  {
    domain: 'content',
    resource: 'lessons',
    action: 'create',
    description: 'Create new lessons'
  },
  {
    domain: 'content',
    resource: 'lessons',
    action: 'update',
    description: 'Update existing lessons'
  },
  {
    domain: 'content',
    resource: 'lessons',
    action: 'delete',
    description: 'Delete lessons'
  },
  {
    domain: 'content',
    resource: 'lessons',
    action: 'manage',
    description: 'Full lesson management (CRUD)'
  },
  {
    domain: 'content',
    resource: 'exams',
    action: 'read',
    description: 'View exams and exam content'
  },
  {
    domain: 'content',
    resource: 'exams',
    action: 'attempt',
    description: 'Attempt exams as a learner'
  },
  {
    domain: 'content',
    resource: 'exams',
    action: 'create',
    description: 'Create new exams'
  },
  {
    domain: 'content',
    resource: 'exams',
    action: 'update',
    description: 'Update existing exams'
  },
  {
    domain: 'content',
    resource: 'exams',
    action: 'delete',
    description: 'Delete exams'
  },
  {
    domain: 'content',
    resource: 'exams',
    action: 'manage',
    description: 'Full exam management (CRUD)'
  },
  {
    domain: 'content',
    resource: 'programs',
    action: 'read',
    description: 'View programs'
  },
  {
    domain: 'content',
    resource: 'programs',
    action: 'create',
    description: 'Create new programs'
  },
  {
    domain: 'content',
    resource: 'programs',
    action: 'update',
    description: 'Update existing programs'
  },
  {
    domain: 'content',
    resource: 'programs',
    action: 'delete',
    description: 'Delete programs'
  },
  {
    domain: 'content',
    resource: 'programs',
    action: 'manage',
    description: 'Full program management (CRUD)'
  },
  {
    domain: 'content',
    resource: 'scorm',
    action: 'read',
    description: 'View SCORM content'
  },
  {
    domain: 'content',
    resource: 'scorm',
    action: 'upload',
    description: 'Upload SCORM packages'
  },
  {
    domain: 'content',
    resource: 'scorm',
    action: 'manage',
    description: 'Full SCORM content management'
  },
  {
    domain: 'content',
    resource: 'classes',
    action: 'read',
    description: 'View classes'
  },
  {
    domain: 'content',
    resource: 'classes',
    action: 'create',
    description: 'Create new classes'
  },
  {
    domain: 'content',
    resource: 'classes',
    action: 'update',
    description: 'Update existing classes'
  },
  {
    domain: 'content',
    resource: 'classes',
    action: 'delete',
    description: 'Delete classes'
  },
  {
    domain: 'content',
    resource: 'classes',
    action: 'manage',
    description: 'Full class management (CRUD)'
  },
  {
    domain: 'content',
    resource: 'classes',
    action: 'manage-own',
    description: 'Manage only classes assigned to user (instructor)'
  },
  {
    domain: 'content',
    resource: 'system',
    action: 'manage',
    description: 'Manage content system settings'
  },
  {
    domain: 'content',
    resource: 'templates',
    action: 'read',
    description: 'View content templates'
  },
  {
    domain: 'content',
    resource: 'templates',
    action: 'manage',
    description: 'Manage content templates'
  },
  {
    domain: 'content',
    resource: 'categories',
    action: 'read',
    description: 'View content categories'
  },
  {
    domain: 'content',
    resource: 'categories',
    action: 'manage',
    description: 'Manage content categories'
  },

  // ========================================
  // ENROLLMENT DOMAIN
  // ========================================
  {
    domain: 'enrollment',
    resource: 'own',
    action: 'read',
    description: 'View own enrollments'
  },
  {
    domain: 'enrollment',
    resource: 'own',
    action: 'create',
    description: 'Create own enrollments (self-enroll)'
  },
  {
    domain: 'enrollment',
    resource: 'own',
    action: 'update',
    description: 'Update own enrollments (withdraw, etc.)'
  },
  {
    domain: 'enrollment',
    resource: 'department',
    action: 'read',
    description: 'View department enrollments'
  },
  {
    domain: 'enrollment',
    resource: 'department',
    action: 'create',
    description: 'Create enrollments for department learners'
  },
  {
    domain: 'enrollment',
    resource: 'department',
    action: 'update',
    description: 'Update department enrollments'
  },
  {
    domain: 'enrollment',
    resource: 'department',
    action: 'delete',
    description: 'Delete department enrollments'
  },
  {
    domain: 'enrollment',
    resource: 'department',
    action: 'manage',
    description: 'Full department enrollment management'
  },
  {
    domain: 'enrollment',
    resource: 'system',
    action: 'read',
    description: 'View all system enrollments'
  },
  {
    domain: 'enrollment',
    resource: 'system',
    action: 'manage',
    description: 'Manage all system enrollments (global admin)'
  },
  {
    domain: 'enrollment',
    resource: 'bulk',
    action: 'create',
    description: 'Bulk enrollment operations'
  },
  {
    domain: 'enrollment',
    resource: 'bulk',
    action: 'manage',
    description: 'Full bulk enrollment management'
  },
  {
    domain: 'enrollment',
    resource: 'policies',
    action: 'read',
    description: 'View enrollment policies'
  },
  {
    domain: 'enrollment',
    resource: 'policies',
    action: 'manage',
    description: 'Manage enrollment policies'
  },
  {
    domain: 'enrollment',
    resource: 'class',
    action: 'read',
    description: 'View class enrollments'
  },
  {
    domain: 'enrollment',
    resource: 'class',
    action: 'manage',
    description: 'Manage class enrollments'
  },

  // ========================================
  // STAFF DOMAIN
  // ========================================
  {
    domain: 'staff',
    resource: 'profile',
    action: 'read',
    description: 'View staff profiles'
  },
  {
    domain: 'staff',
    resource: 'profile',
    action: 'update',
    description: 'Update own staff profile'
  },
  {
    domain: 'staff',
    resource: 'department',
    action: 'read',
    description: 'View department staff'
  },
  {
    domain: 'staff',
    resource: 'department',
    action: 'create',
    description: 'Add staff to department'
  },
  {
    domain: 'staff',
    resource: 'department',
    action: 'update',
    description: 'Update department staff'
  },
  {
    domain: 'staff',
    resource: 'department',
    action: 'delete',
    description: 'Remove staff from department'
  },
  {
    domain: 'staff',
    resource: 'department',
    action: 'manage',
    description: 'Full department staff management'
  },
  {
    domain: 'staff',
    resource: 'roles',
    action: 'read',
    description: 'View staff roles'
  },
  {
    domain: 'staff',
    resource: 'roles',
    action: 'assign',
    description: 'Assign roles to staff'
  },
  {
    domain: 'staff',
    resource: 'system',
    action: 'manage',
    description: 'Manage all staff system-wide'
  },

  // ========================================
  // LEARNER DOMAIN
  // ========================================
  {
    domain: 'learner',
    resource: 'profile',
    action: 'read',
    description: 'View own learner profile'
  },
  {
    domain: 'learner',
    resource: 'profile',
    action: 'update',
    description: 'Update own learner profile'
  },
  {
    domain: 'learner',
    resource: 'department',
    action: 'read',
    description: 'View department learners'
  },
  {
    domain: 'learner',
    resource: 'department',
    action: 'create',
    description: 'Add learners to department'
  },
  {
    domain: 'learner',
    resource: 'department',
    action: 'update',
    description: 'Update department learners'
  },
  {
    domain: 'learner',
    resource: 'department',
    action: 'delete',
    description: 'Remove learners from department'
  },
  {
    domain: 'learner',
    resource: 'department',
    action: 'manage',
    description: 'Full department learner management'
  },
  {
    domain: 'learner',
    resource: 'progress',
    action: 'read',
    description: 'View own learning progress'
  },
  {
    domain: 'learner',
    resource: 'progress',
    action: 'update',
    description: 'Update own learning progress'
  },
  {
    domain: 'learner',
    resource: 'certificates',
    action: 'read',
    description: 'View own certificates'
  },
  {
    domain: 'learner',
    resource: 'certificates',
    action: 'download',
    description: 'Download own certificates'
  },
  {
    domain: 'learner',
    resource: 'certificates',
    action: 'issue',
    description: 'Issue certificates to learners'
  },
  {
    domain: 'learner',
    resource: 'pii',
    action: 'read',
    description: 'View personally identifiable information',
    isSensitive: true,
    sensitiveCategory: 'pii'
  },
  {
    domain: 'learner',
    resource: 'grades',
    action: 'read',
    description: 'View learner grades (FERPA protected)',
    isSensitive: true,
    sensitiveCategory: 'ferpa'
  },
  {
    domain: 'learner',
    resource: 'transcripts',
    action: 'read',
    description: 'View learner transcripts (FERPA protected)',
    isSensitive: true,
    sensitiveCategory: 'ferpa'
  },
  {
    domain: 'learner',
    resource: 'transcripts',
    action: 'export',
    description: 'Export learner transcripts (FERPA protected)',
    isSensitive: true,
    sensitiveCategory: 'ferpa'
  },
  {
    domain: 'learner',
    resource: 'contact',
    action: 'read',
    description: 'View learner contact information (PII)',
    isSensitive: true,
    sensitiveCategory: 'pii'
  },
  {
    domain: 'learner',
    resource: 'emergency',
    action: 'read',
    description: 'View learner emergency contact information (PII)',
    isSensitive: true,
    sensitiveCategory: 'pii'
  },
  {
    domain: 'learner',
    resource: 'system',
    action: 'manage',
    description: 'Manage all learners system-wide'
  },

  // ========================================
  // GRADES DOMAIN
  // ========================================
  {
    domain: 'grades',
    resource: 'own',
    action: 'read',
    description: 'View own grades'
  },
  {
    domain: 'grades',
    resource: 'department',
    action: 'read',
    description: 'View department grades',
    isSensitive: true,
    sensitiveCategory: 'ferpa'
  },
  {
    domain: 'grades',
    resource: 'department',
    action: 'manage',
    description: 'Manage department grades',
    isSensitive: true,
    sensitiveCategory: 'ferpa'
  },
  {
    domain: 'grades',
    resource: 'own-classes',
    action: 'read',
    description: 'View grades for own classes',
    isSensitive: true,
    sensitiveCategory: 'ferpa'
  },
  {
    domain: 'grades',
    resource: 'own-classes',
    action: 'manage',
    description: 'Manage grades for own classes (instructor)',
    isSensitive: true,
    sensitiveCategory: 'ferpa'
  },
  {
    domain: 'grades',
    resource: 'system',
    action: 'read',
    description: 'View all grades system-wide',
    isSensitive: true,
    sensitiveCategory: 'ferpa'
  },
  {
    domain: 'grades',
    resource: 'system',
    action: 'manage',
    description: 'Manage all grades system-wide',
    isSensitive: true,
    sensitiveCategory: 'ferpa'
  },

  // ========================================
  // REPORTS DOMAIN
  // ========================================
  {
    domain: 'reports',
    resource: 'own',
    action: 'read',
    description: 'View own reports and analytics'
  },
  {
    domain: 'reports',
    resource: 'class',
    action: 'read',
    description: 'View class reports'
  },
  {
    domain: 'reports',
    resource: 'class',
    action: 'export',
    description: 'Export class reports'
  },
  {
    domain: 'reports',
    resource: 'department',
    action: 'read',
    description: 'View department reports'
  },
  {
    domain: 'reports',
    resource: 'department',
    action: 'export',
    description: 'Export department reports'
  },
  {
    domain: 'reports',
    resource: 'department-progress',
    action: 'read',
    description: 'View department progress reports'
  },
  {
    domain: 'reports',
    resource: 'content',
    action: 'read',
    description: 'View content usage reports'
  },
  {
    domain: 'reports',
    resource: 'content',
    action: 'export',
    description: 'Export content reports'
  },
  {
    domain: 'reports',
    resource: 'content-system',
    action: 'read',
    description: 'View system-wide content reports'
  },
  {
    domain: 'reports',
    resource: 'enrollment',
    action: 'read',
    description: 'View enrollment reports'
  },
  {
    domain: 'reports',
    resource: 'enrollment',
    action: 'export',
    description: 'Export enrollment reports'
  },
  {
    domain: 'reports',
    resource: 'learner-detail',
    action: 'read',
    description: 'View detailed learner reports (FERPA protected)',
    isSensitive: true,
    sensitiveCategory: 'ferpa'
  },
  {
    domain: 'reports',
    resource: 'billing-department',
    action: 'read',
    description: 'View department billing reports',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'reports',
    resource: 'billing-department',
    action: 'export',
    description: 'Export department billing reports',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'reports',
    resource: 'financial',
    action: 'read',
    description: 'View financial reports',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'reports',
    resource: 'financial',
    action: 'export',
    description: 'Export financial reports',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'reports',
    resource: 'pii',
    action: 'export',
    description: 'Export reports containing PII',
    isSensitive: true,
    sensitiveCategory: 'pii'
  },
  {
    domain: 'reports',
    resource: 'system',
    action: 'read',
    description: 'View system-wide reports'
  },
  {
    domain: 'reports',
    resource: 'analytics',
    action: 'read',
    description: 'View analytics dashboards'
  },

  // ========================================
  // SYSTEM DOMAIN
  // ========================================
  {
    domain: 'system',
    resource: 'settings',
    action: 'read',
    description: 'View system settings'
  },
  {
    domain: 'system',
    resource: 'settings',
    action: 'manage',
    description: 'Manage system settings'
  },
  {
    domain: 'system',
    resource: 'themes',
    action: 'read',
    description: 'View themes'
  },
  {
    domain: 'system',
    resource: 'themes',
    action: 'manage',
    description: 'Manage themes and appearance'
  },
  {
    domain: 'system',
    resource: 'branding',
    action: 'read',
    description: 'View branding settings'
  },
  {
    domain: 'system',
    resource: 'branding',
    action: 'manage',
    description: 'Manage branding and logos'
  },
  {
    domain: 'system',
    resource: 'emails',
    action: 'read',
    description: 'View email templates'
  },
  {
    domain: 'system',
    resource: 'emails',
    action: 'manage',
    description: 'Manage email templates'
  },
  {
    domain: 'system',
    resource: 'integrations',
    action: 'read',
    description: 'View system integrations'
  },
  {
    domain: 'system',
    resource: 'integrations',
    action: 'manage',
    description: 'Manage system integrations'
  },
  {
    domain: 'system',
    resource: 'notifications',
    action: 'manage',
    description: 'Manage notification settings'
  },

  // ========================================
  // BILLING DOMAIN
  // ========================================
  {
    domain: 'billing',
    resource: 'own',
    action: 'read',
    description: 'View own billing information',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'billing',
    resource: 'department',
    action: 'read',
    description: 'View department billing',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'billing',
    resource: 'department',
    action: 'manage',
    description: 'Manage department billing',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'billing',
    resource: 'invoices',
    action: 'read',
    description: 'View invoices',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'billing',
    resource: 'invoices',
    action: 'create',
    description: 'Create invoices',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'billing',
    resource: 'invoices',
    action: 'manage',
    description: 'Full invoice management',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'billing',
    resource: 'payments',
    action: 'read',
    description: 'View payment information',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'billing',
    resource: 'payments',
    action: 'process',
    description: 'Process payments',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'billing',
    resource: 'payments',
    action: 'manage',
    description: 'Full payment management',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'billing',
    resource: 'refunds',
    action: 'read',
    description: 'View refund information',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'billing',
    resource: 'refunds',
    action: 'process',
    description: 'Process refunds',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'billing',
    resource: 'refunds',
    action: 'manage',
    description: 'Full refund management',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'billing',
    resource: 'system',
    action: 'read',
    description: 'View billing system settings',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'billing',
    resource: 'system',
    action: 'manage',
    description: 'Manage billing system',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'billing',
    resource: 'policies',
    action: 'read',
    description: 'View billing policies',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'billing',
    resource: 'policies',
    action: 'manage',
    description: 'Manage billing policies',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'billing',
    resource: 'reports',
    action: 'read',
    description: 'View billing reports',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'billing',
    resource: 'financial-reports',
    action: 'read',
    description: 'View financial reports',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'billing',
    resource: 'financial-reports',
    action: 'export',
    description: 'Export financial reports',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },

  // ========================================
  // AUDIT DOMAIN
  // ========================================
  {
    domain: 'audit',
    resource: 'logs',
    action: 'read',
    description: 'View audit logs',
    isSensitive: true,
    sensitiveCategory: 'audit'
  },
  {
    domain: 'audit',
    resource: 'logs',
    action: 'export',
    description: 'Export audit logs',
    isSensitive: true,
    sensitiveCategory: 'audit'
  },
  {
    domain: 'audit',
    resource: 'security',
    action: 'read',
    description: 'View security audit information',
    isSensitive: true,
    sensitiveCategory: 'audit'
  },
  {
    domain: 'audit',
    resource: 'compliance',
    action: 'read',
    description: 'View compliance reports',
    isSensitive: true,
    sensitiveCategory: 'audit'
  },
  {
    domain: 'audit',
    resource: 'system',
    action: 'manage',
    description: 'Manage audit system',
    isSensitive: true,
    sensitiveCategory: 'audit'
  }
];

/**
 * Wildcard access rights for system-admin
 * Note: Pattern is domain:* (not domain:*:*)
 */
const WILDCARD_RIGHTS: AccessRightDefinition[] = [
  {
    domain: 'system',
    resource: '*',
    action: '',  // Will be converted to domain:* format
    description: 'Full system access - all permissions (wildcard)',
    isSensitive: true,
    sensitiveCategory: 'audit'
  },
  {
    domain: 'content',
    resource: '*',
    action: '',
    description: 'Full content domain access (wildcard)',
    isSensitive: false
  },
  {
    domain: 'enrollment',
    resource: '*',
    action: '',
    description: 'Full enrollment domain access (wildcard)',
    isSensitive: false
  },
  {
    domain: 'staff',
    resource: '*',
    action: '',
    description: 'Full staff domain access (wildcard)',
    isSensitive: true,
    sensitiveCategory: 'pii'
  },
  {
    domain: 'learner',
    resource: '*',
    action: '',
    description: 'Full learner domain access (wildcard)',
    isSensitive: true,
    sensitiveCategory: 'ferpa'
  },
  {
    domain: 'reports',
    resource: '*',
    action: '',
    description: 'Full reports domain access (wildcard)',
    isSensitive: true,
    sensitiveCategory: 'ferpa'
  },
  {
    domain: 'billing',
    resource: '*',
    action: '',
    description: 'Full billing domain access (wildcard)',
    isSensitive: true,
    sensitiveCategory: 'billing'
  },
  {
    domain: 'audit',
    resource: '*',
    action: '',
    description: 'Full audit domain access (wildcard)',
    isSensitive: true,
    sensitiveCategory: 'audit'
  },
  {
    domain: 'grades',
    resource: '*',
    action: '',
    description: 'Full grades domain access (wildcard)',
    isSensitive: true,
    sensitiveCategory: 'ferpa'
  }
];

/**
 * Upsert a single access right
 */
async function upsertAccessRight(right: AccessRightDefinition): Promise<'created' | 'updated' | 'skipped'> {
  // Handle wildcard pattern: domain:* instead of domain:resource:action
  const isWildcard = right.resource === '*' && right.action === '';
  const name = isWildcard
    ? `${right.domain}:*`
    : `${right.domain}:${right.resource}:${right.action}`;

  try {
    const existing = await AccessRight.findOne({ name });

    if (existing) {
      // Check if anything has changed
      const hasChanges =
        existing.description !== right.description ||
        existing.isSensitive !== (right.isSensitive || false) ||
        existing.sensitiveCategory !== right.sensitiveCategory;

      if (hasChanges) {
        await AccessRight.updateOne(
          { name },
          {
            $set: {
              description: right.description,
              isSensitive: right.isSensitive || false,
              sensitiveCategory: right.sensitiveCategory,
              updatedAt: new Date()
            }
          }
        );
        return 'updated';
      }
      return 'skipped';
    }

    // Create new access right
    await AccessRight.create({
      name,
      domain: right.domain,
      resource: right.resource,
      action: isWildcard ? '*' : right.action,  // Set action to '*' for wildcards
      description: right.description,
      isSensitive: right.isSensitive || false,
      sensitiveCategory: right.sensitiveCategory,
      isActive: true
    });

    return 'created';
  } catch (error) {
    console.error(`  ✗ Error upserting ${name}:`, error);
    throw error;
  }
}

/**
 * Seed all access rights
 */
async function seedAccessRights(): Promise<void> {
  console.log('\n📋 Seeding access rights...');

  const stats = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };

  // Process regular access rights
  console.log('  Processing regular access rights...');
  for (const right of ACCESS_RIGHTS) {
    try {
      const result = await upsertAccessRight(right);
      stats[result]++;

      if (result === 'created') {
        console.log(`    ✓ Created: ${right.domain}:${right.resource}:${right.action}`);
      }
    } catch (error) {
      stats.errors++;
      console.error(`    ✗ Failed: ${right.domain}:${right.resource}:${right.action}`);
    }
  }

  // Process wildcard rights
  console.log('\n  Processing wildcard access rights...');
  for (const right of WILDCARD_RIGHTS) {
    try {
      const result = await upsertAccessRight(right);
      stats[result]++;

      if (result === 'created') {
        console.log(`    ✓ Created: ${right.domain}:${right.resource}:${right.action}`);
      }
    } catch (error) {
      stats.errors++;
      console.error(`    ✗ Failed: ${right.domain}:${right.resource}:${right.action}`);
    }
  }

  console.log('\n  Summary:');
  console.log(`    Created:  ${stats.created}`);
  console.log(`    Updated:  ${stats.updated}`);
  console.log(`    Skipped:  ${stats.skipped}`);
  console.log(`    Errors:   ${stats.errors}`);
  console.log(`    Total:    ${ACCESS_RIGHTS.length + WILDCARD_RIGHTS.length}`);
}

/**
 * Generate access rights from existing role definitions
 * This helper extracts all unique access rights from RoleDefinition collection
 */
async function generateAccessRightsFromRoles(): Promise<void> {
  console.log('\n🔍 Analyzing role definitions...');

  const roles = await RoleDefinition.find({ isActive: true });
  console.log(`  Found ${roles.length} active roles`);

  const uniqueRights = new Set<string>();
  const stats = {
    total: 0,
    unique: 0,
    existing: 0,
    missing: 0
  };

  // Extract all access rights from roles
  for (const role of roles) {
    for (const right of role.accessRights) {
      stats.total++;
      uniqueRights.add(right);
    }
  }

  stats.unique = uniqueRights.size;
  console.log(`  Total access rights in roles: ${stats.total}`);
  console.log(`  Unique access rights: ${stats.unique}`);

  // Check which rights exist in AccessRight collection
  console.log('\n  Checking AccessRight collection...');
  for (const rightName of Array.from(uniqueRights)) {
    const exists = await AccessRight.findOne({ name: rightName });
    if (exists) {
      stats.existing++;
    } else {
      stats.missing++;
      console.log(`    ⚠️  Missing: ${rightName}`);
    }
  }

  console.log('\n  Analysis complete:');
  console.log(`    Existing in DB: ${stats.existing}`);
  console.log(`    Missing in DB:  ${stats.missing}`);

  if (stats.missing > 0) {
    console.log('\n  ⚠️  Some access rights referenced by roles are not in the AccessRight collection.');
    console.log('     Consider adding them to this seed script.');
  }
}

/**
 * Display statistics about access rights
 */
async function displayStatistics(): Promise<void> {
  console.log('\n📊 Access Rights Statistics:');

  // Count by domain
  const domains = await AccessRight.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$domain', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  console.log('\n  By Domain:');
  for (const domain of domains) {
    console.log(`    ${domain._id.padEnd(15)} ${domain.count} rights`);
  }

  // Count sensitive rights
  const sensitiveCount = await AccessRight.countDocuments({
    isActive: true,
    isSensitive: true
  });
  console.log(`\n  Sensitive Rights: ${sensitiveCount}`);

  // Count by sensitive category
  const sensitiveByCategory = await AccessRight.aggregate([
    { $match: { isActive: true, isSensitive: true } },
    { $group: { _id: '$sensitiveCategory', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  console.log('\n  By Sensitive Category:');
  for (const category of sensitiveByCategory) {
    console.log(`    ${(category._id || 'none').padEnd(15)} ${category.count} rights`);
  }

  // Total count
  const totalCount = await AccessRight.countDocuments({ isActive: true });
  console.log(`\n  Total Active Rights: ${totalCount}`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  LMS V2 - Seed Access Rights Script     ║');
  console.log('╚══════════════════════════════════════════╝');

  try {
    // Connect to database
    console.log('\n🔌 Connecting to database...');
    await mongoose.connect(DB_URI);
    console.log(`  ✓ Connected to ${DB_URI}`);

    // Seed access rights
    await seedAccessRights();

    // Generate access rights from roles (analysis only)
    await generateAccessRightsFromRoles();

    // Display statistics
    await displayStatistics();

    // Success
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║  Seed Complete!                          ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run the script
if (require.main === module) {
  main();
}

export {
  ACCESS_RIGHTS,
  WILDCARD_RIGHTS,
  upsertAccessRight,
  seedAccessRights,
  generateAccessRightsFromRoles
};
