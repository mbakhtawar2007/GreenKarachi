export declare const roleValues: readonly ["BUYER", "NURSERY_OWNER", "PLANTATION_ORGANIZER", "DONOR_INVESTOR", "ADMIN"];
export type AppRole = (typeof roleValues)[number];
export type AuthTokenPayload = {
    id: string;
    email: string;
    name: string;
    roles: AppRole[];
};
export declare const normalizeRoles: (input?: string | string[]) => AppRole[];
export declare const hashPassword: (plainText: string) => Promise<string>;
export declare const verifyPassword: (plainText: string, hashedPassword: string) => Promise<boolean>;
export declare const signToken: (payload: AuthTokenPayload) => string;
export declare const verifyToken: (token: string) => AuthTokenPayload;
export declare const getSupabaseClient: () => import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
export declare const sanitizeUser: <T extends {
    passwordHash?: string;
}>(user: T) => Omit<T, "passwordHash">;
export declare const isRoleAllowed: (userRoles?: string[], allowedRoles?: string[]) => boolean;
