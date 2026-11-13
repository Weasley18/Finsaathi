import { FastifyInstance } from 'fastify';
import { prisma } from '../server';
import { indexDocument, deleteDocumentIndex } from '../services/chroma.js';
import { uploadFile, downloadFile, deleteFile } from '../services/storage.js';
import { logAudit } from '../services/audit.js';

// ─── MIME type helpers ───────────────────────────────────────────
const PDF_MIME = 'application/pdf';
const IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

async function extractTextForIndexing(
    buffer: Buffer,
    mimeType: string,
    fileName: string
): Promise<string | null> {
    if (mimeType === PDF_MIME || fileName.toLowerCase().endsWith('.pdf')) {
        try {
            // pdf-parse v2 API: class-based parser
            const { PDFParse } = await import('pdf-parse');
            const parser = new PDFParse({ data: new Uint8Array(buffer) });
            try {
                const result = await parser.getText();
                return result.text?.trim() || null;
            } finally {
                await parser.destroy();
            }
        } catch (err) {
            console.error('[RAG] PDF text extraction failed:', err);
            return null;
        }
    }

    if (IMAGE_MIMES.includes(mimeType)) {
        // Image OCR via HuggingFace Inference API (if key is configured)
        const hfKey = process.env.HUGGINGFACE_API_KEY;
        if (hfKey && !hfKey.startsWith('REPLACE')) {
            try {
                const base64 = buffer.toString('base64');
                const res = await fetch(
                    'https://api-inference.huggingface.co/models/microsoft/trocr-base-printed',
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${hfKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ inputs: base64 }),
                    }
                );
                if (res.ok) {
                    const json = await res.json() as any;
                    const text = Array.isArray(json) ? json[0]?.generated_text : json?.generated_text;
                    return text?.trim() || null;
                }
            } catch (err) {
                console.error('[RAG] Image OCR via HuggingFace failed:', err);
            }
        }
        return null;
    }

    // Plain text files
    if (mimeType.startsWith('text/')) {
        return buffer.toString('utf-8').trim() || null;
    }

    return null;
}

