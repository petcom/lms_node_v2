# UI-ISS-052: Implement Certificate Configuration for Programs

## Status: OPEN

## Problem
Department administrators cannot configure certificates for programs. When learners complete a program, there is no way to automatically generate and issue certificates.

## Expected Behavior
From the Program edit page or management interface, users can:
1. Enable/disable certificate generation for a program
2. Configure certificate details (title, signatory, validity)
3. Select certificate templates
4. Configure auto-issue behavior

## Requirements

### Certificate Configuration Form
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| enabled | toggle | Yes | Enable/disable certificate for this program |
| templateId | select | No | Certificate template to use |
| title | text | No | Override default certificate title |
| signatoryName | text | No | Name displayed as signatory |
| signatoryTitle | text | No | Title of signatory (e.g., "Dean") |
| validityPeriod | number | No | Months until expiry (blank = never) |
| autoIssue | toggle | No | Automatically issue on completion |

### Certificate Templates
- Dropdown of available templates
- Preview thumbnail if available
- System templates + organization templates

### Validation Rules
- If `enabled` is true, at least basic config required
- `validityPeriod` must be positive number or null
- `signatoryName` required if `signatoryTitle` provided

## Implementation

### Files to Create
- `src/features/programs/ui/CertificateConfigForm.tsx`
- `src/features/programs/ui/CertificatePreview.tsx` (optional)
- `src/features/programs/ui/__tests__/CertificateConfigForm.test.tsx`

### UI Layout
```
+--------------------------------------------------+
| Certificate Settings                             |
+--------------------------------------------------+
| [x] Enable Certificate                           |
|                                                  |
| Template: [Select template...       v]           |
|                                                  |
| Certificate Title:                               |
| [Program Completion Certificate    ]             |
|                                                  |
| Signatory Name:                                  |
| [Dr. Jane Smith                    ]             |
|                                                  |
| Signatory Title:                                 |
| [Department Director               ]             |
|                                                  |
| Validity Period (months):                        |
| [24                ] (blank = no expiry)         |
|                                                  |
| [x] Auto-issue on program completion             |
|                                                  |
|                    [Cancel] [Save]               |
+--------------------------------------------------+
```

### Form Validation (Zod)
```typescript
const certificateConfigSchema = z.object({
  enabled: z.boolean(),
  templateId: z.string().optional(),
  title: z.string().max(200).optional(),
  signatoryName: z.string().max(100).optional(),
  signatoryTitle: z.string().max(100).optional(),
  validityPeriod: z.number().positive().optional().nullable(),
  autoIssue: z.boolean().optional(),
}).refine(
  (data) => !data.signatoryTitle || data.signatoryName,
  { message: 'Signatory name required when title is provided' }
);
```

## Acceptance Criteria
- [ ] Certificate config accessible from program edit
- [ ] Enable toggle shows/hides config fields
- [ ] Template dropdown lists available templates
- [ ] All fields save correctly
- [ ] Validation errors displayed appropriately
- [ ] Config persists on program save
- [ ] Preview shows certificate with current settings (optional)

## API Requirements
Verify with API team:
- `GET /api/v2/certificate-templates` - List available templates
- `PUT /api/v2/programs/:id/certificate` - Update certificate config
- `GET /api/v2/programs/:id` - Returns certificate config

## Dependencies
- UI-ISS-051: Program CRUD (certificate config is part of program)
- Certificate template API endpoints

## Related Spec
- [DEPARTMENT_PROGRAM_MANAGEMENT_SPEC.md](../../SPECS/DEPARTMENT_PROGRAM_MANAGEMENT_SPEC.md)

## Priority
Medium

## Created
2026-01-20
