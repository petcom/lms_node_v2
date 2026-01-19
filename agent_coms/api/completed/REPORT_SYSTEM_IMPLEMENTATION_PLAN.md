# Report System Implementation Plan

**Document Version:** 1.0  
**Created:** 2026-01-15  
**Status:** Ready for Review  

---

## Executive Summary

This document outlines the implementation plan for the Report System based on the UI team's specifications and API team's recommendations. The implementation is structured in 4 phases over approximately 6-8 weeks.

---

## Phase Overview

```
Phase 1: Foundation (Week 1-2)
├── API-ISS-024: Seed LookupValue entries
├── API-ISS-025: Fix learning-events.contract.ts
├── API-ISS-029: Add LookupValue validation
└── API-ISS-035: Enhance LearningEvent model

Phase 2: Core Models (Week 2-3)
├── API-ISS-026: Create ReportJob model
├── API-ISS-027: Create ReportTemplate model
└── API-ISS-028: Create ReportSchedule model

Phase 3: API Endpoints (Week 3-5)
├── API-ISS-030: Report Jobs API
├── API-ISS-031: Report Templates API
├── API-ISS-032: Report Schedules API
└── API-ISS-033: Report Metadata API

Phase 4: Background Processing (Week 5-7)
└── API-ISS-034: Background Report Worker
```

---

## Dependency Graph

```
                        ┌─────────────┐
                        │ API-ISS-024 │
                        │ Seed Values │
                        └──────┬──────┘
               ┌───────────────┼───────────────┐
               │               │               │
               ▼               ▼               ▼
        ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
        │ API-ISS-025 │ │ API-ISS-029 │ │ API-ISS-035 │
        │  Fix Enums  │ │  Validation │ │ Enhance LE  │
        └─────────────┘ └─────────────┘ └──────┬──────┘
                                               │
               ┌───────────────────────────────┘
               │
               ▼
        ┌─────────────┐
        │ API-ISS-026 │
        │  ReportJob  │◀────────────────────────┐
        └──────┬──────┘                         │
               │                                │
               ▼                                │
        ┌─────────────┐                         │
        │ API-ISS-027 │                         │
        │  Template   │                         │
        └──────┬──────┘                         │
               │                                │
               ▼                                │
        ┌─────────────┐                         │
        │ API-ISS-028 │                         │
        │  Schedule   │                         │
        └──────┬──────┘                         │
               │                                │
       ┌───────┴───────┬───────────────┐        │
       │               │               │        │
       ▼               ▼               ▼        │
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ API-ISS-030 │ │ API-ISS-031 │ │ API-ISS-032 │ │
│  Jobs API   │ │ Template API│ │Schedule API │ │
└──────┬──────┘ └─────────────┘ └─────────────┘ │
       │                                        │
       ▼                                        │
┌─────────────┐                          ┌─────────────┐
│ API-ISS-034 │                          │ API-ISS-033 │
│   Worker    │                          │ Metadata API│
└─────────────┘                          └─────────────┘
```

---

## Phase 1: Foundation (Week 1-2)

### Goals
- Establish LookupValue entries for all report system enums
- Standardize naming convention to kebab-case
- Add validation infrastructure
- Enhance LearningEvent for efficient aggregation

### Issues

| Issue | Title | Priority | Est. Hours | Assignee |
|-------|-------|----------|------------|----------|
| API-ISS-024 | Seed LookupValue entries | High | 4 | TBD |
| API-ISS-025 | Fix learning-events.contract.ts | High | 2 | TBD |
| API-ISS-029 | Add LookupValue validation | Medium | 4 | TBD |
| API-ISS-035 | Enhance LearningEvent model | Medium | 8 | TBD |

### Deliverables
- [ ] All LookupValue categories seeded
- [ ] Contracts use kebab-case consistently
- [ ] Validation utility created and tested
- [ ] LearningEvent has denormalized fields
- [ ] Backfill script for existing data

### Milestone: Foundation Complete
- All enum values in LookupValue table
- LearningEvent ready for efficient aggregation
- Validation infrastructure in place

---

## Phase 2: Core Models (Week 2-3)

### Goals
- Create the three core Report System models
- Implement model validation against LookupValue
- Create supporting services

### Issues

| Issue | Title | Priority | Est. Hours | Assignee |
|-------|-------|----------|------------|----------|
| API-ISS-026 | Create ReportJob model | High | 8 | TBD |
| API-ISS-027 | Create ReportTemplate model | High | 6 | TBD |
| API-ISS-028 | Create ReportSchedule model | Medium | 8 | TBD |

### Deliverables
- [ ] ReportJob model with full schema
- [ ] ReportTemplate model with full schema
- [ ] ReportSchedule model with full schema
- [ ] All models validate against LookupValue
- [ ] Services for each model with CRUD operations
- [ ] Unit tests for all models and services

### Milestone: Models Complete
- All three models created and tested
- Services implement business logic
- Ready for API endpoint implementation

---

## Phase 3: API Endpoints (Week 3-5)

### Goals
- Create all API endpoints for report system
- Implement authorization checks
- Generate OpenAPI documentation
- Create integration tests

### Issues

| Issue | Title | Priority | Est. Hours | Assignee |
|-------|-------|----------|------------|----------|
| API-ISS-030 | Report Jobs API | High | 12 | TBD |
| API-ISS-031 | Report Templates API | Medium | 10 | TBD |
| API-ISS-032 | Report Schedules API | Medium | 12 | TBD |
| API-ISS-033 | Report Metadata API | Medium | 6 | TBD |

