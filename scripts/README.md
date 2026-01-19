# Mock Data Scripts (Current LMS V2 Schema)

This directory contains scripts for generating and managing mock data in a disposable
`lms_mock` MongoDB database. The scripts respect `ENV_FILE` so you can switch between
`.env` and `.env.mock` without editing your primary environment file.

## Quick Start

```bash
# Start the API against the mock database
npm run dev:mock

# Seed mock data
npm run seed:mock

# Purge mock data (with confirmation)
npm run purge:mock

# Purge and reseed
npm run reset:mock
```

## Environment Switching

The scripts look for `ENV_FILE` and default to `.env`. The mock setup uses `.env.mock`:

```bash
ENV_FILE=.env.mock npm run dev
ENV_FILE=.env.mock npm run seed:mock
```

`.env.mock` ships with:

- `MONGODB_URI=mongodb://localhost:27017/lms_mock`
- `DISABLE_REDIS=true`
- Admin seed credentials
- `MOCK_USER_PASSWORD` for mock users

## Seeded Data Summary

### Departments
- System Administration (master, idempotent)
- Behavioral Health
- Cognitive Therapy
- EMDR
- CBT Fundamentals (child of Cognitive Therapy)
- Crisis Intervention (child of Behavioral Health)

### Users
**Passwords:**
- Admin: `ADMIN_PASSWORD` from `.env.mock` (default `Admin123!`)
- Mock users: `MOCK_USER_PASSWORD` from `.env.mock` (default `Password123!`)

**Staff**
- `john.instructor@lms.edu` — instructor (Behavioral Health, Crisis Intervention)
- `maria.content@lms.edu` — content-admin (Cognitive Therapy)
- `sam.department@lms.edu` — department-admin + billing-admin (EMDR)
- `riley.instructor@lms.edu` — instructor (Cognitive Therapy, CBT Fundamentals)
- `taylor.billing@lms.edu` — billing-admin (Behavioral Health)

**Learners**
- `alex.learner@lms.edu` — course-taker (Cognitive Therapy)
- `jordan.student@lms.edu` — auditor (Behavioral Health)
- `casey.learner@lms.edu` — course-taker (EMDR)
- `jamie.student@lms.edu` — course-taker (Behavioral Health)

**Admin**
- `admin@lms.edu` — userTypes: learner, staff, global-admin (from `seed-admin`)

### Academic Data
- Academic year: 2025-2026 (current)
- Courses (6): BH101, BH201, CBT101, CBT201, EMDR101, EMDR201
- Programs (2): CBT Certificate, EMDR Continuing Education
- Classes (6): BH101, BH201, CBT101, CBT201, EMDR101, EMDR201 (Fall 2025 cohorts)

### Content and Activity
- Each course gets multiple modules with video + reading + quiz
- CBT101 includes a SCORM lab in module 3
- Course content links are created
- Sample attempts, exam results, SCORM attempts, and learning events

## Scripts

### Seed Mock Data
```bash
npm run seed:mock
```
Seeds the mock database using `.env.mock` and the current schema. The script is
idempotent for core entities (departments, users, courses, programs) but will
add new activity data if rerun.

### Purge Mock Data
```bash
npm run purge:mock
```
Deletes data from the mock database. Use `--force` to skip confirmation:

```bash
npm run purge:mock:force
```

### Reset Mock Data
```bash
npm run reset:mock
```
Purges and reseeds in one step.

## Notes

- This mock database is intended for development and testing only.
- It is safe to destroy and recreate at any time.
