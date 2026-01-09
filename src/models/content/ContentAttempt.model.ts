import mongoose, { Schema, Document } from 'mongoose';

export type AttemptStatus =
  | 'not-started'
  | 'started'
  | 'in-progress'
  | 'completed'
  | 'passed'
  | 'failed'
  | 'suspended'
  | 'abandoned';

export interface ISCORMAttemptData {
  cmi: Record<string, any>;
}

export interface IContentAttempt extends Document {
  contentId: mongoose.Types.ObjectId;
  learnerId: mongoose.Types.ObjectId;
  status: AttemptStatus;
  attemptNumber: number;
  progressPercent?: number;
  score?: number;
  timeSpentSeconds?: number;
  startedAt?: Date;
  completedAt?: Date;
  lastAccessedAt?: Date;
  scormData?: ISCORMAttemptData;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const scormAttemptDataSchema = new Schema<ISCORMAttemptData>(
  {
    cmi: {
      type: Schema.Types.Mixed,
      required: true
    }
  },
  { _id: false }
);

const contentAttemptSchema = new Schema<IContentAttempt>(
  {
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content',
      required: [true, 'Content is required']
    },
    learnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Learner',
      required: [true, 'Learner is required']
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['not-started', 'started', 'in-progress', 'completed', 'passed', 'failed', 'suspended', 'abandoned'],
        message: '{VALUE} is not a valid attempt status'
      }
    },
    attemptNumber: {
      type: Number,
      required: [true, 'Attempt number is required'],
      min: [1, 'Attempt number must be at least 1']
    },
    progressPercent: {
      type: Number,
      min: [0, 'Progress cannot be less than 0'],
      max: [100, 'Progress cannot exceed 100']
    },
    score: {
      type: Number,
      min: [0, 'Score cannot be less than 0'],
      max: [100, 'Score cannot exceed 100']
    },
    timeSpentSeconds: {
      type: Number,
      min: [0, 'Time spent cannot be negative'],
      default: 0
    },
    startedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    lastAccessedAt: {
      type: Date
    },
    scormData: {
      type: scormAttemptDataSchema,
      default: undefined
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient querying
contentAttemptSchema.index({ contentId: 1, learnerId: 1, attemptNumber: 1 });
contentAttemptSchema.index({ learnerId: 1, status: 1 });
contentAttemptSchema.index({ contentId: 1, status: 1 });
contentAttemptSchema.index({ createdAt: -1 });

const ContentAttempt = mongoose.model<IContentAttempt>('ContentAttempt', contentAttemptSchema);

export default ContentAttempt;
