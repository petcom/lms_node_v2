import mongoose, { Schema, Document } from 'mongoose';

/**
 * IGradeChangeLog Interface
 *
 * Immutable audit log for grade override operations.
 * Tracks all changes to student grades with full context.
 *
 * SECURITY:
 * - All fields marked as immutable
 * - Pre-hooks prevent updates and deletes
 * - Provides complete audit trail for FERPA compliance
 */
export interface IGradeChangeLog extends Document {
  // Identifiers
  enrollmentId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  learnerId: mongoose.Types.ObjectId;

  // Grade change details
  fieldChanged: 'gradeLetter' | 'gradePercentage' | 'gradePoints' | 'all';
  previousGradeLetter?: string;
  newGradeLetter?: string;
  previousGradePercentage?: number;
  newGradePercentage?: number;
  previousGradePoints?: number;
  newGradePoints?: number;

  // Audit information
  changedBy: mongoose.Types.ObjectId;
  changedByRole: string;
  changedAt: Date;
  reason: string;
  changeType: 'override';

  // Context
  departmentId: mongoose.Types.ObjectId;
  termId?: mongoose.Types.ObjectId;

  // Metadata
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const GradeChangeLogSchema = new Schema<IGradeChangeLog>(
  {
    enrollmentId: {
      type: Schema.Types.ObjectId,
      required: [true, 'enrollmentId is required'],
      ref: 'ClassEnrollment',
      index: true,
      immutable: true
    },
    classId: {
      type: Schema.Types.ObjectId,
      required: [true, 'classId is required'],
      ref: 'Class',
      index: true,
      immutable: true
    },
    courseId: {
      type: Schema.Types.ObjectId,
      required: [true, 'courseId is required'],
      ref: 'Course',
      index: true,
      immutable: true
    },
    learnerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'learnerId is required'],
      ref: 'User',
      index: true,
      immutable: true
    },
    fieldChanged: {
      type: String,
      required: [true, 'fieldChanged is required'],
      enum: {
        values: ['gradeLetter', 'gradePercentage', 'gradePoints', 'all'],
        message: '{VALUE} is not a valid field type'
      },
      immutable: true
    },
    previousGradeLetter: { type: String, immutable: true },
    newGradeLetter: { type: String, immutable: true },
    previousGradePercentage: { type: Number, immutable: true },
    newGradePercentage: { type: Number, immutable: true },
    previousGradePoints: { type: Number, immutable: true },
    newGradePoints: { type: Number, immutable: true },
    changedBy: {
      type: Schema.Types.ObjectId,
      required: [true, 'changedBy is required'],
      ref: 'User',
      index: true,
      immutable: true
    },
    changedByRole: {
      type: String,
      required: [true, 'changedByRole is required'],
      immutable: true
    },
    changedAt: {
      type: Date,
      required: [true, 'changedAt is required'],
      index: true,
      immutable: true
    },
    reason: {
      type: String,
      required: [true, 'reason is required'],
      minlength: [10, 'reason must be at least 10 characters'],
      maxlength: [1000, 'reason cannot exceed 1000 characters'],
      trim: true,
      immutable: true
    },
    changeType: {
      type: String,
      required: true,
      enum: ['override'],
      default: 'override',
      immutable: true
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      required: [true, 'departmentId is required'],
      ref: 'Department',
      index: true,
      immutable: true
    },
    termId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicTerm',
      index: true,
      immutable: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      immutable: true
    }
  },
  {
    timestamps: true
  }
);

// Prevent updates to audit log records
GradeChangeLogSchema.pre('findOneAndUpdate', function(next) {
  next(new Error('GradeChangeLog records are immutable and cannot be updated'));
});

GradeChangeLogSchema.pre('updateOne', function(next) {
  next(new Error('GradeChangeLog records are immutable and cannot be updated'));
});

GradeChangeLogSchema.pre('updateMany', function(next) {
  next(new Error('GradeChangeLog records are immutable and cannot be updated'));
});

// Prevent deletion of audit log records
GradeChangeLogSchema.pre('findOneAndDelete', function(next) {
  next(new Error('GradeChangeLog records cannot be deleted'));
});

GradeChangeLogSchema.pre('deleteOne', function(next) {
  next(new Error('GradeChangeLog records cannot be deleted'));
});

GradeChangeLogSchema.pre('deleteMany', function(next) {
  next(new Error('GradeChangeLog records cannot be deleted'));
});

// Indexes for common queries
GradeChangeLogSchema.index({ enrollmentId: 1, changedAt: -1 });
GradeChangeLogSchema.index({ learnerId: 1, changedAt: -1 });
GradeChangeLogSchema.index({ changedBy: 1, changedAt: -1 });
GradeChangeLogSchema.index({ classId: 1, changedAt: -1 });
GradeChangeLogSchema.index({ departmentId: 1, changedAt: -1 });

const GradeChangeLog = mongoose.model<IGradeChangeLog>('GradeChangeLog', GradeChangeLogSchema);

export default GradeChangeLog;
