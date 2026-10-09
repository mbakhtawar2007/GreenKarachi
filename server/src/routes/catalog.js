"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const catalog_service_1 = require("../services/catalog.service");
const router = (0, express_1.Router)();
const listingIdSchema = zod_1.z.string().uuid();
const stockSchema = zod_1.z.object({ availableQuantity: zod_1.z.number().int().min(0).max(100000000) });
const sendError = (res, error) => {
    if (error instanceof zod_1.z.ZodError) {
        return res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid request.' });
    }
    const message = error instanceof Error ? error.message : 'Catalog request failed.';
    if (message.includes('not found or you do not own'))
        return res.status(404).json({ message });
    if (message.includes('nursery profile'))
        return res.status(400).json({ message });
    return res.status(500).json({ message: 'Catalog request failed.' });
};
router.get('/', async (req, res) => {
    try {
        const filters = catalog_service_1.listingFilterSchema.parse(req.query);
        res.json(await (0, catalog_service_1.getPublicListings)(filters));
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.get('/nurseries', async (req, res) => {
    try {
        const filters = catalog_service_1.nurseryFilterSchema.parse(req.query);
        res.json(await (0, catalog_service_1.getPublicNurseries)(filters));
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.get('/mine', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        res.json({ listings: await (0, catalog_service_1.getOwnedListings)(req.user.id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        const input = catalog_service_1.listingInputSchema.parse(req.body);
        res.status(201).json({ listing: await (0, catalog_service_1.createListing)(req.user.id, input) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        const id = listingIdSchema.parse(req.params.id);
        const input = catalog_service_1.listingInputSchema.parse(req.body);
        res.json({ listing: await (0, catalog_service_1.updateListing)(id, req.user.id, input) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.patch('/:id/stock', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        const id = listingIdSchema.parse(req.params.id);
        const { availableQuantity } = stockSchema.parse(req.body);
        res.json({ listing: await (0, catalog_service_1.updateListingStock)(id, req.user.id, availableQuantity) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        const id = listingIdSchema.parse(req.params.id);
        res.json({ listing: await (0, catalog_service_1.archiveListing)(id, req.user.id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
exports.default = router;
