# Report System API Recommendation Document

**Version:** 1.0.0  
**Date:** 2026-01-15  
**Status:** 📋 API TEAM RESPONSE  
**Author:** API Team  

---

## Executive Summary

This document provides the API team's analysis and recommendations in response to the UI team's Report System Specification ([REPORT_SYSTEM_SPEC.md](../specs/REPORT_SYSTEM_SPEC.md)) and Proposed APIs ([REPORT_SYSTEM_UIPROPOSED_APIs.md](../specs/REPORT_SYSTEM_UIPROPOSED_APIs.md)).

**Key Decision:** We recommend implementing the report system with **breaking changes** to create an optimal API and data model structure. Since we are not in production, this is the ideal time to restructure for long-term scalability.

**Naming Convention:** All enum values use **kebab-case (hyphens)** to align with existing role names (`department-admin`, `content-admin`) and event types in the current `LearningEvent` model.

**Extensibility:** All enum values (event types, report types, statuses) are stored in the **LookupValue** table for runtime customization without code changes.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [UI Proposal Assessment](#2-ui-proposal-assessment)
3. [Recommended Data Model Changes](#3-recommended-data-model-changes)
4. [Recommended API Changes](#4-recommended-api-changes)
5. [Comparison Matrix](#5-comparison-matrix)
6. [Implementation Priority](#6-implementation-priority)
7. [Migration Notes](#7-migration-notes)

---

## 1. Current State Analysis

### 1.1 Existing Models

| Model | Location | Purpose | Report Relevance |
|-------|----------|---------|------------------|
| `LearningEvent` | `src/models/activity/` | Tracks learner interactions | ⭐ High - Core engagement data |
| `EnrollmentActivity` | `src/models/` | Enrollment lifecycle audit trail | ⭐ High - Progress tracking |
| `ScormAttempt` | `src/models/activity/` | SCORM package attempts | ⭐ High - Completion/scores |
| `ExamResult` | `src/models/activity/` | Assessment results | ⭐ High - Performance metrics |
| `Enrollment` | `src/models/enrollment/` | Program enrollments | Medium - Status only |
| `ClassEnrollment` | `src/models/enrollment/` | Class enrollments | Medium - Status only |
| `Course` | `src/models/academic/` | Course definitions | Low - Static reference |
| `Class` | `src/models/academic/` | Class instances | Medium - Instructor mapping |
| `Department` | `src/models/organization/` | Org structure | Medium - Scoping |

### 1.2 Existing API Contracts

| Contract | Endpoints | Status |
|----------|-----------|--------|
| `reports.contract.ts` | `/api/v2/reports/completion`, `/api/v2/reports/performance`, etc. | ⚠️ Real-time only |
| `learning-events.contract.ts` | `/api/v2/learning-events` | ✅ Good for event queries |
| `enrollments.contract.ts` | `/api/v2/enrollments` | ✅ Good for enrollment data |

### 1.3 Current Gaps

| Gap | Impact | UI Proposal Addresses |
|-----|--------|----------------------|
| No report job queue | Large reports time out | ✅ Yes |
| No report templates | Users recreate reports | ✅ Yes |
| No custom report builder | Only predefined reports | ✅ Yes |
| No scheduled reports | Manual generation only | ✅ Yes |
| Inconsistent event types | `LearningEvent.eventType` vs contracts | ⚠️ Partially |
| No export to files | JSON only | ✅ Yes |
| No progress tracking | Large reports have no feedback | ✅ Yes |

### 1.4 Critical Data Model Issues

**Issue 1: LearningEvent eventType Mismatch**

```typescript
// Current Model (LearningEvent.model.ts) - ✅ USES HYPHENS (CORRECT)
enum: [
  'content-viewed',
  'content-started',
  'content-completed',
  'exam-started',
  'exam-submitted',
  'video-played',
  'video-paused',
  'video-completed',
  'assignment-submitted',
  'scorm-launched',
  'scorm-exited',
  'login',
  'logout'
]

// Current Contract (learning-events.contract.ts) - ❌ USES UNDERSCORES (NEEDS FIX)
enum: [
  'enrollment',
  'content_started',    // Should be: 'content-started'
  'content_completed',  // Should be: 'content-completed'
  'assessment_started', // Should be: 'assessment-started'
  'assessment_completed',
  'module_completed',
  'course_completed',
  'achievement_earned',
  'login',
  'logout'
]

// UI Proposal (REPORT_SYSTEM_SPEC.md - eventType slicer)
enum: [
  'enrollment',
  'content_started',
  'content_completed',
  'assessment_started',
  'assessment_completed',
  'module_completed',
  'course_completed',
  'achievement_earned',
  'login',
  'logout'
]
```

**Problem:** Three different enums - model uses hyphens, contracts use underscores, and types differ.

**Issue 2: Missing Report Infrastructure Collections**

No collections exist for:
- ReportJob
- ReportTemplate
- ReportDataCache

**Issue 3: Missing Course/Enrollment Reference in LearningEvent**

The `LearningEvent` model has `contentId` and `classId`, but no direct `courseId` or `enrollmentId`. This requires joins for report aggregation.

---

## 2. UI Proposal Assessment

### 2.1 What the UI Team Got Right ✅

| Aspect | Assessment |
|--------|------------|
| **ReportJob queue system** | Excellent design. Job lifecycle states are comprehensive. |
| **ReportTemplate model** | Well-structured with sharing/visibility controls. |
| **Custom Report Builder concept** | Good abstraction with dimensions/measures/slicers/groups. |
| **API endpoint structure** | Clean RESTful design following project patterns. |
| **Priority queue** | Smart prioritization (high/normal/low). |
| **Polling status endpoint** | Lightweight `/status` endpoint is efficient. |
| **Metadata endpoints** | `/report-metadata/*` enables dynamic UI building. |

### 2.2 Suggested Improvements ⚠️

| Aspect | UI Proposal | Recommendation | Reason |
|--------|-------------|----------------|--------|
| **Event type enum** | Uses underscores (e.g., `content_started`) | Standardize to underscores everywhere | Match contracts |
| **Dimension entities** | Includes `learning-event` | Rename to `activity` | More intuitive |
| **Visibility levels** | `private`, `department`, `organization` | Add `team` level | Support sub-department sharing |
| **OutputFormat** | `pdf`, `excel`, `csv` | Add `json` | API consumers need JSON |
| **Scheduled reports** | In ReportJob | Separate `ReportSchedule` collection | Better separation of concerns |
| **File storage** | `fileUrl` as string | Add `storageProvider` enum | Support S3/Azure/GCS |
| **Retention** | 7/30 days | Make configurable per org | Different orgs, different needs |

### 2.3 Missing from UI Proposal ❌

| Missing Element | Recommendation |
|-----------------|----------------|
| **Report execution history** | Add `ReportExecution` collection to track all runs (not just jobs) |
| **Report data snapshots** | Add versioned data snapshots for compliance |
| **Role-based dimension access** | Some dimensions should be restricted by role |
| **Aggregation precompute** | Background aggregation for common queries |
| **Rate limiting** | Max jobs per user per hour |
| **Cost estimation** | Warn users before expensive reports |

---

## 3. Recommended Data Model Changes

### 3.1 New Collections to Create

#### 3.1.1 ReportJob Collection (ALIGN with UI Proposal + Enhancements)

```typescript
// Location: src/models/reporting/ReportJob.model.ts

interface IReportJob extends Document {
  _id: ObjectId;
  
  // === Identification ===
  name: string;
  description?: string;
  templateId?: ObjectId;              // Reference to ReportTemplate (if used)
  
  // === Type ===
  reportType: 'predefined' | 'custom';
  predefinedType?: PredefinedReportType;
  customDefinition?: ICustomReportDefinition;
  
  // === State Machine ===
  status: ReportJobStatus;
  priority: 'critical' | 'high' | 'normal' | 'low' | 'scheduled';
  progress: number;                   // 0-100
  
  // === Filters ===
  filters: IReportFilters;
  
  // === Output ===
  outputFormat: 'pdf' | 'excel' | 'csv' | 'json';
  outputFile?: {
    storageProvider: 'local' | 's3' | 'azure' | 'gcs';
    bucket?: string;
    key?: string;
    url?: string;                     // Signed URL (ephemeral)
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    checksum?: string;
    generatedAt: Date;
    expiresAt: Date;
  };
  
  // === Execution Metrics ===
  metrics?: {
    rowsProcessed: number;
    rowsTotal?: number;
    queryTimeMs: number;
    renderTimeMs: number;
    totalTimeMs: number;
    memoryPeakMb?: number;
  };
  
  // === Error Handling ===
  error?: {
    code: string;
    message: string;
    stack?: string;
    retryable: boolean;
  };
  retryCount: number;
  maxRetries: number;
  
  // === Scheduling (if scheduled) ===
  scheduleId?: ObjectId;              // Reference to ReportSchedule
  scheduledFor?: Date;
  
  // === Notifications ===
  notifyOnComplete: boolean;
  notifyChannels?: {
    email?: string[];
    webhook?: string;
    inApp?: boolean;
  };
  
  // === Access Control ===
  visibility: 'private' | 'team' | 'department' | 'organization';
  createdBy: ObjectId;
  departmentId?: ObjectId;
  sharedWith?: ObjectId[];
  
  // === Audit ===
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  downloadedAt?: Date;
  downloadCount: number;
  expiresAt?: Date;                   // TTL for auto-deletion
  
  // === Organizational Context ===
  organizationId: ObjectId;           // Multi-tenant support
}

type ReportJobStatus = 
  | 'pending'        // Created, waiting in queue
  | 'queued'         // Picked up by worker
  | 'processing'     // Actively generating
  | 'rendering'      // Generating file (PDF/Excel)
  | 'uploading'      // Uploading to storage
  | 'ready'          // Available for download
  | 'downloaded'     // Downloaded at least once
  | 'failed'         // Generation failed
  | 'cancelled'      // Cancelled by user
  | 'expired';       // File deleted after retention

// NOTE: All enum values are stored in LookupValue table (category: 'report-type')
// This enables adding new report types at runtime without code changes
type PredefinedReportType =
  | 'enrollment-summary'
  | 'completion-rates'
  | 'performance-analysis'
  | 'learner-activity'
  | 'course-analytics'
  | 'instructor-workload'
  | 'department-overview'
  | 'program-progress'
  | 'assessment-results'
  | 'scorm-attempts'
  | 'transcript'
  | 'certification-status';
```

#### 3.1.2 ReportTemplate Collection

```typescript
// Location: src/models/reporting/ReportTemplate.model.ts

interface IReportTemplate extends Document {
  _id: ObjectId;
  
  // === Identification ===
  name: string;
  description: string;
  slug: string;                       // URL-friendly identifier
  
  // === Type ===
  reportType: 'predefined' | 'custom';
  predefinedType?: PredefinedReportType;
  customDefinition?: ICustomReportDefinition;
  
  // === Defaults ===
  defaultFilters?: Partial<IReportFilters>;
  defaultOutputFormat: 'pdf' | 'excel' | 'csv' | 'json';
  
  // === Classification ===
  category: string;
  tags: string[];
  icon?: string;
  color?: string;
  
  // === Visibility ===
  isSystemTemplate: boolean;          // Built-in template
  visibility: 'private' | 'team' | 'department' | 'organization' | 'global';
  departmentId?: ObjectId;
  
  // === Usage Tracking ===
  usageCount: number;
  lastUsedAt?: Date;
  lastUsedBy?: ObjectId;
  
  // === Version Control ===
  version: number;
  previousVersionId?: ObjectId;
  isLatest: boolean;
  
  // === Audit ===
  createdBy: ObjectId;
  updatedBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // === Permissions ===
  requiredPermissions: string[];      // e.g., ['reports:read', 'performance:read']
  requiredRoleLevel?: number;         // Minimum role level
  
  // === Multi-tenant ===
  organizationId: ObjectId;
}
```

#### 3.1.3 ReportSchedule Collection (SEPARATE from ReportJob)

```typescript
// Location: src/models/reporting/ReportSchedule.model.ts

interface IReportSchedule extends Document {
  _id: ObjectId;
  
  // === Identification ===
  name: string;
  description?: string;
  templateId: ObjectId;               // Must reference a template
  
  // === Schedule Definition ===
  schedule: {
    frequency: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
    cronExpression?: string;          // For complex schedules
    timezone: string;
    dayOfWeek?: number;               // 0-6 for weekly
    dayOfMonth?: number;              // 1-31 for monthly
    time: string;                     // HH:mm
    startDate?: Date;
    endDate?: Date;
  };
  
  // === Overrides ===
  filterOverrides?: Partial<IReportFilters>;
  outputFormat: 'pdf' | 'excel' | 'csv' | 'json';
  
  // === State ===
  isActive: boolean;
  nextRunAt?: Date;
  lastRunAt?: Date;
  lastRunJobId?: ObjectId;
  lastRunStatus?: 'success' | 'failed';
  runCount: number;
  failureCount: number;
  consecutiveFailures: number;
  
  // === Notifications ===
  notifyOnComplete: boolean;
  notifyOnFailure: boolean;
  notifyChannels?: {
    email?: string[];
    webhook?: string;
    inApp?: boolean;
  };
  
  // === Access Control ===
  visibility: 'private' | 'team' | 'department' | 'organization';
  createdBy: ObjectId;
  departmentId?: ObjectId;
  
  // === Audit ===
  createdAt: Date;
  updatedAt: Date;
  
  // === Multi-tenant ===
  organizationId: ObjectId;
}
```

#### 3.1.4 CustomReportDefinition Interface (Shared)

```typescript
// Location: src/models/reporting/types/CustomReportDefinition.ts

interface ICustomReportDefinition {
  // === Dimensions (Row Entities) ===
  dimensions: IDimensionConfig[];
  
  // === Measures (Calculated Values) ===
  measures: IMeasureConfig[];
  
  // === Slicers (Column Breakdown) ===
  slicers?: ISlicerConfig[];
  
  // === Groups (Aggregation Buckets) ===
  groups?: IGroupConfig[];
  
  // === Display Options ===
  display: {
    showTotals: boolean;
    showSubtotals: boolean;
    showPercentages: boolean;
    sortBy?: string;
    sortDirection: 'asc' | 'desc';
    limit?: number;
  };
  
  // === Visualization ===
  visualization?: {
    type: 'none' | 'table' | 'bar' | 'line' | 'pie' | 'area' | 'heatmap';
    options?: Record<string, any>;
  };
  
  // === Output Options ===
  output: {
    includeCharts: boolean;
    includeRawData: boolean;
    includeSummary: boolean;
    pageOrientation: 'portrait' | 'landscape';
    pageSize: 'letter' | 'legal' | 'a4';
    headerText?: string;
    footerText?: string;
  };
}

interface IDimensionConfig {
  entity: DimensionEntity;
  fields: string[];
  label?: string;
  sortOrder?: number;
}

type DimensionEntity =
  | 'learner'
  | 'course'
  | 'class'
  | 'program'
  | 'department'
  | 'instructor'
  | 'enrollment'
  | 'activity'         // Renamed from 'learning-event'
  | 'assessment'
  | 'scorm-attempt';

interface IMeasureConfig {
  id: string;
  type: MeasureType;
  field?: string;
  label?: string;
  format: 'number' | 'percent' | 'currency' | 'duration' | 'date';
  decimals?: number;
  conditionalFormatting?: IConditionalFormat[];
}

// NOTE: All measure types are stored in LookupValue table (category: 'measure-type')
// This enables adding custom calculated metrics at runtime
type MeasureType =
  // Basic Aggregations
  | 'count'
  | 'count-distinct'
  | 'sum'
  | 'average'
  | 'median'
  | 'min'
  | 'max'
  | 'std-dev'
  | 'variance'
  
  // LMS-Specific Rates
  | 'completion-rate'
  | 'pass-rate'
  | 'fail-rate'
  | 'engagement-rate'
  | 'retention-rate'
  | 'dropout-rate'
  
  // Time-Based
  | 'avg-time-to-complete'
  | 'avg-study-time'
  
  // Score-Based
  | 'avg-score'
  | 'event-count';

interface ISlicerConfig {
  field: string;
  type: 'categorical' | 'range' | 'time' | 'dynamic';
  values?: string[];                  // For categorical
  buckets?: { label: string; min?: number; max?: number }[];  // For range
  timeGranularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  dynamicSource?: string;             // Endpoint for dynamic values
}

interface IGroupConfig {
  field: string;
  granularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  sortBy: 'value' | 'label' | 'count';
  sortDirection: 'asc' | 'desc';
  topN?: number;
  showOther: boolean;
}

interface IConditionalFormat {
  condition: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between';
  value: number;
  valueEnd?: number;
  color: string;
  bold?: boolean;
  icon?: string;
}
```

#### 3.1.5 ReportFilters Interface (Unified)

```typescript
// Location: src/models/reporting/types/ReportFilters.ts

interface IReportFilters {
  // === Entity Filters ===
  organizationId?: ObjectId;
  departmentIds?: ObjectId[];
  programIds?: ObjectId[];
  courseIds?: ObjectId[];
  classIds?: ObjectId[];
  learnerIds?: ObjectId[];
  instructorIds?: ObjectId[];
  
  // === Time Filters ===
  dateRange?: {
    field: 'createdAt' | 'enrolledAt' | 'completedAt' | 'eventDate';
    start: Date;
    end: Date;
  };
  academicYearId?: ObjectId;
  termCode?: string;
  
  // === Status Filters ===
  enrollmentStatus?: EnrollmentStatus[];
  completionStatus?: ('incomplete' | 'complete')[];
  activityTypes?: ActivityEventType[];
  
  // === Performance Filters ===
  scoreRange?: { min?: number; max?: number };
  gradeLetters?: string[];
  passStatus?: ('passed' | 'failed' | 'pending')[];
  
  // === Custom Filters ===
  customFilters?: IFilterCondition[];
}

interface IFilterCondition {
  field: string;
  operator: FilterOperator;
  value: any;
  valueEnd?: any;                     // For 'between'
}

type FilterOperator =
  | 'eq' | 'ne'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'nin'
  | 'contains' | 'startsWith' | 'endsWith'
  | 'between'
  | 'isNull' | 'isNotNull'
  | 'regex';
```

### 3.2 Model Updates (Breaking Changes)

#### 3.2.1 LearningEvent Model - RESTRUCTURE

```typescript
// Location: src/models/activity/LearningEvent.model.ts
// ⚠️ BREAKING CHANGE - Event type enum standardization + new fields

interface ILearningEvent extends Document {
  _id: ObjectId;
  
  // === Core References (ENHANCED) ===
  learnerId: ObjectId;
  courseId?: ObjectId;                // NEW: Direct course reference
  classId?: ObjectId;
  contentId?: ObjectId;
  enrollmentId?: ObjectId;            // NEW: Link to enrollment
  
  // === Event Type (STANDARDIZED to underscores) ===
  eventType: ActivityEventType;
  
  // === Event Data ===
  timestamp: Date;
  duration?: number;                  // Seconds
  sessionId?: string;
  
  // === Context ===
  context: {
    ipAddress?: string;
    userAgent?: string;
    deviceType?: 'desktop' | 'tablet' | 'mobile';
    browser?: string;
    os?: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
  };
  
  // === Event-Specific Data ===
  data?: {
    // For content events
    contentType?: string;
    contentTitle?: string;
    progress?: number;
    
    // For assessment events
    score?: number;
    maxScore?: number;
    passed?: boolean;
    attemptNumber?: number;
    
    // For SCORM events
    scormStatus?: string;
    scormScore?: number;
    
    // For video events
    videoPosition?: number;
    videoDuration?: number;
    
    // Generic extensible data
    [key: string]: any;
  };
  
  // === Aggregation Helpers (NEW) ===
  aggregation: {
    dayKey: string;                   // YYYY-MM-DD for daily rollups
    weekKey: string;                  // YYYY-WW for weekly rollups
    monthKey: string;                 // YYYY-MM for monthly rollups
    quarterKey: string;               // YYYY-Q1/Q2/Q3/Q4
    yearKey: number;                  // YYYY
  };
  
  // === Audit ===
  createdAt: Date;
  
  // === Multi-tenant ===
  organizationId: ObjectId;
}

// NOTE: All event types are stored in LookupValue table (category: 'activity-event')
// This enables adding custom event types at runtime without code changes
type ActivityEventType =
  // Enrollment Events
  | 'enrollment-created'
  | 'enrollment-started'
  | 'enrollment-completed'
  | 'enrollment-withdrawn'
  | 'enrollment-expired'
  
  // Content Events
  | 'content-viewed'
  | 'content-started'
  | 'content-completed'
  | 'content-downloaded'
  
  // Assessment Events
  | 'assessment-started'
  | 'assessment-submitted'
  | 'assessment-completed'
  | 'assessment-graded'
  
  // Module/Course Events
  | 'module-started'
  | 'module-completed'
  | 'course-started'
  | 'course-completed'
  
  // SCORM Events
  | 'scorm-launched'
  | 'scorm-initialized'
  | 'scorm-completed'
  | 'scorm-passed'
  | 'scorm-failed'
  | 'scorm-suspended'
  | 'scorm-exited'
  
  // Video Events
  | 'video-played'
  | 'video-paused'
  | 'video-seeked'
  | 'video-completed'
  
  // Session Events
  | 'session-started'
  | 'session-ended'
  | 'login'
  | 'logout'
  
  // Achievement Events
  | 'achievement-earned'
  | 'certificate-issued';
```

**Migration Note:** Current event types already use hyphens - no migration needed for existing data. New event types will be added to the LookupValue table.

### 3.2.2 LookupValue Storage for Extensible Enums

All enum values in the report system are stored in the `LookupValue` collection, enabling runtime customization without code changes.

#### LookupValue Categories for Reports

| Category | Purpose | Example Keys |
|----------|---------|--------------|
| `activity-event` | Learning event types | `content-viewed`, `scorm-launched`, `login` |
| `report-type` | Predefined report types | `enrollment-summary`, `completion-rates` |
| `report-status` | Job status values | `pending`, `processing`, `ready`, `failed` |
| `report-priority` | Job priority levels | `critical`, `high`, `normal`, `low` |
| `report-visibility` | Access scope levels | `private`, `team`, `department`, `organization` |
| `dimension-entity` | Report builder dimensions | `learner`, `course`, `enrollment`, `activity` |
| `measure-type` | Report builder measures | `count`, `average`, `completion-rate` |
| `output-format` | Export formats | `pdf`, `excel`, `csv`, `json` |

#### Seed Data: Activity Event Types

```javascript
// Seed script: seeds/lookup-activity-events.ts
const activityEvents = [
  // Enrollment Events
  { category: 'activity-event', key: 'enrollment-created', displayAs: 'Enrollment Created', sortOrder: 10 },
  { category: 'activity-event', key: 'enrollment-started', displayAs: 'Enrollment Started', sortOrder: 11 },
  { category: 'activity-event', key: 'enrollment-completed', displayAs: 'Enrollment Completed', sortOrder: 12 },
  { category: 'activity-event', key: 'enrollment-withdrawn', displayAs: 'Enrollment Withdrawn', sortOrder: 13 },
  { category: 'activity-event', key: 'enrollment-expired', displayAs: 'Enrollment Expired', sortOrder: 14 },
  
  // Content Events
  { category: 'activity-event', key: 'content-viewed', displayAs: 'Content Viewed', sortOrder: 20 },
  { category: 'activity-event', key: 'content-started', displayAs: 'Content Started', sortOrder: 21 },
  { category: 'activity-event', key: 'content-completed', displayAs: 'Content Completed', sortOrder: 22 },
  { category: 'activity-event', key: 'content-downloaded', displayAs: 'Content Downloaded', sortOrder: 23 },
  
  // Assessment Events
  { category: 'activity-event', key: 'assessment-started', displayAs: 'Assessment Started', sortOrder: 30 },
  { category: 'activity-event', key: 'assessment-submitted', displayAs: 'Assessment Submitted', sortOrder: 31 },
  { category: 'activity-event', key: 'assessment-completed', displayAs: 'Assessment Completed', sortOrder: 32 },
  { category: 'activity-event', key: 'assessment-graded', displayAs: 'Assessment Graded', sortOrder: 33 },
  
  // Module/Course Events
  { category: 'activity-event', key: 'module-started', displayAs: 'Module Started', sortOrder: 40 },
  { category: 'activity-event', key: 'module-completed', displayAs: 'Module Completed', sortOrder: 41 },
  { category: 'activity-event', key: 'course-started', displayAs: 'Course Started', sortOrder: 42 },
  { category: 'activity-event', key: 'course-completed', displayAs: 'Course Completed', sortOrder: 43 },
  
  // SCORM Events
  { category: 'activity-event', key: 'scorm-launched', displayAs: 'SCORM Launched', sortOrder: 50 },
  { category: 'activity-event', key: 'scorm-initialized', displayAs: 'SCORM Initialized', sortOrder: 51 },
  { category: 'activity-event', key: 'scorm-completed', displayAs: 'SCORM Completed', sortOrder: 52 },
  { category: 'activity-event', key: 'scorm-passed', displayAs: 'SCORM Passed', sortOrder: 53 },
  { category: 'activity-event', key: 'scorm-failed', displayAs: 'SCORM Failed', sortOrder: 54 },
  { category: 'activity-event', key: 'scorm-suspended', displayAs: 'SCORM Suspended', sortOrder: 55 },
  { category: 'activity-event', key: 'scorm-exited', displayAs: 'SCORM Exited', sortOrder: 56 },
  
  // Video Events
  { category: 'activity-event', key: 'video-played', displayAs: 'Video Played', sortOrder: 60 },
  { category: 'activity-event', key: 'video-paused', displayAs: 'Video Paused', sortOrder: 61 },
  { category: 'activity-event', key: 'video-seeked', displayAs: 'Video Seeked', sortOrder: 62 },
  { category: 'activity-event', key: 'video-completed', displayAs: 'Video Completed', sortOrder: 63 },
  
  // Session Events
  { category: 'activity-event', key: 'session-started', displayAs: 'Session Started', sortOrder: 70 },
  { category: 'activity-event', key: 'session-ended', displayAs: 'Session Ended', sortOrder: 71 },
  { category: 'activity-event', key: 'login', displayAs: 'Login', sortOrder: 72 },
  { category: 'activity-event', key: 'logout', displayAs: 'Logout', sortOrder: 73 },
  
  // Achievement Events
  { category: 'activity-event', key: 'achievement-earned', displayAs: 'Achievement Earned', sortOrder: 80 },
  { category: 'activity-event', key: 'certificate-issued', displayAs: 'Certificate Issued', sortOrder: 81 },
];
```

#### Seed Data: Report Types

```javascript
// Seed script: seeds/lookup-report-types.ts
const reportTypes = [
  { category: 'report-type', key: 'enrollment-summary', displayAs: 'Enrollment Summary', sortOrder: 10 },
  { category: 'report-type', key: 'completion-rates', displayAs: 'Completion Rates', sortOrder: 20 },
  { category: 'report-type', key: 'performance-analysis', displayAs: 'Performance Analysis', sortOrder: 30 },
  { category: 'report-type', key: 'learner-activity', displayAs: 'Learner Activity', sortOrder: 40 },
  { category: 'report-type', key: 'course-analytics', displayAs: 'Course Analytics', sortOrder: 50 },
  { category: 'report-type', key: 'instructor-workload', displayAs: 'Instructor Workload', sortOrder: 60 },
  { category: 'report-type', key: 'department-overview', displayAs: 'Department Overview', sortOrder: 70 },
  { category: 'report-type', key: 'program-progress', displayAs: 'Program Progress', sortOrder: 80 },
  { category: 'report-type', key: 'assessment-results', displayAs: 'Assessment Results', sortOrder: 90 },
  { category: 'report-type', key: 'scorm-attempts', displayAs: 'SCORM Attempts', sortOrder: 100 },
  { category: 'report-type', key: 'transcript', displayAs: 'Transcript', sortOrder: 110 },
  { category: 'report-type', key: 'certification-status', displayAs: 'Certification Status', sortOrder: 120 },
];
```

#### Seed Data: Measure Types

```javascript
// Seed script: seeds/lookup-measure-types.ts
const measureTypes = [
  // Basic Aggregations
  { category: 'measure-type', key: 'count', displayAs: 'Count', description: 'Number of records', sortOrder: 10,
    metadata: { format: 'number', requiresField: false, applicableTo: ['all'] } },
  { category: 'measure-type', key: 'count-distinct', displayAs: 'Count Distinct', description: 'Unique count', sortOrder: 11,
    metadata: { format: 'number', requiresField: true, applicableTo: ['all'] } },
  { category: 'measure-type', key: 'sum', displayAs: 'Sum', description: 'Sum of numeric field', sortOrder: 12,
    metadata: { format: 'number', requiresField: true, applicableTo: ['number'] } },
  { category: 'measure-type', key: 'average', displayAs: 'Average', description: 'Average of numeric field', sortOrder: 13,
    metadata: { format: 'number', requiresField: true, applicableTo: ['number'] } },
  { category: 'measure-type', key: 'median', displayAs: 'Median', description: 'Median value', sortOrder: 14,
    metadata: { format: 'number', requiresField: true, applicableTo: ['number'] } },
  { category: 'measure-type', key: 'min', displayAs: 'Minimum', description: 'Minimum value', sortOrder: 15,
    metadata: { format: 'number', requiresField: true, applicableTo: ['number', 'date'] } },
  { category: 'measure-type', key: 'max', displayAs: 'Maximum', description: 'Maximum value', sortOrder: 16,
    metadata: { format: 'number', requiresField: true, applicableTo: ['number', 'date'] } },
  { category: 'measure-type', key: 'std-dev', displayAs: 'Standard Deviation', description: 'Statistical standard deviation', sortOrder: 17,
    metadata: { format: 'number', requiresField: true, applicableTo: ['number'] } },
  { category: 'measure-type', key: 'variance', displayAs: 'Variance', description: 'Statistical variance', sortOrder: 18,
    metadata: { format: 'number', requiresField: true, applicableTo: ['number'] } },
  
  // LMS-Specific Rates
  { category: 'measure-type', key: 'completion-rate', displayAs: 'Completion Rate', description: 'Percentage completed', sortOrder: 30,
    metadata: { format: 'percent', requiresField: false, applicableTo: ['enrollment', 'course'] } },
  { category: 'measure-type', key: 'pass-rate', displayAs: 'Pass Rate', description: 'Percentage passed', sortOrder: 31,
    metadata: { format: 'percent', requiresField: false, applicableTo: ['enrollment', 'course', 'assessment'] } },
  { category: 'measure-type', key: 'fail-rate', displayAs: 'Fail Rate', description: 'Percentage failed', sortOrder: 32,
    metadata: { format: 'percent', requiresField: false, applicableTo: ['enrollment', 'course', 'assessment'] } },
  { category: 'measure-type', key: 'engagement-rate', displayAs: 'Engagement Rate', description: 'Percentage of learners with activity', sortOrder: 33,
    metadata: { format: 'percent', requiresField: false, applicableTo: ['course', 'class'] } },
  { category: 'measure-type', key: 'retention-rate', displayAs: 'Retention Rate', description: 'Percentage not withdrawn', sortOrder: 34,
    metadata: { format: 'percent', requiresField: false, applicableTo: ['enrollment', 'program'] } },
  { category: 'measure-type', key: 'dropout-rate', displayAs: 'Dropout Rate', description: 'Percentage withdrawn', sortOrder: 35,
    metadata: { format: 'percent', requiresField: false, applicableTo: ['enrollment', 'program'] } },
  
  // Time-Based
  { category: 'measure-type', key: 'avg-time-to-complete', displayAs: 'Avg Time to Complete', description: 'Average completion time', sortOrder: 40,
    metadata: { format: 'duration', requiresField: false, applicableTo: ['enrollment'] } },
  { category: 'measure-type', key: 'avg-study-time', displayAs: 'Avg Study Time', description: 'Average time spent learning', sortOrder: 41,
    metadata: { format: 'duration', requiresField: false, applicableTo: ['learner', 'course', 'class'] } },
  
  // Score-Based
  { category: 'measure-type', key: 'avg-score', displayAs: 'Average Score', description: 'Average assessment score', sortOrder: 50,
    metadata: { format: 'number', requiresField: false, applicableTo: ['assessment', 'course', 'learner'] } },
  
  // Activity-Based
  { category: 'measure-type', key: 'event-count', displayAs: 'Event Count', description: 'Count of learning events', sortOrder: 60,
    metadata: { format: 'number', requiresField: false, applicableTo: ['learner', 'course', 'class'] } },
];
```

#### How to Add Custom Types at Runtime

Administrators can add new event types or measure types without deploying code:

**Example: Add Custom Event Type**
```typescript
// Via API: POST /api/v2/lookup-values
{
  "category": "activity-event",
  "key": "webinar-attended",
  "displayAs": "Webinar Attended",
  "description": "Learner attended a live webinar session",
  "sortOrder": 85,
  "isActive": true,
  "metadata": {
    "icon": "video-camera",
    "color": "purple"
  }
}
```

**Example: Add Custom Measure Type**
```typescript
// Via API: POST /api/v2/lookup-values
{
  "category": "measure-type",
  "key": "instructor-rating",
  "displayAs": "Instructor Rating",
  "description": "Average instructor rating from learner feedback",
  "sortOrder": 70,
  "isActive": true,
  "metadata": {
    "format": "number",
    "requiresField": false,
    "applicableTo": ["instructor", "class", "course"],
    "icon": "star",
    "color": "gold",
    "aggregationFormula": "avg(feedback.instructorRating)"
  }
}
```

> **Note:** Custom measure types with complex `aggregationFormula` may require corresponding backend implementation. Simple aggregations using existing fields work automatically.

#### Validation: Referencing LookupValues

When creating `LearningEvent` documents, validate against LookupValue:

```typescript
// In LearningEvent.model.ts pre-save hook
import LookupValue from '../LookupValue.model';

LearningEventSchema.pre('save', async function(next) {
  // Validate eventType exists in LookupValue
  const validType = await LookupValue.findOne({
    category: 'activity-event',
    key: this.eventType,
    isActive: true
  });
  
  if (!validType) {
    return next(new Error(`Invalid eventType: ${this.eventType}. Must be a valid activity-event lookup.`));
  }
  
  next();
});
```

#### 3.2.3 Add `courseId` to ClassEnrollment

```typescript
// Location: src/models/enrollment/ClassEnrollment.model.ts
// ⚠️ BREAKING CHANGE - Add denormalized courseId

interface IClassEnrollment extends Document {
  // ... existing fields ...
  
  courseId: ObjectId;                 // NEW: Denormalized from Class
  // This enables efficient course-level aggregation without joins
}
```

**Migration Script Required:** Populate `courseId` from `Class.courseId` for all existing enrollments.

### 3.3 Recommended Indexes

```javascript
// ReportJob indexes
db.reportJobs.createIndex({ organizationId: 1, createdBy: 1, createdAt: -1 });
db.reportJobs.createIndex({ organizationId: 1, status: 1, priority: -1, createdAt: 1 });
db.reportJobs.createIndex({ organizationId: 1, departmentId: 1, visibility: 1 });
db.reportJobs.createIndex({ scheduleId: 1 }, { sparse: true });
db.reportJobs.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ReportTemplate indexes
db.reportTemplates.createIndex({ organizationId: 1, isSystemTemplate: 1, visibility: 1 });
db.reportTemplates.createIndex({ organizationId: 1, createdBy: 1 });
db.reportTemplates.createIndex({ organizationId: 1, category: 1, tags: 1 });
db.reportTemplates.createIndex({ slug: 1 }, { unique: true });

// ReportSchedule indexes
db.reportSchedules.createIndex({ organizationId: 1, isActive: 1, nextRunAt: 1 });
db.reportSchedules.createIndex({ templateId: 1 });

// LearningEvent indexes (enhanced)
db.learningEvents.createIndex({ organizationId: 1, learnerId: 1, timestamp: -1 });
db.learningEvents.createIndex({ organizationId: 1, courseId: 1, eventType: 1, timestamp: -1 });
db.learningEvents.createIndex({ organizationId: 1, classId: 1, timestamp: -1 });
db.learningEvents.createIndex({ organizationId: 1, "aggregation.dayKey": 1, eventType: 1 });
db.learningEvents.createIndex({ organizationId: 1, "aggregation.monthKey": 1, eventType: 1 });
```

---

## 4. Recommended API Changes

### 4.1 New Endpoints to Create

#### 4.1.1 Report Jobs API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v2/report-jobs` | Create new report job |
| `GET` | `/api/v2/report-jobs` | List report jobs |
| `GET` | `/api/v2/report-jobs/:id` | Get job details |
| `GET` | `/api/v2/report-jobs/:id/status` | Get job status (lightweight) |
| `GET` | `/api/v2/report-jobs/:id/download` | Get signed download URL |
| `DELETE` | `/api/v2/report-jobs/:id` | Cancel/delete job |
| `POST` | `/api/v2/report-jobs/:id/retry` | Retry failed job |
| `POST` | `/api/v2/report-jobs/:id/duplicate` | Clone job with modifications |

#### 4.1.2 Report Templates API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v2/report-templates` | Create template |
| `GET` | `/api/v2/report-templates` | List templates |
| `GET` | `/api/v2/report-templates/:id` | Get template |
| `PUT` | `/api/v2/report-templates/:id` | Update template |
| `DELETE` | `/api/v2/report-templates/:id` | Delete template |
| `POST` | `/api/v2/report-templates/:id/generate` | Create job from template |
| `POST` | `/api/v2/report-templates/:id/duplicate` | Clone template |
| `POST` | `/api/v2/report-templates/:id/share` | Share template |

#### 4.1.3 Report Schedules API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v2/report-schedules` | Create schedule |
| `GET` | `/api/v2/report-schedules` | List schedules |
| `GET` | `/api/v2/report-schedules/:id` | Get schedule |
| `PUT` | `/api/v2/report-schedules/:id` | Update schedule |
| `DELETE` | `/api/v2/report-schedules/:id` | Delete schedule |
| `POST` | `/api/v2/report-schedules/:id/pause` | Pause schedule |
| `POST` | `/api/v2/report-schedules/:id/resume` | Resume schedule |
| `POST` | `/api/v2/report-schedules/:id/run-now` | Trigger immediate run |

#### 4.1.4 Report Metadata API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v2/report-metadata/dimensions` | Get available dimensions |
| `GET` | `/api/v2/report-metadata/measures` | Get available measures |
| `GET` | `/api/v2/report-metadata/slicers` | Get available slicers |
| `GET` | `/api/v2/report-metadata/groups` | Get available groups |
| `GET` | `/api/v2/report-metadata/filters` | Get available filters |
| `POST` | `/api/v2/report-metadata/validate` | Validate report definition |
| `POST` | `/api/v2/report-metadata/preview` | Preview report data |
| `POST` | `/api/v2/report-metadata/estimate` | Estimate complexity/rows |

### 4.2 Existing Endpoints to DEPRECATE

| Endpoint | Action | Reason |
|----------|--------|--------|
| `GET /api/v2/reports/completion` | Keep but deprecate | Use job queue for large reports |
| `GET /api/v2/reports/performance` | Keep but deprecate | Use job queue for large reports |
| `GET /api/v2/reports/transcript/:learnerId` | Keep as real-time | Small, user-specific |

**Deprecation Strategy:**
1. Add `X-Deprecated: true` header to responses
2. Add deprecation warning to docs
3. Return `X-Migration-Path: POST /api/v2/report-jobs` header
4. Remove after 6 months

### 4.3 API Response Structure (Standardized)

```typescript
// Standard success response
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    timing?: {
      queryMs: number;
      totalMs: number;
    };
    cache?: {
      hit: boolean;
      ttl: number;
    };
  };
}

// Standard error response
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    field?: string;                   // For validation errors
    stack?: string;                   // Development only
  };
  requestId: string;
}
```

### 4.4 New Permissions

```typescript
// Add to permissions.service.ts

const REPORT_PERMISSIONS = {
  // Report Jobs
  'reports:jobs:create': 'Create report jobs',
  'reports:jobs:read': 'View own report jobs',
  'reports:jobs:read-all': 'View all report jobs (admin)',
  'reports:jobs:delete': 'Delete own report jobs',
  'reports:jobs:delete-all': 'Delete any report job (admin)',
  
  // Report Templates
  'reports:templates:create': 'Create report templates',
  'reports:templates:read': 'View templates',
  'reports:templates:update': 'Update own templates',
  'reports:templates:delete': 'Delete own templates',
  'reports:templates:manage': 'Manage all templates (admin)',
  'reports:templates:share': 'Share templates with others',
  
  // Report Schedules
  'reports:schedules:create': 'Create scheduled reports',
  'reports:schedules:read': 'View schedules',
  'reports:schedules:update': 'Update own schedules',
  'reports:schedules:delete': 'Delete own schedules',
  'reports:schedules:manage': 'Manage all schedules (admin)',
  
  // Data Access (by dimension)
  'reports:data:learners': 'Access learner data in reports',
  'reports:data:instructors': 'Access instructor data in reports',
  'reports:data:performance': 'Access performance/grade data',
  'reports:data:financial': 'Access financial data in reports',
  'reports:data:cross-department': 'Access data across departments',
};
```

---

## 5. Comparison Matrix

### 5.1 Event Types: Current vs Proposed vs Optimal

| Current Model | Current Contract | UI Proposal | Recommended (Hyphens) |
|---------------|------------------|-------------|------------------------|
| `content-viewed` | - | - | `content-viewed` ✅ |
| `content-started` | `content_started` ❌ | `content_started` | `content-started` ✅ |
| `content-completed` | `content_completed` ❌ | `content_completed` | `content-completed` ✅ |
| `exam-started` | `assessment_started` ❌ | `assessment_started` | `assessment-started` ✅ |
| `exam-submitted` | `assessment_completed` ❌ | `assessment_completed` | `assessment-submitted` ✅ |
| - | - | - | `assessment-completed` (NEW) |
| `video-played` | - | - | `video-played` ✅ |
| `video-paused` | - | - | `video-paused` ✅ |
| `video-completed` | - | - | `video-completed` ✅ |
| `assignment-submitted` | - | - | `assessment-submitted` |
| `scorm-launched` | - | - | `scorm-launched` ✅ |
| `scorm-exited` | - | - | `scorm-exited` ✅ |
| - | - | - | `scorm-completed` (NEW) |
| - | `module_completed` ❌ | `module_completed` | `module-completed` |
| - | `course_completed` ❌ | `course_completed` | `course-completed` |
| - | `achievement_earned` ❌ | `achievement_earned` | `achievement-earned` |
| `login` | `login` | `login` | `login` ✅ |
| `logout` | `logout` | `logout` | `logout` ✅ |
| - | `enrollment` | `enrollment` | `enrollment-created` |

**Decision:** Use **hyphens (kebab-case)** to align with existing model implementation and role naming convention. Fix contracts to match.

### 5.2 Data Models: Current vs UI vs Recommended

| Aspect | Current | UI Proposal | Recommended |
|--------|---------|-------------|-------------|
| Report queue | ❌ None | ReportJob | ReportJob (enhanced) |
| Templates | ❌ None | ReportTemplate | ReportTemplate + versioning |
| Schedules | ❌ None | In ReportJob | Separate ReportSchedule |
| Cache | ❌ None | ReportDataCache | Aggregation precompute tables |
| Event courseId | ❌ Missing | Not addressed | ✅ Add courseId |
| Event enrollmentId | ❌ Missing | Not addressed | ✅ Add enrollmentId |
| Aggregation helpers | ❌ None | Not addressed | ✅ Add dayKey/monthKey |
| Multi-tenant | ⚠️ Partial | Not addressed | ✅ Add organizationId |
| **Enum storage** | ❌ Hardcoded | ❌ Hardcoded | ✅ **LookupValue table** |

### 5.3 API Endpoints: Current vs UI vs Recommended

| Endpoint | Current | UI Proposal | Recommended |
|----------|---------|-------------|-------------|
| Create job | ❌ | `POST /report-jobs` | ✅ Same |
| List jobs | ❌ | `GET /report-jobs` | ✅ Same |
| Get job | ❌ | `GET /report-jobs/:id` | ✅ Same |
| Job status | ❌ | `GET /report-jobs/:id/status` | ✅ Same |
| Download | ❌ | `GET /report-jobs/:id/download` | ✅ Same |
| Retry job | ❌ | `POST /report-jobs/:id/retry` | ✅ Same |
| Duplicate job | ❌ | ❌ | ✅ Add |
| Templates CRUD | ❌ | ✅ All | ✅ Same + duplicate/share |
| Schedules | ❌ | ❌ Embedded | ✅ Separate CRUD |
| Metadata | ❌ | ✅ All | ✅ Same + estimate |
| Real-time reports | ✅ | Deprecate | Keep for small queries |

---

## 6. Implementation Priority

### Phase 1: Foundation (Week 1-2)

1. **Create new models:**
   - [ ] `ReportJob.model.ts`
   - [ ] `ReportTemplate.model.ts`
   - [ ] `ReportSchedule.model.ts`
   - [ ] Shared types/interfaces

2. **Update existing models:**
   - [ ] Migrate `LearningEvent` event types (underscore standardization)
   - [ ] Add `courseId` to `LearningEvent`
   - [ ] Add `enrollmentId` to `LearningEvent`
   - [ ] Add `aggregation` fields to `LearningEvent`
   - [ ] Add `courseId` to `ClassEnrollment`

3. **Run migrations:**
   - [ ] Event type migration script
   - [ ] Backfill `courseId` on enrollments
   - [ ] Create new indexes

### Phase 2: Core APIs (Week 3-4)

4. **Implement Report Jobs API:**
   - [ ] CRUD endpoints
   - [ ] Status polling
   - [ ] Download flow
   - [ ] Retry mechanism

5. **Implement Report Templates API:**
   - [ ] CRUD endpoints
   - [ ] Generate from template
   - [ ] Sharing

6. **Implement Report Metadata API:**
   - [ ] Dimensions/measures/slicers
   - [ ] Validation
   - [ ] Preview

### Phase 3: Background Processing (Week 5-6)

7. **Job Queue Worker:**
   - [ ] BullMQ/Agenda.js setup
   - [ ] Job processors
   - [ ] Progress tracking
   - [ ] Error handling

8. **File Generation:**
   - [ ] PDF generator (Puppeteer/PDFKit)
   - [ ] Excel generator (ExcelJS)
   - [ ] CSV generator
   - [ ] JSON generator

9. **Storage Integration:**
   - [ ] S3 adapter
   - [ ] Signed URL generation
   - [ ] TTL/cleanup

### Phase 4: Scheduling (Week 7)

10. **Schedules API:**
    - [ ] CRUD endpoints
    - [ ] Cron evaluation
    - [ ] Run triggering

### Phase 5: Optimization (Week 8)

11. **Performance:**
    - [ ] Aggregation pipelines
    - [ ] Query optimization
    - [ ] Caching layer
    - [ ] Rate limiting

---

## 7. Migration Notes

### 7.1 Seed LookupValue Entries for Event Types

Since existing event types already use hyphens (kebab-case), no data migration is needed. We just need to seed the LookupValue table with the canonical event types:

```javascript
// Migration script: Seed activity-event lookups
// Location: scripts/seeds/seed-activity-events.ts

const activityEvents = [
  // Existing types (already in LearningEvent model)
  { category: 'activity-event', key: 'content-viewed', displayAs: 'Content Viewed', sortOrder: 20 },
  { category: 'activity-event', key: 'content-started', displayAs: 'Content Started', sortOrder: 21 },
  { category: 'activity-event', key: 'content-completed', displayAs: 'Content Completed', sortOrder: 22 },
  { category: 'activity-event', key: 'exam-started', displayAs: 'Exam Started', sortOrder: 30 },
  { category: 'activity-event', key: 'exam-submitted', displayAs: 'Exam Submitted', sortOrder: 31 },
  { category: 'activity-event', key: 'video-played', displayAs: 'Video Played', sortOrder: 60 },
  { category: 'activity-event', key: 'video-paused', displayAs: 'Video Paused', sortOrder: 61 },
  { category: 'activity-event', key: 'video-completed', displayAs: 'Video Completed', sortOrder: 63 },
  { category: 'activity-event', key: 'assignment-submitted', displayAs: 'Assignment Submitted', sortOrder: 35 },
  { category: 'activity-event', key: 'scorm-launched', displayAs: 'SCORM Launched', sortOrder: 50 },
  { category: 'activity-event', key: 'scorm-exited', displayAs: 'SCORM Exited', sortOrder: 56 },
  { category: 'activity-event', key: 'login', displayAs: 'Login', sortOrder: 72 },
  { category: 'activity-event', key: 'logout', displayAs: 'Logout', sortOrder: 73 },
  
  // NEW types to add
  { category: 'activity-event', key: 'enrollment-created', displayAs: 'Enrollment Created', sortOrder: 10 },
  { category: 'activity-event', key: 'enrollment-started', displayAs: 'Enrollment Started', sortOrder: 11 },
  { category: 'activity-event', key: 'enrollment-completed', displayAs: 'Enrollment Completed', sortOrder: 12 },
  { category: 'activity-event', key: 'enrollment-withdrawn', displayAs: 'Enrollment Withdrawn', sortOrder: 13 },
  { category: 'activity-event', key: 'content-downloaded', displayAs: 'Content Downloaded', sortOrder: 23 },
  { category: 'activity-event', key: 'assessment-started', displayAs: 'Assessment Started', sortOrder: 30 },
  { category: 'activity-event', key: 'assessment-submitted', displayAs: 'Assessment Submitted', sortOrder: 31 },
  { category: 'activity-event', key: 'assessment-completed', displayAs: 'Assessment Completed', sortOrder: 32 },
  { category: 'activity-event', key: 'assessment-graded', displayAs: 'Assessment Graded', sortOrder: 33 },
  { category: 'activity-event', key: 'module-started', displayAs: 'Module Started', sortOrder: 40 },
  { category: 'activity-event', key: 'module-completed', displayAs: 'Module Completed', sortOrder: 41 },
  { category: 'activity-event', key: 'course-started', displayAs: 'Course Started', sortOrder: 42 },
  { category: 'activity-event', key: 'course-completed', displayAs: 'Course Completed', sortOrder: 43 },
  { category: 'activity-event', key: 'scorm-initialized', displayAs: 'SCORM Initialized', sortOrder: 51 },
  { category: 'activity-event', key: 'scorm-completed', displayAs: 'SCORM Completed', sortOrder: 52 },
  { category: 'activity-event', key: 'scorm-passed', displayAs: 'SCORM Passed', sortOrder: 53 },
  { category: 'activity-event', key: 'scorm-failed', displayAs: 'SCORM Failed', sortOrder: 54 },
  { category: 'activity-event', key: 'scorm-suspended', displayAs: 'SCORM Suspended', sortOrder: 55 },
  { category: 'activity-event', key: 'video-seeked', displayAs: 'Video Seeked', sortOrder: 62 },
  { category: 'activity-event', key: 'session-started', displayAs: 'Session Started', sortOrder: 70 },
  { category: 'activity-event', key: 'session-ended', displayAs: 'Session Ended', sortOrder: 71 },
  { category: 'activity-event', key: 'achievement-earned', displayAs: 'Achievement Earned', sortOrder: 80 },
  { category: 'activity-event', key: 'certificate-issued', displayAs: 'Certificate Issued', sortOrder: 81 },
];

// Upsert each event type
for (const event of activityEvents) {
  await LookupValue.findOneAndUpdate(
    { category: event.category, key: event.key },
    { $set: { ...event, isActive: true } },
    { upsert: true }
  );
}
```

### 7.2 Seed Report Types in LookupValue

```javascript
// Migration script: Seed report-type lookups
const reportTypes = [
  { category: 'report-type', key: 'enrollment-summary', displayAs: 'Enrollment Summary', sortOrder: 10 },
  { category: 'report-type', key: 'completion-rates', displayAs: 'Completion Rates', sortOrder: 20 },
  { category: 'report-type', key: 'performance-analysis', displayAs: 'Performance Analysis', sortOrder: 30 },
  { category: 'report-type', key: 'learner-activity', displayAs: 'Learner Activity', sortOrder: 40 },
  { category: 'report-type', key: 'course-analytics', displayAs: 'Course Analytics', sortOrder: 50 },
  { category: 'report-type', key: 'instructor-workload', displayAs: 'Instructor Workload', sortOrder: 60 },
  { category: 'report-type', key: 'department-overview', displayAs: 'Department Overview', sortOrder: 70 },
  { category: 'report-type', key: 'program-progress', displayAs: 'Program Progress', sortOrder: 80 },
  { category: 'report-type', key: 'assessment-results', displayAs: 'Assessment Results', sortOrder: 90 },
  { category: 'report-type', key: 'scorm-attempts', displayAs: 'SCORM Attempts', sortOrder: 100 },
  { category: 'report-type', key: 'transcript', displayAs: 'Transcript', sortOrder: 110 },
  { category: 'report-type', key: 'certification-status', displayAs: 'Certification Status', sortOrder: 120 },
];

for (const type of reportTypes) {
  await LookupValue.findOneAndUpdate(
    { category: type.category, key: type.key },
    { $set: { ...type, isActive: true } },
    { upsert: true }
  );
}
```

### 7.3 Fix Contracts: Update Underscores to Hyphens

The `learning-events.contract.ts` file needs to be updated to use hyphens:

```typescript
// File: contracts/api/learning-events.contract.ts
// BEFORE (incorrect):
enum: ['content_started', 'content_completed', 'assessment_started', ...]

// AFTER (correct):
enum: ['content-started', 'content-completed', 'assessment-started', ...]
```

### 7.4 Backfill CourseId on LearningEvents

```javascript
// For events with classId, backfill courseId from Class collection
db.learningevents.aggregate([
  { $match: { classId: { $exists: true }, courseId: { $exists: false } } },
  { $lookup: { from: 'classes', localField: 'classId', foreignField: '_id', as: 'class' } },
  { $unwind: '$class' },
  { $set: { courseId: '$class.courseId' } },
  { $unset: 'class' },
  { $merge: { into: 'learningevents', whenMatched: 'merge' } }
]);

// For events with contentId, backfill courseId from CourseContent
db.learningevents.aggregate([
  { $match: { contentId: { $exists: true }, courseId: { $exists: false } } },
  { $lookup: { from: 'coursecontents', localField: 'contentId', foreignField: '_id', as: 'content' } },
  { $unwind: '$content' },
  { $set: { courseId: '$content.courseId' } },
  { $unset: 'content' },
  { $merge: { into: 'learningevents', whenMatched: 'merge' } }
]);
```

### 7.5 Add Aggregation Keys

```javascript
// Backfill aggregation helper fields for efficient time-based queries
db.learningevents.find({ 'aggregation.dayKey': { $exists: false } }).forEach(doc => {
  const ts = new Date(doc.timestamp);
  const year = ts.getFullYear();
  const month = String(ts.getMonth() + 1).padStart(2, '0');
  const day = String(ts.getDate()).padStart(2, '0');
  const week = getISOWeek(ts);
  const quarter = Math.ceil((ts.getMonth() + 1) / 3);
  
  db.learningevents.updateOne(
    { _id: doc._id },
    { 
      $set: { 
        'aggregation.dayKey': `${year}-${month}-${day}`,
        'aggregation.weekKey': `${year}-W${String(week).padStart(2, '0')}`,
        'aggregation.monthKey': `${year}-${month}`,
        'aggregation.quarterKey': `${year}-Q${quarter}`,
        'aggregation.yearKey': year
      } 
    }
  );
});
```

---

## Summary

| Category | UI Proposal | API Recommendation | Breaking Change |
|----------|-------------|-------------------|-----------------|
| ReportJob model | ✅ Good | ✅ Enhanced with metrics, multi-tenant | No |
| ReportTemplate | ✅ Good | ✅ Enhanced with versioning | No |
| Scheduling | ⚠️ Embedded | ✅ Separate collection | Yes (conceptually) |
| **Naming convention** | Underscores | ✅ **Hyphens (kebab-case)** | **Contracts only** |
| **Enum storage** | Hardcoded | ✅ **LookupValue table** | No (additive) |
| LearningEvent.courseId | Missing | ✅ Add | **Yes** |
| LearningEvent.enrollmentId | Missing | ✅ Add | **Yes** |
| Aggregation helpers | Missing | ✅ Add | **Yes** |
| Multi-tenant | Missing | ✅ Add organizationId | **Yes** |
| API endpoints | ✅ Good | ✅ Mostly aligned + additions | No |

**Recommended Action:** Proceed with implementation including breaking changes. This is the optimal time to establish a clean, scalable foundation before production.

**Key Decisions:**
1. **Hyphens (kebab-case)** for all enum values - aligns with existing roles and model
2. **LookupValue storage** for all enum types - enables runtime extensibility
3. **Fix contracts** to use hyphens instead of underscores

---

## Document Status

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-15 | API Team | Initial recommendation |
| 1.1.0 | 2026-01-15 | API Team | Standardized on hyphens (kebab-case), added LookupValue storage for extensible enums |

**Next Steps:**
1. UI Team review of recommendations
2. Joint API/UI alignment meeting
3. Finalize schema decisions
4. Seed LookupValue entries for event types and report types
5. Fix `learning-events.contract.ts` to use hyphens
6. Begin Phase 1 implementation
