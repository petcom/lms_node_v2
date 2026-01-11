/**
 * Auth Validator Tests
 *
 * Comprehensive test suite for auth validators covering:
 * - Set escalation password validation
 * - Login validation
 * - Registration validation
 * - Password change validation
 * - Password strength requirements
 */

import { Request, Response, NextFunction } from 'express';
import {
  validateSetEscalationPassword,
  validateLogin,
  validatePasswordChange,
  validateRegisterStaff,
  validateRegisterLearner
} from '@/validators/auth.validator';
import { ApiError } from '@/utils/ApiError';

describe('Auth Validator', () => {
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

  describe('validateSetEscalationPassword()', () => {
    describe('Valid Cases', () => {
      it('should pass with matching strong passwords', () => {
        mockRequest.body = {
          escalationPassword: 'StrongP@ss1',
          confirmEscalationPassword: 'StrongP@ss1'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with complex password meeting all requirements', () => {
        mockRequest.body = {
          escalationPassword: 'C0mpl3x!P@ss',
          confirmEscalationPassword: 'C0mpl3x!P@ss'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with all allowed special characters', () => {
        mockRequest.body = {
          escalationPassword: 'P@ss$!%*?&1A',
          confirmEscalationPassword: 'P@ss$!%*?&1A'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with exactly 8 characters meeting requirements', () => {
        mockRequest.body = {
          escalationPassword: 'NewP@ss1',
          confirmEscalationPassword: 'NewP@ss1'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
      });

      it('should pass with long password', () => {
        mockRequest.body = {
          escalationPassword: 'ThisIsAVeryL0ng!P@sswordThatMeetsAllRequirements',
          confirmEscalationPassword: 'ThisIsAVeryL0ng!P@sswordThatMeetsAllRequirements'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
      });
    });

    describe('Invalid Cases - Missing Fields', () => {
      it('should reject missing escalationPassword', () => {
        mockRequest.body = {
          confirmEscalationPassword: 'StrongP@ss1'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('Escalation password is required');
        }
      });

      it('should reject missing confirmEscalationPassword', () => {
        mockRequest.body = {
          escalationPassword: 'StrongP@ss1'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('Password confirmation is required');
        }
      });

      it('should reject both fields missing', () => {
        mockRequest.body = {};

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });

    describe('Invalid Cases - Password Mismatch', () => {
      it('should reject non-matching passwords', () => {
        mockRequest.body = {
          escalationPassword: 'StrongP@ss1',
          confirmEscalationPassword: 'StrongP@ss2'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);

        try {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        } catch (error: any) {
          expect(error.errors[0].message).toContain('Passwords must match');
        }
      });

      it('should reject case-sensitive mismatch', () => {
        mockRequest.body = {
          escalationPassword: 'StrongP@ss1',
          confirmEscalationPassword: 'strongp@ss1'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject subtle differences', () => {
        mockRequest.body = {
          escalationPassword: 'StrongP@ss1',
          confirmEscalationPassword: 'StrongP@ss1 '
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });

    describe('Invalid Cases - Password Strength', () => {
      it('should reject password without uppercase letter', () => {
        mockRequest.body = {
          escalationPassword: 'strongp@ss1',
          confirmEscalationPassword: 'strongp@ss1'
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
          escalationPassword: 'STRONGP@SS1',
          confirmEscalationPassword: 'STRONGP@SS1'
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
          escalationPassword: 'StrongP@ssword',
          confirmEscalationPassword: 'StrongP@ssword'
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
          escalationPassword: 'StrongPass1',
          confirmEscalationPassword: 'StrongPass1'
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
          escalationPassword: 'Str@ng1',
          confirmEscalationPassword: 'Str@ng1'
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

      it('should reject password with invalid special character', () => {
        mockRequest.body = {
          escalationPassword: 'StrongP#ss1',
          confirmEscalationPassword: 'StrongP#ss1'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject weak password with only 3 requirements', () => {
        mockRequest.body = {
          escalationPassword: 'password1@',
          confirmEscalationPassword: 'password1@'
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });

    describe('Edge Cases', () => {
      it('should handle null values', () => {
        mockRequest.body = {
          escalationPassword: null,
          confirmEscalationPassword: null
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should handle undefined values', () => {
        mockRequest.body = {
          escalationPassword: undefined,
          confirmEscalationPassword: undefined
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should handle non-string values', () => {
        mockRequest.body = {
          escalationPassword: 12345678,
          confirmEscalationPassword: 12345678
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should handle empty strings', () => {
        mockRequest.body = {
          escalationPassword: '',
          confirmEscalationPassword: ''
        };

        expect(() => {
          validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });
  });

  describe('validateLogin()', () => {
    describe('Valid Cases', () => {
      it('should pass with valid email and password', () => {
        mockRequest.body = {
          email: 'user@example.com',
          password: 'password123'
        };

        expect(() => {
          validateLogin(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with different valid email formats', () => {
        const validEmails = [
          'user@example.com',
          'user.name@example.com',
          'user+tag@example.co.uk',
          'user_name@subdomain.example.com'
        ];

        validEmails.forEach(email => {
          mockRequest.body = { email, password: 'password123' };
          mockNext = jest.fn();

          expect(() => {
            validateLogin(mockRequest as Request, mockResponse as Response, mockNext);
          }).not.toThrow();
        });
      });
    });

    describe('Invalid Cases', () => {
      it('should reject missing email', () => {
        mockRequest.body = {
          password: 'password123'
        };

        expect(() => {
          validateLogin(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject missing password', () => {
        mockRequest.body = {
          email: 'user@example.com'
        };

        expect(() => {
          validateLogin(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject invalid email format', () => {
        mockRequest.body = {
          email: 'invalid-email',
          password: 'password123'
        };

        expect(() => {
          validateLogin(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });
  });

  describe('validatePasswordChange()', () => {
    describe('Valid Cases', () => {
      it('should pass with valid current and new password', () => {
        mockRequest.body = {
          currentPassword: 'OldP@ssw0rd',
          newPassword: 'NewP@ssw0rd'
        };

        expect(() => {
          validatePasswordChange(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with strong new password', () => {
        mockRequest.body = {
          currentPassword: 'OldP@ssw0rd',
          newPassword: 'V3ry!Str0ng@Password'
        };

        expect(() => {
          validatePasswordChange(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
      });
    });

    describe('Invalid Cases', () => {
      it('should reject missing currentPassword', () => {
        mockRequest.body = {
          newPassword: 'NewP@ssw0rd'
        };

        expect(() => {
          validatePasswordChange(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject missing newPassword', () => {
        mockRequest.body = {
          currentPassword: 'OldP@ssw0rd'
        };

        expect(() => {
          validatePasswordChange(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject weak new password', () => {
        mockRequest.body = {
          currentPassword: 'OldP@ssw0rd',
          newPassword: 'weak'
        };

        expect(() => {
          validatePasswordChange(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject new password without uppercase', () => {
        mockRequest.body = {
          currentPassword: 'OldP@ssw0rd',
          newPassword: 'newp@ssw0rd'
        };

        expect(() => {
          validatePasswordChange(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });
  });

  describe('validateRegisterStaff()', () => {
    describe('Valid Cases', () => {
      it('should pass with all required fields', () => {
        mockRequest.body = {
          email: 'staff@example.com',
          password: 'StrongP@ss1',
          firstName: 'John',
          lastName: 'Doe',
          roles: ['instructor']
        };

        expect(() => {
          validateRegisterStaff(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with multiple roles', () => {
        mockRequest.body = {
          email: 'admin@example.com',
          password: 'StrongP@ss1',
          firstName: 'Jane',
          lastName: 'Smith',
          roles: ['instructor', 'content-admin']
        };

        expect(() => {
          validateRegisterStaff(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
      });

      it('should pass with optional fields', () => {
        mockRequest.body = {
          email: 'staff@example.com',
          password: 'StrongP@ss1',
          firstName: 'John',
          lastName: 'Doe',
          roles: ['instructor'],
          phoneNumber: '555-1234',
          title: 'Senior Instructor'
        };

        expect(() => {
          validateRegisterStaff(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
      });
    });

    describe('Invalid Cases', () => {
      it('should reject missing email', () => {
        mockRequest.body = {
          password: 'StrongP@ss1',
          firstName: 'John',
          lastName: 'Doe',
          roles: ['instructor']
        };

        expect(() => {
          validateRegisterStaff(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject invalid role', () => {
        mockRequest.body = {
          email: 'staff@example.com',
          password: 'StrongP@ss1',
          firstName: 'John',
          lastName: 'Doe',
          roles: ['invalid-role']
        };

        expect(() => {
          validateRegisterStaff(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject empty roles array', () => {
        mockRequest.body = {
          email: 'staff@example.com',
          password: 'StrongP@ss1',
          firstName: 'John',
          lastName: 'Doe',
          roles: []
        };

        expect(() => {
          validateRegisterStaff(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });
  });

  describe('validateRegisterLearner()', () => {
    describe('Valid Cases', () => {
      it('should pass with required fields', () => {
        mockRequest.body = {
          email: 'learner@example.com',
          password: 'StrongP@ss1',
          firstName: 'Alice',
          lastName: 'Johnson'
        };

        expect(() => {
          validateRegisterLearner(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with optional fields', () => {
        mockRequest.body = {
          email: 'learner@example.com',
          password: 'StrongP@ss1',
          firstName: 'Alice',
          lastName: 'Johnson',
          dateOfBirth: new Date('1990-01-01'),
          phoneNumber: '555-1234'
        };

        expect(() => {
          validateRegisterLearner(mockRequest as Request, mockResponse as Response, mockNext);
        }).not.toThrow();
      });
    });

    describe('Invalid Cases', () => {
      it('should reject missing firstName', () => {
        mockRequest.body = {
          email: 'learner@example.com',
          password: 'StrongP@ss1',
          lastName: 'Johnson'
        };

        expect(() => {
          validateRegisterLearner(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });

      it('should reject weak password', () => {
        mockRequest.body = {
          email: 'learner@example.com',
          password: 'weak',
          firstName: 'Alice',
          lastName: 'Johnson'
        };

        expect(() => {
          validateRegisterLearner(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(ApiError);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should work in middleware chain', () => {
      mockRequest.body = {
        escalationPassword: 'StrongP@ss1',
        confirmEscalationPassword: 'StrongP@ss1'
      };

      validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should stop chain on validation error', () => {
      mockRequest.body = {
        escalationPassword: 'weak',
        confirmEscalationPassword: 'weak'
      };

      expect(() => {
        validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(ApiError);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle multiple validation errors', () => {
      mockRequest.body = {
        escalationPassword: '',
        confirmEscalationPassword: ''
      };

      try {
        validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
      } catch (error: any) {
        expect(error.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Messages', () => {
    it('should provide clear error for password mismatch', () => {
      mockRequest.body = {
        escalationPassword: 'StrongP@ss1',
        confirmEscalationPassword: 'Different@1'
      };

      try {
        validateSetEscalationPassword(mockRequest as Request, mockResponse as Response, mockNext);
      } catch (error: any) {
        expect(error.message).toBe('Validation failed');
        expect(error.errors[0].message).toContain('Passwords must match');
      }
    });

    it('should provide clear error for weak password', () => {
      mockRequest.body = {
        escalationPassword: 'weakpassword',
        confirmEscalationPassword: 'weakpassword'
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
