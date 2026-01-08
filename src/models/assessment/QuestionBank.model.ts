import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestionBank extends Document {
  name: string;
  description?: string;
  departmentId: mongoose.Types.ObjectId;
  questionIds: mongoose.Types.ObjectId[];
  tags?: string[];
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionBankSchema = new Schema<IQuestionBank>(
  {
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      required: [true, 'departmentId is required'],
      ref: 'Department',
      index: true
    },
    questionIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Question'
    }],
    tags: [String],
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
QuestionBankSchema.index({ departmentId: 1, isActive: 1 });
QuestionBankSchema.index({ tags: 1 });

export default mongoose.model<IQuestionBank>('QuestionBank', QuestionBankSchema);
