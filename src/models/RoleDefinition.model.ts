/**
 * RoleDefinition Model
 * 
 * Database-stored role definitions that map roles to access rights.
 * Allows dynamic role management while maintaining code defaults.
 * 
 * Roles are categorized by userType:
 * - learner: course-taker, auditor, learner-supervisor
 * - staff: instructor, department-admin, content-admin, billing-admin
 * - global-admin: system-admin, enrollment-admin, course-admin, theme-admin, financial-admin
 * 
 * @module models/RoleDefinition
 */

import { Schema, model, Document, Types, Model } from 'mongoose';

// Valid user types
export const USER_TYPES = ['learner', 'staff', 'global-admin'] as const;
export type UserType = typeof USER_TYPES[number];

// Valid roles by userType
export const LEARNER_ROLES = ['course-taker', 'auditor', 'learner-supervisor'] as const;
export const STAFF_ROLES = ['instructor', 'department-admin', 'content-admin', 'billing-admin'] as const;
export const GLOBAL_ADMIN_ROLES = ['system-admin', 'enrollment-admin', 'course-admin', 'theme-admin', 'financial-admin'] as const;

export type LearnerRole = typeof LEARNER_ROLES[number];
export type StaffRole = typeof STAFF_ROLES[number];
export type GlobalAdminRole = typeof GLOBAL_ADMIN_ROLES[number];
export type AnyRole = LearnerRole | StaffRole | GlobalAdminRole;

/**
 * RoleDefinition document interface
 */
export interface IRoleDefinition extends Document {
  _id: Types.ObjectId;

  /** Role identifier (e.g., 'instructor', 'content-admin') */
  name: string;

  /** Which userType this role belongs to */
  userType: UserType;

  /** Human-readable name */
  displayName: string;

  /** Description of role purpose */
  description: string;

  /** Access rights granted by this role */
  accessRights: string[];

  /** Is this a default role for new memberships? */
  isDefault: boolean;

  /** Display order in UI */
  sortOrder: number;

  /** Is this role active? */
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * RoleDefinition model interface with statics
 */
export interface IRoleDefinitionModel extends Model<IRoleDefinition> {
  findByUserType(userType: UserType): Promise<IRoleDefinition[]>;
  findByName(name: string): Promise<IRoleDefinition | null>;
  getAccessRights(roleName: string): Promise<string[]>;
  getCombinedAccessRights(roleNames: string[]): Promise<string[]>;
  isValidRoleForUserType(roleName: string, userType: UserType): boolean;
}

/**
 * RoleDefinition schema
 */
const RoleDefinitionSchema = new Schema<IRoleDefinition>({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        // Must be a valid role name
        const allRoles = [...LEARNER_ROLES, ...STAFF_ROLES, ...GLOBAL_ADMIN_ROLES];
        return allRoles.includes(v as AnyRole);
      },
      message: (props: { value: string }) => `${props.value} is not a valid role name`
    }
  },
  userType: {
    type: String,
    required: [true, 'UserType is required'],
    enum: {
      values: USER_TYPES,
      message: '{VALUE} is not a valid userType'
    }
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required']
  },
  description: {
    type: String,
    default: ''
  },
  accessRights: {
    type: [String],
    default: [],
    validate: {
      validator: function(v: string[]) {
        // All access rights must follow pattern: domain:resource:action
        const pattern = /^[a-z]+:[a-z-]+:[a-z-]+$|^[a-z]+:\*$/;
        return v.every(right => pattern.test(right));
      },
      message: 'Access rights must follow pattern: domain:resource:action'
    }
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Indexes
RoleDefinitionSchema.index({ userType: 1, isActive: 1 });
RoleDefinitionSchema.index({ name: 1 }, { unique: true });

/**
 * Static: Get roles by userType
 */
RoleDefinitionSchema.statics.findByUserType = function(userType: UserType) {
  return this.find({ userType, isActive: true }).sort({ sortOrder: 1 });
};

/**
 * Static: Get role by name
 */
RoleDefinitionSchema.statics.findByName = function(name: string) {
  return this.findOne({ name: name.toLowerCase(), isActive: true });
};

/**
 * Static: Get access rights for a role
 */
RoleDefinitionSchema.statics.getAccessRights = async function(
  roleName: string
): Promise<string[]> {
  const role = await this.findOne({ name: roleName.toLowerCase() });
  return role?.accessRights || [];
};

/**
 * Static: Get combined access rights for multiple roles
 */
RoleDefinitionSchema.statics.getCombinedAccessRights = async function(
  roleNames: string[]
): Promise<string[]> {
  const roles = await this.find({ 
    name: { $in: roleNames.map(r => r.toLowerCase()) },
    isActive: true
  });
  
  const rightsSet = new Set<string>();
  for (const role of roles) {
    for (const right of role.accessRights) {
      rightsSet.add(right);
    }
  }
  
  return Array.from(rightsSet);
};

/**
 * Static: Validate role is valid for userType
 */
RoleDefinitionSchema.statics.isValidRoleForUserType = function(
  roleName: string,
  userType: UserType
): boolean {
  switch (userType) {
    case 'learner':
      return (LEARNER_ROLES as readonly string[]).includes(roleName);
    case 'staff':
      return (STAFF_ROLES as readonly string[]).includes(roleName);
    case 'global-admin':
      return (GLOBAL_ADMIN_ROLES as readonly string[]).includes(roleName);
    default:
      return false;
  }
};

export const RoleDefinition = model<IRoleDefinition, IRoleDefinitionModel>('RoleDefinition', RoleDefinitionSchema);

export default RoleDefinition;
