"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_service_1 = require("../services/auth.service");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Supabase auth errors (e.g. 'User already registered', 'Invalid login
// credentials') reveal whether an email has an account, so they are never
// passed through: only validation messages and the post-password suspension
// notice (which requires knowing the password) keep their specific text.
const SUSPENDED_MESSAGE = 'This account has been suspended. Contact the GreenKarachi team if you believe this is a mistake.';
const authErrorMessage = (error, fallback) => {
    if (error instanceof zod_1.z.ZodError)
        return error.issues[0]?.message ?? fallback;
    if (error instanceof Error && error.message === SUSPENDED_MESSAGE)
        return error.message;
    return fallback;
};
router.post('/register', async (req, res) => {
    try {
        const parsed = auth_service_1.registerSchema.parse(req.body);
        const result = await (0, auth_service_1.registerUser)(parsed);
        res.status(201).json(result);
    }
    catch (error) {
        res.status(400).json({ message: authErrorMessage(error, 'Registration failed. Please check your details and try again.') });
    }
});
router.post('/login', async (req, res) => {
    try {
        const parsed = auth_service_1.loginSchema.parse(req.body);
        const result = await (0, auth_service_1.loginUser)(parsed);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: authErrorMessage(error, 'Login failed. Please check your email and password and try again.') });
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
        const nursery = await (0, auth_service_1.getNurseryProfile)(req.user.id);
        return res.json({ nursery });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to load nursery profile.' });
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
exports.default = router;
