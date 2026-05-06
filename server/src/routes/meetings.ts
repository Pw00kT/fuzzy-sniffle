import { Router, Request, Response } from 'express';
import {
  getMeetings, getMeetingById, createMeeting, updateMeeting,
  getExtractedData, getUtilities, getActionItems, getRisks,
  getKeyDecisions, getTranscript, updateActionItem,
} from '../db/client.js';

const router = Router();

// GET /api/meetings
router.get('/', async (_req: Request, res: Response) => {
  try {
    const meetings = await getMeetings();
    res.json({ meetings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// POST /api/meetings
router.post('/', async (req: Request, res: Response) => {
  try {
    const meeting = await createMeeting(req.body);
    res.status(201).json({ meeting });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// GET /api/meetings/:id
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const meeting = await getMeetingById(id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const [extractedData, utilities, actionItems, risks, keyDecisions, transcript] = await Promise.all([
      getExtractedData(id),
      getUtilities(id),
      getActionItems(id),
      getRisks(id),
      getKeyDecisions(id),
      getTranscript(id),
    ]);

    res.json({
      meeting: {
        ...meeting,
        extractedData,
        utilities,
        actionItems,
        risks,
        keyDecisions,
        transcript,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch meeting' });
  }
});

// PUT /api/meetings/:id
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const meeting = await updateMeeting(req.params.id, req.body);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    res.json({ meeting });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update meeting' });
  }
});

// PATCH /api/meetings/action-items/:id
router.patch('/action-items/:id', async (req: Request<{ id: string }>, res: Response) => {
  const { status } = req.body;
  const allowed = ['open', 'in-progress', 'completed'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }
  try {
    const item = await updateActionItem(req.params.id, status);
    if (!item) return res.status(404).json({ error: 'Action item not found' });
    res.json({ item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update action item' });
  }
});

export default router;
