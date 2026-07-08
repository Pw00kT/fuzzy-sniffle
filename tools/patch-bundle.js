#!/usr/bin/env node
// Patches the D1 Meeting Sidecar standalone bundle (the canonical file).
// The bundle wraps the real app as a JSON-escaped template; this extracts it,
// applies the engine ports below, and re-embeds it. Idempotent: each patch is
// marker-guarded, so re-running on an already-patched bundle changes nothing.
//
// Ports (from the retired field build):
//   1. Print stylesheet: a clean transcript handout
//   2. Settings migration: legacy idot_* localStorage keys to d1ms_*
//   3. Issue-Card extraction: framework Issue-Card schema in the exports,
//      with client-stamped draft ids and the authority boundary
//
// Usage: node tools/patch-bundle.js [--from <bundle path>]
//        (default input/output: "D1 Meeting Sidecar (standalone).html")
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const CANONICAL = path.join(root, 'D1 Meeting Sidecar (standalone).html');
const fromIdx = process.argv.indexOf('--from');
const input = fromIdx > -1 ? process.argv[fromIdx + 1] : CANONICAL;

const wrapper = fs.readFileSync(input, 'utf8');
const tag = '<script type="__bundler/template">';
const start = wrapper.indexOf(tag) + tag.length;
const end = wrapper.indexOf('</' + 'script>', start);
if (start < tag.length || end < 0) { console.error('No __bundler/template block found'); process.exit(1); }
let inner = JSON.parse(wrapper.slice(start, end).trim());
const applied = [];

// ── Patch 1: print stylesheet ────────────────────────────────────────────
const PRINT_MARK = '/* d1ms-print-patch */';
if (!inner.includes(PRINT_MARK)) {
  const printCss = `
${PRINT_MARK}
@media print {
  button, select { display: none !important; }
  div[style*="height:100vh"] { height: auto !important; overflow: visible !important; }
  div[style*="width:340px"] { display: none !important; }
  .d1ms-scroll { overflow: visible !important; }
}
`;
  inner = inner.replace('</style>', printCss + '</style>');
  applied.push('print stylesheet');
}

// ── Patch 2: idot_* to d1ms_* settings migration ─────────────────────────
const MIG_MARK = 'd1ms-migration-patch';
if (!inner.includes(MIG_MARK)) {
  const migration = `<script>
/* ${MIG_MARK}: the retired field build stored settings under idot_* keys.
   Copy each one to the d1ms_* key this build reads. Never overwrites. */
(function () {
  try {
    var map = {
      d1ms_gh_token: 'idot_gh_token', d1ms_model: 'idot_model',
      d1ms_interval: 'idot_interval', d1ms_history: 'idot_history',
      d1ms_provider: 'idot_ai_provider', d1ms_m365_tenant: 'idot_m365_tenant',
      d1ms_m365_client: 'idot_m365_client', d1ms_anthropic_key: 'idot_anthropic_key',
      d1ms_anthropic_model: 'idot_anthropic_model', d1ms_aio_base: 'idot_aio_base',
      d1ms_aio_key: 'idot_aio_key', d1ms_aio_model: 'idot_aio_model'
    };
    for (var k in map) {
      if (!localStorage.getItem(k) && localStorage.getItem(map[k])) {
        localStorage.setItem(k, localStorage.getItem(map[k]));
      }
    }
  } catch (e) { /* storage unavailable, nothing to migrate */ }
})();
</` + `script>
`;
  inner = inner.replace('<script type="text/x-dc"', migration + '<script type="text/x-dc"');
  applied.push('settings migration');
}

