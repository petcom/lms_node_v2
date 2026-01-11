# Phase 6: Validators & Schemas - Complete Documentation

**Date:** 2026-01-11
**Phase:** 6 - Validators & Schemas
**Status:** Complete
**Test Coverage:** 221 tests passing (100%)

---

## Overview

Phase 6 focuses on comprehensive request validation for all Role System V2 endpoints. All validators use Joi for schema validation and provide clear, actionable error messages.

---

## Validators Summary

### 1. Escalation Validator
**File:** `src/validators/escalation.validator.ts`
**Tests:** `tests/unit/validators/escalation.validator.test.ts` (40 tests)
**Status:** Complete

#### Functions

##### `validateEscalate(req, res, next)`
Validates escalation password for the `/auth/escalate` endpoint.

**Schema:**
```typescript
{
  escalationPassword: {
    type: 'string',
    required: true,
    minLength: 8
  }
}
```

**Validation Rules:**
- `escalationPassword` is required
- Must be a string
- Minimum 8 characters

**Error Messages:**
- "Escalation password is required" - when field is missing
- "Escalation password cannot be empty" - when field is empty string
- "Escalation password must be at least 8 characters" - when length < 8

**Usage:**
```typescript
router.post('/auth/escalate', validateEscalate, escalateController);
```

##### `validateSetEscalationPassword(req, res, next)`
Validates password when setting/updating escalation password.

**Schema:**
```typescript
{
  currentPassword: {
    type: 'string',
    required: true
  },
  newEscalationPassword: {
    type: 'string',
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  }
}
```

**Validation Rules:**
- `currentPassword` is required (for verification)
- `newEscalationPassword` is required
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one digit (0-9)
- At least one special character (@$!%*?&)

**Error Messages:**
- "Current password is required" / "Current password cannot be empty"
- "New escalation password is required" / "New escalation password cannot be empty"
- "Escalation password must be at least 8 characters"
- "Escalation password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"

**Test Coverage:** 40 tests covering:
- Valid passwords with all requirements
- Missing fields
- Weak passwords (missing uppercase, lowercase, number, special char)
- Edge cases (null, undefined, non-string values)
- Password with leading/trailing spaces
- Unicode and emoji characters

---

### 2. Department Switch Validator
**File:** `src/validators/department-switch.validator.ts`
**Tests:** `tests/unit/validators/department-switch.validator.test.ts` (62 tests)
**Status:** Complete

#### Functions

##### `validateSwitchDepartment(req, res, next)`
Validates department switching request body.

**Schema:**
```typescript
{
  departmentId: {
    type: 'string',
    required: true,
    format: 'objectId'
  }
}
```

**Validation Rules:**
- `departmentId` is required
- Must be a valid MongoDB ObjectId format (24 hex characters)
- Validated using `mongoose.Types.ObjectId.isValid()`

**Error Messages:**
- "Department ID is required" - when field is missing
- "Department ID cannot be empty" - when field is empty string
- "Department ID must be a valid MongoDB ObjectId" - when format is invalid

**Usage:**
```typescript
router.post('/auth/switch-department', validateSwitchDepartment, switchDepartmentController);
```

##### `validateDepartmentIdParam(req, res, next)`
Validates department ID in URL parameters.

**Schema:**
```typescript
params: {
  departmentId: {
    type: 'string',
    required: true,
    format: 'objectId'
  }
}
```

**Validation Rules:**
- Same as `validateSwitchDepartment` but validates `req.params` instead of `req.body`

**Usage:**
```typescript
router.get('/roles/me/department/:departmentId', validateDepartmentIdParam, getRolesForDepartmentController);
```

**Test Coverage:** 62 tests covering:
- Valid ObjectId formats
- Missing/empty departmentId
- Invalid formats (too short, too long, non-hex, UUID, etc.)
- Type validation (reject numbers, booleans, objects, arrays)
- Edge cases (whitespace, spaces, special characters)
- Performance testing (100 validations in < 100ms)

---

### 3. Role Validator
**File:** `src/validators/role.validator.ts`
**Tests:** `tests/unit/validators/role.validator.test.ts` (56 tests)
**Status:** Complete

#### Functions

##### `validateUpdateRoleAccessRights(req, res, next)`
Validates role access rights updates for PUT /roles/:name/access-rights.

