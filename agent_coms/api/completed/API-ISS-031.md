# API-ISS-031: Report Templates API Endpoints

**Type:** feature  
**Priority:** Medium  
**Status:** 🔲 Not Started  
**Date Created:** 2026-01-15  
**Blocked By:** API-ISS-024, API-ISS-027  
**Blocks:** None  

---

## Summary

Create the API endpoints for managing report templates. Templates allow users to save and reuse report configurations.

---

## Endpoints

### 1. Create Report Template

**POST** `/api/v2/reports/templates`

Creates a new report template.

```typescript
// Request Body
interface CreateReportTemplateRequest {
  name: string;
  description?: string;
  reportType: string;           // LookupValue: report-type.*
  parameters: {
    dateRange?: {
      type: 'fixed' | 'relative';
      startDate?: string;       // For fixed
      endDate?: string;         // For fixed
      relativePeriod?: string;  // For relative: 'last-30-days'
      relativeUnit?: string;    // 'days' | 'weeks' | 'months'
      relativeCount?: number;
    };
    filters?: { /* same as job */ };
    groupBy?: string[];
    measures?: string[];
    includeInactive?: boolean;
  };
  defaultOutput?: {
    format: string;
    filenameTemplate?: string;
  };
  visibility?: string;          // LookupValue: report-visibility.*
  sharedWith?: {
    users?: string[];
    departments?: string[];
    roles?: string[];
  };
}

// Response: 201 Created
interface CreateReportTemplateResponse {
  success: true;
  data: {
    id: string;
    name: string;
    createdAt: string;
  };
}
```

**Authorization:**
- Requires `reports:create-template` permission

---

### 2. List Report Templates

**GET** `/api/v2/reports/templates`

Lists available report templates.

```typescript
// Query Parameters
interface ListReportTemplatesQuery {
  reportType?: string;
  visibility?: string;
  createdBy?: string;
  search?: string;              // Search name/description
  page?: number;
  limit?: number;
}

// Response: 200 OK
interface ListReportTemplatesResponse {
  success: true;
  data: ReportTemplateSummary[];
  pagination: { /* standard pagination */ };
}

interface ReportTemplateSummary {
  id: string;
  name: string;
  description?: string;
  reportType: string;
  visibility: string;
  createdBy: {
    id: string;
    name: string;
  };
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
}
```

**Authorization:**
- Requires `reports:read-templates` permission
- Filters templates based on visibility and sharing settings

---

### 3. Get Report Template

**GET** `/api/v2/reports/templates/:templateId`

Gets full template details.

```typescript
// Response: 200 OK
interface GetReportTemplateResponse {
  success: true;
  data: {
    id: string;
    name: string;
    description?: string;
    reportType: string;
    parameters: { /* full parameters */ };
    defaultOutput: { /* output settings */ };
    visibility: string;
    sharedWith?: { /* sharing config */ };
    createdBy: { id: string; name: string; };
    usageCount: number;
    lastUsedAt?: string;
    createdAt: string;
    updatedAt: string;
  };
}
```

---

### 4. Update Report Template

**PUT** `/api/v2/reports/templates/:templateId`

Updates an existing template.

```typescript
// Request Body: Same as create, all fields optional

// Response: 200 OK
interface UpdateReportTemplateResponse {
  success: true;
  data: {
    id: string;
    name: string;
    updatedAt: string;
  };
}
```

**Authorization:**
- Requires `reports:update-template` permission OR be the owner
- Owner can always update their own templates

---

### 5. Delete Report Template

**DELETE** `/api/v2/reports/templates/:templateId`

Soft-deletes a template.

```typescript
// Response: 200 OK
interface DeleteReportTemplateResponse {
  success: true;
  data: {
    id: string;
    deletedAt: string;
  };
}
```

**Authorization:**
- Requires `reports:delete-template` permission OR be the owner

---

### 6. Clone Report Template

**POST** `/api/v2/reports/templates/:templateId/clone`

Creates a copy of an existing template.

```typescript
// Request Body
interface CloneReportTemplateRequest {
  name: string;                 // New name for the clone
  visibility?: string;          // Override visibility
}

// Response: 201 Created
interface CloneReportTemplateResponse {
  success: true;
  data: {
    id: string;
    name: string;
    clonedFrom: string;
    createdAt: string;
  };
}
```

**Authorization:**
- Requires `reports:create-template` permission
- Must have read access to source template

---

### 7. Run Template (Create Job from Template)

**POST** `/api/v2/reports/templates/:templateId/run`

Creates a new report job from a template.

```typescript
// Request Body (overrides template defaults)
interface RunReportTemplateRequest {
  name?: string;                // Override job name
  parameters?: {                // Override parameters
    dateRange?: { /* override dates */ };
    filters?: { /* additional filters */ };
  };
  output?: {
    format?: string;            // Override format
  };
  priority?: string;
  scheduledFor?: string;
}

// Response: 201 Created
interface RunReportTemplateResponse {
  success: true;
  data: {
    jobId: string;
    status: string;
    templateId: string;
  };
}
```

**Authorization:**
- Requires `reports:create` permission
- Must have read access to template

---

## Implementation Steps

1. **Create contract file:**
   - Create `contracts/api/report-templates.contract.ts`
   - Define all request/response types

2. **Create controller:**
   - Create `src/controllers/report-templates.controller.ts`

3. **Create service:**
   - Create `src/services/report-templates.service.ts`
   - Implement visibility/sharing logic

4. **Create routes:**
   - Create `src/routes/report-templates.routes.ts`

5. **Write tests:**
   - Integration tests for all endpoints
   - Visibility/sharing tests

---

## Acceptance Criteria

- [ ] All 7 endpoints implemented
- [ ] Contract file with full type definitions
- [ ] Visibility filtering works correctly
- [ ] Sharing with users/departments/roles works
- [ ] Clone creates independent copy
- [ ] Run template creates job with merged parameters
- [ ] Usage tracking updates on template use
- [ ] Integration tests pass
- [ ] OpenAPI spec generated

---

## Reference

See [REPORT_SYSTEM_RECOMMENDATION.md](../REPORT_SYSTEM_RECOMMENDATION.md) section 3 for API design.
