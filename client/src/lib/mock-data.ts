import type { Meeting, MeetingDetail, Metrics } from './types'

export const mockMetrics: Metrics = {
  totalMeetings: 3,
  openActions: 7,
  highRisks: 3,
  upcomingDeadlines: 4,
}

export const mockMeetings: Meeting[] = [
  {
    id: 'mock-meeting-001',
    contract_number: 'C-2024-0142',
    project_title: 'Route 30 Widening — Will County',
    location: 'Joliet, IL — MP 24.1 to 27.8',
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    duration: 68,
    status: 'completed',
    participants: ['Sarah Mitchell (IDOT)', 'Tom Reynolds (ComEd)', 'Karen Patel (Peoples Gas)', 'Dave Kowalski (AT&T)', 'Mike Chen (Consultant)'],
    open_actions: 3,
    high_risks: 1,
  },
  {
    id: 'mock-meeting-002',
    contract_number: 'C-2024-0089',
    project_title: 'I-290 Bridge Replacement — Cook County',
    location: 'Hillside, IL — Milepost 15.3',
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    duration: 45,
    status: 'completed',
    participants: ['James Ortega (IDOT)', 'Lisa Novak (Peoples Gas)', 'Ron Bailey (ComEd)', 'Alice Thompson (NICOR)'],
    open_actions: 2,
    high_risks: 1,
  },
  {
    id: 'mock-meeting-003',
    contract_number: 'C-2024-0201',
    project_title: 'Route 83 Intersection Improvement',
    location: 'Elmhurst, IL — York Rd & Route 83',
    date: new Date(Date.now() - 1 * 86400000).toISOString(),
    duration: 52,
    status: 'processing',
    participants: ['Sarah Mitchell (IDOT)', 'Frank Torres (AT&T)', 'Mary Johnson (ComEd)'],
    open_actions: 1,
    high_risks: 0,
  },
]

