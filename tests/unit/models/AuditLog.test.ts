import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuditLog } from '@/models/system/AuditLog.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

let mongoServer: MongoMemoryServer;

describeIfMongo('AuditLog Model', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await AuditLog.deleteMany({});
  });

  // Helper to create minimal audit log with required fields
  const createLog = (overrides: any = {}) => {
    return AuditLog.create({
      action: 'create',
      entityType: 'user',
      description: 'Test action',
      ipAddress: '192.168.1.1',
      userAgent: 'Test Agent',
      request: {
        method: 'POST',
        path: '/api/test'
      },
      ...overrides
    });
  };

  describe('Audit Log Creation', () => {
    it('should create a create action audit log', async () => {
      const log = await createLog({
        action: 'create',
        entityType: 'user',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        changes: {
          after: {
            email: 'newuser@example.com',
            userTypes: ['learner'],
          }
        },
      });

      expect(log).toBeDefined();
      expect(log.action).toBe('create');
      expect(log.entityType).toBe('user');
    });

    it('should create an update action audit log', async () => {
      const log = await createLog({
        action: 'update',
        entityType: 'course',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        changes: {
          before: { title: 'Old Title' },
          after: { title: 'New Title' },
        },
      });

      expect(log.action).toBe('update');
      expect(log.changes.before.title).toBe('Old Title');
      expect(log.changes.after.title).toBe('New Title');
    });

    it('should create a delete action audit log', async () => {
      const log = await createLog({
        action: 'delete',
        entityType: 'enrollment',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        changes: {
          before: {
            learnerId: new mongoose.Types.ObjectId(),
            status: 'withdrawn',
          },
        },
      });

      expect(log.action).toBe('delete');
      expect(log.entityType).toBe('enrollment');
    });

    it('should create a login action audit log', async () => {
      const log = await createLog({
        action: 'login',
        entityType: 'user',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
      });

      expect(log.action).toBe('login');
      expect(log.ipAddress).toBe('192.168.1.100');
    });

    it('should create a logout action audit log', async () => {
      const log = await createLog({
        action: 'logout',
        entityType: 'user',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
      });

      expect(log.action).toBe('logout');
    });
  });

  describe('Action Types', () => {
    it('should support all 5 action types', async () => {
      const actions = ['create', 'update', 'delete', 'login', 'logout'];

      for (const action of actions) {
        const log = await createLog({
          action,
          entityType: 'user',
          entityId: new mongoose.Types.ObjectId(),
          userId: new mongoose.Types.ObjectId(),
        });

        expect(log.action).toBe(action);
      }

      const count = await AuditLog.countDocuments();
      expect(count).toBe(5);
    });
  });

  describe('Entity Types', () => {
    it('should log User entity changes', async () => {
      const log = await createLog({
        action: 'update',
        entityType: 'user',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
      });

      expect(log.entityType).toBe('user');
    });

    it('should log Course entity changes', async () => {
      const log = await createLog({
        action: 'update',
        entityType: 'course',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
      });

      expect(log.entityType).toBe('Course');
    });

    it('should log Enrollment entity changes', async () => {
      const log = await createLog({
        action: 'create',
        entityType: 'enrollment',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
      });

      expect(log.entityType).toBe('Enrollment');
    });

    it('should support custom entity types', async () => {
      const log = await createLog({
        action: 'update',
        entityType: 'Setting',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
      });

      expect(log.entityType).toBe('Setting');
    });
  });

  describe('Change Tracking', () => {
    it('should track before and after values for updates', async () => {
      const log = await createLog({
        action: 'update',
        entityType: 'user',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        changes: {
          before: {
            email: 'old@example.com',
            isActive: true,
          },
          after: {
            email: 'new@example.com',
            isActive: false,
          },
        },
      });

      expect(log.changes.before.email).toBe('old@example.com');
      expect(log.changes.after.email).toBe('new@example.com');
      expect(log.changes.before.isActive).toBe(true);
      expect(log.changes.after.isActive).toBe(false);
    });

    it('should store full object for create actions', async () => {
      const log = await createLog({
        action: 'create',
        entityType: 'course',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        changes: {
          title: 'Introduction to Programming',
          code: 'CS101',
          credits: 3,
        },
      });

      expect(log.changes.title).toBe('Introduction to Programming');
      expect(log.changes.code).toBe('CS101');
      expect(log.changes.credits).toBe(3);
    });

    it('should store deleted data for delete actions', async () => {
      const log = await createLog({
        action: 'delete',
        entityType: 'Content',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        changes: {
          title: 'Deleted Content',
          contentType: 'video',
          fileUrl: 'https://example.com/video.mp4',
        },
      });

      expect(log.changes.title).toBe('Deleted Content');
      expect(log.changes.contentType).toBe('video');
    });
  });

  describe('Request Context', () => {
    it('should capture IP address', async () => {
      const log = await createLog({
        action: 'login',
        entityType: 'user',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        ipAddress: '10.0.0.15',
      });

      expect(log.ipAddress).toBe('10.0.0.15');
    });

    it('should capture user agent', async () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const log = await createLog({
        action: 'update',
        entityType: 'user',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        userAgent,
      });

      expect(log.userAgent).toBe(userAgent);
    });

    it('should capture request method', async () => {
      const log = await createLog({
        action: 'update',
        entityType: 'course',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        method: 'PUT',
      });

      expect(log.method).toBe('PUT');
    });

    it('should capture request path', async () => {
      const log = await createLog({
        action: 'update',
        entityType: 'course',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        path: '/api/v2/courses/123',
      });

      expect(log.path).toBe('/api/v2/courses/123');
    });

    it('should capture all request context', async () => {
      const log = await createLog({
        action: 'delete',
        entityType: 'enrollment',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0...',
        method: 'DELETE',
        path: '/api/v2/enrollments/456',
      });

      expect(log.ipAddress).toBe('192.168.1.50');
      expect(log.userAgent).toBeDefined();
      expect(log.method).toBe('DELETE');
      expect(log.path).toBe('/api/v2/enrollments/456');
    });
  });

  describe('Metadata and Additional Info', () => {
    it('should store additional metadata', async () => {
      const log = await createLog({
        action: 'update',
        entityType: 'Class',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        metadata: {
          reason: 'Class cancelled due to instructor unavailability',
          notificationSent: true,
          affectedStudents: 25,
        },
      });

      expect(log.metadata.reason).toBeDefined();
      expect(log.metadata.notificationSent).toBe(true);
      expect(log.metadata.affectedStudents).toBe(25);
    });

    it('should store error information for failed actions', async () => {
      const log = await createLog({
        action: 'update',
        entityType: 'enrollment',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        metadata: {
          error: 'Validation failed',
          errorCode: 'INVALID_STATUS',
        },
      });

      expect(log.metadata.error).toBe('Validation failed');
      expect(log.metadata.errorCode).toBe('INVALID_STATUS');
    });
  });

  describe('System Actions', () => {
    it('should support system-initiated actions without performedBy', async () => {
      const log = await createLog({
        action: 'update',
        entityType: 'enrollment',
        entityId: new mongoose.Types.ObjectId(),
        changes: {
          before: { status: 'active' },
          after: { status: 'expired' },
        },
        metadata: {
          source: 'system',
          reason: 'Auto-expiration based on end date',
        },
      });

      expect(log.userId).toBeNull();
      expect(log.metadata.source).toBe('system');
    });

    it('should track scheduled task actions', async () => {
      const log = await createLog({
        action: 'update',
        entityType: 'Report',
        entityId: new mongoose.Types.ObjectId(),
        metadata: {
          source: 'scheduled-task',
          taskName: 'monthly-report-generation',
        },
      });

      expect(log.metadata.source).toBe('scheduled-task');
      expect(log.metadata.taskName).toBe('monthly-report-generation');
    });
  });

  describe('Audit Log Validation', () => {
    it('should require action', async () => {
      await expect(
        AuditLog.create({
          entityType: 'user',
          entityId: new mongoose.Types.ObjectId(),
          userId: new mongoose.Types.ObjectId(),
        })
      ).rejects.toThrow();
    });

    it('should require entityType', async () => {
      await expect(
        AuditLog.create({
          action: 'update',
          entityId: new mongoose.Types.ObjectId(),
          userId: new mongoose.Types.ObjectId(),
        })
      ).rejects.toThrow();
    });

    it('should require entityId', async () => {
      await expect(
        AuditLog.create({
          action: 'update',
          entityType: 'user',
          userId: new mongoose.Types.ObjectId(),
        })
      ).rejects.toThrow();
    });

    it('should allow missing performedBy for system actions', async () => {
      const log = await createLog({
        action: 'update',
        entityType: 'user',
        entityId: new mongoose.Types.ObjectId(),
        metadata: { source: 'system' },
      });

      expect(log).toBeDefined();
      expect(log.userId).toBeNull();
    });
  });

  describe('Timestamp Tracking', () => {
    it('should automatically set createdAt timestamp', async () => {
      const log = await createLog({
        action: 'create',
        entityType: 'user',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
      });

      expect(log.createdAt).toBeDefined();
      expect(log.createdAt).toBeInstanceOf(Date);
    });

    it('should have timestamps close to current time', async () => {
      const before = new Date();
      const log = await createLog({
        action: 'login',
        entityType: 'user',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
      });
      const after = new Date();

      expect(log.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(log.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Query Optimization', () => {
    it('should efficiently query by performedBy', async () => {
      const userId = new mongoose.Types.ObjectId();

      await AuditLog.create({
        action: 'update',
        entityType: 'course',
        entityId: new mongoose.Types.ObjectId(),
        userId: userId,
      });

      await AuditLog.create({
        action: 'delete',
        entityType: 'Content',
        entityId: new mongoose.Types.ObjectId(),
        userId: userId,
      });

      const userLogs = await AuditLog.find({ userId: userId });
      expect(userLogs).toHaveLength(2);
    });

    it('should efficiently query by entityType and entityId', async () => {
      const entityId = new mongoose.Types.ObjectId();

      await AuditLog.create({
        action: 'create',
        entityType: 'user',
        entityId,
        userId: new mongoose.Types.ObjectId(),
      });

      await AuditLog.create({
        action: 'update',
        entityType: 'user',
        entityId,
        userId: new mongoose.Types.ObjectId(),
      });

      const entityLogs = await AuditLog.find({ entityType: 'user', entityId });
      expect(entityLogs).toHaveLength(2);
    });

    it('should efficiently query by date range', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      await AuditLog.create({
        action: 'login',
        entityType: 'user',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        createdAt: new Date('2026-01-15'),
      });

      const logs = await AuditLog.find({
        createdAt: { $gte: startDate, $lte: endDate },
      });

      expect(logs.length).toBeGreaterThan(0);
    });
  });
});
