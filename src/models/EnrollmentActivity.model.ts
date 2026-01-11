/**
 * EnrollmentActivity Model
 * 
 * Tracks all status changes and activities for course enrollments.
 * Provides a complete audit trail for enrollment lifecycle events.
 * 
 * Answers the question: "How are point in time changes to course enrollment tracked?"
 * 
 * @module models/EnrollmentActivity
 */

import { Schema, model, Document, Types } from 'mongoose';

// Activity types
export const ENROLLMENT_ACTIVITY_TYPES = [
  'enrolled',
  'status_changed',
  'progress_updated',
  'grade_assigned',
  'grade_changed',
  'completed',
  'withdrawn',
  'reinstated',
  'expired'
] as const;

export type EnrollmentActivityType = typeof ENROLLMENT_ACTIVITY_TYPES[number];

// Enrollment statuses
export const ENROLLMENT_STATUSES = [
  'pending',
  'active',
  'completed',
  'withdrawn',
  'failed',
  'expired'
] as const;

export type EnrollmentStatus = typeof ENROLLMENT_STATUSES[number];

/**
 * EnrollmentActivity document interface
 */
export interface IEnrollmentActivity extends Document {
  _id: Types.ObjectId;
  
  /** Reference to the enrollment */
  enrollmentId: Types.ObjectId;
  
  /** Learner who owns the enrollment */
  learnerId: Types.ObjectId;
  
  /** Course being enrolled in */
  courseId: Types.ObjectId;
  
  /** Class (if applicable) */
  classId?: Types.ObjectId;
  
  /** Type of activity */
  activityType: EnrollmentActivityType;
  
  /** Previous status (for status changes) */
  previousStatus?: EnrollmentStatus;
  
  /** New status (for status changes) */
  newStatus?: EnrollmentStatus;
  
  /** Progress at time of activity */
  progressSnapshot?: number;
  
  /** Grade at time of activity */
  gradeSnapshot?: number;
  
  /** User who triggered the activity (null for system) */
  triggeredBy?: Types.ObjectId;
  
  /** IP address of trigger (for audit) */
  ipAddress?: string;
  
  /** User agent (for audit) */
  userAgent?: string;
  
  /** Additional context */
  metadata?: Record<string, any>;
  
  /** Human-readable description */
  description?: string;
  
  createdAt: Date;
}

/**
 * EnrollmentActivity schema
 */
const EnrollmentActivitySchema = new Schema<IEnrollmentActivity>({
  enrollmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: [true, 'Enrollment ID is required'],
    index: true
  },
  learnerId: {
    type: Schema.Types.ObjectId,
    ref: 'Learner',
    required: [true, 'Learner ID is required'],
    index: true
  },
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course ID is required'],
    index: true
  },
  classId: {
    type: Schema.Types.ObjectId,
    ref: 'Class'
  },
  activityType: {
    type: String,
    required: [true, 'Activity type is required'],
    enum: {
      values: ENROLLMENT_ACTIVITY_TYPES,
      message: '{VALUE} is not a valid activity type'
    },
    index: true
  },
  previousStatus: {
    type: String,
    enum: {
      values: [...ENROLLMENT_STATUSES, null],
      message: '{VALUE} is not a valid status'
    }
  },
  newStatus: {
    type: String,
    enum: {
      values: [...ENROLLMENT_STATUSES, null],
      message: '{VALUE} is not a valid status'
    }
  },
  progressSnapshot: {
    type: Number,
    min: 0,
    max: 100
  },
  gradeSnapshot: {
    type: Number,
    min: 0,
    max: 100
  },
  triggeredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  ipAddress: String,
  userAgent: String,
  metadata: {
    type: Schema.Types.Mixed
  },
  description: String
}, {
  timestamps: {
    createdAt: true,
    updatedAt: false // Activities are immutable
  }
});

// Compound indexes for efficient queries
EnrollmentActivitySchema.index({ enrollmentId: 1, createdAt: -1 });
EnrollmentActivitySchema.index({ learnerId: 1, createdAt: -1 });
EnrollmentActivitySchema.index({ courseId: 1, activityType: 1, createdAt: -1 });

/**
 * Static: Log an enrollment activity
 */
EnrollmentActivitySchema.statics.log = async function(
  data: Partial<IEnrollmentActivity>
): Promise<IEnrollmentActivity> {
  return this.create(data);
};

/**
 * Static: Get activity history for an enrollment
 */
EnrollmentActivitySchema.statics.getHistory = function(
  enrollmentId: Types.ObjectId,
  options: { limit?: number; activityTypes?: EnrollmentActivityType[] } = {}
) {
  const query: Record<string, any> = { enrollmentId };
  
  if (options.activityTypes?.length) {
    query.activityType = { $in: options.activityTypes };
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .populate('triggeredBy', 'email');
};

/**
 * Static: Get latest activity for enrollment
 */
EnrollmentActivitySchema.statics.getLatest = function(enrollmentId: Types.ObjectId) {
  return this.findOne({ enrollmentId })
    .sort({ createdAt: -1 })
    .populate('triggeredBy', 'email');
};

/**
 * Static: Get activities by learner
 */
EnrollmentActivitySchema.statics.getByLearner = function(
  learnerId: Types.ObjectId,
  options: { limit?: number; startDate?: Date; endDate?: Date } = {}
) {
  const query: Record<string, any> = { learnerId };
  
  if (options.startDate || options.endDate) {
    query.createdAt = {};
    if (options.startDate) query.createdAt.$gte = options.startDate;
    if (options.endDate) query.createdAt.$lte = options.endDate;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .populate('courseId', 'title')
    .populate('triggeredBy', 'email');
};

/**
 * Static: Get status change history
 */
EnrollmentActivitySchema.statics.getStatusChanges = function(enrollmentId: Types.ObjectId) {
  return this.find({
    enrollmentId,
    activityType: 'status_changed'
  })
    .sort({ createdAt: 1 })
    .populate('triggeredBy', 'email');
};

export const EnrollmentActivity = model<IEnrollmentActivity>(
  'EnrollmentActivity',
  EnrollmentActivitySchema
);

export default EnrollmentActivity;
