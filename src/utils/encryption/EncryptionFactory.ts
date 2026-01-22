/**
 * Encryption Factory - Field-level encryption for sensitive PII
 *
 * Implements AES-256-GCM authenticated encryption for sensitive data like:
 * - Passport numbers
 * - Driver's license numbers
 * - Social Security Numbers
 * - Alien registration numbers (A-numbers)
 *
 * Features:
 * - AES-256-GCM with authenticated encryption (prevents tampering)
 * - Key versioning for rotation without data loss
 * - Factory pattern for reusable encryption across multiple fields
 * - Mongoose schema integration helpers
 *
 * Security:
 * - Keys stored in environment variables or secrets manager
 * - Never commit keys to version control
 * - Support for key rotation with backward compatibility
 *
 * Format: version:iv:authTag:ciphertext
 * Example: 01:a1b2c3...:d4e5f6...:g7h8i9...
 *
 * @module utils/encryption/EncryptionFactory
 */

import crypto from 'crypto';

// =============================================================================
// CONSTANTS
// =============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
// Auth tag length is 16 bytes (128 bits) - documented here for reference
const KEY_LENGTH = 32; // 256 bits
const DEFAULT_KEY_VERSION = '01';

// =============================================================================
// TYPES
// =============================================================================

export interface EncryptionOptions {
  keyVersion?: string;
}

export interface EncryptedData {
  version: string;
  iv: string;
  authTag: string;
  ciphertext: string;
}

// =============================================================================
// KEY MANAGEMENT
// =============================================================================

/**
 * Retrieves encryption key from environment
 *
 * Keys are stored as hex strings in environment variables:
 * - ENCRYPTION_KEY: Default/current key (version 01)
 * - ENCRYPTION_KEY_V02: Version 02 key (after rotation)
 * - ENCRYPTION_KEY_V03: Version 03 key, etc.
 *
 * @param version - Key version (e.g., '01', '02')
 * @returns Buffer containing the 256-bit encryption key
 * @throws Error if key not found in environment
 */
function getEncryptionKey(version: string = DEFAULT_KEY_VERSION): Buffer {
  const keyEnvVar = version === DEFAULT_KEY_VERSION
    ? 'ENCRYPTION_KEY'
    : `ENCRYPTION_KEY_V${version}`;

  const keyHex = process.env[keyEnvVar];

  if (!keyHex) {
    throw new Error(
      `Encryption key not found: ${keyEnvVar}. ` +
      `Please set the encryption key in your environment. ` +
      `Generate a key with: openssl rand -hex 32`
    );
  }

  // Validate key length
  const keyBuffer = Buffer.from(keyHex, 'hex');
  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(
      `Invalid encryption key length for ${keyEnvVar}: ` +
      `Expected ${KEY_LENGTH} bytes (64 hex characters), got ${keyBuffer.length} bytes`
    );
  }

  return keyBuffer;
}

/**
 * Generates a new encryption key
 *
 * Use this for generating keys during setup or rotation.
 * NEVER store the output in source code or version control.
 *
 * @returns Hex string of 256-bit random key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

// =============================================================================
// CORE ENCRYPTION FUNCTIONS
// =============================================================================

/**
 * Encrypts plaintext using AES-256-GCM
 *
 * Format: version:iv:authTag:ciphertext
 * - version: 2-digit key version (01, 02, etc.)
 * - iv: 32 hex chars (16 bytes)
 * - authTag: 32 hex chars (16 bytes) - prevents tampering
 * - ciphertext: variable length hex string
 *
 * @param plaintext - Data to encrypt
 * @param options - Encryption options (key version)
 * @returns Encrypted string with version prefix
 * @throws Error if encryption key not found
 *
 * @example
 * ```typescript
 * const encrypted = encrypt('123-45-6789');
 * // Returns: "01:a1b2c3d4...:e5f6g7h8...:i9j0k1l2..."
 * ```
 */
