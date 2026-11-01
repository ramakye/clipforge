import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_UPLOAD_BYTES,
  classifyLoginStatus,
  fileAllowed,
  formatBytes,
  formatDuration,
  formatEta,
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
} from './format.js';

describe('login errors', () => {
  it('turns HTTP status into the three customer messages', () => {
    assert.equal(classifyLoginStatus(401), 'credentials');
    assert.equal(classifyLoginStatus(403), 'credentials');
    assert.equal(classifyLoginStatus(400), 'credentials');
    assert.equal(classifyLoginStatus(500), 'server');
    assert.equal(classifyLoginStatus(503), 'server');
    assert.equal(classifyLoginStatus(429), 'server');
    assert.match(loginCopy('credentials').title, /don't match/);
    assert.match(loginCopy('credentials').detail, /reset your password/);
    assert.match(loginCopy('network').title, /Can't reach ClipForge/);
    assert.match(loginCopy('server').title, /our side/);
    assert.match(loginCopy('missing').title, /Enter your email and password/);
  });
});

describe('titles and status', () => {
  it('makes a readable title from a file name', () => {
    assert.equal(friendlyTitle('harvest-thanksgiving-2026.mov'), 'Harvest Thanksgiving 2026');
    assert.equal(friendlyTitle('Sunday Service, 12 Oct.mp4'), 'Sunday Service, 12 Oct');
    assert.equal(friendlyTitle('my_video.WEBM'), 'My Video');
    assert.equal(friendlyTitle(''), 'Untitled video');
  });

  it('labels modes and jobs in plain words', () => {
    assert.equal(modeLabel('shorts'), 'Shorts');
    assert.equal(modeLabel('trailer'), 'Trailer');
    assert.deepEqual(jobStatus({ status: 'selecting', progress: 'SELECTING', clips: [] }), {
      label: 'Choosing clips · step 4 of 5',
      tone: 'working',
    });
    assert.deepEqual(jobStatus({ status: 'transcribing', clips: [] }), {
      label: 'Listening to the speech · step 1 of 5',
      tone: 'working',
    });
    assert.deepEqual(jobStatus({ status: 'ready', clips: [{}, {}, {}] }), {
      label: '3 clips ready',
      tone: 'ok',
    });
    assert.deepEqual(jobStatus({ status: 'ready', clips: [{}] }), {
      label: '1 clip ready',
      tone: 'ok',
    });
    assert.deepEqual(jobStatus({ status: 'ready', clips: [] }), {
      label: 'No clips yet',
      tone: 'neutral',
    });
    assert.deepEqual(jobStatus({ status: 'failed', clips: [] }), {
      label: "Couldn't process",
      tone: 'failed',
    });
    assert.equal(jobStatus({ status: 'rendering' }).label, 'Rendering');
    assert.equal(jobPercent({ progress: 42 }), 42);
    assert.equal(jobPercent({ progress: '64%' }), 64);
    assert.equal(jobPercent({ progress: 'Transcribing speech…' }), null);
  });
});

describe('sizes, times, and timecodes', () => {
  it('formats byte counts the way the upload card reads', () => {
    assert.equal(formatBytes(0), '0 B');
    assert.equal(formatBytes(900), '900 B');
    assert.equal(formatBytes(1536), '1.5 KB');
    assert.equal(formatBytes(Math.round(1.8 * 1024 ** 3)), '1.8 GB');
    assert.equal(formatBytes(Math.round(4.3 * 1024 ** 3)), '4.3 GB');
    assert.equal(MAX_UPLOAD_BYTES, 10 * 1024 ** 3);
  });

  it('estimates time left and relative updates', () => {
    assert.equal(formatEta(3), 'a few seconds left');
    assert.equal(formatEta(45), 'about 45 sec left');
    assert.equal(formatEta(180), 'about 3 min left');
    assert.equal(formatEta(3600), 'about 1 hr left');
    assert.equal(formatUpdated(1_000, 1_000), 'Updated just now');
    assert.equal(formatUpdated(0, 20_000), 'Updated 20s ago');
    assert.equal(formatUpdated(0, 120_000), 'Updated 2 min ago');
    const started = 0;
    const now = 70_000;
    const loaded = 1.8e9;
    const total = 4.3e9;
    assert.match(uploadEta(loaded, total, started, now), /min left/);
    assert.equal(uploadEta(0, total, started, now), '');
  });

  it('parses and prints trim timecodes', () => {
    assert.equal(parseTimecode('14:02.0'), 842);
    assert.equal(formatTimecode(842), '14:02.0');
    assert.equal(parseTimecode('1:02:03.5'), 3723.5);
    assert.equal(formatTimecode(3723.5), '1:02:03.5');
    assert.equal(parseTimecode('90'), 90);
    assert.equal(parseTimecode('nope'), null);
    assert.equal(parseTimecode('1:2:3:4'), null);
    assert.equal(formatDuration(42), '0:42');
    assert.equal(formatDuration(842), '14:02');
  });
});

describe('presets and files', () => {
  it('uses friendly format names and a shape', () => {
    assert.equal(presetLabel('youtube_short', {}), 'YouTube Short (9:16)');
    assert.equal(presetLabel('custom', { label: 'Youth cut' }), 'Youth cut');
    assert.equal(presetLabel('custom', { label: 'raw_key' }), 'Custom');
    assert.equal(presetShape('youtube_short', 'YouTube Short (9:16)'), 'portrait');
    assert.equal(presetShape('landscape', 'Landscape (16:9)'), 'landscape');
    assert.equal(presetShape('square', 'Square (1:1)'), 'square');
    assert.equal(presetShape('custom', 'Custom'), null);
  });

  it('accepts the formats the picker advertises', () => {
    assert.equal(fileAllowed({ name: 'talk.MP4', type: '' }), true);
    assert.equal(fileAllowed({ name: 'talk.webm', type: '' }), true);
    assert.equal(fileAllowed({ name: 'talk.avi', type: '' }), true);
    assert.equal(fileAllowed({ name: 'talk', type: 'video/quicktime' }), true);
    assert.equal(fileAllowed({ name: 'notes.pdf', type: 'application/pdf' }), false);
  });

  it('hides raw encoder errors behind a short message', () => {
    assert.equal(isTechnicalError('We could not read the audio in this file.'), false);
    assert.equal(isTechnicalError('ffmpeg stderr: Invalid data found when processing input'), true);
    assert.equal(isTechnicalError(''), false);
  });
});
