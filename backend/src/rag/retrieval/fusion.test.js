import { test, describe } from 'node:test';
import assert from 'node:assert';
import { reciprocalRankFusion } from './fusion.js';
import { recallAtK, meanReciprocalRank, ndcgAtK } from '../../../../evaluation/metrics.js';
import { fixedSizeChunk, overlappingChunk, sentenceChunk } from '../chunking/index.js';
import { normalizeQuery, isAmbiguous } from '../query/QueryProcessor.js';

describe('Reciprocal Rank Fusion', () => {
  test('merges results from multiple lists', () => {
    const bm25 = [{ chunkId: 'a', score: 0.9, source: 'bm25' }, { chunkId: 'b', score: 0.7, source: 'bm25' }];
    const vector = [{ chunkId: 'b', score: 0.95, source: 'vector' }, { chunkId: 'c', score: 0.8, source: 'vector' }];
    const fused = reciprocalRankFusion([bm25, vector]);
    assert.ok(fused.length === 3);
    assert.ok(fused[0].chunkId === 'b' || fused[0].chunkId === 'a');
    assert.ok(fused[0].rrfScore > 0);
  });
});

describe('Evaluation Metrics', () => {
  test('recall@K', () => {
    assert.strictEqual(recallAtK(['a', 'b', 'c'], ['a'], 5), 1);
    assert.strictEqual(recallAtK(['x', 'y'], ['a'], 5), 0);
  });

  test('MRR', () => {
    assert.strictEqual(meanReciprocalRank(['x', 'a', 'b'], ['a']), 0.5);
    assert.strictEqual(meanReciprocalRank(['a', 'b'], ['a']), 1);
  });

  test('nDCG', () => {
    const score = ndcgAtK(['a', 'b', 'c'], ['a', 'b'], 5);
    assert.ok(score > 0 && score <= 1);
  });
});

describe('Chunking', () => {
  test('fixed size chunking', () => {
    const text = Array(100).fill('word').join(' ');
    const chunks = fixedSizeChunk(text, { chunkSize: 20 });
    assert.ok(chunks.length > 1);
    assert.ok(chunks[0].content.length > 0);
  });

  test('overlapping chunking', () => {
    const text = Array(100).fill('word').join(' ');
    const chunks = overlappingChunk(text, { chunkSize: 20, overlap: 5 });
    assert.ok(chunks.length > 1);
  });

  test('sentence chunking', () => {
    const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
    const chunks = sentenceChunk(text, { chunkSize: 10 });
    assert.ok(chunks.length >= 1);
  });
});

describe('Query Processing', () => {
  test('normalizes query', () => {
    assert.strictEqual(normalizeQuery('  hello   world  '), 'hello world');
  });

  test('detects ambiguous queries', () => {
    assert.strictEqual(isAmbiguous('What about contractors?'), true);
    assert.strictEqual(isAmbiguous('What is the leave policy?'), false);
  });
});
