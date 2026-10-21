"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const admin_service_1 = require("../services/admin.service");
const router = (0, express_1.Router)();
// Filing a report is open to every authenticated platform role; handling
// reports is admin-only and lives in routes/admin.ts.
const reporterRoles = ['BUYER', 'NURSERY_OWNER', 'PLANTATION_ORGANIZER', 'DONOR_INVESTOR', 'ADMIN'];
const sendError = (res, error) => {
    if (error instanceof zod_1.z.ZodError) {
        return res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid request.' });
    }
    const message = error instanceof Error ? error.message : 'Report request failed.';
    if (message.includes('not found'))
        return res.status(404).json({ message });
    if (message.includes('already have an open report'))
        return res.status(409).json({ message });
    return res.status(500).json({ message: 'Report request failed.' });
};
router.post('/', auth_1.requireAuth, (0, auth_1.requireRoles)(...reporterRoles), async (req, res) => {
    try {
        const input = admin_service_1.reportInputSchema.parse(req.body);
        res.status(201).json({ report: await (0, admin_service_1.submitReport)(req.user.id, input) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.get('/mine', auth_1.requireAuth, (0, auth_1.requireRoles)(...reporterRoles), async (req, res) => {
    try {
        res.json({ reports: await (0, admin_service_1.getMyReports)(req.user.id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
exports.default = router;
