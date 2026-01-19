# Time-Based Pacing - Premium Feature Implementation Plan

**Document Type:** Implementation Plan (Premium Feature)
**Created:** 2026-01-16
**Status:** DRAFT - Awaiting Approval
**Feature Type:** OPTIONAL/PAID ADD-ON
**Priority:** Phase 2 (After Core Prerequisite System)
**Related Documents:**
- CONTENT_UNLOCKING_ARCHITECTURE.md (Architecture overview)
- TIME_PACING_PREMIUM_FEATURE.md (Design spec)
- PREREQUISITE_SYSTEM_IMPLEMENTATION_PLAN.md (Must be completed first!)
**Estimated Effort:** 3-4 weeks (phased)

---

## ⚠️ Prerequisites for This Implementation

**This implementation REQUIRES the core prerequisite system to be completed first.**

You MUST implement:
1. ✅ Core prerequisite system (PREREQUISITE_SYSTEM_IMPLEMENTATION_PLAN.md)
2. ✅ Feature flag infrastructure
3. ✅ Basic access control middleware

Then you can add time-based pacing as an optional layer.

---

## Implementation Philosophy

**Incremental Delivery Strategy:**
- Each phase delivers working, testable functionality
- Backward compatible (existing classes unaffected)
- Opt-in adoption (instructors enable pacing when ready)
- Early phases provide value without waiting for complete system

**Risk Mitigation:**
- Feature flags for gradual rollout
- Extensive testing at each phase
- Rollback plan for each phase
- Monitoring and alerting

---

## Phase Overview

| Phase | Description | Effort | Dependencies | Deliverable |
|-------|-------------|--------|--------------|-------------|
| **Phase 1** | Data Models & Migrations | 3-5 days | None | Models, migrations, seeds |
| **Phase 2** | Schedule Generation Logic | 4-6 days | Phase 1 | Service layer, schedule calculation |
| **Phase 3** | Access Control Integration | 3-5 days | Phase 2 | Learner access checks, middleware |
| **Phase 4** | Instructor Management APIs | 5-7 days | Phase 3 | Schedule CRUD, overrides |
| **Phase 5** | Course Template Pacing | 3-5 days | Phase 4 | Course pacing config API |
| **Phase 6** | Testing & Documentation | 4-6 days | Phase 5 | Tests, docs, migration tools |

**Total Estimated Time:** 22-34 days (3-5 weeks)

---

## Phase 1: Data Models & Migrations

### Objectives
- Create `ClassContentSchedule` model
- Extend `CourseContent` model with pacing config
- Extend `Class` model with pacing settings
- Create database migrations
- Create seed data for testing

### Tasks

#### Task 1.1: Create ClassContentSchedule Model
**File:** `src/models/academic/ClassContentSchedule.model.ts`

**Implementation:**
```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IClassContentSchedule extends Document {
  classId: mongoose.Types.ObjectId;
  courseContentId: mongoose.Types.ObjectId;
  contentId: mongoose.Types.ObjectId;
  moduleNumber?: number;
  availableFrom: Date;
  availableUntil: Date | null;
  isOverridden: boolean;
  overriddenBy?: mongoose.Types.ObjectId;
  overriddenAt?: Date;
  overrideReason?: string;
  originalAvailableFrom: Date;
  originalAvailableUntil: Date | null;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const classContentScheduleSchema = new Schema<IClassContentSchedule>(
  {
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required'],
      index: true
    },
    courseContentId: {
      type: Schema.Types.ObjectId,
      ref: 'CourseContent',
      required: [true, 'Course content is required']
    },
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content',
      required: [true, 'Content is required'],
      index: true
    },
    moduleNumber: {
      type: Number,
      min: [0, 'Module number cannot be negative']
    },
    availableFrom: {
      type: Date,
      required: [true, 'Available from date is required']
    },
    availableUntil: {
      type: Date,
      default: null
    },
    isOverridden: {
      type: Boolean,
      default: false,
      index: true
    },
    overriddenBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff'
    },
    overriddenAt: {
      type: Date
    },
    overrideReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Override reason cannot exceed 500 characters']
    },
    originalAvailableFrom: {
      type: Date,
      required: [true, 'Original available from date is required']
    },
    originalAvailableUntil: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
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

// Indexes
classContentScheduleSchema.index({ classId: 1, courseContentId: 1 }, { unique: true });
classContentScheduleSchema.index({ classId: 1, availableFrom: 1 });
classContentScheduleSchema.index({ classId: 1, moduleNumber: 1 });

// Validation
classContentScheduleSchema.pre('save', function (next) {
  if (this.availableUntil && this.availableUntil <= this.availableFrom) {
    next(new Error('Available until date must be after available from date'));
  } else {
    next();
  }
});

const ClassContentSchedule = mongoose.model<IClassContentSchedule>(
  'ClassContentSchedule',
  classContentScheduleSchema
);

export default ClassContentSchedule;
```