export function encrypt(plaintext: string, options: EncryptionOptions = {}): string {
  const keyVersion = options.keyVersion || DEFAULT_KEY_VERSION;
  const key = getEncryptionKey(keyVersion);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: version:iv:authTag:ciphertext
  return `${keyVersion}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts ciphertext using AES-256-GCM
 *
 * Automatically detects key version from prefix and uses appropriate key.
 * Supports backward compatibility with older key versions.
 *
 * @param encryptedData - Encrypted string from encrypt()
 * @returns Decrypted plaintext
 * @throws Error if decryption fails or key not found
 *
 * @example
 * ```typescript
 * const decrypted = decrypt('01:a1b2...:e5f6...:i9j0...');
 * // Returns: "123-45-6789"
 * ```
 */
export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');

  if (parts.length !== 4) {
    throw new Error(
      `Invalid encrypted data format. Expected "version:iv:authTag:ciphertext", got ${parts.length} parts`
    );
  }

  const [version, ivHex, authTagHex, ciphertext] = parts;

  // Validate version format
  if (!/^\d{2}$/.test(version)) {
    throw new Error(`Invalid key version format: ${version}. Expected 2-digit number (e.g., "01")`);
  }

  const key = getEncryptionKey(version);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Checks if a value is encrypted
 *
 * Validates format: version:iv:authTag:ciphertext
 * - version: 2 digits
 * - iv: 32 hex chars
 * - authTag: 32 hex chars
 * - ciphertext: any length hex string
 *
 * @param value - Value to check
 * @returns True if value appears to be encrypted
 *
 * @example
 * ```typescript
 * isEncrypted('01:a1b2c3...:d4e5f6...:g7h8i9...') // true
 * isEncrypted('123-45-6789') // false
 * ```
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  // Format: version:iv:authTag:ciphertext
  // version = 2 digits
  // iv = 32 hex chars (16 bytes)
  // authTag = 32 hex chars (16 bytes)
  // ciphertext = any length hex string (can be empty for empty plaintext)
  return /^\d{2}:[a-f0-9]{32}:[a-f0-9]{32}:[a-f0-9]*$/i.test(value);
}

/**
 * Parses encrypted data string into components
 *
 * Useful for debugging or key rotation operations
 *
 * @param encryptedData - Encrypted string
 * @returns Parsed components
 */
export function parseEncryptedData(encryptedData: string): EncryptedData {
  const parts = encryptedData.split(':');

  if (parts.length !== 4) {
    throw new Error(`Invalid encrypted data format. Expected 4 parts, got ${parts.length}`);
  }

  const [version, iv, authTag, ciphertext] = parts;

  return { version, iv, authTag, ciphertext };
}

// =============================================================================
// MONGOOSE INTEGRATION HELPERS
// =============================================================================

/**
 * Creates a pre-save hook function that encrypts a field if modified
 *
 * Use this in Mongoose schemas to automatically encrypt fields on save.
 *
 * @param fieldName - Name of field to encrypt
 * @returns Pre-save hook function
 *
 * @example
 * ```typescript
 * IdentificationSchema.pre('save', encryptFieldIfModified('idNumber'));
 * ```
 */
export function encryptFieldIfModified(fieldName: string) {
  return function(this: any, next: Function) {
    if (this.isModified(fieldName)) {
      const value = this[fieldName];
      if (value && !isEncrypted(value)) {
        this[fieldName] = encrypt(value);
      }
    }
    next();
  };
}

/**
 * Creates a method that returns decrypted field value
 *
 * Use this to add decryption methods to Mongoose schemas.
 *
 * @param fieldName - Name of field to decrypt
 * @param methodName - Name of method to create (default: getDecrypted{FieldName})
 * @returns Method function
 *
 * @example
 * ```typescript
 * IdentificationSchema.methods.getDecryptedIdNumber = createDecryptMethod('idNumber');
 * ```
 */
export function createDecryptMethod(fieldName: string, _methodName?: string) {
  return function(this: any): string {
    const value = this[fieldName];
    if (!value) {
      return value;
    }
    if (isEncrypted(value)) {
      return decrypt(value);
    }
    return value;
  };
}

/**
 * Creates a virtual getter that automatically decrypts a field
 *
 * Use this for transparent decryption access (schema.virtual('fieldDecrypted'))
 *
 * @param fieldName - Name of field to decrypt
 * @returns Virtual getter function
 *
 * @example
 * ```typescript
 * IdentificationSchema.virtual('idNumberDecrypted').get(createDecryptedGetter('idNumber'));
 * ```
 */
export function createDecryptedGetter(fieldName: string) {
  return function(this: any): string {
    const value = this[fieldName];
    if (!value) {
      return value;
    }
    if (isEncrypted(value)) {
      return decrypt(value);
    }
    return value;
  };
}

// =============================================================================
// KEY ROTATION UTILITIES
// =============================================================================

/**
 * Re-encrypts data with a new key version
 *
 * Use this during key rotation to upgrade encrypted data to new key.
 *
 * @param encryptedData - Data encrypted with old key
 * @param newKeyVersion - New key version to use
 * @returns Data re-encrypted with new key
 *
 * @example
 * ```typescript
 * const oldEncrypted = '01:a1b2...:c3d4...:e5f6...';
 * const newEncrypted = reEncrypt(oldEncrypted, '02');
 * // Returns: '02:g7h8...:i9j0...:k1l2...'
 * ```
 */
export function reEncrypt(encryptedData: string, newKeyVersion: string): string {
  const plaintext = decrypt(encryptedData);
  return encrypt(plaintext, { keyVersion: newKeyVersion });
}

/**
 * Gets the key version from encrypted data
 *
 * @param encryptedData - Encrypted string
 * @returns Key version (e.g., '01', '02')
 */
export function getKeyVersion(encryptedData: string): string {
  const { version } = parseEncryptedData(encryptedData);
  return version;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const EncryptionFactory = {
  encrypt,
  decrypt,
  isEncrypted,
  parseEncryptedData,
  generateEncryptionKey,
  reEncrypt,
  getKeyVersion,
  // Mongoose helpers
  encryptFieldIfModified,
  createDecryptMethod,
  createDecryptedGetter
};

export default EncryptionFactory;
