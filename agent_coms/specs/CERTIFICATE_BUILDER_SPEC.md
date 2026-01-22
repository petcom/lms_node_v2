# Certificate Builder System Specification

**Version:** 1.0.0
**Date:** 2026-01-20
**Status:** DRAFT

---

## 1. Overview

Visual certificate PDF builder allowing departments to:
- Upload logo/signature images
- Edit certificate text, fonts, styling
- Preview with live data
- Generate print-ready PDFs (300 DPI)
- Store in S3

---

## 2. Architecture

```
UI (Template Editor) → API (Generation Service) → S3 (Storage)
                                ↓
                        Puppeteer HTML→PDF
```

---

## 3. Template Structure

| Component | Storage |
|-----------|---------|
| Layout (size, margins, orientation) | JSON |
| Background (color, image) | CSS + S3 URL |
| Elements (text, images, shapes) | JSON array |
| Styles (fonts, colors) | JSON |
| Variables ({{learnerName}}, etc.) | Mustache syntax |

---

## 4. Standard Variables

| Variable | Example |
|----------|---------|
| `{{learnerName}}` | John Smith |
| `{{courseName}}` | Web Development 101 |
| `{{programName}}` | Web Dev Certificate |
| `{{issueDate}}` | January 15, 2026 |
| `{{expiryDate}}` | January 15, 2027 |
| `{{grade}}` | A |
| `{{verificationCode}}` | CERT-2026-ABC123 |
| `{{verificationUrl}}` | https://verify.lms.com/ABC123 |
| `{{signatoryName}}` | Dr. Jane Doe |
| `{{signatoryTitle}}` | Program Director |

---

## 5. S3 Storage Structure

```
s3://lms-certificates/
├── templates/{departmentId}/{templateId}/
│   ├── template.json
│   ├── preview.png
│   └── assets/
├── assets/{departmentId}/
│   ├── logos/
│   └── signatures/
└── generated/{year}/{month}/{departmentId}/
    └── {certificateId}.pdf
```

---

## 6. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/certificate-templates` | List templates |
| POST | `/certificate-templates` | Create template |
| PUT | `/certificate-templates/:id` | Update template |
| POST | `/certificate-templates/:id/publish` | Publish version |
| POST | `/certificate-assets/upload` | Upload asset |
| POST | `/certificates/generate` | Generate PDF |
| POST | `/certificates/preview` | Preview with sample data |

---

## 7. PDF Generation Settings

| Setting | Value |
|---------|-------|
| DPI | 300 |
| Format | PDF/A-1b |
| Page Sizes | Letter, A4 |
| Engine | Puppeteer/Playwright |

---

## 8. Integration

Auto-issue on program completion when `certificate.autoIssue = true`.

---

## 9. Implementation Phases

1. Template CRUD + S3 setup
2. Asset upload (presigned URLs)
3. Visual builder UI (canvas, drag-drop)
4. PDF generation service
5. Program completion integration
6. Template versioning

---

*See full spec for detailed data models and UI mockups.*
