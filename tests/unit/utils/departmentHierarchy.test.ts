/**
 * Department Hierarchy Utility Tests
 *
 * Tests hierarchical department access functionality
 *
 * Note: These tests use mocked Department model since they require database access
 */

import { Types } from 'mongoose';
import {
  getDepartmentAndSubdepartments,
  isTopLevelDepartmentMember,
  getParentDepartments,
  getRootDepartment,
  hasHierarchicalAccess,
  getDepartmentIdsForQuery
} from '@/utils/departmentHierarchy';

// Mock the Department model
jest.mock('@/models/organization/Department.model', () => {
  const mockDepartments = new Map();

  // Setup test hierarchy:
  // Root Dept (111)
  //   - IT Dept (222) - subdept of Root
  //     - Dev Team (333) - subdept of IT
  //   - HR Dept (444) - subdept of Root

  mockDepartments.set('111111111111111111111111', {
    _id: new Types.ObjectId('111111111111111111111111'),
    name: 'Root Department',
    parentDepartmentId: null
  });

  mockDepartments.set('222222222222222222222222', {
    _id: new Types.ObjectId('222222222222222222222222'),
    name: 'IT Department',
    parentDepartmentId: new Types.ObjectId('111111111111111111111111')
  });

  mockDepartments.set('333333333333333333333333', {
    _id: new Types.ObjectId('333333333333333333333333'),
    name: 'Dev Team',
    parentDepartmentId: new Types.ObjectId('222222222222222222222222')
  });

  mockDepartments.set('444444444444444444444444', {
    _id: new Types.ObjectId('444444444444444444444444'),
    name: 'HR Department',
    parentDepartmentId: new Types.ObjectId('111111111111111111111111')
  });

  const mockFind = jest.fn((query: any) => ({
    select: jest.fn(() => {
      const parentId = query.parentDepartmentId?.toString();
      const results: any[] = [];

      mockDepartments.forEach((dept) => {
        if (dept.parentDepartmentId?.toString() === parentId) {
          results.push(dept);
        }
      });

      return Promise.resolve(results);
    })
  }));

  const mockFindById = jest.fn((id: any) => ({
    select: jest.fn(() => {
      const dept = mockDepartments.get(id.toString());
      return Promise.resolve(dept || null);
    })
  }));

  return {
    __esModule: true,
    default: {
      find: mockFind,
      findById: mockFindById
    }
  };
});

