# Prerequisite System - Implementation Plan

**Document Type:** Implementation Plan (Core System)
**Created:** 2026-01-16
**Status:** DRAFT - Awaiting Approval
**Priority:** CRITICAL - Phase 1 (Foundation)
**Feature Type:** CORE/FREE (Always Available)
**Related Documents:**
- CONTENT_UNLOCKING_ARCHITECTURE.md (Architecture overview)
- PREREQUISITE_SYSTEM_DESIGN.md (Design specification)
- PREREQUISITE_SYSTEM_UI_CHANGES.md (UI specification)
**Estimated Effort:** 3-4 weeks (phased)

---

## Implementation Philosophy

**Incremental Delivery Strategy:**
- Each phase delivers working, testable functionality
- No breaking changes to existing systems
- Opt-in adoption for courses (instructors enable prerequisites)
- Extensive testing at each phase

**Risk Mitigation:**
- Backward compatible (courses without prerequisites continue working)
- Feature can be disabled per course/class
- Comprehensive testing before rollout
- Rollback plan for each phase

---

## Phase Overview

| Phase | Description | Effort | Dependencies | Deliverable |
|-------|-------------|--------|--------------|-------------|
| **Phase 1** | Data Models & Migrations | 4-5 days | None | Models, migrations, seeds |
| **Phase 2** | Prerequisite Checking Logic | 4-6 days | Phase 1 | Service layer, algorithms |
| **Phase 3** | Access Control Integration | 3-4 days | Phase 2 | Middleware, access checks |
| **Phase 4** | API Endpoints | 5-7 days | Phase 3 | 11 endpoints, contracts |
| **Phase 5** | Progress Warnings System | 3-4 days | Phase 4 | Warning engine, config |
| **Phase 6** | Prerequisite Overrides | 3-4 days | Phase 4 | Request/approval flow |
| **Phase 7** | Flow Diagram Generator | 2-3 days | Phase 4 | Graph algorithm, API |
| **Phase 8** | Testing & Documentation | 4-6 days | All phases | Tests, docs, migration |

**Total Estimated Time:** 28-39 days (4-6 weeks)

---

## Phase 1: Data Models & Migrations

### Objectives
- Extend existing models with prerequisite fields
- Implement course versioning
- Create progress warning configuration
- Create database migrations
- Seed test data

---

### Task 1.1: Extend CourseContent Model

**File:** `src/models/content/CourseContent.model.ts`

**Changes:**

```typescript
import mongoose, { Schema, Document } from 'mongoose';

// NEW: Prerequisite configuration schema
const prerequisiteConfigSchema = new Schema(
  {
    type: {
      type: String,
      enum: {
        values: ['none', 'sequential', 'specific', 'any-of'],
        message: '{VALUE} is not a valid prerequisite type'
      },
      default: 'none'
    },

    // Sequential prerequisites
    sequential: {
      enabled: { type: Boolean, default: false },
      mustComplete: { type: Boolean, default: true },
      minimumScore: {
        type: Number,
        min: [0, 'Minimum score cannot be negative'],
        max: [100, 'Minimum score cannot exceed 100']
      },
      mustPass: { type: Boolean, default: false }
    },

    // Specific prerequisites
    specific: {
      contentIds: {
        type: [Schema.Types.ObjectId],
        ref: 'Content',
        default: []
      },
      requireAll: { type: Boolean, default: true },
      minimumScore: {
        type: Number,
        min: [0, 'Minimum score cannot be negative'],
        max: [100, 'Minimum score cannot exceed 100']
      },
      mustPass: { type: Boolean, default: false }
    },

    // Any-of prerequisites
    anyOf: {
      contentIds: {
        type: [Schema.Types.ObjectId],
        ref: 'Content',
        default: []
      },
      minimumRequired: {
        type: Number,
        min: [1, 'Must require at least 1 item']
      },
      minimumScore: {
        type: Number,
        min: [0, 'Minimum score cannot be negative'],
        max: [100, 'Minimum score cannot exceed 100']
      }
    }
  },
  { _id: false }
);

export interface ICourseContent extends Document {
  // ... existing fields ...

  // NEW: Prerequisites
  prerequisites?: {
    type: 'none' | 'sequential' | 'specific' | 'any-of';
    sequential?: {
      enabled: boolean;
      mustComplete: boolean;
      minimumScore?: number;
      mustPass?: boolean;
    };
    specific?: {
      contentIds: mongoose.Types.ObjectId[];
      requireAll: boolean;
      minimumScore?: number;
      mustPass?: boolean;
    };
    anyOf?: {
      contentIds: mongoose.Types.ObjectId[];
      minimumRequired: number;
      minimumScore?: number;
    };
  };

  // NEW: Suggested timeline (advisory)
  suggestedWeek?: number;
  estimatedDuration?: number;  // Minutes

  // NEW: Versioning support
  prerequisitesUpdatedAt?: Date;
  prerequisitesUpdatedBy?: mongoose.Types.ObjectId;
}

// Add to schema
courseContentSchema.add({
  prerequisites: {
    type: prerequisiteConfigSchema,
    default: { type: 'none' }
  },
  suggestedWeek: {
    type: Number,
    min: [1, 'Week must be at least 1']
  },
  estimatedDuration: {
    type: Number,
    min: [0, 'Duration cannot be negative']
  },
  prerequisitesUpdatedAt: Date,
  prerequisitesUpdatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Staff'
  }
});

// Validation
courseContentSchema.pre('save', function (next) {
  const prereqs = this.prerequisites;

  if (!prereqs || prereqs.type === 'none') {
    return next();
  }

  // Validate sequential
  if (prereqs.type === 'sequential' && !prereqs.sequential) {
    return next(new Error('Sequential prerequisites require configuration'));
  }

  // Validate specific
  if (prereqs.type === 'specific') {
    if (!prereqs.specific || prereqs.specific.contentIds.length === 0) {
      return next(new Error('Specific prerequisites require at least one content ID'));
    }
  }

  // Validate any-of
  if (prereqs.type === 'any-of') {
    if (!prereqs.anyOf || prereqs.anyOf.contentIds.length === 0) {
      return next(new Error('Any-of prerequisites require content IDs'));
    }
    if (prereqs.anyOf.minimumRequired > prereqs.anyOf.contentIds.length) {
      return next(new Error('Minimum required cannot exceed available items'));
    }
  }

  next();
});

// Index for prerequisite queries
courseContentSchema.index({ 'prerequisites.specific.contentIds': 1 });
courseContentSchema.index({ 'prerequisites.anyOf.contentIds': 1 });
```

