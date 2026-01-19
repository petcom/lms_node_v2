# API-ISS-033: Report Metadata API Endpoints

**Type:** feature  
**Priority:** Medium  
**Status:** 🔲 Not Started  
**Date Created:** 2026-01-15  
**Blocked By:** API-ISS-024  
**Blocks:** None  

---

## Summary

Create API endpoints that expose report system metadata from LookupValue. These endpoints allow the UI to dynamically discover available report types, event types, measures, and other configurable options.

---

## Endpoints

### 1. Get Report Types

**GET** `/api/v2/reports/metadata/report-types`

Returns all available report types.

```typescript
// Response: 200 OK
interface GetReportTypesResponse {
  success: true;
  data: {
    key: string;                // e.g., 'learner-progress'
    name: string;               // e.g., 'Learner Progress Report'
    description: string;
    category?: string;          // e.g., 'progress', 'compliance', 'analytics'
    requiredPermission?: string;
    supportedFormats: string[]; // ['pdf', 'xlsx', 'csv']
    supportedMeasures: string[];
    supportedDimensions: string[];
    isAsync: boolean;           // Requires background processing
  }[];
}
```

---

### 2. Get Activity Event Types

**GET** `/api/v2/reports/metadata/activity-events`

Returns all available activity event types for filtering.

```typescript
// Response: 200 OK
interface GetActivityEventsResponse {
  success: true;
  data: {
    key: string;                // e.g., 'content-completed'
    name: string;               // e.g., 'Content Completed'
    description: string;
    category: string;           // 'content', 'assessment', 'scorm', 'enrollment', 'system'
    trackable: boolean;
  }[];
}
```

---

### 3. Get Measure Types

**GET** `/api/v2/reports/metadata/measure-types`

Returns all available measures for reports.

```typescript
// Response: 200 OK
interface GetMeasureTypesResponse {
  success: true;
  data: {
    key: string;                // e.g., 'completion-rate'
    name: string;               // e.g., 'Completion Rate'
    description: string;
    category: string;           // 'completion', 'performance', 'engagement', 'time', 'count', 'compliance'
    dataType: string;           // 'percentage', 'number', 'duration', 'currency'
    aggregation: string;        // 'sum', 'average', 'count', 'min', 'max', 'latest'
    unit?: string;              // '%', 'hours', 'days'
    formatPattern?: string;     // '{value}%', '{value} hrs'
  }[];
}
```

---

### 4. Get Output Formats

**GET** `/api/v2/reports/metadata/output-formats`

Returns all available output formats.

```typescript
// Response: 200 OK
interface GetOutputFormatsResponse {
  success: true;
  data: {
    key: string;                // e.g., 'pdf'
    name: string;               // e.g., 'PDF Document'
    mimeType: string;           // 'application/pdf'
    extension: string;          // '.pdf'
    supportsCharts: boolean;
    maxRecords?: number;        // Optional limit
  }[];
}
```

---

### 5. Get Dimension Entities

**GET** `/api/v2/reports/metadata/dimensions`

Returns all available grouping/dimension entities.

```typescript
// Response: 200 OK
interface GetDimensionsResponse {
  success: true;
  data: {
    key: string;                // e.g., 'learner'
    name: string;               // e.g., 'Learner'
    description: string;
    fields: {                   // Available fields for this dimension
      key: string;
      name: string;
      dataType: string;
    }[];
  }[];
}
```

---

### 6. Get Report Statuses

**GET** `/api/v2/reports/metadata/statuses`

Returns all possible report job statuses.

```typescript
// Response: 200 OK
interface GetStatusesResponse {
  success: true;
  data: {
    key: string;                // e.g., 'running'
    name: string;               // e.g., 'Running'
    description: string;
    isFinal: boolean;           // No more state changes
    isError: boolean;           // Indicates failure
    color?: string;             // UI hint: 'blue', 'green', 'red', 'yellow'
    icon?: string;              // UI hint: 'spinner', 'check', 'x', 'clock'
  }[];
}
```

---

### 7. Get All Metadata (Combined)

**GET** `/api/v2/reports/metadata`

Returns all metadata in a single request for initial UI load.

```typescript
// Response: 200 OK
interface GetAllMetadataResponse {
  success: true;
  data: {
    reportTypes: { /* same as above */ }[];
    activityEvents: { /* same as above */ }[];
    measureTypes: { /* same as above */ }[];
    outputFormats: { /* same as above */ }[];
    dimensions: { /* same as above */ }[];
    statuses: { /* same as above */ }[];
    priorities: {
      key: string;
      name: string;
      sortOrder: number;
    }[];
    visibility: {
      key: string;
      name: string;
      description: string;
    }[];
  };
}
```

---

## Implementation Steps

1. **Create contract file:**
   - Create `contracts/api/report-metadata.contract.ts`

2. **Create controller:**
   - Create `src/controllers/report-metadata.controller.ts`

3. **Create service:**
   - Create `src/services/report-metadata.service.ts`
   - Query LookupValue by category
   - Transform metadata field to response format
   - Add caching for performance

4. **Create routes:**
   - Create `src/routes/report-metadata.routes.ts`

5. **Write tests:**
   - Integration tests for each endpoint
   - Verify correct data returned

---

## Service Implementation

```typescript
// src/services/report-metadata.service.ts

import { LookupValue } from '../models/LookupValue.model';

interface MetadataItem {
  key: string;
  name: string;
  description?: string;
  [key: string]: any;
}

// Cache for 10 minutes
const cache = new Map<string, { data: MetadataItem[]; expiresAt: number }>();
const CACHE_TTL = 10 * 60 * 1000;

export async function getMetadataByCategory(category: string): Promise<MetadataItem[]> {
  // Check cache
  const cached = cache.get(category);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  
  // Query LookupValue
  const lookupValues = await LookupValue.find({
    category,
    isActive: true
  }).sort({ sortOrder: 1 }).lean();
  
  // Transform to response format
  const data = lookupValues.map(lv => ({
    key: lv.key,
    name: lv.name,
    description: lv.description,
    ...lv.metadata // Spread additional metadata
  }));
  
  // Cache
  cache.set(category, {
    data,
    expiresAt: Date.now() + CACHE_TTL
  });
  
  return data;
}

export async function getAllMetadata(): Promise<Record<string, MetadataItem[]>> {
  const [
    reportTypes,
    activityEvents,
    measureTypes,
    outputFormats,
    dimensions,
    statuses,
    priorities,
    visibility
  ] = await Promise.all([
    getMetadataByCategory('report-type'),
    getMetadataByCategory('activity-event'),
    getMetadataByCategory('measure-type'),
    getMetadataByCategory('output-format'),
    getMetadataByCategory('dimension-entity'),
    getMetadataByCategory('report-status'),
    getMetadataByCategory('report-priority'),
    getMetadataByCategory('report-visibility')
  ]);
  
  return {
    reportTypes,
    activityEvents,
    measureTypes,
    outputFormats,
    dimensions,
    statuses,
    priorities,
    visibility
  };
}
```

---

## Acceptance Criteria

- [ ] All 7 endpoints implemented
- [ ] Data sourced from LookupValue table
- [ ] Metadata field properly transformed to response
- [ ] Caching implemented for performance
- [ ] Combined endpoint returns all metadata
- [ ] No authentication required (public metadata)
- [ ] Integration tests pass
- [ ] OpenAPI spec generated

---

## Reference

See [REPORT_SYSTEM_RECOMMENDATION.md](../REPORT_SYSTEM_RECOMMENDATION.md) section 8 for LookupValue design.
