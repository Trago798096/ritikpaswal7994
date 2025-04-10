import { AES, enc } from 'crypto-js';

// Secure data handling utility
export class SecureData {
  private static readonly STORAGE_PREFIX = 'bms_';
  private static readonly SENSITIVE_KEYS = ['token', 'key', 'password', 'secret'];
  private static encryptionKey: string;

  // Initialize with environment-specific encryption key
  static initialize(): void {
    const key = import.meta.env.VITE_ENCRYPTION_KEY;
    if (!key) {
      console.error('Missing encryption key in environment variables');
      return;
    }
    this.encryptionKey = key;
  }

  // Encrypt sensitive data
  static encrypt(data: string): string {
    if (!this.encryptionKey) {
      throw new Error('SecureData not initialized');
    }
    return AES.encrypt(data, this.encryptionKey).toString();
  }

  // Decrypt sensitive data
  static decrypt(encryptedData: string): string {
    if (!this.encryptionKey) {
      throw new Error('SecureData not initialized');
    }
    const bytes = AES.decrypt(encryptedData, this.encryptionKey);
    return bytes.toString(enc.Utf8);
  }

  // Securely store data in localStorage
  static setItem(key: string, value: any): void {
    const prefixedKey = this.STORAGE_PREFIX + key;
    const stringValue = JSON.stringify(value);

    // Encrypt if key contains sensitive information
    if (this.isSensitiveKey(key)) {
      const encryptedValue = this.encrypt(stringValue);
      localStorage.setItem(prefixedKey, encryptedValue);
    } else {
      localStorage.setItem(prefixedKey, stringValue);
    }
  }

  // Securely retrieve data from localStorage
  static getItem<T>(key: string): T | null {
    const prefixedKey = this.STORAGE_PREFIX + key;
    const value = localStorage.getItem(prefixedKey);

    if (!value) return null;

    try {
      // Decrypt if key contains sensitive information
      if (this.isSensitiveKey(key)) {
        const decryptedValue = this.decrypt(value);
        return JSON.parse(decryptedValue);
      }
      return JSON.parse(value);
    } catch (error) {
      console.error(`Error retrieving ${key}:`, error);
      return null;
    }
  }

  // Remove item from localStorage
  static removeItem(key: string): void {
    const prefixedKey = this.STORAGE_PREFIX + key;
    localStorage.removeItem(prefixedKey);
  }

  // Clear all secure data
  static clearAll(): void {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  // Check if key contains sensitive information
  private static isSensitiveKey(key: string): boolean {
    return this.SENSITIVE_KEYS.some(sensitiveKey => 
      key.toLowerCase().includes(sensitiveKey)
    );
  }

  // Sanitize data before storing
  static sanitizeData<T extends Record<string, any>>(data: T): T {
    const sanitized = { ...data };
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string') {
        // Remove potential XSS content
        sanitized[key] = this.sanitizeString(sanitized[key]);
      }
    });
    return sanitized;
  }

  // Sanitize string to prevent XSS
  private static sanitizeString(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Mask sensitive data for logging
  static maskSensitiveData(data: Record<string, any>): Record<string, any> {
    const masked = { ...data };
    Object.keys(masked).forEach(key => {
      if (this.isSensitiveKey(key)) {
        masked[key] = '********';
      }
    });
    return masked;
  }

  // Generate secure random string
  static generateSecureId(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Validate session token
  static validateToken(token: string): boolean {
    try {
      const decoded = this.decrypt(token);
      const { exp } = JSON.parse(decoded);
      return exp > Date.now();
    } catch {
      return false;
    }
  }
}
