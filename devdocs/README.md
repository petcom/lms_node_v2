# Developer Documentation

This directory contains all developer documentation for the LMS Node V2 API.

## Directory Structure

```
devdocs/
├── README.md                    # This file
├── DEPLOYMENT_GUIDE.md          # Deployment instructions
├── DEVELOPER_GUIDE.md           # Developer setup
├── MIGRATION_GUIDE.md           # Migration instructions
│
├── architecture/                # System design documents
│   ├── Endpoint_Role_Authorization.md
│   ├── Ideal_MongoDB_DataObjects.md
│   ├── Ideal_RestfulAPI_toCurrent_Crosswalk.md
│   ├── Ideal_TypeScript_DataStructures.md
│   └── ROLE_SYSTEM_INDEX.md
│
├── contracts/                   # API contract documentation (reference only)
│   └── README.md               # Points to source of truth
│
├── ui_contracts/               # UI-suggested contract changes (linked dir)
│                               # ⚠️ Proposals only - API team approves
│
├── discussions/                 # Design discussions and Q&A
│   ├── Factory_Pattern_Template.md
│   ├── Role_System_Clarification_Questions.md
│   ├── UI_Authorization_Recommendations.md
│   ├── V2_Implementation_Questions.md
│   ├── V2_Implementation_Questions_ANSWERED.md
│   └── ValidationFactory_Discussion.md
│
├── enhancements/               # Feature enhancement proposals
│   ├── API_USERTYPE_DISPLAYAS_ENHANCEMENT.md
│   └── User_Type_Revision_Plan.md
│
├── impl_reports/               # Implementation reports
│   ├── IMPLEMENTATION_REPORT_PHASE1.md
│   ├── ... (phases 2-10)
│   └── ROLE_AUTH_Implementation_Report_*.md
│
├── plans/                      # Implementation plans
│   ├── API_Endpoint_Normalization_Plan.md
│   ├── CONTRACT_IMPLEMENTATION_PLAN.md
│   ├── Role_System_API_Model_Plan.md
│   ├── Role_System_API_Model_Plan_V2.md
│   ├── Role_System_V2_Phased_Implementation.md
│   ├── UserType_Validation_Lookup_Migration_Plan.md   ← CURRENT
│   └── V2_Implementation_Plan.md
│
└── olddocs/                    # Archived documentation
```

## Source of Truth

### API Contracts

**⚠️ The API team is the SINGLE SOURCE OF TRUTH for all API contracts.**

**The canonical location for all API contracts is:**

```
/home/adam/github/lms_node/1_LMS_Node_V2/contracts/
├── api/                        # API endpoint contracts
│   ├── auth-v2.contract.ts    # Authentication (v2.1.0)
│   ├── lookup-values.contract.ts  # NEW: LookupValues/constants
│   ├── roles.contract.ts      # Roles and permissions
│   └── ... (other endpoints)
├── types/                      # Shared type definitions
└── validation/                 # Contract validation utilities
```

### UI Contract Suggestions

UI agents may suggest contract changes. These suggestions are placed in:

```
/home/adam/github/lms_node/1_LMS_Node_V2/devdocs/ui_contracts/  (linked directory)
```

**Important:**
- UI contract suggestions are **proposals only** - they are NOT authoritative
- The API team reviews and decides whether to adopt UI suggestions
- Once approved, changes are made to `contracts/` (the source of truth)
- Only reference `ui_contracts/` when explicitly asked or when reviewing pending changes

**UI developers should import types directly from contracts:**

```typescript
import { 
  UserTypeObject, 
  LookupValue,
  USER_TYPES,
  ROLES_BY_USER_TYPE 
} from '@/contracts/api/lookup-values.contract';

import { 
  AuthContractsV2,
  UserTypeObject 
} from '@/contracts/api/auth-v2.contract';
```

## Current Implementation Plan

See [plans/UserType_Validation_Lookup_Migration_Plan.md](plans/UserType_Validation_Lookup_Migration_Plan.md)

### Key Changes

1. **LookupValues Collection**: Centralized database storage for all enumerated constants
2. **UserTypeObject**: `userTypes` now returns `{ _id: string, displayAs: string }[]` instead of `string[]`
3. **RoleRegistry Service**: In-memory cache for validation
4. **GlobalAdmin Migration**: `roleMemberships` renamed to `departmentMemberships`

### Contract Versions

| Contract | Version | Status |
|----------|---------|--------|
| auth-v2.contract.ts | 2.1.0 | **Updated** - UserTypeObject |
| lookup-values.contract.ts | 1.0.0 | **NEW** |
| roles.contract.ts | 1.0.0 | Current |

## Quick Links

- [Authentication Contract](../contracts/api/auth-v2.contract.ts)
- [LookupValues Contract](../contracts/api/lookup-values.contract.ts)
- [Implementation Plan](plans/UserType_Validation_Lookup_Migration_Plan.md)
- [Validation Discussion](discussions/ValidationFactory_Discussion.md)
