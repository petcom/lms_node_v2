/**
 * Mock Data Seeding Script (Current LMS V2 Schema)
 *
 * Populates a disposable mock database with realistic data for development.
 * Uses ENV_FILE to switch between .env and .env.mock.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { loadEnv } from './utils/load-env';
import { seedLookupValues } from './seeds/constants.seed';
import {
  createAdminLearner,
  createAdminStaff,
  createAdminUser,
  createGlobalAdmin,
  createMasterDepartment,
  seedAccessRights,
  seedRoleDefinitions
} from './seed-admin';

import { User } from '../src/models/auth/User.model';
import { Staff } from '../src/models/auth/Staff.model';
import { Learner } from '../src/models/auth/Learner.model';
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

loadEnv();

const DB_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MOCK_DB_URI ||
  'mongodb://localhost:27017/lms_mock';

const DEFAULT_PASSWORD = process.env.MOCK_USER_PASSWORD || 'Password123!';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@lms.edu';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomDateWithinDays = (daysBack: number) => {
  const now = Date.now();
  const offset = randomInt(0, daysBack) * 24 * 60 * 60 * 1000;
  return new Date(now - offset);
};

const buildPerson = (firstName: string, lastName: string, email: string) => ({
  firstName,
  lastName,
  emails: [
    {
      email,
      type: 'institutional',
      isPrimary: true,
      verified: true,
      allowNotifications: true
    }
  ],
  phones: [],
  addresses: [],
  timezone: 'America/New_York',
  languagePreference: 'en'
});

async function connectDB() {
  try {
    await mongoose.connect(DB_URI);
    console.log(`Connected to database: ${DB_URI}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

async function dropLegacyIndexes() {
  try {
    const staffIndexes = await Staff.collection.indexes();
    if (staffIndexes.some(index => index.name === 'instructorId_1')) {
      await Staff.collection.dropIndex('instructorId_1');
      console.log('Dropped legacy staff index: instructorId_1');
    }
  } catch (error) {
    console.log('Skipping staff legacy index check:', error);
  }

  try {
    const learnerIndexes = await Learner.collection.indexes();
    if (learnerIndexes.some(index => index.name === 'studentId_1')) {
      await Learner.collection.dropIndex('studentId_1');
      console.log('Dropped legacy learner index: studentId_1');
    }
    if (learnerIndexes.some(index => index.name === 'learnerId_1')) {
      await Learner.collection.dropIndex('learnerId_1');
      console.log('Dropped legacy learner index: learnerId_1');
    }
  } catch (error) {
    console.log('Skipping learner legacy index check:', error);
  }

  try {
    const courseContentIndexes = await CourseContent.collection.indexes();
    if (courseContentIndexes.some(index => index.name === 'course_1_order_1')) {
      await CourseContent.collection.dropIndex('course_1_order_1');
      console.log('Dropped legacy course content index: course_1_order_1');
    }
  } catch (error) {
    console.log('Skipping course content legacy index check:', error);
  }

  try {
    const classEnrollmentIndexes = await ClassEnrollment.collection.indexes();
    if (classEnrollmentIndexes.some(index => index.name === 'learner_1_class_1')) {
      await ClassEnrollment.collection.dropIndex('learner_1_class_1');
      console.log('Dropped legacy class enrollment index: learner_1_class_1');
    }
  } catch (error) {
    console.log('Skipping class enrollment legacy index check:', error);
  }

  try {
    const examResultIndexes = await ExamResult.collection.indexes();
    if (examResultIndexes.some(index => index.name === 'learner_1_exam_1')) {
      await ExamResult.collection.dropIndex('learner_1_exam_1');
      console.log('Dropped legacy exam result index: learner_1_exam_1');
    }
  } catch (error) {
    console.log('Skipping exam result legacy index check:', error);
  }
}

async function ensureDepartment(data: {
  name: string;
  code: string;
  description?: string;
  parentDepartmentId?: mongoose.Types.ObjectId | null;
  isVisible?: boolean;
  requireExplicitMembership?: boolean;
}): Promise<any> {
  const existing = await Department.findOne({ code: data.code.toUpperCase() });
  if (existing) {
    existing.name = data.name;
    existing.description = data.description;
    existing.parentDepartmentId = data.parentDepartmentId || undefined;
    if (typeof data.isVisible === 'boolean') {
      existing.isVisible = data.isVisible;
    }
    if (typeof data.requireExplicitMembership === 'boolean') {
      existing.requireExplicitMembership = data.requireExplicitMembership;
    }
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  const department = new Department({
    name: data.name,
    code: data.code,
    description: data.description,
    parentDepartmentId: data.parentDepartmentId || undefined,
    isVisible: data.isVisible ?? true,
    requireExplicitMembership: data.requireExplicitMembership ?? false,
    isActive: true
  });

  await department.save();
  return department;
}

async function ensureUser(data: {
  email: string;
  userTypes: Array<'learner' | 'staff' | 'global-admin'>;
  passwordHash: string;
}): Promise<any> {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    existing.userTypes = data.userTypes;
    existing.password = data.passwordHash;
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return User.create({
    email: data.email,
    password: data.passwordHash,
    userTypes: data.userTypes,
    isActive: true
  });
}

async function ensureStaffRecord(data: {
  userId: mongoose.Types.ObjectId;
  person: any;
  title?: string;
  memberships: Array<{
    departmentId: mongoose.Types.ObjectId;
    roles: string[];
    isPrimary: boolean;
  }>;
}): Promise<any> {
  const existing = await Staff.findById(data.userId);
  if (existing) {
    existing.person = data.person;
    existing.title = data.title;
    existing.departmentMemberships = data.memberships.map(m => ({
      ...m,
      isActive: true,
      joinedAt: new Date()
    }));
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return Staff.create({
    _id: data.userId,
    person: data.person,
    title: data.title,
    departmentMemberships: data.memberships.map(m => ({
      ...m,
      isActive: true,
      joinedAt: new Date()
    })),
    isActive: true
  });
}

async function ensureLearnerRecord(data: {
  userId: mongoose.Types.ObjectId;
  person: any;
  personExtended?: any;
  memberships: Array<{
    departmentId: mongoose.Types.ObjectId;
    roles: string[];
    isPrimary: boolean;
  }>;
}): Promise<any> {
  const existing = await Learner.findById(data.userId);
  if (existing) {
    existing.person = data.person;
    existing.personExtended = data.personExtended;
    existing.departmentMemberships = data.memberships.map(m => ({
      ...m,
      isActive: true,
      joinedAt: new Date()
    }));
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return Learner.create({
    _id: data.userId,
    person: data.person,
    personExtended: data.personExtended,
    departmentMemberships: data.memberships.map(m => ({
      ...m,
      isActive: true,
      joinedAt: new Date()
    })),
    isActive: true
  });
}

async function ensureAcademicYear(): Promise<any> {
  const existing = await AcademicYear.findOne({ name: '2025-2026' });
  if (existing) {
    existing.startDate = new Date('2025-09-01');
    existing.endDate = new Date('2026-06-30');
    existing.isCurrent = true;
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return AcademicYear.create({
    name: '2025-2026',
    startDate: new Date('2025-09-01'),
    endDate: new Date('2026-06-30'),
    isCurrent: true,
    isActive: true
  });
}

async function ensureCourse(data: {
  name: string;
  code: string;
  departmentId: mongoose.Types.ObjectId;
  credits: number;
  prerequisites?: mongoose.Types.ObjectId[];
  status?: 'draft' | 'published' | 'archived';
  createdBy?: mongoose.Types.ObjectId;
}): Promise<any> {
  const existing = await Course.findOne({
    departmentId: data.departmentId,
    code: data.code
  });

  if (existing) {
    existing.name = data.name;
    existing.credits = data.credits;
    existing.prerequisites = data.prerequisites || [];
    existing.status = data.status || 'published';
    existing.createdBy = data.createdBy;
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return Course.create({
    name: data.name,
    code: data.code,
    departmentId: data.departmentId,
    credits: data.credits,
    prerequisites: data.prerequisites || [],
    status: data.status || 'published',
    createdBy: data.createdBy,
    isActive: true
  });
}

async function ensureProgram(data: {
  name: string;
  code: string;
  departmentId: mongoose.Types.ObjectId;
  type: 'certificate' | 'continuing-education';
}): Promise<any> {
  const existing = await Program.findOne({
    departmentId: data.departmentId,
    code: data.code
  });

  if (existing) {
    existing.name = data.name;
    existing.type = data.type;
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  const program = new Program({
    name: data.name,
    code: data.code,
    departmentId: data.departmentId,
    type: data.type,
    isActive: true
  });

  await program.save();
  return program;
}

async function ensureClass(data: {
  name: string;
  courseId: mongoose.Types.ObjectId;
  academicYearId: mongoose.Types.ObjectId;
  termCode: string;
  startDate: Date;
  endDate: Date;
  instructorIds: mongoose.Types.ObjectId[];
  maxEnrollment: number;
}): Promise<any> {
  const existing = await Class.findOne({
    courseId: data.courseId,
    academicYearId: data.academicYearId,
    termCode: data.termCode
  });

  if (existing) {
    existing.name = data.name;
    existing.startDate = data.startDate;
    existing.endDate = data.endDate;
    existing.instructorIds = data.instructorIds;
    existing.maxEnrollment = data.maxEnrollment;
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return Class.create({
    name: data.name,
    courseId: data.courseId,
    academicYearId: data.academicYearId,
    termCode: data.termCode,
    startDate: data.startDate,
    endDate: data.endDate,
    instructorIds: data.instructorIds,
    maxEnrollment: data.maxEnrollment,
    currentEnrollment: 0,
    isActive: true
  });
}

async function ensureContent(data: {
  title: string;
  description?: string;
  type: 'video' | 'quiz' | 'scorm' | 'document';
  courseId: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
}): Promise<any> {
  const existing = await Content.findOne({ title: data.title });
  if (existing) {
    existing.description = data.description;
    existing.type = data.type;
    existing.createdBy = data.createdBy;
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return Content.create({
    title: data.title,
    description: data.description,
    type: data.type,
    fileUrl: `https://cdn.example.com/content/${data.courseId.toString()}/${data.type}`,
    mimeType: data.type === 'document' ? 'application/pdf' : undefined,
    fileSize: data.type === 'document' ? randomInt(500000, 4000000) : undefined,
    duration: data.type === 'video' ? randomInt(20, 60) : undefined,
    quizData:
      data.type === 'quiz'
        ? {
            passingScore: 70,
            timeLimit: 30,
            randomizeQuestions: true,
            showCorrectAnswers: true
          }
        : undefined,
    scormData:
      data.type === 'scorm'
        ? {
            version: '1.2',
            manifestPath: 'imsmanifest.xml',
            launchPath: 'index.html',
            masteryScore: 80
          }
        : undefined,
    createdBy: data.createdBy,
    isActive: true
  });
}

async function ensureCourseContent(data: {
  courseId: mongoose.Types.ObjectId;
  contentId: mongoose.Types.ObjectId;
  sequence: number;
  moduleNumber?: number;
  isRequired?: boolean;
}): Promise<any> {
  const existing = await CourseContent.findOne({
    courseId: data.courseId,
    contentId: data.contentId
  });

  if (existing) {
    existing.sequence = data.sequence;
    existing.moduleNumber = data.moduleNumber;
    existing.isRequired = data.isRequired ?? false;
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return CourseContent.create({
    courseId: data.courseId,
    contentId: data.contentId,
    sequence: data.sequence,
    moduleNumber: data.moduleNumber,
    isRequired: data.isRequired ?? false,
    isActive: true
  });
}

async function ensureQuestionBank(data: {
  name: string;
  description?: string;
  departmentId: mongoose.Types.ObjectId;
  tags?: string[];
}): Promise<any> {
  const existing = await QuestionBank.findOne({ name: data.name });
  if (existing) {
    existing.description = data.description;
    existing.departmentId = data.departmentId;
    existing.tags = data.tags || [];
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return QuestionBank.create({
    name: data.name,
    description: data.description,
    departmentId: data.departmentId,
    tags: data.tags || [],
    questionIds: [],
    isActive: true
  });
}

async function ensureEnrollment(data: {
  learnerId: mongoose.Types.ObjectId;
  programId: mongoose.Types.ObjectId;
  academicYearId: mongoose.Types.ObjectId;
  status: 'active' | 'pending';
}): Promise<any> {
  const existing = await Enrollment.findOne({
    learnerId: data.learnerId,
    programId: data.programId,
    academicYearId: data.academicYearId
  });

  if (existing) {
    existing.status = data.status;
    existing.enrollmentDate = new Date();
    await existing.save();
    return existing;
  }

  return Enrollment.create({
    learnerId: data.learnerId,
    programId: data.programId,
    academicYearId: data.academicYearId,
    status: data.status,
    enrollmentDate: new Date(),
    startDate: new Date(),
    totalCreditsEarned: 0
  });
}

async function ensureClassEnrollment(data: {
  learnerId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  status: 'enrolled' | 'active';
}): Promise<any> {
  const existing = await ClassEnrollment.findOne({
    learnerId: data.learnerId,
    classId: data.classId
  });

  if (existing) {
    existing.status = data.status;
    existing.enrollmentDate = new Date();
    await existing.save();
    return existing;
  }

  return ClassEnrollment.create({
    learnerId: data.learnerId,
    classId: data.classId,
    status: data.status,
    enrollmentDate: new Date()
  });
}

async function main() {
  console.log('Mock Data Seed Script (Current LMS V2 Schema)');
  console.log('');

  try {
    await connectDB();
    await dropLegacyIndexes();

    console.log('Seeding lookup values...');
    await seedLookupValues();

    console.log('Seeding access rights and role definitions...');
    await seedAccessRights();
    await seedRoleDefinitions();

    console.log('Ensuring master department and admin user...');
    await createMasterDepartment();
    const adminUserId = await createAdminUser();
    await createAdminStaff(adminUserId);
    await createAdminLearner(adminUserId);
    await createGlobalAdmin(adminUserId);

    console.log('Creating departments...');
    const masterDept = await Department.findOne({ code: 'MASTER' });
    if (!masterDept) {
      throw new Error('Master department not found after seed.');
    }

    const behavioral = await ensureDepartment({
      name: 'Behavioral Health',
      code: 'BEHAV',
      description: 'Behavioral health training and interventions',
      parentDepartmentId: masterDept._id
    });

    const cognitive = await ensureDepartment({
      name: 'Cognitive Therapy',
      code: 'COG',
      description: 'Cognitive therapy methods and practice',
      parentDepartmentId: masterDept._id
    });

    const emdr = await ensureDepartment({
      name: 'EMDR',
      code: 'EMDR',
      description: 'EMDR therapy techniques and supervision',
      parentDepartmentId: masterDept._id
    });

    const cbtFundamentals = await ensureDepartment({
      name: 'CBT Fundamentals',
      code: 'CBT',
      description: 'Foundations of cognitive behavioral therapy',
      parentDepartmentId: cognitive._id
    });

    const crisis = await ensureDepartment({
      name: 'Crisis Intervention',
      code: 'CRISIS',
      description: 'Crisis response and stabilization',
      parentDepartmentId: behavioral._id
    });

    console.log('Creating staff users...');
    const staffPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const instructorUser = await ensureUser({
      email: 'john.instructor@lms.edu',
      userTypes: ['staff'],
      passwordHash: staffPasswordHash
    });

    const contentUser = await ensureUser({
      email: 'maria.content@lms.edu',
      userTypes: ['staff'],
      passwordHash: staffPasswordHash
    });

    const deptAdminUser = await ensureUser({
      email: 'sam.department@lms.edu',
      userTypes: ['staff'],
      passwordHash: staffPasswordHash
    });

    const leadInstructorUser = await ensureUser({
      email: 'riley.instructor@lms.edu',
      userTypes: ['staff'],
      passwordHash: staffPasswordHash
    });

    const billingUser = await ensureUser({
      email: 'taylor.billing@lms.edu',
      userTypes: ['staff'],
      passwordHash: staffPasswordHash
    });

    const instructorStaff = await ensureStaffRecord({
      userId: instructorUser._id,
      person: buildPerson('John', 'Instructor', instructorUser.email),
      title: 'Senior Instructor',
      memberships: [
        {
          departmentId: behavioral._id,
          roles: ['instructor'],
          isPrimary: true
        },
        {
          departmentId: crisis._id,
          roles: ['instructor'],
          isPrimary: false
        }
      ]
    });

    const contentStaff = await ensureStaffRecord({
      userId: contentUser._id,
      person: buildPerson('Maria', 'Content', contentUser.email),
      title: 'Content Lead',
      memberships: [
        {
          departmentId: cognitive._id,
          roles: ['content-admin'],
          isPrimary: true
        }
      ]
    });

    const deptAdminStaff = await ensureStaffRecord({
      userId: deptAdminUser._id,
      person: buildPerson('Sam', 'Department', deptAdminUser.email),
      title: 'Department Manager',
      memberships: [
        {
          departmentId: emdr._id,
          roles: ['department-admin', 'billing-admin'],
          isPrimary: true
        }
      ]
    });

    const leadInstructorStaff = await ensureStaffRecord({
      userId: leadInstructorUser._id,
      person: buildPerson('Riley', 'Instructor', leadInstructorUser.email),
      title: 'Lead Instructor',
      memberships: [
        {
          departmentId: cognitive._id,
          roles: ['instructor'],
          isPrimary: true
        },
        {
          departmentId: cbtFundamentals._id,
          roles: ['instructor'],
          isPrimary: false
        }
      ]
    });

    const billingStaff = await ensureStaffRecord({
      userId: billingUser._id,
      person: buildPerson('Taylor', 'Billing', billingUser.email),
      title: 'Billing Specialist',
      memberships: [
        {
          departmentId: behavioral._id,
          roles: ['billing-admin'],
          isPrimary: true
        }
      ]
    });

    console.log('Creating learner users...');
    const learnerPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const learnerOneUser = await ensureUser({
      email: 'alex.learner@lms.edu',
      userTypes: ['learner'],
      passwordHash: learnerPasswordHash
    });

    const learnerTwoUser = await ensureUser({
      email: 'jordan.student@lms.edu',
      userTypes: ['learner'],
      passwordHash: learnerPasswordHash
    });

    const learnerThreeUser = await ensureUser({
      email: 'casey.learner@lms.edu',
      userTypes: ['learner'],
      passwordHash: learnerPasswordHash
    });

    const learnerFourUser = await ensureUser({
      email: 'jamie.student@lms.edu',
      userTypes: ['learner'],
      passwordHash: learnerPasswordHash
    });

    const learnerOne = await ensureLearnerRecord({
      userId: learnerOneUser._id,
      person: buildPerson('Alex', 'Learner', learnerOneUser.email),
      personExtended: {
        studentId: 'STU-1001',
        emergencyContacts: [],
        identifications: []
      },
      memberships: [
        {
          departmentId: cognitive._id,
          roles: ['course-taker'],
          isPrimary: true
        }
      ]
    });

    const learnerTwo = await ensureLearnerRecord({
      userId: learnerTwoUser._id,
      person: buildPerson('Jordan', 'Student', learnerTwoUser.email),
      personExtended: {
        studentId: 'STU-1002',
        emergencyContacts: [],
        identifications: []
      },
      memberships: [
        {
          departmentId: behavioral._id,
          roles: ['auditor'],
          isPrimary: true
        }
      ]
    });

    const learnerThree = await ensureLearnerRecord({
      userId: learnerThreeUser._id,
      person: buildPerson('Casey', 'Learner', learnerThreeUser.email),
      personExtended: {
        studentId: 'STU-1003',
        emergencyContacts: [],
        identifications: []
      },
      memberships: [
        {
          departmentId: emdr._id,
          roles: ['course-taker'],
          isPrimary: true
        }
      ]
    });

    const learnerFour = await ensureLearnerRecord({
      userId: learnerFourUser._id,
      person: buildPerson('Jamie', 'Student', learnerFourUser.email),
      personExtended: {
        studentId: 'STU-1004',
        emergencyContacts: [],
        identifications: []
      },
      memberships: [
        {
          departmentId: behavioral._id,
          roles: ['course-taker'],
          isPrimary: true
        }
      ]
    });

    console.log('Creating academic year...');
    const academicYear = await ensureAcademicYear();

    console.log('Creating courses...');
    const courseBH101 = await ensureCourse({
      name: 'Behavioral Health Basics',
      code: 'BH101',
      departmentId: behavioral._id,
      credits: 3
    });

    const courseBH201 = await ensureCourse({
      name: 'Behavioral Health Applied Practice',
      code: 'BH201',
      departmentId: behavioral._id,
      credits: 3,
      prerequisites: [courseBH101._id]
    });

    const courseCBT101 = await ensureCourse({
      name: 'CBT Foundations',
      code: 'CBT101',
      departmentId: cbtFundamentals._id,
      credits: 2
    });

    const courseCBT201 = await ensureCourse({
      name: 'CBT Advanced Skills',
      code: 'CBT201',
      departmentId: cognitive._id,
      credits: 3,
      prerequisites: [courseCBT101._id]
    });

    const courseEMDR101 = await ensureCourse({
      name: 'EMDR Introduction',
      code: 'EMDR101',
      departmentId: emdr._id,
      credits: 3
    });

    const courseEMDR201 = await ensureCourse({
      name: 'EMDR Practicum',
      code: 'EMDR201',
      departmentId: emdr._id,
      credits: 4,
      prerequisites: [courseEMDR101._id]
    });

    console.log('Creating programs...');
    const programCBT = await ensureProgram({
      name: 'CBT Certificate',
      code: 'CBT-CERT',
      departmentId: cognitive._id,
      type: 'certificate'
    });

    const programEMDR = await ensureProgram({
      name: 'EMDR Continuing Education',
      code: 'EMDR-CE',
      departmentId: emdr._id,
      type: 'continuing-education'
    });

    console.log('Creating classes...');
    const classBH101 = await ensureClass({
      name: 'BH101 - Fall Cohort',
      courseId: courseBH101._id,
      academicYearId: academicYear._id,
      termCode: 'FALL2025',
      startDate: new Date('2025-09-10'),
      endDate: new Date('2025-12-05'),
      instructorIds: [instructorStaff._id],
      maxEnrollment: 30
    });

    const classBH201 = await ensureClass({
      name: 'BH201 - Fall Cohort',
      courseId: courseBH201._id,
      academicYearId: academicYear._id,
      termCode: 'FALL2025',
      startDate: new Date('2025-09-12'),
      endDate: new Date('2025-12-07'),
      instructorIds: [instructorStaff._id],
      maxEnrollment: 24
    });

    const classCBT101 = await ensureClass({
      name: 'CBT101 - Fall Cohort',
      courseId: courseCBT101._id,
      academicYearId: academicYear._id,
      termCode: 'FALL2025',
      startDate: new Date('2025-09-12'),
      endDate: new Date('2025-12-10'),
      instructorIds: [contentStaff._id, leadInstructorStaff._id],
      maxEnrollment: 25
    });

    const classCBT201 = await ensureClass({
      name: 'CBT201 - Fall Cohort',
      courseId: courseCBT201._id,
      academicYearId: academicYear._id,
      termCode: 'FALL2025',
      startDate: new Date('2025-09-16'),
      endDate: new Date('2025-12-12'),
      instructorIds: [leadInstructorStaff._id],
      maxEnrollment: 20
    });

    const classEMDR101 = await ensureClass({
      name: 'EMDR101 - Fall Cohort',
      courseId: courseEMDR101._id,
      academicYearId: academicYear._id,
      termCode: 'FALL2025',
      startDate: new Date('2025-09-15'),
      endDate: new Date('2025-12-12'),
      instructorIds: [deptAdminStaff._id],
      maxEnrollment: 20
    });

    const classEMDR201 = await ensureClass({
      name: 'EMDR201 - Fall Cohort',
      courseId: courseEMDR201._id,
      academicYearId: academicYear._id,
      termCode: 'FALL2025',
      startDate: new Date('2025-09-18'),
      endDate: new Date('2025-12-15'),
      instructorIds: [deptAdminStaff._id],
      maxEnrollment: 18
    });

    console.log('Creating content and course modules...');
    const courseList = [
      courseBH101,
      courseBH201,
      courseCBT101,
      courseCBT201,
      courseEMDR101,
      courseEMDR201
    ];

    const moduleTemplates = [
      {
        title: 'Foundations',
        types: ['video', 'document', 'quiz'] as const
      },
      {
        title: 'Applied Practice',
        types: ['video', 'document', 'quiz'] as const
      },
      {
        title: 'Case Lab',
        types: ['video', 'quiz'] as const
      }
    ];

    const contentLabels: Record<string, string> = {
      video: 'Video Lesson',
      document: 'Reading',
      quiz: 'Knowledge Check',
      scorm: 'SCORM Lab'
    };

    const contentByCourse: Record<string, any[]> = {};
    const modulesByCourse: Record<
      string,
      Array<{
        moduleNumber: number;
        title: string;
        contents: any[];
      }>
    > = {};

    for (const course of courseList) {
      const owner =
        course.departmentId.toString() === behavioral._id.toString()
          ? instructorStaff._id
          : course.departmentId.toString() === emdr._id.toString()
            ? deptAdminStaff._id
            : contentStaff._id;

      const courseModules: Array<{
        moduleNumber: number;
        title: string;
        contents: any[];
      }> = [];
      const allContent: any[] = [];
      let sequence = 1;

      for (const [moduleIndex, moduleTemplate] of moduleTemplates.entries()) {
        const moduleNumber = moduleIndex + 1;
        const moduleContents: any[] = [];
        let sectionNumber = 1;

        for (const contentType of moduleTemplate.types) {
          const content = await ensureContent({
            title: `${course.code} M${moduleNumber} ${moduleTemplate.title} - ${contentLabels[contentType]}`,
            description: `${moduleTemplate.title} content for ${course.name}`,
            type: contentType,
            courseId: course._id,
            createdBy: owner
          });

          await ensureCourseContent({
            courseId: course._id,
            contentId: content._id,
            sequence,
            moduleNumber,
            sectionNumber,
            isRequired: contentType !== 'document'
          });

          moduleContents.push(content);
          allContent.push(content);
          sequence += 1;
          sectionNumber += 1;
        }

        if (course.code === 'CBT101' && moduleNumber === 3) {
          const scorm = await ensureContent({
            title: `${course.code} M${moduleNumber} ${moduleTemplate.title} - ${contentLabels.scorm}`,
            description: `Interactive SCORM lab for ${course.name}`,
            type: 'scorm',
            courseId: course._id,
            createdBy: owner
          });

          await ensureCourseContent({
            courseId: course._id,
            contentId: scorm._id,
            sequence,
            moduleNumber,
            sectionNumber,
            isRequired: true
          });

          moduleContents.push(scorm);
          allContent.push(scorm);
          sequence += 1;
        }

        courseModules.push({
          moduleNumber,
          title: moduleTemplate.title,
          contents: moduleContents
        });
      }

      contentByCourse[course._id.toString()] = allContent;
      modulesByCourse[course._id.toString()] = courseModules;
    }

    console.log('Creating question banks and questions...');
    for (const course of courseList) {
      const bank = await ensureQuestionBank({
        name: `${course.code} Assessment Bank`,
        description: `Question bank for ${course.name}`,
        departmentId: course.departmentId,
        tags: [course.code.toLowerCase(), 'assessment']
      });

      if (bank.questionIds && bank.questionIds.length >= 12) {
        continue;
      }

      const createdQuestions = [] as mongoose.Types.ObjectId[];
      for (let index = 0; index < 12; index += 1) {
        const moduleNumber = (index % moduleTemplates.length) + 1;
        const questionType = index % 3 === 0 ? 'multiple-choice' : index % 3 === 1 ? 'true-false' : 'short-answer';
        const options =
          questionType === 'multiple-choice'
            ? ['Option A', 'Option B', 'Option C', 'Option D']
            : questionType === 'true-false'
              ? ['True', 'False']
              : undefined;

        const question = await Question.create({
          questionText: `Module ${moduleNumber} question ${index + 1} for ${course.code}`,
          questionType,
          departmentId: course.departmentId,
          points: 10,
          options,
          correctAnswer: questionType === 'multiple-choice' ? 'Option A' : questionType === 'true-false' ? 'True' : 'Sample answer',
          difficulty: 'medium',
          tags: [course.code.toLowerCase(), `module-${moduleNumber}`, 'seeded']
        });
        createdQuestions.push(question._id);
      }

      bank.questionIds = createdQuestions;
      await bank.save();
    }

    console.log('Creating enrollments...');
    await ensureEnrollment({
      learnerId: learnerOne._id,
      programId: programCBT._id,
      academicYearId: academicYear._id,
      status: 'active'
    });

    await ensureEnrollment({
      learnerId: learnerTwo._id,
      programId: programEMDR._id,
      academicYearId: academicYear._id,
      status: 'active'
    });

    await ensureEnrollment({
      learnerId: learnerThree._id,
      programId: programEMDR._id,
      academicYearId: academicYear._id,
      status: 'active'
    });

    await ensureEnrollment({
      learnerId: learnerFour._id,
      programId: programCBT._id,
      academicYearId: academicYear._id,
      status: 'active'
    });

    console.log('Creating class enrollments...');
    const classEnrollmentAssignments = [
      { learner: learnerOne, classItem: classCBT101 },
      { learner: learnerOne, classItem: classBH101 },
      { learner: learnerOne, classItem: classCBT201 },
      { learner: learnerTwo, classItem: classBH101 },
      { learner: learnerTwo, classItem: classEMDR101 },
      { learner: learnerTwo, classItem: classBH201 },
      { learner: learnerThree, classItem: classEMDR101 },
      { learner: learnerThree, classItem: classEMDR201 },
      { learner: learnerThree, classItem: classCBT101 },
      { learner: learnerFour, classItem: classBH101 },
      { learner: learnerFour, classItem: classBH201 },
      { learner: learnerFour, classItem: classCBT101 }
    ];

    const enrollmentCounts = new Map<string, number>();

    for (const assignment of classEnrollmentAssignments) {
      await ensureClassEnrollment({
        learnerId: assignment.learner._id,
        classId: assignment.classItem._id,
        status: 'active'
      });

      const key = assignment.classItem._id.toString();
      enrollmentCounts.set(key, (enrollmentCounts.get(key) || 0) + 1);
    }

    for (const classItem of [
      classBH101,
      classBH201,
      classCBT101,
      classCBT201,
      classEMDR101,
      classEMDR201
    ]) {
      classItem.currentEnrollment = enrollmentCounts.get(classItem._id.toString()) || 0;
      await classItem.save();
    }

    console.log('Creating learning activity...');
    const learners = [learnerOne, learnerTwo, learnerThree, learnerFour];
    const classes = [
      classBH101,
      classBH201,
      classCBT101,
      classCBT201,
      classEMDR101,
      classEMDR201
    ];
    const courseById = new Map(courseList.map(course => [course._id.toString(), course]));
    const classByCourseId = new Map(classes.map(classItem => [classItem.courseId.toString(), classItem]));
    const coursesByLearner = new Map<string, Set<string>>();

    for (const assignment of classEnrollmentAssignments) {
      const key = assignment.learner._id.toString();
      const courseId = assignment.classItem.courseId.toString();
      if (!coursesByLearner.has(key)) {
        coursesByLearner.set(key, new Set());
      }
      coursesByLearner.get(key)!.add(courseId);
    }

    for (const learner of learners) {
      const learnerCourseIds = Array.from(coursesByLearner.get(learner._id.toString()) || []);

      for (const courseId of learnerCourseIds) {
        const course = courseById.get(courseId);
        if (!course) {
          continue;
        }

        const classItem = classByCourseId.get(courseId);
        const modules = modulesByCourse[courseId] || [];
        const completedModules = randomInt(1, modules.length);

        await LearningEvent.create({
          learnerId: learner._id,
          eventType: 'course-started',
          classId: classItem?._id,
          courseId: course._id,
          departmentId: course.departmentId,
          timestamp: randomDateWithinDays(30)
        });

        for (const module of modules) {
          const moduleStartedAt = randomDateWithinDays(20);
          await LearningEvent.create({
            learnerId: learner._id,
            eventType: 'module-started',
            classId: classItem?._id,
            courseId: course._id,
            departmentId: course.departmentId,
            timestamp: moduleStartedAt
          });

          const isCompleted = module.moduleNumber <= completedModules;
          for (const contentItem of module.contents) {
            if (!isCompleted && contentItem.type === 'quiz') {
              continue;
            }

            const startedAt = randomDateWithinDays(18);
            const completedAt = isCompleted ? randomDateWithinDays(10) : undefined;
            const score = contentItem.type === 'quiz' || contentItem.type === 'scorm' ? randomInt(70, 98) : undefined;

            await ContentAttempt.create({
              contentId: contentItem._id,
              learnerId: learner._id,
              status: isCompleted ? 'completed' : 'in-progress',
              attemptNumber: 1,
              progressPercent: isCompleted ? 100 : randomInt(10, 75),
              score,
              timeSpentSeconds: randomInt(600, 3600),
              startedAt,
              completedAt
            });

            await LearningEvent.create({
              learnerId: learner._id,
              eventType: 'content-started',
              classId: classItem?._id,
              contentId: contentItem._id,
              courseId: course._id,
              departmentId: course.departmentId,
              contentType: contentItem.type,
              timestamp: startedAt
            });

            if (contentItem.type === 'video') {
              await LearningEvent.create({
                learnerId: learner._id,
                eventType: 'video-played',
                classId: classItem?._id,
                contentId: contentItem._id,
                courseId: course._id,
                departmentId: course.departmentId,
                contentType: contentItem.type,
                timestamp: startedAt
              });
            }

            if (isCompleted) {
              await LearningEvent.create({
                learnerId: learner._id,
                eventType: 'content-completed',
                classId: classItem?._id,
                contentId: contentItem._id,
                courseId: course._id,
                departmentId: course.departmentId,
                contentType: contentItem.type,
                timestamp: completedAt || randomDateWithinDays(8),
                score
              });
            }

            if (contentItem.type === 'quiz' && isCompleted) {
              await LearningEvent.create({
                learnerId: learner._id,
                eventType: 'assessment-submitted',
                classId: classItem?._id,
                contentId: contentItem._id,
                courseId: course._id,
                departmentId: course.departmentId,
                timestamp: completedAt || randomDateWithinDays(9),
                score
              });

              await LearningEvent.create({
                learnerId: learner._id,
                eventType: 'assessment-completed',
                classId: classItem?._id,
                contentId: contentItem._id,
                courseId: course._id,
                departmentId: course.departmentId,
                timestamp: completedAt || randomDateWithinDays(9),
                score
              });

              await ExamResult.create({
                examId: contentItem._id,
                learnerId: learner._id,
                attemptNumber: 1,
                status: 'completed',
                score: score || 85,
                maxScore: 100,
                percentage: score || 85,
                passed: (score || 0) >= 70,
                startedAt,
                submittedAt: completedAt
              });
            }

            if (contentItem.type === 'scorm' && isCompleted) {
              await ScormAttempt.create({
                contentId: contentItem._id,
                learnerId: learner._id,
                attemptNumber: 1,
                scormVersion: '1.2',
                status: 'completed',
                scoreRaw: score || 85,
                scoreMin: 0,
                scoreMax: 100,
                progressMeasure: 1,
                startedAt,
                completedAt
              });

              await LearningEvent.create({
                learnerId: learner._id,
                eventType: 'scorm-completed',
                classId: classItem?._id,
                contentId: contentItem._id,
                courseId: course._id,
                departmentId: course.departmentId,
                timestamp: completedAt || randomDateWithinDays(8),
                score
              });
            }
          }

          if (isCompleted) {
            await LearningEvent.create({
              learnerId: learner._id,
              eventType: 'module-completed',
              classId: classItem?._id,
              courseId: course._id,
              departmentId: course.departmentId,
              timestamp: randomDateWithinDays(7)
            });
          }
        }

        if (completedModules === modules.length) {
          await LearningEvent.create({
            learnerId: learner._id,
            eventType: 'course-completed',
            classId: classItem?._id,
            courseId: course._id,
            departmentId: course.departmentId,
            timestamp: randomDateWithinDays(3)
          });
        }
      }
    }

    console.log('');
    console.log('Mock data seeded successfully.');
    console.log('');
    console.log('Users created (password):');
    console.log(`  - ${ADMIN_EMAIL} (${ADMIN_PASSWORD})`);
    console.log(`  - john.instructor@lms.edu (${DEFAULT_PASSWORD})`);
    console.log(`  - maria.content@lms.edu (${DEFAULT_PASSWORD})`);
    console.log(`  - sam.department@lms.edu (${DEFAULT_PASSWORD})`);
    console.log(`  - riley.instructor@lms.edu (${DEFAULT_PASSWORD})`);
    console.log(`  - taylor.billing@lms.edu (${DEFAULT_PASSWORD})`);
    console.log(`  - alex.learner@lms.edu (${DEFAULT_PASSWORD})`);
    console.log(`  - jordan.student@lms.edu (${DEFAULT_PASSWORD})`);
    console.log(`  - casey.learner@lms.edu (${DEFAULT_PASSWORD})`);
    console.log(`  - jamie.student@lms.edu (${DEFAULT_PASSWORD})`);
    console.log('');
  } catch (error) {
    console.error('Error seeding mock data:', error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

if (require.main === module) {
  main();
}

export default main;
