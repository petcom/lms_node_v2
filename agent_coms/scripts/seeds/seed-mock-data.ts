/**
 * Mock Data Seeding Script for LMS V2
 * 
 * Creates comprehensive test data in lms_v2_mockdata database:
 * - 6 Users (4 staff, 2 learners)
 * - 3 Departments with hierarchy
 * - 1 Academic Year + 2 Terms
 * - 20 Courses with segments
 * - 15 Exams with 4 questions each
 * - Programs and enrollments
 * - Learning activity data
 * - SCORM packages
 * - Settings and permissions
 */

import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';

// Import models - mix of default and named exports
import { User } from '../src/models/auth/User.model';
import { Learner } from '../src/models/auth/Learner.model';
import { Staff } from '../src/models/auth/Staff.model';
import Department from '../src/models/organization/Department.model';
import AcademicYear from '../src/models/academic/AcademicYear.model';
import Course from '../src/models/academic/Course.model';
import Program from '../src/models/academic/Program.model';
import Class from '../src/models/academic/Class.model';
import Content from '../src/models/content/Content.model';
import CourseContent from '../src/models/content/CourseContent.model';
import Question from '../src/models/assessment/Question.model';
import QuestionBank from '../src/models/assessment/QuestionBank.model';
import Enrollment from '../src/models/enrollment/Enrollment.model';
import ClassEnrollment from '../src/models/enrollment/ClassEnrollment.model';
import ContentAttempt from '../src/models/content/ContentAttempt.model';
import LearningEvent from '../src/models/activity/LearningEvent.model';
import ExamResult from '../src/models/activity/ExamResult.model';
import ScormAttempt from '../src/models/activity/ScormAttempt.model';
import Setting from '../src/models/system/Setting.model';
import Permission from '../src/models/system/Permission.model';
import RolePermission from '../src/models/system/RolePermission.model';
import { AuditLog } from '../src/models/system/AuditLog.model';
import { Report } from '../src/models/system/Report.model';

// Database connection
const MOCK_DB_URI = process.env.MOCK_DB_URI || 'mongodb://localhost:27017/lms_v2_mockdata';

// Data storage
const mockData = {
  users: [] as any[],
  staff: [] as any[],
  learners: [] as any[],
  departments: [] as any[],
  academicYears: [] as any[],
  courses: [] as any[],
  programs: [] as any[],
  classes: [] as any[],
  content: [] as any[],
  courseContent: [] as any[],
  questionBanks: [] as any[],
  questions: [] as any[],
  enrollments: [] as any[],
  classEnrollments: [] as any[],
  contentAttempts: [] as any[],
  learningEvents: [] as any[],
  examResults: [] as any[],
  scormAttempts: [] as any[]
};

// Utility functions
const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomElements = <T>(arr: T[], count: number): T[] => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

async function connectDB() {
  try {
    await mongoose.connect(MOCK_DB_URI);
    console.log(`✓ Connected to mock database: ${MOCK_DB_URI}`);
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    process.exit(1);
  }
}

async function createDepartments() {
  console.log('\n📁 Creating departments...');
  
  // Master department (required by system)
  const masterDept = await Department.create({
    name: 'Master Department',
    description: 'Root department for the organization',
    status: 'active',
    settings: {
      allowCourseCreation: true,
      allowEnrollment: true,
      requireApproval: false
    }
  });
  mockData.departments.push(masterDept);
  
  // Main department 1: Cognitive Therapy
  const cognitiveDept = await Department.create({
    name: 'Cognitive Therapy',
    code: 'CTHERAPY',
    description: 'Cognitive Behavioral Therapy and related treatments',
    parentDepartment: masterDept._id,
    status: 'active',
    settings: {
      allowCourseCreation: true,
      allowEnrollment: true,
      requireApproval: false
    }
  });
  mockData.departments.push(cognitiveDept);
  
  // Main department 2: EMDR
  const emdrDept = await Department.create({
    name: 'EMDR',
    code: 'EMDR',
    description: 'Eye Movement Desensitization and Reprocessing',
    parentDepartment: masterDept._id,
    status: 'active',
    settings: {
      allowCourseCreation: true,
      allowEnrollment: true,
      requireApproval: false
    }
  });
  mockData.departments.push(emdrDept);
  
  // Main department 3: Basic Therapy (with subdepartments)
  const basicDept = await Department.create({
    name: 'Basic Therapy',
    code: 'BASIC',
    description: 'Foundational therapy techniques and practices',
    parentDepartment: masterDept._id,
    status: 'active',
    settings: {
      allowCourseCreation: true,
      allowEnrollment: true,
      requireApproval: false
    }
  });
  mockData.departments.push(basicDept);
  
  // Subdepartment 1: Basic Therapy - Counseling
  const counselingDept = await Department.create({
    name: 'Counseling Services',
    code: 'COUNSEL',
    description: 'Individual and group counseling',
    parentDepartment: basicDept._id,
    status: 'active',
    settings: {
      allowCourseCreation: true,
      allowEnrollment: true,
      requireApproval: true
    }
  });
  mockData.departments.push(counselingDept);
  
  // Subdepartment 2: Basic Therapy - Crisis Intervention
  const crisisDept = await Department.create({
    name: 'Crisis Intervention',
    code: 'CRISIS',
    description: 'Emergency mental health response and crisis management',
    parentDepartment: basicDept._id,
    status: 'active',
    settings: {
      allowCourseCreation: true,
      allowEnrollment: true,
      requireApproval: true
    }
  });
  mockData.departments.push(crisisDept);
  
  console.log(`✓ Created ${mockData.departments.length} departments (including Master)`);
}

