import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Report } from '@/models/system/Report.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

let mongoServer: MongoMemoryServer;

describeIfMongo('Report Model', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Report.deleteMany({});
  });

  describe('Report Creation', () => {
    it('should create a course analytics report', async () => {
      const report = await Report.create({
        name: 'Course Completion Report',
        reportType: 'course-analytics',
        description: 'Monthly course completion statistics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'pdf',
        status: 'completed',
      });

      expect(report).toBeDefined();
      expect(report.name).toBe('Course Completion Report');
      expect(report.reportType).toBe('course-analytics');
      expect(report.status).toBe('completed');
    });

    it('should create a learner progress report', async () => {
      const report = await Report.create({
        name: 'Learner Progress Report',
        reportType: 'learner-progress',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'excel',
      });

      expect(report.reportType).toBe('learner-progress');
      expect(report.format).toBe('excel');
      expect(report.status).toBe('pending');
    });

    it('should create a SCORM analytics report', async () => {
      const report = await Report.create({
        name: 'SCORM Completion Metrics',
        reportType: 'scorm-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'csv',
      });

      expect(report.reportType).toBe('scorm-analytics');
      expect(report.format).toBe('csv');
    });

    it('should create an enrollment report', async () => {
      const report = await Report.create({
        name: 'Monthly Enrollments',
        reportType: 'enrollment',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'pdf',
      });

      expect(report.reportType).toBe('enrollment');
    });

    it('should create a financial report', async () => {
      const report = await Report.create({
        name: 'Revenue Report Q1 2026',
        reportType: 'financial',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'excel',
      });

      expect(report.reportType).toBe('financial');
    });
  });

  describe('Report Types', () => {
    it('should support all 5 report types', async () => {
      const types = ['course-analytics', 'learner-progress', 'scorm-analytics', 'enrollment', 'financial'];

      for (const type of types) {
        const report = await Report.create({
          name: `${type} report`,
          reportType: type,
          generatedBy: new mongoose.Types.ObjectId(),
          format: 'pdf',
        });

        expect(report.reportType).toBe(type);
      }

      const count = await Report.countDocuments();
      expect(count).toBe(5);
    });
  });

  describe('Report Formats', () => {
    it('should support PDF format', async () => {
      const report = await Report.create({
        name: 'PDF Report',
        reportType: 'course-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'pdf',
      });

      expect(report.format).toBe('pdf');
    });

    it('should support Excel format', async () => {
      const report = await Report.create({
        name: 'Excel Report',
        reportType: 'course-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'excel',
      });

      expect(report.format).toBe('excel');
    });

    it('should support CSV format', async () => {
      const report = await Report.create({
        name: 'CSV Report',
        reportType: 'course-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'csv',
      });

      expect(report.format).toBe('csv');
    });

    it('should support JSON format', async () => {
      const report = await Report.create({
        name: 'JSON Report',
        reportType: 'course-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'json',
      });

      expect(report.format).toBe('json');
    });
  });

  describe('Report Status', () => {
    it('should default to pending status', async () => {
      const report = await Report.create({
        name: 'Test Report',
        reportType: 'course-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'pdf',
      });

      expect(report.status).toBe('pending');
    });

    it('should support processing status', async () => {
      const report = await Report.create({
        name: 'Test Report',
        reportType: 'course-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'pdf',
        status: 'processing',
      });

      expect(report.status).toBe('processing');
    });

    it('should support completed status', async () => {
      const report = await Report.create({
        name: 'Test Report',
        reportType: 'course-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'pdf',
        status: 'completed',
      });

      expect(report.status).toBe('completed');
    });

    it('should support failed status', async () => {
      const report = await Report.create({
        name: 'Test Report',
        reportType: 'course-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'pdf',
        status: 'failed',
        errorMessage: 'Database connection error',
      });

      expect(report.status).toBe('failed');
      expect(report.errorMessage).toBe('Database connection error');
    });
  });

  describe('Report Parameters and Filters', () => {
    it('should store date range parameters', async () => {
      const report = await Report.create({
        name: 'Monthly Report',
        reportType: 'course-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'pdf',
        parameters: {
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-31'),
        },
      });

      expect(report.parameters.startDate).toBeDefined();
      expect(report.parameters.endDate).toBeDefined();
    });

    it('should store course filter', async () => {
      const courseId = new mongoose.Types.ObjectId();
      const report = await Report.create({
        name: 'Course Report',
        reportType: 'course-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'pdf',
        parameters: {
          courseId: courseId.toString(),
        },
      });

      expect(report.parameters.courseId).toBe(courseId.toString());
    });

    it('should store department filter', async () => {
      const departmentId = new mongoose.Types.ObjectId();
      const report = await Report.create({
        name: 'Department Report',
        reportType: 'enrollment',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'excel',
        parameters: {
          departmentId: departmentId.toString(),
        },
      });

      expect(report.parameters.departmentId).toBe(departmentId.toString());
    });

    it('should store multiple filters', async () => {
      const report = await Report.create({
        name: 'Complex Report',
        reportType: 'learner-progress',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'pdf',
        parameters: {
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-31'),
          departmentId: new mongoose.Types.ObjectId().toString(),
          status: 'active',
          minScore: 70,
        },
      });

      expect(report.parameters.startDate).toBeDefined();
      expect(report.parameters.departmentId).toBeDefined();
      expect(report.parameters.status).toBe('active');
      expect(report.parameters.minScore).toBe(70);
    });
  });

  describe('Report File Storage', () => {
    it('should store file URL when completed', async () => {
      const report = await Report.create({
        name: 'Test Report',
        reportType: 'course-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'pdf',
        status: 'completed',
        fileUrl: 'https://storage.example.com/reports/report-123.pdf',
      });

      expect(report.fileUrl).toBe('https://storage.example.com/reports/report-123.pdf');
    });

    it('should store file size', async () => {
      const report = await Report.create({
        name: 'Test Report',
        reportType: 'course-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'pdf',
        status: 'completed',
        fileUrl: 'https://storage.example.com/reports/report-123.pdf',
        fileSizeBytes: 524288, // 512 KB
      });

      expect(report.fileSizeBytes).toBe(524288);
    });
  });

  describe('Report Timestamps', () => {
    it('should track generation timestamps', async () => {
      const startTime = new Date();
      const report = await Report.create({
        name: 'Test Report',
        reportType: 'course-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'pdf',
        status: 'processing',
        generatedAt: startTime,
      });

      expect(report.generatedAt).toEqual(startTime);
    });

    it('should track completion time', async () => {
      const completionTime = new Date();
      const report = await Report.create({
        name: 'Test Report',
        reportType: 'course-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'pdf',
        status: 'completed',
        completedAt: completionTime,
      });

      expect(report.completedAt).toEqual(completionTime);
    });

    it('should have createdAt and updatedAt timestamps', async () => {
      const report = await Report.create({
        name: 'Test Report',
        reportType: 'course-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'pdf',
      });

      expect(report.createdAt).toBeDefined();
      expect(report.updatedAt).toBeDefined();
    });
  });

  describe('Report Validation', () => {
    it('should require name', async () => {
      await expect(
        Report.create({
          reportType: 'course-analytics',
          generatedBy: new mongoose.Types.ObjectId(),
          format: 'pdf',
        })
      ).rejects.toThrow();
    });

    it('should require reportType', async () => {
      await expect(
        Report.create({
          name: 'Test Report',
          generatedBy: new mongoose.Types.ObjectId(),
          format: 'pdf',
        })
      ).rejects.toThrow();
    });

    it('should require generatedBy', async () => {
      await expect(
        Report.create({
          name: 'Test Report',
          reportType: 'course-analytics',
          format: 'pdf',
        })
      ).rejects.toThrow();
    });

    it('should require format', async () => {
      await expect(
        Report.create({
          name: 'Test Report',
          reportType: 'course-analytics',
          generatedBy: new mongoose.Types.ObjectId(),
        })
      ).rejects.toThrow();
    });
  });

  describe('Report Metadata', () => {
    it('should store record count', async () => {
      const report = await Report.create({
        name: 'Test Report',
        reportType: 'course-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'pdf',
        metadata: {
          recordCount: 250,
        },
      });

      expect(report.metadata.recordCount).toBe(250);
    });

    it('should store generation duration', async () => {
      const report = await Report.create({
        name: 'Test Report',
        reportType: 'course-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'pdf',
        metadata: {
          generationDurationMs: 3500,
        },
      });

      expect(report.metadata.generationDurationMs).toBe(3500);
    });

    it('should store custom metadata', async () => {
      const report = await Report.create({
        name: 'Test Report',
        reportType: 'course-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'pdf',
        metadata: {
          version: '1.0',
          template: 'standard',
          locale: 'en-US',
        },
      });

      expect(report.metadata.version).toBe('1.0');
      expect(report.metadata.template).toBe('standard');
      expect(report.metadata.locale).toBe('en-US');
    });
  });

  describe('Report Scheduling', () => {
    it('should support scheduled reports', async () => {
      const report = await Report.create({
        name: 'Weekly Report',
        reportType: 'course-analytics',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'pdf',
        isScheduled: true,
        schedule: {
          frequency: 'weekly',
          dayOfWeek: 1, // Monday
        },
      });

      expect(report.isScheduled).toBe(true);
      expect(report.schedule.frequency).toBe('weekly');
      expect(report.schedule.dayOfWeek).toBe(1);
    });

    it('should support monthly scheduled reports', async () => {
      const report = await Report.create({
        name: 'Monthly Report',
        reportType: 'financial',
        generatedBy: new mongoose.Types.ObjectId(),
        format: 'excel',
        isScheduled: true,
        schedule: {
          frequency: 'monthly',
          dayOfMonth: 1,
        },
      });

      expect(report.schedule.frequency).toBe('monthly');
      expect(report.schedule.dayOfMonth).toBe(1);
    });
  });
});
