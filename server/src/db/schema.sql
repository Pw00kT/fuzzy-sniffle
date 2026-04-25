CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number VARCHAR(100),
  project_title VARCHAR(500),
  location VARCHAR(500),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration INTEGER,
  status VARCHAR(50) DEFAULT 'draft',
  participants TEXT[],
  audio_file_path VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS extracted_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE UNIQUE,
  idot_project_number VARCHAR(100),
  route VARCHAR(100),
  section VARCHAR(100),
  county VARCHAR(100),
  letting_date VARCHAR(100),
  letting_impact TEXT,
  row_issues TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS utility_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  owner VARCHAR(200) NOT NULL,
  facility_type VARCHAR(200),
  conflict_type VARCHAR(50) DEFAULT 'none',
  location VARCHAR(500),
  status VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  assignee VARCHAR(200),
  due_date DATE,
  priority VARCHAR(50) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS key_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  made_by VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  level VARCHAR(50) DEFAULT 'medium',
  category VARCHAR(100),
  mitigation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  speaker VARCHAR(200),
  text TEXT NOT NULL,
  timestamp_seconds INTEGER DEFAULT 0,
  sequence_number INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_action_items_meeting ON action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_risks_meeting ON risks(meeting_id);
CREATE INDEX IF NOT EXISTS idx_risks_level ON risks(level);
CREATE INDEX IF NOT EXISTS idx_transcripts_meeting ON transcripts(meeting_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_chat_messages_meeting ON chat_messages(meeting_id, created_at);