async function createUsers() {
  console.log('\n👥 Creating users...');
  
  const hashedPassword = await bcrypt.hash('Password123!', 10);
  
  // Staff users
  const staffData = [
    {
      email: 'admin@lms.com',
      firstName: 'Sarah',
      lastName: 'Anderson',
      roles: ['system-admin'],
      title: 'System Administrator',
      department: mockData.departments[0]._id, // Master
      permissions: ['system:manage', 'users:manage', 'departments:manage'],
      preferences: { defaultDashboard: 'system-admin' }
    },
    {
      email: 'john.smith@lms.com',
      firstName: 'John',
      lastName: 'Smith',
      roles: ['system-admin', 'content-admin', 'department-admin'],
      title: 'Lead Instructor & Admin',
      department: mockData.departments[1]._id, // Cognitive Therapy
      permissions: ['system:manage', 'content:manage', 'department:manage']
    },
    {
      email: 'emily.jones@lms.com',
      firstName: 'Emily',
      lastName: 'Jones',
      roles: ['system-admin', 'content-admin'],
      title: 'Content Manager',
      department: mockData.departments[2]._id, // EMDR
      permissions: ['system:manage', 'content:manage']
    },
    {
      email: 'michael.brown@lms.com',
      firstName: 'Michael',
      lastName: 'Brown',
      roles: ['content-admin', 'department-admin'],
      title: 'Department Head',
      department: mockData.departments[3]._id, // Basic Therapy
      permissions: ['content:manage', 'department:manage']
    }
  ];
  
  for (const data of staffData) {
    const user = await User.create({
      email: data.email,
      password: hashedPassword,
      role: 'staff',
      isEmailVerified: true
    });
    mockData.users.push(user);
    
    const staff = await Staff.create({
      user: user._id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      roles: data.roles,
      department: data.department,
      title: data.title,
      permissions: data.permissions,
      status: 'active',
      preferences: data.preferences || {}
    });
    mockData.staff.push(staff);
  }
  
  // Learner users
  const learnerData = [
    {
      email: 'alice.student@lms.com',
      firstName: 'Alice',
      lastName: 'Johnson',
      studentId: 'STU001'
    },
    {
      email: 'bob.learner@lms.com',
      firstName: 'Bob',
      lastName: 'Williams',
      studentId: 'STU002'
    }
  ];
  
  for (const data of learnerData) {
    const user = await User.create({
      email: data.email,
      password: hashedPassword,
      role: 'learner',
      isEmailVerified: true
    });
    mockData.users.push(user);
    
    const learner = await Learner.create({
      user: user._id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      studentId: data.studentId,
      status: 'active',
      enrollmentDate: new Date(2025, 0, 1)
    });
    mockData.learners.push(learner);
  }
  
  console.log(`✓ Created ${mockData.staff.length} staff and ${mockData.learners.length} learners`);
}

