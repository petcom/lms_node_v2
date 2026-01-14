/**
 * AccessRight Model
 * 
 * GNAP-compatible access rights store.
 * These are the granular permissions that roles grant.
 * 
 * Access rights follow the pattern: {domain}:{resource}:{action}
 * 
 * Domains:
 * - content: Courses, programs, lessons, SCORM
 * - enrollment: Enrollments, class enrollments
 * - staff: Staff management
 * - learner: Learner management
 * - reports: Analytics and reporting
 * - system: System settings and configuration
 * - billing: Financial operations
 * - audit: Audit logs
 * 
 * @module models/AccessRight
 */

import { Schema, model, Document, Types } from 'mongoose';

// Domains
export const ACCESS_RIGHT_DOMAINS = [
  'content',
  'enrollment',
  'staff',
  'learner',
  'reports',
  'system',
  'settings',
  'billing',
  'audit',
  'grades',
  'department',
  'academic'
] as const;

export type AccessRightDomain = typeof ACCESS_RIGHT_DOMAINS[number];

// Sensitive categories
export const SENSITIVE_CATEGORIES = ['ferpa', 'billing', 'pii', 'audit'] as const;
export type SensitiveCategory = typeof SENSITIVE_CATEGORIES[number];

/**
 * AccessRight document interface
 */
export interface IAccessRight extends Document {
  _id: Types.ObjectId;
  
  /** Access right identifier (e.g., 'content:courses:read') */
  name: string;
  
  /** Domain grouping */
  domain: AccessRightDomain;
  
  /** Resource within domain */
  resource: string;
  
  /** Action on resource */
  action: string;
  
  /** Human-readable description */
  description: string;
  
  /** Is this a sensitive right? */
  isSensitive: boolean;
  
  /** Category for sensitive rights */
  sensitiveCategory?: SensitiveCategory;
  
  /** Is this right active? */
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AccessRight schema
 */
const AccessRightSchema = new Schema<IAccessRight>({
  name: {
    type: String,
    required: [true, 'Access right name is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        // Must follow pattern: domain:resource:action or domain:*
        return /^[a-z]+:[a-z-]+:[a-z-]+$|^[a-z]+:\*$/.test(v);
      },
      message: 'Access right must follow pattern: domain:resource:action'
    }
  },
  domain: {
    type: String,
    required: [true, 'Domain is required'],
    enum: {
      values: ACCESS_RIGHT_DOMAINS,
      message: '{VALUE} is not a valid domain'
    }
  },
  resource: {
    type: String,
    required: [true, 'Resource is required'],
    lowercase: true,
    trim: true
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  isSensitive: {
    type: Boolean,
    default: false
  },
  sensitiveCategory: {
    type: String,
    enum: {
      values: [...SENSITIVE_CATEGORIES, null],
      message: '{VALUE} is not a valid sensitive category'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Indexes
AccessRightSchema.index({ domain: 1, resource: 1, action: 1 }, { unique: true });
AccessRightSchema.index({ domain: 1, isActive: 1 });
AccessRightSchema.index({ isSensitive: 1 });

/**
 * Pre-save: Auto-populate name from domain:resource:action
 */
AccessRightSchema.pre('save', function(next) {
  if (!this.name) {
    this.name = `${this.domain}:${this.resource}:${this.action}`;
  }
  next();
});

/**
 * Static: Find by domain
 */
AccessRightSchema.statics.findByDomain = function(domain: AccessRightDomain) {
  return this.find({ domain, isActive: true });
};

/**
 * Static: Find sensitive rights
 */
AccessRightSchema.statics.findSensitive = function(category?: SensitiveCategory) {
  const query: Record<string, any> = { isSensitive: true, isActive: true };
  if (category) {
    query.sensitiveCategory = category;
  }
  return this.find(query);
};

/**
 * Static: Check if right exists
 */
AccessRightSchema.statics.exists = async function(name: string): Promise<boolean> {
  const right = await this.findOne({ name: name.toLowerCase(), isActive: true });
  return !!right;
};

/**
 * Static: Check if right matches pattern (supports wildcards)
 */
const matchesRight = function(
  userRight: string,
  requiredRight: string
): boolean {
  // Exact match
  if (userRight === requiredRight) return true;
  
  // Wildcard match: content:* matches content:courses:read
  if (userRight.endsWith(':*')) {
    const domain = userRight.replace(':*', '');
    return requiredRight.startsWith(`${domain}:`);
  }
  
  // system:* matches everything
  if (userRight === 'system:*') return true;
  
  return false;
};

/**
 * Static: Check if user has required right (with wildcard support)
 */
AccessRightSchema.statics.hasRight = function(
  userRights: string[],
  requiredRight: string
): boolean {
  return userRights.some(right => matchesRight(right, requiredRight));
};

export const AccessRight = model<IAccessRight>('AccessRight', AccessRightSchema);

export default AccessRight;
