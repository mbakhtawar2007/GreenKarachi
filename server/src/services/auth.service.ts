import { z } from 'zod';
import { getSupabaseClient, normalizeRoles, sanitizeUser } from '../lib/auth';
import { isLoginBlocked } from './admin.service';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long.'),
  email: z.string().trim().email('Email is invalid.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  // ADMIN is deliberately not a registrable role: granting it here would let
  // anyone self-register as an administrator. Admin accounts are created by
  // direct promotion only (see promote-admin.sql).
  role: z.enum(['BUYER', 'NURSERY_OWNER', 'PLANTATION_ORGANIZER', 'DONOR', 'DONOR_INVESTOR']).optional()
});

export const loginSchema = z.object({
  email: z.string().trim().email('Email is invalid.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.')
});

export const nurseryProfileSchema = z.object({
  name: z.string().trim().min(2, 'Nursery name is required.'),
  phone: z.string().trim().optional().or(z.literal('')),
  city: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  // A website must be a real http(s) URL: the directory renders it as a
  // link, and a free-text value would allow javascript: URIs (stored XSS
  // with access to a visitor's session token) or broken relative links.
  website: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(
      (value) => {
        if (!value) return true;
        try {
          const url = new URL(value);
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'Website must be a valid http:// or https:// URL.' }
    )
});

export const registerUser = async (input: z.infer<typeof registerSchema>) => {
  const supabase = getSupabaseClient();
  const roles = normalizeRoles(input.role);

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
    user: sanitizeUser({
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

export const loginUser = async (input: z.infer<typeof loginSchema>) => {
  const supabase = getSupabaseClient();

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
    if (isLoginBlocked(accountState)) {
      await supabase.auth.signOut();
      throw new Error('This account has been suspended. Contact the GreenKarachi team if you believe this is a mistake.');
    }
  }

  const roles = Array.isArray(user?.user_metadata?.roles)
    ? user.user_metadata.roles
    : ['BUYER'];

  return {
    token: data.session?.access_token ?? null,
    user: sanitizeUser({
      id: user?.id ?? 'unknown',
      email: user?.email ?? input.email.toLowerCase(),
      name: user?.user_metadata?.name ?? 'User',
      roles,
      passwordHash: undefined
    })
  };
};

export const getCurrentUser = async (userId: string) => {
  const supabase = getSupabaseClient();
  // The route already authenticates the caller and passes req.user.id; look
  // that profile up instead of calling getUser() with no token (which always
  // errors on the session-less service client and made this endpoint 404).
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, roles')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error('User not found.');
  }

  return sanitizeUser({
    id: data.id,
    email: data.email,
    name: data.name,
    roles: data.roles ?? ['BUYER'],
    passwordHash: undefined
  });
};

export const upsertNurseryProfile = async (userId: string, input: z.infer<typeof nurseryProfileSchema>) => {
  const supabase = getSupabaseClient();

  // A verified badge must describe the details an admin actually reviewed.
  // If a verified nursery changes its name, city, or address, the profile
  // returns to PENDING so the new details get reviewed before the badge does.
  const { data: existing } = await supabase
    .from('nurseries')
    .select('name, city, address, is_verified')
    .eq('user_id', userId)
    .maybeSingle();
  const materialChange =
    existing?.is_verified &&
    (existing.name !== input.name.trim() ||
      (existing.city ?? null) !== (input.city?.trim() || null) ||
      (existing.address ?? null) !== (input.address?.trim() || null));

  const { data, error } = await supabase
    .from('nurseries')
    .upsert({
      user_id: userId,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      city: input.city?.trim() || null,
      address: input.address?.trim() || null,
      website: input.website?.trim() || null,
      ...(materialChange
        ? { verification_status: 'PENDING', is_verified: false, verified_by: null, verified_at: null }
        : {}),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getNurseryProfile = async (userId: string) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('nurseries')
    .select('user_id, name, phone, city, address, website, verification_status, is_verified')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};
