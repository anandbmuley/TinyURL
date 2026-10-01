import React, { useState, useEffect } from 'react';
import { Link2, BarChart3, Sparkles } from 'lucide-react';
import Header from './components/Header';
import UrlShortenerForm from './components/UrlShortenerForm';
import ResultCard from './components/ResultCard';
import HistoryList from './components/HistoryList';
import AnalyticsView from './components/AnalyticsView';

const STORAGE_KEY = 'tinyurl_local_history';

export default function App() {
  const [activeTab, setActiveTab] = useState('shorten'); // 'shorten' | 'analytics'
  const [currentResult, setCurrentResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [analyticsTargetCode, setAnalyticsTargetCode] = useState('');

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const handleUrlCreated = (newUrl) => {
    setCurrentResult(newUrl);
    setHistory((prev) => {
      // Filter out duplicate if existing
      const filtered = prev.filter((item) => item.shortCode !== newUrl.shortCode);
      const updated = [newUrl, ...filtered].slice(0, 10);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Storage full or unavailable
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const handleOpenAnalytics = (code) => {
    setAnalyticsTargetCode(code);
    setActiveTab('analytics');
  };

  return (
    <div className="app-container">
      <Header />

      <section className="hero-section">
        <h1 className="hero-title">
          Shorten Links with <span className="hero-gradient-text">Lightning Speed</span>
        </h1>
        <p className="hero-subtitle">
          Clean URLs, sub-millisecond redirects, real-time analytics, and built-in 7-day automatic lifecycle expiration.
        </p>
      </section>

      <nav className="tab-nav" aria-label="Main Navigation">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'shorten' ? 'active' : ''}`}
          onClick={() => setActiveTab('shorten')}
          id="tab-shorten-btn"
        >
          <Link2 size={16} />
          <span>Shorten URL</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
          id="tab-analytics-btn"
        >
          <BarChart3 size={16} />
          <span>Click Analytics</span>
        </button>
      </nav>

      {activeTab === 'shorten' ? (
        <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <UrlShortenerForm onUrlCreated={handleUrlCreated} />

          {currentResult && (
            <ResultCard
              result={currentResult}
              onOpenAnalytics={handleOpenAnalytics}
            />
          )}

          <HistoryList
            history={history}
            onClearHistory={handleClearHistory}
            onSelectAnalytics={handleOpenAnalytics}
          />
        </main>
      ) : (
        <main>
          <AnalyticsView initialShortCode={analyticsTargetCode} />
        </main>
      )}
    </div>
  );
}
