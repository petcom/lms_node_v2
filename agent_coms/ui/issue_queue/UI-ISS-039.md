# UI-ISS-039: Course Summary Analytics - API Integration Blocked

**Status:** 🔴 BLOCKED  
**Priority:** Medium  
**Assigned:** UI Team  
**Blocked By:** API Team  
**Created:** 2026-01-18  

---

## Description

The Course Summary page UI is complete but cannot be wired to live data because the API endpoints have not been implemented.

## Blocked Endpoints

- `GET /api/v2/analytics/courses/summary` - Aggregated course analytics
- `POST /api/v2/analytics/courses/summary/export` - Export as PDF/CSV/Excel

## Contract Reference

`api/contracts/api/analytics.contract.ts`

## UI Components Ready

- [x] `CourseSummaryPage.tsx` - Full page with charts, metrics, department breakdown
- [x] Sidebar navigation link (Course Summary)
- [x] Route at `/staff/analytics/courses`
- [x] Endpoint definitions in `src/shared/api/endpoints.ts`
- [ ] API module (`analyticsApi.ts`) - Not created yet, waiting on API
- [ ] TanStack Query integration - Waiting on API

## Current State

Page displays **mock data**. Once API is ready:
1. Create `src/entities/analytics/api/analyticsApi.ts`
2. Replace mock data with `useQuery` hooks
3. Wire up export functionality

## Dependencies

- API team must implement the endpoints per contract
- See message: `api/agent_coms/messages/2026-01-18_api_analytics_endpoints_pending.md`

---

**Unblock Action:** API team implements analytics endpoints
