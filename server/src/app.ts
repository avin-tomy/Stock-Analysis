import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.routes.js';
import { pricesRouter } from './routes/prices.routes.js';
import { sheetRouter } from './routes/sheet.routes.js';

export const app = express();

if (env.isProduction) {
  // Most hosts (Render, Railway, Fly, etc.) terminate HTTPS at a reverse
  // proxy in front of the app, forwarding plain HTTP internally. This makes
  // Express aware the original request was secure so req.secure/req.protocol
  // reflect reality — not required for the auth cookie's Secure flag itself
  // (that's purely a browser-side, per-connection decision) but is correct
  // practice for anything else that inspects the protocol behind a proxy.
  app.set('trust proxy', 1);
}

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/prices', pricesRouter);
app.use('/api/sheet', sheetRouter);

app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

// Anything else under /api is an unknown endpoint — respond with JSON, not
// the SPA fallback below.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

if (env.isProduction) {
  // Single-service deploy: this server also serves the built frontend
  // (vite build's output, a sibling "dist" at the project root) so there's
  // one origin, one domain, and no cross-site cookie configuration needed.
  // In dev the two run separately — Vite's dev server serves the frontend
  // and proxies /api here — so this block is skipped.
  const clientDistPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist');
  app.use(express.static(clientDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}
