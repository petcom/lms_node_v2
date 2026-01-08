import mongoose, { Document, Schema } from 'mongoose';

export interface IRolePermission extends Document {
  role: 'admin' | 'instructor' | 'learner' | 'staff' | 'guest';
  permissionId: mongoose.Types.ObjectId;
  isGranted: boolean;
  scopeOverride?: 'own' | 'department' | 'all';
  conditionsOverride?: any;
  departmentId?: mongoose.Types.ObjectId;
  expiresAt?: Date;
  grantedBy?: mongoose.Types.ObjectId;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const rolePermissionSchema = new Schema<IRolePermission>(
  {
    role: {
      type: String,
      required: true,
      enum: ['admin', 'instructor', 'learner', 'staff', 'guest'],
    },
    permissionId: {
      type: Schema.Types.ObjectId,
      ref: 'Permission',
      required: true,
    },
    isGranted: {
      type: Boolean,
      default: true,
    },
    scopeOverride: {
      type: String,
      enum: ['own', 'department', 'all'],
    },
    conditionsOverride: {
      type: Schema.Types.Mixed,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    grantedBy: {
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

// Unique compound index for role-permission-department combination
rolePermissionSchema.index(
  { role: 1, permissionId: 1, departmentId: 1 },
  { unique: true }
);

const RolePermission = mongoose.model<IRolePermission>(
  'RolePermission',
  rolePermissionSchema
);

export default RolePermission;
