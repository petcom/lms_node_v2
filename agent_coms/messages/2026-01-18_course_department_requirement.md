# UI Team → API Team: Course Creation - Department Requirement

**From:** UI Team  
**To:** API Team  
**Date:** 2026-01-18  
**Priority:** High  
**Type:** Contract Clarification & Validation Request  

---

## Question

Is `departmentId` **required** when creating a course via `POST /api/v2/courses`?

## Current Understanding

Courses must belong to a department. The UI needs to enforce this, but we need API confirmation:

### Scenario 1: departmentId is Required (Expected)

```json
POST /api/v2/courses
{
  "title": "Introduction to React",
  "description": "...",
  "departmentId": "507f1f77bcf86cd799439011"  // REQUIRED
}
```

**API Response if missing:**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "departmentId is required",
  "details": {
    "departmentId": ["Department is required for course creation"]
  }
}
```

### Scenario 2: departmentId is Optional (Problem!)

If the API allows course creation without `departmentId`:
- Where does the course belong?
- How is it filtered in department views?
- This would be a data integrity issue

---

## Request

Please confirm:

1. **Is `departmentId` required for `POST /api/v2/courses`?**
   - If no, should it be? (We recommend yes)

2. **What validation exists?**
   - Does the API validate user has `course:create-department` permission in the specified department?

3. **Can a course's department be changed after creation?**
   - Via `PUT /api/v2/courses/:id`?
   - Should this be restricted?

---

## UI Implementation Plan

Based on your response, we will:

1. **If departmentId is required:** ✅ Proceed with department selector flow (UI-ISS-041)

2. **If departmentId is optional:** 🚨 Request API change to make it required

---

## Related

- UI-ISS-041: Course Creation Department Context
- `api/contracts/api/courses.contract.ts` - Please update if needed

---

**Contact:** UI Team  
**Awaiting:** API Team confirmation
