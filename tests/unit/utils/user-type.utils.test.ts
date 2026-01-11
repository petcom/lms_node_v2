/**
 * UserType Utilities Tests
 *
 * Comprehensive test suite for UserType transformation utilities covering:
 * - String to object transformations
 * - Object to string transformations
 * - Display label lookups
 * - Validation helpers
 * - Department membership hydration
 * - Edge cases and error handling
 */

import {
  toUserTypeObjects,
  toUserTypeStrings,
  toRoleObjects,
  toRoleStrings,
  getUserTypeDisplay,
  getRoleDisplay,
  isValidUserType,
  isValidRole,
  validateAndTransformUserTypes,
  hydrateDepartmentMemberships,
  USER_TYPE_DISPLAY,
  ROLE_DISPLAY
} from '@/utils/user-type.utils';

describe('UserType Utilities', () => {
  describe('toUserTypeObjects()', () => {
    it('should convert string array to UserTypeObject array', () => {
      const result = toUserTypeObjects(['learner', 'staff']);

      expect(result).toEqual([
        { _id: 'learner', displayAs: 'Learner' },
        { _id: 'staff', displayAs: 'Staff' }
      ]);
    });

    it('should convert single userType', () => {
      const result = toUserTypeObjects(['learner']);

      expect(result).toEqual([
        { _id: 'learner', displayAs: 'Learner' }
      ]);
    });

    it('should convert all three userTypes', () => {
      const result = toUserTypeObjects(['learner', 'staff', 'global-admin']);

      expect(result).toEqual([
        { _id: 'learner', displayAs: 'Learner' },
        { _id: 'staff', displayAs: 'Staff' },
        { _id: 'global-admin', displayAs: 'System Admin' }
      ]);
    });

    it('should handle empty array', () => {
      const result = toUserTypeObjects([]);

      expect(result).toEqual([]);
    });

    it('should use key as displayAs for unknown userTypes', () => {
      const result = toUserTypeObjects(['unknown']);

      expect(result).toEqual([
        { _id: 'unknown', displayAs: 'unknown' }
      ]);
    });

    it('should handle non-array input gracefully', () => {
      const result = toUserTypeObjects(null as any);

      expect(result).toEqual([]);
    });

    it('should handle undefined input', () => {
      const result = toUserTypeObjects(undefined as any);

      expect(result).toEqual([]);
    });
  });

  describe('toUserTypeStrings()', () => {
    it('should convert UserTypeObject array to string array', () => {
      const input = [
        { _id: 'learner' as const, displayAs: 'Learner' },
        { _id: 'staff' as const, displayAs: 'Staff' }
      ];

      const result = toUserTypeStrings(input);

      expect(result).toEqual(['learner', 'staff']);
    });

    it('should extract _id from objects', () => {
      const input = [
        { _id: 'global-admin' as const, displayAs: 'System Admin' }
      ];

      const result = toUserTypeStrings(input);

      expect(result).toEqual(['global-admin']);
    });

    it('should handle empty array', () => {
      const result = toUserTypeStrings([]);

      expect(result).toEqual([]);
    });

    it('should handle non-array input gracefully', () => {
      const result = toUserTypeStrings(null as any);

      expect(result).toEqual([]);
    });
  });

  describe('toRoleObjects()', () => {
    it('should convert role strings to RoleObject array', () => {
      const result = toRoleObjects(['instructor', 'content-admin']);

      expect(result).toEqual([
        { _id: 'instructor', displayAs: 'Instructor' },
        { _id: 'content-admin', displayAs: 'Content Admin' }
      ]);
    });

    it('should convert staff roles', () => {
      const result = toRoleObjects(['instructor', 'department-admin', 'content-admin', 'billing-admin']);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ _id: 'instructor', displayAs: 'Instructor' });
      expect(result[1]).toEqual({ _id: 'department-admin', displayAs: 'Department Admin' });
    });

    it('should convert learner roles', () => {
      const result = toRoleObjects(['course-taker', 'auditor', 'learner-supervisor']);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ _id: 'course-taker', displayAs: 'Course Taker' });
      expect(result[1]).toEqual({ _id: 'auditor', displayAs: 'Auditor' });
    });

    it('should convert global-admin roles', () => {
      const result = toRoleObjects(['system-admin', 'enrollment-admin']);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ _id: 'system-admin', displayAs: 'System Admin' });
    });

    it('should handle empty array', () => {
      const result = toRoleObjects([]);

      expect(result).toEqual([]);
    });

    it('should use key as displayAs for unknown roles', () => {
      const result = toRoleObjects(['unknown-role']);

      expect(result).toEqual([
        { _id: 'unknown-role', displayAs: 'unknown-role' }
      ]);
    });

    it('should handle non-array input gracefully', () => {
      const result = toRoleObjects(null as any);

      expect(result).toEqual([]);
    });
  });

  describe('toRoleStrings()', () => {
    it('should convert RoleObject array to string array', () => {
      const input = [
        { _id: 'instructor', displayAs: 'Instructor' },
        { _id: 'content-admin', displayAs: 'Content Admin' }
      ];

      const result = toRoleStrings(input);

      expect(result).toEqual(['instructor', 'content-admin']);
    });

    it('should extract _id from role objects', () => {
      const input = [
        { _id: 'system-admin', displayAs: 'System Admin' }
      ];

      const result = toRoleStrings(input);

      expect(result).toEqual(['system-admin']);
    });

    it('should handle empty array', () => {
      const result = toRoleStrings([]);

      expect(result).toEqual([]);
    });

    it('should handle non-array input gracefully', () => {
      const result = toRoleStrings(null as any);

      expect(result).toEqual([]);
    });
  });

  describe('getUserTypeDisplay()', () => {
    it('should return display label for learner', () => {
      expect(getUserTypeDisplay('learner')).toBe('Learner');
    });

    it('should return display label for staff', () => {
      expect(getUserTypeDisplay('staff')).toBe('Staff');
    });

    it('should return display label for global-admin', () => {
      expect(getUserTypeDisplay('global-admin')).toBe('System Admin');
    });

    it('should return key itself for unknown userType', () => {
      expect(getUserTypeDisplay('unknown')).toBe('unknown');
    });

    it('should handle empty string', () => {
      expect(getUserTypeDisplay('')).toBe('');
    });
  });

  describe('getRoleDisplay()', () => {
    it('should return display label for staff roles', () => {
      expect(getRoleDisplay('instructor')).toBe('Instructor');
      expect(getRoleDisplay('department-admin')).toBe('Department Admin');
      expect(getRoleDisplay('content-admin')).toBe('Content Admin');
      expect(getRoleDisplay('billing-admin')).toBe('Billing Admin');
    });

    it('should return display label for learner roles', () => {
      expect(getRoleDisplay('course-taker')).toBe('Course Taker');
      expect(getRoleDisplay('auditor')).toBe('Auditor');
      expect(getRoleDisplay('learner-supervisor')).toBe('Learner Supervisor');
    });

    it('should return display label for global-admin roles', () => {
      expect(getRoleDisplay('system-admin')).toBe('System Admin');
      expect(getRoleDisplay('enrollment-admin')).toBe('Enrollment Admin');
      expect(getRoleDisplay('course-admin')).toBe('Course Admin');
      expect(getRoleDisplay('theme-admin')).toBe('Theme Admin');
      expect(getRoleDisplay('financial-admin')).toBe('Financial Admin');
    });

    it('should return key itself for unknown role', () => {
      expect(getRoleDisplay('unknown-role')).toBe('unknown-role');
    });

    it('should handle empty string', () => {
      expect(getRoleDisplay('')).toBe('');
    });
  });

  describe('isValidUserType()', () => {
    it('should return true for valid userTypes', () => {
      expect(isValidUserType('learner')).toBe(true);
      expect(isValidUserType('staff')).toBe(true);
      expect(isValidUserType('global-admin')).toBe(true);
    });

    it('should return false for invalid userTypes', () => {
      expect(isValidUserType('invalid')).toBe(false);
      expect(isValidUserType('')).toBe(false);
      expect(isValidUserType('admin')).toBe(false);
    });
  });

  describe('isValidRole()', () => {
    it('should return true for valid staff roles', () => {
      expect(isValidRole('instructor')).toBe(true);
      expect(isValidRole('department-admin')).toBe(true);
      expect(isValidRole('content-admin')).toBe(true);
      expect(isValidRole('billing-admin')).toBe(true);
    });

    it('should return true for valid learner roles', () => {
      expect(isValidRole('course-taker')).toBe(true);
      expect(isValidRole('auditor')).toBe(true);
      expect(isValidRole('learner-supervisor')).toBe(true);
    });

    it('should return true for valid global-admin roles', () => {
      expect(isValidRole('system-admin')).toBe(true);
      expect(isValidRole('enrollment-admin')).toBe(true);
      expect(isValidRole('course-admin')).toBe(true);
      expect(isValidRole('theme-admin')).toBe(true);
      expect(isValidRole('financial-admin')).toBe(true);
    });

    it('should return false for invalid roles', () => {
      expect(isValidRole('invalid-role')).toBe(false);
      expect(isValidRole('')).toBe(false);
      expect(isValidRole('admin')).toBe(false);
    });
  });

  describe('validateAndTransformUserTypes()', () => {
    it('should separate valid and invalid userTypes', () => {
      const result = validateAndTransformUserTypes(['learner', 'invalid', 'staff']);

      expect(result.valid).toEqual([
        { _id: 'learner', displayAs: 'Learner' },
        { _id: 'staff', displayAs: 'Staff' }
      ]);
      expect(result.invalid).toEqual(['invalid']);
    });

    it('should handle all valid userTypes', () => {
      const result = validateAndTransformUserTypes(['learner', 'staff', 'global-admin']);

      expect(result.valid).toHaveLength(3);
      expect(result.invalid).toHaveLength(0);
    });

    it('should handle all invalid userTypes', () => {
      const result = validateAndTransformUserTypes(['invalid1', 'invalid2']);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toEqual(['invalid1', 'invalid2']);
    });

    it('should handle empty array', () => {
      const result = validateAndTransformUserTypes([]);

      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([]);
    });

    it('should handle non-array input gracefully', () => {
      const result = validateAndTransformUserTypes(null as any);

      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([]);
    });
  });

  describe('hydrateDepartmentMemberships()', () => {
    it('should hydrate roles in department memberships', () => {
      const memberships = [
        {
          departmentId: 'dept1',
          roles: ['instructor', 'content-admin'],
          isPrimary: true
        }
      ];

      const result = hydrateDepartmentMemberships(memberships);

      expect(result).toEqual([
        {
          departmentId: 'dept1',
          roles: [
            { _id: 'instructor', displayAs: 'Instructor' },
            { _id: 'content-admin', displayAs: 'Content Admin' }
          ],
          isPrimary: true
        }
      ]);
    });

    it('should hydrate multiple memberships', () => {
      const memberships = [
        {
          departmentId: 'dept1',
          roles: ['instructor'],
          isPrimary: true
        },
        {
          departmentId: 'dept2',
          roles: ['department-admin', 'billing-admin'],
          isPrimary: false
        }
      ];

      const result = hydrateDepartmentMemberships(memberships);

      expect(result).toHaveLength(2);
      expect(result[0].roles).toEqual([
        { _id: 'instructor', displayAs: 'Instructor' }
      ]);
      expect(result[1].roles).toEqual([
        { _id: 'department-admin', displayAs: 'Department Admin' },
        { _id: 'billing-admin', displayAs: 'Billing Admin' }
      ]);
    });

    it('should preserve other membership properties', () => {
      const memberships = [
        {
          departmentId: 'dept1',
          roles: ['instructor'],
          isPrimary: true,
          joinedAt: new Date('2024-01-01'),
          isActive: true
        }
      ];

      const result = hydrateDepartmentMemberships(memberships);

      expect(result[0].departmentId).toBe('dept1');
      expect(result[0].isPrimary).toBe(true);
      expect(result[0].joinedAt).toEqual(new Date('2024-01-01'));
      expect(result[0].isActive).toBe(true);
    });

    it('should handle empty memberships array', () => {
      const result = hydrateDepartmentMemberships([]);

      expect(result).toEqual([]);
    });

    it('should handle non-array input gracefully', () => {
      const result = hydrateDepartmentMemberships(null as any);

      expect(result).toEqual([]);
    });

    it('should handle empty roles in membership', () => {
      const memberships = [
        {
          departmentId: 'dept1',
          roles: [],
          isPrimary: true
        }
      ];

      const result = hydrateDepartmentMemberships(memberships);

      expect(result[0].roles).toEqual([]);
    });
  });

  describe('Constants', () => {
    describe('USER_TYPE_DISPLAY', () => {
      it('should have all three userTypes', () => {
        expect(Object.keys(USER_TYPE_DISPLAY)).toHaveLength(3);
        expect(USER_TYPE_DISPLAY).toHaveProperty('learner');
        expect(USER_TYPE_DISPLAY).toHaveProperty('staff');
        expect(USER_TYPE_DISPLAY).toHaveProperty('global-admin');
      });

      it('should have correct display labels', () => {
        expect(USER_TYPE_DISPLAY.learner).toBe('Learner');
        expect(USER_TYPE_DISPLAY.staff).toBe('Staff');
        expect(USER_TYPE_DISPLAY['global-admin']).toBe('System Admin');
      });
    });

    describe('ROLE_DISPLAY', () => {
      it('should have all 12 roles', () => {
        expect(Object.keys(ROLE_DISPLAY)).toHaveLength(12);
      });

      it('should have all staff roles', () => {
        expect(ROLE_DISPLAY).toHaveProperty('instructor');
        expect(ROLE_DISPLAY).toHaveProperty('department-admin');
        expect(ROLE_DISPLAY).toHaveProperty('content-admin');
        expect(ROLE_DISPLAY).toHaveProperty('billing-admin');
      });

      it('should have all learner roles', () => {
        expect(ROLE_DISPLAY).toHaveProperty('course-taker');
        expect(ROLE_DISPLAY).toHaveProperty('auditor');
        expect(ROLE_DISPLAY).toHaveProperty('learner-supervisor');
      });

      it('should have all global-admin roles', () => {
        expect(ROLE_DISPLAY).toHaveProperty('system-admin');
        expect(ROLE_DISPLAY).toHaveProperty('enrollment-admin');
        expect(ROLE_DISPLAY).toHaveProperty('course-admin');
        expect(ROLE_DISPLAY).toHaveProperty('theme-admin');
        expect(ROLE_DISPLAY).toHaveProperty('financial-admin');
      });
    });
  });

  describe('Round-trip Transformations', () => {
    it('should maintain data integrity for userTypes', () => {
      const original = ['learner', 'staff'];
      const objects = toUserTypeObjects(original);
      const backToStrings = toUserTypeStrings(objects);

      expect(backToStrings).toEqual(original);
    });

    it('should maintain data integrity for roles', () => {
      const original = ['instructor', 'content-admin'];
      const objects = toRoleObjects(original);
      const backToStrings = toRoleStrings(objects);

      expect(backToStrings).toEqual(original);
    });

    it('should handle all userTypes in round-trip', () => {
      const original = ['learner', 'staff', 'global-admin'];
      const objects = toUserTypeObjects(original);
      const backToStrings = toUserTypeStrings(objects);

      expect(backToStrings).toEqual(original);
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with API response transformation', () => {
      // Simulating JWT data
      const jwtUserTypes = ['learner', 'staff'];

      // Transform for API response
      const userTypeObjects = toUserTypeObjects(jwtUserTypes);

      expect(userTypeObjects).toEqual([
        { _id: 'learner', displayAs: 'Learner' },
        { _id: 'staff', displayAs: 'Staff' }
      ]);
    });

    it('should work with department membership hydration', () => {
      // Simulating Staff model data
      const staffData = {
        _id: 'user123',
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: 'dept1',
            roles: ['instructor', 'content-admin'],
            isPrimary: true
          }
        ]
      };

      // Hydrate for API response
      const hydrated = hydrateDepartmentMemberships(staffData.departmentMemberships);

      expect(hydrated[0].roles).toEqual([
        { _id: 'instructor', displayAs: 'Instructor' },
        { _id: 'content-admin', displayAs: 'Content Admin' }
      ]);
    });

    it('should validate userTypes before transformation', () => {
      const mixedUserTypes = ['learner', 'invalid', 'staff'];
      const { valid, invalid } = validateAndTransformUserTypes(mixedUserTypes);

      expect(valid).toHaveLength(2);
      expect(invalid).toHaveLength(1);

      // Use only valid userTypes in response
      const validUserTypes = valid.map(v => v._id);
      expect(validUserTypes).toEqual(['learner', 'staff']);
    });
  });
});
