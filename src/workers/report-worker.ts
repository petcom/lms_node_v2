/**
 * Report Worker
 *
 * Background worker that processes report generation jobs from the queue.
 * Polls for pending jobs, generates reports, and updates job status.
 *
 * @module workers/report-worker
 */

import { connectDatabase } from '@/config/database';
import { logger } from '@/config/logger';
import reportJobService from '@/services/reports/report-jobs.service';
import reportScheduleService from '@/services/reports/report-schedules.service';
import LearningEvent from '@/models/activity/LearningEvent.model';

/**
 * Report Generator Class
 * Handles the actual report generation logic for different report types
 */
class ReportGenerator {
  /**
   * Generate report based on job configuration
   */
  async generateReport(job: any): Promise<{ format: string; data: any; filename: string }> {
    logger.info(`Generating report: ${job.reportType} for job ${job._id}`);

    // Update progress
    await reportJobService.updateJobProgress(job._id.toString(), {
      currentStep: 'Fetching data',
      percentage: 10
    });

    // Fetch data based on report type
    const data = await this.fetchReportData(job);

    // Update progress
    await reportJobService.updateJobProgress(job._id.toString(), {
      currentStep: 'Processing data',
      percentage: 50,
      recordsProcessed: data.length,
      totalRecords: data.length
    });

    // Format data based on output format
    const formatted = await this.formatReportData(job, data);

    // Update progress
    await reportJobService.updateJobProgress(job._id.toString(), {
      currentStep: 'Generating file',
      percentage: 90
    });

    return {
      format: job.output.format,
      data: formatted,
      filename: job.output.filename || `report-${Date.now()}.${this.getFileExtension(job.output.format)}`
    };
  }

  /**
   * Fetch data based on report type and parameters
   */
  private async fetchReportData(job: any): Promise<any[]> {
    const { reportType: _reportType, parameters } = job;

    // Build query based on parameters
    const query: any = {};

    if (parameters.dateRange) {
      query.timestamp = {
        $gte: parameters.dateRange.startDate,
        $lte: parameters.dateRange.endDate
      };
    }

    if (parameters.filters) {
      if (parameters.filters.learnerIds?.length) {
        query.learnerId = { $in: parameters.filters.learnerIds };
      }
      if (parameters.filters.courseIds?.length) {
        query.courseId = { $in: parameters.filters.courseIds };
      }
      if (parameters.filters.departmentIds?.length) {
        query.departmentId = { $in: parameters.filters.departmentIds };
      }
      if (parameters.filters.eventTypes?.length) {
        query.eventType = { $in: parameters.filters.eventTypes };
      }
    }

    // Fetch data from LearningEvent collection
    const events = await LearningEvent.find(query)
      .populate('learnerId', 'person.firstName person.lastName email')
      .populate('courseId', 'name code')
      .populate('departmentId', 'name code')
      .limit(10000) // Safety limit
      .lean()
      .exec();

    return events;
  }

  /**
   * Format data based on output format
   */
  private async formatReportData(job: any, data: any[]): Promise<any> {
    const { format } = job.output;
    const { groupBy, measures } = job.parameters;

    switch (format) {
      case 'json':
        return this.formatAsJSON(data, groupBy, measures);
      case 'csv':
        return this.formatAsCSV(data, groupBy, measures);
      case 'excel':
        return this.formatAsExcel(data, groupBy, measures);
      case 'pdf':
        return this.formatAsPDF(data, groupBy, measures);
      default:
        return this.formatAsJSON(data, groupBy, measures);
    }
  }

  /**
   * Format data as JSON
   */
  private formatAsJSON(data: any[], groupBy?: string[], _measures?: string[]): any {
    if (!groupBy || groupBy.length === 0) {
      return { totalRecords: data.length, data };
    }

    // Perform aggregation if groupBy is specified
    const grouped: any = {};
    data.forEach((record) => {
      const key = groupBy.map((field) => record[field] || 'unknown').join('|');
      if (!grouped[key]) {
        grouped[key] = { count: 0, records: [] };
      }
      grouped[key].count++;
      grouped[key].records.push(record);
    });

    return {
      totalRecords: data.length,
      groupedBy: groupBy,
      groups: Object.keys(grouped).map((key) => ({
        key: key.split('|'),
        count: grouped[key].count,
        records: grouped[key].records
      }))
    };
  }

