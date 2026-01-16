/**
 * ReportTemplate Model
 *
 * Manages saved report configurations for reuse and sharing. Templates allow users to:
 * - Save frequently-used report parameter combinations
 * - Share report configurations across teams/departments
 * - Track template usage and popularity
 * - Support both fixed and relative date ranges
 *
 * Features:
 * - LookupValue validation for extensibility
 * - Visibility and sharing controls
 * - Usage tracking for analytics
 * - Text search on name/description
 * - Support for relative date ranges (e.g., "last 30 days")
 *
 * @module models/reports/ReportTemplate
 */

import mongoose, { Schema, Document } from 'mongoose';
import { validateLookupValue } from '@/utils/lookup-validators';

export interface IReportTemplate extends Document {
  // Identity
  _id: mongoose.Types.ObjectId;

  // Template Definition
  name: string;
  description?: string;
  reportType: string; // LookupValue: report-type.*

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
    measures?: string[]; // LookupValue: measure-type.*
    includeInactive?: boolean;
  };

  // Default Output Settings
  defaultOutput: {
    format: string; // LookupValue: output-format.*
    filenameTemplate?: string; // e.g., 'completion-report-{date}'
  };

  // Ownership & Visibility
  createdBy: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  visibility: string; // LookupValue: report-visibility.*

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

const ReportTemplateSchema = new Schema<IReportTemplate>(
  {
    // Template Definition
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
    reportType: {
      type: String,
      required: [true, 'reportType is required'],
      index: true
    },

    // Saved Parameters
    parameters: {
      dateRange: {
        type: {
          type: String,
          enum: {
            values: ['fixed', 'relative'],
            message: '{VALUE} is not a valid date range type'
          }
        },
        startDate: Date,
        endDate: Date,
        relativePeriod: String,
        relativeUnit: {
          type: String,
          enum: {
            values: ['days', 'weeks', 'months', 'quarters', 'years'],
            message: '{VALUE} is not a valid relative unit'
          }
        },
        relativeCount: {
          type: Number,
          min: [1, 'relativeCount must be at least 1']
        }
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
        required: [true, 'defaultOutput.format is required'],
        default: 'pdf'
      },
      filenameTemplate: {
        type: String,
        trim: true,
        maxlength: [200, 'filenameTemplate cannot exceed 200 characters']
      }
    },

    // Ownership & Visibility
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
      default: 0,
      min: [0, 'usageCount cannot be negative']
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
  },
  {
    timestamps: true
  }
);

// Compound indexes for common queries
ReportTemplateSchema.index({ createdBy: 1, isActive: 1 });
ReportTemplateSchema.index({ visibility: 1, isActive: 1 });
ReportTemplateSchema.index({ departmentId: 1, visibility: 1, isActive: 1 });
ReportTemplateSchema.index({ reportType: 1, isActive: 1 });

// Text search index for name and description
ReportTemplateSchema.index({ name: 'text', description: 'text' });

/**
 * Pre-save validation hook
 *
 * Validates enum fields against LookupValue table:
 * - reportType (report-type category)
 * - visibility (report-visibility category)
 * - defaultOutput.format (output-format category)
 * - parameters.measures[] (measure-type category)
 */
ReportTemplateSchema.pre('save', async function (next) {
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

    // Validate visibility
    if (this.isModified('visibility')) {
      const isValidVisibility = await validateLookupValue('report-visibility', this.visibility);
      if (!isValidVisibility) {
        throw new Error(
          `Invalid visibility: "${this.visibility}". Must be a registered report-visibility in LookupValue.`
        );
      }
    }

    // Validate defaultOutput.format
    if (this.isModified('defaultOutput.format')) {
      const isValidFormat = await validateLookupValue('output-format', this.defaultOutput.format);
      if (!isValidFormat) {
        throw new Error(
          `Invalid defaultOutput.format: "${this.defaultOutput.format}". Must be a registered output-format in LookupValue.`
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

export const ReportTemplate = mongoose.model<IReportTemplate>(
  'ReportTemplate',
  ReportTemplateSchema
);
export default ReportTemplate;
