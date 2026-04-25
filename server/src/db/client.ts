import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// ─── In-Memory Store (fallback when DATABASE_URL is not set) ──────────────────

interface InMemoryStore {
  meetings: Record<string, any>;
  extractedData: Record<string, any>;
  utilities: Record<string, any[]>;
  actionItems: Record<string, any[]>;
  keyDecisions: Record<string, any[]>;
  risks: Record<string, any[]>;
  transcripts: Record<string, any[]>;
  chatMessages: Record<string, any[]>;
}

const store: InMemoryStore = {
  meetings: {},
  extractedData: {},
  utilities: {},
  actionItems: {},
  keyDecisions: {},
  risks: {},
  transcripts: {},
  chatMessages: {},
};

// Seed with mock data
function seedMockData() {
  const m1id = 'mock-meeting-001';
  const m2id = 'mock-meeting-002';
  const m3id = 'mock-meeting-003';

  store.meetings[m1id] = {
    id: m1id,
    contract_number: 'C-2024-0142',
    project_title: 'Route 30 Widening — Will County',
    location: 'Joliet, IL — MP 24.1 to 27.8',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 68,
    status: 'completed',
    participants: ['Sarah Mitchell (IDOT)', 'Tom Reynolds (ComEd)', 'Karen Patel (Peoples Gas)', 'Dave Kowalski (AT&T)', 'Mike Chen (Consultant)'],
    audio_file_path: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  store.meetings[m2id] = {
    id: m2id,
    contract_number: 'C-2024-0089',
    project_title: 'I-290 Bridge Replacement — Cook County',
    location: 'Hillside, IL — Milepost 15.3',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 45,
    status: 'completed',
    participants: ['James Ortega (IDOT)', 'Lisa Novak (Peoples Gas)', 'Ron Bailey (ComEd)', 'Alice Thompson (NICOR)'],
    audio_file_path: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  store.meetings[m3id] = {
    id: m3id,
    contract_number: 'C-2024-0201',
    project_title: 'Route 83 Intersection Improvement',
    location: 'Elmhurst, IL — York Rd & Route 83',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 52,
    status: 'processing',
    participants: ['Sarah Mitchell (IDOT)', 'Frank Torres (AT&T)', 'Mary Johnson (ComEd)'],
    audio_file_path: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  store.extractedData[m1id] = {
    id: uuidv4(), meeting_id: m1id, idot_project_number: 'P-24-0142',
    route: 'US-30', section: '24.1-27.8', county: 'Will',
    letting_date: 'March 2025', letting_impact: 'ComEd relocation may delay letting by 6-8 weeks',
    row_issues: 'ROW acquisition 82% complete; 3 parcels still in negotiation near MP 25.4',
  };
  store.extractedData[m2id] = {
    id: uuidv4(), meeting_id: m2id, idot_project_number: 'P-24-0089',
    route: 'I-290', section: '15.3', county: 'Cook',
    letting_date: 'June 2025', letting_impact: 'On schedule pending gas relocation approval',
    row_issues: 'ROW fully acquired',
  };

  store.utilities[m1id] = [
    { id: uuidv4(), meeting_id: m1id, owner: 'ComEd', facility_type: '69kV Transmission Line', conflict_type: 'conflict', location: 'MP 25.2–26.1', status: 'Relocation design in progress', notes: 'Estimated 8-month lead time for pole replacement' },
    { id: uuidv4(), meeting_id: m1id, owner: 'Peoples Gas', facility_type: '4-inch Gas Main', conflict_type: 'potential', location: 'MP 24.8', status: 'Field verification needed', notes: 'As-built plans show potential conflict with new curb line' },
    { id: uuidv4(), meeting_id: m1id, owner: 'AT&T', facility_type: 'Buried Fiber Optic', conflict_type: 'none', location: 'MP 24.1–27.8', status: 'No conflict identified', notes: 'Located 10ft outside proposed ROW' },
  ];
  store.utilities[m2id] = [
    { id: uuidv4(), meeting_id: m2id, owner: 'Peoples Gas', facility_type: '8-inch High Pressure Gas Main', conflict_type: 'conflict', location: 'Bridge Pier B2', status: 'Joint use agreement in negotiation', notes: 'Cannot be relocated; joint use required' },
    { id: uuidv4(), meeting_id: m2id, owner: 'ComEd', facility_type: '12kV Distribution Line', conflict_type: 'none', location: 'ROW edge', status: 'Cleared', notes: 'Aerial line, no conflict with bridge work' },
  ];

  store.actionItems[m1id] = [
    { id: uuidv4(), meeting_id: m1id, description: 'ComEd to submit relocation cost estimate and schedule to IDOT', assignee: 'Tom Reynolds (ComEd)', due_date: '2024-12-15', priority: 'high', status: 'open' },
    { id: uuidv4(), meeting_id: m1id, description: 'Consultant to perform field verification at MP 24.8 for Peoples Gas conflict', assignee: 'Mike Chen (Consultant)', due_date: '2024-12-08', priority: 'high', status: 'in-progress' },
    { id: uuidv4(), meeting_id: m1id, description: 'IDOT to confirm ROW status for 3 remaining parcels', assignee: 'Sarah Mitchell (IDOT)', due_date: '2024-12-20', priority: 'medium', status: 'open' },
    { id: uuidv4(), meeting_id: m1id, description: 'Schedule follow-up meeting for Q1 2025', assignee: 'Sarah Mitchell (IDOT)', due_date: '2025-01-10', priority: 'low', status: 'open' },
  ];
  store.actionItems[m2id] = [
    { id: uuidv4(), meeting_id: m2id, description: 'Peoples Gas to provide joint use agreement draft', assignee: 'Lisa Novak (Peoples Gas)', due_date: '2024-12-20', priority: 'high', status: 'open' },
    { id: uuidv4(), meeting_id: m2id, description: 'IDOT to review joint use precedent cases', assignee: 'James Ortega (IDOT)', due_date: '2024-12-18', priority: 'medium', status: 'open' },
  ];
  store.actionItems[m3id] = [
    { id: uuidv4(), meeting_id: m3id, description: 'AT&T to provide updated facility maps for signal pole locations', assignee: 'Frank Torres (AT&T)', due_date: '2024-12-10', priority: 'high', status: 'open' },
  ];

  store.risks[m1id] = [
    { id: uuidv4(), meeting_id: m1id, description: 'ComEd relocation timeline may push letting past March 2025 target', level: 'high', category: 'schedule', mitigation: 'IDOT exploring fast-track design approval with ComEd; considering 60-day letting delay if needed' },
    { id: uuidv4(), meeting_id: m1id, description: 'Unverified Peoples Gas conflict at MP 24.8 could require expensive main relocation', level: 'medium', category: 'cost', mitigation: 'Field verification scheduled for next week' },
    { id: uuidv4(), meeting_id: m1id, description: '3 outstanding ROW parcels may require condemnation', level: 'medium', category: 'legal', mitigation: 'IDOT legal counsel reviewing condemnation options' },
  ];
  store.risks[m2id] = [
    { id: uuidv4(), meeting_id: m2id, description: 'Joint use agreement negotiations may delay project', level: 'high', category: 'legal', mitigation: 'Escalate to IDOT District 1 if not resolved by end of month' },
  ];

  store.keyDecisions[m1id] = [
    { id: uuidv4(), meeting_id: m1id, description: 'IDOT will proceed with March 2025 letting contingent on ComEd confirming 6-month relocation schedule by Dec 15', made_by: 'Sarah Mitchell (IDOT)' },
    { id: uuidv4(), meeting_id: m1id, description: 'AT&T fiber conflict ruled out — no design changes needed', made_by: 'Sarah Mitchell (IDOT)' },
  ];
  store.keyDecisions[m2id] = [
    { id: uuidv4(), meeting_id: m2id, description: 'Joint use approach approved in principle; legal teams to finalize agreement terms', made_by: 'James Ortega (IDOT)' },
  ];

  store.transcripts[m1id] = [
    { id: uuidv4(), meeting_id: m1id, speaker: 'Sarah Mitchell', text: "Good morning everyone. Let's get started with our utility coordination meeting for Contract C-2024-0142, the Route 30 widening project in Will County.", timestamp_seconds: 0, sequence_number: 0 },
    { id: uuidv4(), meeting_id: m1id, speaker: 'Tom Reynolds', text: "Thanks Sarah. Tom Reynolds from ComEd. We've completed our preliminary conflict analysis and we do have a significant issue with our 69kV transmission line between mileposts 25.2 and 26.1.", timestamp_seconds: 15, sequence_number: 1 },
    { id: uuidv4(), meeting_id: m1id, speaker: 'Sarah Mitchell', text: "Tom, can you give us an estimated timeline for relocation? We're targeting a March 2025 letting date.", timestamp_seconds: 35, sequence_number: 2 },
    { id: uuidv4(), meeting_id: m1id, speaker: 'Tom Reynolds', text: "That's going to be tight, Sarah. We're looking at 8 months minimum for the pole replacements and line work. Our engineering team needs at least 2 months just for the design. Can we get the full ROW details to finalize our cost estimate?", timestamp_seconds: 52, sequence_number: 3 },
    { id: uuidv4(), meeting_id: m1id, speaker: 'Karen Patel', text: "Karen Patel from Peoples Gas. We have a potential conflict at milepost 24.8 with our 4-inch gas main. Our as-built plans show it might be in conflict with the proposed curb line, but we need field verification.", timestamp_seconds: 90, sequence_number: 4 },
    { id: uuidv4(), meeting_id: m1id, speaker: 'Mike Chen', text: "I can schedule field verification for next week. We should have results by December 8th.", timestamp_seconds: 115, sequence_number: 5 },
    { id: uuidv4(), meeting_id: m1id, speaker: 'Dave Kowalski', text: "Dave Kowalski, AT&T. I've checked our buried fiber and it's located about 10 feet outside the proposed ROW throughout the project limits. We don't anticipate any conflicts.", timestamp_seconds: 140, sequence_number: 6 },
    { id: uuidv4(), meeting_id: m1id, speaker: 'Sarah Mitchell', text: "Good news on the AT&T fiber. Tom, I need you to commit to a cost estimate and schedule by December 15th so we can make a decision on the letting date. Can you do that?", timestamp_seconds: 165, sequence_number: 7 },
    { id: uuidv4(), meeting_id: m1id, speaker: 'Tom Reynolds', text: "December 15th is doable for a preliminary estimate, but I'll need the final ROW package to confirm it.", timestamp_seconds: 188, sequence_number: 8 },
    { id: uuidv4(), meeting_id: m1id, speaker: 'Sarah Mitchell', text: "Understood. We're at 82% ROW acquisition. Three parcels are still in negotiation near milepost 25.4. Let's plan our next coordination meeting for mid-January.", timestamp_seconds: 210, sequence_number: 9 },
  ];
}

seedMockData();

// ─── Database Interface ───────────────────────────────────────────────────────

let pool: Pool | null = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
  });
}