### Deliverables
- [ ] 6 Report Jobs endpoints
- [ ] 7 Report Templates endpoints
- [ ] 9 Report Schedules endpoints
- [ ] 7 Report Metadata endpoints
- [ ] Contracts for all endpoints
- [ ] Authorization configured
- [ ] Integration tests
- [ ] OpenAPI spec updated
- [ ] Postman collection updated

### Milestone: API Complete
- All endpoints functional
- Authorization working
- Documentation generated
- Ready for background worker

---

## Phase 4: Background Processing (Week 5-7)

### Goals
- Create background worker for report generation
- Implement report type handlers
- Create file generators (PDF, Excel, CSV)
- Set up storage integration

### Issues

| Issue | Title | Priority | Est. Hours | Assignee |
|-------|-------|----------|------------|----------|
| API-ISS-034 | Background Report Worker | High | 24 | TBD |

### Sub-tasks for API-ISS-034

| Sub-task | Description | Est. Hours |
|----------|-------------|------------|
| Worker core | Queue polling, job claiming | 6 |
| Report executor | Step-by-step execution | 4 |
| Data fetchers | Per-report-type data fetching | 6 |
| File generators | PDF, Excel, CSV output | 6 |
| Schedule processor | Scheduled report triggering | 2 |

### Deliverables
- [ ] Worker process that polls queue
- [ ] Handlers for each report type
- [ ] PDF generation (PDFKit or similar)
- [ ] Excel generation (ExcelJS)
- [ ] CSV generation
- [ ] File storage (local + S3)
- [ ] Schedule processor
- [ ] Worker startup script
- [ ] Integration tests

### Milestone: Worker Complete
- Reports generate in background
- Files stored and downloadable
- Scheduled reports execute automatically
- System ready for production

---

## Timeline Summary

| Week | Phase | Focus |
|------|-------|-------|
| Week 1 | Phase 1 | LookupValue seeding, validation utility |
| Week 2 | Phase 1-2 | LearningEvent enhancement, ReportJob model |
| Week 3 | Phase 2-3 | ReportTemplate, ReportSchedule, Jobs API |
| Week 4 | Phase 3 | Templates API, Schedules API |
| Week 5 | Phase 3-4 | Metadata API, Worker core |
| Week 6 | Phase 4 | Data fetchers, File generators |
| Week 7 | Phase 4 | Integration, Testing, Polish |

---

## Resource Requirements

### Development
- 2 Backend developers (6-8 weeks)
- 1 QA engineer (weeks 4-7)

### Dependencies
- PDF library: `pdfkit` or `puppeteer`
- Excel library: `exceljs`
- S3 SDK: `@aws-sdk/client-s3` (if using S3)

### Infrastructure
- Worker process (can run on same server initially)
- File storage (local or S3)
- No additional database required (uses existing MongoDB)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| PDF generation performance | Medium | Medium | Use templates, cache common elements |
| Large report memory issues | Medium | High | Stream data, paginate results |
| Worker crashes losing jobs | Low | Medium | Atomic job claiming, retry logic |
| Schedule timing accuracy | Low | Low | Allow ±1 minute tolerance |

---

## Testing Strategy

### Unit Tests
- Model validation
- Service methods
- Date calculations
- File generation

### Integration Tests
- API endpoint flows
- Authorization checks
- Worker job processing

### E2E Tests
- Create report → Wait → Download
- Schedule → Auto-execute → Verify

### Performance Tests
- Large dataset reports
- Concurrent job processing
- Peak load scenarios

---

## Success Criteria

### Phase 1 Complete
- [ ] 8 LookupValue categories populated
- [ ] All event types use kebab-case
- [ ] LearningEvent has courseId, departmentId, enrollmentId
- [ ] Validation utility working

### Phase 2 Complete
- [ ] 3 new models created
- [ ] All models validate against LookupValue
- [ ] CRUD services implemented
- [ ] Unit test coverage > 80%

### Phase 3 Complete
- [ ] 29 API endpoints functional
- [ ] Authorization working correctly
- [ ] OpenAPI documentation complete
- [ ] Integration tests passing

### Phase 4 Complete
- [ ] Worker processes jobs reliably
- [ ] PDF/Excel/CSV outputs correct
- [ ] Scheduled reports execute on time
- [ ] E2E tests passing

---

## Appendix: Issue Summary

| Issue | Title | Phase | Priority | Status |
|-------|-------|-------|----------|--------|
| API-ISS-024 | Seed LookupValue entries | 1 | High | 🔲 Not Started |
| API-ISS-025 | Fix learning-events.contract.ts | 1 | High | 🔲 Not Started |
| API-ISS-026 | Create ReportJob model | 2 | High | 🔲 Not Started |
| API-ISS-027 | Create ReportTemplate model | 2 | High | 🔲 Not Started |
| API-ISS-028 | Create ReportSchedule model | 2 | Medium | 🔲 Not Started |
| API-ISS-029 | Add LookupValue validation | 1 | Medium | 🔲 Not Started |
| API-ISS-030 | Report Jobs API | 3 | High | 🔲 Not Started |
| API-ISS-031 | Report Templates API | 3 | Medium | 🔲 Not Started |
| API-ISS-032 | Report Schedules API | 3 | Medium | 🔲 Not Started |
| API-ISS-033 | Report Metadata API | 3 | Medium | 🔲 Not Started |
| API-ISS-034 | Background Report Worker | 4 | High | 🔲 Not Started |
| API-ISS-035 | Enhance LearningEvent model | 1 | Medium | 🔲 Not Started |

---

## Next Steps

1. **Review this plan with the team**
2. **Assign developers to issues**
3. **Set up project board for tracking**
4. **Begin Phase 1 implementation**
5. **Schedule weekly progress reviews**
