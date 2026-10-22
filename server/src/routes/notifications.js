"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const notifications_service_1 = require("../services/notifications.service");
const router = (0, express_1.Router)();
const idSchema = zod_1.z.string().uuid();
const sendError = (res, error) => {
    if (error instanceof zod_1.z.ZodError) {
        return res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid request.' });
    }
    const message = error instanceof Error ? error.message : 'Notification request failed.';
    if (message.includes('not found'))
        return res.status(404).json({ message });
    if (message.includes('permission'))
        return res.status(403).json({ message });
    return res.status(500).json({ message: 'Notification request failed.' });
};
// Notifications are private to their recipient: every route requires a
// signed-in user and the service only ever reads that user's own rows.
router.get('/mine', auth_1.requireAuth, async (req, res) => {
    try {
        const filters = notifications_service_1.notificationListFilterSchema.parse(req.query);
        res.json(await (0, notifications_service_1.getMyNotifications)(req.user.id, filters));
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.get('/unread-count', auth_1.requireAuth, async (req, res) => {
    try {
        res.json({ unreadCount: await (0, notifications_service_1.getUnreadNotificationCount)(req.user.id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/read-all', auth_1.requireAuth, async (req, res) => {
    try {
        res.json(await (0, notifications_service_1.markAllNotificationsRead)(req.user.id));
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.patch('/:id/read', auth_1.requireAuth, async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        res.json({ notification: await (0, notifications_service_1.markNotificationRead)(req.user.id, id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
exports.default = router;
