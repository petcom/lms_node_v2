# AI-Friendly API Enhancement Plan

## Overview

This plan enhances the LMS API to enable AI agents to create complete course structures (courses + modules + assessments + content) through a streamlined, intelligent interface. The enhancements address current friction points: ObjectId lookups, sequential operations, lack of batch endpoints, and validation complexity.

## User Requirements

1. **Single Endpoint Automation**: AI sends full course structure, API handles everything atomically
2. **Name-Based Resolution**: API accepts human-readable names (e.g., "Computer Science") and resolves to ObjectIds
3. **Partial Success**: Create valid items, report failed items with detailed errors
4. **Pre-Validation**: Dry-run endpoint to validate without side effects
5. **Schema Documentation**: Self-describing API that AI agents can learn from

## Current Friction Points (From Exploration)

### High Complexity Areas:
- **Course Creation**: 5-step sequential process, no batch module creation
- **ObjectId Lookups**: Requires 3-5 separate API calls before creating a course
- **Module Ordering**: Must be sequential 1,2,3... with no gaps
- **Cascading Validations**: Department → Program → Instructors → Prerequisites → Content
- **Two-Step Publishing**: Separate create and publish operations

### Moderate Complexity Areas:
- **Assessment Creation**: Bulk operations exist (100 questions/exercise, 1000 questions/bank)
- **Content Attachment**: Library pattern works, but requires separate upload + link steps

## Proposed Solution Architecture

### 1. New AI-Specific Endpoints

#### A. Atomic Course Creation
```
POST /api/v2/ai/courses
```

**Request Body:**
```typescript
{
  "course": {
    "title": "Introduction to Computer Science",
    "code": "CS101",
    "department": "Computer Science",  // Name, not ObjectId
    "program": "Bachelor of Science in Computer Science",  // Name, not ObjectId
    "credits": 3,
    "instructors": ["John Doe", "Jane Smith"],  // Names or emails
    "prerequisites": ["Basic Mathematics"],  // Course names or codes
    "publish": true  // Auto-publish after creation
  },
  "modules": [
    {
      "title": "Introduction to Programming",
      "description": "Learn basic programming concepts",
      "type": "custom",
      "content": {
        "text": "<h1>Welcome to Programming</h1>...",
        "attachments": [
          {
            "type": "video",
            "url": "https://...",
            "title": "Intro Video"
          }
        ]
      },
      "exercise": {
        "title": "Module 1 Quiz",
        "type": "quiz",
        "passingScore": 70,
        "questions": [
          {
            "type": "multiple_choice",
            "questionText": "What is a variable?",
            "points": 10,
            "options": [
              {"text": "A container for data", "isCorrect": true},
              {"text": "A function", "isCorrect": false}
            ]
          }
        ]
      }
    }
  ]
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "course": {
      "id": "...",
      "title": "Introduction to Computer Science",
      "status": "published"
    },
    "modules": [
      {
        "id": "...",
        "title": "Introduction to Programming",
        "orderIndex": 1,
        "status": "success"
      }
    ],
    "exercises": [
      {
        "id": "...",
        "title": "Module 1 Quiz",
        "status": "success",
        "questionsCreated": 1
      }
    ]
  },
  "errors": [],  // Empty if fully successful
  "warnings": [
    "Instructor 'Jane Smith' not found, skipped"
  ]
}
```

**Partial Success Response:**
```typescript
{
  "success": true,  // Overall operation succeeded
  "data": {
    "course": {
      "id": "...",
      "status": "draft"  // Not published due to validation issues
    },
    "modules": [
      {
        "id": "...",
        "title": "Module 1",
        "orderIndex": 1,
        "status": "success"
      },
      {
        "id": null,
        "title": "Module 2",
        "status": "failed",
        "error": "Invalid SCORM package URL"
      }
    ]
  },
  "errors": [
    {
      "path": "modules[1].content.scormPackage",
      "message": "SCORM package URL is not accessible",
      "code": "INVALID_SCORM_URL"
    }
  ],
  "warnings": [
    "Course created but not published due to module errors"
  ]
}
```

#### B. Pre-Validation Endpoint
```
POST /api/v2/ai/validate/course
```

Same request body as creation endpoint, but with `dryRun: true` implied.

