# UI Team → API Team: Course Summary Analytics Endpoint Request

**From:** UI Team  
**To:** API Team  
**Date:** 2026-01-16 10:00:00  
**Priority:** Medium  
**Type:** New Endpoint Request  

---

## Summary

We have implemented a **Course Summary** page on the Staff Dashboard that provides aggregated analytics across all courses within departments where the user has `department-admin` or `content-admin` roles.

**UI Route:** `/staff/analytics/courses`  
**Sidebar:** Appears after Calendar, before Analytics in Staff Context Nav  

## New Contract Created

| Document | Location |
|----------|----------|
| Analytics API Contract | `api/contracts/api/analytics.contract.ts` |

## What We Need From API Team

1. **Review and implement** the proposed endpoints:
   - `GET /api/v2/analytics/courses/summary` - Get aggregated metrics
   - `POST /api/v2/analytics/courses/summary/export` - Export as PDF/CSV/Excel

2. **Authorization Logic:**
   - User must have `department-admin` OR `content-admin` role in at least one department
   - Data is automatically scoped to only departments where user has these roles
   - When `departmentIds` filter is provided, validate user has required role in those departments

3. **Required Permission:**
   - Add new permission: `analytics:view-course-summary`
   - Add new permission: `analytics:export-course-summary`
   - Assign these to `department-admin` and `content-admin` roles

## Key Data Requirements

### Summary Metrics
- Total courses (published, draft, archived counts)
- Total enrollments and completions
- Overall completion rate (percentage)
- Average assessment score (percentage)
- Total active students

### Department Breakdown
- Per-department metrics matching the summary structure
- Allows comparison between departments

### Trend Data
- Monthly enrollment and completion counts
- Configurable time range (30 days, 3 months, 6 months, 1 year, all time)

### Top Courses
- Top 10 courses by enrollment count
- Include course name, department, enrollments, completion rate

## Current UI Implementation

The UI is implemented with mock data at:
- `/src/pages/staff/analytics/CourseSummaryPage.tsx`

Once the API is ready, we will:
1. Replace mock data with actual API calls using TanStack Query
2. Wire up the export functionality to the export endpoint

## Design Notes

- **Default Behavior:** Shows ALL departments where user has required role (aggregate view)
- **When Department Selected:** Uses department selector in sidebar to filter to specific department
- This allows users to see either the big picture OR drill into specific departments

## Timeline Request

Please provide an estimate for when this endpoint could be available. The UI is ready and waiting on backend implementation.

---

**Contact:** UI Team  
**Status:** Awaiting API Team Response
