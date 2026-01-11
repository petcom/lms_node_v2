# Factory Pattern Template - DepartmentMembership Validation
**Version:** 1.1  
**Date:** 2026-01-11  
**Status:** Planning

---

## Overview

A simple factory pattern for validating role arrays within department memberships. The factory receives valid roles and received roles, and returns whether all received roles exist in the valid roles array.

---

## 1. Current Constants Storage

### 1.1 Where Are Constants Stored?

**Two locations currently exist (DUPLICATION):**

| Location | Type | Purpose |
|----------|------|---------|
| `src/models/auth/role-constants.ts` | Code constants | TypeScript `as const` arrays, used by models |
| `roledefinitions` collection | Database | Stores role metadata + accessRights, has `userType` field |

**role-constants.ts:**
```typescript
export const USER_TYPES = ['learner', 'staff', 'global-admin'] as const;
export const LEARNER_ROLES = ['course-taker', 'auditor', 'learner-supervisor'] as const;
export const STAFF_ROLES = ['instructor', 'department-admin', 'content-admin', 'billing-admin'] as const;
export const GLOBAL_ADMIN_ROLES = ['system-admin', 'enrollment-admin', 'course-admin', 'theme-admin', 'financial-admin'] as const;
```

**Database (roledefinitions):**
```javascript
{ name: 'instructor', userType: 'staff', displayName: 'Instructor', isActive: true }
{ name: 'course-taker', userType: 'learner', displayName: 'Course Taker', isActive: true }
// etc...
```

### 1.2 Problem: Duplication

Constants are defined in **both** `role-constants.ts` AND `RoleDefinition.model.ts`:
- `role-constants.ts` lines 22, 34, 47, 59-64
- `RoleDefinition.model.ts` lines 17, 21-23

This duplication can lead to inconsistency.

---

## 2. Proposed Solution: Role Registry with Memory Cache

### 2.1 Single Source of Truth

Use the **database** (`roledefinitions` collection) as the source of truth, with an **in-memory cache** for performance.

### 2.2 RoleRegistry Service

A singleton service that:
1. Loads roles from database on startup
2. Caches valid roles per userType in memory
3. Provides `getValidRoles(userType)` for the factory

```typescript
/**
 * RoleRegistry - Single source of truth for valid roles
 * 
 * Loads from database, caches in memory.
 * Used by DepartmentValidatorFactory to get validRoles.
 */

import { RoleDefinition, UserType } from '@/models/RoleDefinition.model';

interface RoleCache {
  learner: string[];
  staff: string[];
  'global-admin': string[];
}

class RoleRegistryService {
  private cache: RoleCache | null = null;
  private initialized = false;

  /**
   * Initialize the registry - call on app startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const allRoles = await RoleDefinition.find({ isActive: true });

    this.cache = {
      'learner': [],
      'staff': [],
      'global-admin': []
    };

    for (const role of allRoles) {
      if (this.cache[role.userType]) {
        this.cache[role.userType].push(role.name);
      }
    }

    this.initialized = true;
    console.log('[RoleRegistry] Initialized with roles:', this.cache);
  }

  /**
   * Get valid roles for a userType
   * @throws if not initialized
   */
  getValidRoles(userType: UserType): readonly string[] {
    if (!this.cache) {
      throw new Error('RoleRegistry not initialized. Call initialize() on startup.');
    }
    return this.cache[userType] || [];
  }

  /**
   * Check if a role is valid for a userType
   */
  isValidRole(role: string, userType: UserType): boolean {
    const validRoles = this.getValidRoles(userType);
    return validRoles.includes(role);
  }

  /**
   * Refresh cache from database (for admin role changes)
   */
  async refresh(): Promise<void> {
    this.initialized = false;
    this.cache = null;
    await this.initialize();
  }
}

// Singleton export
export const RoleRegistry = new RoleRegistryService();
```

### 2.3 Memory Structure

```typescript
// After initialization, cache looks like:
{
  "learner": ["course-taker", "auditor", "learner-supervisor"],
  "staff": ["instructor", "department-admin", "content-admin", "billing-admin"],
  "global-admin": ["system-admin", "enrollment-admin", "course-admin", "theme-admin", "financial-admin"]
}
```

