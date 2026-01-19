# Implementation Plan: ISS-021 Grade Override & Billing Course View

**Date:** 2026-01-14
**Project:** API-ISS-021 - Grade Override & Billing Course View
**Status:** 🔴 PENDING APPROVAL
**Timeline:** 12-16 hours (parallelized to 6-8 hours)
**Risk Level:** 🟡 Medium (new audit system, permission updates)

---

## Executive Summary

**Objective:** Implement two new role capabilities:
1. Grade Override system with immutable audit logging for dept-admin
2. Course view access for billing-admin

**Strategy:** Parallel implementation using specialized tracks
**Approach:** TDD (Test-Driven Development) with audit-first strategy

---

## Parallel Implementation Teams

### Team Structure (4 Parallel Tracks)

```
Track 1: GRADE OVERRIDE FOUNDATION
├── Agent: Backend Implementation
├── Duration: 6 hours
├── Dependencies: None
└── Deliverables:
    ├── GradeChangeLog.model.ts (audit model)
    ├── grade-override.service.ts (business logic)
    ├── grade-override.controller.ts (HTTP handlers)
    ├── grade-override.routes.ts (routes)
    └── grade-override.validator.ts (validation)

Track 2: GRADE OVERRIDE TESTING
├── Agent: Test Engineer
├── Duration: 4 hours
├── Dependencies: Track 1 (service skeleton)
└── Deliverables:
    ├── Unit tests (service layer)
    ├── Integration tests (API endpoints)
    └── Test coverage report

Track 3: BILLING PERMISSION UPDATE
├── Agent: Permission Specialist
├── Duration: 2 hours
├── Dependencies: None (independent)
└── Deliverables:
    ├── Updated permissions.service.ts
    ├── Updated courses.routes.ts (if needed)
    ├── Permission tests
    └── Migration script (if needed)

Track 4: DOCUMENTATION & CONTRACTS
├── Agent: Documentation Specialist
├── Duration: 3 hours
├── Dependencies: Track 1 (models/services defined)
└── Deliverables:
    ├── grade-override.contract.ts (NEW)
    ├── Updated courses.contract.ts
    ├── API integration guide
    └── Completion message for UI team
```

### Critical Path Analysis

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: FOUNDATION (Parallel) - Hours 0-3                  │
├─────────────────────────────────────────────────────────────┤
│ Track 1: Audit Model & Service   [████████████] 3h          │
│ Track 3: Permission Update        [████████────] 2h          │
│ Track 4: Contract Skeleton        [████────────] 1h          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: IMPLEMENTATION (Parallel) - Hours 3-6              │
├─────────────────────────────────────────────────────────────┤
│ Track 1: Controller & Routes      [████████████] 3h          │
│ Track 2: Unit Tests (overlaps)    [████████████] 3h          │
│ Track 4: Complete Contracts       [████████────] 2h          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: TESTING & VALIDATION - Hours 6-8                   │
├─────────────────────────────────────────────────────────────┤
│ Track 2: Integration Tests        [████████────] 2h          │
│ All: Final validation             [████────────] 1h          │
└─────────────────────────────────────────────────────────────┘

Total Elapsed Time: 6-8 hours (parallelized from 14-16 hours)
```

---

## Track 1: Grade Override Foundation

### Task 1.1: Create GradeChangeLog Model

**File:** `src/models/audit/GradeChangeLog.model.ts` (NEW)
**Duration:** 1.5 hours
**Priority:** CRITICAL (blocks all grade override work)

**Interface Definition:**
```typescript
export interface IGradeChangeLog extends Document {
  // Identifiers
  enrollmentId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  learnerId: mongoose.Types.ObjectId;

  // Grade change details
  fieldChanged: 'gradeLetter' | 'gradePercentage' | 'gradePoints' | 'all';
  previousGradeLetter?: string;
  newGradeLetter?: string;
  previousGradePercentage?: number;
  newGradePercentage?: number;
  previousGradePoints?: number;
  newGradePoints?: number;

  // Audit information
  changedBy: mongoose.Types.ObjectId;
  changedByRole: string;
  changedAt: Date;
  reason: string;
  changeType: 'override';

  // Context
  departmentId: mongoose.Types.ObjectId;
  termId?: mongoose.Types.ObjectId;

