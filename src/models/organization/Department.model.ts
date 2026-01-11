import mongoose, { Schema, Document, Model } from 'mongoose';
import { MASTER_DEPARTMENT_ID } from '../auth/role-constants';

export interface IDepartment extends Document {
  name: string;
  code: string;
  description?: string;
  parentDepartmentId?: mongoose.Types.ObjectId;
  level: number;
  path: mongoose.Types.ObjectId[];
  isActive: boolean;
  isSystem: boolean;
  isVisible: boolean;
  requireExplicitMembership: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDepartmentModel extends Model<IDepartment> {
  getMasterDepartment(): Promise<IDepartment | null>;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
      maxlength: [100, 'Department name cannot exceed 100 characters']
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, 'Department code cannot exceed 20 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    parentDepartmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      default: undefined
    },
    level: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Level cannot be negative']
    },
    path: {
      type: [Schema.Types.ObjectId],
      required: true,
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isSystem: {
      type: Boolean,
      default: false
    },
    isVisible: {
      type: Boolean,
      default: true
    },
    requireExplicitMembership: {
      type: Boolean,
      default: false
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient querying
departmentSchema.index({ parentDepartmentId: 1 });
departmentSchema.index({ isActive: 1 });
departmentSchema.index({ path: 1 });

// Pre-save hook to calculate level and path
departmentSchema.pre('save', async function (next) {
  // Only calculate on new documents or when parentDepartmentId changes
  if (this.isNew || this.isModified('parentDepartmentId')) {
    if (!this.parentDepartmentId) {
      // Root department
      this.level = 0;
      this.path = [this._id];
    } else {
      // Child department - find parent
      const parent = await mongoose.model<IDepartment>('Department').findById(this.parentDepartmentId);

      if (!parent) {
        throw new Error('Parent department not found');
      }

      this.level = parent.level + 1;
      this.path = [...parent.path, this._id];
    }
  }

  next();
});

// Pre-delete hook to prevent deletion of system departments
departmentSchema.pre('deleteOne', { document: true, query: false }, function (next) {
  if (this.isSystem) {
    return next(new Error('Cannot delete system department'));
  }
  next();
});

departmentSchema.pre('findOneAndDelete', async function (next) {
  const doc = await this.model.findOne(this.getFilter());
  if (doc && doc.isSystem) {
    return next(new Error('Cannot delete system department'));
  }
  next();
});

departmentSchema.pre('remove', function (next) {
  if (this.isSystem) {
    return next(new Error('Cannot delete system department'));
  }
  next();
});

// Static method to get the master department
departmentSchema.statics.getMasterDepartment = async function () {
  return this.findById(MASTER_DEPARTMENT_ID);
};

const Department = mongoose.model<IDepartment, IDepartmentModel>('Department', departmentSchema);

export default Department;
