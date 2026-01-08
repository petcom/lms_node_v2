import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  name: string;
  reportType: 'course-analytics' | 'learner-progress' | 'scorm-analytics' | 'enrollment' | 'financial';
  description?: string;
  generatedBy: mongoose.Types.ObjectId;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  parameters: {
    startDate?: Date;
    endDate?: Date;
    courseId?: string;
    programId?: string;
    departmentId?: string;
    learnerId?: string;
    [key: string]: any;
  };
  fileUrl?: string;
  fileSizeBytes?: number;
  generatedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  metadata: {
    recordCount?: number;
    generationDurationMs?: number;
    [key: string]: any;
  };
  isScheduled: boolean;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6, Sunday=0
    dayOfMonth?: number; // 1-31
    time?: string; // HH:mm format
  };
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    reportType: {
      type: String,
      required: true,
      enum: ['course-analytics', 'learner-progress', 'scorm-analytics', 'enrollment', 'financial'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    format: {
      type: String,
      required: true,
      enum: ['pdf', 'excel', 'csv', 'json'],
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    parameters: {
      type: Schema.Types.Mixed,
      default: {},
    },
    fileUrl: {
      type: String,
    },
    fileSizeBytes: {
      type: Number,
      min: 0,
    },
    generatedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    errorMessage: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isScheduled: {
      type: Boolean,
      default: false,
    },
    schedule: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
      },
      dayOfWeek: {
        type: Number,
        min: 0,
        max: 6,
      },
      dayOfMonth: {
        type: Number,
        min: 1,
        max: 31,
      },
      time: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
reportSchema.index({ generatedBy: 1 });
reportSchema.index({ reportType: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ isScheduled: 1 });

export const Report = mongoose.model<IReport>('Report', reportSchema);
