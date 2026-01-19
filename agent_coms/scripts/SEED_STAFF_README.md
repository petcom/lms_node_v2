# Staff and Courses Seed Script

## Overview

This seed script creates a complete test environment with staff members, departments, courses, course modules (segments), and questions.

## What Gets Created

### 1. Departments (2)

1. **Clinical Psychology** (`CLINPSY`)
   - Clinical psychology practices and therapeutic interventions
   - ID: `000000000000d00000000101`

2. **Behavioral Science** (`BEHSCI`)
   - Behavioral analysis and intervention strategies
   - ID: `000000000000d00000000102`

### 2. Staff Members (2)

#### Staff Member 1: Dr. Emily Carter
- **Email:** `emily.carter@lms.edu`
- **Password:** `StaffPass123!`
- **Title:** Clinical Psychology Director
- **Department Memberships:**
  - **Clinical Psychology** (Primary): `content-admin`, `department-admin`
  - **Behavioral Science**: `instructor`
- **User ID:** `000000000000u00000000201`

#### Staff Member 2: Dr. Michael Rodriguez
- **Email:** `michael.rodriguez@lms.edu`
- **Password:** `StaffPass123!`
- **Title:** Behavioral Science Director
- **Department Memberships:**
  - **Behavioral Science** (Primary): `content-admin`, `department-admin`
  - **Clinical Psychology**: `instructor`
- **User ID:** `000000000000u00000000202`

### 3. Courses (4)

#### Course 1: Introduction to Clinical Psychology
- **Code:** `CLINPSY101`
- **Department:** Clinical Psychology
- **Credits:** 3
- **Modules:** 3
  1. Foundations of Clinical Assessment (5-8 questions)
  2. Therapeutic Relationships (5-8 questions)
  3. Evidence-Based Interventions (5-8 questions)

#### Course 2: Advanced Behavioral Interventions
- **Code:** `BEHSCI301`
- **Department:** Behavioral Science
- **Credits:** 4
- **Modules:** 4
  1. Functional Behavior Assessment (5-8 questions)
  2. Intervention Design (5-8 questions)
  3. Data Collection Methods (5-8 questions)
  4. Ethical Considerations (5-8 questions)

#### Course 3: Cognitive Behavioral Therapy
- **Code:** `CLINPSY201`
- **Department:** Clinical Psychology
- **Credits:** 3
- **Prerequisites:** CLINPSY101
- **Modules:** 3
  1. CBT Theory and Models (5-8 questions)
  2. CBT Techniques (5-8 questions)
  3. Case Formulation (5-8 questions)

#### Course 4: Applied Behavior Analysis
- **Code:** `BEHSCI201`
- **Department:** Behavioral Science
- **Credits:** 4
- **Prerequisites:** BEHSCI301
- **Modules:** 4
  1. ABA Principles (5-8 questions)
  2. Reinforcement and Punishment (5-8 questions)
  3. Skill Acquisition (5-8 questions)
  4. Generalization and Maintenance (5-8 questions)

### 4. Course Modules (Content Items)

Each course module is a quiz-type content item with:
- **Type:** `quiz`
- **Passing Score:** 70%
- **Time Limit:** 30 minutes (1800 seconds)
- **Settings:** Randomized questions, show correct answers after submission
- **Questions:** 5-8 questions per module

### 5. Questions

Each module contains 5-8 questions randomly distributed across:

**Question Types:**
- Multiple Choice (2 points each)
- True/False (1 point each)
- Short Answer (3 points each)

**Difficulty Levels:**
- Easy
- Medium
- Hard

**Total Questions:** Approximately 40-55 questions across all courses

## Usage

### Running the Seed Script

```bash
# From the lms_node/1_LMS_Node_V2 directory
npm run seed:staff
```

### Environment Variables

The script uses the following database connection (in order of precedence):
1. `DB_URI` environment variable
2. `MONGODB_URI` environment variable
3. Default: `mongodb://localhost:27017/lms_v2_dev`

### Custom Database Connection

```bash
# Seed to a specific database
DB_URI=mongodb://localhost:27017/lms_v2_custom npm run seed:staff

# Or using MONGODB_URI
MONGODB_URI=mongodb://localhost:27017/lms_v2_test npm run seed:staff
```

## Data Structure

### ObjectId Prefixes

The script uses predictable ObjectIds for easier testing and debugging:

- **Users:** `000000000000u0XXXXXXXXXX`
- **Staff:** `000000000000s0XXXXXXXXXX`
- **Departments:** `000000000000d0XXXXXXXXXX`
- **Courses:** `000000000000c0XXXXXXXXXX`
- **Content:** `000000000000n0XXXXXXXXXX`
- **CourseContent:** `000000000000ccXXXXXXXXXX`
- **Questions:** `000000000000q0XXXXXXXXXX`

### Database Collections Modified

The script creates/inserts data into:
- `users` (2 documents)
- `staff` (2 documents)
- `departments` (2 documents)
- `courses` (4 documents)
- `contents` (14 documents - course modules)
- `coursecontents` (14 documents - course-module links)
- `questions` (40-55 documents)

## Cross-Department Roles

The script demonstrates the cross-department role configuration:

### Staff Member 1 (Dr. Emily Carter)
```
Clinical Psychology:
  ├── content-admin ✓
  ├── department-admin ✓
  └── PRIMARY

Behavioral Science:
  └── instructor ✓
```

### Staff Member 2 (Dr. Michael Rodriguez)
```
Behavioral Science:
  ├── content-admin ✓
  ├── department-admin ✓
  └── PRIMARY

Clinical Psychology:
  └── instructor ✓
```

## Testing the Seed Data

### Login Credentials

