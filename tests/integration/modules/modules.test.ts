/**
 * Modules API Integration Tests
 *
 * Tests the modules API endpoints under /api/v2/courses/:courseId/modules
 * Modules are logical groupings of learning units within a course.
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '@/app';
import Module from '@/models/academic/Module.model';
import Course from '@/models/academic/Course.model';
import Department from '@/models/organization/Department.model';
import { LookupValue } from '@/models/LookupValue.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Modules API Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let testDepartment: any;
  let testCourse: any;
  let testUserId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create course-status lookup values required by Course model
    await LookupValue.create({
      category: 'course-status',
      key: 'draft',
      displayAs: 'Draft',
      sortOrder: 1,
      isActive: true
    });

    await LookupValue.create({
      category: 'course-status',
      key: 'published',
      displayAs: 'Published',
      sortOrder: 2,
      isActive: true
    });

    // Create test department
    testDepartment = await Department.create({
      name: 'Test Department',
      code: 'TEST' + Date.now(),
      level: 0,
      path: [],
      isActive: true
    });

    // Register a staff user with content permissions
    const registerResponse = await request(app)
      .post('/api/v2/auth/register/staff')
      .send({
        email: 'modules-test@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        roles: ['department-admin']
      });

    authToken = registerResponse.body.data?.accessToken;
    testUserId = registerResponse.body.data?.user?._id || registerResponse.body.data?.user?.id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Create a test course for each test
    testCourse = await Course.create({
      name: 'Test Course',
      code: 'TC' + Date.now(),
      description: 'A test course for module testing',
      departmentId: testDepartment._id,
      credits: 3,
      status: 'draft',
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(testUserId)
    });
  });

  afterEach(async () => {
    await Module.deleteMany({});
    await Course.deleteMany({ code: /^TC/ });
  });

  // =========================================================================
  // List Modules Tests
  // =========================================================================
  describe('GET /api/v2/courses/:courseId/modules', () => {
    describe('successful listing', () => {
      it('should list all modules in a course', async () => {
        // Create test modules
        await Module.create([
          {
            courseId: testCourse._id,
            title: 'Module 1',
            description: 'First module',
            order: 1,
            isPublished: true,
            completionCriteria: { type: 'all_required', requireAllExpositions: true },
            presentationRules: {
              presentationMode: 'prescribed',
              repetitionMode: 'none',
              repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
              repeatableCategories: [],
              showAllAvailable: true,
              allowSkip: false
            },
            createdBy: new mongoose.Types.ObjectId(testUserId)
          },
          {
            courseId: testCourse._id,
            title: 'Module 2',
            description: 'Second module',
            order: 2,
            isPublished: false,
            completionCriteria: { type: 'all_required', requireAllExpositions: true },
            presentationRules: {
              presentationMode: 'learner_choice',
              repetitionMode: 'none',
              repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
              repeatableCategories: [],
              showAllAvailable: true,
              allowSkip: false
            },
            createdBy: new mongoose.Types.ObjectId(testUserId)
          }
        ]);

        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.modules).toHaveLength(2);
        expect(response.body.data.pagination).toBeDefined();
        expect(response.body.data.pagination.total).toBe(2);
      });

      it('should return modules ordered by order field', async () => {
        await Module.create([
          {
            courseId: testCourse._id,
            title: 'Third Module',
            order: 3,
            completionCriteria: { type: 'all_required' },
            presentationRules: {
              presentationMode: 'prescribed',
              repetitionMode: 'none',
              repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
              repeatableCategories: [],
              showAllAvailable: true,
              allowSkip: false
            },
            createdBy: new mongoose.Types.ObjectId(testUserId)
          },
          {
            courseId: testCourse._id,
            title: 'First Module',
            order: 1,
            completionCriteria: { type: 'all_required' },
            presentationRules: {
              presentationMode: 'prescribed',
              repetitionMode: 'none',
              repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
              repeatableCategories: [],
              showAllAvailable: true,
              allowSkip: false
            },
            createdBy: new mongoose.Types.ObjectId(testUserId)
          },
          {
            courseId: testCourse._id,
            title: 'Second Module',
            order: 2,
            completionCriteria: { type: 'all_required' },
            presentationRules: {
              presentationMode: 'prescribed',
              repetitionMode: 'none',
              repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
              repeatableCategories: [],
              showAllAvailable: true,
              allowSkip: false
            },
            createdBy: new mongoose.Types.ObjectId(testUserId)
          }
        ]);

        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules[0].title).toBe('First Module');
        expect(response.body.data.modules[1].title).toBe('Second Module');
        expect(response.body.data.modules[2].title).toBe('Third Module');
      });

      it('should return empty array when course has no modules', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules).toHaveLength(0);
        expect(response.body.data.pagination.total).toBe(0);
      });
    });

    describe('filtering', () => {
      beforeEach(async () => {
        await Module.create([
          {
            courseId: testCourse._id,
            title: 'Published Module',
            order: 1,
            isPublished: true,
            completionCriteria: { type: 'all_required' },
            presentationRules: {
              presentationMode: 'prescribed',
              repetitionMode: 'none',
              repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
              repeatableCategories: [],
              showAllAvailable: true,
              allowSkip: false
            },
            createdBy: new mongoose.Types.ObjectId(testUserId)
          },
          {
            courseId: testCourse._id,
            title: 'Unpublished Module',
            order: 2,
            isPublished: false,
            completionCriteria: { type: 'all_required' },
            presentationRules: {
              presentationMode: 'prescribed',
              repetitionMode: 'none',
              repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
              repeatableCategories: [],
              showAllAvailable: true,
              allowSkip: false
            },
            createdBy: new mongoose.Types.ObjectId(testUserId)
          }
        ]);
      });

      it('should filter by isPublished=true', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules?isPublished=true`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules).toHaveLength(1);
        expect(response.body.data.modules[0].title).toBe('Published Module');
        expect(response.body.data.modules[0].isPublished).toBe(true);
      });

      it('should filter by isPublished=false', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules?isPublished=false`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules).toHaveLength(1);
        expect(response.body.data.modules[0].title).toBe('Unpublished Module');
        expect(response.body.data.modules[0].isPublished).toBe(false);
      });
    });

    describe('pagination', () => {
      beforeEach(async () => {
        // Create 15 modules for pagination testing
        const modules = [];
        for (let i = 1; i <= 15; i++) {
          modules.push({
            courseId: testCourse._id,
            title: `Module ${i}`,
            order: i,
            completionCriteria: { type: 'all_required' },
            presentationRules: {
              presentationMode: 'prescribed',
              repetitionMode: 'none',
              repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
              repeatableCategories: [],
              showAllAvailable: true,
              allowSkip: false
            },
            createdBy: new mongoose.Types.ObjectId(testUserId)
          });
        }
        await Module.create(modules);
      });

      it('should paginate results with default limit', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules).toHaveLength(10);
        expect(response.body.data.pagination.total).toBe(15);
        expect(response.body.data.pagination.totalPages).toBe(2);
        expect(response.body.data.pagination.hasNext).toBe(true);
        expect(response.body.data.pagination.hasPrev).toBe(false);
      });

      it('should paginate with custom limit', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules?limit=5`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules).toHaveLength(5);
        expect(response.body.data.pagination.totalPages).toBe(3);
      });

      it('should return second page', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules?page=2&limit=5`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules).toHaveLength(5);
        expect(response.body.data.pagination.hasPrev).toBe(true);
        expect(response.body.data.pagination.hasNext).toBe(true);
        expect(response.body.data.modules[0].title).toBe('Module 6');
      });

      it('should return last page correctly', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules?page=3&limit=5`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules).toHaveLength(5);
        expect(response.body.data.pagination.hasPrev).toBe(true);
        expect(response.body.data.pagination.hasNext).toBe(false);
      });

      it('should reject page less than 1', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules?page=0`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });

      it('should reject limit greater than 100', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules?limit=101`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });
    });

    describe('sorting', () => {
      beforeEach(async () => {
        await Module.create([
          {
            courseId: testCourse._id,
            title: 'Alpha Module',
            order: 2,
            completionCriteria: { type: 'all_required' },
            presentationRules: {
              presentationMode: 'prescribed',
              repetitionMode: 'none',
              repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
              repeatableCategories: [],
              showAllAvailable: true,
              allowSkip: false
            },
            createdBy: new mongoose.Types.ObjectId(testUserId)
          },
          {
            courseId: testCourse._id,
            title: 'Beta Module',
            order: 1,
            completionCriteria: { type: 'all_required' },
            presentationRules: {
              presentationMode: 'prescribed',
              repetitionMode: 'none',
              repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
              repeatableCategories: [],
              showAllAvailable: true,
              allowSkip: false
            },
            createdBy: new mongoose.Types.ObjectId(testUserId)
          }
        ]);
      });

      it('should sort by order (default)', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules[0].title).toBe('Beta Module');
        expect(response.body.data.modules[1].title).toBe('Alpha Module');
      });

      it('should sort by title ascending', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules?sort=title`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules[0].title).toBe('Alpha Module');
        expect(response.body.data.modules[1].title).toBe('Beta Module');
      });

      it('should sort by title descending', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules?sort=-title`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.modules[0].title).toBe('Beta Module');
        expect(response.body.data.modules[1].title).toBe('Alpha Module');
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules`);

        expect(response.status).toBe(401);
      });

      it('should return 401 with invalid token', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Get Single Module Tests
  // =========================================================================
  describe('GET /api/v2/courses/:courseId/modules/:moduleId', () => {
    let testModule: any;

    beforeEach(async () => {
      testModule = await Module.create({
        courseId: testCourse._id,
        title: 'Test Module',
        description: 'A test module',
        order: 1,
        isPublished: true,
        estimatedDuration: 60,
        objectives: ['Learn testing', 'Understand modules'],
        completionCriteria: {
          type: 'percentage',
          percentageRequired: 80,
          requireAllExpositions: true
        },
        presentationRules: {
          presentationMode: 'learner_choice',
          repetitionMode: 'until_mastery',
          masteryThreshold: 85,
          maxRepetitions: 3,
          repeatOn: { failedAttempt: true, belowMastery: true, learnerRequest: false },
          repeatableCategories: ['practice', 'assessment'],
          showAllAvailable: true,
          allowSkip: false
        },
        createdBy: new mongoose.Types.ObjectId(testUserId)
      });
    });

    describe('successful retrieval', () => {
      it('should return module with valid ID', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(testModule._id.toString());
        expect(response.body.data.title).toBe('Test Module');
        expect(response.body.data.description).toBe('A test module');
        expect(response.body.data.estimatedDuration).toBe(60);
        expect(response.body.data.objectives).toEqual(['Learn testing', 'Understand modules']);
      });

      it('should include completionCriteria in response', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.completionCriteria).toBeDefined();
        expect(response.body.data.completionCriteria.type).toBe('percentage');
        expect(response.body.data.completionCriteria.percentageRequired).toBe(80);
        expect(response.body.data.completionCriteria.requireAllExpositions).toBe(true);
      });

      it('should include presentationRules in response', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.presentationRules).toBeDefined();
        expect(response.body.data.presentationRules.presentationMode).toBe('learner_choice');
        expect(response.body.data.presentationRules.repetitionMode).toBe('until_mastery');
        expect(response.body.data.presentationRules.masteryThreshold).toBe(85);
      });

      it('should include learningUnits array in response', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.learningUnits).toBeDefined();
        expect(Array.isArray(response.body.data.learningUnits)).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should return 400 for invalid module ID format', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules/invalid-id`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should return 404 for non-existent module', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });

      it('should return 404 when module belongs to different course', async () => {
        // Create another course
        const otherCourse = await Course.create({
          name: 'Other Course',
          code: 'OC' + Date.now(),
          departmentId: testDepartment._id,
          credits: 2,
          status: 'draft',
          isActive: true
        });

        const response = await request(app)
          .get(`/api/v2/courses/${otherCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .get(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Create Module Tests
  // =========================================================================
  describe('POST /api/v2/courses/:courseId/modules', () => {
    describe('successful creation', () => {
      it('should create module with minimal required fields', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'New Module'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe('New Module');
        expect(response.body.data.courseId).toBe(testCourse._id.toString());
        expect(response.body.data.order).toBe(1);
        expect(response.body.data.isPublished).toBe(false);
      });

      it('should create module with all fields', async () => {
        const moduleData = {
          title: 'Complete Module',
          description: 'A fully specified module',
          isPublished: true,
          estimatedDuration: 120,
          objectives: ['Objective 1', 'Objective 2'],
          availableFrom: '2026-02-01T00:00:00.000Z',
          availableUntil: '2026-12-31T23:59:59.000Z',
          completionCriteria: {
            type: 'percentage',
            percentageRequired: 75,
            requireAllExpositions: true
          },
          presentationRules: {
            presentationMode: 'learner_choice',
            repetitionMode: 'until_passed',
            masteryThreshold: 80,
            maxRepetitions: 5,
            repeatOn: {
              failedAttempt: true,
              belowMastery: true,
              learnerRequest: true
            },
            repeatableCategories: ['practice', 'assessment'],
            showAllAvailable: true,
            allowSkip: false
          }
        };

        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(moduleData);

        expect(response.status).toBe(201);
        expect(response.body.data.title).toBe('Complete Module');
        expect(response.body.data.description).toBe('A fully specified module');
        expect(response.body.data.isPublished).toBe(true);
        expect(response.body.data.estimatedDuration).toBe(120);
        expect(response.body.data.objectives).toEqual(['Objective 1', 'Objective 2']);
        expect(response.body.data.completionCriteria.type).toBe('percentage');
        expect(response.body.data.completionCriteria.percentageRequired).toBe(75);
        expect(response.body.data.presentationRules.presentationMode).toBe('learner_choice');
      });

      it('should auto-assign order number', async () => {
        // Create first module
        await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'First Module' });

        // Create second module
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Second Module' });

        expect(response.status).toBe(201);
        expect(response.body.data.order).toBe(2);
      });

      it('should apply default completionCriteria when not provided', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Module with defaults' });

        expect(response.status).toBe(201);
        expect(response.body.data.completionCriteria.type).toBe('all_required');
      });

      it('should apply default presentationRules when not provided', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Module with defaults' });

        expect(response.status).toBe(201);
        expect(response.body.data.presentationRules.presentationMode).toBe('prescribed');
        expect(response.body.data.presentationRules.repetitionMode).toBe('none');
      });
    });

    describe('validation errors', () => {
      it('should return 422 when title is missing', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(422);
        expect(response.body.success).toBe(false);
      });

      it('should return 422 when title is empty', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: '' });

        expect(response.status).toBe(422);
      });

      it('should return 422 when title exceeds 200 characters', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'A'.repeat(201) });

        expect(response.status).toBe(422);
      });

      it('should return 422 when description exceeds 2000 characters', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            description: 'A'.repeat(2001)
          });

        expect(response.status).toBe(422);
      });

      it('should return 422 for negative estimatedDuration', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            estimatedDuration: -1
          });

        expect(response.status).toBe(422);
      });
    });

    describe('completionCriteria validation', () => {
      it('should return 422 for invalid completionCriteria type', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            completionCriteria: {
              type: 'invalid_type'
            }
          });

        expect(response.status).toBe(422);
      });

      it('should accept valid percentage completionCriteria', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Percentage Module',
            completionCriteria: {
              type: 'percentage',
              percentageRequired: 80
            }
          });

        expect(response.status).toBe(201);
        expect(response.body.data.completionCriteria.type).toBe('percentage');
        expect(response.body.data.completionCriteria.percentageRequired).toBe(80);
      });

      it('should return 422 for percentageRequired out of range', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Invalid Percentage',
            completionCriteria: {
              type: 'percentage',
              percentageRequired: 150
            }
          });

        expect(response.status).toBe(422);
      });

      it('should accept valid points completionCriteria', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Points Module',
            completionCriteria: {
              type: 'points',
              pointsRequired: 100
            }
          });

        expect(response.status).toBe(201);
        expect(response.body.data.completionCriteria.type).toBe('points');
      });
    });

    describe('presentationRules validation', () => {
      it('should return 422 for invalid presentationMode', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            presentationRules: {
              presentationMode: 'invalid_mode'
            }
          });

        expect(response.status).toBe(422);
      });

      it('should return 422 for invalid repetitionMode', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Valid Title',
            presentationRules: {
              presentationMode: 'learner_choice',
              repetitionMode: 'invalid_mode'
            }
          });

        expect(response.status).toBe(422);
      });

      it('should accept valid presentationRules', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Presentation Rules Module',
            presentationRules: {
              presentationMode: 'random',
              repetitionMode: 'spaced',
              masteryThreshold: 90,
              showAllAvailable: false,
              allowSkip: true
            }
          });

        expect(response.status).toBe(201);
        expect(response.body.data.presentationRules.presentationMode).toBe('random');
        expect(response.body.data.presentationRules.repetitionMode).toBe('spaced');
      });

      it('should return 422 for masteryThreshold out of range', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Invalid Mastery',
            presentationRules: {
              presentationMode: 'learner_choice',
              masteryThreshold: 101
            }
          });

        expect(response.status).toBe(422);
      });

      it('should return 422 for invalid repeatableCategories', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Invalid Categories',
            presentationRules: {
              presentationMode: 'learner_choice',
              repeatableCategories: ['invalid_category']
            }
          });

        expect(response.status).toBe(422);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .send({ title: 'Unauthorized Module' });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Update Module Tests
  // =========================================================================
  describe('PUT /api/v2/courses/:courseId/modules/:moduleId', () => {
    let testModule: any;

    beforeEach(async () => {
      testModule = await Module.create({
        courseId: testCourse._id,
        title: 'Original Title',
        description: 'Original description',
        order: 1,
        isPublished: false,
        estimatedDuration: 30,
        completionCriteria: { type: 'all_required', requireAllExpositions: true },
        presentationRules: {
          presentationMode: 'prescribed',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        createdBy: new mongoose.Types.ObjectId(testUserId)
      });
    });

    describe('successful updates', () => {
      it('should update title', async () => {
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Updated Title' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe('Updated Title');
        expect(response.body.data.description).toBe('Original description');
      });

      it('should perform partial update', async () => {
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            description: 'Updated description',
            estimatedDuration: 60
          });

        expect(response.status).toBe(200);
        expect(response.body.data.title).toBe('Original Title');
        expect(response.body.data.description).toBe('Updated description');
        expect(response.body.data.estimatedDuration).toBe(60);
      });

      it('should perform full update', async () => {
        const fullUpdate = {
          title: 'Fully Updated Module',
          description: 'New description',
          isPublished: true,
          estimatedDuration: 90,
          objectives: ['New objective'],
          completionCriteria: {
            type: 'percentage',
            percentageRequired: 85
          },
          presentationRules: {
            presentationMode: 'random',
            repetitionMode: 'until_mastery',
            masteryThreshold: 90,
            repeatOn: { failedAttempt: true, belowMastery: true, learnerRequest: false },
            repeatableCategories: ['assessment'],
            showAllAvailable: false,
            allowSkip: true
          }
        };

        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(fullUpdate);

        expect(response.status).toBe(200);
        expect(response.body.data.title).toBe('Fully Updated Module');
        expect(response.body.data.isPublished).toBe(true);
        expect(response.body.data.completionCriteria.type).toBe('percentage');
        expect(response.body.data.presentationRules.presentationMode).toBe('random');
      });

      it('should update isPublished status', async () => {
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ isPublished: true });

        expect(response.status).toBe(200);
        expect(response.body.data.isPublished).toBe(true);
      });

      it('should update availability dates', async () => {
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            availableFrom: '2026-03-01T00:00:00.000Z',
            availableUntil: '2026-06-30T23:59:59.000Z'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.availableFrom).toBeDefined();
        expect(response.body.data.availableUntil).toBeDefined();
      });

      it('should clear availableFrom by setting to null', async () => {
        // First set a date
        await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ availableFrom: '2026-03-01T00:00:00.000Z' });

        // Then clear it
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ availableFrom: null });

        expect(response.status).toBe(200);
        expect(response.body.data.availableFrom).toBeNull();
      });
    });

    describe('error handling', () => {
      it('should return 400 for invalid module ID', async () => {
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/invalid-id`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Update' });

        expect(response.status).toBe(400);
      });

      it('should return 404 for non-existent module', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Update' });

        expect(response.status).toBe(404);
      });

      it('should return 404 when module belongs to different course', async () => {
        const otherCourse = await Course.create({
          name: 'Other Course',
          code: 'OC2' + Date.now(),
          departmentId: testDepartment._id,
          credits: 2,
          status: 'draft',
          isActive: true
        });

        const response = await request(app)
          .put(`/api/v2/courses/${otherCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Update' });

        expect(response.status).toBe(404);
      });

      it('should return 422 for invalid title length', async () => {
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'A'.repeat(201) });

        expect(response.status).toBe(422);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .send({ title: 'Update' });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Delete Module Tests
  // =========================================================================
  describe('DELETE /api/v2/courses/:courseId/modules/:moduleId', () => {
    let testModule: any;

    beforeEach(async () => {
      testModule = await Module.create({
        courseId: testCourse._id,
        title: 'Module to Delete',
        order: 1,
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'prescribed',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        createdBy: new mongoose.Types.ObjectId(testUserId)
      });
    });

    describe('successful deletion', () => {
      it('should delete module (soft delete)', async () => {
        const response = await request(app)
          .delete(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('deleted');

        // Verify module is deleted
        const deletedModule = await Module.findById(testModule._id);
        expect(deletedModule).toBeNull();
      });

      it('should delete correct module from multiple', async () => {
        // Create additional modules
        const module2 = await Module.create({
          courseId: testCourse._id,
          title: 'Keep This Module',
          order: 2,
          completionCriteria: { type: 'all_required' },
          presentationRules: {
            presentationMode: 'prescribed',
            repetitionMode: 'none',
            repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
            repeatableCategories: [],
            showAllAvailable: true,
            allowSkip: false
          },
          createdBy: new mongoose.Types.ObjectId(testUserId)
        });

        const response = await request(app)
          .delete(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);

        // Verify only the correct module was deleted
        const remainingModules = await Module.find({ courseId: testCourse._id });
        expect(remainingModules).toHaveLength(1);
        expect(remainingModules[0]._id.toString()).toBe(module2._id.toString());
      });
    });

    describe('error handling', () => {
      it('should return 400 for invalid module ID', async () => {
        const response = await request(app)
          .delete(`/api/v2/courses/${testCourse._id}/modules/invalid-id`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });

      it('should return 404 for non-existent module', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .delete(`/api/v2/courses/${testCourse._id}/modules/${nonExistentId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });

      it('should return 404 when module belongs to different course', async () => {
        const otherCourse = await Course.create({
          name: 'Other Course',
          code: 'OC3' + Date.now(),
          departmentId: testDepartment._id,
          credits: 2,
          status: 'draft',
          isActive: true
        });

        const response = await request(app)
          .delete(`/api/v2/courses/${otherCourse._id}/modules/${testModule._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .delete(`/api/v2/courses/${testCourse._id}/modules/${testModule._id}`);

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Reorder Modules Tests
  // =========================================================================
  describe('PATCH /api/v2/courses/:courseId/modules/reorder', () => {
    let modules: any[];

    beforeEach(async () => {
      // Create three modules
      modules = await Module.create([
        {
          courseId: testCourse._id,
          title: 'Module A',
          order: 1,
          completionCriteria: { type: 'all_required' },
          presentationRules: {
            presentationMode: 'prescribed',
            repetitionMode: 'none',
            repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
            repeatableCategories: [],
            showAllAvailable: true,
            allowSkip: false
          },
          createdBy: new mongoose.Types.ObjectId(testUserId)
        },
        {
          courseId: testCourse._id,
          title: 'Module B',
          order: 2,
          completionCriteria: { type: 'all_required' },
          presentationRules: {
            presentationMode: 'prescribed',
            repetitionMode: 'none',
            repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
            repeatableCategories: [],
            showAllAvailable: true,
            allowSkip: false
          },
          createdBy: new mongoose.Types.ObjectId(testUserId)
        },
        {
          courseId: testCourse._id,
          title: 'Module C',
          order: 3,
          completionCriteria: { type: 'all_required' },
          presentationRules: {
            presentationMode: 'prescribed',
            repetitionMode: 'none',
            repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
            repeatableCategories: [],
            showAllAvailable: true,
            allowSkip: false
          },
          createdBy: new mongoose.Types.ObjectId(testUserId)
        }
      ]);
    });

    describe('successful reordering', () => {
      it('should reorder modules', async () => {
        // Reverse the order: C, B, A
        const newOrder = [
          modules[2]._id.toString(),
          modules[1]._id.toString(),
          modules[0]._id.toString()
        ];

        const response = await request(app)
          .patch(`/api/v2/courses/${testCourse._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleIds: newOrder });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify new order
        const reorderedModules = await Module.find({ courseId: testCourse._id }).sort({ order: 1 });
        expect(reorderedModules[0].title).toBe('Module C');
        expect(reorderedModules[0].order).toBe(1);
        expect(reorderedModules[1].title).toBe('Module B');
        expect(reorderedModules[1].order).toBe(2);
        expect(reorderedModules[2].title).toBe('Module A');
        expect(reorderedModules[2].order).toBe(3);
      });

      it('should reorder with partial swap', async () => {
        // Swap B and C: A, C, B
        const newOrder = [
          modules[0]._id.toString(),
          modules[2]._id.toString(),
          modules[1]._id.toString()
        ];

        const response = await request(app)
          .patch(`/api/v2/courses/${testCourse._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleIds: newOrder });

        expect(response.status).toBe(200);

        const reorderedModules = await Module.find({ courseId: testCourse._id }).sort({ order: 1 });
        expect(reorderedModules[0].title).toBe('Module A');
        expect(reorderedModules[1].title).toBe('Module C');
        expect(reorderedModules[2].title).toBe('Module B');
      });
    });

    describe('validation errors', () => {
      it('should return 422 when moduleIds is not provided', async () => {
        const response = await request(app)
          .patch(`/api/v2/courses/${testCourse._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(422);
      });

      it('should return 422 when moduleIds is empty array', async () => {
        const response = await request(app)
          .patch(`/api/v2/courses/${testCourse._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleIds: [] });

        expect(response.status).toBe(422);
      });

      it('should return 400 when moduleIds is not an array', async () => {
        const response = await request(app)
          .patch(`/api/v2/courses/${testCourse._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ moduleIds: 'not-an-array' });

        expect(response.status).toBe(422);
      });

      it('should return 400 when not all modules are included', async () => {
        // Only include two of three modules
        const response = await request(app)
          .patch(`/api/v2/courses/${testCourse._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            moduleIds: [
              modules[0]._id.toString(),
              modules[1]._id.toString()
            ]
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 when invalid module ID is included', async () => {
        const invalidId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .patch(`/api/v2/courses/${testCourse._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            moduleIds: [
              modules[0]._id.toString(),
              modules[1]._id.toString(),
              invalidId.toString()
            ]
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 when module from different course is included', async () => {
        // Create module in different course
        const otherCourse = await Course.create({
          name: 'Other Course',
          code: 'OC4' + Date.now(),
          departmentId: testDepartment._id,
          credits: 2,
          status: 'draft',
          isActive: true
        });

        const otherModule = await Module.create({
          courseId: otherCourse._id,
          title: 'Other Module',
          order: 1,
          completionCriteria: { type: 'all_required' },
          presentationRules: {
            presentationMode: 'prescribed',
            repetitionMode: 'none',
            repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
            repeatableCategories: [],
            showAllAvailable: true,
            allowSkip: false
          },
          createdBy: new mongoose.Types.ObjectId(testUserId)
        });

        const response = await request(app)
          .patch(`/api/v2/courses/${testCourse._id}/modules/reorder`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            moduleIds: [
              modules[0]._id.toString(),
              modules[1]._id.toString(),
              otherModule._id.toString()
            ]
          });

        expect(response.status).toBe(400);
      });
    });

    describe('authorization', () => {
      it('should return 401 without auth token', async () => {
        const response = await request(app)
          .patch(`/api/v2/courses/${testCourse._id}/modules/reorder`)
          .send({
            moduleIds: [
              modules[0]._id.toString(),
              modules[1]._id.toString(),
              modules[2]._id.toString()
            ]
          });

        expect(response.status).toBe(401);
      });
    });
  });

  // =========================================================================
  // Prerequisites Tests
  // =========================================================================
  describe('Prerequisites', () => {
    let moduleA: any;
    let moduleB: any;

    beforeEach(async () => {
      moduleA = await Module.create({
        courseId: testCourse._id,
        title: 'Module A',
        order: 1,
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'prescribed',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        createdBy: new mongoose.Types.ObjectId(testUserId)
      });

      moduleB = await Module.create({
        courseId: testCourse._id,
        title: 'Module B',
        order: 2,
        prerequisites: [moduleA._id],
        completionCriteria: { type: 'all_required' },
        presentationRules: {
          presentationMode: 'prescribed',
          repetitionMode: 'none',
          repeatOn: { failedAttempt: false, belowMastery: false, learnerRequest: false },
          repeatableCategories: [],
          showAllAvailable: true,
          allowSkip: false
        },
        createdBy: new mongoose.Types.ObjectId(testUserId)
      });
    });

    describe('create with prerequisites', () => {
      it('should create module with valid prerequisites', async () => {
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Module C',
            prerequisites: [moduleA._id.toString(), moduleB._id.toString()]
          });

        expect(response.status).toBe(201);
        expect(response.body.data.prerequisites).toContain(moduleA._id.toString());
        expect(response.body.data.prerequisites).toContain(moduleB._id.toString());
      });

      it('should return 400 for non-existent prerequisite', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Module with Invalid Prereq',
            prerequisites: [nonExistentId.toString()]
          });

        expect(response.status).toBe(400);
      });
    });

    describe('update prerequisites', () => {
      it('should update module prerequisites', async () => {
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${moduleB._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            prerequisites: []
          });

        expect(response.status).toBe(200);
        expect(response.body.data.prerequisites).toHaveLength(0);
      });

      it('should add prerequisite to module', async () => {
        // Create Module C without prerequisites
        const createResponse = await request(app)
          .post(`/api/v2/courses/${testCourse._id}/modules`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Module C' });

        const moduleC = createResponse.body.data;

        // Update to add prerequisite
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${moduleC.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            prerequisites: [moduleA._id.toString()]
          });

        expect(response.status).toBe(200);
        expect(response.body.data.prerequisites).toContain(moduleA._id.toString());
      });
    });

    describe('circular dependency prevention', () => {
      it('should prevent module from being its own prerequisite', async () => {
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${moduleA._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            prerequisites: [moduleA._id.toString()]
          });

        expect(response.status).toBe(400);
      });

      it('should prevent circular prerequisites (A -> B -> A)', async () => {
        // moduleB already has moduleA as prerequisite
        // Try to make moduleA depend on moduleB
        const response = await request(app)
          .put(`/api/v2/courses/${testCourse._id}/modules/${moduleA._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            prerequisites: [moduleB._id.toString()]
          });

        expect(response.status).toBe(400);
      });
    });
  });
});
