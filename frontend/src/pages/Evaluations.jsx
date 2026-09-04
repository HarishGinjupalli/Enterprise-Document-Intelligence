export default function Evaluations() {
  return (
    <div>
      <div className="page-header">
        <h2>Evaluations</h2>
        <p>RAG retrieval and answer quality metrics</p>
      </div>
      <div className="card">
        <p style={{ color: 'var(--color-text-muted)' }}>
          Run evaluations via CLI: <code>npm run evaluate</code> in the project root.
        </p>
        <table style={{ width: '100%', marginTop: '1.5rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
              {['Metric', 'Description'].map((h) => (
                <th key={h} style={{ padding: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Recall@K', 'Fraction of expected documents retrieved in top K'],
              ['MRR', 'Mean Reciprocal Rank of first relevant result'],
              ['nDCG', 'Normalized Discounted Cumulative Gain'],
              ['Faithfulness', 'Answer supported by retrieved context'],
              ['Citation Accuracy', 'Citations point to valid chunks'],
              ['Abstention Accuracy', 'Correct abstention when evidence is insufficient'],
            ].map(([metric, desc]) => (
              <tr key={metric} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 500 }}>{metric}</td>
                <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
