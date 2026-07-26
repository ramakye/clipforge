import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from './api';
import './styles.css';

const POLL_MS = 3000;
const MEDIA_REFRESH_MS = 20 * 60 * 1000; // token lives 30m; refresh well before

function LoginPage({ onLogin }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');

  const submit = async () => {
    try {
      const data = await api.login(user, pass);
      onLogin(data.name);
    } catch {
      setErr('Invalid credentials');
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>CLIP<span>FORGE</span></h1>
        {err && <div className="error-msg">{err}</div>}
        <div className="field">
          <label>Username</label>
          <input value={user} onChange={(e) => setUser(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()} autoFocus />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </div>
        <button className="primary" onClick={submit} style={{ width: '100%', marginTop: 8 }}>
          Log in
        </button>
      </div>
    </div>
  );
}

function UploadArea({ onUpload }) {
  const [mode, setMode] = useState('shorts');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadVideo(file, mode);
      onUpload();
    } catch (err) {
      alert(err.message);
    }
    setUploading(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className={`upload-area ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !uploading && fileRef.current?.click()}
    >
      <h2>{uploading ? 'Uploading...' : 'Drop footage here'}</h2>
      <p>or click to browse — MP4, MKV, MOV up to 10 GB</p>
      <div className="upload-controls">
        <div className="mode-toggle">
          <button className={mode === 'shorts' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); setMode('shorts'); }}>
            Shorts
          </button>
          <button className={mode === 'trailer' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); setMode('trailer'); }}>
            Trailer
          </button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".mp4,.mkv,.mov,.avi,.webm" hidden
        onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}

function ClipCard({ clip, jobId, presets, onRefresh }) {
  const [selected, setSelected] = useState(new Set(['youtube_short']));
  const [exporting, setExporting] = useState(false);

  const toggle = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const doExport = async () => {
    if (selected.size === 0) return;
    setExporting(true);
    try {
      await api.exportClip(jobId, clip.id, Array.from(selected));
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
    setExporting(false);
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <article className={`clip ${clip.state === 'exported' ? 'exported' : ''}`}>
      <div className="clip-title">{clip.title || clip.hook || 'Untitled'}</div>

      <div className="clip-meta">
        <span>{fmt(clip.start)} – {fmt(clip.end)}</span>
        <span>{Math.round(clip.end - clip.start)}s</span>
        {clip.strength && <span style={{ color: 'var(--signal)' }}>{clip.strength}/10</span>}
        {clip.type && <span className={`clip-type ${clip.type}`}>{clip.type}</span>}
        {clip.position && <span className="clip-type mixed">{clip.position}</span>}
      </div>

      {clip.previewUrl && (
        <video controls preload="metadata" src={api.previewUrl(jobId, clip.id)} />
      )}

      {clip.hook && <div className="clip-hook">{clip.hook}</div>}
      {clip.reason && <div className="clip-reason">{clip.reason}</div>}
      {clip.edit_note && <div className="clip-edit-note">{clip.edit_note}</div>}

      <div className="presets">
        {Object.entries(presets).map(([key, p]) => (
          <span key={key} className={`chip ${selected.has(key) ? 'selected' : ''}`}
            onClick={() => toggle(key)}>{p.label}</span>
        ))}
      </div>

      <div className="clip-actions">
        <button className="primary sm" onClick={doExport}
          disabled={exporting || selected.size === 0}>
          {exporting ? 'Exporting...' : 'Export'}
        </button>
      </div>

      {clip.downloadUrls?.length > 0 && (
        <div className="downloads">
          {clip.downloadUrls.map((d) => (
            <a key={d.preset} href={api.downloadUrl(d.url.split('/').pop())}
              target="_blank" rel="noopener">
              {d.preset}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

function JobCard({ job, presets, onRefresh }) {
  const [open, setOpen] = useState(job.status === 'ready');
  const isWorking = ['queued', 'transcribing', 'extracting_frames', 'selecting', 'previewing'].includes(job.status);

  return (
    <div className="job">
      <div className="job-header" onClick={() => setOpen(!open)}>
        <div className="job-name">{job.originalName}</div>
        <span className="job-mode">{job.mode}</span>
        <span className={`job-status ${isWorking ? 'working' : ''} ${job.status === 'ready' ? 'ready' : ''} ${job.status === 'failed' ? 'failed' : ''}`}>
          {job.progress || job.status}
        </span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="job-body">
          {job.clips.length === 0 && job.status !== 'failed' && (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>
              {isWorking ? 'Processing...' : 'No clips proposed.'}
            </p>
          )}
          {job.status === 'failed' && (
            <p className="error-msg">{job.error}</p>
          )}
          <div className="clips">
            {job.clips.map((clip) => (
              <ClipCard key={clip.id} clip={clip} jobId={job.id}
                presets={presets} onRefresh={onRefresh} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(api.getToken() ? 'user' : null);
  const [jobs, setJobs] = useState([]);
  const [presets, setPresets] = useState({});

  const refresh = useCallback(async () => {
    try {
      const data = await api.getJobs();
      setJobs(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch a media token before the first poll so previews load immediately,
    // then keep it fresh on a timer.
    api.refreshMediaToken().then(refresh).catch(() => {});
    api.getPresets().then(setPresets).catch(() => {});

    const jobsTimer = setInterval(refresh, POLL_MS);
    const mediaTimer = setInterval(() => api.refreshMediaToken().catch(() => {}), MEDIA_REFRESH_MS);
    return () => { clearInterval(jobsTimer); clearInterval(mediaTimer); };
  }, [user, refresh]);

  if (!user) return <LoginPage onLogin={(name) => setUser(name)} />;

  const logout = () => { api.setToken(null); setUser(null); };

  return (
    <div className="app">
      <header>
        <div className="wordmark">CLIP<span>FORGE</span></div>
        <div className="spacer" />
        <span className="user-badge">{user}</span>
        <button className="sm" onClick={logout}>Log out</button>
      </header>

      <main>
        <UploadArea onUpload={refresh} />

        <div className="jobs-section">
          {jobs.length === 0 ? (
            <div className="empty">
              <h2>No videos yet</h2>
              <p>Upload footage above — the AI will propose clips for your review.</p>
            </div>
          ) : (
            jobs.map((job) => (
              <JobCard key={job.id} job={job} presets={presets} onRefresh={refresh} />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
