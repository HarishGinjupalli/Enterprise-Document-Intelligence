/**
 * LLMProvider abstraction for grounded answer generation
 */

import config from '../../config/index.js';
import logger from '../../utils/logger.js';

const ABSTENTION_MESSAGE =
  "I couldn't find enough information in the provided documents to answer that question.";

const GROUNDING_PROMPT = `You are a document intelligence assistant. Answer ONLY based on the provided context.

Rules:
1. Use ONLY information from the context below
2. If the context doesn't contain enough information, respond with exactly: "${ABSTENTION_MESSAGE}"
3. Cite sources using [N] notation where N matches the chunk number
4. Never invent facts not in the context
5. Be concise and accurate

Context:
{context}

Conversation history:
{history}

User question: {question}

Answer:`;

function buildContext(chunks) {
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] Document: ${c.documentTitle || 'Unknown'} | Page: ${c.pageNumber || 'N/A'} | Section: ${c.section || 'N/A'}\n${c.content}`
    )
    .join('\n\n---\n\n');
}

class MockLLMProvider {
  constructor() {
    this.name = 'mock';
  }

  async generate(question, chunks, conversationHistory = []) {
    const start = Date.now();
    if (!chunks.length) {
      return {
        answer: ABSTENTION_MESSAGE,
        abstained: true,
        grounded: false,
        inputTokens: 100,
        outputTokens: 20,
        latencyMs: Date.now() - start,
      };
    }

    const relevant = chunks.slice(0, 3);
    const excerpt = relevant[0].content.slice(0, 300);
    const citations = relevant.map((_, i) => `[${i + 1}]`).join(' ');

    return {
      answer: `Based on the documents: ${excerpt}... ${citations}`,
      abstained: false,
      grounded: true,
      inputTokens: 500,
      outputTokens: 150,
      latencyMs: Date.now() - start,
    };
  }
}

class OpenAILLMProvider {
  constructor() {
    this.name = 'openai';
    this.model = config.openai.llmModel;
  }

  async generate(question, chunks, conversationHistory = []) {
    const start = Date.now();

    if (!chunks.length) {
      return {
        answer: ABSTENTION_MESSAGE,
        abstained: true,
        grounded: false,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - start,
      };
    }

    const context = buildContext(chunks);
    const history = conversationHistory
      .slice(-6)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const prompt = GROUNDING_PROMPT
      .replace('{context}', context)
      .replace('{history}', history || 'None')
      .replace('{question}', question);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
    const data = await response.json();
    const answer = data.choices[0].message.content.trim();
    const abstained = answer.includes(ABSTENTION_MESSAGE) || answer.startsWith("I couldn't find");

    return {
      answer,
      abstained,
      grounded: !abstained,
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
      latencyMs: Date.now() - start,
    };
  }
}

let llmInstance = null;

export function getLLMProvider() {
  if (!llmInstance) {
    if (config.openai.apiKey) {
      llmInstance = new OpenAILLMProvider();
      logger.info('Using OpenAI LLM provider');
    } else {
      llmInstance = new MockLLMProvider();
      logger.info('Using mock LLM provider');
    }
  }
  return llmInstance;
}

export { ABSTENTION_MESSAGE, buildContext };
