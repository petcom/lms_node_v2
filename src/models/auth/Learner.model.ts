import mongoose, { Schema, Document } from 'mongoose';

export interface ILearner extends Document {
  _id: mongoose.Types.ObjectId; // Shared with User
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  phoneNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phoneNumber?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const learnerSchema = new Schema<ILearner>(
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
    dateOfBirth: {
      type: Date
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phoneNumber: String
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
learnerSchema.index({ _id: 1 });
learnerSchema.index({ isActive: 1 });

export const Learner = mongoose.model<ILearner>('Learner', learnerSchema);
