import mongoose from 'mongoose';
import { User, IUser } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { Learner } from '@/models/auth/Learner.model';
import { hashPassword, comparePassword } from '@/utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '@/utils/jwt';
import { ApiError } from '@/utils/ApiError';
import { Cache } from '@/config/redis';

interface RegisterStaffInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: string[];
  phoneNumber?: string;
  title?: string;
}

interface RegisterLearnerInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  phoneNumber?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResponse {
  user: IUser;
  staff?: any;
  learner?: any;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Register a new staff member
   */
  static async registerStaff(input: RegisterStaffInput): Promise<AuthResponse> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: input.email });
      if (existingUser) {
        throw ApiError.conflict('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await hashPassword(input.password);

      // Create User
      const userId = new mongoose.Types.ObjectId();
      const user = await User.create(
        [
          {
            _id: userId,
            email: input.email,
            password: hashedPassword,
            roles: input.roles
          }
        ],
        { session }
      );

      // Create Staff with same _id
      const staff = await Staff.create(
        [
          {
            _id: userId,
            firstName: input.firstName,
            lastName: input.lastName,
            phoneNumber: input.phoneNumber,
            title: input.title,
            departmentMemberships: []
          }
        ],
        { session }
      );

      await session.commitTransaction();

      // Generate tokens
      const accessToken = generateAccessToken(
        user[0]._id.toString(),
        user[0].email,
        user[0].roles
      );
      const refreshToken = generateRefreshToken(user[0]._id.toString());

      // Store refresh token in cache
      await Cache.set(
        `refresh_token:${user[0]._id}`,
        refreshToken,
        30 * 24 * 60 * 60 // 30 days
      );

      // Remove password from response
      const userObj = user[0].toObject();
      delete userObj.password;

      return {
        user: userObj as IUser,
        staff: staff[0].toObject(),
        accessToken,
        refreshToken
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Register a new learner
   */
  static async registerLearner(input: RegisterLearnerInput): Promise<AuthResponse> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: input.email });
      if (existingUser) {
        throw ApiError.conflict('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await hashPassword(input.password);

      // Create User
      const userId = new mongoose.Types.ObjectId();
      const user = await User.create(
        [
          {
            _id: userId,
            email: input.email,
            password: hashedPassword,
            roles: ['learner']
          }
        ],
        { session }
      );

      // Create Learner with same _id
      const learner = await Learner.create(
        [
          {
            _id: userId,
            firstName: input.firstName,
            lastName: input.lastName,
            dateOfBirth: input.dateOfBirth,
            phoneNumber: input.phoneNumber
          }
        ],
        { session }
      );

      await session.commitTransaction();

      // Generate tokens
      const accessToken = generateAccessToken(
        user[0]._id.toString(),
        user[0].email,
        user[0].roles
      );
      const refreshToken = generateRefreshToken(user[0]._id.toString());

      // Store refresh token in cache
      await Cache.set(
        `refresh_token:${user[0]._id}`,
        refreshToken,
        30 * 24 * 60 * 60
      );

      // Remove password from response
      const userObj = user[0].toObject();
      delete userObj.password;

      return {
        user: userObj as IUser,
        learner: learner[0].toObject(),
        accessToken,
        refreshToken
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Login user
   */
  static async login(input: LoginInput): Promise<AuthResponse> {
    // Find user with password
    const user = await User.findOne({ email: input.email }).select('+password');
    if (!user) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await comparePassword(input.password, user.password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw ApiError.forbidden('Account is inactive');
    }

    // Get staff or learner data
    let staff, learner;
    if (user.roles.includes('learner')) {
      learner = await Learner.findById(user._id);
    }
    if (
      user.roles.some((r) =>
        ['instructor', 'content-admin', 'department-admin', 'billing-admin', 'system-admin'].includes(r)
      )
    ) {
      staff = await Staff.findById(user._id);
    }

    // Generate tokens
    const accessToken = generateAccessToken(
      user._id.toString(),
      user.email,
      user.roles
    );
    const refreshToken = generateRefreshToken(user._id.toString());

    // Store refresh token
    await Cache.set(`refresh_token:${user._id}`, refreshToken, 30 * 24 * 60 * 60);

    // Remove password from response
    const userObj = user.toObject();
    delete userObj.password;

    return {
      user: userObj as IUser,
      staff: staff?.toObject(),
      learner: learner?.toObject(),
      accessToken,
      refreshToken
    };
  }

  /**
   * Refresh access token
   */
  static async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Check if token is in cache
    const cachedToken = await Cache.get(`refresh_token:${payload.userId}`);
    if (cachedToken !== refreshToken) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    // Get user
    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User not found or inactive');
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(
      user._id.toString(),
      user.email,
      user.roles
    );
    const newRefreshToken = generateRefreshToken(user._id.toString());

    // Update refresh token in cache
    await Cache.set(`refresh_token:${user._id}`, newRefreshToken, 30 * 24 * 60 * 60);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  /**
   * Logout user
   */
  static async logout(userId: string): Promise<void> {
    // Remove refresh token from cache
    await Cache.del(`refresh_token:${userId}`);
  }

  /**
   * Get current user
   */
  static async getCurrentUser(userId: string): Promise<AuthResponse> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Get staff or learner data
    let staff, learner;
    if (user.roles.includes('learner')) {
      learner = await Learner.findById(user._id);
    }
    if (
      user.roles.some((r) =>
        ['instructor', 'content-admin', 'department-admin', 'billing-admin', 'system-admin'].includes(r)
      )
    ) {
      staff = await Staff.findById(user._id);
    }

    return {
      user: user.toObject() as IUser,
      staff: staff?.toObject(),
      learner: learner?.toObject(),
      accessToken: '',
      refreshToken: ''
    };
  }
}
