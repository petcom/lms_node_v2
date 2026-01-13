import mongoose, { Schema, Document } from 'mongoose';
import { DepartmentMembershipSchema, IDepartmentMembership } from './department-membership.schema';
import { RoleRegistry } from '@/services/role-registry.service';
import { IPerson, PersonSchema } from './Person.types';
import { ILearnerPersonExtended, LearnerPersonExtendedSchema } from './PersonExtended.types';
import { IDemographics, DemographicsSchema } from './Demographics.types';

/**
 * Learner Model Interface
 *
 * ⚠️ BREAKING CHANGES (v2.0.0):
 * - person field is now REQUIRED (was optional)
 * - firstName, lastName, phoneNumber, dateOfBirth, address, emergencyContact REMOVED
 *   Use person.firstName, person.lastName, person.phones, person.dateOfBirth, person.addresses instead
 * - emergencyContact → personExtended.emergencyContacts (now array, more robust)
 * - Added personExtended (ILearnerPersonExtended) for learner-specific data
 * - Added demographics (IDemographics) for compliance/reporting
 */
export interface ILearner extends Document {
  _id: mongoose.Types.ObjectId; // Shared with User

  // Three-layer person architecture
  person: IPerson;                             // REQUIRED: Basic person data (contact, identity)
  personExtended?: ILearnerPersonExtended;     // OPTIONAL: Learner-specific data (emergency contacts, accommodations)
  demographics?: IDemographics;                // OPTIONAL: Compliance/reporting data

  // Learner-specific fields (not personal data)
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
    // Three-layer person architecture
    person: {
      type: PersonSchema,
      required: true  // ⚠️ BREAKING CHANGE: Now required (was optional)
    },
    personExtended: {
      type: LearnerPersonExtendedSchema,
      required: false
    },
    demographics: {
      type: DemographicsSchema,
      required: false
    },
    // Learner-specific fields (not personal data)
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

// Indexes (_id index created automatically by MongoDB)
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
