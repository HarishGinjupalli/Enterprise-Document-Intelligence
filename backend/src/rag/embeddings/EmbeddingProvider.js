/**
 * EmbeddingProvider abstraction
 * Supports OpenAI and a deterministic mock provider for development
 */

import config from '../../config/index.js';
import logger from '../../utils/logger.js';

const EMBEDDING_DIM = 384;

/** Simple deterministic hash-based embedding for dev/testing */
function mockEmbed(text) {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % EMBEDDING_DIM] += text.charCodeAt(i) / 1000;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

class MockEmbeddingProvider {
  constructor() {
    this.name = 'mock';
    this.dimensions = EMBEDDING_DIM;
    this.cache = new Map();
  }

  async embed(text) {
    if (this.cache.has(text)) return this.cache.get(text);
    const embedding = mockEmbed(text);
    this.cache.set(text, embedding);
    return { embedding, tokens: Math.ceil(text.split(/\s+/).length * 1.3) };
  }

  async embedBatch(texts) {
    const results = [];
    let totalTokens = 0;
    for (const text of texts) {
      const result = await this.embed(text);
      results.push(result.embedding);
      totalTokens += result.tokens;
    }
    return { embeddings: results, totalTokens };
  }
}

class OpenAIEmbeddingProvider {
  constructor() {
    this.name = 'openai';
    this.model = config.openai.embeddingModel;
    this.dimensions = 1536;
    this.cache = new Map();
  }

  async embed(text, retries = 3) {
    if (this.cache.has(text)) return this.cache.get(text);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.openai.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model: this.model, input: text }),
        });

        if (response.status === 429) {
          const delay = Math.pow(2, attempt) * 1000;
          logger.warn(`Rate limited, retrying in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const result = {
          embedding: data.data[0].embedding,
          tokens: data.usage?.total_tokens || 0,
        };
        this.cache.set(text, result);
        return result;
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  async embedBatch(texts, batchSize = 20) {
    const allEmbeddings = [];
    let totalTokens = 0;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      for (const text of batch) {
        const result = await this.embed(text);
        allEmbeddings.push(result.embedding);
        totalTokens += result.tokens;
      }
    }
    return { embeddings: allEmbeddings, totalTokens };
  }
}

let providerInstance = null;

export function getEmbeddingProvider() {
  if (providerInstance) return providerInstance;
  if (config.openai.apiKey) {
    providerInstance = new OpenAIEmbeddingProvider();
    logger.info('Using OpenAI embedding provider');
  } else {
    providerInstance = new MockEmbeddingProvider();
    logger.info('Using mock embedding provider (set OPENAI_API_KEY for production)');
  }
  return providerInstance;
}

export { MockEmbeddingProvider, OpenAIEmbeddingProvider };
