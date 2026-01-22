/**
 * Seed Sample Modules for Learning Unit System
 *
 * Creates sample modules, learning units, and assessments for development/testing.
 * Links modules to existing test courses created by seed-mock-data.
 *
 * This script is idempotent - safe to run multiple times.
 * It will skip existing records and only create missing ones.
 *
 * Usage:
 *   npx ts-node scripts/seeds/seed-sample-modules.ts
 *   npm run seed:modules
 *
 * Prerequisites:
 *   - Run seed-mock-data.ts first to create courses and departments
 *
 * @module scripts/seeds/seed-sample-modules
 */

import mongoose from 'mongoose';
import { loadEnv } from '../utils/load-env';

// Load environment variables
loadEnv();

// Models
import Course from '../../src/models/academic/Course.model';
import Module from '../../src/models/academic/Module.model';
import LearningUnit from '../../src/models/content/LearningUnit.model';
import Assessment from '../../src/models/content/Assessment.model';
import QuestionBank from '../../src/models/assessment/QuestionBank.model';
import Department from '../../src/models/organization/Department.model';
import { User } from '../../src/models/auth/User.model';

// Configuration
const config = {
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_mock'
};

interface SeedStats {
  modulesCreated: number;
  modulesSkipped: number;
  learningUnitsCreated: number;
  learningUnitsSkipped: number;
  assessmentsCreated: number;
  assessmentsSkipped: number;
  errors: string[];
}

/**
 * Get or create a user for seeded content
 */
async function getAdminUserId(): Promise<mongoose.Types.ObjectId | null> {
  const adminUser = await User.findOne({ email: 'admin@lms.edu' });
  return adminUser ? adminUser._id : null;
}

/**
 * Get a question bank for the department
 */
async function getQuestionBankId(departmentId: mongoose.Types.ObjectId): Promise<string | null> {
  const bank = await QuestionBank.findOne({ departmentId, isActive: true });
  return bank ? bank._id.toString() : null;
}

/**
 * Check if a module already exists
 */
async function moduleExists(courseId: mongoose.Types.ObjectId, title: string): Promise<boolean> {
  const existing = await Module.findOne({ courseId, title });
  return !!existing;
}

/**
 * Check if a learning unit already exists
 */
async function learningUnitExists(moduleId: mongoose.Types.ObjectId, title: string): Promise<boolean> {
  const existing = await LearningUnit.findOne({ moduleId, title });
  return !!existing;
}

/**
 * Check if an assessment already exists
 */
async function assessmentExists(departmentId: mongoose.Types.ObjectId, title: string): Promise<boolean> {
  const existing = await Assessment.findOne({ departmentId, title });
  return !!existing;
}

/**
 * Create sample modules for a course
 */
