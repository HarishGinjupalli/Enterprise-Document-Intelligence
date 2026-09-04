import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { documentsApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const STATUS_BADGE = {
  UPLOADED: 'badge-info',
  PROCESSING: 'badge-warning',
  INDEXED: 'badge-success',
  FAILED: 'badge-error',
};

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [search, setSearch] = useState('');
  const fileRef = useRef(null);

  const fetchDocuments = async () => {
    try {
      const res = await documentsApi.list({ search: search || undefined });
      setDocuments(res.data.data.documents);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, [search]);

  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === 'PROCESSING' || d.status === 'UPLOADED');
    if (!hasProcessing) return;
    const interval = setInterval(fetchDocuments, 3000);
    return () => clearInterval(interval);
  }, [documents]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace('.pdf', ''));

    setUploading(true);
    setUploadProgress(0);
    try {
      await documentsApi.upload(formData, (ev) => {
        if (ev.total) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      });
      await fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return;
    try {
      await documentsApi.delete(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Delete failed');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Documents</h2>
          <p>Upload and manage PDF documents</p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".pdf" onChange={handleUpload} style={{ display: 'none' }} />
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? `Uploading ${uploadProgress}%` : '+ Upload PDF'}
          </button>
        </div>
      </div>

      {error && <p className="error-message" style={{ marginBottom: '1rem' }}>{error}</p>}

      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      {documents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>No documents yet. Upload a PDF to get started.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '0.875rem 1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Title</th>
                <th style={{ padding: '0.875rem 1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Status</th>
                <th style={{ padding: '0.875rem 1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Pages</th>
                <th style={{ padding: '0.875rem 1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Created</th>
                <th style={{ padding: '0.875rem 1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <Link to={`/documents/${doc.id}`}>{doc.title}</Link>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span className={`badge ${STATUS_BADGE[doc.status] || 'badge-info'}`}>{doc.status}</span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>{doc.page_count || '—'}</td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleDelete(doc.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