async function createAcademicYear() {
  console.log('\n📅 Creating academic year...');
  
  const academicYear = await AcademicYear.create({
    name: '2025-2026',
    code: 'AY2025',
    startDate: new Date(2025, 8, 1), // September 1, 2025
    endDate: new Date(2026, 5, 30), // June 30, 2026
    status: 'active',
    terms: [
      {
        name: 'Fall 2025',
        code: 'FALL2025',
        startDate: new Date(2025, 8, 1),
        endDate: new Date(2025, 11, 20),
        status: 'active'
      },
      {
        name: 'Spring 2026',
        code: 'SPRING2026',
        startDate: new Date(2026, 0, 10),
        endDate: new Date(2026, 4, 25),
        status: 'active'
      }
    ]
  });
  mockData.academicYears.push(academicYear);
  
  console.log('✓ Created academic year with 2 terms');
}

async function createCourses() {
  console.log('\n📚 Creating 20 courses...');
  
  const courseTemplates = [
    { prefix: 'CBT', name: 'Cognitive Behavioral Therapy', dept: 1 },
    { prefix: 'EMDR', name: 'EMDR Therapy', dept: 2 },
    { prefix: 'BASIC', name: 'Basic Therapy', dept: 3 },
    { prefix: 'COUNSEL', name: 'Counseling', dept: 4 },
    { prefix: 'CRISIS', name: 'Crisis Management', dept: 5 }
  ];
  
  const levels = ['Introduction to', 'Fundamentals of', 'Advanced', 'Practical'];
  const topics = ['Techniques', 'Applications', 'Theory', 'Practice'];
  
  for (let i = 0; i < 20; i++) {
    const template = courseTemplates[i % courseTemplates.length];
    const level = levels[Math.floor(i / 5) % levels.length];
    const topic = topics[i % topics.length];
    
    const course = await Course.create({
      title: `${level} ${template.name} ${topic}`,
      code: `${template.prefix}${(101 + i).toString()}`,
      description: `Comprehensive course covering ${level.toLowerCase()} ${template.name.toLowerCase()} ${topic.toLowerCase()}`,
      credits: randomInt(2, 4),
      department: mockData.departments[template.dept]._id,
      academicYear: mockData.academicYears[0]._id,
      status: 'published',
      duration: randomInt(4, 12),
      difficulty: randomElement(['beginner', 'intermediate', 'advanced']),
      enrollmentSettings: {
        maxEnrollments: randomInt(20, 50),
        allowWaitlist: true,
        autoEnroll: false
      },
      prerequisites: i > 5 ? [mockData.courses[randomInt(0, i - 1)]?._id].filter(Boolean) : []
    });
    mockData.courses.push(course);
  }
  
  // Assign 5 courses to multiple departments
  const multiDeptCourses = randomElements(mockData.courses, 5);
  for (const course of multiDeptCourses) {
    const extraDept = randomElement(mockData.departments.slice(1)); // Exclude master
    course.additionalDepartments = [extraDept._id];
    await course.save();
  }
  
  console.log(`✓ Created ${mockData.courses.length} courses (5 assigned to multiple departments)`);
}

async function createCourseContent() {
  console.log('\n📄 Creating course content (1-3 segments per course)...');
  
  let totalSegments = 0;
  
  for (const course of mockData.courses) {
    const numSegments = randomInt(1, 3);
    
    for (let i = 0; i < numSegments; i++) {
      const content = await Content.create({
        title: `${course.title} - Module ${i + 1}`,
        type: randomElement(['video', 'document', 'presentation', 'interactive']),
        description: `Learning module ${i + 1} for ${course.title}`,
        fileUrl: `https://cdn.example.com/content/${course.code}-module-${i + 1}`,
        duration: randomInt(30, 120),
        status: 'published',
        metadata: {
          fileSize: randomInt(1000000, 50000000),
          mimeType: randomElement(['video/mp4', 'application/pdf', 'application/vnd.ms-powerpoint'])
        }
      });
      mockData.content.push(content);
      
      const courseContent = await CourseContent.create({
        course: course._id,
        content: content._id,
        orderIndex: i + 1,
        isRequired: i === 0, // First module is required
        passScore: 70
      });
      mockData.courseContent.push(courseContent);
      totalSegments++;
    }
  }
  
  console.log(`✓ Created ${totalSegments} content segments across ${mockData.courses.length} courses`);
}

