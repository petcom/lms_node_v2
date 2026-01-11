import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Learner, ILearner } from '@/models/auth/Learner.model';
import { LEARNER_ROLES } from '@/models/auth/role-constants';
import Department from '@/models/organization/Department.model';

describe('Learner Model - Phase 1 Changes', () => {
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
    await Learner.deleteMany({});
    await Department.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid learner with required fields', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson'
      });

      expect(learner._id).toEqual(testUserId);
      expect(learner.firstName).toBe('Alice');
      expect(learner.lastName).toBe('Johnson');
      expect(learner.isActive).toBe(true);
      expect(learner.departmentMemberships).toEqual([]);
    });

    it('should require firstName field', async () => {
      const learner = new Learner({
        _id: testUserId,
        lastName: 'Johnson'
      });

      await expect(learner.save()).rejects.toThrow(/firstName/);
    });

    it('should require lastName field', async () => {
      const learner = new Learner({
        _id: testUserId,
        firstName: 'Alice'
      });

      await expect(learner.save()).rejects.toThrow(/lastName/);
    });

    it('should require _id field', async () => {
      const learner = new Learner({
        firstName: 'Alice',
        lastName: 'Johnson'
      });

      await expect(learner.save()).rejects.toThrow(/required/);
    });

    it('should trim whitespace from firstName and lastName', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: '  Alice  ',
        lastName: '  Johnson  '
      });

      expect(learner.firstName).toBe('Alice');
      expect(learner.lastName).toBe('Johnson');
    });

    it('should store optional dateOfBirth', async () => {
      const dob = new Date('2000-01-15');
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        dateOfBirth: dob
      });

      expect(learner.dateOfBirth).toEqual(dob);
    });

    it('should store optional phoneNumber', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        phoneNumber: '555-5678'
      });

      expect(learner.phoneNumber).toBe('555-5678');
    });

    it('should store optional address', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        address: {
          street: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zipCode: '62701',
          country: 'USA'
        }
      });

      expect(learner.address?.street).toBe('123 Main St');
      expect(learner.address?.city).toBe('Springfield');
      expect(learner.address?.state).toBe('IL');
      expect(learner.address?.zipCode).toBe('62701');
      expect(learner.address?.country).toBe('USA');
    });

    it('should store optional emergencyContact', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        emergencyContact: {
          name: 'Bob Johnson',
          relationship: 'Father',
          phoneNumber: '555-1111'
        }
      });

      expect(learner.emergencyContact?.name).toBe('Bob Johnson');
      expect(learner.emergencyContact?.relationship).toBe('Father');
      expect(learner.emergencyContact?.phoneNumber).toBe('555-1111');
    });

    it('should default isActive to true', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson'
      });

      expect(learner.isActive).toBe(true);
    });

    it('should auto-generate timestamps', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson'
      });

      expect(learner.createdAt).toBeDefined();
      expect(learner.updatedAt).toBeDefined();
      expect(learner.createdAt).toBeInstanceOf(Date);
      expect(learner.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('departmentMemberships Field', () => {
    it('should default to empty array', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson'
      });

      expect(learner.departmentMemberships).toEqual([]);
    });

    it('should allow single department membership', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            isPrimary: true,
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      expect(learner.departmentMemberships).toHaveLength(1);
      expect(learner.departmentMemberships[0].departmentId).toEqual(testDepartment1._id);
      expect(learner.departmentMemberships[0].roles).toEqual(['course-taker']);
      expect(learner.departmentMemberships[0].isPrimary).toBe(true);
      expect(learner.departmentMemberships[0].isActive).toBe(true);
    });

    it('should allow multiple department memberships', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            isPrimary: true,
            joinedAt: new Date(),
            isActive: true
          },
          {
            departmentId: testDepartment2._id,
            roles: ['auditor'],
            isPrimary: false,
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      expect(learner.departmentMemberships).toHaveLength(2);
      expect(learner.departmentMemberships[0].departmentId).toEqual(testDepartment1._id);
      expect(learner.departmentMemberships[1].departmentId).toEqual(testDepartment2._id);
    });

    it('should auto-set joinedAt timestamp', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            isPrimary: true,
            isActive: true
          }
        ]
      });

      expect(learner.departmentMemberships[0].joinedAt).toBeDefined();
      expect(learner.departmentMemberships[0].joinedAt).toBeInstanceOf(Date);
    });

    it('should default isPrimary to false', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      expect(learner.departmentMemberships[0].isPrimary).toBe(false);
    });

    it('should default isActive to true', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            joinedAt: new Date()
          }
        ]
      });

      expect(learner.departmentMemberships[0].isActive).toBe(true);
    });

    it('should allow adding department membership after creation', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson'
      });

      learner.departmentMemberships.push({
        departmentId: testDepartment1._id,
        roles: ['course-taker'],
        isPrimary: true,
        joinedAt: new Date(),
        isActive: true
      });

      await learner.save();

      expect(learner.departmentMemberships).toHaveLength(1);
      expect(learner.departmentMemberships[0].roles).toEqual(['course-taker']);
    });

    it('should allow removing department membership', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            isPrimary: true,
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      learner.departmentMemberships = [];
      await learner.save();

      expect(learner.departmentMemberships).toHaveLength(0);
    });

    it('should allow deactivating membership instead of removing', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            isPrimary: true,
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      learner.departmentMemberships[0].isActive = false;
      await learner.save();

      expect(learner.departmentMemberships[0].isActive).toBe(false);
    });
  });

  describe('Role Validation (LEARNER_ROLES)', () => {
    it('should accept valid learner role: course-taker', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      expect(learner.departmentMemberships[0].roles).toContain('course-taker');
    });

    it('should accept valid learner role: auditor', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['auditor'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      expect(learner.departmentMemberships[0].roles).toContain('auditor');
    });

    it('should accept valid learner role: learner-supervisor', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['learner-supervisor'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      expect(learner.departmentMemberships[0].roles).toContain('learner-supervisor');
    });

    it('should accept multiple valid learner roles', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker', 'learner-supervisor'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      expect(learner.departmentMemberships[0].roles).toContain('course-taker');
      expect(learner.departmentMemberships[0].roles).toContain('learner-supervisor');
      expect(learner.departmentMemberships[0].roles).toHaveLength(2);
    });

    it('should accept all valid learner roles', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker', 'auditor', 'learner-supervisor'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      expect(learner.departmentMemberships[0].roles).toHaveLength(3);
    });

    it('should reject invalid learner role', async () => {
      const learner = new Learner({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['invalid-role'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      await expect(learner.save()).rejects.toThrow(/Invalid learner role/);
    });

    it('should reject staff roles', async () => {
      const learner = new Learner({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['instructor'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      await expect(learner.save()).rejects.toThrow(/Invalid learner role/);
    });

    it('should reject global-admin roles', async () => {
      const learner = new Learner({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['system-admin'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      await expect(learner.save()).rejects.toThrow(/Invalid learner role/);
    });

    it('should reject empty roles array', async () => {
      const learner = new Learner({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: [],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      await expect(learner.save()).rejects.toThrow();
    });

    it('should reject mixed valid and invalid roles', async () => {
      const learner = new Learner({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker', 'invalid-role'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      await expect(learner.save()).rejects.toThrow(/Invalid learner role/);
    });
  });

  describe('getRolesForDepartment Method', () => {
    it('should return roles for specified department', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker', 'learner-supervisor'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      const roles = learner.getRolesForDepartment(testDepartment1._id);
      expect(roles).toEqual(['course-taker', 'learner-supervisor']);
    });

    it('should return empty array for non-existent department', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      const nonExistentDeptId = new mongoose.Types.ObjectId();
      const roles = learner.getRolesForDepartment(nonExistentDeptId);
      expect(roles).toEqual([]);
    });

    it('should only return roles from active memberships', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            joinedAt: new Date(),
            isActive: false
          }
        ]
      });

      const roles = learner.getRolesForDepartment(testDepartment1._id);
      expect(roles).toEqual([]);
    });

    it('should handle multiple department memberships', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            joinedAt: new Date(),
            isActive: true
          },
          {
            departmentId: testDepartment2._id,
            roles: ['auditor'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      const roles1 = learner.getRolesForDepartment(testDepartment1._id);
      const roles2 = learner.getRolesForDepartment(testDepartment2._id);

      expect(roles1).toEqual(['course-taker']);
      expect(roles2).toEqual(['auditor']);
    });

    it('should return empty array for learner with no memberships', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson'
      });

      const roles = learner.getRolesForDepartment(testDepartment1._id);
      expect(roles).toEqual([]);
    });
  });

  describe('hasDepartmentRole Method', () => {
    it('should return true for existing role in department', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker', 'learner-supervisor'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      expect(learner.hasDepartmentRole(testDepartment1._id, 'course-taker')).toBe(true);
      expect(learner.hasDepartmentRole(testDepartment1._id, 'learner-supervisor')).toBe(true);
    });

    it('should return false for non-existing role in department', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      expect(learner.hasDepartmentRole(testDepartment1._id, 'auditor')).toBe(false);
    });

    it('should return false for non-existent department', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      const nonExistentDeptId = new mongoose.Types.ObjectId();
      expect(learner.hasDepartmentRole(nonExistentDeptId, 'course-taker')).toBe(false);
    });

    it('should return false for inactive membership', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            joinedAt: new Date(),
            isActive: false
          }
        ]
      });

      expect(learner.hasDepartmentRole(testDepartment1._id, 'course-taker')).toBe(false);
    });

    it('should handle multiple departments correctly', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            joinedAt: new Date(),
            isActive: true
          },
          {
            departmentId: testDepartment2._id,
            roles: ['auditor'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      expect(learner.hasDepartmentRole(testDepartment1._id, 'course-taker')).toBe(true);
      expect(learner.hasDepartmentRole(testDepartment1._id, 'auditor')).toBe(false);
      expect(learner.hasDepartmentRole(testDepartment2._id, 'auditor')).toBe(true);
      expect(learner.hasDepartmentRole(testDepartment2._id, 'course-taker')).toBe(false);
    });
  });

  describe('Query Operations', () => {
    it('should find learner by _id', async () => {
      await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson'
      });

      const learner = await Learner.findById(testUserId);
      expect(learner).toBeDefined();
      expect(learner!._id).toEqual(testUserId);
    });

    it('should find learner by department membership', async () => {
      await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      const learners = await Learner.find({ 'departmentMemberships.departmentId': testDepartment1._id });
      expect(learners).toHaveLength(1);
      expect(learners[0]._id).toEqual(testUserId);
    });

    it('should find active learners', async () => {
      await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        isActive: true
      });

      const inactiveUserId = new mongoose.Types.ObjectId();
      await Learner.create({
        _id: inactiveUserId,
        firstName: 'Bob',
        lastName: 'Smith',
        isActive: false
      });

      const activeLearners = await Learner.find({ isActive: true });
      expect(activeLearners).toHaveLength(1);
      expect(activeLearners[0]._id).toEqual(testUserId);
    });

    it('should populate department references', async () => {
      await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      const learner = await Learner.findById(testUserId).populate('departmentMemberships.departmentId');
      expect(learner?.departmentMemberships[0].departmentId).toBeDefined();
      expect((learner?.departmentMemberships[0].departmentId as any).name).toBe('Engineering');
    });
  });

  describe('Address and Emergency Contact', () => {
    it('should allow partial address', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        address: {
          city: 'Springfield',
          state: 'IL'
        }
      });

      expect(learner.address?.city).toBe('Springfield');
      expect(learner.address?.state).toBe('IL');
      expect(learner.address?.street).toBeUndefined();
    });

    it('should allow partial emergency contact', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        emergencyContact: {
          name: 'Bob Johnson',
          phoneNumber: '555-1111'
        }
      });

      expect(learner.emergencyContact?.name).toBe('Bob Johnson');
      expect(learner.emergencyContact?.phoneNumber).toBe('555-1111');
      expect(learner.emergencyContact?.relationship).toBeUndefined();
    });

    it('should allow updating address', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        address: {
          city: 'Springfield'
        }
      });

      learner.address = {
        street: '456 Oak Ave',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        country: 'USA'
      };
      await learner.save();

      expect(learner.address.street).toBe('456 Oak Ave');
      expect(learner.address.city).toBe('Chicago');
    });
  });

  describe('Edge Cases', () => {
    it('should handle learner with no memberships', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson'
      });

      expect(learner.getRolesForDepartment(testDepartment1._id)).toEqual([]);
      expect(learner.hasDepartmentRole(testDepartment1._id, 'course-taker')).toBe(false);
    });

    it('should handle membership with all roles', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: Array.from(LEARNER_ROLES),
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      expect(learner.departmentMemberships[0].roles).toHaveLength(LEARNER_ROLES.length);
      LEARNER_ROLES.forEach(role => {
        expect(learner.hasDepartmentRole(testDepartment1._id, role)).toBe(true);
      });
    });

    it('should handle updating roles in existing membership', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      learner.departmentMemberships[0].roles.push('learner-supervisor');
      await learner.save();

      expect(learner.departmentMemberships[0].roles).toContain('course-taker');
      expect(learner.departmentMemberships[0].roles).toContain('learner-supervisor');
      expect(learner.hasDepartmentRole(testDepartment1._id, 'learner-supervisor')).toBe(true);
    });

    it('should handle multiple primary memberships (validation not enforced at model level)', async () => {
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        departmentMemberships: [
          {
            departmentId: testDepartment1._id,
            roles: ['course-taker'],
            isPrimary: true,
            joinedAt: new Date(),
            isActive: true
          },
          {
            departmentId: testDepartment2._id,
            roles: ['auditor'],
            isPrimary: true,
            joinedAt: new Date(),
            isActive: true
          }
        ]
      });

      // Both can be primary at model level - business logic should enforce
      expect(learner.departmentMemberships[0].isPrimary).toBe(true);
      expect(learner.departmentMemberships[1].isPrimary).toBe(true);
    });

    it('should handle very old dateOfBirth', async () => {
      const oldDate = new Date('1920-01-01');
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        dateOfBirth: oldDate
      });

      expect(learner.dateOfBirth).toEqual(oldDate);
    });

    it('should handle future dateOfBirth (no validation at model level)', async () => {
      const futureDate = new Date('2030-01-01');
      const learner = await Learner.create({
        _id: testUserId,
        firstName: 'Alice',
        lastName: 'Johnson',
        dateOfBirth: futureDate
      });

      expect(learner.dateOfBirth).toEqual(futureDate);
    });
  });
});
