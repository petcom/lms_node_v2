import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ReportSchedule, IReportSchedule } from '@/models/reports/ReportSchedule.model';
import { ReportTemplate } from '@/models/reports/ReportTemplate.model';
import { LookupValue } from '@/models/LookupValue.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('ReportSchedule Model', () => {
  let mongoServer: MongoMemoryServer;
  let testUserId: mongoose.Types.ObjectId;
  let testTemplateId: mongoose.Types.ObjectId;

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
        category: 'output-format',
        key: 'pdf',
        displayAs: 'PDF',
        isActive: true
      }
    ]);

    testUserId = new mongoose.Types.ObjectId();

    // Create test template
    const template = await ReportTemplate.create({
      name: 'Test Template',
      reportType: 'enrollment-summary',
      parameters: {},
      defaultOutput: { format: 'pdf' },
      createdBy: testUserId,
      visibility: 'private'
    });

    testTemplateId = template._id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await ReportSchedule.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create valid report schedule', async () => {
      const schedule = await ReportSchedule.create({
        name: 'Daily Report',
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timeOfDay: '08:00',
          timezone: 'UTC'
        },
        output: {
          format: 'pdf'
        },
        delivery: {
          method: 'storage'
        },
        createdBy: testUserId
      });

      expect(schedule.name).toBe('Daily Report');
      expect(schedule.schedule.frequency).toBe('daily');
      expect(schedule.schedule.timeOfDay).toBe('08:00');
    });

    it('should require name field', async () => {
      const schedule = new ReportSchedule({
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: { method: 'storage' },
        createdBy: testUserId
      });

      await expect(schedule.save()).rejects.toThrow(/name/);
    });

    it('should require templateId field', async () => {
      const schedule = new ReportSchedule({
        name: 'Test Schedule',
        schedule: {
          frequency: 'daily',
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: { method: 'storage' },
        createdBy: testUserId
      });

      await expect(schedule.save()).rejects.toThrow(/templateId/);
    });

    it('should require createdBy field', async () => {
      const schedule = new ReportSchedule({
        name: 'Test Schedule',
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: { method: 'storage' }
      });

      await expect(schedule.save()).rejects.toThrow(/createdBy/);
    });

    it('should require schedule.frequency field', async () => {
      const schedule = new ReportSchedule({
        name: 'Test Schedule',
        templateId: testTemplateId,
        schedule: {
          timezone: 'UTC'
        } as any,
        output: { format: 'pdf' },
        delivery: { method: 'storage' },
        createdBy: testUserId
      });

      await expect(schedule.save()).rejects.toThrow(/frequency/);
    });

    it('should validate frequency enum', async () => {
      const schedule = new ReportSchedule({
        name: 'Test Schedule',
        templateId: testTemplateId,
        schedule: {
          frequency: 'invalid-frequency' as any,
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: { method: 'storage' },
        createdBy: testUserId
      });

      await expect(schedule.save()).rejects.toThrow(/not a valid frequency/);
    });

    it('should validate timeOfDay format', async () => {
      const schedule = new ReportSchedule({
        name: 'Test Schedule',
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timeOfDay: 'invalid-time',
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: { method: 'storage' },
        createdBy: testUserId
      });

      await expect(schedule.save()).rejects.toThrow(/HH:MM format/);
    });

    it('should validate dayOfWeek range', async () => {
      const schedule = new ReportSchedule({
        name: 'Test Schedule',
        templateId: testTemplateId,
        schedule: {
          frequency: 'weekly',
          dayOfWeek: 7,
          timeOfDay: '08:00',
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: { method: 'storage' },
        createdBy: testUserId
      });

      await expect(schedule.save()).rejects.toThrow(/between 0/);
    });

    it('should validate dayOfMonth range', async () => {
      const schedule = new ReportSchedule({
        name: 'Test Schedule',
        templateId: testTemplateId,
        schedule: {
          frequency: 'monthly',
          dayOfMonth: 32,
          timeOfDay: '08:00',
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: { method: 'storage' },
        createdBy: testUserId
      });

      await expect(schedule.save()).rejects.toThrow(/between 1 and 31/);
    });

    it('should default timezone to UTC', async () => {
      const schedule = await ReportSchedule.create({
        name: 'Test Schedule',
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timeOfDay: '08:00'
        },
        output: { format: 'pdf' },
        delivery: { method: 'storage' },
        createdBy: testUserId
      });

      expect(schedule.schedule.timezone).toBe('UTC');
    });

    it('should default isActive to true', async () => {
      const schedule = await ReportSchedule.create({
        name: 'Test Schedule',
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: { method: 'storage' },
        createdBy: testUserId
      });

      expect(schedule.isActive).toBe(true);
    });

    it('should default isPaused to false', async () => {
      const schedule = await ReportSchedule.create({
        name: 'Test Schedule',
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: { method: 'storage' },
        createdBy: testUserId
      });

      expect(schedule.isPaused).toBe(false);
    });

    it('should default execution counts to 0', async () => {
      const schedule = await ReportSchedule.create({
        name: 'Test Schedule',
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: { method: 'storage' },
        createdBy: testUserId
      });

      expect(schedule.runCount).toBe(0);
      expect(schedule.failureCount).toBe(0);
      expect(schedule.consecutiveFailures).toBe(0);
    });
  });

  describe('LookupValue Validation', () => {
    it('should validate output.format against LookupValue', async () => {
      const schedule = new ReportSchedule({
        name: 'Test Schedule',
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timezone: 'UTC'
        },
        output: { format: 'invalid-format' },
        delivery: { method: 'storage' },
        createdBy: testUserId
      });

      await expect(schedule.save()).rejects.toThrow(/Invalid output.format/);
    });
  });

  describe('Next Run Time Calculation', () => {
    it('should calculate nextRunAt on save for active schedules', async () => {
      const schedule = await ReportSchedule.create({
        name: 'Daily Report',
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timeOfDay: '08:00',
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: { method: 'storage' },
        createdBy: testUserId
      });

      expect(schedule.nextRunAt).toBeDefined();
      expect(schedule.nextRunAt!.getHours()).toBe(8);
      expect(schedule.nextRunAt!.getMinutes()).toBe(0);
    });

    it('should not calculate nextRunAt for paused schedules', async () => {
      const schedule = await ReportSchedule.create({
        name: 'Daily Report',
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timeOfDay: '08:00',
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: { method: 'storage' },
        createdBy: testUserId,
        isPaused: true
      });

      expect(schedule.nextRunAt).toBeUndefined();
    });

    it('should not calculate nextRunAt for inactive schedules', async () => {
      const schedule = await ReportSchedule.create({
        name: 'Daily Report',
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timeOfDay: '08:00',
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: { method: 'storage' },
        createdBy: testUserId,
        isActive: false
      });

      expect(schedule.nextRunAt).toBeUndefined();
    });

    describe('Daily Frequency', () => {
      it('should calculate next run for daily schedule', async () => {
        const schedule = await ReportSchedule.create({
          name: 'Daily Report',
          templateId: testTemplateId,
          schedule: {
            frequency: 'daily',
            timeOfDay: '14:30',
            timezone: 'UTC'
          },
          output: { format: 'pdf' },
          delivery: { method: 'storage' },
          createdBy: testUserId
        });

        const nextRun = schedule.nextRunAt!;
        expect(nextRun.getHours()).toBe(14);
        expect(nextRun.getMinutes()).toBe(30);
      });

      it('should schedule for tomorrow if time has passed today', async () => {
        const now = new Date();
        const pastTime = new Date(now);
        pastTime.setHours(now.getHours() - 1, 0, 0, 0);

        const timeStr = `${pastTime.getHours().toString().padStart(2, '0')}:00`;

        const schedule = await ReportSchedule.create({
          name: 'Daily Report',
          templateId: testTemplateId,
          schedule: {
            frequency: 'daily',
            timeOfDay: timeStr,
            timezone: 'UTC'
          },
          output: { format: 'pdf' },
          delivery: { method: 'storage' },
          createdBy: testUserId
        });

        const nextRun = schedule.nextRunAt!;
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        expect(nextRun.getDate()).toBe(tomorrow.getDate());
      });
    });

    describe('Weekly Frequency', () => {
      it('should calculate next run for weekly schedule', async () => {
        const schedule = await ReportSchedule.create({
          name: 'Weekly Report',
          templateId: testTemplateId,
          schedule: {
            frequency: 'weekly',
            dayOfWeek: 1, // Monday
            timeOfDay: '09:00',
            timezone: 'UTC'
          },
          output: { format: 'pdf' },
          delivery: { method: 'storage' },
          createdBy: testUserId
        });

        const nextRun = schedule.nextRunAt!;
        expect(nextRun.getDay()).toBe(1); // Monday
        expect(nextRun.getHours()).toBe(9);
        expect(nextRun.getMinutes()).toBe(0);
      });
    });

    describe('Monthly Frequency', () => {
      it('should calculate next run for monthly schedule', async () => {
        const schedule = await ReportSchedule.create({
          name: 'Monthly Report',
          templateId: testTemplateId,
          schedule: {
            frequency: 'monthly',
            dayOfMonth: 1,
            timeOfDay: '00:00',
            timezone: 'UTC'
          },
          output: { format: 'pdf' },
          delivery: { method: 'storage' },
          createdBy: testUserId
        });

        const nextRun = schedule.nextRunAt!;
        expect(nextRun.getDate()).toBe(1);
        expect(nextRun.getHours()).toBe(0);
        expect(nextRun.getMinutes()).toBe(0);
      });
    });

    describe('Once Frequency', () => {
      it('should return runAt for one-time schedule', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const schedule = await ReportSchedule.create({
          name: 'One-time Report',
          templateId: testTemplateId,
          schedule: {
            frequency: 'once',
            runAt: futureDate,
            timezone: 'UTC'
          },
          output: { format: 'pdf' },
          delivery: { method: 'storage' },
          createdBy: testUserId
        });

        expect(schedule.nextRunAt).toEqual(futureDate);
      });

      it('should return null for past one-time schedule', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 7);

        const schedule = await ReportSchedule.create({
          name: 'Past One-time Report',
          templateId: testTemplateId,
          schedule: {
            frequency: 'once',
            runAt: pastDate,
            timezone: 'UTC'
          },
          output: { format: 'pdf' },
          delivery: { method: 'storage' },
          createdBy: testUserId
        });

        expect(schedule.nextRunAt).toBeNull();
      });
    });
  });

  describe('Delivery Configuration', () => {
    it('should store email delivery settings', async () => {
      const schedule = await ReportSchedule.create({
        name: 'Email Report',
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: {
          method: 'email',
          email: {
            recipients: ['admin@example.com', 'user@example.com'],
            subject: 'Daily Report',
            body: 'Please find attached the daily report.',
            includeLink: true,
            attachReport: true
          }
        },
        createdBy: testUserId
      });

      expect(schedule.delivery.method).toBe('email');
      expect(schedule.delivery.email?.recipients).toHaveLength(2);
      expect(schedule.delivery.email?.subject).toBe('Daily Report');
    });

    it('should store storage delivery settings', async () => {
      const schedule = await ReportSchedule.create({
        name: 'Storage Report',
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: {
          method: 'storage',
          storage: {
            provider: 's3',
            bucket: 'reports',
            keyTemplate: 'daily/{date}/report.pdf'
          }
        },
        createdBy: testUserId
      });

      expect(schedule.delivery.method).toBe('storage');
      expect(schedule.delivery.storage?.provider).toBe('s3');
      expect(schedule.delivery.storage?.bucket).toBe('reports');
    });

    it('should support both email and storage delivery', async () => {
      const schedule = await ReportSchedule.create({
        name: 'Both Delivery Report',
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: {
          method: 'both',
          email: {
            recipients: ['admin@example.com']
          },
          storage: {
            provider: 's3',
            bucket: 'reports'
          }
        },
        createdBy: testUserId
      });

      expect(schedule.delivery.method).toBe('both');
      expect(schedule.delivery.email?.recipients).toBeDefined();
      expect(schedule.delivery.storage?.provider).toBe('s3');
    });
  });

  describe('Date Range Type', () => {
    it('should default dateRangeType to previous-period', async () => {
      const schedule = await ReportSchedule.create({
        name: 'Test Schedule',
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: { method: 'storage' },
        createdBy: testUserId
      });

      expect(schedule.dateRangeType).toBe('previous-period');
    });

    it('should store custom date range offsets', async () => {
      const schedule = await ReportSchedule.create({
        name: 'Custom Range Report',
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timezone: 'UTC'
        },
        dateRangeType: 'custom',
        customDateRange: {
          startDaysOffset: -30,
          endDaysOffset: -1
        },
        output: { format: 'pdf' },
        delivery: { method: 'storage' },
        createdBy: testUserId
      });

      expect(schedule.dateRangeType).toBe('custom');
      expect(schedule.customDateRange?.startDaysOffset).toBe(-30);
      expect(schedule.customDateRange?.endDaysOffset).toBe(-1);
    });
  });

  describe('Execution Tracking', () => {
    it('should track execution statistics', async () => {
      const schedule = await ReportSchedule.create({
        name: 'Test Schedule',
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: { method: 'storage' },
        createdBy: testUserId,
        runCount: 10,
        failureCount: 2,
        consecutiveFailures: 0,
        lastRunStatus: 'success'
      });

      expect(schedule.runCount).toBe(10);
      expect(schedule.failureCount).toBe(2);
      expect(schedule.lastRunStatus).toBe('success');
    });
  });

  describe('Pause/Resume', () => {
    it('should store pause information', async () => {
      const pausedBy = new mongoose.Types.ObjectId();
      const schedule = await ReportSchedule.create({
        name: 'Test Schedule',
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: { method: 'storage' },
        createdBy: testUserId,
        isPaused: true,
        pausedReason: 'System maintenance',
        pausedAt: new Date(),
        pausedBy
      });

      expect(schedule.isPaused).toBe(true);
      expect(schedule.pausedReason).toBe('System maintenance');
      expect(schedule.pausedBy).toEqual(pausedBy);
    });
  });

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const schedule = await ReportSchedule.create({
        name: 'Test Schedule',
        templateId: testTemplateId,
        schedule: {
          frequency: 'daily',
          timezone: 'UTC'
        },
        output: { format: 'pdf' },
        delivery: { method: 'storage' },
        createdBy: testUserId
      });

      expect(schedule.createdAt).toBeDefined();
      expect(schedule.updatedAt).toBeDefined();
    });
  });
});