  // Metadata
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

**Schema Requirements:**
```typescript
const GradeChangeLogSchema = new Schema<IGradeChangeLog>({
  enrollmentId: {
    type: Schema.Types.ObjectId,
    required: [true, 'enrollmentId is required'],
    ref: 'ClassEnrollment',
    index: true,
    immutable: true  // ← CRITICAL: Cannot be changed after creation
  },
  reason: {
    type: String,
    required: [true, 'reason is required'],
    minlength: [10, 'reason must be at least 10 characters'],
    maxlength: [1000, 'reason cannot exceed 1000 characters'],
    trim: true,
    immutable: true  // ← CRITICAL: Cannot be changed
  },
  // ... other fields with immutable: true
}, {
  timestamps: true
});

// IMPORTANT: Prevent updates and deletes
GradeChangeLogSchema.pre('findOneAndUpdate', function(next) {
  next(new Error('GradeChangeLog records are immutable and cannot be updated'));
});

GradeChangeLogSchema.pre('findOneAndDelete', function(next) {
  next(new Error('GradeChangeLog records cannot be deleted'));
});
```

**Indexes:**
```typescript
// Query by enrollment (most common)
GradeChangeLogSchema.index({ enrollmentId: 1, changedAt: -1 });

// Query by learner (audit reports)
GradeChangeLogSchema.index({ learnerId: 1, changedAt: -1 });

// Query by admin (accountability)
GradeChangeLogSchema.index({ changedBy: 1, changedAt: -1 });

// Query by class (class-level reports)
GradeChangeLogSchema.index({ classId: 1, changedAt: -1 });

// Query by department (dept-admin oversight)
GradeChangeLogSchema.index({ departmentId: 1, changedAt: -1 });
```

**Validation Checklist:**
- [ ] TypeScript compiles without errors
- [ ] All required fields are present
- [ ] Reason field has min/max length validation
- [ ] Grade value ranges validated
- [ ] Immutable fields cannot be updated
- [ ] Pre-hooks prevent updates/deletes
- [ ] Indexes are properly defined
- [ ] JSDoc documentation complete

---

### Task 1.2: Create Grade Override Service

**File:** `src/services/grades/grade-override.service.ts` (NEW)
**Duration:** 2.5 hours
**Priority:** CRITICAL
**Dependencies:** Task 1.1 (GradeChangeLog model)

**Class Structure:**
```typescript
import mongoose from 'mongoose';
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import GradeChangeLog from '@/models/audit/GradeChangeLog.model';
import { Staff } from '@/models/auth/Staff.model';
import { hasPermission } from '@/services/auth/permissions.service';
import { ApiError } from '@/utils/ApiError';

interface GradeOverrideInput {
  gradeLetter?: string;
  gradePercentage?: number;
  gradePoints?: number;
  reason: string;
  previousGradeLetter?: string;
  previousGradePercentage?: number;
  previousGradePoints?: number;
}

interface GradeOverrideResult {
  enrollmentId: string;
  gradeChanges: {
    gradeLetter?: { previous?: string; new?: string };
    gradePercentage?: { previous?: number; new?: number };
    gradePoints?: { previous?: number; new?: number };
  };
  overrideBy: string;
  overrideByName: string;
  overrideAt: Date;
  reason: string;
  changeLogId: string;
}

export class GradeOverrideService {
  /**
   * Override grade for an enrollment with mandatory audit logging
   *
   * @param enrollmentId - ClassEnrollment ID
   * @param overrideData - New grade values and reason
   * @param adminUserId - User ID of admin making the change
   * @returns Grade override result with audit log ID
   * @throws ApiError if validation fails or permission denied
   */
  async overrideGrade(
    enrollmentId: string,
    overrideData: GradeOverrideInput,
    adminUserId: string
  ): Promise<GradeOverrideResult>;

  /**
   * Get grade change history for an enrollment
   *
   * @param enrollmentId - ClassEnrollment ID
   * @param filters - Optional date range filters
   * @returns Array of grade change log entries
   */
  async getGradeChangeHistory(
    enrollmentId: string,
    filters?: { startDate?: Date; endDate?: Date }
  ): Promise<IGradeChangeLog[]>;

  /**
   * Get all grade overrides made by a specific admin
   *
   * @param adminUserId - User ID
   * @param filters - Optional filters
   * @returns Array of grade change log entries
   */
  async getAdminGradeOverrides(
    adminUserId: string,
    filters?: { startDate?: Date; endDate?: Date; departmentId?: string }
  ): Promise<IGradeChangeLog[]>;

  /**
   * Verify admin has permission to override grade
   *
   * @param userId - User ID to check
   * @param enrollmentId - Target enrollment
   * @returns Permission check result
   */
  async verifyOverridePermission(
    userId: string,
    enrollmentId: string
  ): Promise<{ allowed: boolean; reason?: string }>;

  /**
   * Validate grade values are in acceptable ranges
   *
   * @param gradeData - Grade values to validate
   * @throws ApiError if validation fails
   */
  private validateGradeValues(gradeData: Partial<GradeOverrideInput>): void;
}
```

**Implementation Details: overrideGrade()**

```typescript
async overrideGrade(
  enrollmentId: string,
  overrideData: GradeOverrideInput,
  adminUserId: string
): Promise<GradeOverrideResult> {
  // 1. Validate input
  if (!overrideData.reason || overrideData.reason.trim().length < 10) {
    throw new ApiError(422, 'Reason is required and must be at least 10 characters');
  }

  if (!overrideData.gradeLetter && !overrideData.gradePercentage && !overrideData.gradePoints) {
    throw new ApiError(422, 'At least one grade field must be provided');
  }

  this.validateGradeValues(overrideData);

  // 2. Load enrollment with populated class → course → department
  const enrollment = await ClassEnrollment.findById(enrollmentId)
    .populate({
      path: 'classId',
      populate: {
        path: 'courseId',
        populate: { path: 'departmentId' }
      }
    })
    .exec();

  if (!enrollment) {
    throw new ApiError(404, 'Enrollment not found');
  }

  const classData = enrollment.classId as any;
  const courseData = classData.courseId as any;
  const departmentId = courseData.departmentId;

  // 3. Verify admin has permission
  const permissionCheck = await this.verifyOverridePermission(adminUserId, enrollmentId);
  if (!permissionCheck.allowed) {
    throw new ApiError(403, permissionCheck.reason || 'Permission denied');
  }

  // 4. Load admin user for audit trail
  const adminUser = await Staff.findById(adminUserId)
    .populate('person')
    .exec();

  if (!adminUser) {
    throw new ApiError(404, 'Admin user not found');
  }

  const adminName = `${adminUser.person?.firstName || ''} ${adminUser.person?.lastName || ''}`.trim();

  // 5. Prepare grade changes
  const gradeChanges: any = {};
  const previousValues: any = {};
  const newValues: any = {};

  if (overrideData.gradeLetter !== undefined) {
    gradeChanges.gradeLetter = {
      previous: enrollment.gradeLetter,
      new: overrideData.gradeLetter
    };
    previousValues.gradeLetter = enrollment.gradeLetter;
    newValues.gradeLetter = overrideData.gradeLetter;
  }

  if (overrideData.gradePercentage !== undefined) {
    gradeChanges.gradePercentage = {
      previous: enrollment.gradePercentage,
      new: overrideData.gradePercentage
    };
    previousValues.gradePercentage = enrollment.gradePercentage;
    newValues.gradePercentage = overrideData.gradePercentage;
  }

  if (overrideData.gradePoints !== undefined) {
    gradeChanges.gradePoints = {
      previous: enrollment.gradePoints,
      new: overrideData.gradePoints
    };
    previousValues.gradePoints = enrollment.gradePoints;
    newValues.gradePoints = overrideData.gradePoints;
  }

  // 6. Create immutable audit log entry
  const changeLog = await GradeChangeLog.create({
    enrollmentId: enrollment._id,
    classId: enrollment.classId,
    courseId: courseData._id,
    learnerId: enrollment.learnerId,
    fieldChanged: Object.keys(gradeChanges).length > 1 ? 'all' : Object.keys(gradeChanges)[0],
    previousGradeLetter: previousValues.gradeLetter,
    newGradeLetter: newValues.gradeLetter,
    previousGradePercentage: previousValues.gradePercentage,
    newGradePercentage: newValues.gradePercentage,
    previousGradePoints: previousValues.gradePoints,
    newGradePoints: newValues.gradePoints,
    changedBy: adminUserId,
    changedByRole: 'dept-admin',
    changedAt: new Date(),
    reason: overrideData.reason.trim(),
    changeType: 'override',
    departmentId: departmentId,
    termId: classData.termId
  });

  // 7. Update enrollment with new grade values
  if (newValues.gradeLetter !== undefined) {
    enrollment.gradeLetter = newValues.gradeLetter;
  }
  if (newValues.gradePercentage !== undefined) {
    enrollment.gradePercentage = newValues.gradePercentage;
  }
  if (newValues.gradePoints !== undefined) {
    enrollment.gradePoints = newValues.gradePoints;
  }

  await enrollment.save();

  // 8. Return result
  return {
    enrollmentId: enrollment._id.toString(),
    gradeChanges,
    overrideBy: adminUserId,
    overrideByName: adminName,
    overrideAt: changeLog.changedAt,
    reason: changeLog.reason,
    changeLogId: changeLog._id.toString()
  };
}
```

**Implementation Details: verifyOverridePermission()**

```typescript
async verifyOverridePermission(
  userId: string,
  enrollmentId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // 1. Load user with roles
  const user = await User.findById(userId).exec();
  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  // 2. Check if user has grades:override permission
  const hasGradeOverride = await hasPermission(userId, 'grades:override');
  if (!hasGradeOverride) {
    return {
      allowed: false,
      reason: 'Missing grades:override permission'
    };
  }

  // 3. Load enrollment with course department
  const enrollment = await ClassEnrollment.findById(enrollmentId)
    .populate({
      path: 'classId',
      populate: {
        path: 'courseId',
        populate: { path: 'departmentId' }
      }
    })
    .exec();

  if (!enrollment) {
    return { allowed: false, reason: 'Enrollment not found' };
  }

  const classData = enrollment.classId as any;
  const courseData = classData.courseId as any;
  const departmentId = courseData.departmentId._id.toString();

  // 4. Load staff record to check dept-admin membership
  const staff = await Staff.findById(userId).exec();
  if (!staff) {
    return {
      allowed: false,
      reason: 'User is not a staff member'
    };
  }

  // 5. Check if user has dept-admin role in the course's department
  const isDeptAdminInDepartment = staff.departmentMemberships?.some(
    (membership: any) =>
      membership.departmentId.toString() === departmentId &&
      membership.roles.includes('dept-admin')
  );

  if (!isDeptAdminInDepartment) {
    return {
      allowed: false,
      reason: 'Must be department admin for this course\'s department'
    };
  }

  // All checks passed
  return { allowed: true };
}
```

**Validation Checklist:**
- [ ] overrideGrade() creates audit log before updating enrollment
- [ ] overrideGrade() validates reason length (10-1000 chars)
- [ ] overrideGrade() validates grade value ranges
- [ ] overrideGrade() checks permission before making changes
- [ ] verifyOverridePermission() checks both permission AND dept-admin role
- [ ] getGradeChangeHistory() returns changes in reverse chronological order
- [ ] All errors throw ApiError with appropriate status codes
- [ ] JSDoc documentation complete for all methods

---

### Task 1.3: Create Grade Override Controller

**File:** `src/controllers/grades/grade-override.controller.ts` (NEW)
**Duration:** 1 hour
**Priority:** HIGH
**Dependencies:** Task 1.2 (GradeOverrideService)

**Controller Methods:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { GradeOverrideService } from '@/services/grades/grade-override.service';
import { ApiError } from '@/utils/ApiError';

const gradeOverrideService = new GradeOverrideService();

export const overrideGrade = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { enrollmentId } = req.params;
    const { gradeLetter, gradePercentage, gradePoints, reason } = req.body;
    const adminUserId = req.user!.userId;

