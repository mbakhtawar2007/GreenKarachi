import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    role: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    password: string;
    role?: string | undefined;
}, {
    name: string;
    email: string;
    password: string;
    role?: string | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const nurseryProfileSchema: z.ZodObject<{
    name: z.ZodString;
    phone: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    city: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    address: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    website: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    phone?: string | undefined;
    city?: string | undefined;
    address?: string | undefined;
    website?: string | undefined;
}, {
    name: string;
    phone?: string | undefined;
    city?: string | undefined;
    address?: string | undefined;
    website?: string | undefined;
}>;
export declare const registerUser: (input: z.infer<typeof registerSchema>) => Promise<{
    user: Omit<{
        id: string;
        email: string;
        name: string;
        roles: ("BUYER" | "NURSERY_OWNER" | "PLANTATION_ORGANIZER" | "DONOR_INVESTOR" | "ADMIN")[];
        passwordHash: undefined;
    }, "passwordHash">;
    token: string | null;
}>;
export declare const loginUser: (input: z.infer<typeof loginSchema>) => Promise<{
    token: string;
    user: Omit<{
        id: string;
        email: string;
        name: any;
        roles: any[];
        passwordHash: undefined;
    }, "passwordHash">;
}>;
export declare const getCurrentUser: (userId: string) => Promise<Omit<{
    id: string;
    email: string | undefined;
    name: any;
    roles: any;
    passwordHash: undefined;
}, "passwordHash">>;
export declare const upsertNurseryProfile: (userId: string, input: z.infer<typeof nurseryProfileSchema>) => Promise<any>;
export declare const getNurseryProfile: (userId: string) => Promise<{
    user_id: any;
    name: any;
    phone: any;
    city: any;
    address: any;
    website: any;
    verification_status: any;
    is_verified: any;
} | null>;
