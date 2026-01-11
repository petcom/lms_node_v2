# Ideal TypeScript Data Structures

> **Created:** 2026-01-07  
> **Purpose:** Define comprehensive TypeScript types, interfaces, and objects for the ideal LMS API  
> **Reference:** Maps to Ideal API defined in `Ideal_RestfulAPI_toCurrent_Crosswalk.md`

---

## Table of Contents

1. [Common Types & Enums](#common-types--enums)
2. [User Management](#user-management)
3. [Organizational Structure](#organizational-structure)
4. [Academic Structure](#academic-structure)
5. [Content Management](#content-management)
6. [Enrollment Management](#enrollment-management)
7. [Learning Activity & Progress](#learning-activity--progress)
8. [Assessment & Grading](#assessment--grading)
9. [Analytics & Reporting](#analytics--reporting)
10. [System & Configuration](#system--configuration)

---

## Common Types & Enums

### Base Types

```typescript
// MongoDB ObjectId representation
type ObjectId = string;

// ISO 8601 date string
type ISODate = string;

// Common status enum
enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
  DRAFT = 'draft',
  PUBLISHED = 'published'
}

// Pagination metadata
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Standard API response wrapper
interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data?: T;
  meta?: PaginationMeta;
  errors?: ValidationError[];
}

// Validation error
interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// Audit trail
interface AuditFields {
  createdAt: ISODate;
  updatedAt: ISODate;
  createdBy?: ObjectId;
  updatedBy?: ObjectId;
}

// Soft delete
interface SoftDeletable {
  deletedAt?: ISODate;
  deletedBy?: ObjectId;
  isDeleted: boolean;
}
```

### Learning-Specific Enums

```typescript
enum EnrollmentStatus {
  APPLIED = 'applied',
  ENROLLED = 'enrolled',
  ACTIVE = 'active',
  ON_LEAVE = 'on-leave',
  WITHDRAWN = 'withdrawn',
  COMPLETED = 'completed',
  SUSPENDED = 'suspended'
}

enum ContentType {
  SCORM = 'scorm',
  EXERCISE = 'exercise',
  QUIZ = 'quiz',
  EXAM = 'exam',
  VIDEO = 'video',
  DOCUMENT = 'document',
  INTERACTIVE = 'interactive',
  EXTERNAL_LINK = 'external_link'
}

enum AttemptStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  PASSED = 'passed',
  FAILED = 'failed',
  ABANDONED = 'abandoned',
  SUSPENDED = 'suspended'
}

enum ScoreCalculationMethod {
  FINAL_ATTEMPT = 'final-attempt',
  BEST_ATTEMPT = 'best-attempt',
  AVERAGE_ALL = 'average-all',
  AVERAGE_LAST_N = 'average-last-n'
}

enum CredentialGoal {
  CERTIFICATE = 'certificate',
  DEGREE = 'degree',
  DIPLOMA = 'diploma',
  BADGE = 'badge',
  NONE = 'none'
}

enum StaffRole {
  INSTRUCTOR = 'instructor',
  CONTENT_ADMIN = 'content-admin',
  DEPARTMENT_ADMIN = 'department-admin',
  BILLING_ADMIN = 'billing-admin',
  GLOBAL_ADMIN = 'global-admin'
}

enum LearnerStatus {
  ACTIVE = 'active',
  ON_LEAVE = 'on-leave',
  SUSPENDED = 'suspended',
  WITHDRAWN = 'withdrawn',
  GRADUATED = 'graduated'
}
```

---

## User Management

### User Base

```typescript
// Base user entity (shared across Staff, Learner, Admin)
interface User extends AuditFields {
  _id: ObjectId;
  email: string;
  password?: string; // Hashed, never returned in API
  firstName: string;
  lastName: string;
  middleName?: string;
  displayName?: string;
  role: 'staff' | 'learner' | 'admin' | 'global-admin';
  avatar?: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: ISODate;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

// Staff member
interface Staff extends AuditFields, SoftDeletable {
  _id: ObjectId; // Same as User._id
  userId: ObjectId; // Reference to User
  employeeId?: string;
  departmentMemberships: DepartmentMembership[];
  bio?: string;
  expertise?: string[];
  officeLocation?: string;
  officeHours?: string;
  status: 'active' | 'on-leave' | 'terminated';
}

interface DepartmentMembership {
  departmentId: ObjectId;
  department?: Department; // Populated
  roles: StaffRole[];
  isPrimary: boolean;
  startDate: ISODate;
  endDate?: ISODate;
}

// Learner
interface Learner extends AuditFields, SoftDeletable {
  _id: ObjectId; // Same as User._id
  userId: ObjectId; // Reference to User
  studentId: string;
  dateOfBirth?: ISODate;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  address?: Address;
  emergencyContact?: EmergencyContact;
  status: LearnerStatus;
  enrollmentDate: ISODate;
  expectedGraduationDate?: ISODate;
  guardianInfo?: GuardianInfo; // For minors
}

interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

interface GuardianInfo {
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

// Current user profile (unified /users/me response)
interface CurrentUserProfile {
  user: User;
  profile: Staff | Learner; // Depends on role
  departments?: Department[]; // For staff
  permissions: Permission[];
  preferences: UserPreferences;
}

interface UserPreferences {
  language: string;
  timezone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  theme: 'light' | 'dark' | 'auto';
}
```

---

## Organizational Structure

### Department

```typescript
interface Department extends AuditFields {
  _id: ObjectId;
  name: string;
  code: string;
  description?: string;
  level: 'master' | 'top' | 'sub';
  parentDepartment?: ObjectId;
  parentDepartmentPath?: ObjectId[]; // For hierarchy queries
  isActive: boolean;
  headOfDepartment?: ObjectId; // Staff._id
  contactEmail?: string;
  contactPhone?: string;
}

// Department hierarchy (nested structure)
interface DepartmentHierarchy extends Department {
  children: DepartmentHierarchy[];
  staffCount?: number;
  programCount?: number;
}

// Department statistics
interface DepartmentStats {
  departmentId: ObjectId;
  name: string;
  staff: {
    total: number;
    byRole: Record<StaffRole, number>;
  };
  programs: {
    total: number;
    active: number;
    archived: number;
  };
  courses: {
    total: number;
    published: number;
    draft: number;
  };
  enrollments: {
    active: number;
    completed: number;
    completionRate: number;
  };
  progress: {
    averageCompletion: number; // 0-1
    averageScore: number; // 0-100
  };
}
```

---

## Academic Structure

### Program

```typescript
interface Program extends AuditFields {
  _id: ObjectId;
  name: string;
  code: string;
  description?: string;
  department: ObjectId;
  departmentData?: Department; // Populated
  duration: number; // In months
  durationUnit: 'months' | 'years' | 'weeks';
  credentialOffered?: CredentialGoal;
  targetCredential?: ObjectId; // Reference to Credential
  status: Status;
  startDate?: ISODate;
  endDate?: ISODate;
  capacity?: number;
  prerequisites?: string[];
  learningOutcomes?: string[];
  tuitionFee?: number;
  currency?: string;
}

// Sub-program (year/semester/grade)
interface SubProgram extends AuditFields {
  _id: ObjectId;
  program: ObjectId;
  programData?: Program; // Populated
  name: string; // "Year 1", "Semester 1", "Level 100"
  order: number; // Sequence
  description?: string;
  startDate?: ISODate;
  endDate?: ISODate;
  isActive: boolean;
}

// Academic Calendar
interface AcademicYear extends AuditFields {
  _id: ObjectId;
  name: string; // "2025-2026"
  startDate: ISODate;
  endDate: ISODate;
  isCurrent: boolean;
  status: Status;
}

interface AcademicTerm extends AuditFields {
  _id: ObjectId;
  name: string; // "Fall 2025", "Spring 2026"
  academicYear: ObjectId;
  academicYearData?: AcademicYear; // Populated
  termType: 'fall' | 'spring' | 'summer' | 'winter' | 'semester-1' | 'semester-2';
  startDate: ISODate;
  endDate: ISODate;
  isCurrent: boolean;
  status: Status;
}

interface YearGroup extends AuditFields {
  _id: ObjectId;
  name: string; // "Class of 2026"
  academicYear: ObjectId;
  subProgram?: ObjectId;
  status: Status;
}

// Credential
interface Credential extends AuditFields {
  _id: ObjectId;
  name: string;
  type: CredentialGoal;
  program?: ObjectId;
  description?: string;
  requirements?: string[];
  certificateTemplate?: string;
  isActive: boolean;
}
```

### Course

```typescript
interface Course extends AuditFields {
  _id: ObjectId;
  title: string;
  code: string;
  description?: string;
  program: ObjectId;
  programData?: Program; // Populated
  subProgram?: ObjectId;
  subProgramData?: SubProgram; // Populated
  department: ObjectId;
  departmentData?: Department; // Populated
  credits?: number;
  duration?: number; // In hours
  status: Status;
  publishedAt?: ISODate;
  archivedAt?: ISODate;
  
  // Content settings
  passingScore?: number; // 0-100
  maxAttempts?: number;
  scoreCalculationMethod: ScoreCalculationMethod;
  certificateTemplate?: ObjectId;
  
  // Instructors
  instructors?: ObjectId[]; // Staff IDs
  instructorData?: Staff[]; // Populated
  
  // Metadata
  learningObjectives?: string[];
  prerequisites?: string[];
  estimatedTime?: number; // Minutes
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  thumbnailUrl?: string;
}

// Course module (segment/unit)
interface CourseModule extends AuditFields {
  _id: ObjectId;
  course: ObjectId;
  courseData?: Course; // Populated
  title: string;
  description?: string;
  contentType: ContentType;
  contentId: ObjectId; // Reference to ScormPackage, Exercise, Media, etc.
  contentData?: ScormPackage | Exercise | Media; // Populated based on contentType
  sequence: number;
  isRequired: boolean;
  weight?: number; // 0-1, for grading calculation
  passingScore?: number;
  maxAttempts?: number;
  estimatedTime?: number; // Minutes
  isLocked: boolean;
  unlockConditions?: UnlockCondition[];
}

interface UnlockCondition {
  type: 'module_completion' | 'score_threshold' | 'date';
  moduleId?: ObjectId;
  scoreThreshold?: number;
  unlockDate?: ISODate;
}

// Class (student group with schedule)
interface Class extends AuditFields {
  _id: ObjectId;
  name: string;
  code: string;
  course: ObjectId;
  courseData?: Course; // Populated
  program: ObjectId;
  subProgram?: ObjectId;
  instructors: ObjectId[]; // Staff IDs
  instructorData?: Staff[]; // Populated
  startDate: ISODate;
  endDate: ISODate;
  duration?: number; // Hours per session
  schedule?: ClassSchedule[];
  capacity?: number;
  enrollmentCount?: number;
  location?: string;
  virtualMeetingUrl?: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
}

interface ClassSchedule {
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string; // "09:00"
  endTime: string; // "11:00"
}
```

---

## Content Management

### SCORM Package

```typescript
interface ScormPackage extends AuditFields {
  _id: ObjectId;
  title: string;
  description?: string;
  version: '1.2' | '2004';
  status: Status;
  publishedAt?: ISODate;
  
  // Storage
  packagePath: string;
  manifestPath: string;
  launchUrl: string;
  fileSize: number; // Bytes
  
  // Metadata
  identifier: string; // From manifest
  schemaVersion: string;
  metadata?: ScormMetadata;
  
  // Tracking
  uploadedBy: ObjectId;
  department?: ObjectId;
  tags?: string[];
  thumbnailUrl?: string;
}

interface ScormMetadata {
  duration?: string; // ISO 8601 duration
  typicalLearningTime?: string;
  difficulty?: string;
  keywords?: string[];
  language?: string;
  rights?: string;
}
```

### Exercise & Assessment

```typescript
interface Exercise extends AuditFields {
  _id: ObjectId;
  title: string;
  description?: string;
  type: 'quiz' | 'exam' | 'assignment' | 'practice' | 'survey';
  status: Status;
  publishedAt?: ISODate;
  
  // Settings
  timeLimit?: number; // Minutes
  passingScore?: number; // 0-100
  maxAttempts?: number;
  allowReview: boolean;
  showCorrectAnswers: boolean;
  showCorrectAnswersAfter?: 'immediately' | 'after_due_date' | 'never';
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  
  // Scheduling
  availableFrom?: ISODate;
  availableUntil?: ISODate;
  dueDate?: ISODate;
  
  // Questions
  questions: ObjectId[]; // Question IDs
  questionData?: Question[]; // Populated
  totalPoints?: number;
  
  // Metadata
  createdBy: ObjectId;
  department?: ObjectId;
  tags?: string[];
}

interface Question extends AuditFields {
  _id: ObjectId;
  questionText: string;
  questionType: 'multiple_choice' | 'multiple_select' | 'true_false' | 'short_answer' | 'essay' | 'fill_blank' | 'matching';
  points: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  
  // Options (for choice-based questions)
  options?: QuestionOption[];
  
  // Correct answer
  correctAnswer?: string | string[]; // Depends on type
  
  // Feedback
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
  explanation?: string;
  
  // Metadata
  tags?: string[];
  bloomsTaxonomy?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  learningObjective?: string;
}

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback?: string;
}
```

### Media

```typescript
interface Media extends AuditFields {
  _id: ObjectId;
  title: string;
  description?: string;
  type: 'video' | 'audio' | 'document' | 'presentation' | 'image';
  
  // Storage
  url: string;
  filePath?: string;
  fileSize: number; // Bytes
  mimeType: string;
  duration?: number; // Seconds (for video/audio)
  
  // Metadata
  uploadedBy: ObjectId;
  department?: ObjectId;
  tags?: string[];
  thumbnailUrl?: string;
  transcriptUrl?: string;
  captionsUrl?: string;
  
  // Tracking
  status: Status;
  publishedAt?: ISODate;
  viewCount?: number;
}
```

### Template

```typescript
interface CourseTemplate extends AuditFields {
  _id: ObjectId;
  name: string;
  type: 'master' | 'department' | 'custom';
  department?: ObjectId;
  
  // Content
  html?: string;
  css?: string;
  javascript?: string;
  
  // Settings
  isGlobal: boolean;
  status: Status;
  previewUrl?: string;
  
  // Metadata
  createdBy: ObjectId;
  usageCount?: number;
}
```

---

## Enrollment Management

### Program Enrollment

```typescript
interface ProgramEnrollment extends AuditFields {
  _id: ObjectId;
  learner: ObjectId;
  learnerData?: Learner; // Populated
  program: ObjectId;
  programData?: Program; // Populated
  
  // Goal
  credentialGoal: CredentialGoal;
  targetCredential?: ObjectId;
  
  // Progress
  currentSubProgram?: ObjectId;
  currentSubProgramData?: SubProgram; // Populated
  
  // Status
  status: EnrollmentStatus;
  statusHistory: StatusHistoryEntry[];
  
  // Dates
  appliedAt?: ISODate;
  enrolledAt: ISODate;
  completedAt?: ISODate;
  withdrawnAt?: ISODate;
  expectedCompletionDate?: ISODate;
  
  // Leave tracking
  leaveReason?: string;
  leaveStartDate?: ISODate;
  expectedReturnDate?: ISODate;
  
  // Completion
  completionType?: 'graduated' | 'completed' | 'withdrawn';
  withdrawalReason?: string;
  withdrawnBy?: ObjectId;
  finalGrade?: string;
  credentialAwarded?: ObjectId;
}

interface StatusHistoryEntry {
  status: EnrollmentStatus;
  reason?: string;
  changedBy?: ObjectId;
  changedAt: ISODate;
}
```

### Course Enrollment

```typescript
interface CourseEnrollment extends AuditFields {
  _id: ObjectId;
  learner: ObjectId;
  learnerData?: Learner; // Populated
  course: ObjectId;
  courseData?: Course; // Populated
  program: ObjectId;
  subProgram?: ObjectId;
  class?: ObjectId;
  classData?: Class; // Populated
  
  // Status
  status: EnrollmentStatus;
  
  // Progress
  progress: number; // 0-100
  modulesCompleted: number;
  modulesTotal: number;
  currentModuleId?: ObjectId;
  
  // Dates
  enrolledAt: ISODate;
  startedAt?: ISODate;
  completedAt?: ISODate;
  lastAccessedAt?: ISODate;
  
  // Performance
  currentScore?: number;
  finalScore?: number;
  grade?: string;
  passed?: boolean;
  
  // Time tracking
  timeSpent?: number; // Seconds
}
```

### Class Enrollment

```typescript
interface ClassEnrollment extends AuditFields {
  _id: ObjectId;
  learner: ObjectId;
  learnerData?: Learner; // Populated
  class: ObjectId;
  classData?: Class; // Populated
  courseEnrollment?: ObjectId; // Link to course enrollment
  
  // Status
  status: 'active' | 'withdrawn' | 'completed';
  enrolledAt: ISODate;
  withdrawnAt?: ISODate;
  
  // Attendance
  attendanceRecords?: AttendanceRecord[];
  sessionsAttended?: number;
  totalSessions?: number;
}

interface AttendanceRecord {
  date: ISODate;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}
```

---

## Learning Activity & Progress

### Content Attempt

```typescript
interface ContentAttempt extends AuditFields {
  _id: ObjectId;
  learner: ObjectId;
  learnerData?: Learner; // Populated
  courseModule: ObjectId; // CourseModule._id
  courseModuleData?: CourseModule; // Populated
  contentType: ContentType;
  contentId: ObjectId; // Reference to actual content
  
  // Status
  status: AttemptStatus;
  attemptNumber: number;
  
  // Scoring
  score?: number; // 0-100
  maxScore?: number;
  rawScore?: number;
  scaledScore?: number; // -1 to 1 (SCORM)
  passed?: boolean;
  
  // Time tracking
  startedAt: ISODate;
  completedAt?: ISODate;
  lastAccessedAt: ISODate;
  timeSpent: number; // Seconds
  
  // SCORM specific
  scormAttemptId?: ObjectId; // Reference to ScormAttempt
  
  // Custom content specific
  answeredQuestions?: QuestionAnswer[];
  
  // Progress
  progressPercent?: number; // 0-100
  location?: string; // Bookmark location
  suspendData?: string;
  
  // Payload for custom data
  payload?: Record<string, any>;
}
```

### SCORM Attempt

```typescript
interface ScormAttempt extends AuditFields {
  _id: ObjectId;
  attemptId: string; // Unique identifier
  learner: ObjectId;
  package: ObjectId;
  contentAttempt: ObjectId; // Back-reference
  
  // Attempt info
  attemptNumber: number;
  startedAt: ISODate;
  lastAccessedAt: ISODate;
  completedAt?: ISODate;
  
  // Status
  status: AttemptStatus;
  
  // CMI Data Model (SCORM 1.2 & 2004)
  cmi: {
    // Core
    learner_id?: string;
    learner_name?: string;
    lesson_location?: string;
    lesson_status?: 'passed' | 'completed' | 'failed' | 'incomplete' | 'browsed' | 'not attempted';
    entry?: 'ab-initio' | 'resume' | '';
    exit?: 'timeout' | 'suspend' | 'logout' | '';
    credit?: 'credit' | 'no-credit';
    mode?: 'browse' | 'normal' | 'review';
    
    // SCORM 2004
    completion_status?: 'completed' | 'incomplete' | 'not attempted' | 'unknown';
    success_status?: 'passed' | 'failed' | 'unknown';
    location?: string;
    
    // Score
    score?: {
      raw?: number;
      min?: number;
      max?: number;
      scaled?: number; // -1 to 1
    };
    
    // Time
    session_time?: string; // ISO 8601 duration
    total_time?: string;
    
    // Suspend data
    suspend_data?: string;
    
    // Learner preferences
    learner_preference?: {
      audio_level?: number;
      language?: string;
      delivery_speed?: number;
      audio_captioning?: number;
    };
    
    // Objectives
    objectives?: ScormObjective[];
    
    // Interactions
    interactions?: ScormInteraction[];
  };
}

interface ScormObjective {
  id: string;
  score?: {
    raw?: number;
    min?: number;
    max?: number;
    scaled?: number;
  };
  success_status?: 'passed' | 'failed' | 'unknown';
  completion_status?: 'completed' | 'incomplete' | 'not attempted' | 'unknown';
  description?: string;
  progress_measure?: number;
}

interface ScormInteraction {
  id: string;
  type: 'true-false' | 'choice' | 'fill-in' | 'long-fill-in' | 'matching' | 'performance' | 'sequencing' | 'likert' | 'numeric' | 'other';
  objectives?: string[];
  timestamp?: ISODate;
  correct_responses?: string[];
  weighting?: number;
  learner_response?: string;
  result?: 'correct' | 'incorrect' | 'unanticipated' | 'neutral';
  latency?: string; // ISO 8601 duration
  description?: string;
}
```

### Exam Result

```typescript
interface ExamResult extends AuditFields {
  _id: ObjectId;
  learner: ObjectId;
  learnerData?: Learner; // Populated
  exercise: ObjectId; // Exercise._id
  exerciseData?: Exercise; // Populated
  contentAttempt?: ObjectId; // Link to ContentAttempt
  
  // Attempt info
  attemptNumber: number;
  startedAt: ISODate;
  submittedAt: ISODate;
  
  // Scoring
  score: number; // Points earned
  maxScore: number; // Total points possible
  percentage: number; // 0-100
  grade?: string; // A, B, C, etc.
  passed: boolean;
  passMark: number;
  
  // Status
  status: 'passed' | 'failed';
  remarks?: 'Excellent!' | 'Very Good' | 'Good' | 'Fair' | 'Needs Improvement';
  
  // Answers
  answers: QuestionAnswer[];
  
  // Context
  subProgram?: ObjectId;
  academicTerm?: ObjectId;
  academicYear?: ObjectId;
  
  // Publishing
  isPublished: boolean;
  publishedAt?: ISODate;
  
  // Feedback
  instructorFeedback?: string;
  gradedBy?: ObjectId;
  gradedAt?: ISODate;
}

interface QuestionAnswer {
  questionId: ObjectId;
  questionText?: string;
  answer: string | string[]; // Depends on question type
  isCorrect?: boolean;
  pointsAwarded?: number;
  pointsPossible?: number;
  feedback?: string;
  timeSpent?: number; // Seconds
}
```

### Progress Summary

```typescript
// Program progress
interface ProgramProgress {
  programId: ObjectId;
  programData?: Program;
  enrollmentId: ObjectId;
  status: EnrollmentStatus;
  
  // Completion
  completionPercent: number; // 0-100
  coursesCompleted: number;
  coursesTotal: number;
  currentSubProgram?: SubProgram;
  
  // Goal
  credentialGoal: CredentialGoal;
  targetCredential?: Credential;
  
  // Dates
  enrolledAt: ISODate;
  estimatedCompletion?: ISODate;
  completedAt?: ISODate;
}

// Course progress
interface CourseProgress {
  courseId: ObjectId;
  courseData?: Course;
  enrollmentId: ObjectId;
  status: EnrollmentStatus;
  
  // Progress
  progress: number; // 0-100
  modulesCompleted: number;
  modulesTotal: number;
  
  // Performance
  currentScore?: number;
  passed?: boolean;
  
  // Time
  timeSpent: number; // Seconds
  lastAccessedAt?: ISODate;
  
  // Modules breakdown
  modules: ModuleProgress[];
  
  // Next up
  nextUp?: {
    moduleId: ObjectId;
    title: string;
    estimatedTime?: number;
  };
}

interface ModuleProgress {
  moduleId: ObjectId;
  title: string;
  contentType: ContentType;
  status: AttemptStatus;
  score?: number;
  attempts: number;
  completedAt?: ISODate;
  timeSpent?: number;
}

// Recent activity
interface RecentActivity {
  activityId: string;
  type: 'enrollment' | 'completion' | 'attempt' | 'assessment_submitted' | 'course_started';
  timestamp: ISODate;
  resource: {
    type: 'course' | 'module' | 'exercise' | 'program';
    id: ObjectId;
    title: string;
  };
  details?: {
    score?: number;
    timeSpent?: number;
    status?: string;
  };
}
```

### Learning Event

```typescript
// Fine-grained tracking events
interface LearningEvent extends AuditFields {
  _id: ObjectId;
  learner: ObjectId;
  contentAttempt?: ObjectId;
  
  // Event details
  eventType: 'page_view' | 'interaction' | 'bookmark' | 'note' | 'pause' | 'resume' | 'seek' | 'replay';
  timestamp: ISODate;
  
  // Context
  resource: {
    type: ContentType;
    id: ObjectId;
  };
  
  // Metadata
  metadata?: {
    pageNumber?: number;
    videoTimestamp?: number;
    interactionId?: string;
    noteText?: string;
    bookmarkLocation?: string;
    [key: string]: any;
  };
  
  // Session
  sessionId?: string;
}
```

---

## Analytics & Reporting

### Analytics Data

```typescript
// Program analytics
interface ProgramAnalytics {
  programId: ObjectId;
  programName: string;
  timeWindow: {
    weeks: number;
    startDate: ISODate;
    endDate: ISODate;
  };
  
  // Completion
  completionRate: number; // 0-1
  abandonmentRate: number; // 0-1
  activeLearners: number;
  
  // Trends
  weeklyEnrollments: number[];
  weeklyCompletions: number[];
  
  // Performance
  averageScore?: number;
  medianScore?: number;
  passRate?: number;
}

// Course analytics
interface CourseAnalytics {
  courseId: ObjectId;
  courseName: string;
  
  // Enrollment
  totalEnrolled: number;
  activeEnrollments: number;
  
  // Completion
  completed: number;
  inProgress: number;
  notStarted: number;
  completionRate: number; // 0-1
  averageCompletionTime: number; // Seconds
  
  // Performance
  averageScore?: number;
  passRate?: number;
  scoreDistribution?: Record<string, number>; // Grade ranges
  
  // Engagement
  averageTimeSpent: number;
  dailyActiveUsers: number[];
  weeklyActiveUsers: number[];
}

// Module analytics
interface ModuleAnalytics {
  moduleId: ObjectId;
  title: string;
  contentType: ContentType;
  
  // Completion
  completionRate: number; // 0-1
  averageAttempts: number;
  
  // Performance
  averageScore: number;
  passRate?: number;
  
  // Time
  averageTimeSpent: number;
  medianTimeSpent: number;
  
  // Difficulty indicator
  difficultyScore?: number; // Based on attempts, time, scores
}

// Content analytics
interface ContentAnalytics {
  contentId: ObjectId;
  contentType: ContentType;
  title: string;
  
  // Usage
  totalAttempts: number;
  uniqueLearners: number;
  completionRate: number;
  
  // Performance
  averageScore?: number;
  scoreDistribution?: Record<string, number>;
  
  // Time
  averageTimeSpent: number;
  medianTimeSpent: number;
  timeDistribution: TimeDistribution;
  
  // Engagement pattern
  engagementPattern?: 'front_loaded' | 'consistent' | 'procrastinated' | 'sporadic';
}

interface TimeDistribution {
  min: number;
  max: number;
  quartiles: [number, number, number]; // Q1, Q2 (median), Q3
  outliers?: number[];
}

// Department analytics
interface DepartmentAnalytics {
  departmentId: ObjectId;
  name: string;
  
  staff: {
    total: number;
    byRole: Record<StaffRole, number>;
    activeInstructors: number;
  };
  
  courses: {
    total: number;
    published: number;
    draft: number;
    archived: number;
  };
  
  enrollments: {
    active: number;
    completed: number;
    withdrawn: number;
    completionRate: number;
  };
  
  progress: {
    averageCompletion: number; // 0-1
    averageScore: number;
  };
  
  trends?: {
    enrollmentTrend: number[]; // Weekly
    completionTrend: number[];
  };
}

// Institution-wide analytics
interface InstitutionAnalytics {
  departments: number;
  programs: number;
  courses: number;
  
  users: {
    totalLearners: number;
    activeLearners: number;
    totalStaff: number;
  };
  
  enrollments: {
    total: number;
    active: number;
    completionRate: number;
  };
  
  performance: {
    averageScore: number;
    passRate: number;
  };
  
  topPrograms: Array<{
    programId: ObjectId;
    name: string;
    enrollmentCount: number;
    completionRate: number;
  }>;
  
  trendsOverTime?: {
    monthly: MonthlyTrend[];
  };
}

interface MonthlyTrend {
  month: string; // "2026-01"
  enrollments: number;
  completions: number;
  activeUsers: number;
}
```

### Report Templates

```typescript
// Completion report
interface CompletionReport {
  reportId: string;
  generatedAt: ISODate;
  generatedBy: ObjectId;
  
  filters: {
    department?: ObjectId;
    program?: ObjectId;
    course?: ObjectId;
    dateRange: {
      from: ISODate;
      to: ISODate;
    };
  };
  
  summary: {
    totalEnrollments: number;
    completions: number;
    completionRate: number;
    averageTime: number;
  };
  
  details: CompletionReportEntry[];
  
  format: 'json' | 'csv' | 'pdf';
  downloadUrl?: string;
}

interface CompletionReportEntry {
  learnerId: ObjectId;
  learnerName: string;
  course: string;
  enrolledAt: ISODate;
  completedAt?: ISODate;
  status: EnrollmentStatus;
  progress: number;
  score?: number;
  timeSpent: number;
}

// Performance report
interface PerformanceReport {
  reportId: string;
  generatedAt: ISODate;
  
  filters: {
    learner?: ObjectId;
    course?: ObjectId;
    program?: ObjectId;
    department?: ObjectId;
    groupBy: 'learner' | 'course' | 'department';
  };
  
  summary: {
    averageScore: number;
    medianScore: number;
    passRate: number;
    totalAssessments: number;
  };
  
  scoreDistribution: Record<string, number>;
  topPerformers: PerformerEntry[];
  needsAttention: PerformerEntry[];
  
  details: PerformanceReportEntry[];
}

interface PerformerEntry {
  learnerId: ObjectId;
  name: string;
  averageScore: number;
  completionRate: number;
}

interface PerformanceReportEntry {
  learnerId: ObjectId;
  learnerName: string;
  course: string;
  assessmentType: string;
  score: number;
  passed: boolean;
  attemptedAt: ISODate;
}

// Transcript
interface Transcript {
  learnerId: ObjectId;
  learnerData: Learner;
  generatedAt: ISODate;
  
  programs: TranscriptProgram[];
  
  overallGPA?: number;
  totalCredits?: number;
  credentialsEarned: Credential[];
}

interface TranscriptProgram {
  program: Program;
  enrolledAt: ISODate;
  completedAt?: ISODate;
  status: EnrollmentStatus;
  gpa?: number;
  courses: TranscriptCourse[];
}

interface TranscriptCourse {
  course: Course;
  enrolledAt: ISODate;
  completedAt?: ISODate;
  grade: string;
  score: number;
  credits?: number;
  status: EnrollmentStatus;
}
```

### Activity Feed

```typescript
// Activity stream
interface ActivityEntry {
  activityId: string;
  type: 'enrollment' | 'completion' | 'assessment_submitted' | 'attempt_started' | 'course_started' | 'achievement_earned';
  timestamp: ISODate;
  
  // Actor (for staff views)
  actor?: {
    id: ObjectId;
    name: string;
    role: 'staff' | 'learner';
  };
  
  // Resource
  resource: {
    type: 'course' | 'module' | 'exercise' | 'program' | 'class';
    id: ObjectId;
    title: string;
  };
  
  // Details
  details?: {
    score?: number;
    timeSpent?: number;
    status?: string;
    grade?: string;
    [key: string]: any;
  };
  
  // Context
  context?: {
    courseId?: ObjectId;
    programId?: ObjectId;
    classId?: ObjectId;
  };
}

// Activity feed response
interface ActivityFeed {
  activities: ActivityEntry[];
  meta: PaginationMeta;
  filters?: {
    type?: string[];
    since?: ISODate;
    until?: ISODate;
  };
}
```

---

## System & Configuration

### Permissions

```typescript
interface Permission {
  _id: ObjectId;
  name: string;
  code: string;
  description?: string;
  resource: string; // 'course', 'enrollment', 'user', etc.
  actions: PermissionAction[];
  scope: 'global' | 'department' | 'own';
}

enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  PUBLISH = 'publish',
  GRADE = 'grade',
  ENROLL = 'enroll'
}

interface RolePermissions {
  role: StaffRole;
  permissions: Permission[];
}
```

### Settings

```typescript
interface SystemSettings {
  _id: ObjectId;
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  scope: 'system' | 'department' | 'user';
  departmentId?: ObjectId;
  userId?: ObjectId;
  description?: string;
  isPublic: boolean;
  updatedAt: ISODate;
  updatedBy?: ObjectId;
}

// Common settings
interface LMSSettings {
  institution: {
    name: string;
    code: string;
    logo: string;
    timezone: string;
    locale: string;
  };
  
  enrollment: {
    allowSelfEnrollment: boolean;
    requireApproval: boolean;
    maxConcurrentCourses?: number;
  };
  
  grading: {
    passingScore: number;
    gradingScale: GradeScale[];
  };
  
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
  };
  
  security: {
    sessionTimeout: number; // Minutes
    passwordPolicy: PasswordPolicy;
    twoFactorRequired: boolean;
  };
}

interface GradeScale {
  grade: string;
  minScore: number;
  maxScore: number;
}

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expiryDays?: number;
}
```

### System Health

```typescript
interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: ISODate;
  uptime: number; // Seconds
  
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    storage: ServiceStatus;
    email: ServiceStatus;
  };
  
  metrics: SystemMetrics;
}

interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number; // Milliseconds
  lastChecked: ISODate;
  error?: string;
}

interface SystemMetrics {
  requests: {
    total: number;
    perMinute: number;
    perHour: number;
  };
  
  database: {
    connections: number;
    maxConnections: number;
    avgLatency: number; // Milliseconds
  };
  
  storage: {
    usedBytes: number;
    usedMB: number;
    usedGB: number;
    totalGB?: number;
  };
  
  memory: {
    used: number; // Bytes
    total: number;
    percentage: number;
  };
  
  errors: {
    count: number;
    rate: number; // Per minute
    recentErrors: ErrorEntry[];
  };
  
  scorm?: {
    activeSessions: number;
    totalPackages: number;
    storageUsageMB: number;
  };
}

interface ErrorEntry {
  timestamp: ISODate;
  type: string;
  message: string;
  stack?: string;
}
```

---

## Export Types

```typescript
// Re-export all types for easy consumption
export type {
  // Common
  ObjectId,
  ISODate,
  Status,
  PaginationMeta,
  ApiResponse,
  ValidationError,
  AuditFields,
  SoftDeletable,
  
  // Enums
  EnrollmentStatus,
  ContentType,
  AttemptStatus,
  ScoreCalculationMethod,
  CredentialGoal,
  StaffRole,
  LearnerStatus,
  PermissionAction,
  
  // Users
  User,
  Staff,
  Learner,
  DepartmentMembership,
  Address,
  EmergencyContact,
  GuardianInfo,
  CurrentUserProfile,
  UserPreferences,
  
  // Organization
  Department,
  DepartmentHierarchy,
  DepartmentStats,
  
  // Academic
  Program,
  SubProgram,
  AcademicYear,
  AcademicTerm,
  YearGroup,
  Credential,
  Course,
  CourseModule,
  UnlockCondition,
  Class,
  ClassSchedule,
  
  // Content
  ScormPackage,
  ScormMetadata,
  Exercise,
  Question,
  QuestionOption,
  Media,
  CourseTemplate,
  
  // Enrollment
  ProgramEnrollment,
  StatusHistoryEntry,
  CourseEnrollment,
  ClassEnrollment,
  AttendanceRecord,
  
  // Progress & Attempts
  ContentAttempt,
  ScormAttempt,
  ScormObjective,
  ScormInteraction,
  ExamResult,
  QuestionAnswer,
  ProgramProgress,
  CourseProgress,
  ModuleProgress,
  RecentActivity,
  LearningEvent,
  
  // Analytics
  ProgramAnalytics,
  CourseAnalytics,
  ModuleAnalytics,
  ContentAnalytics,
  TimeDistribution,
  DepartmentAnalytics,
  InstitutionAnalytics,
  MonthlyTrend,
  
  // Reports
  CompletionReport,
  CompletionReportEntry,
  PerformanceReport,
  PerformerEntry,
  PerformanceReportEntry,
  Transcript,
  TranscriptProgram,
  TranscriptCourse,
  
  // Activity
  ActivityEntry,
  ActivityFeed,
  
  // System
  Permission,
  RolePermissions,
  SystemSettings,
  LMSSettings,
  GradeScale,
  PasswordPolicy,
  SystemHealth,
  ServiceStatus,
  SystemMetrics,
  ErrorEntry
};
```

---

## Usage Examples

### Creating a Course with Modules

```typescript
const newCourse: Partial<Course> = {
  title: "Introduction to Calculus",
  code: "MATH-101",
  description: "Fundamental concepts of differential and integral calculus",
  program: programId,
  subProgram: level1Id,
  department: mathDeptId,
  credits: 3,
  duration: 40, // hours
  passingScore: 70,
  maxAttempts: 3,
  scoreCalculationMethod: ScoreCalculationMethod.BEST_ATTEMPT,
  learningObjectives: [
    "Understand limits and continuity",
    "Master derivative rules",
    "Apply integration techniques"
  ],
  difficulty: 'intermediate'
};

const modules: Partial<CourseModule>[] = [
  {
    course: courseId,
    title: "Limits and Continuity",
    contentType: ContentType.SCORM,
    contentId: scormPackageId,
    sequence: 1,
    isRequired: true,
    weight: 0.3,
    estimatedTime: 120 // minutes
  },
  {
    course: courseId,
    title: "Derivatives Quiz",
    contentType: ContentType.QUIZ,
    contentId: quizId,
    sequence: 2,
    isRequired: true,
    weight: 0.3,
    passingScore: 75
  }
];
```

### Tracking Learning Progress

```typescript
// Start content
const attempt: Partial<ContentAttempt> = {
  learner: learnerId,
  courseModule: moduleId,
  contentType: ContentType.SCORM,
  contentId: scormPackageId,
  status: AttemptStatus.IN_PROGRESS,
  attemptNumber: 1,
  startedAt: new Date().toISOString(),
  lastAccessedAt: new Date().toISOString(),
  timeSpent: 0
};

// Update SCORM CMI data
const scormData: Partial<ScormAttempt> = {
  attemptId: `attempt-${uuidv4()}`,
  learner: learnerId,
  package: scormPackageId,
  contentAttempt: attemptId,
  attemptNumber: 1,
  status: AttemptStatus.IN_PROGRESS,
  cmi: {
    learner_id: learnerId,
    learner_name: "John Doe",
    lesson_status: 'incomplete',
    entry: 'ab-initio',
    score: {
      raw: 0,
      min: 0,
      max: 100
    },
    total_time: 'PT0H0M0S'
  }
};

// Complete module
const completedAttempt: Partial<ContentAttempt> = {
  status: AttemptStatus.COMPLETED,
  score: 85,
  passed: true,
  completedAt: new Date().toISOString(),
  timeSpent: 3600, // 1 hour
  progressPercent: 100
};
```

### Generating Analytics

```typescript
const courseAnalytics: CourseAnalytics = {
  courseId: 'course-123',
  courseName: 'Introduction to Calculus',
  totalEnrolled: 50,
  activeEnrollments: 45,
  completed: 35,
  inProgress: 12,
  notStarted: 3,
  completionRate: 0.7,
  averageCompletionTime: 14400, // 4 hours
  averageScore: 82.5,
  passRate: 0.88,
  scoreDistribution: {
    'A (90-100)': 15,
    'B (80-89)': 12,
    'C (70-79)': 8,
    'D (60-69)': 3,
    'F (0-59)': 2
  },
  averageTimeSpent: 12000,
  dailyActiveUsers: [12, 15, 18, 22, 20, 17, 15],
  weeklyActiveUsers: [45, 47, 50, 48]
};
```

---

## Design Notes

1. **Consistency**: All entities follow the same pattern with `AuditFields` and optional `SoftDeletable`
2. **Flexibility**: Use of `Partial<T>` for creation, optional fields for updates
3. **Type Safety**: Strict enums for status values, content types, etc.
4. **Relationships**: Reference fields (`ObjectId`) with optional populated data fields
5. **Extensibility**: `payload` and `metadata` fields allow custom data without schema changes
6. **SCORM Compliance**: Full CMI data model support for SCORM 1.2 and 2004
7. **Analytics**: Computed types separate from operational data
8. **API Alignment**: Types map directly to Ideal API endpoints and responses

This structure provides a solid foundation for building a type-safe, scalable LMS application.
