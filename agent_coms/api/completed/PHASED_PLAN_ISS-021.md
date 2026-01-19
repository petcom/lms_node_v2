# Phased Implementation Plan: ISS-021

**Date:** 2026-01-14
**Project:** API-ISS-021 - Grade Override, Billing Course View & Enrollment Admin Role
**Status:** 📋 Ready for Execution
**Total Time:** 6-8 hours (parallelized)

---

## Overview

This document provides a **tactical, step-by-step execution plan** for implementing ISS-021 in phases.

Each phase can be executed independently, with clear entry/exit criteria and validation checkpoints.

---

## Phase Breakdown

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: Foundation Setup (1.5 hours)                       │
│ ✓ Create GradeChangeLog model                               │
│ ✓ Update permission definitions                             │
│ ✓ Validate compilation and basic tests                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: Grade Override Business Logic (2.5 hours)          │
│ ✓ Implement GradeOverrideService                            │
│ ✓ Write unit tests                                          │
│ ✓ Validate service layer works correctly                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: Grade Override API Layer (2 hours)                 │
│ ✓ Create controller, routes, validators                     │
│ ✓ Write integration tests                                   │
│ ✓ Validate endpoints work end-to-end                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: Documentation & Contracts (1.5 hours)              │
│ ✓ Create API contracts                                      │
│ ✓ Write integration guide                                   │
│ ✓ Prepare completion message for UI team                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 5: Final Validation & Deployment (30 mins)            │
│ ✓ Run full test suite                                       │
│ ✓ Security review                                           │
│ ✓ Deploy to staging                                         │
└─────────────────────────────────────────────────────────────┘
```

**Total Time:** 6-8 hours (phases 2-3 can partially overlap)

---

## Phase 1: Foundation Setup

**Duration:** 1.5 hours
**Goal:** Create foundational models and update permission system
**Blocking:** All subsequent phases depend on this

---

### Step 1.1: Create GradeChangeLog Model (45 mins)

**File:** `src/models/audit/GradeChangeLog.model.ts` (NEW)

**Create directory:**
```bash
mkdir -p src/models/audit
```

**Model Implementation:**
```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IGradeChangeLog extends Document {
  enrollmentId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  learnerId: mongoose.Types.ObjectId;
  fieldChanged: 'gradeLetter' | 'gradePercentage' | 'gradePoints' | 'all';
  previousGradeLetter?: string;
  newGradeLetter?: string;
  previousGradePercentage?: number;
  newGradePercentage?: number;
  previousGradePoints?: number;
  newGradePoints?: number;
  changedBy: mongoose.Types.ObjectId;
  changedByRole: string;
  changedAt: Date;
  reason: string;
  changeType: 'override';
  departmentId: mongoose.Types.ObjectId;
  termId?: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const GradeChangeLogSchema = new Schema<IGradeChangeLog>(
  {
    enrollmentId: {
      type: Schema.Types.ObjectId,
      required: [true, 'enrollmentId is required'],
      ref: 'ClassEnrollment',
      index: true,
      immutable: true
    },
    classId: {
      type: Schema.Types.ObjectId,
      required: [true, 'classId is required'],
      ref: 'Class',
      index: true,
      immutable: true
    },
    courseId: {
      type: Schema.Types.ObjectId,
      required: [true, 'courseId is required'],
      ref: 'Course',
      index: true,
      immutable: true
    },
    learnerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'learnerId is required'],
      ref: 'User',
      index: true,
      immutable: true
    },
    fieldChanged: {
      type: String,
      required: [true, 'fieldChanged is required'],
      enum: {
        values: ['gradeLetter', 'gradePercentage', 'gradePoints', 'all'],
        message: '{VALUE} is not a valid field type'
      },
      immutable: true
    },
    previousGradeLetter: { type: String, immutable: true },
    newGradeLetter: { type: String, immutable: true },
    previousGradePercentage: { type: Number, immutable: true },
    newGradePercentage: { type: Number, immutable: true },
    previousGradePoints: { type: Number, immutable: true },
    newGradePoints: { type: Number, immutable: true },
    changedBy: {
      type: Schema.Types.ObjectId,
      required: [true, 'changedBy is required'],
      ref: 'User',
      index: true,
      immutable: true
    },
    changedByRole: {
      type: String,
      required: [true, 'changedByRole is required'],
      immutable: true
    },
    changedAt: {
      type: Date,
      required: [true, 'changedAt is required'],
      index: true,
      immutable: true
    },
    reason: {
      type: String,
      required: [true, 'reason is required'],
      minlength: [10, 'reason must be at least 10 characters'],
      maxlength: [1000, 'reason cannot exceed 1000 characters'],
      trim: true,
      immutable: true
    },
    changeType: {
      type: String,
      required: true,
      enum: ['override'],
      default: 'override',
      immutable: true
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      required: [true, 'departmentId is required'],
      ref: 'Department',
      index: true,
      immutable: true
    },
    termId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicTerm',
      index: true,
      immutable: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      immutable: true
    }
  },
  {
    timestamps: true
  }
);

