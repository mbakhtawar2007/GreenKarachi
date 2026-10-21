import { Router, type Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles, type RequestWithUser } from '../middleware/auth';
import {
  adminAuditFilterSchema,
  adminListingFilterSchema,
  adminNurseryFilterSchema,
  adminProjectFilterSchema,
  adminReportFilterSchema,
  adminUserFilterSchema,
  decideNurseryVerification,
  decideUserVerification,
  hideListing,
  hideProject,
  hideContentSchema,
  listAdminListings,
  listAdminNurseries,
  listAdminProjects,
  listAdminReports,
  listAdminUsers,
  listAuditLog,
  reactivateUser,
  reactivateUserSchema,
  reportStatusSchema,
  restoreContentSchema,
  restoreListing,
  restoreProject,
  suspendUser,
  suspendUserSchema,
  updateReportStatus,
  verificationDecisionSchema
} from '../services/admin.service';

const router = Router();
const idSchema = z.string().uuid();

const sendError = (res: Response, error: unknown) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid request.' });
  }
  const message = error instanceof Error ? error.message : 'Admin request failed.';
  if (message.includes('not found') || message.includes('Not found')) return res.status(404).json({ message });
  if (message.includes('permission')) return res.status(403).json({ message });
  if (message.includes('Invalid') || message.includes('already')) return res.status(409).json({ message });
  return res.status(500).json({ message: 'Admin request failed.' });
};

// Every route in this module is admin-only. requireAuth + requireRoles
// run first for the whole router; the service additionally refuses
// self-targeted verification decisions and suspensions.
router.use(requireAuth, requireRoles('ADMIN'));

const actorOf = (req: RequestWithUser) => ({ id: req.user!.id, email: req.user!.email });

// --- Users: verification and suspension -------------------------------------

router.get('/users', async (req: RequestWithUser, res) => {
  try {
    const filters = adminUserFilterSchema.parse(req.query);
    res.json(await listAdminUsers(filters));
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/users/:id/verification', async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = verificationDecisionSchema.parse(req.body);
    res.json({ user: await decideUserVerification(actorOf(req), id, input) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/users/:id/suspend', async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = suspendUserSchema.parse(req.body);
    res.json({ user: await suspendUser(actorOf(req), id, input) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/users/:id/reactivate', async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = reactivateUserSchema.parse(req.body);
    res.json({ user: await reactivateUser(actorOf(req), id, input.notes) });
  } catch (error) {
    return sendError(res, error);
  }
});

// --- Nurseries: verification --------------------------------------------------

router.get('/nurseries', async (req: RequestWithUser, res) => {
  try {
    const filters = adminNurseryFilterSchema.parse(req.query);
    res.json(await listAdminNurseries(filters));
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/nurseries/:userId/verification', async (req: RequestWithUser, res) => {
  try {
    const userId = idSchema.parse(req.params.userId);
    const input = verificationDecisionSchema.parse(req.body);
    res.json({ nursery: await decideNurseryVerification(actorOf(req), userId, input) });
  } catch (error) {
    return sendError(res, error);
  }
});

// --- Listings: moderation -------------------------------------------------------

router.get('/listings', async (req: RequestWithUser, res) => {
  try {
    const filters = adminListingFilterSchema.parse(req.query);
    res.json(await listAdminListings(filters));
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/listings/:id/hide', async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = hideContentSchema.parse(req.body);
    res.json({ listing: await hideListing(actorOf(req), id, input) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/listings/:id/restore', async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = restoreContentSchema.parse(req.body ?? {});
    res.json({ listing: await restoreListing(actorOf(req), id, input.notes) });
  } catch (error) {
    return sendError(res, error);
  }
});

// --- Projects: moderation ---------------------------------------------------------

router.get('/projects', async (req: RequestWithUser, res) => {
  try {
    const filters = adminProjectFilterSchema.parse(req.query);
    res.json(await listAdminProjects(filters));
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/projects/:id/hide', async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = hideContentSchema.parse(req.body);
    res.json({ project: await hideProject(actorOf(req), id, input) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/projects/:id/restore', async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = restoreContentSchema.parse(req.body ?? {});
    res.json({ project: await restoreProject(actorOf(req), id, input.notes) });
  } catch (error) {
    return sendError(res, error);
  }
});

// --- Reported content ---------------------------------------------------------------

router.get('/reports', async (req: RequestWithUser, res) => {
  try {
    const filters = adminReportFilterSchema.parse(req.query);
    res.json(await listAdminReports(filters));
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/reports/:id/status', async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = reportStatusSchema.parse(req.body);
    res.json({ report: await updateReportStatus(actorOf(req), id, input) });
  } catch (error) {
    return sendError(res, error);
  }
});

// --- Audit history ---------------------------------------------------------------------

router.get('/audit-log', async (req: RequestWithUser, res) => {
  try {
    const filters = adminAuditFilterSchema.parse(req.query);
    res.json(await listAuditLog(filters));
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
