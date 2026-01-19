/**
 * Purge Mock Data Script (Current LMS V2 Schema)
 *
 * Removes all data from the mock database. Supports confirmation prompts
 * and optional full database drop.
 */

import mongoose from 'mongoose';
import * as readline from 'readline';

import { loadEnv } from './utils/load-env';

import { User } from '../src/models/auth/User.model';
import { Learner } from '../src/models/auth/Learner.model';
import { Staff } from '../src/models/auth/Staff.model';
import { GlobalAdmin } from '../src/models/GlobalAdmin.model';
import Department from '../src/models/organization/Department.model';
import AcademicYear from '../src/models/academic/AcademicYear.model';
import Program from '../src/models/academic/Program.model';
import Course from '../src/models/academic/Course.model';
import Class from '../src/models/academic/Class.model';
import Content from '../src/models/content/Content.model';
import CourseContent from '../src/models/content/CourseContent.model';
import Question from '../src/models/assessment/Question.model';
import QuestionBank from '../src/models/assessment/QuestionBank.model';
import Enrollment from '../src/models/enrollment/Enrollment.model';
import ClassEnrollment from '../src/models/enrollment/ClassEnrollment.model';
import EnrollmentActivity from '../src/models/EnrollmentActivity.model';
import ContentAttempt from '../src/models/content/ContentAttempt.model';
import LearningEvent from '../src/models/activity/LearningEvent.model';
import ExamResult from '../src/models/activity/ExamResult.model';
import ScormAttempt from '../src/models/activity/ScormAttempt.model';
import { AccessRight } from '../src/models/AccessRight.model';
import { RoleDefinition } from '../src/models/RoleDefinition.model';
import { LookupValue } from '../src/models/LookupValue.model';
import Setting from '../src/models/system/Setting.model';
import Permission from '../src/models/system/Permission.model';
import RolePermission from '../src/models/system/RolePermission.model';
import { AuditLog } from '../src/models/system/AuditLog.model';
import { Report } from '../src/models/system/Report.model';
import ReportJob from '../src/models/reports/ReportJob.model';
import ReportTemplate from '../src/models/reports/ReportTemplate.model';
import ReportSchedule from '../src/models/reports/ReportSchedule.model';
import GradeChangeLog from '../src/models/audit/GradeChangeLog.model';

loadEnv();

const DB_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MOCK_DB_URI ||
  'mongodb://localhost:27017/lms_mock';

const collections = [
  { name: 'Report Jobs', model: ReportJob },
  { name: 'Report Templates', model: ReportTemplate },
  { name: 'Report Schedules', model: ReportSchedule },
  { name: 'Reports', model: Report },
  { name: 'Audit Logs', model: AuditLog },
  { name: 'Grade Change Logs', model: GradeChangeLog },
  { name: 'Role Permissions', model: RolePermission },
  { name: 'Permissions', model: Permission },
  { name: 'Settings', model: Setting },
  { name: 'Access Rights', model: AccessRight },
  { name: 'Role Definitions', model: RoleDefinition },
  { name: 'Lookup Values', model: LookupValue },
  { name: 'SCORM Attempts', model: ScormAttempt },
  { name: 'Exam Results', model: ExamResult },
  { name: 'Learning Events', model: LearningEvent },
  { name: 'Content Attempts', model: ContentAttempt },
  { name: 'Enrollment Activities', model: EnrollmentActivity },
  { name: 'Class Enrollments', model: ClassEnrollment },
  { name: 'Enrollments', model: Enrollment },
  { name: 'Questions', model: Question },
  { name: 'Question Banks', model: QuestionBank },
  { name: 'Course Content', model: CourseContent },
  { name: 'Content', model: Content },
  { name: 'Classes', model: Class },
  { name: 'Programs', model: Program },
  { name: 'Courses', model: Course },
  { name: 'Academic Years', model: AcademicYear },
  { name: 'Global Admins', model: GlobalAdmin },
  { name: 'Learners', model: Learner },
  { name: 'Staff', model: Staff },
  { name: 'Users', model: User },
  { name: 'Departments', model: Department }
];

async function connectDB() {
  try {
    await mongoose.connect(DB_URI);
    console.log(`Connected to mock database: ${DB_URI}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

async function promptConfirmation(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(
      `\nWARNING: This will DELETE ALL data from ${DB_URI}\n` +
        'Are you sure you want to continue? (yes/no): ',
      answer => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes');
      }
    );
  });
}

async function purgeCollection(name: string, model: any) {
  try {
    const result = await model.deleteMany({});
    console.log(`   Deleted ${result.deletedCount.toLocaleString()} ${name}`);
    return result.deletedCount;
  } catch (error) {
    console.error(`   Error deleting ${name}:`, error);
    return 0;
  }
}

async function purgeAllData() {
  console.log('\nPurging mock data...\n');

  let totalDeleted = 0;

  for (const collection of collections) {
    const deleted = await purgeCollection(collection.name, collection.model);
    totalDeleted += deleted;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total records deleted: ${totalDeleted.toLocaleString()}`);
  console.log('='.repeat(60) + '\n');
}

async function dropDatabase() {
  try {
    console.log('\nDropping entire database...');
    await mongoose.connection.dropDatabase();
    console.log('Database dropped successfully\n');
  } catch (error) {
    console.error('Error dropping database:', error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force') || args.includes('-f');
  const dropDb = args.includes('--drop-db');

  try {
    console.log('Mock Data Purge Script (Current LMS V2 Schema)\n');

    await connectDB();

    const userCount = await User.countDocuments();

    if (userCount === 0) {
      console.log('INFO: Database is already empty. Nothing to purge.');
      process.exit(0);
    }

    console.log(`INFO: Found ${userCount} users in database`);

    if (!force) {
      const confirmed = await promptConfirmation();
      if (!confirmed) {
        console.log('\nPurge cancelled by user');
        process.exit(0);
      }
    }

    if (dropDb) {
      await dropDatabase();
    } else {
      await purgeAllData();
    }

    console.log('Mock data purge completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\nError purging mock data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default main;
