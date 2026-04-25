import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  createMeeting, updateMeeting,
  upsertExtractedData, insertUtilities, insertActionItems,
  insertRisks, insertKeyDecisions, insertTranscript,
} from '../db/client.js';
import { transcribeAudio, formatTranscriptForClaude } from '../services/whisper.js';
import { extractMeetingData, generateCoachingInsight } from '../services/claude.js';

const router = Router();

// Configure multer storage
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.m4a', '.mp4', '.ogg', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  },
});

// In-progress processing tracker (in-memory)
const processingStatus: Record<string, { progress: number; status: string; error?: string }> = {};

// POST /api/upload
router.post('/', upload.single('audio'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  try {
    // Create meeting record
    const meeting = await createMeeting({
      contractNumber: req.body.contractNumber,
      projectTitle: req.body.projectTitle || `Meeting ${new Date().toLocaleDateString()}`,
      location: req.body.location,
      date: req.body.date || new Date().toISOString(),
      participants: req.body.participants ? JSON.parse(req.body.participants) : [],
    });

    await updateMeeting(meeting.id, {
      status: 'processing',
      audio_file_path: req.file.path,
    });

    processingStatus[meeting.id] = { progress: 5, status: 'processing' };

    // Start async processing pipeline
    processMeeting(meeting.id, req.file.path).catch((err) => {
      console.error(`Processing failed for meeting ${meeting.id}:`, err);
      processingStatus[meeting.id] = { progress: 0, status: 'error', error: err.message };
      updateMeeting(meeting.id, { status: 'error' }).catch(console.error);
    });

    res.status(202).json({ meetingId: meeting.id, status: 'processing' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

async function processMeeting(meetingId: string, filePath: string) {
  processingStatus[meetingId] = { progress: 10, status: 'processing' };

  // Step 1: Transcribe
  console.log(`[${meetingId}] Starting transcription...`);
  const segments = await transcribeAudio(filePath);
  processingStatus[meetingId] = { progress: 50, status: 'processing' };

  // Save transcript
  await insertTranscript(meetingId, segments);
  processingStatus[meetingId] = { progress: 60, status: 'processing' };

  // Step 2: Extract structured data with Claude
  console.log(`[${meetingId}] Extracting meeting data...`);
  const fullTranscript = formatTranscriptForClaude(segments);
  const extracted = await extractMeetingData(fullTranscript);
  processingStatus[meetingId] = { progress: 85, status: 'processing' };

  // Step 3: Save extracted data
  await Promise.all([
    upsertExtractedData(meetingId, {
      idotProjectNumber: extracted.idotProjectNumber,
      route: extracted.route,
      section: extracted.section,
      county: extracted.county,
      lettingDate: extracted.lettingDate,
      lettingImpact: extracted.lettingImpact,
      rowIssues: extracted.rowIssues,
    }),
    extracted.utilities.length > 0 ? insertUtilities(meetingId, extracted.utilities) : Promise.resolve(),
    extracted.actionItems.length > 0 ? insertActionItems(meetingId, extracted.actionItems) : Promise.resolve(),
    extracted.risks.length > 0 ? insertRisks(meetingId, extracted.risks) : Promise.resolve(),
    extracted.keyDecisions.length > 0 ? insertKeyDecisions(meetingId, extracted.keyDecisions) : Promise.resolve(),
  ]);

  // Update meeting with extracted contract number if found
  const updates: Record<string, any> = { status: 'completed' };
  if (extracted.contractNumber) updates.contract_number = extracted.contractNumber;
  await updateMeeting(meetingId, updates);

  processingStatus[meetingId] = { progress: 100, status: 'completed' };
  console.log(`[${meetingId}] Processing complete.`);
}

// GET /api/upload/status/:meetingId
router.get('/status/:meetingId', async (req: Request, res: Response) => {
  const status = processingStatus[req.params.meetingId];
  if (!status) {
    // Check DB
    try {
      const { getMeetingById } = await import('../db/client.js');
      const meeting = await getMeetingById(req.params.meetingId);
      if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
      return res.json({ status: meeting.status, progress: meeting.status === 'completed' ? 100 : 0 });
    } catch {
      return res.status(404).json({ error: 'Status not found' });
    }
  }
  res.json(status);
});

// POST /api/upload/coaching
router.post('/coaching', async (req: Request, res: Response) => {
  const { recentText, context } = req.body;
  if (!recentText) return res.status(400).json({ error: 'recentText required' });

  try {
    const insight = await generateCoachingInsight(recentText, context || '');
    res.json({ insight });
  } catch (err) {
    console.error('Coaching error:', err);
    res.json({ insight: null });
  }
});

export default router;
