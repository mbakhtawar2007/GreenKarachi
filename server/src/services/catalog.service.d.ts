import { z } from 'zod';
export declare const listingInputSchema: z.ZodObject<{
    name: z.ZodString;
    species: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    category: z.ZodString;
    description: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    imageUrls: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
    height: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    unitPrice: z.ZodEffects<z.ZodNumber, number, number>;
    availableQuantity: z.ZodNumber;
    minimumOrderQuantity: z.ZodNumber;
    serviceArea: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    name: string;
    category: string;
    imageUrls: string[];
    unitPrice: number;
    availableQuantity: number;
    minimumOrderQuantity: number;
    species?: string | undefined;
    description?: string | undefined;
    height?: string | undefined;
    serviceArea?: string | undefined;
}, {
    name: string;
    category: string;
    unitPrice: number;
    availableQuantity: number;
    minimumOrderQuantity: number;
    species?: string | undefined;
    description?: string | undefined;
    imageUrls?: string[] | undefined;
    height?: string | undefined;
    serviceArea?: string | undefined;
}>;
export declare const listingFilterSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    species: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    minPrice: z.ZodOptional<z.ZodNumber>;
    maxPrice: z.ZodOptional<z.ZodNumber>;
    minQuantity: z.ZodOptional<z.ZodNumber>;
    maxQuantity: z.ZodOptional<z.ZodNumber>;
    verified: z.ZodOptional<z.ZodEnum<["true", "false"]>>;
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    verified?: "true" | "false" | undefined;
    species?: string | undefined;
    category?: string | undefined;
    query?: string | undefined;
    location?: string | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    minQuantity?: number | undefined;
    maxQuantity?: number | undefined;
}, {
    verified?: "true" | "false" | undefined;
    species?: string | undefined;
    category?: string | undefined;
    query?: string | undefined;
    location?: string | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    minQuantity?: number | undefined;
    maxQuantity?: number | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}>, {
    page: number;
    pageSize: number;
    verified?: "true" | "false" | undefined;
    species?: string | undefined;
    category?: string | undefined;
    query?: string | undefined;
    location?: string | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    minQuantity?: number | undefined;
    maxQuantity?: number | undefined;
}, {
    verified?: "true" | "false" | undefined;
    species?: string | undefined;
    category?: string | undefined;
    query?: string | undefined;
    location?: string | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    minQuantity?: number | undefined;
    maxQuantity?: number | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}>, {
    page: number;
    pageSize: number;
    verified?: "true" | "false" | undefined;
    species?: string | undefined;
    category?: string | undefined;
    query?: string | undefined;
    location?: string | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    minQuantity?: number | undefined;
    maxQuantity?: number | undefined;
}, {
    verified?: "true" | "false" | undefined;
    species?: string | undefined;
    category?: string | undefined;
    query?: string | undefined;
    location?: string | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    minQuantity?: number | undefined;
    maxQuantity?: number | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export declare const nurseryFilterSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    verified: z.ZodOptional<z.ZodEnum<["true", "false"]>>;
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    verified?: "true" | "false" | undefined;
    query?: string | undefined;
    location?: string | undefined;
}, {
    verified?: "true" | "false" | undefined;
    query?: string | undefined;
    location?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export type ListingInput = z.infer<typeof listingInputSchema>;
export type ListingFilters = z.infer<typeof listingFilterSchema>;
export type NurseryFilters = z.infer<typeof nurseryFilterSchema>;
export declare const getPublicListings: (filters: ListingFilters) => Promise<{
    listings: any[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}>;
export declare const getOwnedListings: (nurseryUserId: string) => Promise<any[]>;
export declare const createListing: (nurseryUserId: string, input: ListingInput) => Promise<any>;
export declare const updateListing: (listingId: string, nurseryUserId: string, input: ListingInput) => Promise<any>;
export declare const updateListingStock: (listingId: string, nurseryUserId: string, availableQuantity: number) => Promise<any>;
export declare const archiveListing: (listingId: string, nurseryUserId: string) => Promise<any>;
export declare const getPublicNurseries: (filters: NurseryFilters) => Promise<{
    nurseries: {
        user_id: any;
        name: any;
        city: any;
        address: any;
        website: any;
        verification_status: any;
        is_verified: any;
    }[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}>;
