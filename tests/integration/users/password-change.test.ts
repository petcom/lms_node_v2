import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '@/app';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { Learner } from '@/models/auth/Learner.model';
import { hashPassword } from '@/utils/password';
import { describeIfMongo } from '../../helpers/mongo-guard';

/**
 * ISS-001 Tests: Password Change Endpoint
 * POST /api/v2/users/me/password
 *
 * Requirements:
 * - User must be authenticated
 * - Current password must be provided and correct
 * - New password must meet complexity requirements
 * - New password must be different from current password
 * - Password confirmation must match new password
 */

describeIfMongo('POST /api/v2/users/me/password - Password Change (ISS-001)', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let testStaff: any;
  let testToken: string;
  const testPassword = 'CurrentPassword123!';

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Create test user with hashed password
    const hashedPassword = await hashPassword(testPassword);
    testUser = await User.create({
      _id: new mongoose.Types.ObjectId(),
      email: 'test@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true
    });

    // Create staff record
    testStaff = await Staff.create({
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
      departmentMemberships: [],
      isActive: true
    });

    // Generate JWT token
    testToken = jwt.sign(
      {
        userId: testUser._id.toString(),
        email: testUser.email,
        roles: ['staff'],
        type: 'access'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    // Clean up after each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('Successful password changes', () => {
    it('should change password when current password is correct', async () => {
      const response = await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password changed successfully');

      // Verify password was actually changed
      const updatedUser = await User.findById(testUser._id).select('+password');
      expect(updatedUser).toBeTruthy();
      expect(updatedUser!.password).not.toBe(testPassword);

      // Verify new password works (would need to use comparePassword in real scenario)
      const bcrypt = require('bcryptjs');
      const isNewPasswordValid = await bcrypt.compare('NewPassword123!', updatedUser!.password);
      expect(isNewPasswordValid).toBe(true);

      // Verify old password no longer works
      const isOldPasswordValid = await bcrypt.compare(testPassword, updatedUser!.password);
      expect(isOldPasswordValid).toBe(false);
    });

    it('should allow learner users to change password', async () => {
      // Create learner user
      const learnerPassword = 'LearnerPass123!';
      const hashedLearnerPassword = await hashPassword(learnerPassword);
      const learnerUser = await User.create({
        _id: new mongoose.Types.ObjectId(),
        email: 'learner@example.com',
        password: hashedLearnerPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      await Learner.create({
        _id: learnerUser._id,
        person: {
          firstName: 'Test',
          lastName: 'Learner',
          emails: [{
            email: learnerUser.email,
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
        departmentMemberships: [],
        isActive: true
      });

      const learnerToken = jwt.sign(
        {
          userId: learnerUser._id.toString(),
          email: learnerUser.email,
          roles: ['learner'],
          type: 'access'
        },
        process.env.JWT_ACCESS_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          currentPassword: learnerPassword,
          newPassword: 'NewLearnerPass123!',
          confirmPassword: 'NewLearnerPass123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should keep user logged in after password change', async () => {
      // Change password
      await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(200);

      // Verify token still works for other endpoints
      const profileResponse = await request(app)
        .get('/api/v2/users/me')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.email).toBe(testUser.email);
    });
  });

  describe('Authentication and authorization', () => {
    it('should reject request without authentication token', async () => {
      const response = await request(app)
        .post('/api/v2/users/me/password')
        .send({
          currentPassword: testPassword,
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          currentPassword: testPassword,
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Current password validation', () => {
    it('should reject when current password is incorrect', async () => {
      const response = await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('incorrect');

      // Verify password was NOT changed
      const unchangedUser = await User.findById(testUser._id).select('+password');
      const bcrypt = require('bcryptjs');
      const isOriginalPasswordStillValid = await bcrypt.compare(testPassword, unchangedUser!.password);
      expect(isOriginalPasswordStillValid).toBe(true);
    });

    it('should reject when current password is missing', async () => {
      const response = await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject when current password is empty', async () => {
      const response = await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: '',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('New password validation', () => {
    it('should reject when new password is too short (< 8 characters)', async () => {
      const response = await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'Short1!',
          confirmPassword: 'Short1!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('8 characters');
    });

    it('should reject when new password is too long (> 128 characters)', async () => {
      const longPassword = 'A'.repeat(121) + '12345678'; // 129 characters
      const response = await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: longPassword,
          confirmPassword: longPassword
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('128 characters');
    });

    it('should reject when new password has no uppercase letter', async () => {
      const response = await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'lowercase123!',
          confirmPassword: 'lowercase123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('uppercase');
    });

    it('should reject when new password has no lowercase letter', async () => {
      const response = await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'UPPERCASE123!',
          confirmPassword: 'UPPERCASE123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('lowercase');
    });

    it('should reject when new password has no number', async () => {
      const response = await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'NoNumbers!',
          confirmPassword: 'NoNumbers!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('number');
    });

    it('should reject when new password is same as current password', async () => {
      const response = await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: testPassword,
          confirmPassword: testPassword
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('different');
    });

    it('should reject when new password is missing', async () => {
      const response = await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: testPassword,
          confirmPassword: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Password confirmation validation', () => {
    it('should reject when confirmation does not match new password', async () => {
      const response = await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'NewPassword123!',
          confirmPassword: 'DifferentPassword123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('match');
    });

    it('should reject when confirmation is missing', async () => {
      const response = await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle password with special characters', async () => {
      const specialPassword = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?';
      const response = await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: specialPassword,
          confirmPassword: specialPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle password with unicode characters', async () => {
      const unicodePassword = 'Pássw0rd123!';
      const response = await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: unicodePassword,
          confirmPassword: unicodePassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject when user does not exist (edge case)', async () => {
      // Create token for non-existent user
      const fakeUserId = new mongoose.Types.ObjectId();
      const fakeToken = jwt.sign(
        {
          userId: fakeUserId.toString(),
          email: 'fake@example.com',
          roles: ['staff'],
          type: 'access'
        },
        process.env.JWT_ACCESS_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${fakeToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('Security considerations', () => {
    it('should not leak information about whether user exists', async () => {
      const fakeUserId = new mongoose.Types.ObjectId();
      const fakeToken = jwt.sign(
        {
          userId: fakeUserId.toString(),
          email: 'nonexistent@example.com',
          roles: ['staff'],
          type: 'access'
        },
        process.env.JWT_ACCESS_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${fakeToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(404);

      // Should return generic "not found" message, not "user doesn't exist"
      expect(response.body.message).not.toContain('email');
    });

    it('should hash the new password before storing', async () => {
      const newPassword = 'NewPassword123!';
      await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: testPassword,
          newPassword,
          confirmPassword: newPassword
        })
        .expect(200);

      // Verify password is hashed (not stored in plain text)
      const updatedUser = await User.findById(testUser._id).select('+password');
      expect(updatedUser!.password).not.toBe(newPassword);
      expect(updatedUser!.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt hash format
    });
  });

  describe('Multiple password changes', () => {
    it('should allow changing password multiple times', async () => {
      // First change
      await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'SecondPassword123!',
          confirmPassword: 'SecondPassword123!'
        })
        .expect(200);

      // Second change
      await request(app)
        .post('/api/v2/users/me/password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: 'SecondPassword123!',
          newPassword: 'ThirdPassword123!',
          confirmPassword: 'ThirdPassword123!'
        })
        .expect(200);

      // Verify final password
      const updatedUser = await User.findById(testUser._id).select('+password');
      const bcrypt = require('bcryptjs');
      const isFinalPasswordValid = await bcrypt.compare('ThirdPassword123!', updatedUser!.password);
      expect(isFinalPasswordValid).toBe(true);
    });
  });
});