**Estimated Time:** 2-3 hours

---

#### Task 1.2: Extend CourseContent Model
**File:** `src/models/content/CourseContent.model.ts`

**Changes:**
1. Add `pacingConfig` subdocument schema
2. Add backward compatibility for existing `availableFrom`/`availableUntil`
3. Add validation for pacing config

**Implementation:**
```typescript
// Add new subdocument schema
const pacingConfigSchema = new Schema(
  {
    type: {
      type: String,
      enum: {
        values: ['fixed', 'relative', 'always-available'],
        message: '{VALUE} is not a valid pacing type'
      },
      required: true,
      default: 'always-available'
    },
    // Fixed dates
    fixedAvailableFrom: {
      type: Date
    },
    fixedAvailableUntil: {
      type: Date
    },
    // Relative (week-based)
    relativeStartDay: {
      type: Number,
      min: [0, 'Relative start day cannot be negative']
    },
    relativeDurationDays: {
      type: Number,
      min: [1, 'Duration must be at least 1 day']
    }
  },
  { _id: false }
);

// Add to ICourseContent interface
export interface ICourseContent extends Document {
  // ... existing fields ...

  pacingConfig?: {
    type: 'fixed' | 'relative' | 'always-available';
    fixedAvailableFrom?: Date;
    fixedAvailableUntil?: Date;
    relativeStartDay?: number;
    relativeDurationDays?: number;
  };

  // Keep for backward compatibility (deprecated)
  availableFrom?: Date;
  availableUntil?: Date;
}

// Add to schema
courseContentSchema.add({
  pacingConfig: {
    type: pacingConfigSchema,
    default: { type: 'always-available' }
  }
});

// Validation
courseContentSchema.pre('save', function (next) {
  const pacing = this.pacingConfig;

  if (!pacing) {
    return next();
  }

  if (pacing.type === 'fixed') {
    if (!pacing.fixedAvailableFrom) {
      return next(new Error('Fixed pacing requires fixedAvailableFrom'));
    }
    if (pacing.fixedAvailableUntil && pacing.fixedAvailableUntil <= pacing.fixedAvailableFrom) {
      return next(new Error('Fixed end date must be after start date'));
    }
  }

  if (pacing.type === 'relative') {
    if (pacing.relativeStartDay === undefined) {
      return next(new Error('Relative pacing requires relativeStartDay'));
    }
    if (!pacing.relativeDurationDays) {
      return next(new Error('Relative pacing requires relativeDurationDays'));
    }
  }

  next();
});
```

**Estimated Time:** 2-3 hours

---

#### Task 1.3: Extend Class Model
**File:** `src/models/academic/Class.model.ts`

**Changes:**
```typescript
export interface IClass extends Document {
  // ... existing fields ...

  // NEW: Pacing configuration
  pacingMode: 'inherit' | 'custom';
  weekStartDay?: number;  // 0=Sunday, 1=Monday
  allowLateAccess?: boolean;  // Allow late enrollees to access closed content
}

// Add to schema
classSchema.add({
  pacingMode: {
    type: String,
    enum: {
      values: ['inherit', 'custom'],
      message: '{VALUE} is not a valid pacing mode'
    },
    default: 'inherit'
  },
  weekStartDay: {
    type: Number,
    min: [0, 'Week start day must be 0-6'],
    max: [6, 'Week start day must be 0-6'],
    default: 1  // Monday
  },
  allowLateAccess: {
    type: Boolean,
    default: false
  }
});
```

**Estimated Time:** 1 hour

---

#### Task 1.4: Create Migration Script
**File:** `scripts/migrations/2026-01-16-add-pacing-config.ts`

**Purpose:** Migrate existing `CourseContent.availableFrom/Until` to `pacingConfig`

