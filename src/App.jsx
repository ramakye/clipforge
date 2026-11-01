import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as api from './api';
import {
  MAX_UPLOAD_BYTES,
  fileAllowed,
  formatBytes,
  formatDuration,
  formatTimecode,
  formatUpdated,
  friendlyTitle,
  isTechnicalError,
  jobPercent,
  jobStatus,
  loginCopy,
  modeLabel,
  parseTimecode,
  presetLabel,
  presetShape,
  uploadEta,
} from './format';
import {
  Alert,
  Button,
  Dialog,
  JobSkeleton,
  Logo,
  Pill,
  PlayIcon,
  ProgressBar,
  ToastRegion,
  useToasts,
} from './ui';
import './styles.css';

const POLL_MS = 3000;
const MEDIA_REFRESH_MS = 20 * 60 * 1000;

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash || '#/videos');
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/videos');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

function viewFromHash(hash) {
  if (hash === '#/privacy') return 'privacy';
  if (hash === '#/terms') return 'terms';
  if (hash === '#/settings') return 'settings';
  return 'videos';
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [dialog, setDialog] = useState(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const copy = error ? loginCopy(error) : null;

  const submit = async (event) => {
    event.preventDefault();
    if (pending) return;
    if (!email.trim() || !password) {
      setError('missing');
      (email.trim() ? passwordRef : emailRef).current?.focus();
      return;
    }
    setError('');
    setPending(true);
    try {
      // The field is labeled Email. The API still receives it as username.
      const data = await api.login(email.trim(), password);
      const name = (data?.name && String(data.name).trim()) || email.trim();
      api.setSessionName(name);
      onLogin(name);
    } catch (err) {
      const code = err?.code;
      setError(code === 'network' || code === 'credentials' || code === 'server' ? code : 'server');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="login-page">
      <a className="skip" href="#login-form">Skip to sign in</a>
      <section className="login-hero">
        <Logo />
        <div className="login-hero-copy">
          <h1>Your services, cut into shorts in minutes</h1>
          <p className="lede">
            Upload a recording. ClipForge finds the strongest moments, adds clean captions
            and gets them ready for YouTube, Instagram and TikTok. You approve every clip.
          </p>
          <ul>
            <li>Nothing is posted without you</li>
            <li>Shorts or a full trailer from one upload</li>
            <li>Formats for every platform</li>
          </ul>
        </div>
        <footer className="login-footer">
          <span>© {new Date().getFullYear()} ClipForge</span>
          <a href="#/privacy">Privacy</a>
          <a href="#/terms">Terms</a>
        </footer>
      </section>

      <section className="login-panel">
        <form id="login-form" className="login-form" onSubmit={submit} noValidate aria-busy={pending || undefined}>
          <h2>Sign in</h2>
          {copy && (
            <Alert id="login-error" title={copy.title}>
              {error === 'credentials' ? (
                <>
                  Check for typos, or{' '}
                  <button type="button" className="link" onClick={() => setDialog('forgot')}>reset your password</button>.
                </>
              ) : copy.detail || null}
            </Alert>
          )}

          <div className={`field${error ? ' has-error' : ''}`}>
            <label htmlFor="email">Email</label>
            <input
              ref={emailRef}
              id="email"
              className="text-input"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              value={email}
              disabled={pending}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? 'login-error' : undefined}
              onChange={(event) => { setEmail(event.target.value); setError(''); }}
              autoFocus
            />
          </div>

          <div className={`field password-field${error ? ' has-error' : ''}`}>
            <label htmlFor="password">Password</label>
            <button type="button" className="link forgot" onClick={() => setDialog('forgot')}>
              Forgot password?
            </button>
            <div className="password-wrap">
              <input
                ref={passwordRef}
                id="password"
                className="text-input"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                disabled={pending}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? 'login-error' : undefined}
                onChange={(event) => { setPassword(event.target.value); setError(''); }}
              />
              <button
                type="button"
                className="show-toggle"
                aria-pressed={showPassword}
                aria-controls="password"
                onClick={() => setShowPassword((shown) => !shown)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <Button variant="primary" type="submit" block disabled={pending}>
            {pending && <span className="spinner" aria-hidden="true" />}
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className="fine-print">
            New to ClipForge?{' '}
            <button type="button" className="link" onClick={() => setDialog('access')}>Request access</button>
          </p>
        </form>

        <Dialog
          open={dialog === 'forgot'}
          title="Forgot password?"
          onClose={() => setDialog(null)}
        >
          Password reset isn’t available in this app yet. If you’re locked out, ask the person who gave you access to help you sign in.
        </Dialog>
        <Dialog
          open={dialog === 'access'}
          title="Request access"
          onClose={() => setDialog(null)}
        >
          ClipForge accounts are opened by request. There isn’t a sign-up form in this app yet. Ask the person who gave you this link to add you.
        </Dialog>
      </section>
    </div>
  );
}

function LegalPage({ kind, embedded }) {
  const terms = kind === 'terms';
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, [kind]);

  const article = (
    <article className="prose">
      <h1 className="page-title" ref={heading} tabIndex={-1}>{terms ? 'Terms' : 'Privacy'}</h1>
      {terms ? (
        <>
          <p>ClipForge is for people with an account. You choose which clips to export, and nothing is posted to YouTube, Instagram, or TikTok unless you post it yourself.</p>
          <p>This is a short summary. Full terms will be published with the public launch.</p>
        </>
      ) : (
        <>
          <p>ClipForge keeps the videos you upload so you can review clips and download exports. Nothing is posted to YouTube, Instagram, or TikTok from here. You approve every clip.</p>
          <p>This is a short summary. A full privacy policy will be published with the public launch.</p>
        </>
      )}
      <p><a href={embedded ? '#/videos' : '#/'}>{embedded ? 'Back to videos' : 'Back to sign in'}</a></p>
    </article>
  );

  if (embedded) return article;
  return (
    <div className="legal-standalone">
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar"><Logo href="#/" /></header>
      <main className="main" id="main">{article}</main>
    </div>
  );
}

