# API-ISS-003: Program Certificate Configuration Endpoint

## Status: COMPLETE
## Priority: Medium
## Created: 2026-01-20
## Requested By: UI Team
## Depends On: API-ISS-002
## Related: UI-ISS-048

---

## Overview

Create endpoint to configure certificate settings for a program.

---

## Endpoint Specification

### `PUT /api/v2/programs/:id/certificate`

**Authorization:** `content:programs:manage`

**Request Body:**
```json
{
  "enabled": true,
  "templateId": "tmpl_001",
  "title": "Certificate of Completion",
  "signatoryName": "Dr. Jane Smith",
  "signatoryTitle": "Department Director",
  "validityPeriod": 24,
  "autoIssue": true
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| enabled | Required, boolean |
| templateId | Optional, must exist if provided |
| title | Optional, max 200 chars |
| signatoryName | Optional, max 100 chars |
| signatoryTitle | Optional, max 100 chars |
| validityPeriod | Optional, number >= 0 |
| autoIssue | Optional, boolean, default false |

**Response (200):**
```json
{
  "status": "success",
  "success": true,
  "data": {
    "programId": "prog_123",
    "programName": "CBT Fundamentals",
    "certificate": {
      "enabled": true,
      "templateId": "tmpl_001",
      "title": "Certificate of Completion",
      "signatoryName": "Dr. Jane Smith",
      "signatoryTitle": "Department Director",
      "validityPeriod": 24,
      "autoIssue": true
    }
  }
}
```

**Errors:**
- 400: Validation error
- 401: Unauthorized
- 403: Forbidden (no permission)
- 404: Program not found

---

## Implementation

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/routes/programs.routes.ts` | Add route |
| `src/controllers/academic/programs.controller.ts` | Add handler |
| `src/services/academic/programs.service.ts` | Add method |

### Route Definition
```typescript
router.put('/:id/certificate',
  requireAccessRight('content:programs:manage'),
  programsController.updateCertificateConfig
);
```

---

## Tests Required

1. Successfully update certificate config
2. Disable certificate (enabled: false)
3. Validation errors for invalid data
4. 404 for non-existent program
5. 403 for unauthorized user
6. templateId validation (must exist)

---

## Acceptance Criteria

- [ ] Endpoint created and documented
- [ ] Request validation implemented
- [ ] Response matches contract
- [ ] Tests pass
- [ ] Contract updated
