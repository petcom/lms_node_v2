# Mock Data Use Report (Current LMS V2 Schema)

## Overview
This document summarizes the mock database and credentials created by `npm run seed:mock`.
The mock database is disposable and intended for development/testing only.

## Mock Database
- **Database Name:** `lms_mock`
- **MongoDB URI:** `mongodb://localhost:27017/lms_mock`
- **Environment file:** `.env.mock` (loaded via `ENV_FILE=.env.mock`)

---

## User Credentials

### Admin (global-admin)
- **Email:** `admin@lms.edu`
- **Login Password:** `ADMIN_PASSWORD` in `.env.mock` (default `Admin123!`)
- **Escalation Password:** `ADMIN_ESCALATION_PASSWORD` in `.env.mock` (default `Escalate123!`)

### Staff Users
All staff users use the mock user password from `.env.mock` (`MOCK_USER_PASSWORD`, default `Password123!`).

| Email | Roles | Primary Department |
|------|------|--------------------|
| `john.instructor@lms.edu` | instructor | Behavioral Health |
| `maria.content@lms.edu` | content-admin | Cognitive Therapy |
| `sam.department@lms.edu` | department-admin, billing-admin | EMDR |
| `riley.instructor@lms.edu` | instructor | Cognitive Therapy |
| `taylor.billing@lms.edu` | billing-admin | Behavioral Health |

### Learner Users
All learners use the mock user password from `.env.mock` (`MOCK_USER_PASSWORD`, default `Password123!`).

| Email | Role | Primary Department |
|------|------|--------------------|
| `alex.learner@lms.edu` | course-taker | Cognitive Therapy |
| `jordan.student@lms.edu` | auditor | Behavioral Health |
| `casey.learner@lms.edu` | course-taker | EMDR |
| `jamie.student@lms.edu` | course-taker | Behavioral Health |

---

## Loading Mock Data

```bash
npm run seed:mock
```

To run the API against the mock database:

```bash
npm run dev:mock
```

To reset the mock database:

```bash
npm run reset:mock
```

---

## What Gets Created

- **Departments:** master + 5 departments (Behavioral Health, Cognitive Therapy, EMDR, CBT Fundamentals, Crisis Intervention)
- **Academic Year:** 2025-2026 (current)
- **Courses:** 6 total (BH101, BH201, CBT101, CBT201, EMDR101, EMDR201)
- **Programs:** 2 total (CBT Certificate, EMDR Continuing Education)
- **Classes:** 6 cohorts (BH101, BH201, CBT101, CBT201, EMDR101, EMDR201)
- **Content:** multiple modules per course with video, reading, and quiz content (CBT101 includes a SCORM lab)
- **Activity:** content attempts, learning events, exam results, SCORM attempts

---

## Notes

- The mock database is safe to purge and recreate at any time.
- Always use `.env.mock` when working with mock data.
