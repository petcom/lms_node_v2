/**
 * Auth Transform Service Tests
 *
 * Comprehensive unit tests for AuthTransformService.
 * Tests transformation of login and getCurrentUser responses.
 *
 * Part of LookupValues migration (Stream C - API Layer)
 */

import {
  AuthTransformService,
  MockRoleRegistry,
  IRoleRegistry,
  RawLoginResponse,
  RawGetCurrentUserResponse
} from '@/services/auth/auth-transform.service';
import { UserTypeObject } from '@contracts/api/lookup-values.contract';

describe('AuthTransformService', () => {
  let registry: IRoleRegistry;
  let service: AuthTransformService;

  beforeEach(() => {
    registry = new MockRoleRegistry();
    service = new AuthTransformService(registry);
  });

  describe('transformLoginResponse', () => {
    it('should transform userTypes from string[] to UserTypeObject[]', () => {
      const rawResponse: RawLoginResponse = {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'staff@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          isActive: true,
          lastLogin: null,
          createdAt: '2025-06-01T00:00:00.000Z'
        },
        session: {
          accessToken: 'token123',
          refreshToken: 'refresh123',
          expiresIn: 3600,
          tokenType: 'Bearer'
        },
        userTypes: ['staff'],
        defaultDashboard: 'staff',
        canEscalateToAdmin: false,
        departmentMemberships: [],
        allAccessRights: [],
        lastSelectedDepartment: null
      };

      const transformed = service.transformLoginResponse(rawResponse);

      expect(transformed.userTypes).toEqual([
        { _id: 'staff', displayAs: 'Staff' }
      ]);
      expect(transformed.user).toEqual(rawResponse.user);
      expect(transformed.session).toEqual(rawResponse.session);
    });

    it('should transform multiple userTypes correctly', () => {
      const rawResponse: RawLoginResponse = {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'admin@example.com',
          firstName: 'John',
          lastName: 'Admin',
          isActive: true,
          lastLogin: null,
          createdAt: '2025-06-01T00:00:00.000Z'
        },
        session: {
          accessToken: 'token123',
          refreshToken: 'refresh123',
          expiresIn: 3600,
          tokenType: 'Bearer'
        },
        userTypes: ['staff', 'global-admin'],
        defaultDashboard: 'staff',
        canEscalateToAdmin: true,
        departmentMemberships: [],
        allAccessRights: [],
        lastSelectedDepartment: null
      };

      const transformed = service.transformLoginResponse(rawResponse);

      expect(transformed.userTypes).toHaveLength(2);
      expect(transformed.userTypes[0]).toEqual({ _id: 'staff', displayAs: 'Staff' });
      expect(transformed.userTypes[1]).toEqual({ _id: 'global-admin', displayAs: 'System Admin' });
    });

    it('should transform learner userType correctly', () => {
      const rawResponse: RawLoginResponse = {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'learner@example.com',
          firstName: 'Alice',
          lastName: 'Student',
          isActive: true,
          lastLogin: null,
          createdAt: '2025-06-01T00:00:00.000Z'
        },
        session: {
          accessToken: 'token123',
          refreshToken: 'refresh123',
          expiresIn: 3600,
          tokenType: 'Bearer'
        },
        userTypes: ['learner'],
        defaultDashboard: 'learner',
        canEscalateToAdmin: false,
        departmentMemberships: [],
        allAccessRights: [],
        lastSelectedDepartment: null
      };

      const transformed = service.transformLoginResponse(rawResponse);

      expect(transformed.userTypes).toEqual([
        { _id: 'learner', displayAs: 'Learner' }
      ]);
      expect(transformed.defaultDashboard).toBe('learner');
    });

    it('should preserve all other response fields', () => {
      const rawResponse: RawLoginResponse = {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'staff@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          isActive: true,
          lastLogin: '2025-12-01T10:00:00.000Z',
          createdAt: '2025-06-01T00:00:00.000Z'
        },
        session: {
          accessToken: 'token123',
          refreshToken: 'refresh123',
          expiresIn: 3600,
          tokenType: 'Bearer'
        },
        userTypes: ['staff'],
        defaultDashboard: 'staff',
        canEscalateToAdmin: false,
        departmentMemberships: [
          {
            departmentId: 'dept123',
            departmentName: 'Cognitive Therapy',
            departmentSlug: 'cognitive-therapy',
            roles: ['instructor'],
            accessRights: ['content:courses:read'],
            isPrimary: true,
            isActive: true,
            joinedAt: '2025-06-15T00:00:00.000Z'
          }
        ],
        allAccessRights: ['content:courses:read', 'content:lessons:read'],
        lastSelectedDepartment: 'dept123'
      };

      const transformed = service.transformLoginResponse(rawResponse);

      expect(transformed.user.lastLogin).toBe(rawResponse.user.lastLogin);
      expect(transformed.canEscalateToAdmin).toBe(rawResponse.canEscalateToAdmin);
      expect(transformed.departmentMemberships).toEqual(rawResponse.departmentMemberships);
      expect(transformed.allAccessRights).toEqual(rawResponse.allAccessRights);
      expect(transformed.lastSelectedDepartment).toBe(rawResponse.lastSelectedDepartment);
    });

    it('should handle empty userTypes array', () => {
      const rawResponse: RawLoginResponse = {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'new@example.com',
          firstName: 'New',
          lastName: 'User',
          isActive: true,
          lastLogin: null,
          createdAt: '2025-06-01T00:00:00.000Z'
        },
        session: {
          accessToken: 'token123',
          refreshToken: 'refresh123',
          expiresIn: 3600,
          tokenType: 'Bearer'
        },
        userTypes: [],
        defaultDashboard: 'staff',
        canEscalateToAdmin: false,
        departmentMemberships: [],
        allAccessRights: [],
        lastSelectedDepartment: null
      };

      const transformed = service.transformLoginResponse(rawResponse);

      expect(transformed.userTypes).toEqual([]);
    });
  });

  describe('transformGetCurrentUserResponse', () => {
    it('should transform userTypes from string[] to UserTypeObject[]', () => {
      const rawResponse: RawGetCurrentUserResponse = {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'staff@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          isActive: true,
          lastLogin: null,
          createdAt: '2025-06-01T00:00:00.000Z'
        },
        userTypes: ['staff'],
        defaultDashboard: 'staff',
        canEscalateToAdmin: false,
        departmentMemberships: [],
        allAccessRights: [],
        lastSelectedDepartment: null,
        isAdminSessionActive: false,
        adminSessionExpiresAt: null
      };

      const transformed = service.transformGetCurrentUserResponse(rawResponse);

      expect(transformed.userTypes).toEqual([
        { _id: 'staff', displayAs: 'Staff' }
      ]);
    });

    it('should preserve admin session fields', () => {
      const rawResponse: RawGetCurrentUserResponse = {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          isActive: true,
          lastLogin: null,
          createdAt: '2025-06-01T00:00:00.000Z'
        },
        userTypes: ['staff', 'global-admin'],
        defaultDashboard: 'staff',
        canEscalateToAdmin: true,
        departmentMemberships: [],
        allAccessRights: [],
        lastSelectedDepartment: null,
        isAdminSessionActive: true,
        adminSessionExpiresAt: '2025-12-01T15:00:00.000Z'
      };

      const transformed = service.transformGetCurrentUserResponse(rawResponse);

      expect(transformed.isAdminSessionActive).toBe(true);
      expect(transformed.adminSessionExpiresAt).toBe('2025-12-01T15:00:00.000Z');
      expect(transformed.userTypes).toHaveLength(2);
    });
  });

  describe('transformUserTypes', () => {
    it('should transform userTypes array directly', () => {
      const userTypes = ['learner', 'staff'];
      const transformed = service.transformUserTypes(userTypes);

      expect(transformed).toEqual([
        { _id: 'learner', displayAs: 'Learner' },
        { _id: 'staff', displayAs: 'Staff' }
      ]);
    });

    it('should handle single userType', () => {
      const userTypes = ['global-admin'];
      const transformed = service.transformUserTypes(userTypes);

      expect(transformed).toEqual([
        { _id: 'global-admin', displayAs: 'System Admin' }
      ]);
    });

    it('should handle empty array', () => {
      const userTypes: string[] = [];
      const transformed = service.transformUserTypes(userTypes);

      expect(transformed).toEqual([]);
    });
  });

  describe('MockRoleRegistry', () => {
    let mockRegistry: MockRoleRegistry;

    beforeEach(() => {
      mockRegistry = new MockRoleRegistry();
    });

    describe('hydrateUserTypes', () => {
      it('should convert string[] to UserTypeObject[]', () => {
        const result = mockRegistry.hydrateUserTypes(['staff']);

        expect(result).toEqual([
          { _id: 'staff', displayAs: 'Staff' }
        ]);
      });

      it('should handle multiple userTypes', () => {
        const result = mockRegistry.hydrateUserTypes(['learner', 'staff', 'global-admin']);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ _id: 'learner', displayAs: 'Learner' });
        expect(result[1]).toEqual({ _id: 'staff', displayAs: 'Staff' });
        expect(result[2]).toEqual({ _id: 'global-admin', displayAs: 'System Admin' });
      });

      it('should handle empty array', () => {
        const result = mockRegistry.hydrateUserTypes([]);

        expect(result).toEqual([]);
      });
    });

    describe('getUserTypeDisplay', () => {
      it('should return correct display value for learner', () => {
        const display = mockRegistry.getUserTypeDisplay('learner');
        expect(display).toBe('Learner');
      });

      it('should return correct display value for staff', () => {
        const display = mockRegistry.getUserTypeDisplay('staff');
        expect(display).toBe('Staff');
      });

      it('should return correct display value for global-admin', () => {
        const display = mockRegistry.getUserTypeDisplay('global-admin');
        expect(display).toBe('System Admin');
      });

      it('should return the key itself for unknown userType', () => {
        const display = mockRegistry.getUserTypeDisplay('unknown');
        expect(display).toBe('unknown');
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete login flow transformation', () => {
      const rawResponse: RawLoginResponse = {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'instructor@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          isActive: true,
          lastLogin: '2026-01-09T14:30:00.000Z',
          createdAt: '2025-06-01T00:00:00.000Z'
        },
        session: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          expiresIn: 3600,
          tokenType: 'Bearer'
        },
        userTypes: ['staff', 'global-admin'],
        defaultDashboard: 'staff',
        canEscalateToAdmin: true,
        departmentMemberships: [
          {
            departmentId: '507f1f77bcf86cd799439100',
            departmentName: 'Cognitive Therapy',
            departmentSlug: 'cognitive-therapy',
            roles: ['instructor', 'content-admin'],
            accessRights: [
              'content:courses:read',
              'content:courses:manage',
              'content:lessons:manage',
              'grades:own-classes:manage'
            ],
            isPrimary: true,
            isActive: true,
            joinedAt: '2025-06-15T00:00:00.000Z'
          }
        ],
        allAccessRights: [
          'content:courses:read',
          'content:courses:manage',
          'content:lessons:manage',
          'grades:own-classes:manage'
        ],
        lastSelectedDepartment: '507f1f77bcf86cd799439100'
      };

      const transformed = service.transformLoginResponse(rawResponse);

      // Verify transformation
      expect(transformed.userTypes).toEqual([
        { _id: 'staff', displayAs: 'Staff' },
        { _id: 'global-admin', displayAs: 'System Admin' }
      ]);

      // Verify all other fields preserved
      expect(transformed.user.email).toBe('instructor@example.com');
      expect(transformed.session.accessToken).toBeTruthy();
      expect(transformed.departmentMemberships).toHaveLength(1);
      expect(transformed.allAccessRights).toHaveLength(4);
      expect(transformed.canEscalateToAdmin).toBe(true);
    });

    it('should work with custom registry implementation', () => {
      // Create a custom registry with different display values
      const customRegistry: IRoleRegistry = {
        hydrateUserTypes: (userTypes: string[]) => {
          return userTypes.map(ut => ({
            _id: ut as 'learner' | 'staff' | 'global-admin',
            displayAs: `Custom ${ut}`
          }));
        },
        getUserTypeDisplay: (ut: string) => `Custom ${ut}`
      };

      const customService = new AuthTransformService(customRegistry);

      const rawResponse: RawLoginResponse = {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          isActive: true,
          lastLogin: null,
          createdAt: '2025-06-01T00:00:00.000Z'
        },
        session: {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresIn: 3600,
          tokenType: 'Bearer'
        },
        userTypes: ['staff'],
        defaultDashboard: 'staff',
        canEscalateToAdmin: false,
        departmentMemberships: [],
        allAccessRights: [],
        lastSelectedDepartment: null
      };

      const transformed = customService.transformLoginResponse(rawResponse);

      expect(transformed.userTypes).toEqual([
        { _id: 'staff', displayAs: 'Custom staff' }
      ]);
    });
  });
});
