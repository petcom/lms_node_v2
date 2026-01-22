# Badge & Credential Sharing System Specification

**Version:** 1.0.0
**Date:** 2026-01-20
**Status:** DRAFT

---

## 1. Overview

Shareable credential badges allowing learners to:
- Get minified URLs for credentials
- Display badges on social media, email signatures, letterheads
- Show validity/refresh dates
- Provide public verification (no login required)

---

## 2. Architecture

```
Badge Generation → S3 Storage → Public Verification Page
       ↓                              ↓
  Multiple Sizes              No Auth Required
  QR Codes                    OpenBadges JSON
  Social Images               HTML + OG Metadata
```

---

## 3. Badge Sizes

| Size | Dimensions | Use Case |
|------|------------|----------|
| `lg` | 600x600 | Print, high-res |
| `md` | 300x300 | Website display |
| `sm` | 150x150 | Email signatures |
| `social` | 1200x630 | Social media OG image |
| `icon` | 64x64 | Thumbnails |

---

## 4. Shareable URLs

**Full URL:** `https://verify.lms.com/{verificationCode}`
**Short URL:** `https://badge.lms.co/{shortCode}` (6-8 char base62)

---

## 5. Public Verification Page

No login required. Displays:
- Badge image
- Learner name
- Credential name
- Issue date
- Valid until / Last refreshed date
- Status (Active/Expired/Revoked)
- Issuing organization
- Download/Share buttons

**Status Indicators:**
| Status | Display |
|--------|---------|
| Valid | Green checkmark |
| Expiring Soon | Yellow warning |
| Expired | Gray, "EXPIRED" watermark |
| Revoked | Red X, "REVOKED" watermark |

---

## 6. Social Media Integration

| Platform | Method |
|----------|--------|
| LinkedIn | Certification API deep link |
| Twitter | Tweet intent URL |
| Facebook | Share dialog |
| Email | Mailto with pre-filled content |

**OG Metadata included for rich previews.**

---

## 7. OpenBadges 2.0 Compliance

```json
{
  "@context": "https://w3id.org/openbadges/v2",
  "type": "Assertion",
  "id": "https://verify.lms.com/ABC123",
  "recipient": { "type": "email", "hashed": true },
  "badge": { "type": "BadgeClass", "name": "...", "issuer": {...} },
  "issuedOn": "2026-01-15T10:00:00Z",
  "verification": { "type": "hosted" }
}
```

Content negotiation: `Accept: application/json` returns assertion, `text/html` returns page.

---

## 8. QR Codes

| Style | Use Case |
|-------|----------|
| Standard | Print, general |
| Branded | Marketing (logo in center) |
| Mini | Business cards |

Sizes: 100px to 500px with error correction levels.

---

## 9. S3 Storage Structure

```
s3://lms-badges/
├── templates/{templateId}/
├── generated/{badgeId}/
│   ├── badge-lg.png
│   ├── badge-md.png
│   ├── badge-sm.png
│   ├── badge-social.png
│   ├── badge.svg
│   ├── qr-standard.png
│   └── qr-branded.png
└── assertions/{badgeId}.json
```

---

## 10. API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/badges` | User | List user's badges |
| GET | `/badges/:id/share-links` | User | Get share links |
| GET | `/verify/:code` | None | Public verification |
| GET | `/verify/:code/badge` | None | Badge image |
| GET | `/verify/:code/qr` | None | QR code |
| GET | `/verify/:code/assertion` | None | OpenBadges JSON |

---

## 11. Implementation Phases

1. Badge entity + generation on certificate creation
2. Public verification page (no auth)
3. Multi-size image generation + QR codes
4. Social share integration (LinkedIn, Twitter, etc.)
5. OpenBadges 2.0 compliance
6. User dashboard ("My Badges")
7. Admin badge template designer

---

*See full spec for detailed data models and UI mockups.*
