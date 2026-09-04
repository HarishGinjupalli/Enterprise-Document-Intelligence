/**
 * Reranker abstraction
 * Uses cross-encoder style scoring (mock: keyword overlap + vector score blend)
 */

import logger from '../../utils/logger.js';

function tokenize(text) {
  return new Set(text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean));
}

function keywordOverlapScore(query, content) {
  const qTokens = tokenize(query);
  const cTokens = tokenize(content);
  if (qTokens.size === 0) return 0;
  let overlap = 0;
  for (const t of qTokens) {
    if (cTokens.has(t)) overlap++;
  }
  return overlap / qTokens.size;
}

class MockReranker {
  constructor() {
    this.name = 'mock_cross_encoder';
  }

  async rerank(query, candidates, topK = 5) {
    const start = Date.now();
    const scored = candidates.map((c) => {
      const kwScore = keywordOverlapScore(query, c.content);
      const priorScore = c.rrfScore || c.score || 0;
      const rerankScore = 0.6 * kwScore + 0.4 * Math.min(priorScore, 1);
      return { ...c, rerankScore };
    });

    scored.sort((a, b) => b.rerankScore - a.rerankScore);
    const results = scored.slice(0, topK);
    logger.debug('Reranking completed', { input: candidates.length, output: results.length, latencyMs: Date.now() - start });
    return results;
  }
}

class OpenAIReranker {
  constructor() {
    this.name = 'openai_llm_rerank';
  }

  async rerank(query, candidates, topK = 5) {
    const mock = new MockReranker();
    return mock.rerank(query, candidates, topK);
  }
}

let rerankerInstance = null;

export function getReranker() {
  if (!rerankerInstance) {
    rerankerInstance = new MockReranker();
    logger.info('Using mock reranker');
  }
  return rerankerInstance;
}

export { MockReranker, keywordOverlapScore };
