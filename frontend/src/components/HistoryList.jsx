import React, { useState } from 'react';
import { Copy, Check, ExternalLink, BarChart2, Trash2 } from 'lucide-react';

export default function HistoryList({ history, onClearHistory, onSelectAnalytics }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  if (!history || history.length === 0) return null;

  const handleCopy = async (url, idx) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Fallback
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  return (
    <div className="history-section">
      <div className="history-header">
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#cbd5e1' }}>
          Recent Short Links ({history.length})
        </h3>
        <button
          type="button"
          className="icon-btn"
          onClick={onClearHistory}
          style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem' }}
          title="Clear recent link history"
        >
          <Trash2 size={13} />
          <span>Clear</span>
        </button>
      </div>

      <div>
        {history.map((item, idx) => (
          <div key={item.shortCode || idx} className="history-item">
            <div style={{ minWidth: 0, flex: 1, paddingRight: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <a
                  href={item.shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#38bdf8',
                    fontWeight: '700',
                    fontSize: '0.98rem',
                    textDecoration: 'none',
                  }}
                >
                  {item.shortUrl}
                </a>
                {item.customAlias && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      padding: '0.1rem 0.4rem',
                      background: 'rgba(99, 102, 241, 0.2)',
                      color: '#a5b4fc',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      fontWeight: '700',
                    }}
                  >
                    Custom
                  </span>
                )}
              </div>
              <p
                style={{
                  color: '#64748b',
                  fontSize: '0.82rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginTop: '0.2rem',
                }}
              >
                {item.originalUrl}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                className={`icon-btn ${copiedIndex === idx ? 'copied' : ''}`}
                onClick={() => handleCopy(item.shortUrl, idx)}
                style={{ padding: '0.4rem 0.65rem' }}
                title="Copy short link"
              >
                {copiedIndex === idx ? <Check size={14} /> : <Copy size={14} />}
              </button>

              <a
                href={item.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="icon-btn"
                style={{ padding: '0.4rem 0.65rem' }}
                title="Visit link"
              >
                <ExternalLink size={14} />
              </a>

              <button
                type="button"
                className="icon-btn"
                onClick={() => onSelectAnalytics(item.shortCode)}
                style={{ padding: '0.4rem 0.65rem' }}
                title="View Analytics"
              >
                <BarChart2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
