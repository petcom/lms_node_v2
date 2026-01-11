/**
 * GlobalAdmin Model
 * 
 * Represents users with global administration capabilities.
 * GlobalAdmin users access the Admin Dashboard via escalation from Staff Dashboard.
 * 
 * Key concepts:
 * - Separate escalation password (not the same as login password)
 * - Role memberships are ONLY in the master department
 * - Session timeout for admin dashboard (default 15 minutes)
 * 
 * @module models/GlobalAdmin
 */

import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

// Constants
export const MASTER_DEPARTMENT_ID = new Types.ObjectId('000000000000000000000001');
export const MASTER_DEPARTMENT_NAME = 'System Administration';

// Valid GlobalAdmin roles
export const GLOBAL_ADMIN_ROLES = [
  'system-admin',
  'enrollment-admin',
  'course-admin',
  'theme-admin',
  'financial-admin'
] as const;

export type GlobalAdminRole = typeof GLOBAL_ADMIN_ROLES[number];

/**
 * Role membership within the master department
 */
export interface IRoleMembership {
  /** Always the master department */
  departmentId: Types.ObjectId;
  
  /** Roles assigned in master department */
  roles: GlobalAdminRole[];
  
  /** When roles were assigned */
  assignedAt: Date;
  
  /** User who assigned these roles (null for seed) */
  assignedBy?: Types.ObjectId;
  
  /** Is this membership active? */
  isActive: boolean;
}

/**
 * GlobalAdmin document interface
 */
export interface IGlobalAdmin extends Document {
  _id: Types.ObjectId;
  
  /** Escalation password (hashed, separate from login) */
  escalationPassword: string;
  
  /** Role memberships in master department */
  roleMemberships: IRoleMembership[];
  
  /** Last successful escalation timestamp */
  lastEscalation?: Date;
  
  /** Admin session timeout in minutes */
  sessionTimeout: number;
  
  /** Is this admin active? */
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  compareEscalationPassword(password: string): Promise<boolean>;
  hasRole(role: GlobalAdminRole): boolean;
  getAllRoles(): GlobalAdminRole[];
}

/**
 * Role membership subdocument schema
 */
const RoleMembershipSchema = new Schema<IRoleMembership>({
  departmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
    default: MASTER_DEPARTMENT_ID
  },
  roles: {
    type: [String],
    enum: GLOBAL_ADMIN_ROLES,
    required: true,
    validate: {
      validator: (v: string[]) => v.length > 0,
      message: 'At least one role is required'
    }
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: false });

/**
 * GlobalAdmin schema
 */
const GlobalAdminSchema = new Schema<IGlobalAdmin>({
  _id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  escalationPassword: {
    type: String,
    required: [true, 'Escalation password is required'],
    minlength: [8, 'Escalation password must be at least 8 characters'],
    select: false // Don't include in queries by default
  },
  roleMemberships: {
    type: [RoleMembershipSchema],
    required: true,
    validate: [
      {
        validator: function(memberships: IRoleMembership[]) {
          // All memberships must be in master department
          return memberships.every(m => 
            m.departmentId.equals(MASTER_DEPARTMENT_ID)
          );
        },
        message: 'All GlobalAdmin role memberships must be in the master department'
      },
      {
        validator: function(memberships: IRoleMembership[]) {
          // At least one active membership
          return memberships.some(m => m.isActive);
        },
        message: 'GlobalAdmin must have at least one active role membership'
      }
    ]
  },
  lastEscalation: {
    type: Date
  },
  sessionTimeout: {
    type: Number,
    default: 15,
    min: [5, 'Session timeout must be at least 5 minutes'],
    max: [60, 'Session timeout cannot exceed 60 minutes']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(_doc, ret) {
      delete (ret as any).escalationPassword;
      return ret;
    }
  }
});

/**
 * Pre-save middleware: Hash escalation password if modified
 */
GlobalAdminSchema.pre('save', async function(next) {
  if (!this.isModified('escalationPassword')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.escalationPassword = await bcrypt.hash(this.escalationPassword, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Compare escalation password
 */
GlobalAdminSchema.methods.compareEscalationPassword = async function(
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, this.escalationPassword);
};

/**
 * Check if admin has a specific role
 */
GlobalAdminSchema.methods.hasRole = function(role: GlobalAdminRole): boolean {
  return this.roleMemberships.some(
    (m: IRoleMembership) => m.isActive && m.roles.includes(role)
  );
};

/**
 * Get all active roles
 */
GlobalAdminSchema.methods.getAllRoles = function(): GlobalAdminRole[] {
  const roles = new Set<GlobalAdminRole>();
  
  for (const membership of this.roleMemberships) {
    if (membership.isActive) {
      for (const role of membership.roles) {
        roles.add(role);
      }
    }
  }
  
  return Array.from(roles);
};

/**
 * Static: Find by user ID and include escalation password
 */
GlobalAdminSchema.statics.findWithPassword = function(userId: Types.ObjectId) {
  return this.findById(userId).select('+escalationPassword');
};

/**
 * Static: Check if user is a GlobalAdmin
 */
GlobalAdminSchema.statics.isGlobalAdmin = async function(
  userId: Types.ObjectId
): Promise<boolean> {
  const admin = await this.findById(userId);
  return !!admin && admin.isActive;
};

// Indexes
GlobalAdminSchema.index({ isActive: 1 });
GlobalAdminSchema.index({ 'roleMemberships.roles': 1 });

export const GlobalAdmin = model<IGlobalAdmin>('GlobalAdmin', GlobalAdminSchema);

export default GlobalAdmin;
