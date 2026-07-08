# IDOT Sidecar, Live Meeting Assistant

A single self-contained HTML file that listens to an IDOT utility coordination meeting in real time, transcribes it live in the browser, and surfaces AI coaching tips as the conversation happens. No install, no server, no build step.

Built for coordinators on locked-down government machines: no Node.js, no Docker, no admin rights required. Just open the file in Chrome or Edge. Aligned with the D1 Utility Operations Framework: coaching and extraction follow its authority discipline, confidence discipline, and house style, and the structured export emits draft Issue Cards.

## Quick Start

1. Download `D1 Meeting Sidecar (standalone).html` (or open it from SharePoint, email, or USB)
2. Double-click to open it in Chrome or Edge (required: live transcription uses the browser's built-in Speech Recognition API)
3. Click Settings and configure your AI provider (see below), then save
4. Pick the audio mode that matches your meeting (see the matrix below), click Start Listening, and grant permissions when prompted
5. The transcript fills in live on the right; coaching tips appear on the left every 30 seconds or so, or on demand via Suggest a tip
6. Export any time: Copy Notes (clipboard summary), Export JSON (draft Issue Cards + transcript), or Follow-up brief (an orchestratable brief)

Live transcription works with zero configuration. AI coaching activates once a provider is configured. New here? Click "Load sample meeting" in the empty transcript to see the whole pipeline without a microphone.

Working notes only: the app is not a system of record. Outputs are drafts; a human with proper authority approves, sends and commits.

## Pick the right mode for your meeting

The dropdown next to Start Listening tells the app what your audio situation is:

| Mode | When to use it | Who gets labeled what |
|---|---|---|
| Headset, just me | You are dialed in alone on a headset and only your side matters | Everything is You |
| Room / speakerphone | In-person meetings, phone bridges on speaker, or an operator running the meeting from an iPhone/Android on speakerphone in the room | Mic audio rotates Speaker A-D on pauses |
| Mic + meeting tab | The meeting runs in a browser tab: Teams web, Zoom web, Google Meet, WebEx web | You are You; tab audio rotates Remote A-D |
| Mic + computer audio | The meeting runs in a desktop app: WebEx, Teams, or Zoom clients (Windows only) | You are You; system audio rotates Remote A-D |

Mic + meeting tab: the share picker opens; choose the tab running the meeting and tick "Also share tab audio."

Mic + computer audio: the share picker opens; choose Entire screen and tick "Also share system audio." This captures whatever any desktop app is playing, which is how the WebEx/Teams/Zoom desktop clients get transcribed. System-audio capture is available on Windows Chrome/Edge only (not macOS). Use a headset in this mode; on speakers, remote voices also reach your mic and lines can duplicate.

In every capture mode the meeting stays audible, and clicking the browser's "Stop sharing" bar drops back to mic-only without interrupting the session.

## Choosing your AI provider

Pick whichever your org licenses in Settings, AI provider:

### Built-in assistant (no key)
Shown only when the file is hosted in a workspace that provides an embedded assistant (for example as a claude.ai artifact). No key, no setup.

### GitHub Copilot (default, simplest)
Paste a Personal Access Token from [github.com/settings/tokens](https://github.com/settings/tokens): no special scopes needed if Copilot is enabled for your account/org. Works even when the file is opened straight from disk. The token is stored only in this browser's `localStorage` and sent only to GitHub's API.

### Microsoft 365 Copilot
Uses Microsoft's Copilot Chat API (currently Preview) through Microsoft Graph, at no extra cost with an M365 Copilot license. Coaching requests become turns in a per-meeting Copilot conversation, and web grounding is explicitly disabled: nothing is sent to web search. Prerequisites (one-time, via IT):

1. A Microsoft 365 Copilot license on your account
2. An Entra app registration: single-page application platform, redirect URI set to the page's hosted URL
3. Admin consent for the Chat API's delegated Graph permissions (Sites.Read.All, Mail.Read, People.Read.All, OnlineMeetingTranscript.Read.All, Chat.Read, ChannelMessage.Read.All, ExternalItem.Read.All)
4. The HTML file hosted over https (a SharePoint site works): the OAuth sign-in cannot redirect back to a file opened from disk

Then enter the Tenant ID and Client ID in Settings and click Sign in to Microsoft 365. Sign-in lasts about an hour; the app prompts when it needs a refresh.

### Claude (Anthropic)
Paste an API key from [console.anthropic.com](https://console.anthropic.com/settings/keys) and pick a model: Haiku (fast, the default, well-suited to short frequent coaching turns), Sonnet, or Opus. Like the GitHub option it works even when the file is opened straight from disk; the key is stored only in this browser's `localStorage` and sent only to Anthropic's API (using Anthropic's direct-browser-access support for bring-your-own-key apps).

### Self-hosted / Open source
Point the app at any OpenAI-compatible endpoint:

- NVIDIA NIM hosted: `https://integrate.api.nvidia.com/v1` with a free `nvapi-` key from build.nvidia.com (free credits, open-weight models: Nemotron, DeepSeek, GLM, Kimi, Qwen, Llama)
- Self-hosted NIM container / Ollama / LiteLLM / vLLM / LM Studio: usually keyless; with a local server, transcript text never leaves your machine

Only the Base URL is required (a trailing `/v1` is handled either way). The key field is only for servers that demand one; the model field is optional (blank uses the server's default) and autocompletes from the server's `/v1/models` list. The server must allow CORS from this page's origin.

Optional tier-0 fallback (off by default): a Settings checkbox lets coaching tips fall back to a pinned Claude Sonnet call when the local model is unreachable, times out after 6 seconds, or returns degenerate output. The checks are deterministic (length, error shape, repetition), never a model self-report. Coaching tips only; end-of-meeting extraction never falls back. Only the recent-discussion snippet is sent, and it uses the same Anthropic key as the Claude provider option; with no key stored the checkbox has no effect.

Relationship to [AIO Orchestrator](https://github.com/Pw00kT/aio-orchestrator): AIO is a local-first CLI orchestration system, not an HTTP gateway; you do not point Sidecar at it. Instead they pair in two ways: (1) point Sidecar at the same NIM endpoints AIO's cheap tiers use, and (2) use Sidecar's Follow-up brief export to turn meeting outcomes into a `brief.md` that `aio run --brief` can orchestrate.

## Exports

Three ways out, all client-side, all drafts:

- Copy Notes: human-readable transcript + coaching insights to the clipboard (paste into email or a doc)
- Export JSON: downloads `<title>.meeting.json` with an end-of-meeting AI extraction pass rendered as draft Issue Cards per the D1 Framework schema (title, module, cluster, status, honest risk color including Gray, confidence-tagged claims with speaker sources, requested action) plus meeting-level action items and key decisions, the full transcript, and insights, wrapped in provenance fields (`SOURCE`, `METHOD`, `DATE_COLLECTED`). Card ids are stamped `UTL-<year>-DRAFT-<nn>`: drafts, not registry numbers, and every card carries the authority boundary and `needs_human_approval: true`. Works without an AI provider too: extraction fields are `null`, transcript still exports.
- Follow-up brief: downloads `<title>.brief.md` with meeting outcomes rendered as a Mission / Context / Acceptance criteria / Constraints / Non-goals brief, directly consumable by AIO Orchestrator's `aio run --brief`. Requires an AI provider.

Extraction is evidence-based only: nothing that is not stated in the transcript, statements are tagged at best Known or Assumed (never Verified: records and meeting statements are not verification), and unknown or disputed states get an honest Gray.

## Other settings

- Coaching model (GitHub provider): `gpt-4o` (default), `gpt-4o-mini` (faster), or `o1-mini` (deeper reasoning)
- Coaching interval: how often recent transcript is sent for a tip (15s / 30s / 60s)
- Recent meetings: the last 5 meetings are kept locally for reference; clearable at any time

## Limitations

- Live transcription requires Chrome or Edge (Firefox and Safari do not implement `SpeechRecognition`)
- Speaker labels are heuristic (based on pause length between turns), not true diarization
- Mic + computer audio requires Windows; macOS Chrome can capture tab audio but not system audio
- The Microsoft 365 Copilot Chat API is in Preview and may change; the GitHub provider is the stable path
- No cross-device sync: meeting history lives in that browser's local storage only

## Development

The canonical file is `D1 Meeting Sidecar (standalone).html`: the framework's design-system bundle (real IDOT triskelion, shipped fonts, DS tokens) carrying this repo's engine patches. Design changes are made on the Claude Design side and re-exported; engine changes are marker-guarded patches in `tools/patch-bundle.js`. House style follows the D1 Framework copy conventions: no em or en dashes in user-visible text, no emoji or arrow glyphs in prose, "the Department" capitalized, and protective wording preserved (coordination is not authorization).

The app is distributed in lockstep to four places (this repo, the framework workspace and Offline Package, the Claude Design project, and a claude.ai artifact). After any change, run `node tools/sync.js` and follow [SYNC.md](./SYNC.md). The retired dark-theme field build lives in git history.