export const useDatabase = () => !!pool;

// ─── Meeting queries ──────────────────────────────────────────────────────────

export async function getMeetings() {
  if (pool) {
    const { rows } = await pool.query(
      `SELECT m.*,
        COUNT(DISTINCT ai.id) FILTER (WHERE ai.status = 'open') as open_actions,
        COUNT(DISTINCT r.id) FILTER (WHERE r.level = 'high') as high_risks
       FROM meetings m
       LEFT JOIN action_items ai ON ai.meeting_id = m.id
       LEFT JOIN risks r ON r.meeting_id = m.id
       GROUP BY m.id
       ORDER BY m.date DESC`
    );
    return rows;
  }
  return Object.values(store.meetings)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((m) => ({
      ...m,
      open_actions: (store.actionItems[m.id] || []).filter((a) => a.status === 'open').length,
      high_risks: (store.risks[m.id] || []).filter((r) => r.level === 'high').length,
    }));
}

export async function getMeetingById(id: string) {
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM meetings WHERE id = $1', [id]);
    return rows[0] || null;
  }
  return store.meetings[id] || null;
}

export async function createMeeting(data: {
  contractNumber?: string;
  projectTitle?: string;
  location?: string;
  date?: string;
  participants?: string[];
}) {
  if (pool) {
    const { rows } = await pool.query(
      `INSERT INTO meetings (contract_number, project_title, location, date, participants, status)
       VALUES ($1, $2, $3, $4, $5, 'draft') RETURNING *`,
      [data.contractNumber, data.projectTitle, data.location, data.date || new Date(), data.participants || []]
    );
    return rows[0];
  }
  const id = uuidv4();
  const meeting = {
    id, contract_number: data.contractNumber, project_title: data.projectTitle,
    location: data.location, date: data.date || new Date().toISOString(),
    duration: null, status: 'draft', participants: data.participants || [],
    audio_file_path: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  store.meetings[id] = meeting;
  return meeting;
}

export async function updateMeeting(id: string, data: Record<string, any>) {
  if (pool) {
    const fields = Object.keys(data).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE meetings SET ${fields}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...Object.values(data)]
    );
    return rows[0];
  }
  if (store.meetings[id]) {
    store.meetings[id] = { ...store.meetings[id], ...data, updated_at: new Date().toISOString() };
  }
  return store.meetings[id];
}

