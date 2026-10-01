import React, { useEffect, useState } from 'react';
import { Link2, Activity } from 'lucide-react';
import { checkBackendHealth } from '../services/api';

export default function Header() {
  const [isBackendOnline, setIsBackendOnline] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      const online = await checkBackendHealth();
      if (isMounted) setIsBackendOnline(online);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-icon">
          <Link2 size={24} />
        </div>
        <div>
          <span className="brand-name">TinyURL</span>
        </div>
        <span className="brand-badge">Local Dev</span>
      </div>

      <div className="status-pill" title="Spring Boot Backend Service Status (:8081)">
        <span
          className={`status-dot ${
            isBackendOnline === true ? 'online pulse' : isBackendOnline === false ? 'offline' : ''
          }`}
        />
        <span>
          {isBackendOnline === null
            ? 'Checking Backend...'
            : isBackendOnline
            ? 'Backend Online'
            : 'Backend Disconnected'}
        </span>
      </div>
    </header>
  );
}