**Estimated Time:** 3-4 hours

---

### Task 1.2: Extend Course Model (Versioning)

**File:** `src/models/academic/Course.model.ts`

**Changes:**

```typescript
export interface ICourse extends Document {
  // ... existing fields ...

  // NEW: Versioning
  version: number;
  isCurrentVersion: boolean;
  previousVersionId?: mongoose.Types.ObjectId;
  versionCreatedAt: Date;
  versionCreatedBy?: mongoose.Types.ObjectId;
  versionChangeReason?: string;
}

courseSchema.add({
  version: {
    type: Number,
    required: true,
    default: 1,
    min: [1, 'Version must be at least 1']
  },
  isCurrentVersion: {
    type: Boolean,
    default: true,
    index: true
  },
  previousVersionId: {
    type: Schema.Types.ObjectId,
    ref: 'Course'
  },
  versionCreatedAt: {
    type: Date,
    default: Date.now
  },
  versionCreatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Staff'
  },
  versionChangeReason: {
    type: String,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  }
});

// Compound index: only one current version per course
courseSchema.index(
  { departmentId: 1, code: 1, isCurrentVersion: 1 },
  { unique: true, partialFilterExpression: { isCurrentVersion: true } }
);
```

**Estimated Time:** 2 hours

---

### Task 1.3: Extend Class Model

**File:** `src/models/academic/Class.model.ts`

**Changes:**

```typescript
export interface IClass extends Document {
  // ... existing fields ...

  // NEW: Link to specific course version
  courseVersion: number;
}

classSchema.add({
  courseVersion: {
    type: Number,
    required: true,
    default: 1
  }
});

// Update index to include version
classSchema.index({ courseId: 1, courseVersion: 1, academicYearId: 1, termCode: 1 });
```

**Estimated Time:** 1 hour

---

### Task 1.4: Extend ClassEnrollment Model

**File:** `src/models/enrollment/ClassEnrollment.model.ts`

**Changes:**

```typescript
// NEW: Prerequisite override subdocument
const prerequisiteOverrideSchema = new Schema(
  {
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content',
      required: true
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true
    },
    requestedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    requestReason: {
      type: String,
      required: true,
      minlength: [10, 'Reason must be at least 10 characters'],
      maxlength: [1000, 'Reason cannot exceed 1000 characters']
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'denied'],
        message: '{VALUE} is not a valid status'
      },
      required: true,
      default: 'pending'
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff'
    },
    reviewedAt: Date,
    reviewNotes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
  },
  { _id: true }
);

export interface IClassEnrollment extends Document {
  // ... existing fields ...

  // NEW: Deadline management
  customEndDate?: Date;
  extensionGrantedBy?: mongoose.Types.ObjectId;
  extensionReason?: string;
  extensionGrantedAt?: Date;

  // NEW: Prerequisite overrides
  prerequisiteOverrides?: [{
    _id: mongoose.Types.ObjectId;
    contentId: mongoose.Types.ObjectId;
    requestedBy: mongoose.Types.ObjectId;
    requestedAt: Date;
    requestReason: string;
    status: 'pending' | 'approved' | 'denied';
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    reviewNotes?: string;
  }];
}

ClassEnrollmentSchema.add({
  customEndDate: Date,
  extensionGrantedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Staff'
  },
  extensionReason: {
    type: String,
    maxlength: [1000, 'Reason cannot exceed 1000 characters']
  },
  extensionGrantedAt: Date,
  prerequisiteOverrides: [prerequisiteOverrideSchema]
});

// Index for override queries
ClassEnrollmentSchema.index({ 'prerequisiteOverrides.status': 1 });
ClassEnrollmentSchema.index({ 'prerequisiteOverrides.contentId': 1 });
```

**Estimated Time:** 2-3 hours

---

### Task 1.5: Extend Department Model (Progress Warnings)

**File:** `src/models/organization/Department.model.ts`

**Changes:**

```typescript
// NEW: Progress warning threshold subdocument
const warningThresholdSchema = new Schema(
  {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    severity: {
      type: String,
      enum: {
        values: ['info', 'warning', 'critical'],
        message: '{VALUE} is not a valid severity'
      },
      required: true
    },
    condition: {
      type: {
        type: String,
        enum: ['time-elapsed', 'content-remaining', 'custom'],
        required: true
      },
      timeElapsedPercent: {
        type: Number,
        min: [0, 'Percent cannot be negative'],
        max: [100, 'Percent cannot exceed 100']
      },
      contentCompletePercent: {
        type: Number,
        min: [0, 'Percent cannot be negative'],
        max: [100, 'Percent cannot exceed 100']
      },
      daysRemaining: {
        type: Number,
        min: [0, 'Days cannot be negative']
      },
      contentRemainingPercent: {
        type: Number,
        min: [0, 'Percent cannot be negative'],
        max: [100, 'Percent cannot exceed 100']
      },
      customFormula: String
    },
    message: {
      type: String,
      required: true,
      maxlength: [500, 'Message cannot exceed 500 characters']
    },
    actionPrompt: {
      type: String,
      maxlength: [200, 'Action prompt cannot exceed 200 characters']
    },
    notifyInstructor: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

export interface IDepartment extends Document {
  // ... existing fields ...

  // NEW: Progress warnings configuration
  progressWarnings?: {
    enabled: boolean;
    thresholds: [{
      id: string;
      name: string;
      severity: 'info' | 'warning' | 'critical';
      condition: {
        type: 'time-elapsed' | 'content-remaining' | 'custom';
        timeElapsedPercent?: number;
        contentCompletePercent?: number;
        daysRemaining?: number;
        contentRemainingPercent?: number;
        customFormula?: string;
      };
      message: string;
      actionPrompt?: string;
      notifyInstructor?: boolean;
    }];
  };
}

departmentSchema.add({
  progressWarnings: {
    enabled: {
      type: Boolean,
      default: false
    },
    thresholds: [warningThresholdSchema]
  }
});
```

