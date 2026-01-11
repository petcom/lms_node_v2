/**
 * RoleRegistry Service Tests
 *
 * Comprehensive test suite for the RoleRegistry service covering:
 * - Initialization and singleton pattern
 * - Cache building and data loading
 * - Validation methods
 * - Hydration/transformation methods
 * - Error handling
 * - Refresh functionality
 */

import { RoleRegistry } from '@/services/role-registry.service';
import { IRoleRegistry } from '@/services/role-registry.interface';

describe('RoleRegistry Service', () => {
  // Mock lookup data matching the contract specification
  const mockLookupValues = [
    // UserTypes
    { lookupId: 'userType.learner', category: 'userType', key: 'learner', parentLookupId: null, displayAs: 'Learner', isActive: true, sortOrder: 1 },
    { lookupId: 'userType.staff', category: 'userType', key: 'staff', parentLookupId: null, displayAs: 'Staff', isActive: true, sortOrder: 2 },
    { lookupId: 'userType.global-admin', category: 'userType', key: 'global-admin', parentLookupId: null, displayAs: 'System Admin', isActive: true, sortOrder: 3 },
    // Staff Roles
    { lookupId: 'role.instructor', category: 'role', key: 'instructor', parentLookupId: 'userType.staff', displayAs: 'Instructor', isActive: true, sortOrder: 1 },
    { lookupId: 'role.department-admin', category: 'role', key: 'department-admin', parentLookupId: 'userType.staff', displayAs: 'Department Admin', isActive: true, sortOrder: 2 },
    { lookupId: 'role.content-admin', category: 'role', key: 'content-admin', parentLookupId: 'userType.staff', displayAs: 'Content Admin', isActive: true, sortOrder: 3 },
    { lookupId: 'role.billing-admin', category: 'role', key: 'billing-admin', parentLookupId: 'userType.staff', displayAs: 'Billing Admin', isActive: true, sortOrder: 4 },
    // Learner Roles
    { lookupId: 'role.course-taker', category: 'role', key: 'course-taker', parentLookupId: 'userType.learner', displayAs: 'Course Taker', isActive: true, sortOrder: 1 },
    { lookupId: 'role.auditor', category: 'role', key: 'auditor', parentLookupId: 'userType.learner', displayAs: 'Auditor', isActive: true, sortOrder: 2 },
    { lookupId: 'role.learner-supervisor', category: 'role', key: 'learner-supervisor', parentLookupId: 'userType.learner', displayAs: 'Learner Supervisor', isActive: true, sortOrder: 3 },
    // GlobalAdmin Roles
    { lookupId: 'role.system-admin', category: 'role', key: 'system-admin', parentLookupId: 'userType.global-admin', displayAs: 'System Admin', isActive: true, sortOrder: 1 },
    { lookupId: 'role.enrollment-admin', category: 'role', key: 'enrollment-admin', parentLookupId: 'userType.global-admin', displayAs: 'Enrollment Admin', isActive: true, sortOrder: 2 },
    { lookupId: 'role.course-admin', category: 'role', key: 'course-admin', parentLookupId: 'userType.global-admin', displayAs: 'Course Admin', isActive: true, sortOrder: 3 },
    { lookupId: 'role.theme-admin', category: 'role', key: 'theme-admin', parentLookupId: 'userType.global-admin', displayAs: 'Theme Admin', isActive: true, sortOrder: 4 },
    { lookupId: 'role.financial-admin', category: 'role', key: 'financial-admin', parentLookupId: 'userType.global-admin', displayAs: 'Financial Admin', isActive: true, sortOrder: 5 },
  ];

  let registry: IRoleRegistry;

  beforeEach(() => {
    // Reset singleton instance before each test
    RoleRegistry.resetInstance();
    registry = RoleRegistry.getInstance();

    // Set mock data loader
    (registry as any).setDataLoader(async () => mockLookupValues);
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = RoleRegistry.getInstance();
      const instance2 = RoleRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create a new instance after reset', () => {
      const instance1 = RoleRegistry.getInstance();
      RoleRegistry.resetInstance();
      const instance2 = RoleRegistry.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('initialize()', () => {
    it('should load all lookup values and build caches', async () => {
      await registry.initialize();

      expect(registry.isInitialized()).toBe(true);
      expect(registry.getValidUserTypes()).toHaveLength(3);
    });

    it('should throw error if no lookup values found', async () => {
      (registry as any).setDataLoader(async () => []);

      await expect(registry.initialize()).rejects.toThrow(
        'FATAL: No lookup values found in database'
      );
    });

    it('should skip inactive lookup values', async () => {
      const dataWithInactive = [
        ...mockLookupValues,
        { lookupId: 'userType.inactive', category: 'userType', key: 'inactive', parentLookupId: null, displayAs: 'Inactive', isActive: false, sortOrder: 99 }
      ];

      (registry as any).setDataLoader(async () => dataWithInactive);
      await registry.initialize();

      expect(registry.isValidUserType('inactive')).toBe(false);
    });

    it('should sort roles by sortOrder', async () => {
      await registry.initialize();

      const staffRoles = registry.getValidRolesForUserType('staff');
      expect(staffRoles).toEqual(['instructor', 'department-admin', 'content-admin', 'billing-admin']);
    });
  });

  describe('isInitialized()', () => {
    it('should return false before initialization', () => {
      expect(registry.isInitialized()).toBe(false);
    });

    it('should return true after successful initialization', async () => {
      await registry.initialize();
      expect(registry.isInitialized()).toBe(true);
    });

    it('should return false if initialization failed', async () => {
      (registry as any).setDataLoader(async () => {
        throw new Error('Database error');
      });

      try {
        await registry.initialize();
      } catch (e) {
        // Expected error
      }

      expect(registry.isInitialized()).toBe(false);
    });
  });

  describe('getValidUserTypes()', () => {
    it('should return all valid userType keys', async () => {
      await registry.initialize();

      const userTypes = registry.getValidUserTypes();
      expect(userTypes).toEqual(expect.arrayContaining(['learner', 'staff', 'global-admin']));
      expect(userTypes).toHaveLength(3);
    });

    it('should throw error if not initialized', () => {
      expect(() => registry.getValidUserTypes()).toThrow('RoleRegistry not initialized');
    });
  });

  describe('getValidRolesForUserType()', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should return staff roles for userType=staff', () => {
      const roles = registry.getValidRolesForUserType('staff');
      expect(roles).toEqual(['instructor', 'department-admin', 'content-admin', 'billing-admin']);
    });

    it('should return learner roles for userType=learner', () => {
      const roles = registry.getValidRolesForUserType('learner');
      expect(roles).toEqual(['course-taker', 'auditor', 'learner-supervisor']);
    });

    it('should return global-admin roles for userType=global-admin', () => {
      const roles = registry.getValidRolesForUserType('global-admin');
      expect(roles).toEqual(['system-admin', 'enrollment-admin', 'course-admin', 'theme-admin', 'financial-admin']);
    });

    it('should return empty array for invalid userType', () => {
      const roles = registry.getValidRolesForUserType('invalid');
      expect(roles).toEqual([]);
    });

    it('should throw error if not initialized', () => {
      RoleRegistry.resetInstance();
      const newRegistry = RoleRegistry.getInstance();
      expect(() => newRegistry.getValidRolesForUserType('staff')).toThrow('RoleRegistry not initialized');
    });
  });

  describe('isValidUserType()', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should return true for valid userType', () => {
      expect(registry.isValidUserType('learner')).toBe(true);
      expect(registry.isValidUserType('staff')).toBe(true);
      expect(registry.isValidUserType('global-admin')).toBe(true);
    });

    it('should return false for invalid userType', () => {
      expect(registry.isValidUserType('invalid')).toBe(false);
      expect(registry.isValidUserType('')).toBe(false);
    });

    it('should return false if not initialized', () => {
      RoleRegistry.resetInstance();
      const newRegistry = RoleRegistry.getInstance();
      expect(newRegistry.isValidUserType('staff')).toBe(false);
    });
  });

  describe('isValidRoleForUserType()', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should return true for valid staff role with staff userType', () => {
      expect(registry.isValidRoleForUserType('staff', 'instructor')).toBe(true);
      expect(registry.isValidRoleForUserType('staff', 'department-admin')).toBe(true);
    });

    it('should return false for learner role with staff userType', () => {
      expect(registry.isValidRoleForUserType('staff', 'course-taker')).toBe(false);
    });

    it('should return true for valid learner role with learner userType', () => {
      expect(registry.isValidRoleForUserType('learner', 'course-taker')).toBe(true);
      expect(registry.isValidRoleForUserType('learner', 'auditor')).toBe(true);
    });

    it('should return false for staff role with learner userType', () => {
      expect(registry.isValidRoleForUserType('learner', 'instructor')).toBe(false);
    });

    it('should return false for invalid userType', () => {
      expect(registry.isValidRoleForUserType('invalid', 'instructor')).toBe(false);
    });

    it('should return false for invalid role', () => {
      expect(registry.isValidRoleForUserType('staff', 'invalid-role')).toBe(false);
    });

    it('should return false if not initialized', () => {
      RoleRegistry.resetInstance();
      const newRegistry = RoleRegistry.getInstance();
      expect(newRegistry.isValidRoleForUserType('staff', 'instructor')).toBe(false);
    });
  });

  describe('getDisplayAs()', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should return display label for userType lookupId', () => {
      expect(registry.getDisplayAs('userType.staff')).toBe('Staff');
      expect(registry.getDisplayAs('userType.learner')).toBe('Learner');
    });

    it('should return display label for role lookupId', () => {
      expect(registry.getDisplayAs('role.instructor')).toBe('Instructor');
      expect(registry.getDisplayAs('role.course-taker')).toBe('Course Taker');
    });

    it('should return lookupId if not found', () => {
      expect(registry.getDisplayAs('invalid.lookup')).toBe('invalid.lookup');
    });

    it('should return lookupId if not initialized', () => {
      RoleRegistry.resetInstance();
      const newRegistry = RoleRegistry.getInstance();
      expect(newRegistry.getDisplayAs('userType.staff')).toBe('userType.staff');
    });
  });

  describe('getUserTypeDisplay()', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should return display label for userType key', () => {
      expect(registry.getUserTypeDisplay('staff')).toBe('Staff');
      expect(registry.getUserTypeDisplay('learner')).toBe('Learner');
      expect(registry.getUserTypeDisplay('global-admin')).toBe('System Admin');
    });

    it('should return key if not found', () => {
      expect(registry.getUserTypeDisplay('invalid')).toBe('invalid');
    });
  });

  describe('getRoleDisplay()', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should return display label for role key', () => {
      expect(registry.getRoleDisplay('instructor')).toBe('Instructor');
      expect(registry.getRoleDisplay('course-taker')).toBe('Course Taker');
      expect(registry.getRoleDisplay('system-admin')).toBe('System Admin');
    });

    it('should return key if not found', () => {
      expect(registry.getRoleDisplay('invalid-role')).toBe('invalid-role');
    });
  });

  describe('hydrateUserTypes()', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should convert string[] to UserTypeObject[]', () => {
      const result = registry.hydrateUserTypes(['learner', 'staff']);

      expect(result).toEqual([
        { _id: 'learner', displayAs: 'Learner' },
        { _id: 'staff', displayAs: 'Staff' }
      ]);
    });

    it('should handle empty array', () => {
      const result = registry.hydrateUserTypes([]);
      expect(result).toEqual([]);
    });

    it('should use fallback displayAs if not initialized', () => {
      RoleRegistry.resetInstance();
      const newRegistry = RoleRegistry.getInstance();
      const result = newRegistry.hydrateUserTypes(['learner']);

      expect(result).toEqual([
        { _id: 'learner', displayAs: 'learner' }
      ]);
    });

    it('should handle unknown userTypes gracefully', () => {
      const result = registry.hydrateUserTypes(['unknown']);

      expect(result).toEqual([
        { _id: 'unknown', displayAs: 'unknown' }
      ]);
    });
  });

  describe('hydrateRoles()', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should convert role strings to RoleObject[]', () => {
      const result = registry.hydrateRoles(['instructor', 'content-admin']);

      expect(result).toEqual([
        { _id: 'instructor', displayAs: 'Instructor' },
        { _id: 'content-admin', displayAs: 'Content Admin' }
      ]);
    });

    it('should handle empty array', () => {
      const result = registry.hydrateRoles([]);
      expect(result).toEqual([]);
    });

    it('should handle unknown roles gracefully', () => {
      const result = registry.hydrateRoles(['unknown-role']);

      expect(result).toEqual([
        { _id: 'unknown-role', displayAs: 'unknown-role' }
      ]);
    });
  });

  describe('refresh()', () => {
    it('should reload data and rebuild caches', async () => {
      await registry.initialize();

      expect(registry.isValidUserType('learner')).toBe(true);

      // Mock updated data
      const updatedData = [
        { lookupId: 'userType.new-type', category: 'userType', key: 'new-type', parentLookupId: null, displayAs: 'New Type', isActive: true, sortOrder: 4 }
      ];

      (registry as any).setDataLoader(async () => updatedData);
      await registry.refresh();

      expect(registry.isValidUserType('new-type')).toBe(true);
      expect(registry.isValidUserType('learner')).toBe(false); // Old data cleared
    });

    it('should handle errors during refresh', async () => {
      await registry.initialize();

      (registry as any).setDataLoader(async () => {
        throw new Error('Database error');
      });

      await expect(registry.refresh()).rejects.toThrow('Database error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle roles with no parent lookup gracefully', async () => {
      const dataWithOrphanRole = [
        ...mockLookupValues,
        { lookupId: 'role.orphan', category: 'role', key: 'orphan', parentLookupId: 'userType.nonexistent', displayAs: 'Orphan', isActive: true, sortOrder: 99 }
      ];

      (registry as any).setDataLoader(async () => dataWithOrphanRole);
      await registry.initialize();

      // Orphan role should not appear in any userType's roles
      expect(registry.getValidRolesForUserType('staff')).not.toContain('orphan');
      expect(registry.getValidRolesForUserType('learner')).not.toContain('orphan');
    });

    it('should handle duplicate sortOrder by maintaining insertion order', async () => {
      const dataWithDuplicateSortOrder = [
        { lookupId: 'userType.staff', category: 'userType', key: 'staff', parentLookupId: null, displayAs: 'Staff', isActive: true, sortOrder: 1 },
        { lookupId: 'role.first', category: 'role', key: 'first', parentLookupId: 'userType.staff', displayAs: 'First', isActive: true, sortOrder: 1 },
        { lookupId: 'role.second', category: 'role', key: 'second', parentLookupId: 'userType.staff', displayAs: 'Second', isActive: true, sortOrder: 1 },
      ];

      (registry as any).setDataLoader(async () => dataWithDuplicateSortOrder);
      await registry.initialize();

      const roles = registry.getValidRolesForUserType('staff');
      expect(roles).toContain('first');
      expect(roles).toContain('second');
    });
  });
});
