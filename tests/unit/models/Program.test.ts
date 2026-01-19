import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Program from '@/models/academic/Program.model';
import Department from '@/models/organization/Department.model';
import { describeIfMongo } from '../../helpers/mongo-guard';

describeIfMongo('Program Model', () => {
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
    await Program.deleteMany({});
    await Department.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid program with required fields', async () => {
      const program = await Program.create({
        name: 'Computer Science',
        code: 'CS',
        departmentId: testDepartment._id,
        type: 'bachelors',
        isActive: true
      });

      expect(program.name).toBe('Computer Science');
      expect(program.code).toBe('CS');
      expect(program.departmentId).toEqual(testDepartment._id);
      expect(program.type).toBe('bachelors');
      expect(program.isActive).toBe(true);
      expect(program.level).toBe(0);
      expect(program.path).toHaveLength(1);
    });

    it('should require name field', async () => {
      const program = new Program({
        code: 'CS',
        departmentId: testDepartment._id,
        type: 'bachelors'
      });

      await expect(program.save()).rejects.toThrow(/name/);
    });

    it('should require code field', async () => {
      const program = new Program({
        name: 'Computer Science',
        departmentId: testDepartment._id,
        type: 'bachelors'
      });

      await expect(program.save()).rejects.toThrow(/code/);
    });

    it('should require departmentId field', async () => {
      const program = new Program({
        name: 'Computer Science',
        code: 'CS',
        type: 'bachelors'
      });

      await expect(program.save()).rejects.toThrow(/departmentId/);
    });

    it('should require type field', async () => {
      const program = new Program({
        name: 'Computer Science',
        code: 'CS',
        departmentId: testDepartment._id
      });

      await expect(program.save()).rejects.toThrow(/type/);
    });

    it('should enforce unique code within department', async () => {
      await Program.create({
        name: 'Computer Science',
        code: 'CS',
        departmentId: testDepartment._id,
        type: 'bachelors'
      });

      await expect(
        Program.create({
          name: 'Computer Science 2',
          code: 'CS',
          departmentId: testDepartment._id,
          type: 'masters'
        })
      ).rejects.toThrow(/duplicate/);
    });

    it('should allow same code in different departments', async () => {
      const dept2 = await Department.create({
        name: 'Science',
        code: 'SCI'
      });

      const prog1 = await Program.create({
        name: 'Computer Science',
        code: 'CS',
        departmentId: testDepartment._id,
        type: 'bachelors'
      });

      const prog2 = await Program.create({
        name: 'Computational Science',
        code: 'CS',
        departmentId: dept2._id,
        type: 'bachelors'
      });

      expect(prog1.code).toBe('CS');
      expect(prog2.code).toBe('CS');
      expect(prog1.departmentId).not.toEqual(prog2.departmentId);
    });

    it('should validate program type enum', async () => {
      const program = new Program({
        name: 'Computer Science',
        code: 'CS',
        departmentId: testDepartment._id,
        type: 'invalid-type'
      });

      await expect(program.save()).rejects.toThrow();
    });

    it('should accept valid program types', async () => {
      const types = ['certificate', 'diploma', 'associates', 'bachelors', 'masters', 'doctorate', 'professional', 'continuing-education'];

      for (const type of types) {
        const program = await Program.create({
          name: `${type} Program`,
          code: `${type.toUpperCase()}`,
          departmentId: testDepartment._id,
          type
        });

        expect(program.type).toBe(type);
      }
    });

    it('should convert code to uppercase', async () => {
      const program = await Program.create({
        name: 'Computer Science',
        code: 'cs',
        departmentId: testDepartment._id,
        type: 'bachelors'
      });

      expect(program.code).toBe('CS');
    });

    it('should trim whitespace', async () => {
      const program = await Program.create({
        name: '  Computer Science  ',
        code: '  cs  ',
        departmentId: testDepartment._id,
        type: 'bachelors'
      });

      expect(program.name).toBe('Computer Science');
      expect(program.code).toBe('CS');
    });
  });

  describe('Hierarchical Structure (SubPrograms)', () => {
    it('should create a root program with level 0', async () => {
      const program = await Program.create({
        name: 'Computer Science',
        code: 'CS',
        departmentId: testDepartment._id,
        type: 'bachelors'
      });

      expect(program.level).toBe(0);
      expect(program.path).toHaveLength(1);
      expect(program.path[0]).toEqual(program._id);
    });

    it('should create a subprogram with correct level and path', async () => {
      const parent = await Program.create({
        name: 'Computer Science',
        code: 'CS',
        departmentId: testDepartment._id,
        type: 'bachelors'
      });

      const child = await Program.create({
        name: 'Software Engineering',
        code: 'SE',
        departmentId: testDepartment._id,
        type: 'bachelors',
        parentProgramId: parent._id
      });

      expect(child.level).toBe(1);
      expect(child.path).toHaveLength(2);
      expect(child.path[0]).toEqual(parent._id);
      expect(child.path[1]).toEqual(child._id);
      expect(child.parentProgramId).toEqual(parent._id);
    });

    it('should create nested subprograms', async () => {
      const grandparent = await Program.create({
        name: 'Engineering',
        code: 'ENG',
        departmentId: testDepartment._id,
        type: 'bachelors'
      });

      const parent = await Program.create({
        name: 'Computer Engineering',
        code: 'CE',
        departmentId: testDepartment._id,
        type: 'bachelors',
        parentProgramId: grandparent._id
      });

      const child = await Program.create({
        name: 'Embedded Systems',
        code: 'ES',
        departmentId: testDepartment._id,
        type: 'bachelors',
        parentProgramId: parent._id
      });

      expect(child.level).toBe(2);
      expect(child.path).toHaveLength(3);
      expect(child.path[0]).toEqual(grandparent._id);
      expect(child.path[1]).toEqual(parent._id);
      expect(child.path[2]).toEqual(child._id);
    });
  });

  describe('Program Metadata', () => {
    it('should store duration information', async () => {
      const program = await Program.create({
        name: 'Computer Science',
        code: 'CS',
        departmentId: testDepartment._id,
        type: 'bachelors',
        durationYears: 4
      });

      expect(program.durationYears).toBe(4);
    });

    it('should store credit requirements', async () => {
      const program = await Program.create({
        name: 'Computer Science',
        code: 'CS',
        departmentId: testDepartment._id,
        type: 'bachelors',
        requiredCredits: 120
      });

      expect(program.requiredCredits).toBe(120);
    });

    it('should store description', async () => {
      const program = await Program.create({
        name: 'Computer Science',
        code: 'CS',
        departmentId: testDepartment._id,
        type: 'bachelors',
        description: 'A comprehensive program in computer science'
      });

      expect(program.description).toBe('A comprehensive program in computer science');
    });

    it('should set default isActive to true', async () => {
      const program = await Program.create({
        name: 'Computer Science',
        code: 'CS',
        departmentId: testDepartment._id,
        type: 'bachelors'
      });

      expect(program.isActive).toBe(true);
    });

    it('should store custom metadata', async () => {
      const program = await Program.create({
        name: 'Computer Science',
        code: 'CS',
        departmentId: testDepartment._id,
        type: 'bachelors',
        metadata: {
          accreditation: 'ABET',
          ranking: 1
        }
      });

      expect(program.metadata).toEqual({
        accreditation: 'ABET',
        ranking: 1
      });
    });

    it('should auto-generate timestamps', async () => {
      const program = await Program.create({
        name: 'Computer Science',
        code: 'CS',
        departmentId: testDepartment._id,
        type: 'bachelors'
      });

      expect(program.createdAt).toBeDefined();
      expect(program.updatedAt).toBeDefined();
    });
  });

  describe('Query Methods', () => {
    it('should find programs by department', async () => {
      await Program.create({
        name: 'Computer Science',
        code: 'CS',
        departmentId: testDepartment._id,
        type: 'bachelors'
      });

      const programs = await Program.find({ departmentId: testDepartment._id });
      expect(programs).toHaveLength(1);
      expect(programs[0].name).toBe('Computer Science');
    });

    it('should find active programs', async () => {
      await Program.create({
        name: 'Active Program',
        code: 'ACT',
        departmentId: testDepartment._id,
        type: 'bachelors',
        isActive: true
      });

      await Program.create({
        name: 'Inactive Program',
        code: 'INACT',
        departmentId: testDepartment._id,
        type: 'bachelors',
        isActive: false
      });

      const active = await Program.find({ isActive: true });
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('Active Program');
    });

    it('should find programs by type', async () => {
      await Program.create({
        name: 'Bachelors Program',
        code: 'BACH',
        departmentId: testDepartment._id,
        type: 'bachelors'
      });

      await Program.create({
        name: 'Masters Program',
        code: 'MAST',
        departmentId: testDepartment._id,
        type: 'masters'
      });

      const bachelors = await Program.find({ type: 'bachelors' });
      expect(bachelors).toHaveLength(1);
      expect(bachelors[0].name).toBe('Bachelors Program');
    });
  });
});
