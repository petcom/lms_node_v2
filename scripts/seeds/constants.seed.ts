/**
 * Constants Seed Script - LookupValues Collection
 *
 * Seeds the LookupValues collection with all enumerated constants:
 *
 * User Types & Roles (15 values):
 * - 3 UserTypes (learner, staff, global-admin)
 * - 3 Learner Roles
 * - 4 Staff Roles
 * - 5 GlobalAdmin Roles
 *
 * Report System (112 values):
 * - 34 Activity Event Types (enrollment, content, assessment, SCORM, video, session, achievement)
 * - 12 Report Types (enrollment-summary, completion-rates, performance-analysis, etc.)
 * - 19 Measure Types (count, average, completion-rate, pass-rate, etc.)
 * - 10 Report Job Statuses (pending, queued, processing, ready, etc.)
 * - 5 Report Priorities (critical, high, normal, low, scheduled)
 * - 4 Report Visibility Levels (private, team, department, organization)
 * - 10 Dimension Entities (learner, course, class, program, etc.)
 * - 4 Output Formats (pdf, excel, csv, json)
 *
 * Total: 113 lookup values (15 User Types/Roles + 98 Report System)
 *
 * This script is idempotent - safe to run multiple times.
 * It will create missing records and skip existing ones.
 *
 * Usage:
 *   npx ts-node scripts/seeds/constants.seed.ts
 *   npm run seed:constants
 *
 * Reference:
 * - contracts/api/lookup-values.contract.ts
 * - agent_coms/api/REPORT_SYSTEM_RECOMMENDATION.md
 *
 * @module scripts/seeds/constants
 */

import mongoose from 'mongoose';
import { loadEnv } from '../utils/load-env';
import { LookupValue } from '../../src/models/LookupValue.model';

// Load environment variables
loadEnv();

// Configuration
const config = {
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/lms_mock'
};

/**
 * Lookup values data - Source of truth for all constants
 */
