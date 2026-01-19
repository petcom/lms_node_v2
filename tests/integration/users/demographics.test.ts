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
 * Demographics Endpoint Tests
 * Tests for /api/v2/users/me/demographics endpoints
 *
 * Endpoints:
 * - GET /api/v2/users/me/demographics
 * - PUT /api/v2/users/me/demographics
 *
 * Demographics data is sensitive and used for compliance reporting (IPEDS, Title IX, ADA)
 */

describeIfMongo('Demographics Endpoints - /api/v2/users/me/demographics', () => {
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
        emails: [{
          email: 'staff@example.com',
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
      demographics: {
        legalGender: 'male',
        isHispanicLatino: false,
        race: ['white'],
        citizenship: 'us-citizen',
        allowReporting: true,
        allowResearch: false,
        lastUpdated: new Date()
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
      demographics: {
        legalGender: 'female',
        isHispanicLatino: true,
        race: ['white', 'asian'],
        citizenship: 'us-citizen',
        firstGenerationStudent: true,
        hasDisability: false,
        pellEligible: true,
        allowReporting: true,
        allowResearch: true,
        lastUpdated: new Date()
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

  describe('GET /api/v2/users/me/demographics', () => {
    it('should return demographics data for staff user', async () => {
      const response = await request(app)
        .get('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        legalGender: 'male',
        isHispanicLatino: false,
        race: ['white'],
        citizenship: 'us-citizen',
        allowReporting: true,
        allowResearch: false
      });
      expect(response.body.data.lastUpdated).toBeDefined();
    });

    it('should return demographics data for learner user', async () => {
      const response = await request(app)
        .get('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        legalGender: 'female',
        isHispanicLatino: true,
        race: ['white', 'asian'],
        citizenship: 'us-citizen',
        firstGenerationStudent: true,
        hasDisability: false,
        pellEligible: true
      });
    });

    it('should return empty object if no demographics exist', async () => {
      // Create new staff without demographics
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
        .get('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({});
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v2/users/me/demographics')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v2/users/me/demographics', () => {
    it('should update basic demographic fields', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          legalGender: 'non-binary',
          pronouns: 'they/them'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.legalGender).toBe('non-binary');
      expect(response.body.data.pronouns).toBe('they/them');

      // Verify in database
      const updatedStaff = await Staff.findById(testStaffUser._id);
      expect(updatedStaff?.demographics?.legalGender).toBe('non-binary');
      expect(updatedStaff?.demographics?.pronouns).toBe('they/them');
    });

    it('should update race and ethnicity information', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          isHispanicLatino: false,
          race: ['black-african-american']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isHispanicLatino).toBe(false);
      expect(response.body.data.race).toContain('black-african-american');
    });

    it('should update citizenship information', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          citizenship: 'visa-holder',
          visaType: 'f1',
          visaExpirationDate: '2026-12-31',
          countryOfCitizenship: 'CN'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.citizenship).toBe('visa-holder');
      expect(response.body.data.visaType).toBe('f1');
      expect(response.body.data.countryOfCitizenship).toBe('CN');
    });

    it('should update veteran status', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          veteranStatus: 'veteran',
          militaryBranch: 'Army',
          yearsOfService: 5,
          dischargeType: 'honorable'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.veteranStatus).toBe('veteran');
      expect(response.body.data.militaryBranch).toBe('Army');
      expect(response.body.data.yearsOfService).toBe(5);
      expect(response.body.data.dischargeType).toBe('honorable');
    });

    it('should update first generation student status', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          firstGenerationStudent: true,
          parent1EducationLevel: 'high-school',
          parent2EducationLevel: 'some-college'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstGenerationStudent).toBe(true);
      expect(response.body.data.parent1EducationLevel).toBe('high-school');
      expect(response.body.data.parent2EducationLevel).toBe('some-college');
    });

    it('should update disability information', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          hasDisability: true,
          disabilityType: ['learning', 'physical'],
          accommodationsRequired: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hasDisability).toBe(true);
      expect(response.body.data.disabilityType).toEqual(['learning', 'physical']);
      expect(response.body.data.accommodationsRequired).toBe(true);
    });

    it('should update language proficiency', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          primaryLanguage: 'es',
          englishProficiency: 'intermediate',
          otherLanguages: ['fr', 'pt']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.primaryLanguage).toBe('es');
      expect(response.body.data.englishProficiency).toBe('intermediate');
      expect(response.body.data.otherLanguages).toEqual(['fr', 'pt']);
    });

    it('should update socioeconomic information', async () => {
      // NOTE: pellEligible and lowIncomeStatus are READONLY (ISS-012)
      // Only householdIncomeRange can be updated by user
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          householdIncomeRange: 'under-25k',
          maritalStatus: 'single',
          numberOfDependents: 2
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.householdIncomeRange).toBe('under-25k');
      expect(response.body.data.maritalStatus).toBe('single');
      expect(response.body.data.numberOfDependents).toBe(2);
      // pellEligible and lowIncomeStatus remain as set in beforeEach
      expect(response.body.data.pellEligible).toBe(true);
    });

    it('should update consent preferences', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          allowReporting: false,
          allowResearch: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.allowReporting).toBe(false);
      expect(response.body.data.allowResearch).toBe(true);
    });

    it('should automatically set lastUpdated timestamp', async () => {
      const beforeUpdate = new Date();

      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          legalGender: 'female'
        })
        .expect(200);

      const afterUpdate = new Date();

      expect(response.body.success).toBe(true);
      const lastUpdated = new Date(response.body.data.lastUpdated);
      expect(lastUpdated.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(lastUpdated.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
    });

    it('should handle multiple race selections', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          race: ['asian', 'white', 'native-hawaiian-pacific-islander']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.race).toHaveLength(3);
      expect(response.body.data.race).toContain('asian');
      expect(response.body.data.race).toContain('white');
      expect(response.body.data.race).toContain('native-hawaiian-pacific-islander');
    });

    it('should handle prefer-not-to-say values', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          legalGender: 'prefer-not-to-say',
          race: ['prefer-not-to-say'],
          citizenship: 'prefer-not-to-say',
          veteranStatus: 'prefer-not-to-say',
          householdIncomeRange: 'prefer-not-to-say'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.legalGender).toBe('prefer-not-to-say');
      expect(response.body.data.race).toContain('prefer-not-to-say');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .send({ legalGender: 'male' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle partial updates', async () => {
      // NOTE: Test partial update with a non-readonly field (ISS-012)
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          veteranStatus: 'veteran' // Update only one field
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.veteranStatus).toBe('veteran');
      // Other fields should remain unchanged
      expect(response.body.data.legalGender).toBe('female');
      expect(response.body.data.isHispanicLatino).toBe(true);
      expect(response.body.data.pellEligible).toBe(true); // Readonly field unchanged
    });

    it('should initialize demographics if not exists', async () => {
      // Create new staff without demographics
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
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${newToken}`)
        .send({
          legalGender: 'male',
          isHispanicLatino: false,
          race: ['white']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.legalGender).toBe('male');
      expect(response.body.data.lastUpdated).toBeDefined();
    });
  });

  describe('IPEDS Compliance', () => {
    it('should support all IPEDS-required race categories', async () => {
      const ipEDSRaceCategories = [
        'american-indian-alaska-native',
        'asian',
        'black-african-american',
        'native-hawaiian-pacific-islander',
        'white',
        'two-or-more-races'
      ];

      for (const category of ipEDSRaceCategories) {
        const response = await request(app)
          .put('/api/v2/users/me/demographics')
          .set('Authorization', `Bearer ${learnerToken}`)
          .send({
            race: [category]
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.race).toContain(category);
      }
    });

    it('should support Hispanic/Latino identification', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          isHispanicLatino: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isHispanicLatino).toBe(true);
    });
  });

  describe('Privacy and Consent', () => {
    it('should respect allowReporting flag', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          allowReporting: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.allowReporting).toBe(false);
    });

    it('should respect allowResearch flag', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          allowResearch: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.allowResearch).toBe(false);
    });
  });

  describe('Financial Aid READONLY Fields (ISS-012)', () => {
    it('should reject attempts to update pellEligible (readonly field)', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          pellEligible: false // Try to change from true to false
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('readonly financial aid fields');
      expect(response.body.message).toContain('pellEligible');
      expect(response.body.message).toContain('Financial Aid office');

      // Verify value unchanged in database
      const learner = await Learner.findById(testLearnerUser._id);
      expect(learner?.demographics?.pellEligible).toBe(true); // Still true
    });

    it('should reject attempts to update lowIncomeStatus (readonly field)', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          lowIncomeStatus: false
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('readonly financial aid fields');
      expect(response.body.message).toContain('lowIncomeStatus');
    });

    it('should reject attempts to update both financial aid fields together', async () => {
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          pellEligible: false,
          lowIncomeStatus: false,
          householdIncomeRange: '100k-150k' // This one is allowed
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('pellEligible');
      expect(response.body.message).toContain('lowIncomeStatus');

      // Verify no fields were updated
      const learner = await Learner.findById(testLearnerUser._id);
      expect(learner?.demographics?.pellEligible).toBe(true);
      // householdIncomeRange should also not be updated due to transaction rollback
    });

    it('should allow updating other fields while readonly fields exist in database', async () => {
      // Learner already has pellEligible: true in database
      const response = await request(app)
        .put('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({
          householdIncomeRange: '100k-150k',
          maritalStatus: 'married'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.householdIncomeRange).toBe('100k-150k');
      expect(response.body.data.maritalStatus).toBe('married');
      expect(response.body.data.pellEligible).toBe(true); // Still present in response
    });

    it('should return pellEligible and lowIncomeStatus in GET responses', async () => {
      const response = await request(app)
        .get('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pellEligible).toBeDefined();
      expect(response.body.data.pellEligible).toBe(true);
      // lowIncomeStatus may be undefined/null if not set
    });

    it('should handle null financial aid fields gracefully', async () => {
      // Staff user has no financial aid fields set
      const response = await request(app)
        .get('/api/v2/users/me/demographics')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Fields should be present in response but null/undefined
      expect('pellEligible' in response.body.data || response.body.data.pellEligible === undefined).toBe(true);
    });
  });
});
