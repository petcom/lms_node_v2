# API Contracts

## Overview

This directory contains the API contracts that serve as the **single source of truth** for communication between the backend and UI teams. The backend team owns and maintains these contracts.

**📋 Quick Links:**
- **Status Tracker:** `PENDING.md` - Full endpoint list with status
- **Getting Started:** `QUICKSTART.md` - Create your first contract in 15 minutes
- **Authorization:** `API_AUTHORIZATION_REFERENCE.md` - Permissions per endpoint
- **UI Integration:** `UI_AUTHORIZATION_IMPLEMENTATION_GUIDE.md` - Frontend auth guide

---

## 🎉 All Contracts Complete (2026-01-16)

**Total Implementation:**
- **28 Contracts** defined
- **270 Endpoints** implemented
- **All 6 Phases** complete

| Phase | Contracts | Endpoints | Status |
|-------|-----------|-----------|--------|
| Phase 1: Identity & Org | 6 | 61 | ✅ Complete |
| Phase 2: Programs & Courses | 5 | 44 | ✅ Complete |
| Phase 3: Content & Templates | 4 | 38 | ✅ Complete |
| Phase 4: Enrollments & Progress | 4 | 36 | ✅ Complete |
| Phase 5: Assessments & Results | 2 | 16 | ✅ Complete |
| Phase 6: System & Settings | 4 | 25 | ✅ Complete |
| Report System (Queue-based) | 3 | 18 | ✅ Complete |
| Additional Routes | - | 32 | ✅ Complete |

See `PENDING.md` for full breakdown.

---

## Directory Structure

```
contracts/
├── README.md                         # This file - Overview
├── PENDING.md                        # Contract status tracker
├── QUICKSTART.md                     # Guide to create contracts
├── API_AUTHORIZATION_REFERENCE.md    # Permissions per endpoint
├── UI_AUTHORIZATION_IMPLEMENTATION_GUIDE.md
├── UI_ROLE_SYSTEM_CONTRACTS.md
│
├── api/                              # Endpoint contracts
│   ├── auth.contract.ts              # ✅ Authentication (13 endpoints)
│   ├── users.contract.ts             # ✅ User management (13 endpoints)
│   ├── staff.contract.ts             # ✅ Staff management (6 endpoints)
│   ├── learners.contract.ts          # ✅ Learner management (5 endpoints)
│   ├── departments.contract.ts       # ✅ Department hierarchy (9 endpoints)
│   ├── academic-years.contract.ts    # ✅ Academic years (15 endpoints)
│   ├── programs.contract.ts          # ✅ Program structure (10 endpoints)
│   ├── program-levels.contract.ts    # ✅ Program levels (4 endpoints)
│   ├── courses.contract.ts           # ✅ Course CRUD (14 endpoints)
│   ├── course-segments.contract.ts   # ✅ Course modules (6 endpoints)
│   ├── classes.contract.ts           # ✅ Class instances (10 endpoints)
│   ├── content.contract.ts           # ✅ Content library (15 endpoints)
│   ├── exercises.contract.ts         # ✅ Exercises/Exams (10 endpoints)
│   ├── questions.contract.ts         # ✅ Question bank (6 endpoints)
│   ├── templates.contract.ts         # ✅ Course templates (7 endpoints)
│   ├── enrollments.contract.ts       # ✅ Enrollment lifecycle (10 endpoints)
│   ├── progress.contract.ts          # ✅ Progress tracking (8 endpoints)
│   ├── content-attempts.contract.ts  # ✅ SCORM attempts (10 endpoints)
│   ├── learning-events.contract.ts   # ✅ Activity feeds (8 endpoints)
│   ├── exam-attempts.contract.ts     # ✅ Exam attempts (8 endpoints)
│   ├── reports.contract.ts           # ✅ Reports (8 endpoints)
│   ├── report-jobs.contract.ts       # ✅ Report queue (6 endpoints)
│   ├── report-templates.contract.ts  # ✅ Report templates (6 endpoints)
│   ├── report-schedules.contract.ts  # ✅ Report schedules (6 endpoints)
│   ├── settings.contract.ts          # ✅ Settings (6 endpoints)
│   ├── audit-logs.contract.ts        # ✅ Audit trails (5 endpoints)
│   ├── permissions.contract.ts       # ✅ Permissions (8 endpoints)
│   └── system.contract.ts            # ✅ System health (6 endpoints)
│
├── types/                            # Shared TypeScript types
│   └── api-types.ts
│
└── validation/                       # Contract validation
```

---

## API Base URL

```
Development: http://localhost:5150/api/v2
Production:  https://api.cadencelms.com/api/v2
```

**Note:** Default port changed from 5000 to 5150 (macOS compatibility).

---

## Cross-Team Workflow

### Backend Team (This Repository)

1. **Define Contract First** - Create/update contract in `contracts/api/`
2. **Implement Endpoint** - Write controller/service to match contract
3. **Export for UI Team** - `npm run contracts:export`
4. **Notify UI Team** - Document breaking changes

### UI Team (Separate Repository)

1. **Import Contracts** - Use contracts to generate TypeScript types
2. **Build API Client** - Type-safe API calls
3. **Mock Responses** - Use contract examples for dev/test

---

## Contract Format

Each contract file follows this structure:

```typescript
// contracts/api/example.contract.ts

export const ExampleContract = {
  // Endpoint metadata
  endpoint: '/api/v2/example',
  method: 'POST',
  version: '1.0.0',
  
  // Request specification
  request: {
    headers: {
      'Authorization': 'Bearer <token>',
      'Content-Type': 'application/json'
    },
    body: {
      field1: { type: 'string', required: true },
      field2: { type: 'number', required: false }
    }
  },
  
  // Response specification
  response: {
    success: {
      status: 200,
      body: {
        id: 'string',
        field1: 'string',
        createdAt: 'Date'
      }
    },
    errors: [
      { status: 400, code: 'VALIDATION_ERROR' },
      { status: 401, code: 'UNAUTHORIZED' },
      { status: 404, code: 'NOT_FOUND' }
    ]
  },
  
  // Example for mocking
  example: {
    request: { field1: 'test', field2: 42 },
    response: { id: '123', field1: 'test', createdAt: '2026-01-08T00:00:00Z' }
  }
};
```

---

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run contracts:export` | Export contracts to JSON and OpenAPI format |
| `npm run contracts:validate` | Validate all contracts are properly formatted |
| `npm run contracts:docs` | Generate API documentation from contracts |

---

## Versioning

Contracts follow semantic versioning:

- **MAJOR**: Breaking changes (removed fields, changed types)
- **MINOR**: New optional fields, new endpoints
- **PATCH**: Documentation, examples, bug fixes

### Breaking Change Process

1. Increment major version
2. Document migration path in `PENDING.md`
3. Notify UI team with timeline
4. Support old version during transition (if possible)

---

## Recent Changes (2026-01-16)

- ✅ Added report-jobs, report-templates, report-schedules routes (18 endpoints)
- ✅ Changed default port from 5000 to 5150 (macOS compatibility)
- ✅ Added @contracts path alias to tsconfig
- ✅ Added zod validation dependency
- ✅ Renamed all middleware files to camelCase
- ✅ Added Redis graceful shutdown

---

## References

- [API Authorization Reference](API_AUTHORIZATION_REFERENCE.md)
- [UI Authorization Guide](UI_AUTHORIZATION_IMPLEMENTATION_GUIDE.md)
- [Role System Contracts](UI_ROLE_SYSTEM_CONTRACTS.md)
- [Developer Guide](../devdocs/DEVELOPER_GUIDE.md)
