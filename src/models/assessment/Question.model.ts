import mongoose, { Schema, Document } from 'mongoose';

export type QuestionType = 
  | 'multiple-choice' 
  | 'true-false' 
  | 'short-answer' 
  | 'essay' 
  | 'fill-blank' 
  | 'matching';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface IQuestion extends Document {
  questionText: string;
  questionType: QuestionType;
  departmentId: mongoose.Types.ObjectId;
  points: number;
  options?: string[];
  correctAnswer?: string;
  correctAnswers?: string[];
  modelAnswer?: string;
  matchingPairs?: Record<string, string>;
  maxWordCount?: number;
  difficulty?: DifficultyLevel;
  tags?: string[];
  explanation?: string;
  hints?: string[];
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    questionText: {
      type: String,
      required: [true, 'questionText is required'],
      trim: true
    },
    questionType: {
      type: String,
      required: [true, 'questionType is required'],
      enum: {
        values: ['multiple-choice', 'true-false', 'short-answer', 'essay', 'fill-blank', 'matching'],
        message: '{VALUE} is not a valid question type'
      },
      index: true
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      required: [true, 'departmentId is required'],
      ref: 'Department',
      index: true
    },
    points: {
      type: Number,
      required: [true, 'points is required'],
      min: [1, 'points must be at least 1']
    },
    options: [String],
    correctAnswer: {
      type: String,
      trim: true
    },
    correctAnswers: [String],
    modelAnswer: {
      type: String,
      trim: true
    },
    matchingPairs: {
      type: Schema.Types.Mixed
    },
    maxWordCount: {
      type: Number,
      min: [1, 'maxWordCount must be at least 1']
    },
    difficulty: {
      type: String,
      enum: {
        values: ['easy', 'medium', 'hard'],
        message: '{VALUE} is not a valid difficulty level'
      },
      index: true
    },
    tags: [String],
    explanation: {
      type: String,
      trim: true
    },
    hints: [String],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// Indexes for common queries
QuestionSchema.index({ departmentId: 1, questionType: 1 });
QuestionSchema.index({ departmentId: 1, difficulty: 1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ isActive: 1, departmentId: 1 });

export default mongoose.model<IQuestion>('Question', QuestionSchema);
