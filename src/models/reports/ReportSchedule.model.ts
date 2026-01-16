/**
 * ReportSchedule Model
 *
 * Manages scheduled and recurring report generation. Defines when reports should run,
 * who should receive them, and how they should be delivered.
 *
 * Features:
 * - Multiple frequency types (once, daily, weekly, monthly, quarterly)
 * - Timezone support for accurate scheduling
 * - Automatic nextRunAt calculation
 * - Flexible date range adjustments (previous period, custom offsets, template defaults)
 * - Email and/or storage delivery
 * - Execution tracking and failure management
 * - Pause/resume capability
 *
 * @module models/reports/ReportSchedule
 */

import mongoose, { Schema, Document } from 'mongoose';
import { validateLookupValue } from '@/utils/lookup-validators';

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
    timezone: string; // e.g., 'America/New_York'

    // For 'once'
    runAt?: Date;

    // For 'daily'
    timeOfDay?: string; // e.g., '08:00'

    // For 'weekly'
    dayOfWeek?: number; // 0-6 (Sunday-Saturday)

    // For 'monthly'
    dayOfMonth?: number; // 1-31

    // For 'quarterly'
    quarterMonths?: number[]; // [1, 4, 7, 10] for Jan, Apr, Jul, Oct
  };

  // Date Range Adjustment
  dateRangeType: 'previous-period' | 'custom' | 'from-template';
  customDateRange?: {
    startDaysOffset: number; // e.g., -30 for 30 days ago
    endDaysOffset: number; // e.g., -1 for yesterday
  };

  // Output Configuration
  output: {
    format: string; // LookupValue: output-format.*
    filenameTemplate?: string; // e.g., 'weekly-report-{date}'
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

  // Helper method for calculating next run time
  calculateNextRunTime(fromDate?: Date): Date | null;
}

const ReportScheduleSchema = new Schema<IReportSchedule>(
  {
    // Schedule Definition
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
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'ReportTemplate',
      required: [true, 'templateId is required'],
      index: true
    },

    // Timing Configuration
    schedule: {
      frequency: {
        type: String,
        enum: {
          values: ['once', 'daily', 'weekly', 'monthly', 'quarterly'],
          message: '{VALUE} is not a valid frequency'
        },
        required: [true, 'schedule.frequency is required']
      },
      timezone: {
        type: String,
        default: 'UTC'
      },
      runAt: Date,
      timeOfDay: {
        type: String,
        validate: {
          validator: function (v: string) {
            return !v || /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
          },
          message: 'timeOfDay must be in HH:MM format (e.g., 08:00)'
        }
      },
      dayOfWeek: {
        type: Number,
        min: [0, 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)'],
        max: [6, 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)']
      },
      dayOfMonth: {
        type: Number,
        min: [1, 'dayOfMonth must be between 1 and 31'],
        max: [31, 'dayOfMonth must be between 1 and 31']
      },
      quarterMonths: [
        {
          type: Number,
          min: [1, 'quarterMonth must be between 1 and 12'],
          max: [12, 'quarterMonth must be between 1 and 12']
        }
      ]
    },

    // Date Range Adjustment
    dateRangeType: {
      type: String,
      enum: {
        values: ['previous-period', 'custom', 'from-template'],
        message: '{VALUE} is not a valid date range type'
      },
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
        required: [true, 'output.format is required'],
        default: 'pdf'
      },
      filenameTemplate: {
        type: String,
        trim: true,
        maxlength: [200, 'filenameTemplate cannot exceed 200 characters']
      }
    },

    // Delivery Configuration
    delivery: {
      method: {
        type: String,
        enum: {
          values: ['email', 'storage', 'both'],
          message: '{VALUE} is not a valid delivery method'
        },
        default: 'storage'
      },
      email: {
        recipients: [String],
        subject: {
          type: String,
          maxlength: [200, 'email.subject cannot exceed 200 characters']
        },
        body: {
          type: String,
          maxlength: [5000, 'email.body cannot exceed 5000 characters']
        },
        includeLink: { type: Boolean, default: true },
        attachReport: { type: Boolean, default: false }
      },
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
      default: 0,
      min: [0, 'runCount cannot be negative']
    },
    failureCount: {
      type: Number,
      default: 0,
      min: [0, 'failureCount cannot be negative']
    },
    consecutiveFailures: {
      type: Number,
      default: 0,
      min: [0, 'consecutiveFailures cannot be negative']
    },

    // Ownership
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'createdBy is required'],
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
    pausedReason: {
      type: String,
      maxlength: [500, 'pausedReason cannot exceed 500 characters']
    },
    pausedAt: Date,
    pausedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
