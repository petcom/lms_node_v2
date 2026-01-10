import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ResolverService } from '@/services/ai/resolver.service';
import Department from '@/models/organization/Department.model';
import Program from '@/models/academic/Program.model';
import Course from '@/models/academic/Course.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import Content, { ContentType } from '@/models/content/Content.model';
import { Cache } from '@/config/redis';

jest.mock('@/config/redis', () => ({
  Cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

let mongoServer: MongoMemoryServer;

describe('ResolverService', () => {
  let testDepartment: any;
  let testProgram: any;
  let testUser: any;
  let testStaff: any;
  let testCourse: any;
  let testContent: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    await Department.deleteMany({});
    await Program.deleteMany({});
    await Course.deleteMany({});
    await User.deleteMany({});
    await Staff.deleteMany({});
    await Content.deleteMany({});
    jest.clearAllMocks();

    // Create test data
    testDepartment = await Department.create({
      name: 'Computer Science',
      code: 'CS',
      description: 'Computer Science Department',
      isActive: true,
    });

    testProgram = await Program.create({
      name: 'Bachelor of Computer Science',
      code: 'BCS',
      departmentId: testDepartment._id,
      type: 'bachelors',
      isActive: true,
    });

    testUser = await User.create({
      email: 'john.doe@example.com',
      password: 'hashed_password',
      roles: ['instructor'],
      isActive: true,
    });

    testStaff = await Staff.create({
      _id: testUser._id,
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '123-456-7890',
      departmentMemberships: [
        {
          departmentId: testDepartment._id,
          roles: ['instructor'],
          isPrimary: true,
        },
      ],
      isActive: true,
    });

    testCourse = await Course.create({
      name: 'Introduction to Programming',
      code: 'CS101',
      description: 'Basic programming concepts',
      departmentId: testDepartment._id,
      credits: 3,
      isActive: true,
    });

    testContent = await Content.create({
      title: 'Programming Basics Video',
      description: 'Introduction to programming basics',
      type: 'video',
      fileUrl: 'https://example.com/video.mp4',
      isActive: true,
    });
  });

  describe('resolveDepartment', () => {
    it('should resolve department by valid ObjectId', async () => {
      const result = await ResolverService.resolveDepartment(testDepartment._id.toString());

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testDepartment._id.toString());
      expect(result.error).toBeUndefined();
      expect(result.suggestions).toBeUndefined();
    });

    it('should resolve department by exact name (case-insensitive)', async () => {
      const result = await ResolverService.resolveDepartment('computer science');

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testDepartment._id.toString());
    });

    it('should resolve department by exact code (case-insensitive)', async () => {
      const result = await ResolverService.resolveDepartment('cs');

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testDepartment._id.toString());
    });

    it('should resolve department using fuzzy matching', async () => {
      const result = await ResolverService.resolveDepartment('Compter Science');

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testDepartment._id.toString());
    });

    it('should return suggestions when no match found', async () => {
      await Department.create({
        name: 'Mathematics',
        code: 'MATH',
        isActive: true,
      });

      await Department.create({
        name: 'Physics',
        code: 'PHY',
        isActive: true,
      });

      // "Fysics" is different enough to not match but will return suggestions
      const result = await ResolverService.resolveDepartment('Fysics');

      expect(result.success).toBe(false);
      expect(result.objectId).toBeUndefined();
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
      expect(result.error).toContain('No match found');
    });

    it('should return error for invalid ObjectId format', async () => {
      const result = await ResolverService.resolveDepartment('invalid-id-123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should not match inactive departments', async () => {
      await Department.create({
        name: 'Inactive Department',
        code: 'INACT',
        isActive: false,
      });

      const result = await ResolverService.resolveDepartment('Inactive Department');

      expect(result.success).toBe(false);
    });

    it('should use cache for repeated lookups', async () => {
      (Cache.get as jest.Mock).mockResolvedValue(testDepartment._id.toString());

      const result = await ResolverService.resolveDepartment('Computer Science');

      expect(result.success).toBe(true);
      expect(Cache.get).toHaveBeenCalled();
    });

    it('should cache successful resolutions', async () => {
      (Cache.get as jest.Mock).mockResolvedValue(null);
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      await ResolverService.resolveDepartment('Computer Science');

      expect(Cache.set).toHaveBeenCalledWith(
        expect.stringContaining('resolver:department:'),
        testDepartment._id.toString(),
        3600
      );
    });

    it('should respect custom fuzzy threshold', async () => {
      // "Comp" is short for Computer Science, requires lower threshold
      const result = await ResolverService.resolveDepartment('Comp Sci', { fuzzyThreshold: 0.5 });

      expect(result.success).toBe(true);
    });
  });

  describe('resolveProgram', () => {
    it('should resolve program by valid ObjectId', async () => {
      const result = await ResolverService.resolveProgram(testProgram._id.toString());

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testProgram._id.toString());
    });

    it('should resolve program by exact name', async () => {
      const result = await ResolverService.resolveProgram('Bachelor of Computer Science');

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testProgram._id.toString());
    });

    it('should resolve program by code', async () => {
      const result = await ResolverService.resolveProgram('bcs');

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testProgram._id.toString());
    });

    it('should filter by departmentId when provided', async () => {
      const otherDept = await Department.create({
        name: 'Mathematics',
        code: 'MATH',
        isActive: true,
      });

      await Program.create({
        name: 'Bachelor of Mathematics',
        code: 'BCS', // Same code but different department
        departmentId: otherDept._id,
        type: 'bachelors',
        isActive: true,
      });

      const result = await ResolverService.resolveProgram('bcs', testDepartment._id.toString());

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testProgram._id.toString());
    });

    it('should use fuzzy matching for program names', async () => {
      // "Bachelor of Compter Science" has a typo but should still match
      const result = await ResolverService.resolveProgram('Bachelor of Compter Science');

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testProgram._id.toString());
    });

    it('should return suggestions when no match found', async () => {
      // Create another similar program to ensure suggestions work
      await Program.create({
        name: 'Master of Computer Science',
        code: 'MCS',
        departmentId: testDepartment._id,
        type: 'masters',
        isActive: true,
      });

      const result = await ResolverService.resolveProgram('Master of Physics');

      expect(result.success).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });
  });

  describe('resolveInstructor', () => {
    it('should resolve instructor by valid ObjectId', async () => {
      const result = await ResolverService.resolveInstructor(testUser._id.toString());

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testUser._id.toString());
    });

    it('should resolve instructor by email', async () => {
      const result = await ResolverService.resolveInstructor('john.doe@example.com');

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testUser._id.toString());
    });

    it('should resolve instructor by full name', async () => {
      const result = await ResolverService.resolveInstructor('John Doe');

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testUser._id.toString());
    });

    it('should resolve instructor by first name and last name separately', async () => {
      const result = await ResolverService.resolveInstructor('Doe, John');

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testUser._id.toString());
    });

    it('should use fuzzy matching for names', async () => {
      const result = await ResolverService.resolveInstructor('Jon Doe');

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testUser._id.toString());
    });

    it('should filter by department when provided', async () => {
      const otherDept = await Department.create({
        name: 'Mathematics',
        code: 'MATH',
        isActive: true,
      });

      const otherUser = await User.create({
        email: 'jane.smith@example.com',
        password: 'hashed_password',
        roles: ['instructor'],
        isActive: true,
      });

      await Staff.create({
        _id: otherUser._id,
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '987-654-3210',
        departmentMemberships: [
          {
            departmentId: otherDept._id,
            roles: ['instructor'],
            isPrimary: true,
          },
        ],
        isActive: true,
      });

      const result = await ResolverService.resolveInstructor('John Doe', testDepartment._id.toString());

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testUser._id.toString());
    });

    it('should only match users with instructor role', async () => {
      const learnerUser = await User.create({
        email: 'student@example.com',
        password: 'hashed_password',
        roles: ['learner'],
        isActive: true,
      });

      const result = await ResolverService.resolveInstructor('student@example.com');

      expect(result.success).toBe(false);
    });

    it('should return suggestions when no match found', async () => {
      const result = await ResolverService.resolveInstructor('Unknown Person');

      expect(result.success).toBe(false);
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('resolveCourse', () => {
    it('should resolve course by valid ObjectId', async () => {
      const result = await ResolverService.resolveCourse(testCourse._id.toString());

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testCourse._id.toString());
    });

    it('should resolve course by code', async () => {
      const result = await ResolverService.resolveCourse('cs101');

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testCourse._id.toString());
    });

    it('should resolve course by title', async () => {
      const result = await ResolverService.resolveCourse('Introduction to Programming');

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testCourse._id.toString());
    });

    it('should use fuzzy matching for course titles', async () => {
      // "Intro to Programing" has a typo but should match
      const result = await ResolverService.resolveCourse('Introduction to Programing');

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testCourse._id.toString());
    });

    it('should filter by department when provided', async () => {
      const otherDept = await Department.create({
        name: 'Mathematics',
        code: 'MATH',
        isActive: true,
      });

      await Course.create({
        name: 'Introduction to Calculus',
        code: 'CS101', // Same code but different department
        departmentId: otherDept._id,
        credits: 3,
        isActive: true,
      });

      const result = await ResolverService.resolveCourse('cs101', testDepartment._id.toString());

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testCourse._id.toString());
    });

    it('should return suggestions when no match found', async () => {
      const result = await ResolverService.resolveCourse('Advanced Quantum Physics');

      expect(result.success).toBe(false);
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('resolveContent', () => {
    it('should resolve content by valid ObjectId', async () => {
      const result = await ResolverService.resolveContent(testContent._id.toString());

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testContent._id.toString());
    });

    it('should resolve content by title', async () => {
      const result = await ResolverService.resolveContent('Programming Basics Video');

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testContent._id.toString());
    });

    it('should use fuzzy matching for content titles', async () => {
      // "Programing Basics Video" has a typo but should match
      const result = await ResolverService.resolveContent('Programing Basics Video');

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testContent._id.toString());
    });

    it('should filter by content type when provided', async () => {
      await Content.create({
        title: 'Programming Basics Quiz',
        type: 'quiz',
        isActive: true,
      });

      // Should match "Programming Basics Video" not "Programming Basics Quiz"
      const result = await ResolverService.resolveContent('Programming Basics Video', { type: 'video' });

      expect(result.success).toBe(true);
      expect(result.objectId?.toString()).toBe(testContent._id.toString());
    });

    it('should return suggestions when no match found', async () => {
      const result = await ResolverService.resolveContent('Nonexistent Content');

      expect(result.success).toBe(false);
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('resolveBatch', () => {
    it('should resolve multiple items in batch', async () => {
      const items = [
        { type: 'department' as const, nameOrId: 'Computer Science' },
        { type: 'program' as const, nameOrId: 'Bachelor of Computer Science' },
        { type: 'instructor' as const, nameOrId: 'john.doe@example.com' },
        { type: 'course' as const, nameOrId: 'CS101' },
      ];

      const results = await ResolverService.resolveBatch(items);

      expect(results).toHaveLength(4);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
      expect(results[3].success).toBe(true);
    });

    it('should handle mixed success and failure in batch', async () => {
      const items = [
        { type: 'department' as const, nameOrId: 'Computer Science' },
        { type: 'department' as const, nameOrId: 'Nonexistent Department' },
      ];

      const results = await ResolverService.resolveBatch(items);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    it('should pass context options in batch resolution', async () => {
      const items = [
        {
          type: 'program' as const,
          nameOrId: 'BCS',
          context: { departmentId: testDepartment._id.toString() },
        },
      ];

      const results = await ResolverService.resolveBatch(items);

      expect(results[0].success).toBe(true);
      expect(results[0].objectId?.toString()).toBe(testProgram._id.toString());
    });

    it('should handle empty batch', async () => {
      const results = await ResolverService.resolveBatch([]);

      expect(results).toHaveLength(0);
    });

    it('should resolve content with type filter in batch', async () => {
      const items = [
        {
          type: 'content' as const,
          nameOrId: 'Programming Basics Video',
          context: { type: 'video' as ContentType },
        },
      ];

      const results = await ResolverService.resolveBatch(items);

      expect(results[0].success).toBe(true);
      expect(results[0].objectId?.toString()).toBe(testContent._id.toString());
    });
  });

  describe('Cache integration', () => {
    it('should cache and retrieve department resolutions', async () => {
      (Cache.get as jest.Mock).mockResolvedValueOnce(null);
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      // First call - should cache
      await ResolverService.resolveDepartment('Computer Science');
      expect(Cache.set).toHaveBeenCalled();

      jest.clearAllMocks();
      (Cache.get as jest.Mock).mockResolvedValueOnce(testDepartment._id.toString());

      // Second call - should use cache
      const result = await ResolverService.resolveDepartment('Computer Science');
      expect(result.success).toBe(true);
      expect(Cache.get).toHaveBeenCalled();
    });

    it('should use 60-minute TTL for cache entries', async () => {
      (Cache.get as jest.Mock).mockResolvedValue(null);
      (Cache.set as jest.Mock).mockResolvedValue(undefined);

      await ResolverService.resolveDepartment('Computer Science');

      expect(Cache.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        3600 // 60 minutes in seconds
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle null or undefined input', async () => {
      const result = await ResolverService.resolveDepartment('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle very long strings gracefully', async () => {
      const longString = 'A'.repeat(1000);
      const result = await ResolverService.resolveDepartment(longString);

      expect(result.success).toBe(false);
    });

    it('should handle special characters in search strings', async () => {
      await Department.create({
        name: 'Art & Design',
        code: 'A&D',
        isActive: true,
      });

      const result = await ResolverService.resolveDepartment('Art & Design');

      expect(result.success).toBe(true);
    });

    it('should return top 3 suggestions by default', async () => {
      // Create multiple similar departments
      await Department.create({ name: 'Physics', code: 'PHY', isActive: true });
      await Department.create({ name: 'Chemistry', code: 'CHEM', isActive: true });
      await Department.create({ name: 'Biology', code: 'BIO', isActive: true });
      await Department.create({ name: 'Mathematics', code: 'MATH', isActive: true });

      const result = await ResolverService.resolveDepartment('Science');

      expect(result.success).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeLessThanOrEqual(3);
    });
  });
});
