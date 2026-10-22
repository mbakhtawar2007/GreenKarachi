"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const conversations_service_1 = require("../services/conversations.service");
const router = (0, express_1.Router)();
const idSchema = zod_1.z.string().uuid();
const sendError = (res, error) => {
    if (error instanceof zod_1.z.ZodError) {
        return res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid request.' });
    }
    const message = error instanceof Error ? error.message : 'Conversation request failed.';
    if (message.includes('not found'))
        return res.status(404).json({ message });
    if (message.includes('permission'))
        return res.status(403).json({ message });
    return res.status(500).json({ message: 'Conversation request failed.' });
};
const asConversationUser = (req) => ({
    id: req.user.id,
    roles: req.user.roles
});
// Every route requires a signed-in user. Whether that user may see or post
// in a specific thread is decided by the service from the thread's
// anchored workflow record (participants, plus ADMIN), never by the
// client.
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const input = conversations_service_1.createConversationSchema.parse(req.body);
        const { conversation, created } = await (0, conversations_service_1.getOrCreateConversation)(asConversationUser(req), input);
        res.status(created ? 201 : 200).json({ conversation });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.get('/mine', auth_1.requireAuth, async (req, res) => {
    try {
        res.json({ conversations: await (0, conversations_service_1.listMyConversations)(asConversationUser(req)) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        res.json({ conversation: await (0, conversations_service_1.getConversationForUser)(asConversationUser(req), id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.get('/:id/messages', auth_1.requireAuth, async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        res.json({ messages: await (0, conversations_service_1.listConversationMessages)(asConversationUser(req), id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/:id/messages', auth_1.requireAuth, async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        const input = conversations_service_1.messageInputSchema.parse(req.body);
        res.status(201).json({ message: await (0, conversations_service_1.postConversationMessage)(asConversationUser(req), id, input) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
exports.default = router;