// Prevent updates to audit log records
GradeChangeLogSchema.pre('findOneAndUpdate', function(next) {
  next(new Error('GradeChangeLog records are immutable and cannot be updated'));
});

GradeChangeLogSchema.pre('updateOne', function(next) {
  next(new Error('GradeChangeLog records are immutable and cannot be updated'));
});

GradeChangeLogSchema.pre('updateMany', function(next) {
  next(new Error('GradeChangeLog records are immutable and cannot be updated'));
});

// Prevent deletion of audit log records
GradeChangeLogSchema.pre('findOneAndDelete', function(next) {
  next(new Error('GradeChangeLog records cannot be deleted'));
});

GradeChangeLogSchema.pre('deleteOne', function(next) {
  next(new Error('GradeChangeLog records cannot be deleted'));
});

GradeChangeLogSchema.pre('deleteMany', function(next) {
  next(new Error('GradeChangeLog records cannot be deleted'));
});

// Indexes for common queries
GradeChangeLogSchema.index({ enrollmentId: 1, changedAt: -1 });
GradeChangeLogSchema.index({ learnerId: 1, changedAt: -1 });
GradeChangeLogSchema.index({ changedBy: 1, changedAt: -1 });
GradeChangeLogSchema.index({ classId: 1, changedAt: -1 });
GradeChangeLogSchema.index({ departmentId: 1, changedAt: -1 });

const GradeChangeLog = mongoose.model<IGradeChangeLog>('GradeChangeLog', GradeChangeLogSchema);

export default GradeChangeLog;
```

**Validation:**
```bash
npm run build
# ✓ Should compile without errors
```

**Commit:**
```bash
git add src/models/audit/GradeChangeLog.model.ts
git commit -m "feat(audit): create GradeChangeLog model for grade override audit trail (ISS-021)"
```

---

### Step 1.2: Update Permission Definitions (30 mins)

**File:** `src/services/auth/permissions.service.ts` (MODIFIED)

**Changes:**

**1. Add grades:override to dept-admin:**
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
    'grades:override',     // ← NEW (ISS-021)
    'reports:read', 'reports:write'
  ]
},
```

**2. Add courses:read to billing-admin:**
```typescript
'billing-admin': {
  level: 50,
  description: 'Billing and payment administrator',
  permissions: [
    'users:read',
    'courses:read',        // ← NEW (ISS-021)
    'enrollments:read',
    'reports:read', 'reports:write'
  ]
},
```

**3. Add enrollment-admin role (NEW):**
```typescript
'enrollment-admin': {
  level: 55,
  description: 'Enrollment and registration administrator',
  permissions: [
    'users:read',
    'courses:read',
    'enrollments:read', 'enrollments:write', 'enrollments:manage',
    'reports:read'
  ]
},
```

**Validation:**
```bash
npm run build
# ✓ Should compile without errors
```

**Commit:**
```bash
git add src/services/auth/permissions.service.ts
git commit -m "feat(permissions): add grades:override to dept-admin, courses:read to billing-admin, and enrollment-admin role (ISS-021)"
```

---

### Step 1.3: Verify Course Routes Authorization (15 mins)

**File:** `src/routes/courses.routes.ts`

