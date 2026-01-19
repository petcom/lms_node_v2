import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Setting from '../../../src/models/system/Setting.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Setting Model', () => {
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
    await Setting.deleteMany({});
  });

  describe('Setting creation', () => {
    it('should create a system setting', async () => {
      const setting = await Setting.create({
        key: 'site.name',
        value: 'LMS Platform',
        category: 'system',
        dataType: 'string',
        description: 'Site name displayed to users',
      });

      expect(setting.key).toBe('site.name');
      expect(setting.value).toBe('LMS Platform');
      expect(setting.category).toBe('system');
      expect(setting.dataType).toBe('string');
      expect(setting.isPublic).toBe(false);
      expect(setting.isEditable).toBe(true);
    });

    it('should create a public setting', async () => {
      const setting = await Setting.create({
        key: 'features.public_enrollment',
        value: true,
        category: 'features',
        dataType: 'boolean',
        isPublic: true,
      });

      expect(setting.isPublic).toBe(true);
    });

    it('should create a non-editable setting', async () => {
      const setting = await Setting.create({
        key: 'system.version',
        value: '2.0.0',
        category: 'system',
        dataType: 'string',
        isEditable: false,
      });

      expect(setting.isEditable).toBe(false);
    });
  });

  describe('Data types', () => {
    it('should support string data type', async () => {
      const setting = await Setting.create({
        key: 'site.description',
        value: 'Welcome to our LMS',
        category: 'system',
        dataType: 'string',
      });

      expect(setting.dataType).toBe('string');
      expect(typeof setting.value).toBe('string');
    });

    it('should support boolean data type', async () => {
      const setting = await Setting.create({
        key: 'features.sso_enabled',
        value: true,
        category: 'features',
        dataType: 'boolean',
      });

      expect(setting.dataType).toBe('boolean');
      expect(typeof setting.value).toBe('boolean');
    });

    it('should support number data type', async () => {
      const setting = await Setting.create({
        key: 'limits.max_file_size',
        value: 10485760,
        category: 'limits',
        dataType: 'number',
      });

      expect(setting.dataType).toBe('number');
      expect(typeof setting.value).toBe('number');
    });

    it('should support object data type', async () => {
      const setting = await Setting.create({
        key: 'smtp.config',
        value: {
          host: 'smtp.example.com',
          port: 587,
          secure: false,
        },
        category: 'email',
        dataType: 'object',
      });

      expect(setting.dataType).toBe('object');
      expect(typeof setting.value).toBe('object');
      expect(setting.value).toHaveProperty('host');
    });

    it('should support array data type', async () => {
      const setting = await Setting.create({
        key: 'allowed.domains',
        value: ['example.com', 'company.com', 'university.edu'],
        category: 'security',
        dataType: 'array',
      });

      expect(setting.dataType).toBe('array');
      expect(Array.isArray(setting.value)).toBe(true);
      expect(setting.value).toHaveLength(3);
    });

    it('should support json data type', async () => {
      const setting = await Setting.create({
        key: 'theme.colors',
        value: JSON.stringify({ primary: '#007bff', secondary: '#6c757d' }),
        category: 'appearance',
        dataType: 'json',
      });

      expect(setting.dataType).toBe('json');
      const parsed = JSON.parse(setting.value);
      expect(parsed).toHaveProperty('primary');
    });
  });

  describe('Categories', () => {
    it('should support system category', async () => {
      const setting = await Setting.create({
        key: 'system.timezone',
        value: 'UTC',
        category: 'system',
        dataType: 'string',
      });

      expect(setting.category).toBe('system');
    });

    it('should support email category', async () => {
      const setting = await Setting.create({
        key: 'email.from_address',
        value: 'noreply@lms.com',
        category: 'email',
        dataType: 'string',
      });

      expect(setting.category).toBe('email');
    });

    it('should support security category', async () => {
      const setting = await Setting.create({
        key: 'security.session_timeout',
        value: 3600,
        category: 'security',
        dataType: 'number',
      });

      expect(setting.category).toBe('security');
    });

    it('should support features category', async () => {
      const setting = await Setting.create({
        key: 'features.gamification',
        value: true,
        category: 'features',
        dataType: 'boolean',
      });

      expect(setting.category).toBe('features');
    });

    it('should support appearance category', async () => {
      const setting = await Setting.create({
        key: 'appearance.logo_url',
        value: 'https://cdn.example.com/logo.png',
        category: 'appearance',
        dataType: 'string',
      });

      expect(setting.category).toBe('appearance');
    });

    it('should support limits category', async () => {
      const setting = await Setting.create({
        key: 'limits.max_enrollments',
        value: 1000,
        category: 'limits',
        dataType: 'number',
      });

      expect(setting.category).toBe('limits');
    });
  });

  describe('Validation constraints', () => {
    it('should support min constraint for numbers', async () => {
      const setting = await Setting.create({
        key: 'limits.min_password_length',
        value: 8,
        category: 'security',
        dataType: 'number',
        validationRules: {
          min: 6,
          max: 128,
        },
      });

      expect(setting.validationRules?.min).toBe(6);
    });

    it('should support max constraint for numbers', async () => {
      const setting = await Setting.create({
        key: 'limits.max_upload_size',
        value: 5242880,
        category: 'limits',
        dataType: 'number',
        validationRules: {
          max: 10485760,
        },
      });

      expect(setting.validationRules?.max).toBe(10485760);
    });

    it('should support regex pattern validation', async () => {
      const setting = await Setting.create({
        key: 'email.domain_pattern',
        value: '@company.com',
        category: 'email',
        dataType: 'string',
        validationRules: {
          pattern: '^@[a-z0-9-]+\\.[a-z]{2,}$',
        },
      });

      expect(setting.validationRules?.pattern).toBe('^@[a-z0-9-]+\\.[a-z]{2,}$');
    });

    it('should support enum values', async () => {
      const setting = await Setting.create({
        key: 'system.environment',
        value: 'production',
        category: 'system',
        dataType: 'string',
        validationRules: {
          enum: ['development', 'staging', 'production'],
        },
      });

      expect(setting.validationRules?.enum).toContain('production');
    });
  });

  describe('Default values', () => {
    it('should store default value', async () => {
      const setting = await Setting.create({
        key: 'features.notifications',
        value: true,
        category: 'features',
        dataType: 'boolean',
        defaultValue: false,
      });

      expect(setting.defaultValue).toBe(false);
    });

    it('should support complex default values', async () => {
      const defaultConfig = {
        retries: 3,
        timeout: 5000,
      };

      const setting = await Setting.create({
        key: 'api.config',
        value: { retries: 5, timeout: 10000 },
        category: 'system',
        dataType: 'object',
        defaultValue: defaultConfig,
      });

      expect(setting.defaultValue).toEqual(defaultConfig);
    });
  });

  describe('Metadata and timestamps', () => {
    it('should track last modified info', async () => {
      const userId = new mongoose.Types.ObjectId();
      const setting = await Setting.create({
        key: 'system.maintenance_mode',
        value: false,
        category: 'system',
        dataType: 'boolean',
        lastModifiedBy: userId,
      });

      expect(setting.lastModifiedBy?.toString()).toBe(userId.toString());
    });

    it('should auto-generate timestamps', async () => {
      const setting = await Setting.create({
        key: 'test.timestamp',
        value: 'test',
        category: 'system',
        dataType: 'string',
      });

      expect(setting.createdAt).toBeDefined();
      expect(setting.updatedAt).toBeDefined();
    });

    it('should store metadata', async () => {
      const setting = await Setting.create({
        key: 'feature.beta_flag',
        value: true,
        category: 'features',
        dataType: 'boolean',
        metadata: {
          addedInVersion: '2.1.0',
          deprecatedInVersion: null,
          relatedSettings: ['feature.alpha_flag'],
        },
      });

      expect(setting.metadata).toHaveProperty('addedInVersion');
      expect(setting.metadata.relatedSettings).toContain('feature.alpha_flag');
    });
  });

  describe('Required fields', () => {
    it('should require key field', async () => {
      await expect(
        Setting.create({
          value: 'test',
          category: 'system',
          dataType: 'string',
        })
      ).rejects.toThrow();
    });

    it('should require category field', async () => {
      await expect(
        Setting.create({
          key: 'test.key',
          value: 'test',
          dataType: 'string',
        })
      ).rejects.toThrow();
    });

    it('should require dataType field', async () => {
      await expect(
        Setting.create({
          key: 'test.key',
          value: 'test',
          category: 'system',
        })
      ).rejects.toThrow();
    });
  });

  describe('Unique key constraint', () => {
    it('should enforce unique key', async () => {
      await Setting.create({
        key: 'unique.key',
        value: 'first',
        category: 'system',
        dataType: 'string',
      });

      await expect(
        Setting.create({
          key: 'unique.key',
          value: 'second',
          category: 'system',
          dataType: 'string',
        })
      ).rejects.toThrow();
    });
  });

  describe('Indexes', () => {
    it('should have unique index on key', async () => {
      const indexes = await Setting.collection.getIndexes();
      expect(indexes).toHaveProperty('key_1');
      expect(indexes.key_1).toEqual([['key', 1]]);
    });

    it('should have index on category', async () => {
      const indexes = await Setting.collection.getIndexes();
      expect(indexes).toHaveProperty('category_1');
    });

    it('should have index on isPublic', async () => {
      const indexes = await Setting.collection.getIndexes();
      expect(indexes).toHaveProperty('isPublic_1');
    });
  });
});
