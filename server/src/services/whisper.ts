import fs from 'fs';
import OpenAI from 'openai';

export interface TranscriptSegment {
  speaker: string;
  text: string;
  timestampSeconds: number;
  sequenceNumber: number;
}

export async function transcribeAudio(filePath: string): Promise<TranscriptSegment[]> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not set — returning mock transcript');
    return getMockTranscript();
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    const segments = (transcription.segments ?? []).map((seg, i) => ({
      speaker: 'Speaker',
      text: seg.text.trim(),
      timestampSeconds: Math.round(seg.start),
      sequenceNumber: i,
    }))

    return segments.length > 0 ? segments : getMockTranscript();
  } catch (err) {
    console.error('Transcription error:', err);
    return getMockTranscript();
  }
}

function getMockTranscript(): TranscriptSegment[] {
  return [
    { speaker: 'IDOT Representative', text: "Good morning, let's get started with the utility coordination meeting.", timestampSeconds: 0, sequenceNumber: 0 },
    { speaker: 'Utility Representative', text: "Good morning. We've completed our conflict analysis and have some items to discuss.", timestampSeconds: 12, sequenceNumber: 1 },
    { speaker: 'IDOT Representative', text: "Please go ahead and walk us through the conflicts you've identified.", timestampSeconds: 24, sequenceNumber: 2 },
    { speaker: 'Utility Representative', text: "We have a transmission line conflict in the project corridor. Relocation will take approximately 6 to 8 months.", timestampSeconds: 35, sequenceNumber: 3 },
    { speaker: 'IDOT Representative', text: "That timeline is a concern given our letting date. Can you provide a cost estimate and schedule by end of month?", timestampSeconds: 58, sequenceNumber: 4 },
    { speaker: 'Utility Representative', text: "Yes, we can have a preliminary estimate to you within two weeks.", timestampSeconds: 78, sequenceNumber: 5 },
    { speaker: 'IDOT Representative', text: "Excellent. Let's make sure that's captured as an action item. Are there any right-of-way issues we should be aware of?", timestampSeconds: 92, sequenceNumber: 6 },
    { speaker: 'Utility Representative', text: "We'll need to confirm the final ROW limits before finalizing our relocation design.", timestampSeconds: 112, sequenceNumber: 7 },
    { speaker: 'IDOT Representative', text: "Understood. We'll get you the final ROW package. Let's schedule a follow-up for next month.", timestampSeconds: 130, sequenceNumber: 8 },
  ];
}

export function formatTranscriptForClaude(segments: TranscriptSegment[]): string {
  return segments
    .map((seg) => {
      const mins = Math.floor(seg.timestampSeconds / 60);
      const secs = seg.timestampSeconds % 60;
      return `[${mins}:${secs.toString().padStart(2, '0')}] ${seg.speaker}: ${seg.text}`;
    })
    .join('\n');
}
