#!/usr/bin/env node
// Derives every distribution copy from the canonical bundle,
// "D1 Meeting Sidecar (standalone).html". Deterministic. See SYNC.md.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const CANONICAL = 'D1 Meeting Sidecar (standalone).html';
const canonical = fs.readFileSync(path.join(root, CANONICAL), 'utf8');
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });

// 1. Framework workspace / Offline Package copy: byte-identical.
fs.writeFileSync(path.join(dist, CANONICAL), canonical);

// 2. claude.ai artifact variant: artifacts get wrapped in the platform's own
//    document skeleton, so ship the wrapper's head styles + body content
//    (loader, embedded resources, template) without the outer shell. The
//    bundle is fully self-contained, which suits the artifact CSP; inside an
//    artifact only the built-in assistant provider can reach an AI.
const headStyles = [...canonical.matchAll(/<style>[\s\S]*?<\/style>/g)]
  .filter(m => m.index < canonical.indexOf('<body>'))
  .map(m => m[0]).join('\n');
const body = canonical.slice(canonical.indexOf('<body>') + '<body>'.length, canonical.lastIndexOf('</body>'));
const artifact = ['<title>D1 Meeting Sidecar</title>', headStyles, body.trim(), ''].join('\n');
fs.writeFileSync(path.join(dist, 'idot-sidecar-artifact.html'), artifact);

console.log('dist/ regenerated from the canonical bundle');
console.log('');
console.log('Fan-out checklist (details in SYNC.md):');
console.log('  1. Commit and push the canonical change together with both dist/ files');
console.log('  2. Re-publish the claude.ai artifact from dist/idot-sidecar-artifact.html (same path keeps the same URL)');
console.log('  3. Push the standalone bundle to the Claude Design project from a design-authorized session');
console.log('  4. Replace the file in BOTH framework copies: the root and the Offline Package');