async function createExamsAndQuestions() {
  console.log('\n📝 Creating 15 exams with 4 questions each...');
  
  const examCourses = randomElements(mockData.courses, 15);
  let totalQuestions = 0;
  
  for (const course of examCourses) {
    // Create question bank
    const questionBank = await QuestionBank.create({
      name: `${course.code} Final Exam`,
      description: `Final examination for ${course.title}`,
      course: course._id,
      department: course.department,
      status: 'published',
      tags: ['final-exam', course.code.toLowerCase()]
    });
    mockData.questionBanks.push(questionBank);
    
    // Create 4 questions
    const questionTypes = ['multiple-choice', 'true-false', 'short-answer', 'essay'];
    
    for (let i = 0; i < 4; i++) {
      const qType = questionTypes[i % questionTypes.length];
      
      let question: any = {
        questionBank: questionBank._id,
        type: qType,
        questionText: `Question ${i + 1}: What is the primary concept in ${course.title}?`,
        points: 25,
        difficulty: randomElement(['easy', 'medium', 'hard']),
        tags: [course.code.toLowerCase(), 'final-exam']
      };
      
      // Add type-specific fields
      if (qType === 'multiple-choice') {
        question.options = [
          { text: 'Correct answer', isCorrect: true },
          { text: 'Incorrect option 1', isCorrect: false },
          { text: 'Incorrect option 2', isCorrect: false },
          { text: 'Incorrect option 3', isCorrect: false }
        ];
        question.correctAnswer = 'Correct answer';
      } else if (qType === 'true-false') {
        question.options = [
          { text: 'True', isCorrect: true },
          { text: 'False', isCorrect: false }
        ];
        question.correctAnswer = 'True';
      } else {
        question.correctAnswer = 'Sample correct answer for evaluation';
      }
      
      const createdQuestion = await Question.create(question);
      mockData.questions.push(createdQuestion);
      totalQuestions++;
    }
  }
  
  console.log(`✓ Created 15 exams with ${totalQuestions} questions total`);
}

async function createPrograms() {
  console.log('\n🎓 Creating programs...');
  
  const programs = [
    {
      name: 'Cognitive Therapy Certification',
      code: 'CERT-CBT',
      department: mockData.departments[1]._id,
      courses: mockData.courses.filter(c => c.code.startsWith('CBT')).slice(0, 3)
    },
    {
      name: 'EMDR Practitioner Program',
      code: 'CERT-EMDR',
      department: mockData.departments[2]._id,
      courses: mockData.courses.filter(c => c.code.startsWith('EMDR')).slice(0, 3)
    },
    {
      name: 'Basic Therapy Foundations',
      code: 'CERT-BASIC',
      department: mockData.departments[3]._id,
      courses: mockData.courses.filter(c => c.code.startsWith('BASIC')).slice(0, 4)
    }
  ];
  
  for (const data of programs) {
    const program = await Program.create({
      name: data.name,
      code: data.code,
      description: `Comprehensive ${data.name} program`,
      department: data.department,
      academicYear: mockData.academicYears[0]._id,
      status: 'published',
      duration: 6,
      credits: data.courses.reduce((sum, c) => sum + (c.credits || 0), 0),
      requirements: {
        requiredCourses: data.courses.map(c => c._id),
        minimumGPA: 3.0,
        totalCredits: data.courses.reduce((sum, c) => sum + (c.credits || 0), 0)
      }
    });
    mockData.programs.push(program);
  }
  
  console.log(`✓ Created ${mockData.programs.length} programs`);
}

async function createClasses() {
  console.log('\n🏫 Creating class instances...');
  
  // Create 2 classes for some courses
  const classCoursesCount = Math.min(10, mockData.courses.length);
  
  for (let i = 0; i < classCoursesCount; i++) {
    const course = mockData.courses[i];
    const term = mockData.academicYears[0].terms[i % 2];
    
    const classInstance = await Class.create({
      course: course._id,
      term: {
        name: term.name,
        code: term.code,
        startDate: term.startDate,
        endDate: term.endDate,
        status: term.status
      },
      section: `${String.fromCharCode(65 + (i % 3))}`, // A, B, C
      instructor: mockData.staff[i % mockData.staff.length]._id,
      schedule: {
        days: randomElements(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], 2),
        startTime: '09:00',
        endTime: '10:30',
        location: `Room ${100 + i}`
      },
      capacity: randomInt(20, 40),
      status: 'published'
    });
    mockData.classes.push(classInstance);
  }
  
  console.log(`✓ Created ${mockData.classes.length} class instances`);
}