**Estimated Time:** 2-3 hours

---

### Task 1.6: Create Migration Scripts

**File:** `scripts/migrations/2026-01-16-add-prerequisites.ts`

```typescript
import mongoose from 'mongoose';
import { connectDatabase } from '@/config/database';
import CourseContent from '@/models/content/CourseContent.model';
import Course from '@/models/academic/Course.model';
import Class from '@/models/academic/Class.model';

async function migrate() {
  await connectDatabase();

  console.log('Starting prerequisite system migration...');

  // 1. Add default prerequisites to existing CourseContent
  const contentResult = await CourseContent.updateMany(
    { prerequisites: { $exists: false } },
    { $set: { prerequisites: { type: 'none' } } }
  );
  console.log(`Updated ${contentResult.modifiedCount} CourseContent records`);

  // 2. Add versioning to existing Courses
  const courseResult = await Course.updateMany(
    { version: { $exists: false } },
    {
      $set: {
        version: 1,
        isCurrentVersion: true,
        versionCreatedAt: new Date()
      }
    }
  );
  console.log(`Updated ${courseResult.modifiedCount} Course records`);

  // 3. Add courseVersion to existing Classes
  const classes = await Class.find({ courseVersion: { $exists: false } });
  for (const classDoc of classes) {
    const course = await Course.findById(classDoc.courseId);
    if (course) {
      classDoc.courseVersion = course.version;
      await classDoc.save();
    }
  }
  console.log(`Updated ${classes.length} Class records`);

  console.log('Migration complete!');
  process.exit(0);
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
```

**Estimated Time:** 2-3 hours

---

### Task 1.7: Create Seed Data

**File:** `scripts/seed-prerequisites-test-data.ts`

```typescript
// Create test course with various prerequisite types
// - Sequential modules
// - Specific prerequisites
// - Any-of prerequisites
// - Mixed configurations

// Create test classes with different states
// Create test enrollments with various progress levels
```

**Estimated Time:** 3-4 hours

---

### Phase 1 Deliverables

- [ ] CourseContent model extended with prerequisites
- [ ] Course model extended with versioning
- [ ] Class model links to course version
- [ ] ClassEnrollment extended with overrides and extensions
- [ ] Department extended with progress warnings config
- [ ] Migration scripts created and tested
- [ ] Seed data created
- [ ] Unit tests for model validation
- [ ] Git commit: "feat(prerequisites): Phase 1 - Data models and migrations"

**Exit Criteria:**
- All models pass validation tests
- Migration script runs without errors
- Seed data generates correctly
- No breaking changes to existing functionality

**Estimated Phase Duration:** 4-5 days

---

## Phase 2: Prerequisite Checking Logic

### Objectives
- Implement prerequisite checking algorithms
- Create service layer for prerequisite management
- Handle all prerequisite types (sequential, specific, any-of)
- Implement caching for performance

---

### Task 2.1: Create Prerequisite Checking Service

**File:** `src/services/content/prerequisite.service.ts`

**Implementation:** (Comprehensive service with all prerequisite types)

