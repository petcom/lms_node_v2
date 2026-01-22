# API-ISS-002: Add Certificate Configuration to Program Model

## Status: COMPLETE
## Priority: Medium
## Created: 2026-01-20
## Requested By: UI Team
## Related: UI-ISS-048, API-ISS-003

---

## Overview

Add certificate configuration fields to the Program model to support program completion certificates.

---

## Schema Changes

### File: `src/models/academic/Program.model.ts`

Add new field to schema:

```typescript
certificate: {
  enabled: { type: Boolean, default: false },
  templateId: { type: Schema.Types.ObjectId, ref: 'Template' },
  title: { type: String, maxlength: 200 },
  signatoryName: { type: String, maxlength: 100 },
  signatoryTitle: { type: String, maxlength: 100 },
  validityPeriod: { type: Number, min: 0 },  // months, 0 = no expiry
  autoIssue: { type: Boolean, default: false }
}
```

---

## TypeScript Interface Update

### File: `src/models/academic/Program.types.ts` (or within model)

```typescript
interface ICertificateConfig {
  enabled: boolean;
  templateId?: Types.ObjectId;
  title?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  validityPeriod?: number;
  autoIssue: boolean;
}

interface IProgram {
  // ... existing fields
  certificate?: ICertificateConfig;
}
```

---

## Migration

No data migration needed - new field is optional and defaults to undefined.

---

## Tests Required

1. Program can be created without certificate config
2. Program can be created with certificate config
3. Certificate config validation (validityPeriod >= 0)
4. templateId references valid Template document

---

## Acceptance Criteria

- [ ] Schema updated with certificate field
- [ ] TypeScript interfaces updated
- [ ] Existing programs unaffected
- [ ] Tests pass
