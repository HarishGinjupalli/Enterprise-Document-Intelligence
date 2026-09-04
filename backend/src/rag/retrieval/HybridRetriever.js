/**
 * Hybrid retrieval orchestrator
 */

import { getKeywordRetriever } from './KeywordRetriever.js';
import { getVectorStore } from '../vector/VectorStore.js';
import { getEmbeddingProvider } from '../embeddings/EmbeddingProvider.js';
import { getReranker } from './Reranker.js';
import { reciprocalRankFusion } from './fusion.js';
import { query as dbQuery } from '../../db/connection.js';
import logger from '../../utils/logger.js';

const DEFAULT_CONFIG = {
  bm25TopK: 20,
  vectorTopK: 20,
  fusionK: 60,
  rerankTopK: 5,
  finalContextSize: 5,
  useReranker: true,
};

export async function vectorSearch(searchQuery, filters, topK) {
  const start = Date.now();
  const embedder = getEmbeddingProvider();
  const vectorStore = getVectorStore();
  const { embedding } = await embedder.embed(searchQuery);

  const results = await vectorStore.search(embedding, {
    topK,
    filter: filters.documentIds ? { documentIds: filters.documentIds } : null,
  });

  const enriched = [];
  for (const r of results) {
    const rows = await dbQuery(
      `SELECT dc.*, d.title AS document_title FROM document_chunks dc
       JOIN documents d ON d.id = dc.document_id WHERE dc.id = ?`,
      [r.id]
    );
    if (rows[0]) {
      enriched.push({
        chunkId: r.id,
        documentId: rows[0].document_id,
        chunkIndex: rows[0].chunk_index,
        pageNumber: rows[0].page_number,
        section: rows[0].section,
        content: rows[0].content,
        tokenCount: rows[0].token_count,
        score: r.score,
        source: 'vector',
        documentTitle: rows[0].document_title,
      });
    }
  }

  return { results: enriched, latencyMs: Date.now() - start };
}

export async function hybridRetrieve(searchQuery, filters = {}, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const retriever = getKeywordRetriever();

  const bm25Start = Date.now();
  const bm25Results = await retriever.search(searchQuery, filters, cfg.bm25TopK);
  const bm25LatencyMs = Date.now() - bm25Start;

  const { results: vectorResults, latencyMs: vectorLatencyMs } = await vectorSearch(
    searchQuery,
    filters,
    cfg.vectorTopK
  );

  const fused = reciprocalRankFusion([bm25Results, vectorResults], { k: cfg.fusionK });

  let finalResults = fused;
  let rerankLatencyMs = 0;

  if (cfg.useReranker && fused.length > 0) {
    const rerankStart = Date.now();
    const reranker = getReranker();
    finalResults = await reranker.rerank(searchQuery, fused, cfg.rerankTopK);
    rerankLatencyMs = Date.now() - rerankStart;
  } else {
    finalResults = fused.slice(0, cfg.finalContextSize);
  }

  logger.info('Hybrid retrieval completed', {
    bm25Count: bm25Results.length,
    vectorCount: vectorResults.length,
    fusedCount: fused.length,
    finalCount: finalResults.length,
  });

  return {
    results: finalResults.slice(0, cfg.finalContextSize),
    metadata: {
      bm25Count: bm25Results.length,
      vectorCount: vectorResults.length,
      rerankedCount: finalResults.length,
      bm25LatencyMs,
      vectorLatencyMs,
      rerankLatencyMs,
    },
  };
}

export { DEFAULT_CONFIG };
