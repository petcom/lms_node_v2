import mongoose, { Schema, Document } from 'mongoose';

export interface IScormAttempt extends Document {
  contentId: mongoose.Types.ObjectId;
  learnerId: mongoose.Types.ObjectId;
  attemptNumber: number;
  scormVersion: '1.2' | '2004';
  status: 'not-attempted' | 'incomplete' | 'completed' | 'passed' | 'failed' | 'browsed' | 'abandoned';
  scoreRaw?: number;
  scoreMin?: number;
  scoreMax?: number;
  scoreScaled?: number;
  sessionTime?: number;
  totalTime?: number;
  progressMeasure?: number;
  completionStatus?: string;
  successStatus?: string;
  cmiData?: Record<string, any>;
  suspendData?: string;
  launchData?: string;
  location?: string;
  startedAt?: Date;
  lastAccessedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ScormAttemptSchema = new Schema<IScormAttempt>(
  {
    contentId: {
      type: Schema.Types.ObjectId,
      required: [true, 'contentId is required'],
      ref: 'Content',
      index: true
    },
    learnerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'learnerId is required'],
      ref: 'User',
      index: true
    },
    attemptNumber: {
      type: Number,
      required: [true, 'attemptNumber is required'],
      min: [1, 'attemptNumber must be at least 1']
    },
    scormVersion: {
      type: String,
      required: [true, 'scormVersion is required'],
      enum: {
        values: ['1.2', '2004'],
        message: '{VALUE} is not a valid SCORM version'
      }
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: ['not-attempted', 'incomplete', 'completed', 'passed', 'failed', 'browsed', 'abandoned'],
        message: '{VALUE} is not a valid SCORM attempt status'
      },
      index: true
    },
    scoreRaw: {
      type: Number
    },
    scoreMin: {
      type: Number
    },
    scoreMax: {
      type: Number
    },
    scoreScaled: {
      type: Number,
      min: [-1, 'scoreScaled must be at least -1'],
      max: [1, 'scoreScaled cannot exceed 1']
    },
    sessionTime: {
      type: Number,
      min: [0, 'sessionTime cannot be negative']
    },
    totalTime: {
      type: Number,
      min: [0, 'totalTime cannot be negative']
    },
    progressMeasure: {
      type: Number,
      min: [0, 'progressMeasure must be at least 0'],
      max: [1, 'progressMeasure cannot exceed 1']
    },
    completionStatus: {
      type: String,
      trim: true
    },
    successStatus: {
      type: String,
      trim: true
    },
    cmiData: {
      type: Schema.Types.Mixed
    },
    suspendData: {
      type: String
    },
    launchData: {
      type: String
    },
    location: {
      type: String,
      trim: true
    },
    startedAt: {
      type: Date
    },
    lastAccessedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient queries
ScormAttemptSchema.index({ contentId: 1, learnerId: 1, attemptNumber: 1 });
ScormAttemptSchema.index({ learnerId: 1, status: 1 });
ScormAttemptSchema.index({ contentId: 1, status: 1 });

export default mongoose.model<IScormAttempt>('ScormAttempt', ScormAttemptSchema);