async function createSampleModulesForCourse(
  course: any,
  adminUserId: mongoose.Types.ObjectId | null,
  stats: SeedStats
): Promise<mongoose.Types.ObjectId[]> {
  const moduleIds: mongoose.Types.ObjectId[] = [];

  // Define module templates
  const moduleTemplates = [
    {
      title: 'Introduction & Foundations',
      description: 'Foundational concepts and theory',
      order: 1,
      completionType: 'all_required' as const,
      presentationMode: 'prescribed' as const,
      estimatedDuration: 120 // 2 hours
    },
    {
      title: 'Core Concepts & Practice',
      description: 'Deep dive into core concepts with hands-on practice',
      order: 2,
      completionType: 'percentage' as const,
      presentationMode: 'learner_choice' as const,
      estimatedDuration: 180 // 3 hours
    },
    {
      title: 'Assessment & Mastery',
      description: 'Assessment-focused module to verify understanding',
      order: 3,
      completionType: 'gate_learning_unit' as const,
      presentationMode: 'prescribed' as const,
      estimatedDuration: 90 // 1.5 hours
    }
  ];

  for (const template of moduleTemplates) {
    const fullTitle = `${course.code} - ${template.title}`;

    // Check if module already exists
    if (await moduleExists(course._id, fullTitle)) {
      console.log(`    Skipping module: ${fullTitle} (already exists)`);
      stats.modulesSkipped++;

      // Get existing module ID for learning units
      const existingModule = await Module.findOne({ courseId: course._id, title: fullTitle });
      if (existingModule) {
        moduleIds.push(existingModule._id);
      }
      continue;
    }

    try {
      const moduleData = {
        courseId: course._id,
        title: fullTitle,
        description: template.description,
        prerequisites: template.order > 1 ? moduleIds.slice(-1) : [], // Previous module as prerequisite
        completionCriteria: {
          type: template.completionType,
          percentageRequired: template.completionType === 'percentage' ? 80 : undefined,
          gateLearningUnitScore: template.completionType === 'gate_learning_unit' ? 70 : undefined,
          requireAllExpositions: template.completionType === 'all_required' ? true : undefined
        },
        presentationRules: {
          presentationMode: template.presentationMode,
          repetitionMode: 'until_passed' as const,
          masteryThreshold: 80,
          maxRepetitions: 3,
          cooldownBetweenRepetitions: 60, // 1 hour
          repeatOn: {
            failedAttempt: true,
            belowMastery: true,
            learnerRequest: true
          },
          repeatableCategories: ['practice', 'assessment'] as const,
          showAllAvailable: template.presentationMode === 'learner_choice',
          allowSkip: template.presentationMode === 'learner_choice'
        },
        isPublished: true,
        estimatedDuration: template.estimatedDuration,
        objectives: [
          `Understand ${template.title.toLowerCase()} concepts`,
          `Apply ${template.title.toLowerCase()} principles`,
          `Demonstrate mastery of ${template.title.toLowerCase()}`
        ],
        order: template.order,
        createdBy: adminUserId
      };

      const newModule = await Module.create(moduleData);
      moduleIds.push(newModule._id);
      stats.modulesCreated++;
      console.log(`    Created module: ${fullTitle}`);

    } catch (error) {
      const errMsg = `Failed to create module ${fullTitle}: ${error}`;
      console.error(`    Error: ${errMsg}`);
      stats.errors.push(errMsg);
    }
  }

  return moduleIds;
}

/**
 * Create sample learning units for a module
 */
