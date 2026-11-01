// In dev, Vite proxies /api to localhost:4000.
// In production (GitHub Pages), point to your Oracle server.
import { classifyLoginStatus, loginCopy } from './format.js';

const BASE = import.meta.env.VITE_API_URL || '';
const NAME_KEY = 'cf_name';

let token = localStorage.getItem('cf_token');
let mediaToken = null; // short-lived, for <video>/<a> URLs; fetched via refreshMediaToken()

export function setSessionName(name) {
  if (name) localStorage.setItem(NAME_KEY, name);
  else localStorage.removeItem(NAME_KEY);
}

export function getSessionName() {
  return localStorage.getItem(NAME_KEY);
}

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem('cf_token', t);
  else {
    localStorage.removeItem('cf_token');
    localStorage.removeItem(NAME_KEY);
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
  let res;
  try {
    res = await fetch(`${BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    const err = new Error(loginCopy('network').title);
    err.code = 'network';
    throw err;
  }
  if (!res.ok) {
    const code = classifyLoginStatus(res.status);
    const err = new Error(loginCopy(code).title);
    err.code = code;
    throw err;
  }
  const data = await res.json();
  setToken(data.token);
  if (data.name) setSessionName(data.name);
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

/**
 * Same POST /api/jobs body as before (video + mode, bearer token).
 * Uses XHR so the dashboard can show bytes sent and support Cancel.
 */
export function uploadVideo(file, mode = 'shorts', { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('video', file);
    form.append('mode', mode);

    const fail = (error) => reject(error);

    xhr.open('POST', `${BASE}/api/jobs`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) onProgress(event.loaded, event.total);
    };
    xhr.onerror = () => {
      const err = new Error(loginCopy('network').title);
      err.code = 'network';
      fail(err);
    };
    xhr.onabort = () => {
      const err = new Error('Upload cancelled');
      err.code = 'aborted';
      fail(err);
    };
    xhr.onload = () => {
      if (xhr.status === 401) {
        setToken(null);
        window.location.reload();
        const err = new Error('Session expired');
        err.code = 'unauthorized';
        fail(err);
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        let message = xhr.statusText || 'Request failed';
        try {
          const body = JSON.parse(xhr.responseText || '{}');
          if (body.error) message = body.error;
        } catch { /* response was not JSON */ }
        const err = new Error(message);
        err.code = xhr.status >= 500 ? 'server' : 'request';
        fail(err);
        return;
      }
      try {
        resolve(xhr.responseText ? JSON.parse(xhr.responseText) : {});
      } catch {
        resolve({});
      }
    };

    if (signal) {
      if (signal.aborted) {
        const err = new Error('Upload cancelled');
        err.code = 'aborted';
        reject(err);
        return;
      }
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(form);
  });
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
