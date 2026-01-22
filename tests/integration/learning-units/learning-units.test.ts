import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/app';
import LearningUnit from '@/models/content/LearningUnit.model';
import Module from '@/models/academic/Module.model';
import Course from '@/models/academic/Course.model';
import Department from '@/models/organization/Department.model';
import { LookupValue } from '@/models/LookupValue.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Learning Units API', () => {
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let testDepartment: any;
  let testCourse: any;
  let testModule: any;
  let testModule2: any;
  let testUser: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create required lookup value for course status
    await LookupValue.create({
      category: 'course-status',
      key: 'draft',
      displayAs: 'Draft',
      sortOrder: 0,
      isActive: true
    });

    // Create test department
    testDepartment = await Department.create({
      name: 'Test Department',
      code: 'TESTDEPT',
      slug: 'test-department',
      isActive: true
    });

    // Seed role definitions
    await RoleDefinition.create({
      name: 'content-admin',
      userType: 'staff',
      displayName: 'Content Administrator',
      description: 'Can manage content',
      accessRights: ['content:courses:read', 'content:courses:manage', 'content:lessons:manage'],
      isActive: true
    });

    // Seed access rights
    await AccessRight.create([
      { name: 'content:courses:read', domain: 'content', resource: 'courses', action: 'read', description: 'Read courses', isActive: true },
      { name: 'content:courses:manage', domain: 'content', resource: 'courses', action: 'manage', description: 'Manage courses', isActive: true },
      { name: 'content:lessons:manage', domain: 'content', resource: 'lessons', action: 'manage', description: 'Manage lessons', isActive: true }
    ]);

    // Create test user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    testUser = await User.create({
      email: 'learning-units-test@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true
    });

    await Staff.create({
      _id: testUser._id,
      person: {
        firstName: 'Test',
        lastName: 'User',
        emails: [{
          email: testUser.email,
          type: 'institutional',
          isPrimary: true,
          verified: true,
          allowNotifications: true
        }],
        phones: [],
        addresses: [],
        timezone: 'America/New_York',
        languagePreference: 'en'
      },
      departmentMemberships: [{
        departmentId: testDepartment._id,
        roles: ['content-admin'],
        isPrimary: true,
        isActive: true,
        joinedAt: new Date()
      }]
    });

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser._id.toString(), email: testUser.email, roles: ['staff'], type: 'access' },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Create test course
    testCourse = await Course.create({
      name: 'Test Course',
      code: 'TESTCRS' + Date.now(),
      departmentId: testDepartment._id,
      credits: 3,
      status: 'draft',
      isActive: true,
      createdBy: testUser._id
    });

    // Create test module
    testModule = await Module.create({
      courseId: testCourse._id,
      title: 'Test Module 1',
      description: 'Test module for learning units',
      completionCriteria: {
        type: 'all_required'
      },
      presentationRules: {
        presentationMode: 'prescribed',
        repetitionMode: 'none',
        repeatOn: {
          failedAttempt: false,
          belowMastery: false,
          learnerRequest: false
        },
        repeatableCategories: [],
        showAllAvailable: true,
        allowSkip: false
      },
      isPublished: true,
      estimatedDuration: 60,
      order: 1,
      createdBy: testUser._id
    });

    // Create second test module for move tests
    testModule2 = await Module.create({
      courseId: testCourse._id,
      title: 'Test Module 2',
      description: 'Second test module for move tests',
      completionCriteria: {
        type: 'all_required'
      },
      presentationRules: {
        presentationMode: 'prescribed',
        repetitionMode: 'none',
        repeatOn: {
          failedAttempt: false,
          belowMastery: false,
          learnerRequest: false
        },
        repeatableCategories: [],
        showAllAvailable: true,
        allowSkip: false
      },
      isPublished: true,
      estimatedDuration: 45,
      order: 2,
      createdBy: testUser._id
    });
  });

  afterEach(async () => {
    await LearningUnit.deleteMany({});
    await Module.deleteMany({});
    await Course.deleteMany({});
  });

  describe('GET /api/v2/modules/:moduleId/learning-units', () => {
    beforeEach(async () => {
      // Create some learning units for listing tests
      await LearningUnit.create([
        {
          moduleId: testModule._id,
          title: 'Introduction Video',
          description: 'Overview of the module',
          type: 'video',
          category: 'exposition',
          isRequired: true,
          isReplayable: true,
          weight: 10,
          sequence: 1,
          estimatedDuration: 15,
          isActive: true,
          createdBy: testUser._id
        },
        {
          moduleId: testModule._id,
          title: 'Practice Exercise 1',
          description: 'Practice what you learned',
          type: 'exercise',
          category: 'practice',
          isRequired: false,
          isReplayable: true,
          weight: 20,
          sequence: 2,
          estimatedDuration: 30,
          isActive: true,
          createdBy: testUser._id
        },
        {
          moduleId: testModule._id,
          title: 'Module Assessment',
          description: 'Test your knowledge',
          type: 'assessment',
          category: 'assessment',
          isRequired: true,
          isReplayable: false,
          weight: 50,
          sequence: 3,
          estimatedDuration: 45,
          isActive: true,
          createdBy: testUser._id
        },
        {
          moduleId: testModule._id,
          title: 'Optional Reading',
          description: 'Additional materials',
          type: 'document',
          category: 'exposition',
          isRequired: false,
          isReplayable: true,
          weight: 5,
          sequence: 4,
          estimatedDuration: 20,
          isActive: true,
          createdBy: testUser._id
        },
        {
          moduleId: testModule._id,
          title: 'Extra Practice',
          description: 'More practice exercises',
          type: 'exercise',
          category: 'practice',
          isRequired: true,
          isReplayable: true,
          weight: 15,
          sequence: 5,
          estimatedDuration: 25,
          isActive: true,
          createdBy: testUser._id
        }
      ]);
    });

    describe('basic listing', () => {
      it('should list all learning units in a module', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.learningUnits).toHaveLength(5);
        expect(response.body.data.pagination).toBeDefined();
        expect(response.body.data.pagination.total).toBe(5);
      });

      it('should return learning units in sequence order by default', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        const units = response.body.data.learningUnits;
        expect(units[0].title).toBe('Introduction Video');
        expect(units[1].title).toBe('Practice Exercise 1');
        expect(units[2].title).toBe('Module Assessment');
        expect(units[3].title).toBe('Optional Reading');
        expect(units[4].title).toBe('Extra Practice');
      });

      it('should return 400 for invalid module ID', async () => {
        const response = await request(app)
          .get('/api/v2/modules/invalid-id/learning-units')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });

      it('should return empty array for module with no learning units', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule2._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.learningUnits).toHaveLength(0);
        expect(response.body.data.pagination.total).toBe(0);
      });
    });

    describe('pagination', () => {
      it('should paginate results with limit', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/learning-units?limit=2`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.learningUnits).toHaveLength(2);
        expect(response.body.data.pagination.total).toBe(5);
        expect(response.body.data.pagination.totalPages).toBe(3);
        expect(response.body.data.pagination.hasNext).toBe(true);
        expect(response.body.data.pagination.hasPrev).toBe(false);
      });

      it('should return subsequent pages', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/learning-units?limit=2&page=2`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.learningUnits).toHaveLength(2);
        expect(response.body.data.pagination.page).toBe(2);
        expect(response.body.data.pagination.hasNext).toBe(true);
        expect(response.body.data.pagination.hasPrev).toBe(true);
      });

      it('should return last page correctly', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/learning-units?limit=2&page=3`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.learningUnits).toHaveLength(1);
        expect(response.body.data.pagination.hasNext).toBe(false);
        expect(response.body.data.pagination.hasPrev).toBe(true);
      });

      it('should return 400 for page less than 1', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/learning-units?page=0`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });

      it('should return 400 for limit greater than 100', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/learning-units?limit=101`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });
    });

    describe('filtering by category', () => {
      it('should filter by exposition category', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/learning-units?category=exposition`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.learningUnits).toHaveLength(2);
        response.body.data.learningUnits.forEach((unit: any) => {
          expect(unit.category).toBe('exposition');
        });
      });

      it('should filter by practice category', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/learning-units?category=practice`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.learningUnits).toHaveLength(2);
        response.body.data.learningUnits.forEach((unit: any) => {
          expect(unit.category).toBe('practice');
        });
      });

      it('should filter by assessment category', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/learning-units?category=assessment`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.learningUnits).toHaveLength(1);
        expect(response.body.data.learningUnits[0].category).toBe('assessment');
      });

      it('should return 400 for invalid category', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/learning-units?category=invalid`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      });
    });

    describe('filtering by isRequired', () => {
      it('should filter required learning units', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/learning-units?isRequired=true`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.learningUnits).toHaveLength(3);
        response.body.data.learningUnits.forEach((unit: any) => {
          expect(unit.isRequired).toBe(true);
        });
      });

      it('should filter optional learning units', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/learning-units?isRequired=false`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.learningUnits).toHaveLength(2);
        response.body.data.learningUnits.forEach((unit: any) => {
          expect(unit.isRequired).toBe(false);
        });
      });
    });

    describe('combined filters', () => {
      it('should combine category and isRequired filters', async () => {
        const response = await request(app)
          .get(`/api/v2/modules/${testModule._id}/learning-units?category=practice&isRequired=true`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.learningUnits).toHaveLength(1);
        expect(response.body.data.learningUnits[0].title).toBe('Extra Practice');
      });
    });
  });

  describe('GET /api/v2/modules/:moduleId/learning-units/:learningUnitId', () => {
    let testLearningUnit: any;

    beforeEach(async () => {
      testLearningUnit = await LearningUnit.create({
        moduleId: testModule._id,
        title: 'Test Learning Unit',
        description: 'A detailed description of this learning unit',
        type: 'video',
        category: 'exposition',
        isRequired: true,
        isReplayable: true,
        weight: 25,
        sequence: 1,
        estimatedDuration: 30,
        isActive: true,
        createdBy: testUser._id
      });
    });

    it('should return a learning unit by ID', async () => {
      const response = await request(app)
        .get(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testLearningUnit._id.toString());
      expect(response.body.data.title).toBe('Test Learning Unit');
      expect(response.body.data.description).toBe('A detailed description of this learning unit');
      expect(response.body.data.category).toBe('exposition');
      expect(response.body.data.contentType).toBe('video');
      expect(response.body.data.isRequired).toBe(true);
      expect(response.body.data.isReplayable).toBe(true);
      expect(response.body.data.weight).toBe(25);
      expect(response.body.data.sequence).toBe(1);
      expect(response.body.data.estimatedDuration).toBe(30);
    });

    it('should return 400 for invalid learning unit ID', async () => {
      const response = await request(app)
        .get(`/api/v2/modules/${testModule._id}/learning-units/invalid-id`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent learning unit ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v2/modules/${testModule._id}/learning-units/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 when learning unit belongs to different module', async () => {
      // Create a learning unit in module2
      const otherUnit = await LearningUnit.create({
        moduleId: testModule2._id,
        title: 'Other Module Unit',
        type: 'video',
        category: 'exposition',
        isRequired: true,
        isReplayable: false,
        weight: 10,
        sequence: 1,
        isActive: true,
        createdBy: testUser._id
      });

      const response = await request(app)
        .get(`/api/v2/modules/${testModule._id}/learning-units/${otherUnit._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found in this module');
    });
  });

  describe('POST /api/v2/modules/:moduleId/learning-units', () => {
    describe('creating exposition category', () => {
      it('should create an exposition learning unit with video type', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Introduction Video',
            description: 'Welcome to the module',
            category: 'exposition',
            contentType: 'video',
            isRequired: true,
            isReplayable: true,
            weight: 15,
            estimatedDuration: 20
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Learning unit created successfully');
        expect(response.body.data.title).toBe('Introduction Video');
        expect(response.body.data.category).toBe('exposition');
        expect(response.body.data.contentType).toBe('video');
        expect(response.body.data.sequence).toBe(1);
        expect(response.body.data.isActive).toBe(true);
      });

      it('should create an exposition learning unit with document type', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Course Reading Materials',
            description: 'Required reading for this module',
            category: 'exposition',
            contentType: 'document',
            isRequired: true,
            weight: 10
          });

        expect(response.status).toBe(201);
        expect(response.body.data.contentType).toBe('document');
        expect(response.body.data.category).toBe('exposition');
      });
    });

    describe('creating practice category', () => {
      it('should create a practice learning unit with exercise type', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Practice Exercise',
            description: 'Practice what you learned',
            category: 'practice',
            contentType: 'exercise',
            isRequired: false,
            isReplayable: true,
            weight: 20,
            estimatedDuration: 30
          });

        expect(response.status).toBe(201);
        expect(response.body.data.category).toBe('practice');
        expect(response.body.data.contentType).toBe('exercise');
        expect(response.body.data.isReplayable).toBe(true);
      });

      it('should create a practice learning unit with custom type', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Custom Practice Activity',
            category: 'practice',
            contentType: 'custom',
            isRequired: true,
            weight: 15
          });

        expect(response.status).toBe(201);
        expect(response.body.data.contentType).toBe('custom');
      });
    });

    describe('creating assessment category', () => {
      it('should create an assessment learning unit', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Module Quiz',
            description: 'Test your understanding',
            category: 'assessment',
            contentType: 'assessment',
            isRequired: true,
            isReplayable: false,
            weight: 50,
            estimatedDuration: 45
          });

        expect(response.status).toBe(201);
        expect(response.body.data.category).toBe('assessment');
        expect(response.body.data.contentType).toBe('assessment');
        expect(response.body.data.isReplayable).toBe(false);
        expect(response.body.data.weight).toBe(50);
      });
    });

    describe('various content types', () => {
      it('should create a SCORM learning unit', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'SCORM Package',
            category: 'exposition',
            contentType: 'scorm',
            isRequired: true,
            weight: 30
          });

        expect(response.status).toBe(201);
        expect(response.body.data.contentType).toBe('scorm');
      });

      it('should create learning unit with contentId reference', async () => {
        const contentId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Linked Content',
            category: 'exposition',
            contentType: 'video',
            contentId: contentId.toString(),
            isRequired: true,
            weight: 10
          });

        expect(response.status).toBe(201);
        expect(response.body.data.contentId).toBe(contentId.toString());
      });
    });

    describe('auto-sequencing', () => {
      it('should auto-assign sequence numbers', async () => {
        // Create first learning unit
        const response1 = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'First Unit',
            category: 'exposition',
            contentType: 'video',
            isRequired: true,
            weight: 10
          });

        expect(response1.body.data.sequence).toBe(1);

        // Create second learning unit
        const response2 = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Second Unit',
            category: 'practice',
            contentType: 'exercise',
            isRequired: true,
            weight: 20
          });

        expect(response2.body.data.sequence).toBe(2);

        // Create third learning unit
        const response3 = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Third Unit',
            category: 'assessment',
            contentType: 'assessment',
            isRequired: true,
            weight: 30
          });

        expect(response3.body.data.sequence).toBe(3);
      });
    });

    describe('validation errors', () => {
      it('should return 400 when title is missing', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            category: 'exposition',
            contentType: 'video'
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 when title exceeds 200 characters', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'A'.repeat(201),
            category: 'exposition',
            contentType: 'video'
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 when category is missing', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test Unit',
            contentType: 'video'
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 when category is invalid', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test Unit',
            category: 'invalid-category',
            contentType: 'video'
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 when contentType is missing', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test Unit',
            category: 'exposition'
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 when weight exceeds 100', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test Unit',
            category: 'exposition',
            contentType: 'video',
            weight: 101
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 when weight is negative', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test Unit',
            category: 'exposition',
            contentType: 'video',
            weight: -5
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 when description exceeds 2000 characters', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test Unit',
            description: 'A'.repeat(2001),
            category: 'exposition',
            contentType: 'video'
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 when estimatedDuration is negative', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test Unit',
            category: 'exposition',
            contentType: 'video',
            estimatedDuration: -10
          });

        expect(response.status).toBe(400);
      });

      it('should return 404 when module does not exist', async () => {
        const fakeModuleId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .post(`/api/v2/modules/${fakeModuleId}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test Unit',
            category: 'exposition',
            contentType: 'video'
          });

        expect(response.status).toBe(404);
      });
    });

    describe('default values', () => {
      it('should use default values for optional fields', async () => {
        const response = await request(app)
          .post(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Minimal Unit',
            category: 'exposition',
            contentType: 'video'
          });

        expect(response.status).toBe(201);
        expect(response.body.data.isRequired).toBe(true);
        expect(response.body.data.isReplayable).toBe(false);
        expect(response.body.data.weight).toBe(0);
        expect(response.body.data.isActive).toBe(true);
      });
    });
  });

  describe('PUT /api/v2/modules/:moduleId/learning-units/:learningUnitId', () => {
    let testLearningUnit: any;

    beforeEach(async () => {
      testLearningUnit = await LearningUnit.create({
        moduleId: testModule._id,
        title: 'Original Title',
        description: 'Original description',
        type: 'video',
        category: 'exposition',
        isRequired: true,
        isReplayable: false,
        weight: 20,
        sequence: 1,
        estimatedDuration: 30,
        isActive: true,
        createdBy: testUser._id
      });
    });

    describe('updating category', () => {
      it('should update category from exposition to practice', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            category: 'practice'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.category).toBe('practice');
      });

      it('should update category from exposition to assessment', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            category: 'assessment'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.category).toBe('assessment');
      });
    });

    describe('updating weight', () => {
      it('should update weight to new value', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            weight: 50
          });

        expect(response.status).toBe(200);
        expect(response.body.data.weight).toBe(50);
      });

      it('should update weight to zero', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            weight: 0
          });

        expect(response.status).toBe(200);
        expect(response.body.data.weight).toBe(0);
      });

      it('should return 400 when weight exceeds 100', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            weight: 150
          });

        expect(response.status).toBe(400);
      });
    });

    describe('updating isRequired and isReplayable flags', () => {
      it('should update isRequired from true to false', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            isRequired: false
          });

        expect(response.status).toBe(200);
        expect(response.body.data.isRequired).toBe(false);
      });

      it('should update isReplayable from false to true', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            isReplayable: true
          });

        expect(response.status).toBe(200);
        expect(response.body.data.isReplayable).toBe(true);
      });

      it('should update both flags simultaneously', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            isRequired: false,
            isReplayable: true
          });

        expect(response.status).toBe(200);
        expect(response.body.data.isRequired).toBe(false);
        expect(response.body.data.isReplayable).toBe(true);
      });
    });

    describe('updating other fields', () => {
      it('should update title', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Updated Title'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.title).toBe('Updated Title');
      });

      it('should update description', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            description: 'Updated description'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.description).toBe('Updated description');
      });

      it('should update contentType', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            contentType: 'document'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.contentType).toBe('document');
      });

      it('should update estimatedDuration', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            estimatedDuration: 60
          });

        expect(response.status).toBe(200);
        expect(response.body.data.estimatedDuration).toBe(60);
      });

      it('should update multiple fields at once', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Comprehensive Update',
            description: 'All new description',
            category: 'assessment',
            weight: 75,
            isRequired: false,
            isReplayable: true,
            estimatedDuration: 90
          });

        expect(response.status).toBe(200);
        expect(response.body.data.title).toBe('Comprehensive Update');
        expect(response.body.data.description).toBe('All new description');
        expect(response.body.data.category).toBe('assessment');
        expect(response.body.data.weight).toBe(75);
        expect(response.body.data.isRequired).toBe(false);
        expect(response.body.data.isReplayable).toBe(true);
        expect(response.body.data.estimatedDuration).toBe(90);
      });
    });

    describe('validation errors', () => {
      it('should return 400 for empty title', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: ''
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 for invalid category', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            category: 'invalid'
          });

        expect(response.status).toBe(400);
      });

      it('should return 404 for non-existent learning unit', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Updated'
          });

        expect(response.status).toBe(404);
      });

      it('should return 404 when learning unit belongs to different module', async () => {
        const otherUnit = await LearningUnit.create({
          moduleId: testModule2._id,
          title: 'Other Module Unit',
          type: 'video',
          category: 'exposition',
          isRequired: true,
          isReplayable: false,
          weight: 10,
          sequence: 1,
          isActive: true,
          createdBy: testUser._id
        });

        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${otherUnit._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Trying to update wrong module unit'
          });

        expect(response.status).toBe(404);
      });
    });
  });

  describe('DELETE /api/v2/modules/:moduleId/learning-units/:learningUnitId', () => {
    let testLearningUnit: any;

    beforeEach(async () => {
      testLearningUnit = await LearningUnit.create({
        moduleId: testModule._id,
        title: 'Unit to Delete',
        description: 'This unit will be deleted',
        type: 'video',
        category: 'exposition',
        isRequired: true,
        isReplayable: false,
        weight: 10,
        sequence: 1,
        isActive: true,
        createdBy: testUser._id
      });
    });

    it('should soft delete a learning unit', async () => {
      const response = await request(app)
        .delete(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Learning unit deleted successfully');

      // Verify soft delete
      const deletedUnit = await LearningUnit.findById(testLearningUnit._id);
      expect(deletedUnit).toBeTruthy();
      expect(deletedUnit!.isActive).toBe(false);
    });

    it('should not return deleted learning unit in list', async () => {
      // Delete the unit
      await request(app)
        .delete(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // List learning units
      const response = await request(app)
        .get(`/api/v2/modules/${testModule._id}/learning-units`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.learningUnits).toHaveLength(0);
    });

    it('should return 404 when trying to delete already deleted unit', async () => {
      // Delete once
      await request(app)
        .delete(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to delete again
      const response = await request(app)
        .delete(`/api/v2/modules/${testModule._id}/learning-units/${testLearningUnit._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent learning unit', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/v2/modules/${testModule._id}/learning-units/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid learning unit ID', async () => {
      const response = await request(app)
        .delete(`/api/v2/modules/${testModule._id}/learning-units/invalid-id`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 404 when learning unit belongs to different module', async () => {
      const otherUnit = await LearningUnit.create({
        moduleId: testModule2._id,
        title: 'Other Module Unit',
        type: 'video',
        category: 'exposition',
        isRequired: true,
        isReplayable: false,
        weight: 10,
        sequence: 1,
        isActive: true,
        createdBy: testUser._id
      });

      const response = await request(app)
        .delete(`/api/v2/modules/${testModule._id}/learning-units/${otherUnit._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v2/modules/:moduleId/learning-units/reorder', () => {
    let unit1: any;
    let unit2: any;
    let unit3: any;

    beforeEach(async () => {
      unit1 = await LearningUnit.create({
        moduleId: testModule._id,
        title: 'Unit 1',
        type: 'video',
        category: 'exposition',
        isRequired: true,
        isReplayable: false,
        weight: 10,
        sequence: 1,
        isActive: true,
        createdBy: testUser._id
      });

      unit2 = await LearningUnit.create({
        moduleId: testModule._id,
        title: 'Unit 2',
        type: 'exercise',
        category: 'practice',
        isRequired: true,
        isReplayable: true,
        weight: 20,
        sequence: 2,
        isActive: true,
        createdBy: testUser._id
      });

      unit3 = await LearningUnit.create({
        moduleId: testModule._id,
        title: 'Unit 3',
        type: 'assessment',
        category: 'assessment',
        isRequired: true,
        isReplayable: false,
        weight: 30,
        sequence: 3,
        isActive: true,
        createdBy: testUser._id
      });
    });

    it('should reorder learning units successfully', async () => {
      const response = await request(app)
        .put(`/api/v2/modules/${testModule._id}/learning-units/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          learningUnitIds: [unit3._id.toString(), unit1._id.toString(), unit2._id.toString()]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Learning units reordered successfully');

      // Verify new sequence
      const updatedUnit1 = await LearningUnit.findById(unit1._id);
      const updatedUnit2 = await LearningUnit.findById(unit2._id);
      const updatedUnit3 = await LearningUnit.findById(unit3._id);

      expect(updatedUnit3!.sequence).toBe(1);
      expect(updatedUnit1!.sequence).toBe(2);
      expect(updatedUnit2!.sequence).toBe(3);
    });

    it('should reverse the order of learning units', async () => {
      const response = await request(app)
        .put(`/api/v2/modules/${testModule._id}/learning-units/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          learningUnitIds: [unit3._id.toString(), unit2._id.toString(), unit1._id.toString()]
        });

      expect(response.status).toBe(200);

      const listResponse = await request(app)
        .get(`/api/v2/modules/${testModule._id}/learning-units`)
        .set('Authorization', `Bearer ${authToken}`);

      const units = listResponse.body.data.learningUnits;
      expect(units[0].title).toBe('Unit 3');
      expect(units[1].title).toBe('Unit 2');
      expect(units[2].title).toBe('Unit 1');
    });

    it('should return 400 when learningUnitIds is not an array', async () => {
      const response = await request(app)
        .put(`/api/v2/modules/${testModule._id}/learning-units/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          learningUnitIds: 'not-an-array'
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when not all learning units are included', async () => {
      const response = await request(app)
        .put(`/api/v2/modules/${testModule._id}/learning-units/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          learningUnitIds: [unit1._id.toString(), unit2._id.toString()]
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when learning unit does not belong to module', async () => {
      const otherUnit = await LearningUnit.create({
        moduleId: testModule2._id,
        title: 'Other Module Unit',
        type: 'video',
        category: 'exposition',
        isRequired: true,
        isReplayable: false,
        weight: 10,
        sequence: 1,
        isActive: true,
        createdBy: testUser._id
      });

      const response = await request(app)
        .put(`/api/v2/modules/${testModule._id}/learning-units/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          learningUnitIds: [unit1._id.toString(), unit2._id.toString(), otherUnit._id.toString()]
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid learning unit ID in array', async () => {
      const response = await request(app)
        .put(`/api/v2/modules/${testModule._id}/learning-units/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          learningUnitIds: [unit1._id.toString(), 'invalid-id', unit3._id.toString()]
        });

      expect(response.status).toBe(400);
    });

    it('should handle empty module (no learning units)', async () => {
      const response = await request(app)
        .put(`/api/v2/modules/${testModule2._id}/learning-units/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          learningUnitIds: []
        });

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/v2/modules/:moduleId/learning-units/:learningUnitId/move', () => {
    let unitToMove: any;

    beforeEach(async () => {
      unitToMove = await LearningUnit.create({
        moduleId: testModule._id,
        title: 'Unit to Move',
        description: 'This unit will be moved',
        type: 'video',
        category: 'exposition',
        isRequired: true,
        isReplayable: false,
        weight: 25,
        sequence: 1,
        isActive: true,
        createdBy: testUser._id
      });

      // Add another unit to source module
      await LearningUnit.create({
        moduleId: testModule._id,
        title: 'Remaining Unit',
        type: 'exercise',
        category: 'practice',
        isRequired: true,
        isReplayable: false,
        weight: 15,
        sequence: 2,
        isActive: true,
        createdBy: testUser._id
      });
    });

    describe('moving between modules', () => {
      it('should move learning unit to another module', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${unitToMove._id}/move`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetModuleId: testModule2._id.toString()
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Learning unit moved successfully');
        expect(response.body.data.moduleId).toBe(testModule2._id.toString());
        expect(response.body.data.sequence).toBe(1);
      });

      it('should assign correct sequence in target module with existing units', async () => {
        // Create existing unit in target module
        await LearningUnit.create({
          moduleId: testModule2._id,
          title: 'Existing Target Unit',
          type: 'video',
          category: 'exposition',
          isRequired: true,
          isReplayable: false,
          weight: 10,
          sequence: 1,
          isActive: true,
          createdBy: testUser._id
        });

        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${unitToMove._id}/move`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetModuleId: testModule2._id.toString()
          });

        expect(response.status).toBe(200);
        expect(response.body.data.sequence).toBe(2);
      });

      it('should re-sequence remaining units in source module', async () => {
        await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${unitToMove._id}/move`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetModuleId: testModule2._id.toString()
          });

        // Check remaining unit in source module
        const listResponse = await request(app)
          .get(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(listResponse.body.data.learningUnits).toHaveLength(1);
        expect(listResponse.body.data.learningUnits[0].sequence).toBe(1);
        expect(listResponse.body.data.learningUnits[0].title).toBe('Remaining Unit');
      });

      it('should not appear in source module after move', async () => {
        await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${unitToMove._id}/move`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetModuleId: testModule2._id.toString()
          });

        const sourceListResponse = await request(app)
          .get(`/api/v2/modules/${testModule._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`);

        const sourceUnitIds = sourceListResponse.body.data.learningUnits.map((u: any) => u.id);
        expect(sourceUnitIds).not.toContain(unitToMove._id.toString());
      });

      it('should appear in target module after move', async () => {
        await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${unitToMove._id}/move`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetModuleId: testModule2._id.toString()
          });

        const targetListResponse = await request(app)
          .get(`/api/v2/modules/${testModule2._id}/learning-units`)
          .set('Authorization', `Bearer ${authToken}`);

        const targetUnitIds = targetListResponse.body.data.learningUnits.map((u: any) => u.id);
        expect(targetUnitIds).toContain(unitToMove._id.toString());
      });
    });

    describe('validation errors', () => {
      it('should return 400 when targetModuleId is missing', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${unitToMove._id}/move`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(400);
      });

      it('should return 400 when trying to move to same module', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${unitToMove._id}/move`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetModuleId: testModule._id.toString()
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('already in this module');
      });

      it('should return 404 when target module does not exist', async () => {
        const fakeModuleId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${unitToMove._id}/move`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetModuleId: fakeModuleId.toString()
          });

        expect(response.status).toBe(404);
      });

      it('should return 404 when learning unit does not exist', async () => {
        const fakeUnitId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${fakeUnitId}/move`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetModuleId: testModule2._id.toString()
          });

        expect(response.status).toBe(404);
      });

      it('should return 404 when learning unit belongs to different source module', async () => {
        const otherUnit = await LearningUnit.create({
          moduleId: testModule2._id,
          title: 'Other Module Unit',
          type: 'video',
          category: 'exposition',
          isRequired: true,
          isReplayable: false,
          weight: 10,
          sequence: 1,
          isActive: true,
          createdBy: testUser._id
        });

        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${otherUnit._id}/move`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetModuleId: testModule2._id.toString()
          });

        expect(response.status).toBe(404);
      });

      it('should return 400 for invalid target module ID', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${unitToMove._id}/move`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetModuleId: 'invalid-id'
          });

        expect(response.status).toBe(400);
      });
    });

    describe('preserving data after move', () => {
      it('should preserve all learning unit data after move', async () => {
        const response = await request(app)
          .put(`/api/v2/modules/${testModule._id}/learning-units/${unitToMove._id}/move`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetModuleId: testModule2._id.toString()
          });

        expect(response.status).toBe(200);
        expect(response.body.data.title).toBe('Unit to Move');
        expect(response.body.data.description).toBe('This unit will be moved');
        expect(response.body.data.contentType).toBe('video');
        expect(response.body.data.category).toBe('exposition');
        expect(response.body.data.isRequired).toBe(true);
        expect(response.body.data.isReplayable).toBe(false);
        expect(response.body.data.weight).toBe(25);
        expect(response.body.data.isActive).toBe(true);
      });
    });
  });

  describe('authorization', () => {
    it('should return 401 for list without auth token', async () => {
      const response = await request(app)
        .get(`/api/v2/modules/${testModule._id}/learning-units`);

      expect(response.status).toBe(401);
    });

    it('should return 401 for create without auth token', async () => {
      const response = await request(app)
        .post(`/api/v2/modules/${testModule._id}/learning-units`)
        .send({
          title: 'Test',
          category: 'exposition',
          contentType: 'video'
        });

      expect(response.status).toBe(401);
    });

    it('should return 401 for update without auth token', async () => {
      const unit = await LearningUnit.create({
        moduleId: testModule._id,
        title: 'Test Unit',
        type: 'video',
        category: 'exposition',
        isRequired: true,
        isReplayable: false,
        weight: 10,
        sequence: 1,
        isActive: true,
        createdBy: testUser._id
      });

      const response = await request(app)
        .put(`/api/v2/modules/${testModule._id}/learning-units/${unit._id}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(401);
    });

    it('should return 401 for delete without auth token', async () => {
      const unit = await LearningUnit.create({
        moduleId: testModule._id,
        title: 'Test Unit',
        type: 'video',
        category: 'exposition',
        isRequired: true,
        isReplayable: false,
        weight: 10,
        sequence: 1,
        isActive: true,
        createdBy: testUser._id
      });

      const response = await request(app)
        .delete(`/api/v2/modules/${testModule._id}/learning-units/${unit._id}`);

      expect(response.status).toBe(401);
    });
  });
});
