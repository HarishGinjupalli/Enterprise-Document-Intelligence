import { useState, useRef, useEffect } from 'react';
import { chatApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

function CitationBadge({ citation }) {
  return (
    <a
      href={`/documents/${citation.documentId}`}
      className="badge badge-info"
      style={{ cursor: 'pointer', marginRight: '0.5rem', marginTop: '0.25rem', display: 'inline-block' }}
      title={`${citation.documentTitle} - Page ${citation.pageNumber || 'N/A'}`}
    >
      [{citation.index}] {citation.documentTitle} p.{citation.pageNumber || '?'}
    </a>
  );
}

function Message({ msg, onFeedback }) {
  const isUser = msg.role === 'user';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '1rem',
    }}>
      <div style={{
        maxWidth: '75%',
        padding: '1rem',
        borderRadius: 'var(--radius)',
        background: isUser ? 'var(--color-primary)' : 'var(--color-surface)',
        color: isUser ? 'white' : 'var(--color-text)',
        border: isUser ? 'none' : '1px solid var(--color-border)',
      }}>
        <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>

        {!isUser && (
          <>
            {msg.abstained && (
              <span className="badge badge-warning" style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                Abstained — insufficient evidence
              </span>
            )}
            {msg.grounded && (
              <span className="badge badge-success" style={{ marginTop: '0.5rem', marginLeft: '0.5rem', display: 'inline-block' }}>
                Grounded
              </span>
            )}
            {msg.citations?.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                {msg.citations.map((c) => (
                  <CitationBadge key={c.citation_index} citation={{
                    index: c.citation_index,
                    documentId: c.document_id,
                    documentTitle: c.document_title,
                    pageNumber: c.page_number,
                  }} />
                ))}
              </div>
            )}
            {msg.metadata && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {msg.metadata.latencyMs && `${msg.metadata.latencyMs}ms`}
                {msg.metadata.usage && ` · $${msg.metadata.usage.estimatedCost?.toFixed(4)}`}
              </div>
            )}
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => onFeedback(msg.id || msg.messageId, 'HELPFUL')}>👍</button>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => onFeedback(msg.id || msg.messageId, 'NOT_HELPFUL')}>👎</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await chatApi.send({ message: userMsg.content, conversationId });
      const data = res.data.data;
      setConversationId(data.conversationId);

      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.answer,
        abstained: data.abstained,
        grounded: data.grounded,
        citations: data.citations,
        messageId: data.messageId,
        metadata: { latencyMs: data.latencyMs, usage: data.usage, retrieval: data.retrieval },
      }]);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (messageId, rating) => {
    if (!messageId) return;
    try {
      await chatApi.feedback({ messageId, rating });
    } catch { /* ignore */ }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)' }}>
      <div className="page-header">
        <h2>Chat</h2>
        <p>Ask questions about your documents</p>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {messages.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
              Start a conversation by asking a question about your indexed documents.
            </p>
          )}
          {messages.map((msg, i) => (
            <Message key={i} msg={msg} onFeedback={handleFeedback} />
          ))}
          {loading && <LoadingSpinner size={20} />}
          {error && <p className="error-message">{error}</p>}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} style={{ borderTop: '1px solid var(--color-border)', padding: '1rem', display: 'flex', gap: '0.75rem' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            style={{ flex: 1 }}
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