const LOOKUP_VALUES = [
  // =========================================================================
  // USER TYPES (Root Level - No Parent)
  // =========================================================================
  {
    category: 'usertype',
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
    category: 'usertype',
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
    category: 'usertype',
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
  // LEARNER ROLES (Children of usertype.learner)
  // =========================================================================
  {
    category: 'role',
    key: 'course-taker',
    parentLookupId: 'usertype.learner',
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
    category: 'role',
    key: 'auditor',
    parentLookupId: 'usertype.learner',
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
    category: 'role',
    key: 'learner-supervisor',
    parentLookupId: 'usertype.learner',
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
  // STAFF ROLES (Children of usertype.staff)
  // =========================================================================
  {
    category: 'role',
    key: 'instructor',
    parentLookupId: 'usertype.staff',
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
    category: 'role',
    key: 'department-admin',
    parentLookupId: 'usertype.staff',
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
    category: 'role',
    key: 'content-admin',
    parentLookupId: 'usertype.staff',
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
    category: 'role',
    key: 'billing-admin',
    parentLookupId: 'usertype.staff',
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
  // GLOBAL ADMIN ROLES (Children of usertype.global-admin)
  // =========================================================================
  {
    category: 'role',
    key: 'system-admin',
    parentLookupId: 'usertype.global-admin',
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
    category: 'role',
    key: 'enrollment-admin',
    parentLookupId: 'usertype.global-admin',
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
    category: 'role',
    key: 'course-admin',
    parentLookupId: 'usertype.global-admin',
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
    category: 'role',
    key: 'theme-admin',
    parentLookupId: 'usertype.global-admin',
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
    category: 'role',
    key: 'financial-admin',
    parentLookupId: 'usertype.global-admin',
    displayAs: 'Financial Admin',
    description: 'System-wide financial operations',
    sortOrder: 5,
    isActive: true,
    metadata: {
      isDefault: false,
      icon: 'DollarSign',
      color: '#10B981'
    }
  },

  // =========================================================================
  // COURSE STATUS VALUES
  // =========================================================================
  { category: 'course-status', key: 'draft', parentLookupId: null, displayAs: 'Draft', description: 'Course is being created', sortOrder: 1, isActive: true, metadata: {} },
  { category: 'course-status', key: 'published', parentLookupId: null, displayAs: 'Published', description: 'Course is available to learners', sortOrder: 2, isActive: true, metadata: {} },
  { category: 'course-status', key: 'archived', parentLookupId: null, displayAs: 'Archived', description: 'Course is no longer active', sortOrder: 3, isActive: true, metadata: {} },

  // =========================================================================
  // ACTIVITY EVENT TYPES (Report System)
  // =========================================================================
  // Enrollment Events
  { category: 'activity-event', key: 'enrollment-created', parentLookupId: null, displayAs: 'Enrollment Created', description: 'Learner enrolled in a course', sortOrder: 10, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'enrollment-started', parentLookupId: null, displayAs: 'Enrollment Started', description: 'Learner began course work', sortOrder: 11, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'enrollment-completed', parentLookupId: null, displayAs: 'Enrollment Completed', description: 'Learner completed course', sortOrder: 12, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'enrollment-withdrawn', parentLookupId: null, displayAs: 'Enrollment Withdrawn', description: 'Learner withdrew from course', sortOrder: 13, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'enrollment-expired', parentLookupId: null, displayAs: 'Enrollment Expired', description: 'Enrollment period expired', sortOrder: 14, isActive: true, metadata: {} },

  // Content Events
  { category: 'activity-event', key: 'content-viewed', parentLookupId: null, displayAs: 'Content Viewed', description: 'Content item viewed', sortOrder: 20, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'content-started', parentLookupId: null, displayAs: 'Content Started', description: 'Started interacting with content', sortOrder: 21, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'content-completed', parentLookupId: null, displayAs: 'Content Completed', description: 'Finished content item', sortOrder: 22, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'content-downloaded', parentLookupId: null, displayAs: 'Content Downloaded', description: 'Downloaded content file', sortOrder: 23, isActive: true, metadata: {} },

  // Assessment Events
  { category: 'activity-event', key: 'assessment-started', parentLookupId: null, displayAs: 'Assessment Started', description: 'Started assessment/exam', sortOrder: 30, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'assessment-submitted', parentLookupId: null, displayAs: 'Assessment Submitted', description: 'Submitted assessment answers', sortOrder: 31, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'assessment-completed', parentLookupId: null, displayAs: 'Assessment Completed', description: 'Completed and graded assessment', sortOrder: 32, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'assessment-graded', parentLookupId: null, displayAs: 'Assessment Graded', description: 'Assessment graded by instructor', sortOrder: 33, isActive: true, metadata: {} },

  // Module/Course Events
  { category: 'activity-event', key: 'module-started', parentLookupId: null, displayAs: 'Module Started', description: 'Started course module', sortOrder: 40, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'module-completed', parentLookupId: null, displayAs: 'Module Completed', description: 'Completed course module', sortOrder: 41, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'course-started', parentLookupId: null, displayAs: 'Course Started', description: 'Started course', sortOrder: 42, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'course-completed', parentLookupId: null, displayAs: 'Course Completed', description: 'Completed entire course', sortOrder: 43, isActive: true, metadata: {} },

  // SCORM Events
  { category: 'activity-event', key: 'scorm-launched', parentLookupId: null, displayAs: 'SCORM Launched', description: 'SCORM package launched', sortOrder: 50, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'scorm-initialized', parentLookupId: null, displayAs: 'SCORM Initialized', description: 'SCORM session initialized', sortOrder: 51, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'scorm-completed', parentLookupId: null, displayAs: 'SCORM Completed', description: 'SCORM package completed', sortOrder: 52, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'scorm-passed', parentLookupId: null, displayAs: 'SCORM Passed', description: 'SCORM package passed', sortOrder: 53, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'scorm-failed', parentLookupId: null, displayAs: 'SCORM Failed', description: 'SCORM package failed', sortOrder: 54, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'scorm-suspended', parentLookupId: null, displayAs: 'SCORM Suspended', description: 'SCORM session suspended', sortOrder: 55, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'scorm-exited', parentLookupId: null, displayAs: 'SCORM Exited', description: 'Exited SCORM package', sortOrder: 56, isActive: true, metadata: {} },

  // Video Events
  { category: 'activity-event', key: 'video-played', parentLookupId: null, displayAs: 'Video Played', description: 'Video playback started', sortOrder: 60, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'video-paused', parentLookupId: null, displayAs: 'Video Paused', description: 'Video playback paused', sortOrder: 61, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'video-seeked', parentLookupId: null, displayAs: 'Video Seeked', description: 'Video position changed', sortOrder: 62, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'video-completed', parentLookupId: null, displayAs: 'Video Completed', description: 'Video watched to end', sortOrder: 63, isActive: true, metadata: {} },

  // Session Events
  { category: 'activity-event', key: 'session-started', parentLookupId: null, displayAs: 'Session Started', description: 'Learning session started', sortOrder: 70, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'session-ended', parentLookupId: null, displayAs: 'Session Ended', description: 'Learning session ended', sortOrder: 71, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'login', parentLookupId: null, displayAs: 'Login', description: 'User logged in', sortOrder: 72, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'logout', parentLookupId: null, displayAs: 'Logout', description: 'User logged out', sortOrder: 73, isActive: true, metadata: {} },

  // Achievement Events
  { category: 'activity-event', key: 'achievement-earned', parentLookupId: null, displayAs: 'Achievement Earned', description: 'Achievement/badge earned', sortOrder: 80, isActive: true, metadata: {} },
  { category: 'activity-event', key: 'certificate-issued', parentLookupId: null, displayAs: 'Certificate Issued', description: 'Certificate issued to learner', sortOrder: 81, isActive: true, metadata: {} },

  // =========================================================================
  // REPORT TYPES (Report System)
  // =========================================================================
  { category: 'report-type', key: 'enrollment-summary', parentLookupId: null, displayAs: 'Enrollment Summary', description: 'Enrollment statistics and trends', sortOrder: 10, isActive: true, metadata: {} },
  { category: 'report-type', key: 'completion-rates', parentLookupId: null, displayAs: 'Completion Rates', description: 'Course completion rates and trends', sortOrder: 20, isActive: true, metadata: {} },
  { category: 'report-type', key: 'performance-analysis', parentLookupId: null, displayAs: 'Performance Analysis', description: 'Grades and assessment performance', sortOrder: 30, isActive: true, metadata: {} },
  { category: 'report-type', key: 'learner-activity', parentLookupId: null, displayAs: 'Learner Activity', description: 'Individual learner engagement', sortOrder: 40, isActive: true, metadata: {} },
  { category: 'report-type', key: 'course-analytics', parentLookupId: null, displayAs: 'Course Analytics', description: 'Course effectiveness metrics', sortOrder: 50, isActive: true, metadata: {} },
  { category: 'report-type', key: 'instructor-workload', parentLookupId: null, displayAs: 'Instructor Workload', description: 'Instructor teaching load', sortOrder: 60, isActive: true, metadata: {} },
  { category: 'report-type', key: 'department-overview', parentLookupId: null, displayAs: 'Department Overview', description: 'Department-level rollup', sortOrder: 70, isActive: true, metadata: {} },
  { category: 'report-type', key: 'program-progress', parentLookupId: null, displayAs: 'Program Progress', description: 'Program completion tracking', sortOrder: 80, isActive: true, metadata: {} },
  { category: 'report-type', key: 'assessment-results', parentLookupId: null, displayAs: 'Assessment Results', description: 'Assessment performance', sortOrder: 90, isActive: true, metadata: {} },
  { category: 'report-type', key: 'scorm-attempts', parentLookupId: null, displayAs: 'SCORM Attempts', description: 'SCORM package tracking', sortOrder: 100, isActive: true, metadata: {} },
  { category: 'report-type', key: 'transcript', parentLookupId: null, displayAs: 'Transcript', description: 'Learner transcript', sortOrder: 110, isActive: true, metadata: {} },
  { category: 'report-type', key: 'certification-status', parentLookupId: null, displayAs: 'Certification Status', description: 'Certification tracking', sortOrder: 120, isActive: true, metadata: {} },

  // =========================================================================
  // MEASURE TYPES (Report System - with metadata)
  // =========================================================================
  // Basic Aggregations
  { category: 'measure-type', key: 'count', parentLookupId: null, displayAs: 'Count', description: 'Number of records', sortOrder: 10, isActive: true, metadata: { format: 'number', requiresField: false, applicableTo: ['all'] } },
  { category: 'measure-type', key: 'count-distinct', parentLookupId: null, displayAs: 'Count Distinct', description: 'Unique count', sortOrder: 11, isActive: true, metadata: { format: 'number', requiresField: true, applicableTo: ['all'] } },
  { category: 'measure-type', key: 'sum', parentLookupId: null, displayAs: 'Sum', description: 'Sum of numeric field', sortOrder: 12, isActive: true, metadata: { format: 'number', requiresField: true, applicableTo: ['number'] } },
  { category: 'measure-type', key: 'average', parentLookupId: null, displayAs: 'Average', description: 'Average of numeric field', sortOrder: 13, isActive: true, metadata: { format: 'number', requiresField: true, applicableTo: ['number'] } },
  { category: 'measure-type', key: 'median', parentLookupId: null, displayAs: 'Median', description: 'Median value', sortOrder: 14, isActive: true, metadata: { format: 'number', requiresField: true, applicableTo: ['number'] } },
  { category: 'measure-type', key: 'min', parentLookupId: null, displayAs: 'Minimum', description: 'Minimum value', sortOrder: 15, isActive: true, metadata: { format: 'number', requiresField: true, applicableTo: ['number', 'date'] } },
  { category: 'measure-type', key: 'max', parentLookupId: null, displayAs: 'Maximum', description: 'Maximum value', sortOrder: 16, isActive: true, metadata: { format: 'number', requiresField: true, applicableTo: ['number', 'date'] } },
  { category: 'measure-type', key: 'std-dev', parentLookupId: null, displayAs: 'Standard Deviation', description: 'Statistical standard deviation', sortOrder: 17, isActive: true, metadata: { format: 'number', requiresField: true, applicableTo: ['number'] } },
  { category: 'measure-type', key: 'variance', parentLookupId: null, displayAs: 'Variance', description: 'Statistical variance', sortOrder: 18, isActive: true, metadata: { format: 'number', requiresField: true, applicableTo: ['number'] } },

  // LMS-Specific Rates
  { category: 'measure-type', key: 'completion-rate', parentLookupId: null, displayAs: 'Completion Rate', description: 'Percentage completed', sortOrder: 30, isActive: true, metadata: { format: 'percent', requiresField: false, applicableTo: ['enrollment', 'course'] } },
  { category: 'measure-type', key: 'pass-rate', parentLookupId: null, displayAs: 'Pass Rate', description: 'Percentage passed', sortOrder: 31, isActive: true, metadata: { format: 'percent', requiresField: false, applicableTo: ['enrollment', 'course', 'assessment'] } },
  { category: 'measure-type', key: 'fail-rate', parentLookupId: null, displayAs: 'Fail Rate', description: 'Percentage failed', sortOrder: 32, isActive: true, metadata: { format: 'percent', requiresField: false, applicableTo: ['enrollment', 'course', 'assessment'] } },
  { category: 'measure-type', key: 'engagement-rate', parentLookupId: null, displayAs: 'Engagement Rate', description: 'Percentage of learners with activity', sortOrder: 33, isActive: true, metadata: { format: 'percent', requiresField: false, applicableTo: ['course', 'class'] } },
  { category: 'measure-type', key: 'retention-rate', parentLookupId: null, displayAs: 'Retention Rate', description: 'Percentage not withdrawn', sortOrder: 34, isActive: true, metadata: { format: 'percent', requiresField: false, applicableTo: ['enrollment', 'program'] } },
  { category: 'measure-type', key: 'dropout-rate', parentLookupId: null, displayAs: 'Dropout Rate', description: 'Percentage withdrawn', sortOrder: 35, isActive: true, metadata: { format: 'percent', requiresField: false, applicableTo: ['enrollment', 'program'] } },

  // Time-Based
  { category: 'measure-type', key: 'avg-time-to-complete', parentLookupId: null, displayAs: 'Avg Time to Complete', description: 'Average completion time', sortOrder: 40, isActive: true, metadata: { format: 'duration', requiresField: false, applicableTo: ['enrollment'] } },
  { category: 'measure-type', key: 'avg-study-time', parentLookupId: null, displayAs: 'Avg Study Time', description: 'Average time spent learning', sortOrder: 41, isActive: true, metadata: { format: 'duration', requiresField: false, applicableTo: ['learner', 'course', 'class'] } },

  // Score-Based
  { category: 'measure-type', key: 'avg-score', parentLookupId: null, displayAs: 'Average Score', description: 'Average assessment score', sortOrder: 50, isActive: true, metadata: { format: 'number', requiresField: false, applicableTo: ['assessment', 'course', 'learner'] } },

  // Activity-Based
  { category: 'measure-type', key: 'event-count', parentLookupId: null, displayAs: 'Event Count', description: 'Count of learning events', sortOrder: 60, isActive: true, metadata: { format: 'number', requiresField: false, applicableTo: ['learner', 'course', 'class'] } },

  // =========================================================================
  // REPORT JOB STATUSES (Report System)
  // =========================================================================
  { category: 'report-status', key: 'pending', parentLookupId: null, displayAs: 'Pending', description: 'Job created, waiting to be queued', sortOrder: 10, isActive: true, metadata: {} },
  { category: 'report-status', key: 'queued', parentLookupId: null, displayAs: 'Queued', description: 'Job queued for processing', sortOrder: 20, isActive: true, metadata: {} },
  { category: 'report-status', key: 'processing', parentLookupId: null, displayAs: 'Processing', description: 'Job is being processed', sortOrder: 30, isActive: true, metadata: {} },
  { category: 'report-status', key: 'rendering', parentLookupId: null, displayAs: 'Rendering', description: 'Report file is being rendered', sortOrder: 40, isActive: true, metadata: {} },
  { category: 'report-status', key: 'uploading', parentLookupId: null, displayAs: 'Uploading', description: 'Report file uploading to storage', sortOrder: 50, isActive: true, metadata: {} },
  { category: 'report-status', key: 'ready', parentLookupId: null, displayAs: 'Ready', description: 'Report ready for download', sortOrder: 60, isActive: true, metadata: {} },
  { category: 'report-status', key: 'downloaded', parentLookupId: null, displayAs: 'Downloaded', description: 'Report downloaded by user', sortOrder: 70, isActive: true, metadata: {} },
  { category: 'report-status', key: 'failed', parentLookupId: null, displayAs: 'Failed', description: 'Job failed with error', sortOrder: 80, isActive: true, metadata: {} },
  { category: 'report-status', key: 'cancelled', parentLookupId: null, displayAs: 'Cancelled', description: 'Job cancelled by user', sortOrder: 90, isActive: true, metadata: {} },
  { category: 'report-status', key: 'expired', parentLookupId: null, displayAs: 'Expired', description: 'Report file expired and deleted', sortOrder: 100, isActive: true, metadata: {} },

  // =========================================================================
  // REPORT PRIORITIES (Report System)
  // =========================================================================
  { category: 'report-priority', key: 'critical', parentLookupId: null, displayAs: 'Critical', description: 'Urgent admin/compliance requests', sortOrder: 10, isActive: true, metadata: {} },
  { category: 'report-priority', key: 'high', parentLookupId: null, displayAs: 'High', description: 'Admin urgent requests', sortOrder: 20, isActive: true, metadata: {} },
  { category: 'report-priority', key: 'normal', parentLookupId: null, displayAs: 'Normal', description: 'Standard user requests', sortOrder: 30, isActive: true, metadata: {} },
  { category: 'report-priority', key: 'low', parentLookupId: null, displayAs: 'Low', description: 'Batch reports', sortOrder: 40, isActive: true, metadata: {} },
  { category: 'report-priority', key: 'scheduled', parentLookupId: null, displayAs: 'Scheduled', description: 'Scheduled/recurring reports', sortOrder: 50, isActive: true, metadata: {} },

  // =========================================================================
  // REPORT VISIBILITY LEVELS (Report System)
  // =========================================================================
  { category: 'report-visibility', key: 'private', parentLookupId: null, displayAs: 'Private', description: 'Only visible to creator', sortOrder: 10, isActive: true, metadata: {} },
  { category: 'report-visibility', key: 'team', parentLookupId: null, displayAs: 'Team', description: 'Visible to team members', sortOrder: 20, isActive: true, metadata: {} },
  { category: 'report-visibility', key: 'department', parentLookupId: null, displayAs: 'Department', description: 'Visible to department', sortOrder: 30, isActive: true, metadata: {} },
  { category: 'report-visibility', key: 'organization', parentLookupId: null, displayAs: 'Organization', description: 'Visible to entire organization', sortOrder: 40, isActive: true, metadata: {} },

  // =========================================================================
  // DIMENSION ENTITIES (Report System)
  // =========================================================================
  { category: 'dimension-entity', key: 'learner', parentLookupId: null, displayAs: 'Learner', description: 'Individual learner records', sortOrder: 10, isActive: true, metadata: {} },
  { category: 'dimension-entity', key: 'course', parentLookupId: null, displayAs: 'Course', description: 'Course-level data', sortOrder: 20, isActive: true, metadata: {} },
  { category: 'dimension-entity', key: 'class', parentLookupId: null, displayAs: 'Class', description: 'Class instance data', sortOrder: 30, isActive: true, metadata: {} },
  { category: 'dimension-entity', key: 'program', parentLookupId: null, displayAs: 'Program', description: 'Program-level data', sortOrder: 40, isActive: true, metadata: {} },
  { category: 'dimension-entity', key: 'department', parentLookupId: null, displayAs: 'Department', description: 'Department-level data', sortOrder: 50, isActive: true, metadata: {} },
  { category: 'dimension-entity', key: 'instructor', parentLookupId: null, displayAs: 'Instructor', description: 'Instructor data', sortOrder: 60, isActive: true, metadata: {} },
  { category: 'dimension-entity', key: 'enrollment', parentLookupId: null, displayAs: 'Enrollment', description: 'Individual enrollment records', sortOrder: 70, isActive: true, metadata: {} },
  { category: 'dimension-entity', key: 'activity', parentLookupId: null, displayAs: 'Activity', description: 'Activity events from LearningEvents', sortOrder: 80, isActive: true, metadata: {} },
  { category: 'dimension-entity', key: 'assessment', parentLookupId: null, displayAs: 'Assessment', description: 'Assessment/exam records', sortOrder: 90, isActive: true, metadata: {} },
  { category: 'dimension-entity', key: 'scorm-attempt', parentLookupId: null, displayAs: 'SCORM Attempt', description: 'SCORM package attempts', sortOrder: 100, isActive: true, metadata: {} },

  // =========================================================================
  // OUTPUT FORMATS (Report System)
  // =========================================================================
  { category: 'output-format', key: 'pdf', parentLookupId: null, displayAs: 'PDF', description: 'Portable Document Format', sortOrder: 10, isActive: true, metadata: { mimeType: 'application/pdf', extension: '.pdf' } },
  { category: 'output-format', key: 'excel', parentLookupId: null, displayAs: 'Excel', description: 'Microsoft Excel spreadsheet', sortOrder: 20, isActive: true, metadata: { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: '.xlsx' } },
  { category: 'output-format', key: 'csv', parentLookupId: null, displayAs: 'CSV', description: 'Comma-separated values', sortOrder: 30, isActive: true, metadata: { mimeType: 'text/csv', extension: '.csv' } },
  { category: 'output-format', key: 'json', parentLookupId: null, displayAs: 'JSON', description: 'JavaScript Object Notation', sortOrder: 40, isActive: true, metadata: { mimeType: 'application/json', extension: '.json' } }
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
      // Check if lookup already exists (query by category+key since lookupId is auto-generated)
      const existing = await LookupValue.findOne({
        category: lookupData.category,
        key: lookupData.key
      });

      // Generate lookupId for logging
      const lookupId = `${lookupData.category}.${lookupData.key}`;

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

        if (existing.parentLookupId !== lookupData.parentLookupId) {
          existing.parentLookupId = lookupData.parentLookupId;
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
          console.log(`  ↻ Updated: ${lookupId}`);
        } else {
          skipped++;
        }

        continue;
      }

      // Create new lookup
      await LookupValue.create(lookupData);
      created++;
      console.log(`  ✓ Created: ${lookupId}`);

    } catch (error) {
      const lookupId = `${lookupData.category}.${lookupData.key}`;
      console.error(`  ✗ Error seeding ${lookupId}:`, error);
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

  // Check User Types & Roles
  const userTypeCount = await LookupValue.countDocuments({ category: 'usertype' });
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
    parentLookupId: 'usertype.learner'
  });
  const staffRoles = await LookupValue.countDocuments({
    parentLookupId: 'usertype.staff'
  });
  const globalAdminRoles = await LookupValue.countDocuments({
    parentLookupId: 'usertype.global-admin'
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

  // Check Report System categories
  const activityEventCount = await LookupValue.countDocuments({ category: 'activity-event' });
  const reportTypeCount = await LookupValue.countDocuments({ category: 'report-type' });
  const measureTypeCount = await LookupValue.countDocuments({ category: 'measure-type' });
  const reportStatusCount = await LookupValue.countDocuments({ category: 'report-status' });
  const reportPriorityCount = await LookupValue.countDocuments({ category: 'report-priority' });
  const reportVisibilityCount = await LookupValue.countDocuments({ category: 'report-visibility' });
  const dimensionEntityCount = await LookupValue.countDocuments({ category: 'dimension-entity' });
  const outputFormatCount = await LookupValue.countDocuments({ category: 'output-format' });

  console.log('');
  console.log('Report System:');
  console.log(`  Activity Events: ${activityEventCount} (expected: 34)`);
  console.log(`  Report Types: ${reportTypeCount} (expected: 12)`);
  console.log(`  Measure Types: ${measureTypeCount} (expected: 19)`);
  console.log(`  Report Statuses: ${reportStatusCount} (expected: 10)`);
  console.log(`  Report Priorities: ${reportPriorityCount} (expected: 5)`);
  console.log(`  Report Visibility: ${reportVisibilityCount} (expected: 4)`);
  console.log(`  Dimension Entities: ${dimensionEntityCount} (expected: 10)`);
  console.log(`  Output Formats: ${outputFormatCount} (expected: 4)`);

  if (activityEventCount !== 34) {
    throw new Error(`Expected 34 activity events, found ${activityEventCount}`);
  }

  if (reportTypeCount !== 12) {
    throw new Error(`Expected 12 report types, found ${reportTypeCount}`);
  }

  if (measureTypeCount !== 19) {
    throw new Error(`Expected 19 measure types, found ${measureTypeCount}`);
  }

  if (reportStatusCount !== 10) {
    throw new Error(`Expected 10 report statuses, found ${reportStatusCount}`);
  }

  if (reportPriorityCount !== 5) {
    throw new Error(`Expected 5 report priorities, found ${reportPriorityCount}`);
  }

  if (reportVisibilityCount !== 4) {
    throw new Error(`Expected 4 report visibility levels, found ${reportVisibilityCount}`);
  }

  if (dimensionEntityCount !== 10) {
    throw new Error(`Expected 10 dimension entities, found ${dimensionEntityCount}`);
  }

  if (outputFormatCount !== 4) {
    throw new Error(`Expected 4 output formats, found ${outputFormatCount}`);
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
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║     Seed Complete!                                       ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('LookupValues Summary:');
    console.log('');
    console.log('User Types & Roles:');
    console.log('  - 3 UserTypes (learner, staff, global-admin)');
    console.log('  - 3 Learner Roles');
    console.log('  - 4 Staff Roles');
    console.log('  - 5 GlobalAdmin Roles');
    console.log('  Subtotal: 15 values');
    console.log('');
    console.log('Report System:');
    console.log('  - 34 Activity Event Types');
    console.log('  - 12 Report Types');
    console.log('  - 19 Measure Types');
    console.log('  - 10 Report Job Statuses');
    console.log('  - 5 Report Priorities');
    console.log('  - 4 Report Visibility Levels');
    console.log('  - 10 Dimension Entities');
    console.log('  - 4 Output Formats');
    console.log('  Subtotal: 98 values');
    console.log('');
    console.log('  Total: 113 lookup values');
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
