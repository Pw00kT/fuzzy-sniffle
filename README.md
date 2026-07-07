# IDOT Sidecar — Live Meeting Assistant

A single self-contained HTML file that listens to an IDOT utility coordination meeting in real time, transcribes it live in the browser, and surfaces AI coaching tips as the conversation happens — no install, no server, no build step.

Built for coordinators on locked-down government machines: no Node.js, no Docker, no admin rights required. Just open the file in Chrome or Edge.

## Quick Start

1. Download `idot-sidecar.html` (or open it from SharePoint / email / USB)
2. Double-click to open it in **Chrome** or **Edge** (required — live transcription uses the browser's built-in Speech Recognition API)
3. Click **Settings** and configure your AI provider (see below), then save
4. Pick the audio mode that matches your meeting (see the matrix below), click **Start Listening**, and grant permissions when prompted
5. The transcript fills in live on the right; coaching tips appear on the left every ~30 seconds
6. Click **Export** any time to copy the transcript + insights to your clipboard

Live transcription works with zero configuration — AI coaching activates once a provider is configured.

## Pick the right mode for your meeting

The dropdown next to **Start Listening** tells the app what your audio situation is:

| Mode | When to use it | Who gets labeled what |
|---|---|---|
| **Headset — just me** | You're dialed in alone on a headset and only your side matters | Everything is **You** |
| **Room / speakerphone** | In-person meetings, phone bridges on speaker, or **an operator running the meeting from an iPhone/Android** on speakerphone in the room | Mic audio rotates **Speaker A–D** on pauses |
| **Mic + meeting tab** | The meeting runs in a **browser tab** — Teams web, Zoom web, Google Meet, WebEx web | You are **You**; tab audio rotates **Remote A–D** |
| **Mic + computer audio** | The meeting runs in a **desktop app** — WebEx, Teams, or Zoom clients (Windows only) | You are **You**; system audio rotates **Remote A–D** |

**Mic + meeting tab**: the share picker opens — choose the *tab* running the meeting and tick **"Also share tab audio."**

**Mic + computer audio**: the share picker opens — choose **Entire screen** and tick **"Also share system audio."** This captures whatever any desktop app is playing, which is how the WebEx/Teams/Zoom desktop clients get transcribed. System-audio capture is available on Windows Chrome/Edge only (not macOS). Use a headset in this mode — on speakers, remote voices also reach your mic and lines can duplicate.

In every capture mode, the meeting stays audible, and clicking the browser's "Stop sharing" bar drops back to mic-only without interrupting the session.

## Choosing your AI provider

Both options use licenses your org may already have — pick whichever applies in **Settings → AI provider**:

### GitHub Copilot (default, simplest)
Paste a Personal Access Token from [github.com/settings/tokens](https://github.com/settings/tokens) — no special scopes needed if Copilot is enabled for your account/org. Works even when the file is opened straight from disk. The token is stored only in this browser's `localStorage` and sent only to GitHub's API.

### Microsoft 365 Copilot
Uses Microsoft's Copilot Chat API (currently **Preview**) through Microsoft Graph, at no extra cost with an M365 Copilot license. Coaching requests become turns in a per-meeting Copilot conversation, and **web grounding is explicitly disabled** — nothing is sent to web search. Prerequisites (one-time, via IT):

1. A **Microsoft 365 Copilot license** on your account
2. An **Entra app registration** — single-page application platform, redirect URI set to the page's hosted URL
3. **Admin consent** for the Chat API's delegated Graph permissions (Sites.Read.All, Mail.Read, People.Read.All, OnlineMeetingTranscript.Read.All, Chat.Read, ChannelMessage.Read.All, ExternalItem.Read.All)
4. The HTML file **hosted over https** (a SharePoint site works) — the OAuth sign-in can't redirect back to a file opened from disk

Then enter the Tenant ID and Client ID in Settings and click **Sign in to Microsoft 365**. Sign-in lasts about an hour; the app prompts when it needs a refresh.

### Claude (Anthropic)
Paste an API key from [console.anthropic.com](https://console.anthropic.com/settings/keys) and pick a model — Haiku (fast, the default, well-suited to short frequent coaching turns), Sonnet, or Opus. Like the GitHub option it works even when the file is opened straight from disk; the key is stored only in this browser's `localStorage` and sent only to Anthropic's API (using Anthropic's direct-browser-access support for bring-your-own-key apps).

### Self-hosted / Open source (AIO)
Point the app at your own AI server — [AIO Orchestrator](https://github.com/Pw00kT/aio-orchestrator) or any other OpenAI-compatible server (Ollama, LiteLLM, vLLM, LM Studio). Enter the server's **Base URL** (the app calls `{base}/v1/chat/completions`), an API key only if your server requires one, and the model name. This is the maximum-sovereignty option: **transcript text never leaves your own infrastructure**.

Two networking notes:
- **CORS** — the page calls the server directly from the browser, so the server must allow this page's origin (Ollama: set `OLLAMA_ORIGINS`; LiteLLM/vLLM have CORS flags; most gateways have an equivalent setting).
- **Mixed content** — browsers treat `http://localhost` as secure, so a local server works even when this page is served over https (e.g. from SharePoint). A *remote* plain-`http://` server will be blocked by the browser — serve it over https or run it locally.

## Other settings

- **Coaching model** (GitHub provider) — `gpt-4o` (default), `gpt-4o-mini` (faster), or `o1-mini` (deeper reasoning)
- **Coaching interval** — how often recent transcript is sent for a tip (15s / 30s / 60s)
- **Recent meetings** — the last 5 meetings are kept locally for reference; clearable at any time

## Limitations

- Live transcription requires Chrome or Edge (Firefox and Safari don't implement `SpeechRecognition`)
- Speaker labels are heuristic (based on pause length between turns), not true diarization
- **Mic + computer audio** requires Windows — macOS Chrome can capture tab audio but not system audio
- The Microsoft 365 Copilot Chat API is in Preview and may change; the GitHub provider is the stable path
- No cross-device sync — meeting history lives in that browser's local storage only

## Development

This is intentionally a single static file with no build tooling. To make changes, edit `idot-sidecar.html` directly and open it in a browser to test — no `npm install`, no dev server.
