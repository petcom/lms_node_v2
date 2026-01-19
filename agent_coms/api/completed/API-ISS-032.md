# API-ISS-032: Report Schedules API Endpoints

**Type:** feature  
**Priority:** Medium  
**Status:** 🔲 Not Started  
**Date Created:** 2026-01-15  
**Blocked By:** API-ISS-027, API-ISS-028  
**Blocks:** API-ISS-034 (Scheduler Worker)  

---

## Summary

Create the API endpoints for managing scheduled/recurring reports. Schedules allow users to automate report generation on a recurring basis.

---

## Endpoints

### 1. Create Report Schedule

**POST** `/api/v2/reports/schedules`

Creates a new report schedule.

```typescript
// Request Body
interface CreateReportScheduleRequest {
  name: string;
  description?: string;
  templateId: string;
  
  schedule: {
    frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
    timezone?: string;          // Default: 'UTC'
    
    // For 'once'
    runAt?: string;             // ISO 8601
    
    // For 'daily'
    timeOfDay?: string;         // 'HH:mm' format
    
    // For 'weekly'
    dayOfWeek?: number;         // 0-6
    
    // For 'monthly'
    dayOfMonth?: number;        // 1-31
    
    // For 'quarterly'
    quarterMonths?: number[];   // e.g., [1, 4, 7, 10]
  };
  
  dateRangeType?: 'previous-period' | 'custom' | 'from-template';
  customDateRange?: {
    startDaysOffset: number;
    endDaysOffset: number;
  };
  
  output?: {
    format?: string;
    filenameTemplate?: string;
  };
  
  delivery: {
    method: 'email' | 'storage' | 'both';
    email?: {
      recipients: string[];
      subject?: string;
      body?: string;
      includeLink?: boolean;
      attachReport?: boolean;
    };
    storage?: {
      provider: 'local' | 's3';
      path?: string;
    };
  };
}

// Response: 201 Created
interface CreateReportScheduleResponse {
  success: true;
  data: {
    id: string;
    name: string;
    nextRunAt: string;
    createdAt: string;
  };
}
```

**Authorization:**
- Requires `reports:create-schedule` permission

---

### 2. List Report Schedules

**GET** `/api/v2/reports/schedules`

Lists report schedules.

```typescript
// Query Parameters
interface ListReportSchedulesQuery {
  templateId?: string;
  isActive?: boolean;
  isPaused?: boolean;
  frequency?: string;
  page?: number;
  limit?: number;
}

// Response: 200 OK
interface ListReportSchedulesResponse {
  success: true;
  data: ReportScheduleSummary[];
  pagination: { /* standard pagination */ };
}

interface ReportScheduleSummary {
  id: string;
  name: string;
  description?: string;
  template: {
    id: string;
    name: string;
    reportType: string;
  };
  schedule: {
    frequency: string;
    timezone: string;
  };
  isActive: boolean;
  isPaused: boolean;
  lastRunAt?: string;
  lastRunStatus?: string;
  nextRunAt?: string;
  runCount: number;
  createdAt: string;
}
```

---

### 3. Get Report Schedule

**GET** `/api/v2/reports/schedules/:scheduleId`

Gets full schedule details.

```typescript
// Response: 200 OK
interface GetReportScheduleResponse {
  success: true;
  data: {
    id: string;
    name: string;
    description?: string;
    template: { /* template details */ };
    schedule: { /* full schedule config */ };
    dateRangeType: string;
    customDateRange?: { /* if custom */ };
    output: { /* output config */ };
    delivery: { /* delivery config */ };
    
    // Status
    isActive: boolean;
    isPaused: boolean;
    pausedReason?: string;
    pausedAt?: string;
    
    // Execution History
    lastRunAt?: string;
    lastRunStatus?: string;
    lastRunJobId?: string;
    nextRunAt?: string;
    runCount: number;
    failureCount: number;
    consecutiveFailures: number;
    
    // Recent Jobs
    recentJobs?: {
      id: string;
      status: string;
      createdAt: string;
    }[];
    
    createdBy: { id: string; name: string; };
    createdAt: string;
    updatedAt: string;
  };
}
```

