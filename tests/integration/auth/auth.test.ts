import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '@/app';

describe('Auth Integration Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('POST /api/v2/auth/register/staff', () => {
    it('should register a new staff member', async () => {
      const staffData = {
        email: 'staff@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['instructor']
      };

      const response = await request(app)
        .post('/api/v2/auth/register/staff')
        .send(staffData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('staff');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(staffData.email);
      expect(response.body.data.staff.person.firstName).toBe(staffData.firstName);
    });

    it('should return 400 for duplicate email', async () => {
      const staffData = {
        email: 'duplicate@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['instructor']
      };

      await request(app)
        .post('/api/v2/auth/register/staff')
        .send(staffData)
        .expect(201);

      const response = await request(app)
        .post('/api/v2/auth/register/staff')
        .send(staffData)
        .expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v2/auth/register/staff')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message.toLowerCase()).toContain('validation');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/v2/auth/register/staff')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          roles: ['instructor']
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/v2/auth/register/staff')
        .send({
          email: 'test@example.com',
          password: '123',
          firstName: 'John',
          lastName: 'Doe',
          roles: ['instructor']
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/v2/auth/register/learner', () => {
    it('should register a new learner', async () => {
      const learnerData = {
        email: 'learner@example.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: '2000-01-15'
      };

      const response = await request(app)
        .post('/api/v2/auth/register/learner')
        .send(learnerData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('learner');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(learnerData.email);
      expect(response.body.data.learner.person.firstName).toBe(learnerData.firstName);
    });

    it('should automatically assign learner role', async () => {
      const learnerData = {
        email: 'learner2@example.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: '2000-01-15'
      };

      const response = await request(app)
        .post('/api/v2/auth/register/learner')
        .send(learnerData)
        .expect(201);

      expect(response.body.data.user.userTypes).toContain('learner');
    });
  });

  describe('POST /api/v2/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app)
        .post('/api/v2/auth/register/staff')
        .send({
          email: 'login@example.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          roles: ['instructor']
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'login@example.com',
          password: 'SecurePass123!'
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('session');
      expect(response.body.data.session).toHaveProperty('accessToken');
      expect(response.body.data.session).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe('login@example.com');
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecurePass123!'
        })
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/v2/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v2/auth/register/staff')
        .send({
          email: 'refresh@example.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          roles: ['instructor']
        });

      refreshToken = response.body.data.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v2/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v2/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/v2/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/v2/auth/logout', () => {
    let accessToken: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v2/auth/register/staff')
        .send({
          email: 'logout@example.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          roles: ['instructor']
        });

      accessToken = response.body.data.accessToken;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/v2/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Logged out');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/v2/auth/logout')
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .post('/api/v2/auth/logout')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/v2/auth/me', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v2/auth/register/staff')
        .send({
          email: 'me@example.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          roles: ['instructor']
        });

      accessToken = response.body.data.accessToken || response.body.data.session?.accessToken;
      userId = response.body.data.user._id || response.body.data.user.id;
    });

    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/v2/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe('me@example.com');
      expect(response.body.data.user._id || response.body.data.user.id).toBe(userId);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v2/auth/me')
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/v2/auth/password/forgot', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v2/auth/register/staff')
        .send({
          email: 'forgot@example.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          roles: ['instructor']
        });
    });

    it('should send password reset email', async () => {
      const response = await request(app)
        .post('/api/v2/auth/password/forgot')
        .send({ email: 'forgot@example.com' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('reset email');
    });

    it('should return success even for non-existent email (security)', async () => {
      const response = await request(app)
        .post('/api/v2/auth/password/forgot')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/v2/auth/password/forgot')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('PUT /api/v2/auth/password/change', () => {
    let accessToken: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v2/auth/register/staff')
        .send({
          email: 'change@example.com',
          password: 'OldPass123!',
          firstName: 'Test',
          lastName: 'User',
          roles: ['instructor']
        });

      accessToken = response.body.data.accessToken;
    });

    it('should change password with correct old password', async () => {
      const response = await request(app)
        .put('/api/v2/auth/password/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'OldPass123!',
          newPassword: 'NewPass123!'
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('changed');

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: 'change@example.com',
          password: 'NewPass123!'
        })
        .expect(200);

      expect(loginResponse.body.status).toBe('success');
    });

    it('should return 401 for incorrect current password', async () => {
      const response = await request(app)
        .put('/api/v2/auth/password/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPass123!',
          newPassword: 'NewPass123!'
        })
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should validate new password strength', async () => {
      const response = await request(app)
        .put('/api/v2/auth/password/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'OldPass123!',
          newPassword: '123'
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/v2/auth/password/change')
        .send({
          currentPassword: 'OldPass123!',
          newPassword: 'NewPass123!'
        })
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });
});
