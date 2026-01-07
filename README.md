# LMS API V2

Clean architecture implementation of the Learning Management System API.

## Architecture

This project follows a clean, domain-driven architecture with clear separation of concerns:

```
src/
├── config/           # Configuration & setup
├── models/           # Mongoose schemas & models
├── controllers/      # Request handlers
├── services/         # Business logic
├── middlewares/      # Express middlewares
├── routes/           # API routes
├── utils/            # Utility functions
├── validators/       # Request validation schemas
├── types/            # TypeScript types & interfaces
└── server.ts         # Application entry point
```

## Features

- ✅ RESTful API design following industry best practices
- ✅ TypeScript with strict type checking
- ✅ Clean architecture with separation of concerns
- ✅ MongoDB with Mongoose ODM
- ✅ JWT authentication & authorization
- ✅ Role-based access control (RBAC)
- ✅ Request validation with Joi
- ✅ Comprehensive error handling
- ✅ Rate limiting & security middleware
- ✅ API documentation with Swagger
- ✅ Unit & integration tests
- ✅ SCORM 1.2 & 2004 support

## Getting Started

### Prerequisites

- Node.js >= 22.0.0
- MongoDB >= 6.0
- Redis (optional, for caching)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your configuration
```

### Development

```bash
# Run in development mode
npm run dev

# Run with watch mode
npm run dev:watch

# Type checking
npm run type-check
npm run type-check:watch
```

### Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

## API Documentation

Once the server is running, visit:

- Swagger UI: `http://localhost:5000/api/v2/docs`
- API JSON: `http://localhost:5000/api/v2/docs.json`

## Project Structure

### Models
Organized by domain:
- `auth/` - User, Staff, Learner, RefreshToken
- `organization/` - Department
- `academic/` - Program, SubProgram, Course, CourseModule, Class
- `content/` - ScormPackage, Exercise, Question, Media
- `enrollment/` - ProgramEnrollment, CourseEnrollment, ClassEnrollment
- `activity/` - ContentAttempt, ScormAttempt, ExamResult
- `system/` - Permission, Setting, AuditLog

### Routes
RESTful resource-based routes:
- `/api/v2/auth` - Authentication
- `/api/v2/users` - User management
- `/api/v2/departments` - Department management
- `/api/v2/programs` - Program management
- `/api/v2/courses` - Course management
- `/api/v2/enrollments` - Enrollment management
- `/api/v2/progress` - Learning progress
- `/api/v2/attempts` - Content attempts
- `/api/v2/scorm` - SCORM content & runtime

## Environment Variables

See `.env.example` for all available configuration options.

## License

MIT
