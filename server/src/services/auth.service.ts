import { z } from 'zod';
import { getSupabaseClient, normalizeRoles, sanitizeUser } from '../lib/auth';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long.'),
  email: z.string().trim().email('Email is invalid.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  role: z.string().optional()
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
  website: z.string().trim().optional().or(z.literal(''))
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
    token: data.session?.access_token ?? null
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
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error('User not found.');
  }

  return sanitizeUser({
    id: data.user.id,
    email: data.user.email,
    name: data.user.user_metadata?.name ?? 'User',
    roles: data.user.user_metadata?.roles ?? ['BUYER'],
    passwordHash: undefined
  });
};

export const upsertNurseryProfile = async (userId: string, input: z.infer<typeof nurseryProfileSchema>) => {
  const supabase = getSupabaseClient();

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