**Implementation:**
```typescript
import mongoose from 'mongoose';
import { connectDatabase } from '@/config/database';
import CourseContent from '@/models/content/CourseContent.model';

async function migrate() {
  await connectDatabase();

  console.log('Starting pacing config migration...');

  const contentWithDates = await CourseContent.find({
    $or: [
      { availableFrom: { $exists: true, $ne: null } },
      { availableUntil: { $exists: true, $ne: null } }
    ],
    pacingConfig: { $exists: false }
  });

  console.log(`Found ${contentWithDates.length} content items to migrate`);

  let migrated = 0;

  for (const content of contentWithDates) {
    content.pacingConfig = {
      type: 'fixed',
      fixedAvailableFrom: content.availableFrom,
      fixedAvailableUntil: content.availableUntil
    };

    await content.save();
    migrated++;

    if (migrated % 100 === 0) {
      console.log(`Migrated ${migrated}/${contentWithDates.length}`);
    }
  }

  // Set default for content without dates
  await CourseContent.updateMany(
    { pacingConfig: { $exists: false } },
    { $set: { pacingConfig: { type: 'always-available' } } }
  );

  console.log(`Migration complete. Migrated ${migrated} items.`);
  process.exit(0);
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
```

**Estimated Time:** 2 hours

---

#### Task 1.5: Create Seed Data
**File:** `scripts/seed-pacing-test-data.ts`

**Purpose:** Create test courses with different pacing configs

**Implementation:**
```typescript
// Create 3 test courses:
// 1. Course with fixed-date modules
// 2. Course with week-based (relative) modules
// 3. Course with always-available modules

// Create 2 test classes:
// 1. Class starting Jan 15, 2026 (relative pacing)
// 2. Class starting Jun 1, 2026 (fixed pacing)

// Generate ClassContentSchedule entries for testing
```

**Estimated Time:** 3-4 hours

---

### Phase 1 Deliverables

- [ ] `ClassContentSchedule.model.ts` created
- [ ] `CourseContent.model.ts` extended with `pacingConfig`
- [ ] `Class.model.ts` extended with pacing fields
- [ ] Migration script created and tested
- [ ] Seed data script created
- [ ] Unit tests for model validation
- [ ] Git commit: "feat(pacing): Phase 1 - Data models and migrations"

**Exit Criteria:**
- All models pass validation tests
- Migration script runs without errors
- Seed data generates correctly
- No breaking changes to existing code

---

## Phase 2: Schedule Generation Logic

### Objectives
- Implement schedule calculation algorithms
- Create service layer for schedule management
- Auto-generate schedules on class creation
- Handle schedule recalculation

### Tasks

#### Task 2.1: Create Schedule Calculation Utility
**File:** `src/utils/schedule-calculator.ts`

**Implementation:**
```typescript
import { addDays, startOfDay, endOfDay } from 'date-fns';
import { ICourseContent } from '@/models/content/CourseContent.model';
import { IClass } from '@/models/academic/Class.model';

export interface CalculatedAvailability {
  availableFrom: Date;
  availableUntil: Date | null;
}

export class ScheduleCalculator {
  /**
   * Calculate availability dates for content based on pacing config
   */
  static calculateAvailability(
    classDoc: IClass,
    courseContent: ICourseContent
  ): CalculatedAvailability {
    const pacing = courseContent.pacingConfig;

    // Default: always available
    if (!pacing || pacing.type === 'always-available') {
      return {
        availableFrom: startOfDay(classDoc.startDate),
        availableUntil: endOfDay(classDoc.endDate)
      };
    }

    // Fixed dates
    if (pacing.type === 'fixed') {
      return {
        availableFrom: pacing.fixedAvailableFrom!,
        availableUntil: pacing.fixedAvailableUntil || null
      };
    }

    // Relative (week-based)
    if (pacing.type === 'relative') {
      const classStart = startOfDay(classDoc.startDate);
      const startDay = pacing.relativeStartDay || 0;
      const durationDays = pacing.relativeDurationDays || 7;

      const availableFrom = addDays(classStart, startDay);
      const availableUntil = addDays(availableFrom, durationDays);

      return {
        availableFrom: startOfDay(availableFrom),
        availableUntil: endOfDay(availableUntil)
      };
    }

    // Fallback
    return {
      availableFrom: startOfDay(classDoc.startDate),
      availableUntil: endOfDay(classDoc.endDate)
    };
  }

  /**
   * Validate calculated dates are within class bounds
   */
  static validateDateBounds(
    calculated: CalculatedAvailability,
    classDoc: IClass
  ): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    if (calculated.availableFrom < classDoc.startDate) {
      warnings.push(
        `Content available before class starts (${calculated.availableFrom} < ${classDoc.startDate})`
      );
    }

    if (calculated.availableUntil && calculated.availableUntil > classDoc.endDate) {
      warnings.push(
        `Content available after class ends (${calculated.availableUntil} > ${classDoc.endDate})`
      );
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }
}
```

