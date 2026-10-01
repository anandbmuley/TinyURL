const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081';

/**
 * Shorten a given long URL with optional custom alias.
 */
export async function createShortUrl(url, customAlias = '') {
  const payload = { url };
  if (customAlias && customAlias.trim().length > 0) {
    payload.customAlias = customAlias.trim();
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/urls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to shorten URL');
  }
  return data;
}

/**
 * Retrieve short URL metadata.
 */
export async function getUrlDetails(shortCode) {
  const response = await fetch(`${API_BASE_URL}/api/v1/urls/${encodeURIComponent(shortCode)}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to fetch URL details');
  }
  return data;
}

/**
 * Fetch analytics data (click count, remaining TTL, last accessed).
 */
export async function getAnalytics(shortCode) {
  const response = await fetch(`${API_BASE_URL}/api/v1/urls/${encodeURIComponent(shortCode)}/analytics`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to fetch analytics');
  }
  return data;
}

/**
 * Ping backend actuator health.
 */
export async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${API_BASE_URL}/actuator/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'UP';
  } catch {
    return false;
  }
}