export const mockMeetingDetails: Record<string, MeetingDetail> = {
  'mock-meeting-001': {
    ...mockMeetings[0],
    extractedData: {
      id: 'ed-001', meeting_id: 'mock-meeting-001',
      idot_project_number: 'P-24-0142', route: 'US-30',
      section: '24.1–27.8', county: 'Will', letting_date: 'March 2025',
      letting_impact: 'ComEd relocation may delay letting by 6–8 weeks',
      row_issues: 'ROW acquisition 82% complete; 3 parcels still in negotiation near MP 25.4',
    },
    utilities: [
      { id: 'u1', meeting_id: 'mock-meeting-001', owner: 'ComEd', facility_type: '69kV Transmission Line', conflict_type: 'conflict', location: 'MP 25.2–26.1', status: 'Relocation design in progress', notes: 'Estimated 8-month lead time for pole replacement' },
      { id: 'u2', meeting_id: 'mock-meeting-001', owner: 'Peoples Gas', facility_type: '4-inch Gas Main', conflict_type: 'potential', location: 'MP 24.8', status: 'Field verification needed', notes: 'As-built plans show potential conflict with new curb line' },
      { id: 'u3', meeting_id: 'mock-meeting-001', owner: 'AT&T', facility_type: 'Buried Fiber Optic', conflict_type: 'none', location: 'MP 24.1–27.8', status: 'No conflict identified', notes: 'Located 10ft outside proposed ROW' },
    ],
    actionItems: [
      { id: 'a1', meeting_id: 'mock-meeting-001', description: 'ComEd to submit relocation cost estimate and schedule to IDOT', assignee: 'Tom Reynolds (ComEd)', due_date: '2024-12-15', priority: 'high', status: 'open' },
      { id: 'a2', meeting_id: 'mock-meeting-001', description: 'Consultant to perform field verification at MP 24.8 for Peoples Gas conflict', assignee: 'Mike Chen (Consultant)', due_date: '2024-12-08', priority: 'high', status: 'in-progress' },
      { id: 'a3', meeting_id: 'mock-meeting-001', description: 'IDOT to confirm ROW status for 3 remaining parcels', assignee: 'Sarah Mitchell (IDOT)', due_date: '2024-12-20', priority: 'medium', status: 'open' },
      { id: 'a4', meeting_id: 'mock-meeting-001', description: 'Schedule follow-up coordination meeting for Q1 2025', assignee: 'Sarah Mitchell (IDOT)', due_date: '2025-01-10', priority: 'low', status: 'open' },
    ],
    risks: [
      { id: 'r1', meeting_id: 'mock-meeting-001', description: 'ComEd relocation timeline may push letting past March 2025 target', level: 'high', category: 'schedule', mitigation: 'IDOT exploring fast-track design approval; considering 60-day letting delay' },
      { id: 'r2', meeting_id: 'mock-meeting-001', description: 'Unverified Peoples Gas conflict at MP 24.8 could require expensive main relocation', level: 'medium', category: 'cost', mitigation: 'Field verification scheduled for next week' },
      { id: 'r3', meeting_id: 'mock-meeting-001', description: '3 outstanding ROW parcels may require condemnation proceedings', level: 'medium', category: 'legal', mitigation: 'IDOT legal counsel reviewing condemnation options' },
    ],
    keyDecisions: [
      { id: 'kd1', meeting_id: 'mock-meeting-001', description: 'IDOT will proceed with March 2025 letting contingent on ComEd confirming 6-month relocation schedule by Dec 15', made_by: 'Sarah Mitchell (IDOT)' },
      { id: 'kd2', meeting_id: 'mock-meeting-001', description: 'AT&T fiber conflict ruled out — no design changes needed in this corridor', made_by: 'Sarah Mitchell (IDOT)' },
    ],
    transcript: [
      { id: 't0', meeting_id: 'mock-meeting-001', speaker: 'Sarah Mitchell', text: "Good morning everyone. Let's get started with our utility coordination meeting for Contract C-2024-0142, the Route 30 widening project in Will County.", timestamp_seconds: 0, sequence_number: 0 },
      { id: 't1', meeting_id: 'mock-meeting-001', speaker: 'Tom Reynolds', text: "Thanks Sarah. Tom Reynolds from ComEd. We've completed our preliminary conflict analysis and we do have a significant issue with our 69kV transmission line between mileposts 25.2 and 26.1.", timestamp_seconds: 15, sequence_number: 1 },
      { id: 't2', meeting_id: 'mock-meeting-001', speaker: 'Sarah Mitchell', text: "Tom, can you give us an estimated timeline for relocation? We're targeting a March 2025 letting date.", timestamp_seconds: 35, sequence_number: 2 },
      { id: 't3', meeting_id: 'mock-meeting-001', speaker: 'Tom Reynolds', text: "That's going to be tight, Sarah. We're looking at 8 months minimum for the pole replacements and line work. Our engineering team needs at least 2 months just for the design. Can we get the full ROW details to finalize our cost estimate?", timestamp_seconds: 52, sequence_number: 3 },
      { id: 't4', meeting_id: 'mock-meeting-001', speaker: 'Karen Patel', text: "Karen Patel from Peoples Gas. We have a potential conflict at milepost 24.8 with our 4-inch gas main. Our as-built plans show it might be in conflict with the proposed curb line, but we need field verification.", timestamp_seconds: 90, sequence_number: 4 },
      { id: 't5', meeting_id: 'mock-meeting-001', speaker: 'Mike Chen', text: "I can schedule field verification for next week. We should have results by December 8th.", timestamp_seconds: 115, sequence_number: 5 },
      { id: 't6', meeting_id: 'mock-meeting-001', speaker: 'Dave Kowalski', text: "Dave Kowalski, AT&T. I've checked our buried fiber and it's located about 10 feet outside the proposed ROW throughout the project limits. We don't anticipate any conflicts.", timestamp_seconds: 140, sequence_number: 6 },
      { id: 't7', meeting_id: 'mock-meeting-001', speaker: 'Sarah Mitchell', text: "Good news on the AT&T fiber. Tom, I need you to commit to a cost estimate and schedule by December 15th so we can make a decision on the letting date. Can you do that?", timestamp_seconds: 165, sequence_number: 7 },
      { id: 't8', meeting_id: 'mock-meeting-001', speaker: 'Tom Reynolds', text: "December 15th is doable for a preliminary estimate, but I'll need the final ROW package to confirm it.", timestamp_seconds: 188, sequence_number: 8 },
      { id: 't9', meeting_id: 'mock-meeting-001', speaker: 'Sarah Mitchell', text: "Understood. We're at 82% ROW acquisition. Three parcels are still in negotiation near milepost 25.4. Let's plan our next coordination meeting for mid-January.", timestamp_seconds: 210, sequence_number: 9 },
    ],
  },
  'mock-meeting-002': {
    ...mockMeetings[1],
    extractedData: {
      id: 'ed-002', meeting_id: 'mock-meeting-002',
      idot_project_number: 'P-24-0089', route: 'I-290',
      section: '15.3', county: 'Cook', letting_date: 'June 2025',
      letting_impact: 'On schedule pending gas relocation approval',
      row_issues: 'ROW fully acquired',
    },
    utilities: [
      { id: 'u4', meeting_id: 'mock-meeting-002', owner: 'Peoples Gas', facility_type: '8-inch High Pressure Gas Main', conflict_type: 'conflict', location: 'Bridge Pier B2', status: 'Joint use agreement in negotiation', notes: 'Cannot be relocated; joint use required' },
      { id: 'u5', meeting_id: 'mock-meeting-002', owner: 'ComEd', facility_type: '12kV Distribution Line', conflict_type: 'none', location: 'ROW edge', status: 'Cleared', notes: 'Aerial line, no conflict with bridge work' },
    ],
    actionItems: [
      { id: 'a5', meeting_id: 'mock-meeting-002', description: 'Peoples Gas to provide joint use agreement draft to IDOT legal', assignee: 'Lisa Novak (Peoples Gas)', due_date: '2024-12-20', priority: 'high', status: 'open' },
      { id: 'a6', meeting_id: 'mock-meeting-002', description: 'IDOT to review joint use precedent cases from similar bridge projects', assignee: 'James Ortega (IDOT)', due_date: '2024-12-18', priority: 'medium', status: 'open' },
    ],
    risks: [
      { id: 'r4', meeting_id: 'mock-meeting-002', description: 'Joint use agreement negotiations may delay construction start', level: 'high', category: 'legal', mitigation: 'Escalate to IDOT District 1 if not resolved by end of month' },
    ],
    keyDecisions: [
      { id: 'kd3', meeting_id: 'mock-meeting-002', description: 'Joint use approach approved in principle; legal teams to finalize agreement terms within 30 days', made_by: 'James Ortega (IDOT)' },
    ],
    transcript: [
      { id: 'tt0', meeting_id: 'mock-meeting-002', speaker: 'James Ortega', text: "Let's start with the utility coordination for the I-290 bridge replacement. Lisa, can you give us your update on the gas main situation at Pier B2?", timestamp_seconds: 0, sequence_number: 0 },
      { id: 'tt1', meeting_id: 'mock-meeting-002', speaker: 'Lisa Novak', text: "Thanks James. The 8-inch high-pressure gas main at Bridge Pier B2 cannot be relocated due to the high-pressure service connection downstream. We're proposing a joint use agreement to allow the bridge structure to be built around it.", timestamp_seconds: 18, sequence_number: 1 },
      { id: 'tt2', meeting_id: 'mock-meeting-002', speaker: 'James Ortega', text: "Has IDOT done joint use agreements on bridge projects before? I want to make sure we have precedent.", timestamp_seconds: 45, sequence_number: 2 },
      { id: 'tt3', meeting_id: 'mock-meeting-002', speaker: 'Ron Bailey', text: "Ron Bailey, ComEd. Our 12kV distribution line is aerial and runs along the edge of the ROW. We don't see any conflict with the bridge replacement work.", timestamp_seconds: 95, sequence_number: 3 },
      { id: 'tt4', meeting_id: 'mock-meeting-002', speaker: 'James Ortega', text: "Good to hear, Ron. Lisa, I'm going to approve the joint use approach in principle, but we need the draft agreement within 30 days. Can your team make that happen?", timestamp_seconds: 120, sequence_number: 4 },
      { id: 'tt5', meeting_id: 'mock-meeting-002', speaker: 'Lisa Novak', text: "Yes, we can have a draft to your legal team by December 20th.", timestamp_seconds: 145, sequence_number: 5 },
    ],
  },
  'mock-meeting-003': {
    ...mockMeetings[2],
    extractedData: null,
    utilities: [],
    actionItems: [
      { id: 'a7', meeting_id: 'mock-meeting-003', description: 'AT&T to provide updated facility maps for signal pole locations', assignee: 'Frank Torres (AT&T)', due_date: '2024-12-10', priority: 'high', status: 'open' },
    ],
    risks: [],
    keyDecisions: [],
    transcript: [],
  },
}