**Check if authorization middleware exists:**
```typescript
// Look for authorize() middleware on GET routes
router.get('/', authenticate, authorize(['courses:read']), listCourses);
router.get('/:id', authenticate, authorize(['courses:read']), getCourse);
```

**If missing, add it:**
```typescript
import { authorize } from '@/middleware/authorize';

// Apply to GET routes
router.get('/', authenticate, authorize(['courses:read']), listCourses);
router.get('/:id', authenticate, authorize(['courses:read']), getCourse);

// Ensure PUT/POST/DELETE routes require courses:write
router.put('/:id', authenticate, authorize(['courses:write']), updateCourse);
router.post('/', authenticate, authorize(['courses:write']), createCourse);
router.delete('/:id', authenticate, authorize(['courses:delete']), deleteCourse);
```

**Validation:**
```bash
npm run build
# ✓ Should compile without errors
```

**Commit:**
```bash
git add src/routes/courses.routes.ts
git commit -m "feat(courses): add authorization middleware to course routes (ISS-021)"
```

---

### Phase 1 Exit Criteria

- [ ] GradeChangeLog model created and compiles
- [ ] Permission definitions updated (dept-admin, billing-admin)
- [ ] Course routes have authorization middleware
- [ ] All changes committed to git
- [ ] `npm run build` succeeds

**Time Check:** Should be ~1.5 hours

---

## Phase 2: Grade Override Business Logic

**Duration:** 2.5 hours
**Goal:** Implement service layer with full business logic
**Dependencies:** Phase 1 complete

---

### Step 2.1: Create Grade Override Service (1.5 hours)

**Create directory:**
```bash
mkdir -p src/services/grades
```

**File:** `src/services/grades/grade-override.service.ts` (NEW)

**Implementation:** (See CONTRACT_CHANGES_ISS-021.md for full implementation)

**Key Methods:**
```typescript
export class GradeOverrideService {
  async overrideGrade(
    enrollmentId: string,
    overrideData: GradeOverrideInput,
    adminUserId: string
  ): Promise<GradeOverrideResult> {
    // 1. Validate input
    // 2. Load enrollment with course/department
    // 3. Verify admin has permission
    // 4. Create audit log entry
    // 5. Update enrollment
    // 6. Return result
  }

  async getGradeChangeHistory(
    enrollmentId: string,
    filters?: { startDate?: Date; endDate?: Date }
  ): Promise<IGradeChangeLog[]> {
    // Query audit log with filters
  }

  async getAdminGradeOverrides(
    adminUserId: string,
    filters?: { startDate?: Date; endDate?: Date; departmentId?: string }
  ): Promise<IGradeChangeLog[]> {
    // Query audit log by admin
  }

  async verifyOverridePermission(
    userId: string,
    enrollmentId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    // 1. Check grades:override permission
    // 2. Check dept-admin role in course's department
    // 3. Return result
  }

  private validateGradeValues(gradeData: Partial<GradeOverrideInput>): void {
    // Validate percentage, points, letter ranges
  }
}

export default new GradeOverrideService();
```

**Validation:**
```bash
npm run build
# ✓ Should compile without errors
```

**Commit:**
```bash
git add src/services/grades/grade-override.service.ts
git commit -m "feat(grades): implement GradeOverrideService with audit logging (ISS-021)"
```

---

### Step 2.2: Write Service Unit Tests (1 hour)

**File:** `tests/unit/services/grade-override.service.test.ts` (NEW)

**Test Structure:**
```typescript
import { GradeOverrideService } from '@/services/grades/grade-override.service';
import GradeChangeLog from '@/models/audit/GradeChangeLog.model';
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('GradeOverrideService', () => {
  let mongoServer: MongoMemoryServer;
  let gradeOverrideService: GradeOverrideService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    gradeOverrideService = new GradeOverrideService();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear collections
  });

  describe('overrideGrade()', () => {
    it('should create audit log entry when overriding grade', async () => {});
    it('should update enrollment with new grade values', async () => {});
    it('should validate reason is at least 10 characters', async () => {});
    it('should validate grade percentage is 0-100', async () => {});
    it('should throw 403 if user lacks grades:override permission', async () => {});
    it('should throw 403 if user not dept-admin in department', async () => {});
    // ... 10 more tests
  });

  describe('verifyOverridePermission()', () => {
    it('should return allowed=true for dept-admin with permission', async () => {});
    it('should return allowed=false if user lacks grades:override', async () => {});
    it('should return allowed=false if user not dept-admin in dept', async () => {});
  });

  describe('getGradeChangeHistory()', () => {
    it('should return all changes for an enrollment', async () => {});
    it('should filter by date range if provided', async () => {});
  });
});
```

