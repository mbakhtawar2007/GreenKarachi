import { Router, type Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles, type RequestWithUser } from '../middleware/auth';
import { getMyReports, reportInputSchema, submitReport } from '../services/admin.service';

const router = Router();

// Filing a report is open to every authenticated platform role; handling
// reports is admin-only and lives in routes/admin.ts.
const reporterRoles = ['BUYER', 'NURSERY_OWNER', 'PLANTATION_ORGANIZER', 'DONOR_INVESTOR', 'ADMIN'] as const;

const sendError = (res: Response, error: unknown) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid request.' });
  }
  const message = error instanceof Error ? error.message : 'Report request failed.';
  if (message.includes('not found')) return res.status(404).json({ message });
  if (message.includes('already have an open report')) return res.status(409).json({ message });
  return res.status(500).json({ message: 'Report request failed.' });
};

router.post('/', requireAuth, requireRoles(...reporterRoles), async (req: RequestWithUser, res) => {
  try {
    const input = reportInputSchema.parse(req.body);
    res.status(201).json({ report: await submitReport(req.user!.id, input) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/mine', requireAuth, requireRoles(...reporterRoles), async (req: RequestWithUser, res) => {
  try {
    res.json({ reports: await getMyReports(req.user!.id) });
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
