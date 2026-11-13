import { ChromaClient, IEmbeddingFunction } from 'chromadb';
import { Ollama } from 'ollama';

// ─── Shared ChromaDB client + embedding function ─────────────────
// Both document RAG (chroma.ts) and the Advisor Clone (advisorClone.ts)
// use this module, so they always agree on server URL and embedding model.
//
// Embeddings are generated locally by Ollama (default: nomic-embed-text),
// which keeps the whole RAG pipeline offline — no external embedding API
// and no extra native dependencies in the backend image.

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8001';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';

export const chromaClient = new ChromaClient({ path: CHROMA_URL });

class OllamaEmbedder implements IEmbeddingFunction {
    private client = new Ollama({ host: OLLAMA_BASE_URL });

    async generate(texts: string[]): Promise<number[][]> {
        const response = await this.client.embed({ model: OLLAMA_EMBED_MODEL, input: texts });
        if (!response.embeddings || response.embeddings.length !== texts.length) {
            throw new Error(`Ollama returned ${response.embeddings?.length ?? 0} embeddings for ${texts.length} texts`);
        }
        return response.embeddings;
    }
}

export const embeddingFunction: IEmbeddingFunction = new OllamaEmbedder();

export async function getCollection(name: string) {
    return chromaClient.getOrCreateCollection({
        name,
        metadata: { 'hnsw:space': 'cosine' },
        embeddingFunction,
    });
}
