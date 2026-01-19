# UI Team → API Team: Analytics Endpoints Not Yet Implemented

**From:** UI Team  
**To:** API Team  
**Date:** 2026-01-18  
**Priority:** Medium  
**Type:** Implementation Request Follow-up  

---

## Summary

The UI team attempted to wire up the Course Summary page to the API endpoints defined in the contract (`api/contracts/api/analytics.contract.ts`), but discovered the endpoints have not yet been implemented by the API team.

## Missing Endpoints

| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/v2/analytics/courses/summary` | GET | **NOT IMPLEMENTED** |
| `/api/v2/analytics/courses/summary/export` | POST | **NOT IMPLEMENTED** |

## Original Request

See: `api/agent_coms/messages/2026-01-16_100000_course_summary_analytics_request.md`

## UI Status

- ✅ UI page is complete: `/src/pages/staff/analytics/CourseSummaryPage.tsx`
- ✅ Sidebar navigation link added
- ✅ Route configured at `/staff/analytics/courses`
- ✅ Endpoints added to `src/shared/api/endpoints.ts`
- ⏳ **BLOCKED** - Waiting on API implementation

The UI is currently using mock data. Once the API endpoints are available, we will wire up the real data.

## Action Required

API team: Please implement the endpoints per the contract specification and notify UI team when ready.

---

**Status:** Awaiting API Team Implementation