---

## 3. Updated Factory with Registry

### 3.1 DepartmentValidatorFactory

```typescript
import { RoleRegistry } from './role-registry.service';
import { UserType } from '@/models/RoleDefinition.model';

export interface ValidationResult {
  isValid: boolean;
}

/**
 * Factory function for validating department membership roles
 * 
 * @param validRoles - Array of allowed role strings
 * @param receivedRoles - Array of role strings to validate
 * @returns ValidationResult with isValid boolean
 */
export function DepartmentValidatorFactory(
  validRoles: readonly string[],
  receivedRoles: string[]
): ValidationResult {
  if (!receivedRoles || receivedRoles.length === 0) {
    return { isValid: false };
  }
  
  const isValid = receivedRoles.every(role => validRoles.includes(role));
  return { isValid };
}

/**
 * Convenience: Create a validator for a specific userType
 * Loads validRoles from RoleRegistry automatically
 * 
 * @param userType - The user type context
 * @param receivedRoles - Array of role strings to validate
 * @returns ValidationResult
 */
export function validateRolesForUserType(
  userType: UserType,
  receivedRoles: string[]
): ValidationResult {
  const validRoles = RoleRegistry.getValidRoles(userType);
  return DepartmentValidatorFactory(validRoles, receivedRoles);
}
```

### 3.2 Usage in Models

```typescript
// Staff model
import { validateRolesForUserType } from './department-membership.validator';

const staffSchema = new Schema<IStaff>({
  departmentMemberships: {
    type: [DepartmentMembershipSchema],
    validate: {
      validator: function(memberships: IDepartmentMembership[]) {
        return memberships.every(m => 
          validateRolesForUserType('staff', m.roles).isValid
        );
      },
      message: 'Invalid staff role in departmentMemberships'
    }
  }
});
```

---

## 4. Initialization Flow

### 4.1 App Startup Sequence

```typescript
// In app.ts or server.ts

import { RoleRegistry } from '@/services/role-registry.service';

async function startServer() {
  // 1. Connect to database
  await connectToMongoDB();

  // 2. Initialize RoleRegistry (loads roles into memory)
  await RoleRegistry.initialize();

  // 3. Start Express app
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
```

### 4.2 Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  App Startup                                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  MongoDB Connection                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  RoleRegistry.initialize()                                   │
│  ├─ Query: db.roledefinitions.find({ isActive: true })      │
│  ├─ Group by userType                                       │
│  └─ Store in memory cache                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Express App Ready                                           │
│  RoleRegistry.getValidRoles() available for validation      │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. How Factory Gets Correct ValidRoles

### 5.1 Automatic Resolution

When a model validates, it calls `validateRolesForUserType(userType, roles)`:

```
Staff.save()
    │
    ▼
Schema validator triggers
    │
    ▼
validateRolesForUserType('staff', ['instructor', 'foo'])
    │
    ▼
RoleRegistry.getValidRoles('staff')
    │
    ▼
Returns cached: ['instructor', 'department-admin', 'content-admin', 'billing-admin']
    │
    ▼
DepartmentValidatorFactory(validRoles, receivedRoles)
    │
    ▼
'instructor' in validRoles? ✓
'foo' in validRoles? ✗
    │
    ▼
Returns: { isValid: false }
```

### 5.2 Key Points

1. **Factory is stateless** - it just compares arrays
2. **RoleRegistry provides validRoles** - loaded from database
3. **UserType determines which cache bucket** - `'staff'` → `cache.staff`
4. **Model knows its userType** - Staff model always uses `'staff'`

---

## 6. File Structure

```
src/
├── services/
│   └── role-registry.service.ts      # Singleton, loads from DB, caches in memory
├── models/
│   ├── auth/
│   │   ├── department-membership.schema.ts    # Generic schema
│   │   ├── department-membership.validator.ts # Factory + validateRolesForUserType
│   │   ├── role-constants.ts                  # (DEPRECATED - use RoleRegistry)
│   │   ├── Staff.model.ts                     # Uses validator
│   │   ├── Learner.model.ts                   # Uses validator
│   │   └── User.model.ts
│   ├── RoleDefinition.model.ts                # Database model for roles
│   └── GlobalAdmin.model.ts                   # Uses validator
└── app.ts                                     # Calls RoleRegistry.initialize()
```