    const result = await gradeOverrideService.overrideGrade(
      enrollmentId,
      { gradeLetter, gradePercentage, gradePoints, reason },
      adminUserId
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getGradeHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { enrollmentId } = req.params;
    const { startDate, endDate } = req.query;

    const history = await gradeOverrideService.getGradeChangeHistory(
      enrollmentId,
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      }
    );

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};
```

**Validation Checklist:**
- [ ] All controller methods use try-catch
- [ ] Errors are passed to next() middleware
- [ ] User ID extracted from req.user (set by authenticate middleware)
- [ ] Query parameters properly parsed and validated
- [ ] Response format matches contract specification

---

### Task 1.4: Create Grade Override Routes

**File:** `src/routes/grade-override.routes.ts` (NEW)
**Duration:** 30 minutes
**Priority:** HIGH
**Dependencies:** Task 1.3 (Controller)

**Route Definition:**
```typescript
import express from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize } from '@/middleware/authorize';
import { overrideGrade, getGradeHistory } from '@/controllers/grades/grade-override.controller';
import { validateGradeOverride } from '@/validators/grade-override.validator';

const router = express.Router();

/**
 * @route   PUT /api/v1/enrollments/:enrollmentId/grades/override
 * @desc    Override grade for an enrollment (dept-admin only)
 * @access  Private - Requires grades:override permission + dept-admin role
 */
