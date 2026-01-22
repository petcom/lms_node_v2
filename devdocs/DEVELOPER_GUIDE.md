# LMS API V2 - Developer Guide

**Version:** 2.0.0  
**Last Updated:** January 7, 2026  

---

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Getting Started](#getting-started)
4. [Development Workflow](#development-workflow)
5. [Testing Strategy](#testing-strategy)
6. [API Standards](#api-standards)
7. [Database Schema](#database-schema)
8. [Authentication & Authorization](#authentication--authorization)
9. [Error Handling](#error-handling)
10. [Performance Best Practices](#performance-best-practices)

---

## Introduction

The LMS API V2 is a comprehensive Learning Management System built with modern technologies and best practices:

- **Framework:** Node.js + Express + TypeScript
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (Access + Refresh Tokens)
- **Testing:** Jest + Supertest (TDD approach)
- **Documentation:** Swagger/OpenAPI 3.0

### Key Features

- ✅ Role-Based Access Control (5 roles)
- ✅ Fine-Grained Permissions (resource-action-scope)
- ✅ Comprehensive Audit Logging
- ✅ SCORM 1.2 & 2004 Support
- ✅ Multi-Format Assessments (6 question types)
- ✅ Report Generation & Scheduling
- ✅ Department-Scoped Resources
- ✅ Advanced Analytics

---

## Architecture Overview

### Project Structure

```
1_LMS_Node_V2/
├── src/
│   ├── models/           # Mongoose models (21 models)
│   │   ├── academic/     # Course, Program, AcademicYear, Class
│   │   ├── activity/     # LearningEvent, ScormAttempt, ExamResult
│   │   ├── assessment/   # Question, QuestionBank
│   │   ├── auth/         # User, Learner, Staff
│   │   ├── content/      # Content, CourseContent, ContentAttempt
│   │   ├── enrollment/   # Enrollment, ClassEnrollment
│   │   ├── organization/ # Department
│   │   └── system/       # Report, AuditLog, Setting, Permission, RolePermission
│   ├── services/         # Business logic layer
│   ├── controllers/      # Route handlers
│   ├── middlewares/      # Express middlewares
│   ├── routes/           # API routes
│   ├── utils/            # Utility functions
│   ├── validators/       # Input validation
│   └── migrations/       # Database migrations
├── tests/
│   ├── unit/             # Unit tests (682 tests)
│   ├── integration/      # Integration tests (17 tests)
│   └── e2e/              # End-to-end tests
├── devdocs/              # Implementation documentation
└── logs/                 # Application logs
```

### Layer Architecture

```
┌─────────────────────────────────────────┐
│          API Routes (Express)           │
│         /api/v2/{resource}              │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│          Middleware Layer               │
│  • Authentication (JWT)                 │
│  • Authorization (RBAC + Permissions)   │
│  • Validation (Joi/Mongoose)            │
│  • Error Handling                       │
│  • Audit Logging                        │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Controller Layer                │
│  • Request handling                     │
│  • Response formatting                  │
│  • Business logic delegation            │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│          Service Layer                  │
│  • Business logic                       │
│  • Data transformation                  │
│  • External service calls               │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│          Model Layer (ODM)              │
│  • Mongoose schemas (21 models)         │
│  • Validation rules                     │
│  • Indexes (21+ compound indexes)       │
│  • Virtual fields & methods             │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│          MongoDB Database               │
│  • Document storage                     │
│  • Indexes                              │
│  • Aggregation pipelines                │
└─────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js >= 18.x
- MongoDB >= 6.x
- TypeScript >= 5.x
- npm >= 9.x

### Installation

```bash
# Clone repository
git clone <repository-url>
cd 1_LMS_Node_V2

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure environment variables
nano .env
```

### Environment Variables

```bash
# Server
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/lms_v2
MONGODB_URI_TEST=mongodb://localhost:27017/lms_test

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Password Reset
PASSWORD_RESET_EXPIRATION=1h
PASSWORD_RESET_URL=http://localhost:3000/reset-password

# Email (Optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=your-smtp-password
EMAIL_FROM=noreply@example.com

# Redis (Optional - for caching)
REDIS_URL=redis://localhost:6379

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=./uploads

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4200

# Logging
LOG_LEVEL=info
```

### Running the Application

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

---

## Development Workflow

### 1. TDD Approach (Test-Driven Development)

**All features must follow TDD:**

```bash
# 1. Write test first
touch tests/unit/services/new-service.test.ts

# 2. Run test (should fail)
npm test -- tests/unit/services/new-service.test.ts

# 3. Write implementation
touch src/services/new-service.ts

# 4. Run test again (should pass)
npm test -- tests/unit/services/new-service.test.ts

# 5. Refactor if needed
# 6. Repeat
```

### 2. Git Workflow

```bash
# Feature branch
git checkout -b feature/new-feature

# Make changes with TDD
# ... write tests, implement, commit

# Commit with descriptive message
git add .
git commit -m "feat: add new feature with TDD

- Created NewService with 15 tests
- All tests passing (747/747)
- Updated documentation
"

# Push and create PR
git push origin feature/new-feature
```

### 3. Code Review Checklist

- [ ] All tests passing
- [ ] Test coverage >= 80%
- [ ] TypeScript compilation successful
- [ ] No linting errors
- [ ] Documentation updated
- [ ] API contract maintained
- [ ] Breaking changes documented
- [ ] Migration script provided (if needed)

---

## Testing Strategy

### Test Types

**1. Unit Tests (682 tests)**

Test individual functions/methods in isolation:

```typescript
// Example: Model test
describe('Course Model', () => {
  it('should create a course with valid data', async () => {
    const course = await Course.create({
      title: 'Test Course',
      code: 'TEST101',
      credits: 3,
      department: departmentId,
      status: 'published'
    });
    
    expect(course.title).toBe('Test Course');
    expect(course.status).toBe('published');
  });
});

// Example: Service test
describe('AuthService', () => {
  it('should hash password on registration', async () => {
    const password = 'PlainPassword123';
    const result = await authService.register({
      email: 'test@example.com',
      password,
      firstName: 'Test',
      lastName: 'User'
    });
    
    expect(result.password).not.toBe(password);
    expect(result.password).toMatch(/^\$2[aby]\$\d+\$/);
  });
});
```

**2. Integration Tests (17 tests)**

Test API endpoints end-to-end:

```typescript
describe('Auth API Integration', () => {
  it('should register new staff member', async () => {
    const response = await request(app)
      .post('/api/v2/auth/register/staff')
      .send({
        email: 'staff@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['instructor']
      })
      .expect(201);
    
    expect(response.body.status).toBe('success');
    expect(response.body.data).toHaveProperty('accessToken');
    expect(response.body.data).toHaveProperty('refreshToken');
  });
});
```

**3. Middleware Tests (14 tests)**

Test middleware functions:

```typescript
describe('Authentication Middleware', () => {
  it('should reject requests without token', async () => {
    const req = mockRequest({});
    const res = mockResponse();
    const next = jest.fn();
    
    await authenticate(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
```

### Test Coverage Goals

- Overall: >= 80%
- Models: >= 95%
- Services: >= 85%
- Controllers: >= 80%
- Utilities: >= 95%

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test -- path/to/test.ts

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Integration tests only
npm test -- tests/integration
```

---

## API Standards

### RESTful Conventions

**Resource Naming:**
- Plural nouns: `/api/v2/courses`, `/api/v2/enrollments`
- Nested resources: `/api/v2/courses/:id/modules`
- Actions as query params: `/api/v2/enrollments?status=active`

**HTTP Methods:**
- `GET` - Retrieve resource(s)
- `POST` - Create resource
- `PUT` - Update entire resource
- `PATCH` - Partial update
- `DELETE` - Remove resource

**Status Codes:**
- `200 OK` - Success (GET, PUT, PATCH, DELETE)
- `201 Created` - Success (POST)
- `204 No Content` - Success (DELETE with no response)
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate resource
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

### Response Format

**Success Response:**
```json
{
  "status": "success",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "title": "Introduction to Programming",
    "code": "CS101"
  }
}
```

**List Response (with pagination):**
```json
{
  "status": "success",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

**Error Response:**
```json
{
  "status": "error",
  "message": "Course not found",
  "errors": [
    {
      "field": "courseId",
      "message": "Invalid course ID format"
    }
  ]
}
```

### Query Parameters

**Pagination:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Filtering:**
- `status=active` - Filter by status
- `departmentId=123` - Filter by department
- `search=programming` - Full-text search

**Sorting:**
- `sort=createdAt` - Sort ascending
- `sort=-createdAt` - Sort descending

**Field Selection:**
- `fields=title,code,credits` - Only return specified fields

---

## Database Schema

### Key Models (21 total)

**1. User (Authentication Base)**
```typescript
{
  email: string (unique, required)
  password: string (hashed, required)
  role: 'admin' | 'instructor' | 'learner' | 'staff' | 'guest'
  isEmailVerified: boolean
  refreshToken?: string
  passwordResetToken?: string
  passwordResetExpires?: Date
  lastLogin?: Date
}
```

**2. Course**
```typescript
{
  title: string
  code: string (unique)
  description?: string
  credits: number
  department: ObjectId (ref: Department)
  academicYear?: ObjectId (ref: AcademicYear)
  status: 'draft' | 'published' | 'archived'
  enrollmentSettings: {
    maxEnrollments?: number
    allowWaitlist: boolean
    autoEnroll: boolean
  }
}
```

**3. Enrollment**
```typescript
{
  courseId: ObjectId (ref: Course)
  learnerId: ObjectId (ref: Learner)
  status: 'active' | 'completed' | 'dropped' | 'waitlisted'
  progress: number (0-100)
  enrolledAt: Date
  completedAt?: Date
  droppedAt?: Date
  finalGrade?: number
  lastAccessedAt?: Date
}
```

**4. Permission**
```typescript
{
  resource: string
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
  name: string
  scope?: 'own' | 'department' | 'all'
  conditions?: any
  group?: string
  isSystemPermission: boolean
  isActive: boolean
}
```

**5. Report**
```typescript
{
  reportType: 'course-analytics' | 'learner-progress' | 'scorm-analytics' | 'enrollment' | 'financial'
  format: 'pdf' | 'excel' | 'csv' | 'json'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  generatedBy: ObjectId (ref: Staff)
  parameters?: any
  fileUrl?: string
  isScheduled: boolean
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    time?: string
  }
}
```

### Indexes

All models have optimized compound indexes. See implementation reports for details.

---

## Authentication & Authorization

### Authentication Flow

**1. Registration:**
```
Client → POST /api/v2/auth/register/staff
       → Server creates User + Staff
       → Returns { user, staff, accessToken, refreshToken }
```

**2. Login:**
```
Client → POST /api/v2/auth/login { email, password }
       → Server validates credentials
       → Returns { accessToken, refreshToken }
```

**3. Token Refresh:**
```
Client → POST /api/v2/auth/refresh { refreshToken }
       → Server validates refresh token
       → Returns { accessToken, refreshToken (new) }
```

### Authorization Levels

**1. Role-Based (5 Roles):**
- `admin` - Full system access
- `instructor` - Course/content management
- `learner` - Student access
- `staff` - Administrative tasks
- `guest` - Limited public access

**2. Permission-Based (Resource-Action-Scope):**
```typescript
// Example: Permission check
if (await hasPermission(user, 'course', 'update', 'department')) {
  // Allow course update in user's department
}
```

**3. Conditional Permissions:**
```typescript
// Example: Status-based permission
{
  resource: 'enrollment',
  action: 'delete',
  conditions: { status: ['draft', 'pending'] }
}
```

### Protected Routes

```typescript
// Require authentication
router.get('/courses', authenticate, getCourses);

// Require specific permission
router.post('/courses', 
  authenticate, 
  requirePermission('course', 'create'),
  createCourse
);

// Require role
router.get('/admin/settings',
  authenticate,
  requireRole(['admin']),
  getSettings
);
```

---

## Error Handling

### Error Classes

```typescript
// ApiError - Base error class
class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

// Usage
throw new ApiError(404, 'Course not found');
throw new ApiError(403, 'Insufficient permissions');
```

### Global Error Handler

```typescript
app.use((err, req, res, next) => {
  const { statusCode = 500, message } = err;
  
  // Log error
  logger.error(err);
  
  // Send response
  res.status(statusCode).json({
    status: 'error',
    message: statusCode === 500 ? 'Internal server error' : message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
```

### Async Error Handling

```typescript
// AsyncHandler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage
router.get('/courses/:id', asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  res.json({ status: 'success', data: course });
}));
```

---

## Performance Best Practices

### 1. Database Optimization

**Use Indexes:**
```typescript
// Compound indexes for common queries
courseSchema.index({ department: 1, status: 1 });
enrollmentSchema.index({ courseId: 1, learnerId: 1 }, { unique: true });
```

**Use Lean Queries:**
```typescript
// Return plain objects (faster)
const courses = await Course.find().lean();
```

**Select Only Needed Fields:**
```typescript
// Reduce data transfer
const users = await User.find().select('email firstName lastName');
```

**Use Aggregation for Complex Queries:**
```typescript
const stats = await Enrollment.aggregate([
  { $match: { status: 'active' } },
  { $group: { _id: '$courseId', count: { $sum: 1 } } }
]);
```

### 2. Caching (Recommended)

```typescript
// Redis caching for settings
const getSettingCached = async (key: string) => {
  const cached = await redis.get(`setting:${key}`);
  if (cached) return JSON.parse(cached);
  
  const setting = await Setting.findOne({ key });
  await redis.setex(`setting:${key}`, 86400, JSON.stringify(setting));
  return setting;
};
```

### 3. Pagination

```typescript
// Always paginate large result sets
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 20;
const skip = (page - 1) * limit;

const courses = await Course.find()
  .skip(skip)
  .limit(limit);

const total = await Course.countDocuments();

res.json({
  status: 'success',
  data: {
    items: courses,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  }
});
```

### 4. Background Jobs

```typescript
// Use queues for heavy operations
import Bull from 'bull';

const reportQueue = new Bull('report-generation');

reportQueue.process(async (job) => {
  const { reportId, parameters } = job.data;
  // Generate report asynchronously
  await generateReport(reportId, parameters);
});

// Trigger report generation
reportQueue.add({ reportId, parameters });
```

---

## Additional Resources

- **API Documentation:** `/api-docs` (Swagger UI)
- **Implementation Reports:** `/devdocs/IMPLEMENTATION_REPORT_PHASE*.md`
- **Performance Analysis:** `/devdocs/PHASE9_PERFORMANCE_ANALYSIS.md`
- **Migration Guide:** `/devdocs/MIGRATION_GUIDE.md` (this document)
- **Deployment Guide:** `/devdocs/DEPLOYMENT_GUIDE.md` (this document)

---

**Last Updated:** January 7, 2026  
**Version:** 2.0.0  
**Maintained By:** Development Team
