/**
 * LookupValue Model
 *
 * Centralized database storage for all enumerated constants.
 * Replaces hardcoded constants with database-driven values.
 *
 * Key concepts:
 * - `lookupId`: Unique identifier in format "category.key" (e.g., "userType.staff")
 * - `parentLookupId`: References parent's lookupId for hierarchy
 * - `category`: Groups related lookups ("userType", "role")
 * - `key`: The actual value stored in documents (e.g., "staff", "instructor")
 * - `displayAs`: Human-readable label for UI (e.g., "Staff", "Instructor")
 *
 * Hierarchy example:
 * - userType.staff (root, parentLookupId: null)
 *     └── role.instructor (parentLookupId: 'userType.staff')
 *     └── role.department-admin (parentLookupId: 'userType.staff')
 *
 * Reference: contracts/api/lookup-values.contract.ts
 *
 * @module models/LookupValue
 */

import { Schema, model, Document, Types } from 'mongoose';

/**
 * LookupValue document interface
 */
export interface ILookupValue extends Document {
  _id: Types.ObjectId;

  /** Unique identifier in format "category.key" (e.g., "userType.staff") */
  lookupId: string;

  /** Category grouping for the lookup (e.g., "userType", "role") */
  category: string;

  /** The actual value stored in documents (e.g., "staff", "instructor") */
  key: string;

  /** Parent lookup reference for hierarchy (null for root-level) */
  parentLookupId: string | null;

  /** Human-readable display label for UI (e.g., "Staff", "Instructor") */
  displayAs: string;

  /** Optional description */
  description?: string;

  /** Order for UI display */
  sortOrder: number;

  /** Whether this lookup is active */
  isActive: boolean;

  /** Optional metadata */
  metadata?: {
    /** Is this the default value for its category? */
    isDefault?: boolean;
    /** Icon identifier for UI */
    icon?: string;
    /** Color for UI badges */
    color?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

/**
 * LookupValue schema
 */
const LookupValueSchema = new Schema<ILookupValue>({
  lookupId: {
    type: String,
    required: false, // Will be auto-generated in pre-save hook
    unique: true,
    trim: true,
    match: [
      /^[a-z0-9-]+\.[a-z0-9-]+$/,
      'lookupId must be in format "category.key" (lowercase with hyphens)'
    ]
  },
  category: {
    type: String,
    required: [true, 'category is required'],
    trim: true,
    lowercase: true
  },
  key: {
    type: String,
    required: [true, 'key is required'],
    trim: true,
    lowercase: true
  },
  parentLookupId: {
    type: String,
    default: null,
    trim: true
  },
  displayAs: {
    type: String,
    required: [true, 'displayAs is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  sortOrder: {
    type: Number,
    required: true,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    isDefault: { type: Boolean, default: false },
    icon: { type: String },
    color: { type: String }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(_doc, ret) {
      // Remove __v
      delete ret.__v;
      return ret;
    }
  }
});

// ============================================================================
// Indexes
// ============================================================================

/** Primary lookup by unique lookupId */
LookupValueSchema.index({ lookupId: 1 }, { unique: true });

/** Find children by parent and active status */
LookupValueSchema.index({ parentLookupId: 1, isActive: 1 });

/** Find all lookups by category and active status */
LookupValueSchema.index({ category: 1, isActive: 1 });

/** Find by key and parent (for role validation) */
LookupValueSchema.index({ key: 1, parentLookupId: 1 });

/** Sort by sortOrder for UI display */
LookupValueSchema.index({ sortOrder: 1 });

// ============================================================================
// Static Methods
// ============================================================================

/**
 * Find all lookups by category
 */
LookupValueSchema.statics.findByCategory = function(
  category: string,
  activeOnly: boolean = true
) {
  const query: any = { category };
  if (activeOnly) {
    query.isActive = true;
  }
  return this.find(query).sort({ sortOrder: 1 });
};

/**
 * Find children by parent lookupId
 */
LookupValueSchema.statics.findByParent = function(
  parentLookupId: string,
  activeOnly: boolean = true
) {
  const query: any = { parentLookupId };
  if (activeOnly) {
    query.isActive = true;
  }
  return this.find(query).sort({ sortOrder: 1 });
};

/**
 * Find by lookupId (convenience method)
 */
LookupValueSchema.statics.findByLookupId = function(lookupId: string) {
  return this.findOne({ lookupId });
};

/**
 * Get all root lookups (no parent)
 */
LookupValueSchema.statics.findRootLookups = function(
  category?: string,
  activeOnly: boolean = true
) {
  const query: any = { parentLookupId: null };
  if (category) {
    query.category = category;
  }
  if (activeOnly) {
    query.isActive = true;
  }
  return this.find(query).sort({ sortOrder: 1 });
};

/**
 * Validate that a key exists for a parent
 */
LookupValueSchema.statics.isValidKeyForParent = async function(
  key: string,
  parentLookupId: string
): Promise<boolean> {
  const lookup = await this.findOne({
    key,
    parentLookupId,
    isActive: true
  });
  return !!lookup;
};

// ============================================================================
// Instance Methods
// ============================================================================

/**
 * Get all children of this lookup
 */
LookupValueSchema.methods.getChildren = function(activeOnly: boolean = true) {
  return (this.constructor as any).findByParent(this.lookupId, activeOnly);
};

/**
 * Get parent lookup
 */
LookupValueSchema.methods.getParent = function() {
  if (!this.parentLookupId) {
    return null;
  }
  return (this.constructor as any).findByLookupId(this.parentLookupId);
};

/**
 * Check if this is a root lookup (no parent)
 */
LookupValueSchema.methods.isRoot = function(): boolean {
  return this.parentLookupId === null;
};

// ============================================================================
// Validation
// ============================================================================

/**
 * Pre-save hook: Auto-generate and validate lookupId
 */
LookupValueSchema.pre('save', function(next) {
  // Auto-generate lookupId from category and key if not provided
  // Note: category and key are already lowercased by schema
  if (!this.lookupId) {
    this.lookupId = `${this.category}.${this.key}`;
  }

  // Validate lookupId matches category.key
  const expectedLookupId = `${this.category}.${this.key}`;
  if (this.lookupId !== expectedLookupId) {
    return next(new Error(`lookupId must match pattern: ${expectedLookupId}`));
  }

  next();
});

/**
 * Pre-save hook: Validate parentLookupId exists if provided
 */
LookupValueSchema.pre('save', async function(next) {
  if (!this.parentLookupId) {
    return next();
  }

  // Check if parent exists
  const parent = await (this.constructor as any).findByLookupId(this.parentLookupId);
  if (!parent) {
    return next(new Error(`Parent lookup '${this.parentLookupId}' does not exist`));
  }

  next();
});

// ============================================================================
// Model Export
// ============================================================================

export const LookupValue = model<ILookupValue>('LookupValue', LookupValueSchema);

export default LookupValue;
