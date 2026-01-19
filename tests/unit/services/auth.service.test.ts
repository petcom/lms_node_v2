import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuthService } from '@/services/auth/auth.service';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { Learner } from '@/models/auth/Learner.model';
import { ApiError } from '@/utils/ApiError';
import * as passwordUtils from '@/utils/password';
import * as jwtUtils from '@/utils/jwt';
import { Cache } from '@/config/redis';
import { describeIfMongo } from '../../helpers/mongo-guard';

jest.mock('@/utils/password');
jest.mock('@/utils/jwt');
jest.mock('@/config/redis', () => ({
  Cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

let mongoServer: MongoMemoryServer;

describeIfMongo('AuthService', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Staff.deleteMany({});
    await Learner.deleteMany({});
    jest.clearAllMocks();
  });

  describe('registerStaff', () => {
    const staffInput = {
      email: 'staff@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      roles: ['instructor'],
      phoneNumber: '123-456-7890',
      title: 'Senior Instructor',
    };

    it('should successfully register a staff member', async () => {
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('hashed_password');
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.registerStaff(staffInput);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('staff');
      expect(result).toHaveProperty('accessToken', 'access_token');
      expect(result).toHaveProperty('refreshToken', 'refresh_token');
      expect(result.user.email).toBe(staffInput.email);
      expect(result.user.userTypes).toContain('staff');
      expect(result.staff.person.firstName).toBe('John');
      expect(result.staff.person.lastName).toBe('Doe');
    });

    it('should throw conflict error if user already exists', async () => {
      await User.create({
        email: staffInput.email,
        password: 'existing_password',
        userTypes: ['staff'],
      });

      await expect(AuthService.registerStaff(staffInput)).rejects.toThrow(ApiError);
      await expect(AuthService.registerStaff(staffInput)).rejects.toMatchObject({
        statusCode: 409,
        message: 'User with this email already exists',
      });
    });

    it('should hash the password before saving', async () => {
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('hashed_password');
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      await AuthService.registerStaff(staffInput);

      expect(passwordUtils.hashPassword).toHaveBeenCalledWith(staffInput.password);
      
      const user = await User.findOne({ email: staffInput.email }).select('+password');
      expect(user?.password).toBe('hashed_password');
    });

    it('should create User and Staff with same _id', async () => {
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('hashed_password');
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.registerStaff(staffInput);

      const user = await User.findOne({ email: staffInput.email });
      const staff = await Staff.findById(user?._id);

      expect(user).toBeDefined();
      expect(staff).toBeDefined();
      expect(user?._id.toString()).toBe(staff?._id.toString());
    });

    it('should generate and cache tokens', async () => {
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('hashed_password');
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.registerStaff(staffInput);

      expect(jwtUtils.generateAccessToken).toHaveBeenCalled();
      expect(jwtUtils.generateRefreshToken).toHaveBeenCalled();
      expect(Cache.set).toHaveBeenCalledWith(
        expect.stringContaining('refresh_token:'),
        'refresh_token',
        30 * 24 * 60 * 60
      );
    });

    it('should not return password in response', async () => {
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('hashed_password');
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.registerStaff(staffInput);

      expect(result.user).not.toHaveProperty('password');
    });

    it('should cleanup User and Staff on error', async () => {
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('hashed_password');
      (jwtUtils.generateAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      await expect(AuthService.registerStaff(staffInput)).rejects.toThrow();

      const user = await User.findOne({ email: staffInput.email });
      const staff = await Staff.findOne({ firstName: staffInput.firstName });

      expect(user).toBeNull();
      expect(staff).toBeNull();
    });
  });

  describe('registerLearner', () => {
    const learnerInput = {
      email: 'learner@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: new Date('2000-01-01'),
      phoneNumber: '987-654-3210',
    };

    it('should successfully register a learner', async () => {
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('hashed_password');
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.registerLearner(learnerInput);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('learner');
      expect(result).toHaveProperty('accessToken', 'access_token');
      expect(result).toHaveProperty('refreshToken', 'refresh_token');
      expect(result.user.userTypes).toContain('learner');
      expect(result.learner.person.firstName).toBe('Jane');
    });

    it('should throw conflict error if user already exists', async () => {
      await User.create({
        email: learnerInput.email,
        password: 'existing_password',
        userTypes: ['learner'],
      });

      await expect(AuthService.registerLearner(learnerInput)).rejects.toThrow(ApiError);
      await expect(AuthService.registerLearner(learnerInput)).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it('should create User with learner role', async () => {
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('hashed_password');
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      await AuthService.registerLearner(learnerInput);

      const user = await User.findOne({ email: learnerInput.email });
      expect(user?.userTypes).toEqual(['learner']);
    });

    it('should cleanup User and Learner on error', async () => {
      (passwordUtils.hashPassword as jest.Mock).mockResolvedValue('hashed_password');
      (Cache.set as jest.Mock).mockRejectedValue(new Error('Cache error'));

      await expect(AuthService.registerLearner(learnerInput)).rejects.toThrow();

      const user = await User.findOne({ email: learnerInput.email });
      const learner = await Learner.findOne({ firstName: learnerInput.firstName });

      expect(user).toBeNull();
      expect(learner).toBeNull();
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      const userId = new mongoose.Types.ObjectId();

      await User.create({
        _id: userId,
        email: 'test@example.com',
        password: 'hashed_password',
        userTypes: ['learner'],
        isActive: true,
      });

      await Learner.create({
        _id: userId,
        person: {
          firstName: 'Test',
          lastName: 'User',
          emails: [{
            email: 'test@example.com',
            type: 'institutional',
            isPrimary: true,
            verified: true,
            allowNotifications: true
          }],
          phones: [],
          addresses: [],
          timezone: 'America/New_York',
          languagePreference: 'en'
        }
      });
    });

    it('should successfully login with valid credentials', async () => {
      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(true);
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('session');
      expect(result.session).toHaveProperty('accessToken', 'access_token');
      expect(result.session).toHaveProperty('refreshToken', 'refresh_token');
    });

    it('should throw unauthorized error for invalid email', async () => {
      await expect(
        AuthService.login({
          email: 'invalid@example.com',
          password: 'password123',
        })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials',
      });
    });

    it('should throw unauthorized error for invalid password', async () => {
      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(
        AuthService.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials',
      });
    });

    it('should throw forbidden error for inactive user', async () => {
      await User.updateOne(
        { email: 'test@example.com' },
        { isActive: false }
      );

      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(true);

      await expect(
        AuthService.login({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Account is inactive',
      });
    });

    it('should fetch learner data for learner role', async () => {
      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(true);
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toBeDefined();
      expect(result.user.firstName).toBe('Test');
      expect(result.userTypes).toContainEqual({ _id: 'learner', displayAs: 'Learner' });
    });

    it('should fetch staff data for instructor role', async () => {
      const userId = new mongoose.Types.ObjectId();

      await User.create({
        _id: userId,
        email: 'instructor@example.com',
        password: 'hashed_password',
        userTypes: ['staff'],
        isActive: true,
      });

      await Staff.create({
        _id: userId,
        person: {
          firstName: 'Instructor',
          lastName: 'User',
          emails: [{
            email: 'instructor@example.com',
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
      });

      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(true);
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.login({
        email: 'instructor@example.com',
        password: 'password123',
      });

      expect(result.user).toBeDefined();
      expect(result.user.firstName).toBe('Instructor');
      expect(result.userTypes).toContainEqual({ _id: 'staff', displayAs: 'Staff' });
    });

    it('should not return password in response', async () => {
      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(true);
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).not.toHaveProperty('password');
    });
  });

  describe('refresh', () => {
    let userId: string;

    beforeEach(async () => {
      userId = new mongoose.Types.ObjectId().toString();
      
      await User.create({
        _id: userId,
        email: 'test@example.com',
        password: 'hashed_password',
        userTypes: ['learner'],
        isActive: true,
      });
    });

    it('should successfully refresh tokens', async () => {
      (jwtUtils.verifyRefreshToken as jest.Mock).mockReturnValue({ userId });
      (Cache.get as jest.Mock).mockResolvedValue('old_refresh_token');
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('new_access_token');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('new_refresh_token');
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.refresh('old_refresh_token');

      expect(result).toEqual({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      });
    });

    it('should throw unauthorized error for invalid token', async () => {
      (jwtUtils.verifyRefreshToken as jest.Mock).mockReturnValue({ userId });
      (Cache.get as jest.Mock).mockResolvedValue('different_token');

      await expect(AuthService.refresh('invalid_token')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid refresh token',
      });
    });

    it('should throw unauthorized error if user not found', async () => {
      const fakeUserId = new mongoose.Types.ObjectId().toString();
      
      (jwtUtils.verifyRefreshToken as jest.Mock).mockReturnValue({ userId: fakeUserId });
      (Cache.get as jest.Mock).mockResolvedValue('refresh_token');

      await expect(AuthService.refresh('refresh_token')).rejects.toMatchObject({
        statusCode: 401,
        message: 'User not found or inactive',
      });
    });

    it('should throw unauthorized error if user inactive', async () => {
      await User.updateOne({ _id: userId }, { isActive: false });

      (jwtUtils.verifyRefreshToken as jest.Mock).mockReturnValue({ userId });
      (Cache.get as jest.Mock).mockResolvedValue('refresh_token');

      await expect(AuthService.refresh('refresh_token')).rejects.toMatchObject({
        statusCode: 401,
        message: 'User not found or inactive',
      });
    });

    it('should update refresh token in cache', async () => {
      (jwtUtils.verifyRefreshToken as jest.Mock).mockReturnValue({ userId });
      (Cache.get as jest.Mock).mockResolvedValue('old_refresh_token');
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue('new_access_token');
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue('new_refresh_token');
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      await AuthService.refresh('old_refresh_token');

      expect(Cache.set).toHaveBeenCalledWith(
        `refresh_token:${userId}`,
        'new_refresh_token',
        30 * 24 * 60 * 60
      );
    });
  });

  describe('logout', () => {
    it('should remove refresh token from cache', async () => {
      (Cache.del as jest.Mock).mockResolvedValue(undefined);

      await AuthService.logout('user123');

      expect(Cache.del).toHaveBeenCalledWith('refresh_token:user123');
    });
  });

  describe('getCurrentUser', () => {
    let userId: string;

    beforeEach(async () => {
      userId = new mongoose.Types.ObjectId().toString();
      
      await User.create({
        _id: userId,
        email: 'test@example.com',
        password: 'hashed_password',
        userTypes: ['learner'],
        isActive: true,
      });

      await Learner.create({
        _id: userId,
        person: {
          firstName: 'Test',
          lastName: 'User',
          emails: [{
            email: 'test@example.com',
            type: 'institutional',
            isPrimary: true,
            verified: true,
            allowNotifications: true
          }],
          phones: [],
          addresses: [],
          timezone: 'America/New_York',
          languagePreference: 'en'
        }
      });
    });

    it('should return user with learner data', async () => {
      const result = await AuthService.getCurrentUser(userId);

      expect(result.user).toBeDefined();
      expect(result.user.firstName).toBe('Test');
      expect(result.userTypes).toBeDefined();
    });

    it('should return user with staff data for staff roles', async () => {
      const staffUserId = new mongoose.Types.ObjectId().toString();

      await User.create({
        _id: staffUserId,
        email: 'staff@example.com',
        password: 'hashed_password',
        userTypes: ['staff'],
        isActive: true,
      });

      await Staff.create({
        _id: staffUserId,
        person: {
          firstName: 'Staff',
          lastName: 'Member',
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
        departmentMemberships: [],
      });

      const result = await AuthService.getCurrentUser(staffUserId);

      expect(result.user).toBeDefined();
      expect(result.user.firstName).toBe('Staff');
      expect(result.userTypes).toBeDefined();
    });

    it('should throw not found error for non-existent user', async () => {
      const fakeUserId = new mongoose.Types.ObjectId().toString();
      
      await expect(
        AuthService.getCurrentUser(fakeUserId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'User not found',
      });
    });

    it('should return department memberships and access rights', async () => {
      const result = await AuthService.getCurrentUser(userId);

      expect(result.departmentMemberships).toBeDefined();
      expect(result.allAccessRights).toBeDefined();
      expect(Array.isArray(result.departmentMemberships)).toBe(true);
      expect(Array.isArray(result.allAccessRights)).toBe(true);
    });
  });
});