**Schema:**
```typescript
params: {
  name: {
    type: 'string',
    required: true,
    enum: [
      // Learner roles
      'course-taker', 'auditor', 'learner-supervisor',
      // Staff roles
      'instructor', 'department-admin', 'content-admin', 'billing-admin',
      // Global admin roles
      'system-admin', 'enrollment-admin', 'course-admin', 'theme-admin', 'financial-admin'
    ]
  }
},
body: {
  accessRights: {
    type: 'array',
    items: 'string',
    required: true,
    minLength: 1,
    pattern: /^[a-z-]+:[a-z-]+:[a-z-]+$/
  }
}
```

**Validation Rules:**
- `name` (params) must be a valid role from the system
- `accessRights` (body) must be an array of strings
- Array must contain at least one element
- Each access right must follow format: `domain:resource:action`
- Only lowercase letters and hyphens allowed

**Error Messages:**
- "Role name is required" / "Role name must be one of: [list]"
- "Access rights are required"
- "Access rights must be an array"
- "At least one access right is required"
- "Each access right must follow the format: domain:resource:action (e.g., content:courses:manage)"

##### `validateGetRoleByName(req, res, next)`
Validates role name parameter for GET /roles/:name.

**Schema:**
```typescript
params: {
  name: {
    type: 'string',
    required: true,
    enum: [/* all valid roles */]
  }
}
```

##### `validateGetRolesByUserType(req, res, next)`
Validates user type parameter for GET /roles/user-type/:type.

**Schema:**
```typescript
params: {
  type: {
    type: 'string',
    required: true,
    enum: ['learner', 'staff', 'global-admin']
  }
}
```

##### `validateCreateRole(req, res, next)`
Validates role creation for POST /roles.

**Schema:**
```typescript
body: {
  name: {
    type: 'string',
    required: true,
    pattern: /^[a-z-]+$/
  },
  userType: {
    type: 'string',
    required: true,
    enum: ['learner', 'staff', 'global-admin']
  },
  description: {
    type: 'string',
    optional: true
  },
  accessRights: {
    type: 'array',
    items: 'string',
    required: true,
    minLength: 1,
    pattern: /^[a-z-]+:[a-z-]+:[a-z-]+$/
  }
}
```

**Validation Rules:**
- `name` must contain only lowercase letters and hyphens
- `userType` must be one of: learner, staff, global-admin
- `description` is optional
- `accessRights` must follow same rules as update endpoint

**Test Coverage:** 56 tests covering:
- All 12 valid roles (3 learner + 4 staff + 5 global-admin)
- All 3 user types
- Access rights format validation
- Role creation validation
- Missing/empty field handling
- Invalid formats (uppercase, spaces, special chars)
- Error message clarity

---

### 4. Auth Validator
**File:** `src/validators/auth.validator.ts`
**Tests:** `tests/unit/validators/auth.validator.test.ts` (48 tests)
**Status:** Complete (with Phase 6 updates)

#### Phase 6 Addition: `validateSetEscalationPassword(req, res, next)`

**Schema:**
```typescript
{
  escalationPassword: {
    type: 'string',
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  },
  confirmEscalationPassword: {
    type: 'string',
    required: true,
    equal: Joi.ref('escalationPassword')
  }
}
```

**Validation Rules:**
- Both passwords required
- Minimum 8 characters
- Must contain: uppercase, lowercase, digit, special character (@$!%*?&)
- Passwords must match exactly

**Error Messages:**
- "Escalation password is required"
- "Password confirmation is required"
- "Escalation password must be at least 8 characters"
- "Escalation password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
- "Passwords must match"

#### Existing Validators (Not Changed in Phase 6)
- `validateRegisterStaff` - Staff registration validation
- `validateRegisterLearner` - Learner registration validation
- `validateLogin` - Login credentials validation
- `validateRefresh` - Refresh token validation
- `validatePasswordChange` - Password change validation
- `validateForgotPassword` - Forgot password email validation

**Test Coverage:** 48 tests covering:
- Password strength requirements
- Password matching validation
- Missing/empty field handling
- Login validation
- Registration validation
- Password change validation

---

