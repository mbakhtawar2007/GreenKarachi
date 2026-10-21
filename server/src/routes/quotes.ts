import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles, type RequestWithUser } from '../middleware/auth';
import {
  acceptQuotation,
  cancelQuoteRequest,
  changeOrderStatus,
  createQuoteRequest,
  declineQuotation,
  declineQuoteRequest,
  getBuyerOrders,
  getBuyerQuoteRequests,
  getNurseryOrders,
  getNurseryQuoteRequests,
  getQuoteRequestForParticipant,
  orderStatusInputSchema,
  quotationInputSchema,
  quoteRequestInputSchema,
  respondWithQuotation
} from '../services/quotes.service';

const router = Router();
const idSchema = z.string().uuid();

const sendError = (res: import('express').Response, error: unknown) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid request.' });
  }
  const message = error instanceof Error ? error.message : 'Quote request failed.';
  if (message.includes('not found')) return res.status(404).json({ message });
  if (message.includes('permission')) return res.status(403).json({ message });
  if (message.includes('expired')) return res.status(410).json({ message });
  if (
    message.includes('Invalid status transition')
    || message.includes('duplicate')
    || message.includes('out of stock')
    || message.includes('cannot exceed')
  ) return res.status(409).json({ message });
  if (
    message.includes('past')
    || message.includes('minimum order quantity')
    || message.includes('validity must be in the future')
  ) return res.status(400).json({ message });
  return res.status(500).json({ message: 'Quote request failed.' });
};

// --- Quote requests ---------------------------------------------------------

router.post('/requests', requireAuth, requireRoles('BUYER'), async (req: RequestWithUser, res) => {
  try {
    const input = quoteRequestInputSchema.parse(req.body);
    res.status(201).json({ quoteRequest: await createQuoteRequest(req.user!.id, input) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/requests/mine', requireAuth, requireRoles('BUYER'), async (req: RequestWithUser, res) => {
  try {
    res.json({ quoteRequests: await getBuyerQuoteRequests(req.user!.id) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/requests/incoming', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    res.json({ quoteRequests: await getNurseryQuoteRequests(req.user!.id) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/requests/:id', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json({ quoteRequest: await getQuoteRequestForParticipant(id, req.user!.id) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/requests/:id/quotation', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    const input = quotationInputSchema.parse(req.body);
    res.status(201).json({ quotation: await respondWithQuotation(req.user!.id, id, input) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/requests/:id/accept', requireAuth, requireRoles('BUYER'), async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.status(201).json({ order: await acceptQuotation(req.user!.id, id) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/requests/:id/decline', requireAuth, requireRoles('BUYER'), async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json({ quoteRequest: await declineQuotation(req.user!.id, id) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/requests/:id/cancel', requireAuth, requireRoles('BUYER'), async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json({ quoteRequest: await cancelQuoteRequest(req.user!.id, id) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/requests/:id/decline-request', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json({ quoteRequest: await declineQuoteRequest(req.user!.id, id) });
  } catch (error) {
    return sendError(res, error);
  }
});

// --- Orders -----------------------------------------------------------------

router.get('/orders/mine', requireAuth, requireRoles('BUYER'), async (req: RequestWithUser, res) => {
  try {
    res.json({ orders: await getBuyerOrders(req.user!.id) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/orders/incoming', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    res.json({ orders: await getNurseryOrders(req.user!.id) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/orders/:id/status', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const id = idSchema.parse(req.params.id);
    const { status } = orderStatusInputSchema.parse(req.body);
    res.json({ order: await changeOrderStatus(req.user!.id, id, status) });
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
