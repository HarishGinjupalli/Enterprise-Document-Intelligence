import { query } from '../db/connection.js';

function percentile(values, percentileRank) {
  if (!values.length) return 0;
  const index = Math.min(Math.ceil(values.length * percentileRank) - 1, values.length - 1);
  return values[index];
}

export async function getMetricsSummary(req, res, next) {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days || '30', 10), 1), 365);
    const rows = await query(
      `SELECT total_latency_ms, estimated_cost, input_tokens, output_tokens, abstained, error_code
       FROM usage_metrics
       WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       ORDER BY total_latency_ms ASC`,
      [req.user.id, days]
    );

    const latencies = rows.map((row) => Number(row.total_latency_ms || 0));
    const count = rows.length;
    const errors = rows.filter((row) => row.error_code).length;
    const abstentions = rows.filter((row) => row.abstained).length;
    const totalCost = rows.reduce((sum, row) => sum + Number(row.estimated_cost || 0), 0);
    const totalTokens = rows.reduce((sum, row) => sum + Number(row.input_tokens || 0) + Number(row.output_tokens || 0), 0);

    res.json({
      success: true,
      data: {
        periodDays: days,
        count,
        latencyMs: {
          p50: percentile(latencies, 0.5),
          p95: percentile(latencies, 0.95),
          p99: percentile(latencies, 0.99),
        },
        averageCost: count ? totalCost / count : 0,
        averageTokens: count ? totalTokens / count : 0,
        errorRate: count ? errors / count : 0,
        abstentionRate: count ? abstentions / count : 0,
      },
    });
  } catch (err) {
    next(err);
  }
}