---

## 7. Migration Path

### 7.1 Steps to Implement

1. **Create RoleRegistry service** - loads from `roledefinitions` collection
2. **Create DepartmentValidatorFactory** - pure function, receives arrays
3. **Create validateRolesForUserType** - convenience wrapper using registry
4. **Update Staff model** - use `validateRolesForUserType('staff', ...)`
5. **Update Learner model** - use `validateRolesForUserType('learner', ...)`
6. **Update GlobalAdmin model** - use `validateRolesForUserType('global-admin', ...)`
7. **Initialize on startup** - call `RoleRegistry.initialize()` in app.ts
8. **Deprecate role-constants.ts** - remove duplicated arrays (or keep as fallback)

### 7.2 Backward Compatibility

Keep `role-constants.ts` but add deprecation notice. The RoleRegistry can fall back to these if database is empty.

---

## 8. Summary

| Question | Answer |
|----------|--------|
| Where are constants stored? | Code: `role-constants.ts`, DB: `roledefinitions` collection |
| What structure for validRoles in memory? | `{ learner: [], staff: [], 'global-admin': [] }` cache in RoleRegistry singleton |
| How to load correct validRoles into factory? | `validateRolesForUserType(userType, roles)` → RoleRegistry → factory |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-11 | System | Initial document |
| 1.1 | 2026-01-11 | System | Added RoleRegistry, database source, memory cache pattern |

### 1.1 DepartmentValidatorFactory

A simple function that validates roles:

```typescript
/**
 * Factory function for validating department membership roles
 * 
 * @param validRoles - Array of allowed role strings (from constants)
 * @param receivedRoles - Array of role strings to validate (from membership)
 * @returns { isValid: boolean }
 */
function DepartmentValidatorFactory(
  validRoles: readonly string[],
  receivedRoles: string[]
): { isValid: boolean } {
  // All received roles must exist in valid roles
  const isValid = receivedRoles.length > 0 && 
    receivedRoles.every(role => validRoles.includes(role));
  
  return { isValid };
}
```

### 1.2 Base IDepartmentMembership Interface

```typescript
interface IDepartmentMembership {
  departmentId: Types.ObjectId;
  roles: string[];
  isPrimary: boolean;
  joinedAt: Date;
  isActive: boolean;
  
  /** 
   * Computed validation property - stub
   * Actual validation happens via DepartmentValidatorFactory
   */
  isValid?: boolean;
}
```

---

## 2. How It Works

### 2.1 Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  User adds/updates departmentMembership                     │
│  e.g., { departmentId: X, roles: ['instructor', 'foo'] }    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Schema pre-validate hook triggers                          │
│  Determines userType context (staff/learner/global-admin)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  DepartmentValidatorFactory called:                         │
│                                                             │
│  validRoles = STAFF_ROLES (from role-constants.ts)          │
│             = ['instructor', 'department-admin',            │
│                'content-admin', 'billing-admin']            │
│                                                             │
│  receivedRoles = membership.roles                           │
│                = ['instructor', 'foo']                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Factory checks:                                            │
│  'instructor' in validRoles? ✓                              │
│  'foo' in validRoles? ✗                                     │
│                                                             │
│  Returns: { isValid: false }                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  If isValid === false:                                      │
│    → Reject insert/update with validation error             │
│                                                             │
│  If isValid === true:                                       │
│    → Allow insert/update to proceed                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Usage in Models

