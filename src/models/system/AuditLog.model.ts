import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  action: 'create' | 'update' | 'delete' | 'login' | 'logout';
  entityType: string;
  entityId: mongoose.Types.ObjectId;
  performedBy?: mongoose.Types.ObjectId;
  changes: {
    before?: any;
    after?: any;
    [key: string]: any;
  };
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  path?: string;
  metadata: {
    source?: string;
    reason?: string;
    error?: string;
    [key: string]: any;
  };
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      enum: ['create', 'update', 'delete', 'login', 'logout'],
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    changes: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    method: {
      type: String,
      uppercase: true,
    },
    path: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for efficient audit log queries
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
