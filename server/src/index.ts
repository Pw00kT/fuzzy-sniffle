import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import meetingsRouter from './routes/meetings.js';
import uploadRouter from './routes/upload.js';
import chatRouter from './routes/chat.js';
import { getMetrics } from './db/client.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json());

// Routes
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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: !!process.env.DATABASE_URL ? 'postgres' : 'in-memory',
    transcription: !!process.env.OPENAI_API_KEY ? 'whisper' : 'mock',
    ai: !!process.env.ANTHROPIC_API_KEY ? 'claude' : 'unavailable',
  });
});

// Serve built client in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`\n🚀 IDOT Meeting Assistant API running on http://localhost:${PORT}`);
  console.log(`   Database:      ${process.env.DATABASE_URL ? 'PostgreSQL' : 'In-Memory (no DATABASE_URL)'}`);
  console.log(`   Transcription: ${process.env.OPENAI_API_KEY ? 'Whisper API' : 'Mock (no OPENAI_API_KEY)'}`);
  console.log(`   AI:            ${process.env.ANTHROPIC_API_KEY ? 'Claude' : 'Unavailable (no ANTHROPIC_API_KEY)'}\n`);
});

export default app;
