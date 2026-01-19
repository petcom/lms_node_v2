/**
 * Seed Staff and Courses Script
 *
 * Creates:
 * - 2 Departments
 * - 2 Staff members with cross-department roles
 * - 4 Courses with course segments (modules) containing quiz content
 * - Questions for each course segment
 */

import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';

// Import models
import { User } from '../src/models/auth/User.model';
import { Staff } from '../src/models/auth/Staff.model';
import Department from '../src/models/organization/Department.model';
import Course from '../src/models/academic/Course.model';
import Content from '../src/models/content/Content.model';
import CourseContent from '../src/models/content/CourseContent.model';
import Question from '../src/models/assessment/Question.model';

// Database connection
const DB_URI = process.env.DB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_v2_dev';

/**
 * Helper function to generate predictable ObjectIds with distinctive pattern
 * All IDs start with 'feedface' for easy identification and purging
 * Format: feedface (8 hex) + type (2 hex) + number (6 hex) + padding (8 hex) = 24 chars
 */
const mockId = (typeCode: number, num: number): mongoose.Types.ObjectId => {
  const typeHex = typeCode.toString(16).padStart(2, '0');
  const numHex = num.toString(16).padStart(6, '0');
  const hex = `feedface${typeHex}${numHex}00000000`;
  return new mongoose.Types.ObjectId(hex);
};

// Type codes for different entity types (single byte for easy identification)
const TYPE_CODES = {
  USER: 0x01,
  STAFF: 0x02,
  DEPARTMENT: 0x03,
  COURSE: 0x04,
  CONTENT: 0x05,
  COURSE_CONTENT: 0x06,
  QUESTION: 0x07,
};

// Data storage
const seedData = {
  users: [] as any[],
  staff: [] as any[],
  departments: [] as any[],
  courses: [] as any[],
  content: [] as any[],
  courseContent: [] as any[],
  questions: [] as any[],
};

async function connectDB() {
  try {
    await mongoose.connect(DB_URI);
    console.log(`✓ Connected to database: ${DB_URI}`);
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    process.exit(1);
  }
}

async function createDepartments() {
  console.log('\n📁 Creating departments...');

  // Department 1: Clinical Psychology
  const dept1 = await Department.create({
    _id: mockId(TYPE_CODES.DEPARTMENT, 101),
    name: 'Clinical Psychology',
    code: 'CLINPSY',
    description: 'Clinical psychology practices and therapeutic interventions',
    status: 'active',
    settings: {
      allowCourseCreation: true,
      allowEnrollment: true,
      requireApproval: false,
    },
  });
  seedData.departments.push(dept1);

  // Department 2: Behavioral Science
  const dept2 = await Department.create({
    _id: mockId(TYPE_CODES.DEPARTMENT, 102),
    name: 'Behavioral Science',
    code: 'BEHSCI',
    description: 'Behavioral analysis and intervention strategies',
    status: 'active',
    settings: {
      allowCourseCreation: true,
      allowEnrollment: true,
      requireApproval: false,
    },
  });
  seedData.departments.push(dept2);

  console.log(`✓ Created ${seedData.departments.length} departments`);
}

async function createStaffMembers() {
  console.log('\n👥 Creating staff members...');

  const hashedPassword = await bcrypt.hash('StaffPass123!', 10);

  // Staff Member 1: Dr. Emily Carter
  // - Content Admin + Department Admin for Clinical Psychology (Dept 1)
  // - Instructor for Behavioral Science (Dept 2)
  const user1 = await User.create({
    _id: mockId(TYPE_CODES.USER, 201),
    email: 'emily.carter@lms.edu',
    password: hashedPassword,
    roles: ['instructor', 'content-admin', 'department-admin'],
    isActive: true,
  });
  seedData.users.push(user1);

  const staff1 = await Staff.create({
    _id: user1._id,
    firstName: 'Emily',
    lastName: 'Carter',
    phoneNumber: '+1-555-0101',
    title: 'Clinical Psychology Director',
    departmentMemberships: [
      {
        departmentId: seedData.departments[0]._id, // Clinical Psychology
        roles: ['content-admin', 'department-admin'],
        isPrimary: true,
      },
      {
        departmentId: seedData.departments[1]._id, // Behavioral Science
        roles: ['instructor'],
        isPrimary: false,
      },
    ],
    isActive: true,
  });
  seedData.staff.push(staff1);

  // Staff Member 2: Dr. Michael Rodriguez
  // - Content Admin + Department Admin for Behavioral Science (Dept 2)
  // - Instructor for Clinical Psychology (Dept 1)
  const user2 = await User.create({
    _id: mockId(TYPE_CODES.USER, 202),
    email: 'michael.rodriguez@lms.edu',
    password: hashedPassword,
    roles: ['instructor', 'content-admin', 'department-admin'],
    isActive: true,
  });
  seedData.users.push(user2);

  const staff2 = await Staff.create({
    _id: user2._id,
    firstName: 'Michael',
    lastName: 'Rodriguez',
    phoneNumber: '+1-555-0102',
    title: 'Behavioral Science Director',
    departmentMemberships: [
      {
        departmentId: seedData.departments[1]._id, // Behavioral Science
        roles: ['content-admin', 'department-admin'],
        isPrimary: true,
      },
      {
        departmentId: seedData.departments[0]._id, // Clinical Psychology
        roles: ['instructor'],
        isPrimary: false,
      },
    ],
    isActive: true,
  });
  seedData.staff.push(staff2);

  console.log(`✓ Created ${seedData.staff.length} staff members`);
  console.log(`  - ${staff1.firstName} ${staff1.lastName}: Content-Admin & Dept-Admin of ${seedData.departments[0].name}, Instructor of ${seedData.departments[1].name}`);
  console.log(`  - ${staff2.firstName} ${staff2.lastName}: Content-Admin & Dept-Admin of ${seedData.departments[1].name}, Instructor of ${seedData.departments[0].name}`);
}

