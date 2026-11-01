/** Plain-language labels and formatters shared by the web UI. No DOM, no API. */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 * 1024;

const VIDEO_EXT = /\.(mp4|mov|mkv|avi|webm)$/i;

const PRESET_LABELS = {
  youtube_short: 'YouTube Short (9:16)',
  youtube: 'YouTube (16:9)',
  instagram_reel: 'Instagram Reel (9:16)',
  reel: 'Instagram Reel (9:16)',
  tiktok: 'TikTok (9:16)',
  landscape: 'Landscape (16:9)',
  square: 'Square (1:1)',
};

const LOGIN_COPY = {
  missing: {
    title: 'Enter your email and password.',
    detail: '',
  },
  credentials: {
    title: "That email and password don't match",
    detail: 'Check for typos, or reset your password.',
  },
  network: {
    title: "Can't reach ClipForge. Check your connection and try again.",
    detail: '',
  },
  server: {
    title: 'Something went wrong on our side. Try again in a minute.',
    detail: '',
  },
};

const JOB_STATUS = {
  queued: () => ({ label: 'Waiting to start', tone: 'working' }),
  transcribing: () => ({ label: 'Listening to the speech · step 1 of 5', tone: 'working' }),
  extracting_frames: () => ({ label: 'Looking at the video · step 2 of 5', tone: 'working' }),
  selecting: () => ({ label: 'Choosing clips · step 4 of 5', tone: 'working' }),
  previewing: () => ({ label: 'Making previews · step 5 of 5', tone: 'working' }),
  ready: (job) => {
    const count = Array.isArray(job.clips) ? job.clips.length : 0;
    if (count === 0) return { label: 'No clips yet', tone: 'neutral' };
    return { label: count === 1 ? '1 clip ready' : `${count} clips ready`, tone: 'ok' };
  },
  failed: () => ({ label: "Couldn't process", tone: 'failed' }),
};

export function loginCopy(kind) {
  return LOGIN_COPY[kind] || LOGIN_COPY.server;
}

/** 401/403/400 are wrong details. 429 and 5xx are our side. */
export function classifyLoginStatus(status) {
  if (status === 429 || status >= 500) return 'server';
  return 'credentials';
}

export function friendlyTitle(filename) {
  const base = String(filename || '')
    .replace(/\.[A-Za-z0-9]{1,5}$/, '')
    .replace(/[_]+/g, ' ')
    .replace(/[-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!base) return 'Untitled video';
  return base.replace(/\b([a-z])/g, (letter) => letter.toUpperCase());
}

export function humanize(value) {
  const text = String(value || '').replace(/[_]+/g, ' ').trim();
  if (!text) return 'Working';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function modeLabel(mode) {
  if (mode === 'shorts') return 'Shorts';
  if (mode === 'trailer') return 'Trailer';
  return friendlyTitle(String(mode || 'Video'));
}

export function jobStatus(job) {
  const status = job?.status || '';
  const known = JOB_STATUS[status];
  if (known) return known(job || {});
  return { label: humanize(status), tone: 'working' };
}

export function jobPercent(job) {
  const progress = job?.progress;
  if (typeof progress === 'number' && progress >= 0 && progress <= 100) return progress;
  if (typeof progress === 'string' && /^\d{1,3}%$/.test(progress.trim())) {
    const value = parseInt(progress, 10);
    if (value >= 0 && value <= 100) return value;
  }
  return null;
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value >= 10 ? 0 : 1;
  const rounded = Number(value.toFixed(digits));
  return `${rounded} ${units[unit]}`;
}

export function formatEta(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  const rounded = Math.round(seconds);
  if (rounded < 10) return 'a few seconds left';
  if (rounded < 60) return `about ${rounded} sec left`;
  const minutes = Math.round(rounded / 60);
  if (minutes < 60) return `about ${minutes} min left`;
  const hours = Math.round(minutes / 60);
  return `about ${hours} hr left`;
}

export function formatUpdated(then, now) {
  const delta = Math.max(0, now - then);
  if (delta < 15000) return 'Updated just now';
  if (delta < 60000) return `Updated ${Math.floor(delta / 1000)}s ago`;
  const minutes = Math.floor(delta / 60000);
  if (minutes < 60) return `Updated ${minutes} min ago`;
  return `Updated ${Math.floor(minutes / 60)} hr ago`;
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function formatTimecode(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  let remaining = seconds;
  const hours = Math.floor(remaining / 3600);
  remaining -= hours * 3600;
  const minutes = Math.floor(remaining / 60);
  const secs = remaining - minutes * 60;
  const secText = secs.toFixed(1).padStart(4, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${secText}`;
  return `${minutes}:${secText}`;
}

export function parseTimecode(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (/^\d+(\.\d+)?$/.test(text)) return roundTime(Number(text));
  const parts = text.split(':').map((part) => part.trim());
  if (parts.length < 2 || parts.length > 3) return null;
  const numbers = [];
  for (let i = 0; i < parts.length; i += 1) {
    const last = i === parts.length - 1;
    if (!(last ? /^\d+(\.\d+)?$/ : /^\d+$/).test(parts[i])) return null;
    const number = Number(parts[i]);
    if (number < 0 || (i > 0 && number >= 60)) return null;
    numbers.push(number);
  }
  if (numbers.length === 2) return roundTime(numbers[0] * 60 + numbers[1]);
  return roundTime(numbers[0] * 3600 + numbers[1] * 60 + numbers[2]);
}

function roundTime(seconds) {
  return Math.round(seconds * 1000) / 1000;
}

export function presetLabel(key, preset) {
  const fromApi = preset && (preset.label || preset.name);
  if (typeof fromApi === 'string') {
    const trimmed = fromApi.trim();
    if (trimmed && !/^[a-z0-9_]+$/.test(trimmed)) return trimmed;
  }
  if (PRESET_LABELS[key]) return PRESET_LABELS[key];
  return friendlyTitle(String(key || 'Format'));
}

/** Keep a valid choice, otherwise default to the YouTube short. */
export function nextPresetSelection(prevKeys, availableKeys) {
  const prev = new Set(prevKeys);
  const kept = availableKeys.filter((key) => prev.has(key));
  if (kept.length > 0 && kept.length === prev.size) return kept;
  if (kept.length) return kept;
  if (availableKeys.includes('youtube_short')) return ['youtube_short'];
  return availableKeys.length ? [availableKeys[0]] : [];
}

export function presetShape(key, label) {
  const blob = `${key || ''} ${label || ''}`.toLowerCase();
  if (/16:9|16\/9|landscape/.test(blob)) return 'landscape';
  if (/1:1|square/.test(blob)) return 'square';
  if (/9:16|9\/16|short|reel|tiktok|portrait/.test(blob)) return 'portrait';
  return null;
}

export function isTechnicalError(message) {
  const text = String(message || '').trim();
  if (!text) return false;
  if (text.length > 180) return true;
  return /ffmpeg|ffprobe|stderr|error:|exception|traceback|econn|etimedout|status code|\/[A-Za-z0-9._-]+\//i.test(text);
}

export function fileAllowed(file) {
  const name = file?.name || '';
  const type = file?.type || '';
  return VIDEO_EXT.test(name) || /^video\//.test(type);
}

export function uploadEta(loaded, total, startedAt, now) {
  if (!loaded || !total || loaded >= total) return '';
  const elapsed = (now - startedAt) / 1000;
  if (elapsed < 1) return '';
  return formatEta((total - loaded) / (loaded / elapsed));
}