**Run tests:**
```bash
npm test -- grade-override.service.test.ts
# ✓ All 15 tests should pass
```

**Commit:**
```bash
git add tests/unit/services/grade-override.service.test.ts
git commit -m "test(grades): add unit tests for GradeOverrideService (15 tests, ISS-021)"
```

---

### Phase 2 Exit Criteria

- [ ] GradeOverrideService implemented with all methods
- [ ] Unit tests written (15 tests)
- [ ] All unit tests passing
- [ ] Code compiles without errors
- [ ] All changes committed to git

**Time Check:** Should be ~2.5 hours from Phase 1 completion

---

## Phase 3: Grade Override API Layer

**Duration:** 2 hours
**Goal:** Expose service layer via REST API
**Dependencies:** Phase 2 complete

---

### Step 3.1: Create Validator (30 mins)

**Create directory:**
```bash
mkdir -p src/validators
```

**File:** `src/validators/grade-override.validator.ts` (NEW)

**Implementation:**
```typescript
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/utils/ApiError';

const gradeOverrideSchema = Joi.object({
  gradeLetter: Joi.string()
    .optional()
    .uppercase()
    .valid('A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'),
  gradePercentage: Joi.number().optional().min(0).max(100),
  gradePoints: Joi.number().optional().min(0).max(4.0),
  reason: Joi.string().required().min(10).max(1000).trim(),
  previousGradeLetter: Joi.string().optional(),
  previousGradePercentage: Joi.number().optional(),
  previousGradePoints: Joi.number().optional()
}).custom((value, helpers) => {
  if (!value.gradeLetter && !value.gradePercentage && !value.gradePoints) {
    return helpers.error('custom.noGradeFields');
  }
  return value;
}).messages({
  'custom.noGradeFields': 'At least one grade field must be provided'
});

export const validateGradeOverride = (req: Request, res: Response, next: NextFunction) => {
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

**Commit:**
```bash
git add src/validators/grade-override.validator.ts
git commit -m "feat(validators): add grade override request validation (ISS-021)"
```

---

### Step 3.2: Create Controller (30 mins)

**Create directory:**
```bash
mkdir -p src/controllers/grades
```

**File:** `src/controllers/grades/grade-override.controller.ts` (NEW)

**Implementation:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { GradeOverrideService } from '@/services/grades/grade-override.service';

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

**Commit:**
```bash
git add src/controllers/grades/grade-override.controller.ts
git commit -m "feat(controllers): add grade override controller (ISS-021)"
```

---

### Step 3.3: Create Routes (15 mins)

**Create directory:**
```bash
mkdir -p src/routes
```

**File:** `src/routes/grade-override.routes.ts` (NEW)

**Implementation:**
```typescript
import express from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize } from '@/middleware/authorize';
import { overrideGrade, getGradeHistory } from '@/controllers/grades/grade-override.controller';
import { validateGradeOverride } from '@/validators/grade-override.validator';

const router = express.Router();

router.put(
  '/:enrollmentId/grades/override',
  authenticate,
  authorize(['grades:override']),
  validateGradeOverride,
  overrideGrade
);

router.get(
  '/:enrollmentId/grades/history',
  authenticate,
  authorize(['grades:override']),
  getGradeHistory
);

export default router;
```

**Mount in main app:**
```typescript
// In src/app.ts or src/routes/index.ts
import gradeOverrideRoutes from './routes/grade-override.routes';

