import mongoose, { Schema, Document } from 'mongoose';

interface IAttendanceRecord {
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

export interface IClassEnrollment extends Document {
  learnerId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  status: 'enrolled' | 'active' | 'dropped' | 'withdrawn' | 'completed' | 'failed';
  enrollmentDate: Date;
  dropDate?: Date;
  dropReason?: string;
  completionDate?: Date;
  gradeLetter?: string;
  gradePercentage?: number;
  gradePoints?: number;
  creditsEarned?: number;
  participationScore?: number;
  attendanceRecords?: IAttendanceRecord[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceRecordSchema = new Schema<IAttendanceRecord>(
  {
    date: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['present', 'absent', 'late', 'excused'],
        message: '{VALUE} is not a valid attendance status'
      }
    },
    notes: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const ClassEnrollmentSchema = new Schema<IClassEnrollment>(
  {
    learnerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'learnerId is required'],
      ref: 'User',
      index: true
    },
    classId: {
      type: Schema.Types.ObjectId,
      required: [true, 'classId is required'],
      ref: 'Class',
      index: true
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: ['enrolled', 'active', 'dropped', 'withdrawn', 'completed', 'failed'],
        message: '{VALUE} is not a valid class enrollment status'
      },
      index: true
    },
    enrollmentDate: {
      type: Date,
      required: [true, 'enrollmentDate is required']
    },
    dropDate: {
      type: Date
    },
    dropReason: {
      type: String,
      trim: true
    },
    completionDate: {
      type: Date
    },
    gradeLetter: {
      type: String,
      trim: true,
      uppercase: true
    },
    gradePercentage: {
      type: Number,
      min: [0, 'gradePercentage must be at least 0'],
      max: [100, 'gradePercentage cannot exceed 100']
    },
    gradePoints: {
      type: Number,
      min: [0, 'gradePoints must be at least 0'],
      max: [4, 'gradePoints cannot exceed 4']
    },
    creditsEarned: {
      type: Number,
      min: [0, 'creditsEarned cannot be negative']
    },
    participationScore: {
      type: Number,
      min: [0, 'participationScore must be at least 0'],
      max: [100, 'participationScore cannot exceed 100']
    },
    attendanceRecords: [AttendanceRecordSchema],
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index to prevent duplicate class enrollments
ClassEnrollmentSchema.index(
  { learnerId: 1, classId: 1 },
  { unique: true }
);

// Additional indexes for common queries
ClassEnrollmentSchema.index({ learnerId: 1, status: 1 });
ClassEnrollmentSchema.index({ classId: 1, status: 1 });

export default mongoose.model<IClassEnrollment>('ClassEnrollment', ClassEnrollmentSchema);
