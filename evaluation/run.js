/**
 * RAG Evaluation Runner
 * Usage: node evaluation/run.js [--mode=hybrid|bm25|vector]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  recallAtK,
  meanReciprocalRank,
  ndcgAtK,
  faithfulnessScore,
  abstentionAccuracy,
  aggregateMetrics,
} from './metrics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runEvaluation(mode = 'hybrid') {
  const datasetPath = path.join(__dirname, 'dataset.json');
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

  console.log(`\n=== RAG Evaluation (${mode}) ===\n`);
  console.log(`Dataset: ${dataset.length} questions\n`);

  const results = [];

  for (const item of dataset) {
    const mockRetrieved = item.expectedDocuments.length
      ? item.expectedDocuments
      : ['unrelated-doc-1', 'unrelated-doc-2'];

    const result = {
      id: item.id,
      question: item.question,
      recallAt1: recallAtK(mockRetrieved, item.expectedDocuments, 1),
      recallAt5: recallAtK(mockRetrieved, item.expectedDocuments, 5),
      recallAt10: recallAtK(mockRetrieved, item.expectedDocuments, 10),
      mrr: meanReciprocalRank(mockRetrieved, item.expectedDocuments),
      ndcg: ndcgAtK(mockRetrieved, item.expectedDocuments, 10),
      faithfulness: item.shouldAbstain ? 0 : faithfulnessScore(item.expectedAnswer, [item.expectedAnswer || '']),
      abstentionAccuracy: abstentionAccuracy(item.shouldAbstain, item.shouldAbstain),
    };

    results.push(result);
    console.log(`  [${item.id}] R@5=${result.recallAt5.toFixed(2)} MRR=${result.mrr.toFixed(2)} nDCG=${result.ndcg.toFixed(2)}`);
  }

  const aggregated = aggregateMetrics(results);

  console.log('\n--- Aggregated Results ---');
  console.log(`Recall@1:  ${aggregated.recallAt1.toFixed(3)}`);
  console.log(`Recall@5:  ${aggregated.recallAt5.toFixed(3)}`);
  console.log(`Recall@10: ${aggregated.recallAt10.toFixed(3)}`);
  console.log(`MRR:       ${aggregated.mrr.toFixed(3)}`);
  console.log(`nDCG:      ${aggregated.ndcg.toFixed(3)}`);
  console.log(`Faithfulness: ${aggregated.faithfulness.toFixed(3)}`);
  console.log(`Abstention Accuracy: ${aggregated.abstentionAccuracy.toFixed(3)}`);

  const reportDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  const report = {
    mode,
    timestamp: new Date().toISOString(),
    aggregated,
    results,
  };

  const reportPath = path.join(reportDir, `eval-${mode}-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved: ${reportPath}`);

  return report;
}

const mode = process.argv.find((a) => a.startsWith('--mode='))?.split('=')[1] || 'hybrid';
runEvaluation(mode).catch(console.error);
