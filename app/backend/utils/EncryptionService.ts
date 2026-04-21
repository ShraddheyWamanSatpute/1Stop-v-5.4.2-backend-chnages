/**
 * Encryption Service
 *
 * Provides encryption utilities for sensitive data in compliance with
 * UK GDPR and HMRC requirements.
 *
 * Security Features:
 * - AES-256-GCM encryption for data at rest
 * - Secure key derivation (PBKDF2)
 * - Random IV generation
 * - No key storage alongside data
 *
 * Reference: ICO Encryption Guidance
 *
 * IMPORTANT: Encryption keys should be stored in:
 * - Firebase Secrets (for server-side)
 * - Never in client-side code or localStorage
 */
 
/**
 * Encryption format version
 * Version 1: IV(12) + ciphertext (fixed salt)
 * Version 2: version(1) + salt(16) + IV(12) + ciphertext (random salt per encryption)
 */
const ENCRYPTION_VERSION = 2;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
 
/**
 * Browser-compatible encryption using Web Crypto API
 */
export class EncryptionService {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
 
  /**
   * Encrypt sensitive data
   *
   * @param plaintext - Data to encrypt
   * @param key - Encryption key (should come from secure source)
   * @returns Base64 encoded encrypted data with version, salt, and IV prepended
   *
   * Format (Version 2): [version(1)] + [salt(16)] + [IV(12)] + [ciphertext]
   */
  async encrypt(plaintext: string, key: string): Promise<string> {
    if (!plaintext || !key) {
      throw new Error('Plaintext and key are required');
    }
 
    // Generate random salt (16 bytes) - unique per encryption for better security
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
 
    // Derive a cryptographic key from the provided key using random salt
    const cryptoKey = await this.deriveKey(key, salt);
 
    // Generate random IV (12 bytes for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
 
    // Encrypt
    const encodedText = this.encoder.encode(plaintext);
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      cryptoKey,
      encodedText
    );
 
    // Combine: version(1) + salt(16) + IV(12) + ciphertext
    const combined = new Uint8Array(1 + SALT_LENGTH + IV_LENGTH + encryptedBuffer.byteLength);
    combined[0] = ENCRYPTION_VERSION; // Version byte
    combined.set(salt, 1); // Salt at offset 1
    combined.set(iv, 1 + SALT_LENGTH); // IV at offset 17
    combined.set(new Uint8Array(encryptedBuffer), 1 + SALT_LENGTH + IV_LENGTH); // Ciphertext at offset 29
 
    // Return as base64
    return this.arrayBufferToBase64(combined.buffer);
  }
 
  /**
   * Decrypt encrypted data
   *
   * @param ciphertext - Base64 encoded encrypted data
   * @param key - Encryption key
   * @returns Decrypted plaintext
   *
   * Supports both Version 1 (legacy) and Version 2 formats
   */
  async decrypt(ciphertext: string, key: string): Promise<string> {
    if (!ciphertext || !key) {
      throw new Error('Ciphertext and key are required');
    }
 
    // Decode from base64
    const combined = new Uint8Array(this.base64ToArrayBuffer(ciphertext));
 
    // Check version byte to determine format
    const version = combined[0];
 
    if (version === ENCRYPTION_VERSION) {
      // Version 2 format: version(1) + salt(16) + IV(12) + ciphertext
      const salt = combined.slice(1, 1 + SALT_LENGTH);
      const iv = combined.slice(1 + SALT_LENGTH, 1 + SALT_LENGTH + IV_LENGTH);
      const encryptedData = combined.slice(1 + SALT_LENGTH + IV_LENGTH);
 
      // Derive key using the stored salt
      const cryptoKey = await this.deriveKey(key, salt);
 
      // Decrypt
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        cryptoKey,
        encryptedData
      );
 
      return this.decoder.decode(decryptedBuffer);
    } else {
      // Legacy Version 1 format: IV(12) + ciphertext (with fixed salt)
      // This provides backward compatibility with data encrypted before the update
      const iv = combined.slice(0, IV_LENGTH);
      const encryptedData = combined.slice(IV_LENGTH);
 
      // Derive key using legacy fixed salt
      const cryptoKey = await this.deriveKeyLegacy(key);
 
      // Decrypt
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        cryptoKey,
        encryptedData
      );
 
      return this.decoder.decode(decryptedBuffer);
    }
  }
 
  /**
   * Hash sensitive data (one-way, for comparison)
   *
   * @param data - Data to hash
   * @returns SHA-256 hash as hex string
   */
  async hash(data: string): Promise<string> {
    const encoded = this.encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    return this.arrayBufferToHex(hashBuffer);
  }
 
  /**
   * Derive encryption key from password/key using PBKDF2 with random salt
   *
   * @param password - The encryption key/password
   * @param salt - Random salt (16 bytes) unique per encryption
   */
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
 
    // Derive AES-GCM key using the provided random salt
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
 
  /**
   * Legacy key derivation with fixed salt (for backward compatibility)
   * Used to decrypt data encrypted with Version 1 format
   */
  private async deriveKeyLegacy(password: string): Promise<CryptoKey> {
    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
 
    // Use the legacy fixed salt
    const salt = this.encoder.encode('hmrc-compliance-salt-v1');
 
    // Derive AES-GCM key
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
 
  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
 
  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
 
  /**
   * Convert ArrayBuffer to hex string
   */
  private arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
 
/**
 * Sensitive Data Field Encryption Helper
 *
 * Provides utilities for encrypting specific sensitive fields
 * before storing in Firebase.
 */
export class SensitiveDataEncryption {
  private encryptionService: EncryptionService;
  private encryptionKey: string | null = null;
 
  constructor() {
    this.encryptionService = new EncryptionService();
  }
 
  /**
   * Initialize with encryption key
   * Key should be retrieved from a secure source (not hardcoded)
   */
  initialize(key: string): void {
    if (!key || key.length < 32) {
      throw new Error('Encryption key must be at least 32 characters');
    }
    this.encryptionKey = key;
  }
 
  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.encryptionKey !== null;
  }
 
  /**
   * Encrypt a sensitive field value
   */
  async encryptField(value: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption service not initialized. Call initialize() first.');
    }
    return this.encryptionService.encrypt(value, this.encryptionKey);
  }
 
  /**
   * Decrypt a sensitive field value
   */
  async decryptField(encryptedValue: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption service not initialized. Call initialize() first.');
    }
    return this.encryptionService.decrypt(encryptedValue, this.encryptionKey);
  }
 
  /**
   * Encrypt sensitive fields in an object
   *
   * @param data - Object containing data
   * @param sensitiveFields - Array of field names to encrypt
   * @returns Object with specified fields encrypted
   */
  async encryptSensitiveFields<T extends Record<string, unknown>>(
    data: T,
    sensitiveFields: (keyof T)[]
  ): Promise<T> {
    if (!this.encryptionKey) {
      throw new Error('Encryption service not initialized');
    }
 
    const result = { ...data };
 
    for (const field of sensitiveFields) {
      const value = data[field];
      if (typeof value === 'string' && value.length > 0) {
        (result[field] as unknown) = await this.encryptField(value);
      }
    }
 
    return result;
  }
 
  /**
   * Decrypt sensitive fields in an object
   *
   * @param data - Object containing encrypted data
   * @param sensitiveFields - Array of field names to decrypt
   * @returns Object with specified fields decrypted
   */
  async decryptSensitiveFields<T extends Record<string, unknown>>(
    data: T,
    sensitiveFields: (keyof T)[]
  ): Promise<T> {
    if (!this.encryptionKey) {
      throw new Error('Encryption service not initialized');
    }
 
    const result = { ...data };
 
    for (const field of sensitiveFields) {
      const value = data[field];
      if (typeof value === 'string' && value.length > 0) {
        try {
          (result[field] as unknown) = await this.decryptField(value);
        } catch {
          // Field might not be encrypted, leave as is
          console.warn(`Failed to decrypt field ${String(field)}, may not be encrypted`);
        }
      }
    }
 
    return result;
  }
 
  /**
   * Hash a value (for comparison without storing plaintext)
   */
  async hashValue(value: string): Promise<string> {
    return this.encryptionService.hash(value);
  }
}
 
