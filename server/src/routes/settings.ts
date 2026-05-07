import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

function settingsFile() {
  return process.env.USER_DATA_PATH
    ? path.join(process.env.USER_DATA_PATH, 'settings.json')
    : null
}

// GET /api/settings
router.get('/', (_req: Request, res: Response) => {
  res.json({
    perplexityKeySet: !!process.env.PERPLEXITY_API_KEY,
    openaiKeySet: !!process.env.OPENAI_API_KEY,
    isElectron: !!process.env.USER_DATA_PATH,
  })
})

// POST /api/settings  — save API keys; takes effect immediately (lazy client)
router.post('/', (req: Request, res: Response) => {
  const { perplexityApiKey, openaiApiKey } = req.body as { perplexityApiKey?: string; openaiApiKey?: string }

  if (perplexityApiKey !== undefined) process.env.PERPLEXITY_API_KEY = perplexityApiKey
  if (openaiApiKey !== undefined)     process.env.OPENAI_API_KEY     = openaiApiKey

  // Persist to disk in Electron mode so keys survive restarts
  const file = settingsFile()
  if (file) {
    try {
      const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
      if (perplexityApiKey !== undefined) existing.perplexityApiKey = perplexityApiKey
      if (openaiApiKey !== undefined)     existing.openaiApiKey     = openaiApiKey
      fs.writeFileSync(file, JSON.stringify(existing, null, 2), 'utf8')
    } catch (err) { console.error('Failed to save settings:', err) }
  }

  res.json({
    ok: true,
    perplexityKeySet: !!process.env.PERPLEXITY_API_KEY,
    openaiKeySet: !!process.env.OPENAI_API_KEY,
  })
})

export default router
