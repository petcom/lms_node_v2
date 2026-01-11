/**
 * ClassEnrollment Model
 * 
 * Enrollment in a Class (cohort of courses for a specific timeframe).
 * 
 * A Class is a "defined group of courses" held during a "specific period"
 * (e.g., Fall Semester 2027: Sept-Dec).
 * 
 * Use case: A group of students participate in a set group of courses together,
 * studying as a cohort during a defined timeframe.
 * 
 * @module models/ClassEnrollment
 */

import { Schema, model, Document, Types } from 'mongoose';

// Enrollment statuses
export const CLASS_ENROLLMENT_STATUSES = [
  'pending',    // Awaiting class start
  'active',     // Currently enrolled and class is running
  'completed',  // Completed all requirements
  'withdrawn',  // Dropped out
  'failed',     // Did not meet requirements
  'expired'     // Class period ended without completion
] as const;

export type ClassEnrollmentStatus = typeof CLASS_ENROLLMENT_STATUSES[number];

/**
 * ClassEnrollment document interface
 */
export interface IClassEnrollment extends Document {
  _id: Types.ObjectId;
  
  /** Reference to the Class */
  classId: Types.ObjectId;
  
  /** Learner enrolled */
  learnerId: Types.ObjectId;
  
  /** Department the class belongs to */
  departmentId: Types.ObjectId;
  
  /** Status of this class enrollment */
  status: ClassEnrollmentStatus;
  
  /** Enrollment date */
  enrolledAt: Date;
  
  /** When the class period started for this learner */
  periodStartDate?: Date;
  
  /** When the class period ends for this learner */
  periodEndDate?: Date;
  
  /** Overall progress across all courses in the class (0-100) */
  overallProgress: number;
  
  /** Number of courses completed in the class */
  coursesCompleted: number;
  
  /** Total number of courses in the class */
  totalCourses: number;
  
  /** Final grade/score if completed */
  finalGrade?: number;
  
  /** Completion date */
  completedAt?: Date;
  
  /** Withdrawal date */
  withdrawnAt?: Date;
  
  /** Reason for withdrawal */
  withdrawalReason?: string;
  
  /** User who enrolled the learner */
  enrolledBy?: Types.ObjectId;
  
  /** Additional notes */
  notes?: string;
  
  /** Is this enrollment active? */
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ClassEnrollment schema
 */
const ClassEnrollmentSchema = new Schema<IClassEnrollment>({
  classId: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class ID is required']
  },
  learnerId: {
    type: Schema.Types.ObjectId,
    ref: 'Learner',
    required: [true, 'Learner ID is required']
  },
  departmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department ID is required']
  },
  status: {
    type: String,
    enum: {
      values: CLASS_ENROLLMENT_STATUSES,
      message: '{VALUE} is not a valid enrollment status'
    },
    default: 'pending'
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  periodStartDate: Date,
  periodEndDate: Date,
  overallProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  coursesCompleted: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCourses: {
    type: Number,
    default: 0,
    min: 0
  },
  finalGrade: {
    type: Number,
    min: 0,
    max: 100
  },
  completedAt: Date,
  withdrawnAt: Date,
  withdrawalReason: String,
  enrolledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Compound unique index - one enrollment per learner per class
ClassEnrollmentSchema.index({ classId: 1, learnerId: 1 }, { unique: true });

// Query indexes
ClassEnrollmentSchema.index({ learnerId: 1, status: 1 });
ClassEnrollmentSchema.index({ classId: 1, status: 1 });
ClassEnrollmentSchema.index({ departmentId: 1, status: 1 });
ClassEnrollmentSchema.index({ periodStartDate: 1, periodEndDate: 1 });

/**
 * Virtual: Calculate progress percentage
 */
ClassEnrollmentSchema.virtual('progressPercentage').get(function() {
  if (this.totalCourses === 0) return 0;
  return Math.round((this.coursesCompleted / this.totalCourses) * 100);
});

/**
 * Virtual: Is class period active?
 */
ClassEnrollmentSchema.virtual('isPeriodActive').get(function() {
  if (!this.periodStartDate || !this.periodEndDate) return false;
  const now = new Date();
  return now >= this.periodStartDate && now <= this.periodEndDate;
});

/**
 * Virtual: Days remaining in class
 */
ClassEnrollmentSchema.virtual('daysRemaining').get(function() {
  if (!this.periodEndDate) return null;
  const now = new Date();
  const diff = this.periodEndDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

/**
 * Pre-save: Update status based on progress
 */
ClassEnrollmentSchema.pre('save', function(next) {
  // Auto-complete if all courses completed
  if (
    this.isModified('coursesCompleted') &&
    this.coursesCompleted > 0 &&
    this.coursesCompleted >= this.totalCourses &&
    this.status === 'active'
  ) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.overallProgress = 100;
  }
  
  next();
});

/**
 * Static: Find by learner
 */
ClassEnrollmentSchema.statics.findByLearner = function(
  learnerId: Types.ObjectId,
  status?: ClassEnrollmentStatus
) {
  const query: Record<string, any> = { learnerId, isActive: true };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('classId')
    .populate('departmentId', 'name')
    .sort({ enrolledAt: -1 });
};

/**
 * Static: Find by class
 */
ClassEnrollmentSchema.statics.findByClass = function(
  classId: Types.ObjectId,
  status?: ClassEnrollmentStatus
) {
  const query: Record<string, any> = { classId, isActive: true };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('learnerId')
    .sort({ enrolledAt: 1 });
};

/**
 * Static: Find active classes for department
 */
ClassEnrollmentSchema.statics.findActiveByDepartment = function(
  departmentId: Types.ObjectId
) {
  const now = new Date();
  
  return this.find({
    departmentId,
    isActive: true,
    status: 'active',
    periodStartDate: { $lte: now },
    periodEndDate: { $gte: now }
  })
    .populate('classId')
    .populate('learnerId');
};

/**
 * Static: Get enrollment count by class
 */
ClassEnrollmentSchema.statics.getEnrollmentCount = async function(
  classId: Types.ObjectId
): Promise<number> {
  return this.countDocuments({ classId, isActive: true, status: { $in: ['pending', 'active'] } });
};

/**
 * Static: Withdraw learner from class
 */
ClassEnrollmentSchema.statics.withdraw = async function(
  classId: Types.ObjectId,
  learnerId: Types.ObjectId,
  reason?: string
) {
  return this.findOneAndUpdate(
    { classId, learnerId },
    {
      status: 'withdrawn',
      withdrawnAt: new Date(),
      withdrawalReason: reason
    },
    { new: true }
  );
};

export const ClassEnrollment = model<IClassEnrollment>(
  'ClassEnrollment',
  ClassEnrollmentSchema
);

export default ClassEnrollment;