function Header({ user, view, onLogout }) {
  return (
    <header className="topbar">
      <Logo href="#/videos" />
      <nav className="nav" aria-label="Primary">
        <a href="#/videos" aria-current={view === 'videos' ? 'page' : undefined}>Videos</a>
        <a href="#/settings" aria-current={view === 'settings' ? 'page' : undefined}>Settings</a>
      </nav>
      <div className="spacer" />
      <div className="account">
        <span className="user-name">{user}</span>
        <Button variant="secondary" onClick={onLogout}>Sign out</Button>
      </div>
    </header>
  );
}

function SettingsPage({ user, onLogout }) {
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return (
    <div className="settings">
      <h1 className="page-title" ref={heading} tabIndex={-1}>Settings</h1>
      <section className="card">
        <h2>Account</h2>
        <p>Signed in as {user}.</p>
        <div><Button variant="secondary" onClick={onLogout}>Sign out</Button></div>
      </section>
      <section className="card">
        <h2>This web app</h2>
        <p>Upload a recording, review the clips ClipForge finds, trim the start and end, and export the formats you want. Nothing is posted unless you post it.</p>
        <p>Caption style and outros aren’t available here yet.</p>
      </section>
    </div>
  );
}

const UploadArea = forwardRef(function UploadArea({ onUploaded, onToast, upload, setUpload, abortRef, silentAbort }, ref) {
  const [mode, setMode] = useState(() => {
    try {
      return sessionStorage.getItem('cf_mode') === 'trailer' ? 'trailer' : 'shorts';
    } catch {
      return 'shorts';
    }
  });
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const [now, setNow] = useState(() => Date.now());
  const fileRef = useRef(null);
  const zoneRef = useRef(null);
  const busy = upload?.phase === 'uploading' || upload?.phase === 'finishing';

  useEffect(() => {
    try { sessionStorage.setItem('cf_mode', mode); } catch { /* private mode */ }
  }, [mode]);

  useEffect(() => {
    if (!busy) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [busy]);

  const handleFile = async (file) => {
    if (!file) return;
    if (busy) {
      onToast({
        tone: 'error',
        title: 'An upload is already in progress',
        detail: 'Cancel it before choosing another file.',
      });
      return;
    }
    const startedAt = Date.now();
    const base = { name: file.name, loaded: 0, total: file.size || 0, startedAt, error: '' };
    if (!fileAllowed(file)) {
      setUpload({ ...base, phase: 'error', error: 'Use an MP4, MOV, MKV, AVI, or WEBM file.' });
      return;
    }
    if (!file.size) {
      setUpload({ ...base, phase: 'error', error: 'That file is empty.' });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUpload({ ...base, phase: 'error', error: 'That file is over 10 GB. Export a smaller file and try again.' });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setUpload({ ...base, phase: 'uploading' });
    try {
      await api.uploadVideo(file, mode, {
        signal: controller.signal,
        onProgress: (loaded, total) => {
          setUpload((current) => {
            if (!current || current.phase === 'error') return current;
            return {
              ...current,
              loaded,
              total,
              phase: loaded >= total ? 'finishing' : 'uploading',
            };
          });
        },
      });
      setUpload(null);
      onToast({
        tone: 'success',
        title: 'Upload complete',
        detail: 'Finding clips runs on our side now. You can close this tab.',
      });
      onUploaded();
    } catch (err) {
      if (err?.code === 'aborted') {
        setUpload(null);
        if (!silentAbort.current) {
          onToast({ tone: 'info', title: 'Upload cancelled', detail: file.name });
        }
        silentAbort.current = false;
        return;
      }
      setUpload({
        ...base,
        phase: 'error',
        error: err?.message || 'Couldn’t upload that file.',
      });
    }
  };

  useImperativeHandle(ref, () => ({
    pick(nextMode) {
      if (busy) {
        onToast({
          tone: 'error',
          title: 'An upload is already in progress',
          detail: 'Cancel it before choosing another file.',
        });
        return;
      }
      if (nextMode === 'shorts' || nextMode === 'trailer') setMode(nextMode);
      zoneRef.current?.scrollIntoView({ block: 'center' });
      fileRef.current?.click();
    },
  }));

  const onDrop = (event) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  let card = (
    <>
      <p className="kicker">Upload</p>
      <p className="upload-name">Nothing uploading</p>
      <p className="upload-note">Drop a video on the left, or choose a file. Keep this tab open until the upload finishes.</p>
    </>
  );

  if (upload?.phase === 'error') {
    card = (
      <>
        <p className="kicker">Upload</p>
        <Alert title="Couldn’t upload">{upload.error}</Alert>
        <p className="upload-note">Choose another file, or drop one on the left.</p>
      </>
    );
  } else if (busy && upload) {
    const pct = upload.total ? Math.min(100, Math.round((upload.loaded / upload.total) * 100)) : null;
    const eta = upload.phase === 'uploading' ? uploadEta(upload.loaded, upload.total, upload.startedAt, now) : '';
    const meta = upload.phase === 'finishing' || pct == null
      ? 'Finishing upload…'
      : `${formatBytes(upload.loaded)} of ${formatBytes(upload.total)} · ${pct}%${eta ? ` · ${eta}` : ''}`;
    card = (
      <>
        <p className="kicker">Uploading</p>
        <p className="upload-name">{upload.name}</p>
        <ProgressBar value={upload.phase === 'finishing' ? 100 : pct} label={meta} />
        <div className="upload-meta">
          <span>{meta}</span>
          <button type="button" className="link" onClick={() => abortRef.current?.abort()}>Cancel</button>
        </div>
        <p className="upload-note">
          Keep this tab open until the upload finishes. Processing then runs on our side and you can close the tab.
        </p>
      </>
    );
  }

  return (
    <div className="upload-row">
      <div
        ref={zoneRef}
        className={`dropzone${dragging ? ' dragging' : ''}`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (busy) return;
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => { event.preventDefault(); }}
        onDragLeave={() => {
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) {
            dragDepth.current = 0;
            setDragging(false);
          }
        }}
        onDrop={onDrop}
      >
        <h2>{busy ? 'Upload in progress' : 'Drop a video to upload'}</h2>
        <p className="drop-hint" id="upload-hint">MP4, MOV, MKV, AVI or WEBM · up to 10 GB</p>
        <div className="mode-toggle" role="group" aria-label="What should ClipForge make?">
          <button type="button" aria-pressed={mode === 'shorts'} disabled={busy} onClick={() => setMode('shorts')}>Shorts</button>
          <button type="button" aria-pressed={mode === 'trailer'} disabled={busy} onClick={() => setMode('trailer')}>Trailer</button>
        </div>
        <Button variant="primary" disabled={busy} aria-describedby="upload-hint" onClick={() => fileRef.current?.click()}>
          Choose a file
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".mp4,.mkv,.mov,.avi,.webm,video/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) handleFile(file);
          }}
        />
      </div>
      <section className="upload-card" aria-label="Upload progress">
        {card}
      </section>
    </div>
  );
});