```typescript
import mongoose from 'mongoose';
import CourseContent from '@/models/content/CourseContent.model';
import ContentAttempt from '@/models/content/ContentAttempt.model';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/config/logger';
import { cacheService } from '@/services/cache.service';

export interface PrerequisiteCheckResult {
  met: boolean;
  missing?: Array<{
    contentId?: string;
    contentTitle?: string;
    reason: string;
    currentScore?: number;
    requiredScore?: number;
  }>;
}

class PrerequisiteService {
  /**
   * Main entry point for prerequisite checking
   */
  async checkPrerequisites(
    learnerId: string,
    classId: string,
    courseContent: any
  ): Promise<PrerequisiteCheckResult> {
    // No prerequisites = always accessible
    if (!courseContent.prerequisites || courseContent.prerequisites.type === 'none') {
      return { met: true };
    }

    // Check cache first
    const cacheKey = `prereq:${learnerId}:${courseContent._id}:${classId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const prereqs = courseContent.prerequisites;
    let result: PrerequisiteCheckResult;

    // Route to appropriate checker
    switch (prereqs.type) {
      case 'sequential':
        result = await this.checkSequentialPrerequisites(
          learnerId,
          classId,
          courseContent,
          prereqs.sequential
        );
        break;
      case 'specific':
        result = await this.checkSpecificPrerequisites(
          learnerId,
          classId,
          prereqs.specific
        );
        break;
      case 'any-of':
        result = await this.checkAnyOfPrerequisites(
          learnerId,
          classId,
          prereqs.anyOf
        );
        break;
      default:
        result = { met: true };
    }

    // Cache for 5 minutes
    await cacheService.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  /**
   * Check sequential prerequisites (must complete previous in sequence)
   */
  private async checkSequentialPrerequisites(
    learnerId: string,
    classId: string,
    currentContent: any,
    config: any
  ): Promise<PrerequisiteCheckResult> {
    // Get previous content in sequence
    const previousContent = await CourseContent.findOne({
      courseId: currentContent.courseId,
      sequence: currentContent.sequence - 1
    }).populate('contentId');

    if (!previousContent) {
      return { met: true }; // First item in sequence
    }

    // Check if previous content is completed
    const attempt = await ContentAttempt.findOne({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      classId: new mongoose.Types.ObjectId(classId),
      contentId: previousContent.contentId,
      status: 'completed'
    });

    if (!attempt) {
      return {
        met: false,
        missing: [
          {
            contentId: previousContent.contentId._id.toString(),
            contentTitle: (previousContent.contentId as any).title,
            reason: 'Must complete previous content in sequence'
          }
        ]
      };
    }

    // Check score requirements
    if (config.minimumScore && attempt.score < config.minimumScore) {
      return {
        met: false,
        missing: [
          {
            contentId: previousContent.contentId._id.toString(),
            contentTitle: (previousContent.contentId as any).title,
            reason: `Must score at least ${config.minimumScore}%`,
            currentScore: attempt.score,
            requiredScore: config.minimumScore
          }
        ]
      };
    }

    if (config.mustPass && !attempt.passed) {
      return {
        met: false,
        missing: [
          {
            contentId: previousContent.contentId._id.toString(),
            contentTitle: (previousContent.contentId as any).title,
            reason: 'Must pass previous content',
            currentScore: attempt.score
          }
        ]
      };
    }

    return { met: true };
  }

  /**
   * Check specific prerequisites (AND or OR logic)
   */
  private async checkSpecificPrerequisites(
    learnerId: string,
    classId: string,
    config: any
  ): Promise<PrerequisiteCheckResult> {
    const attempts = await ContentAttempt.find({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      classId: new mongoose.Types.ObjectId(classId),
      contentId: { $in: config.contentIds },
      status: 'completed'
    });

    const completedIds = attempts.map((a) => a.contentId.toString());
    const missingIds = config.contentIds.filter(
      (id: any) => !completedIds.includes(id.toString())
    );

    // Check if all required (AND logic)
    if (config.requireAll && missingIds.length > 0) {
      const missingContent = await CourseContent.find({
        contentId: { $in: missingIds }
      }).populate('contentId');

      return {
        met: false,
        missing: missingContent.map((c: any) => ({
          contentId: c.contentId._id.toString(),
          contentTitle: c.contentId.title,
          reason: 'Required to unlock this content'
        }))
      };
    }

    // Check if any required (OR logic)
    if (!config.requireAll && completedIds.length === 0) {
      return {
        met: false,
        missing: [
          {
            reason: 'Must complete at least one of the prerequisite items'
          }
        ]
      };
    }

    // Check score requirements
    if (config.minimumScore) {
      const failedScore = attempts.find((a) => a.score < config.minimumScore);
      if (failedScore) {
        return {
          met: false,
          missing: [
            {
              reason: `Minimum score of ${config.minimumScore}% required on all prerequisites`,
              requiredScore: config.minimumScore
            }
          ]
        };
      }
    }

    return { met: true };
  }

  /**
   * Check any-of prerequisites (must complete N of M items)
   */
  private async checkAnyOfPrerequisites(
    learnerId: string,
    classId: string,
    config: any
  ): Promise<PrerequisiteCheckResult> {
    const attempts = await ContentAttempt.find({
      learnerId: new mongoose.Types.ObjectId(learnerId),
      classId: new mongoose.Types.ObjectId(classId),
      contentId: { $in: config.contentIds },
      status: 'completed'
    });

    // Check score requirements
    let qualifyingAttempts = attempts;
    if (config.minimumScore) {
      qualifyingAttempts = attempts.filter((a) => a.score >= config.minimumScore);
    }

    // Check if enough completed
    if (qualifyingAttempts.length < config.minimumRequired) {
      const scoreMessage = config.minimumScore
        ? ` with ${config.minimumScore}% or higher`
        : '';

      return {
        met: false,
        missing: [
          {
            reason: `Must complete at least ${config.minimumRequired} of ${config.contentIds.length} items${scoreMessage} (completed: ${qualifyingAttempts.length})`,
            requiredScore: config.minimumScore
          }
        ]
      };
    }

    return { met: true };
  }

  /**
   * Clear cache when content is completed
   */
  async clearPrerequisiteCache(learnerId: string, classId: string): Promise<void> {
    const pattern = `prereq:${learnerId}:*:${classId}`;
    await cacheService.deletePattern(pattern);
  }
}

export default new PrerequisiteService();
```

**Estimated Time:** 1-2 days

---

### Task 2.2: Create Course Versioning Service

**File:** `src/services/academic/course-version.service.ts`

```typescript
import mongoose from 'mongoose';
import Course from '@/models/academic/Course.model';
import CourseContent from '@/models/content/CourseContent.model';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/config/logger';

class CourseVersionService {
  /**
   * Create new course version when prerequisites change
   */
  async createNewVersion(
    courseId: string,
    staffId: string,
    reason: string
  ): Promise<any> {
    const currentCourse = await Course.findById(courseId);

    if (!currentCourse) {
      throw new ApiError(404, 'Course not found');
    }

    if (!currentCourse.isCurrentVersion) {
      throw new ApiError(400, 'Can only create versions from current version');
    }

    // Mark current as not current
    currentCourse.isCurrentVersion = false;
    await currentCourse.save();

    // Create new version (duplicate course)
    const newVersion = new Course({
      ...currentCourse.toObject(),
      _id: new mongoose.Types.ObjectId(),
      version: currentCourse.version + 1,
      isCurrentVersion: true,
      previousVersionId: currentCourse._id,
      versionCreatedAt: new Date(),
      versionCreatedBy: staffId,
      versionChangeReason: reason
    });

    await newVersion.save();

    // Duplicate course content
    const existingContent = await CourseContent.find({
      courseId: currentCourse._id
    });

    const newContent = existingContent.map((content) => ({
      ...content.toObject(),
      _id: new mongoose.Types.ObjectId(),
      courseId: newVersion._id
    }));

    if (newContent.length > 0) {
      await CourseContent.insertMany(newContent);
    }

    logger.info(
      `Created course version ${newVersion.version} for course ${courseId}. Reason: ${reason}`
    );

    return newVersion;
  }

  /**
   * Check if prerequisite change requires new version
   */
  requiresNewVersion(oldPrereqs: any, newPrereqs: any): boolean {
    // If no existing prerequisites, no version change needed
    if (!oldPrereqs || oldPrereqs.type === 'none') {
      return false;
    }

    // If types differ, version change required
    if (oldPrereqs.type !== newPrereqs.type) {
      return true;
    }

    // Check for meaningful changes within same type
    // (implementation depends on prereq type)
    return true; // Conservative: any change requires version
  }
}

