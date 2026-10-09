import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles, type RequestWithUser } from '../middleware/auth';
import {
  archiveListing,
  createListing,
  getOwnedListings,
  getPublicListings,
  getPublicNurseries,
  listingFilterSchema,
  listingInputSchema,
  nurseryFilterSchema,
  updateListing,
  updateListingStock
} from '../services/catalog.service';

const router = Router();
const listingIdSchema = z.string().uuid();
const stockSchema = z.object({ availableQuantity: z.number().int().min(0).max(100000000) });

const sendError = (res: import('express').Response, error: unknown) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid request.' });
  }
  const message = error instanceof Error ? error.message : 'Catalog request failed.';
  if (message.includes('not found or you do not own')) return res.status(404).json({ message });
  if (message.includes('nursery profile')) return res.status(400).json({ message });
  return res.status(500).json({ message: 'Catalog request failed.' });
};

router.get('/', async (req, res) => {
  try {
    const filters = listingFilterSchema.parse(req.query);
    res.json(await getPublicListings(filters));
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/nurseries', async (req, res) => {
  try {
    const filters = nurseryFilterSchema.parse(req.query);
    res.json(await getPublicNurseries(filters));
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/mine', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    res.json({ listings: await getOwnedListings(req.user!.id) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    const input = listingInputSchema.parse(req.body);
    res.status(201).json({ listing: await createListing(req.user!.id, input) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.put('/:id', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    const id = listingIdSchema.parse(req.params.id);
    const input = listingInputSchema.parse(req.body);
    res.json({ listing: await updateListing(id, req.user!.id, input) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/:id/stock', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    const id = listingIdSchema.parse(req.params.id);
    const { availableQuantity } = stockSchema.parse(req.body);
    res.json({ listing: await updateListingStock(id, req.user!.id, availableQuantity) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.delete('/:id', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    const id = listingIdSchema.parse(req.params.id);
    res.json({ listing: await archiveListing(id, req.user!.id) });
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;