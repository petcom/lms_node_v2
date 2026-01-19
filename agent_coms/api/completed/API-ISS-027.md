# API-ISS-027: Create ReportTemplate Model

**Type:** feature  
**Priority:** High  
**Status:** 🔲 Not Started  
**Date Created:** 2026-01-15  
**Blocked By:** API-ISS-024  
**Blocks:** API-ISS-031  

---

## Summary

Create a new `ReportTemplate` model for saving and reusing report configurations. Templates allow users to save commonly-used report parameters and share them across the organization.

---

## Model Schema

```typescript
// src/models/ReportTemplate.model.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IReportTemplate extends Document {
  // Identity
  _id: mongoose.Types.ObjectId;
  
  // Template Definition
  name: string;
  description?: string;
  reportType: string;            // LookupValue: report-type.*
  
  // Saved Parameters
  parameters: {
    dateRange?: {
      type: 'fixed' | 'relative';
      // Fixed dates
      startDate?: Date;
      endDate?: Date;
      // Relative (e.g., 'last 30 days')
      relativePeriod?: string;
      relativeUnit?: 'days' | 'weeks' | 'months' | 'quarters' | 'years';
      relativeCount?: number;
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
    groupBy?: string[];
    measures?: string[];         // LookupValue: measure-type.*
    includeInactive?: boolean;
  };
  
  // Default Output Settings
  defaultOutput: {
    format: string;              // LookupValue: output-format.*
    filenameTemplate?: string;   // e.g., 'completion-report-{date}'
  };
  
  // Ownership & Visibility
  createdBy: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  visibility: string;            // LookupValue: report-visibility.*
  
  // Sharing
  sharedWith?: {
    users?: mongoose.Types.ObjectId[];
    departments?: mongoose.Types.ObjectId[];
    roles?: string[];
  };
  
  // Usage Tracking
  usageCount: number;
  lastUsedAt?: Date;
  lastUsedBy?: mongoose.Types.ObjectId;
  
  // Status
  isActive: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const ReportTemplateSchema = new Schema<IReportTemplate>({
  // Template Definition
  name: { 
    type: String, 
    required: true 
  },
  description: String,
  reportType: { 
    type: String, 
    required: true,
    index: true
  },
  
  // Saved Parameters
  parameters: {
    dateRange: {
      type: { 
        type: String, 
        enum: ['fixed', 'relative'] 
      },
      startDate: Date,
      endDate: Date,
      relativePeriod: String,
      relativeUnit: { 
        type: String, 
        enum: ['days', 'weeks', 'months', 'quarters', 'years'] 
      },
      relativeCount: Number
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
  
  // Default Output Settings
  defaultOutput: {
    format: { 
      type: String, 
      default: 'pdf' 
    },
    filenameTemplate: String
  },
  
  // Ownership & Visibility
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
  visibility: { 
    type: String, 
    default: 'private',
    index: true
  },
  
  // Sharing
  sharedWith: {
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    departments: [{ type: Schema.Types.ObjectId, ref: 'Department' }],
    roles: [String]
  },
  
  // Usage Tracking
  usageCount: { 
    type: Number, 
    default: 0 
  },
  lastUsedAt: Date,
  lastUsedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // Status
  isActive: { 
    type: Boolean, 
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes
ReportTemplateSchema.index({ createdBy: 1, isActive: 1 });
ReportTemplateSchema.index({ visibility: 1, isActive: 1 });
ReportTemplateSchema.index({ departmentId: 1, visibility: 1, isActive: 1 });
ReportTemplateSchema.index({ name: 'text', description: 'text' });

export const ReportTemplate = mongoose.model<IReportTemplate>('ReportTemplate', ReportTemplateSchema);
```

---

## Implementation Steps

1. **Create model file:**
   - Create `src/models/ReportTemplate.model.ts` with schema above
   - Export from `src/models/index.ts`

2. **Add pre-save validation:**
   - Validate `reportType` against `report-type.*` LookupValues
   - Validate `visibility` against `report-visibility.*` LookupValues
   - Validate `defaultOutput.format` against `output-format.*` LookupValues
   - Validate `measures[]` against `measure-type.*` LookupValues

3. **Create service file:**
   - Create `src/services/report-templates.service.ts`
   - Implement CRUD operations
   - Implement template cloning
   - Implement usage tracking
   - Implement visibility/sharing logic

4. **Write unit tests:**
   - Model validation tests
   - Service method tests
   - Visibility logic tests

---

## Acceptance Criteria

- [ ] ReportTemplate model created with all fields
- [ ] Pre-save hook validates enum fields against LookupValue
- [ ] Text search index for name/description
- [ ] Model exported from index.ts
- [ ] Unit tests written and passing
- [ ] TypeScript interfaces exported

---

## Reference

See [REPORT_SYSTEM_RECOMMENDATION.md](../REPORT_SYSTEM_RECOMMENDATION.md) section 4.2 for ReportTemplate architecture.
