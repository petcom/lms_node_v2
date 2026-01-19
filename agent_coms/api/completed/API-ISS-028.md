# API-ISS-028: Create ReportSchedule Model

**Type:** feature  
**Priority:** Medium  
**Status:** 🔲 Not Started  
**Date Created:** 2026-01-15  
**Blocked By:** API-ISS-026, API-ISS-027  
**Blocks:** API-ISS-032  

---

## Summary

Create a new `ReportSchedule` model to manage scheduled/recurring report generation. This model defines when reports should run and who should receive them.

---

## Model Schema

```typescript
// src/models/ReportSchedule.model.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IReportSchedule extends Document {
  // Identity
  _id: mongoose.Types.ObjectId;
  
  // Schedule Definition
  name: string;
  description?: string;
  templateId: mongoose.Types.ObjectId;
  
  // Timing Configuration
  schedule: {
    frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
    timezone: string;            // e.g., 'America/New_York'
    
    // For 'once'
    runAt?: Date;
    
    // For 'daily'
    timeOfDay?: string;          // e.g., '08:00'
    
    // For 'weekly'
    dayOfWeek?: number;          // 0-6 (Sunday-Saturday)
    
    // For 'monthly'
    dayOfMonth?: number;         // 1-31
    
    // For 'quarterly'
    quarterMonths?: number[];    // [1, 4, 7, 10] for Jan, Apr, Jul, Oct
  };
  
  // Date Range Adjustment
  dateRangeType: 'previous-period' | 'custom' | 'from-template';
  customDateRange?: {
    startDaysOffset: number;     // e.g., -30 for 30 days ago
    endDaysOffset: number;       // e.g., -1 for yesterday
  };
  
  // Output Configuration
  output: {
    format: string;              // LookupValue: output-format.*
    filenameTemplate?: string;   // e.g., 'weekly-report-{date}'
  };
  
  // Delivery Configuration
  delivery: {
    method: 'email' | 'storage' | 'both';
    
    // Email delivery
    email?: {
      recipients: string[];
      subject?: string;
      body?: string;
      includeLink?: boolean;
      attachReport?: boolean;
    };
    
    // Storage options
    storage?: {
      provider: 'local' | 's3';
      path?: string;
      bucket?: string;
      keyTemplate?: string;
    };
  };
  
  // Execution Tracking
  lastRunAt?: Date;
  lastRunStatus?: string;
  lastRunJobId?: mongoose.Types.ObjectId;
  nextRunAt?: Date;
  runCount: number;
  failureCount: number;
  consecutiveFailures: number;
  
  // Ownership
  createdBy: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  
  // Status
  isActive: boolean;
  isPaused: boolean;
  pausedReason?: string;
  pausedAt?: Date;
  pausedBy?: mongoose.Types.ObjectId;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const ReportScheduleSchema = new Schema<IReportSchedule>({
  // Schedule Definition
  name: { 
    type: String, 
    required: true 
  },
  description: String,
  templateId: { 
    type: Schema.Types.ObjectId, 
    ref: 'ReportTemplate',
    required: true,
    index: true
  },
  
  // Timing Configuration
  schedule: {
    frequency: { 
      type: String, 
      enum: ['once', 'daily', 'weekly', 'monthly', 'quarterly'],
      required: true
    },
    timezone: { 
      type: String, 
      default: 'UTC' 
    },
    runAt: Date,
    timeOfDay: String,
    dayOfWeek: { type: Number, min: 0, max: 6 },
    dayOfMonth: { type: Number, min: 1, max: 31 },
    quarterMonths: [{ type: Number, min: 1, max: 12 }]
  },
  
  // Date Range Adjustment
  dateRangeType: { 
    type: String, 
    enum: ['previous-period', 'custom', 'from-template'],
    default: 'previous-period'
  },
  customDateRange: {
    startDaysOffset: Number,
    endDaysOffset: Number
  },
  
  // Output Configuration
  output: {
    format: { 
      type: String, 
      default: 'pdf' 
    },
    filenameTemplate: String
  },
  
  // Delivery Configuration
  delivery: {
    method: { 
      type: String, 
      enum: ['email', 'storage', 'both'],
      default: 'storage'
    },
    email: {
      recipients: [String],
      subject: String,
      body: String,
      includeLink: { type: Boolean, default: true },
      attachReport: { type: Boolean, default: false }
    },
    storage: {
      provider: { type: String, enum: ['local', 's3'] },
      path: String,
      bucket: String,
      keyTemplate: String
    }
  },
  
  // Execution Tracking
  lastRunAt: Date,
  lastRunStatus: String,
  lastRunJobId: { 
    type: Schema.Types.ObjectId, 
    ref: 'ReportJob' 
  },
  nextRunAt: { 
    type: Date, 
    index: true 
  },
  runCount: { 
    type: Number, 
    default: 0 
  },
  failureCount: { 
    type: Number, 
    default: 0 
  },
  consecutiveFailures: { 
    type: Number, 
    default: 0 
  },
  
  // Ownership
  createdBy: { 
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
  
  // Status
  isActive: { 
    type: Boolean, 
    default: true,
    index: true
  },
  isPaused: { 
    type: Boolean, 
    default: false 
  },
  pausedReason: String,
  pausedAt: Date,
  pausedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, {
  timestamps: true
});

// Compound indexes
ReportScheduleSchema.index({ isActive: 1, isPaused: 1, nextRunAt: 1 });
ReportScheduleSchema.index({ createdBy: 1, isActive: 1 });

export const ReportSchedule = mongoose.model<IReportSchedule>('ReportSchedule', ReportScheduleSchema);
```

---

## Implementation Steps

1. **Create model file:**
   - Create `src/models/ReportSchedule.model.ts` with schema above
   - Export from `src/models/index.ts`

2. **Add pre-save hooks:**
   - Calculate `nextRunAt` based on schedule configuration
   - Validate `output.format` against `output-format.*` LookupValues

3. **Create service file:**
   - Create `src/services/report-schedules.service.ts`
   - Implement CRUD operations
   - Implement `calculateNextRunTime()` method
   - Implement pause/resume logic
   - Implement schedule execution trigger

4. **Create scheduler utility:**
   - Create utility to find schedules due for execution
   - Create job to create ReportJob from schedule

5. **Write unit tests:**
   - Model validation tests
   - Next run calculation tests
   - Service method tests

---

## Acceptance Criteria

- [ ] ReportSchedule model created with all fields
- [ ] Pre-save hook calculates nextRunAt
- [ ] Pre-save hook validates enum fields against LookupValue
- [ ] Model exported from index.ts
- [ ] calculateNextRunTime() works for all frequencies
- [ ] Unit tests written and passing
- [ ] TypeScript interfaces exported

---

## Reference

See [REPORT_SYSTEM_RECOMMENDATION.md](../REPORT_SYSTEM_RECOMMENDATION.md) section 4.3 for ReportSchedule architecture.
