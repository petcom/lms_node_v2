import mongoose, { Schema, Document } from 'mongoose';
import { STAFF_ROLES } from './role-constants';

export interface IDepartmentMembership {
  departmentId: mongoose.Types.ObjectId;
  roles: string[];
  isPrimary: boolean;
  joinedAt: Date;
  isActive: boolean;
}

export interface IStaff extends Document {
  _id: mongoose.Types.ObjectId; // Shared with User
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  title?: string;
  departmentMemberships: IDepartmentMembership[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  getRolesForDepartment(deptId: mongoose.Types.ObjectId): string[];
  hasDepartmentRole(deptId: mongoose.Types.ObjectId, role: string): boolean;
}

const departmentMembershipSchema = new Schema<IDepartmentMembership>(
  {
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true
    },
    roles: {
      type: [String],
      required: true,
      validate: {
        validator: function(roles: string[]) {
          if (roles.length === 0) {
            return false;
          }
          // Ensure all roles are valid STAFF_ROLES
          const validRoles = new Set(STAFF_ROLES as readonly string[]);
          return roles.every(role => validRoles.has(role));
        },
        message: 'Invalid staff role. Must be one of: instructor, department-admin, content-admin, billing-admin'
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
  },
  { _id: false }
);

const staffSchema = new Schema<IStaff>(
  {
    _id: {
      type: Schema.Types.ObjectId,
      required: true
    },
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    title: {
      type: String,
      trim: true
    },
    departmentMemberships: {
      type: [departmentMembershipSchema],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
staffSchema.index({ _id: 1 });
staffSchema.index({ 'departmentMemberships.departmentId': 1 });
staffSchema.index({ 'departmentMemberships.roles': 1 });
staffSchema.index({ isActive: 1 });

// Instance Methods

/**
 * Get all roles for a specific department
 * @param deptId - Department ObjectId
 * @returns Array of role names
 */
staffSchema.methods.getRolesForDepartment = function(
  deptId: mongoose.Types.ObjectId
): string[] {
  const membership = this.departmentMemberships.find(
    (m: IDepartmentMembership) =>
      m.departmentId.equals(deptId) && m.isActive
  );
  return membership ? membership.roles : [];
};

/**
 * Check if staff has a specific role in a department
 * @param deptId - Department ObjectId
 * @param role - Role name to check
 * @returns True if staff has the role in that department
 */
staffSchema.methods.hasDepartmentRole = function(
  deptId: mongoose.Types.ObjectId,
  role: string
): boolean {
  const roles = this.getRolesForDepartment(deptId);
  return roles.includes(role);
};

export const Staff = mongoose.model<IStaff>('Staff', staffSchema);
