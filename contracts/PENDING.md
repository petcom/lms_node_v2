# Contract Status Tracker

**Last Updated:** 2026-01-08

This file tracks the status of API contracts for cross-team coordination.

---

## 📋 Contract Status Legend

| Status | Meaning |
|--------|---------|
| ✅ Complete | Contract defined, endpoint implemented, tests passing |
| 🔨 In Progress | Contract defined, implementation in progress |
| 📝 Defined | Contract created, awaiting implementation |
| 🔲 Pending | Not yet started |

---

## Authentication & Users

| Contract | Status | Backend | Frontend | Notes |
|----------|--------|---------|----------|-------|
| `auth.contract.ts` | ✅ Complete | ✅ | 🔲 | Ready for frontend |
| `users.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |
| `staff.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |
| `learners.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |

---

## Organization

| Contract | Status | Backend | Frontend | Notes |
|----------|--------|---------|----------|-------|
| `departments.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |
| `academic-years.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |

---

## Courses & Content

| Contract | Status | Backend | Frontend | Notes |
|----------|--------|---------|----------|-------|
| `courses.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |
| `content.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |
| `course-segments.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |

---

## Programs & Classes

| Contract | Status | Backend | Frontend | Notes |
|----------|--------|---------|----------|-------|
| `programs.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |
| `classes.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |

---

## Enrollments

| Contract | Status | Backend | Frontend | Notes |
|----------|--------|---------|----------|-------|
| `enrollments.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |
| `program-enrollments.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |

---

## Assessments

| Contract | Status | Backend | Frontend | Notes |
|----------|--------|---------|----------|-------|
| `exams.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |
| `questions.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |
| `exam-attempts.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |

---

## Activity & SCORM

| Contract | Status | Backend | Frontend | Notes |
|----------|--------|---------|----------|-------|
| `content-attempts.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |
| `learning-events.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |
| `scorm.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |

---

## System

| Contract | Status | Backend | Frontend | Notes |
|----------|--------|---------|----------|-------|
| `settings.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |
| `audit-logs.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |
| `reports.contract.ts` | 🔲 Pending | 🔲 | 🔲 | - |

---

## Breaking Changes Queue

| Date | Contract | Change | Migration Notes | Status |
|------|----------|--------|-----------------|--------|
| - | - | - | - | - |

---

## Recent Updates

| Date | Contract | Change | Team |
|------|----------|--------|------|
| 2026-01-08 | `auth.contract.ts` | Initial creation | Backend |

---

## How to Update This File

**Backend Team:**
1. When creating a new contract, add a row with status 📝 Defined
2. When implementation is complete, update to ✅ Complete
3. For breaking changes, add to "Breaking Changes Queue"

**Frontend Team:**
1. When starting implementation, note it in the Frontend column
2. When complete, mark Frontend column as ✅

**Example Update:**
```markdown
| `courses.contract.ts` | 🔨 In Progress | ✅ | 🔨 | Implementation started |
```