export async function documentRoutes(app: FastifyInstance) {
    app.addHook('preHandler', (app as any).authenticate);

    // ─── Upload Document ─────────────────────────────────────────
    app.post('/upload', async (request: any, reply) => {
        const userId = request.user.userId;

        const data = await request.file();
        if (!data) {
            return reply.status(400).send({ error: 'No file provided' });
        }

        const buffer = await data.toBuffer();
        const fileName = data.filename;
        const mimeType: string = data.mimetype || 'application/octet-stream';
        const type = (request.query as any).type || 'other';

        // Build a unique storage key: userId/timestamp-filename
        const storageKey = `${userId}/${Date.now()}-${fileName}`;

        // Upload to MinIO (encrypted with AES-256-GCM inside uploadFile)
        try {
            await uploadFile(storageKey, buffer, mimeType);
        } catch (err) {
            app.log.error(err, '[MinIO] Upload failed');
            return reply.status(500).send({ error: 'File upload to storage failed' });
        }

        const document = await prisma.document.create({
            data: {
                userId,
                type,
                fileName,
                storageKey,
            },
        });

        // ─── Index document into ChromaDB (only if text is extractable) ─
        let chunksIndexed = 0;
        try {
            const text = await extractTextForIndexing(buffer, mimeType, fileName);
            if (text && text.length > 20) {
                const result = await indexDocument(userId, document.id, fileName, text);
                chunksIndexed = result.chunksIndexed;
            }
        } catch (err) {
            console.error('[RAG] ChromaDB indexing failed (non-blocking):', err);
        }

        return reply.send({
            success: true,
            document: {
                id: document.id,
                fileName: document.fileName,
                type: document.type,
                status: document.status,
                uploadedAt: document.uploadedAt,
                chunksIndexed,
            },
        });
    });

    // ─── Download Document ───────────────────────────────────────
    app.get('/:id/download', async (request: any, reply) => {
        const { id } = request.params as { id: string };

        const doc = await prisma.document.findUnique({ where: { id } });
        if (!doc) return reply.status(404).send({ error: 'Document not found' });

        // Non-admin users can only download their own documents
        if (request.user.role !== 'ADMIN' && doc.userId !== request.user.userId) {
            return reply.status(403).send({ error: 'Unauthorized' });
        }

        try {
            const fileBuffer = await downloadFile(doc.storageKey);
            if (doc.userId !== request.user.userId) {
                await logAudit(request, 'DOCUMENT_DOWNLOAD', 'document', doc.id, { ownerId: doc.userId });
            }
            reply.header('Content-Type', 'application/octet-stream');
            reply.header('Content-Disposition', `attachment; filename="${doc.fileName.replace(/["\\\r\n]/g, '_')}"`);
            return reply.send(fileBuffer);
        } catch (err: any) {
            if (err.code === 'NoSuchKey') {
                return reply.status(404).send({ error: 'File not found in storage. The document record exists but the file is missing.' });
            }
            app.log.error(err, 'Failed to download document');
            return reply.status(500).send({ error: 'Failed to retrieve document' });
        }
    });

    // ─── List Documents (own) ────────────────────────────────────
    app.get('/', async (request: any, reply) => {
        const userId = request.user.userId;

        const documents = await prisma.document.findMany({
            where: { userId },
            orderBy: { uploadedAt: 'desc' },
            select: {
                id: true,
                type: true,
                fileName: true,
                status: true,
                reviewNote: true,
                extractedData: true,
                uploadedAt: true,
            },
        });

        return reply.send({ documents });
    });

    // ─── List Documents for a specific user (Admin only) ─────────
    app.get('/user/:userId', async (request: any, reply) => {
        if (request.user.role !== 'ADMIN') {
            return reply.status(403).send({ error: 'Admin access required' });
        }

        const { userId } = request.params as { userId: string };

        const documents = await prisma.document.findMany({
            where: { userId },
            orderBy: { uploadedAt: 'desc' },
            select: {
                id: true,
                type: true,
                fileName: true,
                status: true,
                reviewNote: true,
                extractedData: true,
                uploadedAt: true,
            },
        });

        return reply.send({ documents });
    });

    // ─── Verify / Reject Document (Admin) ────────────────────────
    app.put('/:id/verify', async (request: any, reply) => {
        if (request.user.role !== 'ADMIN') {
            return reply.status(403).send({ error: 'Admin access required' });
        }

        const { id } = request.params as { id: string };
        const { status, reviewNote } = request.body as { status: 'VERIFIED' | 'REJECTED'; reviewNote?: string };

        if (!['VERIFIED', 'REJECTED'].includes(status)) {
            return reply.status(400).send({ error: 'Status must be VERIFIED or REJECTED' });
        }

        const doc = await prisma.document.findUnique({ where: { id } });
        if (!doc) return reply.status(404).send({ error: 'Document not found' });

        const updated = await prisma.document.update({
            where: { id },
            data: { status, reviewNote },
        });
        await logAudit(request, `DOCUMENT_${status}`, 'document', id, { ownerId: doc.userId, reviewNote });

        return reply.send({ success: true, document: updated });
    });

    // ─── Delete Document ─────────────────────────────────────────
    app.delete('/:id', async (request: any, reply) => {
        const { id } = request.params as { id: string };

        const doc = await prisma.document.findFirst({
            where: { id, userId: request.user.userId },
        });
        if (!doc) return reply.status(404).send({ error: 'Document not found' });

        // Remove from ChromaDB and MinIO
        await Promise.all([
            deleteDocumentIndex(request.user.userId, id).catch(() => {}),
            deleteFile(doc.storageKey).catch(() => {}),
        ]);

        await prisma.document.delete({ where: { id } });
        return reply.send({ success: true });
    });
}
