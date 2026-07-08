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

// ── Patch 4: tier-0 coaching fallback (local first, Sonnet on failure) ───
// Ported from the contributed field-build patch (unit suite 14/14). Opt-in,
// coaching-only: local model with a 6 s timeout and deterministic usability
// checks; falls back to a pinned claude-sonnet-5 using the stored Anthropic
// key. Extraction never sees a signal or a fallback.
if (!inner.includes('getCoachingCompletion')) {
  const rep = (anchor, replacement, label) => {
    const before = inner;
    inner = inner.replace(anchor, replacement);
    if (inner === before) { console.error('FAILED: patch-4 anchor not found: ' + label); process.exit(1); }
  };

  // 4a. Storage key
  rep("aioBaseUrl:'d1ms_aio_base', aioKey:'d1ms_aio_key', aioModel:'d1ms_aio_model'",
      "aioBaseUrl:'d1ms_aio_base', aioKey:'d1ms_aio_key', aioModel:'d1ms_aio_model', aioFallback:'d1ms_aio_fallback'",
      'LS map');

  // 4b. Legacy-key migration gains the fallback flag
  rep("d1ms_aio_key: 'idot_aio_key', d1ms_aio_model: 'idot_aio_model'",
      "d1ms_aio_key: 'idot_aio_key', d1ms_aio_model: 'idot_aio_model',\n      d1ms_aio_fallback: 'idot_aio_fallback'",
      'migration map');

  // 4c. State init
  rep("aioModel: this.get('d1ms_aio_model') || '',",
      "aioModel: this.get('d1ms_aio_model') || '',\n    aioFallback: this.get('d1ms_aio_fallback') || '0',",
      'state init');

  // 4d. Settings save
  rep('this.set(this.LS.aioModel, this.state.aioModel.trim());',
      "this.set(this.LS.aioModel, this.state.aioModel.trim());\n    this.set(this.LS.aioFallback, this.state.aioFallback === '1' ? '1' : '0');",
      'saveSettings');

  // 4e. Settings checkbox + hint, after the aio model field
  const MODEL_FIELD_END = `<input type="text" value="{{ aioModel }}" onchange="{{ setAioModel }}" placeholder="leave blank for the server default" style="width:100%; padding:9px 11px; background:#fff; border:1px solid var(--border-default); border-radius:var(--radius-sm); color:var(--fg-default); font-size:13px;">
          </div>`;
  rep(MODEL_FIELD_END, MODEL_FIELD_END + `
          <div style="margin-bottom:15px;">
            <label style="display:flex; gap:8px; align-items:flex-start; font-size:12px; color:var(--fg-default); cursor:pointer;">
              <input type="checkbox" checked="{{ aioFallbackOn }}" onchange="{{ toggleAioFallback }}" style="margin-top:2px;">
              <span>Fall back to Claude Sonnet for coaching tips if the local model fails</span>
            </label>
            <div style="font-size:11px; line-height:1.5; color:var(--fg-muted); margin-top:5px;">
              Coaching tips only; end-of-meeting extraction is unaffected. Off by default. When checked, a coaching tip falls back to Claude Sonnet only if the local call is unreachable, times out after 6 seconds, returns nothing, or returns text that looks degenerate (too long, repeating itself, or error-shaped). Only that one recent-discussion snippet is sent, not the full transcript. Uses the same Anthropic API key as the Claude (Anthropic) provider option: set one there once, then switch back here. No key saved there means this checkbox has no effect, the same silent skip as today.
            </div>
          </div>`, 'settings markup');

  // 4f. Template bindings
  rep("aioModel: s.aioModel, setAioModel: this.setField('aioModel'),",
      "aioModel: s.aioModel, setAioModel: this.setField('aioModel'),\n      aioFallbackOn: s.aioFallback === '1', toggleAioFallback: () => this.setState(st => ({ aioFallback: st.aioFallback === '1' ? '0' : '1' })),",
      'bindings');

  // 4g. aioGetInsight: optional abort signal + timeout-specific toast copy
  rep('async aioGetInsight(sys, user, maxTokens){', 'async aioGetInsight(sys, user, maxTokens, signal){', 'aio signature');
  rep("res = await fetch(this.aioApiUrl(base,'chat/completions'), { method:'POST', headers, body:JSON.stringify(payload) });",
      "res = await fetch(this.aioApiUrl(base,'chat/completions'), { method:'POST', headers, body:JSON.stringify(payload), signal });",
      'aio fetch');
  rep(`} catch(err){
      if (!this.aioWarned){ this.aioWarned=true; this.showToast('Cannot reach the self-hosted AI server. Check the base URL, that it is running, and that CORS is enabled.'); }
      console.error('Self-hosted AI error:', err); return null;
    }`,
      `} catch(err){
      if (err && err.name === 'AbortError'){
        if (!this.aioWarned){ this.aioWarned=true; this.showToast('Local model timed out after 6 seconds.'); }
      } else if (!this.aioWarned){ this.aioWarned=true; this.showToast('Cannot reach the self-hosted AI server. Check the base URL, that it is running, and that CORS is enabled.'); }
      console.error('Self-hosted AI error:', err); return null;
    }`, 'aio catch');

  // 4h. Anthropic: model override for the pinned fallback call
  rep('async anthropicGetInsight(sys, user, maxTokens){\n    const key = this.state.anthropicKey; if (!key) return null;',
      'async anthropicGetInsight(sys, user, maxTokens, modelOverride){\n    const key = this.state.anthropicKey; if (!key) return null;',
      'anthropic signature');
  rep("model:this.state.anthropicModel||'claude-haiku-4-5-20251001'",
      "model: modelOverride || this.state.anthropicModel || 'claude-haiku-4-5-20251001'",
      'anthropic model');

  // 4i. Fallback members, after aioApiUrl
  const AIO_URL_FN = "aioApiUrl(base, path){ return base.replace(/\\/v1$/,'') + '/v1/' + path; }";
  rep(AIO_URL_FN, AIO_URL_FN + `
  // Tier-0 coaching fallback. Deterministic, auditable checks only: nothing
  // here asks the model whether it is confident, since the response least
  // likely to be honest about needing help is the one that is degenerate.
  AIO_COACHING_TIMEOUT_MS = 6000;
  AIO_MAX_TIP_CHARS = 600;
  AIO_MIN_WORDS_FOR_REPETITION_CHECK = 8;
  AIO_MIN_UNIQUE_WORD_RATIO = 0.35;
  tier0FallbackWarned = false;
  looksUsable(text){
    if (!text) return false; const t = text.trim(); if (!t) return false;
    if (t === 'NO_COACHING_NEEDED') return true;
    if (t.length > this.AIO_MAX_TIP_CHARS) return false;
    if (/^\\s*\\{?\\s*"?error"?\\s*[:=]/i.test(t)) return false;
    const words = t.toLowerCase().split(/\\s+/).filter(Boolean);
    if (words.length >= this.AIO_MIN_WORDS_FOR_REPETITION_CHECK){
      if (new Set(words).size / words.length < this.AIO_MIN_UNIQUE_WORD_RATIO) return false;
    }
    return true;
  }
  async aioGetInsightWithTimeout(sys, user, maxTokens, timeoutMs){
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try { return await this.aioGetInsight(sys, user, maxTokens, controller.signal); }
    catch(err){ console.error('Local coaching call aborted or errored:', err); return null; }
    finally { clearTimeout(timer); }
  }
  async getCoachingCompletion(sys, user, maxTokens){
    if (this.providerId() !== 'aio') return this.getCompletion(sys, user, maxTokens);
    const primary = await this.aioGetInsightWithTimeout(sys, user, maxTokens, this.AIO_COACHING_TIMEOUT_MS);
    if (this.looksUsable(primary)) return primary;
    const fallbackOn = this.state.aioFallback === '1';
    const fallbackKey = this.state.anthropicKey || '';
    if (!fallbackOn || !fallbackKey) return null;
    if (!this.tier0FallbackWarned){
      this.tier0FallbackWarned = true;
      this.showToast('Local model unavailable or unusable this session. Coaching tips are using Claude Sonnet as a fallback.');
    }
    return this.anthropicGetInsight(sys, user, maxTokens, 'claude-sonnet-5');
  }`, 'fallback members');

  // 4j. Coaching call swap; extraction keeps calling getCompletion
  rep("const text = await this.getCompletion(this.COACHING_SYSTEM, 'Recent meeting discussion:\\n\\n'+recent, 200);",
      "const text = await this.getCoachingCompletion(this.COACHING_SYSTEM, 'Recent meeting discussion:\\n\\n'+recent, 200);",
      'coaching call swap');

  applied.push('tier-0 coaching fallback');
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
