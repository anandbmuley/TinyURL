import React, { useState } from 'react';
import { Link2, Sparkles, ChevronDown, ChevronUp, AlertCircle, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { createShortUrl } from '../services/api';

export default function UrlShortenerForm({ onUrlCreated }) {
  const [url, setUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [showAlias, setShowAlias] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
      }
    } catch {
      // Ignore clipboard read permission failures
    }
  };

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#6366f1', '#8b5cf6', '#d946ef', '#38bdf8'],
      });
    } catch {
      // Confetti optional
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Please enter a destination URL');
      return;
    }

    if (!/^https?:\/\//i.test(trimmedUrl)) {
      setError('URL must start with http:// or https://');
      return;
    }

    if (customAlias && !/^[a-zA-Z0-9_-]{3,20}$/.test(customAlias)) {
      setError('Custom alias must be 3-20 characters long and contain only letters, numbers, hyphens, or underscores');
      return;
    }

    setLoading(true);
    try {
      const result = await createShortUrl(trimmedUrl, customAlias);
      triggerCelebration();
      onUrlCreated(result);
      // Reset custom alias to avoid accidental duplicate submissions
      setCustomAlias('');
    } catch (err) {
      setError(err.message || 'Failed to create short link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel form-card">
      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="original-url-input" className="form-label">
            Destination Long URL
          </label>
          <div className="input-container">
            <Link2 size={19} className="input-icon" />
            <input
              id="original-url-input"
              type="url"
              className="text-input"
              placeholder="https://example.com/very/long/destination/path..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              autoComplete="off"
            />
            <button
              type="button"
              className="paste-btn"
              onClick={handlePaste}
              title="Paste from clipboard"
            >
              Paste
            </button>
          </div>
        </div>

        <button
          type="button"
          className="alias-toggle"
          onClick={() => setShowAlias(!showAlias)}
          id="toggle-custom-alias-btn"
        >
          {showAlias ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span>{showAlias ? 'Hide Custom Alias' : 'Customize Short Link Alias'}</span>
        </button>

        {showAlias && (
          <div className="form-group" style={{ animation: 'slideUp 0.2s ease-out' }}>
            <label htmlFor="custom-alias-input" className="form-label">
              Custom Alias (Optional, 3-20 characters)
            </label>
            <div className="input-container">
              <span style={{ color: '#64748b', fontSize: '0.9rem', marginRight: '0.2rem' }}>
                http://localhost:8081/
              </span>
              <input
                id="custom-alias-input"
                type="text"
                className="text-input"
                placeholder="my-cool-link"
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
                maxLength={20}
                autoComplete="off"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          className="submit-btn"
          disabled={loading || !url.trim()}
          id="shorten-url-submit-btn"
        >
          {loading ? (
            <span>Creating Short Link...</span>
          ) : (
            <>
              <Sparkles size={18} />
              <span>Shorten URL</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
