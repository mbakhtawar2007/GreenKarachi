"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRoles = exports.requireAuth = void 0;
const auth_1 = require("../lib/auth");
const requireAuth = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Authentication required.' });
        return;
    }
    const token = header.slice('Bearer '.length);
    try {
        const decoded = (0, auth_1.verifyToken)(token);
        req.user = { id: decoded.id, email: decoded.email, name: decoded.name, roles: decoded.roles };
        next();
        return;
    }
    catch {
        void Promise.resolve().then(() => (0, auth_1.getSupabaseClient)().auth.getUser(token)).then(({ data, error }) => {
            if (error || !data.user) {
                res.status(401).json({ message: 'Invalid or expired token.' });
                return;
            }
            req.user = {
                id: data.user.id,
                email: data.user.email ?? '',
                name: String(data.user.user_metadata?.name ?? 'User'),
                roles: (0, auth_1.normalizeRoles)(data.user.user_metadata?.roles)
            };
            next();
        }).catch(() => {
            res.status(401).json({ message: 'Invalid or expired token.' });
        });
    }
};
exports.requireAuth = requireAuth;
const requireRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required.' });
            return;
        }
        if (!(0, auth_1.isRoleAllowed)(req.user.roles, allowedRoles)) {
            res.status(403).json({ message: 'You do not have permission to access this resource.' });
            return;
        }
        next();
    };
};
exports.requireRoles = requireRoles;