**Estimated Time:** 3-4 hours

---

#### Task 2.2: Create Class Content Schedule Service
**File:** `src/services/academic/class-content-schedule.service.ts`

**Implementation:**
```typescript
import mongoose from 'mongoose';
import ClassContentSchedule, {
  IClassContentSchedule
} from '@/models/academic/ClassContentSchedule.model';
import Class from '@/models/academic/Class.model';
import Course from '@/models/academic/Course.model';
import CourseContent from '@/models/content/CourseContent.model';
import { ScheduleCalculator } from '@/utils/schedule-calculator';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/config/logger';

class ClassContentScheduleService {
  /**
   * Generate schedules for all content in a class
   */
  async generateSchedulesForClass(classId: string): Promise<{
    created: number;
    warnings: string[];
  }> {
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      throw new ApiError(404, 'Class not found');
    }

    const course = await Course.findById(classDoc.courseId);
    if (!course) {
      throw new ApiError(404, 'Course not found');
    }

    // Get all course content
    const courseContents = await CourseContent.find({
      courseId: course._id,
      isActive: true
    }).sort({ sequence: 1 });

    const warnings: string[] = [];
    const schedules: any[] = [];

    for (const courseContent of courseContents) {
      // Calculate availability
      const calculated = ScheduleCalculator.calculateAvailability(
        classDoc,
        courseContent
      );

      // Validate bounds
      const validation = ScheduleCalculator.validateDateBounds(calculated, classDoc);
      if (!validation.valid) {
        warnings.push(...validation.warnings);
      }

      schedules.push({
        classId: classDoc._id,
        courseContentId: courseContent._id,
        contentId: courseContent.contentId,
        moduleNumber: courseContent.moduleNumber,
        availableFrom: calculated.availableFrom,
        availableUntil: calculated.availableUntil,
        originalAvailableFrom: calculated.availableFrom,
        originalAvailableUntil: calculated.availableUntil,
        isOverridden: false,
        isActive: true
      });
    }

    // Bulk insert
    if (schedules.length > 0) {
      await ClassContentSchedule.insertMany(schedules, { ordered: false });
    }

    logger.info(`Generated ${schedules.length} schedules for class ${classId}`);

    return {
      created: schedules.length,
      warnings
    };
  }

  /**
   * Recalculate schedules for a class (preserves overrides)
   */
  async recalculateSchedulesForClass(
    classId: string,
    reason?: string
  ): Promise<{
    recalculated: number;
    overridesPreserved: number;
  }> {
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      throw new ApiError(404, 'Class not found');
    }

    // Get existing schedules
    const schedules = await ClassContentSchedule.find({ classId });

    let recalculated = 0;
    let overridesPreserved = 0;

    for (const schedule of schedules) {
      // Skip overridden schedules
      if (schedule.isOverridden) {
        overridesPreserved++;
        continue;
      }

      // Get course content
      const courseContent = await CourseContent.findById(schedule.courseContentId);
      if (!courseContent) continue;

      // Only recalculate relative-paced content
      if (courseContent.pacingConfig?.type === 'relative') {
        const calculated = ScheduleCalculator.calculateAvailability(
          classDoc,
          courseContent
        );

        schedule.availableFrom = calculated.availableFrom;
        schedule.availableUntil = calculated.availableUntil;
        schedule.originalAvailableFrom = calculated.availableFrom;
        schedule.originalAvailableUntil = calculated.availableUntil;

        await schedule.save();
        recalculated++;
      }
    }

    logger.info(
      `Recalculated ${recalculated} schedules for class ${classId}, preserved ${overridesPreserved} overrides. Reason: ${reason}`
    );

    return { recalculated, overridesPreserved };
  }

  /**
   * Get schedule for a class (grouped by module)
   */
  async getClassSchedule(classId: string) {
    const schedules = await ClassContentSchedule.find({ classId, isActive: true })
      .populate('contentId', 'title type duration')
      .sort({ moduleNumber: 1, availableFrom: 1 });

    // Group by module
    const modules: any = {};

    for (const schedule of schedules) {
      const moduleNum = schedule.moduleNumber || 0;

      if (!modules[moduleNum]) {
        modules[moduleNum] = {
          moduleNumber: moduleNum,
          content: []
        };
      }

      const now = new Date();
      let status: 'upcoming' | 'available' | 'closed' = 'upcoming';

      if (now >= schedule.availableFrom) {
        status = schedule.availableUntil && now > schedule.availableUntil ? 'closed' : 'available';
      }

      modules[moduleNum].content.push({
        scheduleId: schedule._id,
        contentId: schedule.contentId._id,
        contentTitle: (schedule.contentId as any).title,
        contentType: (schedule.contentId as any).type,
        availableFrom: schedule.availableFrom,
        availableUntil: schedule.availableUntil,
        isOverridden: schedule.isOverridden,
        status
      });
    }

    return Object.values(modules);
  }
}

export default new ClassContentScheduleService();
```

