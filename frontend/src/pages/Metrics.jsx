export default function Metrics() {
  return (
    <div>
      <div className="page-header">
        <h2>Metrics</h2>
        <p>Observability and performance tracking</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'P50 Latency', value: '—' },
          { label: 'P95 Latency', value: '—' },
          { label: 'P99 Latency', value: '—' },
          { label: 'Avg Cost/Query', value: '—' },
          { label: 'Avg Tokens/Query', value: '—' },
          { label: 'Error Rate', value: '—' },
          { label: 'Abstention Rate', value: '—' },
        ].map((m) => (
          <div key={m.label} className="card">
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{m.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{m.value}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Metrics are tracked per-request in the usage_metrics table. Admin API endpoints for aggregated metrics will be added in a future phase.
        </p>
      </div>
    </div>
  );
}