async function createEnrollments() {
  console.log('\n📋 Creating enrollments...');
  
  const learner1 = mockData.learners[0];
  const learner2 = mockData.learners[1];
  
  // Enroll learner 1 in 2 programs
  const learner1Programs = randomElements(mockData.programs, 2);
  for (const program of learner1Programs) {
    // Get courses from program
    const programCourses = mockData.courses.filter(c => 
      program.requirements.requiredCourses.some((rc: any) => rc.equals(c._id))
    );
    
    for (const course of programCourses) {
      const enrollment = await Enrollment.create({
        courseId: course._id,
        learnerId: learner1._id,
        status: randomElement(['active', 'completed']),
        progress: randomInt(60, 100),
        enrolledAt: new Date(2025, 8, randomInt(1, 15)),
        completedAt: Math.random() > 0.5 ? new Date(2025, 11, randomInt(1, 20)) : undefined,
        finalGrade: Math.random() > 0.3 ? randomInt(75, 98) : undefined
      });
      mockData.enrollments.push(enrollment);
    }
  }
  
  // Enroll learner 2 in 1 program
  const learner2Program = randomElement(mockData.programs);
  const programCourses = mockData.courses.filter(c => 
    learner2Program.requirements.requiredCourses.some((rc: any) => rc.equals(c._id))
  );
  
  for (const course of programCourses) {
    const enrollment = await Enrollment.create({
      courseId: course._id,
      learnerId: learner2._id,
      status: randomElement(['active', 'completed']),
      progress: randomInt(40, 100),
      enrolledAt: new Date(2025, 8, randomInt(1, 15)),
      completedAt: Math.random() > 0.5 ? new Date(2025, 11, randomInt(1, 20)) : undefined,
      finalGrade: Math.random() > 0.3 ? randomInt(70, 95) : undefined
    });
    mockData.enrollments.push(enrollment);
  }
  
  // Add standalone course enrollments for both learners
  const standaloneCourses1 = randomElements(mockData.courses.filter(c => 
    !mockData.enrollments.some((e: any) => e.courseId.equals(c._id) && e.learnerId.equals(learner1._id))
  ), 3);
  
  const standaloneCourses2 = randomElements(mockData.courses.filter(c => 
    !mockData.enrollments.some((e: any) => e.courseId.equals(c._id) && e.learnerId.equals(learner2._id))
  ), 3);
  
  for (const course of standaloneCourses1) {
    const enrollment = await Enrollment.create({
      courseId: course._id,
      learnerId: learner1._id,
      status: randomElement(['active', 'completed', 'waitlisted']),
      progress: randomInt(0, 100),
      enrolledAt: new Date(2025, 9, randomInt(1, 30)),
      finalGrade: Math.random() > 0.5 ? randomInt(70, 95) : undefined
    });
    mockData.enrollments.push(enrollment);
  }
  
  for (const course of standaloneCourses2) {
    const enrollment = await Enrollment.create({
      courseId: course._id,
      learnerId: learner2._id,
      status: randomElement(['active', 'completed']),
      progress: randomInt(0, 100),
      enrolledAt: new Date(2025, 9, randomInt(1, 30)),
      finalGrade: Math.random() > 0.5 ? randomInt(65, 92) : undefined
    });
    mockData.enrollments.push(enrollment);
  }
  
  console.log(`✓ Created ${mockData.enrollments.length} course enrollments`);
}

