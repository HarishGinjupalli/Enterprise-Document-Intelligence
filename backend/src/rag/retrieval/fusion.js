/**
 * Reciprocal Rank Fusion (RRF) for hybrid retrieval
 */

const DEFAULT_K = 60;

export function reciprocalRankFusion(resultLists, { k = DEFAULT_K } = {}) {
  const scores = new Map();

  for (const results of resultLists) {
    for (let rank = 0; rank < results.length; rank++) {
      const item = results[rank];
      const id = item.chunkId || item.id;
      const rrfScore = 1 / (k + rank + 1);
      const existing = scores.get(id) || { item, score: 0, sources: [] };
      existing.score += rrfScore;
      existing.sources.push(item.source || 'unknown');
      scores.set(id, existing);
    }
  }

  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .map((entry, idx) => ({
      ...entry.item,
      rrfScore: entry.score,
      fusionRank: idx + 1,
      sources: [...new Set(entry.sources)],
    }));
}

export function deduplicateByChunkId(results) {
  const seen = new Set();
  return results.filter((r) => {
    const id = r.chunkId || r.id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
