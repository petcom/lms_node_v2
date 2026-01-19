# API-ISS-034: Background Report Worker

**Type:** feature  
**Priority:** High  
**Status:** 🔲 Not Started  
**Date Created:** 2026-01-15  
**Blocked By:** API-ISS-026, API-ISS-030  
**Blocks:** None  

---

## Summary

Create a background worker that processes the report job queue. The worker polls for pending jobs, executes report generation, and updates job status.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   API Server    │────▶│   Report Queue   │────▶│  Report Worker  │
│                 │     │   (MongoDB)      │     │  (Background)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                              ┌───────────────────────────┼───────────────────────────┐
                              │                           │                           │
                              ▼                           ▼                           ▼
                    ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
                    │  Data Fetcher   │         │  Report Builder │         │  File Generator │
                    │                 │         │                 │         │  (PDF/XLSX/CSV) │
                    └─────────────────┘         └─────────────────┘         └─────────────────┘
```

---

## Worker Components

### 1. Queue Processor

```typescript
// src/workers/report-worker.ts

import { ReportJob } from '../models/ReportJob.model';

interface WorkerConfig {
  pollIntervalMs: number;       // Default: 5000
  maxConcurrentJobs: number;    // Default: 3
  jobTimeoutMs: number;         // Default: 300000 (5 min)
  retryDelayMs: number;         // Default: 60000
  maxRetries: number;           // Default: 3
}

class ReportWorker {
  private isRunning = false;
  private activeJobs = new Map<string, AbortController>();
  
  async start(): Promise<void> {
    this.isRunning = true;
    console.log('Report worker started');
    
    while (this.isRunning) {
      try {
        await this.processQueue();
      } catch (error) {
        console.error('Queue processing error:', error);
      }
      
      await this.sleep(this.config.pollIntervalMs);
    }
  }
  
  async stop(): Promise<void> {
    this.isRunning = false;
    
    // Cancel active jobs
    for (const [jobId, controller] of this.activeJobs) {
      controller.abort();
    }
    
    console.log('Report worker stopped');
  }
  
  private async processQueue(): Promise<void> {
    // Skip if at capacity
    if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
      return;
    }
    
    // Find next job to process
    const job = await this.claimNextJob();
    if (!job) return;
    
    // Process in background
    this.processJob(job).catch(error => {
      console.error(`Job ${job._id} failed:`, error);
    });
  }
  
  private async claimNextJob(): Promise<IReportJob | null> {
    // Atomic claim: find and update status
    const job = await ReportJob.findOneAndUpdate(
      {
        status: 'pending',
        $or: [
          { scheduledFor: { $lte: new Date() } },
          { scheduledFor: { $exists: false } }
        ]
      },
      {
        $set: {
          status: 'running',
          startedAt: new Date(),
          'progress.currentStep': 'initializing',
          'progress.percentage': 0
        }
      },
      {
        sort: { priority: -1, createdAt: 1 },
        new: true
      }
    );
    
    return job;
  }
}
```

---

### 2. Report Executor

```typescript
// src/workers/report-executor.ts

import { IReportJob } from '../models/ReportJob.model';
import { ReportDataFetcher } from './report-data-fetcher';
import { ReportBuilder } from './report-builder';
import { FileGenerator } from './file-generator';
import { StorageService } from '../services/storage.service';

export class ReportExecutor {
  async execute(job: IReportJob, signal: AbortSignal): Promise<void> {
    try {
      // Step 1: Fetch data
      await this.updateProgress(job, 'fetching-data', 10);
      const data = await this.dataFetcher.fetch(job, signal);
      
      // Step 2: Build report
      await this.updateProgress(job, 'building-report', 40);
      const report = await this.reportBuilder.build(job, data, signal);
      
      // Step 3: Generate file
      await this.updateProgress(job, 'generating-file', 70);
      const file = await this.fileGenerator.generate(job, report, signal);
      
      // Step 4: Store file
      await this.updateProgress(job, 'storing-file', 90);
      const storage = await this.storageService.store(file, job);
      
      // Step 5: Complete
      await this.complete(job, storage);
      
    } catch (error) {
      if (signal.aborted) {
        await this.cancel(job);
      } else {
        await this.fail(job, error);
      }
    }
  }
  
  private async updateProgress(
    job: IReportJob, 
    step: string, 
    percentage: number
  ): Promise<void> {
    await ReportJob.updateOne(
      { _id: job._id },
      {
        $set: {
          'progress.currentStep': step,
          'progress.percentage': percentage
        }
      }
    );
  }
}
```

---

### 3. Report Type Handlers

Each report type has a specific handler:

```typescript
// src/workers/handlers/learner-progress.handler.ts