router.put(
  '/:enrollmentId/grades/override',
  authenticate,
  authorize(['grades:override']),
  validateGradeOverride,
  overrideGrade
);

/**
 * @route   GET /api/v1/enrollments/:enrollmentId/grades/history
 * @desc    Get grade change history for an enrollment
 * @access  Private - Requires grades:override permission (dept-admin)
 */
router.get(
  '/:enrollmentId/grades/history',
  authenticate,
  authorize(['grades:override']),
  getGradeHistory
);

export default router;
```

**Integration with main app:**
```typescript
// In src/app.ts or src/routes/index.ts
import gradeOverrideRoutes from './routes/grade-override.routes';

// Mount routes
app.use('/api/v1/enrollments', gradeOverrideRoutes);
```

**Validation Checklist:**
- [ ] Routes properly mounted in app
- [ ] Authentication middleware applied to all routes
- [ ] Authorization middleware checks grades:override permission
- [ ] Validation middleware applied to override endpoint
- [ ] Route paths match API contract specification

---

### Task 1.5: Create Grade Override Validator

**File:** `src/validators/grade-override.validator.ts` (NEW)
**Duration:** 30 minutes
**Priority:** MEDIUM
**Dependencies:** None

**Validator Implementation:**
```typescript
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/utils/ApiError';

const gradeOverrideSchema = Joi.object({
  gradeLetter: Joi.string()
    .optional()
    .uppercase()
    .valid('A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F')
    .messages({
      'any.only': 'gradeLetter must be a valid letter grade (A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F)'
    }),

  gradePercentage: Joi.number()
    .optional()
    .min(0)
    .max(100)
    .messages({
      'number.min': 'gradePercentage must be at least 0',
      'number.max': 'gradePercentage cannot exceed 100'
    }),

  gradePoints: Joi.number()
    .optional()
    .min(0)
    .max(4.0)
    .messages({
      'number.min': 'gradePoints must be at least 0',
      'number.max': 'gradePoints cannot exceed 4.0'
    }),

  reason: Joi.string()
    .required()
    .min(10)
    .max(1000)
    .trim()
    .messages({
      'string.empty': 'reason is required',
      'string.min': 'reason must be at least 10 characters',
      'string.max': 'reason cannot exceed 1000 characters',
      'any.required': 'reason is required'
    }),

  // Optional validation fields
  previousGradeLetter: Joi.string().optional(),
  previousGradePercentage: Joi.number().optional(),
  previousGradePoints: Joi.number().optional()
}).custom((value, helpers) => {
  // At least one grade field must be provided
  if (!value.gradeLetter && !value.gradePercentage && !value.gradePoints) {
    return helpers.error('custom.noGradeFields');
  }
  return value;
}).messages({
  'custom.noGradeFields': 'At least one grade field (gradeLetter, gradePercentage, or gradePoints) must be provided'
});