**Estimated Time:** 1 day

---

#### Task 2.3: Integrate with Class Creation
**File:** `src/services/academic/class.service.ts`

**Changes:**
```typescript
import classContentScheduleService from './class-content-schedule.service';

class ClassService {
  async createClass(data: any) {
    // Existing class creation logic...
    const newClass = await Class.create(data);

    // NEW: Generate content schedules
    try {
      await classContentScheduleService.generateSchedulesForClass(
        newClass._id.toString()
      );
    } catch (error) {
      logger.warn(`Failed to generate schedules for class ${newClass._id}:`, error);
      // Don't fail class creation if schedule generation fails
    }

    return newClass;
  }
}
```

**Estimated Time:** 2-3 hours

---

### Phase 2 Deliverables

- [ ] `schedule-calculator.ts` utility created
- [ ] `class-content-schedule.service.ts` created
- [ ] Integration with class creation
- [ ] Unit tests for calculation logic
- [ ] Integration tests for schedule generation
- [ ] Git commit: "feat(pacing): Phase 2 - Schedule generation logic"

**Exit Criteria:**
- Schedule calculations are accurate
- Schedules generated on class creation
- Recalculation preserves overrides
- All tests passing

---

## Phase 3: Access Control Integration

### Objectives
- Implement learner access checks
- Create middleware for content access control
- Integrate with existing content delivery endpoints
- Handle edge cases (late enrollment, closed content)

### Tasks

#### Task 3.1: Create Access Control Service
**File:** `src/services/content/content-access.service.ts`

**Implementation:**
```typescript
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import ClassContentSchedule from '@/models/academic/ClassContentSchedule.model';
import Class from '@/models/academic/Class.model';

export interface AccessCheckResult {
  canAccess: boolean;
  reason?: string;
  availableAt?: Date;
  availableUntil?: Date | null;
}

class ContentAccessService {
  async checkLearnerAccess(
    learnerId: string,
    contentId: string,
    classId: string
  ): Promise<AccessCheckResult> {
    // 1. Check enrollment
    const enrollment = await ClassEnrollment.findOne({
      learnerId,
      classId,
      status: { $in: ['enrolled', 'active'] }
    });

    if (!enrollment) {
      return {
        canAccess: false,
        reason: 'Not enrolled in class'
      };
    }

    // 2. Check class is active
    const classDoc = await Class.findById(classId);
    if (!classDoc || !classDoc.isActive) {
      return {
        canAccess: false,
        reason: 'Class is not active'
      };
    }

    // 3. Check content schedule
    const schedule = await ClassContentSchedule.findOne({
      classId,
      contentId,
      isActive: true
    });

    // No schedule = always available (backward compatibility)
    if (!schedule) {
      return { canAccess: true };
    }

    const now = new Date();

    // Check if available yet
    if (now < schedule.availableFrom) {
      return {
        canAccess: false,
        reason: 'Content not yet available',
        availableAt: schedule.availableFrom,
        availableUntil: schedule.availableUntil
      };
    }

    // Check if still available
    if (schedule.availableUntil && now > schedule.availableUntil) {
      // Late access policy
      if (classDoc.allowLateAccess) {
        return { canAccess: true };
      }

      return {
        canAccess: false,
        reason: 'Content availability period has ended',
        availableAt: schedule.availableFrom,
        availableUntil: schedule.availableUntil
      };
    }

    return {
      canAccess: true,
      availableAt: schedule.availableFrom,
      availableUntil: schedule.availableUntil
    };
  }
}

export default new ContentAccessService();
```

**Estimated Time:** 4-5 hours

---

