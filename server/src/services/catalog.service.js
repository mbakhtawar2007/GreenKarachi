"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicNurseries = exports.archiveListing = exports.updateListingStock = exports.updateListing = exports.createListing = exports.getOwnedListings = exports.getPublicListings = exports.nurseryFilterSchema = exports.listingFilterSchema = exports.listingInputSchema = void 0;
const zod_1 = require("zod");
const auth_1 = require("../lib/auth");
const imageUrlSchema = zod_1.z.string().trim().url().max(2048).refine((value) => {
    try {
        const protocol = new URL(value).protocol;
        return protocol === 'https:' || protocol === 'http:';
    }
    catch {
        return false;
    }
}, 'Image URLs must use HTTP or HTTPS.');
const positivePrice = zod_1.z.number().finite().positive().max(9999999999.99)
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.0000001, 'Price can have at most two decimal places.');
exports.listingInputSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(120),
    species: zod_1.z.string().trim().max(120).optional().or(zod_1.z.literal('')),
    category: zod_1.z.string().trim().min(1).max(80),
    description: zod_1.z.string().trim().max(2000).optional().or(zod_1.z.literal('')),
    imageUrls: zod_1.z.array(imageUrlSchema).max(8).default([]),
    height: zod_1.z.string().trim().max(80).optional().or(zod_1.z.literal('')),
    unitPrice: positivePrice,
    availableQuantity: zod_1.z.number().int().min(0).max(100000000),
    minimumOrderQuantity: zod_1.z.number().int().positive().max(100000000),
    serviceArea: zod_1.z.string().trim().max(160).optional().or(zod_1.z.literal(''))
});
exports.listingFilterSchema = zod_1.z.object({
    query: zod_1.z.string().trim().max(120).optional(),
    species: zod_1.z.string().trim().max(120).optional(),
    category: zod_1.z.string().trim().max(80).optional(),
    location: zod_1.z.string().trim().max(120).optional(),
    minPrice: zod_1.z.coerce.number().finite().min(0).optional(),
    maxPrice: zod_1.z.coerce.number().finite().min(0).optional(),
    minQuantity: zod_1.z.coerce.number().int().min(0).optional(),
    maxQuantity: zod_1.z.coerce.number().int().min(0).optional(),
    verified: zod_1.z.enum(['true', 'false']).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(50).default(12)
}).refine((filters) => filters.minPrice === undefined || filters.maxPrice === undefined || filters.minPrice <= filters.maxPrice, {
    message: 'Minimum price must not exceed maximum price.'
}).refine((filters) => filters.minQuantity === undefined || filters.maxQuantity === undefined || filters.minQuantity <= filters.maxQuantity, {
    message: 'Minimum quantity must not exceed maximum quantity.'
});
exports.nurseryFilterSchema = zod_1.z.object({
    query: zod_1.z.string().trim().max(120).optional(),
    location: zod_1.z.string().trim().max(120).optional(),
    verified: zod_1.z.enum(['true', 'false']).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(50).default(12)
});
const toDatabaseInput = (input, nurseryUserId) => ({
    nursery_user_id: nurseryUserId,
    name: input.name,
    species: input.species || null,
    category: input.category,
    description: input.description || null,
    image_urls: input.imageUrls,
    height: input.height || null,
    unit_price: input.unitPrice,
    available_quantity: input.availableQuantity,
    minimum_order_quantity: input.minimumOrderQuantity,
    service_area: input.serviceArea || null,
    status: input.availableQuantity === 0 ? 'OUT_OF_STOCK' : 'ACTIVE',
    updated_at: new Date().toISOString()
});
const escapeSearchValue = (value) => value.replace(/[\\%_*,.()]/g, '\\$&');
const getPublicListings = async (filters) => {
    const supabase = (0, auth_1.getSupabaseClient)();
    const from = (filters.page - 1) * filters.pageSize;
    let locationOwnerIds;
    if (filters.location) {
        const term = `%${escapeSearchValue(filters.location)}%`;
        const [serviceAreaResult, nurseryLocationResult] = await Promise.all([
            supabase.from('plant_listings').select('nursery_user_id').eq('status', 'ACTIVE').ilike('service_area', term),
            supabase.from('nurseries').select('user_id').or(`city.ilike.${term},address.ilike.${term}`)
        ]);
        if (serviceAreaResult.error)
            throw new Error(serviceAreaResult.error.message);
        if (nurseryLocationResult.error)
            throw new Error(nurseryLocationResult.error.message);
        locationOwnerIds = [...new Set([
                ...(serviceAreaResult.data ?? []).map((row) => row.nursery_user_id),
                ...(nurseryLocationResult.data ?? []).map((row) => row.user_id)
            ])];
        if (locationOwnerIds.length === 0) {
            return {
                listings: [],
                pagination: { page: filters.page, pageSize: filters.pageSize, total: 0, totalPages: 0 }
            };
        }
    }
    let query = supabase
        .from('plant_listings')
        .select('*, nursery:nurseries!inner(name, city, address, verification_status, is_verified)', { count: 'exact' })
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .range(from, from + filters.pageSize - 1);
    if (filters.query) {
        const term = escapeSearchValue(filters.query);
        query = query.or(`name.ilike.%${term}%,species.ilike.%${term}%,category.ilike.%${term}%`);
    }
    if (filters.species)
        query = query.ilike('species', `%${escapeSearchValue(filters.species)}%`);
    if (filters.category)
        query = query.ilike('category', `%${escapeSearchValue(filters.category)}%`);
    if (locationOwnerIds)
        query = query.in('nursery_user_id', locationOwnerIds);
    if (filters.minPrice !== undefined)
        query = query.gte('unit_price', filters.minPrice);
    if (filters.maxPrice !== undefined)
        query = query.lte('unit_price', filters.maxPrice);
    if (filters.minQuantity !== undefined)
        query = query.gte('available_quantity', filters.minQuantity);
    if (filters.maxQuantity !== undefined)
        query = query.lte('available_quantity', filters.maxQuantity);
    if (filters.verified === 'true')
        query = query.eq('nursery.is_verified', true);
    if (filters.verified === 'false')
        query = query.eq('nursery.is_verified', false);
    const { data, count, error } = await query;
    if (error)
        throw new Error(error.message);
    return {
        listings: data ?? [],
        pagination: {
            page: filters.page,
            pageSize: filters.pageSize,
            total: count ?? 0,
            totalPages: Math.ceil((count ?? 0) / filters.pageSize)
        }
    };
};
exports.getPublicListings = getPublicListings;
const getOwnedListings = async (nurseryUserId) => {
    const supabase = (0, auth_1.getSupabaseClient)();
    const { data, error } = await supabase
        .from('plant_listings')
        .select('*')
        .eq('nursery_user_id', nurseryUserId)
        .order('updated_at', { ascending: false });
    if (error)
        throw new Error(error.message);
    return data ?? [];
};
exports.getOwnedListings = getOwnedListings;
const createListing = async (nurseryUserId, input) => {
    const supabase = (0, auth_1.getSupabaseClient)();
    const { data: nursery, error: nurseryError } = await supabase
        .from('nurseries')
        .select('user_id')
        .eq('user_id', nurseryUserId)
        .maybeSingle();
    if (nurseryError)
        throw new Error(nurseryError.message);
    if (!nursery)
        throw new Error('Create a nursery profile before adding listings.');
    const { data, error } = await supabase
        .from('plant_listings')
        .insert(toDatabaseInput(input, nurseryUserId))
        .select('*')
        .single();
    if (error)
        throw new Error(error.message);
    return data;
};
exports.createListing = createListing;
const updateListing = async (listingId, nurseryUserId, input) => {
    const supabase = (0, auth_1.getSupabaseClient)();
    const { data, error } = await supabase
        .from('plant_listings')
        .update(toDatabaseInput(input, nurseryUserId))
        .eq('id', listingId)
        .eq('nursery_user_id', nurseryUserId)
        .select('*')
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (!data)
        throw new Error('Listing not found or you do not own it.');
    return data;
};
exports.updateListing = updateListing;
const updateListingStock = async (listingId, nurseryUserId, availableQuantity) => {
    const supabase = (0, auth_1.getSupabaseClient)();
    const { data: current, error: readError } = await supabase
        .from('plant_listings')
        .select('status')
        .eq('id', listingId)
        .eq('nursery_user_id', nurseryUserId)
        .maybeSingle();
    if (readError)
        throw new Error(readError.message);
    if (!current)
        throw new Error('Listing not found or you do not own it.');
    const status = current.status === 'ARCHIVED'
        ? 'ARCHIVED'
        : availableQuantity === 0 ? 'OUT_OF_STOCK' : 'ACTIVE';
    const { data, error } = await supabase
        .from('plant_listings')
        .update({ available_quantity: availableQuantity, status, updated_at: new Date().toISOString() })
        .eq('id', listingId)
        .eq('nursery_user_id', nurseryUserId)
        .select('*')
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (!data)
        throw new Error('Listing not found or you do not own it.');
    return data;
};
exports.updateListingStock = updateListingStock;
const archiveListing = async (listingId, nurseryUserId) => {
    const supabase = (0, auth_1.getSupabaseClient)();
    const { data, error } = await supabase
        .from('plant_listings')
        .update({ status: 'ARCHIVED', updated_at: new Date().toISOString() })
        .eq('id', listingId)
        .eq('nursery_user_id', nurseryUserId)
        .select('*')
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (!data)
        throw new Error('Listing not found or you do not own it.');
    return data;
};
exports.archiveListing = archiveListing;
const getPublicNurseries = async (filters) => {
    const supabase = (0, auth_1.getSupabaseClient)();
    const from = (filters.page - 1) * filters.pageSize;
    let query = supabase
        .from('nurseries')
        .select('user_id, name, city, address, website, verification_status, is_verified', { count: 'exact' })
        .order('name', { ascending: true })
        .range(from, from + filters.pageSize - 1);
    if (filters.query)
        query = query.ilike('name', `%${escapeSearchValue(filters.query)}%`);
    if (filters.location) {
        const term = `%${escapeSearchValue(filters.location)}%`;
        query = query.or(`city.ilike.${term},address.ilike.${term}`);
    }
    if (filters.verified === 'true')
        query = query.eq('is_verified', true);
    if (filters.verified === 'false')
        query = query.eq('is_verified', false);
    const { data, count, error } = await query;
    if (error)
        throw new Error(error.message);
    return {
        nurseries: data ?? [],
        pagination: {
            page: filters.page,
            pageSize: filters.pageSize,
            total: count ?? 0,
            totalPages: Math.ceil((count ?? 0) / filters.pageSize)
        }
    };
};
exports.getPublicNurseries = getPublicNurseries;
