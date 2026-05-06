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
    anthropicKeySet: !!process.env.ANTHROPIC_API_KEY,
    openaiKeySet: !!process.env.OPENAI_API_KEY,
    isElectron: !!process.env.USER_DATA_PATH,
  })
})

// POST /api/settings  — save API keys; takes effect immediately (lazy Claude client)
router.post('/', (req: Request, res: Response) => {
  const { anthropicApiKey, openaiApiKey } = req.body as { anthropicApiKey?: string; openaiApiKey?: string }

  if (anthropicApiKey !== undefined) process.env.ANTHROPIC_API_KEY = anthropicApiKey
  if (openaiApiKey !== undefined)    process.env.OPENAI_API_KEY    = openaiApiKey

  // Persist to disk in Electron mode so keys survive restarts
  const file = settingsFile()
  if (file) {
    try {
      const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
      if (anthropicApiKey !== undefined) existing.anthropicApiKey = anthropicApiKey
      if (openaiApiKey !== undefined)    existing.openaiApiKey    = openaiApiKey
      fs.writeFileSync(file, JSON.stringify(existing, null, 2), 'utf8')
    } catch (err) { console.error('Failed to save settings:', err) }
  }

  res.json({
    ok: true,
    anthropicKeySet: !!process.env.ANTHROPIC_API_KEY,
    openaiKeySet: !!process.env.OPENAI_API_KEY,
  })
})

export default router
