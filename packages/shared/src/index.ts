import * as crypto from 'crypto';

/**
 * Derives a robust 32-byte key from any input string using SHA-256.
 * This prevents runtime crashes if the user-configured key is not exactly 32 bytes.
 */
function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a string using AES-256-GCM.
 * Returns the format `iv_hex:auth_tag_hex:encrypted_content_hex`.
 */
export function encrypt(text: string, secret?: string): string {
  const encryptionSecret = secret || process.env.ENCRYPTION_KEY;
  if (!encryptionSecret) {
    throw new Error('Encryption key not specified. Set ENCRYPTION_KEY env variable.');
  }

  const key = deriveKey(encryptionSecret);
  const iv = crypto.randomBytes(12); // 12 bytes IV is standard for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a string encrypted with `encrypt`.
 */
export function decrypt(encryptedData: string, secret?: string): string {
  const encryptionSecret = secret || process.env.ENCRYPTION_KEY;
  if (!encryptionSecret) {
    throw new Error('Encryption key not specified. Set ENCRYPTION_KEY env variable.');
  }

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format. Expected iv:authTag:encryptedContent');
  }

  const [ivHex, authTagHex, encryptedContentHex] = parts;
  const key = deriveKey(encryptionSecret);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encryptedText = Buffer.from(encryptedContentHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText as any, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * OS Detection helpers
 */
export function isWindows(): boolean {
  return process.platform === 'win32';
}

export function isLinux(): boolean {
  return process.platform === 'linux';
}

/**
 * Returns the correct Docker socket or pipe based on the operating system.
 */
export function getDockerSocket(): string {
  if (isWindows()) {
    // Docker Desktop named pipe for Windows
    return '//./pipe/docker_engine';
  }
  // Standard Unix socket for Linux VPS
  return '/var/run/docker.sock';
}