app.use('/api/v1/enrollments', gradeOverrideRoutes);
```

**Commit:**
```bash
git add src/routes/grade-override.routes.ts src/app.ts
git commit -m "feat(routes): add grade override routes (ISS-021)"
```

---

### Step 3.4: Write Integration Tests (45 mins)

**File:** `tests/integration/grades/grade-override.test.ts` (NEW)

**Test Structure:**
```typescript
import request from 'supertest';
import app from '@/app';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('Grade Override API', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('PUT /api/v1/enrollments/:id/grades/override', () => {
    it('should return 401 if not authenticated', async () => {});
    it('should return 403 if missing grades:override permission', async () => {});
    it('should return 422 if reason is missing', async () => {});
    it('should create audit log and update grade', async () => {});
    it('should prevent audit log from being updated', async () => {});
    // ... 14 more tests
  });

  describe('GET /api/v1/enrollments/:id/grades/history', () => {
    it('should return 401 if not authenticated', async () => {});
    it('should return all grade changes for enrollment', async () => {});
    it('should filter by date range', async () => {});
  });
});
```

**Run tests:**
```bash
npm test -- grade-override.test.ts
# ✓ All 19 integration tests should pass
```

**Commit:**
```bash
git add tests/integration/grades/grade-override.test.ts
git commit -m "test(grades): add integration tests for grade override API (19 tests, ISS-021)"
```

---

### Phase 3 Exit Criteria

- [ ] Validator created and validates correctly
- [ ] Controller created with error handling
- [ ] Routes created and mounted in app
- [ ] Integration tests written (19 tests)
- [ ] All integration tests passing
- [ ] API endpoints accessible via HTTP
- [ ] All changes committed to git

**Time Check:** Should be ~2 hours from Phase 2 completion

---

## Phase 4: Documentation & Contracts

**Duration:** 1.5 hours
**Goal:** Complete all documentation and API contracts
**Dependencies:** Phase 3 complete

---

### Step 4.1: Create Grade Override Contract (45 mins)

**File:** `contracts/api/grade-override.contract.ts` (NEW)

**Implementation:** (See CONTRACT_CHANGES_ISS-021.md for full content)

**Key Sections:**
- Endpoint documentation (PUT override, GET history)
- Request/response schemas
- Error response documentation
- Examples for common use cases
- Authorization requirements

**Commit:**
```bash
git add contracts/api/grade-override.contract.ts
git commit -m "docs(contracts): add grade override API contract (ISS-021)"
```

---

### Step 4.2: Update Courses Contract (15 mins)

**File:** `contracts/api/courses.contract.ts` (MODIFIED)

**Changes:**
- Update GET /courses authorization notes (add billing-admin)
- Update GET /courses/:id authorization notes (add billing-admin)
- Add change log note

**Commit:**
```bash
git add contracts/api/courses.contract.ts
git commit -m "docs(contracts): add billing-admin to course view authorization (ISS-021)"
```

---

### Step 4.3: Create Integration Guide (30 mins)

**File:** `agent_coms/api/INTEGRATION_GUIDE_ISS-021.md` (NEW)

**Sections:**
- Overview for UI team
- Grade override endpoint usage
- Billing course view notes
- Testing checklist
- Common error scenarios

**Commit:**
```bash
git add agent_coms/api/INTEGRATION_GUIDE_ISS-021.md
git commit -m "docs(integration): add ISS-021 integration guide for UI team"
```

---

### Phase 4 Exit Criteria

- [ ] Grade override contract created
- [ ] Courses contract updated
- [ ] Integration guide created
- [ ] All documentation committed to git

**Time Check:** Should be ~1.5 hours from Phase 3 completion

---

## Phase 5: Final Validation & Deployment

**Duration:** 30 minutes
**Goal:** Validate everything works, prepare for deployment
**Dependencies:** All previous phases complete

---

### Step 5.1: Run Full Test Suite (10 mins)

```bash
# Run all tests
npm test

# Expected results:
# ✓ Unit tests: 15 new tests passing
# ✓ Integration tests: 19 new tests passing
# ✓ Permission tests: 6 new tests passing
# ✓ All existing tests still passing
# Total new tests: 40
```

**Validation:**
- [ ] All 40 new tests passing
- [ ] No regressions in existing tests
- [ ] Test coverage > 90% for new code

---

### Step 5.2: Compilation & Linting (5 mins)

```bash
# Build
npm run build
# ✓ Should succeed with no errors

