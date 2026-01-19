/**
 * API Decryption Integration Tests (ISS-011)
 *
 * Tests that encrypted fields are automatically decrypted when returned
 * to authorized users via the API.
 *
 * These tests verify:
 * 1. Encrypted fields are stored encrypted in database
 * 2. Encrypted fields are returned DECRYPTED to the owner via API
 * 3. Users can successfully manage their own sensitive data
 */

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '@/app';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { Learner } from '@/models/auth/Learner.model';
import { hashPassword } from '@/utils/password';
import { isEncrypted } from '@/utils/encryption/EncryptionFactory';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('API Decryption Integration - ISS-011', () => {
  let mongoServer: MongoMemoryServer;
  const testEncryptionKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeAll(async () => {
    // Set test keys
    process.env.ENCRYPTION_KEY = testEncryptionKey;

    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    delete process.env.ENCRYPTION_KEY;
  });

  beforeEach(async () => {
    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  // ==========================================================================
  // LEARNER IDENTIFICATION API TESTS
  // ==========================================================================

  describe('GET /api/v2/users/me/person/extended - Learner Identifications', () => {
    it('should return decrypted idNumber to the owner', async () => {
      // Create learner with encrypted identification
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');

      await User.create({
        _id: userId,
        email: 'learner@test.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      const plainIdNumber = 'P1234567890';

      await Learner.create({
        _id: userId,
        person: {
          firstName: 'Test',
          lastName: 'Learner',
          emails: [{
            email: 'learner@test.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        personExtended: {
          emergencyContacts: [],
          identifications: [{
            idType: 'passport',
            idNumber: plainIdNumber,
            issuingAuthority: 'US Department of State',
            issueDate: new Date('2020-01-01'),
            expirationDate: new Date('2030-01-01')
          }]
        },
        departmentMemberships: []
      });

      // Verify idNumber is encrypted in database
      const savedLearner = await Learner.findById(userId).lean();
      const storedIdNumber = savedLearner!.personExtended!.identifications![0].idNumber!;
      expect(isEncrypted(storedIdNumber)).toBe(true);
      expect(storedIdNumber).not.toBe(plainIdNumber);

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: userId.toString(),
          email: 'learner@test.com',
          roles: ['learner'],
          type: 'access'
        },
        process.env.JWT_ACCESS_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Request via API
      const response = await request(app)
        .get('/api/v2/users/me/person/extended')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify idNumber is decrypted in API response
      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('learner');
      expect(response.body.data.learner.identifications).toBeDefined();
      expect(response.body.data.learner.identifications[0].idNumber).toBe(plainIdNumber);
      expect(response.body.data.learner.identifications[0].idType).toBe('passport');
    });

    it('should decrypt multiple identification numbers', async () => {
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');

      await User.create({
        _id: userId,
        email: 'multi-id@test.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      const passportNumber = 'P9876543210';
      const dlNumber = 'DL-987-654-321';

      await Learner.create({
        _id: userId,
        person: {
          firstName: 'Multi',
          lastName: 'ID',
          emails: [{
            email: 'multi-id@test.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        personExtended: {
          emergencyContacts: [],
          identifications: [
            {
              idType: 'passport',
              idNumber: passportNumber,
              issuingAuthority: 'US',
              issueDate: new Date('2019-01-01'),
              expirationDate: new Date('2029-01-01')
            },
            {
              idType: 'drivers-license',
              idNumber: dlNumber,
              issuingAuthority: 'California DMV',
              issueDate: new Date('2020-05-15'),
              expirationDate: new Date('2028-05-15')
            }
          ]
        },
        departmentMemberships: []
      });

      const token = jwt.sign(
        {
          userId: userId.toString(),
          email: 'multi-id@test.com',
          roles: ['learner'],
          type: 'access'
        },
        process.env.JWT_ACCESS_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/v2/users/me/person/extended')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.learner.identifications).toHaveLength(2);
      expect(response.body.data.learner.identifications[0].idNumber).toBe(passportNumber);
      expect(response.body.data.learner.identifications[1].idNumber).toBe(dlNumber);
    });
  });

  // ==========================================================================
  // DEMOGRAPHICS API TESTS
  // ==========================================================================

  describe('GET /api/v2/users/me/demographics - Alien Registration Number', () => {
    it('should return decrypted alienRegistrationNumber to learner owner', async () => {
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');

      await User.create({
        _id: userId,
        email: 'international@test.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      const plainANumber = 'A123456789';

      await Learner.create({
        _id: userId,
        person: {
          firstName: 'International',
          lastName: 'Student',
          emails: [{
            email: 'international@test.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        demographics: {
          citizenship: 'visa-holder',
          visaType: 'f1',
          alienRegistrationNumber: plainANumber,
          countryOfCitizenship: 'CN'
        },
        departmentMemberships: []
      });

      // Verify alienRegistrationNumber is encrypted in database
      const savedLearner = await Learner.findById(userId).lean();
      const storedANumber = savedLearner!.demographics!.alienRegistrationNumber!;
      expect(isEncrypted(storedANumber)).toBe(true);
      expect(storedANumber).not.toBe(plainANumber);

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: userId.toString(),
          email: 'international@test.com',
          roles: ['learner'],
          type: 'access'
        },
        process.env.JWT_ACCESS_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Request via API
      const response = await request(app)
        .get('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify alienRegistrationNumber is decrypted in API response
      expect(response.body.success).toBe(true);
      expect(response.body.data.alienRegistrationNumber).toBe(plainANumber);
      expect(response.body.data.citizenship).toBe('visa-holder');
      expect(response.body.data.visaType).toBe('f1');
    });

    it('should return decrypted alienRegistrationNumber to staff owner', async () => {
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');

      await User.create({
        _id: userId,
        email: 'h1b-staff@test.com',
        password: hashedPassword,
        userTypes: ['staff'],
        defaultDashboard: 'staff',
        isActive: true
      });

      const plainANumber = 'A987654321';

      await Staff.create({
        _id: userId,
        person: {
          firstName: 'H1B',
          lastName: 'Staff',
          emails: [{
            email: 'h1b-staff@test.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        demographics: {
          citizenship: 'visa-holder',
          visaType: 'h1b',
          alienRegistrationNumber: plainANumber,
          countryOfCitizenship: 'IN'
        },
        departmentMemberships: [],
        isActive: true
      });

      // Verify alienRegistrationNumber is encrypted in database
      const savedStaff = await Staff.findById(userId).lean();
      const storedANumber = savedStaff!.demographics!.alienRegistrationNumber!;
      expect(isEncrypted(storedANumber)).toBe(true);
      expect(storedANumber).not.toBe(plainANumber);

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: userId.toString(),
          email: 'h1b-staff@test.com',
          roles: ['staff'],
          type: 'access'
        },
        process.env.JWT_ACCESS_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Request via API
      const response = await request(app)
        .get('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify alienRegistrationNumber is decrypted in API response
      expect(response.body.success).toBe(true);
      expect(response.body.data.alienRegistrationNumber).toBe(plainANumber);
      expect(response.body.data.citizenship).toBe('visa-holder');
      expect(response.body.data.visaType).toBe('h1b');
    });

    it('should handle missing alienRegistrationNumber gracefully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');

      await User.create({
        _id: userId,
        email: 'us-citizen@test.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      await Learner.create({
        _id: userId,
        person: {
          firstName: 'US',
          lastName: 'Citizen',
          emails: [{
            email: 'us-citizen@test.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        demographics: {
          citizenship: 'us-citizen',
          countryOfCitizenship: 'US'
        },
        departmentMemberships: []
      });

      const token = jwt.sign(
        {
          userId: userId.toString(),
          email: 'us-citizen@test.com',
          roles: ['learner'],
          type: 'access'
        },
        process.env.JWT_ACCESS_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.alienRegistrationNumber).toBeUndefined();
      expect(response.body.data.citizenship).toBe('us-citizen');
    });
  });

  // ==========================================================================
  // SECURITY TESTS
  // ==========================================================================

  describe('Security - Encrypted Fields', () => {
    it('should never return encrypted strings to the frontend', async () => {
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');

      await User.create({
        _id: userId,
        email: 'security@test.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      await Learner.create({
        _id: userId,
        person: {
          firstName: 'Security',
          lastName: 'Test',
          emails: [{
            email: 'security@test.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        personExtended: {
          emergencyContacts: [],
          identifications: [{
            idType: 'passport',
            idNumber: 'P1111111111',
            issuingAuthority: 'US'
          }]
        },
        demographics: {
          citizenship: 'permanent-resident',
          alienRegistrationNumber: 'A111111111',
          countryOfCitizenship: 'MX'
        },
        departmentMemberships: []
      });

      const token = jwt.sign(
        {
          userId: userId.toString(),
          email: 'security@test.com',
          roles: ['learner'],
          type: 'access'
        },
        process.env.JWT_ACCESS_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Test personExtended
      const extendedResponse = await request(app)
        .get('/api/v2/users/me/person/extended')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const idNumber = extendedResponse.body.data.learner.identifications[0].idNumber;
      expect(isEncrypted(idNumber)).toBe(false); // Should be plaintext
      expect(idNumber).toBe('P1111111111'); // Should match original

      // Test demographics
      const demoResponse = await request(app)
        .get('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const aNumber = demoResponse.body.data.alienRegistrationNumber;
      expect(isEncrypted(aNumber)).toBe(false); // Should be plaintext
      expect(aNumber).toBe('A111111111'); // Should match original
    });
  });
});
