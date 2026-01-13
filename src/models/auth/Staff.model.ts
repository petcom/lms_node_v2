import mongoose, { Schema, Document } from 'mongoose';
import { RoleRegistry } from '@/services/role-registry.service';
import { IPerson, PersonSchema } from './Person.types';
import { IStaffPersonExtended, StaffPersonExtendedSchema } from './PersonExtended.types';
import { IDemographics, DemographicsSchema } from './Demographics.types';

export interface IDepartmentMembership {
  departmentId: mongoose.Types.ObjectId;
  roles: string[];
  isPrimary: boolean;
  joinedAt: Date;
  isActive: boolean;
}

/**
 * Staff Model Interface
 *
 * ⚠️ BREAKING CHANGES (v2.0.0):
 * - person field is now REQUIRED (was optional)
 * - firstName, lastName, phoneNumber REMOVED (use person.firstName, person.lastName, person.phones)
 * - Added personExtended (IStaffPersonExtended) for staff-specific data
 * - Added demographics (IDemographics) for compliance/reporting
 */
export interface IStaff extends Document {
  _id: mongoose.Types.ObjectId; // Shared with User

  // Three-layer person architecture
  person: IPerson;                           // REQUIRED: Basic person data (contact, identity)
  personExtended?: IStaffPersonExtended;     // OPTIONAL: Staff-specific data (credentials, publications, office hours)
  demographics?: IDemographics;              // OPTIONAL: Compliance/reporting data

  // Staff-specific fields (not personal data)
  title?: string;                            // Job title (e.g., "Instructor", "Professor")
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
          // Use RoleRegistry for validation
          const registry = RoleRegistry.getInstance();
          if (!registry.isInitialized()) {
            // During seeding/testing, allow any roles
            return true;
          }
          return roles.every(role => registry.isValidRoleForUserType('staff', role));
        },
        message: function() {
          const registry = RoleRegistry.getInstance();
          if (!registry.isInitialized()) {
            return 'Invalid staff role (registry not initialized)';
          }
          const validRoles = registry.getValidRolesForUserType('staff');
          return `Invalid staff role. Must be one of: ${validRoles.join(', ')}`;
        }
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
    // Three-layer person architecture
    person: {
      type: PersonSchema,
      required: true  // ⚠️ BREAKING CHANGE: Now required (was optional)
    },
    personExtended: {
      type: StaffPersonExtendedSchema,
      required: false
    },
    demographics: {
      type: DemographicsSchema,
      required: false
    },
    // Staff-specific fields (not personal data)
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

// Indexes (_id index created automatically by MongoDB)
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
