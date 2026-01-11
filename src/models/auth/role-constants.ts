/**
 * Role System Constants
 *
 * Shared constants for role definitions, user types, and master department.
 * These constants are used across User, Staff, Learner, and GlobalAdmin models
 * to ensure consistency in role validation and authorization.
 *
 * Reference: devdocs/Role_System_API_Model_Plan_V2.md Section 3 and 4.6
 */

import { Types } from 'mongoose';

// ============================================================================
// User Types
// ============================================================================

/**
 * User Types - Categories determining dashboard access
 * - learner: Access to Learner Dashboard only
 * - staff: Access to Staff Dashboard
 * - global-admin: Access to Staff Dashboard + Admin Dashboard (with escalation)
 */
export const USER_TYPES = ['learner', 'staff', 'global-admin'] as const;
export type UserType = typeof USER_TYPES[number];

// ============================================================================
// Learner Roles (Department-Scoped)
// ============================================================================

/**
 * Learner Roles - Department-scoped roles for learner userType
 * - course-taker: Standard learner who enrolls in and completes courses
 * - auditor: View-only access, cannot earn credit or complete exams
 * - learner-supervisor: Elevated permissions for TAs, peer mentors
 */
export const LEARNER_ROLES = ['course-taker', 'auditor', 'learner-supervisor'] as const;
export type LearnerRole = typeof LEARNER_ROLES[number];

// ============================================================================
// Staff Roles (Department-Scoped)
// ============================================================================

/**
 * Staff Roles - Department-scoped roles for staff userType
 * - instructor: Teaches classes, grades student work
 * - department-admin: Manages department operations, staff, settings
 * - content-admin: Creates and manages courses, programs
 * - billing-admin: Department-level billing operations
 */
export const STAFF_ROLES = ['instructor', 'department-admin', 'content-admin', 'billing-admin'] as const;
export type StaffRole = typeof STAFF_ROLES[number];

// ============================================================================
// GlobalAdmin Roles (Master Department Only)
// ============================================================================

/**
 * GlobalAdmin Roles - Master department roles for global-admin userType
 * - system-admin: Full system access - highest privilege
 * - enrollment-admin: Manages enrollment system globally
 * - course-admin: Manages course system globally
 * - theme-admin: Manages themes, branding, UI
 * - financial-admin: System-wide financial operations
 */
export const GLOBAL_ADMIN_ROLES = [
  'system-admin',
  'enrollment-admin',
  'course-admin',
  'theme-admin',
  'financial-admin'
] as const;
export type GlobalAdminRole = typeof GLOBAL_ADMIN_ROLES[number];

// ============================================================================
// Master Department Constants
// ============================================================================

/**
 * Master Department ID - Special system department for GlobalAdmin roles
 * This is a protected system department that cannot be deleted.
 * All GlobalAdmin role assignments must be in this department.
 */
export const MASTER_DEPARTMENT_ID = new Types.ObjectId('000000000000000000000001');

/**
 * Master Department Name - Display name for the master department
 */
export const MASTER_DEPARTMENT_NAME = 'System Administration';
