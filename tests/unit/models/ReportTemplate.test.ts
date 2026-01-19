import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ReportTemplate, IReportTemplate } from '@/models/reports/ReportTemplate.model';
import { LookupValue } from '@/models/LookupValue.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('ReportTemplate Model', () => {
  let mongoServer: MongoMemoryServer;
  let testUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Seed required LookupValues
    await LookupValue.create([
      {
        category: 'report-type',
        key: 'enrollment-summary',
        displayAs: 'Enrollment Summary',
        isActive: true
      },
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
        category: 'measure-type',
        key: 'completion-rate',
        displayAs: 'Completion Rate',
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
    await ReportTemplate.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create valid report template', async () => {
      const template = await ReportTemplate.create({
        name: 'Monthly Enrollment Report',
        reportType: 'enrollment-summary',
        parameters: {
          groupBy: ['department', 'course']
        },
        defaultOutput: {
          format: 'pdf'
        },
        createdBy: testUserId,
        visibility: 'private'
      });

      expect(template.name).toBe('Monthly Enrollment Report');
      expect(template.reportType).toBe('enrollment-summary');
      expect(template.visibility).toBe('private');
    });

    it('should require name field', async () => {
      const template = new ReportTemplate({
        reportType: 'enrollment-summary',
        parameters: {},
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId
      });

      await expect(template.save()).rejects.toThrow(/name/);
    });

    it('should require reportType field', async () => {
      const template = new ReportTemplate({
        name: 'Test Template',
        parameters: {},
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId
      });

      await expect(template.save()).rejects.toThrow(/reportType/);
    });

    it('should require createdBy field', async () => {
      const template = new ReportTemplate({
        name: 'Test Template',
        reportType: 'enrollment-summary',
        parameters: {},
        defaultOutput: { format: 'pdf' }
      });

      await expect(template.save()).rejects.toThrow(/createdBy/);
    });

    it('should default visibility to private', async () => {
      const template = await ReportTemplate.create({
        name: 'Test Template',
        reportType: 'enrollment-summary',
        parameters: {},
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId
      });

      expect(template.visibility).toBe('private');
    });

    it('should default output format to pdf', async () => {
      const template = await ReportTemplate.create({
        name: 'Test Template',
        reportType: 'enrollment-summary',
        parameters: {},
        defaultOutput: {},
        createdBy: testUserId,
        visibility: 'private'
      });

      expect(template.defaultOutput.format).toBe('pdf');
    });

    it('should default isActive to true', async () => {
      const template = await ReportTemplate.create({
        name: 'Test Template',
        reportType: 'enrollment-summary',
        parameters: {},
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId,
        visibility: 'private'
      });

      expect(template.isActive).toBe(true);
    });

    it('should default usageCount to 0', async () => {
      const template = await ReportTemplate.create({
        name: 'Test Template',
        reportType: 'enrollment-summary',
        parameters: {},
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId,
        visibility: 'private'
      });

      expect(template.usageCount).toBe(0);
    });
  });

  describe('LookupValue Validation', () => {
    it('should validate reportType against LookupValue', async () => {
      const template = new ReportTemplate({
        name: 'Test Template',
        reportType: 'invalid-report-type',
        parameters: {},
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId,
        visibility: 'private'
      });

      await expect(template.save()).rejects.toThrow(/Invalid reportType/);
    });

    it('should validate visibility against LookupValue', async () => {
      const template = new ReportTemplate({
        name: 'Test Template',
        reportType: 'enrollment-summary',
        parameters: {},
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId,
        visibility: 'invalid-visibility'
      });

      await expect(template.save()).rejects.toThrow(/Invalid visibility/);
    });

    it('should validate defaultOutput.format against LookupValue', async () => {
      const template = new ReportTemplate({
        name: 'Test Template',
        reportType: 'enrollment-summary',
        parameters: {},
        defaultOutput: { format: 'invalid-format' },
        createdBy: testUserId,
        visibility: 'private'
      });

      await expect(template.save()).rejects.toThrow(/Invalid defaultOutput.format/);
    });

    it('should validate measures against LookupValue', async () => {
      const template = new ReportTemplate({
        name: 'Test Template',
        reportType: 'enrollment-summary',
        parameters: {
          measures: ['completion-rate', 'invalid-measure']
        },
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId,
        visibility: 'private'
      });

      await expect(template.save()).rejects.toThrow(/Invalid measure/);
    });
  });

  describe('Parameters', () => {
    it('should store fixed date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-03-31');

      const template = await ReportTemplate.create({
        name: 'Q1 Template',
        reportType: 'enrollment-summary',
        parameters: {
          dateRange: {
            type: 'fixed',
            startDate,
            endDate
          }
        },
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId,
        visibility: 'private'
      });

      expect(template.parameters.dateRange?.type).toBe('fixed');
      expect(template.parameters.dateRange?.startDate).toEqual(startDate);
      expect(template.parameters.dateRange?.endDate).toEqual(endDate);
    });

    it('should store relative date range', async () => {
      const template = await ReportTemplate.create({
        name: 'Last 30 Days Template',
        reportType: 'enrollment-summary',
        parameters: {
          dateRange: {
            type: 'relative',
            relativeUnit: 'days',
            relativeCount: 30
          }
        },
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId,
        visibility: 'private'
      });

      expect(template.parameters.dateRange?.type).toBe('relative');
      expect(template.parameters.dateRange?.relativeUnit).toBe('days');
      expect(template.parameters.dateRange?.relativeCount).toBe(30);
    });

    it('should validate relative unit enum', async () => {
      const template = new ReportTemplate({
        name: 'Test Template',
        reportType: 'enrollment-summary',
        parameters: {
          dateRange: {
            type: 'relative',
            relativeUnit: 'invalid-unit' as any,
            relativeCount: 30
          }
        },
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId,
        visibility: 'private'
      });

      await expect(template.save()).rejects.toThrow(/not a valid relative unit/);
    });

    it('should store filter parameters', async () => {
      const departmentId = new mongoose.Types.ObjectId();
      const courseId = new mongoose.Types.ObjectId();

      const template = await ReportTemplate.create({
        name: 'Department Template',
        reportType: 'enrollment-summary',
        parameters: {
          filters: {
            departmentIds: [departmentId],
            courseIds: [courseId]
          },
          groupBy: ['department'],
          measures: ['completion-rate']
        },
        defaultOutput: { format: 'excel' },
        createdBy: testUserId,
        visibility: 'private'
      });

      expect(template.parameters.filters?.departmentIds).toContainEqual(departmentId);
      expect(template.parameters.filters?.courseIds).toContainEqual(courseId);
      expect(template.parameters.groupBy).toEqual(['department']);
      expect(template.parameters.measures).toEqual(['completion-rate']);
    });
  });

  describe('Sharing', () => {
    it('should store shared users', async () => {
      const sharedUserId = new mongoose.Types.ObjectId();

      const template = await ReportTemplate.create({
        name: 'Shared Template',
        reportType: 'enrollment-summary',
        parameters: {},
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId,
        visibility: 'private',
        sharedWith: {
          users: [sharedUserId]
        }
      });

      expect(template.sharedWith?.users).toContainEqual(sharedUserId);
    });

    it('should store shared departments', async () => {
      const departmentId = new mongoose.Types.ObjectId();

      const template = await ReportTemplate.create({
        name: 'Shared Template',
        reportType: 'enrollment-summary',
        parameters: {},
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId,
        visibility: 'private',
        sharedWith: {
          departments: [departmentId]
        }
      });

      expect(template.sharedWith?.departments).toContainEqual(departmentId);
    });

    it('should store shared roles', async () => {
      const template = await ReportTemplate.create({
        name: 'Shared Template',
        reportType: 'enrollment-summary',
        parameters: {},
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId,
        visibility: 'private',
        sharedWith: {
          roles: ['department-admin', 'instructor']
        }
      });

      expect(template.sharedWith?.roles).toContain('department-admin');
      expect(template.sharedWith?.roles).toContain('instructor');
    });
  });

  describe('Usage Tracking', () => {
    it('should track usage statistics', async () => {
      const lastUsedBy = new mongoose.Types.ObjectId();
      const lastUsedAt = new Date();

      const template = await ReportTemplate.create({
        name: 'Test Template',
        reportType: 'enrollment-summary',
        parameters: {},
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId,
        visibility: 'private',
        usageCount: 5,
        lastUsedAt,
        lastUsedBy
      });

      expect(template.usageCount).toBe(5);
      expect(template.lastUsedAt).toEqual(lastUsedAt);
      expect(template.lastUsedBy).toEqual(lastUsedBy);
    });

    it('should allow incrementing usage count', async () => {
      const template = await ReportTemplate.create({
        name: 'Test Template',
        reportType: 'enrollment-summary',
        parameters: {},
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId,
        visibility: 'private'
      });

      template.usageCount += 1;
      template.lastUsedAt = new Date();
      await template.save();

      expect(template.usageCount).toBe(1);
    });
  });

  describe('Text Search', () => {
    it('should support text search on name and description', async () => {
      await ReportTemplate.create({
        name: 'Monthly Enrollment Report',
        description: 'Track student enrollments monthly',
        reportType: 'enrollment-summary',
        parameters: {},
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId,
        visibility: 'private'
      });

      await ReportTemplate.create({
        name: 'Course Completion Analytics',
        description: 'Analyze course completion rates',
        reportType: 'enrollment-summary',
        parameters: {},
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId,
        visibility: 'private'
      });

      const results = await ReportTemplate.find({
        $text: { $search: 'enrollment' }
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Monthly Enrollment Report');
    });
  });

  describe('Filename Template', () => {
    it('should store filename template', async () => {
      const template = await ReportTemplate.create({
        name: 'Test Template',
        reportType: 'enrollment-summary',
        parameters: {},
        defaultOutput: {
          format: 'pdf',
          filenameTemplate: 'enrollment-report-{date}'
        },
        createdBy: testUserId,
        visibility: 'private'
      });

      expect(template.defaultOutput.filenameTemplate).toBe('enrollment-report-{date}');
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const template = await ReportTemplate.create({
        name: 'Test Template',
        reportType: 'enrollment-summary',
        parameters: {},
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId,
        visibility: 'private'
      });

      expect(template.createdAt).toBeDefined();
      expect(template.updatedAt).toBeDefined();
    });
  });

  describe('Status Management', () => {
    it('should allow deactivating template', async () => {
      const template = await ReportTemplate.create({
        name: 'Test Template',
        reportType: 'enrollment-summary',
        parameters: {},
        defaultOutput: { format: 'pdf' },
        createdBy: testUserId,
        visibility: 'private'
      });

      template.isActive = false;
      await template.save();

      expect(template.isActive).toBe(false);
    });
  });
});
