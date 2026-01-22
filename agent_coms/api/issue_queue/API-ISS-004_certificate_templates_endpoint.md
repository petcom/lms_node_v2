# API-ISS-004: Certificate Templates List Endpoint

## Status: COMPLETE
## Priority: Medium
## Created: 2026-01-20
## Requested By: UI Team
## Related: UI-ISS-048

---

## Overview

Create endpoint to list certificate templates available for program configuration.

---

## Endpoint Specification

### `GET /api/v2/certificate-templates`

**Authorization:** `content:programs:manage`

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| scope | string | Filter: system, organization, department |
| departmentId | string | Filter by department (for department-scoped) |

**Response (200):**
```json
{
  "status": "success",
  "success": true,
  "data": {
    "templates": [
      {
        "id": "tmpl_001",
        "name": "Standard Certificate",
        "description": "Default certificate template",
        "thumbnailUrl": "/templates/standard-thumb.png",
        "scope": "system",
        "isDefault": true
      },
      {
        "id": "tmpl_002",
        "name": "Department Custom",
        "description": "Custom template for Cognitive Therapy",
        "thumbnailUrl": "/templates/custom-thumb.png",
        "scope": "department",
        "departmentId": "dept_456",
        "departmentName": "Cognitive Therapy"
      }
    ]
  }
}
```

---

## Implementation Options

### Option A: Filter Existing Templates
Use existing Template model with type filter for certificates.

### Option B: Create CertificateTemplate Model
Create dedicated model for certificate templates.

**Recommended: Option A** - Use existing Template model, filter by `type: 'certificate'` or add a category field.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/routes/templates.routes.ts` | Add route or create new route file |
| `src/controllers/templates.controller.ts` | Add handler |
| `src/services/templates.service.ts` | Add method |

### Route Definition
```typescript
router.get('/certificate-templates',
  requireAccessRight('content:programs:manage'),
  templatesController.listCertificateTemplates
);
```

---

## Tests Required

1. List all certificate templates
2. Filter by scope (system)
3. Filter by departmentId
4. Empty result when no templates
5. 403 for unauthorized user

---

## Seed Data

Create default system certificate template:
```typescript
{
  name: 'Standard Certificate',
  type: 'certificate',
  scope: 'system',
  isDefault: true,
  content: '<html>...</html>',
  description: 'Default certificate template'
}
```

---

## Acceptance Criteria

- [ ] Endpoint created
- [ ] Filtering works
- [ ] Default template seeded
- [ ] Tests pass
- [ ] Contract documented