```typescript
// Staff model example
const staffSchema = new Schema<IStaff>({
  departmentMemberships: {
    type: [DepartmentMembershipSchema],
    validate: {
      validator: function(memberships: IDepartmentMembership[]) {
        // For each membership, run factory validation
        return memberships.every(m => {
          const result = DepartmentValidatorFactory(STAFF_ROLES, m.roles);
          return result.isValid;
        });
      },
      message: 'Invalid role in departmentMemberships. Check role-constants for valid staff roles.'
    }
  }
});

// Learner model example
const learnerSchema = new Schema<ILearner>({
  departmentMemberships: {
    type: [DepartmentMembershipSchema],
    validate: {
      validator: function(memberships: IDepartmentMembership[]) {
        return memberships.every(m => {
          const result = DepartmentValidatorFactory(LEARNER_ROLES, m.roles);
          return result.isValid;
        });
      },
      message: 'Invalid role in departmentMemberships. Check role-constants for valid learner roles.'
    }
  }
});

// GlobalAdmin model example
const globalAdminSchema = new Schema<IGlobalAdmin>({
  roleMemberships: {  // or departmentMemberships - to be consistent
    type: [DepartmentMembershipSchema],
    validate: {
      validator: function(memberships: IDepartmentMembership[]) {
        return memberships.every(m => {
          const result = DepartmentValidatorFactory(GLOBAL_ADMIN_ROLES, m.roles);
          return result.isValid;
        });
      },
      message: 'Invalid role in roleMemberships. Check role-constants for valid global-admin roles.'
    }
  }
});
```

---

## 3. Implementation Files

### 3.1 File: `src/models/auth/department-membership.validator.ts`

```typescript
/**
 * DepartmentMembership Validator Factory
 * 
 * Simple factory pattern for validating role arrays.
 * Used by Staff, Learner, and GlobalAdmin models to ensure
 * only valid roles are assigned to department memberships.
 */

import { STAFF_ROLES, LEARNER_ROLES, GLOBAL_ADMIN_ROLES, UserType } from './role-constants';

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
}

/**
 * Factory function for validating department membership roles
 * 
 * @param validRoles - Array of allowed role strings (from constants)
 * @param receivedRoles - Array of role strings to validate (from membership)
 * @returns ValidationResult with isValid boolean
 * 
 * @example
 * const result = DepartmentValidatorFactory(STAFF_ROLES, ['instructor']);
 * // result = { isValid: true }
 * 
 * @example
 * const result = DepartmentValidatorFactory(STAFF_ROLES, ['fake-role']);
 * // result = { isValid: false }
 */
export function DepartmentValidatorFactory(
  validRoles: readonly string[],
  receivedRoles: string[]
): ValidationResult {
  // Must have at least one role
  if (!receivedRoles || receivedRoles.length === 0) {
    return { isValid: false };
  }
  
  // All received roles must exist in valid roles
  const isValid = receivedRoles.every(role => validRoles.includes(role));
  
  return { isValid };
}

/**
 * Convenience function: Get valid roles for a userType
 * 
 * @param userType - The user type to get roles for
 * @returns Array of valid role strings
 */
export function getValidRolesForUserType(userType: UserType): readonly string[] {
  switch (userType) {
    case 'staff':
      return STAFF_ROLES;
    case 'learner':
      return LEARNER_ROLES;
    case 'global-admin':
      return GLOBAL_ADMIN_ROLES;
    default:
      return [];
  }
}

/**
 * Convenience function: Validate membership for a specific userType
 * 
 * @param userType - The user type context
 * @param receivedRoles - Array of role strings to validate
 * @returns ValidationResult with isValid boolean
 */
export function validateMembershipRoles(
  userType: UserType,
  receivedRoles: string[]
): ValidationResult {
  const validRoles = getValidRolesForUserType(userType);
  return DepartmentValidatorFactory(validRoles, receivedRoles);
}
```

### 3.2 File: `src/models/auth/department-membership.schema.ts` (Updated)

```typescript
/**
 * DepartmentMembership Schema (Shared)
 * 
 * Generic schema used by Staff, Learner, and GlobalAdmin models.
 * Validation of roles is delegated to the consuming model via
 * DepartmentValidatorFactory.
 */

import { Schema, Types } from 'mongoose';

/**
 * Generic department membership interface
 */
export interface IDepartmentMembership {
  departmentId: Types.ObjectId;
  roles: string[];
  isPrimary: boolean;
  joinedAt: Date;
  isActive: boolean;
}

/**
 * Shared DepartmentMembership schema
 * 
 * Note: Role validation is NOT done here.
 * Each model (Staff, Learner, GlobalAdmin) uses DepartmentValidatorFactory
 * with the appropriate validRoles array for their userType.
 */
export const DepartmentMembershipSchema = new Schema<IDepartmentMembership>({
  departmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department ID is required']
  },
  roles: {
    type: [String],
    required: [true, 'Roles array is required'],
    validate: {
      validator: (v: string[]) => v.length > 0,
      message: 'At least one role is required'
    }
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: false });

export default DepartmentMembershipSchema;
```

