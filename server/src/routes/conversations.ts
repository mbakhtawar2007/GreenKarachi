import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type RequestWithUser } from '../middleware/auth';
import {
  createConversationSchema,
  getConversationForUser,
  getOrCreateConversation,
  listConversationMessages,
  listMyConversations,
  messageInputSchema,
  postConversationMessage,
  type ConversationUser
} from '../services/conversations.service';

const router = Router();
const idSchema = z.string().uuid();

const sendError = (res: import('express').Response, error: unknown) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid request.' });
  }
  const message = error instanceof Error ? error.message : 'Conversation request failed.';
  if (message.includes('not found')) return res.status(404).json({ message });
  if (message.includes('permission')) return res.status(403).json({ message });
  return res.status(500).json({ message: 'Conversation request failed.' });
};

const asConversationUser = (req: RequestWithUser): ConversationUser => ({
  id: req.user!.id,
  roles: req.user!.roles
});

// Every route requires a signed-in user. Whether that user may see or post
// in a specific thread is decided by the service from the thread's
// anchored workflow record (participants, plus ADMIN), never by the
// client.

router.post('/', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const input = createConversationSchema.parse(req.body);
    const { conversation, created } = await getOrCreateConversation(asConversationUser(req), input);
    res.status(created ? 201 : 200).json({ conversation });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/mine', requireAuth, async (req: RequestWithUser, res) => {
  try {
    res.json({ conversations: await listMyConversations(asConversationUser(req)) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/:id', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json({ conversation: await getConversationForUser(asConversationUser(req), id) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/:id/messages', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json({ messages: await listConversationMessages(asConversationUser(req), id) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/:id/messages', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = messageInputSchema.parse(req.body);
    res.status(201).json({ message: await postConversationMessage(asConversationUser(req), id, input) });
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