```javascript
// Staff Member 1
{
  email: 'emily.carter@lms.edu',
  password: 'StaffPass123!'
}

// Staff Member 2
{
  email: 'michael.rodriguez@lms.edu',
  password: 'StaffPass123!'
}
```

### Verification Queries

```javascript
// Find all departments
db.departments.find({ code: { $in: ['CLINPSY', 'BEHSCI'] } })

// Find all staff with cross-department roles
db.staff.find({ 'departmentMemberships.1': { $exists: true } })

// Find all courses with modules
db.coursecontents.aggregate([
  { $group: { _id: '$courseId', moduleCount: { $sum: 1 } } }
])

// Find questions by department
db.questions.find({ departmentId: ObjectId('000000000000d00000000101') })
```

## Cleanup

To remove the seeded data, you can use MongoDB commands:

```javascript
// Delete by ObjectId prefix pattern
db.users.deleteMany({ _id: { $gte: ObjectId('000000000000u00000000201'), $lte: ObjectId('000000000000u00000000299') } })
db.staff.deleteMany({ _id: { $gte: ObjectId('000000000000u00000000201'), $lte: ObjectId('000000000000u00000000299') } })
db.departments.deleteMany({ _id: { $gte: ObjectId('000000000000d00000000101'), $lte: ObjectId('000000000000d00000000199') } })
db.courses.deleteMany({ _id: { $gte: ObjectId('000000000000c00000000301'), $lte: ObjectId('000000000000c00000000399') } })
db.contents.deleteMany({ _id: { $gte: ObjectId('000000000000n00000000100'), $lte: ObjectId('000000000000n00000000999') } })
db.coursecontents.deleteMany({ _id: { $gte: ObjectId('000000000000cc0000000100'), $lte: ObjectId('000000000000cc0000000999') } })
db.questions.deleteMany({ _id: { $gte: ObjectId('000000000000q00000000100'), $lte: ObjectId('000000000000q00000009999') } })
```

## Script Output

The script provides detailed output showing:
1. Database connection confirmation
2. Number of departments created
3. Staff members created with role details
4. Courses created with module counts
5. Complete statistics summary
6. Login credentials for testing

Example output:
```
🌱 Starting database seeding...

✓ Connected to database: mongodb://localhost:27017/lms_v2_dev

📁 Creating departments...
✓ Created 2 departments

👥 Creating staff members...
✓ Created 2 staff members
  - Emily Carter: Content-Admin & Dept-Admin of Clinical Psychology, Instructor of Behavioral Science
  - Michael Rodriguez: Content-Admin & Dept-Admin of Behavioral Science, Instructor of Clinical Psychology

📚 Creating courses with segments...
✓ Created 4 courses
✓ Created 14 content items (course modules)
✓ Created 14 course-content links
✓ Created 47 questions

============================================================
📊 SEED DATA SUMMARY
============================================================

👥 STAFF MEMBERS:
  • Emily Carter (Clinical Psychology Director)
    Email: emily.carter@lms.edu
    Password: StaffPass123!
    Department Memberships:
      - Clinical Psychology: content-admin, department-admin (Primary)
      - Behavioral Science: instructor

  • Michael Rodriguez (Behavioral Science Director)
    Email: michael.rodriguez@lms.edu
    Password: StaffPass123!
    Department Memberships:
      - Behavioral Science: content-admin, department-admin (Primary)
      - Clinical Psychology: instructor

📁 DEPARTMENTS:
  • Clinical Psychology (CLINPSY) - 2 courses
  • Behavioral Science (BEHSCI) - 2 courses

📚 COURSES WITH MODULES:
  • Introduction to Clinical Psychology (CLINPSY101)
    - 3 modules, ~21 questions
      1. Foundations of Clinical Assessment
      2. Therapeutic Relationships
      3. Evidence-Based Interventions

  • Advanced Behavioral Interventions (BEHSCI301)
    - 4 modules, ~28 questions
      1. Functional Behavior Assessment
      2. Intervention Design
      3. Data Collection Methods
      4. Ethical Considerations

  • Cognitive Behavioral Therapy (CLINPSY201)
    - 3 modules, ~21 questions
      1. CBT Theory and Models
      2. CBT Techniques
      3. Case Formulation

  • Applied Behavior Analysis (BEHSCI201)
    - 4 modules, ~28 questions
      1. ABA Principles
      2. Reinforcement and Punishment
      3. Skill Acquisition
      4. Generalization and Maintenance

📊 STATISTICS:
  • Departments: 2
  • Staff Members: 2
  • Courses: 4
  • Course Modules: 14
  • Questions: 47

✅ Database seeding completed successfully!
============================================================

✓ Database connection closed
```

## Notes

- All users are created with `isActive: true` and `emailVerified: true`
- Staff members can be used immediately for testing without email verification
- The script is idempotent-safe but will create duplicates if run multiple times (use cleanup first)
- Questions are tagged with module topic, question type, and difficulty for easy filtering
- All quiz content has a 30-minute time limit and 70% passing score
- Course prerequisites are properly set (CLINPSY201 requires CLINPSY101, etc.)

## Troubleshooting

### Connection Issues
```bash
# Ensure MongoDB is running
sudo systemctl status mongod

# Or start it
sudo systemctl start mongod
```

### Permission Issues
```bash
# Ensure you have write permissions to the database
# Check MongoDB authentication settings if needed
```

### Duplicate Key Errors
If you get duplicate key errors, the data already exists. Clean up first:
```bash
# Use the cleanup queries above or drop the affected collections
```

## Integration with Main Seed Script

This script is independent from the main `seed-mock-data.ts` script and can be run:
- Standalone on an empty database
- After the main seed script to add more data
- On any existing database (will add to existing data)

The ObjectId prefixes (101, 102, 201, 202, etc.) are chosen to avoid conflicts with the main seed script's data.
