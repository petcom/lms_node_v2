# Ideal MongoDB Data Objects

> **Created:** 2026-01-07  
> **Purpose:** Define MongoDB collection schemas for the ideal LMS data model  
> **Reference:** Based on `Ideal_TypeScript_DataStructures.md` and Ideal RESTful API

---

## Table of Contents

1. [Schema Design Principles](#schema-design-principles)
2. [Authentication & Users](#authentication--users)
3. [Organizational Structure](#organizational-structure)
4. [Academic Structure](#academic-structure)
5. [Content Management](#content-management)
6. [Enrollment & Lifecycle](#enrollment--lifecycle)
7. [Learning Activity & Progress](#learning-activity--progress)
8. [Assessment & Grading](#assessment--grading)
9. [Analytics & Reporting](#analytics--reporting)
10. [System & Configuration](#system--configuration)
11. [Indexes Strategy](#indexes-strategy)
12. [Relationships Map](#relationships-map)

---

## Schema Design Principles

### 1. **Shared ID Pattern**
- User, Staff, Learner, Admin share the same `_id`
- Enables efficient joins and unified authentication

### 2. **Embedded vs Referenced**
- **Embed**: Small, bounded arrays (e.g., department memberships, status history)
- **Reference**: Large collections, many-to-many relationships
- **Populate**: Use populated fields for frequent joins

### 3. **Audit Trail**
- All collections include `createdAt`, `updatedAt` (automatic)
- Manual audit fields: `createdBy`, `updatedBy` reference User collection

### 4. **Soft Delete**
- Use `isDeleted`, `deletedAt`, `deletedBy` instead of hard deletes
- Preserves data integrity and audit trails

### 5. **Status Fields**
- Use enum validation for status fields
- Include status history arrays for lifecycle tracking

### 6. **Indexes**
- Single field indexes on foreign keys
- Compound indexes for common query patterns
- Unique indexes where appropriate
- TTL indexes for expiring data

---

## Authentication & Users

### Collection: `users`

```javascript
{
  _id: ObjectId,
  email: String,              // unique, required
  passwordHash: String,       // bcrypt hashed, never returned
  firstName: String,          // required
  lastName: String,           // required
  middleName: String,
  displayName: String,        // computed or custom
  role: String,               // enum: 'staff', 'learner', 'admin', 'global-admin'
  avatar: String,             // URL or path
  phone: String,
  isActive: Boolean,          // default: true
  lastLoginAt: Date,
  emailVerified: Boolean,     // default: false
  emailVerifiedAt: Date,
  twoFactorEnabled: Boolean,  // default: false
  twoFactorSecret: String,    // encrypted
  
  // Audit
  createdAt: Date,            // auto
  updatedAt: Date,            // auto
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });
db.users.createIndex({ lastLoginAt: -1 });
```

### Collection: `staff`

```javascript
{
  _id: ObjectId,              // Same as User._id
  userId: ObjectId,           // ref: User (for back-reference)
  employeeId: String,         // unique, sparse
  
  // Department memberships (embedded)
  departmentMemberships: [
    {
      departmentId: ObjectId,       // ref: Department
      roles: [String],              // enum: 'instructor', 'content-admin', 'department-admin', 'billing-admin'
      isPrimary: Boolean,           // default: false
      startDate: Date,              // required
      endDate: Date
    }
  ],
  
  // Profile
  bio: String,
  expertise: [String],        // tags/keywords
  officeLocation: String,
  officeHours: String,
  
  // Status
  status: String,             // enum: 'active', 'on-leave', 'terminated'
  
  // Soft delete
  isDeleted: Boolean,         // default: false
  deletedAt: Date,
  deletedBy: ObjectId,        // ref: User
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.staff.createIndex({ userId: 1 }, { unique: true });
db.staff.createIndex({ employeeId: 1 }, { unique: true, sparse: true });
db.staff.createIndex({ "departmentMemberships.departmentId": 1 });
db.staff.createIndex({ "departmentMemberships.roles": 1 });
db.staff.createIndex({ status: 1 });
db.staff.createIndex({ isDeleted: 1 });
```

### Collection: `learners`

```javascript
{
  _id: ObjectId,              // Same as User._id
  userId: ObjectId,           // ref: User
  studentId: String,          // unique, required
  
  // Personal info
  dateOfBirth: Date,
  gender: String,             // enum: 'male', 'female', 'other', 'prefer-not-to-say'
  
  // Address (embedded)
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  
  // Emergency contact (embedded)
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    email: String
  },
  
  // Guardian info (for minors, embedded)
  guardianInfo: {
    name: String,
    relationship: String,
    phone: String,
    email: String
  },
  
  // Status
  status: String,             // enum: 'active', 'on-leave', 'suspended', 'withdrawn', 'graduated'
  enrollmentDate: Date,       // required
  expectedGraduationDate: Date,
  
  // Soft delete
  isDeleted: Boolean,
  deletedAt: Date,
  deletedBy: ObjectId,        // ref: User
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.learners.createIndex({ userId: 1 }, { unique: true });
db.learners.createIndex({ studentId: 1 }, { unique: true });
db.learners.createIndex({ status: 1 });
db.learners.createIndex({ enrollmentDate: 1 });
db.learners.createIndex({ isDeleted: 1 });
```

### Collection: `refreshtokens`

```javascript
{
  _id: ObjectId,
  token: String,              // unique, required
  userId: ObjectId,           // ref: User, required
  userRole: String,           // User's role for quick lookup
  expiresAt: Date,            // required, TTL index
  isUsed: Boolean,            // default: false
  isRevoked: Boolean,         // default: false
  
  // Device info (embedded)
  deviceInfo: {
    userAgent: String,
    ipAddress: String
  },
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.refreshtokens.createIndex({ token: 1 }, { unique: true });
db.refreshtokens.createIndex({ userId: 1 });
db.refreshtokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL
```

---

## Organizational Structure

### Collection: `departments`

```javascript
{
  _id: ObjectId,
  name: String,               // required, indexed
  code: String,               // unique, required
  description: String,
  
  // Hierarchy
  level: String,              // enum: 'master', 'top', 'sub'
  parentDepartment: ObjectId, // ref: Department, indexed
  parentDepartmentPath: [ObjectId], // Array of ancestor IDs for efficient hierarchy queries
  
  // Leadership
  headOfDepartment: ObjectId, // ref: Staff
  
  // Contact
  contactEmail: String,
  contactPhone: String,
  
  // Status
  isActive: Boolean,          // default: true
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.departments.createIndex({ code: 1 }, { unique: true });
db.departments.createIndex({ name: 1 });
db.departments.createIndex({ parentDepartment: 1 });
db.departments.createIndex({ level: 1 });
db.departments.createIndex({ isActive: 1 });
db.departments.createIndex({ parentDepartmentPath: 1 }); // For hierarchy queries
```

---

## Academic Structure

### Collection: `programs`

```javascript
{
  _id: ObjectId,
  name: String,               // required, indexed
  code: String,               // unique, required
  description: String,
  department: ObjectId,       // ref: Department, required, indexed
  
  // Duration
  duration: Number,           // required
  durationUnit: String,       // enum: 'months', 'years', 'weeks', default: 'months'
  
  // Credential
  credentialOffered: String,  // enum: 'certificate', 'degree', 'diploma', 'badge', 'none'
  targetCredential: ObjectId, // ref: Credential
  
  // Status
  status: String,             // enum: 'active', 'inactive', 'archived', 'draft', 'published'
  
  // Dates
  startDate: Date,
  endDate: Date,
  
  // Capacity
  capacity: Number,           // max enrollments
  
  // Learning info
  prerequisites: [String],
  learningOutcomes: [String],
  
  // Financial
  tuitionFee: Number,
  currency: String,           // ISO 4217 code (USD, EUR, etc.)
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.programs.createIndex({ code: 1 }, { unique: true });
db.programs.createIndex({ name: 1 });
db.programs.createIndex({ department: 1 });
db.programs.createIndex({ status: 1 });
db.programs.createIndex({ department: 1, status: 1 }); // Compound
```

### Collection: `subprograms`

```javascript
{
  _id: ObjectId,
  program: ObjectId,          // ref: Program, required, indexed
  name: String,               // required (e.g., "Year 1", "Semester 1")
  order: Number,              // required, sequence number
  description: String,
  
  // Dates
  startDate: Date,
  endDate: Date,
  
  // Status
  isActive: Boolean,          // default: true
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.subprograms.createIndex({ program: 1 });
db.subprograms.createIndex({ program: 1, order: 1 });
db.subprograms.createIndex({ isActive: 1 });
```

### Collection: `courses`

```javascript
{
  _id: ObjectId,
  title: String,              // required, indexed
  code: String,               // unique, required
  description: String,
  
  // Academic hierarchy
  program: ObjectId,          // ref: Program, required, indexed
  subProgram: ObjectId,       // ref: SubProgram, indexed
  department: ObjectId,       // ref: Department, required, indexed
  
  // Credits & duration
  credits: Number,
  duration: Number,           // hours
  
  // Status & publishing
  status: String,             // enum: 'active', 'inactive', 'archived', 'draft', 'published'
  publishedAt: Date,
  archivedAt: Date,
  
  // Content settings
  passingScore: Number,       // 0-100, default: 70
  maxAttempts: Number,        // null = unlimited
  scoreCalculationMethod: String, // enum: 'final-attempt', 'best-attempt', 'average-all', 'average-last-n'
  certificateTemplate: ObjectId, // ref: CourseTemplate
  
  // Instructors
  instructors: [ObjectId],    // ref: Staff, indexed
  
  // Learning metadata
  learningObjectives: [String],
  prerequisites: [String],
  estimatedTime: Number,      // minutes
  difficulty: String,         // enum: 'beginner', 'intermediate', 'advanced'
  tags: [String],
  thumbnailUrl: String,
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.courses.createIndex({ code: 1 }, { unique: true });
db.courses.createIndex({ title: 1 });
db.courses.createIndex({ program: 1 });
db.courses.createIndex({ department: 1 });
db.courses.createIndex({ status: 1 });
db.courses.createIndex({ instructors: 1 });
db.courses.createIndex({ program: 1, status: 1 }); // Compound
db.courses.createIndex({ department: 1, status: 1 }); // Compound
db.courses.createIndex({ tags: 1 });
```

### Collection: `coursemodules`

```javascript
{
  _id: ObjectId,
  course: ObjectId,           // ref: Course, required, indexed
  title: String,              // required
  description: String,
  
  // Content reference
  contentType: String,        // enum: 'scorm', 'exercise', 'quiz', 'exam', 'video', 'document', 'interactive', 'external_link'
  contentId: ObjectId,        // ref: ScormPackage | Exercise | Media (polymorphic)
  
  // Sequencing
  sequence: Number,           // required, order in course
  
  // Settings
  isRequired: Boolean,        // default: true
  weight: Number,             // 0-1, for grade calculation
  passingScore: Number,       // override course default
  maxAttempts: Number,        // override course default
  estimatedTime: Number,      // minutes
  
  // Locking
  isLocked: Boolean,          // default: false
  unlockConditions: [
    {
      type: String,           // enum: 'module_completion', 'score_threshold', 'date'
      moduleId: ObjectId,     // ref: CourseModule (for type=module_completion)
      scoreThreshold: Number, // for type=score_threshold
      unlockDate: Date        // for type=date
    }
  ],
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.coursemodules.createIndex({ course: 1 });
db.coursemodules.createIndex({ course: 1, sequence: 1 });
db.coursemodules.createIndex({ contentType: 1, contentId: 1 });
db.coursemodules.createIndex({ isRequired: 1 });
```

### Collection: `classes`

```javascript
{
  _id: ObjectId,
  name: String,               // required
  code: String,               // unique, required
  course: ObjectId,           // ref: Course, required, indexed
  program: ObjectId,          // ref: Program, required, indexed
  subProgram: ObjectId,       // ref: SubProgram, indexed
  
  // Instructors
  instructors: [ObjectId],    // ref: Staff, indexed
  
  // Scheduling
  startDate: Date,            // required
  endDate: Date,              // required
  duration: Number,           // hours per session
  schedule: [
    {
      dayOfWeek: String,      // enum: 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
      startTime: String,      // "09:00"
      endTime: String         // "11:00"
    }
  ],
  
  // Capacity
  capacity: Number,           // max students
  enrollmentCount: Number,    // current count, default: 0
  
  // Location
  location: String,           // physical location
  virtualMeetingUrl: String,  // online meeting link
  
  // Status
  status: String,             // enum: 'upcoming', 'active', 'completed', 'cancelled'
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.classes.createIndex({ code: 1 }, { unique: true });
db.classes.createIndex({ course: 1 });
db.classes.createIndex({ program: 1 });
db.classes.createIndex({ instructors: 1 });
db.classes.createIndex({ status: 1 });
db.classes.createIndex({ startDate: 1 });
```

### Collection: `academicyears`

```javascript
{
  _id: ObjectId,
  name: String,               // required, unique (e.g., "2025-2026")
  startDate: Date,            // required
  endDate: Date,              // required
  isCurrent: Boolean,         // default: false, only one should be true
  status: String,             // enum: 'active', 'inactive', 'archived'
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.academicyears.createIndex({ name: 1 }, { unique: true });
db.academicyears.createIndex({ isCurrent: 1 });
db.academicyears.createIndex({ startDate: 1 });
```

### Collection: `academicterms`

```javascript
{
  _id: ObjectId,
  name: String,               // required (e.g., "Fall 2025")
  academicYear: ObjectId,     // ref: AcademicYear, required, indexed
  termType: String,           // enum: 'fall', 'spring', 'summer', 'winter', 'semester-1', 'semester-2'
  startDate: Date,            // required
  endDate: Date,              // required
  isCurrent: Boolean,         // default: false
  status: String,             // enum: 'active', 'inactive', 'archived'
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.academicterms.createIndex({ academicYear: 1 });
db.academicterms.createIndex({ isCurrent: 1 });
db.academicterms.createIndex({ startDate: 1 });
```

### Collection: `yeargroups`

```javascript
{
  _id: ObjectId,
  name: String,               // required (e.g., "Class of 2026")
  academicYear: ObjectId,     // ref: AcademicYear, required, indexed
  subProgram: ObjectId,       // ref: SubProgram, indexed
  status: String,             // enum: 'active', 'inactive', 'archived'
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.yeargroups.createIndex({ academicYear: 1 });
db.yeargroups.createIndex({ subProgram: 1 });
```

### Collection: `credentials`

```javascript
{
  _id: ObjectId,
  name: String,               // required
  type: String,               // enum: 'certificate', 'degree', 'diploma', 'badge', 'none'
  program: ObjectId,          // ref: Program, indexed
  description: String,
  requirements: [String],     // list of requirements
  certificateTemplate: String, // template ID or path
  isActive: Boolean,          // default: true
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.credentials.createIndex({ program: 1 });
db.credentials.createIndex({ type: 1 });
db.credentials.createIndex({ isActive: 1 });
```

---

## Content Management

### Collection: `scormpackages`

```javascript
{
  _id: ObjectId,
  title: String,              // required, indexed
  description: String,
  version: String,            // enum: '1.2', '2004'
  
  // Status
  status: String,             // enum: 'active', 'inactive', 'archived', 'draft', 'published'
  publishedAt: Date,
  
  // Storage
  packagePath: String,        // required, file system path
  manifestPath: String,       // required, path to imsmanifest.xml
  launchUrl: String,          // required, entry point
  fileSize: Number,           // bytes
  
  // SCORM metadata
  identifier: String,         // from manifest
  schemaVersion: String,
  metadata: {
    duration: String,         // ISO 8601 duration
    typicalLearningTime: String,
    difficulty: String,
    keywords: [String],
    language: String,
    rights: String
  },
  
  // Ownership
  uploadedBy: ObjectId,       // ref: User, required
  department: ObjectId,       // ref: Department, indexed
  tags: [String],
  thumbnailUrl: String,
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.scormpackages.createIndex({ title: 1 });
db.scormpackages.createIndex({ uploadedBy: 1 });
db.scormpackages.createIndex({ department: 1 });
db.scormpackages.createIndex({ status: 1 });
db.scormpackages.createIndex({ tags: 1 });
```

### Collection: `exercises`

```javascript
{
  _id: ObjectId,
  title: String,              // required, indexed
  description: String,
  type: String,               // enum: 'quiz', 'exam', 'assignment', 'practice', 'survey'
  
  // Status
  status: String,             // enum: 'active', 'inactive', 'archived', 'draft', 'published'
  publishedAt: Date,
  
  // Settings
  timeLimit: Number,          // minutes, null = no limit
  passingScore: Number,       // 0-100
  maxAttempts: Number,        // null = unlimited
  allowReview: Boolean,       // default: true
  showCorrectAnswers: Boolean, // default: false
  showCorrectAnswersAfter: String, // enum: 'immediately', 'after_due_date', 'never'
  randomizeQuestions: Boolean, // default: false
  randomizeOptions: Boolean,  // default: false
  
  // Scheduling
  availableFrom: Date,
  availableUntil: Date,
  dueDate: Date,
  
  // Questions
  questions: [ObjectId],      // ref: Question, indexed
  totalPoints: Number,        // sum of question points
  
  // Ownership
  createdBy: ObjectId,        // ref: User, required
  department: ObjectId,       // ref: Department, indexed
  tags: [String],
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.exercises.createIndex({ title: 1 });
db.exercises.createIndex({ type: 1 });
db.exercises.createIndex({ status: 1 });
db.exercises.createIndex({ createdBy: 1 });
db.exercises.createIndex({ department: 1 });
db.exercises.createIndex({ tags: 1 });
db.exercises.createIndex({ availableFrom: 1, availableUntil: 1 });
```

### Collection: `questions`

```javascript
{
  _id: ObjectId,
  questionText: String,       // required
  questionType: String,       // enum: 'multiple_choice', 'multiple_select', 'true_false', 'short_answer', 'essay', 'fill_blank', 'matching'
  points: Number,             // required, default: 1
  difficulty: String,         // enum: 'easy', 'medium', 'hard'
  
  // Options (for choice-based questions)
  options: [
    {
      id: String,             // unique within question
      text: String,           // required
      isCorrect: Boolean,     // required
      feedback: String
    }
  ],
  
  // Correct answer (varies by type)
  correctAnswer: Schema.Types.Mixed, // String or [String]
  
  // Feedback
  feedbackCorrect: String,
  feedbackIncorrect: String,
  explanation: String,
  
  // Learning metadata
  tags: [String],
  bloomsTaxonomy: String,     // enum: 'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
  learningObjective: String,
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.questions.createIndex({ questionType: 1 });
db.questions.createIndex({ difficulty: 1 });
db.questions.createIndex({ tags: 1 });
db.questions.createIndex({ bloomsTaxonomy: 1 });
```

### Collection: `media`

```javascript
{
  _id: ObjectId,
  title: String,              // required, indexed
  description: String,
  type: String,               // enum: 'video', 'audio', 'document', 'presentation', 'image'
  
  // Storage
  url: String,                // required, CDN or storage URL
  filePath: String,           // file system path
  fileSize: Number,           // bytes
  mimeType: String,           // required
  duration: Number,           // seconds (for video/audio)
  
  // Accessibility
  transcriptUrl: String,
  captionsUrl: String,
  
  // Ownership
  uploadedBy: ObjectId,       // ref: User, required
  department: ObjectId,       // ref: Department, indexed
  tags: [String],
  thumbnailUrl: String,
  
  // Status
  status: String,             // enum: 'active', 'inactive', 'archived', 'draft', 'published'
  publishedAt: Date,
  
  // Analytics
  viewCount: Number,          // default: 0
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.media.createIndex({ title: 1 });
db.media.createIndex({ type: 1 });
db.media.createIndex({ uploadedBy: 1 });
db.media.createIndex({ department: 1 });
db.media.createIndex({ status: 1 });
db.media.createIndex({ tags: 1 });
```

### Collection: `coursetemplates`

```javascript
{
  _id: ObjectId,
  name: String,               // required
  type: String,               // enum: 'master', 'department', 'custom'
  department: ObjectId,       // ref: Department, indexed (null for master templates)
  
  // Template content
  html: String,               // HTML template
  css: String,                // CSS styles
  javascript: String,         // JS code
  
  // Settings
  isGlobal: Boolean,          // default: false (can be used by all departments)
  status: String,             // enum: 'active', 'inactive', 'archived', 'draft'
  previewUrl: String,
  
  // Usage tracking
  usageCount: Number,         // default: 0
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.coursetemplates.createIndex({ name: 1 });
db.coursetemplates.createIndex({ type: 1 });
db.coursetemplates.createIndex({ department: 1 });
db.coursetemplates.createIndex({ isGlobal: 1 });
db.coursetemplates.createIndex({ status: 1 });
```

---

## Enrollment & Lifecycle

### Collection: `programenrollments`

```javascript
{
  _id: ObjectId,
  learner: ObjectId,          // ref: Learner, required, indexed
  program: ObjectId,          // ref: Program, required, indexed
  
  // Goal
  credentialGoal: String,     // enum: 'certificate', 'degree', 'diploma', 'badge', 'none'
  targetCredential: ObjectId, // ref: Credential
  
  // Progress
  currentSubProgram: ObjectId, // ref: SubProgram
  
  // Status
  status: String,             // enum: 'applied', 'enrolled', 'active', 'on-leave', 'withdrawn', 'completed', 'suspended'
  
  // Status history (embedded)
  statusHistory: [
    {
      status: String,         // required
      reason: String,
      changedBy: ObjectId,    // ref: User
      changedAt: Date         // default: now
    }
  ],
  
  // Dates
  appliedAt: Date,
  enrolledAt: Date,           // required
  completedAt: Date,
  withdrawnAt: Date,
  expectedCompletionDate: Date,
  
  // Leave tracking
  leaveReason: String,
  leaveStartDate: Date,
  expectedReturnDate: Date,
  
  // Completion
  completionType: String,     // enum: 'graduated', 'completed', 'withdrawn'
  withdrawalReason: String,
  withdrawnBy: ObjectId,      // ref: User
  finalGrade: String,
  credentialAwarded: ObjectId, // ref: Credential
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.programenrollments.createIndex({ learner: 1 });
db.programenrollments.createIndex({ program: 1 });
db.programenrollments.createIndex({ learner: 1, program: 1 }, { unique: true });
db.programenrollments.createIndex({ status: 1 });
db.programenrollments.createIndex({ enrolledAt: 1 });
db.programenrollments.createIndex({ currentSubProgram: 1 });
```

### Collection: `courseenrollments`

```javascript
{
  _id: ObjectId,
  learner: ObjectId,          // ref: Learner, required, indexed
  course: ObjectId,           // ref: Course, required, indexed
  program: ObjectId,          // ref: Program, required, indexed
  subProgram: ObjectId,       // ref: SubProgram, indexed
  class: ObjectId,            // ref: Class, indexed
  
  // Status
  status: String,             // enum: 'active', 'completed', 'withdrawn', 'suspended'
  
  // Progress
  progress: Number,           // 0-100, default: 0
  modulesCompleted: Number,   // default: 0
  modulesTotal: Number,       // total in course
  currentModuleId: ObjectId,  // ref: CourseModule (last accessed)
  
  // Dates
  enrolledAt: Date,           // required
  startedAt: Date,            // first access
  completedAt: Date,
  lastAccessedAt: Date,
  
  // Performance
  currentScore: Number,       // 0-100, running average
  finalScore: Number,         // 0-100, final calculated score
  grade: String,              // letter grade (A, B, C, etc.)
  passed: Boolean,
  
  // Time tracking
  timeSpent: Number,          // seconds, default: 0
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.courseenrollments.createIndex({ learner: 1 });
db.courseenrollments.createIndex({ course: 1 });
db.courseenrollments.createIndex({ learner: 1, course: 1 }, { unique: true });
db.courseenrollments.createIndex({ program: 1 });
db.courseenrollments.createIndex({ class: 1 });
db.courseenrollments.createIndex({ status: 1 });
db.courseenrollments.createIndex({ enrolledAt: 1 });
db.courseenrollments.createIndex({ lastAccessedAt: 1 });
```

### Collection: `classenrollments`

```javascript
{
  _id: ObjectId,
  learner: ObjectId,          // ref: Learner, required, indexed
  class: ObjectId,            // ref: Class, required, indexed
  courseEnrollment: ObjectId, // ref: CourseEnrollment (link)
  
  // Status
  status: String,             // enum: 'active', 'withdrawn', 'completed'
  enrolledAt: Date,           // required
  withdrawnAt: Date,
  
  // Attendance (embedded)
  attendanceRecords: [
    {
      date: Date,             // required
      status: String,         // enum: 'present', 'absent', 'late', 'excused'
      notes: String
    }
  ],
  sessionsAttended: Number,   // calculated, default: 0
  totalSessions: Number,      // total in class
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.classenrollments.createIndex({ learner: 1 });
db.classenrollments.createIndex({ class: 1 });
db.classenrollments.createIndex({ learner: 1, class: 1 }, { unique: true });
db.classenrollments.createIndex({ courseEnrollment: 1 });
db.classenrollments.createIndex({ status: 1 });
```

---

## Learning Activity & Progress

### Collection: `contentattempts`

```javascript
{
  _id: ObjectId,
  learner: ObjectId,          // ref: Learner, required, indexed
  courseModule: ObjectId,     // ref: CourseModule, required, indexed
  contentType: String,        // enum: 'scorm', 'exercise', 'quiz', 'exam', 'video', 'document', 'interactive'
  contentId: ObjectId,        // polymorphic reference to content
  
  // Status
  status: String,             // enum: 'not_started', 'in_progress', 'completed', 'passed', 'failed', 'abandoned', 'suspended'
  attemptNumber: Number,      // required, starting from 1
  
  // Scoring
  score: Number,              // 0-100
  maxScore: Number,           // maximum possible
  rawScore: Number,           // actual points
  scaledScore: Number,        // -1 to 1 (SCORM)
  passed: Boolean,
  
  // Time tracking
  startedAt: Date,            // required
  completedAt: Date,
  lastAccessedAt: Date,       // required, updated frequently
  timeSpent: Number,          // seconds, default: 0
  
  // SCORM specific
  scormAttemptId: ObjectId,   // ref: ScormAttempt
  
  // Custom content specific
  answeredQuestions: [
    {
      questionId: ObjectId,
      questionText: String,
      answer: Schema.Types.Mixed, // String or [String]
      isCorrect: Boolean,
      pointsAwarded: Number,
      pointsPossible: Number,
      feedback: String,
      timeSpent: Number       // seconds
    }
  ],
  
  // Progress
  progressPercent: Number,    // 0-100
  location: String,           // bookmark/resume location
  suspendData: String,        // serialized state
  
  // Flexible payload
  payload: Schema.Types.Mixed, // any additional custom data
  
  // Audit
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.contentattempts.createIndex({ learner: 1 });
db.contentattempts.createIndex({ courseModule: 1 });
db.contentattempts.createIndex({ learner: 1, courseModule: 1, startedAt: -1 });
db.contentattempts.createIndex({ status: 1 });
db.contentattempts.createIndex({ scormAttemptId: 1 }, { unique: true, sparse: true });
db.contentattempts.createIndex({ contentType: 1, contentId: 1 });
db.contentattempts.createIndex({ lastAccessedAt: -1 });
```

### Collection: `scormattempts`

```javascript
{
  _id: ObjectId,
  attemptId: String,          // unique, required (UUID)
  learner: ObjectId,          // ref: Learner, required, indexed
  package: ObjectId,          // ref: ScormPackage, required, indexed
  contentAttempt: ObjectId,   // ref: ContentAttempt (back-reference)
  
  // Attempt info
  attemptNumber: Number,      // required, starting from 1
  startedAt: Date,            // required
  lastAccessedAt: Date,       // required
  completedAt: Date,
  
  // Status
  status: String,             // enum: 'not_started', 'incomplete', 'completed', 'passed', 'failed', 'suspended'
  
  // CMI Data Model (SCORM 1.2 & 2004) - embedded document
  cmi: {
    // Core
    learner_id: String,
    learner_name: String,
    lesson_location: String,
    lesson_status: String,    // 'passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'
    entry: String,            // 'ab-initio', 'resume', ''
    exit: String,             // 'timeout', 'suspend', 'logout', ''
    credit: String,           // 'credit', 'no-credit'
    mode: String,             // 'browse', 'normal', 'review'
    
    // SCORM 2004
    completion_status: String, // 'completed', 'incomplete', 'not attempted', 'unknown'
    success_status: String,   // 'passed', 'failed', 'unknown'
    location: String,
    
    // Score
    score: {
      raw: Number,
      min: Number,
      max: Number,
      scaled: Number          // -1 to 1
    },
    
    // Time
    session_time: String,     // ISO 8601 duration
    total_time: String,       // ISO 8601 duration
    
    // Suspend data
    suspend_data: String,     // can be large
    
    // Learner preferences
    learner_preference: {
      audio_level: Number,
      language: String,
      delivery_speed: Number,
      audio_captioning: Number
    },
    
    // Objectives
    objectives: [
      {
        id: String,
        score: {
          raw: Number,
          min: Number,
          max: Number,
          scaled: Number
        },
        success_status: String,
        completion_status: String,
        description: String,
        progress_measure: Number
      }
    ],
    
    // Interactions
    interactions: [
      {
        id: String,
        type: String,         // 'true-false', 'choice', 'fill-in', etc.
        objectives: [String],
        timestamp: Date,
        correct_responses: [String],
        weighting: Number,
        learner_response: String,
        result: String,       // 'correct', 'incorrect', 'unanticipated', 'neutral'
        latency: String,      // ISO 8601 duration
        description: String
      }
    ]
  },
  
  // Audit
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.scormattempts.createIndex({ attemptId: 1 }, { unique: true });
db.scormattempts.createIndex({ learner: 1 });
db.scormattempts.createIndex({ package: 1 });
db.scormattempts.createIndex({ learner: 1, package: 1, startedAt: -1 });
db.scormattempts.createIndex({ contentAttempt: 1 });
db.scormattempts.createIndex({ status: 1 });
db.scormattempts.createIndex({ lastAccessedAt: -1 });
```

### Collection: `examresults`

```javascript
{
  _id: ObjectId,
  learner: ObjectId,          // ref: Learner, required, indexed
  exercise: ObjectId,         // ref: Exercise, required, indexed
  contentAttempt: ObjectId,   // ref: ContentAttempt (link)
  
  // Attempt info
  attemptNumber: Number,      // required, starting from 1
  startedAt: Date,            // required
  submittedAt: Date,          // required
  
  // Scoring
  score: Number,              // points earned, required
  maxScore: Number,           // total possible, required
  percentage: Number,         // 0-100, required
  grade: String,              // letter grade (A, B, C, etc.)
  passed: Boolean,            // required
  passMark: Number,           // required
  
  // Status
  status: String,             // enum: 'passed', 'failed'
  remarks: String,            // enum: 'Excellent!', 'Very Good', 'Good', 'Fair', 'Needs Improvement'
  
  // Answers (embedded)
  answers: [
    {
      questionId: ObjectId,   // ref: Question
      questionText: String,
      answer: Schema.Types.Mixed, // String or [String]
      isCorrect: Boolean,
      pointsAwarded: Number,
      pointsPossible: Number,
      feedback: String,
      timeSpent: Number       // seconds
    }
  ],
  
  // Context
  subProgram: ObjectId,       // ref: SubProgram
  academicTerm: ObjectId,     // ref: AcademicTerm
  academicYear: ObjectId,     // ref: AcademicYear
  
  // Publishing
  isPublished: Boolean,       // default: false
  publishedAt: Date,
  
  // Grading
  instructorFeedback: String,
  gradedBy: ObjectId,         // ref: User (staff)
  gradedAt: Date,
  
  // Audit
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.examresults.createIndex({ learner: 1 });
db.examresults.createIndex({ exercise: 1 });
db.examresults.createIndex({ learner: 1, exercise: 1 });
db.examresults.createIndex({ status: 1 });
db.examresults.createIndex({ isPublished: 1 });
db.examresults.createIndex({ submittedAt: -1 });
db.examresults.createIndex({ academicYear: 1, academicTerm: 1 });
```

### Collection: `learningevents`

```javascript
{
  _id: ObjectId,
  learner: ObjectId,          // ref: Learner, required, indexed
  contentAttempt: ObjectId,   // ref: ContentAttempt
  
  // Event details
  eventType: String,          // enum: 'page_view', 'interaction', 'bookmark', 'note', 'pause', 'resume', 'seek', 'replay'
  timestamp: Date,            // required, indexed
  
  // Resource context
  resource: {
    type: String,             // ContentType
    id: ObjectId              // content ID
  },
  
  // Event metadata (flexible)
  metadata: Schema.Types.Mixed, // { pageNumber, videoTimestamp, interactionId, noteText, etc. }
  
  // Session tracking
  sessionId: String,          // UUID for session grouping
  
  // Audit
  createdAt: Date
}

// Indexes
db.learningevents.createIndex({ learner: 1, timestamp: -1 });
db.learningevents.createIndex({ contentAttempt: 1 });
db.learningevents.createIndex({ eventType: 1 });
db.learningevents.createIndex({ sessionId: 1 });
db.learningevents.createIndex({ timestamp: -1 });
// TTL index - expire old events after 1 year
db.learningevents.createIndex({ createdAt: 1 }, { expireAfterSeconds: 31536000 });
```

---

## Analytics & Reporting

### Collection: `reports`

```javascript
{
  _id: ObjectId,
  reportType: String,         // enum: 'completion', 'performance', 'engagement', 'transcript', 'custom'
  
  // Metadata
  name: String,               // report name
  description: String,
  
  // Filters (embedded)
  filters: {
    department: ObjectId,
    program: ObjectId,
    course: ObjectId,
    learner: ObjectId,
    dateRange: {
      from: Date,
      to: Date
    },
    status: String,
    groupBy: String           // 'learner', 'course', 'department'
  },
  
  // Generation
  status: String,             // enum: 'pending', 'processing', 'completed', 'failed'
  generatedAt: Date,
  generatedBy: ObjectId,      // ref: User
  
  // Output
  format: String,             // enum: 'json', 'csv', 'pdf', 'excel'
  downloadUrl: String,        // S3 or file path
  expiresAt: Date,            // TTL for downloads
  
  // Results (for json reports, can be large)
  data: Schema.Types.Mixed,
  
  // Audit
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.reports.createIndex({ reportType: 1 });
db.reports.createIndex({ generatedBy: 1 });
db.reports.createIndex({ status: 1 });
db.reports.createIndex({ createdAt: -1 });
db.reports.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL for auto-cleanup
```

---

## System & Configuration

### Collection: `permissions`

```javascript
{
  _id: ObjectId,
  name: String,               // required, indexed
  code: String,               // unique, required (e.g., "courses.create")
  description: String,
  resource: String,           // required (e.g., "course", "enrollment", "user")
  actions: [String],          // enum: 'create', 'read', 'update', 'delete', 'publish', 'grade', 'enroll'
  scope: String,              // enum: 'global', 'department', 'own'
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId,        // ref: User
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.permissions.createIndex({ code: 1 }, { unique: true });
db.permissions.createIndex({ name: 1 });
db.permissions.createIndex({ resource: 1 });
```

### Collection: `rolepermissions`

```javascript
{
  _id: ObjectId,
  role: String,               // enum: StaffRole values
  permissions: [ObjectId],    // ref: Permission
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.rolepermissions.createIndex({ role: 1 }, { unique: true });
```

### Collection: `settings`

```javascript
{
  _id: ObjectId,
  key: String,                // required, unique per scope
  value: Schema.Types.Mixed,  // any type
  type: String,               // enum: 'string', 'number', 'boolean', 'object', 'array'
  scope: String,              // enum: 'system', 'department', 'user'
  departmentId: ObjectId,     // ref: Department (for scope=department)
  userId: ObjectId,           // ref: User (for scope=user)
  description: String,
  isPublic: Boolean,          // default: false (if visible to non-admins)
  
  // Audit
  createdAt: Date,
  updatedAt: Date,
  updatedBy: ObjectId         // ref: User
}

// Indexes
db.settings.createIndex({ key: 1, scope: 1, departmentId: 1, userId: 1 }, { unique: true });
db.settings.createIndex({ scope: 1 });
db.settings.createIndex({ departmentId: 1 });
db.settings.createIndex({ userId: 1 });
```

### Collection: `auditlogs`

```javascript
{
  _id: ObjectId,
  action: String,             // required, indexed (e.g., "create", "update", "delete", "publish")
  entityType: String,         // required, indexed (e.g., "Course", "Enrollment")
  entityId: ObjectId,         // required, indexed
  actorId: ObjectId,          // ref: User, required, indexed
  actorRole: String,          // actor's role at time of action
  
  // Change tracking
  before: Schema.Types.Mixed, // state before change
  after: Schema.Types.Mixed,  // state after change
  
  // Context
  reason: String,             // optional reason for change
  context: Schema.Types.Mixed, // additional context (IP, user agent, etc.)
  
  // Timestamp
  createdAt: Date             // auto, no updates
}

// Indexes
db.auditlogs.createIndex({ entityType: 1, entityId: 1, createdAt: -1 });
db.auditlogs.createIndex({ actorId: 1, createdAt: -1 });
db.auditlogs.createIndex({ action: 1, createdAt: -1 });
db.auditlogs.createIndex({ createdAt: -1 });
// TTL index - expire old logs after 7 years (compliance)
db.auditlogs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 220752000 });
```

---

## Indexes Strategy

### Index Priorities

#### **High Priority** (Query Performance Critical)
1. **Foreign key indexes** - All `ObjectId` references
2. **Unique indexes** - email, studentId, employeeId, codes
3. **Status indexes** - Filtering by status is very common
4. **Date indexes** - For range queries and sorting
5. **Compound indexes** - Common query patterns

#### **Medium Priority** (Frequently Used)
1. **Tag indexes** - For content discovery
2. **Full-text indexes** - For search functionality
3. **Geospatial indexes** - If location-based features needed

#### **Low Priority** (Occasional Use)
1. **Sparse indexes** - For optional fields queried rarely
2. **Partial indexes** - For subset queries

### Compound Index Examples

```javascript
// Enrollment queries by learner and status
db.courseenrollments.createIndex({ learner: 1, status: 1 });

// Content by department and status
db.courses.createIndex({ department: 1, status: 1 });

// Attempts by learner and module
db.contentattempts.createIndex({ learner: 1, courseModule: 1, startedAt: -1 });

// Reports by type and date
db.reports.createIndex({ reportType: 1, createdAt: -1 });
```

### Text Indexes (Search)

```javascript
// Course search
db.courses.createIndex(
  { title: "text", description: "text", tags: "text" },
  { weights: { title: 10, tags: 5, description: 1 } }
);

// Content search
db.scormpackages.createIndex({ title: "text", description: "text" });
db.exercises.createIndex({ title: "text", description: "text" });
db.media.createIndex({ title: "text", description: "text" });
```

---

## Relationships Map

### User Relationships

```
User (1) ──→ (1) Staff
User (1) ──→ (1) Learner
User (1) ──→ (0..*) RefreshToken
User (1) ──→ (0..*) CreatedRecords (createdBy)
```

### Organizational Hierarchy

```
Department (1) ──→ (0..*) Department (children)
Department (1) ──→ (0..*) Program
Department (1) ──→ (0..*) Staff (via departmentMemberships)
```

### Academic Structure

```
Program (1) ──→ (0..*) SubProgram
Program (1) ──→ (0..*) Course
Program (1) ──→ (0..*) Class
Program (1) ──→ (0..1) Credential

Course (1) ──→ (0..*) CourseModule
Course (1) ──→ (0..*) Class
Course (1) ──→ (0..*) Staff (instructors)

CourseModule (1) ──→ (1) Content (polymorphic: ScormPackage | Exercise | Media)
```

### Content Polymorphism

```
CourseModule.contentId ──→ ScormPackage | Exercise | Media | ExternalLink
  (determined by CourseModule.contentType)
```

### Enrollment Flow

```
Learner (1) ──→ (0..*) ProgramEnrollment ──→ (1) Program
Learner (1) ──→ (0..*) CourseEnrollment ──→ (1) Course
Learner (1) ──→ (0..*) ClassEnrollment ──→ (1) Class

CourseEnrollment (1) ←─→ (0..1) ClassEnrollment (linked)
```

### Learning Activity

```
Learner (1) ──→ (0..*) ContentAttempt ──→ (1) CourseModule
ContentAttempt (1) ──→ (0..1) ScormAttempt (for SCORM content)
ContentAttempt (1) ──→ (0..*) LearningEvent

Learner (1) ──→ (0..*) ExamResult ──→ (1) Exercise
```

### Analytics Chain

```
CourseEnrollment.progress ← calculated from ← ContentAttempt (by courseModule)
ProgramEnrollment.progress ← calculated from ← CourseEnrollment (by program)
```

---

## Collection Size Estimates

### Small Collections (<10K docs)
- departments
- programs
- subprograms
- academicyears
- academicterms
- credentials
- coursetemplates
- permissions
- rolepermissions
- settings

### Medium Collections (10K-100K docs)
- users
- staff
- courses
- coursemodules
- classes
- scormpackages
- exercises
- questions
- media

### Large Collections (100K-1M+ docs)
- learners
- programenrollments
- courseenrollments
- classenrollments
- contentattempts
- examresults

### Very Large Collections (1M+ docs)
- scormattempts
- learningevents
- auditlogs
- refreshtokens

---

## Data Validation Rules

### MongoDB Schema Validation

```javascript
// Example: Course validation
db.createCollection("courses", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "code", "program", "department"],
      properties: {
        title: {
          bsonType: "string",
          description: "must be a string and is required"
        },
        code: {
          bsonType: "string",
          pattern: "^[A-Z]{3,4}-[0-9]{3}$",
          description: "must match pattern XXX-000"
        },
        status: {
          enum: ["active", "inactive", "archived", "draft", "published"],
          description: "must be a valid status"
        },
        passingScore: {
          bsonType: "number",
          minimum: 0,
          maximum: 100,
          description: "must be between 0 and 100"
        }
      }
    }
  }
});
```

---

## Migration Considerations

### From Current to Ideal Schema

1. **Rename Collections**
   - `ProgramLevel` → `SubProgram`
   - `CourseContent` → `CourseModule`

2. **Field Renames**
   - `programLevel` → `subProgram`
   - `courseContent` → `courseModule`

3. **Embedded to Referenced**
   - Consider keeping small arrays embedded
   - Move large arrays to separate collections

4. **Add New Fields**
   - `isDeleted`, `deletedAt`, `deletedBy` for soft delete
   - `statusHistory` arrays
   - Enhanced metadata fields

5. **Data Type Changes**
   - Ensure consistent ObjectId usage
   - Convert string enums to validated strings

6. **Index Updates**
   - Add new indexes before queries
   - Drop unused indexes
   - Analyze query patterns post-migration

---

## Notes

1. **Shared ID Pattern**: User, Staff, Learner, Admin all share the same `_id` value for efficient joins
2. **Polymorphic References**: ContentAttempt uses `contentType` + `contentId` to reference different content types
3. **Embedded vs Reference**: Balance based on array size and update frequency
4. **Soft Delete**: Use `isDeleted` flag instead of hard deletes to preserve data integrity
5. **Audit Fields**: All collections include `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
6. **TTL Indexes**: Auto-expire old tokens, events, and reports
7. **Status History**: Track all status changes with embedded arrays for audit trail
8. **Flexible Schema**: Use `Schema.Types.Mixed` for extensibility where appropriate

This schema design supports the Ideal RESTful API while maintaining MongoDB best practices for performance, scalability, and data integrity.