async function createSampleLearningUnitsForModule(
  module: any,
  course: any,
  stats: SeedStats
): Promise<void> {
  // Determine learning unit types based on module position
  const moduleOrder = module.order || 1;

  let unitTemplates: Array<{
    titleSuffix: string;
    type: 'scorm' | 'custom' | 'exercise' | 'video' | 'document' | 'assessment';
    category: 'exposition' | 'practice' | 'assessment';
    isRequired: boolean;
    isReplayable: boolean;
    weight: number;
  }>;

  if (moduleOrder === 1) {
    // Introduction module: mostly exposition
    unitTemplates = [
      { titleSuffix: 'Overview Video', type: 'video', category: 'exposition', isRequired: true, isReplayable: true, weight: 0 },
      { titleSuffix: 'Core Reading', type: 'document', category: 'exposition', isRequired: true, isReplayable: true, weight: 0 },
      { titleSuffix: 'Terminology Exercise', type: 'exercise', category: 'practice', isRequired: false, isReplayable: true, weight: 10 },
      { titleSuffix: 'Quick Check Quiz', type: 'assessment', category: 'assessment', isRequired: true, isReplayable: false, weight: 20 }
    ];
  } else if (moduleOrder === 2) {
    // Core concepts module: mix of all types
    unitTemplates = [
      { titleSuffix: 'Lecture Video', type: 'video', category: 'exposition', isRequired: true, isReplayable: true, weight: 0 },
      { titleSuffix: 'Case Study Reading', type: 'document', category: 'exposition', isRequired: true, isReplayable: true, weight: 0 },
      { titleSuffix: 'Interactive SCORM Module', type: 'scorm', category: 'practice', isRequired: true, isReplayable: true, weight: 15 },
      { titleSuffix: 'Practice Exercise', type: 'exercise', category: 'practice', isRequired: false, isReplayable: true, weight: 15 },
      { titleSuffix: 'Application Exercise', type: 'exercise', category: 'practice', isRequired: true, isReplayable: true, weight: 20 },
      { titleSuffix: 'Progress Quiz', type: 'assessment', category: 'assessment', isRequired: true, isReplayable: false, weight: 25 }
    ];
  } else {
    // Assessment module: heavy on assessments
    unitTemplates = [
      { titleSuffix: 'Review Summary', type: 'document', category: 'exposition', isRequired: true, isReplayable: true, weight: 0 },
      { titleSuffix: 'Comprehensive Practice', type: 'exercise', category: 'practice', isRequired: true, isReplayable: true, weight: 20 },
      { titleSuffix: 'Final Exam', type: 'assessment', category: 'assessment', isRequired: true, isReplayable: false, weight: 50 }
    ];
  }

  let sequence = 1;
  for (const template of unitTemplates) {
    const fullTitle = `${module.title} - ${template.titleSuffix}`;

    // Check if learning unit already exists
    if (await learningUnitExists(module._id, fullTitle)) {
      console.log(`      Skipping learning unit: ${template.titleSuffix} (already exists)`);
      stats.learningUnitsSkipped++;
      sequence++;
      continue;
    }

    try {
      const unitData = {
        moduleId: module._id,
        title: fullTitle,
        description: `${template.titleSuffix} for ${module.title}`,
        type: template.type,
        category: template.category,
        isRequired: template.isRequired,
        isReplayable: template.isReplayable,
        weight: template.weight,
        sequence,
        isActive: true,
        settings: template.type === 'assessment' ? {
          allowMultipleAttempts: true,
          maxAttempts: 3,
          timeLimit: 60, // 60 minutes
          showFeedback: true,
          shuffleQuestions: true,
          passingScore: 70
        } : template.type === 'exercise' ? {
          allowMultipleAttempts: true,
          maxAttempts: null, // unlimited
          showFeedback: true
        } : undefined,
        estimatedDuration: template.type === 'video' ? 30 :
                          template.type === 'document' ? 20 :
                          template.type === 'scorm' ? 45 :
                          template.type === 'exercise' ? 25 :
                          template.type === 'assessment' ? 60 : 30,
        metadata: {
          seededBy: 'seed-sample-modules',
          seededAt: new Date()
        },
        createdBy: module.createdBy
      };

      await LearningUnit.create(unitData);
      stats.learningUnitsCreated++;
      console.log(`      Created learning unit: ${template.titleSuffix}`);
      sequence++;

    } catch (error) {
      const errMsg = `Failed to create learning unit ${fullTitle}: ${error}`;
      console.error(`      Error: ${errMsg}`);
      stats.errors.push(errMsg);
    }
  }
}

/**
 * Create sample assessments for a department
 */
async function createSampleAssessmentsForDepartment(
  department: any,
  questionBankId: string | null,
  adminUserId: mongoose.Types.ObjectId | null,
  stats: SeedStats
): Promise<void> {
  if (!questionBankId) {
    console.log(`    No question bank found for department ${department.code}, skipping assessments`);
    return;
  }

  const assessmentTemplates = [
    {
      title: `${department.code} Knowledge Check Quiz`,
      style: 'quiz' as const,
      questionCount: 10,
      timeLimit: 15,
      passingScore: 70,
      maxAttempts: 3
    },
    {
      title: `${department.code} Module Assessment`,
      style: 'quiz' as const,
      questionCount: 15,
      timeLimit: 30,
      passingScore: 75,
      maxAttempts: 2
    },
    {
      title: `${department.code} Comprehensive Exam`,
      style: 'exam' as const,
      questionCount: 30,
      timeLimit: 90,
      passingScore: 80,
      maxAttempts: 1
    }
  ];

  for (const template of assessmentTemplates) {
    // Check if assessment already exists
    if (await assessmentExists(department._id, template.title)) {
      console.log(`    Skipping assessment: ${template.title} (already exists)`);
      stats.assessmentsSkipped++;
      continue;
    }

    try {
      const assessmentData = {
        departmentId: department._id,
        title: template.title,
        description: `${template.style === 'exam' ? 'Comprehensive examination' : 'Knowledge assessment'} for ${department.name}`,
        style: template.style,
        questionSelection: {
          questionBankIds: [questionBankId],
          questionCount: template.questionCount,
          selectionMode: 'random' as const
        },
        timing: {
          timeLimit: template.timeLimit,
          showTimer: true,
          autoSubmitOnExpiry: true
        },
        attempts: {
          maxAttempts: template.maxAttempts,
          cooldownMinutes: template.maxAttempts > 1 ? 60 : 0,
          retakePolicy: template.maxAttempts > 1 ? 'after_cooldown' as const : 'instructor_unlock' as const
        },
        scoring: {
          passingScore: template.passingScore,
          showScore: true,
          showCorrectAnswers: template.style === 'quiz' ? 'after_submit' as const : 'after_all_attempts' as const,
          partialCredit: true
        },
        feedback: {
          showFeedback: true,
          feedbackTiming: template.style === 'quiz' ? 'immediate' as const : 'after_submit' as const,
          showExplanations: template.style === 'quiz'
        },
        isPublished: true,
        isArchived: false,
        createdBy: adminUserId
      };

      await Assessment.create(assessmentData);
      stats.assessmentsCreated++;
      console.log(`    Created assessment: ${template.title}`);

    } catch (error) {
      const errMsg = `Failed to create assessment ${template.title}: ${error}`;
      console.error(`    Error: ${errMsg}`);
      stats.errors.push(errMsg);
    }
  }
}