**Response:**
```typescript
{
  "valid": false,
  "errors": [
    {
      "path": "course.department",
      "message": "Department 'Computer Sciense' not found. Did you mean 'Computer Science'?",
      "code": "DEPARTMENT_NOT_FOUND",
      "suggestions": ["Computer Science", "Computer Engineering"]
    },
    {
      "path": "modules[0].exercise.questions[2]",
      "message": "Multiple choice question must have at least one correct answer",
      "code": "INVALID_QUESTION"
    }
  ],
  "warnings": [
    {
      "path": "course.instructors[1]",
      "message": "Instructor 'Jane Smith' not found",
      "code": "INSTRUCTOR_NOT_FOUND"
    }
  ],
  "resolutions": {
    "course.department": "673a1234567890abcdef1234",  // Resolved ObjectId
    "course.program": "673a1234567890abcdef5678",
    "course.instructors[0]": "673a1234567890abcdef9999"
  }
}
```

#### C. Schema Documentation Endpoint
```
GET /api/v2/ai/schema/course
GET /api/v2/ai/schema/module
GET /api/v2/ai/schema/question
GET /api/v2/ai/schema/exercise
```

**Response:**
```typescript
{
  "schema": {
    // JSON Schema definition
    "type": "object",
    "properties": {
      "course": {
        "type": "object",
        "required": ["title", "code", "department"],
        "properties": {
          "title": {
            "type": "string",
            "minLength": 1,
            "maxLength": 255,
            "description": "Human-readable course title"
          },
          "department": {
            "type": "string",
            "description": "Department name or ObjectId. System will resolve by name if not a valid ObjectId.",
            "examples": ["Computer Science", "673a1234567890abcdef1234"]
          }
          // ... full schema
        }
      }
    }
  },
  "examples": [
    {
      "description": "Minimal course with one module",
      "data": { /* ... */ }
    },
    {
      "description": "Complete course with quiz and SCORM module",
      "data": { /* ... */ }
    }
  ],
  "validations": {
    "course.code": {
      "pattern": "^[A-Z]{2,4}[0-9]{3}[A-Z]?$",
      "description": "Course code must be 2-4 uppercase letters followed by 3 digits"
    }
  }
}
```

#### D. Batch Operations Enhancement
```
POST /api/v2/ai/modules/bulk
POST /api/v2/ai/questions/bulk
POST /api/v2/ai/content/bulk
```

For scenarios where AI needs to add modules to existing courses or questions to existing exercises.

### 2. Name Resolution Service

Create a new service layer that handles name-to-ObjectId resolution with fuzzy matching and suggestions.

**File:** `src/services/ai/resolver.service.ts`

**Key Features:**
- Resolve department names to ObjectIds (e.g., "Computer Science" → ObjectId)
- Resolve program names with fuzzy matching (e.g., "BS Computer Science" → exact program)
- Resolve instructor names/emails to user ObjectIds
- Resolve course codes/names for prerequisites (e.g., "CS100" or "Intro to CS")
- Resolve content by title for attachments
- Cache resolutions for performance (Redis)
- Return suggestions when exact match not found (Levenshtein distance)

**Interface:**
```typescript
interface ResolutionResult {
  success: boolean;
  objectId?: Types.ObjectId;
  suggestions?: string[];
  error?: string;
}

class ResolverService {
  static async resolveDepartment(
    nameOrId: string,
    options?: { fuzzy?: boolean; threshold?: number }
  ): Promise<ResolutionResult>

  static async resolveProgram(
    nameOrId: string,
    departmentId?: Types.ObjectId
  ): Promise<ResolutionResult>

  static async resolveInstructor(
    nameOrEmail: string,
    departmentId?: Types.ObjectId
  ): Promise<ResolutionResult>

  static async resolveCourse(
    codeOrTitle: string,
    departmentId?: Types.ObjectId
  ): Promise<ResolutionResult>

  static async resolveContent(
    titleOrId: string,
    type?: ContentType
  ): Promise<ResolutionResult>

  static async resolveBatch(
    items: Array<{type: string; value: string}>
  ): Promise<Map<string, ResolutionResult>>
}
```

**Implementation Strategy:**
1. Try exact ObjectId match first (if input looks like ObjectId)
2. Try exact name/code match (case-insensitive)
3. Try fuzzy match with configurable threshold (default 0.8)
4. Return top 3 suggestions if no match found
5. Cache all successful resolutions (60-minute TTL)

