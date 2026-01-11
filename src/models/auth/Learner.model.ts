import mongoose, { Schema, Document } from 'mongoose';
import { DepartmentMembershipSchema, IDepartmentMembership } from './department-membership.schema';
import { RoleRegistry } from '@/services/role-registry.service';

export interface ILearner extends Document {
  _id: mongoose.Types.ObjectId; // Shared with User
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  phoneNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phoneNumber?: string;
  };
  departmentMemberships: IDepartmentMembership[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  getRolesForDepartment(deptId: mongoose.Types.ObjectId): string[];
  hasDepartmentRole(deptId: mongoose.Types.ObjectId, role: string): boolean;
}

const learnerSchema = new Schema<ILearner>(
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
    dateOfBirth: {
      type: Date
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phoneNumber: String
    },
    departmentMemberships: {
      type: [DepartmentMembershipSchema],
      default: [],
      validate: {
        validator: function(memberships: IDepartmentMembership[]) {
          // Validate role names against RoleRegistry
          const registry = RoleRegistry.getInstance();
          if (!registry.isInitialized()) {
            // During seeding/testing, allow any roles
            return true;
          }
          return memberships.every(m =>
            m.roles.every(r => registry.isValidRoleForUserType('learner', r))
          );
        },
        message: function() {
          const registry = RoleRegistry.getInstance();
          if (!registry.isInitialized()) {
            return 'Invalid learner role (registry not initialized)';
          }
          const validRoles = registry.getValidRolesForUserType('learner');
          return `Invalid learner role. Must be one of: ${validRoles.join(', ')}`;
        }
      }
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
learnerSchema.index({ _id: 1 });
learnerSchema.index({ isActive: 1 });
learnerSchema.index({ 'departmentMemberships.departmentId': 1 });

// Methods
learnerSchema.methods.getRolesForDepartment = function(deptId: mongoose.Types.ObjectId): string[] {
  const membership = this.departmentMemberships.find(
    (m: IDepartmentMembership) => m.departmentId.equals(deptId) && m.isActive
  );
  return membership ? membership.roles : [];
};

learnerSchema.methods.hasDepartmentRole = function(deptId: mongoose.Types.ObjectId, role: string): boolean {
  const roles = this.getRolesForDepartment(deptId);
  return roles.includes(role);
};

export const Learner = mongoose.model<ILearner>('Learner', learnerSchema);
