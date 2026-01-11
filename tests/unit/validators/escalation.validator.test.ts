/**
 * Escalation Validator Tests
 *
 * Comprehensive test suite for escalation validators covering:
 * - Escalation password validation (for escalate endpoint)
 * - Set escalation password validation (for setting/updating password)
 * - Password strength requirements
 * - Error message clarity
 */

import { Request, Response, NextFunction } from 'express';
import { validateEscalate, validateSetEscalationPassword } from '@/validators/escalation.validator';
import { ApiError } from '@/utils/ApiError';

describe('Escalation Validator', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {}
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('validateEscalate()', () => {
    describe('Valid Cases', () => {
      it('should pass with valid 8-character password', () => {
        mockRequest.body = {
          escalationPassword: 'password123'
        };

        expect(() => {
          validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with strong password', () => {
        mockRequest.body = {
          escalationPassword: 'StrongP@ss123'
        };

        expect(() => {
          validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with exactly 8 characters', () => {
        mockRequest.body = {
          escalationPassword: '12345678'
        };

        expect(() => {
          validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with long password', () => {
        mockRequest.body = {
          escalationPassword: 'ThisIsAVeryLongPasswordThatShouldStillBeValid123'
        };

        expect(() => {
          validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with special characters', () => {
        mockRequest.body = {
          escalationPassword: 'P@ssw0rd!#$'
        };

        expect(() => {
          validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('Invalid Cases', () => {
      it('should reject missing escalationPassword', () => {
        mockRequest.body = {};

        expect(() => {
          validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.message).toContain('Validation failed');
          expect(error.errors).toBeDefined();
          expect(error.errors[0].message).toContain('Escalation password is required');
        }
      });

      it('should reject empty escalationPassword', () => {
        mockRequest.body = {
          escalationPassword: ''
        };

        expect(() => {
          validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('Escalation password cannot be empty');
        }
      });

      it('should reject password shorter than 8 characters', () => {
        mockRequest.body = {
          escalationPassword: 'short'
        };

        expect(() => {
          validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('Escalation password must be at least 8 characters');
        }
      });

      it('should reject 7-character password', () => {
        mockRequest.body = {
          escalationPassword: '1234567'
        };

        expect(() => {
          validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject null escalationPassword', () => {
        mockRequest.body = {
          escalationPassword: null
        };

        expect(() => {
          validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject undefined escalationPassword', () => {
        mockRequest.body = {
          escalationPassword: undefined
        };

        expect(() => {
          validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject non-string escalationPassword', () => {
        mockRequest.body = {
          escalationPassword: 12345678
        };

        expect(() => {
          validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });

    describe('Edge Cases', () => {
      it('should handle whitespace-only password', () => {
        mockRequest.body = {
          escalationPassword: '        '
        };

        // Should pass length check but fail in actual authentication
        expect(() => {
          validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
      });

      it('should handle password with leading/trailing spaces', () => {
        mockRequest.body = {
          escalationPassword: '  password123  '
        };

        // Joi doesn't trim by default, so this should pass
        expect(() => {
          validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
      });

      it('should handle unicode characters', () => {
        mockRequest.body = {
          escalationPassword: 'パスワード123'
        };

        expect(() => {
          validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
      });

      it('should handle emoji in password', () => {
        mockRequest.body = {
          escalationPassword: 'pass🔒word'
        };

        expect(() => {
          validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
      });
    });
  });

  describe('validateSetEscalationPassword()', () => {
    describe('Valid Cases', () => {
      it('should pass with strong password meeting all requirements', () => {
        mockRequest.body = {
          currentPassword: 'OldP@ss1',
          newEscalationPassword: 'NewP@ss1'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with complex password', () => {
        mockRequest.body = {
          currentPassword: 'Current123!',
          newEscalationPassword: 'C0mpl3x!P@ss'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with all special characters from allowed set', () => {
        mockRequest.body = {
          currentPassword: 'OldP@ss1',
          newEscalationPassword: 'P@ss$!%*?&1A'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with exactly 8 characters meeting requirements', () => {
        mockRequest.body = {
          currentPassword: 'OldP@ss1',
          newEscalationPassword: 'NewP@ss1'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
      });
    });

    describe('Invalid Cases - Missing Fields', () => {
      it('should reject missing currentPassword', () => {
        mockRequest.body = {
          newEscalationPassword: 'NewP@ss1'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('Current password is required');
        }
      });

      it('should reject missing newEscalationPassword', () => {
        mockRequest.body = {
          currentPassword: 'OldP@ss1'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('New escalation password is required');
        }
      });

      it('should reject empty currentPassword', () => {
        mockRequest.body = {
          currentPassword: '',
          newEscalationPassword: 'NewP@ss1'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('Current password cannot be empty');
        }
      });

      it('should reject empty newEscalationPassword', () => {
        mockRequest.body = {
          currentPassword: 'OldP@ss1',
          newEscalationPassword: ''
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('New escalation password cannot be empty');
        }
      });
    });

    describe('Invalid Cases - Password Strength', () => {
      it('should reject password without uppercase letter', () => {
        mockRequest.body = {
          currentPassword: 'OldP@ss1',
          newEscalationPassword: 'newp@ss1'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('uppercase letter');
        }
      });

      it('should reject password without lowercase letter', () => {
        mockRequest.body = {
          currentPassword: 'OldP@ss1',
          newEscalationPassword: 'NEWP@SS1'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('lowercase letter');
        }
      });

      it('should reject password without number', () => {
        mockRequest.body = {
          currentPassword: 'OldP@ss1',
          newEscalationPassword: 'NewP@ssword'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('number');
        }
      });

      it('should reject password without special character', () => {
        mockRequest.body = {
          currentPassword: 'OldP@ss1',
          newEscalationPassword: 'NewPass1'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('special character');
        }
      });

      it('should reject password shorter than 8 characters', () => {
        mockRequest.body = {
          currentPassword: 'OldP@ss1',
          newEscalationPassword: 'NewP@1'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('at least 8 characters');
        }
      });

      it('should reject password with only 3 of 4 requirements', () => {
        mockRequest.body = {
          currentPassword: 'OldP@ss1',
          newEscalationPassword: 'password1@' // no uppercase
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });

    describe('Edge Cases', () => {
      it('should handle multiple validation errors', () => {
        mockRequest.body = {
          currentPassword: '',
          newEscalationPassword: 'weak'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors.length).toBeGreaterThan(0);
        }
      });

      it('should reject password with invalid special characters', () => {
        mockRequest.body = {
          currentPassword: 'OldP@ss1',
          newEscalationPassword: 'NewP#ss1' // # not in allowed set
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should handle null values', () => {
        mockRequest.body = {
          currentPassword: null,
          newEscalationPassword: null
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should handle undefined values', () => {
        mockRequest.body = {
          currentPassword: undefined,
          newEscalationPassword: undefined
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should handle non-string values', () => {
        mockRequest.body = {
          currentPassword: 12345678,
          newEscalationPassword: 87654321
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });

    describe('Error Messages', () => {
      it('should provide clear error message for weak password', () => {
        mockRequest.body = {
          currentPassword: 'OldP@ss1',
          newEscalationPassword: 'weak'
        };

        try {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.message).toBe('Validation failed');
          expect(error.errors).toBeDefined();
          expect(error.errors.length).toBeGreaterThan(0);
        }
      });

      it('should include all requirements in error message', () => {
        mockRequest.body = {
          currentPassword: 'OldP@ss1',
          newEscalationPassword: 'weakpassword'
        };

        try {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          const errorMessage = error.errors[0].message;
          expect(errorMessage).toContain('uppercase');
          expect(errorMessage).toContain('lowercase');
          expect(errorMessage).toContain('number');
          expect(errorMessage).toContain('special character');
        }
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with express middleware chain', () => {
      const middlewares = [validateEscalate];
      mockRequest.body = {
        escalationPassword: 'ValidP@ss1'
      };

      middlewares.forEach(middleware => {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      });

      expect(mockNext).toHaveBeenCalled();
    });

    it('should stop middleware chain on validation error', () => {
      mockRequest.body = {
        escalationPassword: 'short'
      };

      expect(() => {
        validateEscalate(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(ApiError);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle abortEarly: false for multiple errors', () => {
      mockRequest.body = {
        currentPassword: '',
        newEscalationPassword: ''
      };

      try {
        validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
      } catch (error: any) {
        expect(error.errors.length).toBeGreaterThanOrEqual(2);
      }
    });
  });
});
