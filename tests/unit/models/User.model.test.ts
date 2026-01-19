import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User, IUser, UserType } from '@/models/auth/User.model';
import Department from '@/models/organization/Department.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('User Model - Phase 1 Changes', () => {
  let mongoServer: MongoMemoryServer;
  let testDepartment: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    testDepartment = await Department.create({
      name: 'Engineering',
      code: 'ENG'
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Department.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid user with default values', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123'
      });

      expect(user.email).toBe('test@example.com');
      expect(user.userTypes).toEqual(['learner']);
      expect(user.defaultDashboard).toBe('learner');
      expect(user.isActive).toBe(true);
      expect(user.lastSelectedDepartment).toBeUndefined();
    });

    it('should require email field', async () => {
      const user = new User({
        password: 'hashedpassword123'
      });

      await expect(user.save()).rejects.toThrow(/email/);
    });

    it('should require password field', async () => {
      const user = new User({
        email: 'test@example.com'
      });

      await expect(user.save()).rejects.toThrow(/password/);
    });

    it('should enforce unique email', async () => {
      await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123'
      });

      await expect(
        User.create({
          email: 'test@example.com',
          password: 'anotherpassword456'
        })
      ).rejects.toThrow(/duplicate/);
    });

    it('should convert email to lowercase', async () => {
      const user = await User.create({
        email: 'TEST@EXAMPLE.COM',
        password: 'hashedpassword123'
      });

      expect(user.email).toBe('test@example.com');
    });

    it('should trim whitespace from email', async () => {
      const user = await User.create({
        email: '  test@example.com  ',
        password: 'hashedpassword123'
      });

      expect(user.email).toBe('test@example.com');
    });

    it('should auto-generate timestamps', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123'
      });

      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('userTypes Field', () => {
    it('should allow single userType: learner', async () => {
      const user = await User.create({
        email: 'learner@example.com',
        password: 'hashedpassword123',
        userTypes: ['learner']
      });

      expect(user.userTypes).toEqual(['learner']);
    });

    it('should allow single userType: staff', async () => {
      const user = await User.create({
        email: 'staff@example.com',
        password: 'hashedpassword123',
        userTypes: ['staff']
      });

      expect(user.userTypes).toEqual(['staff']);
    });

    it('should allow single userType: global-admin', async () => {
      const user = await User.create({
        email: 'admin@example.com',
        password: 'hashedpassword123',
        userTypes: ['global-admin']
      });

      expect(user.userTypes).toEqual(['global-admin']);
    });

    it('should allow multiple userTypes: learner and staff', async () => {
      const user = await User.create({
        email: 'hybrid@example.com',
        password: 'hashedpassword123',
        userTypes: ['learner', 'staff']
      });

      expect(user.userTypes).toContain('learner');
      expect(user.userTypes).toContain('staff');
      expect(user.userTypes).toHaveLength(2);
    });

    it('should allow all three userTypes', async () => {
      const user = await User.create({
        email: 'superuser@example.com',
        password: 'hashedpassword123',
        userTypes: ['learner', 'staff', 'global-admin']
      });

      expect(user.userTypes).toContain('learner');
      expect(user.userTypes).toContain('staff');
      expect(user.userTypes).toContain('global-admin');
      expect(user.userTypes).toHaveLength(3);
    });

    it('should reject empty userTypes array', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'hashedpassword123',
        userTypes: []
      });

      await expect(user.save()).rejects.toThrow(/must have at least one userType/);
    });

    it('should reject invalid userType', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'hashedpassword123',
        userTypes: ['invalid-type' as UserType]
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should default to [learner] if not specified', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123'
      });

      expect(user.userTypes).toEqual(['learner']);
    });
  });

  describe('defaultDashboard Field', () => {
    it('should default to "learner" for new user', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123'
      });

      expect(user.defaultDashboard).toBe('learner');
    });

    it('should be "learner" for learner-only user', async () => {
      const user = await User.create({
        email: 'learner@example.com',
        password: 'hashedpassword123',
        userTypes: ['learner']
      });

      expect(user.defaultDashboard).toBe('learner');
    });

    it('should be "staff" for staff-only user', async () => {
      const user = await User.create({
        email: 'staff@example.com',
        password: 'hashedpassword123',
        userTypes: ['staff']
      });

      expect(user.defaultDashboard).toBe('staff');
    });

    it('should be "staff" for global-admin-only user', async () => {
      const user = await User.create({
        email: 'admin@example.com',
        password: 'hashedpassword123',
        userTypes: ['global-admin']
      });

      expect(user.defaultDashboard).toBe('staff');
    });

    it('should be "staff" for learner+staff user', async () => {
      const user = await User.create({
        email: 'hybrid@example.com',
        password: 'hashedpassword123',
        userTypes: ['learner', 'staff']
      });

      expect(user.defaultDashboard).toBe('staff');
    });

    it('should be "staff" for learner+global-admin user', async () => {
      const user = await User.create({
        email: 'hybrid-admin@example.com',
        password: 'hashedpassword123',
        userTypes: ['learner', 'global-admin']
      });

      expect(user.defaultDashboard).toBe('staff');
    });

    it('should be "staff" for staff+global-admin user', async () => {
      const user = await User.create({
        email: 'staff-admin@example.com',
        password: 'hashedpassword123',
        userTypes: ['staff', 'global-admin']
      });

      expect(user.defaultDashboard).toBe('staff');
    });

    it('should be "staff" for all three userTypes', async () => {
      const user = await User.create({
        email: 'superuser@example.com',
        password: 'hashedpassword123',
        userTypes: ['learner', 'staff', 'global-admin']
      });

      expect(user.defaultDashboard).toBe('staff');
    });

    it('should recalculate defaultDashboard when userTypes change', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        userTypes: ['learner']
      });

      expect(user.defaultDashboard).toBe('learner');

      // Add staff userType
      user.userTypes.push('staff');
      await user.save();

      expect(user.defaultDashboard).toBe('staff');
    });

    it('should recalculate defaultDashboard when changing from staff to learner-only', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        userTypes: ['staff']
      });

      expect(user.defaultDashboard).toBe('staff');

      // Change to learner-only
      user.userTypes = ['learner'];
      await user.save();

      expect(user.defaultDashboard).toBe('learner');
    });

    it('should reject invalid defaultDashboard value', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'hashedpassword123',
        defaultDashboard: 'admin' as any
      });

      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('lastSelectedDepartment Field', () => {
    it('should allow lastSelectedDepartment to be undefined', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123'
      });

      expect(user.lastSelectedDepartment).toBeUndefined();
    });

    it('should store valid department reference', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        lastSelectedDepartment: testDepartment._id
      });

      expect(user.lastSelectedDepartment).toEqual(testDepartment._id);
    });

    it('should allow updating lastSelectedDepartment', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123'
      });

      const anotherDept = await Department.create({
        name: 'Science',
        code: 'SCI'
      });

      user.lastSelectedDepartment = anotherDept._id;
      await user.save();

      expect(user.lastSelectedDepartment).toEqual(anotherDept._id);
    });

    it('should allow clearing lastSelectedDepartment', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        lastSelectedDepartment: testDepartment._id
      });

      user.lastSelectedDepartment = undefined;
      await user.save();

      expect(user.lastSelectedDepartment).toBeUndefined();
    });

    it('should populate department when requested', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        lastSelectedDepartment: testDepartment._id
      });

      const populatedUser = await User.findById(user._id).populate('lastSelectedDepartment');

      expect(populatedUser?.lastSelectedDepartment).toBeDefined();
      expect((populatedUser?.lastSelectedDepartment as any).name).toBe('Engineering');
    });
  });

  describe('hasUserType Method', () => {
    it('should return true for existing userType', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        userTypes: ['learner', 'staff']
      });

      expect(user.hasUserType('learner')).toBe(true);
      expect(user.hasUserType('staff')).toBe(true);
    });

    it('should return false for non-existing userType', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        userTypes: ['learner']
      });

      expect(user.hasUserType('staff')).toBe(false);
      expect(user.hasUserType('global-admin')).toBe(false);
    });

    it('should work for learner-only user', async () => {
      const user = await User.create({
        email: 'learner@example.com',
        password: 'hashedpassword123',
        userTypes: ['learner']
      });

      expect(user.hasUserType('learner')).toBe(true);
      expect(user.hasUserType('staff')).toBe(false);
      expect(user.hasUserType('global-admin')).toBe(false);
    });

    it('should work for staff-only user', async () => {
      const user = await User.create({
        email: 'staff@example.com',
        password: 'hashedpassword123',
        userTypes: ['staff']
      });

      expect(user.hasUserType('learner')).toBe(false);
      expect(user.hasUserType('staff')).toBe(true);
      expect(user.hasUserType('global-admin')).toBe(false);
    });

    it('should work for global-admin-only user', async () => {
      const user = await User.create({
        email: 'admin@example.com',
        password: 'hashedpassword123',
        userTypes: ['global-admin']
      });

      expect(user.hasUserType('learner')).toBe(false);
      expect(user.hasUserType('staff')).toBe(false);
      expect(user.hasUserType('global-admin')).toBe(true);
    });

    it('should work for user with all three types', async () => {
      const user = await User.create({
        email: 'superuser@example.com',
        password: 'hashedpassword123',
        userTypes: ['learner', 'staff', 'global-admin']
      });

      expect(user.hasUserType('learner')).toBe(true);
      expect(user.hasUserType('staff')).toBe(true);
      expect(user.hasUserType('global-admin')).toBe(true);
    });
  });

  describe('canEscalateToAdmin Method', () => {
    it('should return true for user with global-admin userType', async () => {
      const user = await User.create({
        email: 'admin@example.com',
        password: 'hashedpassword123',
        userTypes: ['global-admin']
      });

      expect(user.canEscalateToAdmin()).toBe(true);
    });

    it('should return true for user with multiple types including global-admin', async () => {
      const user = await User.create({
        email: 'hybrid-admin@example.com',
        password: 'hashedpassword123',
        userTypes: ['learner', 'staff', 'global-admin']
      });

      expect(user.canEscalateToAdmin()).toBe(true);
    });

    it('should return false for learner-only user', async () => {
      const user = await User.create({
        email: 'learner@example.com',
        password: 'hashedpassword123',
        userTypes: ['learner']
      });

      expect(user.canEscalateToAdmin()).toBe(false);
    });

    it('should return false for staff-only user', async () => {
      const user = await User.create({
        email: 'staff@example.com',
        password: 'hashedpassword123',
        userTypes: ['staff']
      });

      expect(user.canEscalateToAdmin()).toBe(false);
    });

    it('should return false for learner+staff user without global-admin', async () => {
      const user = await User.create({
        email: 'hybrid@example.com',
        password: 'hashedpassword123',
        userTypes: ['learner', 'staff']
      });

      expect(user.canEscalateToAdmin()).toBe(false);
    });
  });

  describe('isActive Field', () => {
    it('should default to true', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123'
      });

      expect(user.isActive).toBe(true);
    });

    it('should allow setting to false', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        isActive: false
      });

      expect(user.isActive).toBe(false);
    });

    it('should allow updating isActive', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        isActive: true
      });

      user.isActive = false;
      await user.save();

      expect(user.isActive).toBe(false);
    });
  });

  describe('Query Operations', () => {
    it('should find user by email', async () => {
      await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123'
      });

      const user = await User.findOne({ email: 'test@example.com' });
      expect(user).toBeDefined();
      expect(user!.email).toBe('test@example.com');
    });

    it('should find users by userType', async () => {
      await User.create({
        email: 'learner1@example.com',
        password: 'hashedpassword123',
        userTypes: ['learner']
      });

      await User.create({
        email: 'staff1@example.com',
        password: 'hashedpassword123',
        userTypes: ['staff']
      });

      await User.create({
        email: 'learner2@example.com',
        password: 'hashedpassword123',
        userTypes: ['learner']
      });

      const learners = await User.find({ userTypes: 'learner' });
      expect(learners).toHaveLength(2);
    });

    it('should find active users', async () => {
      await User.create({
        email: 'active@example.com',
        password: 'hashedpassword123',
        isActive: true
      });

      await User.create({
        email: 'inactive@example.com',
        password: 'hashedpassword123',
        isActive: false
      });

      const active = await User.find({ isActive: true });
      expect(active).toHaveLength(1);
      expect(active[0].email).toBe('active@example.com');
    });

    it('should exclude password by default', async () => {
      await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123'
      });

      const user = await User.findOne({ email: 'test@example.com' });
      expect((user as any).password).toBeUndefined();
    });

    it('should include password when explicitly selected', async () => {
      await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123'
      });

      const user = await User.findOne({ email: 'test@example.com' }).select('+password');
      expect(user?.password).toBe('hashedpassword123');
    });
  });

  describe('Edge Cases', () => {
    it('should handle duplicate userTypes in array', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        userTypes: ['learner', 'learner', 'staff']
      });

      // MongoDB may not deduplicate, but hasUserType should still work
      expect(user.hasUserType('learner')).toBe(true);
      expect(user.hasUserType('staff')).toBe(true);
    });

    it('should handle very long email', async () => {
      const longEmail = 'a'.repeat(100) + '@example.com';
      const user = await User.create({
        email: longEmail,
        password: 'hashedpassword123'
      });

      expect(user.email).toBe(longEmail);
    });

    it('should handle updating userTypes multiple times', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
        userTypes: ['learner']
      });

      expect(user.defaultDashboard).toBe('learner');

      user.userTypes = ['staff'];
      await user.save();
      expect(user.defaultDashboard).toBe('staff');

      user.userTypes = ['global-admin'];
      await user.save();
      expect(user.defaultDashboard).toBe('staff');

      user.userTypes = ['learner'];
      await user.save();
      expect(user.defaultDashboard).toBe('learner');

      user.userTypes = ['learner', 'staff', 'global-admin'];
      await user.save();
      expect(user.defaultDashboard).toBe('staff');
    });
  });
});
