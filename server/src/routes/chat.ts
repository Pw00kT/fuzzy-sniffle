import { Router, Request, Response } from 'express';
import { getTranscript, getChatHistory, saveChatMessage, getMeetingById } from '../db/client.js';
import { chatWithTranscript } from '../services/claude.js';
import { formatTranscriptForClaude } from '../services/whisper.js';

const router = Router();

// POST /api/meetings/:id/chat  — streams the response via SSE
router.post('/:id/chat', async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  const meeting = await getMeetingById(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

  const [transcriptRows, historyRows] = await Promise.all([
    getTranscript(req.params.id),
    getChatHistory(req.params.id),
  ]);

  if (transcriptRows.length === 0) {
    return res.status(400).json({ error: 'No transcript available for this meeting' });
  }

  const transcript = formatTranscriptForClaude(
    transcriptRows.map((r: any) => ({
      speaker: r.speaker,
      text: r.text,
      timestampSeconds: r.timestamp_seconds,
      sequenceNumber: r.sequence_number,
    }))
  );

  const history = historyRows.map((r: any) => ({ role: r.role as 'user' | 'assistant', content: r.content }));

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let fullResponse = '';

  try {
    for await (const chunk of chatWithTranscript(message, transcript, history)) {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    // Save the exchange
    await saveChatMessage(req.params.id, 'user', message);
    await saveChatMessage(req.params.id, 'assistant', fullResponse);

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    console.error('Chat error:', err);
    res.write(`data: ${JSON.stringify({ error: 'AI response failed. Please try again.' })}\n\n`);
  } finally {
    res.end();
  }
});

// GET /api/meetings/:id/chat  — get chat history
router.get('/:id/chat', async (req: Request, res: Response) => {
  try {
    const history = await getChatHistory(req.params.id);
    res.json({ messages: history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

export default router;