  /**
   * Format data as CSV
   */
  private formatAsCSV(data: any[], _groupBy?: string[], _measures?: string[]): string {
    if (data.length === 0) return 'No data';

    // Simple CSV generation
    const headers = Object.keys(data[0]).filter((key) => typeof data[0][key] !== 'object');
    const rows = data.map((record) =>
      headers.map((header) => JSON.stringify(record[header] || '')).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Format data as Excel (placeholder - would use exceljs in production)
   */
  private formatAsExcel(data: any[], groupBy?: string[], measures?: string[]): any {
    logger.warn('Excel generation not fully implemented - returning JSON');
    return this.formatAsJSON(data, groupBy, measures);
  }

  /**
   * Format data as PDF (placeholder - would use pdfkit in production)
   */
  private formatAsPDF(data: any[], groupBy?: string[], measures?: string[]): any {
    logger.warn('PDF generation not fully implemented - returning JSON');
    return this.formatAsJSON(data, groupBy, measures);
  }

  /**
   * Get file extension for format
   */
  private getFileExtension(format: string): string {
    const extensions: Record<string, string> = {
      json: 'json',
      csv: 'csv',
      excel: 'xlsx',
      pdf: 'pdf'
    };
    return extensions[format] || 'txt';
  }
}

/**
 * Report Worker Class
 * Main worker loop that processes jobs
 */
class ReportWorker {
  private isRunning = false;
  private pollInterval = 5000; // 5 seconds
  private generator = new ReportGenerator();

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    logger.info('Starting Report Worker...');

    // Connect to database
    await connectDatabase();

    this.isRunning = true;
    logger.info('Report Worker started successfully');

    // Start processing loop
    this.processLoop();

    // Start schedule processing
    this.scheduleLoop();
  }

  /**
   * Stop the worker
   */
  stop(): void {
    logger.info('Stopping Report Worker...');
    this.isRunning = false;
  }

  /**
   * Main processing loop for jobs
   */
  private async processLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        const job = await reportJobService.getNextQueuedJob();

        if (job) {
          await this.processJob(job);
        } else {
          // No jobs available, wait before checking again
          await this.sleep(this.pollInterval);
        }
      } catch (error: any) {
        logger.error('Error in worker process loop:', error);
        await this.sleep(this.pollInterval);
      }
    }
  }

  /**
   * Process a single report job
   */
  private async processJob(job: any): Promise<void> {
    logger.info(`Processing job ${job._id}`);

    try {
      // Generate the report
      const result = await this.generator.generateReport(job);

      // Store the result (in production, upload to S3 or save to filesystem)
      const storage = {
        provider: 'local' as const,
        path: `/reports/${result.filename}`,
        url: `/api/v2/reports/jobs/${job._id}/download`
      };

      // Mark job as completed
      await reportJobService.markJobCompleted(job._id.toString(), storage);

      logger.info(`Job ${job._id} completed successfully`);
    } catch (error: any) {
      logger.error(`Job ${job._id} failed:`, error);

      // Mark job as failed
      await reportJobService.markJobFailed(job._id.toString(), {
        code: 'GENERATION_ERROR',
        message: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Schedule processing loop
   */
  private async scheduleLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Check for schedules due for execution
        const schedules = await reportScheduleService.getSchedulesDueForExecution(10);

        for (const schedule of schedules) {
          try {
            await reportScheduleService.executeSchedule(schedule._id.toString());
            await reportScheduleService.recordScheduleExecution(schedule._id.toString(), 'success');
            logger.info(`Schedule ${schedule._id} executed successfully`);
          } catch (error: any) {
            logger.error(`Schedule ${schedule._id} execution failed:`, error);
            await reportScheduleService.recordScheduleExecution(schedule._id.toString(), 'failed');
          }
        }

        // Check every minute for schedules
        await this.sleep(60000);
      } catch (error: any) {
        logger.error('Error in schedule processing loop:', error);
        await this.sleep(60000);
      }
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Main execution
const worker = new ReportWorker();

// Handle shutdown signals
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  worker.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  worker.stop();
  process.exit(0);
});

// Start the worker
worker.start().catch((error) => {
  logger.error('Failed to start worker:', error);
  process.exit(1);
});

export default worker;
