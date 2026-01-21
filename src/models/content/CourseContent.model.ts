import mongoose, { Schema, Document } from 'mongoose';

export interface ICourseContent extends Document {
  courseId: mongoose.Types.ObjectId;
  contentId?: mongoose.Types.ObjectId;
  moduleNumber?: number;
  sectionNumber?: number;
  sequence: number;
  isRequired: boolean;
  availableFrom?: Date;
  availableUntil?: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const courseContentSchema = new Schema<ICourseContent>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required']
    },
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content',
      default: undefined
    },
    moduleNumber: {
      type: Number,
      min: [1, 'Module number must be at least 1']
    },
    sectionNumber: {
      type: Number,
      min: [1, 'Section number must be at least 1']
    },
    sequence: {
      type: Number,
      required: [true, 'Sequence is required'],
      min: [1, 'Sequence must be at least 1']
    },
    isRequired: {
      type: Boolean,
      default: false
    },
    availableFrom: {
      type: Date
    },
    availableUntil: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
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

// Compound unique index - same content can't be added twice to same course
// Partial filter: only enforce uniqueness when contentId exists (not null/undefined)
courseContentSchema.index(
  { courseId: 1, contentId: 1 },
  { unique: true, partialFilterExpression: { contentId: { $type: 'objectId' } } }
);

// Indexes for efficient querying
courseContentSchema.index({ courseId: 1, sequence: 1 });
courseContentSchema.index({ courseId: 1, moduleNumber: 1 });
courseContentSchema.index({ isActive: 1 });
courseContentSchema.index({ isRequired: 1 });

const CourseContent = mongoose.model<ICourseContent>('CourseContent', courseContentSchema);

export default CourseContent;
