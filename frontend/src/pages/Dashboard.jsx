import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  const stats = [
    { label: 'Documents', value: '—', icon: '📄' },
    { label: 'Conversations', value: '—', icon: '💬' },
    { label: 'Queries Today', value: '—', icon: '🔍' },
    { label: 'Avg Latency', value: '—', icon: '⚡' },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Welcome, {user?.first_name}</h2>
        <p>Enterprise Document Intelligence Dashboard</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map((s) => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{s.value}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Quick Start</h3>
        <ol style={{ paddingLeft: '1.25rem', color: 'var(--color-text-muted)', lineHeight: 2 }}>
          <li>Upload PDF documents from the <strong>Documents</strong> page</li>
          <li>Wait for indexing to complete (status: INDEXED)</li>
          <li>Ask questions in the <strong>Chat</strong> interface</li>
          <li>Review citations and grounding indicators</li>
          <li>Run evaluations to measure retrieval quality</li>
        </ol>
      </div>
    </div>
  );
}
