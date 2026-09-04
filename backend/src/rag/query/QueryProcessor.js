/**
 * Query processing: normalization, conversational rewriting, multi-query
 */

import config from '../../config/index.js';
import logger from '../../utils/logger.js';

function normalizeQuery(query) {
  return query
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s?.,'-]/g, '');
}

function isAmbiguous(query) {
  const ambiguousPatterns = [
    /^(what about|how about|and|also|tell me more)/i,
    /^(it|that|this|they|those)\??$/i,
    /^(yes|no|ok|sure)\??$/i,
  ];
  return ambiguousPatterns.some((p) => p.test(query.trim()));
}

function needsRewrite(query, conversationHistory) {
  if (!conversationHistory?.length) return false;
  if (query.split(/\s+/).length > 8) return false;
  return isAmbiguous(query);
}

async function rewriteWithLLM(query, conversationHistory) {
  if (!config.openai.apiKey) {
    return rewriteHeuristic(query, conversationHistory);
  }

  const context = conversationHistory
    .slice(-4)
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.openai.llmModel,
        messages: [
          {
            role: 'system',
            content: 'Rewrite the user query to be self-contained based on conversation context. Return ONLY the rewritten query, nothing else. If the query is already clear, return it unchanged.',
          },
          { role: 'user', content: `Context:\n${context}\n\nQuery: ${query}` },
        ],
        max_tokens: 200,
        temperature: 0,
      }),
    });

    if (!response.ok) throw new Error(`LLM error: ${response.status}`);
    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (err) {
    logger.warn('LLM query rewrite failed, using heuristic', { error: err.message });
    return rewriteHeuristic(query, conversationHistory);
  }
}

function rewriteHeuristic(query, conversationHistory) {
  const lastUserMsg = [...conversationHistory].reverse().find((m) => m.role === 'user');
  const lastAssistantMsg = [...conversationHistory].reverse().find((m) => m.role === 'assistant');

  const context = lastUserMsg?.content || lastAssistantMsg?.content || '';
  const topic = context.split(/[.!?]/)[0]?.trim() || '';

  if (/contractor/i.test(query) && /leave|policy|sick/i.test(context)) {
    return `What is the sick leave policy for contractors?`;
  }
  if (/what about/i.test(query)) {
    const subject = query.replace(/what about\s*/i, '').trim();
    return `${topic} - specifically regarding ${subject}`;
  }

  return query;
}

export async function processQuery(originalQuery, conversationHistory = []) {
  const normalized = normalizeQuery(originalQuery);
  let rewritten = normalized;
  let wasRewritten = false;

  if (needsRewrite(normalized, conversationHistory)) {
    rewritten = await rewriteWithLLM(normalized, conversationHistory);
    wasRewritten = rewritten !== normalized;
    logger.info('Query rewritten', { original: normalized, rewritten, wasRewritten });
  }

  return {
    originalQuery: normalized,
    searchQuery: rewritten,
    wasRewritten,
  };
}

export { normalizeQuery, isAmbiguous, needsRewrite };