#### Task 3.2: Create Access Control Middleware
**File:** `src/middlewares/check-content-access.ts`

**Implementation:**
```typescript
import { Request, Response, NextFunction } from 'express';
import contentAccessService from '@/services/content/content-access.service';
import { ApiError } from '@/utils/ApiError';

export const checkContentAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const learnerId = req.user!.userId;
    const { contentId, classId } = req.params;

    const accessCheck = await contentAccessService.checkLearnerAccess(
      learnerId,
      contentId,
      classId
    );

    if (!accessCheck.canAccess) {
      throw new ApiError(403, accessCheck.reason || 'Access denied', {
        availableAt: accessCheck.availableAt,
        availableUntil: accessCheck.availableUntil
      });
    }

    // Store access info in request for use in controller
    req.contentAccess = accessCheck;

    next();
  } catch (error) {
    next(error);
  }
};
```

**Estimated Time:** 2 hours

---

#### Task 3.3: Update Content Routes
**File:** `src/routes/content.routes.ts`

**Changes:**
```typescript
import { checkContentAccess } from '@/middlewares/check-content-access';

// Add middleware to content access endpoints
router.get(
  '/classes/:classId/content/:contentId',
  authenticate,
  checkContentAccess,  // NEW
  contentController.getContent
);

router.post(
  '/classes/:classId/content/:contentId/launch',
  authenticate,
  checkContentAccess,  // NEW
  contentController.launchContent
);
```

**Estimated Time:** 1-2 hours

---

### Phase 3 Deliverables

- [ ] `content-access.service.ts` created
- [ ] `check-content-access.ts` middleware created
- [ ] Integration with content routes
- [ ] Unit tests for access checks
- [ ] Integration tests for access denial
- [ ] Git commit: "feat(pacing): Phase 3 - Access control integration"

**Exit Criteria:**
- Learners blocked from unavailable content
- Proper error messages returned
- Late access policy respected
- All tests passing

---

## Phase 4: Instructor Management APIs

### Objectives
- Create API endpoints for schedule management
- Enable instructor overrides
- Implement schedule recalculation
- Add audit logging

### Tasks

#### Task 4.1: Create Contracts
**File:** `contracts/api/class-content-schedule.contract.ts`

**Implementation:**
```typescript
import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');
const isoDateSchema = z.string().datetime();

export const getClassScheduleSchema = z.object({
  params: z.object({
    classId: objectIdSchema
  }),
  query: z.object({
    moduleNumber: z.coerce.number().int().positive().optional(),
    includeInactive: z.coerce.boolean().optional()
  })
});

export const recalculateScheduleSchema = z.object({
  params: z.object({
    classId: objectIdSchema
  }),
  body: z.object({
    reason: z.string().min(10).max(500)
  })
});

export const overrideScheduleSchema = z.object({
  params: z.object({
    classId: objectIdSchema,
    scheduleId: objectIdSchema
  }),
  body: z.object({
    availableFrom: isoDateSchema,
    availableUntil: isoDateSchema.nullable(),
    reason: z.string().min(10).max(500)
  })
});

export const resetScheduleSchema = z.object({
  params: z.object({
    classId: objectIdSchema,
    scheduleId: objectIdSchema
  }),
  body: z.object({
    reason: z.string().min(10).max(500).optional()
  })
});

export const getAccessStatusSchema = z.object({
  params: z.object({
    classId: objectIdSchema,
    contentId: objectIdSchema
  })
});
```

**Estimated Time:** 2-3 hours

---

#### Task 4.2: Create Controller
**File:** `src/controllers/academic/class-content-schedule.controller.ts`

