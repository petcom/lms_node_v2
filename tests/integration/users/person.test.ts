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
 * Person Endpoint Tests
 * Tests for /api/v2/users/me/person endpoints
 *
 * Endpoints:
 * - GET /api/v2/users/me/person
 * - PUT /api/v2/users/me/person
 * - GET /api/v2/users/me/person/extended
 * - PUT /api/v2/users/me/person/extended
 */

describeIfMongo('Person Endpoints - /api/v2/users/me/person', () => {
  let mongoServer: MongoMemoryServer;
  let testStaffUser: any;
  let testStaff: any;
  let testLearnerUser: any;
  let testLearner: any;
  let staffToken: string;
  let learnerToken: string;

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

    // Create test staff user
    const hashedPassword = await hashPassword('Password123!');
    testStaffUser = await User.create({
      _id: new mongoose.Types.ObjectId(),
      email: 'staff@example.com',
      password: hashedPassword,
      userTypes: ['staff'],
      defaultDashboard: 'staff',
      isActive: true
    });

    testStaff = await Staff.create({
      _id: testStaffUser._id,
      person: {
        firstName: 'John',
        lastName: 'Doe',
        middleName: 'Michael',
        preferredFirstName: 'Johnny',
        emails: [{
          email: 'staff@example.com',
          type: 'institutional',
          isPrimary: true,
          verified: true,
          allowNotifications: true
        }],
        phones: [{
          number: '+1-555-0123',
          type: 'mobile',
          isPrimary: true,
          verified: true,
          allowSMS: true
        }],
        addresses: [{
          street1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
          type: 'home',
          isPrimary: true
        }],
        timezone: 'America/New_York',
        languagePreference: 'en'
      },
      departmentMemberships: [],
      isActive: true
    });

    staffToken = jwt.sign(
      {
        userId: testStaffUser._id.toString(),
        email: testStaffUser.email,
        roles: ['staff'],
        type: 'access'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test learner user
    testLearnerUser = await User.create({
      _id: new mongoose.Types.ObjectId(),
      email: 'learner@example.com',
      password: hashedPassword,
      userTypes: ['learner'],
      defaultDashboard: 'learner',
      isActive: true
    });

    testLearner = await Learner.create({
      _id: testLearnerUser._id,
      person: {
        firstName: 'Jane',
        lastName: 'Smith',
        emails: [{
          email: 'learner@example.com',
          type: 'institutional',
          isPrimary: true,
          verified: true,
          allowNotifications: true
        }],
        phones: [],
        addresses: [],
        timezone: 'America/Los_Angeles',
        languagePreference: 'en'
      },
      personExtended: {
        studentId: 'STU001',
        emergencyContacts: [{
          fullName: 'Parent Smith',
          relationship: 'parent',
          primaryPhone: '+1-555-9999',
          priority: 1
        }],
        identifications: []
      },
      departmentMemberships: [],
      isActive: true
    });

    learnerToken = jwt.sign(
      {
        userId: testLearnerUser._id.toString(),
        email: testLearnerUser.email,
        roles: ['learner'],
        type: 'access'
      },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('GET /api/v2/users/me/person', () => {
    it('should return person data for authenticated staff user', async () => {
      const response = await request(app)
        .get('/api/v2/users/me/person')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        middleName: 'Michael',
        preferredFirstName: 'Johnny',
        timezone: 'America/New_York',
        languagePreference: 'en'
      });
      expect(response.body.data.emails).toHaveLength(1);
      expect(response.body.data.phones).toHaveLength(1);
      expect(response.body.data.addresses).toHaveLength(1);
    });

    it('should return person data for authenticated learner user', async () => {
      const response = await request(app)
        .get('/api/v2/users/me/person')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        firstName: 'Jane',
        lastName: 'Smith',
        timezone: 'America/Los_Angeles',
        languagePreference: 'en'
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v2/users/me/person')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return proper email structure', async () => {
      const response = await request(app)
        .get('/api/v2/users/me/person')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const email = response.body.data.emails[0];
      expect(email).toHaveProperty('email', 'staff@example.com');
      expect(email).toHaveProperty('type', 'institutional');
      expect(email).toHaveProperty('isPrimary', true);
      expect(email).toHaveProperty('verified', true);
      expect(email).toHaveProperty('allowNotifications', true);
    });

    it('should return proper phone structure', async () => {
      const response = await request(app)
        .get('/api/v2/users/me/person')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const phone = response.body.data.phones[0];
      expect(phone).toHaveProperty('number', '+1-555-0123');
      expect(phone).toHaveProperty('type', 'mobile');
      expect(phone).toHaveProperty('isPrimary', true);
      expect(phone).toHaveProperty('verified', true);
      expect(phone).toHaveProperty('allowSMS', true);
    });

    it('should return proper address structure', async () => {
      const response = await request(app)
        .get('/api/v2/users/me/person')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const address = response.body.data.addresses[0];
      expect(address).toHaveProperty('street1', '123 Main St');
      expect(address).toHaveProperty('city', 'New York');
      expect(address).toHaveProperty('state', 'NY');
      expect(address).toHaveProperty('postalCode', '10001');
      expect(address).toHaveProperty('country', 'US');
      expect(address).toHaveProperty('type', 'home');
      expect(address).toHaveProperty('isPrimary', true);
    });
  });

  describe('PUT /api/v2/users/me/person', () => {
    it('should update person basic fields', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/person')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          firstName: 'Jonathan',
          lastName: 'Doe',
          preferredFirstName: 'Jon'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('Jonathan');
      expect(response.body.data.preferredFirstName).toBe('Jon');

      // Verify in database
      const updatedStaff = await Staff.findById(testStaffUser._id);
      expect(updatedStaff?.person.firstName).toBe('Jonathan');
      expect(updatedStaff?.person.preferredFirstName).toBe('Jon');
    });

    it('should update timezone and language', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/person')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          timezone: 'America/Chicago',
          languagePreference: 'es'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.timezone).toBe('America/Chicago');
      expect(response.body.data.languagePreference).toBe('es');
    });

    it('should add new email to emails array', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/person')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          emails: [
            {
              email: 'staff@example.com',
              type: 'institutional',
              isPrimary: true,
              verified: true,
              allowNotifications: true
            },
            {
              email: 'personal@example.com',
              type: 'personal',
              isPrimary: false,
              verified: false,
              allowNotifications: false
            }
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.emails).toHaveLength(2);

      const updatedStaff = await Staff.findById(testStaffUser._id);
      expect(updatedStaff?.person.emails).toHaveLength(2);
    });

    it('should add phone number', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/person')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          phones: [{
            number: '+1-555-1234',
            type: 'mobile',
            isPrimary: true,
            verified: false,
            allowSMS: true
          }]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.phones).toHaveLength(1);
    });

    it('should add address', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/person')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          addresses: [{
            street1: '456 Oak Ave',
            city: 'Los Angeles',
            state: 'CA',
            postalCode: '90001',
            country: 'US',
            type: 'home',
            isPrimary: true
          }]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.addresses).toHaveLength(1);
      expect(response.body.data.addresses[0].street1).toBe('456 Oak Ave');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/person')
        .send({ firstName: 'Test' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle partial updates', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/person')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          preferredFirstName: 'JD'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.preferredFirstName).toBe('JD');
      // Other fields should remain unchanged
      expect(response.body.data.firstName).toBe('John');
      expect(response.body.data.lastName).toBe('Doe');
    });
  });

  describe('GET /api/v2/users/me/person/extended', () => {
    it('should return staff extended data', async () => {
      // Update staff with extended data
      await Staff.findByIdAndUpdate(testStaffUser._id, {
        personExtended: {
          professionalTitle: 'Professor',
          officeLocation: 'Building A, Room 101',
          credentials: [{
            type: 'degree',
            name: 'PhD in Psychology',
            issuingOrganization: 'University',
            dateEarned: new Date('2010-05-15')
          }]
        }
      });

      const response = await request(app)
        .get('/api/v2/users/me/person/extended')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('staff');
      expect(response.body.data.staff).toBeDefined();
      expect(response.body.data.staff.professionalTitle).toBe('Professor');
      expect(response.body.data.staff.officeLocation).toBe('Building A, Room 101');
      expect(response.body.data.staff.credentials).toHaveLength(1);
    });

    it('should return learner extended data', async () => {
      const response = await request(app)
        .get('/api/v2/users/me/person/extended')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('learner');
      expect(response.body.data.learner).toBeDefined();
      expect(response.body.data.learner.studentId).toBe('STU001');
      expect(response.body.data.learner.emergencyContacts).toHaveLength(1);
      expect(response.body.data.learner.emergencyContacts[0].fullName).toBe('Parent Smith');
    });

    it('should return empty object if no extended data exists', async () => {
      // Create new staff without extended data
      const newUser = await User.create({
        _id: new mongoose.Types.ObjectId(),
        email: 'new@example.com',
        password: await hashPassword('Password123!'),
        userTypes: ['staff'],
        isActive: true
      });

      await Staff.create({
        _id: newUser._id,
        person: {
          firstName: 'New',
          lastName: 'User',
          emails: [{
            email: 'new@example.com',
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

      const newToken = jwt.sign(
        { userId: newUser._id.toString(), email: newUser.email, roles: ['staff'], type: 'access' },
        process.env.JWT_ACCESS_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/v2/users/me/person/extended')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('staff');
      expect(response.body.data.staff).toEqual({});
    });
  });

  describe('PUT /api/v2/users/me/person/extended', () => {
    it('should update staff extended data', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/person/extended')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          professionalTitle: 'Associate Professor',
          officeLocation: 'Building B, Room 202',
          credentials: [{
            type: 'certification',
            name: 'Board Certified',
            issuingOrganization: 'National Board',
            dateEarned: '2015-08-01'
          }],
          officeHours: [{
            dayOfWeek: 'monday',
            startTime: '14:00',
            endTime: '16:00',
            location: 'Office',
            appointmentRequired: false
          }]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.professionalTitle).toBe('Associate Professor');
      expect(response.body.data.credentials).toHaveLength(1);
      expect(response.body.data.officeHours).toHaveLength(1);

      // Verify in database
      const updatedStaff = await Staff.findById(testStaffUser._id);
      expect(updatedStaff?.personExtended?.professionalTitle).toBe('Associate Professor');
    });

    it('should update learner extended data', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/person/extended')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          emergencyContacts: [
            {
              fullName: 'Parent Smith',
              relationship: 'parent',
              primaryPhone: '+1-555-9999',
              priority: 1
            },
            {
              fullName: 'Emergency Contact 2',
              relationship: 'guardian',
              primaryPhone: '+1-555-8888',
              priority: 2
            }
          ],
          accommodations: [{
            type: 'extended-time',
            description: '50% extra time on exams',
            isActive: true,
            documentationOnFile: true
          }]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.emergencyContacts).toHaveLength(2);
      expect(response.body.data.accommodations).toHaveLength(1);
      expect(response.body.data.accommodations[0].type).toBe('extended-time');
    });

    it('should initialize extended data if not exists', async () => {
      // Create new staff without extended data
      const newUser = await User.create({
        _id: new mongoose.Types.ObjectId(),
        email: 'new@example.com',
        password: await hashPassword('Password123!'),
        userTypes: ['staff'],
        isActive: true
      });

      await Staff.create({
        _id: newUser._id,
        person: {
          firstName: 'New',
          lastName: 'User',
          emails: [{ email: 'new@example.com', type: 'institutional', isPrimary: true, verified: true, allowNotifications: true }],
          phones: [],
          addresses: [],
          timezone: 'America/New_York',
          languagePreference: 'en'
        },
        departmentMemberships: [],
        isActive: true
      });

      const newToken = jwt.sign(
        { userId: newUser._id.toString(), email: newUser.email, roles: ['staff'], type: 'access' },
        process.env.JWT_ACCESS_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .put('/api/v2/users/me/person/extended')
        .set('Authorization', `Bearer ${newToken}`)
        .send({
          professionalTitle: 'Instructor',
          credentials: []
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.professionalTitle).toBe('Instructor');
    });
  });
});
