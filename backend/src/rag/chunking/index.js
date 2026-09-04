/**
 * ChunkingStrategy interface - pluggable chunking system
 * Each strategy implements: chunk(text, options) => Chunk[]
 */

export const CHUNKING_STRATEGIES = {
  FIXED: 'fixed',
  OVERLAPPING: 'overlapping',
  SENTENCE: 'sentence',
  PARAGRAPH: 'paragraph',
  STRUCTURE_AWARE: 'structure_aware',
};

/**
 * @typedef {Object} Chunk
 * @property {string} content
 * @property {number} chunkIndex
 * @property {number|null} pageNumber
 * @property {string|null} section
 * @property {number} tokenCount
 * @property {Object} metadata
 */

function estimateTokens(text) {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

function splitIntoSentences(text) {
  return text.match(/[^.!?]+[.!?]+/g) || [text];
}

function splitIntoParagraphs(text) {
  return text.split(/\n\s*\n/).filter((p) => p.trim());
}

/** Fixed-size chunking without overlap */
export function fixedSizeChunk(text, { chunkSize = 512, pageNumber = null, section = null } = {}) {
  const words = text.split(/\s+/);
  const chunks = [];
  let idx = 0;

  for (let i = 0; i < words.length; i += chunkSize) {
    const content = words.slice(i, i + chunkSize).join(' ');
    if (!content.trim()) continue;
    chunks.push({
      content: content.trim(),
      chunkIndex: idx++,
      pageNumber,
      section,
      tokenCount: estimateTokens(content),
      metadata: { strategy: CHUNKING_STRATEGIES.FIXED, startWord: i },
    });
  }
  return chunks;
}

/** Overlapping fixed-size chunking */
export function overlappingChunk(text, { chunkSize = 512, overlap = 64, pageNumber = null, section = null } = {}) {
  const words = text.split(/\s+/);
  const chunks = [];
  let idx = 0;
  const step = Math.max(1, chunkSize - overlap);

  for (let i = 0; i < words.length; i += step) {
    const content = words.slice(i, i + chunkSize).join(' ');
    if (!content.trim()) continue;
    chunks.push({
      content: content.trim(),
      chunkIndex: idx++,
      pageNumber,
      section,
      tokenCount: estimateTokens(content),
      metadata: { strategy: CHUNKING_STRATEGIES.OVERLAPPING, startWord: i, overlap },
    });
  }
  return chunks;
}

/** Sentence-based chunking - groups sentences up to chunkSize tokens */
export function sentenceChunk(text, { chunkSize = 512, pageNumber = null, section = null } = {}) {
  const sentences = splitIntoSentences(text);
  const chunks = [];
  let buffer = [];
  let bufferTokens = 0;
  let idx = 0;

  for (const sentence of sentences) {
    const tokens = estimateTokens(sentence);
    if (bufferTokens + tokens > chunkSize && buffer.length > 0) {
      const content = buffer.join(' ').trim();
      chunks.push({
        content,
        chunkIndex: idx++,
        pageNumber,
        section,
        tokenCount: bufferTokens,
        metadata: { strategy: CHUNKING_STRATEGIES.SENTENCE },
      });
      buffer = [];
      bufferTokens = 0;
    }
    buffer.push(sentence.trim());
    bufferTokens += tokens;
  }

  if (buffer.length > 0) {
    const content = buffer.join(' ').trim();
    chunks.push({
      content,
      chunkIndex: idx,
      pageNumber,
      section,
      tokenCount: bufferTokens,
      metadata: { strategy: CHUNKING_STRATEGIES.SENTENCE },
    });
  }
  return chunks;
}

/** Paragraph-based chunking */
export function paragraphChunk(text, { maxParagraphs = 3, pageNumber = null, section = null } = {}) {
  const paragraphs = splitIntoParagraphs(text);
  const chunks = [];
  let idx = 0;

  for (let i = 0; i < paragraphs.length; i += maxParagraphs) {
    const group = paragraphs.slice(i, i + maxParagraphs);
    const content = group.join('\n\n').trim();
    if (!content) continue;
    chunks.push({
      content,
      chunkIndex: idx++,
      pageNumber,
      section,
      tokenCount: estimateTokens(content),
      metadata: { strategy: CHUNKING_STRATEGIES.PARAGRAPH, paragraphStart: i },
    });
  }
  return chunks;
}

/** Structure-aware chunking - respects headings and sections */
export function structureAwareChunk(pages, { chunkSize = 512 } = {}) {
  const chunks = [];
  let idx = 0;

  for (const page of pages) {
    const { pageNumber, text, sections = [] } = page;

    if (sections.length > 0) {
      for (const sec of sections) {
        const subChunks = overlappingChunk(sec.content, {
          chunkSize,
          overlap: 64,
          pageNumber,
          section: sec.title,
        });
        for (const c of subChunks) {
          chunks.push({ ...c, chunkIndex: idx++, metadata: { ...c.metadata, strategy: CHUNKING_STRATEGIES.STRUCTURE_AWARE } });
        }
      }
    } else if (text) {
      const subChunks = overlappingChunk(text, { chunkSize, overlap: 64, pageNumber });
      for (const c of subChunks) {
        chunks.push({ ...c, chunkIndex: idx++, metadata: { ...c.metadata, strategy: CHUNKING_STRATEGIES.STRUCTURE_AWARE } });
      }
    }
  }
  return chunks;
}

export function getChunkingStrategy(name) {
  const strategies = {
    [CHUNKING_STRATEGIES.FIXED]: fixedSizeChunk,
    [CHUNKING_STRATEGIES.OVERLAPPING]: overlappingChunk,
    [CHUNKING_STRATEGIES.SENTENCE]: sentenceChunk,
    [CHUNKING_STRATEGIES.PARAGRAPH]: paragraphChunk,
    [CHUNKING_STRATEGIES.STRUCTURE_AWARE]: structureAwareChunk,
  };
  const fn = strategies[name];
  if (!fn) throw new Error(`Unknown chunking strategy: ${name}`);
  return fn;
}

export function chunkDocument(textOrPages, strategyName = CHUNKING_STRATEGIES.OVERLAPPING, options = {}) {
  const strategy = getChunkingStrategy(strategyName);
  if (strategyName === CHUNKING_STRATEGIES.STRUCTURE_AWARE) {
    return strategy(textOrPages, options);
  }
  const text = typeof textOrPages === 'string' ? textOrPages : textOrPages.map((p) => p.text).join('\n\n');
  return strategy(text, options);
}