---

### 4. Update Report Schedule

**PUT** `/api/v2/reports/schedules/:scheduleId`

Updates an existing schedule.

```typescript
// Request Body: Same as create, all fields optional except templateId

// Response: 200 OK
interface UpdateReportScheduleResponse {
  success: true;
  data: {
    id: string;
    name: string;
    nextRunAt: string;         // Recalculated
    updatedAt: string;
  };
}
```

**Authorization:**
- Requires `reports:update-schedule` permission OR be the owner

---

### 5. Delete Report Schedule

**DELETE** `/api/v2/reports/schedules/:scheduleId`

Deletes a schedule (soft-delete by setting isActive=false).

```typescript
// Response: 200 OK
interface DeleteReportScheduleResponse {
  success: true;
  data: {
    id: string;
    deletedAt: string;
  };
}
```

---

### 6. Pause Schedule

**POST** `/api/v2/reports/schedules/:scheduleId/pause`

Pauses a schedule temporarily.

```typescript
// Request Body
interface PauseReportScheduleRequest {
  reason?: string;
}

// Response: 200 OK
interface PauseReportScheduleResponse {
  success: true;
  data: {
    id: string;
    isPaused: true;
    pausedAt: string;
    pausedBy: string;
  };
}
```

---

### 7. Resume Schedule

**POST** `/api/v2/reports/schedules/:scheduleId/resume`

Resumes a paused schedule.

```typescript
// Response: 200 OK
interface ResumeReportScheduleResponse {
  success: true;
  data: {
    id: string;
    isPaused: false;
    nextRunAt: string;
    resumedAt: string;
  };
}
```

---

### 8. Trigger Schedule (Run Now)

**POST** `/api/v2/reports/schedules/:scheduleId/run`

Manually triggers a scheduled report to run immediately.

```typescript
// Response: 201 Created
interface TriggerScheduleResponse {
  success: true;
  data: {
    jobId: string;
    scheduleId: string;
    status: string;
    triggeredManually: true;
  };
}
```

**Authorization:**
- Requires `reports:create` permission
- Schedule must be active (not necessarily unpaused)

---

### 9. Get Schedule History

**GET** `/api/v2/reports/schedules/:scheduleId/history`

Gets execution history for a schedule.

```typescript
// Query Parameters
interface GetScheduleHistoryQuery {
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// Response: 200 OK
interface GetScheduleHistoryResponse {
  success: true;
  data: {
    id: string;         // Job ID
    status: string;
    triggeredManually: boolean;
    startedAt?: string;
    completedAt?: string;
    output?: {
      format: string;
      downloadUrl?: string;
    };
    error?: {
      message: string;
    };
  }[];
  pagination: { /* standard */ };
}
```

---

## Implementation Steps

1. **Create contract file:**
   - Create `contracts/api/report-schedules.contract.ts`

2. **Create controller:**
   - Create `src/controllers/report-schedules.controller.ts`

3. **Create service:**
   - Create `src/services/report-schedules.service.ts`
   - Implement next run calculation
   - Implement pause/resume logic

4. **Create routes:**
   - Create `src/routes/report-schedules.routes.ts`

5. **Write tests:**
   - Integration tests for all endpoints
   - Next run calculation tests

---

## Acceptance Criteria

- [ ] All 9 endpoints implemented
- [ ] Contract file with full type definitions
- [ ] Next run time calculated correctly for all frequencies
- [ ] Pause/resume works correctly
- [ ] Manual trigger creates job with correct parameters
- [ ] History endpoint shows all past executions
- [ ] Timezone handling works correctly
- [ ] Integration tests pass
- [ ] OpenAPI spec generated

---

## Reference

See [REPORT_SYSTEM_RECOMMENDATION.md](../REPORT_SYSTEM_RECOMMENDATION.md) section 3 for API design.
