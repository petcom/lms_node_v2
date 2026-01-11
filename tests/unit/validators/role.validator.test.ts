/**
 * Role Validator Tests
 *
 * Comprehensive test suite for role validators covering:
 * - Update role access rights validation
 * - Get role by name validation
 * - Get roles by user type validation
 * - Create role validation
 * - Role name and access rights format validation
 */

import { Request, Response, NextFunction } from 'express';
import {
  validateUpdateRoleAccessRights,
  validateGetRoleByName,
  validateGetRolesByUserType,
  validateCreateRole
} from '@/validators/role.validator';
import { ApiError } from '@/utils/ApiError';

describe('Role Validator', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {}
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('validateUpdateRoleAccessRights()', () => {
    describe('Valid Cases', () => {
      it('should pass with valid role name and access rights', () => {
        mockRequest.params = { name: 'instructor' };
        mockRequest.body = {
          accessRights: ['content:courses:manage', 'content:modules:create']
        };

        expect(() => {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with all learner roles', () => {
        const learnerRoles = ['course-taker', 'auditor', 'learner-supervisor'];

        learnerRoles.forEach(role => {
          mockRequest.params = { name: role };
          mockRequest.body = {
            accessRights: ['content:courses:view']
          };
          mockNext = jest.fn();

          expect(() => {
            validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
          }).not.toThrow();
          expect(mockNext).toHaveBeenCalled();
        });
      });

      it('should pass with all staff roles', () => {
        const staffRoles = ['instructor', 'department-admin', 'content-admin', 'billing-admin'];

        staffRoles.forEach(role => {
          mockRequest.params = { name: role };
          mockRequest.body = {
            accessRights: ['content:courses:manage']
          };
          mockNext = jest.fn();

          expect(() => {
            validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
          }).not.toThrow();
          expect(mockNext).toHaveBeenCalled();
        });
      });

      it('should pass with all global admin roles', () => {
        const adminRoles = ['system-admin', 'enrollment-admin', 'course-admin', 'theme-admin', 'financial-admin'];

        adminRoles.forEach(role => {
          mockRequest.params = { name: role };
          mockRequest.body = {
            accessRights: ['system:settings:manage']
          };
          mockNext = jest.fn();

          expect(() => {
            validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
          }).not.toThrow();
          expect(mockNext).toHaveBeenCalled();
        });
      });

      it('should pass with single access right', () => {
        mockRequest.params = { name: 'instructor' };
        mockRequest.body = {
          accessRights: ['content:courses:view']
        };

        expect(() => {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
      });

      it('should pass with multiple access rights', () => {
        mockRequest.params = { name: 'department-admin' };
        mockRequest.body = {
          accessRights: [
            'content:courses:manage',
            'content:modules:manage',
            'enrollment:students:manage',
            'staff:instructors:view'
          ]
        };

        expect(() => {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
      });

      it('should pass with hyphenated access rights', () => {
        mockRequest.params = { name: 'content-admin' };
        mockRequest.body = {
          accessRights: ['course-content:learning-modules:full-access']
        };

        expect(() => {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
      });
    });

    describe('Invalid Cases - Role Name', () => {
      it('should reject missing role name', () => {
        mockRequest.params = {};
        mockRequest.body = {
          accessRights: ['content:courses:view']
        };

        expect(() => {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('Role name is required');
        }
      });

      it('should reject invalid role name', () => {
        mockRequest.params = { name: 'invalid-role' };
        mockRequest.body = {
          accessRights: ['content:courses:view']
        };

        expect(() => {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('Role name must be one of');
        }
      });

      it('should reject empty role name', () => {
        mockRequest.params = { name: '' };
        mockRequest.body = {
          accessRights: ['content:courses:view']
        };

        expect(() => {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject role name with uppercase', () => {
        mockRequest.params = { name: 'Instructor' };
        mockRequest.body = {
          accessRights: ['content:courses:view']
        };

        expect(() => {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });

    describe('Invalid Cases - Access Rights', () => {
      it('should reject missing accessRights', () => {
        mockRequest.params = { name: 'instructor' };
        mockRequest.body = {};

        expect(() => {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('Access rights are required');
        }
      });

      it('should reject empty accessRights array', () => {
        mockRequest.params = { name: 'instructor' };
        mockRequest.body = {
          accessRights: []
        };

        expect(() => {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('At least one access right is required');
        }
      });

      it('should reject non-array accessRights', () => {
        mockRequest.params = { name: 'instructor' };
        mockRequest.body = {
          accessRights: 'content:courses:view'
        };

        expect(() => {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('Access rights must be an array');
        }
      });

      it('should reject access right without colons', () => {
        mockRequest.params = { name: 'instructor' };
        mockRequest.body = {
          accessRights: ['contentcoursesview']
        };

        expect(() => {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('domain:resource:action');
        }
      });

      it('should reject access right with only one colon', () => {
        mockRequest.params = { name: 'instructor' };
        mockRequest.body = {
          accessRights: ['content:coursesview']
        };

        expect(() => {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject access right with uppercase letters', () => {
        mockRequest.params = { name: 'instructor' };
        mockRequest.body = {
          accessRights: ['Content:Courses:View']
        };

        expect(() => {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject access right with spaces', () => {
        mockRequest.params = { name: 'instructor' };
        mockRequest.body = {
          accessRights: ['content courses view']
        };

        expect(() => {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject access right with special characters', () => {
        mockRequest.params = { name: 'instructor' };
        mockRequest.body = {
          accessRights: ['content@courses#view']
        };

        expect(() => {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject mixed valid and invalid access rights', () => {
        mockRequest.params = { name: 'instructor' };
        mockRequest.body = {
          accessRights: [
            'content:courses:view',
            'invalid-format',
            'enrollment:students:manage'
          ]
        };

        expect(() => {
          validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });
  });

  describe('validateGetRoleByName()', () => {
    describe('Valid Cases', () => {
      it('should pass with valid learner role', () => {
        mockRequest.params = { name: 'course-taker' };

        expect(() => {
          validateGetRoleByName(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with valid staff role', () => {
        mockRequest.params = { name: 'instructor' };

        expect(() => {
          validateGetRoleByName(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with valid admin role', () => {
        mockRequest.params = { name: 'system-admin' };

        expect(() => {
          validateGetRoleByName(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('Invalid Cases', () => {
      it('should reject invalid role name', () => {
        mockRequest.params = { name: 'invalid-role' };

        expect(() => {
          validateGetRoleByName(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateGetRoleByName(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('Role name must be one of');
        }
      });

      it('should reject missing role name', () => {
        mockRequest.params = {};

        expect(() => {
          validateGetRoleByName(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject empty role name', () => {
        mockRequest.params = { name: '' };

        expect(() => {
          validateGetRoleByName(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });
  });

  describe('validateGetRolesByUserType()', () => {
    describe('Valid Cases', () => {
      it('should pass with learner user type', () => {
        mockRequest.params = { type: 'learner' };

        expect(() => {
          validateGetRolesByUserType(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with staff user type', () => {
        mockRequest.params = { type: 'staff' };

        expect(() => {
          validateGetRolesByUserType(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with global-admin user type', () => {
        mockRequest.params = { type: 'global-admin' };

        expect(() => {
          validateGetRolesByUserType(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('Invalid Cases', () => {
      it('should reject invalid user type', () => {
        mockRequest.params = { type: 'invalid-type' };

        expect(() => {
          validateGetRolesByUserType(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateGetRolesByUserType(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('User type must be one of');
        }
      });

      it('should reject missing user type', () => {
        mockRequest.params = {};

        expect(() => {
          validateGetRolesByUserType(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject empty user type', () => {
        mockRequest.params = { type: '' };

        expect(() => {
          validateGetRolesByUserType(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject admin instead of global-admin', () => {
        mockRequest.params = { type: 'admin' };

        expect(() => {
          validateGetRolesByUserType(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });
  });

  describe('validateCreateRole()', () => {
    describe('Valid Cases', () => {
      it('should pass with valid role creation data', () => {
        mockRequest.body = {
          name: 'custom-role',
          userType: 'staff',
          description: 'A custom role for testing',
          accessRights: ['content:courses:view']
        };

        expect(() => {
          validateCreateRole(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass without optional description', () => {
        mockRequest.body = {
          name: 'custom-role',
          userType: 'learner',
          accessRights: ['content:courses:view']
        };

        expect(() => {
          validateCreateRole(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
      });

      it('should pass with multiple access rights', () => {
        mockRequest.body = {
          name: 'multi-access-role',
          userType: 'staff',
          accessRights: [
            'content:courses:view',
            'content:modules:manage',
            'enrollment:students:view'
          ]
        };

        expect(() => {
          validateCreateRole(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
      });

      it('should pass with all user types', () => {
        const userTypes = ['learner', 'staff', 'global-admin'];

        userTypes.forEach(userType => {
          mockRequest.body = {
            name: `role-for-${userType}`,
            userType,
            accessRights: ['content:test:view']
          };
          mockNext = jest.fn();

          expect(() => {
            validateCreateRole(mockRequest as Request, mockResponse as Response, mockNext);
          }).not.toThrow();
        });
      });
    });

    describe('Invalid Cases - Name', () => {
      it('should reject missing name', () => {
        mockRequest.body = {
          userType: 'staff',
          accessRights: ['content:courses:view']
        };

        expect(() => {
          validateCreateRole(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateCreateRole(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('Role name is required');
        }
      });

      it('should reject empty name', () => {
        mockRequest.body = {
          name: '',
          userType: 'staff',
          accessRights: ['content:courses:view']
        };

        expect(() => {
          validateCreateRole(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject name with uppercase letters', () => {
        mockRequest.body = {
          name: 'CustomRole',
          userType: 'staff',
          accessRights: ['content:courses:view']
        };

        expect(() => {
          validateCreateRole(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateCreateRole(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('lowercase letters and hyphens');
        }
      });

      it('should reject name with spaces', () => {
        mockRequest.body = {
          name: 'custom role',
          userType: 'staff',
          accessRights: ['content:courses:view']
        };

        expect(() => {
          validateCreateRole(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject name with special characters', () => {
        mockRequest.body = {
          name: 'custom@role',
          userType: 'staff',
          accessRights: ['content:courses:view']
        };

        expect(() => {
          validateCreateRole(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });

    describe('Invalid Cases - User Type', () => {
      it('should reject missing userType', () => {
        mockRequest.body = {
          name: 'custom-role',
          accessRights: ['content:courses:view']
        };

        expect(() => {
          validateCreateRole(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateCreateRole(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('User type is required');
        }
      });

      it('should reject invalid userType', () => {
        mockRequest.body = {
          name: 'custom-role',
          userType: 'invalid',
          accessRights: ['content:courses:view']
        };

        expect(() => {
          validateCreateRole(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject empty userType', () => {
        mockRequest.body = {
          name: 'custom-role',
          userType: '',
          accessRights: ['content:courses:view']
        };

        expect(() => {
          validateCreateRole(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });

    describe('Invalid Cases - Access Rights', () => {
      it('should reject missing accessRights', () => {
        mockRequest.body = {
          name: 'custom-role',
          userType: 'staff'
        };

        expect(() => {
          validateCreateRole(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject empty accessRights array', () => {
        mockRequest.body = {
          name: 'custom-role',
          userType: 'staff',
          accessRights: []
        };

        expect(() => {
          validateCreateRole(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject invalid access right format', () => {
        mockRequest.body = {
          name: 'custom-role',
          userType: 'staff',
          accessRights: ['invalid-format']
        };

        expect(() => {
          validateCreateRole(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should work in PUT /roles/:name/access-rights route', () => {
      mockRequest.params = { name: 'instructor' };
      mockRequest.body = {
        accessRights: ['content:courses:manage']
      };

      validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should work in GET /roles/:name route', () => {
      mockRequest.params = { name: 'instructor' };

      validateGetRoleByName(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should work in GET /roles/user-type/:type route', () => {
      mockRequest.params = { type: 'staff' };

      validateGetRolesByUserType(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should work in POST /roles route', () => {
      mockRequest.body = {
        name: 'new-role',
        userType: 'staff',
        accessRights: ['content:test:view']
      };

      validateCreateRole(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should stop middleware chain on validation error', () => {
      mockRequest.params = { name: 'invalid-role' };
      mockRequest.body = {
        accessRights: ['content:courses:view']
      };

      expect(() => {
        validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(ApiError);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Error Messages', () => {
    it('should list all valid roles in error message', () => {
      mockRequest.params = { name: 'invalid' };
      mockRequest.body = {
        accessRights: ['content:courses:view']
      };

      try {
        validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
      } catch (error: any) {
        expect(error.errors[0].message).toContain('instructor');
        expect(error.errors[0].message).toContain('system-admin');
      }
    });

    it('should explain access right format in error message', () => {
      mockRequest.params = { name: 'instructor' };
      mockRequest.body = {
        accessRights: ['invalid']
      };

      try {
        validateUpdateRoleAccessRights(mockRequest as Request, mockResponse as Response, mockNext);
      } catch (error: any) {
        expect(error.errors[0].message).toContain('domain:resource:action');
      }
    });
  });
});
