import Anthropic from '@anthropic-ai/sdk';

// Lazy client so that a key set via the Settings page takes effect on the next call
const getClient = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ExtractedMeetingData {
  contractNumber?: string;
  idotProjectNumber?: string;
  route?: string;
  section?: string;
  county?: string;
  lettingDate?: string;
  lettingImpact?: string;
  rowIssues?: string;
  utilities: Array<{
    owner: string;
    facilityType: string;
    conflictType: 'conflict' | 'potential' | 'none';
    location?: string;
    status: string;
    notes?: string;
  }>;
  actionItems: Array<{
    description: string;
    assignee: string;
    dueDate?: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  keyDecisions: Array<{ description: string; madeBy?: string }>;
  risks: Array<{
    description: string;
    level: 'high' | 'medium' | 'low';
    category: string;
    mitigation?: string;
  }>;
}

const EXTRACTION_SYSTEM = `You are an expert at analyzing Illinois Department of Transportation (IDOT) utility coordination meeting transcripts. Extract structured data accurately. Always respond with valid JSON only — no markdown, no commentary.`;

const EXTRACTION_PROMPT = (transcript: string) => `Extract structured data from this IDOT utility coordination meeting transcript. Return a JSON object with this exact structure (use null for missing fields):

{
  "contractNumber": "string|null",
  "idotProjectNumber": "string|null",
  "route": "string|null",
  "section": "string|null",
  "county": "string|null",
  "lettingDate": "string|null",
  "lettingImpact": "string|null",
  "rowIssues": "string|null",
  "utilities": [{"owner":"string","facilityType":"string","conflictType":"conflict|potential|none","location":"string|null","status":"string","notes":"string|null"}],
  "actionItems": [{"description":"string","assignee":"string","dueDate":"YYYY-MM-DD|null","priority":"high|medium|low"}],
  "keyDecisions": [{"description":"string","madeBy":"string|null"}],
  "risks": [{"description":"string","level":"high|medium|low","category":"schedule|cost|technical|legal|other","mitigation":"string|null"}]
}

TRANSCRIPT:
${transcript}`;

export async function extractMeetingData(transcript: string): Promise<ExtractedMeetingData> {
  const stream = getClient().messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    thinking: { type: 'enabled', budget_tokens: 1024 },
    system: EXTRACTION_SYSTEM,
    messages: [{ role: 'user', content: EXTRACTION_PROMPT(transcript) }],
  });

  const message = await stream.finalMessage();
  const text = message.content.find((b) => b.type === 'text')?.text ?? '{}';

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    console.error('Failed to parse Claude extraction response:', text.slice(0, 200));
    return { utilities: [], actionItems: [], keyDecisions: [], risks: [] };
  }
}

const COACHING_SYSTEM = `You are a real-time coaching assistant for IDOT (Illinois Department of Transportation) utility coordination meetings. Provide brief, actionable coaching based on what's being discussed. Focus on IDOT-specific processes, utility coordination requirements, and common meeting pitfalls.`;

export async function generateCoachingInsight(recentTranscript: string, context: string): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const response = await getClient().messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 256,
    system: COACHING_SYSTEM,
    messages: [{
      role: 'user',
      content: `Based on this meeting discussion, provide ONE brief coaching tip (2-3 sentences max). Only respond if there's something genuinely useful to add about IDOT utility coordination processes. If nothing specific is needed, respond with exactly: NO_COACHING_NEEDED

Meeting context: ${context.slice(0, 500)}

Recent discussion: ${recentTranscript.slice(0, 300)}`,
    }],
  });

  const text = response.content.find((b) => b.type === 'text')?.text?.trim() ?? '';
  if (!text || text === 'NO_COACHING_NEEDED') return null;
  return text;
}

export async function* chatWithTranscript(
  question: string,
  transcript: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): AsyncGenerator<string> {
  const messages: Anthropic.MessageParam[] = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: question },
  ];

  const stream = getClient().messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    system: `You are Sidecar, an AI assistant helping analyze an IDOT utility coordination meeting transcript. Answer questions based ONLY on information in the transcript. If something isn't in the transcript, say so clearly. Be concise and cite specific speakers or moments when relevant.

MEETING TRANSCRIPT:
${transcript}`,
    messages,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
