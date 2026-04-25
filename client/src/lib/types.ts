export interface Meeting {
  id: string
  contract_number: string | null
  project_title: string | null
  location: string | null
  date: string
  duration: number | null
  status: 'draft' | 'processing' | 'completed' | 'error'
  participants: string[]
  open_actions?: number
  high_risks?: number
}

export interface MeetingDetail extends Meeting {
  extractedData: ExtractedData | null
  utilities: UtilityFacility[]
  actionItems: ActionItem[]
  risks: Risk[]
  keyDecisions: KeyDecision[]
  transcript: TranscriptSegment[]
}

export interface ExtractedData {
  id: string
  meeting_id: string
  idot_project_number: string | null
  route: string | null
  section: string | null
  county: string | null
  letting_date: string | null
  letting_impact: string | null
  row_issues: string | null
}

export interface UtilityFacility {
  id: string
  meeting_id: string
  owner: string
  facility_type: string | null
  conflict_type: 'conflict' | 'potential' | 'none'
  location: string | null
  status: string | null
  notes: string | null
}

export interface ActionItem {
  id: string
  meeting_id: string
  description: string
  assignee: string | null
  due_date: string | null
  priority: 'high' | 'medium' | 'low'
  status: 'open' | 'in-progress' | 'completed'
}

export interface Risk {
  id: string
  meeting_id: string
  description: string
  level: 'high' | 'medium' | 'low'
  category: string | null
  mitigation: string | null
}

export interface KeyDecision {
  id: string
  meeting_id: string
  description: string
  made_by: string | null
}

export interface TranscriptSegment {
  id: string
  meeting_id: string
  speaker: string
  text: string
  timestamp_seconds: number
  sequence_number: number
}

export interface Metrics {
  totalMeetings: number
  openActions: number
  highRisks: number
  upcomingDeadlines: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}
