import bcrypt from 'bcryptjs';
import { hashPassword, comparePassword } from '@/utils/password';

// Mock bcryptjs
jest.mock('bcryptjs');

describe('Password Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash a password with default rounds (10)', async () => {
      const password = 'mySecurePassword123';
      const hashedPassword = '$2a$10$hashedpassword';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await hashPassword(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedPassword);
    });

    it('should hash a password with custom salt rounds', async () => {
      const password = 'mySecurePassword123';
      const hashedPassword = '$2a$12$hashedpassword';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await hashPassword(password, 12);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });

    it('should handle empty password', async () => {
      const hashedPassword = '$2a$10$hashedempty';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await hashPassword('');

      expect(bcrypt.hash).toHaveBeenCalledWith('', 10);
      expect(result).toBe(hashedPassword);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const plainPassword = 'myPassword123';
      const hashedPassword = '$2a$10$hashedpassword';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await comparePassword(plainPassword, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const plainPassword = 'wrongPassword';
      const hashedPassword = '$2a$10$hashedpassword';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await comparePassword(plainPassword, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(false);
    });

    it('should handle empty passwords', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await comparePassword('', '$2a$10$hash');

      expect(result).toBe(false);
    });
  });
});
