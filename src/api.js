// In dev, Vite proxies /api to localhost:4000.
// In production (GitHub Pages), point to your Oracle server.
const BASE = import.meta.env.VITE_API_URL || '';

let token = localStorage.getItem('cf_token');
let mediaToken = null; // short-lived, for <video>/<a> URLs; fetched via refreshMediaToken()

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem('cf_token', t);
  else {
    localStorage.removeItem('cf_token');
    mediaToken = null;
  }
}

export function getToken() {
  return token;
}

async function request(path, opts = {}) {
  const headers = { ...opts.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (opts.body && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });

  if (res.status === 401) {
    setToken(null);
    window.location.reload();
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }

  return res;
}

export async function login(username, password) {
  const res = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Invalid credentials');
  const data = await res.json();
  setToken(data.token);
  return data;
}

/**
 * Fetches a fresh short-lived media token. Media URLs (preview video, download
 * links) carry this in the query string because <video>/<a> can't send an auth
 * header. Called on load and on a timer so it never expires mid-session.
 */
export async function refreshMediaToken() {
  const res = await request('/api/media-token');
  const data = await res.json();
  mediaToken = data.token;
  return mediaToken;
}

export async function getJobs() {
  const res = await request('/api/jobs');
  return res.json();
}

export async function getJob(id) {
  const res = await request(`/api/jobs/${id}`);
  return res.json();
}

export async function uploadVideo(file, mode = 'shorts') {
  const form = new FormData();
  form.append('video', file);
  form.append('mode', mode);
  const res = await request('/api/jobs', { method: 'POST', body: form });
  return res.json();
}

export async function updateClip(jobId, clipId, patch) {
  const res = await request(`/api/jobs/${jobId}/clips/${clipId}`, {
    method: 'PATCH',
    body: patch,
  });
  return res.json();
}

export async function exportClip(jobId, clipId, presets) {
  const res = await request(`/api/jobs/${jobId}/clips/${clipId}/export`, {
    method: 'POST',
    body: { presets },
  });
  return res.json();
}

export async function getPresets() {
  const res = await request('/api/presets');
  return res.json();
}

export function previewUrl(jobId, clipId) {
  return `${BASE}/api/preview/${jobId}/${clipId}?t=${mediaToken || ''}`;
}

export function downloadUrl(filename) {
  return `${BASE}/api/download/${filename}?t=${mediaToken || ''}`;
}