export default new CourseVersionService();
```

**Estimated Time:** 1 day

---

### Phase 2 Deliverables

- [ ] PrerequisiteService implemented
- [ ] All prerequisite types working (sequential, specific, any-of)
- [ ] CourseVersionService implemented
- [ ] Caching implemented
- [ ] Unit tests for all algorithms (50+ tests)
- [ ] Integration tests for service layer
- [ ] Git commit: "feat(prerequisites): Phase 2 - Prerequisite checking logic"

**Exit Criteria:**
- All prerequisite types correctly evaluated
- Performance meets requirements (<50ms per check)
- Cache hit rate >80% in tests
- All unit tests passing

**Estimated Phase Duration:** 4-6 days

---

## Phase 3: Access Control Integration

### Objectives
- Integrate prerequisite checking into content access flow
- Create middleware for access control
- Handle deadline checking
- Implement prerequisite override checking

---

### Task 3.1: Create Content Access Service

**File:** `src/services/content/content-access.service.ts`

```typescript
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import Class from '@/models/academic/Class.model';
import CourseContent from '@/models/content/CourseContent.model';
import prerequisiteService from './prerequisite.service';

export interface AccessCheckResult {
  canAccess: boolean;
  reason?: string;
  message?: string;
  deadline?: Date;
  missingPrerequisites?: any[];
}

class ContentAccessService {
  async checkAccess(
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
        reason: 'not-enrolled',
        message: 'You are not enrolled in this class'
      };
    }

    // 2. Check class deadline
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return {
        canAccess: false,
        reason: 'class-not-found',
        message: 'Class not found'
      };
    }

    const deadline = enrollment.customEndDate || classDoc.endDate;
    if (new Date() > deadline) {
      return {
        canAccess: false,
        reason: 'deadline-passed',
        message: 'Class deadline has passed',
        deadline
      };
    }

    // 3. Check if class is active
    if (!classDoc.isActive) {
      return {
        canAccess: false,
        reason: 'class-inactive',
        message: 'This class is not currently active'
      };
    }

    // 4. Check for prerequisite override (approved)
    const approvedOverride = enrollment.prerequisiteOverrides?.find(
      (o) => o.contentId.toString() === contentId && o.status === 'approved'
    );

    if (approvedOverride) {
      // Override grants access regardless of prerequisites
      return {
        canAccess: true,
        deadline,
        message: 'Access granted via prerequisite override'
      };
    }

    // 5. Check prerequisites
    const courseContent = await CourseContent.findOne({ contentId }).populate('contentId');

    if (!courseContent) {
      return {
        canAccess: false,
        reason: 'content-not-found',
        message: 'Content not found'
      };
    }

    const prereqCheck = await prerequisiteService.checkPrerequisites(
      learnerId,
      classId,
      courseContent
    );

    if (!prereqCheck.met) {
      return {
        canAccess: false,
        reason: 'prerequisites-not-met',
        message: 'You must complete prerequisites first',
        missingPrerequisites: prereqCheck.missing,
        deadline
      };
    }

    // All checks passed
    return {
      canAccess: true,
      deadline
    };
  }
}

export default new ContentAccessService();
```

**Estimated Time:** 1 day

---

### Task 3.2: Create Access Control Middleware

**File:** `src/middlewares/check-content-access.ts`

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

    const accessCheck = await contentAccessService.checkAccess(
      learnerId,
      contentId,
      classId
    );

    if (!accessCheck.canAccess) {
      throw new ApiError(
        403,
        accessCheck.message || 'Access denied',
        {
          reason: accessCheck.reason,
          missingPrerequisites: accessCheck.missingPrerequisites,
          deadline: accessCheck.deadline
        }
      );
    }

    // Store access info in request for use in controller
    req.contentAccess = accessCheck;

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware that allows instructors to bypass prerequisite checks
export const allowInstructorBypass = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { classId } = req.params;
  const userId = req.user!.userId;

  // Check if user is instructor of this class
  const Class = require('@/models/academic/Class.model').default;
  const classDoc = await Class.findById(classId);

  if (classDoc && classDoc.instructorIds.some((id: any) => id.toString() === userId)) {
    // Instructor can access all content
    req.contentAccess = { canAccess: true };
    return next();
  }

  // Not instructor, proceed with normal checks
  return checkContentAccess(req, res, next);
};
```

**Estimated Time:** 4-6 hours

---

### Task 3.3: Update Content Routes

**File:** `src/routes/content.routes.ts`

```typescript
import { checkContentAccess, allowInstructorBypass } from '@/middlewares/check-content-access';

// Add middleware to content access endpoints
router.get(
  '/classes/:classId/content/:contentId',
  authenticate,
  allowInstructorBypass, // NEW: Instructors can view all content
  contentController.getContent
);

router.post(
  '/classes/:classId/content/:contentId/launch',
  authenticate,
  checkContentAccess, // NEW: Learners must pass prerequisite checks
  contentController.launchContent
);

router.post(
  '/classes/:classId/content/:contentId/attempt',
  authenticate,
  checkContentAccess, // NEW: Can't attempt locked content
  contentController.submitAttempt
);
```

**Estimated Time:** 2-3 hours

---

### Phase 3 Deliverables

- [ ] ContentAccessService implemented
- [ ] Access control middleware created
- [ ] Integration with content routes
- [ ] Instructor bypass implemented
- [ ] Unit tests for access logic
- [ ] Integration tests for access control
- [ ] Git commit: "feat(prerequisites): Phase 3 - Access control integration"

**Exit Criteria:**
- Learners blocked from locked content
- Instructors can bypass restrictions
- Proper error messages returned
- All tests passing

**Estimated Phase Duration:** 3-4 days

---

## Phase 4: API Endpoints

(Continuing with controllers, contracts, routes for all 11 endpoints...)

Would you like me to:
1. Continue with Phase 4-8 in this document?
2. Create the UI spec document next?
3. Create the API contract change message for the queue?

This implementation plan is already quite comprehensive. Should I proceed with the remaining phases or move to creating the other documents?
---

