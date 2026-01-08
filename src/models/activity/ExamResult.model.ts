import mongoose, { Schema, Document } from 'mongoose';

export interface IExamResult extends Document {
  examId: mongoose.Types.ObjectId;
  learnerId: mongoose.Types.ObjectId;
  attemptNumber: number;
  status: 'in-progress' | 'completed' | 'graded' | 'submitted';
  score: number;
  maxScore: number;
  percentage?: number;
  passed?: boolean;
  gradeLetter?: string;
  answers?: Record<string, any>;
  questionScores?: Record<string, any>;
  startedAt?: Date;
  submittedAt?: Date;
  gradedAt?: Date;
  timeSpent?: number;
  gradedBy?: mongoose.Types.ObjectId;
  feedback?: string;
  questionFeedback?: Record<string, string>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ExamResultSchema = new Schema<IExamResult>(
  {
    examId: {
      type: Schema.Types.ObjectId,
      required: [true, 'examId is required'],
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
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: ['in-progress', 'completed', 'graded', 'submitted'],
        message: '{VALUE} is not a valid exam result status'
      },
      index: true
    },
    score: {
      type: Number,
      required: [true, 'score is required'],
      min: [0, 'score cannot be negative']
    },
    maxScore: {
      type: Number,
      required: [true, 'maxScore is required'],
      min: [1, 'maxScore must be at least 1']
    },
    percentage: {
      type: Number
    },
    passed: {
      type: Boolean
    },
    gradeLetter: {
      type: String,
      trim: true,
      uppercase: true
    },
    answers: {
      type: Schema.Types.Mixed
    },
    questionScores: {
      type: Schema.Types.Mixed
    },
    startedAt: {
      type: Date
    },
    submittedAt: {
      type: Date
    },
    gradedAt: {
      type: Date
    },
    timeSpent: {
      type: Number,
      min: [0, 'timeSpent cannot be negative']
    },
    gradedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    feedback: {
      type: String,
      trim: true
    },
    questionFeedback: {
      type: Schema.Types.Mixed
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
ExamResultSchema.index({ examId: 1, learnerId: 1, attemptNumber: 1 });
ExamResultSchema.index({ learnerId: 1, status: 1 });
ExamResultSchema.index({ examId: 1, status: 1 });

export default mongoose.model<IExamResult>('ExamResult', ExamResultSchema);
