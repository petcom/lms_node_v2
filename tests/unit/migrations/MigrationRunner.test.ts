import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { MigrationRunner } from '../../../src/migrations/MigrationRunner';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Migration Runner', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('Migration runner initialization', () => {
    it('should create migration runner instance', () => {
      const runner = new MigrationRunner();
      expect(runner).toBeDefined();
      expect(runner).toBeInstanceOf(MigrationRunner);
    });

    it('should have migration registry', () => {
      const runner = new MigrationRunner();
      expect(runner.getMigrations).toBeDefined();
      expect(typeof runner.getMigrations).toBe('function');
    });
  });

  describe('Migration registration', () => {
    it('should register migration', () => {
      const runner = new MigrationRunner();
      const migration = {
        name: 'test-migration',
        version: 1,
        up: jest.fn(),
        down: jest.fn(),
      };

      runner.register(migration);
      const migrations = runner.getMigrations();
      expect(migrations).toHaveLength(1);
      expect(migrations[0].name).toBe('test-migration');
    });

    it('should register multiple migrations', () => {
      const runner = new MigrationRunner();
      
      runner.register({
        name: 'migration-1',
        version: 1,
        up: jest.fn(),
        down: jest.fn(),
      });

      runner.register({
        name: 'migration-2',
        version: 2,
        up: jest.fn(),
        down: jest.fn(),
      });

      const migrations = runner.getMigrations();
      expect(migrations).toHaveLength(2);
    });

    it('should sort migrations by version', () => {
      const runner = new MigrationRunner();
      
      runner.register({ name: 'v2', version: 2, up: jest.fn(), down: jest.fn() });
      runner.register({ name: 'v1', version: 1, up: jest.fn(), down: jest.fn() });
      runner.register({ name: 'v3', version: 3, up: jest.fn(), down: jest.fn() });

      const migrations = runner.getMigrations();
      expect(migrations[0].version).toBe(1);
      expect(migrations[1].version).toBe(2);
      expect(migrations[2].version).toBe(3);
    });
  });

  describe('Migration execution', () => {
    it('should execute up migration', async () => {
      const runner = new MigrationRunner();
      const upFn = jest.fn().mockResolvedValue(true);
      
      runner.register({
        name: 'test-up',
        version: 1,
        up: upFn,
        down: jest.fn(),
      });

      await runner.up('test-up');
      expect(upFn).toHaveBeenCalled();
    });

    it('should execute down migration', async () => {
      const runner = new MigrationRunner();
      const downFn = jest.fn().mockResolvedValue(true);
      
      runner.register({
        name: 'test-down',
        version: 1,
        up: jest.fn(),
        down: downFn,
      });

      await runner.down('test-down');
      expect(downFn).toHaveBeenCalled();
    });

    it('should track migration status', async () => {
      const runner = new MigrationRunner();
      
      runner.register({
        name: 'track-test',
        version: 1,
        up: jest.fn().mockResolvedValue(true),
        down: jest.fn(),
      });

      await runner.up('track-test');
      const status = await runner.getStatus('track-test');
      expect(status).toBe('completed');
    });

    it('should handle migration errors', async () => {
      const runner = new MigrationRunner();
      const errorFn = jest.fn().mockRejectedValue(new Error('Migration failed'));
      
      runner.register({
        name: 'error-test',
        version: 1,
        up: errorFn,
        down: jest.fn(),
      });

      await expect(runner.up('error-test')).rejects.toThrow('Migration failed');
    });
  });

  describe('Migration rollback', () => {
    it('should rollback migration', async () => {
      const runner = new MigrationRunner();
      const upFn = jest.fn().mockResolvedValue(true);
      const downFn = jest.fn().mockResolvedValue(true);
      
      runner.register({
        name: 'rollback-test',
        version: 1,
        up: upFn,
        down: downFn,
      });

      await runner.up('rollback-test');
      await runner.rollback('rollback-test');
      
      expect(upFn).toHaveBeenCalled();
      expect(downFn).toHaveBeenCalled();
    });

    it('should rollback to specific version', async () => {
      const runner = new MigrationRunner();
      const down1 = jest.fn().mockResolvedValue(true);
      const down2 = jest.fn().mockResolvedValue(true);
      
      runner.register({
        name: 'v1',
        version: 1,
        up: jest.fn().mockResolvedValue(true),
        down: down1,
      });

      runner.register({
        name: 'v2',
        version: 2,
        up: jest.fn().mockResolvedValue(true),
        down: down2,
      });

      await runner.up('v1');
      await runner.up('v2');
      await runner.rollbackTo(1);

      expect(down2).toHaveBeenCalled();
      expect(down1).not.toHaveBeenCalled();
    });
  });

  describe('Migration batch operations', () => {
    it('should run all pending migrations', async () => {
      const runner = new MigrationRunner();
      const up1 = jest.fn().mockResolvedValue(true);
      const up2 = jest.fn().mockResolvedValue(true);
      
      runner.register({ name: 'v1', version: 1, up: up1, down: jest.fn() });
      runner.register({ name: 'v2', version: 2, up: up2, down: jest.fn() });

      await runner.upAll();
      
      expect(up1).toHaveBeenCalled();
      expect(up2).toHaveBeenCalled();
    });

    it('should skip already executed migrations', async () => {
      const runner = new MigrationRunner();
      const up1 = jest.fn().mockResolvedValue(true);
      const up2 = jest.fn().mockResolvedValue(true);
      
      runner.register({ name: 'v1', version: 1, up: up1, down: jest.fn() });
      runner.register({ name: 'v2', version: 2, up: up2, down: jest.fn() });

      await runner.up('v1');
      await runner.upAll();
      
      expect(up1).toHaveBeenCalledTimes(1);
      expect(up2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Migration metadata', () => {
    it('should store migration metadata', async () => {
      const runner = new MigrationRunner();
      
      runner.register({
        name: 'meta-test',
        version: 1,
        up: jest.fn().mockResolvedValue(true),
        down: jest.fn(),
        description: 'Test migration',
      });

      const migration = runner.getMigration('meta-test');
      expect(migration?.description).toBe('Test migration');
    });

    it('should track execution time', async () => {
      const runner = new MigrationRunner();
      
      runner.register({
        name: 'timing-test',
        version: 1,
        up: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(true), 100))
        ),
        down: jest.fn(),
      });

      const startTime = Date.now();
      await runner.up('timing-test');
      const executionTime = await runner.getExecutionTime('timing-test');
      
      expect(executionTime).toBeGreaterThanOrEqual(100);
    });

    it('should store migration logs', async () => {
      const runner = new MigrationRunner();
      
      runner.register({
        name: 'log-test',
        version: 1,
        up: jest.fn().mockResolvedValue(true),
        down: jest.fn(),
      });

      await runner.up('log-test');
      const logs = await runner.getLogs('log-test');
      
      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe('Migration validation', () => {
    it('should validate migration structure', () => {
      const runner = new MigrationRunner();
      
      expect(() => {
        runner.register({
          name: '',
          version: 1,
          up: jest.fn(),
          down: jest.fn(),
        });
      }).toThrow();
    });

    it('should prevent duplicate migration names', () => {
      const runner = new MigrationRunner();
      
      runner.register({
        name: 'duplicate',
        version: 1,
        up: jest.fn(),
        down: jest.fn(),
      });

      expect(() => {
        runner.register({
          name: 'duplicate',
          version: 2,
          up: jest.fn(),
          down: jest.fn(),
        });
      }).toThrow();
    });

    it('should prevent duplicate version numbers', () => {
      const runner = new MigrationRunner();
      
      runner.register({
        name: 'first',
        version: 1,
        up: jest.fn(),
        down: jest.fn(),
      });

      expect(() => {
        runner.register({
          name: 'second',
          version: 1,
          up: jest.fn(),
          down: jest.fn(),
        });
      }).toThrow();
    });
  });
});
