import { app, BrowserWindow, shell } from 'electron'
import path from 'path'
import fs from 'fs'

// Single-instance lock — prevents two copies running simultaneously (port conflict)
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

const isDev = !app.isPackaged
const PORT = parseInt(process.env.PORT || '3001', 10)

// ─── Set env vars BEFORE importing the server ─────────────────────────────────

const userData = app.getPath('userData')
process.env.USER_DATA_PATH = userData
process.env.UPLOAD_DIR = path.join(userData, 'uploads')
process.env.NODE_ENV = isDev ? 'development' : 'production'

// Load saved API keys + settings from disk into process.env
const settingsFile = path.join(userData, 'settings.json')
if (fs.existsSync(settingsFile)) {
  try {
    const saved = JSON.parse(fs.readFileSync(settingsFile, 'utf8'))
    if (saved.anthropicApiKey) process.env.ANTHROPIC_API_KEY = saved.anthropicApiKey
    if (saved.openaiApiKey)    process.env.OPENAI_API_KEY    = saved.openaiApiKey
  } catch { /* ignore corrupt settings */ }
}

// ─── Boot the Express server ──────────────────────────────────────────────────

// In production the server is compiled; in dev tsx handles it via `npm run dev`
if (!isDev) {
  require('../server/dist/index.js')
}

// ─── Window ───────────────────────────────────────────────────────────────────

async function waitForServer(url: string, maxMs = 10_000): Promise<void> {
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    try { await fetch(url); return } catch { /* not ready yet */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`Server at ${url} did not start within ${maxMs}ms`)
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'IDOT Sidecar',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Open external links in the system browser, not inside Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    // In dev: Vite serves the frontend; Express is started separately by `npm run dev`
    await waitForServer(`http://localhost:5173`)
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    await waitForServer(`http://localhost:${PORT}/api/health`)
    win.loadURL(`http://localhost:${PORT}`)
  }
}

app.whenReady().then(createWindow)

// Re-focus existing window if a second launch is attempted
app.on('second-instance', () => {
  const [win] = BrowserWindow.getAllWindows()
  if (win) { if (win.isMinimized()) win.restore(); win.focus() }
})

app.on('window-all-closed', () => app.quit())

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
