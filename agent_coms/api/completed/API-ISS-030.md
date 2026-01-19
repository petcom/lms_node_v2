# API-ISS-030: Report Jobs API Endpoints

**Type:** feature  
**Priority:** High  
**Status:** 🔲 Not Started  
**Date Created:** 2026-01-15  
**Blocked By:** API-ISS-024, API-ISS-025, API-ISS-026  
**Blocks:** API-ISS-034 (Background Worker)  

---

## Summary

Create the API endpoints for managing report jobs. These endpoints allow users to create, list, view, and cancel report generation jobs.

---

## Endpoints

### 1. Create Report Job

**POST** `/api/v2/reports/jobs`

Creates a new report generation job.

```typescript
// Request Body
interface CreateReportJobRequest {
  reportType: string;           // LookupValue: report-type.*
  name: string;
  description?: string;
  parameters: {
    dateRange?: {
      startDate: string;        // ISO 8601
      endDate: string;
    };
    filters?: {
      departmentIds?: string[];
      courseIds?: string[];
      classIds?: string[];
      learnerIds?: string[];
      contentIds?: string[];
      eventTypes?: string[];
      statuses?: string[];
    };
    groupBy?: string[];
    measures?: string[];
    includeInactive?: boolean;
  };
  output: {
    format: string;             // LookupValue: output-format.*
    filename?: string;
  };
  priority?: string;            // LookupValue: report-priority.*
  scheduledFor?: string;        // ISO 8601 for delayed execution
  templateId?: string;          // Use settings from template
}

// Response: 201 Created
interface CreateReportJobResponse {
  success: true;
  data: {
    id: string;
    status: string;
    estimatedWaitTime?: number; // seconds
    queuePosition?: number;
  };
}
```

**Authorization:**
- Requires `reports:create` permission
- Department scope filtering applied

---

### 2. List Report Jobs

**GET** `/api/v2/reports/jobs`

Lists report jobs with filtering and pagination.

```typescript
// Query Parameters
interface ListReportJobsQuery {
  status?: string;              // Filter by status
  reportType?: string;          // Filter by report type
  requestedBy?: string;         // Filter by user
  departmentId?: string;        // Filter by department
  fromDate?: string;            // Created after
  toDate?: string;              // Created before
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'status' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

// Response: 200 OK
interface ListReportJobsResponse {
  success: true;
  data: ReportJobSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface ReportJobSummary {
  id: string;
  name: string;
  reportType: string;
  status: string;
  priority: string;
  progress?: {
    percentage: number;
    currentStep: string;
  };
  requestedBy: {
    id: string;
    name: string;
  };
  createdAt: string;
  completedAt?: string;
  output?: {
    format: string;
    downloadUrl?: string;
    expiresAt?: string;
  };
}
```

**Authorization:**
- Requires `reports:read` permission
- Users see own jobs + jobs visible to them based on visibility settings
- Admins see all jobs in their scope

---

### 3. Get Report Job Details

**GET** `/api/v2/reports/jobs/:jobId`

Gets detailed information about a specific job.

```typescript
// Response: 200 OK
interface GetReportJobResponse {
  success: true;
  data: {
    id: string;
    name: string;
    description?: string;
    reportType: string;
    status: string;
    priority: string;
    
    parameters: { /* full parameters */ };
    output: { /* output config */ };
    
    progress?: {
      percentage: number;
      currentStep: string;
      recordsProcessed: number;
      totalRecords: number;
    };
    
    requestedBy: {
      id: string;
      name: string;
      email: string;
    };
    
    scheduledFor?: string;
    startedAt?: string;
    completedAt?: string;
    
    error?: {
      code: string;
      message: string;
    };
    
    createdAt: string;
    updatedAt: string;
  };
}
```

**Authorization:**
- Requires `reports:read` permission
- Must have access to this specific job

---

### 4. Cancel Report Job

**POST** `/api/v2/reports/jobs/:jobId/cancel`

Cancels a pending or running job.

```typescript
// Request Body
interface CancelReportJobRequest {
  reason?: string;
}

// Response: 200 OK
interface CancelReportJobResponse {
  success: true;
  data: {
    id: string;
    status: 'cancelled';
    cancelledAt: string;
    cancelledBy: string;
  };
}
```

**Authorization:**
- Requires `reports:cancel` permission OR be the job owner
- Cannot cancel completed/failed jobs

---

### 5. Download Report

**GET** `/api/v2/reports/jobs/:jobId/download`

Downloads the generated report file.

```typescript
// Response: 200 OK with file stream
// Content-Type based on output format
// Content-Disposition: attachment; filename="report.pdf"
```

**Authorization:**
- Requires `reports:read` permission
- Must have access to this specific job
- Job must be in 'completed' status

---

### 6. Retry Failed Job

**POST** `/api/v2/reports/jobs/:jobId/retry`

Retries a failed job.

```typescript
// Response: 200 OK
interface RetryReportJobResponse {
  success: true;
  data: {
    id: string;
    status: 'pending';
    retryCount: number;
  };
}
```

**Authorization:**
- Requires `reports:create` permission OR be the job owner
- Job must be in 'failed' status
- Max retry count not exceeded

---

## Implementation Steps

1. **Create contract file:**
   - Create `contracts/api/report-jobs.contract.ts`
   - Define all request/response types
   - Add validation schemas

2. **Create controller:**
   - Create `src/controllers/report-jobs.controller.ts`
   - Implement all endpoint handlers
   - Add input validation
   - Add error handling

3. **Create service:**
   - Create `src/services/report-jobs.service.ts`
   - Implement business logic
   - Add authorization checks
   - Integrate with job queue

4. **Create routes:**
   - Create `src/routes/report-jobs.routes.ts`
   - Add middleware for auth and validation
   - Register routes in app.ts

5. **Write tests:**
   - Integration tests for each endpoint
   - Unit tests for service methods
   - Authorization tests

---

## Route Configuration

```typescript
// src/routes/report-jobs.routes.ts

import { Router } from 'express';
import * as controller from '../controllers/report-jobs.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const router = Router();

router.use(authenticate);

router.post('/', 
  authorize('reports:create'),
  validate('createReportJob'),
  controller.createReportJob
);

router.get('/',
  authorize('reports:read'),
  controller.listReportJobs
);

router.get('/:jobId',
  authorize('reports:read'),
  controller.getReportJob
);

router.post('/:jobId/cancel',
  authorize('reports:cancel'),
  controller.cancelReportJob
);

router.get('/:jobId/download',
  authorize('reports:read'),
  controller.downloadReport
);

router.post('/:jobId/retry',
  authorize('reports:create'),
  controller.retryReportJob
);

export default router;
```

---

## Acceptance Criteria

- [ ] All 6 endpoints implemented and functional
- [ ] Contract file with full type definitions
- [ ] Input validation on all endpoints
- [ ] Authorization checks on all endpoints
- [ ] Department scope filtering works correctly
- [ ] Pagination works on list endpoint
- [ ] File download works for completed jobs
- [ ] Integration tests for all endpoints
- [ ] OpenAPI spec generated
- [ ] Postman collection updated

---

## Reference

See [REPORT_SYSTEM_RECOMMENDATION.md](../REPORT_SYSTEM_RECOMMENDATION.md) section 3 for API design.
