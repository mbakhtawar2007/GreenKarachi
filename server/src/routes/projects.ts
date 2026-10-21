import { Router, type NextFunction, type Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles, type RequestWithUser } from '../middleware/auth';
import { verifyToken } from '../lib/auth';
import {
  addProgressUpdate,
  changeProjectStatus,
  confirmPledge,
  createProject,
  declinePledge,
  discoverProjects,
  getMyPledges,
  getMyProjects,
  getProjectForViewer,
  pledgeEligibleRoles,
  pledgeInputSchema,
  progressUpdateInputSchema,
  projectFilterSchema,
  projectInputSchema,
  projectStatusInputSchema,
  submitPledge,
  updateProject,
  withdrawPledge
} from '../services/projects.service';

const router = Router();
const idSchema = z.string().uuid();

const sendError = (res: Response, error: unknown) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid request.' });
  }
  const message = error instanceof Error ? error.message : 'Project request failed.';
  if (message.includes('not found')) return res.status(404).json({ message });
  if (message.includes('permission')) return res.status(403).json({ message });
  if (
    message.includes('Invalid status transition')
    || message.includes('already have a live')
    || message.includes('not published and does not accept pledges')
  ) return res.status(409).json({ message });
  if (message.includes('cannot exceed the project tree target')) return res.status(400).json({ message });
  return res.status(500).json({ message: 'Project request failed.' });
};

// Discovery and published project details are public, like the marketplace
// catalog. When a valid app token is present the viewer is attached so the
// service can apply organizer/participant visibility and contact rules.
const optionalAuth = (req: RequestWithUser, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const decoded = verifyToken(header.slice('Bearer '.length));
      req.user = { id: decoded.id, email: decoded.email, name: decoded.name, roles: decoded.roles };
    } catch {
      // An invalid or Supabase-issued token simply leaves the request
      // anonymous for these public reads; protected routes still use
      // requireAuth and will reject it there.
    }
  }
  next();
};

// --- Discovery & detail (public, visibility enforced in the service) -------

router.get('/', optionalAuth, async (req: RequestWithUser, res) => {
  try {
    const filters = projectFilterSchema.parse(req.query);
    res.json(await discoverProjects(filters, req.user?.id ?? null));
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/:id', optionalAuth, async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json({ project: await getProjectForViewer(id, req.user?.id ?? null) });
  } catch (error) {
    return sendError(res, error);
  }
});

// --- Organizer workflow ------------------------------------------------------
// Only plantation organizers create and manage projects.

router.post('/', requireAuth, requireRoles('PLANTATION_ORGANIZER'), async (req: RequestWithUser, res) => {
  try {
    const input = projectInputSchema.parse(req.body);
    res.status(201).json({ project: await createProject(req.user!.id, input) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/mine/list', requireAuth, requireRoles('PLANTATION_ORGANIZER'), async (req: RequestWithUser, res) => {
  try {
    res.json({ projects: await getMyProjects(req.user!.id) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/:id', requireAuth, requireRoles('PLANTATION_ORGANIZER'), async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = projectInputSchema.parse(req.body);
    res.json({ project: await updateProject(req.user!.id, id, input) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/:id/status', requireAuth, requireRoles('PLANTATION_ORGANIZER'), async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    const { status } = projectStatusInputSchema.parse(req.body);
    res.json({ project: await changeProjectStatus(req.user!.id, id, status) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/:id/progress', requireAuth, requireRoles('PLANTATION_ORGANIZER'), async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = progressUpdateInputSchema.parse(req.body);
    res.status(201).json({ progressUpdate: await addProgressUpdate(req.user!.id, id, input) });
  } catch (error) {
    return sendError(res, error);
  }
});

// --- Pledges / support interest ----------------------------------------------
// Any authenticated user with a relevant role may pledge. A pledge is an
// intention recorded for coordination, never a payment (see the service).

router.post('/:id/pledges', requireAuth, requireRoles(...pledgeEligibleRoles), async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = pledgeInputSchema.parse(req.body);
    res.status(201).json({ pledge: await submitPledge(req.user!.id, req.user!.roles, id, input) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/pledges/mine', requireAuth, requireRoles(...pledgeEligibleRoles), async (req: RequestWithUser, res) => {
  try {
    res.json({ pledges: await getMyPledges(req.user!.id) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/pledges/:id/withdraw', requireAuth, requireRoles(...pledgeEligibleRoles), async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json(await withdrawPledge(req.user!.id, id));
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/pledges/:id/confirm', requireAuth, requireRoles('PLANTATION_ORGANIZER'), async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json(await confirmPledge(req.user!.id, id));
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/pledges/:id/decline', requireAuth, requireRoles('PLANTATION_ORGANIZER'), async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json(await declinePledge(req.user!.id, id));
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
