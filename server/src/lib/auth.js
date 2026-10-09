"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRoleAllowed = exports.sanitizeUser = exports.getSupabaseClient = exports.verifyToken = exports.signToken = exports.verifyPassword = exports.hashPassword = exports.normalizeRoles = exports.roleValues = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("../config/env");
exports.roleValues = ['BUYER', 'NURSERY_OWNER', 'PLANTATION_ORGANIZER', 'DONOR_INVESTOR', 'ADMIN'];
const normalizeRoles = (input) => {
    const values = Array.isArray(input) ? input : input ? [input] : ['BUYER'];
    const normalized = values
        .map((role) => String(role).trim().toUpperCase().replace(/-/g, '_'))
        .filter((role) => exports.roleValues.includes(role));
    return normalized.length > 0 ? normalized : ['BUYER'];
};
exports.normalizeRoles = normalizeRoles;
const hashPassword = async (plainText) => bcryptjs_1.default.hash(plainText, 12);
exports.hashPassword = hashPassword;
const verifyPassword = async (plainText, hashedPassword) => bcryptjs_1.default.compare(plainText, hashedPassword);
exports.verifyPassword = verifyPassword;
const signToken = (payload) => jsonwebtoken_1.default.sign(payload, env_1.config.JWT_SECRET, { expiresIn: '24h' });
exports.signToken = signToken;
const verifyToken = (token) => jsonwebtoken_1.default.verify(token, env_1.config.JWT_SECRET);
exports.verifyToken = verifyToken;
const getSupabaseClient = () => {
    if (!env_1.config.SUPABASE_URL || !env_1.config.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase credentials are not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }
    return (0, supabase_js_1.createClient)(env_1.config.SUPABASE_URL, env_1.config.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
};
exports.getSupabaseClient = getSupabaseClient;
const sanitizeUser = (user) => {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
};
exports.sanitizeUser = sanitizeUser;
const isRoleAllowed = (userRoles = [], allowedRoles = []) => allowedRoles.some((role) => userRoles.includes(role));
exports.isRoleAllowed = isRoleAllowed;
