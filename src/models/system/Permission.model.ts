import mongoose, { Document, Schema } from 'mongoose';

export interface IPermission extends Document {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
  name: string;
  description?: string;
  scope?: 'own' | 'department' | 'all';
  conditions?: any;
  group?: string;
  isSystemPermission: boolean;
  isActive: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const permissionSchema = new Schema<IPermission>(
  {
    resource: {
      type: String,
      required: true,
      maxlength: 100,
    },
    action: {
      type: String,
      required: true,
      enum: ['create', 'read', 'update', 'delete', 'manage'],
    },
    name: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    scope: {
      type: String,
      enum: ['own', 'department', 'all'],
    },
    conditions: {
      type: Schema.Types.Mixed,
    },
    group: {
      type: String,
      maxlength: 100,
      index: true,
    },
    isSystemPermission: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index for resource-action-scope combination
permissionSchema.index({ resource: 1, action: 1, scope: 1 }, { unique: true });

const Permission = mongoose.model<IPermission>('Permission', permissionSchema);

export default Permission;
