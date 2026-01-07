import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartmentMembership {
  departmentId: mongoose.Types.ObjectId;
  roles: string[];
  isPrimary: boolean;
}

export interface IStaff extends Document {
  _id: mongoose.Types.ObjectId; // Shared with User
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  title?: string;
  departmentMemberships: IDepartmentMembership[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const departmentMembershipSchema = new Schema<IDepartmentMembership>(
  {
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true
    },
    roles: {
      type: [String],
      required: true,
      enum: ['instructor', 'content-admin', 'department-admin', 'billing-admin']
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const staffSchema = new Schema<IStaff>(
  {
    _id: {
      type: Schema.Types.ObjectId,
      required: true
    },
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    title: {
      type: String,
      trim: true
    },
    departmentMemberships: {
      type: [departmentMembershipSchema],
      default: []
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

// Indexes
staffSchema.index({ _id: 1 });
staffSchema.index({ 'departmentMemberships.departmentId': 1 });
staffSchema.index({ isActive: 1 });

export const Staff = mongoose.model<IStaff>('Staff', staffSchema);
