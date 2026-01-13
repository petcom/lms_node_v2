import mongoose from 'mongoose';
import { User, IUser } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { Learner } from '@/models/auth/Learner.model';
import { GlobalAdmin } from '@/models/GlobalAdmin.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import Department from '@/models/organization/Department.model';
import { hashPassword, comparePassword } from '@/utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '@/utils/jwt';
import { ApiError } from '@/utils/ApiError';
import { Cache } from '@/config/redis';
import { toUserTypeObjects, UserTypeObject } from '@/utils/user-type.utils';

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

// V2 Login Response Types
interface DepartmentMembershipResponse {
  departmentId: string;
  departmentName: string;
  departmentSlug: string;
  roles: string[];
  accessRights: string[];
  isPrimary: boolean;
  isActive: boolean;
  joinedAt: string;
  childDepartments?: Array<{
    departmentId: string;
    departmentName: string;
    roles: string[];
  }>;
}

interface LoginResponseV2 {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    lastLogin: string | null;
    createdAt: string;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer' | 'DPoP';
  };
  userTypes: UserTypeObject[];
  defaultDashboard: 'learner' | 'staff';
  canEscalateToAdmin: boolean;
  departmentMemberships: DepartmentMembershipResponse[];
  allAccessRights: string[];
  lastSelectedDepartment: string | null;
}