export class LearnerProgressHandler implements ReportHandler {
  async fetch(job: IReportJob, signal: AbortSignal): Promise<LearnerProgressData[]> {
    const { filters, dateRange } = job.parameters;
    
    // Build aggregation pipeline
    const pipeline = [
      // Match date range
      { $match: { createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate } } },
      
      // Apply filters
      ...(filters.departmentIds?.length ? [
        { $match: { departmentId: { $in: filters.departmentIds } } }
      ] : []),
      
      // Group by learner
      { $group: {
        _id: '$learnerId',
        completedCourses: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        totalCourses: { $sum: 1 },
        averageScore: { $avg: '$score' },
        totalTimeSpent: { $sum: '$duration' }
      }},
      
      // Lookup learner details
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'learner'
      }}
    ];
    
    return await Enrollment.aggregate(pipeline);
  }
  
  async build(job: IReportJob, data: LearnerProgressData[]): Promise<ReportContent> {
    return {
      title: job.name,
      generatedAt: new Date(),
      parameters: job.parameters,
      summary: this.buildSummary(data),
      data: data,
      charts: this.buildCharts(data)
    };
  }
}
```

---

### 4. Scheduled Report Processor

```typescript
// src/workers/schedule-processor.ts

import { ReportSchedule } from '../models/ReportSchedule.model';
import { ReportJob } from '../models/ReportJob.model';

export class ScheduleProcessor {
  async processSchedules(): Promise<void> {
    const now = new Date();
    
    // Find schedules due for execution
    const dueSchedules = await ReportSchedule.find({
      isActive: true,
      isPaused: false,
      nextRunAt: { $lte: now }
    });
    
    for (const schedule of dueSchedules) {
      try {
        await this.executeSchedule(schedule);
      } catch (error) {
        await this.handleScheduleError(schedule, error);
      }
    }
  }
  
  private async executeSchedule(schedule: IReportSchedule): Promise<void> {
    // Create job from schedule
    const template = await ReportTemplate.findById(schedule.templateId);
    
    const job = await ReportJob.create({
      name: schedule.name,
      reportType: template.reportType,
      parameters: this.mergeParameters(template, schedule),
      output: schedule.output,
      status: 'pending',
      scheduleId: schedule._id,
      templateId: template._id,
      requestedBy: schedule.createdBy,
      departmentId: schedule.departmentId
    });
    
    // Update schedule
    await ReportSchedule.updateOne(
      { _id: schedule._id },
      {
        $set: {
          lastRunAt: now,
          lastRunJobId: job._id,
          nextRunAt: this.calculateNextRun(schedule)
        },
        $inc: { runCount: 1 }
      }
    );
  }
}
```

---

## Implementation Steps

1. **Create worker entry point:**
   - Create `src/workers/report-worker.ts`
   - Implement queue polling and job claiming

2. **Create report executor:**
   - Create `src/workers/report-executor.ts`
   - Implement step-by-step execution

3. **Create data fetchers:**
   - Create `src/workers/data-fetchers/` directory
   - Implement fetcher for each report type

4. **Create file generators:**
   - Create `src/workers/file-generators/`
   - Implement PDF, Excel, CSV generators

5. **Create schedule processor:**
   - Create `src/workers/schedule-processor.ts`
   - Implement schedule checking and job creation

6. **Create worker startup script:**
   - Create `src/worker.ts` entry point
   - Add npm script to run worker

7. **Write tests:**
   - Unit tests for each component
   - Integration tests for full flow

---

## NPM Scripts

```json
{
  "scripts": {
    "worker": "ts-node src/worker.ts",
    "worker:dev": "nodemon --exec ts-node src/worker.ts"
  }
}
```

---

## Environment Variables

```bash
# Worker Configuration
REPORT_WORKER_POLL_INTERVAL=5000
REPORT_WORKER_MAX_CONCURRENT=3
REPORT_WORKER_JOB_TIMEOUT=300000
REPORT_WORKER_MAX_RETRIES=3
```

---

## Acceptance Criteria

- [ ] Worker polls queue and claims jobs atomically
- [ ] Jobs processed with progress updates
- [ ] Each report type has a handler
- [ ] PDF, Excel, CSV generation works
- [ ] Failed jobs marked with error details
- [ ] Cancelled jobs handled gracefully
- [ ] Scheduled reports processed on time
- [ ] Worker can be started/stopped cleanly
- [ ] Unit and integration tests pass
- [ ] Logs show job lifecycle

---

## Reference

See [REPORT_SYSTEM_RECOMMENDATION.md](../REPORT_SYSTEM_RECOMMENDATION.md) section 4 for architecture.
