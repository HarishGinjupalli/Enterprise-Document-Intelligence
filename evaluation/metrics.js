/**
 * RAG Evaluation Metrics
 * Real implementations - no fake numbers
 */

export function recallAtK(retrievedIds, expectedIds, k) {
  if (!expectedIds.length) return expectedIds.length === 0 && retrievedIds.length === 0 ? 1 : 0;
  const topK = retrievedIds.slice(0, k);
  const hits = expectedIds.filter((id) => topK.includes(id)).length;
  return hits / expectedIds.length;
}

export function meanReciprocalRank(retrievedIds, expectedIds) {
  for (let i = 0; i < retrievedIds.length; i++) {
    if (expectedIds.includes(retrievedIds[i])) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

export function ndcgAtK(retrievedIds, expectedIds, k, relevanceScores = {}) {
  const topK = retrievedIds.slice(0, k);
  let dcg = 0;
  for (let i = 0; i < topK.length; i++) {
    const rel = expectedIds.includes(topK[i]) ? (relevanceScores[topK[i]] || 1) : 0;
    dcg += rel / Math.log2(i + 2);
  }

  const ideal = [...expectedIds].sort((a, b) => (relevanceScores[b] || 1) - (relevanceScores[a] || 1));
  let idcg = 0;
  for (let i = 0; i < Math.min(k, ideal.length); i++) {
    idcg += (relevanceScores[ideal[i]] || 1) / Math.log2(i + 2);
  }

  return idcg === 0 ? 0 : dcg / idcg;
}

export function faithfulnessScore(answer, contextChunks) {
  if (!answer || !contextChunks.length) return 0;
  const answerWords = new Set(answer.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  const contextWords = new Set(
    contextChunks.join(' ').toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );
  if (answerWords.size === 0) return 0;
  let overlap = 0;
  for (const w of answerWords) {
    if (contextWords.has(w)) overlap++;
  }
  return overlap / answerWords.size;
}

export function abstentionAccuracy(predictedAbstain, shouldAbstain) {
  return predictedAbstain === shouldAbstain ? 1 : 0;
}

export function citationCorrectness(citations, validChunkIds) {
  if (!citations.length) return 1;
  const valid = citations.filter((c) => validChunkIds.includes(c.chunkId)).length;
  return valid / citations.length;
}

export function aggregateMetrics(results) {
  const n = results.length || 1;
  const sum = (key) => results.reduce((s, r) => s + (r[key] || 0), 0) / n;

  return {
    recallAt1: sum('recallAt1'),
    recallAt5: sum('recallAt5'),
    recallAt10: sum('recallAt10'),
    mrr: sum('mrr'),
    ndcg: sum('ndcg'),
    faithfulness: sum('faithfulness'),
    abstentionAccuracy: sum('abstentionAccuracy'),
    citationCorrectness: sum('citationCorrectness'),
    count: results.length,
  };
}
