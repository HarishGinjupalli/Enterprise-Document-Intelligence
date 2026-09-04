import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { documentsApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function DocumentDetail() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    documentsApi.get(id)
      .then((res) => setDoc(res.data.data.document))
      .catch((err) => setError(err.response?.data?.error?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="error-message">{error}</p>;
  if (!doc) return <p>Document not found</p>;

  return (
    <div>
      <div className="page-header">
        <Link to="/documents" style={{ fontSize: '0.875rem' }}>← Back to Documents</Link>
        <h2 style={{ marginTop: '0.5rem' }}>{doc.title}</h2>
      </div>

      <div className="card">
        <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.75rem' }}>
          <dt style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>Status</dt>
          <dd>{doc.status}</dd>
          <dt style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>Filename</dt>
          <dd>{doc.filename}</dd>
          <dt style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>Pages</dt>
          <dd>{doc.page_count || '—'}</dd>
          <dt style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>Department</dt>
          <dd>{doc.department || '—'}</dd>
          <dt style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>Type</dt>
          <dd>{doc.document_type || '—'}</dd>
          <dt style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>Author</dt>
          <dd>{doc.author || '—'}</dd>
          <dt style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>Size</dt>
          <dd>{doc.file_size_bytes ? `${(doc.file_size_bytes / 1024).toFixed(1)} KB` : '—'}</dd>
          <dt style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>Created</dt>
          <dd>{new Date(doc.created_at).toLocaleString()}</dd>
        </dl>
        {doc.error_message && (
          <p className="error-message" style={{ marginTop: '1rem' }}>Error: {doc.error_message}</p>
        )}
      </div>
    </div>
  );
}