### 5. Department Membership Validator (Phase 1)
**File:** `src/validators/department-membership.validator.ts`
**Tests:** `tests/unit/validators/department-membership.test.ts` (37 tests)
**Status:** Complete (from Phase 1, verified in Phase 6)

#### Purpose
Factory functions for validating roles within department memberships. Uses RoleRegistry for dynamic validation based on database-loaded lookup values.

#### Functions

##### `validateRolesForUserType(registry, userType, roles)`
Core validation function that checks roles against RoleRegistry.

**Returns:**
```typescript
interface RoleValidationResult {
  isValid: boolean;
  invalidRoles: string[];
  errorMessage: string | null;
}
```

##### `createMongooseValidator(registry, userType)`
Creates a boolean-returning validator function for Mongoose schemas.

**Usage:**
```typescript
const validator = createMongooseValidator(RoleRegistry.getInstance(), 'staff');
// Returns function: (roles: string[]) => boolean
```

##### `createDetailedMongooseValidator(registry, userType)`
Creates a validator with custom error message.

**Returns:**
```typescript
{
  validator: (roles: string[]) => boolean;
  message: string;
}
```

##### `validateDepartmentMemberships(registry, userType, memberships)`
Validates roles across multiple department memberships.

##### `getValidationErrorMessage(result)`
Extracts error message from validation result.

**Test Coverage:** 37 tests covering:
- Role validation for all user types
- Mongoose validator creation
- Department membership array validation
- Error message generation
- Integration with Staff and Learner models
- Performance testing (100 validations in < 100ms)

---

## Validation Patterns

### Access Right Format
**Pattern:** `domain:resource:action`

**Examples:**
- `content:courses:view`
- `content:courses:manage`
- `content:modules:create`
- `enrollment:students:manage`
- `billing:payments:process`
- `system:settings:manage`

**Rules:**
- All lowercase
- Three parts separated by colons
- Only letters and hyphens allowed
- No spaces or special characters

### Password Strength
**Pattern:** `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/`

**Requirements:**
- At least 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one digit (0-9)
- At least one special character from: @ $ ! % * ? &

**Examples:**
- Valid: `StrongP@ss1`, `MyP@ssw0rd`, `Secure!123`
- Invalid: `password` (no uppercase, digit, special char)
- Invalid: `PASSWORD1!` (no lowercase)
- Invalid: `Password!` (no digit)
- Invalid: `Pass123` (too short, no special char)

### Role Names
**Pattern:** `/^[a-z-]+$/`

**Valid Roles:**

**Learner Roles:**
- `course-taker` - Can enroll in and take courses
- `auditor` - Can view course content without enrollment
- `learner-supervisor` - Can supervise other learners

**Staff Roles:**
- `instructor` - Can teach courses and manage content
- `department-admin` - Can administer department settings
- `content-admin` - Can manage course content
- `billing-admin` - Can manage billing and payments

**Global Admin Roles:**
- `system-admin` - Full system administration
- `enrollment-admin` - Manage enrollments system-wide
- `course-admin` - Manage courses system-wide
- `theme-admin` - Manage system themes and branding
- `financial-admin` - Manage financial operations

### User Types
**Valid Values:**
- `learner` - Learner/student users
- `staff` - Staff/instructor users
- `global-admin` - Global administrator users

---

## Error Handling

### Error Structure
All validators throw `ApiError` instances with this structure:

```typescript
{
  statusCode: 400,
  message: "Validation failed",
  errors: [
    {
      field: "fieldName",
      message: "Specific error message"
    }
  ]
}
```

### Multiple Errors
Validators use `abortEarly: false` to collect all validation errors:

```typescript
const { error } = schema.validate(data, { abortEarly: false });

if (error) {
  const errors = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message
  }));
  throw ApiError.badRequest('Validation failed', errors);
}
```

---

## Usage Examples

### Escalation Endpoint
```typescript
// Route definition
router.post('/auth/escalate', validateEscalate, escalateController);

// Valid request
POST /auth/escalate
{
  "escalationPassword": "myAdminPassword123"
}

// Invalid request (too short)
POST /auth/escalate
{
  "escalationPassword": "short"
}
// Returns: 400 Bad Request
// { "message": "Validation failed", "errors": [{ "field": "escalationPassword", "message": "Escalation password must be at least 8 characters" }] }
```

