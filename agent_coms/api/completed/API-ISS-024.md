# API-ISS-024: Seed LookupValue Entries for Report System Enums

**Type:** feature/data  
**Priority:** High  
**Status:** 🔲 Not Started  
**Date Created:** 2026-01-15  
**Blocked By:** None  
**Blocks:** API-ISS-025, API-ISS-026, API-ISS-030, API-ISS-031, API-ISS-032  

---

## Summary

Seed the LookupValue collection with all enum values required for the Report System. This enables runtime extensibility for event types, report types, and measure types without code changes.

---

## Requirements

### 1. Activity Event Types (`activity-event` category)

Seed 30+ event types covering:
- Enrollment events: `enrollment-created`, `enrollment-started`, `enrollment-completed`, `enrollment-withdrawn`, `enrollment-expired`
- Content events: `content-viewed`, `content-started`, `content-completed`, `content-downloaded`
- Assessment events: `assessment-started`, `assessment-submitted`, `assessment-completed`, `assessment-graded`
- Module/Course events: `module-started`, `module-completed`, `course-started`, `course-completed`
- SCORM events: `scorm-launched`, `scorm-initialized`, `scorm-completed`, `scorm-passed`, `scorm-failed`, `scorm-suspended`, `scorm-exited`
- Video events: `video-played`, `video-paused`, `video-seeked`, `video-completed`
- Session events: `session-started`, `session-ended`, `login`, `logout`
- Achievement events: `achievement-earned`, `certificate-issued`

### 2. Report Types (`report-type` category)

Seed 12 predefined report types:
- `enrollment-summary`
- `completion-rates`
- `performance-analysis`
- `learner-activity`
- `course-analytics`
- `instructor-workload`
- `department-overview`
- `program-progress`
- `assessment-results`
- `scorm-attempts`
- `transcript`
- `certification-status`

### 3. Measure Types (`measure-type` category)

Seed 18 measure types with rich metadata:
- Basic aggregations: `count`, `count-distinct`, `sum`, `average`, `median`, `min`, `max`, `std-dev`, `variance`
- LMS-specific rates: `completion-rate`, `pass-rate`, `fail-rate`, `engagement-rate`, `retention-rate`, `dropout-rate`
- Time-based: `avg-time-to-complete`, `avg-study-time`
- Score-based: `avg-score`
- Activity-based: `event-count`

Each measure type must include metadata:
```javascript
{
  format: 'number' | 'percent' | 'duration',
  requiresField: boolean,
  applicableTo: string[]  // Which dimensions this measure applies to
}
```

### 4. Report Job Statuses (`report-status` category)

- `pending`, `queued`, `processing`, `rendering`, `uploading`, `ready`, `downloaded`, `failed`, `cancelled`, `expired`

### 5. Report Priorities (`report-priority` category)

- `critical`, `high`, `normal`, `low`, `scheduled`

### 6. Visibility Levels (`report-visibility` category)

- `private`, `team`, `department`, `organization`

### 7. Dimension Entities (`dimension-entity` category)

- `learner`, `course`, `class`, `program`, `department`, `instructor`, `enrollment`, `activity`, `assessment`, `scorm-attempt`

### 8. Output Formats (`output-format` category)

- `pdf`, `excel`, `csv`, `json`

---

## Implementation

### Create Seed Script

**Location:** `scripts/seeds/seed-report-lookups.ts`

```typescript
import LookupValue from '../../src/models/LookupValue.model';
import mongoose from 'mongoose';

async function seedReportLookups() {
  // Activity Events
  const activityEvents = [
    { category: 'activity-event', key: 'enrollment-created', displayAs: 'Enrollment Created', sortOrder: 10 },
    // ... all other events
  ];
  
  // Report Types
  const reportTypes = [
    { category: 'report-type', key: 'enrollment-summary', displayAs: 'Enrollment Summary', sortOrder: 10 },
    // ... all other types
  ];
  
  // Measure Types (with metadata)
  const measureTypes = [
    { 
      category: 'measure-type', 
      key: 'count', 
      displayAs: 'Count',
      description: 'Number of records',
      sortOrder: 10,
      metadata: { format: 'number', requiresField: false, applicableTo: ['all'] }
    },
    // ... all other measures
  ];
  
  // Upsert all entries
  for (const lookup of [...activityEvents, ...reportTypes, ...measureTypes]) {
    await LookupValue.findOneAndUpdate(
      { category: lookup.category, key: lookup.key },
      { $set: { ...lookup, isActive: true } },
      { upsert: true }
    );
  }
}
```

### Add to package.json

```json
"scripts": {
  "seed:report-lookups": "ts-node scripts/seeds/seed-report-lookups.ts"
}
```

---

## Acceptance Criteria

- [ ] Seed script creates all LookupValue entries without errors
- [ ] Script is idempotent (can be run multiple times safely)
- [ ] All entries have proper `displayAs` labels for UI
- [ ] All entries have sequential `sortOrder` for UI ordering
- [ ] Measure types include proper `metadata` with format and applicability
- [ ] Script added to `package.json` scripts
- [ ] README updated with seed command

---

## Reference

See [REPORT_SYSTEM_RECOMMENDATION.md](../REPORT_SYSTEM_RECOMMENDATION.md) section 3.2.2 for full seed data.
