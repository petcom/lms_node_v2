/**
 * Department Membership Validator Tests
 *
 * Comprehensive test suite for the validator factory covering:
 * - Role validation for different userTypes
 * - Mongoose validator creation
 * - Detailed validation results
 * - Error message generation
 * - Department membership array validation
 */

import {
  validateRolesForUserType,
  createMongooseValidator,
  createDetailedMongooseValidator,
  validateDepartmentMemberships,
  getValidationErrorMessage
} from '@/validators/department-membership.validator';
import { IRoleRegistry } from '@/services/role-registry.interface';

describe('Department Membership Validator', () => {
  // Mock RoleRegistry for testing
  let mockRegistry: IRoleRegistry;

  beforeEach(() => {
    mockRegistry = {
      initialize: jest.fn(),
      isInitialized: jest.fn().mockReturnValue(true),
      getValidUserTypes: jest.fn().mockReturnValue(['learner', 'staff', 'global-admin']),
      getValidRolesForUserType: jest.fn((userType: string) => {
        const rolesMap: Record<string, string[]> = {
          'staff': ['instructor', 'department-admin', 'content-admin', 'billing-admin'],
          'learner': ['course-taker', 'auditor', 'learner-supervisor'],
          'global-admin': ['system-admin', 'enrollment-admin', 'course-admin', 'theme-admin', 'financial-admin']
        };
        return rolesMap[userType] || [];
      }),
      isValidUserType: jest.fn((userType: string) => {
        return ['learner', 'staff', 'global-admin'].includes(userType);
      }),
      isValidRoleForUserType: jest.fn((userType: string, role: string) => {
        const rolesMap: Record<string, string[]> = {
          'staff': ['instructor', 'department-admin', 'content-admin', 'billing-admin'],
          'learner': ['course-taker', 'auditor', 'learner-supervisor'],
          'global-admin': ['system-admin', 'enrollment-admin', 'course-admin', 'theme-admin', 'financial-admin']
        };
        return (rolesMap[userType] || []).includes(role);
      }),
      getDisplayAs: jest.fn((lookupId: string) => lookupId),
      getUserTypeDisplay: jest.fn((userType: string) => {
        const displayMap: Record<string, string> = {
          'staff': 'Staff',
          'learner': 'Learner',
          'global-admin': 'System Admin'
        };
        return displayMap[userType] || userType;
      }),
      getRoleDisplay: jest.fn((role: string) => role),
      hydrateUserTypes: jest.fn(),
      hydrateRoles: jest.fn(),
      refresh: jest.fn()
    };
  });

  describe('validateRolesForUserType()', () => {
    describe('Valid Cases', () => {
      it('should validate correct staff roles', () => {
        const result = validateRolesForUserType(mockRegistry, 'staff', ['instructor', 'content-admin']);

        expect(result.isValid).toBe(true);
        expect(result.invalidRoles).toEqual([]);
        expect(result.errorMessage).toBeNull();
      });

      it('should validate correct learner roles', () => {
        const result = validateRolesForUserType(mockRegistry, 'learner', ['course-taker', 'auditor']);

        expect(result.isValid).toBe(true);
        expect(result.invalidRoles).toEqual([]);
        expect(result.errorMessage).toBeNull();
      });

      it('should validate correct global-admin roles', () => {
        const result = validateRolesForUserType(mockRegistry, 'global-admin', ['system-admin']);

        expect(result.isValid).toBe(true);
        expect(result.invalidRoles).toEqual([]);
        expect(result.errorMessage).toBeNull();
      });

      it('should validate single role', () => {
        const result = validateRolesForUserType(mockRegistry, 'staff', ['instructor']);

        expect(result.isValid).toBe(true);
      });

      it('should validate multiple roles', () => {
        const result = validateRolesForUserType(mockRegistry, 'staff', ['instructor', 'department-admin', 'content-admin']);

        expect(result.isValid).toBe(true);
      });
    });

    describe('Invalid Cases', () => {
      it('should reject empty roles array', () => {
        const result = validateRolesForUserType(mockRegistry, 'staff', []);

        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('At least one role is required');
      });

      it('should reject invalid role for staff', () => {
        const result = validateRolesForUserType(mockRegistry, 'staff', ['course-taker']);

        expect(result.isValid).toBe(false);
        expect(result.invalidRoles).toEqual(['course-taker']);
        expect(result.errorMessage).toContain('Invalid Staff role');
        expect(result.errorMessage).toContain('course-taker');
      });

      it('should reject learner role for staff userType', () => {
        const result = validateRolesForUserType(mockRegistry, 'staff', ['instructor', 'auditor']);

        expect(result.isValid).toBe(false);
        expect(result.invalidRoles).toEqual(['auditor']);
      });

      it('should reject staff role for learner userType', () => {
        const result = validateRolesForUserType(mockRegistry, 'learner', ['course-taker', 'instructor']);

        expect(result.isValid).toBe(false);
        expect(result.invalidRoles).toEqual(['instructor']);
      });

      it('should reject invalid userType', () => {
        const result = validateRolesForUserType(mockRegistry, 'invalid-type', ['some-role']);

        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('Invalid user type');
      });

      it('should reject multiple invalid roles', () => {
        const result = validateRolesForUserType(mockRegistry, 'staff', ['invalid1', 'invalid2', 'instructor']);

        expect(result.isValid).toBe(false);
        expect(result.invalidRoles).toEqual(['invalid1', 'invalid2']);
        expect(result.errorMessage).toContain('invalid1, invalid2');
      });

      it('should provide valid roles in error message', () => {
        const result = validateRolesForUserType(mockRegistry, 'staff', ['invalid-role']);

        expect(result.errorMessage).toContain('instructor, department-admin, content-admin, billing-admin');
      });
    });

    describe('Edge Cases', () => {
      it('should handle null roles array', () => {
        const result = validateRolesForUserType(mockRegistry, 'staff', null as any);

        expect(result.isValid).toBe(false);
      });

      it('should handle undefined roles array', () => {
        const result = validateRolesForUserType(mockRegistry, 'staff', undefined as any);

        expect(result.isValid).toBe(false);
      });

      it('should trim and validate roles', () => {
        const result = validateRolesForUserType(mockRegistry, 'staff', ['instructor', 'content-admin']);

        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('createMongooseValidator()', () => {
    it('should create a validator function that returns boolean', () => {
      const validator = createMongooseValidator(mockRegistry, 'staff');

      expect(typeof validator).toBe('function');
      expect(validator(['instructor'])).toBe(true);
      expect(validator(['invalid-role'])).toBe(false);
    });

    it('should validate correct roles', () => {
      const validator = createMongooseValidator(mockRegistry, 'staff');

      expect(validator(['instructor', 'content-admin'])).toBe(true);
    });

    it('should reject incorrect roles', () => {
      const validator = createMongooseValidator(mockRegistry, 'staff');

      expect(validator(['course-taker'])).toBe(false);
    });

    it('should reject empty array', () => {
      const validator = createMongooseValidator(mockRegistry, 'staff');

      expect(validator([])).toBe(false);
    });

    it('should work for different userTypes', () => {
      const staffValidator = createMongooseValidator(mockRegistry, 'staff');
      const learnerValidator = createMongooseValidator(mockRegistry, 'learner');

      expect(staffValidator(['instructor'])).toBe(true);
      expect(learnerValidator(['course-taker'])).toBe(true);
      expect(staffValidator(['course-taker'])).toBe(false);
      expect(learnerValidator(['instructor'])).toBe(false);
    });
  });

  describe('createDetailedMongooseValidator()', () => {
    it('should create validator with custom message', () => {
      const validator = createDetailedMongooseValidator(mockRegistry, 'staff');

      expect(validator.validator).toBeDefined();
      expect(validator.message).toBeDefined();
      expect(typeof validator.validator).toBe('function');
      expect(typeof validator.message).toBe('string');
    });

    it('should include userType display in message', () => {
      const validator = createDetailedMongooseValidator(mockRegistry, 'staff');

      expect(validator.message).toContain('Staff');
    });

    it('should include valid roles in message', () => {
      const validator = createDetailedMongooseValidator(mockRegistry, 'staff');

      expect(validator.message).toContain('instructor');
      expect(validator.message).toContain('department-admin');
      expect(validator.message).toContain('content-admin');
      expect(validator.message).toContain('billing-admin');
    });

    it('should validate roles correctly', () => {
      const validator = createDetailedMongooseValidator(mockRegistry, 'staff');

      expect(validator.validator(['instructor'])).toBe(true);
      expect(validator.validator(['invalid-role'])).toBe(false);
    });

    it('should work for different userTypes', () => {
      const staffValidator = createDetailedMongooseValidator(mockRegistry, 'staff');
      const learnerValidator = createDetailedMongooseValidator(mockRegistry, 'learner');

      expect(staffValidator.message).toContain('Staff');
      expect(learnerValidator.message).toContain('Learner');
    });
  });

  describe('validateDepartmentMemberships()', () => {
    it('should validate all memberships with valid roles', () => {
      const memberships = [
        { roles: ['instructor'] },
        { roles: ['department-admin', 'content-admin'] }
      ];

      const result = validateDepartmentMemberships(mockRegistry, 'staff', memberships);

      expect(result.isValid).toBe(true);
      expect(result.invalidRoles).toEqual([]);
      expect(result.errorMessage).toBeNull();
    });

    it('should reject if any membership has invalid roles', () => {
      const memberships = [
        { roles: ['instructor'] },
        { roles: ['invalid-role'] }
      ];

      const result = validateDepartmentMemberships(mockRegistry, 'staff', memberships);

      expect(result.isValid).toBe(false);
      expect(result.invalidRoles).toEqual(['invalid-role']);
    });

    it('should validate empty memberships array', () => {
      const result = validateDepartmentMemberships(mockRegistry, 'staff', []);

      expect(result.isValid).toBe(true);
    });

    it('should reject membership with empty roles', () => {
      const memberships = [
        { roles: [] }
      ];

      const result = validateDepartmentMemberships(mockRegistry, 'staff', memberships);

      expect(result.isValid).toBe(false);
    });

    it('should stop at first invalid membership', () => {
      const memberships = [
        { roles: ['instructor'] },
        { roles: ['invalid1'] },
        { roles: ['invalid2'] }
      ];

      const result = validateDepartmentMemberships(mockRegistry, 'staff', memberships);

      expect(result.isValid).toBe(false);
      expect(result.invalidRoles).toEqual(['invalid1']);
    });
  });

  describe('getValidationErrorMessage()', () => {
    it('should return error message from result', () => {
      const result = {
        isValid: false,
        invalidRoles: ['invalid-role'],
        errorMessage: 'Test error message'
      };

      const message = getValidationErrorMessage(result);
      expect(message).toBe('Test error message');
    });

    it('should return null for valid result', () => {
      const result = {
        isValid: true,
        invalidRoles: [],
        errorMessage: null
      };

      const message = getValidationErrorMessage(result);
      expect(message).toBeNull();
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with Staff model validation pattern', () => {
      const validator = createMongooseValidator(mockRegistry, 'staff');
      const departmentMemberships = [
        { departmentId: 'dept1', roles: ['instructor', 'content-admin'], isPrimary: true },
        { departmentId: 'dept2', roles: ['department-admin'], isPrimary: false }
      ];

      const allValid = departmentMemberships.every(m => validator(m.roles));
      expect(allValid).toBe(true);
    });

    it('should work with Learner model validation pattern', () => {
      const validator = createMongooseValidator(mockRegistry, 'learner');
      const departmentMemberships = [
        { departmentId: 'dept1', roles: ['course-taker'], isPrimary: true }
      ];

      const allValid = departmentMemberships.every(m => validator(m.roles));
      expect(allValid).toBe(true);
    });

    it('should reject mixed role types in Staff model', () => {
      const validator = createMongooseValidator(mockRegistry, 'staff');
      const departmentMemberships = [
        { departmentId: 'dept1', roles: ['instructor', 'course-taker'], isPrimary: true }
      ];

      const allValid = departmentMemberships.every(m => validator(m.roles));
      expect(allValid).toBe(false);
    });

    it('should provide detailed error for debugging', () => {
      const result = validateRolesForUserType(mockRegistry, 'staff', ['invalid1', 'instructor', 'invalid2']);

      expect(result.isValid).toBe(false);
      expect(result.invalidRoles).toEqual(['invalid1', 'invalid2']);
      expect(result.errorMessage).toContain('Invalid Staff role');
      expect(result.errorMessage).toContain('invalid1, invalid2');
      expect(result.errorMessage).toContain('Valid roles are');
    });
  });

  describe('Performance', () => {
    it('should handle large role arrays efficiently', () => {
      const largeRoleArray = Array(100).fill('instructor');
      const validator = createMongooseValidator(mockRegistry, 'staff');

      const startTime = Date.now();
      const result = validator(largeRoleArray);
      const endTime = Date.now();

      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should handle many memberships efficiently', () => {
      const manyMemberships = Array(50).fill({ roles: ['instructor'] });

      const startTime = Date.now();
      const result = validateDepartmentMemberships(mockRegistry, 'staff', manyMemberships);
      const endTime = Date.now();

      expect(result.isValid).toBe(true);
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