export const validateGradeOverride = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error } = gradeOverrideSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return next(new ApiError(422, errorMessage));
  }

  next();
};
```

**Validation Checklist:**
- [ ] Reason field: required, 10-1000 chars
- [ ] Grade percentage: 0-100 (if provided)
- [ ] Grade points: 0-4.0 (if provided)
- [ ] Grade letter: valid letter grade values (if provided)
- [ ] At least one grade field must be provided
- [ ] Clear error messages for all validation failures

---

## Track 2: Grade Override Testing

### Task 2.1: Unit Tests - Grade Override Service

**File:** `tests/unit/services/grade-override.service.test.ts` (NEW)
**Duration:** 2 hours
**Priority:** HIGH
**Dependencies:** Track 1 Task 1.2 (service exists)

**Test Cases (15 tests):**
```typescript
describe('GradeOverrideService', () => {
  describe('overrideGrade()', () => {
    it('should create audit log entry when overriding grade', async () => {});
    it('should update enrollment with new grade values', async () => {});
    it('should validate reason is at least 10 characters', async () => {});
    it('should validate reason is not empty', async () => {});
    it('should validate grade percentage is 0-100', async () => {});
    it('should validate grade points is 0-4.0', async () => {});
    it('should require at least one grade field', async () => {});
    it('should throw 404 if enrollment not found', async () => {});
    it('should throw 403 if user lacks grades:override permission', async () => {});
    it('should throw 403 if user not dept-admin in department', async () => {});
    it('should handle multiple grade fields being updated', async () => {});
    it('should trim reason string before saving', async () => {});
  });

  describe('verifyOverridePermission()', () => {
    it('should return allowed=true for dept-admin with permission', async () => {});
    it('should return allowed=false if user lacks grades:override', async () => {});
    it('should return allowed=false if user not dept-admin in dept', async () => {});
  });

  describe('getGradeChangeHistory()', () => {
    it('should return all changes for an enrollment', async () => {});
    it('should filter by date range if provided', async () => {});
    it('should return empty array if no changes exist', async () => {});
  });

  describe('getAdminGradeOverrides()', () => {
    it('should return all changes made by an admin', async () => {});
    it('should filter by department if provided', async () => {});
  });
});
```

**Validation Checklist:**
- [ ] All 20 unit tests passing
- [ ] Tests use mocked database (MongoDB Memory Server)
- [ ] Tests verify audit log immutability
- [ ] Tests verify permission checks work correctly
- [ ] Code coverage > 90% for service layer

---

### Task 2.2: Integration Tests - Grade Override API

**File:** `tests/integration/grades/grade-override.test.ts` (NEW)
**Duration:** 2 hours
**Priority:** HIGH
**Dependencies:** Track 1 complete (endpoints exist)

**Test Cases (10 tests):**
```typescript
describe('Grade Override API - PUT /api/v1/enrollments/:id/grades/override', () => {
  describe('Authorization', () => {
    it('should return 401 if not authenticated', async () => {});
    it('should return 403 if missing grades:override permission', async () => {});
    it('should return 403 if not dept-admin in department', async () => {});
    it('should allow dept-admin with grades:override permission', async () => {});
  });

  describe('Validation', () => {
    it('should return 422 if reason is missing', async () => {});
    it('should return 422 if reason is too short (<10 chars)', async () => {});
    it('should return 422 if no grade fields provided', async () => {});
    it('should return 422 if grade percentage > 100', async () => {});
    it('should return 422 if grade points > 4.0', async () => {});
  });

  describe('Functionality', () => {
    it('should create immutable audit log entry', async () => {});
    it('should update enrollment grades correctly', async () => {});
    it('should return detailed change summary', async () => {});
    it('should handle multiple grade fields being updated', async () => {});
  });

  describe('Audit Trail', () => {
    it('should prevent audit log records from being updated', async () => {});
    it('should prevent audit log records from being deleted', async () => {});
  });
});

describe('Grade History API - GET /api/v1/enrollments/:id/grades/history', () => {
  it('should return 401 if not authenticated', async () => {});
  it('should return 403 if missing grades:override permission', async () => {});
  it('should return all grade changes for enrollment', async () => {});
  it('should filter by date range if provided', async () => {});
});
```

**Validation Checklist:**
- [ ] All 19 integration tests passing
- [ ] Tests verify actual HTTP responses
- [ ] Tests verify database state after changes
- [ ] Tests verify audit log immutability
- [ ] Tests use supertest for HTTP requests

---

## Track 3: Billing Permission Update

### Task 3.1: Update BUILT_IN_ROLES

**File:** `src/services/auth/permissions.service.ts` (MODIFIED)
**Duration:** 15 minutes
**Priority:** HIGH
**Dependencies:** None

**Change Required:**
```typescript
// BEFORE:
'billing-admin': {
  level: 50,
  description: 'Billing and payment administrator',
  permissions: [
    'users:read',
    'enrollments:read',
    'reports:read', 'reports:write'
  ]
}

