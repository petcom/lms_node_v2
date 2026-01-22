/**
 * Test Authentication Helpers
 *
 * Helper functions for creating test users and getting auth tokens in integration tests.
 */

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User } from '../../src/models/auth/User.model';
import { Staff } from '../../src/models/auth/Staff.model';
import { Learner } from '../../src/models/auth/Learner.model';
import { hashPassword } from '../../src/utils/password';

interface CreateTestUserOptions {
  email?: string;
  type?: 'learner' | 'staff';
  roles?: string[];
  permissions?: string[];
  departmentId?: mongoose.Types.ObjectId;
}

/**
 * Create a test user (learner or staff) with associated profile
 */
export async function createTestUser(options: CreateTestUserOptions = {}): Promise<{
  user: any;
  profile: any;
  id: mongoose.Types.ObjectId;
}> {
  const hashedPassword = await hashPassword('TestPassword123!');
  const userId = new mongoose.Types.ObjectId();
  const userType = options.type || 'staff';

  const user = await User.create({
    _id: userId,
    email: options.email || `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: hashedPassword,
    userTypes: [userType],
    defaultDashboard: userType,
    isActive: true,
    accessRights: options.permissions || []
  });

  let profile: any;

  if (userType === 'learner') {
    profile = await Learner.create({
      _id: userId,
      person: {
        firstName: 'Test',
        lastName: 'Learner',
        emails: [{
          email: user.email,
          type: 'institutional',
          isPrimary: true,
          verified: true
        }],
        phones: [],
        addresses: []
      },
      cohorts: [],
      isActive: true
    });
  } else {
    profile = await Staff.create({
      _id: userId,
      person: {
        firstName: 'Test',
        lastName: 'Staff',
        emails: [{
          email: user.email,
          type: 'institutional',
          isPrimary: true,
          verified: true
        }],
        phones: [],
        addresses: []
      },
      departmentMemberships: options.departmentId ? [{
        departmentId: options.departmentId,
        roles: options.roles || ['instructor'],
        isActive: true,
        joinedAt: new Date()
      }] : [],
      isActive: true
    });
  }

  return { user, profile, id: userId };
}

/**
 * Get an auth token for a user
 */
export async function getAuthToken(user: { id: mongoose.Types.ObjectId; user: any; profile?: any }): Promise<string> {
  const token = jwt.sign(
    {
      userId: user.id.toString(),
      email: user.user.email,
      roles: user.profile?.departmentMemberships?.[0]?.roles || [],
      allAccessRights: user.user.accessRights || [],
      type: 'access'
    },
    process.env.JWT_ACCESS_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  return token;
}

/**
 * Create a test user and return the auth token
 */
export async function createTestUserWithToken(options: CreateTestUserOptions = {}): Promise<{
  user: any;
  profile: any;
  token: string;
}> {
  const result = await createTestUser(options);
  const token = await getAuthToken(result);
  return { ...result, token };
}