### 3. Validation Pipeline Service

Create a centralized validation service that runs all checks without side effects.

**File:** `src/services/ai/validation.service.ts`

**Features:**
- Validate complete course structure in one pass
- Collect all errors (don't fail fast)
- Validate relationships (department → program → prerequisites)
- Validate business rules (module ordering, question points, etc.)
- Return actionable error messages with paths
- Suggest corrections where possible

**Interface:**
```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  resolutions: Record<string, Types.ObjectId>;  // Successful name resolutions
}

interface ValidationError {
  path: string;  // JSONPath to the field (e.g., "modules[0].exercise.questions[2]")
  message: string;
  code: string;
  severity: 'error' | 'warning';
  suggestions?: string[];
}

class ValidationService {
  static async validateCourseStructure(
    input: AICourseInput
  ): Promise<ValidationResult>

  static async validateModule(
    module: AIModuleInput,
    context: { courseId?: string; departmentId: string }
  ): Promise<ValidationResult>

  static async validateExercise(
    exercise: AIExerciseInput,
    context: { courseId?: string; moduleId?: string }
  ): Promise<ValidationResult>
}
```

### 4. Atomic Course Creation Service

Create a service that handles transactional course creation with rollback support.

**File:** `src/services/ai/course-builder.service.ts`

**Features:**
- Single entry point for full course creation
- MongoDB transactions for atomicity
- Partial success support (create what's valid)
- Automatic module ordering (1, 2, 3...)
- Parallel creation where possible (questions can be created in parallel)
- Rollback on critical failures
- Detailed success/failure reporting per item

**Interface:**
```typescript
interface CourseCreationResult {
  success: boolean;
  data: {
    course: { id: string; status: string };
    modules: Array<{ id: string | null; title: string; status: 'success' | 'failed'; error?: string }>;
    exercises: Array<{ id: string | null; title: string; status: 'success' | 'failed'; questionsCreated?: number }>;
    content: Array<{ id: string | null; title: string; status: 'success' | 'failed' }>;
  };
  errors: ValidationError[];
  warnings: string[];
  stats: {
    totalModules: number;
    successfulModules: number;
    totalQuestions: number;
    successfulQuestions: number;
    executionTime: number;
  };
}

class CourseBuilderService {
  static async createFullCourse(
    input: AICourseInput,
    userId: string,
    options?: {
      validateOnly?: boolean;
      allowPartialSuccess?: boolean;
      autoPublish?: boolean;
    }
  ): Promise<CourseCreationResult>

  static async addModulesToCourse(
    courseId: string,
    modules: AIModuleInput[],
    userId: string
  ): Promise<ModuleCreationResult>
}
```

**Transaction Strategy:**
1. Start MongoDB session
2. Validate entire structure (fail fast if critical errors)
3. Resolve all names to ObjectIds
4. Create course (within transaction)
5. Create modules sequentially (ordering matters)
6. Create exercises in parallel (independent)
7. Create questions in batches (100 at a time)
8. Upload/link content
9. Commit transaction on full success
10. On partial success: commit what worked, return detailed errors
11. On critical failure: rollback entire transaction

### 5. AI Controller and Routes

**File:** `src/controllers/ai/ai.controller.ts`

```typescript
class AIController {
  // POST /api/v2/ai/courses
  static createFullCourse = asyncHandler(async (req, res) => {
    const validateOnly = req.query.validateOnly === 'true';
    const allowPartialSuccess = req.query.allowPartial !== 'false';  // Default true

    const result = await CourseBuilderService.createFullCourse(
      req.body,
      req.user!.id,
      { validateOnly, allowPartialSuccess, autoPublish: req.body.course?.publish }
    );

    const statusCode = result.success ? (result.errors.length > 0 ? 207 : 201) : 400;
    res.status(statusCode).json(result);
  });

  // POST /api/v2/ai/validate/course
  static validateCourse = asyncHandler(async (req, res) => {
    const result = await ValidationService.validateCourseStructure(req.body);
    res.status(200).json(result);
  });

  // GET /api/v2/ai/schema/:resource
  static getSchema = asyncHandler(async (req, res) => {
    const { resource } = req.params;
    const schema = await SchemaService.getSchema(resource);
    if (!schema) {
      throw new ApiError(404, `Schema for '${resource}' not found`);
    }
    res.status(200).json(schema);
  });

  // POST /api/v2/ai/resolve
  static resolveNames = asyncHandler(async (req, res) => {
    const { items } = req.body;  // Array of {type, value}
    const results = await ResolverService.resolveBatch(items);
    res.status(200).json(results);
  });
}
```

**File:** `src/routes/ai.routes.ts`

```typescript
import { Router } from 'express';
import AIController from '@/controllers/ai/ai.controller';
import { authenticate, authorize } from '@/middleware/auth.middleware';

const router = Router();

// All AI endpoints require authentication
router.use(authenticate);

// Course creation (content-admin, instructor, department-admin, system-admin)
router.post(
  '/courses',
  authorize(['content-admin', 'instructor', 'department-admin', 'system-admin']),
  AIController.createFullCourse
);

// Validation (no special permissions, just authenticated)
router.post('/validate/course', AIController.validateCourse);

// Schema documentation (public for AI learning)
router.get('/schema/:resource', AIController.getSchema);

// Name resolution (authenticated)
router.post('/resolve', AIController.resolveNames);

export default router;
```

**Update:** `src/app.ts`
```typescript
import aiRoutes from './routes/ai.routes';
app.use('/api/v2/ai', aiRoutes);
```

## Implementation Steps

### Phase 1: Foundation (Name Resolution)
**Estimated Complexity: Medium**

1. **Create ResolverService** (`src/services/ai/resolver.service.ts`)
   - Implement department name resolution
   - Implement program name resolution
   - Implement instructor resolution (by name or email)
   - Implement course resolution (by code or title)
   - Implement content resolution
   - Add fuzzy matching with Levenshtein distance
   - Add Redis caching for resolutions
   - Add batch resolution method

2. **Create Tests** (`tests/unit/services/ai/resolver.service.test.ts`)
   - Test exact matches
   - Test fuzzy matches with various thresholds
   - Test suggestions when no match found
   - Test batch resolution performance
   - Test caching behavior

### Phase 2: Validation Pipeline
**Estimated Complexity: Medium-High**

1. **Create ValidationService** (`src/services/ai/validation.service.ts`)
   - Implement course structure validation
   - Implement module validation
   - Implement exercise/question validation
   - Add relationship validation (dept → program → prereqs)
   - Add business rule validation (ordering, points, etc.)
   - Integrate with ResolverService for name validation
   - Return JSONPath error locations

2. **Create Tests** (`tests/unit/services/ai/validation.service.test.ts`)
   - Test valid course structure
   - Test various invalid scenarios
   - Test partial validation (warnings vs errors)
   - Test suggestion generation

### Phase 3: Schema Documentation
**Estimated Complexity: Low**

1. **Create SchemaService** (`src/services/ai/schema.service.ts`)
   - Generate JSON Schema from TypeScript interfaces
   - Add examples for each resource type
   - Add validation rule documentation
   - Add field descriptions and constraints

2. **Create Schema Definitions** (`src/schemas/ai/`)
   - `course.schema.json` - Full course structure schema
   - `module.schema.json` - Module schema
   - `exercise.schema.json` - Exercise/quiz schema
   - `question.schema.json` - Question schema with all types

### Phase 4: Atomic Course Creation
**Estimated Complexity: High**

1. **Create CourseBuilderService** (`src/services/ai/course-builder.service.ts`)
   - Implement full course creation with transactions
   - Add partial success support
   - Add rollback logic for failures
   - Integrate validation service
   - Integrate resolver service
   - Add parallel creation where possible
   - Add detailed error reporting per item

2. **Create Tests** (`tests/integration/services/ai/course-builder.service.test.ts`)
   - Test full successful course creation
   - Test partial success scenarios
   - Test rollback on critical failures
   - Test with various module types (SCORM, custom, exercise)
   - Test with bulk questions
   - Test transaction behavior

### Phase 5: API Layer
**Estimated Complexity: Low-Medium**

1. **Create AIController** (`src/controllers/ai/ai.controller.ts`)
   - Implement createFullCourse endpoint
   - Implement validateCourse endpoint
   - Implement getSchema endpoint
   - Implement resolveNames endpoint
   - Add proper error handling
   - Add request validation

2. **Create AI Routes** (`src/routes/ai.routes.ts`)
   - Define all AI endpoints
   - Add authentication/authorization
   - Add rate limiting (prevent abuse)

3. **Update App** (`src/app.ts`)
   - Register AI routes

4. **Create Tests** (`tests/integration/routes/ai.routes.test.ts`)
   - Test all endpoints with valid data
   - Test authentication/authorization
   - Test validation errors
   - Test partial success responses
   - Test rate limiting

### Phase 6: Documentation & Examples
**Estimated Complexity: Low**

1. **Create AI API Documentation** (`docs/AI_API_GUIDE.md`)
   - Overview of AI-friendly endpoints
   - Complete request/response examples
   - Error handling guide
   - Best practices for AI agents
   - Rate limiting information
   - Example workflows

2. **Create Postman Collection** (`postman/AI_API.postman_collection.json`)
   - All AI endpoints with examples
   - Environment variables setup
   - Pre-request scripts for auth tokens

## Files to Create

```
src/
├── services/
│   └── ai/
│       ├── resolver.service.ts          # Name-to-ObjectId resolution
│       ├── validation.service.ts        # Validation pipeline
│       ├── course-builder.service.ts    # Atomic course creation
│       └── schema.service.ts            # Schema documentation
├── controllers/
│   └── ai/
│       └── ai.controller.ts             # AI endpoints controller
├── routes/
│   └── ai.routes.ts                     # AI routes
├── types/
│   └── ai.types.ts                      # AI-specific TypeScript types
├── schemas/
│   └── ai/
│       ├── course.schema.json           # Course JSON Schema
│       ├── module.schema.json           # Module JSON Schema
│       ├── exercise.schema.json         # Exercise JSON Schema
│       └── question.schema.json         # Question JSON Schema
└── utils/
    └── fuzzy-match.util.ts              # Levenshtein distance helper

tests/
├── unit/
│   └── services/
│       └── ai/
│           ├── resolver.service.test.ts
│           └── validation.service.test.ts
└── integration/
    ├── services/
    │   └── ai/
    │       └── course-builder.service.test.ts
    └── routes/
        └── ai.routes.test.ts

docs/
└── AI_API_GUIDE.md

postman/
└── AI_API.postman_collection.json
```

## Files to Modify

```
src/
├── app.ts                               # Register AI routes
└── middleware/
    └── rate-limit.middleware.ts         # Add AI-specific rate limiting
```

## Error Handling Strategy

### Error Categories

1. **Validation Errors (400)**: Invalid input structure
   - Missing required fields
   - Invalid data types
   - Business rule violations
   - Return: Detailed field-level errors with JSONPath

2. **Resolution Errors (200 with warnings)**: Name not found but operation can continue
   - Department/program/instructor not found
   - Return: Warnings array with suggestions
   - Behavior: Skip the reference, create course without it

3. **Partial Success (207 Multi-Status)**: Some items created, some failed
   - Course created, some modules failed
   - Return: Full details of what succeeded and what failed
   - Behavior: Commit successful items, rollback failed items

4. **Critical Errors (500)**: Database/system failures
   - Transaction failures
   - Database connection issues
   - Return: Generic error message, log full details

### Error Response Format

```typescript
{
  "success": boolean,
  "data": {
    // Created items with IDs
  },
  "errors": [
    {
      "path": "modules[2].exercise.questions[0]",
      "field": "options",
      "message": "Multiple choice question must have at least 2 options",
      "code": "INVALID_QUESTION_OPTIONS",
      "severity": "error",
      "value": [],  // The invalid value
      "suggestions": ["Add at least 2 options to the question"]
    }
  ],
  "warnings": [
    {
      "path": "course.instructors[1]",
      "message": "Instructor 'Jane Smith' not found in department 'Computer Science'",
      "code": "INSTRUCTOR_NOT_FOUND",
      "suggestions": ["Jane Doe", "John Smith"],
      "impact": "Course will be created without this instructor"
    }
  ],
  "stats": {
    "totalItems": 15,
    "successfulItems": 13,
    "failedItems": 2,
    "executionTime": 2345  // milliseconds
  }
}
```

## Performance Considerations

### Optimization Strategies

1. **Batch Database Operations**
   - Create all questions for an exercise in single insertMany call
   - Use bulkWrite for multiple module creations
   - Minimize round trips to database

2. **Parallel Processing**
   - Create exercises in parallel (independent operations)
   - Resolve names in parallel using Promise.all
   - Upload content assets in parallel

3. **Caching**
   - Cache name resolutions (60-minute TTL)
   - Cache department/program lookups
   - Cache JSON schemas (indefinite, clear on schema changes)

4. **Transaction Optimization**
   - Keep transaction scope as small as possible
   - Create course first, then add children
   - Avoid long-running operations inside transactions

5. **Rate Limiting**
   - Stricter limits on AI endpoints (10 requests/minute per user)
   - Higher limits for validation-only endpoints (60 requests/minute)
   - No limit on schema documentation endpoints

### Expected Performance

- **Simple Course** (3 modules, no exercises): ~500ms
- **Medium Course** (10 modules, 5 exercises, 50 questions): ~2-3 seconds
- **Complex Course** (20 modules, 15 exercises, 200 questions, SCORM packages): ~5-8 seconds
- **Validation Only** (no creation): ~200-500ms regardless of size

## Testing Strategy

### Unit Tests
- All service methods with mocked dependencies
- Edge cases for fuzzy matching
- Validation logic for all field types
- Transaction rollback scenarios

### Integration Tests
- Full course creation end-to-end
- Partial success scenarios
- Name resolution with real database
- Transaction behavior with failures

### Load Tests
- 100 concurrent course creations
- Large course structures (50+ modules)
- Validation endpoint under load

## Security Considerations

1. **Authorization**
   - Only content-admin, instructor, department-admin, system-admin can create courses
   - Department scoping enforced (users can only create in their departments)
   - Validation endpoint available to all authenticated users

2. **Input Validation**
   - Sanitize all user input (XSS prevention)
   - Limit nested object depth (prevent DoS)
   - Limit array sizes (max 100 modules, max 1000 questions)
   - Validate URLs for SCORM packages and attachments

3. **Rate Limiting**
   - AI endpoints: 10 requests/minute per user
   - Validation endpoints: 60 requests/minute per user
   - Schema endpoints: No limit (read-only)

4. **Audit Logging**
   - Log all course creation attempts (success and failure)
   - Log partial success scenarios
   - Log all name resolutions for debugging

## Rollout Strategy

### Phase 1: Internal Testing (Week 1)
- Deploy to development environment
- Test with sample courses
- Validate transaction behavior
- Performance testing

### Phase 2: Beta (Week 2)
- Enable for system-admin and content-admin only
- Monitor error rates and performance
- Gather feedback on error messages
- Refine validation rules

### Phase 3: General Availability (Week 3)
- Enable for all authorized users
- Full documentation published
- Postman collection available
- Monitor usage and performance

## Success Metrics

1. **Adoption**: Number of courses created via AI endpoint vs traditional endpoints
2. **Success Rate**: Percentage of API calls that fully succeed (goal: >80%)
3. **Partial Success Rate**: Percentage that partially succeed (goal: <15%)
4. **Error Rate**: Percentage that completely fail (goal: <5%)
5. **Performance**: 95th percentile response time (goal: <5 seconds for complex courses)
6. **AI Agent Satisfaction**: Reduced number of API calls needed to create a course (from 15-20 to 1)

## Future Enhancements (Post-MVP)

1. **AI Agent Feedback Loop**: Endpoint for AI to report confusing errors or request new features
2. **Template System**: Save course structures as templates for reuse
3. **Bulk Course Creation**: Create multiple courses in one API call
4. **Async Course Creation**: For very large courses, return immediately with job ID, poll for completion
5. **Content Generation Integration**: AI generates content text/descriptions
6. **Auto-tagging**: AI suggests tags/categories based on course content
7. **Prerequisite Graph**: Endpoint returns visual prerequisite graph for a program

## Conclusion

This plan provides a comprehensive solution for AI-friendly course creation while maintaining backwards compatibility with existing endpoints. The atomic course creation endpoint dramatically reduces the number of API calls needed (from 15-20 to 1), while the validation and schema endpoints enable AI agents to learn and self-correct.

The implementation follows TDD principles established in previous phases, maintains clean architecture, and provides detailed error reporting for both full and partial success scenarios.