async function createCoursesWithSegments() {
  console.log('\n📚 Creating courses with segments...');

  const dept1 = seedData.departments[0];
  const dept2 = seedData.departments[1];
  const staff1 = seedData.staff[0];
  const staff2 = seedData.staff[1];

  // Course 1: Introduction to Clinical Psychology (Dept 1)
  const course1 = await Course.create({
    _id: mockId(TYPE_CODES.COURSE, 301),
    name: 'Introduction to Clinical Psychology',
    code: 'CLINPSY101',
    description: 'Fundamental concepts and practices in clinical psychology',
    departmentId: dept1._id,
    credits: 3,
    prerequisites: [],
    isActive: true,
  });
  seedData.courses.push(course1);

  // Create 3 modules for Course 1
  await createModulesForCourse(course1, dept1, staff1, [
    { title: 'Foundations of Clinical Assessment', description: 'Learn the basics of psychological assessment and diagnosis' },
    { title: 'Therapeutic Relationships', description: 'Building effective therapeutic relationships with clients' },
    { title: 'Evidence-Based Interventions', description: 'Introduction to empirically supported treatment approaches' },
  ]);

  // Course 2: Advanced Behavioral Interventions (Dept 2)
  const course2 = await Course.create({
    _id: mockId(TYPE_CODES.COURSE, 302),
    name: 'Advanced Behavioral Interventions',
    code: 'BEHSCI301',
    description: 'Advanced techniques in applied behavior analysis and intervention',
    departmentId: dept2._id,
    credits: 4,
    prerequisites: [],
    isActive: true,
  });
  seedData.courses.push(course2);

  // Create 4 modules for Course 2
  await createModulesForCourse(course2, dept2, staff2, [
    { title: 'Functional Behavior Assessment', description: 'Techniques for identifying behavioral functions' },
    { title: 'Intervention Design', description: 'Creating effective behavior intervention plans' },
    { title: 'Data Collection Methods', description: 'Systematic data collection and analysis' },
    { title: 'Ethical Considerations', description: 'Ethics in behavioral science practice' },
  ]);

  // Course 3: Cognitive Behavioral Therapy (Dept 1)
  const course3 = await Course.create({
    _id: mockId(TYPE_CODES.COURSE, 303),
    name: 'Cognitive Behavioral Therapy',
    code: 'CLINPSY201',
    description: 'Core principles and techniques of CBT for various disorders',
    departmentId: dept1._id,
    credits: 3,
    prerequisites: [course1._id],
    isActive: true,
  });
  seedData.courses.push(course3);

  // Create 3 modules for Course 3
  await createModulesForCourse(course3, dept1, staff2, [
    { title: 'CBT Theory and Models', description: 'Understanding cognitive-behavioral models of psychopathology' },
    { title: 'CBT Techniques', description: 'Cognitive restructuring, behavioral activation, and exposure therapy' },
    { title: 'Case Formulation', description: 'Developing comprehensive CBT case conceptualizations' },
  ]);

  // Course 4: Applied Behavior Analysis (Dept 2)
  const course4 = await Course.create({
    _id: mockId(TYPE_CODES.COURSE, 304),
    name: 'Applied Behavior Analysis',
    code: 'BEHSCI201',
    description: 'Principles of ABA and applications across settings',
    departmentId: dept2._id,
    credits: 4,
    prerequisites: [course2._id],
    isActive: true,
  });
  seedData.courses.push(course4);

  // Create 4 modules for Course 4
  await createModulesForCourse(course4, dept2, staff1, [
    { title: 'ABA Principles', description: 'Fundamental principles of applied behavior analysis' },
    { title: 'Reinforcement and Punishment', description: 'Understanding consequences in behavior change' },
    { title: 'Skill Acquisition', description: 'Teaching new behaviors and skills' },
    { title: 'Generalization and Maintenance', description: 'Promoting lasting behavior change' },
  ]);

  console.log(`✓ Created ${seedData.courses.length} courses`);
  console.log(`✓ Created ${seedData.content.length} content items (course modules)`);
  console.log(`✓ Created ${seedData.courseContent.length} course-content links`);
  console.log(`✓ Created ${seedData.questions.length} questions`);
}

