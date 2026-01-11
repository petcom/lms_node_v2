/**
 * LookupValues Controller Tests
 *
 * Comprehensive unit tests for LookupValuesController.
 * Tests all API endpoints for lookup values.
 *
 * Part of LookupValues migration (Stream C - API Layer)
 */

import { Request, Response, NextFunction } from 'express';
import {
  LookupValuesController,
  IRoleRegistry
} from '@/controllers/lookup-values.controller';
import { ApiError } from '@/utils/ApiError';

describe('LookupValuesController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      query: {},
      params: {},
      headers: {}
    };

    mockResponse = {
      json: jsonMock,
      status: statusMock
    };

    mockNext = jest.fn();
  });

  describe('list', () => {
    it('should return all lookup values when no filters provided', async () => {
      await LookupValuesController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          count: expect.any(Number)
        })
      );

      const response = jsonMock.mock.calls[0][0];
      expect(response.data.length).toBeGreaterThan(0);
      // Should have userTypes + roles = 3 + 12 = 15 items
      expect(response.count).toBe(15);
    });

    it('should filter by category=userType', async () => {
      mockRequest.query = { category: 'userType' };

      await LookupValuesController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const response = jsonMock.mock.calls[0][0];
      expect(response.data).toHaveLength(3); // learner, staff, global-admin
      expect(response.data.every((item: any) => item.category === 'userType')).toBe(true);
    });

    it('should filter by category=role', async () => {
      mockRequest.query = { category: 'role' };

      await LookupValuesController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const response = jsonMock.mock.calls[0][0];
      expect(response.data.length).toBe(12); // 3 learner + 4 staff + 5 global-admin
      expect(response.data.every((item: any) => item.category === 'role')).toBe(true);
    });

    it('should filter by parentLookupId=userType.staff', async () => {
      mockRequest.query = { parentLookupId: 'userType.staff' };

      await LookupValuesController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const response = jsonMock.mock.calls[0][0];
      expect(response.data).toHaveLength(4); // 4 staff roles
      expect(response.data.every((item: any) => item.parentLookupId === 'userType.staff')).toBe(true);
    });

    it('should filter by parentLookupId=userType.learner', async () => {
      mockRequest.query = { parentLookupId: 'userType.learner' };

      await LookupValuesController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const response = jsonMock.mock.calls[0][0];
      expect(response.data).toHaveLength(3); // 3 learner roles
      expect(response.data.every((item: any) => item.parentLookupId === 'userType.learner')).toBe(true);
    });

    it('should filter by parentLookupId=userType.global-admin', async () => {
      mockRequest.query = { parentLookupId: 'userType.global-admin' };

      await LookupValuesController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const response = jsonMock.mock.calls[0][0];
      expect(response.data).toHaveLength(5); // 5 global-admin roles
      expect(response.data.every((item: any) => item.parentLookupId === 'userType.global-admin')).toBe(true);
    });

    it('should return empty array for invalid parentLookupId', async () => {
      mockRequest.query = { parentLookupId: 'userType.invalid' };

      await LookupValuesController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const response = jsonMock.mock.calls[0][0];
      expect(response.data).toHaveLength(0);
      expect(response.count).toBe(0);
    });

    it('should include required fields in each lookup value', async () => {
      mockRequest.query = { category: 'userType' };

      await LookupValuesController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const response = jsonMock.mock.calls[0][0];
      const firstItem = response.data[0];

      expect(firstItem).toHaveProperty('_id');
      expect(firstItem).toHaveProperty('lookupId');
      expect(firstItem).toHaveProperty('category');
      expect(firstItem).toHaveProperty('key');
      expect(firstItem).toHaveProperty('parentLookupId');
      expect(firstItem).toHaveProperty('displayAs');
      expect(firstItem).toHaveProperty('sortOrder');
      expect(firstItem).toHaveProperty('isActive');
      expect(firstItem).toHaveProperty('createdAt');
      expect(firstItem).toHaveProperty('updatedAt');
    });

    it('should call next with error on exception', async () => {
      // Force an error by mocking jsonMock to throw
      jsonMock.mockImplementation(() => {
        throw new Error('Test error');
      });

      await LookupValuesController.list(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getByLookupId', () => {
    it('should return userType lookup by lookupId', async () => {
      mockRequest.params = { lookupId: 'userType.staff' };

      await LookupValuesController.getByLookupId(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const response = jsonMock.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.lookupId).toBe('userType.staff');
      expect(response.data.category).toBe('userType');
      expect(response.data.key).toBe('staff');
      expect(response.data.displayAs).toBe('Staff');
      expect(response.data.parentLookupId).toBeNull();
    });

    it('should return role lookup by lookupId', async () => {
      mockRequest.params = { lookupId: 'role.instructor' };

      await LookupValuesController.getByLookupId(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const response = jsonMock.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.lookupId).toBe('role.instructor');
      expect(response.data.category).toBe('role');
      expect(response.data.key).toBe('instructor');
      expect(response.data.displayAs).toBe('Instructor');
      expect(response.data.parentLookupId).toBe('userType.staff');
    });

    it('should throw 404 error for non-existent lookupId', async () => {
      mockRequest.params = { lookupId: 'userType.invalid' };

      await LookupValuesController.getByLookupId(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Lookup value not found'
        })
      );
    });

    it('should throw 400 error for invalid lookupId format', async () => {
      mockRequest.params = { lookupId: 'invalid-format' };

      await LookupValuesController.getByLookupId(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Invalid lookupId format')
        })
      );
    });

    it('should throw 400 error for lookupId without key', async () => {
      mockRequest.params = { lookupId: 'userType.' };

      await LookupValuesController.getByLookupId(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400
        })
      );
    });

    it('should handle all valid userType lookupIds', async () => {
      const userTypes = ['learner', 'staff', 'global-admin'];

      for (const ut of userTypes) {
        mockRequest.params = { lookupId: `userType.${ut}` };

        await LookupValuesController.getByLookupId(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        const response = jsonMock.mock.calls[jsonMock.mock.calls.length - 1][0];
        expect(response.success).toBe(true);
        expect(response.data.key).toBe(ut);
        expect(response.data.category).toBe('userType');
      }
    });

    it('should handle all valid staff role lookupIds', async () => {
      const staffRoles = ['instructor', 'department-admin', 'content-admin', 'billing-admin'];

      for (const role of staffRoles) {
        mockRequest.params = { lookupId: `role.${role}` };

        await LookupValuesController.getByLookupId(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        const response = jsonMock.mock.calls[jsonMock.mock.calls.length - 1][0];
        expect(response.success).toBe(true);
        expect(response.data.key).toBe(role);
        expect(response.data.parentLookupId).toBe('userType.staff');
      }
    });
  });

  describe('listUserTypes', () => {
    it('should return all user types as UserTypeObject[]', async () => {
      await LookupValuesController.listUserTypes(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const response = jsonMock.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(3);
      expect(response.data).toEqual([
        { _id: 'learner', displayAs: 'Learner' },
        { _id: 'staff', displayAs: 'Staff' },
        { _id: 'global-admin', displayAs: 'System Admin' }
      ]);
    });

    it('should return objects with _id and displayAs properties', async () => {
      await LookupValuesController.listUserTypes(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const response = jsonMock.mock.calls[0][0];
      response.data.forEach((item: any) => {
        expect(item).toHaveProperty('_id');
        expect(item).toHaveProperty('displayAs');
        expect(typeof item._id).toBe('string');
        expect(typeof item.displayAs).toBe('string');
      });
    });

    it('should call next with error on exception', async () => {
      jsonMock.mockImplementation(() => {
        throw new Error('Test error');
      });

      await LookupValuesController.listUserTypes(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('listRolesForUserType', () => {
    it('should return staff roles for userType=staff', async () => {
      mockRequest.params = { userType: 'staff' };

      await LookupValuesController.listRolesForUserType(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const response = jsonMock.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(4);
      expect(response.data).toEqual([
        { _id: 'instructor', displayAs: 'Instructor' },
        { _id: 'department-admin', displayAs: 'Department Admin' },
        { _id: 'content-admin', displayAs: 'Content Admin' },
        { _id: 'billing-admin', displayAs: 'Billing Admin' }
      ]);
    });

    it('should return learner roles for userType=learner', async () => {
      mockRequest.params = { userType: 'learner' };

      await LookupValuesController.listRolesForUserType(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const response = jsonMock.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(3);
      expect(response.data).toEqual([
        { _id: 'course-taker', displayAs: 'Course Taker' },
        { _id: 'auditor', displayAs: 'Auditor' },
        { _id: 'learner-supervisor', displayAs: 'Learner Supervisor' }
      ]);
    });

    it('should return global-admin roles for userType=global-admin', async () => {
      mockRequest.params = { userType: 'global-admin' };

      await LookupValuesController.listRolesForUserType(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const response = jsonMock.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(5);
      expect(response.data).toEqual([
        { _id: 'system-admin', displayAs: 'System Admin' },
        { _id: 'enrollment-admin', displayAs: 'Enrollment Admin' },
        { _id: 'course-admin', displayAs: 'Course Admin' },
        { _id: 'theme-admin', displayAs: 'Theme Admin' },
        { _id: 'financial-admin', displayAs: 'Financial Admin' }
      ]);
    });

    it('should throw 400 error for invalid userType', async () => {
      mockRequest.params = { userType: 'invalid' };

      await LookupValuesController.listRolesForUserType(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('Invalid user type: invalid')
        })
      );
    });

    it('should return objects with _id and displayAs properties', async () => {
      mockRequest.params = { userType: 'staff' };

      await LookupValuesController.listRolesForUserType(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const response = jsonMock.mock.calls[0][0];
      response.data.forEach((item: any) => {
        expect(item).toHaveProperty('_id');
        expect(item).toHaveProperty('displayAs');
        expect(typeof item._id).toBe('string');
        expect(typeof item.displayAs).toBe('string');
      });
    });

    it('should call next with error on exception', async () => {
      mockRequest.params = { userType: 'staff' };

      jsonMock.mockImplementation(() => {
        throw new Error('Test error');
      });

      await LookupValuesController.listRolesForUserType(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('setRegistry', () => {
    it('should allow setting custom registry', async () => {
      // Create a custom mock registry
      const customRegistry: IRoleRegistry = {
        getValidUserTypes: () => ['custom-type'],
        getValidRolesForUserType: (ut: string) => ['custom-role'],
        isValidUserType: (ut: string) => ut === 'custom-type',
        getUserTypeDisplay: (ut: string) => `Custom ${ut}`,
        getRoleDisplay: (role: string) => `Custom ${role}`,
        hydrateUserTypes: (uts: string[]) => uts.map(ut => ({ _id: ut as any, displayAs: `Custom ${ut}` }))
      };

      LookupValuesController.setRegistry(customRegistry);

      await LookupValuesController.listUserTypes(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const response = jsonMock.mock.calls[0][0];
      expect(response.data).toEqual([
        { _id: 'custom-type', displayAs: 'Custom custom-type' }
      ]);

      // Reset to default mock registry for other tests
      LookupValuesController.setRegistry({
        getValidUserTypes: () => ['learner', 'staff', 'global-admin'],
        getValidRolesForUserType: (ut: string) => {
          const roles: Record<string, string[]> = {
            'learner': ['course-taker', 'auditor', 'learner-supervisor'],
            'staff': ['instructor', 'department-admin', 'content-admin', 'billing-admin'],
            'global-admin': ['system-admin', 'enrollment-admin', 'course-admin', 'theme-admin', 'financial-admin']
          };
          return roles[ut] || [];
        },
        isValidUserType: (ut: string) => ['learner', 'staff', 'global-admin'].includes(ut),
        getUserTypeDisplay: (ut: string) => {
          const map: Record<string, string> = {
            'learner': 'Learner',
            'staff': 'Staff',
            'global-admin': 'System Admin'
          };
          return map[ut] || ut;
        },
        getRoleDisplay: (role: string) => {
          const map: Record<string, string> = {
            'instructor': 'Instructor',
            'department-admin': 'Department Admin',
            'content-admin': 'Content Admin',
            'billing-admin': 'Billing Admin',
            'course-taker': 'Course Taker',
            'auditor': 'Auditor',
            'learner-supervisor': 'Learner Supervisor',
            'system-admin': 'System Admin',
            'enrollment-admin': 'Enrollment Admin',
            'course-admin': 'Course Admin',
            'theme-admin': 'Theme Admin',
            'financial-admin': 'Financial Admin'
          };
          return map[role] || role;
        },
        hydrateUserTypes: (uts: string[]) => uts.map(ut => {
          const map: Record<string, string> = {
            'learner': 'Learner',
            'staff': 'Staff',
            'global-admin': 'System Admin'
          };
          return { _id: ut as any, displayAs: map[ut] || ut };
        })
      });
    });
  });
});
