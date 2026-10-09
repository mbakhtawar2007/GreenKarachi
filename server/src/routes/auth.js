"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_service_1 = require("../services/auth.service");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/register', async (req, res) => {
    try {
        const parsed = auth_service_1.registerSchema.parse(req.body);
        const result = await (0, auth_service_1.registerUser)(parsed);
        res.status(201).json(result);
    }
    catch (error) {
        const message = error instanceof zod_1.z.ZodError ? error.issues[0]?.message : error.message;
        res.status(400).json({ message });
    }
});
router.post('/login', async (req, res) => {
    try {
        const parsed = auth_service_1.loginSchema.parse(req.body);
        const result = await (0, auth_service_1.loginUser)(parsed);
        res.json(result);
    }
    catch (error) {
        const message = error instanceof zod_1.z.ZodError ? error.issues[0]?.message : error.message;
        res.status(400).json({ message });
    }
});
router.post('/logout', (_req, res) => {
    res.json({ message: 'Logged out successfully. Supabase handles the session on the client.' });
});
router.get('/me', auth_1.requireAuth, async (req, res) => {
    try {
        const user = await (0, auth_service_1.getCurrentUser)(req.user.id);
        res.json({ user });
    }
    catch (error) {
        res.status(404).json({ message: error.message });
    }
});
router.get('/nursery/me', auth_1.requireAuth, async (req, res) => {
    try {
        const profile = {
            userId: req.user.id,
            name: req.user.name,
            roles: req.user.roles,
            source: 'supabase-auth'
        };
        return res.json({ nursery: profile });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
});
router.put('/nursery/me', auth_1.requireAuth, (0, auth_1.requireRoles)('NURSERY_OWNER'), async (req, res) => {
    try {
        const parsed = auth_service_1.nurseryProfileSchema.parse(req.body);
        const nursery = await (0, auth_service_1.upsertNurseryProfile)(req.user.id, parsed);
        res.json({ nursery });
    }
    catch (error) {
        const message = error instanceof zod_1.z.ZodError ? error.issues[0]?.message : error.message;
        res.status(400).json({ message });
    }
});
router.get('/admin/users', auth_1.requireAuth, (0, auth_1.requireRoles)('ADMIN'), async (_req, res) => {
    res.json({ users: [], message: 'User listing is handled in Supabase tables or your admin dashboard.' });
});
exports.default = router;