**Implementation:**
```typescript
import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import classContentScheduleService from '@/services/academic/class-content-schedule.service';
import contentAccessService from '@/services/content/content-access.service';
import ClassContentSchedule from '@/models/academic/ClassContentSchedule.model';
import { ApiError } from '@/utils/ApiError';

export const getClassSchedule = asyncHandler(async (req: Request, res: Response) => {
  const { classId } = req.params;
  const { moduleNumber } = req.query;

  const schedule = await classContentScheduleService.getClassSchedule(classId);

  // Filter by module if specified
  const filteredSchedule = moduleNumber
    ? schedule.filter((m: any) => m.moduleNumber === Number(moduleNumber))
    : schedule;

  res.json({
    success: true,
    data: {
      classId,
      modules: filteredSchedule
    }
  });
});

export const recalculateSchedule = asyncHandler(async (req: Request, res: Response) => {
  const { classId } = req.params;
  const { reason } = req.body;

  const result = await classContentScheduleService.recalculateSchedulesForClass(
    classId,
    reason
  );

  res.json({
    success: true,
    data: result,
    message: 'Content schedule recalculated successfully'
  });
});

export const overrideSchedule = asyncHandler(async (req: Request, res: Response) => {
  const { classId, scheduleId } = req.params;
  const { availableFrom, availableUntil, reason } = req.body;
  const staffId = req.user!.userId;

  const schedule = await ClassContentSchedule.findOne({ _id: scheduleId, classId });

  if (!schedule) {
    throw new ApiError(404, 'Schedule not found');
  }

  schedule.availableFrom = new Date(availableFrom);
  schedule.availableUntil = availableUntil ? new Date(availableUntil) : null;
  schedule.isOverridden = true;
  schedule.overriddenBy = staffId;
  schedule.overriddenAt = new Date();
  schedule.overrideReason = reason;

  await schedule.save();

  res.json({
    success: true,
    data: {
      scheduleId: schedule._id,
      availableFrom: schedule.availableFrom,
      availableUntil: schedule.availableUntil,
      isOverridden: schedule.isOverridden,
      overriddenBy: schedule.overriddenBy,
      overriddenAt: schedule.overriddenAt
    },
    message: 'Schedule override applied successfully'
  });
});

export const resetSchedule = asyncHandler(async (req: Request, res: Response) => {
  const { classId, scheduleId } = req.params;

  const schedule = await ClassContentSchedule.findOne({ _id: scheduleId, classId });

  if (!schedule) {
    throw new ApiError(404, 'Schedule not found');
  }

  // Reset to original values
  schedule.availableFrom = schedule.originalAvailableFrom;
  schedule.availableUntil = schedule.originalAvailableUntil;
  schedule.isOverridden = false;
  schedule.overriddenBy = undefined;
  schedule.overriddenAt = undefined;
  schedule.overrideReason = undefined;

  await schedule.save();

  res.json({
    success: true,
    data: {
      scheduleId: schedule._id,
      availableFrom: schedule.availableFrom,
      availableUntil: schedule.availableUntil,
      isOverridden: schedule.isOverridden
    },
    message: 'Schedule reset to template successfully'
  });
});

export const getAccessStatus = asyncHandler(async (req: Request, res: Response) => {
  const { classId, contentId } = req.params;
  const learnerId = req.user!.userId;

  const accessCheck = await contentAccessService.checkLearnerAccess(
    learnerId,
    contentId,
    classId
  );

  res.json({
    success: true,
    data: accessCheck
  });
});
```

**Estimated Time:** 5-6 hours

---

#### Task 4.3: Create Routes
**File:** `src/routes/class-content-schedule.routes.ts`

**Implementation:**
```typescript
import { Router } from 'express';
import * as controller from '@/controllers/academic/class-content-schedule.controller';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validateRequest } from '@/middlewares/validateRequest';
import * as schema from '@contracts/api/class-content-schedule.contract';

const router = Router();
router.use(authenticate);

router.get(
  '/:classId/content-schedule',
  authorize('classes:read'),
  validateRequest(schema.getClassScheduleSchema),
  controller.getClassSchedule
);

router.post(
  '/:classId/content-schedule/recalculate',
  authorize('classes:update'),
  validateRequest(schema.recalculateScheduleSchema),
  controller.recalculateSchedule
);

router.put(
  '/:classId/content-schedule/:scheduleId',
  authorize('classes:update'),
  validateRequest(schema.overrideScheduleSchema),
  controller.overrideSchedule
);

router.post(
  '/:classId/content-schedule/:scheduleId/reset',
  authorize('classes:update'),
  validateRequest(schema.resetScheduleSchema),
  controller.resetSchedule
);

router.get(
  '/:classId/content/:contentId/access-status',
  validateRequest(schema.getAccessStatusSchema),
  controller.getAccessStatus
);

export default router;
```

**Estimated Time:** 2 hours

---

### Phase 4 Deliverables

- [ ] API contracts created
- [ ] Controller implemented
- [ ] Routes configured
- [ ] Integration tests for all endpoints
- [ ] Audit logging implemented
- [ ] Git commit: "feat(pacing): Phase 4 - Instructor management APIs"

**Exit Criteria:**
- All endpoints functional
- Overrides persist correctly
- Recalculation preserves overrides
- Authorization checks working
- All tests passing

