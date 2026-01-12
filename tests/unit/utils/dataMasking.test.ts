/**
 * Data Masking Utility Tests
 *
 * Tests FERPA-compliant data masking functionality
 */

import { maskLastName, maskUserList, shouldMaskData, maskEmail, maskPhone, maskUserPII } from '@/utils/dataMasking';

describe('Data Masking Utility', () => {
  describe('maskLastName()', () => {
    const testUser = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      id: '123'
    };

    it('should NOT mask for enrollment-admin', () => {
      const viewer = { roles: ['enrollment-admin'] };
      const result = maskLastName(testUser, viewer);

      expect(result.lastName).toBe('Doe');
      expect(result.firstName).toBe('John');
    });

    it('should NOT mask for system-admin', () => {
      const viewer = { roles: ['system-admin'] };
      const result = maskLastName(testUser, viewer);

      expect(result.lastName).toBe('Doe');
      expect(result.firstName).toBe('John');
    });

    it('should mask for instructor', () => {
      const viewer = { roles: ['instructor'] };
      const result = maskLastName(testUser, viewer);

      expect(result.lastName).toBe('D.');
      expect(result.fullName).toBe('John D.');
      expect(result.firstName).toBe('John');
    });

    it('should mask for department-admin', () => {
      const viewer = { roles: ['department-admin'] };
      const result = maskLastName(testUser, viewer);

      expect(result.lastName).toBe('D.');
      expect(result.fullName).toBe('John D.');
      expect(result.firstName).toBe('John');
    });

    it('should handle viewer with role as string (not array)', () => {
      const viewer = { role: 'instructor' };
      const result = maskLastName(testUser, viewer);

      expect(result.lastName).toBe('D.');
      expect(result.fullName).toBe('John D.');
    });

    it('should handle user without lastName', () => {
      const userWithoutLastName = { firstName: 'John' };
      const viewer = { roles: ['instructor'] };
      const result = maskLastName(userWithoutLastName, viewer);

      expect(result).toEqual(userWithoutLastName);
    });

    it('should handle case-insensitive role matching', () => {
      const viewer = { roles: ['INSTRUCTOR'] };
      const result = maskLastName(testUser, viewer);

      expect(result.lastName).toBe('D.');
    });

    it('should return unmasked for unknown roles', () => {
      const viewer = { roles: ['unknown-role'] };
      const result = maskLastName(testUser, viewer);

      expect(result.lastName).toBe('Doe');
    });
  });

  describe('maskUserList()', () => {
    const testUsers = [
      { firstName: 'John', lastName: 'Doe', id: '1' },
      { firstName: 'Jane', lastName: 'Smith', id: '2' },
      { firstName: 'Bob', lastName: 'Johnson', id: '3' }
    ];

    it('should mask all users in list for instructor', () => {
      const viewer = { roles: ['instructor'] };
      const result = maskUserList(testUsers, viewer);

      expect(result).toHaveLength(3);
      expect(result[0].lastName).toBe('D.');
      expect(result[1].lastName).toBe('S.');
      expect(result[2].lastName).toBe('J.');
    });

    it('should NOT mask any users for enrollment-admin', () => {
      const viewer = { roles: ['enrollment-admin'] };
      const result = maskUserList(testUsers, viewer);

      expect(result).toHaveLength(3);
      expect(result[0].lastName).toBe('Doe');
      expect(result[1].lastName).toBe('Smith');
      expect(result[2].lastName).toBe('Johnson');
    });

    it('should handle empty array', () => {
      const viewer = { roles: ['instructor'] };
      const result = maskUserList([], viewer);

      expect(result).toEqual([]);
    });

    it('should handle non-array input gracefully', () => {
      const viewer = { roles: ['instructor'] };
      const result = maskUserList(null as any, viewer);

      expect(result).toBeNull();
    });
  });

  describe('shouldMaskData()', () => {
    it('should return true for instructor', () => {
      const viewer = { roles: ['instructor'] };
      expect(shouldMaskData(viewer)).toBe(true);
    });

    it('should return true for department-admin', () => {
      const viewer = { roles: ['department-admin'] };
      expect(shouldMaskData(viewer)).toBe(true);
    });

    it('should return false for enrollment-admin', () => {
      const viewer = { roles: ['enrollment-admin'] };
      expect(shouldMaskData(viewer)).toBe(false);
    });

    it('should return false for system-admin', () => {
      const viewer = { roles: ['system-admin'] };
      expect(shouldMaskData(viewer)).toBe(false);
    });

    it('should handle viewer with no roles', () => {
      const viewer = { roles: [] };
      expect(shouldMaskData(viewer)).toBe(false);
    });
  });

  describe('maskEmail()', () => {
    it('should mask email local part', () => {
      const result = maskEmail('john.doe@example.com');
      expect(result).toBe('j***@example.com');
    });

    it('should handle single character email', () => {
      const result = maskEmail('a@example.com');
      expect(result).toBe('a***@example.com');
    });

    it('should handle invalid email gracefully', () => {
      const result = maskEmail('not-an-email');
      expect(result).toBe('not-an-email');
    });

    it('should handle empty email', () => {
      const result = maskEmail('');
      expect(result).toBe('');
    });
  });

  describe('maskPhone()', () => {
    it('should mask phone number keeping last 4 digits', () => {
      const result = maskPhone('(555) 123-4567');
      expect(result).toBe('(XXX) XXX-4567');
    });

    it('should mask 10-digit phone', () => {
      const result = maskPhone('5551234567');
      expect(result).toBe('(XXX) XXX-4567');
    });

    it('should handle short phone numbers', () => {
      const result = maskPhone('123');
      expect(result).toBe('XXX-XXXX');
    });

    it('should handle empty phone', () => {
      const result = maskPhone('');
      expect(result).toBe('');
    });
  });

  describe('maskUserPII()', () => {
    const testUser = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '(555) 123-4567'
    };

    it('should mask lastName, email, and phone for instructor', () => {
      const viewer = { roles: ['instructor'] };
      const result = maskUserPII(testUser, viewer, {
        maskEmail: true,
        maskPhone: true
      });

      expect(result.lastName).toBe('D.');
      expect(result.email).toBe('j***@example.com');
      expect(result.phone).toBe('(XXX) XXX-4567');
    });

    it('should only mask lastName when no options provided', () => {
      const viewer = { roles: ['instructor'] };
      const result = maskUserPII(testUser, viewer);

      expect(result.lastName).toBe('D.');
      expect(result.email).toBe('john.doe@example.com');
      expect(result.phone).toBe('(555) 123-4567');
    });

    it('should NOT mask anything for enrollment-admin', () => {
      const viewer = { roles: ['enrollment-admin'] };
      const result = maskUserPII(testUser, viewer, {
        maskEmail: true,
        maskPhone: true
      });

      expect(result.lastName).toBe('Doe');
      expect(result.email).toBe('john.doe@example.com');
      expect(result.phone).toBe('(555) 123-4567');
    });
  });
});
