# Sidecar lockstep sync

One app, identical everywhere. The canonical file is `D1 Meeting Sidecar (standalone).html` in this repo: the framework's design-system bundle (real IDOT triskelion, shipped fonts, DS tokens) with this repo's engine patches applied. Never edit a derived copy directly.

## Where the app lives

| Copy | Location | How it updates |
|---|---|---|
| Canonical | `D1 Meeting Sidecar (standalone).html` (this repo) | Design changes come from the Claude Design side as a new bundle export; engine changes are applied here via `tools/patch-bundle.js`. Git history is the audit trail |
| Framework workspace | Same filename in the D1 Utility Operations Framework root **and** its `D1 Framework Offline Package/` | Drop-in from `dist/` (the framework CLAUDE.md two-copies rule: apply the identical change to both) |
| Claude Design | Utility Operating Framework project | `/design-sync` push from a design-authorized session; patched bundles are handed back so the design side stays current |
| claude.ai artifact | https://claude.ai/code/artifact/16a3b1f3-9e42-4951-9c26-03c379296418 | Re-publish from `dist/idot-sidecar-artifact.html`; pass this URL as `url` when publishing from a new conversation so it updates in place |

## The procedure, on every change

1. **Design change** (made in Claude Design): export the new standalone bundle, then `node tools/patch-bundle.js --from <new bundle>` to re-apply the engine patches onto it. **Engine change** (made here): add or edit a marker-guarded patch in `tools/patch-bundle.js` and run it; hand the patched bundle back to the design side.
2. Run the e2e suite (`scratchpad/e2e-bundle.js` against the stub server).
3. `node tools/sync.js` regenerates `dist/`:
   - `dist/D1 Meeting Sidecar (standalone).html` (byte-identical to canonical)
   - `dist/idot-sidecar-artifact.html` (outer shell stripped for the artifact wrapper; the loader and embedded resources ride along intact)
4. Commit and push the canonical file together with both `dist/` files.
5. Re-publish the claude.ai artifact from `dist/idot-sidecar-artifact.html`.
6. Claude Design: from a session with design authorization (run `/design-login` locally, or seed the session from Claude Design with "Send to Claude Code Web"), push the bundle into the Utility Operating Framework project.
7. Framework workspace: replace the file in **both** the framework root and the Offline Package.

## Current engine patches (see `tools/patch-bundle.js`)

- Print stylesheet: printing yields a clean transcript handout (chrome and coaching column hidden)
- Settings migration: legacy `idot_*` localStorage keys copy to `d1ms_*` once, never overwriting
- Issue-Card extraction: exports emit draft Issue Cards per the framework schema, client-stamped `UTL-<year>-DRAFT-<nn>` with the authority boundary, `approval_status: "none"` and `needs_human_approval: true`; the sample carries matching canned cards

## Caveats

- **Artifact providers**: claude.ai artifacts block external fetch, so the GitHub, Microsoft 365, Anthropic and self-hosted providers cannot be called from inside the artifact. The Built-in assistant provider (feature-detected `window.claude`) is the working path there; the bundle defaults to it. Live transcription, the sample meeting and both exports work regardless.
- **Microphone in the artifact**: permission prompts inside the artifact iframe may be restricted; the sample path always works.
- The retired field build (`idot-sidecar.html`, dark theme, `idot_*` keys) lives in git history; its engine was ported into the bundle.