// ─── Detail queries ───────────────────────────────────────────────────────────

export async function getExtractedData(meetingId: string) {
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM extracted_data WHERE meeting_id = $1', [meetingId]);
    return rows[0] || null;
  }
  return store.extractedData[meetingId] || null;
}

export async function upsertExtractedData(meetingId: string, data: Record<string, any>) {
  if (pool) {
    await pool.query(
      `INSERT INTO extracted_data (meeting_id, idot_project_number, route, section, county, letting_date, letting_impact, row_issues)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (meeting_id) DO UPDATE SET
         idot_project_number=EXCLUDED.idot_project_number, route=EXCLUDED.route,
         section=EXCLUDED.section, county=EXCLUDED.county, letting_date=EXCLUDED.letting_date,
         letting_impact=EXCLUDED.letting_impact, row_issues=EXCLUDED.row_issues`,
      [meetingId, data.idotProjectNumber, data.route, data.section, data.county, data.lettingDate, data.lettingImpact, data.rowIssues]
    );
    return;
  }
  store.extractedData[meetingId] = { id: uuidv4(), meeting_id: meetingId, ...data };
}

export async function getUtilities(meetingId: string) {
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM utility_facilities WHERE meeting_id = $1', [meetingId]);
    return rows;
  }
  return store.utilities[meetingId] || [];
}