# Lint
npm run lint
# ✓ Should pass with no new warnings
```

---

### Step 5.3: Security Review (10 mins)

**Checklist:**
- [ ] Audit logs are immutable (cannot be updated/deleted)
- [ ] Permission checks before grade changes
- [ ] Department scope validated
- [ ] No SQL injection vulnerabilities
- [ ] Reason field sanitized/escaped
- [ ] Rate limiting in place (10/min)

---

### Step 5.4: Update Issue Queue (5 mins)

**File:** `agent_coms/api/ISSUE_QUEUE.md` (MODIFIED)

**Add to Completed Issues:**
```markdown
### API-ISS-021: Grade Override, Billing Course View & Enrollment Admin

**Priority:** high
**Type:** feature
**Status:** ✅ COMPLETE
**Completed:** 2026-01-14
**Tests:** 46/46 passing (100%)

**Description:**
Implemented three role capability updates:
1. Grade Override with immutable audit logging for dept-admin
2. Course view access for billing-admin
3. New enrollment-admin role (per COURSE_ROLE_FUNCTION_MATRIX.md)

**Implementation:**
- Created GradeChangeLog model for audit trail
- Implemented GradeOverrideService with permission validation
- Added grade override API endpoints (PUT override, GET history)
- Updated BUILT_IN_ROLES (dept-admin, billing-admin, enrollment-admin)
- Comprehensive test coverage (46 tests)

**Files Created (8):**
- src/models/audit/GradeChangeLog.model.ts
- src/services/grades/grade-override.service.ts
- src/controllers/grades/grade-override.controller.ts
- src/routes/grade-override.routes.ts
- src/validators/grade-override.validator.ts
- contracts/api/grade-override.contract.ts
- tests/unit/services/grade-override.service.test.ts
- tests/integration/grades/grade-override.test.ts

**Files Modified (2):**
- src/services/auth/permissions.service.ts
- contracts/api/courses.contract.ts

**UI Team Impact:**
- ✅ New grade override endpoint available
- ✅ billing-admin gains course view access
- ✅ enrollment-admin role available for assignment
- ✅ Integration guide provided
- ✅ API contracts complete
```

**Commit:**
```bash
git add agent_coms/api/ISSUE_QUEUE.md
git commit -m "docs(queue): mark API-ISS-021 as complete"
```

---

### Phase 5 Exit Criteria

- [ ] All 40 new tests passing
- [ ] Code compiles and lints successfully
- [ ] Security review complete
- [ ] ISSUE_QUEUE.md updated
- [ ] Ready for deployment

**Time Check:** Should be ~30 minutes from Phase 4 completion

---

## Post-Implementation: Deployment

**Duration:** 30 minutes
**Goal:** Deploy to staging, prepare completion message

---

### Step 6.1: Deploy to Staging (15 mins)

**Steps:**
1. Push all changes to feature branch
2. Create pull request
3. Deploy to staging environment
4. Run smoke tests:
   ```bash
   # Test grade override endpoint (should return 403 without permission)
   curl -X PUT http://staging-api.lms.edu/api/v1/enrollments/123/grades/override \
     -H "Authorization: Bearer <token>" \
     -d '{"gradePercentage": 85, "reason": "Test override"}'

   # Test billing-admin course access
   curl http://staging-api.lms.edu/api/v1/courses \
     -H "Authorization: Bearer <billing-admin-token>"
   ```

---

### Step 6.2: Create Completion Message (15 mins)

**File:** `agent_coms/messages/2026-01-14_API-ISS-021_complete.md` (NEW)

**Message Structure:**
```markdown
# Message: API-ISS-021 Complete - Grade Override & Billing Course View

**From:** API Agent
**To:** UI Team
**Date:** 2026-01-14
**Type:** complete
**Thread ID:** API-ISS-021
**Priority:** high

## Summary

✅ **API-ISS-021 Implementation Complete**

Implemented two new role capabilities with full test coverage (40/40 tests passing).

## What's Implemented

### 1. Grade Override System

**New Endpoint:**
```
PUT /api/v1/enrollments/:enrollmentId/grades/override
```

