# IDOT Sidecar — Utility Coordination Meeting Assistant

An AI-powered assistant for Illinois Department of Transportation (IDOT) utility coordination meetings. Records or ingests audio, transcribes with OpenAI Whisper, extracts structured project data with Claude, and lets you chat with the meeting transcript.

## Features

- **Record live meetings** — in-browser MediaRecorder with real-time audio visualization and live Claude coaching tips
- **Upload audio files** — drag-and-drop MP3/WAV/M4A/MP4/OGG/WebM with progress tracking
- **Automatic extraction** — Claude analyzes the transcript and extracts utility conflicts, action items, risks, key decisions, and project metadata
- **Ask Sidecar** — streaming chat interface to ask questions against any meeting's transcript
- **Works without API keys** — falls back to mock data throughout; no database required to run

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/Pw00kT/fuzzy-sniffle
cd fuzzy-sniffle
npm install

# 2. (Optional) Configure API keys
cp .env.example .env
# Edit .env and add ANTHROPIC_API_KEY and OPENAI_API_KEY

# 3. Run
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | No* | Enables real Claude extraction, coaching, and chat |
| `OPENAI_API_KEY` | No* | Enables real Whisper transcription |
| `DATABASE_URL` | No* | PostgreSQL connection string (e.g. `postgres://user:pass@localhost:5432/idot`) |
| `PORT` | No | Backend port (default: `3001`) |
| `UPLOAD_DIR` | No | Directory for uploaded audio files (default: `./uploads`) |

*Without these, the app uses built-in mock data and mock AI responses.

## Architecture

```
fuzzy-sniffle/
├── client/                  React 18 + Vite + Tailwind CSS frontend
│   └── src/
│       ├── pages/           Dashboard, RecordMeeting, UploadAudio, MeetingDetail
│       ├── lib/             API client, types, mock data, utilities
│       └── components/      Layout, Sidebar, shadcn/ui wrappers
└── server/                  Node.js + Express + TypeScript backend
    └── src/
        ├── routes/          meetings, upload, chat
        ├── services/        claude.ts, whisper.ts
        └── db/              PostgreSQL client + in-memory fallback
```

### Data flow

```
Audio file / Live recording
    │
    ▼
POST /api/upload  ──►  OpenAI Whisper (transcription)
                            │
                            ▼
                       Claude claude-opus-4-6 (extraction)
                            │  utilities, actions, risks, decisions
                            ▼
                       PostgreSQL / in-memory store
                            │
                            ▼
                 GET /api/meetings/:id  ──►  React Meeting Detail page
                                                 │
                                                 ▼
                                          POST /api/meetings/:id/chat
                                          (SSE streaming via Claude)
```

## PostgreSQL Setup (optional)

```sql
-- Run the schema against your database
psql $DATABASE_URL -f server/src/db/schema.sql
```

Then set `DATABASE_URL` in your `.env`. The app auto-detects whether to use PostgreSQL or the in-memory store at startup.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start both frontend and backend in watch mode |
| `npm run build` | Build frontend (Vite) and compile backend (tsc) |
| `npm start` | Run the compiled production build |

## Pages

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Meeting list, KPI metrics, priority actions and risks |
| `/record` | Record Meeting | Live audio capture with coaching |
| `/upload` | Upload Audio | File upload with processing progress |
| `/meeting/:id` | Meeting Detail | Extracted data, transcript search, Ask Sidecar chat |

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui (Radix UI), Wouter, Lucide icons
- **Backend**: Node.js, Express 4, TypeScript, tsx (dev server)
- **AI**: Anthropic Claude claude-opus-4-6 (extraction with extended thinking + SSE chat), OpenAI Whisper
- **Database**: PostgreSQL via `pg`, with a seeded in-memory fallback