---

## 4. Validation Enforcement Points

| Model | Property | Valid Roles Source | Enforcement |
|-------|----------|-------------------|-------------|
| Staff | `departmentMemberships` | `STAFF_ROLES` | Schema array validator |
| Learner | `departmentMemberships` | `LEARNER_ROLES` | Schema array validator |
| GlobalAdmin | `roleMemberships` | `GLOBAL_ADMIN_ROLES` | Schema array validator |

---

## 5. Valid Roles Reference

From `role-constants.ts`:

```typescript
export const STAFF_ROLES = [
  'instructor', 
  'department-admin', 
  'content-admin', 
  'billing-admin'
] as const;

export const LEARNER_ROLES = [
  'course-taker', 
  'auditor', 
  'learner-supervisor'
] as const;

export const GLOBAL_ADMIN_ROLES = [
  'system-admin', 
  'enrollment-admin', 
  'course-admin', 
  'theme-admin', 
  'financial-admin'
] as const;
```

---

## 6. Example Scenarios

### 6.1 Valid Insert - Staff

```javascript
// Attempting to add staff to department with valid roles
staff.departmentMemberships.push({
  departmentId: new ObjectId('...'),
  roles: ['instructor', 'content-admin'],  // Both valid
  isPrimary: true,
  joinedAt: new Date(),
  isActive: true
});

await staff.save();

// Factory called internally:
// DepartmentValidatorFactory(STAFF_ROLES, ['instructor', 'content-admin'])
// Returns: { isValid: true }
// Result: Insert allowed ✓
```

### 6.2 Invalid Insert - Staff

```javascript
// Attempting to add staff with invalid role
staff.departmentMemberships.push({
  departmentId: new ObjectId('...'),
  roles: ['instructor', 'super-admin'],  // 'super-admin' not valid
  isPrimary: true,
  joinedAt: new Date(),
  isActive: true
});

await staff.save();

// Factory called internally:
// DepartmentValidatorFactory(STAFF_ROLES, ['instructor', 'super-admin'])
// Returns: { isValid: false }
// Result: ValidationError thrown ✗
```

### 6.3 Valid Insert - Learner

```javascript
learner.departmentMemberships.push({
  departmentId: new ObjectId('...'),
  roles: ['course-taker'],
  isPrimary: false,
  joinedAt: new Date(),
  isActive: true
});

await learner.save();

// Factory called: DepartmentValidatorFactory(LEARNER_ROLES, ['course-taker'])
// Returns: { isValid: true }
// Result: Insert allowed ✓
```

### 6.4 Cross-Type Rejection

```javascript
// Attempting to assign staff role to learner
learner.departmentMemberships.push({
  departmentId: new ObjectId('...'),
  roles: ['instructor'],  // This is a STAFF role, not learner
  isPrimary: false,
  joinedAt: new Date(),
  isActive: true
});

await learner.save();

// Factory called: DepartmentValidatorFactory(LEARNER_ROLES, ['instructor'])
// 'instructor' not in ['course-taker', 'auditor', 'learner-supervisor']
// Returns: { isValid: false }
// Result: ValidationError thrown ✗
```

---

## 7. Summary

| Component | Purpose |
|-----------|---------|
| `IDepartmentMembership` | Generic base interface for all membership types |
| `DepartmentMembershipSchema` | Shared Mongoose schema (no role validation) |
| `DepartmentValidatorFactory` | Factory function: `(validRoles, receivedRoles) → { isValid }` |
| Model validators | Call factory with appropriate `validRoles` from constants |

**Key Principle:** The factory is stateless and simple. It just compares two arrays. The model knows which `validRoles` to pass based on its userType context.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-11 | System | Initial document |
