import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env';

export const roleValues = ['BUYER', 'NURSERY_OWNER', 'PLANTATION_ORGANIZER', 'DONOR_INVESTOR', 'ADMIN'] as const;
export type AppRole = (typeof roleValues)[number];

export type AuthTokenPayload = {
  id: string;
  email: string;
  name: string;
  roles: AppRole[];
};

export const normalizeRoles = (input?: string | string[]): AppRole[] => {
  const values = Array.isArray(input) ? input : input ? [input] : ['BUYER'];

  const normalized = values
    .map((role) => String(role).trim().toUpperCase().replace(/-/g, '_'))
    .filter((role): role is AppRole => roleValues.includes(role as AppRole));

  return normalized.length > 0 ? normalized : ['BUYER'];
};

export const hashPassword = async (plainText: string): Promise<string> => bcrypt.hash(plainText, 12);

export const verifyPassword = async (plainText: string, hashedPassword: string): Promise<boolean> =>
  bcrypt.compare(plainText, hashedPassword);

export const signToken = (payload: AuthTokenPayload): string =>
  jwt.sign(payload, config.JWT_SECRET, { expiresIn: '24h' });

export const verifyToken = (token: string): AuthTokenPayload =>
  jwt.verify(token, config.JWT_SECRET) as AuthTokenPayload;

export const getSupabaseClient = () => {
  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase credentials are not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};

export const sanitizeUser = <T extends { passwordHash?: string }>(user: T) => {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

export const isRoleAllowed = (userRoles: string[] = [], allowedRoles: string[] = []): boolean =>
  allowedRoles.some((role) => userRoles.includes(role));
