import mongoose, { Schema, Document } from 'mongoose';

/**
 * Valid course statuses
 * These values are validated against LookupValue collection (category: 'course-status')
 * to allow dynamic extension without code changes.
 * 
 * Built-in statuses:
 * - draft: Course is being developed, not visible to learners
 * - published: Course is live and available for enrollment
 * - archived: Course is no longer active, preserved for records
 */
export type CourseStatus = 'draft' | 'published' | 'archived';

export interface ICourse extends Document {
  name: string;
  code: string;
  description?: string;
  departmentId: mongoose.Types.ObjectId;
  credits: number;
  prerequisites?: mongoose.Types.ObjectId[];
  status: CourseStatus;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
      maxlength: [200, 'Course name cannot exceed 200 characters']
    },
    code: {
      type: String,
      required: [true, 'Course code is required'],
      uppercase: true,
      trim: true,
      maxlength: [50, 'Course code cannot exceed 50 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required']
    },
    credits: {
      type: Number,
      required: [true, 'Credits are required'],
      min: [0, 'Credits cannot be negative']
    },
    prerequisites: {
      type: [Schema.Types.ObjectId],
      ref: 'Course',
      default: []
    },
    status: {
      type: String,
      required: true,
      default: 'draft',
      lowercase: true,
      trim: true,
      // Note: Values validated against LookupValue at runtime for extensibility
      // Built-in values: draft, published, archived
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false
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

// Compound index for unique code within department
courseSchema.index({ departmentId: 1, code: 1 }, { unique: true });
courseSchema.index({ status: 1 });
courseSchema.index({ createdBy: 1 });
courseSchema.index({ isActive: 1 });
courseSchema.index({ credits: 1 });

/**
 * Pre-save hook to validate status against LookupValue collection
 * This enables dynamic status values without code changes
 */
courseSchema.pre('save', async function(next) {
  if (this.isModified('status')) {
    // Dynamic import to avoid circular dependency
    const { LookupValue } = await import('../LookupValue.model');
    
    const validStatus = await LookupValue.findOne({
      category: 'course-status',
      key: this.status,
      isActive: true
    });
    
    if (!validStatus) {
      const error = new Error(`Invalid course status: ${this.status}. Valid statuses can be found in LookupValue (category: course-status)`);
      return next(error);
    }
  }
  next();
});

const Course = mongoose.model<ICourse>('Course', courseSchema);

export default Course;
