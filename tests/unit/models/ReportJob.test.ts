import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ReportJob, IReportJob } from '@/models/reports/ReportJob.model';
import { LookupValue } from '@/models/LookupValue.model';
import User from '@/models/auth/User.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('ReportJob Model', () => {
  let mongoServer: MongoMemoryServer;
  let testUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Seed required LookupValues for report system
    await LookupValue.create([
      // Report types
      {
        category: 'report-type',
        key: 'enrollment-summary',
        displayAs: 'Enrollment Summary',
        isActive: true
      },
      {
        category: 'report-type',
        key: 'completion-analytics',
        displayAs: 'Completion Analytics',
        isActive: true
      },
      // Report statuses
      {
        category: 'report-status',
        key: 'pending',
        displayAs: 'Pending',
        isActive: true
      },
      {
        category: 'report-status',
        key: 'processing',
        displayAs: 'Processing',
        isActive: true
      },
      {
        category: 'report-status',
        key: 'ready',
        displayAs: 'Ready',
        isActive: true
      },
      {
        category: 'report-status',
        key: 'failed',
        displayAs: 'Failed',
        isActive: true
      },
      // Report priorities
      {
        category: 'report-priority',
        key: 'normal',
        displayAs: 'Normal',
        isActive: true
      },
      {
        category: 'report-priority',
        key: 'high',
        displayAs: 'High',
        isActive: true
      },
      // Report visibility
      {
        category: 'report-visibility',
        key: 'private',
        displayAs: 'Private',
        isActive: true
      },
      {
        category: 'report-visibility',
        key: 'organization',
        displayAs: 'Organization',
        isActive: true
      },
      // Output formats
      {
        category: 'output-format',
        key: 'pdf',
        displayAs: 'PDF',
        isActive: true
      },
      {
        category: 'output-format',
        key: 'excel',
        displayAs: 'Excel',
        isActive: true
      },
      {
        category: 'output-format',
        key: 'json',
        displayAs: 'JSON',
        isActive: true
      },
      // Measure types
      {
        category: 'measure-type',
        key: 'completion-rate',
        displayAs: 'Completion Rate',
        isActive: true
      },
      {
        category: 'measure-type',
        key: 'enrollment-count',
        displayAs: 'Enrollment Count',
        isActive: true
      }
    ]);

    testUserId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await ReportJob.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create valid report job with required fields', async () => {
      const job = await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Q1 Enrollment Report',
        parameters: {
          dateRange: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31')
          }
        },
        output: {
          format: 'pdf'
        },
        requestedBy: testUserId,
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      expect(job.reportType).toBe('enrollment-summary');
      expect(job.name).toBe('Q1 Enrollment Report');
      expect(job.status).toBe('pending');
      expect(job.output.format).toBe('pdf');
    });

    it('should require reportType field', async () => {
      const job = new ReportJob({
        name: 'Test Report',
        parameters: {},
        output: { format: 'pdf' },
        requestedBy: testUserId
      });

      await expect(job.save()).rejects.toThrow(/reportType/);
    });

    it('should require name field', async () => {
      const job = new ReportJob({
        reportType: 'enrollment-summary',
        parameters: {},
        output: { format: 'pdf' },
        requestedBy: testUserId
      });

      await expect(job.save()).rejects.toThrow(/name/);
    });

    it('should require requestedBy field', async () => {
      const job = new ReportJob({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'pdf' }
      });

      await expect(job.save()).rejects.toThrow(/requestedBy/);
    });

    it('should default status to pending', async () => {
      const job = await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'pdf' },
        requestedBy: testUserId,
        priority: 'normal',
        visibility: 'private'
      });

      expect(job.status).toBe('pending');
    });

    it('should default priority to normal', async () => {
      const job = await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'pdf' },
        requestedBy: testUserId,
        status: 'pending',
        visibility: 'private'
      });

      expect(job.priority).toBe('normal');
    });

    it('should default output format to json', async () => {
      const job = await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: {},
        requestedBy: testUserId,
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      expect(job.output.format).toBe('json');
    });

    it('should validate name max length', async () => {
      const longName = 'a'.repeat(201);
      const job = new ReportJob({
        reportType: 'enrollment-summary',
        name: longName,
        parameters: {},
        output: { format: 'pdf' },
        requestedBy: testUserId,
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      await expect(job.save()).rejects.toThrow(/200 characters/);
    });
  });

  describe('LookupValue Validation', () => {
    it('should validate reportType against LookupValue', async () => {
      const job = new ReportJob({
        reportType: 'invalid-report-type',
        name: 'Test Report',
        parameters: {},
        output: { format: 'pdf' },
        requestedBy: testUserId,
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      await expect(job.save()).rejects.toThrow(/Invalid reportType/);
    });

    it('should validate status against LookupValue', async () => {
      const job = new ReportJob({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'pdf' },
        requestedBy: testUserId,
        status: 'invalid-status',
        priority: 'normal',
        visibility: 'private'
      });

      await expect(job.save()).rejects.toThrow(/Invalid status/);
    });

    it('should validate priority against LookupValue', async () => {
      const job = new ReportJob({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'pdf' },
        requestedBy: testUserId,
        status: 'pending',
        priority: 'invalid-priority',
        visibility: 'private'
      });

      await expect(job.save()).rejects.toThrow(/Invalid priority/);
    });

    it('should validate visibility against LookupValue', async () => {
      const job = new ReportJob({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'pdf' },
        requestedBy: testUserId,
        status: 'pending',
        priority: 'normal',
        visibility: 'invalid-visibility'
      });

      await expect(job.save()).rejects.toThrow(/Invalid visibility/);
    });

    it('should validate output.format against LookupValue', async () => {
      const job = new ReportJob({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'invalid-format' },
        requestedBy: testUserId,
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      await expect(job.save()).rejects.toThrow(/Invalid output.format/);
    });

    it('should validate measures against LookupValue', async () => {
      const job = new ReportJob({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {
          measures: ['completion-rate', 'invalid-measure']
        },
        output: { format: 'pdf' },
        requestedBy: testUserId,
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      await expect(job.save()).rejects.toThrow(/Invalid measure/);
    });
  });

  describe('Parameters', () => {
    it('should store date range parameters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-03-31');

      const job = await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Q1 Report',
        parameters: {
          dateRange: { startDate, endDate }
        },
        output: { format: 'pdf' },
        requestedBy: testUserId,
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      expect(job.parameters.dateRange?.startDate).toEqual(startDate);
      expect(job.parameters.dateRange?.endDate).toEqual(endDate);
    });

    it('should store filter parameters', async () => {
      const departmentId = new mongoose.Types.ObjectId();
      const courseId = new mongoose.Types.ObjectId();

      const job = await ReportJob.create({
        reportType: 'completion-analytics',
        name: 'Course Completion',
        parameters: {
          filters: {
            departmentIds: [departmentId],
            courseIds: [courseId],
            eventTypes: ['enrollment-completed']
          }
        },
        output: { format: 'excel' },
        requestedBy: testUserId,
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      expect(job.parameters.filters?.departmentIds).toContainEqual(departmentId);
      expect(job.parameters.filters?.courseIds).toContainEqual(courseId);
    });

    it('should store groupBy and measures', async () => {
      const job = await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Department Summary',
        parameters: {
          groupBy: ['department', 'course'],
          measures: ['enrollment-count', 'completion-rate']
        },
        output: { format: 'pdf' },
        requestedBy: testUserId,
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      expect(job.parameters.groupBy).toEqual(['department', 'course']);
      expect(job.parameters.measures).toEqual(['enrollment-count', 'completion-rate']);
    });
  });

  describe('Progress Tracking', () => {
    it('should store progress information', async () => {
      const job = await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'pdf' },
        requestedBy: testUserId,
        status: 'processing',
        priority: 'normal',
        visibility: 'private',
        progress: {
          currentStep: 'Fetching data',
          percentage: 45,
          recordsProcessed: 450,
          totalRecords: 1000
        }
      });

      expect(job.progress?.currentStep).toBe('Fetching data');
      expect(job.progress?.percentage).toBe(45);
      expect(job.progress?.recordsProcessed).toBe(450);
      expect(job.progress?.totalRecords).toBe(1000);
    });

    it('should validate percentage range', async () => {
      const job = new ReportJob({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'pdf' },
        requestedBy: testUserId,
        status: 'processing',
        priority: 'normal',
        visibility: 'private',
        progress: {
          percentage: 150
        }
      });

      await expect(job.save()).rejects.toThrow(/percentage cannot exceed 100/);
    });
  });

  describe('Error Tracking', () => {
    it('should store error information', async () => {
      const job = await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'pdf' },
        requestedBy: testUserId,
        status: 'failed',
        priority: 'normal',
        visibility: 'private',
        error: {
          code: 'DB_TIMEOUT',
          message: 'Database query timeout',
          retryCount: 3
        }
      });

      expect(job.error?.code).toBe('DB_TIMEOUT');
      expect(job.error?.message).toBe('Database query timeout');
      expect(job.error?.retryCount).toBe(3);
    });
  });

  describe('Output Configuration', () => {
    it('should store storage information', async () => {
      const job = await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: {
          format: 'pdf',
          storage: {
            provider: 's3',
            bucket: 'reports',
            key: 'enrollment-2024-q1.pdf',
            url: 'https://s3.amazonaws.com/reports/enrollment-2024-q1.pdf'
          }
        },
        requestedBy: testUserId,
        status: 'ready',
        priority: 'normal',
        visibility: 'private'
      });

      expect(job.output.storage?.provider).toBe('s3');
      expect(job.output.storage?.bucket).toBe('reports');
      expect(job.output.storage?.key).toBe('enrollment-2024-q1.pdf');
    });

    it('should validate storage provider enum', async () => {
      const job = new ReportJob({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: {
          format: 'pdf',
          storage: {
            provider: 'invalid-provider' as any
          }
        },
        requestedBy: testUserId,
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      await expect(job.save()).rejects.toThrow(/not a valid storage provider/);
    });
  });

  describe('Expiration', () => {
    it('should allow setting custom expiration date', async () => {
      const customExpiry = new Date('2025-01-01');
      const job = await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'pdf' },
        requestedBy: testUserId,
        status: 'pending',
        priority: 'normal',
        visibility: 'private',
        expiresAt: customExpiry
      });

      expect(job.expiresAt).toEqual(customExpiry);
    });

    it('should allow report without expiration date', async () => {
      const job = await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'pdf' },
        requestedBy: testUserId,
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      // expiresAt is optional in model (set by service layer)
      expect(job.expiresAt).toBeUndefined();
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const job = await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'pdf' },
        requestedBy: testUserId,
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      expect(job.createdAt).toBeDefined();
      expect(job.updatedAt).toBeDefined();
    });

    it('should track startedAt and completedAt', async () => {
      const startedAt = new Date();
      const job = await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'pdf' },
        requestedBy: testUserId,
        status: 'processing',
        priority: 'normal',
        visibility: 'private',
        startedAt
      });

      expect(job.startedAt).toEqual(startedAt);

      job.status = 'ready';
      job.completedAt = new Date();
      await job.save();

      expect(job.completedAt).toBeDefined();
    });
  });
});