async function createLearningActivity() {
  console.log('\n📊 Creating learning activity data...');
  
  let contentAttempts = 0, learningEvents = 0, examResults = 0;
  
  for (const enrollment of mockData.enrollments) {
    // Get course content
    const courseContentItems = mockData.courseContent.filter((cc: any) => 
      cc.course.equals(enrollment.courseId)
    );
    
    // Create content attempts
    for (const cc of courseContentItems) {
      if (Math.random() > 0.3) { // 70% chance of attempt
        const attempt = await ContentAttempt.create({
          content: cc.content,
          learner: enrollment.learnerId,
          course: enrollment.courseId,
          status: randomElement(['completed', 'in-progress', 'not-started']),
          progress: randomInt(0, 100),
          timeSpent: randomInt(300, 3600),
          startedAt: randomDate(new Date(2025, 8, 1), new Date()),
          completedAt: Math.random() > 0.4 ? randomDate(new Date(2025, 8, 1), new Date()) : undefined,
          score: Math.random() > 0.3 ? randomInt(70, 100) : undefined
        });
        mockData.contentAttempts.push(attempt);
        contentAttempts++;
      }
    }
    
    // Create learning events
    if (Math.random() > 0.5) {
      const event = await LearningEvent.create({
        learner: enrollment.learnerId,
        course: enrollment.courseId,
        eventType: randomElement(['course_started', 'lesson_completed', 'quiz_passed', 'assignment_submitted']),
        eventData: {
          action: 'completed',
          result: 'success'
        },
        timestamp: randomDate(new Date(2025, 8, 1), new Date())
      });
      mockData.learningEvents.push(event);
      learningEvents++;
    }
    
    // Create exam results if course has exam
    const hasExam = mockData.questionBanks.some((qb: any) => qb.course.equals(enrollment.courseId));
    if (hasExam && Math.random() > 0.3) {
      const questionBank = mockData.questionBanks.find((qb: any) => qb.course.equals(enrollment.courseId));
      const examQuestions = mockData.questions.filter((q: any) => q.questionBank.equals(questionBank._id));
      
      const result = await ExamResult.create({
        learner: enrollment.learnerId,
        course: enrollment.courseId,
        questionBank: questionBank._id,
        score: randomInt(65, 100),
        totalPoints: 100,
        passed: true,
        attempts: randomInt(1, 2),
        timeSpent: randomInt(1800, 5400),
        startedAt: randomDate(new Date(2025, 10, 1), new Date()),
        completedAt: randomDate(new Date(2025, 10, 1), new Date()),
        answers: examQuestions.map((q: any) => ({
          question: q._id,
          answer: q.correctAnswer,
          isCorrect: Math.random() > 0.2,
          points: Math.random() > 0.2 ? q.points : randomInt(0, q.points)
        }))
      });
      mockData.examResults.push(result);
      examResults++;
    }
  }
  
  console.log(`✓ Created ${contentAttempts} content attempts, ${learningEvents} learning events, ${examResults} exam results`);
}

async function createScormAttempts() {
  console.log('\n📦 Creating SCORM attempts...');
  
  // Select 5 random content items to be SCORM content
  const scormContent = randomElements(mockData.content, Math.min(5, mockData.content.length));
  let totalAttempts = 0;
  
  for (const content of scormContent) {
    // Find course for this content
    const courseContent = mockData.courseContent.find((cc: any) => cc.content.equals(content._id));
    if (!courseContent) continue;
    
    // Find learners enrolled in this course
    const enrolledLearners = mockData.enrollments
      .filter((e: any) => e.courseId.equals(courseContent.course))
      .map((e: any) => e.learnerId);
    
    for (const learnerId of enrolledLearners) {
      if (Math.random() > 0.4) { // 60% chance of SCORM attempt
        const attempt = await ScormAttempt.create({
          contentId: content._id,
          learnerId: learnerId,
          attemptNumber: 1,
          scormVersion: randomElement(['1.2', '2004']),
          status: randomElement(['completed', 'incomplete', 'passed', 'failed']),
          scoreRaw: randomInt(60, 100),
          scoreMin: 0,
          scoreMax: 100,
          scoreScaled: randomInt(60, 100) / 100,
          sessionTime: randomInt(1200, 6000),
          totalTime: randomInt(1200, 6000),
          progressMeasure: randomInt(50, 100) / 100,
          completionStatus: randomElement(['completed', 'incomplete']),
          successStatus: randomElement(['passed', 'failed', 'unknown']),
          startedAt: randomDate(new Date(2025, 9, 1), new Date()),
          lastAccessedAt: new Date(),
          completedAt: Math.random() > 0.3 ? randomDate(new Date(2025, 9, 1), new Date()) : undefined,
          cmiData: {
            'cmi.core.lesson_status': randomElement(['completed', 'incomplete', 'passed']),
            'cmi.core.score.raw': randomInt(60, 100).toString(),
            'cmi.core.session_time': `00:${randomInt(10, 60)}:${randomInt(10, 59)}`
          }
        });
        mockData.scormAttempts.push(attempt);
        totalAttempts++;
      }
    }
  }
  
  console.log(`✓ Created ${totalAttempts} SCORM attempts for ${scormContent.length} SCORM content items`);
}