async function createModulesForCourse(
  course: any,
  department: any,
  instructor: any,
  modules: { title: string; description: string }[]
) {
  const courseIndex = seedData.courses.length;

  for (let i = 0; i < modules.length; i++) {
    const moduleData = modules[i];
    const moduleNumber = i + 1;
    const contentIdNum = courseIndex * 100 + moduleNumber;

    // Create quiz content for this module
    const content = await Content.create({
      _id: mockId(TYPE_CODES.CONTENT, contentIdNum),
      title: moduleData.title,
      description: moduleData.description,
      type: 'quiz',
      quizData: {
        passingScore: 70,
        timeLimit: 1800, // 30 minutes
        randomizeQuestions: true,
        showCorrectAnswers: true,
      },
      createdBy: instructor._id,
      updatedBy: instructor._id,
      isActive: true,
      duration: 1800,
    });
    seedData.content.push(content);

    // Link content to course as a module
    const courseContent = await CourseContent.create({
      _id: mockId(TYPE_CODES.COURSE_CONTENT, contentIdNum),
      courseId: course._id,
      contentId: content._id,
      moduleNumber: moduleNumber,
      sequence: moduleNumber,
      isRequired: true,
      isActive: true,
    });
    seedData.courseContent.push(courseContent);

    // Create 5-8 questions for this module
    const numQuestions = 5 + Math.floor(Math.random() * 4); // 5-8 questions
    await createQuestionsForModule(content, department, numQuestions, courseIndex * 100 + moduleNumber * 10);
  }
}

async function createQuestionsForModule(
  content: any,
  department: any,
  count: number,
  startIdNum: number
) {
  const questionTypes: Array<'multiple-choice' | 'true-false' | 'short-answer'> = [
    'multiple-choice',
    'true-false',
    'short-answer',
  ];

  const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

  for (let i = 0; i < count; i++) {
    const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
    const questionNum = startIdNum + i;

    let questionData: any = {
      _id: mockId(TYPE_CODES.QUESTION, questionNum),
      questionText: generateQuestionText(content.title, questionType, i + 1),
      questionType: questionType,
      departmentId: department._id,
      points: questionType === 'multiple-choice' ? 2 : questionType === 'true-false' ? 1 : 3,
      difficulty: difficulty,
      tags: [content.title.toLowerCase().split(' ')[0], questionType, difficulty],
      isActive: true,
    };

    // Add type-specific data
    if (questionType === 'multiple-choice') {
      questionData.options = [
        'Option A - Correct answer',
        'Option B - Incorrect',
        'Option C - Incorrect',
        'Option D - Incorrect',
      ];
      questionData.correctAnswer = 'Option A - Correct answer';
      questionData.explanation = 'Option A is the correct answer based on the course material.';
    } else if (questionType === 'true-false') {
      questionData.options = ['True', 'False'];
      questionData.correctAnswer = Math.random() > 0.5 ? 'True' : 'False';
      questionData.explanation = `The correct answer is ${questionData.correctAnswer}.`;
    } else if (questionType === 'short-answer') {
      questionData.modelAnswer = 'This is an example of a good answer that addresses all key points from the lecture material.';
      questionData.maxWordCount = 150;
    }

    const question = await Question.create(questionData);
    seedData.questions.push(question);
  }
}