ReportScheduleSchema.index({ isActive: 1, isPaused: 1, nextRunAt: 1 });
ReportScheduleSchema.index({ createdBy: 1, isActive: 1 });
ReportScheduleSchema.index({ templateId: 1, isActive: 1 });

/**
 * Helper method: Calculate next run time based on schedule configuration
 *
 * @param fromDate - Starting date for calculation (defaults to now)
 * @returns Next scheduled run time, or null for one-time schedules that have run
 */
ReportScheduleSchema.methods.calculateNextRunTime = function (fromDate?: Date): Date | null {
  const from = fromDate || new Date();
  const { frequency, timezone, runAt, timeOfDay, dayOfWeek, dayOfMonth, quarterMonths } =
    this.schedule;

  // One-time schedules
  if (frequency === 'once') {
    if (runAt && runAt > from) {
      return runAt;
    }
    return null; // Already run or no runAt specified
  }

  // For recurring schedules, calculate next run time
  const nextRun = new Date(from);

  // Parse time of day if provided
  let hour = 0;
  let minute = 0;
  if (timeOfDay) {
    const [h, m] = timeOfDay.split(':').map(Number);
    hour = h;
    minute = m;
  }

  switch (frequency) {
    case 'daily':
      nextRun.setHours(hour, minute, 0, 0);
      if (nextRun <= from) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;

    case 'weekly':
      if (dayOfWeek === undefined) {
        throw new Error('dayOfWeek is required for weekly schedules');
      }
      nextRun.setHours(hour, minute, 0, 0);
      const currentDay = nextRun.getDay();
      const daysUntilNext = (dayOfWeek - currentDay + 7) % 7;
      if (daysUntilNext === 0 && nextRun <= from) {
        nextRun.setDate(nextRun.getDate() + 7);
      } else {
        nextRun.setDate(nextRun.getDate() + daysUntilNext);
      }
      break;

    case 'monthly':
      if (dayOfMonth === undefined) {
        throw new Error('dayOfMonth is required for monthly schedules');
      }
      nextRun.setHours(hour, minute, 0, 0);
      nextRun.setDate(dayOfMonth);
      if (nextRun <= from) {
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(dayOfMonth);
      }
      // Handle month overflow (e.g., Feb 31 -> Mar 3)
      while (nextRun.getDate() !== dayOfMonth) {
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(dayOfMonth);
      }
      break;

    case 'quarterly':
      if (!quarterMonths || quarterMonths.length === 0) {
        throw new Error('quarterMonths is required for quarterly schedules');
      }
      nextRun.setHours(hour, minute, 0, 0);
      if (dayOfMonth) {
        nextRun.setDate(dayOfMonth);
      } else {
        nextRun.setDate(1); // Default to 1st of month
      }

      // Find next quarter month
      const currentMonth = nextRun.getMonth() + 1;
      const sortedQuarterMonths = [...quarterMonths].sort((a, b) => a - b);
      let nextQuarterMonth = sortedQuarterMonths.find((m) => m > currentMonth);

      if (!nextQuarterMonth || nextRun <= from) {
        // Move to next year if no more quarters this year or current time has passed
        nextQuarterMonth = sortedQuarterMonths[0];
        if (!nextQuarterMonth || currentMonth >= nextQuarterMonth) {
          nextRun.setFullYear(nextRun.getFullYear() + 1);
        }
      }

      nextRun.setMonth(nextQuarterMonth! - 1);
      break;

    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }

  return nextRun;
};

/**
 * Pre-save validation hook
 *
 * Validates enum fields against LookupValue table and calculates nextRunAt.
 */
ReportScheduleSchema.pre('save', async function (next) {
  try {
    // Validate output.format
    if (this.isModified('output.format')) {
      const isValidFormat = await validateLookupValue('output-format', this.output.format);
      if (!isValidFormat) {
        throw new Error(
          `Invalid output.format: "${this.output.format}". Must be a registered output-format in LookupValue.`
        );
      }
    }

    // Calculate nextRunAt if schedule has changed or this is a new document
    if (
      this.isNew ||
      this.isModified('schedule') ||
      this.isModified('isActive') ||
      this.isModified('isPaused')
    ) {
      if (this.isActive && !this.isPaused) {
        this.nextRunAt = this.calculateNextRunTime();
      } else {
        this.nextRunAt = undefined;
      }
    }

    next();
  } catch (error: any) {
    next(error);
  }
});

export const ReportSchedule = mongoose.model<IReportSchedule>(
  'ReportSchedule',
  ReportScheduleSchema
);
export default ReportSchedule;
