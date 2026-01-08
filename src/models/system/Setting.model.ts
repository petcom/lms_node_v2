import mongoose, { Document, Schema } from 'mongoose';

export interface ISetting extends Document {
  key: string;
  value: any;
  category: 'system' | 'email' | 'security' | 'features' | 'appearance' | 'limits';
  dataType: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'json';
  description?: string;
  isPublic: boolean;
  isEditable: boolean;
  defaultValue?: any;
  validationRules?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
  lastModifiedBy?: mongoose.Types.ObjectId;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const settingSchema = new Schema<ISetting>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      maxlength: 200,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['system', 'email', 'security', 'features', 'appearance', 'limits'],
      index: true,
    },
    dataType: {
      type: String,
      required: true,
      enum: ['string', 'number', 'boolean', 'object', 'array', 'json'],
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
    defaultValue: {
      type: Schema.Types.Mixed,
    },
    validationRules: {
      min: Number,
      max: Number,
      pattern: String,
      enum: [Schema.Types.Mixed],
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

const Setting = mongoose.model<ISetting>('Setting', settingSchema);

export default Setting;
