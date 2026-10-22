"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const admin_service_1 = require("../services/admin.service");
const router = (0, express_1.Router)();
const idSchema = zod_1.z.string().uuid();
const sendError = (res, error) => {
    if (error instanceof zod_1.z.ZodError) {
        return res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid request.' });
    }
    const message = error instanceof Error ? error.message : 'Admin request failed.';
    if (message.includes('not found') || message.includes('Not found'))
        return res.status(404).json({ message });
    if (message.includes('permission'))
        return res.status(403).json({ message });
    if (message.includes('Invalid') || message.includes('already'))
        return res.status(409).json({ message });
    return res.status(500).json({ message: 'Admin request failed.' });
};
// Every route in this module is admin-only. requireAuth + requireRoles
// run first for the whole router; the service additionally refuses
// self-targeted verification decisions and suspensions.
router.use(auth_1.requireAuth, (0, auth_1.requireRoles)('ADMIN'));
const actorOf = (req) => ({ id: req.user.id, email: req.user.email });
// --- Users: verification and suspension -------------------------------------
router.get('/users', async (req, res) => {
    try {
        const filters = admin_service_1.adminUserFilterSchema.parse(req.query);
        res.json(await (0, admin_service_1.listAdminUsers)(filters));
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.patch('/users/:id/verification', async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        const input = admin_service_1.verificationDecisionSchema.parse(req.body);
        res.json({ user: await (0, admin_service_1.decideUserVerification)(actorOf(req), id, input) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/users/:id/suspend', async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        const input = admin_service_1.suspendUserSchema.parse(req.body);
        res.json({ user: await (0, admin_service_1.suspendUser)(actorOf(req), id, input) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/users/:id/reactivate', async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        const input = admin_service_1.reactivateUserSchema.parse(req.body);
        res.json({ user: await (0, admin_service_1.reactivateUser)(actorOf(req), id, input.notes) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
// --- Nurseries: verification --------------------------------------------------
router.get('/nurseries', async (req, res) => {
    try {
        const filters = admin_service_1.adminNurseryFilterSchema.parse(req.query);
        res.json(await (0, admin_service_1.listAdminNurseries)(filters));
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.patch('/nurseries/:userId/verification', async (req, res) => {
    try {
        const userId = idSchema.parse(req.params.userId);
        const input = admin_service_1.verificationDecisionSchema.parse(req.body);
        res.json({ nursery: await (0, admin_service_1.decideNurseryVerification)(actorOf(req), userId, input) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
// --- Listings: moderation -------------------------------------------------------
router.get('/listings', async (req, res) => {
    try {
        const filters = admin_service_1.adminListingFilterSchema.parse(req.query);
        res.json(await (0, admin_service_1.listAdminListings)(filters));
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/listings/:id/hide', async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        const input = admin_service_1.hideContentSchema.parse(req.body);
        res.json({ listing: await (0, admin_service_1.hideListing)(actorOf(req), id, input) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/listings/:id/restore', async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        const input = admin_service_1.restoreContentSchema.parse(req.body ?? {});
        res.json({ listing: await (0, admin_service_1.restoreListing)(actorOf(req), id, input.notes) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
// --- Projects: moderation ---------------------------------------------------------
router.get('/projects', async (req, res) => {
    try {
        const filters = admin_service_1.adminProjectFilterSchema.parse(req.query);
        res.json(await (0, admin_service_1.listAdminProjects)(filters));
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/projects/:id/hide', async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        const input = admin_service_1.hideContentSchema.parse(req.body);
        res.json({ project: await (0, admin_service_1.hideProject)(actorOf(req), id, input) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/projects/:id/restore', async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        const input = admin_service_1.restoreContentSchema.parse(req.body ?? {});
        res.json({ project: await (0, admin_service_1.restoreProject)(actorOf(req), id, input.notes) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
// --- Reported content ---------------------------------------------------------------
router.get('/reports', async (req, res) => {
    try {
        const filters = admin_service_1.adminReportFilterSchema.parse(req.query);
        res.json(await (0, admin_service_1.listAdminReports)(filters));
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.patch('/reports/:id/status', async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        const input = admin_service_1.reportStatusSchema.parse(req.body);
        res.json({ report: await (0, admin_service_1.updateReportStatus)(actorOf(req), id, input) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
// --- Audit history ---------------------------------------------------------------------
router.get('/audit-log', async (req, res) => {
    try {
        const filters = admin_service_1.adminAuditFilterSchema.parse(req.query);
        res.json(await (0, admin_service_1.listAuditLog)(filters));
    }
    catch (error) {
        return sendError(res, error);
    }
});
exports.default = router;
