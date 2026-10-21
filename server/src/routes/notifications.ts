import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type RequestWithUser } from '../middleware/auth';
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  notificationListFilterSchema
} from '../services/notifications.service';

const router = Router();
const idSchema = z.string().uuid();

const sendError = (res: import('express').Response, error: unknown) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid request.' });
  }
  const message = error instanceof Error ? error.message : 'Notification request failed.';
  if (message.includes('not found')) return res.status(404).json({ message });
  if (message.includes('permission')) return res.status(403).json({ message });
  return res.status(500).json({ message: 'Notification request failed.' });
};

// Notifications are private to their recipient: every route requires a
// signed-in user and the service only ever reads that user's own rows.

router.get('/mine', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const filters = notificationListFilterSchema.parse(req.query);
    res.json(await getMyNotifications(req.user!.id, filters));
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/unread-count', requireAuth, async (req: RequestWithUser, res) => {
  try {
    res.json({ unreadCount: await getUnreadNotificationCount(req.user!.id) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/read-all', requireAuth, async (req: RequestWithUser, res) => {
  try {
    res.json(await markAllNotificationsRead(req.user!.id));
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/:id/read', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json({ notification: await markNotificationRead(req.user!.id, id) });
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
