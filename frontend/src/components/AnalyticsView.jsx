import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, BarChart3, Clock, MousePointerClick, Calendar, ShieldCheck, AlertCircle, ExternalLink } from 'lucide-react';
import { getAnalytics } from '../services/api';

export default function AnalyticsView({ initialShortCode }) {
  const [shortCode, setShortCode] = useState(initialShortCode || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = async (codeToFetch) => {
    const code = (codeToFetch || shortCode).trim();
    if (!code) return;

    setLoading(true);
    setError(null);
    try {
      const stats = await getAnalytics(code);
      setData(stats);
    } catch (err) {
      setError(err.message || 'Could not fetch analytics for this code');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialShortCode) {
      setShortCode(initialShortCode);
      fetchStats(initialShortCode);
    }
  }, [initialShortCode]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchStats();
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'Never';
    return new Date(isoString).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    });
  };

  const formatRemaining = (seconds) => {
    if (seconds <= 0) return 'Expired';
    const d = Math.floor(seconds / (24 * 3600));
    const h = Math.floor((seconds % (24 * 3600)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="input-container" style={{ flex: 1 }}>
          <Search size={18} className="input-icon" />
          <input
            type="text"
            className="text-input"
            placeholder="Enter short code to inspect (e.g. abc1234 or custom-alias)..."
            value={shortCode}
            onChange={(e) => setShortCode(e.target.value)}
            id="analytics-search-input"
          />
        </div>
        <button
          type="submit"
          className="submit-btn"
          style={{ width: 'auto', padding: '0 1.5rem' }}
          disabled={loading || !shortCode.trim()}
          id="analytics-search-btn"
        >
          {loading ? 'Searching...' : 'Inspect'}
        </button>
      </form>

      {error && (
        <div className="error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {data && (
        <div style={{ animation: 'slideUp 0.3s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ffffff' }}>
                Code: <span style={{ color: '#818cf8' }}>{data.shortCode}</span>
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', wordBreak: 'break-all' }}>
                Target: {data.originalUrl}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a
                href={data.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="icon-btn"
                title="Test redirect in new tab"
              >
                <ExternalLink size={15} />
                <span>Test Link</span>
              </a>
              <button
                type="button"
                className="icon-btn"
                onClick={() => fetchStats()}
                disabled={loading}
                title="Refresh latest click count"
                id="refresh-analytics-btn"
              >
                <RefreshCw size={15} className={loading ? 'pulse' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="analytics-grid">
            <div className="metric-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="metric-label">Total Clicks</span>
                <MousePointerClick size={18} color="#6366f1" />
              </div>
              <span className="metric-value" style={{ color: '#6366f1' }}>
                {data.clickCount}
              </span>
            </div>

            <div className="metric-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="metric-label">Status</span>
                <ShieldCheck size={18} color={data.expired ? '#ef4444' : '#10b981'} />
              </div>
              <span
                className="metric-value"
                style={{
                  fontSize: '1.3rem',
                  color: data.expired ? '#ef4444' : '#10b981',
                  textTransform: 'uppercase',
                }}
              >
                {data.expired ? 'Expired' : 'Active'}
              </span>
            </div>

            <div className="metric-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="metric-label">TTL Remaining</span>
                <Clock size={18} color="#f59e0b" />
              </div>
              <span className="metric-value" style={{ fontSize: '1.3rem', color: '#f59e0b' }}>
                {formatRemaining(data.remainingSeconds)}
              </span>
            </div>

            <div className="metric-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="metric-label">Created At</span>
                <Calendar size={18} color="#94a3b8" />
              </div>
              <span style={{ fontSize: '0.92rem', color: '#e2e8f0', marginTop: '0.3rem' }}>
                {formatDateTime(data.createdAt)}
              </span>
            </div>

            <div className="metric-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="metric-label">Expires At</span>
                <Calendar size={18} color="#94a3b8" />
              </div>
              <span style={{ fontSize: '0.92rem', color: '#e2e8f0', marginTop: '0.3rem' }}>
                {formatDateTime(data.expiresAt)}
              </span>
            </div>

            <div className="metric-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="metric-label">Last Clicked</span>
                <Clock size={18} color="#94a3b8" />
              </div>
              <span style={{ fontSize: '0.92rem', color: '#e2e8f0', marginTop: '0.3rem' }}>
                {formatDateTime(data.lastAccessedAt)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
