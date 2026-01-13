import mongoose, { Schema, Document } from 'mongoose';

// Type definitions for userTypes
// TODO: Import from role-constants.ts once Task 1.4 is complete
export type UserType = 'learner' | 'staff' | 'global-admin';
export type DashboardType = 'learner' | 'staff';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  userTypes: UserType[];
  defaultDashboard: DashboardType;
  lastSelectedDepartment?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  hasUserType(type: UserType): boolean;
  canEscalateToAdmin(): boolean;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      select: false // Don't include password in queries by default
    },
    userTypes: {
      type: [String],
      enum: ['learner', 'staff', 'global-admin'],
      default: ['learner'],
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: 'User must have at least one userType'
      }
    },
    defaultDashboard: {
      type: String,
      enum: ['learner', 'staff'],
      default: 'learner'
    },
    lastSelectedDepartment: {
      type: Schema.Types.ObjectId,
      ref: 'Department'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook: Calculate defaultDashboard from userTypes
userSchema.pre('save', function(next) {
  if (this.isModified('userTypes') || this.isNew) {
    const hasOnlyLearner = this.userTypes.length === 1 && this.userTypes[0] === 'learner';
    this.defaultDashboard = hasOnlyLearner ? 'learner' : 'staff';
  }
  next();
});

// Method: Check if user has a specific userType
userSchema.methods.hasUserType = function(type: UserType): boolean {
  return this.userTypes.includes(type);
};

// Method: Check if user can escalate to admin dashboard
userSchema.methods.canEscalateToAdmin = function(): boolean {
  return this.userTypes.includes('global-admin');
};

// Indexes (email index created by unique: true)
userSchema.index({ userTypes: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ lastSelectedDepartment: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