## Phase 4: API Endpoints (Summary)

### Objectives
- Create 11 API endpoints for prerequisite system
- Implement contracts with Zod validation
- Create controllers with business logic
- Configure routes with middleware

### Endpoints to Implement

1. ✅ `GET /api/v2/classes/:classId/content/:contentId/access-status`
2. ✅ `GET /api/v2/classes/:classId/progress`
3. ✅ `POST /api/v2/classes/:classId/enrollments/:enrollmentId/extend-deadline`
4. ✅ `PUT /api/v2/courses/:courseId/content/:courseContentId/prerequisites`
5. ✅ `GET /api/v2/courses/:courseId/prerequisites/map`
6. ✅ `POST /api/v2/classes/:classId/enrollments/:enrollmentId/prerequisite-override/request`
7. ✅ `POST /api/v2/classes/:classId/enrollments/:enrollmentId/prerequisite-override/:overrideId/review`
8. ✅ `GET /api/v2/departments/:departmentId/prerequisite-overrides/pending`
9. ✅ `PUT /api/v2/departments/:departmentId/progress-warnings`
10. ✅ `GET /api/v2/classes/:classId/progress/warnings`
11. ✅ `GET /api/v2/courses/:courseId/prerequisites/flow-diagram`

### Files to Create

**Contracts (3 files):**
- `contracts/api/prerequisite-access.contract.ts` (~200 lines)
- `contracts/api/prerequisite-override.contract.ts` (~150 lines)
- `contracts/api/progress-warnings.contract.ts` (~150 lines)

**Controllers (4 files):**
- `src/controllers/content/prerequisite-access.controller.ts` (~300 lines)
- `src/controllers/enrollment/deadline-extension.controller.ts` (~150 lines)
- `src/controllers/enrollment/prerequisite-override.controller.ts` (~250 lines)
- `src/controllers/reporting/progress-warnings.controller.ts` (~200 lines)

**Routes (3 files):**
- `src/routes/prerequisite-access.routes.ts` (~80 lines)
- `src/routes/prerequisite-override.routes.ts` (~60 lines)
- `src/routes/progress-warnings.routes.ts` (~40 lines)

### Key Implementation Notes

- Use existing `validateRequest` middleware with Zod schemas
- Use existing `authenticate` and `authorize` middlewares
- Controller methods use asyncHandler for error handling
- All responses follow standard API format

### Phase 4 Deliverables

- [ ] 11 API endpoints implemented
- [ ] Zod validation contracts created
- [ ] Controllers with business logic
- [ ] Routes configured with auth/validation
- [ ] Integration tests for all endpoints (50+ tests)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Git commit: "feat(prerequisites): Phase 4 - API endpoints"

**Estimated Phase Duration:** 5-7 days

---

## Phase 5: Progress Warnings System

### Objectives
- Implement warning evaluation engine
- Create service for calculating progress metrics
- Configure default warning thresholds
- Implement instructor notifications

### Task 5.1: Progress Metrics Calculator

**File:** `src/services/progress/progress-metrics.service.ts`

**Key Functions:**
- `calculateProgressMetrics(learnerId, classId)` - Get completion percentage, time elapsed
- `evaluateWarningThresholds(metrics, thresholds)` - Check which warnings trigger
- `notifyInstructor(warning, enrollment)` - Send notification when configured

### Task 5.2: Warning Evaluation Engine

**File:** `src/services/progress/warning-evaluator.service.ts`

**Features:**
- Evaluate time-elapsed conditions
- Evaluate content-remaining conditions
- Support custom formula evaluation (safe eval)
- Cache evaluation results

### Task 5.3: Default Warning Templates

**File:** `scripts/seed-default-warnings.ts`

**Create 3 default warning templates:**
1. Behind Pace (Info) - 50% time, 30% complete
2. At Risk (Warning) - 14 days left, 40% remaining
3. Critical (Critical) - 7 days left, 30% remaining

### Phase 5 Deliverables

- [ ] Progress metrics calculator
- [ ] Warning evaluation engine
- [ ] Default warning templates
- [ ] Instructor notification system
- [ ] Unit tests for warning logic (30+ tests)
- [ ] Integration tests
- [ ] Git commit: "feat(prerequisites): Phase 5 - Progress warnings system"

**Estimated Phase Duration:** 3-4 days

---

## Phase 6: Prerequisite Overrides

### Objectives
- Implement request/approval workflow
- Handle instructor+dept-admin dual role
- Create notification system for pending requests
- Audit logging for all override actions

### Task 6.1: Override Request Service

**File:** `src/services/enrollment/prerequisite-override.service.ts`

**Key Functions:**
- `requestOverride(enrollmentId, contentId, requestedBy, reason)` - Create request
- `reviewOverride(overrideId, action, reviewedBy, notes)` - Approve/deny
- `getPendingOverrides(departmentId)` - Get all pending for dept
- `checkAutoApproval(requestedBy, classId)` - Check if instructor is also dept-admin

### Task 6.2: Override Notification Service

**File:** `src/services/notifications/override-notification.service.ts`

**Features:**
- Notify dept-admin when override requested
- Notify instructor when reviewed
- Notify learner when approved/denied
- Email + in-app notifications

### Task 6.3: Override Audit Logging

**File:** `src/services/audit/override-audit.service.ts`

**Log all actions:**
- Override requested (who, when, why)
- Override reviewed (who, when, decision, notes)
- Auto-approval (instructor=dept-admin)

### Phase 6 Deliverables

- [ ] Override request/approval workflow
- [ ] Auto-approval for instructor+dept-admin
- [ ] Notification system
- [ ] Audit logging
- [ ] Unit tests (25+ tests)
- [ ] Integration tests
- [ ] Git commit: "feat(prerequisites): Phase 6 - Prerequisite overrides"

**Estimated Phase Duration:** 3-4 days

---

## Phase 7: Flow Diagram Generator

### Objectives
- Implement graph algorithm for prerequisite visualization
- Detect circular dependencies
- Identify orphaned content
- Generate positioning for UI rendering

