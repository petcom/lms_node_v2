/**
 * DepartmentMembership Schema (Shared)
 *
 * Unified schema used by Staff and Learner models to track department memberships.
 * This provides a consistent structure for department-scoped role assignments.
 *
 * Key features:
 * - Department-scoped roles (roles are specific to each department)
 * - Primary department designation (one per user)
 * - Activity tracking (joinedAt, isActive)
 * - Role validation (at least one role required)
 *
 * @module models/auth/department-membership.schema
 */

import { Schema, Types } from 'mongoose';

/**
 * Department membership interface
 * Used by: Staff, Learner
 */
export interface IDepartmentMembership {
  /** Reference to the department */
  departmentId: Types.ObjectId;

  /** Array of role names valid for the model's userType */
  roles: string[];

  /** Is this the user's primary department? */
  isPrimary: boolean;

  /** When the user joined this department */
  joinedAt: Date;

  /** Is this membership currently active? */
  isActive: boolean;
}

/**
 * Shared DepartmentMembership schema
 *
 * This schema is reusable across Staff and Learner models.
 * Role validation is performed at the model level since valid roles
 * differ by userType (staff roles vs learner roles).
 */
export const DepartmentMembershipSchema = new Schema<IDepartmentMembership>({
  departmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department ID is required']
  },
  roles: {
    type: [String],
    required: [true, 'Roles array is required'],
    validate: {
      validator: (v: string[]) => v.length > 0,
      message: 'At least one role is required'
    }
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: false });

/**
 * Re-export the interface for convenience
 */
export default DepartmentMembershipSchema;