function downloadHref(entry) {
  if (!entry?.url) return '';
  return api.downloadUrl(entry.url.split('/').pop());
}

function ClipCard({ clip, index, jobId, presets, onRefresh, onToast }) {
  const [selected, setSelected] = useState(() => new Set());
  const [exporting, setExporting] = useState(false);
  const [startText, setStartText] = useState(() => formatTimecode(Number(clip.start)));
  const [endText, setEndText] = useState(() => formatTimecode(Number(clip.end)));
  const [trimError, setTrimError] = useState('');
  const [saving, setSaving] = useState(false);
  const startRef = useRef(null);
  const endRef = useRef(null);
  const presetEntries = presets && typeof presets === 'object' && !Array.isArray(presets)
    ? Object.entries(presets)
    : [];
  const exported = clip.state === 'exported' || (clip.downloadUrls?.length > 0);
  const title = clip.title || clip.hook || 'Untitled clip';
  const titleId = `clip-title-${jobId}-${clip.id}`;
  const trimErrorId = `trim-${jobId}-${clip.id}`;
  const hasTrim = Number.isFinite(Number(clip.start)) && Number.isFinite(Number(clip.end));

  useEffect(() => {
    const keys = presetEntries.map(([key]) => key);
    if (!keys.length) return;
    setSelected((prev) => {
      const kept = [...prev].filter((key) => keys.includes(key));
      if (kept.length === prev.size && kept.every((key) => prev.has(key))) return prev;
      if (kept.length) return new Set(kept);
      if (keys.includes('youtube_short')) return new Set(['youtube_short']);
      return new Set([keys[0]]);
    });
  }, [presets]);

  useEffect(() => {
    if (document.activeElement === startRef.current || document.activeElement === endRef.current) return;
    setStartText(formatTimecode(Number(clip.start)));
    setEndText(formatTimecode(Number(clip.end)));
  }, [clip.start, clip.end]);

  const toggle = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const doExport = async () => {
    if (selected.size === 0 || exporting) return;
    setExporting(true);
    try {
      const result = await api.exportClip(jobId, clip.id, Array.from(selected));
      onRefresh();
      const count = selected.size;
      const list = result?.downloadUrls || result?.downloads;
      const href = Array.isArray(list) ? downloadHref(list[0]) : '';
      onToast({
        tone: 'success',
        title: 'Export ready',
        detail: `${title} · ${count} format${count === 1 ? '' : 's'}`,
        href,
        hrefLabel: 'Download',
      });
    } catch (err) {
      onToast({
        tone: 'error',
        title: 'Couldn’t export',
        detail: err?.message || 'Try the export again in a moment.',
      });
    } finally {
      setExporting(false);
    }
  };

  const commitTrim = async () => {
    const start = parseTimecode(startText);
    const end = parseTimecode(endText);
    if (start == null || end == null) {
      setTrimError('Use a time like 14:02.0.');
      return;
    }
    if (end <= start) {
      setTrimError('End time needs to be after the start.');
      return;
    }
    if (Math.abs(start - Number(clip.start)) < 0.05 && Math.abs(end - Number(clip.end)) < 0.05) {
      setTrimError('');
      return;
    }
    setSaving(true);
    setTrimError('');
    try {
      await api.updateClip(jobId, clip.id, { start, end });
      onRefresh();
    } catch (err) {
      setTrimError(err?.message || 'Couldn’t save that trim.');
      setStartText(formatTimecode(Number(clip.start)));
      setEndText(formatTimecode(Number(clip.end)));
    } finally {
      setSaving(false);
    }
  };

  const meta = [];
  if (hasTrim) {
    meta.push(`${formatDuration(Number(clip.start))}–${formatDuration(Number(clip.end))}`);
    meta.push(formatDuration(Number(clip.end) - Number(clip.start)));
  }
  if (clip.strength) meta.push(`strength ${clip.strength}/10`);
  if (clip.type) meta.push(String(clip.type));
  if (clip.position) meta.push(String(clip.position));

  const count = selected.size;
  const exportLabel = exporting
    ? 'Exporting…'
    : count === 0
      ? 'Select a format'
      : `Export ${count} format${count === 1 ? '' : 's'}`;
  const showHook = clip.hook && clip.hook !== title;

  return (
    <article className={`clip${exported ? ' exported' : ''}`} aria-labelledby={titleId}>
      <div className={`clip-preview tone-${index % 3}`}>
        {clip.previewUrl ? (
          <video controls preload="metadata" src={api.previewUrl(jobId, clip.id)} aria-label={`${title} preview`} />
        ) : (
          <>
            <div className="play-glyph"><PlayIcon /></div>
            <p className="sr-only">No preview yet</p>
          </>
        )}
      </div>
      <h4 className="clip-title" id={titleId}>{title}</h4>
      {meta.length > 0 && <p className="clip-meta">{meta.join(' · ')}</p>}
      {showHook && <p className="clip-hook">“{String(clip.hook).replace(/^["“]|["”]$/g, '')}”</p>}
      {clip.reason && <p className="clip-note">{clip.reason}</p>}
      {clip.edit_note && <p className="clip-note">{clip.edit_note}</p>}

      {hasTrim && (
        <div className="trims">
          <div>
            <label htmlFor={`${trimErrorId}-start`}>Start</label>
            <input
              ref={startRef}
              id={`${trimErrorId}-start`}
              className="text-input"
              inputMode="decimal"
              value={startText}
              disabled={saving}
              aria-invalid={trimError ? 'true' : undefined}
              aria-describedby={trimError ? trimErrorId : undefined}
              onChange={(event) => setStartText(event.target.value)}
              onBlur={commitTrim}
              onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
            />
          </div>
          <div>
            <label htmlFor={`${trimErrorId}-end`}>End</label>
            <input
              ref={endRef}
              id={`${trimErrorId}-end`}
              className="text-input"
              inputMode="decimal"
              value={endText}
              disabled={saving}
              aria-invalid={trimError ? 'true' : undefined}
              aria-describedby={trimError ? trimErrorId : undefined}
              onChange={(event) => setEndText(event.target.value)}
              onBlur={commitTrim}
              onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
            />
          </div>
        </div>
      )}
      {trimError && <p className="field-message" id={trimErrorId} role="alert">{trimError}</p>}
      {saving && <p className="field-hint">Saving…</p>}

      <div className="presets" role="group" aria-label={`Formats for ${title}`}>
        {presetEntries.map(([key, preset]) => {
          const label = presetLabel(key, preset);
          const shape = presetShape(key, label);
          return (
            <button
              key={key}
              type="button"
              className="chip"
              aria-pressed={selected.has(key)}
              onClick={() => toggle(key)}
            >
              {shape && <span className={`chip-shape ${shape}`} aria-hidden="true" />}
              {label}
            </button>
          );
        })}
      </div>
      {presetEntries.length === 0 && <p className="field-hint">Formats appear here when ClipForge is ready to export.</p>}

      {exported && <div className="exported-banner">✓ Exported</div>}
      {clip.downloadUrls?.length > 0 && (
        <div className="downloads">
          {clip.downloadUrls.map((item) => {
            const href = downloadHref(item);
            if (!href) return null;
            return (
              <a key={item.preset || item.url} href={href} target="_blank" rel="noopener">
                <span aria-hidden="true">↓ </span>
                {presetLabel(item.preset, presets?.[item.preset])}
              </a>
            );
          })}
        </div>
      )}

      <Button
        variant={exported ? 'secondary' : 'primary'}
        block
        onClick={doExport}
        disabled={exporting || count === 0}
        aria-busy={exporting || undefined}
      >
        {exporting && <span className="spinner" aria-hidden="true" />}
        {exportLabel}
      </Button>
    </article>
  );
}