/**
 * Main seed function
 */
async function seedSampleModules(): Promise<SeedStats> {
  const stats: SeedStats = {
    modulesCreated: 0,
    modulesSkipped: 0,
    learningUnitsCreated: 0,
    learningUnitsSkipped: 0,
    assessmentsCreated: 0,
    assessmentsSkipped: 0,
    errors: []
  };

  console.log('');
  console.log('Step 1: Finding courses to seed modules for...');

  // Find published courses to create modules for
  const courses = await Course.find({
    isActive: true,
    status: 'published'
  }).sort({ code: 1 });

  if (courses.length === 0) {
    console.log('  No published courses found. Run seed-mock-data.ts first.');
    return stats;
  }

  console.log(`  Found ${courses.length} courses`);

  // Get admin user ID
  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    console.log('  Warning: Admin user not found, modules will be created without createdBy');
  }

  // Create modules for each course
  console.log('');
  console.log('Step 2: Creating modules and learning units for each course...');

  for (const course of courses) {
    console.log(`  Processing course: ${course.code} - ${course.name}`);

    // Create modules
    const moduleIds = await createSampleModulesForCourse(course, adminUserId, stats);

    // Create learning units for each module
    for (const moduleId of moduleIds) {
      const module = await Module.findById(moduleId);
      if (module) {
        await createSampleLearningUnitsForModule(module, course, stats);
      }
    }
  }

  // Create assessments for each department
  console.log('');
  console.log('Step 3: Creating sample assessments for departments...');

  const departments = await Department.find({
    isActive: true,
    code: { $ne: 'MASTER' } // Skip master department
  });

  for (const department of departments) {
    console.log(`  Processing department: ${department.code}`);
    const questionBankId = await getQuestionBankId(department._id);
    await createSampleAssessmentsForDepartment(department, questionBankId, adminUserId, stats);
  }

  return stats;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('  Seed Sample Modules');
  console.log('  Learning Unit System - Development Data');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log(`  Connected to ${config.mongoUri}`);

    // Run seeding
    const stats = await seedSampleModules();

    // Print summary
    console.log('');
    console.log('='.repeat(60));
    console.log('  Seeding Complete!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Summary:');
    console.log(`  Modules created: ${stats.modulesCreated}`);
    console.log(`  Modules skipped: ${stats.modulesSkipped}`);
    console.log(`  Learning units created: ${stats.learningUnitsCreated}`);
    console.log(`  Learning units skipped: ${stats.learningUnitsSkipped}`);
    console.log(`  Assessments created: ${stats.assessmentsCreated}`);
    console.log(`  Assessments skipped: ${stats.assessmentsSkipped}`);
    console.log(`  Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('');
      console.log('Errors encountered:');
      stats.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }

    console.log('');

  } catch (error) {
    console.error('');
    console.error('Seeding failed:', error);
    console.error('');
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Export for programmatic use
export { seedSampleModules, createSampleModulesForCourse, createSampleLearningUnitsForModule, createSampleAssessmentsForDepartment };

// Run the script if executed directly
if (require.main === module) {
  main();
}
