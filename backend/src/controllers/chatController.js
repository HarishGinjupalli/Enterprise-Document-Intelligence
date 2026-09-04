import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../db/connection.js';
import { getAccessibleDocumentIds } from '../services/userService.js';
import { processQuery } from '../rag/query/QueryProcessor.js';
import { hybridRetrieve } from '../rag/retrieval/HybridRetriever.js';
import { getLLMProvider } from '../rag/generation/LLMProvider.js';
import { extractCitations, verifyCitations, saveCitations } from '../rag/citations/CitationService.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const TOKEN_COST_PER_1K = { input: 0.00015, output: 0.0006 };

function estimateCost(inputTokens, outputTokens) {
  return (inputTokens / 1000) * TOKEN_COST_PER_1K.input + (outputTokens / 1000) * TOKEN_COST_PER_1K.output;
}

export async function chat(req, res, next) {
  const startTime = Date.now();
  const requestId = req.requestId;

  try {
    const { message, conversationId, filters = {} } = req.body;
    if (!message?.trim()) throw new AppError('Message is required', 400, 'VALIDATION_ERROR');

    const userId = req.user.id;
    let convId = conversationId;

    if (!convId) {
      convId = uuidv4();
      await query('INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)', [
        convId, userId, message.slice(0, 100),
      ]);
    } else {
      const conv = await query('SELECT id FROM conversations WHERE id = ? AND user_id = ?', [convId, userId]);
      if (!conv.length) throw new AppError('Conversation not found', 404, 'NOT_FOUND');
    }

    const historyRows = await query(
      'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 20',
      [convId]
    );

    const userMessageId = uuidv4();
    await query('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)', [
      userMessageId, convId, 'user', message,
    ]);

    const { originalQuery, searchQuery, wasRewritten } = await processQuery(message, historyRows);

    const accessibleDocIds = await getAccessibleDocumentIds(userId);
    const authFilters = {
      ...filters,
      documentIds: accessibleDocIds,
    };

    const queryId = uuidv4();
    await query(
      `INSERT INTO queries (id, user_id, conversation_id, original_query, rewritten_query, query_rewritten, filters)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [queryId, userId, convId, originalQuery, wasRewritten ? searchQuery : null, wasRewritten, JSON.stringify(authFilters)]
    );

    const retrieval = await hybridRetrieve(searchQuery, authFilters);
    const llm = getLLMProvider();
    const generation = await llm.generate(searchQuery, retrieval.results, historyRows);

    const citations = extractCitations(generation.answer, retrieval.results);
    const verification = await verifyCitations(generation.answer, citations, retrieval.results);

    const assistantMessageId = uuidv4();
    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO messages (id, conversation_id, role, content, query_rewritten, rewritten_query, abstained, grounded, metadata)
         VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?, ?)`,
        [
          assistantMessageId, convId, generation.answer, wasRewritten,
          wasRewritten ? searchQuery : null, generation.abstained, verification.grounded,
          JSON.stringify({ verification, retrieval: retrieval.metadata }),
        ]
      );

      if (citations.length) {
        for (const c of citations) {
          await conn.execute(
            `INSERT INTO citations (id, message_id, chunk_id, document_id, citation_index, page_number, section, excerpt, verified)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), assistantMessageId, c.chunkId, c.documentId, c.index, c.pageNumber, c.section, c.excerpt, verification.citation_correct]
          );
        }
      }
    });

    const totalLatencyMs = Date.now() - startTime;

    await query(
      `INSERT INTO usage_metrics (id, request_id, user_id, query_id, endpoint, input_tokens, output_tokens,
        estimated_cost, bm25_latency_ms, vector_latency_ms, rerank_latency_ms, llm_latency_ms,
        total_latency_ms, abstained, citation_valid)
       VALUES (?, ?, ?, ?, '/chat', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), requestId, userId, queryId,
        generation.inputTokens, generation.outputTokens,
        estimateCost(generation.inputTokens, generation.outputTokens),
        retrieval.metadata.bm25LatencyMs, retrieval.metadata.vectorLatencyMs,
        retrieval.metadata.rerankLatencyMs, generation.latencyMs,
        totalLatencyMs, generation.abstained, verification.citation_correct,
      ]
    );

    res.json({
      success: true,
      data: {
        conversationId: convId,
        messageId: assistantMessageId,
        answer: generation.answer,
        citations: citations.map((c) => ({
          index: c.index,
          documentId: c.documentId,
          documentTitle: c.documentTitle,
          pageNumber: c.pageNumber,
          section: c.section,
          excerpt: c.excerpt,
        })),
        abstained: generation.abstained,
        grounded: verification.grounded,
        queryRewritten: wasRewritten,
        rewrittenQuery: wasRewritten ? searchQuery : null,
        verification,
        retrieval: {
          bm25Count: retrieval.metadata.bm25Count,
          vectorCount: retrieval.metadata.vectorCount,
          rerankedCount: retrieval.metadata.rerankedCount,
        },
        usage: {
          inputTokens: generation.inputTokens,
          outputTokens: generation.outputTokens,
          estimatedCost: estimateCost(generation.inputTokens, generation.outputTokens),
        },
        latencyMs: totalLatencyMs,
      },
    });
  } catch (err) {
    logger.error('Chat error', { requestId, error: err.message });
    next(err);
  }
}

export async function getConversations(req, res, next) {
  try {
    const rows = await query(
      'SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ success: true, data: { conversations: rows } });
  } catch (err) {
    next(err);
  }
}

export async function getConversationMessages(req, res, next) {
  try {
    const conv = await query('SELECT id FROM conversations WHERE id = ? AND user_id = ?', [
      req.params.id, req.user.id,
    ]);
    if (!conv.length) throw new AppError('Conversation not found', 404, 'NOT_FOUND');

    const messages = await query(
      'SELECT id, role, content, abstained, grounded, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );

    for (const msg of messages) {
      if (msg.role === 'assistant') {
        msg.citations = await query(
          `SELECT c.citation_index, c.page_number, c.section, c.excerpt, d.title AS document_title, d.id AS document_id
           FROM citations c JOIN documents d ON d.id = c.document_id WHERE c.message_id = ?`,
          [msg.id]
        );
      }
    }

    res.json({ success: true, data: { messages } });
  } catch (err) {
    next(err);
  }
}

export async function submitFeedback(req, res, next) {
  try {
    const { messageId, rating, feedbackText, hallucinationReport } = req.body;
    if (!['HELPFUL', 'NOT_HELPFUL'].includes(rating)) {
      throw new AppError('Invalid rating', 400, 'VALIDATION_ERROR');
    }

    await query(
      `INSERT INTO feedback (id, message_id, user_id, rating, feedback_text, hallucination_report)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), feedback_text = VALUES(feedback_text)`,
      [uuidv4(), messageId, req.user.id, rating, feedbackText || null, hallucinationReport || false]
    );

    res.json({ success: true, message: 'Feedback submitted' });
  } catch (err) {
    next(err);
  }
}
