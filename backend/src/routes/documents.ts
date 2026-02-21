import { FastifyInstance } from 'fastify';
import { prisma } from '../server';
import { indexDocument, deleteDocumentIndex } from '../services/chroma.js';
import { encryptBuffer, decryptBuffer } from '../services/encryption.js';
import fs from 'fs/promises';
import path from 'path';

export async function documentRoutes(app: FastifyInstance) {
    app.addHook('preHandler', app.authenticate as any);

    // ─── Upload Document ─────────────────────────────────────────
    app.post('/upload', async (request: any, reply) => {
        const userId = request.user.userId;

        const data = await request.file();
        if (!data) {
            return reply.status(400).send({ error: 'No file provided' });
        }

        const buffer = await data.toBuffer();
        const fileName = data.filename;
        const type = (request.query as any).type || 'other';

        // Store file info in DB and encrypted file on disk
        const storageKey = `${userId}/${Date.now()}-${fileName}`;
        const uploadDir = path.join(process.cwd(), 'uploads', userId);

        // Ensure directory exists
        await fs.mkdir(uploadDir, { recursive: true });

        // Encrypt and save
        const encryptedBuffer = encryptBuffer(buffer);
        const filePath = path.join(process.cwd(), 'uploads', storageKey);
        await fs.writeFile(filePath, encryptedBuffer);

        const document = await prisma.document.create({
            data: {
                userId,
                type,
                fileName,
                storageKey,
            },
        });

        // Index document into ChromaDB for RAG pipeline
        const textContent = buffer.toString('utf-8');
        let chunksIndexed = 0;
        if (textContent.trim().length > 0) {
            try {
                const result = await indexDocument(userId, document.id, fileName, textContent);
                chunksIndexed = result.chunksIndexed;
            } catch (err) {
                console.error('[RAG] ChromaDB indexing failed (non-blocking):', err);
            }
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
        const userId = request.user.role === 'ADMIN' && (request.query as any).userId
            ? (request.query as any).userId
            : request.user.userId;

        const doc = await prisma.document.findUnique({ where: { id } });

        if (!doc) return reply.status(404).send({ error: 'Document not found' });

        // If not admin, verify ownership
        if (request.user.role !== 'ADMIN' && doc.userId !== request.user.userId) {
            return reply.status(403).send({ error: 'Unauthorized' });
        }

        try {
            const filePath = path.join(process.cwd(), 'uploads', doc.storageKey);
            const encryptedBuffer = await fs.readFile(filePath);
            const originalBuffer = decryptBuffer(encryptedBuffer);

            reply.header('Content-Type', 'application/octet-stream');
            reply.header('Content-Disposition', `attachment; filename="${doc.fileName}"`);
            return reply.send(originalBuffer);
        } catch (err) {
            app.log.error(err, 'Failed to download document:');
            return reply.status(500).send({ error: 'Failed to retrieve document' });
        }
    });

    // ─── List Documents ──────────────────────────────────────────
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

    // ─── List Documents for a specific user (Admin) ──────────────
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

    // ─── Verify/Reject Document (Admin) ──────────────────────────
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

        return reply.send({ success: true, document: updated });
    });

    // ─── Delete Document ─────────────────────────────────────────
    app.delete('/:id', async (request: any, reply) => {
        const { id } = request.params as { id: string };

        const doc = await prisma.document.findFirst({
            where: { id, userId: request.user.userId },
        });

        if (!doc) return reply.status(404).send({ error: 'Document not found' });

        // Clean up ChromaDB index and DB record
        await deleteDocumentIndex(request.user.userId, id);

        try {
            const filePath = path.join(process.cwd(), 'uploads', doc.storageKey);
            await fs.unlink(filePath);
        } catch (err: any) {
            if (err.code !== 'ENOENT') {
                app.log.error('Failed to delete physical file:', err);
            }
        }

        await prisma.document.delete({ where: { id } });
        return reply.send({ success: true });
    });
}
