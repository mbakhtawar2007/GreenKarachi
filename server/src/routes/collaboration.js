"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const collaboration_service_1 = require("../services/collaboration.service");
const router = (0, express_1.Router)();
const idSchema = zod_1.z.string().uuid();
const sendError = (res, error) => {
    if (error instanceof zod_1.z.ZodError) {
        return res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid request.' });
    }
    const message = error instanceof Error ? error.message : 'Collaboration request failed.';
    if (message.includes('not found'))
        return res.status(404).json({ message });
    if (message.includes('permission') || message.includes('own supply gap request'))
        return res.status(403).json({ message });
    if (message.includes('Invalid status transition')
        || message.includes('closed and no longer accepts offers')
        || message.includes('would exceed the remaining supply gap')
        || message.includes('already have a pending offer')
        || message.includes('could not be accepted because the request changed'))
        return res.status(409).json({ message });
    if (message.includes('past')
        || message.includes('cannot exceed the quantity needed')
        || message.includes('cannot be reduced below')
        || message.includes('nursery profile'))
        return res.status(400).json({ message });
    return res.status(500).json({ message: 'Collaboration request failed.' });
};
// --- Supply gap requests ----------------------------------------------------
// Only nursery owners take part in nursery-to-nursery collaboration, either
// as requesters or as suppliers.
router.post('/requests', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        const input = collaboration_service_1.supplyGapRequestInputSchema.parse(req.body);
        res.status(201).json({ supplyGapRequest: await (0, collaboration_service_1.createSupplyGapRequest)(req.user.id, input) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.get('/requests/mine', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        res.json({ supplyGapRequests: await (0, collaboration_service_1.getMySupplyGapRequests)(req.user.id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.get('/requests/open', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        res.json({ supplyGapRequests: await (0, collaboration_service_1.getOpenSupplyGapRequests)(req.user.id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.get('/requests/:id', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        res.json({ supplyGapRequest: await (0, collaboration_service_1.getSupplyGapRequestForParticipant)(id, req.user.id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.patch('/requests/:id', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        const input = collaboration_service_1.supplyGapRequestInputSchema.parse(req.body);
        res.json({ supplyGapRequest: await (0, collaboration_service_1.updateSupplyGapRequest)(req.user.id, id, input) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.patch('/requests/:id/status', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        const { status } = collaboration_service_1.supplyGapRequestStatusInputSchema.parse(req.body);
        res.json({ supplyGapRequest: await (0, collaboration_service_1.changeSupplyGapRequestStatus)(req.user.id, id, status) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
// --- Supply offers ------------------------------------------------------------
router.post('/requests/:id/offers', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        const input = collaboration_service_1.supplyOfferInputSchema.parse(req.body);
        res.status(201).json({ supplyOffer: await (0, collaboration_service_1.submitSupplyOffer)(req.user.id, id, input) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.get('/offers/mine', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        res.json({ supplyOffers: await (0, collaboration_service_1.getMySupplyOffers)(req.user.id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/offers/:id/accept', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        res.json(await (0, collaboration_service_1.acceptSupplyOffer)(req.user.id, id));
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/offers/:id/reject', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        res.json(await (0, collaboration_service_1.rejectSupplyOffer)(req.user.id, id));
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/offers/:id/withdraw', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        res.json(await (0, collaboration_service_1.withdrawSupplyOffer)(req.user.id, id));
    }
    catch (error) {
        return sendError(res, error);
    }
});
exports.default = router;
