import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles, type RequestWithUser } from '../middleware/auth';
import {
  acceptSupplyOffer,
  changeSupplyGapRequestStatus,
  createSupplyGapRequest,
  getMySupplyGapRequests,
  getMySupplyOffers,
  getOpenSupplyGapRequests,
  getSupplyGapRequestForParticipant,
  rejectSupplyOffer,
  submitSupplyOffer,
  supplyGapRequestInputSchema,
  supplyGapRequestStatusInputSchema,
  supplyOfferInputSchema,
  updateSupplyGapRequest,
  withdrawSupplyOffer
} from '../services/collaboration.service';

const router = Router();
const idSchema = z.string().uuid();

const sendError = (res: import('express').Response, error: unknown) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid request.' });
  }
  const message = error instanceof Error ? error.message : 'Collaboration request failed.';
  if (message.includes('not found')) return res.status(404).json({ message });
  if (message.includes('permission') || message.includes('own supply gap request')) return res.status(403).json({ message });
  if (
    message.includes('Invalid status transition')
    || message.includes('closed and no longer accepts offers')
    || message.includes('would exceed the remaining supply gap')
    || message.includes('already have a pending offer')
    || message.includes('could not be accepted because the request changed')
  ) return res.status(409).json({ message });
  if (
    message.includes('past')
    || message.includes('cannot exceed the quantity needed')
    || message.includes('cannot be reduced below')
    || message.includes('nursery profile')
  ) return res.status(400).json({ message });
  return res.status(500).json({ message: 'Collaboration request failed.' });
};

// --- Supply gap requests ----------------------------------------------------
// Only nursery owners take part in nursery-to-nursery collaboration, either
// as requesters or as suppliers.

router.post('/requests', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    const input = supplyGapRequestInputSchema.parse(req.body);
    res.status(201).json({ supplyGapRequest: await createSupplyGapRequest(req.user!.id, input) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/requests/mine', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    res.json({ supplyGapRequests: await getMySupplyGapRequests(req.user!.id) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/requests/open', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    res.json({ supplyGapRequests: await getOpenSupplyGapRequests(req.user!.id) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/requests/:id', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json({ supplyGapRequest: await getSupplyGapRequestForParticipant(id, req.user!.id) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/requests/:id', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = supplyGapRequestInputSchema.parse(req.body);
    res.json({ supplyGapRequest: await updateSupplyGapRequest(req.user!.id, id, input) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/requests/:id/status', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    const { status } = supplyGapRequestStatusInputSchema.parse(req.body);
    res.json({ supplyGapRequest: await changeSupplyGapRequestStatus(req.user!.id, id, status) });
  } catch (error) {
    return sendError(res, error);
  }
});

// --- Supply offers ------------------------------------------------------------

router.post('/requests/:id/offers', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = supplyOfferInputSchema.parse(req.body);
    res.status(201).json({ supplyOffer: await submitSupplyOffer(req.user!.id, id, input) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/offers/mine', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    res.json({ supplyOffers: await getMySupplyOffers(req.user!.id) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/offers/:id/accept', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json(await acceptSupplyOffer(req.user!.id, id));
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/offers/:id/reject', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json(await rejectSupplyOffer(req.user!.id, id));
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/offers/:id/withdraw', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json(await withdrawSupplyOffer(req.user!.id, id));
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