// AFTER:
'billing-admin': {
  level: 50,
  description: 'Billing and payment administrator',
  permissions: [
    'users:read',
    'courses:read',        // ← NEW: Full course view access
    'enrollments:read',
    'reports:read', 'reports:write'
  ]
}
```

**Validation Checklist:**
- [ ] Change applied correctly
- [ ] No other role definitions affected
- [ ] Code compiles without errors

---

### Task 3.2: Add grades:override Permission

**File:** `src/services/auth/permissions.service.ts` (MODIFIED)
**Duration:** 15 minutes
**Priority:** HIGH
**Dependencies:** None

**Change Required:**
```typescript
'department-admin': {
  level: 80,
  description: 'Department administrator with department-scoped permissions',
  permissions: [
    'users:read', 'users:write',
    'courses:read', 'courses:write', 'courses:manage',
    'content:read', 'content:write', 'content:manage',
    'enrollments:read', 'enrollments:write', 'enrollments:manage',
    'assessments:read', 'assessments:write',
    'grades:override',     // ← NEW: Grade correction capability
    'reports:read', 'reports:write'
  ]
}
```

**Validation Checklist:**
- [ ] grades:override added to dept-admin permissions
- [ ] No other roles have grades:override (security check)
- [ ] Code compiles without errors

---

### Task 3.3: Verify Course Routes Authorization

**File:** `src/routes/courses.routes.ts` (MAY NEED UPDATE)
**Duration:** 30 minutes
**Priority:** MEDIUM
**Dependencies:** None

**Check if authorization middleware exists:**
```typescript
// IDEAL STATE (check if already implemented):
router.get('/', authenticate, authorize(['courses:read']), listCourses);
router.get('/:id', authenticate, authorize(['courses:read']), getCourse);
router.put('/:id', authenticate, authorize(['courses:write']), updateCourse);

// If NOT implemented, ADD authorization middleware
```

**If changes needed:**
```typescript
import { authorize } from '@/middleware/authorize';

// Apply to GET routes (view access)
router.get('/', authenticate, authorize(['courses:read']), listCourses);
router.get('/:id', authenticate, authorize(['courses:read']), getCourse);

// Apply to PUT/POST/DELETE routes (edit access)
router.put('/:id', authenticate, authorize(['courses:write']), updateCourse);
router.post('/', authenticate, authorize(['courses:write']), createCourse);
router.delete('/:id', authenticate, authorize(['courses:delete']), deleteCourse);
```

**Validation Checklist:**
- [ ] GET routes check courses:read permission
- [ ] PUT/POST routes check courses:write permission
- [ ] DELETE routes check courses:delete permission
- [ ] Authorization middleware applied consistently

---

### Task 3.4: Permission Tests

**File:** `tests/integration/auth/permissions.test.ts` (MODIFIED)
**Duration:** 1 hour
**Priority:** MEDIUM
**Dependencies:** Task 3.1-3.2 complete

**Test Cases (4 new tests):**
```typescript
describe('Billing Admin Permissions', () => {
  it('should allow billing-admin to GET /api/v1/courses', async () => {});
  it('should allow billing-admin to GET /api/v1/courses/:id', async () => {});
  it('should deny billing-admin PUT /api/v1/courses/:id', async () => {});
  it('should deny billing-admin access to module endpoints', async () => {});
});

describe('Department Admin Permissions', () => {
  it('should allow dept-admin to override grades', async () => {});
  it('should deny instructor access to override grades', async () => {});
});
```

**Validation Checklist:**
- [ ] All 6 permission tests passing
- [ ] Tests verify billing-admin can view courses
- [ ] Tests verify billing-admin cannot edit courses
- [ ] Tests verify dept-admin can override grades

---

## Track 4: Documentation & Contracts

### Task 4.1: Create Grade Override Contract

**File:** `contracts/api/grade-override.contract.ts` (NEW)
**Duration:** 1.5 hours
**Priority:** HIGH
**Dependencies:** Track 1 complete (models/endpoints defined)

**Contract Structure:**
```typescript
/**
 * Grade Override API Contract
 *
 * SECURITY NOTE:
 * - All grade overrides create immutable audit log entries
 * - Only dept-admin role with grades:override permission can override grades
 * - Admin must be dept-admin in the course's department
 *
 * COMPLIANCE:
 * - Audit logs meet FERPA compliance requirements for grade change tracking
 * - All changes include: who, what, when, why
 */

