import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import { query, transaction } from '../db/connection.js';
import { chunkDocument, CHUNKING_STRATEGIES } from '../rag/chunking/index.js';
import { getEmbeddingProvider } from '../rag/embeddings/EmbeddingProvider.js';
import { getVectorStore } from '../rag/vector/VectorStore.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

const jobQueue = [];
let processing = false;

export async function createDocument({ ownerId, title, filename, filePath, fileSize, mimeType, metadata = {} }) {
  const id = uuidv4();
  await query(
    `INSERT INTO documents (id, owner_id, title, filename, file_path, file_size_bytes, mime_type,
      document_type, department, author, tags, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UPLOADED')`,
    [
      id, ownerId, title, filename, filePath, fileSize, mimeType,
      metadata.documentType || null,
      metadata.department || null,
      metadata.author || null,
      metadata.tags ? JSON.stringify(metadata.tags) : null,
    ]
  );
  return getDocumentById(id);
}

export async function getDocumentById(id) {
  const rows = await query(
    `SELECT id, owner_id, title, filename, file_size_bytes, mime_type, document_type,
      department, author, tags, status, error_message, page_count, created_at, updated_at
     FROM documents WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  if (rows[0]?.tags && typeof rows[0].tags === 'string') {
    try { rows[0].tags = JSON.parse(rows[0].tags); } catch { /* keep as string */ }
  }
  return rows[0] || null;
}

export async function listDocuments(userId, { page = 1, limit = 20, status, search } = {}) {
  const offset = (page - 1) * limit;
  let whereSql = `
    FROM documents d
    LEFT JOIN document_permissions dp ON d.id = dp.document_id AND dp.user_id = ?
    WHERE d.deleted_at IS NULL
      AND (d.owner_id = ? OR dp.user_id = ? OR EXISTS (
        SELECT 1 FROM users u WHERE u.id = ? AND u.role = 'ADMIN'
      ))
  `;
  const params = [userId, userId, userId, userId];

  if (status) {
    whereSql += ' AND d.status = ?';
    params.push(status);
  }
  if (search) {
    whereSql += ' AND (d.title LIKE ? OR d.filename LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const countRows = await query(`SELECT COUNT(DISTINCT d.id) AS total ${whereSql}`, params);
  const rows = await query(`
    SELECT d.id, d.title, d.filename, d.status, d.document_type, d.department,
           d.page_count, d.file_size_bytes, d.created_at, d.updated_at
    ${whereSql}
    ORDER BY d.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const total = Number(countRows[0]?.total || 0);
  return { documents: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function deleteDocument(id, userId) {
  const doc = await getDocumentById(id);
  if (!doc) return false;
  if (doc.owner_id !== userId) {
    const admin = await query('SELECT role FROM users WHERE id = ?', [userId]);
    if (admin[0]?.role !== 'ADMIN') return false;
  }

  await query('UPDATE documents SET deleted_at = NOW() WHERE id = ?', [id]);

  const chunks = await query('SELECT id FROM document_chunks WHERE document_id = ?', [id]);
  if (chunks.length) {
    const vectorStore = getVectorStore();
    await vectorStore.delete(chunks.map((c) => c.id));
  }
  return true;
}

export function enqueueIngestion(documentId, options = {}) {
  jobQueue.push({ documentId, options });
  processQueue();
}

async function processQueue() {
  if (processing || jobQueue.length === 0) return;
  processing = true;

  while (jobQueue.length > 0) {
    const job = jobQueue.shift();
    try {
      await ingestDocument(job.documentId, job.options);
    } catch (err) {
      logger.error('Ingestion job failed', { documentId: job.documentId, error: err.message });
      await query(
        "UPDATE documents SET status = 'FAILED', error_message = ? WHERE id = ?",
        [err.message, job.documentId]
      );
    }
  }

  processing = false;
}

async function ingestDocument(documentId, options = {}) {
  const strategy = options.chunkingStrategy || CHUNKING_STRATEGIES.OVERLAPPING;
  const chunkSize = options.chunkSize || 512;
  const chunkOverlap = options.chunkOverlap || 64;

  await query("UPDATE documents SET status = 'PROCESSING' WHERE id = ?", [documentId]);
  logger.info('Starting document ingestion', { documentId, strategy });

  const doc = await query('SELECT * FROM documents WHERE id = ?', [documentId]);
  if (!doc[0]) throw new Error('Document not found');

  const fileBuffer = await fs.readFile(doc[0].file_path);
  const pdfData = await pdfParse(fileBuffer);

  const pages = [{ pageNumber: 1, text: pdfData.text }];
  const pageCount = pdfData.numpages || 1;

  const chunks = chunkDocument(pdfData.text, strategy, { chunkSize, chunkOverlap, pageNumber: 1 });

  const versionId = uuidv4();
  const embedder = getEmbeddingProvider();
  const vectorStore = getVectorStore();

  const texts = chunks.map((c) => c.content);
  const { embeddings, totalTokens } = await embedder.embedBatch(texts);

  await transaction(async (conn) => {
    await conn.execute(
      `INSERT INTO document_versions (id, document_id, version_number, chunking_strategy, chunk_size, chunk_overlap, total_chunks, total_tokens)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?)`,
      [versionId, documentId, strategy, chunkSize, chunkOverlap, chunks.length, totalTokens]
    );

    const vectorItems = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = uuidv4();
      const chunk = chunks[i];
      await conn.execute(
        `INSERT INTO document_chunks (id, document_id, version_id, chunk_index, page_number, section, content, token_count, embedding_id, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          chunkId, documentId, versionId, chunk.chunkIndex, chunk.pageNumber,
          chunk.section, chunk.content, chunk.tokenCount, chunkId,
          JSON.stringify(chunk.metadata),
        ]
      );
      vectorItems.push({
        id: chunkId,
        embedding: embeddings[i],
        metadata: { documentId, chunkIndex: chunk.chunkIndex, pageNumber: chunk.pageNumber },
      });
    }

    await vectorStore.upsert(vectorItems);

    await conn.execute(
      "UPDATE documents SET status = 'INDEXED', page_count = ?, error_message = NULL WHERE id = ?",
      [pageCount, documentId]
    );
  });

  logger.info('Document ingestion completed', { documentId, chunks: chunks.length, tokens: totalTokens });
}

export { processQueue };