async function createSystemSettings() {
  console.log('\n⚙️ Creating system settings...');
  
  const settings = [
    {
      key: 'system.name',
      value: 'LMS V2 - Mock Data System',
      type: 'string',
      category: 'system',
      description: 'System name'
    },
    {
      key: 'enrollment.autoApprove',
      value: true,
      type: 'boolean',
      category: 'enrollment',
      description: 'Auto-approve enrollments'
    },
    {
      key: 'course.maxEnrollment',
      value: 50,
      type: 'number',
      category: 'course',
      description: 'Maximum enrollments per course'
    },
    {
      key: 'assessment.passingGrade',
      value: 70,
      type: 'number',
      category: 'assessment',
      description: 'Default passing grade percentage'
    }
  ];
  
  for (const data of settings) {
    await Setting.create(data);
  }
  
  console.log(`✓ Created ${settings.length} system settings`);
}

async function createAuditLogs() {
  console.log('\n📜 Creating sample audit logs...');
  
  const actions = [
    'user.login',
    'course.created',
    'enrollment.created',
    'content.viewed',
    'exam.submitted'
  ];
  
  for (let i = 0; i < 20; i++) {
    await AuditLog.create({
      userId: randomElement(mockData.users)._id,
      action: randomElement(actions),
      entityType: randomElement(['User', 'Course', 'Enrollment', 'Content']),
      entityId: randomElement(mockData.courses)._id,
      changes: {
        field: 'status',
        oldValue: 'draft',
        newValue: 'published'
      },
      ipAddress: `192.168.1.${randomInt(1, 254)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timestamp: randomDate(new Date(2025, 8, 1), new Date())
    });
  }
  
  console.log('✓ Created 20 audit log entries');
}

async function displaySummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MOCK DATA GENERATION SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\n🏢 Organization:');
  console.log(`   Departments: ${mockData.departments.length} (including 2 subdepartments)`);
  
  console.log('\n👥 Users:');
  console.log(`   Total Users: ${mockData.users.length}`);
  console.log(`   Staff: ${mockData.staff.length}`);
  console.log(`   Learners: ${mockData.learners.length}`);
  
  console.log('\n📚 Academic:');
  console.log(`   Academic Years: ${mockData.academicYears.length}`);
  console.log(`   Courses: ${mockData.courses.length}`);
  console.log(`   Programs: ${mockData.programs.length}`);
  console.log(`   Classes: ${mockData.classes.length}`);
  
  console.log('\n📄 Content & Assessment:');
  console.log(`   Content Items: ${mockData.content.length}`);
  console.log(`   Course-Content Links: ${mockData.courseContent.length}`);
  console.log(`   Question Banks: ${mockData.questionBanks.length}`);
  console.log(`   Questions: ${mockData.questions.length}`);
  
  console.log('\n📋 Enrollments:');
  console.log(`   Course Enrollments: ${mockData.enrollments.length}`);
  console.log(`   Class Enrollments: ${mockData.classEnrollments.length}`);
  
  console.log('\n📊 Activity:');
  console.log(`   Content Attempts: ${mockData.contentAttempts.length}`);
  console.log(`   Learning Events: ${mockData.learningEvents.length}`);
  console.log(`   Exam Results: ${mockData.examResults.length}`);
  
  console.log('\n📦 SCORM:');
  console.log(`   SCORM Attempts: ${mockData.scormAttempts.length}`);
  
  console.log('\n👤 Login Credentials (all passwords: Password123!):');
  console.log('   System Admin: admin@lms.com');
  console.log('   Staff Members: john.smith@lms.com, emily.jones@lms.com, michael.brown@lms.com');
  console.log('   Learners: alice.student@lms.com, bob.learner@lms.com');
  
  console.log('\n✅ Mock data generation completed successfully!');
  console.log('='.repeat(60) + '\n');
}

async function main() {
  try {
    console.log('🚀 Starting mock data generation for LMS V2...\n');
    
    await connectDB();
    
    await createDepartments();
    await createUsers();
    await createAcademicYear();
    await createCourses();
    await createCourseContent();
    await createExamsAndQuestions();
    await createPrograms();
    await createClasses();
    await createEnrollments();
    await createLearningActivity();
    await createScormAttempts();
    await createSystemSettings();
    await createAuditLogs();
    
    await displaySummary();
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error generating mock data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default main;
