import { useEffect, useState } from 'react';
import { metricsApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Metrics() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    metricsApi.summary()
      .then((res) => setMetrics(res.data.data))
      .catch((err) => setError(err.response?.data?.error?.message || 'Failed to load metrics'));
  }, []);

  if (error) return <p className="error-message">{error}</p>;
  if (!metrics) return <LoadingSpinner />;

  const values = [
    { label: 'P50 Latency', value: `${metrics.latencyMs.p50} ms` },
    { label: 'P95 Latency', value: `${metrics.latencyMs.p95} ms` },
    { label: 'P99 Latency', value: `${metrics.latencyMs.p99} ms` },
    { label: 'Avg Cost/Query', value: `$${metrics.averageCost.toFixed(4)}` },
    { label: 'Avg Tokens/Query', value: Math.round(metrics.averageTokens) },
    { label: 'Error Rate', value: `${(metrics.errorRate * 100).toFixed(1)}%` },
    { label: 'Abstention Rate', value: `${(metrics.abstentionRate * 100).toFixed(1)}%` },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Metrics</h2>
        <p>Observability and performance tracking</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {values.map((m) => (
          <div key={m.label} className="card">
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{m.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{m.value}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Based on {metrics.count} requests from the last {metrics.periodDays} days.
        </p>
      </div>
    </div>
  );
}