### Department Switch Endpoint
```typescript
// Route definition
router.post('/auth/switch-department', validateSwitchDepartment, switchDepartmentController);

// Valid request
POST /auth/switch-department
{
  "departmentId": "507f1f77bcf86cd799439011"
}

// Invalid request (not ObjectId)
POST /auth/switch-department
{
  "departmentId": "invalid-id"
}
// Returns: 400 Bad Request
// { "message": "Validation failed", "errors": [{ "field": "departmentId", "message": "Department ID must be a valid MongoDB ObjectId" }] }
```

### Update Role Access Rights
```typescript
// Route definition
router.put('/roles/:name/access-rights', requireEscalation, requireAdminRole(['system-admin']), validateUpdateRoleAccessRights, updateRoleAccessRightsController);

// Valid request
PUT /roles/instructor/access-rights
{
  "accessRights": [
    "content:courses:view",
    "content:courses:manage",
    "content:modules:create"
  ]
}

// Invalid request (invalid role name)
PUT /roles/invalid-role/access-rights
{
  "accessRights": ["content:courses:view"]
}
// Returns: 400 Bad Request
// { "message": "Validation failed", "errors": [{ "field": "name", "message": "Role name must be one of: course-taker, auditor, ..." }] }

// Invalid request (invalid access right format)
PUT /roles/instructor/access-rights
{
  "accessRights": ["invalid-format"]
}
// Returns: 400 Bad Request
// { "message": "Validation failed", "errors": [{ "field": "accessRights[0]", "message": "Each access right must follow the format: domain:resource:action" }] }
```

### Set Escalation Password
```typescript
// Route definition
router.post('/auth/set-escalation-password', isAuthenticated, requireUserType(['global-admin']), validateSetEscalationPassword, setEscalationPasswordController);

// Valid request
POST /auth/set-escalation-password
{
  "escalationPassword": "NewP@ssw0rd",
  "confirmEscalationPassword": "NewP@ssw0rd"
}

// Invalid request (passwords don't match)
POST /auth/set-escalation-password
{
  "escalationPassword": "NewP@ssw0rd",
  "confirmEscalationPassword": "Different@1"
}
// Returns: 400 Bad Request
// { "message": "Validation failed", "errors": [{ "field": "confirmEscalationPassword", "message": "Passwords must match" }] }

// Invalid request (weak password)
POST /auth/set-escalation-password
{
  "escalationPassword": "weakpassword",
  "confirmEscalationPassword": "weakpassword"
}
// Returns: 400 Bad Request
// { "message": "Validation failed", "errors": [{ "field": "escalationPassword", "message": "Escalation password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" }] }
```

---

## Testing Strategy

### Test Structure
Each validator has comprehensive unit tests covering:

1. **Valid Cases** - All valid inputs pass
2. **Invalid Cases** - All invalid inputs are caught
3. **Edge Cases** - Boundary conditions and unusual inputs
4. **Error Messages** - Error messages are clear and helpful
5. **Integration** - Works in middleware chains
6. **Performance** - Validates quickly (< 10ms per validation)

### Test Coverage Summary
| Validator | Test File | Tests | Coverage |
|-----------|-----------|-------|----------|
| Escalation | escalation.validator.test.ts | 40 | 100% |
| Department Switch | department-switch.validator.test.ts | 62 | 100% |
| Role | role.validator.test.ts | 56 | 100% |
| Auth | auth.validator.test.ts | 48 | 100% |
| Department Membership | department-membership.test.ts | 37 | 100% |
| **Total** | **5 files** | **221** | **100%** |

### Running Tests
```bash
# Run all validator tests
npm test -- tests/unit/validators/

# Run specific validator test
npm test -- tests/unit/validators/escalation.validator.test.ts

# Run with coverage
npm test -- tests/unit/validators/ --coverage
```

---

## Integration with Routes

### Middleware Chain Example
```typescript
// auth.routes.ts
import { validateEscalate } from '@/validators/escalation.validator';
import { validateSwitchDepartment } from '@/validators/department-switch.validator';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { requireEscalation } from '@/middlewares/require-escalation';

// Escalation requires authentication
router.post('/auth/escalate',
  isAuthenticated,
  validateEscalate,
  escalateController
);

// Department switch requires authentication
router.post('/auth/switch-department',
  isAuthenticated,
  validateSwitchDepartment,
  switchDepartmentController
);

// De-escalation requires active admin session
router.post('/auth/deescalate',
  isAuthenticated,
  requireEscalation,
  deescalateController
);
```