### Task 7.1: Prerequisite Graph Builder

**File:** `src/services/content/prerequisite-graph.service.ts`

**Key Functions:**
- `buildPrerequisiteGraph(courseId)` - Build full graph
- `detectCircularDependencies(graph)` - Find cycles
- `findOrphanedContent(graph)` - Content with no path from start
- `calculateNodePositions(graph)` - Auto-layout algorithm

### Task 7.2: Graph Validation Service

**File:** `src/services/content/prerequisite-validator.service.ts`

**Validations:**
- No circular dependencies
- All content reachable from start
- No impossible requirements (e.g., require self)
- Warn if content has no prerequisites (may be intentional)

### Task 7.3: Flow Diagram API

**Endpoint:** `GET /api/v2/courses/:courseId/prerequisites/flow-diagram`

**Response includes:**
- Nodes (content items with positions)
- Edges (prerequisite relationships)
- Issues (circular dependencies, orphaned content)
- Suggested fixes

### Phase 7 Deliverables

- [ ] Graph building algorithm
- [ ] Circular dependency detection
- [ ] Orphaned content detection
- [ ] Auto-layout algorithm
- [ ] Flow diagram API endpoint
- [ ] Unit tests for graph algorithms (20+ tests)
- [ ] Git commit: "feat(prerequisites): Phase 7 - Flow diagram generator"

**Estimated Phase Duration:** 2-3 days

---

## Phase 8: Testing & Documentation

### Objectives
- Comprehensive test coverage (>85%)
- API documentation
- User guides
- Migration tools
- Performance benchmarks

### Task 8.1: Unit Tests

**Target Coverage:** >90%

**Test Files:**
- `tests/unit/services/prerequisite.service.test.ts` (50+ tests)
- `tests/unit/services/course-version.service.test.ts` (20+ tests)
- `tests/unit/services/content-access.service.test.ts` (30+ tests)
- `tests/unit/services/progress-metrics.service.test.ts` (25+ tests)
- `tests/unit/services/warning-evaluator.service.test.ts` (20+ tests)
- `tests/unit/services/prerequisite-override.service.test.ts` (25+ tests)

**Total:** 170+ unit tests

### Task 8.2: Integration Tests

**Test Files:**
- `tests/integration/prerequisites/access-control.test.ts` (30+ tests)
- `tests/integration/prerequisites/progress-tracking.test.ts` (20+ tests)
- `tests/integration/prerequisites/overrides.test.ts` (25+ tests)
- `tests/integration/prerequisites/warnings.test.ts` (15+ tests)
- `tests/integration/prerequisites/flow-diagram.test.ts` (10+ tests)

**Total:** 100+ integration tests

### Task 8.3: E2E Tests

**Scenarios:**
1. Learner progression through sequential prerequisites
2. Learner retries quiz until passing score unlocks next content
3. Instructor requests override, dept-admin approves
4. Progress warnings triggered at thresholds
5. Course version created when prerequisites changed
6. Late enrollment with deadline extension

**Total:** 15+ E2E tests

### Task 8.4: Performance Benchmarks

**Targets:**
- Prerequisite check: <50ms (p95)
- Progress metrics calculation: <100ms
- Flow diagram generation: <500ms for 100 content items
- Cache hit rate: >80%

### Task 8.5: Documentation

**Create:**
1. **API Documentation** (OpenAPI/Swagger)
   - All 11 endpoints documented
   - Request/response examples
   - Error codes and messages

2. **User Guides**
   - Instructor: "How to Configure Prerequisites"
   - Instructor: "How to Request Override"
   - Dept-Admin: "Managing Progress Warnings"
   - Dept-Admin: "Reviewing Override Requests"
   - Learner: "Understanding Locked Content"

3. **Migration Guide**
   - Enabling prerequisites for existing courses
   - Bulk configuration tools
   - Rollback procedures

4. **Developer Documentation**
   - Service layer architecture
   - Caching strategy
   - Performance optimization tips

### Task 8.6: Migration Tools

**Create:**
1. **Bulk Prerequisite Setup Tool**
   - `scripts/tools/bulk-set-sequential-prerequisites.ts`
   - Set sequential prerequisites for all content in course
   - Dry-run mode to preview changes

2. **Course Version Migration Tool**
   - `scripts/tools/migrate-classes-to-new-version.ts`
   - Migrate active classes to new course version
   - System-admin only, with confirmations

3. **Warning Configuration Template Tool**
   - `scripts/tools/apply-default-warnings.ts`
   - Apply default warning templates to departments
   - Customizable parameters

### Phase 8 Deliverables

- [ ] 285+ tests passing (170 unit + 100 integration + 15 E2E)
- [ ] Test coverage >85%
- [ ] Performance benchmarks met
- [ ] API documentation complete (OpenAPI/Swagger)
- [ ] 5 user guides created
- [ ] Migration guide created
- [ ] 3 migration tools created
- [ ] Developer documentation complete
- [ ] Git commit: "feat(prerequisites): Phase 8 - Testing and documentation"

**Estimated Phase Duration:** 4-6 days

---

## Complete Implementation Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Data Models | 4-5 days | Day 1 | Day 5 |
| Phase 2: Prerequisite Logic | 4-6 days | Day 6 | Day 11 |
| Phase 3: Access Control | 3-4 days | Day 12 | Day 15 |
| Phase 4: API Endpoints | 5-7 days | Day 16 | Day 22 |
| Phase 5: Progress Warnings | 3-4 days | Day 23 | Day 26 |
| Phase 6: Overrides | 3-4 days | Day 27 | Day 30 |
| Phase 7: Flow Diagram | 2-3 days | Day 31 | Day 33 |
| Phase 8: Testing & Docs | 4-6 days | Day 34 | Day 39 |

**Total Duration:** 28-39 days (4-6 weeks)

**Buffer:** Add 1 week for unexpected issues = **5-7 weeks total**

---

## Rollout Strategy

### Week 1-4: Internal Development
- Complete Phases 1-6
- Internal testing
- Fix critical bugs