export const gradeOverrideContract = {
  /**
   * PUT /api/v1/enrollments/:enrollmentId/grades/override
   *
   * Override grade for a student enrollment
   *
   * AUTHORIZATION:
   * - Requires: grades:override permission
   * - Requires: dept-admin role in course's department
   *
   * REQUEST BODY:
   * {
   *   gradeLetter?: 'A' | 'A-' | 'B+' | ... | 'F',
   *   gradePercentage?: number (0-100),
   *   gradePoints?: number (0-4.0),
   *   reason: string (10-1000 chars, required),
   *   previousGradeLetter?: string (for validation),
   *   previousGradePercentage?: number (for validation),
   *   previousGradePoints?: number (for validation)
   * }
   *
   * RESPONSE (200):
   * {
   *   success: true,
   *   data: {
   *     enrollmentId: string,
   *     gradeChanges: {
   *       gradeLetter?: { previous: string, new: string },
   *       gradePercentage?: { previous: number, new: number },
   *       gradePoints?: { previous: number, new: number }
   *     },
   *     overrideBy: string,         // User ID
   *     overrideByName: string,     // Admin's full name
   *     overrideAt: string,         // ISO timestamp
   *     reason: string,
   *     changeLogId: string         // Audit log reference
   *   }
   * }
   *
   * ERRORS:
   * - 401: Not authenticated
   * - 403: Missing grades:override permission
   * - 403: Not dept-admin in course's department
   * - 404: Enrollment not found
   * - 422: Validation error (reason too short, invalid grade range, etc.)
   */
  overrideGrade: {
    method: 'PUT',
    path: '/api/v1/enrollments/:enrollmentId/grades/override',
    auth: 'required',
    permission: 'grades:override',
    rateLimit: '10 requests per minute',
    requestBody: {
      gradeLetter: 'string | optional',
      gradePercentage: 'number | optional | 0-100',
      gradePoints: 'number | optional | 0-4.0',
      reason: 'string | required | 10-1000 chars'
    },
    response: {
      success: 'boolean',
      data: {
        enrollmentId: 'string',
        gradeChanges: 'object',
        overrideBy: 'string',
        overrideByName: 'string',
        overrideAt: 'ISO string',
        reason: 'string',
        changeLogId: 'string'
      }
    }
  },

  /**
   * GET /api/v1/enrollments/:enrollmentId/grades/history
   *
   * Get grade change history for an enrollment
   *
   * AUTHORIZATION:
   * - Requires: grades:override permission (dept-admin)
   *
   * QUERY PARAMS:
   * - startDate?: ISO date string
   * - endDate?: ISO date string
   *
   * RESPONSE (200):
   * {
   *   success: true,
   *   data: [
   *     {
   *       id: string,
   *       enrollmentId: string,
   *       fieldChanged: 'gradeLetter' | 'gradePercentage' | 'gradePoints' | 'all',
   *       previousGradeLetter?: string,
   *       newGradeLetter?: string,
   *       previousGradePercentage?: number,
   *       newGradePercentage?: number,
   *       previousGradePoints?: number,
   *       newGradePoints?: number,
   *       changedBy: string,
   *       changedByRole: string,
   *       changedAt: string (ISO),
   *       reason: string,
   *       changeType: 'override'
   *     }
   *   ]
   * }
   */
  getGradeHistory: {
    method: 'GET',
    path: '/api/v1/enrollments/:enrollmentId/grades/history',
    auth: 'required',
    permission: 'grades:override',
    queryParams: {
      startDate: 'ISO string | optional',
      endDate: 'ISO string | optional'
    },
    response: {
      success: 'boolean',
      data: 'array of IGradeChangeLog'
    }
  }
};
```

**Examples:**
```typescript
// Example: Override percentage grade
PUT /api/v1/enrollments/enroll123/grades/override
{
  "gradePercentage": 85,
  "reason": "Grade appeal approved by academic committee after review of exam 2"
}

// Response:
{
  "success": true,
  "data": {
    "enrollmentId": "enroll123",
    "gradeChanges": {
      "gradePercentage": { "previous": 72, "new": 85 }
    },
    "overrideBy": "user789",
    "overrideByName": "Dr. Jane Smith",
    "overrideAt": "2026-01-14T15:30:00Z",
    "reason": "Grade appeal approved by academic committee after review of exam 2",
    "changeLogId": "log-abc123"
  }
}

// Example: Get grade history
GET /api/v1/enrollments/enroll123/grades/history?startDate=2026-01-01

// Response:
{
  "success": true,
  "data": [
    {
      "id": "log-abc123",
      "enrollmentId": "enroll123",
      "fieldChanged": "gradePercentage",
      "previousGradePercentage": 72,
      "newGradePercentage": 85,
      "changedBy": "user789",
      "changedByRole": "dept-admin",
      "changedAt": "2026-01-14T15:30:00Z",
      "reason": "Grade appeal approved by academic committee after review of exam 2",
      "changeType": "override"
    }
  ]
}
```

**Validation Checklist:**
- [ ] All endpoints documented
- [ ] Request/response formats specified
- [ ] Authorization requirements clear
- [ ] Error responses documented
- [ ] Examples provided for common use cases

---

### Task 4.2: Update Courses Contract

**File:** `contracts/api/courses.contract.ts` (MODIFIED)
**Duration:** 30 minutes
**Priority:** MEDIUM
**Dependencies:** None

**Changes Required:**
```typescript
/**
 * GET /api/v1/courses
 *
 * List all courses
 *
 * AUTHORIZATION:
 * - Requires: courses:read permission
 * - Available to: system-admin, dept-admin, content-admin, instructor, billing-admin ← UPDATED
 *
 * ...
 */

/**
 * GET /api/v1/courses/:id
 *
 * Get course details
 *
 * AUTHORIZATION:
 * - Requires: courses:read permission
 * - Available to: system-admin, dept-admin, content-admin, instructor, billing-admin ← UPDATED
 *
 * ...
 */
```

**Validation Checklist:**
- [ ] billing-admin added to authorization notes
- [ ] No other changes to contract
- [ ] Examples still accurate

---

### Task 4.3: Create API Integration Guide

**File:** `agent_coms/api/INTEGRATION_GUIDE_ISS-021.md` (NEW)
**Duration:** 1 hour
**Priority:** MEDIUM
**Dependencies:** All tracks complete

**Guide Structure:**
```markdown
# ISS-021 Integration Guide - Grade Override & Billing Course View

