# UI-ISS-053: Rename Sidebar Link to "Department Management"

## Priority: Low
## Status: Complete
## Created: 2026-01-20
## Completed: 2026-01-20

---

## Description

Rename the "Programs & Certificates" sidebar link to "Department Management".

## File

`src/widgets/sidebar/config/navItems.ts`

## Change

```typescript
// Line ~370
label: 'Programs & Certificates'  // Change to 'Department Management'
```

## Acceptance Criteria

- [x] Sidebar displays "Department Management" instead of "Programs & Certificates"
- [x] Update related test in `src/widgets/sidebar/config/__tests__/navItems.test.ts` (already tested for "Department Management")
