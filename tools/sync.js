#!/usr/bin/env node
// Derives every distribution copy of the Sidecar from the canonical
// idot-sidecar.html. Deterministic: same input, same outputs. See SYNC.md.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const canonical = fs.readFileSync(path.join(root, 'idot-sidecar.html'), 'utf8');
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });

// 1. Framework workspace / Offline Package copy: byte-identical, named per
//    the framework bundle's "(standalone)" convention.
fs.writeFileSync(path.join(dist, 'D1 Meeting Sidecar (standalone).html'), canonical);

// 2. claude.ai artifact variant: artifacts are wrapped in the platform's own
//    document skeleton, so strip the outer shell and keep title, style and
//    body content. Inside an artifact only the built-in assistant provider
//    can reach an AI (CSP blocks external fetch); the app feature-detects it.
const head = canonical.match(/<head>([\s\S]*?)<\/head>/)[1];
const style = head.match(/<style>[\s\S]*?<\/style>/)[0];
const body = canonical.match(/<body>([\s\S]*?)<\/body>/)[1];
const artifact = ['<title>D1 Meeting Sidecar</title>', style, body.trim(), ''].join('\n');
fs.writeFileSync(path.join(dist, 'idot-sidecar-artifact.html'), artifact);

console.log('dist/ regenerated from idot-sidecar.html');
console.log('');
console.log('Fan-out checklist (details in SYNC.md):');
console.log('  1. Commit and push the canonical change together with both dist/ files');
console.log('  2. Re-publish the claude.ai artifact from dist/idot-sidecar-artifact.html (same path keeps the same URL)');
console.log('  3. Push "D1 Meeting Sidecar (standalone).html" to the Claude Design project from a design-authorized session');
console.log('  4. Replace the file in BOTH framework copies: the root and the Offline Package');