## For UI Team

### Grade Override Feature

**New Endpoint Available:**
```
PUT /api/v1/enrollments/:enrollmentId/grades/override
```

**How to Use:**
1. User must be dept-admin with `grades:override` permission
2. User must be dept-admin in the course's department
3. Reason field is mandatory (10-1000 characters)
4. At least one grade field must be provided

**UI Requirements:**
- Grade override button/modal for dept-admin only
- Reason text area (required, 10-1000 chars)
- Display previous grade value for reference
- Confirmation step before submitting
- Show success message with change summary

**Example Request:**
```typescript
const response = await api.put(
  `/api/v1/enrollments/${enrollmentId}/grades/override`,
  {
    gradePercentage: 85,
    reason: 'Grade appeal approved by academic committee'
  }
);
```

### Billing Course View Feature

**No UI Changes Required!**

Billing-admin users will now automatically have access to:
- Course list view (`/staff/courses`)
- Course detail view (`/staff/courses/:id`)

**What billing-admin CAN do:**
- ✅ View course catalog
- ✅ View course details (title, description, credits, etc.)
- ✅ View enrollment counts (if displayed)

**What billing-admin CANNOT do:**
- ❌ Edit courses
- ❌ Access modules or content
- ❌ Publish/unpublish courses

## Testing Checklist

- [ ] Verify dept-admin sees grade override UI
- [ ] Verify grade override requires reason (validation)
- [ ] Verify grade override creates audit log entry
- [ ] Verify billing-admin can access course list
- [ ] Verify billing-admin can view course details
- [ ] Verify billing-admin CANNOT edit courses
```

**Validation Checklist:**
- [ ] Clear instructions for UI integration
- [ ] Examples provided
- [ ] Testing checklist included
- [ ] No assumptions about UI implementation

---

## Completion Criteria

### Track 1: Grade Override Foundation
- [ ] GradeChangeLog model created and tested
- [ ] grade-override.service.ts implemented with all methods
- [ ] grade-override.controller.ts created
- [ ] grade-override.routes.ts mounted in app
- [ ] grade-override.validator.ts validates all inputs
- [ ] All files compile without errors

---

### Track 2: Grade Override Testing
- [ ] 15 unit tests passing (service layer)
- [ ] 19 integration tests passing (API endpoints)
- [ ] Test coverage > 90% for new code
- [ ] All edge cases covered (validation, permission, errors)
- [ ] Audit log immutability verified

---

### Track 3: Billing Permission Update
- [ ] courses:read added to billing-admin role
- [ ] grades:override added to dept-admin role
- [ ] Course routes use authorization middleware
- [ ] 6 permission tests passing
- [ ] No regression in existing permission tests

---

### Track 4: Documentation & Contracts
- [ ] grade-override.contract.ts created
- [ ] courses.contract.ts updated
- [ ] Integration guide created
- [ ] All contracts include examples
- [ ] Authorization requirements documented

---

## Final Validation

### All Tests Passing
- [ ] Unit tests: 15 new tests passing
- [ ] Integration tests: 19 new tests passing
- [ ] Permission tests: 6 new tests passing
- [ ] Total new tests: 40 passing

---

### Code Quality
- [ ] TypeScript compiles without errors
- [ ] ESLint passes (no new warnings)
- [ ] All functions have JSDoc comments
- [ ] No console.log statements in production code

---

### Security Review
- [ ] Audit logs are immutable (cannot be updated/deleted)
- [ ] Permission checks in place before grade changes
- [ ] Department scope validated correctly
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities in reason field

---

### Documentation Complete
- [ ] API contracts up to date
- [ ] Integration guide created
- [ ] README updated (if needed)
- [ ] Completion message drafted for UI team

---

## Rollback Plan

**If issues discovered during testing:**

1. **Grade Override Rollback:**
   - Remove grades:override permission from dept-admin
   - Disable grade override routes (comment out in app.ts)
   - Keep audit log collection (data is immutable, safe to keep)
   - Notify UI team to hide grade override UI

2. **Billing Permission Rollback:**
   - Remove courses:read from billing-admin role
   - Redeploy permissions.service.ts with old version
   - Notify UI team billing-admin will lose course access

3. **Database Rollback:**
   - No data migration required, so no database rollback needed
   - Audit log entries can remain (they're immutable anyway)

---

## Post-Implementation Tasks

- [ ] Update ISSUE_QUEUE.md (mark API-ISS-021 as complete)
- [ ] Create completion message for UI team
- [ ] Post message to agent_coms/messages/
- [ ] Update agent_coms/api/MESSAGE_LOG.md
- [ ] Update agent_coms/messages/ACTIVE_THREADS.md
- [ ] Commit all changes with descriptive message
- [ ] Create pull request (if required by workflow)

---

**Status:** 📋 Planning Complete, Ready for Implementation
**Next Step:** Get approval and begin Track 1 + Track 3 in parallel

---

**Document Version:** 1.0
**Last Updated:** 2026-01-14
**Author:** API Agent
