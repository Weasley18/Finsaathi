import * as Minio from 'minio';
import { encryptBuffer, decryptBuffer } from './encryption.js';

// ─── MinIO Object Storage Client ────────────────────────────────
// Replaces local-disk file storage for uploaded documents.
// All document uploads are stored in MinIO using the storageKey as the object key.

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const BUCKET = process.env.MINIO_BUCKET || 'finsaathi-docs';

// Ensure the bucket exists on startup
export async function ensureBucket(): Promise<void> {
    try {
        const exists = await minioClient.bucketExists(BUCKET);
        if (!exists) {
            await minioClient.makeBucket(BUCKET, 'us-east-1');
            console.log(`[MinIO] Created bucket: ${BUCKET}`);
        }
    } catch (err) {
        console.error('[MinIO] Failed to ensure bucket exists:', err);
    }
}

// Encrypt a buffer with AES-256-GCM and upload it to MinIO.
// Only ciphertext ever reaches object storage; the original MIME type is
// kept as metadata so downloads can restore it.
export async function uploadFile(
    storageKey: string,
    buffer: Buffer,
    mimeType: string
): Promise<void> {
    const encrypted = encryptBuffer(buffer);
    await minioClient.putObject(BUCKET, storageKey, encrypted, encrypted.length, {
        'Content-Type': 'application/octet-stream',
        'x-amz-meta-original-content-type': mimeType,
        'x-amz-meta-encryption': 'aes-256-gcm',
    });
}

// Download a file from MinIO and decrypt it
export async function downloadFile(storageKey: string): Promise<Buffer> {
    const stream = await minioClient.getObject(BUCKET, storageKey);
    const encrypted = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
    return decryptBuffer(encrypted);
}

// Delete a file from MinIO
export async function deleteFile(storageKey: string): Promise<void> {
    try {
        await minioClient.removeObject(BUCKET, storageKey);
    } catch (err) {
        console.error(`[MinIO] Failed to delete object ${storageKey}:`, err);
    }
}

export { minioClient, BUCKET };
