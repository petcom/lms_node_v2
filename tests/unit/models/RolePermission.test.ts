import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import RolePermission from '../../../src/models/system/RolePermission.model';
import Permission from '../../../src/models/system/Permission.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('RolePermission Model', () => {
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
    await RolePermission.deleteMany({});
    await Permission.deleteMany({});
  });

  describe('RolePermission creation', () => {
    it('should create a role-permission assignment', async () => {
      const permission = await Permission.create({
        resource: 'course',
        action: 'read',
        name: 'View Courses',
      });

      const rolePermission = await RolePermission.create({
        role: 'instructor',
        permissionId: permission._id,
      });

      expect(rolePermission.role).toBe('instructor');
      expect(rolePermission.permissionId.toString()).toBe(permission._id.toString());
      expect(rolePermission.isGranted).toBe(true);
    });

    it('should support all role types', async () => {
      const permission = await Permission.create({
        resource: 'learner',
        action: 'read',
        name: 'View Learners',
      });

      const roles = ['admin', 'instructor', 'learner', 'staff', 'guest'];

      for (const role of roles) {
        const rp = await RolePermission.create({
          role,
          permissionId: permission._id,
        });
        expect(rp.role).toBe(role);
      }
    });
  });

  describe('Grant and deny permissions', () => {
    it('should grant permission by default', async () => {
      const permission = await Permission.create({
        resource: 'course',
        action: 'create',
        name: 'Create Courses',
      });

      const rolePermission = await RolePermission.create({
        role: 'instructor',
        permissionId: permission._id,
      });

      expect(rolePermission.isGranted).toBe(true);
    });

    it('should support explicit deny', async () => {
      const permission = await Permission.create({
        resource: 'system',
        action: 'manage',
        name: 'Manage System',
      });

      const rolePermission = await RolePermission.create({
        role: 'learner',
        permissionId: permission._id,
        isGranted: false,
      });

      expect(rolePermission.isGranted).toBe(false);
    });
  });

  describe('Scope overrides', () => {
    it('should support scope override', async () => {
      const permission = await Permission.create({
        resource: 'course',
        action: 'update',
        name: 'Update Courses',
        scope: 'all',
      });

      const rolePermission = await RolePermission.create({
        role: 'instructor',
        permissionId: permission._id,
        scopeOverride: 'own',
      });

      expect(rolePermission.scopeOverride).toBe('own');
    });

    it('should work without scope override', async () => {
      const permission = await Permission.create({
        resource: 'learner',
        action: 'read',
        name: 'View Learners',
      });

      const rolePermission = await RolePermission.create({
        role: 'instructor',
        permissionId: permission._id,
      });

      expect(rolePermission.scopeOverride).toBeUndefined();
    });
  });

  describe('Condition overrides', () => {
    it('should support condition overrides', async () => {
      const permission = await Permission.create({
        resource: 'enrollment',
        action: 'update',
        name: 'Update Enrollments',
      });

      const rolePermission = await RolePermission.create({
        role: 'instructor',
        permissionId: permission._id,
        conditionsOverride: {
          status: ['active', 'pending'],
          departmentId: '$user.departmentId',
        },
      });

      expect(rolePermission.conditionsOverride).toHaveProperty('status');
      expect(rolePermission.conditionsOverride?.status).toContain('active');
    });

    it('should work without condition overrides', async () => {
      const permission = await Permission.create({
        resource: 'course',
        action: 'read',
        name: 'View Courses',
      });

      const rolePermission = await RolePermission.create({
        role: 'learner',
        permissionId: permission._id,
      });

      expect(rolePermission.conditionsOverride).toBeUndefined();
    });
  });

  describe('Department scoping', () => {
    it('should support department-specific permissions', async () => {
      const departmentId = new mongoose.Types.ObjectId();
      const permission = await Permission.create({
        resource: 'course',
        action: 'manage',
        name: 'Manage Courses',
      });

      const rolePermission = await RolePermission.create({
        role: 'instructor',
        permissionId: permission._id,
        departmentId,
      });

      expect(rolePermission.departmentId?.toString()).toBe(departmentId.toString());
    });

    it('should work without department scoping', async () => {
      const permission = await Permission.create({
        resource: 'system',
        action: 'read',
        name: 'View System Info',
      });

      const rolePermission = await RolePermission.create({
        role: 'admin',
        permissionId: permission._id,
      });

      expect(rolePermission.departmentId).toBeUndefined();
    });
  });

  describe('Expiration dates', () => {
    it('should support expiration date', async () => {
      const permission = await Permission.create({
        resource: 'course',
        action: 'create',
        name: 'Create Courses',
      });

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const rolePermission = await RolePermission.create({
        role: 'instructor',
        permissionId: permission._id,
        expiresAt,
      });

      expect(rolePermission.expiresAt).toBeDefined();
      expect(rolePermission.expiresAt?.getTime()).toBeGreaterThan(Date.now());
    });

    it('should work without expiration', async () => {
      const permission = await Permission.create({
        resource: 'course',
        action: 'read',
        name: 'View Courses',
      });

      const rolePermission = await RolePermission.create({
        role: 'learner',
        permissionId: permission._id,
      });

      expect(rolePermission.expiresAt).toBeUndefined();
    });
  });

  describe('Granted by tracking', () => {
    it('should track who granted the permission', async () => {
      const grantedBy = new mongoose.Types.ObjectId();
      const permission = await Permission.create({
        resource: 'report',
        action: 'read',
        name: 'View Reports',
      });

      const rolePermission = await RolePermission.create({
        role: 'instructor',
        permissionId: permission._id,
        grantedBy,
      });

      expect(rolePermission.grantedBy?.toString()).toBe(grantedBy.toString());
    });

    it('should work without grantedBy', async () => {
      const permission = await Permission.create({
        resource: 'course',
        action: 'read',
        name: 'View Courses',
      });

      const rolePermission = await RolePermission.create({
        role: 'learner',
        permissionId: permission._id,
      });

      expect(rolePermission.grantedBy).toBeUndefined();
    });
  });

  describe('Metadata', () => {
    it('should store metadata', async () => {
      const permission = await Permission.create({
        resource: 'assessment',
        action: 'create',
        name: 'Create Assessments',
      });

      const rolePermission = await RolePermission.create({
        role: 'instructor',
        permissionId: permission._id,
        metadata: {
          reason: 'Department head approval',
          requestId: '12345',
          notes: 'Temporary access for project',
        },
      });

      expect(rolePermission.metadata).toHaveProperty('reason');
      expect(rolePermission.metadata.requestId).toBe('12345');
    });
  });

  describe('Required fields', () => {
    it('should require role field', async () => {
      const permission = await Permission.create({
        resource: 'course',
        action: 'read',
        name: 'View Courses',
      });

      await expect(
        RolePermission.create({
          permissionId: permission._id,
        })
      ).rejects.toThrow();
    });

    it('should require permissionId field', async () => {
      await expect(
        RolePermission.create({
          role: 'instructor',
        })
      ).rejects.toThrow();
    });
  });

  describe('Unique constraint', () => {
    it('should enforce unique role-permission-department combination', async () => {
      const departmentId = new mongoose.Types.ObjectId();
      const permission = await Permission.create({
        resource: 'course',
        action: 'read',
        name: 'View Courses',
      });

      await RolePermission.create({
        role: 'instructor',
        permissionId: permission._id,
        departmentId,
      });

      await expect(
        RolePermission.create({
          role: 'instructor',
          permissionId: permission._id,
          departmentId,
        })
      ).rejects.toThrow();
    });

    it('should allow same role-permission with different department', async () => {
      const dept1 = new mongoose.Types.ObjectId();
      const dept2 = new mongoose.Types.ObjectId();
      const permission = await Permission.create({
        resource: 'course',
        action: 'update',
        name: 'Update Courses',
      });

      const rp1 = await RolePermission.create({
        role: 'instructor',
        permissionId: permission._id,
        departmentId: dept1,
      });

      const rp2 = await RolePermission.create({
        role: 'instructor',
        permissionId: permission._id,
        departmentId: dept2,
      });

      expect(rp1.departmentId?.toString()).not.toBe(rp2.departmentId?.toString());
    });
  });

  describe('Indexes', () => {
    it('should have compound index on role and permissionId', async () => {
      const indexes = await RolePermission.collection.getIndexes();
      const compoundIndex = Object.values(indexes).find((idx: any) =>
        Array.isArray(idx) && idx.some((field: any) => field[0] === 'role')
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should have index on departmentId', async () => {
      const indexes = await RolePermission.collection.getIndexes();
      expect(indexes).toHaveProperty('departmentId_1');
    });

    it('should have index on expiresAt', async () => {
      const indexes = await RolePermission.collection.getIndexes();
      expect(indexes).toHaveProperty('expiresAt_1');
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate timestamps', async () => {
      const permission = await Permission.create({
        resource: 'test',
        action: 'read',
        name: 'Test',
      });

      const rolePermission = await RolePermission.create({
        role: 'learner',
        permissionId: permission._id,
      });

      expect(rolePermission.createdAt).toBeDefined();
      expect(rolePermission.updatedAt).toBeDefined();
    });
  });
});
