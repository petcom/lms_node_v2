import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Staff, IStaff, IDepartmentMembership } from '@/models/auth/Staff.model';
import { STAFF_ROLES } from '@/models/auth/role-constants';
import Department from '@/models/organization/Department.model';

describe('Staff Model - Phase 1 Changes', () => {
  let mongoServer: MongoMemoryServer;
  let testDepartment1: any;
  let testDepartment2: any;
  let testUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    testDepartment1 = await Department.create({
      name: 'Engineering',
      code: 'ENG'
    });
    testDepartment2 = await Department.create({
      name: 'Science',
      code: 'SCI'
    });
    testUserId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await Staff.deleteMany({});
    await Department.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid staff member with required fields', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe'
      });

      expect(staff._id).toEqual(testUserId);
      expect(staff.firstName).toBe('John');
      expect(staff.lastName).toBe('Doe');
      expect(staff.isActive).toBe(true);
      expect(staff.departmentMemberships).toEqual([]);
    });

    it('should require firstName field', async () => {
      const staff = new Staff({
        _id: testUserId,
        lastName: 'Doe'
      });

      await expect(staff.save()).rejects.toThrow(/firstName/);
    });

    it('should require lastName field', async () => {
      const staff = new Staff({
        _id: testUserId,
        firstName: 'John'
      });

      await expect(staff.save()).rejects.toThrow(/lastName/);
    });

    it('should require _id field', async () => {
      const staff = new Staff({
        firstName: 'John',
        lastName: 'Doe'
      });

      await expect(staff.save()).rejects.toThrow(/required/);
    });

    it('should trim whitespace from firstName and lastName', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: '  John  ',
        lastName: '  Doe  '
      });

      expect(staff.firstName).toBe('John');
      expect(staff.lastName).toBe('Doe');
    });

    it('should store optional phoneNumber', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '555-1234'
      });

      expect(staff.phoneNumber).toBe('555-1234');
    });

    it('should store optional title', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        title: 'Professor'
      });

      expect(staff.title).toBe('Professor');
    });

    it('should default isActive to true', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe'
      });

      expect(staff.isActive).toBe(true);
    });

    it('should auto-generate timestamps', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe'
      });

      expect(staff.createdAt).toBeDefined();
      expect(staff.updatedAt).toBeDefined();
      expect(staff.createdAt).toBeInstanceOf(Date);
      expect(staff.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('departmentMemberships Field', () => {
    it('should default to empty array', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe'
      });

      expect(staff.departmentMemberships).toEqual([]);
    });

    it('should allow single department membership', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isPrimary: true,
            isActive: true
          }
        ]
      });

      expect(staff.departmentMemberships).toHaveLength(1);
      expect(staff.departmentMemberships[0].departmentId).toEqual(testDepartment1._id);
      expect(staff.departmentMemberships[0].roles).toEqual(['instructor']);
      expect(staff.departmentMemberships[0].isPrimary).toBe(true);
      expect(staff.departmentMemberships[0].isActive).toBe(true);
    });

    it('should allow multiple department memberships', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isPrimary: true,
            isActive: true
          },
          {
            departmentId: testDepartment2._id,
            roles: ['content-admin'],
            isPrimary: false,
            isActive: true
          }
        ]
      });

      expect(staff.departmentMemberships).toHaveLength(2);
      expect(staff.departmentMemberships[0].departmentId).toEqual(testDepartment1._id);
      expect(staff.departmentMemberships[1].departmentId).toEqual(testDepartment2._id);
    });

    it('should auto-set joinedAt timestamp', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isPrimary: true,
            isActive: true
          }
        ]
      });

      expect(staff.departmentMemberships[0].joinedAt).toBeDefined();
      expect(staff.departmentMemberships[0].joinedAt).toBeInstanceOf(Date);
    });

    it('should default isPrimary to false', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isActive: true
          }
        ]
      });

      expect(staff.departmentMemberships[0].isPrimary).toBe(false);
    });

    it('should default isActive to true', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor']
          }
        ]
      });

      expect(staff.departmentMemberships[0].isActive).toBe(true);
    });

    it('should allow adding department membership after creation', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe'
      });

      staff.departmentMemberships.push({
        departmentId: testDepartment1._id,
        roles: ['instructor'],
        isPrimary: true,
        joinedAt: new Date(),
        isActive: true
      });

      await staff.save();

      expect(staff.departmentMemberships).toHaveLength(1);
      expect(staff.departmentMemberships[0].roles).toEqual(['instructor']);
    });

    it('should allow removing department membership', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isPrimary: true,
            isActive: true
          }
        ]
      });

      staff.departmentMemberships = [];
      await staff.save();

      expect(staff.departmentMemberships).toHaveLength(0);
    });

    it('should allow deactivating membership instead of removing', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isPrimary: true,
            isActive: true
          }
        ]
      });

      staff.departmentMemberships[0].isActive = false;
      await staff.save();

      expect(staff.departmentMemberships[0].isActive).toBe(false);
    });
  });

  describe('Role Validation (STAFF_ROLES)', () => {
    it('should accept valid staff role: instructor', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isActive: true
          }
        ]
      });

      expect(staff.departmentMemberships[0].roles).toContain('instructor');
    });

    it('should accept valid staff role: department-admin', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['department-admin'],
            isActive: true
          }
        ]
      });

      expect(staff.departmentMemberships[0].roles).toContain('department-admin');
    });

    it('should accept valid staff role: content-admin', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['content-admin'],
            isActive: true
          }
        ]
      });

      expect(staff.departmentMemberships[0].roles).toContain('content-admin');
    });

    it('should accept valid staff role: billing-admin', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['billing-admin'],
            isActive: true
          }
        ]
      });

      expect(staff.departmentMemberships[0].roles).toContain('billing-admin');
    });

    it('should accept multiple valid staff roles', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor', 'content-admin'],
            isActive: true
          }
        ]
      });

      expect(staff.departmentMemberships[0].roles).toContain('instructor');
      expect(staff.departmentMemberships[0].roles).toContain('content-admin');
      expect(staff.departmentMemberships[0].roles).toHaveLength(2);
    });

    it('should accept all valid staff roles', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor', 'department-admin', 'content-admin', 'billing-admin'],
            isActive: true
          }
        ]
      });

      expect(staff.departmentMemberships[0].roles).toHaveLength(4);
    });

    it('should reject invalid staff role', async () => {
      const staff = new Staff({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['invalid-role'],
            isActive: true
          }
        ]
      });

      await expect(staff.save()).rejects.toThrow(/Invalid staff role/);
    });

    it('should reject learner roles', async () => {
      const staff = new Staff({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            isActive: true
          }
        ]
      });

      await expect(staff.save()).rejects.toThrow(/Invalid staff role/);
    });

    it('should reject global-admin roles', async () => {
      const staff = new Staff({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['system-admin'],
            isActive: true
          }
        ]
      });

      await expect(staff.save()).rejects.toThrow(/Invalid staff role/);
    });

    it('should reject empty roles array', async () => {
      const staff = new Staff({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: [],
            isActive: true
          }
        ]
      });

      await expect(staff.save()).rejects.toThrow();
    });

    it('should reject mixed valid and invalid roles', async () => {
      const staff = new Staff({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor', 'invalid-role'],
            isActive: true
          }
        ]
      });

      await expect(staff.save()).rejects.toThrow(/Invalid staff role/);
    });
  });

  describe('getRolesForDepartment Method', () => {
    it('should return roles for specified department', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor', 'content-admin'],
            isActive: true
          }
        ]
      });

      const roles = staff.getRolesForDepartment(testDepartment1._id);
      expect(roles).toEqual(['instructor', 'content-admin']);
    });

    it('should return empty array for non-existent department', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isActive: true
          }
        ]
      });

      const nonExistentDeptId = new mongoose.Types.ObjectId();
      const roles = staff.getRolesForDepartment(nonExistentDeptId);
      expect(roles).toEqual([]);
    });

    it('should only return roles from active memberships', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isActive: false
          }
        ]
      });

      const roles = staff.getRolesForDepartment(testDepartment1._id);
      expect(roles).toEqual([]);
    });

    it('should handle multiple department memberships', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isActive: true
          },
          {
            departmentId: testDepartment2._id,
            roles: ['content-admin'],
            isActive: true
          }
        ]
      });

      const roles1 = staff.getRolesForDepartment(testDepartment1._id);
      const roles2 = staff.getRolesForDepartment(testDepartment2._id);

      expect(roles1).toEqual(['instructor']);
      expect(roles2).toEqual(['content-admin']);
    });

    it('should return empty array for staff with no memberships', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe'
      });

      const roles = staff.getRolesForDepartment(testDepartment1._id);
      expect(roles).toEqual([]);
    });
  });

  describe('hasDepartmentRole Method', () => {
    it('should return true for existing role in department', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor', 'content-admin'],
            isActive: true
          }
        ]
      });

      expect(staff.hasDepartmentRole(testDepartment1._id, 'instructor')).toBe(true);
      expect(staff.hasDepartmentRole(testDepartment1._id, 'content-admin')).toBe(true);
    });

    it('should return false for non-existing role in department', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isActive: true
          }
        ]
      });

      expect(staff.hasDepartmentRole(testDepartment1._id, 'content-admin')).toBe(false);
    });

    it('should return false for non-existent department', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isActive: true
          }
        ]
      });

      const nonExistentDeptId = new mongoose.Types.ObjectId();
      expect(staff.hasDepartmentRole(nonExistentDeptId, 'instructor')).toBe(false);
    });

    it('should return false for inactive membership', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isActive: false
          }
        ]
      });

      expect(staff.hasDepartmentRole(testDepartment1._id, 'instructor')).toBe(false);
    });

    it('should handle multiple departments correctly', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isActive: true
          },
          {
            departmentId: testDepartment2._id,
            roles: ['content-admin'],
            isActive: true
          }
        ]
      });

      expect(staff.hasDepartmentRole(testDepartment1._id, 'instructor')).toBe(true);
      expect(staff.hasDepartmentRole(testDepartment1._id, 'content-admin')).toBe(false);
      expect(staff.hasDepartmentRole(testDepartment2._id, 'content-admin')).toBe(true);
      expect(staff.hasDepartmentRole(testDepartment2._id, 'instructor')).toBe(false);
    });
  });

  describe('Query Operations', () => {
    it('should find staff by _id', async () => {
      await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe'
      });

      const staff = await Staff.findById(testUserId);
      expect(staff).toBeDefined();
      expect(staff!._id).toEqual(testUserId);
    });

    it('should find staff by department membership', async () => {
      await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isActive: true
          }
        ]
      });

      const staffMembers = await Staff.find({ 'departmentMemberships.departmentId': testDepartment1._id });
      expect(staffMembers).toHaveLength(1);
      expect(staffMembers[0]._id).toEqual(testUserId);
    });

    it('should find staff by role', async () => {
      await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isActive: true
          }
        ]
      });

      const instructors = await Staff.find({ 'departmentMemberships.roles': 'instructor' });
      expect(instructors).toHaveLength(1);
      expect(instructors[0]._id).toEqual(testUserId);
    });

    it('should find active staff', async () => {
      await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        isActive: true
      });

      const inactiveUserId = new mongoose.Types.ObjectId();
      await Staff.create({
        _id: inactiveUserId,
        firstName: 'Jane',
        lastName: 'Smith',
        isActive: false
      });

      const activeStaff = await Staff.find({ isActive: true });
      expect(activeStaff).toHaveLength(1);
      expect(activeStaff[0]._id).toEqual(testUserId);
    });

    it('should populate department references', async () => {
      await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isActive: true
          }
        ]
      });

      const staff = await Staff.findById(testUserId).populate('departmentMemberships.departmentId');
      expect(staff?.departmentMemberships[0].departmentId).toBeDefined();
      expect((staff?.departmentMemberships[0].departmentId as any).name).toBe('Engineering');
    });
  });

  describe('Edge Cases', () => {
    it('should handle staff with no memberships', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe'
      });

      expect(staff.getRolesForDepartment(testDepartment1._id)).toEqual([]);
      expect(staff.hasDepartmentRole(testDepartment1._id, 'instructor')).toBe(false);
    });

    it('should handle membership with all roles', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: Array.from(STAFF_ROLES),
            isActive: true
          }
        ]
      });

      expect(staff.departmentMemberships[0].roles).toHaveLength(STAFF_ROLES.length);
      STAFF_ROLES.forEach(role => {
        expect(staff.hasDepartmentRole(testDepartment1._id, role)).toBe(true);
      });
    });

    it('should handle updating roles in existing membership', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isActive: true
          }
        ]
      });

      staff.departmentMemberships[0].roles.push('content-admin');
      await staff.save();

      expect(staff.departmentMemberships[0].roles).toContain('instructor');
      expect(staff.departmentMemberships[0].roles).toContain('content-admin');
      expect(staff.hasDepartmentRole(testDepartment1._id, 'content-admin')).toBe(true);
    });

    it('should handle multiple primary memberships (validation not enforced at model level)', async () => {
      const staff = await Staff.create({
        _id: testUserId,
        firstName: 'John',
        lastName: 'Doe',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            isPrimary: true,
            isActive: true
          },
          {
            departmentId: testDepartment2._id,
            roles: ['content-admin'],
            isPrimary: true,
            isActive: true
          }
        ]
      });

      // Both can be primary at model level - business logic should enforce
      expect(staff.departmentMemberships[0].isPrimary).toBe(true);
      expect(staff.departmentMemberships[1].isPrimary).toBe(true);
    });
  });
});
