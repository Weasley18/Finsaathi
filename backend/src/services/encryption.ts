import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit nonce is standard for GCM
const AUTH_TAG_LENGTH = 16;

// Derive a 32-byte key from the environment variable (which should be base64)
// Fallback to random if not set for dev, but emit a warning.
const keyBase64 = process.env.ENCRYPTION_KEY;
let ENCRYPTION_KEY: Buffer;

if (keyBase64) {
    ENCRYPTION_KEY = Buffer.from(keyBase64, 'base64');
    if (ENCRYPTION_KEY.length !== 32) {
        console.warn('⚠️ WARNING: ENCRYPTION_KEY must be exactly 32 bytes (256 bits). Generating a random one instead.');
        ENCRYPTION_KEY = crypto.randomBytes(32);
    }
} else {
    console.warn('⚠️ WARNING: ENCRYPTION_KEY not set. Using a random key for this session. Encrypted data will be lost on restart.');
    ENCRYPTION_KEY = crypto.randomBytes(32);
}

/**
 * Encrypts a string using AES-256-GCM.
 * Format: iv:authTag:encryptedText
 */
export function encrypt(text: string | null | undefined): string | null | undefined {
    if (text === null || text === undefined || text === '') return text;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

        let encrypted = cipher.update(text, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        const authTag = cipher.getAuthTag().toString('base64');

        return `${iv.toString('base64')}:${authTag}:${encrypted}`;
    } catch (e) {
        console.error('Encryption failed:', e);
        throw new Error('Encryption failed');
    }
}

/**
 * Decrypts a string encrypted with encrypt().
 */
export function decrypt(encryptedText: string | null | undefined): string | null | undefined {
    if (encryptedText === null || encryptedText === undefined || encryptedText === '') return encryptedText;

    // Check if it matches our encrypted format: iv:authTag:encrypted
    if (!encryptedText.includes(':')) {
        // If it doesn't look like our ciphertext, return as-is (might be legacy unencrypted data)
        return encryptedText;
    }

    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 3) return encryptedText;

        const iv = Buffer.from(parts[0], 'base64');
        const authTag = Buffer.from(parts[1], 'base64');
        const encrypted = parts[2];

        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (e) {
        console.error('Decryption failed for ciphertext. Returning original string or null.', e);
        return encryptedText;
    }
}

/**
 * Encrypts a raw buffer.
 * Structure: [IV (12 bytes)] [Auth Tag (16 bytes)] [Encrypted Data]
 */
export function encryptBuffer(buffer: Buffer): Buffer {
    if (!buffer) return buffer;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

        const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
        const authTag = cipher.getAuthTag();

        return Buffer.concat([iv, authTag, encrypted]);
    } catch (e) {
        console.error('Buffer Encryption failed:', e);
        throw new Error('Buffer Encryption failed');
    }
}

/**
 * Decrypts a buffer encrypted with encryptBuffer().
 */
export function decryptBuffer(encryptedBuffer: Buffer): Buffer {
    if (!encryptedBuffer) return encryptedBuffer;

    try {
        // Not enough data to be our encrypted format
        if (encryptedBuffer.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
            return encryptedBuffer;
        }

        const iv = encryptedBuffer.subarray(0, IV_LENGTH);
        const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
        const data = encryptedBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);

        return Buffer.concat([decipher.update(data), decipher.final()]);
    } catch (e) {
        console.error('Buffer Decryption failed:', e);
        return encryptedBuffer;
    }
}
