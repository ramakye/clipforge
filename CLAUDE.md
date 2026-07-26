# ClipForge UI

React SPA frontend for ClipForge. Hosted on GitHub Pages at `ramakye.github.io/clipforge`. Talks to the API backend via `VITE_API_URL`.

## Commands

```
npm install
npm run dev                    # local dev with Vite (proxies /api to localhost:4000)
VITE_API_URL=https://your-server.com npm run build   # production build
npm run deploy                 # build + push to gh-pages branch
```

## Structure

Single-file app: `src/App.jsx` has all components. `src/api.js` handles auth and API calls. `src/styles.css` has the design system matching the desktop ClipForge branding.

Components: LoginPage, UploadArea, JobCard, ClipCard. State flows down from App. Jobs are polled every 3 seconds.

## Rules

- All API calls go through `src/api.js`. Never fetch directly from components.
- Token stored in localStorage. Auto-logout on 401.
- No state management library. useState + polling. Only add complexity when polling becomes a problem (it won't at this scale).
- Matches the ClipForge desktop design: dark background, Barlow Condensed headings, crimson accent, IBM Plex body and mono.

## Deploy

Set `VITE_API_URL` to the Oracle server's public URL before building:

```
VITE_API_URL=https://clipforge-api.example.com npm run deploy
```

The `homepage` field in package.json and `base` in vite.config.js are set for `ramakye.github.io/clipforge`.
