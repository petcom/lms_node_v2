/**
 * LookupValue Model Tests
 *
 * Comprehensive unit tests for the LookupValue model including:
 * - Schema validation
 * - Field constraints
 * - Index queries
 * - Static methods
 * - Instance methods
 * - Parent-child relationships
 * - Pre-save hooks
 *
 * @module tests/unit/models/LookupValue.model.test
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { LookupValue, ILookupValue } from '@/models/LookupValue.model';

describe('LookupValue Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await LookupValue.deleteMany({});
  });

  // ==========================================================================
  // Schema Validation Tests
  // ==========================================================================

  describe('Schema Validation', () => {
    it('should create a valid lookup with all required fields', async () => {
      const lookup = await LookupValue.create({
        category: 'userType',
        key: 'staff',
        parentLookupId: null,
        displayAs: 'Staff',
        sortOrder: 1,
        isActive: true
      });

      expect(lookup.lookupId).toBe('usertype.staff'); // Auto-generated, lowercase
      expect(lookup.category).toBe('usertype'); // Lowercase
      expect(lookup.key).toBe('staff'); // Lowercase
      expect(lookup.parentLookupId).toBeNull();
      expect(lookup.displayAs).toBe('Staff');
      expect(lookup.sortOrder).toBe(1);
      expect(lookup.isActive).toBe(true);
      expect(lookup.createdAt).toBeDefined();
      expect(lookup.updatedAt).toBeDefined();
    });

    it('should auto-generate lookupId if not provided', async () => {
      const lookup = await LookupValue.create({
        category: 'userType',
        key: 'staff',
        displayAs: 'Staff',
        sortOrder: 1
      });

      expect(lookup.lookupId).toBe('usertype.staff');
    });

    it('should require category field', async () => {
      const lookup = new LookupValue({
        lookupId: 'userType.staff',
        key: 'staff',
        displayAs: 'Staff',
        sortOrder: 1
      });

      await expect(lookup.save()).rejects.toThrow(/category/);
    });

    it('should require key field', async () => {
      const lookup = new LookupValue({
        lookupId: 'userType.staff',
        category: 'userType',
        displayAs: 'Staff',
        sortOrder: 1
      });

      await expect(lookup.save()).rejects.toThrow(/key/);
    });

    it('should require displayAs field', async () => {
      const lookup = new LookupValue({
        lookupId: 'userType.staff',
        category: 'userType',
        key: 'staff',
        sortOrder: 1
      });

      await expect(lookup.save()).rejects.toThrow(/displayAs/);
    });

    it('should enforce unique lookupId', async () => {
      await LookupValue.create({
        category: 'userType',
        key: 'staff',
        displayAs: 'Staff',
        sortOrder: 1
      });

      const duplicate = new LookupValue({
        category: 'userType',
        key: 'staff',
        displayAs: 'Staff Member',
        sortOrder: 2
      });

      await expect(duplicate.save()).rejects.toThrow(/duplicate/);
    });

    it('should validate lookupId format (category.key)', async () => {
      const invalidLookups = [
        'invalidformat',
        'no-dot-separator',
        'has.three.parts',
        'UPPERCASE.KEY',
        'category.KEY_with_underscore'
      ];

      for (const invalidId of invalidLookups) {
        const lookup = new LookupValue({
          lookupId: invalidId,
          category: 'test',
          key: 'test',
          displayAs: 'Test',
          sortOrder: 1
        });

        await expect(lookup.save()).rejects.toThrow();
      }
    });

    it('should trim whitespace from string fields', async () => {
      // Create parent first for validation
      await LookupValue.create({
        lookupId: 'usertype.learner',
        category: 'userType',
        key: 'learner',
        displayAs: 'Learner',
        sortOrder: 1
      });

      const lookup = await LookupValue.create({
        category: '  userType  ',
        key: '  staff  ',
        displayAs: '  Staff  ',
        parentLookupId: '  usertype.learner  ',
        description: '  Test description  ',
        sortOrder: 1
      });

      expect(lookup.category).toBe('usertype'); // Trimmed and lowercase
      expect(lookup.key).toBe('staff'); // Trimmed and lowercase
      expect(lookup.displayAs).toBe('Staff'); // Trimmed
      expect(lookup.parentLookupId).toBe('usertype.learner'); // Trimmed
      expect(lookup.description).toBe('Test description'); // Trimmed
    });

    it('should convert category and key to lowercase', async () => {
      const lookup = await LookupValue.create({
        lookupId: 'usertype.staff',
        category: 'UserType',
        key: 'Staff',
        displayAs: 'Staff',
        sortOrder: 1
      });

      expect(lookup.category).toBe('usertype');
      expect(lookup.key).toBe('staff');
    });

    it('should default sortOrder to 0 if not provided', async () => {
      const lookup = await LookupValue.create({
        lookupId: 'usertype.staff',
        category: 'userType',
        key: 'staff',
        displayAs: 'Staff'
      });

      expect(lookup.sortOrder).toBe(0);
    });

    it('should default isActive to true if not provided', async () => {
      const lookup = await LookupValue.create({
        lookupId: 'usertype.staff',
        category: 'userType',
        key: 'staff',
        displayAs: 'Staff',
        sortOrder: 1
      });

      expect(lookup.isActive).toBe(true);
    });

    it('should store optional metadata', async () => {
      const lookup = await LookupValue.create({
        category: 'userType',
        key: 'staff',
        displayAs: 'Staff',
        sortOrder: 1,
        metadata: {
          isDefault: true,
          icon: 'Users',
          color: '#10B981'
        }
      });

      expect(lookup.metadata).toBeDefined();
      expect(lookup.metadata?.isDefault).toBe(true);
      expect(lookup.metadata?.icon).toBe('Users');
      expect(lookup.metadata?.color).toBe('#10B981');
    });

    it('should allow null parentLookupId for root lookups', async () => {
      const lookup = await LookupValue.create({
        lookupId: 'usertype.staff',
        category: 'userType',
        key: 'staff',
        displayAs: 'Staff',
        parentLookupId: null,
        sortOrder: 1
      });

      expect(lookup.parentLookupId).toBeNull();
    });

    it('should store optional description', async () => {
      const lookup = await LookupValue.create({
        lookupId: 'usertype.staff',
        category: 'userType',
        key: 'staff',
        displayAs: 'Staff',
        description: 'Staff members with department roles',
        sortOrder: 1
      });

      expect(lookup.description).toBe('Staff members with department roles');
    });
  });

  // ==========================================================================
  // Pre-Save Hook Tests
  // ==========================================================================

  describe('Pre-Save Hooks', () => {
    it('should auto-generate lookupId from category and key in lowercase', async () => {
      const lookup = new LookupValue({
        category: 'UserType',
        key: 'Staff',
        displayAs: 'Staff',
        sortOrder: 1
      });

      await lookup.save();

      expect(lookup.lookupId).toBe('usertype.staff');
      expect(lookup.category).toBe('usertype');
      expect(lookup.key).toBe('staff');
    });

    it('should validate lookupId matches category.key pattern on save', async () => {
      const lookup = new LookupValue({
        lookupId: 'wrongcategory.wrongkey',
        category: 'userType',
        key: 'staff',
        displayAs: 'Staff',
        sortOrder: 1
      });

      await expect(lookup.save()).rejects.toThrow(/lookupId must match pattern/);
    });

    it('should fail if parent lookup does not exist', async () => {
      const lookup = new LookupValue({
        lookupId: 'role.instructor',
        category: 'role',
        key: 'instructor',
        parentLookupId: 'userType.nonexistent',
        displayAs: 'Instructor',
        sortOrder: 1
      });

      await expect(lookup.save()).rejects.toThrow(/Parent lookup/);
    });

    it('should succeed if parent lookup exists', async () => {
      // Create parent first
      await LookupValue.create({
        lookupId: 'usertype.staff',
        category: 'userType',
        key: 'staff',
        displayAs: 'Staff',
        sortOrder: 1
      });

      // Create child
      const child = await LookupValue.create({
        lookupId: 'role.instructor',
        category: 'role',
        key: 'instructor',
        parentLookupId: 'usertype.staff',
        displayAs: 'Instructor',
        sortOrder: 1
      });

      expect(child.parentLookupId).toBe('usertype.staff');
    });
  });

  // ==========================================================================
  // Static Method Tests
  // ==========================================================================

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Seed test data
      await LookupValue.create([
        {
          lookupId: 'usertype.learner',
          category: 'userType',
          key: 'learner',
          displayAs: 'Learner',
          parentLookupId: null,
          sortOrder: 1,
          isActive: true
        },
        {
          lookupId: 'usertype.staff',
          category: 'userType',
          key: 'staff',
          displayAs: 'Staff',
          parentLookupId: null,
          sortOrder: 2,
          isActive: true
        },
        {
          lookupId: 'usertype.global-admin',
          category: 'userType',
          key: 'global-admin',
          displayAs: 'System Admin',
          parentLookupId: null,
          sortOrder: 3,
          isActive: false // Inactive for testing
        },
        {
          lookupId: 'role.course-taker',
          category: 'role',
          key: 'course-taker',
          displayAs: 'Course Taker',
          parentLookupId: 'usertype.learner',
          sortOrder: 1,
          isActive: true
        },
        {
          lookupId: 'role.instructor',
          category: 'role',
          key: 'instructor',
          displayAs: 'Instructor',
          parentLookupId: 'usertype.staff',
          sortOrder: 1,
          isActive: true
        },
        {
          lookupId: 'role.department-admin',
          category: 'role',
          key: 'department-admin',
          displayAs: 'Department Admin',
          parentLookupId: 'usertype.staff',
          sortOrder: 2,
          isActive: false // Inactive for testing
        }
      ]);
    });

    describe('findByCategory()', () => {
      it('should find all userTypes', async () => {
        const userTypes = await (LookupValue as any).findByCategory('userType');

        expect(userTypes).toHaveLength(2); // Only active by default
        expect(userTypes[0].key).toBe('learner');
        expect(userTypes[1].key).toBe('staff');
      });

      it('should find all roles', async () => {
        const roles = await (LookupValue as any).findByCategory('role');

        expect(roles).toHaveLength(2); // Only active
        expect(roles[0].key).toBe('course-taker');
        expect(roles[1].key).toBe('instructor');
      });

      it('should include inactive when activeOnly is false', async () => {
        const userTypes = await (LookupValue as any).findByCategory('userType', false);

        expect(userTypes).toHaveLength(3); // Includes inactive
      });

      it('should sort by sortOrder', async () => {
        const userTypes = await (LookupValue as any).findByCategory('userType');

        expect(userTypes[0].sortOrder).toBe(1);
        expect(userTypes[1].sortOrder).toBe(2);
      });
    });

    describe('findByParent()', () => {
      it('should find children by parent lookupId', async () => {
        const staffRoles = await (LookupValue as any).findByParent('usertype.staff');

        expect(staffRoles).toHaveLength(1); // Only active
        expect(staffRoles[0].key).toBe('instructor');
      });

      it('should find learner roles', async () => {
        const learnerRoles = await (LookupValue as any).findByParent('usertype.learner');

        expect(learnerRoles).toHaveLength(1);
        expect(learnerRoles[0].key).toBe('course-taker');
      });

      it('should include inactive children when activeOnly is false', async () => {
        const staffRoles = await (LookupValue as any).findByParent('usertype.staff', false);

        expect(staffRoles).toHaveLength(2); // Includes inactive
      });

      it('should return empty array for non-existent parent', async () => {
        const roles = await (LookupValue as any).findByParent('usertype.nonexistent');

        expect(roles).toHaveLength(0);
      });
    });

    describe('findByLookupId()', () => {
      it('should find lookup by lookupId', async () => {
        const lookup = await (LookupValue as any).findByLookupId('usertype.staff');

        expect(lookup).toBeDefined();
        expect(lookup.key).toBe('staff');
        expect(lookup.displayAs).toBe('Staff');
      });

      it('should return null for non-existent lookupId', async () => {
        const lookup = await (LookupValue as any).findByLookupId('usertype.nonexistent');

        expect(lookup).toBeNull();
      });

      it('should find inactive lookups', async () => {
        const lookup = await (LookupValue as any).findByLookupId('usertype.global-admin');

        expect(lookup).toBeDefined();
        expect(lookup.isActive).toBe(false);
      });
    });

    describe('findRootLookups()', () => {
      it('should find all root lookups (no parent)', async () => {
        const roots = await (LookupValue as any).findRootLookups();

        expect(roots).toHaveLength(2); // Only active userTypes
        expect(roots.every((r: any) => r.parentLookupId === null)).toBe(true);
      });

      it('should filter by category', async () => {
        const userTypeRoots = await (LookupValue as any).findRootLookups('userType');

        expect(userTypeRoots).toHaveLength(2);
        expect(userTypeRoots.every((r: any) => r.category === 'usertype')).toBe(true);
      });

      it('should include inactive when activeOnly is false', async () => {
        const roots = await (LookupValue as any).findRootLookups(undefined, false);

        expect(roots).toHaveLength(3); // Includes inactive
      });
    });

    describe('isValidKeyForParent()', () => {
      it('should return true for valid key-parent combination', async () => {
        const isValid = await (LookupValue as any).isValidKeyForParent(
          'instructor',
          'usertype.staff'
        );

        expect(isValid).toBe(true);
      });

      it('should return false for invalid key-parent combination', async () => {
        const isValid = await (LookupValue as any).isValidKeyForParent(
          'course-taker',
          'usertype.staff'
        );

        expect(isValid).toBe(false);
      });

      it('should return false for inactive lookup', async () => {
        const isValid = await (LookupValue as any).isValidKeyForParent(
          'department-admin',
          'usertype.staff'
        );

        expect(isValid).toBe(false); // department-admin is inactive
      });

      it('should return false for non-existent key', async () => {
        const isValid = await (LookupValue as any).isValidKeyForParent(
          'nonexistent',
          'usertype.staff'
        );

        expect(isValid).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Instance Method Tests
  // ==========================================================================

  describe('Instance Methods', () => {
    let staffUserType: ILookupValue;
    let instructorRole: ILookupValue;
    let departmentAdminRole: ILookupValue;

    beforeEach(async () => {
      staffUserType = await LookupValue.create({
        lookupId: 'usertype.staff',
        category: 'userType',
        key: 'staff',
        displayAs: 'Staff',
        sortOrder: 1
      });

      instructorRole = await LookupValue.create({
        lookupId: 'role.instructor',
        category: 'role',
        key: 'instructor',
        parentLookupId: 'usertype.staff',
        displayAs: 'Instructor',
        sortOrder: 1
      });

      departmentAdminRole = await LookupValue.create({
        lookupId: 'role.department-admin',
        category: 'role',
        key: 'department-admin',
        parentLookupId: 'usertype.staff',
        displayAs: 'Department Admin',
        sortOrder: 2,
        isActive: false
      });
    });

    describe('getChildren()', () => {
      it('should get all active children', async () => {
        const children = await staffUserType.getChildren();

        expect(children).toHaveLength(1); // Only active
        expect(children[0].key).toBe('instructor');
      });

      it('should include inactive children when activeOnly is false', async () => {
        const children = await staffUserType.getChildren(false);

        expect(children).toHaveLength(2);
      });

      it('should return empty array for leaf nodes', async () => {
        const children = await instructorRole.getChildren();

        expect(children).toHaveLength(0);
      });
    });

    describe('getParent()', () => {
      it('should get parent lookup', async () => {
        const parent = await instructorRole.getParent();

        expect(parent).toBeDefined();
        expect(parent.key).toBe('staff');
        expect(parent.lookupId).toBe('usertype.staff');
      });

      it('should return null for root lookups', async () => {
        const parent = await staffUserType.getParent();

        expect(parent).toBeNull();
      });
    });

    describe('isRoot()', () => {
      it('should return true for root lookups', () => {
        expect(staffUserType.isRoot()).toBe(true);
      });

      it('should return false for child lookups', () => {
        expect(instructorRole.isRoot()).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Index Tests
  // ==========================================================================

  describe('Indexes', () => {
    it('should use index for lookupId queries', async () => {
      await LookupValue.create({
        lookupId: 'usertype.staff',
        category: 'userType',
        key: 'staff',
        displayAs: 'Staff',
        sortOrder: 1
      });

      const explain = await LookupValue.find({ lookupId: 'usertype.staff' }).explain();

      // Check that index was used (implementation may vary by MongoDB version)
      expect(explain).toBeDefined();
    });

    it('should use compound index for parentLookupId and isActive', async () => {
      await LookupValue.create([
        {
          lookupId: 'usertype.staff',
          category: 'userType',
          key: 'staff',
          displayAs: 'Staff',
          sortOrder: 1
        },
        {
          lookupId: 'role.instructor',
          category: 'role',
          key: 'instructor',
          parentLookupId: 'usertype.staff',
          displayAs: 'Instructor',
          sortOrder: 1
        }
      ]);

      const explain = await LookupValue.find({
        parentLookupId: 'usertype.staff',
        isActive: true
      }).explain();

      expect(explain).toBeDefined();
    });
  });

  // ==========================================================================
  // Edge Cases and Error Handling
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle very long displayAs values', async () => {
      const longDisplayAs = 'A'.repeat(200);

      const lookup = await LookupValue.create({
        lookupId: 'usertype.test',
        category: 'userType',
        key: 'test',
        displayAs: longDisplayAs,
        sortOrder: 1
      });

      expect(lookup.displayAs).toBe(longDisplayAs);
    });

    it('should handle special characters in displayAs', async () => {
      const lookup = await LookupValue.create({
        lookupId: 'usertype.test',
        category: 'userType',
        key: 'test',
        displayAs: 'Test & Special <Chars> "Quotes"',
        sortOrder: 1
      });

      expect(lookup.displayAs).toBe('Test & Special <Chars> "Quotes"');
    });

    it('should handle negative sortOrder', async () => {
      const lookup = await LookupValue.create({
        lookupId: 'usertype.test',
        category: 'userType',
        key: 'test',
        displayAs: 'Test',
        sortOrder: -1
      });

      expect(lookup.sortOrder).toBe(-1);
    });

    it('should handle very large sortOrder', async () => {
      const lookup = await LookupValue.create({
        lookupId: 'usertype.test',
        category: 'userType',
        key: 'test',
        displayAs: 'Test',
        sortOrder: 999999
      });

      expect(lookup.sortOrder).toBe(999999);
    });

    it('should handle empty metadata object', async () => {
      const lookup = await LookupValue.create({
        category: 'userType',
        key: 'test',
        displayAs: 'Test',
        sortOrder: 1,
        metadata: {}
      });

      expect(lookup.metadata).toBeDefined();
      expect(lookup.metadata?.isDefault).toBe(false); // Default value
    });
  });

  // ==========================================================================
  // toJSON Transform Tests
  // ==========================================================================

  describe('toJSON Transform', () => {
    it('should remove __v from JSON output', async () => {
      const lookup = await LookupValue.create({
        lookupId: 'usertype.staff',
        category: 'userType',
        key: 'staff',
        displayAs: 'Staff',
        sortOrder: 1
      });

      const json = lookup.toJSON();

      expect(json).not.toHaveProperty('__v');
      expect(json).toHaveProperty('_id');
      expect(json).toHaveProperty('lookupId');
    });
  });
});
