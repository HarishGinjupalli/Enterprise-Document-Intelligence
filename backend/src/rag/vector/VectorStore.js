/**
 * VectorStore abstraction
 * In-memory implementation for development; adapter pattern for Qdrant etc.
 */

import logger from '../../utils/logger.js';

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

class InMemoryVectorStore {
  constructor() {
    this.vectors = new Map();
    this.name = 'memory';
  }

  async upsert(items) {
    for (const item of items) {
      this.vectors.set(item.id, {
        id: item.id,
        embedding: item.embedding,
        metadata: item.metadata || {},
      });
    }
    return { upserted: items.length };
  }

  async delete(ids) {
    let deleted = 0;
    for (const id of ids) {
      if (this.vectors.delete(id)) deleted++;
    }
    return { deleted };
  }

  async search(queryEmbedding, { topK = 10, filter = null } = {}) {
    let candidates = [...this.vectors.values()];

    if (filter?.documentIds?.length) {
      candidates = candidates.filter((v) => filter.documentIds.includes(v.metadata.documentId));
    }

    const scored = candidates.map((v) => ({
      id: v.id,
      score: cosineSimilarity(queryEmbedding, v.embedding),
      metadata: v.metadata,
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  async healthCheck() {
    return { status: 'ok', count: this.vectors.size };
  }
}

let storeInstance = null;

export function getVectorStore() {
  if (!storeInstance) {
    storeInstance = new InMemoryVectorStore();
    logger.info('Using in-memory vector store');
  }
  return storeInstance;
}

export { InMemoryVectorStore, cosineSimilarity };
