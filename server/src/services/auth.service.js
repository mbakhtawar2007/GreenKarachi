"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNurseryProfile = exports.upsertNurseryProfile = exports.getCurrentUser = exports.loginUser = exports.registerUser = exports.nurseryProfileSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const auth_1 = require("../lib/auth");
const admin_service_1 = require("./admin.service");
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Name must be at least 2 characters long.'),
    email: zod_1.z.string().trim().email('Email is invalid.'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters long.'),
    role: zod_1.z.enum(['BUYER', 'NURSERY_OWNER', 'PLANTATION_ORGANIZER', 'DONOR', 'DONOR_INVESTOR']).optional()
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
        token: data.session?.access_token ?? null,
        // True when email confirmation is enabled: the account was created but
        // Supabase issues no session until the confirmation link is clicked.
        requiresEmailConfirmation: !data.session
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
    // Phase 7: suspended accounts (see admin.service) cannot sign in. The
    // admin action also bans the account at the Supabase Auth layer; this
    // account-state check is the app-level enforcement for sessions Supabase
    // still returns, and it produces a clear message instead of an auth
    // error.
    if (user) {
        const { data: accountState } = await supabase
            .from('user_account_states')
            .select('is_suspended')
            .eq('user_id', user.id)
            .maybeSingle();
        if ((0, admin_service_1.isLoginBlocked)(accountState)) {
            await supabase.auth.signOut();
            throw new Error('This account has been suspended. Contact the GreenKarachi team if you believe this is a mistake.');
        }
    }
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
        .select()
        .single();
    if (error) {
        throw new Error(error.message);
    }
    return data;
};
exports.upsertNurseryProfile = upsertNurseryProfile;
const getNurseryProfile = async (userId) => {
    const supabase = (0, auth_1.getSupabaseClient)();
    const { data, error } = await supabase
        .from('nurseries')
        .select('user_id, name, phone, city, address, website, verification_status, is_verified')
        .eq('user_id', userId)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    return data;
};
exports.getNurseryProfile = getNurseryProfile;
