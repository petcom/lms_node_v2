/**
 * ReportJob Model
 *
 * Manages the report generation queue. Stores report requests, parameters,
 * execution status, and output file references.
 *
 * Features:
 * - Queue-based processing with priority levels
 * - Progress tracking and error handling
 * - Multiple output formats (PDF, Excel, CSV, JSON)
 * - Auto-cleanup with TTL index
 * - LookupValue validation for enums
 *
 * @module models/reports/ReportJob
 */

import mongoose, { Schema, Document } from 'mongoose';
import { validateLookupValue } from '@/utils/lookup-validators';

export interface IReportJob extends Document {
  // Identity
  _id: mongoose.Types.ObjectId;

  // Report Definition
  reportType: string; // LookupValue: report-type.*
  name: string; // User-friendly name
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
    groupBy?: string[]; // e.g., ['department', 'course', 'learner']
    measures?: string[]; // LookupValue: measure-type.*
    includeInactive?: boolean;
  };

  // Output Configuration
  output: {
    format: string; // LookupValue: output-format.*
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
  status: string; // LookupValue: report-status.*
  priority: string; // LookupValue: report-priority.*

  // Progress Tracking
  progress?: {
    currentStep?: string;
    percentage?: number;
    recordsProcessed?: number;
    totalRecords?: number;
  };

  // Timing
  scheduledFor?: Date; // For scheduled/deferred execution
  startedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date; // Auto-delete after this date

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
  visibility: string; // LookupValue: report-visibility.*

  // From Template
  templateId?: mongoose.Types.ObjectId;
  scheduleId?: mongoose.Types.ObjectId;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const ReportJobSchema = new Schema<IReportJob>(
  {
    // Report Definition
    reportType: {
      type: String,
      required: [true, 'reportType is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
      maxlength: [200, 'name cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'description cannot exceed 1000 characters']
    },

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
        required: [true, 'output.format is required'],
        default: 'json'
      },
      filename: String,
      storage: {
        provider: {
          type: String,
          enum: {
            values: ['local', 's3'],
            message: '{VALUE} is not a valid storage provider'
          }
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
      required: [true, 'status is required'],
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
      percentage: {
        type: Number,
        min: [0, 'percentage cannot be negative'],
        max: [100, 'percentage cannot exceed 100']
      },
      recordsProcessed: {
        type: Number,
        min: [0, 'recordsProcessed cannot be negative']
      },
      totalRecords: {
        type: Number,
        min: [0, 'totalRecords cannot be negative']
      }
    },

    // Timing
    scheduledFor: { type: Date, index: true },
    startedAt: Date,
    completedAt: Date,
    expiresAt: Date, // TTL index defined separately below

    // Error Handling
    error: {
      code: String,
      message: {
        type: String,
        maxlength: [5000, 'error.message cannot exceed 5000 characters']
      },
      stack: String,
      retryCount: { type: Number, default: 0, min: 0 },
      lastRetryAt: Date
    },

    // Ownership
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'requestedBy is required'],
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
  },
  {
    timestamps: true
  }
);

// Compound indexes for common queries
ReportJobSchema.index({ status: 1, priority: -1, scheduledFor: 1 });
ReportJobSchema.index({ requestedBy: 1, status: 1, createdAt: -1 });
ReportJobSchema.index({ departmentId: 1, status: 1, createdAt: -1 });
ReportJobSchema.index({ visibility: 1, departmentId: 1, status: 1 });

// TTL index for auto-cleanup of expired jobs
ReportJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Pre-save validation hook
 *
 * Validates enum fields against LookupValue table:
 * - reportType (report-type category)
 * - status (report-status category)
 * - priority (report-priority category)
 * - visibility (report-visibility category)
 * - output.format (output-format category)
 * - parameters.measures[] (measure-type category)
 */
ReportJobSchema.pre('save', async function (next) {
  try {
    // Validate reportType
    if (this.isModified('reportType')) {
      const isValidType = await validateLookupValue('report-type', this.reportType);
      if (!isValidType) {
        throw new Error(
          `Invalid reportType: "${this.reportType}". Must be a registered report-type in LookupValue.`
        );
      }
    }

    // Validate status
    if (this.isModified('status')) {
      const isValidStatus = await validateLookupValue('report-status', this.status);
      if (!isValidStatus) {
        throw new Error(
          `Invalid status: "${this.status}". Must be a registered report-status in LookupValue.`
        );
      }
    }

    // Validate priority
    if (this.isModified('priority')) {
      const isValidPriority = await validateLookupValue('report-priority', this.priority);
      if (!isValidPriority) {
        throw new Error(
          `Invalid priority: "${this.priority}". Must be a registered report-priority in LookupValue.`
        );
      }
    }

    // Validate visibility
    if (this.isModified('visibility')) {
      const isValidVisibility = await validateLookupValue('report-visibility', this.visibility);
      if (!isValidVisibility) {
        throw new Error(
          `Invalid visibility: "${this.visibility}". Must be a registered report-visibility in LookupValue.`
        );
      }
    }

    // Validate output.format
    if (this.isModified('output.format')) {
      const isValidFormat = await validateLookupValue('output-format', this.output.format);
      if (!isValidFormat) {
        throw new Error(
          `Invalid output.format: "${this.output.format}". Must be a registered output-format in LookupValue.`
        );
      }
    }

    // Validate measures if provided
    if (this.isModified('parameters.measures') && this.parameters?.measures) {
      for (const measure of this.parameters.measures) {
        const isValidMeasure = await validateLookupValue('measure-type', measure);
        if (!isValidMeasure) {
          throw new Error(
            `Invalid measure: "${measure}". Must be a registered measure-type in LookupValue.`
          );
        }
      }
    }

    next();
  } catch (error: any) {
    next(error);
  }
});

export const ReportJob = mongoose.model<IReportJob>('ReportJob', ReportJobSchema);
export default ReportJob;
