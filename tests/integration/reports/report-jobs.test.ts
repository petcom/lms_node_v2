/**
 * Report Jobs Integration Tests
 * Tests the report jobs API endpoints
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '@/app';
import { LookupValue } from '@/models/LookupValue.model';
import User from '@/models/auth/User.model';
import { ReportJob } from '@/models/reports/ReportJob.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Report Jobs API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Seed LookupValues
    await LookupValue.create([
      { category: 'report-type', key: 'enrollment-summary', displayAs: 'Enrollment Summary', isActive: true },
      { category: 'report-status', key: 'pending', displayAs: 'Pending', isActive: true },
      { category: 'report-priority', key: 'normal', displayAs: 'Normal', isActive: true },
      { category: 'report-visibility', key: 'private', displayAs: 'Private', isActive: true },
      { category: 'output-format', key: 'json', displayAs: 'JSON', isActive: true }
    ]);

    // Create test user (simplified - in reality would use proper auth)
    const user = await User.create({
      email: 'test@example.com',
      password: 'hashedpassword',
      userType: 'staff',
      person: { firstName: 'Test', lastName: 'User' }
    });
    userId = user._id.toString();

    // Mock auth token (in reality would use real JWT)
    authToken = 'Bearer mock-token';
  });

  afterAll(async () => {
    await LookupValue.deleteMany({});
    await User.deleteMany({});
    await ReportJob.deleteMany({});
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await ReportJob.deleteMany({});
  });

  describe('POST /api/v2/reports/jobs', () => {
    it('should create a new report job', async () => {
      const jobData = {
        reportType: 'enrollment-summary',
        name: 'Q1 Enrollment Report',
        description: 'First quarter enrollment report',
        parameters: {
          dateRange: {
            startDate: '2024-01-01T00:00:00Z',
            endDate: '2024-03-31T23:59:59Z'
          }
        },
        output: {
          format: 'json'
        }
      };

      const response = await request(app)
        .post('/api/v2/reports/jobs')
        .set('Authorization', authToken)
        .send(jobData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.status).toBe('pending');
    });

    it('should reject invalid report type', async () => {
      const jobData = {
        reportType: 'invalid-type',
        name: 'Invalid Report',
        parameters: {},
        output: { format: 'json' }
      };

      const response = await request(app)
        .post('/api/v2/reports/jobs')
        .set('Authorization', authToken)
        .send(jobData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v2/reports/jobs', () => {
    it('should list report jobs', async () => {
      // Create test job
      await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'json' },
        requestedBy: new mongoose.Types.ObjectId(userId),
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      const response = await request(app)
        .get('/api/v2/reports/jobs')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter jobs by status', async () => {
      await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'json' },
        requestedBy: new mongoose.Types.ObjectId(userId),
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      const response = await request(app)
        .get('/api/v2/reports/jobs?status=pending')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.every((job: any) => job.status === 'pending')).toBe(true);
    });
  });

  describe('GET /api/v2/reports/jobs/:jobId', () => {
    it('should get job details', async () => {
      const job = await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'json' },
        requestedBy: new mongoose.Types.ObjectId(userId),
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      const response = await request(app)
        .get(`/api/v2/reports/jobs/${job._id}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(job._id.toString());
    });

    it('should return 404 for non-existent job', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/v2/reports/jobs/${fakeId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v2/reports/jobs/:jobId/cancel', () => {
    it('should cancel a pending job', async () => {
      const job = await ReportJob.create({
        reportType: 'enrollment-summary',
        name: 'Test Report',
        parameters: {},
        output: { format: 'json' },
        requestedBy: new mongoose.Types.ObjectId(userId),
        status: 'pending',
        priority: 'normal',
        visibility: 'private'
      });

      const response = await request(app)
        .post(`/api/v2/reports/jobs/${job._id}/cancel`)
        .set('Authorization', authToken)
        .send({ reason: 'No longer needed' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
    });
  });
});
