# UI-ISS-044: Manage Courses Shows No Courses

## Status: COMPLETE

## Problem
The Manage Courses page displays no courses (empty state) when courses should exist in the system. Users cannot see or manage existing courses.

## Expected Behavior
The Manage Courses page should display all courses that the user has permission to view/manage within the selected department.

## Root Cause
The `classApi.ts` file had incorrect API response extraction with triple nesting (`response.data.data.data`) instead of the correct double nesting (`response.data.data`). This caused all class API calls to fail to extract data properly.

Note: This was originally reported as a courses issue but the root cause was in the shared API pattern affecting both courses and classes. The courseApi.ts was already using the correct pattern.

## Solution
Fixed the response extraction pattern in `classApi.ts` to match the correct API response structure used in `courseApi.ts`.

## Implementation

### Files Modified
- `src/entities/class/api/classApi.ts` - Fixed response extraction in all API functions
- `src/entities/class/api/__tests__/classApi.test.ts` - Updated test mocks
- `src/test/mocks/handlers.ts` - Fixed mock response structure

### Code Pattern Fix
```typescript
// Before (WRONG):
return response.data.data.data;

// After (CORRECT):
return response.data.data;
```

### API Response Structure
```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
```

## Acceptance Criteria
- [x] Courses display correctly on the Manage Courses page
- [x] Courses are filtered appropriately by department context
- [x] Loading and error states work correctly

## Tests
- 15 core API tests passing
- Mock handlers updated with correct response structure

## QA Review
APPROVED by Opus 4.5 Code Reviewer

## Priority
High - Core functionality broken

## Created
2026-01-20

## Completed
2026-01-20
