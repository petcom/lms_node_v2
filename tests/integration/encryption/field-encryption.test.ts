/**
 * Field Encryption Integration Tests (ISS-011)
 *
 * Tests Mongoose pre-save hooks and decryption methods for:
 * - IIdentification.idNumber (Learner)
 * - IDemographics.alienRegistrationNumber (Learner and Staff)
 *
 * These tests verify that:
 * 1. Data is automatically encrypted on save
 * 2. Encrypted data is stored in the database
 * 3. Data can be decrypted correctly
 * 4. Idempotent behavior (won't double-encrypt)
 * 5. Round-trip save → read → decrypt works correctly
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Learner } from '@/models/auth/Learner.model';
import { Staff } from '@/models/auth/Staff.model';
import { User } from '@/models/auth/User.model';
import { encrypt, decrypt, isEncrypted } from '@/utils/encryption/EncryptionFactory';
import { hashPassword } from '@/utils/password';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Field Encryption Integration - Mongoose Hooks', () => {
  let mongoServer: MongoMemoryServer;
  const testEncryptionKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeAll(async () => {
    // Set test encryption key
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
  // LEARNER IDENTIFICATION ENCRYPTION TESTS
  // ==========================================================================

  describe('Learner Identification - idNumber Encryption', () => {
    it('should automatically encrypt idNumber on save', async () => {
      // Create user first
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');
      await User.create({
        _id: userId,
        email: 'learner@example.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      // Create learner with identification
      const learner = await Learner.create({
        _id: userId,
        person: {
          firstName: 'Jane',
          lastName: 'Doe',
          emails: [{
            email: 'learner@example.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        personExtended: {
          emergencyContacts: [],
          identifications: [{
            idType: 'passport',
            idNumber: 'P1234567',
            issuingAuthority: 'US',
            issueDate: new Date('2020-01-01'),
            expirationDate: new Date('2030-01-01')
          }]
        },
        departmentMemberships: []
      });

      // Verify idNumber is encrypted in database
      const savedLearner = await Learner.findById(learner._id).lean();
      expect(savedLearner?.personExtended?.identifications?.[0]?.idNumber).toBeDefined();
      expect(isEncrypted(savedLearner!.personExtended!.identifications![0].idNumber!)).toBe(true);
      expect(savedLearner!.personExtended!.identifications![0].idNumber).not.toBe('P1234567');
    });

    it('should decrypt idNumber using getDecryptedIdNumber() method', async () => {
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');
      await User.create({
        _id: userId,
        email: 'learner2@example.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      const learner = await Learner.create({
        _id: userId,
        person: {
          firstName: 'John',
          lastName: 'Smith',
          emails: [{
            email: 'learner2@example.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        personExtended: {
          emergencyContacts: [],
          identifications: [{
            idType: 'drivers-license',
            idNumber: 'DL-123-456-789',
            issuingAuthority: 'California DMV',
            issueDate: new Date('2018-06-15'),
            expirationDate: new Date('2028-06-15')
          }]
        },
        departmentMemberships: []
      });

      // Retrieve learner (not lean - to get methods)
      const retrievedLearner = await Learner.findById(learner._id);

      // Decrypt using method
      const identification = retrievedLearner!.personExtended!.identifications![0];
      const decryptedIdNumber = identification.getDecryptedIdNumber!();

      expect(decryptedIdNumber).toBe('DL-123-456-789');
    });

    it('should handle round-trip save → read → decrypt correctly', async () => {
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');
      await User.create({
        _id: userId,
        email: 'learner3@example.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      const originalIdNumber = '123-45-6789';

      // Save learner
      const learner = await Learner.create({
        _id: userId,
        person: {
          firstName: 'Alice',
          lastName: 'Johnson',
          emails: [{
            email: 'learner3@example.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        personExtended: {
          emergencyContacts: [],
          identifications: [{
            idType: 'state-id',
            idNumber: originalIdNumber,
            issuingAuthority: 'New York DMV',
            issueDate: new Date('2019-03-10')
          }]
        },
        departmentMemberships: []
      });

      // Read from database
      const savedLearner = await Learner.findById(learner._id);

      // Verify encrypted in storage
      const rawLearner = await Learner.findById(learner._id).lean();
      expect(isEncrypted(rawLearner!.personExtended!.identifications![0].idNumber!)).toBe(true);

      // Decrypt
      const decrypted = savedLearner!.personExtended!.identifications![0].getDecryptedIdNumber!();
      expect(decrypted).toBe(originalIdNumber);
    });

    it('should not double-encrypt already encrypted data (idempotent)', async () => {
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');
      await User.create({
        _id: userId,
        email: 'learner4@example.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      const originalIdNumber = 'A012345678';

      // Create with plaintext
      const learner = await Learner.create({
        _id: userId,
        person: {
          firstName: 'Bob',
          lastName: 'Wilson',
          emails: [{
            email: 'learner4@example.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        personExtended: {
          emergencyContacts: [],
          identifications: [{
            idType: 'passport',
            idNumber: originalIdNumber,
            issuingAuthority: 'US',
            issueDate: new Date('2021-01-01'),
            expirationDate: new Date('2031-01-01')
          }]
        },
        departmentMemberships: []
      });

      // Get encrypted value
      const firstSave = await Learner.findById(learner._id).lean();
      const firstEncrypted = firstSave!.personExtended!.identifications![0].idNumber!;
      expect(isEncrypted(firstEncrypted)).toBe(true);

      // Save again (should not re-encrypt)
      const learnerDoc = await Learner.findById(learner._id);
      learnerDoc!.person.firstName = 'Robert'; // Modify different field
      await learnerDoc!.save();

      // Verify still encrypted with same value
      const secondSave = await Learner.findById(learner._id).lean();
      const secondEncrypted = secondSave!.personExtended!.identifications![0].idNumber!;
      expect(secondEncrypted).toBe(firstEncrypted);

      // Verify still decrypts correctly
      const finalDoc = await Learner.findById(learner._id);
      const decrypted = finalDoc!.personExtended!.identifications![0].getDecryptedIdNumber!();
      expect(decrypted).toBe(originalIdNumber);
    });

    it('should encrypt multiple identifications correctly', async () => {
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');
      await User.create({
        _id: userId,
        email: 'learner5@example.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      const learner = await Learner.create({
        _id: userId,
        person: {
          firstName: 'Charlie',
          lastName: 'Brown',
          emails: [{
            email: 'learner5@example.com',
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
              idNumber: 'P9876543',
              issuingAuthority: 'US',
              issueDate: new Date('2019-01-01'),
              expirationDate: new Date('2029-01-01')
            },
            {
              idType: 'drivers-license',
              idNumber: 'DL-987-654-321',
              issuingAuthority: 'Texas DPS',
              issueDate: new Date('2020-05-15'),
              expirationDate: new Date('2028-05-15')
            }
          ]
        },
        departmentMemberships: []
      });

      // Retrieve and verify both are encrypted
      const savedLearner = await Learner.findById(learner._id).lean();
      expect(isEncrypted(savedLearner!.personExtended!.identifications![0].idNumber!)).toBe(true);
      expect(isEncrypted(savedLearner!.personExtended!.identifications![1].idNumber!)).toBe(true);

      // Verify both decrypt correctly
      const learnerDoc = await Learner.findById(learner._id);
      expect(learnerDoc!.personExtended!.identifications![0].getDecryptedIdNumber!()).toBe('P9876543');
      expect(learnerDoc!.personExtended!.identifications![1].getDecryptedIdNumber!()).toBe('DL-987-654-321');
    });
  });

  // ==========================================================================
  // LEARNER DEMOGRAPHICS - ALIEN REGISTRATION NUMBER ENCRYPTION
  // ==========================================================================

  describe('Learner Demographics - alienRegistrationNumber Encryption', () => {
    it('should automatically encrypt alienRegistrationNumber on save', async () => {
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');
      await User.create({
        _id: userId,
        email: 'international-learner@example.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      const learner = await Learner.create({
        _id: userId,
        person: {
          firstName: 'Maria',
          lastName: 'Garcia',
          emails: [{
            email: 'international-learner@example.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        demographics: {
          citizenship: 'permanent-resident',
          alienRegistrationNumber: 'A123456789',
          countryOfCitizenship: 'MX'
        },
        departmentMemberships: []
      });

      // Verify alienRegistrationNumber is encrypted
      const savedLearner = await Learner.findById(learner._id).lean();
      expect(savedLearner?.demographics?.alienRegistrationNumber).toBeDefined();
      expect(isEncrypted(savedLearner!.demographics!.alienRegistrationNumber!)).toBe(true);
      expect(savedLearner!.demographics!.alienRegistrationNumber).not.toBe('A123456789');
    });

    it('should handle round-trip encryption/decryption for alienRegistrationNumber', async () => {
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');
      await User.create({
        _id: userId,
        email: 'visa-learner@example.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      const originalANumber = 'A987654321';

      const learner = await Learner.create({
        _id: userId,
        person: {
          firstName: 'Wei',
          lastName: 'Chen',
          emails: [{
            email: 'visa-learner@example.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        demographics: {
          citizenship: 'visa-holder',
          visaType: 'f1',
          alienRegistrationNumber: originalANumber,
          countryOfCitizenship: 'CN'
        },
        departmentMemberships: []
      });

      // Verify encrypted in storage
      const rawLearner = await Learner.findById(learner._id).lean();
      expect(isEncrypted(rawLearner!.demographics!.alienRegistrationNumber!)).toBe(true);

      // Decrypt manually
      const encryptedValue = rawLearner!.demographics!.alienRegistrationNumber!;
      const decrypted = decrypt(encryptedValue);
      expect(decrypted).toBe(originalANumber);
    });

    it('should not double-encrypt alienRegistrationNumber (idempotent)', async () => {
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');
      await User.create({
        _id: userId,
        email: 'refugee-learner@example.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      const originalANumber = 'A555444333';

      const learner = await Learner.create({
        _id: userId,
        person: {
          firstName: 'Ahmed',
          lastName: 'Hassan',
          emails: [{
            email: 'refugee-learner@example.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        demographics: {
          citizenship: 'refugee-asylee',
          alienRegistrationNumber: originalANumber,
          countryOfCitizenship: 'SY'
        },
        departmentMemberships: []
      });

      // Get first encrypted value
      const firstSave = await Learner.findById(learner._id).lean();
      const firstEncrypted = firstSave!.demographics!.alienRegistrationNumber!;
      expect(isEncrypted(firstEncrypted)).toBe(true);

      // Update and save again
      const learnerDoc = await Learner.findById(learner._id);
      learnerDoc!.demographics!.citizenship = 'permanent-resident';
      await learnerDoc!.save();

      // Verify not re-encrypted
      const secondSave = await Learner.findById(learner._id).lean();
      const secondEncrypted = secondSave!.demographics!.alienRegistrationNumber!;
      expect(secondEncrypted).toBe(firstEncrypted);

      // Verify still decrypts correctly
      const decrypted = decrypt(secondEncrypted);
      expect(decrypted).toBe(originalANumber);
    });
  });

  // ==========================================================================
  // STAFF DEMOGRAPHICS - ALIEN REGISTRATION NUMBER ENCRYPTION
  // ==========================================================================

  describe('Staff Demographics - alienRegistrationNumber Encryption', () => {
    it('should automatically encrypt staff alienRegistrationNumber on save', async () => {
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');
      await User.create({
        _id: userId,
        email: 'international-staff@example.com',
        password: hashedPassword,
        userTypes: ['staff'],
        defaultDashboard: 'staff',
        isActive: true
      });

      const staff = await Staff.create({
        _id: userId,
        person: {
          firstName: 'Yuki',
          lastName: 'Tanaka',
          emails: [{
            email: 'international-staff@example.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        demographics: {
          citizenship: 'visa-holder',
          visaType: 'h1b',
          alienRegistrationNumber: 'A111222333',
          countryOfCitizenship: 'JP'
        },
        departmentMemberships: [],
        isActive: true
      });

      // Verify alienRegistrationNumber is encrypted
      const savedStaff = await Staff.findById(staff._id).lean();
      expect(savedStaff?.demographics?.alienRegistrationNumber).toBeDefined();
      expect(isEncrypted(savedStaff!.demographics!.alienRegistrationNumber!)).toBe(true);
      expect(savedStaff!.demographics!.alienRegistrationNumber).not.toBe('A111222333');
    });

    it('should handle round-trip encryption/decryption for staff', async () => {
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');
      await User.create({
        _id: userId,
        email: 'h1b-staff@example.com',
        password: hashedPassword,
        userTypes: ['staff'],
        defaultDashboard: 'staff',
        isActive: true
      });

      const originalANumber = 'A777888999';

      const staff = await Staff.create({
        _id: userId,
        person: {
          firstName: 'Rajesh',
          lastName: 'Kumar',
          emails: [{
            email: 'h1b-staff@example.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        demographics: {
          citizenship: 'visa-holder',
          visaType: 'h1b',
          alienRegistrationNumber: originalANumber,
          countryOfCitizenship: 'IN',
          visaExpirationDate: new Date('2026-12-31')
        },
        departmentMemberships: [],
        isActive: true
      });

      // Verify encrypted in storage
      const rawStaff = await Staff.findById(staff._id).lean();
      expect(isEncrypted(rawStaff!.demographics!.alienRegistrationNumber!)).toBe(true);

      // Decrypt manually
      const encryptedValue = rawStaff!.demographics!.alienRegistrationNumber!;
      const decrypted = decrypt(encryptedValue);
      expect(decrypted).toBe(originalANumber);
    });

    it('should not double-encrypt staff alienRegistrationNumber (idempotent)', async () => {
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');
      await User.create({
        _id: userId,
        email: 'permanent-resident-staff@example.com',
        password: hashedPassword,
        userTypes: ['staff'],
        defaultDashboard: 'staff',
        isActive: true
      });

      const originalANumber = 'A000111222';

      const staff = await Staff.create({
        _id: userId,
        person: {
          firstName: 'Ana',
          lastName: 'Rodriguez',
          emails: [{
            email: 'permanent-resident-staff@example.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        demographics: {
          citizenship: 'permanent-resident',
          alienRegistrationNumber: originalANumber,
          countryOfCitizenship: 'BR'
        },
        departmentMemberships: [],
        isActive: true
      });

      // Get first encrypted value
      const firstSave = await Staff.findById(staff._id).lean();
      const firstEncrypted = firstSave!.demographics!.alienRegistrationNumber!;
      expect(isEncrypted(firstEncrypted)).toBe(true);

      // Update and save again
      const staffDoc = await Staff.findById(staff._id);
      staffDoc!.person.preferredFirstName = 'Annie';
      await staffDoc!.save();

      // Verify not re-encrypted
      const secondSave = await Staff.findById(staff._id).lean();
      const secondEncrypted = secondSave!.demographics!.alienRegistrationNumber!;
      expect(secondEncrypted).toBe(firstEncrypted);

      // Verify still decrypts correctly
      const decrypted = decrypt(secondEncrypted);
      expect(decrypted).toBe(originalANumber);
    });
  });

  // ==========================================================================
  // EDGE CASES AND ERROR HANDLING
  // ==========================================================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle learner without identifications', async () => {
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');
      await User.create({
        _id: userId,
        email: 'no-id-learner@example.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      const learner = await Learner.create({
        _id: userId,
        person: {
          firstName: 'NoID',
          lastName: 'Student',
          emails: [{
            email: 'no-id-learner@example.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        departmentMemberships: []
      });

      const savedLearner = await Learner.findById(learner._id);
      expect(savedLearner).toBeDefined();
      expect(savedLearner!.personExtended).toBeUndefined();
    });

    it('should handle learner without alienRegistrationNumber', async () => {
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');
      await User.create({
        _id: userId,
        email: 'us-citizen-learner@example.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      const learner = await Learner.create({
        _id: userId,
        person: {
          firstName: 'US',
          lastName: 'Citizen',
          emails: [{
            email: 'us-citizen-learner@example.com',
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

      const savedLearner = await Learner.findById(learner._id);
      expect(savedLearner!.demographics!.alienRegistrationNumber).toBeUndefined();
    });

    it('should handle staff without demographics', async () => {
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');
      await User.create({
        _id: userId,
        email: 'minimal-staff@example.com',
        password: hashedPassword,
        userTypes: ['staff'],
        defaultDashboard: 'staff',
        isActive: true
      });

      const staff = await Staff.create({
        _id: userId,
        person: {
          firstName: 'Minimal',
          lastName: 'Staff',
          emails: [{
            email: 'minimal-staff@example.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        departmentMemberships: [],
        isActive: true
      });

      const savedStaff = await Staff.findById(staff._id);
      expect(savedStaff).toBeDefined();
      expect(savedStaff!.demographics).toBeUndefined();
    });

    it('should require idNumber field (validation)', async () => {
      const userId = new mongoose.Types.ObjectId();
      const hashedPassword = await hashPassword('Password123!');
      await User.create({
        _id: userId,
        email: 'empty-id@example.com',
        password: hashedPassword,
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        isActive: true
      });

      // Empty idNumber should fail validation
      await expect(Learner.create({
        _id: userId,
        person: {
          firstName: 'Empty',
          lastName: 'ID',
          emails: [{
            email: 'empty-id@example.com',
            type: 'institutional',
            isPrimary: true,
            verified: true
          }]
        },
        personExtended: {
          emergencyContacts: [],
          identifications: [{
            idType: 'passport',
            idNumber: '',
            issuingAuthority: 'US'
          }]
        },
        departmentMemberships: []
      })).rejects.toThrow(/idNumber.*required/);
    });
  });
});
