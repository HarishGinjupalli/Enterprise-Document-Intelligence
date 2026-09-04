import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div>
      <div className="page-header">
        <h2>Settings</h2>
        <p>Account and preferences</p>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Profile</h3>
        <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.75rem' }}>
          <dt style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>Name</dt>
          <dd>{user?.first_name} {user?.last_name}</dd>
          <dt style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>Email</dt>
          <dd>{user?.email}</dd>
          <dt style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>Role</dt>
          <dd>{user?.role}</dd>
          <dt style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>Department</dt>
          <dd>{user?.department || '—'}</dd>
        </dl>
      </div>
    </div>
  );
}
