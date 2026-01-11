# API Enhancement: UserType DisplayAs Field

**Date**: 2026-01-11  
**Priority**: Low (UI currently handles mapping locally)  
**Status**: Proposed

---

## Overview

Add a `displayAs` field to the UserType model/enum to provide human-readable display labels for user types in the UI. This centralizes the display name logic on the backend rather than hardcoding it in the frontend.

---

## Current State

### Frontend Hardcoded Mapping

Currently, the UI handles this with a local mapping function:

```typescript
const getDisplayAsLabel = (userType: string | null): string => {
  switch (userType) {
    case 'staff': return 'Staff';
    case 'learner': return 'Learner';
    case 'global-admin': return 'System Admin';
    default: return 'User';
  }
};
```

### Problem

1. Display labels are duplicated across UI components
2. Changes require UI code updates and deployment
3. No single source of truth for display names
4. Localization/i18n harder to manage

---

## Proposed Enhancement

### Option A: Add to Login/Roles Response

Include a `displayAs` mapping in the authentication responses:

```typescript
// In LoginResponse.data or MyRolesResponse.data
userTypeLabels: {
  'learner': 'Learner',
  'staff': 'Staff',
  'global-admin': 'System Admin'
}
```

### Option B: Include in RoleHierarchy

Add display labels directly to the RoleHierarchy structure:

```typescript
interface RoleHierarchy {
  primaryUserType: UserType;
  primaryUserTypeDisplayAs: string;  // NEW: "Staff", "Learner", "System Admin"
  allUserTypes: UserType[];
  allUserTypesWithLabels: {          // NEW
    type: UserType;
    displayAs: string;
  }[];
  // ... rest of existing fields
}
```

### Option C: Separate Endpoint (Not Recommended)

A dedicated endpoint like `GET /api/v2/config/user-type-labels` - not recommended as it adds an extra API call.

---

## Recommended Approach: Option B

Include in RoleHierarchy as it:
- Comes with every auth response (login, refresh)
- No extra API calls needed
- Naturally paired with user type data
- Supports future additions like icons, descriptions, etc.

### Schema Addition

```typescript
// In RoleHierarchy
interface RoleHierarchy {
  // Existing fields...
  primaryUserType: UserType;
  allUserTypes: UserType[];
  
  // NEW fields
  userTypeDisplayMap: Record<UserType, string>;
  // e.g., { 'learner': 'Learner', 'staff': 'Staff', 'global-admin': 'System Admin' }
}
```

### Backend Implementation

1. **In auth service** - When building RoleHierarchy, include the display map:

```javascript
// userTypeDisplayMap constant
const USER_TYPE_DISPLAY = {
  'learner': 'Learner',
  'staff': 'Staff',
  'global-admin': 'System Admin'
};

// Include in roleHierarchy response
roleHierarchy: {
  primaryUserType: user.primaryUserType,
  allUserTypes: user.userTypes,
  userTypeDisplayMap: USER_TYPE_DISPLAY,
  // ... other fields
}
```

2. **Model/Config file** - Centralize the mapping:

```javascript
// config/userTypes.js or similar
module.exports = {
  LEARNER: {
    key: 'learner',
    displayAs: 'Learner',
    defaultDashboard: 'learner'
  },
  STAFF: {
    key: 'staff', 
    displayAs: 'Staff',
    defaultDashboard: 'staff'
  },
  GLOBAL_ADMIN: {
    key: 'global-admin',
    displayAs: 'System Admin',
    defaultDashboard: 'admin'
  }
};
```

---

## UI Implementation (Once API Ready)

### Update authStore Types

```typescript
interface RoleHierarchy {
  // ... existing
  userTypeDisplayMap?: Record<UserType, string>;
}
```

### Update Header.tsx

```typescript
// Replace hardcoded mapping
const getDisplayAsLabel = (userType: string | null): string => {
  if (!userType) return 'User';
  // Use backend-provided map, fallback to capitalize
  return roleHierarchy?.userTypeDisplayMap?.[userType] 
    || userType.charAt(0).toUpperCase() + userType.slice(1);
};
```

---

## Migration Path

1. **Phase 1** (Current): UI uses local mapping (already implemented)
2. **Phase 2**: Backend adds `userTypeDisplayMap` to RoleHierarchy
3. **Phase 3**: UI reads from API, falls back to local mapping
4. **Phase 4**: Remove local mapping once API is stable

---

## Affected Endpoints

| Endpoint | Change Required |
|----------|-----------------|
| `POST /api/v2/auth/login` | Add `userTypeDisplayMap` to `roleHierarchy` |
| `POST /api/v2/auth/refresh` | Add `userTypeDisplayMap` to `roleHierarchy` |
| `GET /api/v2/roles/me` | Add `userTypeDisplayMap` to response |

---

## Testing Checklist

- [ ] Login response includes `userTypeDisplayMap`
- [ ] Refresh response includes `userTypeDisplayMap`
- [ ] `/roles/me` response includes `userTypeDisplayMap`
- [ ] All UserType values have a display label
- [ ] UI correctly reads and displays labels
- [ ] Fallback works when map is missing (backward compatibility)

---

## Notes

- This is a **low priority** enhancement since the UI can handle the mapping locally
- Main benefit is centralization and future i18n support
- No breaking changes - additive only
- UI should always have a fallback for backward compatibility
