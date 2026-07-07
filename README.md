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

## Capturing remote participants (browser-based meetings)

For meetings joined in a browser tab (Teams web, Zoom web, Google Meet), switch the source dropdown in the header from **Mic only** to **Mic + meeting tab** before clicking Start. The browser's share picker opens — choose the **tab** running the meeting and tick **"Also share tab audio"**. From then on:

- Your own voice (mic) is transcribed and labeled **You**
- Remote participants (tab audio) are transcribed and labeled **Remote A/B/C/D**, with speaker turns guessed from pauses
- The meeting stays audible; clicking the browser's "Stop sharing" bar drops back to mic-only without interrupting the session

Tab-audio transcription uses the Web Speech API's `MediaStreamTrack` input, which requires a current version of Chrome or Edge. Sharing a window or entire screen won't work — tab audio capture is tab-only.

## Limitations

- Live transcription requires Chrome or Edge (Firefox and Safari don't implement `SpeechRecognition`)
- Speaker labels are heuristic (based on pause length between turns), not true diarization
- Tab capture works only for meetings running in a browser tab — the desktop Teams/Zoom apps can't be captured this way (join via the web client instead, or use speaker audio with Mic only mode)
- No cross-device sync — meeting history lives in that browser's local storage only

## Development

This is intentionally a single static file with no build tooling. To make changes, edit `idot-sidecar.html` directly and open it in a browser to test — no `npm install`, no dev server.