// ── Patch 3: Issue-Card extraction in prompts, exports and the sample ────
if (!inner.includes('stampIssueCards')) {
  // 3a. Extraction prompt: draft Issue Cards + the legacy arrays
  const NEW_EXTRACTION = 'You analyze an IDOT District 1 utility coordination meeting transcript inside the D1 Utility Operations Framework. Extract draft Issue Cards plus meeting-level items. Evidence-based only: include nothing not stated in the transcript; use null for anything not mentioned. Do not infer authorizations, approvals, waivers, or fault. Confidence discipline: statements in a meeting are at best Known or Assumed; never output Verified. Set risk_color honestly: Gray when unknown, assumed or disputed. Respond with valid JSON only, no markdown, using exactly this structure: {"issueCards":[{"title":"string","owner_stakeholder":"string|null","location":"string|null","primary_module":"GOAD|MTUC|PWS|ROI|SI|CWDM|IQPC|SM|EWRT|IMLL|DPDD|ET|SC|UFR","cluster":"Prime|Records|Subsurface|Conflict|Stakeholder|Governance","status":"New-Intake|Records-Pending|Owner-Response-Pending|Verification-Pending|Conflict-Confirmed|Permit-Review-Pending|Construction-Coordination-Pending|Ready-For-Milestone|Closed|Deferred|Disputed","risk_color":"Red|Yellow|Green|Gray","claims":[{"statement":"string","confidence":"Known|Assumed|Unknown|Disputed","source":"speaker label"}],"requested_action":"string|null","responsible_party":"string|null","due_date":"YYYY-MM-DD|null","escalation_triggers":["string"]}],"utilities":[{"owner":"string","facilityType":"string","conflict":"yes|potential|no","location":"string|null","status":"string|null","notes":"string|null"}],"actionItems":[{"description":"string","assignee":"string|null","dueDate":"YYYY-MM-DD|null","priority":"high|medium|low"}],"keyDecisions":[{"description":"string","madeBy":"string|null"}],"risks":[{"description":"string","level":"high|medium|low","category":"schedule|cost|technical|legal|other","mitigation":"string|null"}]}';
  const beforeA = inner;
  inner = inner.replace(/EXTRACTION_SYSTEM = '[^']*';/, "EXTRACTION_SYSTEM = '" + NEW_EXTRACTION + "';");
  if (inner === beforeA) { console.error('FAILED: EXTRACTION_SYSTEM anchor not found'); process.exit(1); }

  // 3b. Component members: boundary constant + draft-stamping helper
  const M365_FIELD = 'm365 = { accessToken:null, expiresAt:0, conversationId:null, warned:false };';
  const members = M365_FIELD + `
  AUTHORITY_BOUNDARY = 'Coordination only; no ROW, permit, contract, funding, schedule or waiver.';
  stampIssueCards(cards){
    if (!cards || !cards.length) return null;
    const year = new Date().getFullYear();
    return cards.map((c, i) => Object.assign(
      { card_id: 'UTL-' + year + '-DRAFT-' + String(i + 1).padStart(2, '0') }, c,
      { authority_boundary: this.AUTHORITY_BOUNDARY, approval_status: 'none',
        needs_human_approval: true, drafted_by: 'D1 Meeting Sidecar (meeting extraction)' }));
  }`;
  const beforeB = inner;
  inner = inner.replace(M365_FIELD, members);
  if (inner === beforeB) { console.error('FAILED: m365 field anchor not found'); process.exit(1); }

  // 3c. Sample extraction gains matching draft cards
  const SAMPLE_ANCHOR = 'SAMPLE_EXTRACTION = {\n    utilities: [';
  const sampleCards = `SAMPLE_EXTRACTION = {
    issueCards: [
      { title:'ComEd pole offsets not verified against the new cross section', owner_stakeholder:'ComEd', location:'IL-64 north side', primary_module:'UFR', cluster:'Records', status:'Verification-Pending', risk_color:'Gray', claims:[{ statement:'Overhead distribution likely sits outside the widening, offsets not verified', confidence:'Assumed', source:'Remote A' }], requested_action:'Verify pole offsets against the new cross section', responsible_party:'ComEd', due_date:null, escalation_triggers:[] },
      { title:'Claimed prior easement at the Station 240 gas crossing', owner_stakeholder:'Nicor', location:'Station 240', primary_module:'ROI', cluster:'Records', status:'Records-Pending', risk_color:'Gray', claims:[{ statement:'A prior easement may predate the highway, records to be pulled', confidence:'Assumed', source:'Remote B' }], requested_action:'Pull easement records and route any cost question to a determination', responsible_party:'Nicor', due_date:null, escalation_triggers:[] },
      { title:'AT&T buried fiber relocation on about ninety days notice', owner_stakeholder:'AT&T', location:'IL-64 south side', primary_module:'MTUC', cluster:'Stakeholder', status:'New-Intake', risk_color:'Yellow', claims:[{ statement:'Fiber can relocate on about ninety days once notice issues', confidence:'Known', source:'Remote C' }], requested_action:'Send the utility coordination letter', responsible_party:'Coordinator', due_date:null, escalation_triggers:[] }
    ],
    utilities: [`;
  const beforeC = inner;
  inner = inner.replace(SAMPLE_ANCHOR, sampleCards);
  if (inner === beforeC) { console.error('FAILED: SAMPLE_EXTRACTION anchor not found'); process.exit(1); }

  // 3d. Export JSON: draft flags, boundary, stamped cards (legacy fields kept)
  const JSON_ANCHOR = 'utilities:x?.utilities ?? null, actionItems:x?.actionItems ?? null, keyDecisions:x?.keyDecisions ?? null, risks:x?.risks ?? null,';
  const beforeD = inner;
  inner = inner.replace(JSON_ANCHOR,
    'draft:true, needsHumanApproval:true, authorityBoundary:this.AUTHORITY_BOUNDARY,\n      issueCards:this.stampIssueCards(x?.issueCards),\n      ' + JSON_ANCHOR);
  if (inner === beforeD) { console.error('FAILED: exportJson anchor not found'); process.exit(1); }

  // 3e. Follow-up brief: draft cards context section
  const BRIEF_ANCHOR = "if (x.utilities?.length){ L.push('## Context, utility conflicts in play');";
  const briefCards = `const cards = this.stampIssueCards(x.issueCards) || [];
    if (cards.length){ L.push('## Context, draft issue cards in play'); L.push(''); cards.forEach(c => L.push('- ' + c.card_id + ' [' + c.risk_color + '] ' + c.title + (c.owner_stakeholder ? ' (' + c.owner_stakeholder + ')' : '') + '; module ' + c.primary_module + ', status ' + c.status)); L.push(''); }
    ` + BRIEF_ANCHOR;
  const beforeE = inner;
  inner = inner.replace(BRIEF_ANCHOR, briefCards);
  if (inner === beforeE) { console.error('FAILED: exportBrief anchor not found'); process.exit(1); }

  applied.push('Issue-Card extraction');
}

// ── Re-embed ─────────────────────────────────────────────────────────────
if (applied.length) {
  // Escape "</" the same way the bundler does, so the embedded document can
  // never terminate the wrapper's script block early.
  const embedded = JSON.stringify(inner).replace(/<\//g, '<\\u002F');
  const out = wrapper.slice(0, start) + '\n' + embedded + '\n' + wrapper.slice(end);
  fs.writeFileSync(CANONICAL, out);
  console.log('Patched:', applied.join(', '));
} else {
  if (input !== CANONICAL) fs.writeFileSync(CANONICAL, wrapper);
  console.log('Already patched; no changes.');
}