export class AuthService {
  /**
   * Register a new staff member
   */
  static async registerStaff(input: RegisterStaffInput): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await User.findOne({ email: input.email });
    if (existingUser) {
      throw ApiError.conflict('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(input.password);

    // Create User
    const userId = new mongoose.Types.ObjectId();
    
    try {
      const user = await User.create({
        _id: userId,
        email: input.email,
        password: hashedPassword,
        userTypes: ['staff']
      });

      // Create Staff with same _id
      const staff = await Staff.create({
        _id: userId,
        person: {
          firstName: input.firstName,
          lastName: input.lastName,
          emails: [{
            email: input.email,
            type: 'institutional',
            isPrimary: true,
            verified: true,
            allowNotifications: true
          }],
          phones: input.phoneNumber ? [{
            number: input.phoneNumber,
            type: 'mobile',
            isPrimary: true,
            verified: false,
            allowNotifications: true
          }] : [],
          addresses: [],
          timezone: 'America/New_York',
          languagePreference: 'en'
        },
        title: input.title,
        departmentMemberships: []
      });

      // Generate tokens
      const accessToken = generateAccessToken(
        user._id.toString(),
        user.email,
        user.userTypes
      );
      const refreshToken = generateRefreshToken(user._id.toString());

      // Store refresh token in cache
      await Cache.set(
        `refresh_token:${user._id}`,
        refreshToken,
        30 * 24 * 60 * 60 // 30 days
      );

      // Remove password from response
      const userObj = user.toObject();
      const { password: _, ...userWithoutPassword } = userObj;

      return {
        user: userWithoutPassword as unknown as IUser,
        staff: staff.toObject(),
        accessToken,
        refreshToken
      };
    } catch (error) {
      // Cleanup on error
      await User.findByIdAndDelete(userId);
      await Staff.findByIdAndDelete(userId);
      throw error;
    }
  }

  /**
   * Register a new learner
   */
  static async registerLearner(input: RegisterLearnerInput): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await User.findOne({ email: input.email });
    if (existingUser) {
      throw ApiError.conflict('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(input.password);

    // Create User
    const userId = new mongoose.Types.ObjectId();

    try {
      const user = await User.create({
        _id: userId,
        email: input.email,
        password: hashedPassword,
        userTypes: ['learner']
      });

      // Create Learner with same _id
      const learner = await Learner.create({
        _id: userId,
        person: {
          firstName: input.firstName,
          lastName: input.lastName,
          emails: [{
            email: input.email,
            type: 'institutional',
            isPrimary: true,
            verified: true,
            allowNotifications: true
          }],
          phones: input.phoneNumber ? [{
            number: input.phoneNumber,
            type: 'mobile',
            isPrimary: true,
            verified: false,
            allowNotifications: true
          }] : [],
          addresses: [],
          timezone: 'America/New_York',
          languagePreference: 'en',
          dateOfBirth: input.dateOfBirth
        }
      });

      // Generate tokens
      const accessToken = generateAccessToken(
        user._id.toString(),
        user.email,
        user.userTypes
      );
      const refreshToken = generateRefreshToken(user._id.toString());

      // Store refresh token in cache
      await Cache.set(
        `refresh_token:${user._id}`,
        refreshToken,
        30 * 24 * 60 * 60
      );

      // Remove password from response
      const userObj = user.toObject();
      const { password: _, ...userWithoutPassword } = userObj;

      return {
        user: userWithoutPassword as unknown as IUser,
        learner: learner.toObject(),
        accessToken,
        refreshToken
      };
    } catch (error) {
      // Cleanup on error
      await User.findByIdAndDelete(userId);
      await Learner.findByIdAndDelete(userId);
      throw error;
    }
  }

  /**
   * Login user - V2 Response with Full Role System Support
   */
  static async login(input: LoginInput): Promise<LoginResponseV2> {
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

    // Get staff, learner, and global admin data
    const [staff, learner, globalAdmin] = await Promise.all([
      Staff.findById(user._id),
      Learner.findById(user._id),
      GlobalAdmin.findById(user._id)
    ]);

    // Build department memberships with roles and access rights
    const departmentMemberships: DepartmentMembershipResponse[] = [];
    const allAccessRightsSet = new Set<string>();

    // Process Staff department memberships
    if (staff && staff.departmentMemberships.length > 0) {
      for (const membership of staff.departmentMemberships) {
        if (!membership.isActive) continue;

        // Get department details
        const department = await Department.findById(membership.departmentId);
        if (!department) continue;

        // Get access rights for all roles in this membership
        const accessRights = await RoleDefinition.getCombinedAccessRights(membership.roles);

        // Add to all access rights
        accessRights.forEach((right: string) => allAccessRightsSet.add(right));

        // Get child departments
        const childDepartments = await Department.find({
          parentDepartmentId: membership.departmentId,
          isActive: true,
          isVisible: true
        });

        departmentMemberships.push({
          departmentId: membership.departmentId.toString(),
          departmentName: department.name,
          departmentSlug: department.code.toLowerCase(),
          roles: membership.roles,
          accessRights,
          isPrimary: membership.isPrimary,
          isActive: membership.isActive,
          joinedAt: membership.joinedAt.toISOString(),
          childDepartments: childDepartments.map(child => ({
            departmentId: child._id.toString(),
            departmentName: child.name,
            roles: membership.roles // Roles cascade to children
          }))
        });
      }
    }

    // Process Learner department memberships
    if (learner && learner.departmentMemberships.length > 0) {
      for (const membership of learner.departmentMemberships) {
        if (!membership.isActive) continue;

        // Get department details
        const department = await Department.findById(membership.departmentId);
        if (!department) continue;

        // Get access rights for all roles in this membership
        const accessRights = await RoleDefinition.getCombinedAccessRights(membership.roles);

        // Add to all access rights
        accessRights.forEach((right: string) => allAccessRightsSet.add(right));

        // Get child departments
        const childDepartments = await Department.find({
          parentDepartmentId: membership.departmentId,
          isActive: true,
          isVisible: true
        });

        departmentMemberships.push({
          departmentId: membership.departmentId.toString(),
          departmentName: department.name,
          departmentSlug: department.code.toLowerCase(),
          roles: membership.roles,
          accessRights,
          isPrimary: membership.isPrimary,
          isActive: membership.isActive,
          joinedAt: membership.joinedAt.toISOString(),
          childDepartments: childDepartments.map(child => ({
            departmentId: child._id.toString(),
            departmentName: child.name,
            roles: membership.roles // Roles cascade to children
          }))
        });
      }
    }

    // Process GlobalAdmin role memberships
    if (globalAdmin && globalAdmin.roleMemberships.length > 0) {
      for (const roleMembership of globalAdmin.roleMemberships) {
        if (!roleMembership.isActive) continue;

        // Get access rights for admin roles
        const accessRights = await RoleDefinition.getCombinedAccessRights(roleMembership.roles as string[]);

        // Add to all access rights
        accessRights.forEach((right: string) => allAccessRightsSet.add(right));
      }
    }

    // Convert access rights set to array
    const allAccessRights = Array.from(allAccessRightsSet);

    // Determine if user can escalate to admin
    const canEscalateToAdmin = user.canEscalateToAdmin() && !!globalAdmin && globalAdmin.isActive;

    // Generate tokens
    const accessToken = generateAccessToken(
      user._id.toString(),
      user.email,
      user.userTypes
    );
    const refreshToken = generateRefreshToken(user._id.toString());

    // Store refresh token
    await Cache.set(`refresh_token:${user._id}`, refreshToken, 30 * 24 * 60 * 60);

    // Build user info (with firstName/lastName from Staff or Learner)
    let firstName = 'Unknown';
    let lastName = 'User';

    if (staff) {
      firstName = staff.person.firstName;
      lastName = staff.person.lastName;
    } else if (learner) {
      firstName = learner.person.firstName;
      lastName = learner.person.lastName;
    }

    // Build V2 response
    const response: LoginResponseV2 = {
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName,
        lastName,
        isActive: user.isActive,
        lastLogin: null, // TODO: Track last login timestamp
        createdAt: user.createdAt.toISOString()
      },
      session: {
        accessToken,
        refreshToken,
        expiresIn: 3600, // 1 hour in seconds
        tokenType: 'Bearer'
      },
      userTypes: toUserTypeObjects(user.userTypes),
      defaultDashboard: user.defaultDashboard,
      canEscalateToAdmin,
      departmentMemberships,
      allAccessRights,
      lastSelectedDepartment: user.lastSelectedDepartment?.toString() || null
    };

    return response;
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
      user.userTypes
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
   * Get current user - V2 with userTypes and access rights
   */
  static async getCurrentUser(userId: string): Promise<any> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Get staff, learner, and global admin data
    const [staff, learner, globalAdmin] = await Promise.all([
      Staff.findById(user._id),
      Learner.findById(user._id),
      GlobalAdmin.findById(user._id)
    ]);

    // Build department memberships with roles and access rights
    const departmentMemberships: DepartmentMembershipResponse[] = [];
    const allAccessRightsSet = new Set<string>();

    // Process Staff department memberships
    if (staff && staff.departmentMemberships.length > 0) {
      for (const membership of staff.departmentMemberships) {
        if (!membership.isActive) continue;

        // Get department details
        const department = await Department.findById(membership.departmentId);
        if (!department) continue;

        // Get access rights for all roles in this membership
        const accessRights = await RoleDefinition.getCombinedAccessRights(membership.roles);

        // Add to all access rights
        accessRights.forEach((right: string) => allAccessRightsSet.add(right));

        // Get child departments
        const childDepartments = await Department.find({
          parentDepartmentId: membership.departmentId,
          isActive: true,
          isVisible: true
        });

        departmentMemberships.push({
          departmentId: membership.departmentId.toString(),
          departmentName: department.name,
          departmentSlug: department.code.toLowerCase(),
          roles: membership.roles,
          accessRights,
          isPrimary: membership.isPrimary,
          isActive: membership.isActive,
          joinedAt: membership.joinedAt.toISOString(),
          childDepartments: childDepartments.map(child => ({
            departmentId: child._id.toString(),
            departmentName: child.name,
            roles: membership.roles // Roles cascade to children
          }))
        });
      }
    }

    // Process Learner department memberships
    if (learner && learner.departmentMemberships.length > 0) {
      for (const membership of learner.departmentMemberships) {
        if (!membership.isActive) continue;

        // Get department details
        const department = await Department.findById(membership.departmentId);
        if (!department) continue;

        // Get access rights for all roles in this membership
        const accessRights = await RoleDefinition.getCombinedAccessRights(membership.roles);

        // Add to all access rights
        accessRights.forEach((right: string) => allAccessRightsSet.add(right));

        // Get child departments
        const childDepartments = await Department.find({
          parentDepartmentId: membership.departmentId,
          isActive: true,
          isVisible: true
        });

        departmentMemberships.push({
          departmentId: membership.departmentId.toString(),
          departmentName: department.name,
          departmentSlug: department.code.toLowerCase(),
          roles: membership.roles,
          accessRights,
          isPrimary: membership.isPrimary,
          isActive: membership.isActive,
          joinedAt: membership.joinedAt.toISOString(),
          childDepartments: childDepartments.map(child => ({
            departmentId: child._id.toString(),
            departmentName: child.name,
            roles: membership.roles // Roles cascade to children
          }))
        });
      }
    }

    // Process GlobalAdmin role memberships
    if (globalAdmin && globalAdmin.roleMemberships.length > 0) {
      for (const roleMembership of globalAdmin.roleMemberships) {
        if (!roleMembership.isActive) continue;

        // Get access rights for admin roles
        const accessRights = await RoleDefinition.getCombinedAccessRights(roleMembership.roles as string[]);

        // Add to all access rights
        accessRights.forEach((right: string) => allAccessRightsSet.add(right));
      }
    }

    // Convert access rights set to array
    const allAccessRights = Array.from(allAccessRightsSet);

    // Determine if user can escalate to admin
    const canEscalateToAdmin = user.canEscalateToAdmin() && !!globalAdmin && globalAdmin.isActive;

    // Check if admin session is currently active
    const { EscalationService } = await import('@/services/auth/escalation.service');
    const isAdminSessionActive = await EscalationService.isAdminSessionActive(user._id);
    const adminSession = isAdminSessionActive ? await EscalationService.getAdminSession(user._id) : null;

    // Build user info (with firstName/lastName from Staff or Learner)
    let firstName = 'Unknown';
    let lastName = 'User';

    if (staff) {
      firstName = staff.person.firstName;
      lastName = staff.person.lastName;
    } else if (learner) {
      firstName = learner.person.firstName;
      lastName = learner.person.lastName;
    }

    // Build V2 response
    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName,
        lastName,
        isActive: user.isActive,
        lastLogin: null, // TODO: Track last login timestamp
        createdAt: user.createdAt.toISOString()
      },
      userTypes: toUserTypeObjects(user.userTypes),
      defaultDashboard: user.defaultDashboard,
      canEscalateToAdmin,
      departmentMemberships,
      allAccessRights,
      lastSelectedDepartment: user.lastSelectedDepartment?.toString() || null,
      isAdminSessionActive,
      adminSessionExpiresAt: adminSession?.expiresAt?.toISOString() || null
    };
  }
}