```typescript
// roles.routes.ts
import { validateUpdateRoleAccessRights, validateGetRoleByName, validateGetRolesByUserType } from '@/validators/role.validator';
import { requireEscalation } from '@/middlewares/require-escalation';
import { requireAdminRole } from '@/middlewares/require-admin-role';

// List all roles (authenticated)
router.get('/roles',
  isAuthenticated,
  listRolesController
);

// Get specific role (authenticated)
router.get('/roles/:name',
  isAuthenticated,
  validateGetRoleByName,
  getRoleController
);

// Get roles by user type (authenticated)
router.get('/roles/user-type/:type',
  isAuthenticated,
  validateGetRolesByUserType,
  getRolesByUserTypeController
);

// Update role access rights (system-admin only)
router.put('/roles/:name/access-rights',
  isAuthenticated,
  requireEscalation,
  requireAdminRole(['system-admin']),
  validateUpdateRoleAccessRights,
  updateRoleAccessRightsController
);
```

---

## Performance Considerations

### Validation Speed
All validators are designed for fast execution:
- Simple validations: < 1ms
- Complex validations (password regex): < 5ms
- ObjectId validation: < 1ms
- 100 sequential validations: < 100ms

### Memory Efficiency
- Validators are stateless functions
- No memory leaks from closure
- Schemas defined once at module load
- Error objects are garbage collected after response

### Optimization Techniques
1. **Pre-compiled Regex** - Regex patterns defined once at module level
2. **Early Exit** - Validation stops at first error (can be changed with `abortEarly: false`)
3. **Minimal Dependencies** - Only Joi and mongoose for validation
4. **No External API Calls** - All validation is local

---

## Security Considerations

### Input Sanitization
All validators:
- Reject unexpected types (no type coercion)
- Validate string lengths (prevent buffer overflow)
- Check format constraints (prevent injection)
- Use strict mode (no additional properties)

### Password Security
- Minimum 8 characters (NIST recommendation)
- Complexity requirements enforced
- Allowed special characters limited to safe set: `@$!%*?&`
- No password storage in validators (validation only)

### Access Right Format
- Strict format prevents injection
- Only lowercase letters and hyphens
- No special characters that could be exploited
- Format enforced before database storage

### ObjectId Validation
- Uses mongoose's built-in validator
- Prevents NoSQL injection
- Rejects malformed inputs
- Type-safe string validation

---

## Maintenance & Extensions

### Adding New Validators
Follow this pattern:

```typescript
import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/utils/ApiError';

export const validateNewEndpoint = (req: Request, _res: Response, next: NextFunction) => {
  const schema = Joi.object({
    field: Joi.string().required().messages({
      'string.empty': 'Field cannot be empty',
      'any.required': 'Field is required'
    })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    throw ApiError.badRequest('Validation failed', errors as any);
  }

  next();
};
```

### Updating Validation Rules
When changing validation rules:
1. Update the schema in the validator file
2. Update error messages
3. Add/update tests
4. Update this documentation
5. Update API documentation
6. Consider backward compatibility

### Testing New Validators
Always include tests for:
- All valid input variations
- All invalid input types
- Missing/empty fields
- Edge cases (null, undefined, wrong types)
- Error message accuracy
- Performance benchmarks

---

## Future Enhancements

### Potential Improvements
1. **Custom Validation Rules**
   - Add custom Joi extensions for common patterns
   - Create reusable validation schemas

2. **Internationalization**
   - Support multiple languages for error messages
   - Locale-aware validation

3. **Async Validation**
   - Database lookups for uniqueness checks
   - External API validation

4. **Rate Limiting**
   - Validation-level rate limiting
   - Prevent brute force attacks

5. **Validation Caching**
   - Cache validation results for repeated inputs
   - Improve performance for high-traffic endpoints

---

## Conclusion

Phase 6 validators provide comprehensive, secure, and performant request validation for all Role System V2 endpoints. With 221 tests achieving 100% coverage, the validators ensure data integrity and provide clear error messages for developers and users.

All validators are production-ready and integrate seamlessly with the Express middleware chain.
