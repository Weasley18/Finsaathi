import { FastifyInstance } from 'fastify';
import { prisma } from '../server';
import { indexDocument, deleteDocumentIndex } from '../services/chroma';

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

        // For now, store file info in DB (MinIO integration can be added later)
        const storageKey = `${userId}/${Date.now()}-${fileName}`;

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
                uploadedAt: document.uploadedAt,
                chunksIndexed,
            },
        });
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
                extractedData: true,
                uploadedAt: true,
            },
        });

        return reply.send({ documents });
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
        await prisma.document.delete({ where: { id } });
        return reply.send({ success: true });
    });
}
