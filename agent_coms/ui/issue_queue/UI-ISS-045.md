# UI-ISS-045: Manage Classes Shows No Classes

## Status: COMPLETE

## Problem
The Manage Classes page displays no classes (empty state) when classes should exist in the system. Users cannot see or manage existing classes.

## Expected Behavior
The Manage Classes page should display all classes that the user has permission to view/manage within the selected department.

## Root Cause
The `classApi.ts` file had incorrect API response extraction with triple nesting (`response.data.data.data`) instead of the correct double nesting (`response.data.data`). This caused all class API calls to fail to extract data properly.

## Solution
Fixed the response extraction pattern in `classApi.ts` to match the correct API response structure.

## Implementation

### Files Modified
- `src/entities/class/api/classApi.ts` - Fixed response extraction in all 10 API functions
- `src/entities/class/api/__tests__/classApi.test.ts` - Updated test mocks to use correct structure
- `src/test/mocks/handlers.ts` - Fixed all class API mock handlers

### Functions Fixed
1. listClasses
2. getClass
3. createClass
4. updateClass
5. deleteClass
6. getClassRoster
7. addLearnersToClass
8. removeLearnerFromClass
9. getClassProgress
10. getClassEnrollments

### Code Pattern Fix
```typescript
// Before (WRONG - triple nesting):
const response = await client.get<ApiResponse<{ data: ClassesListResponse }>>(BASE_URL, ...);
return response.data.data.data;

// After (CORRECT - double nesting):
const response = await client.get<ApiResponse<ClassesListResponse>>(BASE_URL, ...);
return response.data.data;
```

## Acceptance Criteria
- [x] Classes display correctly on the Manage Classes page
- [x] Classes are filtered appropriately by department context
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