export async function insertUtilities(meetingId: string, utilities: any[]) {
  if (pool) {
    for (const u of utilities) {
      await pool.query(
        `INSERT INTO utility_facilities (meeting_id, owner, facility_type, conflict_type, location, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [meetingId, u.owner, u.facilityType, u.conflictType, u.location, u.status, u.notes]
      );
    }
    return;
  }
  store.utilities[meetingId] = utilities.map((u) => ({ id: uuidv4(), meeting_id: meetingId, owner: u.owner, facility_type: u.facilityType, conflict_type: u.conflictType, location: u.location, status: u.status, notes: u.notes }));
}

export async function getActionItems(meetingId: string) {
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM action_items WHERE meeting_id = $1 ORDER BY priority, due_date', [meetingId]);
    return rows;
  }
  return store.actionItems[meetingId] || [];
}

export async function insertActionItems(meetingId: string, items: any[]) {
  if (pool) {
    for (const item of items) {
      await pool.query(
        `INSERT INTO action_items (meeting_id, description, assignee, due_date, priority, status) VALUES ($1,$2,$3,$4,$5,'open')`,
        [meetingId, item.description, item.assignee, item.dueDate || null, item.priority]
      );
    }
    return;
  }
  store.actionItems[meetingId] = items.map((item) => ({ id: uuidv4(), meeting_id: meetingId, description: item.description, assignee: item.assignee, due_date: item.dueDate || null, priority: item.priority, status: 'open' }));
}

export async function getRisks(meetingId: string) {
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM risks WHERE meeting_id = $1 ORDER BY level', [meetingId]);
    return rows;
  }
  return store.risks[meetingId] || [];
}

export async function insertRisks(meetingId: string, risks: any[]) {
  if (pool) {
    for (const r of risks) {
      await pool.query(
        `INSERT INTO risks (meeting_id, description, level, category, mitigation) VALUES ($1,$2,$3,$4,$5)`,
        [meetingId, r.description, r.level, r.category, r.mitigation]
      );
    }
    return;
  }
  store.risks[meetingId] = risks.map((r) => ({ id: uuidv4(), meeting_id: meetingId, description: r.description, level: r.level, category: r.category, mitigation: r.mitigation }));
}

export async function getKeyDecisions(meetingId: string) {
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM key_decisions WHERE meeting_id = $1', [meetingId]);
    return rows;
  }
  return store.keyDecisions[meetingId] || [];
}

export async function insertKeyDecisions(meetingId: string, decisions: any[]) {
  if (pool) {
    for (const d of decisions) {
      await pool.query(
        `INSERT INTO key_decisions (meeting_id, description, made_by) VALUES ($1,$2,$3)`,
        [meetingId, d.description, d.madeBy]
      );
    }
    return;
  }
  store.keyDecisions[meetingId] = decisions.map((d) => ({ id: uuidv4(), meeting_id: meetingId, description: d.description, made_by: d.madeBy }));
}

export async function getTranscript(meetingId: string) {
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM transcripts WHERE meeting_id = $1 ORDER BY sequence_number', [meetingId]);
    return rows;
  }
  return store.transcripts[meetingId] || [];
}

export async function insertTranscript(meetingId: string, segments: any[]) {
  if (pool) {
    for (const seg of segments) {
      await pool.query(
        `INSERT INTO transcripts (meeting_id, speaker, text, timestamp_seconds, sequence_number) VALUES ($1,$2,$3,$4,$5)`,
        [meetingId, seg.speaker, seg.text, seg.timestampSeconds || 0, seg.sequenceNumber || 0]
      );
    }
    return;
  }
  store.transcripts[meetingId] = segments.map((seg, i) => ({ id: uuidv4(), meeting_id: meetingId, speaker: seg.speaker, text: seg.text, timestamp_seconds: seg.timestampSeconds || 0, sequence_number: seg.sequenceNumber || i }));
}

export async function getChatHistory(meetingId: string) {
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM chat_messages WHERE meeting_id = $1 ORDER BY created_at', [meetingId]);
    return rows;
  }
  return store.chatMessages[meetingId] || [];
}

export async function saveChatMessage(meetingId: string, role: string, content: string) {
  if (pool) {
    await pool.query('INSERT INTO chat_messages (meeting_id, role, content) VALUES ($1,$2,$3)', [meetingId, role, content]);
    return;
  }
  if (!store.chatMessages[meetingId]) store.chatMessages[meetingId] = [];
  store.chatMessages[meetingId].push({ id: uuidv4(), meeting_id: meetingId, role, content, created_at: new Date().toISOString() });
}

export async function getMetrics() {
  if (pool) {
    const [total, openActions, highRisks, upcoming] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM meetings'),
      pool.query("SELECT COUNT(*) FROM action_items WHERE status = 'open'"),
      pool.query("SELECT COUNT(*) FROM risks WHERE level = 'high'"),
      pool.query("SELECT COUNT(*) FROM action_items WHERE status = 'open' AND due_date <= NOW() + INTERVAL '7 days'"),
    ]);
    return {
      totalMeetings: parseInt(total.rows[0].count),
      openActions: parseInt(openActions.rows[0].count),
      highRisks: parseInt(highRisks.rows[0].count),
      upcomingDeadlines: parseInt(upcoming.rows[0].count),
    };
  }
  const allMeetings = Object.values(store.meetings);
  const allActions = Object.values(store.actionItems).flat();
  const allRisks = Object.values(store.risks).flat();
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    totalMeetings: allMeetings.length,
    openActions: allActions.filter((a: any) => a.status === 'open').length,
    highRisks: allRisks.filter((r: any) => r.level === 'high').length,
    upcomingDeadlines: allActions.filter((a: any) => a.status === 'open' && a.due_date && new Date(a.due_date) <= week).length,
  };
}
