import React, { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, QrCode, Clock, BarChart2 } from 'lucide-react';
import QrCodeDisplay from './QrCodeDisplay';

export default function ResultCard({ result, onOpenAnalytics }) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  // 7-day TTL countdown timer
  useEffect(() => {
    if (!result?.expiresAt) return;

    const calculateRemaining = () => {
      const now = new Date().getTime();
      const expiry = new Date(result.expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    calculateRemaining();
    const timer = setInterval(calculateRemaining, 1000);
    return () => clearInterval(timer);
  }, [result?.expiresAt]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = result.shortUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="glass-panel result-card">
      <div className="result-header">
        <span className="result-tag">Short Link Generated</span>
        <div className="ttl-badge" title="7-Day Automatic Lifecycle Retention">
          <Clock size={13} />
          <span>TTL: {timeLeft}</span>
        </div>
      </div>

      <div className="short-url-box">
        <a
          href={result.shortUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="short-url-link"
          id="generated-short-link"
        >
          {result.shortUrl}
        </a>

        <div className="action-buttons">
          <button
            type="button"
            className={`icon-btn ${copied ? 'copied' : ''}`}
            onClick={copyToClipboard}
            id="copy-link-btn"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <a
            href={result.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="icon-btn"
            id="visit-link-btn"
          >
            <ExternalLink size={16} />
            <span>Visit</span>
          </a>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setShowQr(!showQr)}
          id="toggle-qr-btn"
        >
          <QrCode size={15} />
          <span>{showQr ? 'Hide QR Code' : 'Show QR Code'}</span>
        </button>

        {onOpenAnalytics && (
          <button
            type="button"
            className="icon-btn"
            onClick={() => onOpenAnalytics(result.shortCode)}
            id="view-analytics-btn"
          >
            <BarChart2 size={15} />
            <span>View Live Analytics</span>
          </button>
        )}
      </div>

      {showQr && (
        <QrCodeDisplay url={result.shortUrl} shortCode={result.shortCode} />
      )}
    </div>
  );
}
