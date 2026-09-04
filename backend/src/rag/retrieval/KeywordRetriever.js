/**
 * KeywordRetriever - BM25-style keyword search using MySQL FULLTEXT
 */

import { query } from '../../db/connection.js';
import logger from '../../utils/logger.js';

class MySQLKeywordRetriever {
  constructor() {
    this.name = 'mysql_fulltext';
  }

  /**
   * @param {string} searchQuery
   * @param {Object} filters - { documentIds, department, documentType, tags }
   * @param {number} topK
   */
  async search(searchQuery, filters = {}, topK = 20) {
    const start = Date.now();
    const terms = searchQuery.trim();
    if (!terms) return [];

    let sql = `
      SELECT dc.id, dc.document_id, dc.chunk_index, dc.page_number, dc.section,
             dc.content, dc.token_count,
             MATCH(dc.content) AGAINST(? IN NATURAL LANGUAGE MODE) AS score,
             d.title AS document_title, d.department, d.document_type
      FROM document_chunks dc
      JOIN documents d ON d.id = dc.document_id
      WHERE d.status = 'INDEXED' AND d.deleted_at IS NULL
        AND MATCH(dc.content) AGAINST(? IN NATURAL LANGUAGE MODE)
    `;
    const params = [terms, terms];

    if (filters.documentIds?.length) {
      sql += ` AND dc.document_id IN (${filters.documentIds.map(() => '?').join(',')})`;
      params.push(...filters.documentIds);
    }
    if (filters.department) {
      sql += ' AND d.department = ?';
      params.push(filters.department);
    }
    if (filters.documentType) {
      sql += ' AND d.document_type = ?';
      params.push(filters.documentType);
    }

    sql += ' ORDER BY score DESC LIMIT ?';
    params.push(topK);

    try {
      const rows = await query(sql, params);
      const latencyMs = Date.now() - start;
      logger.debug('BM25 search completed', { results: rows.length, latencyMs });

      return rows.map((row, idx) => ({
        chunkId: row.id,
        documentId: row.document_id,
        chunkIndex: row.chunk_index,
        pageNumber: row.page_number,
        section: row.section,
        content: row.content,
        tokenCount: row.token_count,
        score: parseFloat(row.score) || 0,
        rank: idx + 1,
        source: 'bm25',
        documentTitle: row.document_title,
        metadata: { department: row.department, documentType: row.document_type },
      }));
    } catch (err) {
      logger.warn('FULLTEXT search failed, falling back to LIKE', { error: err.message });
      return this.fallbackSearch(terms, filters, topK);
    }
  }

  async fallbackSearch(terms, filters, topK) {
    let sql = `
      SELECT dc.id, dc.document_id, dc.chunk_index, dc.page_number, dc.section,
             dc.content, dc.token_count, d.title AS document_title
      FROM document_chunks dc
      JOIN documents d ON d.id = dc.document_id
      WHERE d.status = 'INDEXED' AND d.deleted_at IS NULL
        AND dc.content LIKE ?
    `;
    const params = [`%${terms}%`];

    if (filters.documentIds?.length) {
      sql += ` AND dc.document_id IN (${filters.documentIds.map(() => '?').join(',')})`;
      params.push(...filters.documentIds);
    }

    sql += ' LIMIT ?';
    params.push(topK);

    const rows = await query(sql, params);
    return rows.map((row, idx) => ({
      chunkId: row.id,
      documentId: row.document_id,
      chunkIndex: row.chunk_index,
      pageNumber: row.page_number,
      section: row.section,
      content: row.content,
      tokenCount: row.token_count,
      score: 1 / (idx + 1),
      rank: idx + 1,
      source: 'bm25',
      documentTitle: row.document_title,
      metadata: {},
    }));
  }
}

let retrieverInstance = null;

export function getKeywordRetriever() {
  if (!retrieverInstance) {
    retrieverInstance = new MySQLKeywordRetriever();
  }
  return retrieverInstance;
}

export { MySQLKeywordRetriever };
