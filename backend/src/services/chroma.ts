import { ChromaClient, Collection } from 'chromadb';

// ─── ChromaDB RAG Service ────────────────────────────────────────
// Provides document indexing and retrieval for the AI chat system.
// Documents are chunked, embedded, and stored per-user in ChromaDB.

const client = new ChromaClient({ path: process.env.CHROMA_URL || 'http://localhost:8000' });

const CHUNK_SIZE = 500;     // characters per chunk
const CHUNK_OVERLAP = 50;   // overlap between chunks
const TOP_K = 5;            // default number of results to return

// ─── Text Chunking ───────────────────────────────────────────────
function chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + CHUNK_SIZE, text.length);
        chunks.push(text.slice(start, end));
        start += CHUNK_SIZE - CHUNK_OVERLAP;
    }

    return chunks.filter(c => c.trim().length > 20); // filter out tiny fragments
}

// ─── Get or Create Per-User Collection ───────────────────────────
async function getUserCollection(userId: string): Promise<Collection> {
    const collectionName = `user_${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}`.slice(0, 63);
    return client.getOrCreateCollection({
        name: collectionName,
        metadata: { 'hnsw:space': 'cosine' },
    });
}

// ─── Index a Document ────────────────────────────────────────────
// Chunks the document text and adds it to the user's ChromaDB collection.
// ChromaDB will auto-generate embeddings using its default embedding function.
export async function indexDocument(
    userId: string,
    documentId: string,
    fileName: string,
    text: string
): Promise<{ chunksIndexed: number }> {
    try {
        const collection = await getUserCollection(userId);
        const chunks = chunkText(text);

        if (chunks.length === 0) {
            return { chunksIndexed: 0 };
        }

        const ids = chunks.map((_, i) => `${documentId}_chunk_${i}`);
        const metadatas = chunks.map((_, i) => ({
            documentId,
            fileName,
            chunkIndex: i,
            totalChunks: chunks.length,
        }));

        await collection.add({
            ids,
            documents: chunks,
            metadatas,
        });

        return { chunksIndexed: chunks.length };
    } catch (error) {
        console.error('[ChromaDB] Error indexing document:', error);
        return { chunksIndexed: 0 };
    }
}

// ─── Query Documents ─────────────────────────────────────────────
// Searches the user's document collection for relevant chunks.
export async function queryDocuments(
    userId: string,
    query: string,
    topK: number = TOP_K
): Promise<{ results: Array<{ text: string; fileName: string; score: number }> }> {
    try {
        const collection = await getUserCollection(userId);

        const results = await collection.query({
            queryTexts: [query],
            nResults: topK,
        });

        if (!results.documents?.[0]?.length) {
            return { results: [] };
        }

        return {
            results: results.documents[0].map((doc, i) => ({
                text: doc || '',
                fileName: (results.metadatas?.[0]?.[i] as any)?.fileName || 'Unknown',
                score: results.distances?.[0]?.[i] ? 1 - results.distances[0][i] : 0,
            })),
        };
    } catch (error) {
        console.error('[ChromaDB] Error querying documents:', error);
        return { results: [] };
    }
}

// ─── Delete Document from Index ──────────────────────────────────
export async function deleteDocumentIndex(
    userId: string,
    documentId: string
): Promise<void> {
    try {
        const collection = await getUserCollection(userId);
        // Delete all chunks for this document by filtering on metadata
        const existing = await collection.get({
            where: { documentId },
        });

        if (existing.ids.length > 0) {
            await collection.delete({ ids: existing.ids });
        }
    } catch (error) {
        console.error('[ChromaDB] Error deleting document index:', error);
    }
}
