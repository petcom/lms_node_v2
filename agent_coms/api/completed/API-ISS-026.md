# API-ISS-026: Create ReportJob Model

**Type:** feature  
**Priority:** High  
**Status:** 🔲 Not Started  
**Date Created:** 2026-01-15  
**Blocked By:** API-ISS-024  
**Blocks:** API-ISS-030  

---

## Summary

Create a new `ReportJob` model to manage report generation queue. This model stores report requests, their parameters, execution status, and output file references.

---

## Model Schema

```typescript
// src/models/ReportJob.model.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IReportJob extends Document {
  // Identity
  _id: mongoose.Types.ObjectId;
  
  // Report Definition
  reportType: string;           // LookupValue: report-type.*
  name: string;                 // User-friendly name
  description?: string;
  
  // Parameters
  parameters: {
    dateRange?: {
      startDate: Date;
      endDate: Date;
    };
    filters?: {
      departmentIds?: mongoose.Types.ObjectId[];
      courseIds?: mongoose.Types.ObjectId[];
      classIds?: mongoose.Types.ObjectId[];
      learnerIds?: mongoose.Types.ObjectId[];
      contentIds?: mongoose.Types.ObjectId[];
      eventTypes?: string[];
      statuses?: string[];
    };
    groupBy?: string[];          // e.g., ['department', 'course', 'learner']
    measures?: string[];         // LookupValue: measure-type.*
    includeInactive?: boolean;
  };
  
  // Output Configuration
  output: {
    format: string;              // LookupValue: output-format.*
    filename?: string;
    storage?: {
      provider: 'local' | 's3';
      path?: string;
      bucket?: string;
      key?: string;
      url?: string;
      expiresAt?: Date;
    };
  };
  
  // Execution Status
  status: string;                // LookupValue: report-status.*
  priority: string;              // LookupValue: report-priority.*
  
  // Progress Tracking
  progress?: {
    currentStep?: string;
    percentage?: number;
    recordsProcessed?: number;
    totalRecords?: number;
  };
  
  // Timing
  scheduledFor?: Date;           // For scheduled/deferred execution
  startedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;              // Auto-delete after this date
  
  // Error Handling
  error?: {
    code?: string;
    message?: string;
    stack?: string;
    retryCount?: number;
    lastRetryAt?: Date;
  };
  
  // Ownership
  requestedBy: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  visibility: string;            // LookupValue: report-visibility.*
  
  // From Template
  templateId?: mongoose.Types.ObjectId;
  scheduleId?: mongoose.Types.ObjectId;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const ReportJobSchema = new Schema<IReportJob>({
  // Report Definition
  reportType: { 
    type: String, 
    required: true,
    index: true
  },
  name: { 
    type: String, 
    required: true 
  },
  description: String,
  
  // Parameters
  parameters: {
    dateRange: {
      startDate: Date,
      endDate: Date
    },
    filters: {
      departmentIds: [{ type: Schema.Types.ObjectId, ref: 'Department' }],
      courseIds: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
      classIds: [{ type: Schema.Types.ObjectId, ref: 'Class' }],
      learnerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      contentIds: [{ type: Schema.Types.ObjectId, ref: 'Content' }],
      eventTypes: [String],
      statuses: [String]
    },
    groupBy: [String],
    measures: [String],
    includeInactive: { type: Boolean, default: false }
  },
  
  // Output Configuration
  output: {
    format: { 
      type: String, 
      required: true,
      default: 'json'
    },
    filename: String,
    storage: {
      provider: { 
        type: String, 
        enum: ['local', 's3'] 
      },
      path: String,
      bucket: String,
      key: String,
      url: String,
      expiresAt: Date
    }
  },
  
  // Execution Status
  status: { 
    type: String, 
    required: true,
    default: 'pending',
    index: true
  },
  priority: { 
    type: String, 
    default: 'normal' 
  },
  
  // Progress Tracking
  progress: {
    currentStep: String,
    percentage: { type: Number, min: 0, max: 100 },
    recordsProcessed: Number,
    totalRecords: Number
  },
  
  // Timing
  scheduledFor: { type: Date, index: true },
  startedAt: Date,
  completedAt: Date,
  expiresAt: { type: Date, index: true },
  
  // Error Handling
  error: {
    code: String,
    message: String,
    stack: String,
    retryCount: { type: Number, default: 0 },
    lastRetryAt: Date
  },
  
  // Ownership
  requestedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true
  },
  departmentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Department',
    index: true
  },
  visibility: { 
    type: String, 
    default: 'private' 
  },
  
  // From Template
  templateId: { 
    type: Schema.Types.ObjectId, 
    ref: 'ReportTemplate' 
  },
  scheduleId: { 
    type: Schema.Types.ObjectId, 
    ref: 'ReportSchedule' 
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
ReportJobSchema.index({ status: 1, priority: -1, scheduledFor: 1 });
ReportJobSchema.index({ requestedBy: 1, status: 1, createdAt: -1 });
ReportJobSchema.index({ departmentId: 1, status: 1, createdAt: -1 });

// TTL index for auto-cleanup of expired jobs
ReportJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ReportJob = mongoose.model<IReportJob>('ReportJob', ReportJobSchema);
```

---

## Implementation Steps

1. **Create model file:**
   - Create `src/models/ReportJob.model.ts` with schema above
   - Export from `src/models/index.ts`

2. **Add pre-save validation:**
   - Validate `reportType` against `report-type.*` LookupValues
   - Validate `status` against `report-status.*` LookupValues
   - Validate `priority` against `report-priority.*` LookupValues
   - Validate `visibility` against `report-visibility.*` LookupValues
   - Validate `output.format` against `output-format.*` LookupValues
   - Validate `measures[]` against `measure-type.*` LookupValues

3. **Create service file:**
   - Create `src/services/report-jobs.service.ts`
   - Implement CRUD operations
   - Implement status transition logic
   - Implement queue processing methods

4. **Write unit tests:**
   - Model validation tests
   - Service method tests
   - Status transition tests

---

## Acceptance Criteria

- [ ] ReportJob model created with all fields
- [ ] Pre-save hook validates enum fields against LookupValue
- [ ] Indexes created for common query patterns
- [ ] TTL index configured for auto-cleanup
- [ ] Model exported from index.ts
- [ ] Unit tests written and passing
- [ ] TypeScript interfaces exported for use in services

---

## Reference

See [REPORT_SYSTEM_RECOMMENDATION.md](../REPORT_SYSTEM_RECOMMENDATION.md) section 4.1 for ReportJob architecture.
