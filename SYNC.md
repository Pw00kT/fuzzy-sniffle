# Sidecar lockstep sync

One app, identical everywhere. The canonical source is `idot-sidecar.html` in this repo; every other copy is derived from it. Never edit a derived copy directly.

## Where the app lives

| Copy | Location | How it updates |
|---|---|---|
| Canonical | `idot-sidecar.html` (this repo) | Edited directly; git history is the audit trail |
| Framework workspace | `D1 Meeting Sidecar (standalone).html` in the D1 Utility Operations Framework root **and** its `D1 Framework Offline Package/` | Drop-in from `dist/` (the framework CLAUDE.md two-copies rule: apply the identical change to both) |
| Claude Design | Utility Operating Framework project | `/design-sync` push from a design-authorized session |
| claude.ai artifact | https://claude.ai/code/artifact/16a3b1f3-9e42-4951-9c26-03c379296418 | Re-publish from `dist/idot-sidecar-artifact.html`; pass this URL as `url` when publishing from a new conversation so it updates in place |

## The procedure, on every change

1. Edit `idot-sidecar.html` only. Run the static checks and the e2e suite.
2. `node tools/sync.js` regenerates `dist/`:
   - `dist/D1 Meeting Sidecar (standalone).html` (byte-identical to canonical)
   - `dist/idot-sidecar-artifact.html` (outer document shell stripped for the artifact wrapper)
3. Commit and push the canonical file together with both `dist/` files.
4. Re-publish the claude.ai artifact from `dist/idot-sidecar-artifact.html`. Publishing from the same file path keeps the same URL.
5. Claude Design: from a session with design authorization (run `/design-login` locally, or seed the session from Claude Design with "Send to Claude Code Web"), push the standalone file into the Utility Operating Framework project.
6. Framework workspace: replace `D1 Meeting Sidecar (standalone).html` in **both** the framework root and the Offline Package, and confirm the Offline Package copy resolves only against its own bundled assets.

## Caveats

- **Artifact providers**: claude.ai artifacts enforce a strict CSP; external fetch is blocked, so the GitHub, Microsoft 365, Anthropic and self-hosted providers cannot be called from inside the artifact. The Built-in assistant provider (feature-detected `window.claude`) is the working path there. Live transcription, the sample meeting and both exports work regardless.
- **Microphone in the artifact**: browser permission prompts inside the artifact iframe may be restricted; the Load sample path always works.
- The framework's own `D1 Meeting Sidecar.dc.html` (design-system page) is a separate, `_ds`-bound implementation. This repo's standalone file is the field version; keep the two behaviorally aligned when either changes.
