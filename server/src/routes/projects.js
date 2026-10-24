"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const auth_2 = require("../lib/auth");
const projects_service_1 = require("../services/projects.service");
const router = (0, express_1.Router)();
const idSchema = zod_1.z.string().uuid();
const sendError = (res, error) => {
    if (error instanceof zod_1.z.ZodError) {
        return res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid request.' });
    }
    const message = error instanceof Error ? error.message : 'Project request failed.';
    if (message.includes('not found'))
        return res.status(404).json({ message });
    if (message.includes('permission'))
        return res.status(403).json({ message });
    if (message.includes('Invalid status transition')
        || message.includes('already have a live')
        || message.includes('not published and does not accept pledges'))
        return res.status(409).json({ message });
    if (message.includes('cannot exceed the project tree target'))
        return res.status(400).json({ message });
    return res.status(500).json({ message: 'Project request failed.' });
};
// Discovery and published project details are public, like the marketplace
// catalog. When a valid token is present the viewer is attached so the
// service can apply organizer/participant visibility and contact rules.
// Real logins use Supabase session tokens, not app JWTs, so the fallback
// mirrors requireAuth: an unresolvable token simply leaves the request
// anonymous for these public reads; protected routes still use requireAuth
// and will reject it there.
const optionalAuth = (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        next();
        return;
    }
    const token = header.slice('Bearer '.length);
    try {
        const decoded = (0, auth_2.verifyToken)(token);
        req.user = { id: decoded.id, email: decoded.email, name: decoded.name, roles: decoded.roles };
        next();
        return;
    }
    catch {
        void Promise.resolve()
            .then(() => (0, auth_2.getSupabaseClient)().auth.getUser(token))
            .then(({ data, error }) => {
            if (!error && data.user) {
                req.user = {
                    id: data.user.id,
                    email: data.user.email ?? '',
                    name: String(data.user.user_metadata?.name ?? 'User'),
                    roles: (0, auth_2.normalizeRoles)(data.user.user_metadata?.roles)
                };
            }
            next();
        })
            .catch(() => next());
    }
};
// --- Discovery & detail (public, visibility enforced in the service) -------
router.get('/', optionalAuth, async (req, res) => {
    try {
        const filters = projects_service_1.projectFilterSchema.parse(req.query);
        res.json(await (0, projects_service_1.discoverProjects)(filters, req.user?.id ?? null));
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        res.json({ project: await (0, projects_service_1.getProjectForViewer)(id, req.user?.id ?? null) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
// --- Organizer workflow ------------------------------------------------------
// Only plantation organizers create and manage projects.
router.post('/', auth_1.requireAuth, (0, auth_1.requireRoles)('PLANTATION_ORGANIZER'), async (req, res) => {
    try {
        const input = projects_service_1.projectInputSchema.parse(req.body);
        res.status(201).json({ project: await (0, projects_service_1.createProject)(req.user.id, input) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.get('/mine/list', auth_1.requireAuth, (0, auth_1.requireRoles)('PLANTATION_ORGANIZER'), async (req, res) => {
    try {
        res.json({ projects: await (0, projects_service_1.getMyProjects)(req.user.id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.patch('/:id', auth_1.requireAuth, (0, auth_1.requireRoles)('PLANTATION_ORGANIZER'), async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        const input = projects_service_1.projectInputSchema.parse(req.body);
        res.json({ project: await (0, projects_service_1.updateProject)(req.user.id, id, input) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.patch('/:id/status', auth_1.requireAuth, (0, auth_1.requireRoles)('PLANTATION_ORGANIZER'), async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        const { status } = projects_service_1.projectStatusInputSchema.parse(req.body);
        res.json({ project: await (0, projects_service_1.changeProjectStatus)(req.user.id, id, status) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/:id/progress', auth_1.requireAuth, (0, auth_1.requireRoles)('PLANTATION_ORGANIZER'), async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        const input = projects_service_1.progressUpdateInputSchema.parse(req.body);
        res.status(201).json({ progressUpdate: await (0, projects_service_1.addProgressUpdate)(req.user.id, id, input) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
// --- Pledges / support interest ----------------------------------------------
// Any authenticated user with a relevant role may pledge. A pledge is an
// intention recorded for coordination, never a payment (see the service).
router.post('/:id/pledges', auth_1.requireAuth, (0, auth_1.requireRoles)(...projects_service_1.pledgeEligibleRoles), async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        const input = projects_service_1.pledgeInputSchema.parse(req.body);
        res.status(201).json({ pledge: await (0, projects_service_1.submitPledge)(req.user.id, req.user.roles, id, input) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.get('/pledges/mine', auth_1.requireAuth, (0, auth_1.requireRoles)(...projects_service_1.pledgeEligibleRoles), async (req, res) => {
    try {
        res.json({ pledges: await (0, projects_service_1.getMyPledges)(req.user.id) });
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/pledges/:id/withdraw', auth_1.requireAuth, (0, auth_1.requireRoles)(...projects_service_1.pledgeEligibleRoles), async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        res.json(await (0, projects_service_1.withdrawPledge)(req.user.id, id));
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/pledges/:id/confirm', auth_1.requireAuth, (0, auth_1.requireRoles)('PLANTATION_ORGANIZER'), async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        res.json(await (0, projects_service_1.confirmPledge)(req.user.id, id));
    }
    catch (error) {
        return sendError(res, error);
    }
});
router.post('/pledges/:id/decline', auth_1.requireAuth, (0, auth_1.requireRoles)('PLANTATION_ORGANIZER'), async (req, res) => {
    try {
        const id = idSchema.parse(req.params.id);
        res.json(await (0, projects_service_1.declinePledge)(req.user.id, id));
    }
    catch (error) {
        return sendError(res, error);
    }
});
exports.default = router;
