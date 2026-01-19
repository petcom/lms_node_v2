/**
 * User Type Hydration Middleware Tests
 *
 * Comprehensive unit tests for user-type hydration middleware.
 * Tests transformation of userTypes from string[] to UserTypeObject[].
 *
 * Part of LookupValues migration (Stream C - API Layer)
 */

import { Request, Response, NextFunction } from 'express';
import {
  hydrateUserTypes,
  hydrateUserTypesInPlace,
  setRoleRegistry,
  getRoleRegistry,
  areUserTypesHydrated,
  getUserTypeStrings,
  IRoleRegistry
} from '@/middlewares/userTypeHydration';
import { UserTypeObject } from '@contracts/api/lookup-values.contract';
import { UserType } from '@/models/auth/User.model';

// Mock logger
jest.mock('@/config/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('User Type Hydration Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      user: undefined,
      hydratedUser: undefined
    };
    mockResponse = {};
    mockNext = jest.fn();

    // Reset to default mock registry before each test
    setRoleRegistry({
      hydrateUserTypes: (uts: string[]) => uts.map(ut => ({
        _id: ut as 'learner' | 'staff' | 'global-admin',
        displayAs: ut === 'learner' ? 'Learner' : ut === 'staff' ? 'Staff' : 'System Admin'
      })),
      getUserTypeDisplay: (ut: string) => {
        const map: Record<string, string> = {
          'learner': 'Learner',
          'staff': 'Staff',
          'global-admin': 'System Admin'
        };
        return map[ut] || ut;
      }
    });
  });

  describe('hydrateUserTypes', () => {
    it('should hydrate userTypes from string[] to UserTypeObject[]', async () => {
      mockRequest.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'staff@example.com',
        userTypes: ['staff'] as UserType[],
        allAccessRights: [],
        canEscalateToAdmin: false,
        defaultDashboard: 'staff'
      };

      await hydrateUserTypes(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.hydratedUser).toBeDefined();
      expect(mockRequest.hydratedUser?.userTypes).toEqual([
        { _id: 'staff', displayAs: 'Staff' }
      ]);
    });

    it('should preserve original userTypeStrings', async () => {
      mockRequest.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'admin@example.com',
        userTypes: ['staff', 'global-admin'] as UserType[],
        allAccessRights: [],
        canEscalateToAdmin: true,
        defaultDashboard: 'staff'
      };

      await hydrateUserTypes(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.hydratedUser?.userTypeStrings).toEqual(['staff', 'global-admin']);
    });

    it('should hydrate multiple userTypes correctly', async () => {
      mockRequest.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'admin@example.com',
        userTypes: ['staff', 'global-admin'] as UserType[],
        allAccessRights: [],
        canEscalateToAdmin: true,
        defaultDashboard: 'staff'
      };

      await hydrateUserTypes(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.hydratedUser?.userTypes).toEqual([
        { _id: 'staff', displayAs: 'Staff' },
        { _id: 'global-admin', displayAs: 'System Admin' }
      ]);
    });

    it('should hydrate learner userType correctly', async () => {
      mockRequest.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'learner@example.com',
        userTypes: ['learner'] as UserType[],
        allAccessRights: [],
        canEscalateToAdmin: false,
        defaultDashboard: 'learner'
      };

      await hydrateUserTypes(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.hydratedUser?.userTypes).toEqual([
        { _id: 'learner', displayAs: 'Learner' }
      ]);
    });

    it('should preserve all other user properties', async () => {
      mockRequest.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'staff@example.com',
        userTypes: ['staff'] as UserType[],
        allAccessRights: ['content:courses:read', 'content:lessons:read'],
        canEscalateToAdmin: false,
        defaultDashboard: 'staff',
        lastSelectedDepartment: 'dept123',
        roles: ['instructor'] // V1 compatibility
      };

      await hydrateUserTypes(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.hydratedUser).toMatchObject({
        userId: '507f1f77bcf86cd799439011',
        email: 'staff@example.com',
        allAccessRights: ['content:courses:read', 'content:lessons:read'],
        canEscalateToAdmin: false,
        defaultDashboard: 'staff',
        lastSelectedDepartment: 'dept123',
        roles: ['instructor']
      });
    });

    it('should handle missing req.user gracefully', async () => {
      mockRequest.user = undefined;

      await hydrateUserTypes(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.hydratedUser).toBeUndefined();
    });

    it('should call next with error on exception', async () => {
      mockRequest.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'staff@example.com',
        userTypes: ['staff'] as UserType[],
        allAccessRights: [],
        canEscalateToAdmin: false,
        defaultDashboard: 'staff'
      };

      // Create a mock registry that throws an error
      const errorRegistry: IRoleRegistry = {
        hydrateUserTypes: () => {
          throw new Error('Test error');
        },
        getUserTypeDisplay: () => {
          throw new Error('Test error');
        }
      };

      setRoleRegistry(errorRegistry);

      await hydrateUserTypes(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));

      // Reset to default registry
      setRoleRegistry({
        hydrateUserTypes: (uts: string[]) => uts.map(ut => ({
          _id: ut as 'learner' | 'staff' | 'global-admin',
          displayAs: ut === 'learner' ? 'Learner' : ut === 'staff' ? 'Staff' : 'System Admin'
        })),
        getUserTypeDisplay: (ut: string) => {
          const map: Record<string, string> = {
            'learner': 'Learner',
            'staff': 'Staff',
            'global-admin': 'System Admin'
          };
          return map[ut] || ut;
        }
      });
    });
  });

  describe('hydrateUserTypesInPlace', () => {
    it('should hydrate userTypes in-place', async () => {
      mockRequest.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'staff@example.com',
        userTypes: ['staff'] as UserType[],
        allAccessRights: [],
        canEscalateToAdmin: false,
        defaultDashboard: 'staff'
      };

      await hydrateUserTypesInPlace(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockRequest.user as any).userTypes).toEqual([
        { _id: 'staff', displayAs: 'Staff' }
      ]);
    });

    it('should preserve original strings in userTypeStrings', async () => {
      mockRequest.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'admin@example.com',
        userTypes: ['staff', 'global-admin'] as UserType[],
        allAccessRights: [],
        canEscalateToAdmin: true,
        defaultDashboard: 'staff'
      };

      await hydrateUserTypesInPlace(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect((mockRequest.user as any).userTypeStrings).toEqual(['staff', 'global-admin']);
    });

    it('should modify req.user directly without creating hydratedUser', async () => {
      mockRequest.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'learner@example.com',
        userTypes: ['learner'] as UserType[],
        allAccessRights: [],
        canEscalateToAdmin: false,
        defaultDashboard: 'learner'
      };

      await hydrateUserTypesInPlace(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.hydratedUser).toBeUndefined();
      expect((mockRequest.user as any).userTypes).toEqual([
        { _id: 'learner', displayAs: 'Learner' }
      ]);
    });

    it('should handle missing req.user gracefully', async () => {
      mockRequest.user = undefined;

      await hydrateUserTypesInPlace(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRequest.user).toBeUndefined();
    });

    it('should call next with error on exception', async () => {
      mockRequest.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'staff@example.com',
        userTypes: ['staff'] as UserType[],
        allAccessRights: [],
        canEscalateToAdmin: false,
        defaultDashboard: 'staff'
      };

      // Create a mock registry that throws an error
      const errorRegistry: IRoleRegistry = {
        hydrateUserTypes: () => {
          throw new Error('Test error');
        },
        getUserTypeDisplay: () => {
          throw new Error('Test error');
        }
      };

      setRoleRegistry(errorRegistry);

      await hydrateUserTypesInPlace(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));

      // Reset to default registry
      setRoleRegistry({
        hydrateUserTypes: (uts: string[]) => uts.map(ut => ({
          _id: ut as 'learner' | 'staff' | 'global-admin',
          displayAs: ut === 'learner' ? 'Learner' : ut === 'staff' ? 'Staff' : 'System Admin'
        })),
        getUserTypeDisplay: (ut: string) => {
          const map: Record<string, string> = {
            'learner': 'Learner',
            'staff': 'Staff',
            'global-admin': 'System Admin'
          };
          return map[ut] || ut;
        }
      });
    });
  });

  describe('setRoleRegistry and getRoleRegistry', () => {
    it('should allow setting custom registry', () => {
      const customRegistry: IRoleRegistry = {
        hydrateUserTypes: (uts: string[]) => uts.map(ut => ({
          _id: ut as 'learner' | 'staff' | 'global-admin',
          displayAs: `Custom ${ut}`
        })),
        getUserTypeDisplay: (ut: string) => `Custom ${ut}`
      };

      setRoleRegistry(customRegistry);
      const registry = getRoleRegistry();

      const result = registry.hydrateUserTypes(['staff']);
      expect(result).toEqual([
        { _id: 'staff', displayAs: 'Custom staff' }
      ]);
    });

    it('should return the current registry', () => {
      const registry = getRoleRegistry();
      expect(registry).toBeDefined();
      expect(typeof registry.hydrateUserTypes).toBe('function');
      expect(typeof registry.getUserTypeDisplay).toBe('function');
    });
  });

  describe('areUserTypesHydrated', () => {
    it('should return true for hydrated userTypes', () => {
      const hydrated: UserTypeObject[] = [
        { _id: 'staff', displayAs: 'Staff' }
      ];

      expect(areUserTypesHydrated(hydrated)).toBe(true);
    });

    it('should return false for string userTypes', () => {
      const strings = ['staff', 'learner'];

      expect(areUserTypesHydrated(strings as any)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(areUserTypesHydrated([])).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(areUserTypesHydrated(null as any)).toBe(false);
      expect(areUserTypesHydrated(undefined as any)).toBe(false);
    });

    it('should correctly identify hydrated vs non-hydrated', () => {
      const hydrated: UserTypeObject[] = [
        { _id: 'learner', displayAs: 'Learner' },
        { _id: 'staff', displayAs: 'Staff' }
      ];

      const strings = ['learner', 'staff'];

      expect(areUserTypesHydrated(hydrated)).toBe(true);
      expect(areUserTypesHydrated(strings as any)).toBe(false);
    });
  });

  describe('getUserTypeStrings', () => {
    it('should extract _id from hydrated userTypes', () => {
      const hydrated: UserTypeObject[] = [
        { _id: 'staff', displayAs: 'Staff' },
        { _id: 'global-admin', displayAs: 'System Admin' }
      ];

      const result = getUserTypeStrings(hydrated);
      expect(result).toEqual(['staff', 'global-admin']);
    });

    it('should return string array as-is', () => {
      const strings = ['learner', 'staff'];

      const result = getUserTypeStrings(strings);
      expect(result).toEqual(['learner', 'staff']);
    });

    it('should handle single userType', () => {
      const hydrated: UserTypeObject[] = [
        { _id: 'learner', displayAs: 'Learner' }
      ];

      const result = getUserTypeStrings(hydrated);
      expect(result).toEqual(['learner']);
    });

    it('should handle empty array', () => {
      const result = getUserTypeStrings([]);
      expect(result).toEqual([]);
    });

    it('should handle mixed scenarios correctly', () => {
      // Hydrated
      const hydrated: UserTypeObject[] = [
        { _id: 'staff', displayAs: 'Staff' }
      ];
      expect(getUserTypeStrings(hydrated)).toEqual(['staff']);

      // String array
      const strings = ['learner'];
      expect(getUserTypeStrings(strings)).toEqual(['learner']);
    });
  });

  describe('Integration scenarios', () => {
    it('should work with complete authentication flow', async () => {
      // Simulate authenticated user from isAuthenticated middleware
      mockRequest.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'instructor@example.com',
        userTypes: ['staff', 'global-admin'] as UserType[],
        allAccessRights: [
          'content:courses:read',
          'content:courses:manage',
          'content:lessons:manage',
          'grades:own-classes:manage'
        ],
        canEscalateToAdmin: true,
        defaultDashboard: 'staff',
        lastSelectedDepartment: '507f1f77bcf86cd799439100'
      };

      await hydrateUserTypes(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify hydration
      expect(mockRequest.hydratedUser).toBeDefined();
      expect(mockRequest.hydratedUser?.userTypes).toEqual([
        { _id: 'staff', displayAs: 'Staff' },
        { _id: 'global-admin', displayAs: 'System Admin' }
      ]);

      // Verify all properties preserved
      expect(mockRequest.hydratedUser?.userId).toBe('507f1f77bcf86cd799439011');
      expect(mockRequest.hydratedUser?.email).toBe('instructor@example.com');
      expect(mockRequest.hydratedUser?.allAccessRights).toHaveLength(4);
      expect(mockRequest.hydratedUser?.canEscalateToAdmin).toBe(true);
      expect(mockRequest.hydratedUser?.userTypeStrings).toEqual(['staff', 'global-admin']);
    });

    it('should work with custom registry in production', async () => {
      // Simulate production registry with database lookups
      const productionRegistry: IRoleRegistry = {
        hydrateUserTypes: (uts: string[]) => {
          // In production, this would query the database
          const dbLookups: Record<string, string> = {
            'learner': 'Learner (Production)',
            'staff': 'Staff Member',
            'global-admin': 'Global Administrator'
          };
          return uts.map(ut => ({
            _id: ut as 'learner' | 'staff' | 'global-admin',
            displayAs: dbLookups[ut] || ut
          }));
        },
        getUserTypeDisplay: (ut: string) => {
          const dbLookups: Record<string, string> = {
            'learner': 'Learner (Production)',
            'staff': 'Staff Member',
            'global-admin': 'Global Administrator'
          };
          return dbLookups[ut] || ut;
        }
      };

      setRoleRegistry(productionRegistry);

      mockRequest.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'staff@example.com',
        userTypes: ['staff'] as UserType[],
        allAccessRights: [],
        canEscalateToAdmin: false,
        defaultDashboard: 'staff'
      };

      await hydrateUserTypes(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.hydratedUser?.userTypes).toEqual([
        { _id: 'staff', displayAs: 'Staff Member' }
      ]);

      // Reset to default mock registry
      setRoleRegistry({
        hydrateUserTypes: (uts: string[]) => uts.map(ut => ({
          _id: ut as 'learner' | 'staff' | 'global-admin',
          displayAs: ut === 'learner' ? 'Learner' : ut === 'staff' ? 'Staff' : 'System Admin'
        })),
        getUserTypeDisplay: (ut: string) => {
          const map: Record<string, string> = {
            'learner': 'Learner',
            'staff': 'Staff',
            'global-admin': 'System Admin'
          };
          return map[ut] || ut;
        }
      });
    });
  });
});
