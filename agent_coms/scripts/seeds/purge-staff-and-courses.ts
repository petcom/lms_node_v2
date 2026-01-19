/**
 * Purge Staff and Courses Test Data
 *
 * Removes all test data created by seed-staff-and-courses.ts
 * Identifies records by ObjectId pattern starting with 'feedface'
 */

import mongoose from 'mongoose';

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

async function connectDB() {
  try {
    await mongoose.connect(DB_URI);
    console.log(`✓ Connected to database: ${DB_URI}`);
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    process.exit(1);
  }
}

async function purgeTestData() {
  console.log('\n🗑️  Purging test data (IDs starting with "feedface")...\n');

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

    console.log('📊 PURGE RESULTS:');
    console.log(`  • Users: ${userResult.deletedCount}`);
    console.log(`  • Staff: ${staffResult.deletedCount}`);
    console.log(`  • Departments: ${deptResult.deletedCount}`);
    console.log(`  • Courses: ${courseResult.deletedCount}`);
    console.log(`  • Content Items: ${contentResult.deletedCount}`);
    console.log(`  • Course-Content Links: ${courseContentResult.deletedCount}`);
    console.log(`  • Questions: ${questionResult.deletedCount}`);

    const totalDeleted =
      userResult.deletedCount +
      staffResult.deletedCount +
      deptResult.deletedCount +
      courseResult.deletedCount +
      contentResult.deletedCount +
      courseContentResult.deletedCount +
      questionResult.deletedCount;

    console.log(`\n✅ Total records purged: ${totalDeleted}`);

    if (totalDeleted === 0) {
      console.log('\nℹ️  No test data found to purge.');
    }
  } catch (error) {
    console.error('\n✗ Purge failed:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🧹 Starting test data purge...\n');

    await connectDB();
    await purgeTestData();

    // Close connection
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Purge failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
main();
