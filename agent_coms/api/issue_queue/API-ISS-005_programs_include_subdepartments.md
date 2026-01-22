# API-ISS-005: Programs Include Subdepartments Parameter

## Status: COMPLETE
## Priority: Low
## Created: 2026-01-21
## Requested By: UI Team
## Related: UI-ISS-056

---

## Overview

Add `includeSubdepartments` query parameter to the programs list endpoint, mirroring the existing implementation on the learners endpoint.

---

## Endpoint Specification

### `GET /api/v2/programs?department={id}&includeSubdepartments=true`

**Existing Authorization:** `content:programs:view`

**New Query Parameter:**
| Param | Type | Description |
|-------|------|-------------|
| includeSubdepartments | boolean | Include programs from all descendant departments |

**Behavior:**
- When `false` (default): Exact match on `departmentId`
- When `true`: Include programs from department AND all its descendants
- Only valid when `department` parameter is provided
- Pagination applies to combined results

**Response Enhancement:**
```json
{
  "programs": [
    {
      "id": "prog_123",
      "name": "CBT Fundamentals",
      "department": {
        "id": "dept_456",
        "name": "Cognitive Therapy",
        "level": 2
      }
      // ... other fields
    }
  ]
}
```

---

## Implementation

### Files to Modify

| File | Action |
|------|--------|
| `src/services/academic/programs.service.ts` | Add includeSubdepartments logic |
| `src/controllers/academic/programs.controller.ts` | Pass new filter |

### Code Changes

**Controller (programs.controller.ts):**
```typescript
const filters = {
  // ... existing filters
  includeSubdepartments: req.query.includeSubdepartments === 'true'
};
```

**Service (programs.service.ts):**
```typescript
import { getDepartmentAndSubdepartments } from '@/utils/departmentHierarchy';

// In listPrograms:
if (filters.department) {
  if (filters.includeSubdepartments) {
    const departmentIds = await getDepartmentAndSubdepartments(filters.department);
    query.departmentId = { $in: departmentIds.map(id => new mongoose.Types.ObjectId(id)) };
  } else {
    query.departmentId = new mongoose.Types.ObjectId(filters.department);
  }
}
```

---

## Tests Required

1. List programs with includeSubdepartments=true returns programs from subdepartments
2. List programs with includeSubdepartments=false returns only direct department programs
3. Default behavior (omitted) matches false
4. Response includes department.level
5. Pagination works correctly with combined results
6. Invalid department ID returns 400

---

## UI Team Questions - Answers

1. **Depth limit?** - No limit. All descendants included (matches learners endpoint).
2. **Pagination affected?** - Yes, pagination applies to combined result set.
3. **departmentName included?** - Yes, already present as `department.name`. Adding `department.level`.

---

## Acceptance Criteria

- [ ] Query parameter added
- [ ] Hierarchy logic using existing utility
- [ ] department.level added to response
- [ ] Tests pass
- [ ] Contract updated

