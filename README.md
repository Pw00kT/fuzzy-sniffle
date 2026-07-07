# IDOT Sidecar — Live Meeting Assistant

A single self-contained HTML file that listens to an IDOT utility coordination meeting in real time, transcribes it live in the browser, and surfaces AI coaching tips as the conversation happens — no install, no server, no build step.

Built for coordinators on locked-down government machines: no Node.js, no Docker, no admin rights required. Just open the file in Chrome or Edge.

## Quick Start

1. Download `idot-sidecar.html` (or open it directly from SharePoint / email / USB)
2. Double-click to open it in **Chrome** or **Edge** (required — live transcription uses the browser's built-in Speech Recognition API, which only these two support)
3. Click **Settings**, paste in a GitHub Personal Access Token from an account with Copilot enabled, and save
4. Click **Start Listening**, grant microphone access when prompted
5. Speak/listen — the transcript fills in live on the right, and coaching tips appear on the left every ~30 seconds
6. Click **Export** any time to copy the transcript + insights to your clipboard, or use Stop and re-Export later

No account is required to use live transcription — that part works with zero configuration. AI coaching only activates once a GitHub token is saved.

## How it works

| Capability | Implementation | Why |
|---|---|---|
| Live transcription | Browser `SpeechRecognition` API | Built into Chrome/Edge, free, real-time, no API key, nothing leaves the device except the periodic coaching request |
| AI coaching | GitHub Copilot Chat Completions API | Most orgs already have Copilot licensed; one token, no separate billing |
| Storage | `localStorage` | No database, no server; meeting history and settings persist across sessions on that device only |
| Distribution | One `.html` file | Email it, host it on SharePoint, put it on a USB stick — no installer, no npm |

There is no backend. The file talks directly to `https://api.githubcopilot.com` from the browser using the token you provide; that token never leaves your machine except in requests to GitHub's API.

## Settings

Opened via the **Settings** button in the header:

- **GitHub Token** — a Personal Access Token from [github.com/settings/tokens](https://github.com/settings/tokens). No special scopes are required if Copilot is enabled for your account/org. Stored only in `localStorage`.
- **Coaching model** — `gpt-4o` (default), `gpt-4o-mini` (faster/cheaper), or `o1-mini` (deeper reasoning)
- **Coaching interval** — how often the app sends recent transcript to Copilot for a tip (15s / 30s / 60s)
- **Recent meetings** — the last 5 meetings are kept locally for reference; clearable at any time

## Limitations

- Live transcription requires Chrome or Edge (Firefox and Safari don't implement `SpeechRecognition`)
- Speaker labels are heuristic (based on pause length between turns), not true diarization
- Designed for microphone-captured audio — for meetings joined entirely through a headset or phone bridge where you can hear all participants, this works well; capturing a remote participant's audio directly from a video call tab is a possible future enhancement via `getDisplayMedia`
- No cross-device sync — meeting history lives in that browser's local storage only

## Development

This is intentionally a single static file with no build tooling. To make changes, edit `idot-sidecar.html` directly and open it in a browser to test — no `npm install`, no dev server.