---

## Phase 5: Course Template Pacing

### Objectives
- Create API for course pacing configuration
- Enable bulk module pacing updates
- Validate pacing configurations

### Tasks

#### Task 5.1: Create Pacing Config Endpoint
**File:** `contracts/api/course-content-pacing.contract.ts`
**File:** `src/controllers/content/course-content-pacing.controller.ts`
**File:** `src/routes/course-content-pacing.routes.ts`

**Estimated Time:** 1 day

---

### Phase 5 Deliverables

- [ ] Course pacing config API created
- [ ] Bulk update functionality
- [ ] Validation for pacing types
- [ ] Integration tests
- [ ] Git commit: "feat(pacing): Phase 5 - Course template pacing"

---

## Phase 6: Testing & Documentation

### Objectives
- Comprehensive test coverage
- API documentation
- User guides for instructors
- Migration tools for existing classes

### Tasks

#### Task 6.1: Unit Tests
- Schedule calculation logic (all pacing types)
- Date validation
- Access control logic

**Estimated Time:** 2 days

---

#### Task 6.2: Integration Tests
- Class creation with schedule generation
- Access denial scenarios
- Override persistence
- Recalculation with overrides

**Estimated Time:** 2 days

---

#### Task 6.3: E2E Tests
- Instructor configures pacing
- Learner blocked from unavailable content
- Learner accesses available content
- Class dates changed, schedules updated

**Estimated Time:** 1 day

---

#### Task 6.4: Documentation
- API documentation (OpenAPI/Swagger)
- Instructor guide: "How to configure class pacing"
- Migration guide: "Enabling pacing for existing classes"

**Estimated Time:** 1 day

---

### Phase 6 Deliverables

- [ ] 100+ unit tests passing
- [ ] 50+ integration tests passing
- [ ] 10+ E2E tests passing
- [ ] API documentation complete
- [ ] User guides created
- [ ] Git commit: "feat(pacing): Phase 6 - Testing and documentation"

---

## Rollout Strategy

### Week 1-2: Internal Testing
- Deploy to staging environment
- Internal QA testing
- Fix bugs and edge cases

### Week 3: Beta Testing
- Enable for 5-10 pilot classes
- Gather instructor feedback
- Monitor performance and errors

### Week 4: Gradual Rollout
- Enable for 25% of new classes
- Monitor adoption and issues
- Expand to 50%, then 100%

### Week 5: Existing Class Migration
- Provide self-service migration tool
- Department-by-department adoption
- Support team assistance

---

## Success Metrics

### Technical Metrics
- [ ] 0 critical bugs in production
- [ ] < 100ms access check latency (p95)
- [ ] < 2s schedule generation for 200+ content items
- [ ] 95%+ test coverage for new code

### Adoption Metrics
- [ ] 50+ classes using pacing within 1 month
- [ ] 80% instructor satisfaction (survey)
- [ ] < 5% of instructors disable pacing after enabling

### Learner Experience Metrics
- [ ] Clear "available on [date]" messaging
- [ ] < 1% support tickets related to access confusion
- [ ] Positive feedback on structured learning experience

---

## Risk Mitigation

### Risk 1: Performance Impact
**Mitigation:**
- Comprehensive caching strategy
- Database indexing
- Load testing before rollout

### Risk 2: Instructor Confusion
**Mitigation:**
- Clear UI/UX for pacing config
- Video tutorials
- In-app help text

### Risk 3: Data Migration Issues
**Mitigation:**
- Dry-run mode for migrations
- Rollback plan
- Backup before migration

### Risk 4: Learner Access Issues
**Mitigation:**
- Instructor override capability
- Support team escalation path
- Clear error messages

---

## Open Questions for Approval

1. **Priority:** Which phases are MVP (must-have) vs nice-to-have?
2. **Timeline:** Is 3-5 week timeline acceptable?
3. **Resources:** Will this be solo implementation or team effort?
4. **Testing:** Should we create automated E2E tests or manual QA?
5. **Documentation:** What level of user documentation is needed?

---

## Approval Checklist

- [ ] Implementation phases approved
- [ ] Timeline approved
- [ ] Resource allocation confirmed
- [ ] Testing strategy approved
- [ ] Rollout plan approved
- [ ] Ready to begin Phase 1

---

**Next Steps:**
1. Human reviews and approves implementation plan
2. Create UI Changes Document for frontend team
3. Begin Phase 1 implementation
4. Daily/weekly progress updates
