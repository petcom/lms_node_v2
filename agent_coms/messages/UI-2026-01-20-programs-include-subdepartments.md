# UI Team - Programs Endpoint Enhancement Request

## Date: 2026-01-20
## From: UI Team
## To: API Team
## Priority: Low
## Related Issues: UI-ISS-056

---

## Summary

Request to add `includeSubdepartments` parameter to the programs list endpoint, similar to the existing implementation on the learners endpoint.

## Current Behavior

`GET /programs?department={id}` performs exact match on `departmentId`:

```typescript
// programs.service.ts:73
query.departmentId = new mongoose.Types.ObjectId(filters.department);
```

## Requested Enhancement

Add optional `includeSubdepartments` query parameter:

```
GET /programs?department={id}&includeSubdepartments=true
```

When `includeSubdepartments=true`:
- Return programs from the specified department AND all its descendant departments
- Include a field indicating which department each program belongs to (for UI grouping)

## Proposed Response Addition

```typescript
interface Program {
  // ... existing fields
  departmentId: string;
  departmentName: string;    // Already exists?
  departmentLevel?: number;  // Optional: helps UI show hierarchy
}
```

## Use Case

Department Management page - allow staff to view all programs across their department hierarchy in a single list, rather than expanding each subdepartment individually.

## Priority

Low - Current UI works without this. This is a convenience enhancement for departments with many subdepartments.

## Questions

1. Should there be a depth limit (e.g., only 2 levels deep)?
2. Should this affect pagination/limits?
3. Is `departmentName` already included in program responses?
