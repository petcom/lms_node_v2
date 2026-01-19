# API-ISS-035: Enhance LearningEvent Model for Reporting

**Type:** improvement  
**Priority:** Medium  
**Status:** 🔲 Not Started  
**Date Created:** 2026-01-15  
**Blocked By:** API-ISS-024  
**Blocks:** API-ISS-034  

---

## Summary

Enhance the LearningEvent model with additional fields to support efficient aggregation for reports. These changes add denormalized fields that enable faster queries without complex lookups.

---

## Current State

The LearningEvent model currently lacks direct references to higher-level entities, requiring expensive `$lookup` operations for aggregation:

```typescript
// Current: Missing fields for efficient aggregation
{
  learnerId: ObjectId,
  contentId: ObjectId,
  eventType: string,
  // No courseId - must lookup through content
  // No enrollmentId - must lookup through enrollment matching
  // No departmentId - must lookup through learner
}
```

---

## Proposed Changes

### 1. Add Denormalized Fields

```typescript
// Enhanced LearningEvent schema additions
{
  // Existing fields...
  
  // NEW: Denormalized for aggregation
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    index: true
  },
  
  classId: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    index: true
  },
  
  enrollmentId: {
    type: Schema.Types.ObjectId,
    ref: 'ClassEnrollment',
    index: true
  },
  
  departmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Department',
    index: true
  },
  
  // NEW: Additional metadata for reporting
  contentType: {
    type: String,
    enum: ['scorm', 'video', 'document', 'quiz', 'assignment']
  },
  
  // NEW: Score/duration if applicable
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  
  duration: {
    type: Number,  // milliseconds
    min: 0
  },
  
  // NEW: Aggregation period markers
  eventDate: {
    type: Date,
    index: true
  },
  
  eventWeek: {
    type: String,  // '2026-W03' ISO week format
    index: true
  },
  
  eventMonth: {
    type: String,  // '2026-01' format
    index: true
  }
}
```

---

### 2. Add Compound Indexes

```typescript
// New indexes for common report queries
LearningEventSchema.index({ departmentId: 1, eventType: 1, eventDate: -1 });
LearningEventSchema.index({ courseId: 1, eventType: 1, eventDate: -1 });
LearningEventSchema.index({ classId: 1, eventType: 1, eventDate: -1 });
LearningEventSchema.index({ learnerId: 1, courseId: 1, eventType: 1 });
LearningEventSchema.index({ eventMonth: 1, eventType: 1, departmentId: 1 });
LearningEventSchema.index({ eventWeek: 1, eventType: 1, departmentId: 1 });
```

---

### 3. Pre-save Hook for Denormalization

```typescript
LearningEventSchema.pre('save', async function(next) {
  // Populate courseId from content
  if (this.contentId && !this.courseId) {
    const content = await Content.findById(this.contentId).select('courseId');
    if (content) {
      this.courseId = content.courseId;
    }
  }
  
  // Populate departmentId from learner
  if (this.learnerId && !this.departmentId) {
    const user = await User.findById(this.learnerId).select('departmentId');
    if (user) {
      this.departmentId = user.departmentId;
    }
  }
  
  // Populate enrollmentId if not set
  if (this.learnerId && this.classId && !this.enrollmentId) {
    const enrollment = await ClassEnrollment.findOne({
      learnerId: this.learnerId,
      classId: this.classId
    }).select('_id');
    if (enrollment) {
      this.enrollmentId = enrollment._id;
    }
  }
  
  // Set date aggregation fields
  const date = this.createdAt || new Date();
  this.eventDate = new Date(date.toISOString().split('T')[0]);
  this.eventWeek = this.getISOWeek(date);
  this.eventMonth = date.toISOString().slice(0, 7);
  
  next();
});

LearningEventSchema.methods.getISOWeek = function(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};
```

---

## Migration Strategy

Since this is a **breaking change environment**, we can add these fields without backward compatibility concerns. However, existing records need to be backfilled:

### Backfill Script

```typescript
// scripts/backfill-learning-events.ts

async function backfillLearningEvents(): Promise<void> {
  const batchSize = 1000;
  let processed = 0;
  
  while (true) {
    const events = await LearningEvent.find({
      courseId: { $exists: false }
    }).limit(batchSize);
    
    if (events.length === 0) break;
    
    for (const event of events) {
      // Trigger pre-save hook
      await event.save();
      processed++;
    }
    
    console.log(`Processed ${processed} events`);
  }
  
  console.log('Backfill complete');
}
```

---

## Benefits for Reporting

| Before | After |
|--------|-------|
| 4+ `$lookup` operations per aggregation | 0 lookups needed |
| ~500ms for department report query | ~50ms with indexes |
| Complex pipeline maintenance | Simple match/group stages |
| Memory-intensive for large datasets | Index-optimized queries |

---

## Implementation Steps

1. **Update LearningEvent model:**
   - Add new fields to schema
   - Add compound indexes
   - Add pre-save hook for denormalization

2. **Update LearningEvent service:**
   - Ensure new fields populated on creation
   - Add helper methods for date calculations

3. **Create backfill script:**
   - Create `scripts/backfill-learning-events.ts`
   - Add progress logging
   - Handle errors gracefully

4. **Update existing tests:**
   - Update test fixtures to include new fields
   - Add tests for denormalization logic

5. **Update learning event creation endpoints:**
   - Accept new optional fields
   - Validate field values

---

## Acceptance Criteria

- [ ] New fields added to LearningEvent schema
- [ ] Compound indexes created
- [ ] Pre-save hook populates denormalized fields
- [ ] Date aggregation fields calculated correctly
- [ ] Backfill script works for existing data
- [ ] Existing tests pass
- [ ] New tests for denormalization
- [ ] Query performance improved (benchmark before/after)

---

## Reference

See [REPORT_SYSTEM_RECOMMENDATION.md](../REPORT_SYSTEM_RECOMMENDATION.md) section 2 for data model recommendations.
