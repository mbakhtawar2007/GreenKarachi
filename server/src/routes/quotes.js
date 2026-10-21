"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const quotes_service_1 = require("../services/quotes.service");
const router = (0, express_1.Router)();
const idSchema = zod_1.z.string().uuid();
const sendError = (res, error) => {
    if (error instanceof zod_1.z.ZodError) {
        return res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid request.' });
    }
    const message = error instanceof Error ? error.message : 'Quote request failed.';
    if (message.includes('not found'))
        return res.status(404).json({ message });
    if (message.includes('permission'))
        return res.status(403).json({ message });
    if (message.includes('expired'))
        return res.status(410).json({ message });
    if (message.includes('Invalid status transition')
        || message.includes('duplicate')
        || message.includes('out of stock')
        || message.includes('cannot exceed'))
        return res.status(409).json({ message });
    if (message.includes('past')
        || message.includes('minimum order quantity')
        || message.includes('validity must be in the future'))
        return res.status(400).json({ message });
    return res.status(500).json({ message: 'Quote request failed.' });
};
// --- Quote requests ---------------------------------------------------------
router.post('/requests', auth_1.requireAuth, (0, auth_1.requireRoles)('BUYER'), async (req, res) => {
    try {
        const input = quotes_service_1.quoteRequestInputSchema.parse(req.body);
        res.status(201).json({ quoteRequest: await (0, quotes_service_1.createQuoteRequest)(req.user.id, input) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.get('/requests/mine', auth_1.requireAuth, (0, auth_1.requireRoles)('BUYER'), async (req, res) => {
    try {
        res.json({ quoteRequests: await (0, quotes_service_1.getBuyerQuoteRequests)(req.user.id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.get('/requests/incoming', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        res.json({ quoteRequests: await (0, quotes_service_1.getNurseryQuoteRequests)(req.user.id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.get('/requests/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        res.json({ quoteRequest: await (0, quotes_service_1.getQuoteRequestForParticipant)(id, req.user.id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/requests/:id/quotation', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        const input = quotes_service_1.quotationInputSchema.parse(req.body);
        res.status(201).json({ quotation: await (0, quotes_service_1.respondWithQuotation)(req.user.id, id, input) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/requests/:id/accept', auth_1.requireAuth, (0, auth_1.requireRoles)('BUYER'), async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        res.status(201).json({ order: await (0, quotes_service_1.acceptQuotation)(req.user.id, id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/requests/:id/decline', auth_1.requireAuth, (0, auth_1.requireRoles)('BUYER'), async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        res.json({ quoteRequest: await (0, quotes_service_1.declineQuotation)(req.user.id, id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/requests/:id/cancel', auth_1.requireAuth, (0, auth_1.requireRoles)('BUYER'), async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        res.json({ quoteRequest: await (0, quotes_service_1.cancelQuoteRequest)(req.user.id, id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/requests/:id/decline-request', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        res.json({ quoteRequest: await (0, quotes_service_1.declineQuoteRequest)(req.user.id, id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
// --- Orders -----------------------------------------------------------------
router.get('/orders/mine', auth_1.requireAuth, (0, auth_1.requireRoles)('BUYER'), async (req, res) => {
    try {
        res.json({ orders: await (0, quotes_service_1.getBuyerOrders)(req.user.id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.get('/orders/incoming', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        res.json({ orders: await (0, quotes_service_1.getNurseryOrders)(req.user.id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.patch('/orders/:id/status', auth_1.requireAuth, async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        const { status } = quotes_service_1.orderStatusInputSchema.parse(req.body);
        res.json({ order: await (0, quotes_service_1.changeOrderStatus)(req.user.id, id, status) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
exports.default = router;