describe('Department Hierarchy Utility', () => {
  describe('getDepartmentAndSubdepartments()', () => {
    it('should return root department and all subdepartments', async () => {
      const rootId = '111111111111111111111111';
      const result = await getDepartmentAndSubdepartments(rootId);

      expect(result).toContain(rootId);
      expect(result).toContain('222222222222222222222222'); // IT Dept
      expect(result).toContain('333333333333333333333333'); // Dev Team
      expect(result).toContain('444444444444444444444444'); // HR Dept
      expect(result.length).toBe(4);
    });

    it('should return department and its subdepartments only', async () => {
      const itDeptId = '222222222222222222222222';
      const result = await getDepartmentAndSubdepartments(itDeptId);

      expect(result).toContain(itDeptId);
      expect(result).toContain('333333333333333333333333'); // Dev Team
      expect(result.length).toBe(2);
      expect(result).not.toContain('111111111111111111111111'); // Root
      expect(result).not.toContain('444444444444444444444444'); // HR
    });

    it('should return only the department if no subdepartments', async () => {
      const devTeamId = '333333333333333333333333';
      const result = await getDepartmentAndSubdepartments(devTeamId);

      expect(result).toEqual([devTeamId]);
      expect(result.length).toBe(1);
    });

    it('should handle ObjectId input', async () => {
      const rootId = new Types.ObjectId('111111111111111111111111');
      const result = await getDepartmentAndSubdepartments(rootId);

      expect(result.length).toBe(4);
      expect(result).toContain('111111111111111111111111');
    });

    it('should remove duplicates if present', async () => {
      const rootId = '111111111111111111111111';
      const result = await getDepartmentAndSubdepartments(rootId);

      const uniqueIds = [...new Set(result)];
      expect(result.length).toBe(uniqueIds.length);
    });
  });

  describe('isTopLevelDepartmentMember()', () => {
    it('should return true for root department', async () => {
      const userId = 'user123';
      const rootId = '111111111111111111111111';
      const result = await isTopLevelDepartmentMember(userId, rootId);

      expect(result).toBe(true);
    });

    it('should return false for subdepartment', async () => {
      const userId = 'user123';
      const itDeptId = '222222222222222222222222';
      const result = await isTopLevelDepartmentMember(userId, itDeptId);

      expect(result).toBe(false);
    });

    it('should return false for non-existent department', async () => {
      const userId = 'user123';
      const fakeId = '999999999999999999999999';
      const result = await isTopLevelDepartmentMember(userId, fakeId);

      expect(result).toBe(false);
    });
  });

  describe('getParentDepartments()', () => {
    it('should return chain from leaf to root', async () => {
      const devTeamId = '333333333333333333333333';
      const result = await getParentDepartments(devTeamId);

      expect(result).toEqual([
        '333333333333333333333333', // Dev Team
        '222222222222222222222222', // IT Dept
        '111111111111111111111111'  // Root Dept
      ]);
    });

    it('should return only department if it is root', async () => {
      const rootId = '111111111111111111111111';
      const result = await getParentDepartments(rootId);

      expect(result).toEqual([rootId]);
    });

    it('should return department and parent for mid-level dept', async () => {
      const itDeptId = '222222222222222222222222';
      const result = await getParentDepartments(itDeptId);

      expect(result).toEqual([
        '222222222222222222222222', // IT Dept
        '111111111111111111111111'  // Root Dept
      ]);
    });
  });

  describe('getRootDepartment()', () => {
    it('should return root from leaf department', async () => {
      const devTeamId = '333333333333333333333333';
      const result = await getRootDepartment(devTeamId);

      expect(result).toBe('111111111111111111111111');
    });

    it('should return itself if already root', async () => {
      const rootId = '111111111111111111111111';
      const result = await getRootDepartment(rootId);

      expect(result).toBe(rootId);
    });

    it('should return root from mid-level department', async () => {
      const itDeptId = '222222222222222222222222';
      const result = await getRootDepartment(itDeptId);

      expect(result).toBe('111111111111111111111111');
    });
  });

  describe('hasHierarchicalAccess()', () => {
    it('should grant access for direct membership', async () => {
      const userId = 'user123';
      const userDeptIds = ['222222222222222222222222']; // IT Dept
      const targetDeptId = '222222222222222222222222'; // IT Dept
      const result = await hasHierarchicalAccess(userId, userDeptIds, targetDeptId);

      expect(result).toBe(true);
    });

    it('should grant access for top-level member to subdepartment', async () => {
      const userId = 'user123';
      const userDeptIds = ['111111111111111111111111']; // Root Dept (top-level)
      const targetDeptId = '333333333333333333333333'; // Dev Team (subdept)
      const result = await hasHierarchicalAccess(userId, userDeptIds, targetDeptId);

      expect(result).toBe(true);
    });

    it('should deny access for subdepartment member to parent', async () => {
      const userId = 'user123';
      const userDeptIds = ['333333333333333333333333']; // Dev Team (subdept)
      const targetDeptId = '111111111111111111111111'; // Root Dept
      const result = await hasHierarchicalAccess(userId, userDeptIds, targetDeptId);

      expect(result).toBe(false);
    });

    it('should deny access for unrelated departments', async () => {
      const userId = 'user123';
      const userDeptIds = ['444444444444444444444444']; // HR Dept
      const targetDeptId = '333333333333333333333333'; // Dev Team
      const result = await hasHierarchicalAccess(userId, userDeptIds, targetDeptId);

      expect(result).toBe(false);
    });
  });

  describe('getDepartmentIdsForQuery()', () => {
    it('should return all subdepartments for top-level department', async () => {
      const userDeptIds = ['111111111111111111111111']; // Root (top-level)
      const userId = 'user123';
      const result = await getDepartmentIdsForQuery(userDeptIds, userId);

      expect(result).toContain('111111111111111111111111');
      expect(result).toContain('222222222222222222222222');
      expect(result).toContain('333333333333333333333333');
      expect(result).toContain('444444444444444444444444');
      expect(result.length).toBe(4);
    });

    it('should return only own department for subdepartment member', async () => {
      const userDeptIds = ['333333333333333333333333']; // Dev Team (subdept)
      const userId = 'user123';
      const result = await getDepartmentIdsForQuery(userDeptIds, userId);

      expect(result).toEqual(['333333333333333333333333']);
    });

    it('should handle multiple department memberships', async () => {
      const userDeptIds = [
        '222222222222222222222222', // IT Dept (has subdept)
        '444444444444444444444444'  // HR Dept (no subdept)
      ];
      const userId = 'user123';
      const result = await getDepartmentIdsForQuery(userDeptIds, userId);

      // Should include IT Dept + Dev Team + HR Dept
      expect(result).toContain('222222222222222222222222');
      expect(result).toContain('333333333333333333333333');
      expect(result).toContain('444444444444444444444444');
      expect(result.length).toBe(3);
    });

    it('should remove duplicates', async () => {
      const userDeptIds = [
        '111111111111111111111111', // Root (top-level, includes all)
        '222222222222222222222222'  // IT Dept (already included in root's hierarchy)
      ];
      const userId = 'user123';
      const result = await getDepartmentIdsForQuery(userDeptIds, userId);

      const uniqueIds = [...new Set(result)];
      expect(result.length).toBe(uniqueIds.length);
    });

    it('should handle ObjectId input', async () => {
      const userDeptIds = [new Types.ObjectId('111111111111111111111111')];
      const userId = new Types.ObjectId('111111111111111111111112');
      const result = await getDepartmentIdsForQuery(userDeptIds, userId);

      expect(result.length).toBe(4);
    });
  });
});
