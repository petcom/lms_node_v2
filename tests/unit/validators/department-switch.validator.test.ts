/**
 * Department Switch Validator Tests
 *
 * Comprehensive test suite for department switch validators covering:
 * - Department ID validation in request body
 * - Department ID validation in URL parameters
 * - ObjectId format validation
 * - Error message clarity
 */

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { validateSwitchDepartment, validateDepartmentIdParam } from '@/validators/department-switch.validator';
import { ApiError } from '@/utils/ApiError';

describe('Department Switch Validator', () => {
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

  describe('validateSwitchDepartment()', () => {
    describe('Valid Cases', () => {
      it('should pass with valid ObjectId', () => {
        const validObjectId = new mongoose.Types.ObjectId().toString();
        mockRequest.body = {
          departmentId: validObjectId
        };

        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with 24-character hex string', () => {
        mockRequest.body = {
          departmentId: '507f1f77bcf86cd799439011'
        };

        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with newly created ObjectId', () => {
        const newObjectId = new mongoose.Types.ObjectId();
        mockRequest.body = {
          departmentId: newObjectId.toString()
        };

        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with different valid ObjectIds', () => {
        const objectIds = [
          new mongoose.Types.ObjectId().toString(),
          new mongoose.Types.ObjectId().toString(),
          new mongoose.Types.ObjectId().toString()
        ];

        objectIds.forEach(objectId => {
          mockRequest.body = { departmentId: objectId };
          mockNext = jest.fn();

          expect(() => {
            validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
          }).not.toThrow();
          expect(mockNext).toHaveBeenCalled();
        });
      });
    });

    describe('Invalid Cases - Missing/Empty', () => {
      it('should reject missing departmentId', () => {
        mockRequest.body = {};

        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.message).toContain('Validation failed');
          expect(error.errors[0].message).toContain('Department ID is required');
        }
      });

      it('should reject empty departmentId', () => {
        mockRequest.body = {
          departmentId: ''
        };

        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('Department ID cannot be empty');
        }
      });

      it('should reject null departmentId', () => {
        mockRequest.body = {
          departmentId: null
        };

        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject undefined departmentId', () => {
        mockRequest.body = {
          departmentId: undefined
        };

        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });

    describe('Invalid Cases - Format', () => {
      it('should reject invalid ObjectId format (too short)', () => {
        mockRequest.body = {
          departmentId: '123456'
        };

        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('valid MongoDB ObjectId');
        }
      });

      it('should reject invalid ObjectId format (too long)', () => {
        mockRequest.body = {
          departmentId: '507f1f77bcf86cd79943901100000'
        };

        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('valid MongoDB ObjectId');
        }
      });

      it('should reject non-hex characters', () => {
        mockRequest.body = {
          departmentId: '507f1f77bcf86cd79943901g'
        };

        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('valid MongoDB ObjectId');
        }
      });

      it('should reject UUID format', () => {
        mockRequest.body = {
          departmentId: '550e8400-e29b-41d4-a716-446655440000'
        };

        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject random string', () => {
        mockRequest.body = {
          departmentId: 'not-an-objectid'
        };

        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject numeric departmentId', () => {
        mockRequest.body = {
          departmentId: 123456
        };

        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject boolean departmentId', () => {
        mockRequest.body = {
          departmentId: true
        };

        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject object departmentId', () => {
        mockRequest.body = {
          departmentId: { id: '507f1f77bcf86cd799439011' }
        };

        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject array departmentId', () => {
        mockRequest.body = {
          departmentId: ['507f1f77bcf86cd799439011']
        };

        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });

    describe('Edge Cases', () => {
      it('should reject whitespace-only departmentId', () => {
        mockRequest.body = {
          departmentId: '   '
        };

        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject ObjectId with leading/trailing spaces', () => {
        mockRequest.body = {
          departmentId: '  507f1f77bcf86cd799439011  '
        };

        // Joi doesn't trim by default, but mongoose.Types.ObjectId.isValid will reject it
        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject malformed hex string', () => {
        mockRequest.body = {
          departmentId: 'ZZZZZZZZZZZZZZZZZZZZZZZZ'
        };

        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject special characters', () => {
        mockRequest.body = {
          departmentId: '507f1f77-bcf8-6cd7-9943-9011'
        };

        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });
  });

  describe('validateDepartmentIdParam()', () => {
    describe('Valid Cases', () => {
      it('should pass with valid ObjectId in params', () => {
        const validObjectId = new mongoose.Types.ObjectId().toString();
        mockRequest.params = {
          departmentId: validObjectId
        };

        expect(() => {
          validateDepartmentIdParam(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with 24-character hex string in params', () => {
        mockRequest.params = {
          departmentId: '507f1f77bcf86cd799439011'
        };

        expect(() => {
          validateDepartmentIdParam(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with multiple valid calls', () => {
        const objectIds = [
          new mongoose.Types.ObjectId().toString(),
          new mongoose.Types.ObjectId().toString()
        ];

        objectIds.forEach(objectId => {
          mockRequest.params = { departmentId: objectId };
          mockNext = jest.fn();

          expect(() => {
            validateDepartmentIdParam(mockRequest as Request, mockResponse as Response, mockNext);
          }).not.toThrow();
          expect(mockNext).toHaveBeenCalled();
        });
      });
    });

    describe('Invalid Cases - Missing/Empty', () => {
      it('should reject missing departmentId in params', () => {
        mockRequest.params = {};

        expect(() => {
          validateDepartmentIdParam(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateDepartmentIdParam(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.message).toContain('Validation failed');
          expect(error.errors[0].message).toContain('Department ID is required');
        }
      });

      it('should reject empty departmentId in params', () => {
        mockRequest.params = {
          departmentId: ''
        };

        expect(() => {
          validateDepartmentIdParam(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateDepartmentIdParam(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('Department ID cannot be empty');
        }
      });
    });

    describe('Invalid Cases - Format', () => {
      it('should reject invalid ObjectId format in params', () => {
        mockRequest.params = {
          departmentId: 'invalid-id'
        };

        expect(() => {
          validateDepartmentIdParam(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateDepartmentIdParam(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('valid MongoDB ObjectId');
        }
      });

      it('should reject short hex string in params', () => {
        mockRequest.params = {
          departmentId: '123abc'
        };

        expect(() => {
          validateDepartmentIdParam(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject UUID in params', () => {
        mockRequest.params = {
          departmentId: '550e8400-e29b-41d4-a716-446655440000'
        };

        expect(() => {
          validateDepartmentIdParam(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should work in POST /auth/switch-department route', () => {
      const validObjectId = new mongoose.Types.ObjectId().toString();
      mockRequest.body = {
        departmentId: validObjectId
      };

      validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should work in GET /roles/me/department/:departmentId route', () => {
      const validObjectId = new mongoose.Types.ObjectId().toString();
      mockRequest.params = {
        departmentId: validObjectId
      };

      validateDepartmentIdParam(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should stop middleware chain on validation error in body', () => {
      mockRequest.body = {
        departmentId: 'invalid'
      };

      expect(() => {
        validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(ApiError);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should stop middleware chain on validation error in params', () => {
      mockRequest.params = {
        departmentId: 'invalid'
      };

      expect(() => {
        validateDepartmentIdParam(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(ApiError);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Error Messages', () => {
    it('should provide clear error for missing departmentId', () => {
      mockRequest.body = {};

      try {
        validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
      } catch (error: any) {
        expect(error.message).toBe('Validation failed');
        expect(error.errors[0].field).toBe('departmentId');
        expect(error.errors[0].message).toContain('required');
      }
    });

    it('should provide clear error for invalid format', () => {
      mockRequest.body = {
        departmentId: 'invalid-format'
      };

      try {
        validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
      } catch (error: any) {
        expect(error.errors[0].message).toContain('MongoDB ObjectId');
      }
    });

    it('should return ApiError with proper structure', () => {
      mockRequest.body = {
        departmentId: 'invalid'
      };

      try {
        validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
      } catch (error: any) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.message).toBeDefined();
        expect(error.errors).toBeInstanceOf(Array);
        expect(error.errors[0].field).toBeDefined();
        expect(error.errors[0].message).toBeDefined();
      }
    });
  });

  describe('Custom ObjectId Validator', () => {
    it('should use mongoose.Types.ObjectId.isValid for validation', () => {
      const validCases = [
        '507f1f77bcf86cd799439011',
        new mongoose.Types.ObjectId().toString(),
        '000000000000000000000001'
      ];

      validCases.forEach(validId => {
        expect(mongoose.Types.ObjectId.isValid(validId)).toBe(true);
        mockRequest.body = { departmentId: validId };
        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
      });
    });

    it('should reject cases where mongoose.Types.ObjectId.isValid returns false', () => {
      const invalidCases = [
        'invalid',
        '123',
        'not-an-id',
        '507f1f77bcf86cd79943901g', // invalid character
        ''
      ];

      invalidCases.forEach(invalidId => {
        mockRequest.body = { departmentId: invalidId };
        expect(() => {
          validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });
  });

  describe('Performance', () => {
    it('should validate quickly for valid ObjectIds', () => {
      const validObjectId = new mongoose.Types.ObjectId().toString();
      mockRequest.body = { departmentId: validObjectId };

      const startTime = Date.now();
      validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10);
    });

    it('should handle many validation calls efficiently', () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        const validObjectId = new mongoose.Types.ObjectId().toString();
        mockRequest.body = { departmentId: validObjectId };
        mockNext = jest.fn();
        validateSwitchDepartment(mockRequest as Request, mockResponse as Response, mockNext);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