function FailedNote({ job, onRetry }) {
  const raw = String(job.error || '').trim();
  const technical = isTechnicalError(raw);
  const summary = !raw || technical ? 'We couldn’t process this video.' : raw;
  const [copyNote, setCopyNote] = useState('');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopyNote('Copied');
    } catch {
      setCopyNote('Select the details above and copy them.');
    }
  };

  return (
    <div className="job-error">
      <p>
        {summary}{' '}
        <button type="button" className="link" onClick={() => onRetry(job)}>Try again</button>
      </p>
      {technical && raw && (
        <details className="details">
          <summary>Show details</summary>
          <pre>{raw}</pre>
          <Button variant="secondary" size="sm" onClick={copy}>{copyNote === 'Copied' ? 'Copied' : 'Copy'}</Button>
          {copyNote && copyNote !== 'Copied' && <p className="field-hint">{copyNote}</p>}
        </details>
      )}
    </div>
  );
}

function JobCard({ job, presets, onRefresh, onToast, onRetry }) {
  const [open, setOpen] = useState(job.status === 'ready');
  const prevStatus = useRef(job.status);
  const panelId = `job-${job.id}`;
  const status = jobStatus(job);
  const percent = jobPercent(job);
  const working = ['queued', 'transcribing', 'extracting_frames', 'selecting', 'previewing'].includes(job.status);
  const clips = Array.isArray(job.clips) ? job.clips : [];
  const title = friendlyTitle(job.originalName);

  useEffect(() => {
    if (prevStatus.current !== 'ready' && job.status === 'ready') setOpen(true);
    prevStatus.current = job.status;
  }, [job.status]);

  return (
    <article className={`job${job.status === 'failed' ? ' failed' : ''}${open ? ' open' : ''}`}>
      <h3>
        <button
          type="button"
          className="job-header"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="job-thumb" aria-hidden="true"><PlayIcon /></span>
          <span className="job-name" title={job.originalName || title}>{title}</span>
          <span className="job-pills">
            <Pill>{modeLabel(job.mode)}</Pill>
            <Pill tone={status.tone}>{status.label}</Pill>
          </span>
          <span className="chevron" aria-hidden="true">{open ? '▲' : '▼'}</span>
        </button>
      </h3>
      {working && percent != null && (
        <div className="job-progress">
          <ProgressBar value={percent} label={status.label} />
        </div>
      )}
      {job.status === 'failed' && <FailedNote job={job} onRetry={onRetry} />}
      {open && (
        <div className="job-body" id={panelId}>
          {job.originalName && <p className="file-name">{job.originalName}</p>}
          {clips.length === 0 && job.status !== 'failed' && (
            <p className="job-empty">
              {working
                ? 'ClipForge is still working on this video.'
                : 'No strong moments found in this video.'}
            </p>
          )}
          {clips.length > 0 && (
            <div className="clips">
              {clips.map((clip, index) => (
                <ClipCard
                  key={clip.id}
                  clip={clip}
                  index={index}
                  jobId={job.id}
                  presets={presets}
                  onRefresh={onRefresh}
                  onToast={onToast}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function Dashboard({ onToast, uploadRef, upload, setUpload, abortRef, silentAbort }) {
  const [jobs, setJobs] = useState([]);
  const [presets, setPresets] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [announcement, setAnnouncement] = useState('');

  const refresh = useCallback(async () => {
    try {
      const data = await api.getJobs();
      if (!Array.isArray(data)) throw new Error('Unexpected response');
      setJobs(data);
      setOffline(false);
      setLastUpdated(Date.now());
    } catch (err) {
      if (err?.message === 'Session expired') return;
      setOffline(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  const loadPresets = useCallback(async () => {
    try {
      const data = await api.getPresets();
      if (data && typeof data === 'object') setPresets(data);
    } catch { /* the connection banner covers a dead API */ }
  }, []);

  useEffect(() => {
    api.refreshMediaToken().then(refresh).catch(() => refresh());
    loadPresets();
    const jobsTimer = setInterval(refresh, POLL_MS);
    const mediaTimer = setInterval(() => api.refreshMediaToken().catch(() => {}), MEDIA_REFRESH_MS);
    const clock = setInterval(() => setNow(Date.now()), 15000);
    return () => {
      clearInterval(jobsTimer);
      clearInterval(mediaTimer);
      clearInterval(clock);
    };
  }, [refresh, loadPresets]);

  useEffect(() => {
    if (!loaded) return;
    const summary = jobs.map((job) => `${friendlyTitle(job.originalName)}: ${jobStatus(job).label}`).join('. ');
    setAnnouncement(summary);
  }, [jobs, loaded]);

  return (
    <>
      <p className="sr-only" aria-live="polite">{announcement}</p>
      {offline && <Alert tone="warn" title="Lost connection, retrying…" />}
      <UploadArea
        ref={uploadRef}
        upload={upload}
        setUpload={setUpload}
        abortRef={abortRef}
        silentAbort={silentAbort}
        onUploaded={refresh}
        onToast={onToast}
      />
      <div className="section-head">
        <h2 id="videos-heading">Your videos</h2>
        {lastUpdated && <p className="updated">{formatUpdated(lastUpdated, now)}</p>}
      </div>
      {!loaded ? (
        <div className="stack" aria-busy="true">
          <p className="sr-only">Loading your videos</p>
          <JobSkeleton />
          <JobSkeleton />
          <JobSkeleton />
        </div>
      ) : jobs.length === 0 ? (
        <div className="empty">
          <h3>{offline ? 'We couldn’t load your videos' : 'No videos yet'}</h3>
          <p>
            {offline
              ? 'Your list will show here once the connection is back.'
              : 'Upload a recording above. We’ll suggest clips for you to review. Nothing is posted.'}
          </p>
        </div>
      ) : (
        <div className="stack">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              presets={presets}
              onRefresh={refresh}
              onToast={onToast}
              onRetry={(item) => uploadRef.current?.pick(item.mode)}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(() => (api.getToken() ? (api.getSessionName() || 'Signed in') : null));
  const hash = useHash();
  const view = viewFromHash(hash);
  const { toasts, push, dismiss } = useToasts();
  const uploadRef = useRef(null);
  const abortRef = useRef(null);
  const silentAbort = useRef(false);
  const [upload, setUpload] = useState(null);

  useEffect(() => {
    let title = 'ClipForge';
    if (!user) title = view === 'privacy' ? 'Privacy · ClipForge' : view === 'terms' ? 'Terms · ClipForge' : 'Sign in · ClipForge';
    else if (view === 'settings') title = 'Settings · ClipForge';
    else if (view === 'privacy') title = 'Privacy · ClipForge';
    else if (view === 'terms') title = 'Terms · ClipForge';
    document.title = title;
  }, [user, view]);

  const logout = () => {
    if (upload?.phase === 'uploading' || upload?.phase === 'finishing') {
      silentAbort.current = true;
      abortRef.current?.abort();
    }
    api.setToken(null);
    setUser(null);
    setUpload(null);
    if (window.location.hash && window.location.hash !== '#/') {
      window.location.hash = '#/';
    }
  };

  if (!user && (view === 'privacy' || view === 'terms')) {
    return <LegalPage kind={view} />;
  }

  if (!user) return <LoginPage onLogin={setUser} />;

  return (
    <div className="shell">
      <a className="skip" href="#main">Skip to content</a>
      <Header user={user} view={view} onLogout={logout} />
      <main className="main" id="main">
        <div hidden={view !== 'videos'}>
          <Dashboard
            onToast={push}
            uploadRef={uploadRef}
            upload={upload}
            setUpload={setUpload}
            abortRef={abortRef}
            silentAbort={silentAbort}
          />
        </div>
        {view === 'settings' && <SettingsPage user={user} onLogout={logout} />}
        {(view === 'privacy' || view === 'terms') && <LegalPage kind={view} embedded />}
      </main>
      <ToastRegion toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
