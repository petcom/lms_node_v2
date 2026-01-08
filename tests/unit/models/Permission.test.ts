import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Permission from '../../../src/models/system/Permission.model';

describe('Permission Model', () => {
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
    await Permission.deleteMany({});
  });

  describe('Permission creation', () => {
    it('should create a basic permission', async () => {
      const permission = await Permission.create({
        resource: 'course',
        action: 'read',
        name: 'View Courses',
        description: 'Ability to view course information',
      });

      expect(permission.resource).toBe('course');
      expect(permission.action).toBe('read');
      expect(permission.name).toBe('View Courses');
      expect(permission.isActive).toBe(true);
    });

    it('should create a system permission', async () => {
      const permission = await Permission.create({
        resource: 'system',
        action: 'manage',
        name: 'Manage System',
        isSystemPermission: true,
      });

      expect(permission.isSystemPermission).toBe(true);
    });
  });

  describe('CRUD actions', () => {
    it('should support create action', async () => {
      const permission = await Permission.create({
        resource: 'learner',
        action: 'create',
        name: 'Create Learners',
      });

      expect(permission.action).toBe('create');
    });

    it('should support read action', async () => {
      const permission = await Permission.create({
        resource: 'enrollment',
        action: 'read',
        name: 'View Enrollments',
      });

      expect(permission.action).toBe('read');
    });

    it('should support update action', async () => {
      const permission = await Permission.create({
        resource: 'course',
        action: 'update',
        name: 'Update Courses',
      });

      expect(permission.action).toBe('update');
    });

    it('should support delete action', async () => {
      const permission = await Permission.create({
        resource: 'content',
        action: 'delete',
        name: 'Delete Content',
      });

      expect(permission.action).toBe('delete');
    });

    it('should support manage action for full control', async () => {
      const permission = await Permission.create({
        resource: 'department',
        action: 'manage',
        name: 'Manage Departments',
      });

      expect(permission.action).toBe('manage');
    });
  });

  describe('Common resources', () => {
    it('should support course resource', async () => {
      const permission = await Permission.create({
        resource: 'course',
        action: 'read',
        name: 'View Courses',
      });

      expect(permission.resource).toBe('course');
    });

    it('should support learner resource', async () => {
      const permission = await Permission.create({
        resource: 'learner',
        action: 'create',
        name: 'Add Learners',
      });

      expect(permission.resource).toBe('learner');
    });

    it('should support enrollment resource', async () => {
      const permission = await Permission.create({
        resource: 'enrollment',
        action: 'manage',
        name: 'Manage Enrollments',
      });

      expect(permission.resource).toBe('enrollment');
    });

    it('should support assessment resource', async () => {
      const permission = await Permission.create({
        resource: 'assessment',
        action: 'create',
        name: 'Create Assessments',
      });

      expect(permission.resource).toBe('assessment');
    });

    it('should support report resource', async () => {
      const permission = await Permission.create({
        resource: 'report',
        action: 'read',
        name: 'View Reports',
      });

      expect(permission.resource).toBe('report');
    });

    it('should support system resource', async () => {
      const permission = await Permission.create({
        resource: 'system',
        action: 'manage',
        name: 'Manage System Settings',
      });

      expect(permission.resource).toBe('system');
    });
  });

  describe('Scope constraints', () => {
    it('should support own scope', async () => {
      const permission = await Permission.create({
        resource: 'course',
        action: 'update',
        name: 'Update Own Courses',
        scope: 'own',
      });

      expect(permission.scope).toBe('own');
    });

    it('should support department scope', async () => {
      const permission = await Permission.create({
        resource: 'learner',
        action: 'read',
        name: 'View Department Learners',
        scope: 'department',
      });

      expect(permission.scope).toBe('department');
    });

    it('should support all scope', async () => {
      const permission = await Permission.create({
        resource: 'report',
        action: 'read',
        name: 'View All Reports',
        scope: 'all',
      });

      expect(permission.scope).toBe('all');
    });
  });

  describe('Conditions', () => {
    it('should support status conditions', async () => {
      const permission = await Permission.create({
        resource: 'enrollment',
        action: 'delete',
        name: 'Delete Draft Enrollments',
        conditions: {
          status: ['draft', 'pending'],
        },
      });

      expect(permission.conditions?.status).toContain('draft');
    });

    it('should support custom field conditions', async () => {
      const permission = await Permission.create({
        resource: 'course',
        action: 'update',
        name: 'Update Published Courses',
        conditions: {
          isPublished: true,
          level: ['beginner', 'intermediate'],
        },
      });

      expect(permission.conditions?.isPublished).toBe(true);
      expect(permission.conditions?.level).toContain('beginner');
    });

    it('should support complex conditions', async () => {
      const permission = await Permission.create({
        resource: 'assessment',
        action: 'read',
        name: 'View Active Assessments',
        conditions: {
          isActive: true,
          visibility: 'public',
          minScore: { $gte: 0 },
        },
      });

      expect(permission.conditions).toHaveProperty('isActive');
      expect(permission.conditions).toHaveProperty('minScore');
    });
  });

  describe('Group organization', () => {
    it('should support permission groups', async () => {
      const permission = await Permission.create({
        resource: 'course',
        action: 'create',
        name: 'Create Courses',
        group: 'content-management',
      });

      expect(permission.group).toBe('content-management');
    });

    it('should support multiple permissions in same group', async () => {
      const p1 = await Permission.create({
        resource: 'course',
        action: 'create',
        name: 'Create Courses',
        group: 'content',
      });

      const p2 = await Permission.create({
        resource: 'content',
        action: 'create',
        name: 'Create Content',
        group: 'content',
      });

      expect(p1.group).toBe(p2.group);
    });
  });

  describe('Active status', () => {
    it('should default to active', async () => {
      const permission = await Permission.create({
        resource: 'course',
        action: 'read',
        name: 'View Courses',
      });

      expect(permission.isActive).toBe(true);
    });

    it('should support inactive permissions', async () => {
      const permission = await Permission.create({
        resource: 'deprecated',
        action: 'manage',
        name: 'Old Permission',
        isActive: false,
      });

      expect(permission.isActive).toBe(false);
    });
  });

  describe('Metadata', () => {
    it('should store metadata', async () => {
      const permission = await Permission.create({
        resource: 'course',
        action: 'delete',
        name: 'Delete Courses',
        metadata: {
          requiresConfirmation: true,
          dangerLevel: 'high',
          addedInVersion: '2.0.0',
        },
      });

      expect(permission.metadata).toHaveProperty('requiresConfirmation');
      expect(permission.metadata.dangerLevel).toBe('high');
    });
  });

  describe('Required fields', () => {
    it('should require resource field', async () => {
      await expect(
        Permission.create({
          action: 'read',
          name: 'Test Permission',
        })
      ).rejects.toThrow();
    });

    it('should require action field', async () => {
      await expect(
        Permission.create({
          resource: 'course',
          name: 'Test Permission',
        })
      ).rejects.toThrow();
    });

    it('should require name field', async () => {
      await expect(
        Permission.create({
          resource: 'course',
          action: 'read',
        })
      ).rejects.toThrow();
    });
  });

  describe('Unique constraint', () => {
    it('should enforce unique resource-action-scope combination', async () => {
      await Permission.create({
        resource: 'course',
        action: 'read',
        name: 'View Courses',
        scope: 'all',
      });

      await expect(
        Permission.create({
          resource: 'course',
          action: 'read',
          name: 'View All Courses',
          scope: 'all',
        })
      ).rejects.toThrow();
    });

    it('should allow same resource-action with different scope', async () => {
      const p1 = await Permission.create({
        resource: 'course',
        action: 'update',
        name: 'Update Own Courses',
        scope: 'own',
      });

      const p2 = await Permission.create({
        resource: 'course',
        action: 'update',
        name: 'Update All Courses',
        scope: 'all',
      });

      expect(p1.scope).not.toBe(p2.scope);
    });
  });

  describe('Indexes', () => {
    it('should have unique compound index', async () => {
      const indexes = await Permission.collection.getIndexes();
      const compoundIndex = Object.values(indexes).find((idx: any) =>
        Array.isArray(idx) && idx.some((field: any) => field[0] === 'resource')
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should have index on isActive', async () => {
      const indexes = await Permission.collection.getIndexes();
      expect(indexes).toHaveProperty('isActive_1');
    });

    it('should have index on group', async () => {
      const indexes = await Permission.collection.getIndexes();
      expect(indexes).toHaveProperty('group_1');
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate timestamps', async () => {
      const permission = await Permission.create({
        resource: 'test',
        action: 'read',
        name: 'Test',
      });

      expect(permission.createdAt).toBeDefined();
      expect(permission.updatedAt).toBeDefined();
    });
  });
});