### Week 5: Soft Launch (Beta)
- Enable for 5-10 pilot courses
- Gather instructor feedback
- Monitor performance and errors
- Fix issues discovered

### Week 6: Gradual Rollout
- Enable for 25% of courses
- Department-by-department rollout
- Training sessions for instructors
- Expand to 50%, then 75%

### Week 7: Full Rollout
- Enable for all new courses
- Existing courses opt-in
- Full documentation published
- Support team trained

---

## Success Metrics

### Technical Metrics
- [ ] Test coverage >85%
- [ ] Prerequisite check latency <50ms (p95)
- [ ] Progress calculation <100ms
- [ ] Cache hit rate >80%
- [ ] Zero critical bugs in production
- [ ] API uptime >99.9%

### Adoption Metrics
- [ ] 100+ courses using prerequisites within 3 months
- [ ] 80%+ instructor satisfaction (survey)
- [ ] <5% of instructors disable feature after enabling

### Learning Outcomes
- [ ] Improved course completion rates (measure baseline vs post-implementation)
- [ ] Higher learner satisfaction with structured learning paths
- [ ] Reduced support tickets related to content access
- [ ] Improved prerequisite pass rates

### Business Metrics
- [ ] Increased course enrollment (structured paths attract learners)
- [ ] Reduced dropout rates
- [ ] Higher NPS scores from learners and instructors

---

## Risk Mitigation

### Risk 1: Performance Impact
**Impact:** High | **Probability:** Medium

**Mitigation:**
- Comprehensive caching strategy
- Database indexing optimization
- Load testing before rollout
- Performance monitoring in production

**Rollback:** Disable prerequisite checking via feature flag

---

### Risk 2: Instructor Confusion
**Impact:** Medium | **Probability:** High

**Mitigation:**
- Clear UI/UX with inline help
- Video tutorials
- Training sessions
- Documentation with examples
- Support team training

**Rollback:** Opt-in only, instructors can disable

---

### Risk 3: Data Migration Issues
**Impact:** High | **Probability:** Low

**Mitigation:**
- Dry-run mode for all migrations
- Backup before migration
- Rollback scripts prepared
- Gradual rollout, not big-bang

**Rollback:** Restore from backup, disable feature

---

### Risk 4: Complex Course Structures
**Impact:** Medium | **Probability:** Medium

**Mitigation:**
- Flow diagram tool to visualize complexity
- Validation to prevent circular dependencies
- Warning system for potential issues
- Support for simpler patterns (sequential)

**Rollback:** Instructors can simplify prerequisites

---

### Risk 5: Learner Access Issues
**Impact:** High | **Probability:** Medium

**Mitigation:**
- Clear error messages explaining why content is locked
- Instructor override capability
- Support team escalation path
- Progress tracking shows what to complete

**Rollback:** Override requests fast-tracked by dept-admins

---

## Monitoring & Observability

### Metrics to Track

**Performance:**
- Prerequisite check duration (p50, p95, p99)
- Progress calculation duration
- Cache hit/miss rates
- API endpoint latency

**Usage:**
- Number of courses with prerequisites
- Number of learners encountering locked content
- Override requests (total, pending, approved, denied)
- Progress warnings triggered

**Errors:**
- Failed prerequisite checks
- Access control errors
- Version creation failures

### Alerts to Configure

**Critical:**
- Prerequisite check latency >500ms (p95)
- API error rate >1%
- Cache unavailable

**Warning:**
- Prerequisite check latency >100ms (p95)
- Override approval time >48 hours (SLA)
- Progress warning notifications failing

**Info:**
- High override request volume (>50/day)
- Complex course structures detected (>10 levels deep)

---

## Maintenance & Support

### Ongoing Maintenance

**Weekly:**
- Review performance metrics
- Monitor error logs
- Review override requests (trending issues)

**Monthly:**
- Review adoption metrics
- Gather instructor feedback
- Optimize slow queries
- Update documentation based on support tickets

**Quarterly:**
- Review success metrics against targets
- Conduct user satisfaction surveys
- Plan feature enhancements
- Performance optimization sprint

### Support Runbooks

Create runbooks for:
1. "Learner can't access content" - Troubleshooting guide
2. "Override request stuck in pending" - Escalation process
3. "Progress warnings not triggering" - Debugging steps
4. "Circular dependency detected" - Resolution guide
5. "Performance degradation" - Optimization checklist

---

## Future Enhancements (Out of Scope)

### Phase 9: Advanced Features (3-6 months post-launch)

1. **Adaptive Prerequisites**
   - AI-suggested prerequisites based on learner performance
   - Dynamic difficulty adjustment

2. **Prerequisite Templates**
   - Save and reuse prerequisite patterns
   - Share templates across departments
   - Community template library

3. **Advanced Progress Tracking**
   - Predictive completion estimates
   - Personalized learning pace recommendations
   - Early intervention alerts

4. **Integration Enhancements**
   - LTI 1.3 integration for external content
   - SCORM prerequisite metadata support
   - Third-party LMS prerequisite import

5. **Analytics Dashboard**
   - Course prerequisite effectiveness metrics
   - Learner progression heat maps
   - Bottleneck identification

---

## Approval Checklist

- [ ] All 8 phases reviewed and approved
- [ ] Timeline acceptable (4-6 weeks)
- [ ] Resource allocation confirmed
- [ ] Testing strategy approved
- [ ] Rollout plan approved
- [ ] Success metrics agreed upon
- [ ] Risk mitigation plans approved
- [ ] Ready to begin Phase 1 implementation

---

## Post-Approval Next Steps

1. Create project tracking (Jira/Linear/GitHub Projects)
2. Set up feature branch: `feature/prerequisite-system`
3. Configure CI/CD for automated testing
4. Schedule daily standup meetings
5. Begin Phase 1: Data Models & Migrations
6. Weekly progress reports to stakeholders

---

**END OF IMPLEMENTATION PLAN**

**Total Document Length:** ~2,200 lines
**Estimated Reading Time:** 60 minutes
**Estimated Implementation Time:** 5-7 weeks
**Team Size Recommended:** 1-2 developers + 1 QA engineer

