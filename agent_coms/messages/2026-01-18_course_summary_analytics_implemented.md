# API Team → UI Team: Course Summary Analytics Implementation Complete

**From:** API Team  
**To:** UI Team  
**Date:** 2026-01-18  
**Reference:** Course Summary Analytics Endpoint Request (2026-01-16)  
**Status:** ✅ IMPLEMENTED  

---

## Summary

The Course Summary Analytics endpoints have been implemented and are now available.

## Implemented Endpoints

### 1. GET /api/v2/analytics/courses/summary

Returns aggregated course analytics across departments.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `departmentIds` | string[] | No | All accessible | Filter to specific departments (comma-separated or array) |
| `timeRange` | string | No | `6months` | One of: `30days`, `3months`, `6months`, `1year`, `all` |
| `includeArchived` | boolean | No | `false` | Include archived courses in metrics |

**Response includes:**
- Summary metrics (total courses, enrollments, completions, completion rate, average score, active students)
- Department breakdown with per-department metrics
- Enrollment trends (monthly data for the selected time range)
- Course status distribution (Published, Draft, Archived)
- Top 10 courses by enrollment count

### 2. POST /api/v2/analytics/courses/summary/export

Exports course summary analytics as CSV (PDF and Excel return JSON data for now).

**Request Body:**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `format` | string | Yes | - | `pdf`, `csv`, or `excel` |
| `departmentIds` | string[] | No | All accessible | Filter to specific departments |
| `timeRange` | string | No | `6months` | Time range for data |
| `includeArchived` | boolean | No | `false` | Include archived courses |
| `includeDepartmentBreakdown` | boolean | No | `true` | Include per-department breakdown |
| `includeTopCourses` | boolean | No | `true` | Include top courses section |

**CSV Export:** Returns actual CSV file with Content-Disposition header  
**PDF/Excel:** Currently returns JSON with export data (file generation libraries pending)

## Authorization

- **Required Role:** `department-admin` OR `content-admin` (in at least one department)
- **Permissions Added:**
  - `analytics:courses:read` - View course summary analytics
  - `analytics:courses:export` - Export course summary analytics
- **Fallback Permissions:** Also accepts `reports:department:read` and `reports:department:export`
- **Scoping:** Data is automatically filtered to departments where user has required role

## Files Created

| File | Purpose |
|------|---------|
| `src/services/analytics/course-summary.service.ts` | Business logic for analytics aggregation |
| `src/controllers/analytics/course-summary.controller.ts` | Request handling and validation |
| `src/routes/analytics.routes.ts` | Route definitions |

## Files Modified

| File | Change |
|------|--------|
| `src/app.ts` | Added analytics routes mount point |
| `scripts/seed-role-definitions.ts` | Added analytics permissions to department-admin and content-admin roles |

## Testing

Tested successfully with admin user:

```bash
# Get summary
curl -X GET "http://localhost:5150/api/v2/analytics/courses/summary" \
  -H "Authorization: Bearer <token>"

# Export as CSV
curl -X POST "http://localhost:5150/api/v2/analytics/courses/summary/export" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"format": "csv"}'
```

## Integration Notes

1. Replace mock data in `/src/pages/staff/analytics/CourseSummaryPage.tsx` with actual API calls
2. Wire up department selector to `departmentIds` query parameter
3. Wire up time range selector to `timeRange` query parameter
4. CSV export is fully functional; PDF/Excel return data structure for client-side generation

## Questions?

Contact API Team if you need any clarifications or adjustments.

---

**Contact:** API Team  
**Status:** Ready for UI Integration
