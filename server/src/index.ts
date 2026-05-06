import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import meetingsRouter from './routes/meetings.js';
import uploadRouter from './routes/upload.js';
import chatRouter from './routes/chat.js';
import settingsRouter from './routes/settings.js';
import { getMetrics } from './db/client.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json());

// ─── Public endpoints (no auth required) ─────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: process.env.DATABASE_URL ? 'postgres' : 'in-memory',
    transcription: process.env.OPENAI_API_KEY ? 'whisper' : 'mock',
    ai: process.env.ANTHROPIC_API_KEY ? 'claude' : 'unavailable',
    authRequired: !!process.env.AUTH_TOKEN,
  });
});

app.post('/api/auth/verify', (req, res) => {
  const { token } = req.body;
  const authToken = process.env.AUTH_TOKEN;
  if (!authToken) return res.json({ ok: true, disabled: true });
  if (token === authToken) return res.json({ ok: true });
  res.status(401).json({ ok: false, error: 'Invalid token' });
});

// ─── Protected routes ─────────────────────────────────────────────────────────

app.use('/api', authMiddleware);

app.get('/api/metrics', async (_req, res) => {
  try {
    res.json(await getMetrics());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

app.use('/api/meetings', meetingsRouter);
app.use('/api/meetings', chatRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/settings', settingsRouter);

// ─── Production static serving ────────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`\n🚀 IDOT Sidecar API running on http://localhost:${PORT}`);
  console.log(`   Database:      ${process.env.DATABASE_URL ? 'PostgreSQL' : 'In-Memory'}`);
  console.log(`   Transcription: ${process.env.OPENAI_API_KEY ? 'Whisper API' : 'Mock'}`);
  console.log(`   AI:            ${process.env.ANTHROPIC_API_KEY ? 'Claude' : 'Unavailable (no key)'}`);
  console.log(`   Auth:          ${process.env.AUTH_TOKEN ? 'Enabled' : 'Disabled (no AUTH_TOKEN)'}\n`);
});

export default app;
