/**
 * Citation extraction and verification
 */

import { query } from '../../db/connection.js';

export function extractCitations(answer, chunks) {
  const citationPattern = /\[(\d+)\]/g;
  const matches = [...answer.matchAll(citationPattern)];
  const citedIndices = new Set(matches.map((m) => parseInt(m[1], 10)));

  const citations = [];
  for (const idx of citedIndices) {
    const chunk = chunks[idx - 1];
    if (chunk) {
      citations.push({
        index: idx,
        chunkId: chunk.chunkId,
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        pageNumber: chunk.pageNumber,
        section: chunk.section,
        excerpt: chunk.content.slice(0, 200),
      });
    }
  }
  return citations;
}

export async function verifyCitations(answer, citations, chunks) {
  const hasEvidence = chunks.length > 0;
  const citationCorrect = citations.every((c) => c.chunkId && c.documentId);
  const citationComplete = citations.length > 0 || answer.includes("couldn't find");
  const abstained = answer.includes("couldn't find enough information");

  let allChunksExist = true;
  for (const c of citations) {
    const rows = await query('SELECT id FROM document_chunks WHERE id = ?', [c.chunkId]);
    if (!rows.length) {
      allChunksExist = false;
      break;
    }
  }

  const grounded = hasEvidence && !abstained && citationCorrect && allChunksExist;

  return {
    citation_correct: citationCorrect && allChunksExist,
    citation_complete: citationComplete,
    grounded,
    abstained,
    has_evidence: hasEvidence,
    unsupported_claims: !grounded && !abstained,
  };
}

export async function saveCitations(messageId, citations) {
  for (const c of citations) {
    await query(
      `INSERT INTO citations (id, message_id, chunk_id, document_id, citation_index, page_number, section, excerpt)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
      [messageId, c.chunkId, c.documentId, c.index, c.pageNumber, c.section, c.excerpt]
    );
  }
}
