"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertNurseryProfile = exports.getCurrentUser = exports.loginUser = exports.registerUser = exports.nurseryProfileSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const auth_1 = require("../lib/auth");
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Name must be at least 2 characters long.'),
    email: zod_1.z.string().trim().email('Email is invalid.'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters long.'),
    role: zod_1.z.string().optional()
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email('Email is invalid.'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters long.')
});
exports.nurseryProfileSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Nursery name is required.'),
    phone: zod_1.z.string().trim().optional().or(zod_1.z.literal('')),
    city: zod_1.z.string().trim().optional().or(zod_1.z.literal('')),
    address: zod_1.z.string().trim().optional().or(zod_1.z.literal('')),
    website: zod_1.z.string().trim().optional().or(zod_1.z.literal(''))
});
const registerUser = async (input) => {
    const supabase = (0, auth_1.getSupabaseClient)();
    const roles = (0, auth_1.normalizeRoles)(input.role);
    const { data, error } = await supabase.auth.signUp({
        email: input.email.toLowerCase(),
        password: input.password,
        options: {
            data: {
                name: input.name.trim(),
                roles
            }
        }
    });
    if (error) {
        throw new Error(error.message);
    }
    const user = data.user;
    return {
        user: (0, auth_1.sanitizeUser)({
            id: user?.id ?? 'pending',
            email: input.email.toLowerCase(),
            name: input.name.trim(),
            roles,
            passwordHash: undefined
        }),
        token: data.session?.access_token ?? null
    };
};
exports.registerUser = registerUser;
const loginUser = async (input) => {
    const supabase = (0, auth_1.getSupabaseClient)();
    const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email.toLowerCase(),
        password: input.password
    });
    if (error) {
        throw new Error(error.message);
    }
    const user = data.user;
    const roles = Array.isArray(user?.user_metadata?.roles)
        ? user.user_metadata.roles
        : ['BUYER'];
    return {
        token: data.session?.access_token ?? null,
        user: (0, auth_1.sanitizeUser)({
            id: user?.id ?? 'unknown',
            email: user?.email ?? input.email.toLowerCase(),
            name: user?.user_metadata?.name ?? 'User',
            roles,
            passwordHash: undefined
        })
    };
};
exports.loginUser = loginUser;
const getCurrentUser = async (userId) => {
    const supabase = (0, auth_1.getSupabaseClient)();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
        throw new Error('User not found.');
    }
    return (0, auth_1.sanitizeUser)({
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name ?? 'User',
        roles: data.user.user_metadata?.roles ?? ['BUYER'],
        passwordHash: undefined
    });
};
exports.getCurrentUser = getCurrentUser;
const upsertNurseryProfile = async (userId, input) => {
    const supabase = (0, auth_1.getSupabaseClient)();
    const { data, error } = await supabase
        .from('nurseries')
        .upsert({
        user_id: userId,
        name: input.name.trim(),
        phone: input.phone?.trim() || null,
        city: input.city?.trim() || null,
        address: input.address?.trim() || null,
        website: input.website?.trim() || null,
        updated_at: new Date().toISOString()
    })
        .select();
    if (error) {
        throw new Error(error.message);
    }
    return data;
};
exports.upsertNurseryProfile = upsertNurseryProfile;
