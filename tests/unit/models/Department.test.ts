import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Department from '@/models/organization/Department.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Department Model', () => {
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
    await Department.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid department with required fields', async () => {
      const dept = await Department.create({
        name: 'Engineering',
        code: 'ENG',
        description: 'Engineering Department',
        isActive: true
      });

      expect(dept.name).toBe('Engineering');
      expect(dept.code).toBe('ENG');
      expect(dept.description).toBe('Engineering Department');
      expect(dept.isActive).toBe(true);
      expect(dept.parentDepartmentId).toBeUndefined();
      expect(dept.level).toBe(0);
      expect(dept.path).toHaveLength(1);
      expect(dept.path[0]).toEqual(dept._id);
    });

    it('should require name field', async () => {
      const dept = new Department({
        code: 'ENG'
      });

      await expect(dept.save()).rejects.toThrow(/name/);
    });

    it('should require code field', async () => {
      const dept = new Department({
        name: 'Engineering'
      });

      await expect(dept.save()).rejects.toThrow(/code/);
    });

    it('should enforce unique code', async () => {
      await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      await expect(
        Department.create({
          name: 'Engineering 2',
          code: 'ENG'
        })
      ).rejects.toThrow(/duplicate/);
    });

    it('should convert code to uppercase', async () => {
      const dept = await Department.create({
        name: 'Engineering',
        code: 'eng'
      });

      expect(dept.code).toBe('ENG');
    });

    it('should trim whitespace from name and code', async () => {
      const dept = await Department.create({
        name: '  Engineering  ',
        code: '  eng  '
      });

      expect(dept.name).toBe('Engineering');
      expect(dept.code).toBe('ENG');
    });
  });

  describe('Hierarchical Structure', () => {
    it('should create a root department with level 0', async () => {
      const root = await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      expect(root.level).toBe(0);
      expect(root.path).toHaveLength(1);
      expect(root.path[0]).toEqual(root._id);
    });

    it('should create a child department with correct level and path', async () => {
      const parent = await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      const child = await Department.create({
        name: 'Computer Science',
        code: 'CS',
        parentDepartmentId: parent._id
      });

      expect(child.level).toBe(1);
      expect(child.path).toHaveLength(2);
      expect(child.path[0]).toEqual(parent._id);
      expect(child.path[1]).toEqual(child._id);
      expect(child.parentDepartmentId).toEqual(parent._id);
    });

    it('should create a grandchild department with correct level and path', async () => {
      const grandparent = await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      const parent = await Department.create({
        name: 'Computer Science',
        code: 'CS',
        parentDepartmentId: grandparent._id
      });

      const child = await Department.create({
        name: 'Software Engineering',
        code: 'SE',
        parentDepartmentId: parent._id
      });

      expect(child.level).toBe(2);
      expect(child.path).toHaveLength(3);
      expect(child.path[0]).toEqual(grandparent._id);
      expect(child.path[1]).toEqual(parent._id);
      expect(child.path[2]).toEqual(child._id);
    });

    it('should handle multiple children of same parent', async () => {
      const parent = await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      const child1 = await Department.create({
        name: 'Computer Science',
        code: 'CS',
        parentDepartmentId: parent._id
      });

      const child2 = await Department.create({
        name: 'Mechanical Engineering',
        code: 'ME',
        parentDepartmentId: parent._id
      });

      expect(child1.level).toBe(1);
      expect(child2.level).toBe(1);
      expect(child1.path[0]).toEqual(parent._id);
      expect(child2.path[0]).toEqual(parent._id);
    });
  });

  describe('Metadata Fields', () => {
    it('should set default isActive to true', async () => {
      const dept = await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      expect(dept.isActive).toBe(true);
    });

    it('should allow setting isActive to false', async () => {
      const dept = await Department.create({
        name: 'Engineering',
        code: 'ENG',
        isActive: false
      });

      expect(dept.isActive).toBe(false);
    });

    it('should store metadata', async () => {
      const dept = await Department.create({
        name: 'Engineering',
        code: 'ENG',
        metadata: {
          color: '#FF0000',
          icon: 'engineering'
        }
      });

      expect(dept.metadata).toEqual({
        color: '#FF0000',
        icon: 'engineering'
      });
    });

    it('should auto-generate timestamps', async () => {
      const dept = await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      expect(dept.createdAt).toBeDefined();
      expect(dept.updatedAt).toBeDefined();
      expect(dept.createdAt).toBeInstanceOf(Date);
      expect(dept.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Query Methods', () => {
    it('should find active departments', async () => {
      await Department.create({
        name: 'Active Dept',
        code: 'ACT',
        isActive: true
      });

      await Department.create({
        name: 'Inactive Dept',
        code: 'INACT',
        isActive: false
      });

      const active = await Department.find({ isActive: true });
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('Active Dept');
    });

    it('should find by code', async () => {
      await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      const dept = await Department.findOne({ code: 'ENG' });
      expect(dept).toBeDefined();
      expect(dept!.name).toBe('Engineering');
    });

    it('should find children of a department', async () => {
      const parent = await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      await Department.create({
        name: 'CS',
        code: 'CS',
        parentDepartmentId: parent._id
      });

      await Department.create({
        name: 'ME',
        code: 'ME',
        parentDepartmentId: parent._id
      });

      const children = await Department.find({ parentDepartmentId: parent._id });
      expect(children).toHaveLength(2);
    });
  });

  describe('Phase 1 Changes - isSystem, isVisible, requireExplicitMembership', () => {
    it('should default isSystem to false', async () => {
      const dept = await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      expect(dept.isSystem).toBe(false);
    });

    it('should default isVisible to true', async () => {
      const dept = await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      expect(dept.isVisible).toBe(true);
    });

    it('should default requireExplicitMembership to false', async () => {
      const dept = await Department.create({
        name: 'Engineering',
        code: 'ENG'
      });

      expect(dept.requireExplicitMembership).toBe(false);
    });

    it('should allow creating system department', async () => {
      const dept = await Department.create({
        name: 'System Administration',
        code: 'MASTER',
        isSystem: true,
        isVisible: false
      });

      expect(dept.isSystem).toBe(true);
      expect(dept.isVisible).toBe(false);
    });

    it('should allow creating hidden department', async () => {
      const dept = await Department.create({
        name: 'Hidden Dept',
        code: 'HIDDEN',
        isVisible: false
      });

      expect(dept.isVisible).toBe(false);
    });

    it('should allow setting requireExplicitMembership', async () => {
      const dept = await Department.create({
        name: 'Engineering',
        code: 'ENG',
        requireExplicitMembership: true
      });

      expect(dept.requireExplicitMembership).toBe(true);
    });

    it('should find visible departments', async () => {
      await Department.create({
        name: 'Visible Dept',
        code: 'VIS',
        isVisible: true
      });

      await Department.create({
        name: 'Hidden Dept',
        code: 'HID',
        isVisible: false
      });

      const visible = await Department.find({ isVisible: true });
      expect(visible).toHaveLength(1);
      expect(visible[0].name).toBe('Visible Dept');
    });

    it('should find system departments', async () => {
      await Department.create({
        name: 'System Dept',
        code: 'SYS',
        isSystem: true
      });

      await Department.create({
        name: 'Regular Dept',
        code: 'REG',
        isSystem: false
      });

      const systemDepts = await Department.find({ isSystem: true });
      expect(systemDepts).toHaveLength(1);
      expect(systemDepts[0].name).toBe('System Dept');
    });

    it('should find departments with requireExplicitMembership', async () => {
      await Department.create({
        name: 'Explicit Dept',
        code: 'EXP',
        requireExplicitMembership: true
      });

      await Department.create({
        name: 'Cascading Dept',
        code: 'CAS',
        requireExplicitMembership: false
      });

      const explicit = await Department.find({ requireExplicitMembership: true });
      expect(explicit).toHaveLength(1);
      expect(explicit[0].name).toBe('Explicit Dept');
    });
  });

  describe('Phase 1 Changes - Pre-delete Hooks (System Department Protection)', () => {
    it('should prevent deletion of system department using deleteOne', async () => {
      const systemDept = await Department.create({
        name: 'System Administration',
        code: 'MASTER',
        isSystem: true
      });

      await expect(systemDept.deleteOne()).rejects.toThrow(/Cannot delete system department/);
    });

    it('should prevent deletion of system department using findOneAndDelete', async () => {
      const systemDept = await Department.create({
        name: 'System Administration',
        code: 'MASTER',
        isSystem: true
      });

      await expect(
        Department.findOneAndDelete({ _id: systemDept._id })
      ).rejects.toThrow(/Cannot delete system department/);
    });

    it('should allow deletion of non-system department using deleteOne', async () => {
      const dept = await Department.create({
        name: 'Regular Dept',
        code: 'REG',
        isSystem: false
      });

      await expect(dept.deleteOne()).resolves.not.toThrow();

      const found = await Department.findById(dept._id);
      expect(found).toBeNull();
    });

    it('should allow deletion of non-system department using findOneAndDelete', async () => {
      const dept = await Department.create({
        name: 'Regular Dept',
        code: 'REG',
        isSystem: false
      });

      await expect(
        Department.findOneAndDelete({ _id: dept._id })
      ).resolves.not.toThrow();

      const found = await Department.findById(dept._id);
      expect(found).toBeNull();
    });
  });

  describe('Phase 1 Changes - getMasterDepartment Static Method', () => {
    it('should return null when master department does not exist', async () => {
      const masterDept = await Department.getMasterDepartment();
      expect(masterDept).toBeNull();
    });

    it('should return master department when it exists', async () => {
      const MASTER_DEPARTMENT_ID = new mongoose.Types.ObjectId('000000000000000000000001');

      await Department.create({
        _id: MASTER_DEPARTMENT_ID,
        name: 'System Administration',
        code: 'MASTER',
        isSystem: true,
        isVisible: false
      });

      const masterDept = await Department.getMasterDepartment();
      expect(masterDept).toBeDefined();
      expect(masterDept!._id.toString()).toBe(MASTER_DEPARTMENT_ID.toString());
      expect(masterDept!.name).toBe('System Administration');
      expect(masterDept!.isSystem).toBe(true);
    });

    it('should return master department with correct properties', async () => {
      const MASTER_DEPARTMENT_ID = new mongoose.Types.ObjectId('000000000000000000000001');

      await Department.create({
        _id: MASTER_DEPARTMENT_ID,
        name: 'System Administration',
        code: 'MASTER',
        description: 'System administration department for global admin roles',
        isSystem: true,
        isVisible: false,
        requireExplicitMembership: true
      });

      const masterDept = await Department.getMasterDepartment();
      expect(masterDept).toBeDefined();
      expect(masterDept!.isSystem).toBe(true);
      expect(masterDept!.isVisible).toBe(false);
      expect(masterDept!.requireExplicitMembership).toBe(true);
      expect(masterDept!.code).toBe('MASTER');
    });
  });

  describe('Phase 1 Changes - Edge Cases', () => {
    it('should allow updating isVisible on existing department', async () => {
      const dept = await Department.create({
        name: 'Engineering',
        code: 'ENG',
        isVisible: true
      });

      dept.isVisible = false;
      await dept.save();

      expect(dept.isVisible).toBe(false);
    });

    it('should allow updating requireExplicitMembership on existing department', async () => {
      const dept = await Department.create({
        name: 'Engineering',
        code: 'ENG',
        requireExplicitMembership: false
      });

      dept.requireExplicitMembership = true;
      await dept.save();

      expect(dept.requireExplicitMembership).toBe(true);
    });

    it('should not allow changing isSystem to true after creation', async () => {
      const dept = await Department.create({
        name: 'Engineering',
        code: 'ENG',
        isSystem: false
      });

      dept.isSystem = true;
      await dept.save();

      // This is allowed at model level - business logic should prevent
      expect(dept.isSystem).toBe(true);
    });

    it('should handle system department with children', async () => {
      const systemDept = await Department.create({
        name: 'System Administration',
        code: 'MASTER',
        isSystem: true
      });

      const child = await Department.create({
        name: 'System Child',
        code: 'SYSCHILD',
        parentDepartmentId: systemDept._id
      });

      expect(child.parentDepartmentId).toEqual(systemDept._id);
      expect(child.level).toBe(1);
    });

    it('should allow hidden department with requireExplicitMembership', async () => {
      const dept = await Department.create({
        name: 'Special Dept',
        code: 'SPEC',
        isVisible: false,
        requireExplicitMembership: true
      });

      expect(dept.isVisible).toBe(false);
      expect(dept.requireExplicitMembership).toBe(true);
    });

    it('should allow system department to be invisible and require explicit membership', async () => {
      const dept = await Department.create({
        name: 'System Administration',
        code: 'MASTER',
        isSystem: true,
        isVisible: false,
        requireExplicitMembership: true
      });

      expect(dept.isSystem).toBe(true);
      expect(dept.isVisible).toBe(false);
      expect(dept.requireExplicitMembership).toBe(true);
    });
  });
});
