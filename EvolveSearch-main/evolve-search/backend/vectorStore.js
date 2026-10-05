// vectorStore.js - In-memory vector store with optional external DB integration
// Replace the in-memory store with Pinecone/Weaviate when API keys are available

const axios = require('axios');

// ============================================================
// In-Memory Vector Store (FAISS-like fallback)
// ============================================================
class InMemoryVectorStore {
  constructor() {
    this.documents = [];
  }

  cosineSimilarity(vecA, vecB) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
  }

  upsert(id, embedding, metadata) {
    const existing = this.documents.findIndex(d => d.id === id);
    const doc = { id, embedding, metadata, timestamp: Date.now() };
    if (existing >= 0) this.documents[existing] = doc;
    else this.documents.push(doc);
  }

  search(queryEmbedding, topK = 10) {
    return this.documents
      .map(doc => ({
        ...doc.metadata,
        id: doc.id,
        score: this.cosineSimilarity(queryEmbedding, doc.embedding)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  count() { return this.documents.length; }
}

// ============================================================
// Embedding Generator
// ============================================================
class EmbeddingService {
  constructor() {
    this.cache = new Map();
  }

  // Simple TF-IDF-based pseudo-embedding for demo (no API key needed)
  localEmbed(text) {
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const vec = new Array(128).fill(0);
    words.forEach(word => {
      let hash = 0;
      for (let c of word) hash = (hash * 31 + c.charCodeAt(0)) % 128;
      vec[hash] += 1 / (words.length + 1);
      // Add secondary hash for richer representation
      let hash2 = 0;
      for (let c of word) hash2 = (hash2 * 17 + c.charCodeAt(0)) % 128;
      vec[(hash2 + 64) % 128] += 0.5 / (words.length + 1);
    });
    // Normalize
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) + 1e-10;
    return vec.map(v => v / norm);
  }

  async huggingFaceEmbed(text) {
    // OPTION: HuggingFace Inference API
    // Uncomment and add HUGGINGFACE_API_KEY to .env
    /*
    const response = await axios.post(
      'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
      { inputs: text },
      { headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` } }
    );
    return response.data[0]; // 384-dim vector
    */
    throw new Error('HuggingFace not configured');
  }

  async openAIEmbed(text) {
    // OPTION: OpenAI Embeddings API
    // Uncomment and add OPENAI_API_KEY to .env
    /*
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      { input: text, model: 'text-embedding-ada-002' },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
    );
    return response.data.data[0].embedding; // 1536-dim vector
    */
    throw new Error('OpenAI not configured');
  }

  async embed(text) {
    const cacheKey = text.slice(0, 100);
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    let embedding;
    try {
      if (process.env.OPENAI_API_KEY) {
        embedding = await this.openAIEmbed(text);
      } else if (process.env.HUGGINGFACE_API_KEY) {
        embedding = await this.huggingFaceEmbed(text);
      } else {
        embedding = this.localEmbed(text);
      }
    } catch (e) {
      console.log('[Embedding] Falling back to local embedding:', e.message);
      embedding = this.localEmbed(text);
    }

    this.cache.set(cacheKey, embedding);
    return embedding;
  }
}

// ============================================================
// Pinecone Integration (when API key available)
// ============================================================
class PineconeStore {
  constructor() {
    this.baseUrl = null;
    this.apiKey = process.env.PINECONE_API_KEY;
  }

  isAvailable() { return !!this.apiKey; }

  async upsert(id, embedding, metadata) {
    /*
    await axios.post(`${this.baseUrl}/vectors/upsert`, {
      vectors: [{ id, values: embedding, metadata }]
    }, { headers: { 'Api-Key': this.apiKey } });
    */
    throw new Error('Pinecone not configured');
  }

  async search(queryEmbedding, topK = 10) {
    /*
    const response = await axios.post(`${this.baseUrl}/query`, {
      vector: queryEmbedding, topK, includeMetadata: true
    }, { headers: { 'Api-Key': this.apiKey } });
    return response.data.matches.map(m => ({ ...m.metadata, score: m.score }));
    */
    throw new Error('Pinecone not configured');
  }
}

// Factory: use best available store
const embeddingService = new EmbeddingService();
const vectorStore = new InMemoryVectorStore(); // swap with PineconeStore() if configured

module.exports = { vectorStore, embeddingService };