**Authorization:** dept-admin with `grades:override` permission

**Key Features:**
- Immutable audit logging (all changes tracked)
- Mandatory reason field (10-1000 chars)
- Department scope validation
- Comprehensive error handling

**Example Request:**
[...]

### 2. Billing Course View

**Updated Permission:** billing-admin now has `courses:read` access

**Available Endpoints:**
- `GET /api/v1/courses` (list)
- `GET /api/v1/courses/:id` (details)

**Restrictions:**
- ❌ Cannot edit courses
- ❌ Cannot access modules/content

## Testing Results

- ✅ Unit tests: 15/15 passing
- ✅ Integration tests: 19/19 passing
- ✅ Permission tests: 6/6 passing
- ✅ Total: 40/40 passing (100%)

## UI Integration Guide

See: `agent_coms/api/INTEGRATION_GUIDE_ISS-021.md`

## API Contracts

- `contracts/api/grade-override.contract.ts` (NEW)
- `contracts/api/courses.contract.ts` (UPDATED)

## Next Steps for UI Team

1. Review integration guide
2. Implement grade override UI (dept-admin only)
3. Test billing-admin course access (no changes needed)
4. Test grade override workflow end-to-end

## Questions?

Reply in agent_coms coordination channel.

**Status:** ✅ Complete, ready for UI integration
**Commit:** [insert commit hash]
**Pull Request:** [insert PR link]
```

**Post to messages folder:**
```bash
cp agent_coms/messages/2026-01-14_API-ISS-021_complete.md agent_coms/messages/
```

**Update ACTIVE_THREADS.md:**
```bash
# Move ISS-021 from Active to Closed
```

**Commit:**
```bash
git add agent_coms/messages/2026-01-14_API-ISS-021_complete.md
git add agent_coms/messages/ACTIVE_THREADS.md
git commit -m "docs(coms): send ISS-021 completion message to UI team"
```

---

## Final Checklist

### Code Quality
- [ ] TypeScript compiles without errors
- [ ] ESLint passes with no new warnings
- [ ] All functions have JSDoc comments
- [ ] No console.log in production code
- [ ] Error handling in place

### Testing
- [ ] 15 unit tests passing
- [ ] 19 integration tests passing
- [ ] 6 permission tests passing
- [ ] Test coverage > 90%
- [ ] No test failures

### Security
- [ ] Audit logs immutable
- [ ] Permission checks in place
- [ ] Department scope validated
- [ ] No injection vulnerabilities
- [ ] Rate limiting configured

### Documentation
- [ ] API contracts complete
- [ ] Integration guide created
- [ ] Completion message drafted
- [ ] ISSUE_QUEUE.md updated
- [ ] All files committed

### Deployment
- [ ] Changes pushed to remote
- [ ] Pull request created
- [ ] Staging deployment successful
- [ ] Smoke tests passing
- [ ] UI team notified

---

## Rollback Plan

If issues discovered:

**1. Immediate Rollback (< 5 mins):**
```bash
# Disable grade override routes
# Comment out in src/app.ts:
// app.use('/api/v1/enrollments', gradeOverrideRoutes);

# Redeploy
npm run build && npm run deploy:staging
```

**2. Full Rollback (< 15 mins):**
```bash
# Revert all commits
git revert <commit-hash-range>

# Remove grades:override from dept-admin
# Remove courses:read from billing-admin
# Redeploy

# Notify UI team
```

**3. Database Cleanup (optional):**
```bash
# Audit logs can remain (immutable, no harm)
# If needed:
db.gradechangelogs.drop()
```

---

## Success Metrics

**Measure success by:**
- ✅ All 40 tests passing (100% pass rate)
- ✅ Zero security vulnerabilities found
- ✅ Zero compilation errors
- ✅ Zero lint warnings
- ✅ Deployment successful on first try
- ✅ UI team successfully integrates within 1 sprint
- ✅ No grade override bugs reported in first 2 weeks

---

**Status:** 📋 Ready for Execution
**Total Time:** 6-8 hours (parallelized)
**Next Step:** Begin Phase 1 (Foundation Setup)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-14
**Author:** API Agent
