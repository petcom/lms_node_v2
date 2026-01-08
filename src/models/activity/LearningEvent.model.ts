import mongoose, { Schema, Document } from 'mongoose';

export interface ILearningEvent extends Document {
  learnerId: mongoose.Types.ObjectId;
  eventType: string;
  contentId?: mongoose.Types.ObjectId;
  classId?: mongoose.Types.ObjectId;
  timestamp: Date;
  data?: Record<string, any>;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  duration?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const LearningEventSchema = new Schema<ILearningEvent>(
  {
    learnerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'learnerId is required'],
      ref: 'User',
      index: true
    },
    eventType: {
      type: String,
      required: [true, 'eventType is required'],
      enum: {
        values: [
          'content-viewed',
          'content-started',
          'content-completed',
          'exam-started',
          'exam-submitted',
          'video-played',
          'video-paused',
          'video-completed',
          'assignment-submitted',
          'scorm-launched',
          'scorm-exited',
          'login',
          'logout'
        ],
        message: '{VALUE} is not a valid event type'
      },
      index: true
    },
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content',
      index: true
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      index: true
    },
    timestamp: {
      type: Date,
      required: [true, 'timestamp is required'],
      index: true
    },
    data: {
      type: Schema.Types.Mixed
    },
    sessionId: {
      type: String,
      trim: true,
      index: true
    },
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    duration: {
      type: Number,
      min: [0, 'duration cannot be negative']
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
LearningEventSchema.index({ learnerId: 1, timestamp: -1 });
LearningEventSchema.index({ contentId: 1, eventType: 1, timestamp: -1 });
LearningEventSchema.index({ classId: 1, timestamp: -1 });
LearningEventSchema.index({ eventType: 1, timestamp: -1 });

export default mongoose.model<ILearningEvent>('LearningEvent', LearningEventSchema);