function generateQuestionText(moduleTitle: string, questionType: string, num: number): string {
  const baseTopics = moduleTitle.split(' ').slice(0, 3).join(' ');

  if (questionType === 'multiple-choice') {
    return `Which of the following best describes ${baseTopics} (Question ${num})?`;
  } else if (questionType === 'true-false') {
    return `${baseTopics} is a fundamental concept in this field. True or False?`;
  } else if (questionType === 'short-answer') {
    return `Explain the key principles of ${baseTopics} and provide an example.`;
  }

  return `Question ${num} about ${moduleTitle}`;
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 SEED DATA SUMMARY');
  console.log('='.repeat(60));

  console.log('\n👥 STAFF MEMBERS:');
  for (const staff of seedData.staff) {
    console.log(`  • ${staff.firstName} ${staff.lastName} (${staff.title})`);
    console.log(`    Email: ${seedData.users.find((u: any) => u._id.equals(staff._id))?.email}`);
    console.log(`    Password: StaffPass123!`);
    console.log(`    Department Memberships:`);
    for (const membership of staff.departmentMemberships) {
      const dept = seedData.departments.find((d: any) => d._id.equals(membership.departmentId));
      console.log(`      - ${dept?.name}: ${membership.roles.join(', ')}${membership.isPrimary ? ' (Primary)' : ''}`);
    }
  }

  console.log('\n📁 DEPARTMENTS:');
  for (const dept of seedData.departments) {
    const courseCount = seedData.courses.filter((c: any) => c.departmentId.equals(dept._id)).length;
    console.log(`  • ${dept.name} (${dept.code}) - ${courseCount} courses`);
  }

  console.log('\n📚 COURSES WITH MODULES:');
  for (const course of seedData.courses) {
    const modules = seedData.courseContent.filter((cc: any) => cc.courseId.equals(course._id));
    const questionCount = seedData.questions.filter((q: any) => {
      return modules.some((m: any) => {
        const content = seedData.content.find((c: any) => c._id.equals(m.contentId));
        return content && q.tags.includes(content.title.toLowerCase().split(' ')[0]);
      });
    }).length;

    console.log(`  • ${course.name} (${course.code})`);
    console.log(`    - ${modules.length} modules, ~${questionCount} questions`);

    for (const module of modules) {
      const content = seedData.content.find((c: any) => c._id.equals(module.contentId));
      console.log(`      ${module.moduleNumber}. ${content?.title}`);
    }
  }

  console.log('\n📊 STATISTICS:');
  console.log(`  • Departments: ${seedData.departments.length}`);
  console.log(`  • Staff Members: ${seedData.staff.length}`);
  console.log(`  • Courses: ${seedData.courses.length}`);
  console.log(`  • Course Modules: ${seedData.content.length}`);
  console.log(`  • Questions: ${seedData.questions.length}`);

  console.log('\n✅ Database seeding completed successfully!');
  console.log('='.repeat(60) + '\n');
}

async function purgeTestData() {
  console.log('\n🗑️  Purging existing test data...');

  try {
    // Delete all documents with IDs in the 'feedface' range
    // feedface00000000 to feedfacefffffff
    const minId = new mongoose.Types.ObjectId('feedface0000000000000000');
    const maxId = new mongoose.Types.ObjectId('feedfaceffffffffffffffff');
    const idQuery = { _id: { $gte: minId, $lt: maxId } };

    const userResult = await User.deleteMany(idQuery);
    const staffResult = await Staff.deleteMany(idQuery);
    const deptResult = await Department.deleteMany(idQuery);
    const courseResult = await Course.deleteMany(idQuery);
    const contentResult = await Content.deleteMany(idQuery);
    const courseContentResult = await CourseContent.deleteMany(idQuery);
    const questionResult = await Question.deleteMany(idQuery);

    console.log(`  ✓ Deleted ${userResult.deletedCount} users`);
    console.log(`  ✓ Deleted ${staffResult.deletedCount} staff`);
    console.log(`  ✓ Deleted ${deptResult.deletedCount} departments`);
    console.log(`  ✓ Deleted ${courseResult.deletedCount} courses`);
    console.log(`  ✓ Deleted ${contentResult.deletedCount} content items`);
    console.log(`  ✓ Deleted ${courseContentResult.deletedCount} course-content links`);
    console.log(`  ✓ Deleted ${questionResult.deletedCount} questions`);

    const totalDeleted =
      userResult.deletedCount +
      staffResult.deletedCount +
      deptResult.deletedCount +
      courseResult.deletedCount +
      contentResult.deletedCount +
      courseContentResult.deletedCount +
      questionResult.deletedCount;

    console.log(`\n  ✅ Total records purged: ${totalDeleted}\n`);
  } catch (error) {
    console.error('  ✗ Purge failed:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🌱 Starting database seeding...\n');

    await connectDB();

    // Check for --purge flag
    const shouldPurge = process.argv.includes('--purge') || process.argv.includes('-p');

    if (shouldPurge) {
      await purgeTestData();
    }

    // Create all seed data
    await createDepartments();
    await createStaffMembers();
    await createCoursesWithSegments();

    // Print summary
    await printSummary();

    // Close connection
    await mongoose.connection.close();
    console.log('✓ Database connection closed');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Seeding failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
main();
