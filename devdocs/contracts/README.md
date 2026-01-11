# API Contracts Reference

## ⚠️ Source of Truth

**This directory is for DOCUMENTATION ONLY.**

**The API team is the SINGLE SOURCE OF TRUTH for all API contracts.**

**The canonical location for all API contracts is:**

```
/home/adam/github/lms_node/1_LMS_Node_V2/contracts/
```

## UI Contract Suggestions

UI agents may suggest contract changes. These are placed in:

```
devdocs/ui_contracts/  (linked directory)
```

- UI suggestions are **proposals only** - NOT authoritative
- API team reviews and decides whether to adopt suggestions
- Only reference `ui_contracts/` when explicitly asked or reviewing pending changes

## Contract Locations

| Contract | Path | Version |
|----------|------|---------|
| Auth V2 | `contracts/api/auth-v2.contract.ts` | 2.1.0 |
| LookupValues | `contracts/api/lookup-values.contract.ts` | 1.0.0 |
| Roles | `contracts/api/roles.contract.ts` | 1.0.0 |
| Users | `contracts/api/users.contract.ts` | 1.0.0 |
| Staff | `contracts/api/staff.contract.ts` | 1.0.0 |
| Learners | `contracts/api/learners.contract.ts` | 1.0.0 |
| Courses | `contracts/api/courses.contract.ts` | 1.0.0 |
| Content | `contracts/api/content.contract.ts` | 1.0.0 |
| Enrollments | `contracts/api/enrollments.contract.ts` | 1.0.0 |
| Departments | `contracts/api/departments.contract.ts` | 1.0.0 |

## Recent Changes

### 2026-01-11: UserType Object Transformation

**Changed in:** `auth-v2.contract.ts` (v2.0.0 → v2.1.0)

**Before:**
```typescript
userTypes: ['staff', 'global-admin']
```

**After:**
```typescript
userTypes: [
  { _id: 'staff', displayAs: 'Staff' },
  { _id: 'global-admin', displayAs: 'System Admin' }
]
```

### 2026-01-11: LookupValues Contract (NEW)

**Added:** `lookup-values.contract.ts` (v1.0.0)

New endpoints:
- `GET /api/v2/lookup-values` - List lookups with filters
- `GET /api/v2/lists/user-types` - Get all userTypes as objects
- `GET /api/v2/lists/roles/:userType` - Get roles for a userType

## For UI Developers

Import types directly from the contracts directory:

```typescript
// UserType and Role objects
import { 
  UserTypeObject, 
  RoleObject,
  LookupValue,
  USER_TYPES,
  ROLES_BY_USER_TYPE,
  toUserTypeObjects,
  isValidRoleForUserType
} from '@lms/contracts/api/lookup-values.contract';

// Auth types
import { 
  AuthContractsV2,
  AuthUser,
  AuthSession
} from '@lms/contracts/api/auth-v2.contract';
```

## Validation

All contracts have TypeScript types that can be used for compile-time validation:

```typescript
// Type-safe response handling
const response = await api.post<LoginResponse>('/auth/login', credentials);
const userTypes: UserTypeObject[] = response.data.user.userTypes;

// Check userType
if (userTypes.some(ut => ut._id === 'global-admin')) {
  // Show admin options
}
```