/**
 * Mask sensitive data for display/logging
 */
export class DataMasking {
  /**
   * Mask National Insurance number
   * Format: AB123456C -> AB****56C
   */
  static maskNINumber(ni: string): string {
    if (!ni || ni.length < 9) return '***';
    return ni.substring(0, 2) + '****' + ni.substring(6);
  }
 
  /**
   * Mask PAYE reference
   * Format: 123/AB45678 -> 123/***78
   */
  static maskPAYEReference(ref: string): string {
    if (!ref || ref.length < 4) return '***';
    const slashIndex = ref.indexOf('/');
    if (slashIndex === -1) return ref.substring(0, 3) + '***';
    return ref.substring(0, slashIndex + 1) + '***' + ref.slice(-2);
  }
 
  /**
   * Mask email address
   * Format: john.doe@example.com -> j***e@example.com
   */
  static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***@***.***';
    const maskedLocal = local.length > 2 ? local[0] + '***' + local[local.length - 1] : '***';
    return `${maskedLocal}@${domain}`;
  }
 
  /**
   * Mask phone number
   * Format: 07123456789 -> 07***6789
   */
  static maskPhone(phone: string): string {
    if (!phone || phone.length < 6) return '***';
    return phone.substring(0, 2) + '***' + phone.slice(-4);
  }
 
  /**
   * Mask bank account number
   * Format: 12345678 -> ****5678
   */
  static maskBankAccount(account: string): string {
    if (!account || account.length < 4) return '****';
    return '****' + account.slice(-4);
  }
 
  /**
   * Mask sort code
   * Format: 12-34-56 -> **-**-56
   */
  static maskSortCode(sortCode: string): string {
    if (!sortCode || sortCode.length < 2) return '**-**-**';
    return '**-**-' + sortCode.slice(-2);
  }
 
  /**
   * Mask IP address
   * Format: 192.168.1.100 -> 192.168.xxx.xxx
   */
  static maskIPAddress(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    // IPv6 or invalid
    return ip.substring(0, 10) + '...';
  }
 
  /**
   * Mask address (keep city/postcode area only)
   * Format: "123 High Street, London, SW1A 1AA" -> "London, SW1A"
   */
  static maskAddress(address: string): string {
    if (!address) return '***';
 
    // Try to extract city and partial postcode
    const parts = address.split(',').map((p) => p.trim());
    if (parts.length >= 2) {
      const city = parts[parts.length - 2] || '';
      const postcode = parts[parts.length - 1] || '';
      const postcodeArea = postcode.split(' ')[0] || '***';
      return `${city}, ${postcodeArea}`;
    }
 
    return '***';
  }
 
  /**
   * Mask date of birth (show year only)
   * Format: 1990-05-15 -> 1990-**-**
   */
  static maskDateOfBirth(dob: string): string {
    if (!dob) return '****-**-**';
    const year = dob.substring(0, 4);
    return `${year}-**-**`;
  }
}
 
// Export singleton instances
export const encryptionService = new EncryptionService();
export const sensitiveDataEncryption = new SensitiveDataEncryption();

