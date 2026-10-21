"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeOrderStatus = exports.getNurseryOrders = exports.getBuyerOrders = exports.acceptQuotation = exports.declineQuoteRequest = exports.cancelQuoteRequest = exports.declineQuotation = exports.respondWithQuotation = exports.getQuoteRequestForParticipant = exports.getNurseryQuoteRequests = exports.getBuyerQuoteRequests = exports.createQuoteRequest = exports.canChangeOrderStatus = exports.isOrderParticipant = exports.isQuoteParticipant = exports.findOpenDuplicate = exports.openQuoteRequestStatuses = exports.hasSufficientStock = exports.computeOrderTotals = exports.roundMoney = exports.isQuotationExpired = exports.canTransitionOrder = exports.canTransitionQuoteRequest = exports.orderTransitions = exports.quoteRequestTransitions = exports.orderStatusInputSchema = exports.quotationInputSchema = exports.quoteRequestInputSchema = exports.orderStatuses = exports.quotationStatuses = exports.quoteRequestStatuses = void 0;
const zod_1 = require("zod");
const auth_1 = require("../lib/auth");
// Phase 4 domain rules.
// A quote request is NOT an accepted order. An order exists only after a buyer
// accepts a nursery quotation, and it stores immutable snapshots of the agreed
// price, quantity, participants, and terms. No payment is processed or recorded.
exports.quoteRequestStatuses = ['PENDING', 'QUOTED', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED'];
exports.quotationStatuses = ['ACTIVE', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN'];
exports.orderStatuses = ['CONFIRMED', 'FULFILLED', 'CANCELLED'];
const money = (minimum) => zod_1.z.number().finite().min(minimum).max(9999999999.99)
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.0000001, 'Money values can have at most two decimal places.');
const positiveMoney = zod_1.z.number().finite().positive().max(9999999999.99)
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.0000001, 'Price can have at most two decimal places.');
exports.quoteRequestInputSchema = zod_1.z.object({
    listingId: zod_1.z.string().uuid(),
    quantity: zod_1.z.number().int().positive().max(100000000),
    deliveryArea: zod_1.z.string().trim().min(1).max(160),
    deliveryDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Delivery date must use YYYY-MM-DD format.')
        .refine((value) => !Number.isNaN(Date.parse(value)), 'Delivery date must be a valid date.'),
    notes: zod_1.z.string().trim().max(2000).optional().or(zod_1.z.literal('')),
    idempotencyKey: zod_1.z.string().trim().min(8).max(128).optional()
});
exports.quotationInputSchema = zod_1.z.object({
    unitPrice: positiveMoney,
    quantity: zod_1.z.number().int().positive().max(100000000),
    deliveryCharge: money(0),
    terms: zod_1.z.string().trim().max(2000).optional().or(zod_1.z.literal('')),
    validUntil: zod_1.z.string().datetime({ message: 'Quotation validity must be an ISO date-time.' })
});
exports.orderStatusInputSchema = zod_1.z.object({
    status: zod_1.z.enum(['FULFILLED', 'CANCELLED'])
});
// ---------------------------------------------------------------------------
// Pure business rules (unit tested without a database)
// ---------------------------------------------------------------------------
exports.quoteRequestTransitions = {
    PENDING: ['QUOTED', 'DECLINED', 'CANCELLED', 'EXPIRED'],
    QUOTED: ['ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED'],
    ACCEPTED: [],
    DECLINED: [],
    CANCELLED: [],
    EXPIRED: []
};
exports.orderTransitions = {
    CONFIRMED: ['FULFILLED', 'CANCELLED'],
    FULFILLED: [],
    CANCELLED: []
};
const canTransitionQuoteRequest = (from, to) => exports.quoteRequestTransitions[from]?.includes(to) ?? false;
exports.canTransitionQuoteRequest = canTransitionQuoteRequest;
const canTransitionOrder = (from, to) => exports.orderTransitions[from]?.includes(to) ?? false;
exports.canTransitionOrder = canTransitionOrder;
const isQuotationExpired = (validUntil, now = new Date()) => new Date(validUntil).getTime() <= now.getTime();
exports.isQuotationExpired = isQuotationExpired;
const roundMoney = (value) => Math.round(value * 100) / 100;
exports.roundMoney = roundMoney;
const computeOrderTotals = (unitPrice, quantity, deliveryCharge) => {
    const subtotal = (0, exports.roundMoney)(unitPrice * quantity);
    return { subtotal, total: (0, exports.roundMoney)(subtotal + deliveryCharge) };
};
exports.computeOrderTotals = computeOrderTotals;
const hasSufficientStock = (availableQuantity, requiredQuantity) => availableQuantity >= requiredQuantity;
exports.hasSufficientStock = hasSufficientStock;
exports.openQuoteRequestStatuses = ['PENDING', 'QUOTED'];
const findOpenDuplicate = (existing, candidate) => existing.find((request) => exports.openQuoteRequestStatuses.includes(request.status)
    && request.listing_id === candidate.listing_id
    && request.quantity === candidate.quantity
    && request.delivery_date === candidate.delivery_date);
exports.findOpenDuplicate = findOpenDuplicate;
const isQuoteParticipant = (request, userId) => request.buyer_user_id === userId || request.nursery_user_id === userId;
exports.isQuoteParticipant = isQuoteParticipant;
const isOrderParticipant = (order, userId) => order.buyer_user_id === userId || order.nursery_user_id === userId;
exports.isOrderParticipant = isOrderParticipant;
const canChangeOrderStatus = (order, userId, target) => {
    if (!(0, exports.canTransitionOrder)(order.status, target))
        return false;
    if (target === 'FULFILLED')
        return order.nursery_user_id === userId;
    if (target === 'CANCELLED')
        return (0, exports.isOrderParticipant)(order, userId);
    return false;
};
exports.canChangeOrderStatus = canChangeOrderStatus;
const todayIsoDate = () => new Date().toISOString().slice(0, 10);
const getListing = async (supabase, listingId) => {
    const { data, error } = await supabase
        .from('plant_listings')
        .select('id, nursery_user_id, name, species, available_quantity, minimum_order_quantity, status')
        .eq('id', listingId)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    return data;
};
const getQuoteRequest = async (supabase, requestId) => {
    const { data, error } = await supabase
        .from('quote_requests')
        .select('*, quotation:quotations(*)')
        .eq('id', requestId)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (!data)
        throw new Error('Quote request not found.');
    return data;
};
const createQuoteRequest = async (buyerUserId, input, supabase = (0, auth_1.getSupabaseClient)()) => {
    if (input.deliveryDate < todayIsoDate())
        throw new Error('Delivery date cannot be in the past.');
    const listing = await getListing(supabase, input.listingId);
    if (!listing)
        throw new Error('Listing not found.');
    if (listing.nursery_user_id === buyerUserId)
        throw new Error('You do not have permission to request a quote for your own listing.');
    if (listing.status !== 'ACTIVE' || listing.available_quantity <= 0) {
        throw new Error('This listing is out of stock and cannot be quoted right now.');
    }
    if (input.quantity < listing.minimum_order_quantity) {
        throw new Error(`Quantity must be at least the listing minimum order quantity of ${listing.minimum_order_quantity}.`);
    }
    if (input.idempotencyKey) {
        const { data: existing, error } = await supabase
            .from('quote_requests')
            .select('*, quotation:quotations(*)')
            .eq('buyer_user_id', buyerUserId)
            .eq('idempotency_key', input.idempotencyKey)
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        if (existing)
            return existing;
    }
    const { data: openRequests, error: openError } = await supabase
        .from('quote_requests')
        .select('listing_id, quantity, delivery_date, status')
        .eq('buyer_user_id', buyerUserId)
        .eq('listing_id', input.listingId)
        .in('status', exports.openQuoteRequestStatuses);
    if (openError)
        throw new Error(openError.message);
    const duplicate = (0, exports.findOpenDuplicate)((openRequests ?? []), {
        listing_id: input.listingId,
        quantity: input.quantity,
        delivery_date: input.deliveryDate,
        status: 'PENDING'
    });
    if (duplicate) {
        throw new Error('A duplicate open quote request already exists for this listing, quantity, and delivery date.');
    }
    const { data, error } = await supabase
        .from('quote_requests')
        .insert({
        buyer_user_id: buyerUserId,
        listing_id: input.listingId,
        nursery_user_id: listing.nursery_user_id,
        quantity: input.quantity,
        delivery_area: input.deliveryArea,
        delivery_date: input.deliveryDate,
        notes: input.notes || null,
        status: 'PENDING',
        idempotency_key: input.idempotencyKey ?? null
    })
        .select('*, quotation:quotations(*)')
        .single();
    if (error) {
        if (error.code === '23505' && input.idempotencyKey) {
            const { data: existing } = await supabase
                .from('quote_requests')
                .select('*, quotation:quotations(*)')
                .eq('buyer_user_id', buyerUserId)
                .eq('idempotency_key', input.idempotencyKey)
                .maybeSingle();
            if (existing)
                return existing;
        }
        throw new Error(error.message);
    }
    return data;
};
exports.createQuoteRequest = createQuoteRequest;
const getBuyerQuoteRequests = async (buyerUserId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const { data, error } = await supabase
        .from('quote_requests')
        .select('*, quotation:quotations(*), listing:plant_listings(name, species, category, unit_price)')
        .eq('buyer_user_id', buyerUserId)
        .order('created_at', { ascending: false });
    if (error)
        throw new Error(error.message);
    return data ?? [];
};
exports.getBuyerQuoteRequests = getBuyerQuoteRequests;
const getNurseryQuoteRequests = async (nurseryUserId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const { data, error } = await supabase
        .from('quote_requests')
        .select('*, quotation:quotations(*), listing:plant_listings(name, species, category, unit_price)')
        .eq('nursery_user_id', nurseryUserId)
        .order('created_at', { ascending: false });
    if (error)
        throw new Error(error.message);
    return data ?? [];
};
exports.getNurseryQuoteRequests = getNurseryQuoteRequests;
const getQuoteRequestForParticipant = async (requestId, userId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const request = await getQuoteRequest(supabase, requestId);
    if (!(0, exports.isQuoteParticipant)(request, userId)) {
        throw new Error('You do not have permission to access this quote request.');
    }
    return request;
};
exports.getQuoteRequestForParticipant = getQuoteRequestForParticipant;
const respondWithQuotation = async (nurseryUserId, requestId, input, supabase = (0, auth_1.getSupabaseClient)()) => {
    const request = await getQuoteRequest(supabase, requestId);
    if (request.nursery_user_id !== nurseryUserId) {
        throw new Error('You do not have permission to respond to this quote request.');
    }
    if (!(0, exports.canTransitionQuoteRequest)(request.status, 'QUOTED')) {
        throw new Error(`Invalid status transition from ${request.status} to QUOTED.`);
    }
    if ((0, exports.isQuotationExpired)(input.validUntil)) {
        throw new Error('Quotation validity must be in the future: this quotation has already expired.');
    }
    if (input.quantity > request.quantity) {
        throw new Error('Quoted quantity cannot exceed the requested quantity.');
    }
    const listing = await getListing(supabase, request.listing_id);
    if (!listing)
        throw new Error('Listing not found.');
    if (!(0, exports.hasSufficientStock)(listing.available_quantity, input.quantity)) {
        throw new Error('The nursery is out of stock for the quoted quantity.');
    }
    const { data, error } = await supabase
        .from('quotations')
        .insert({
        quote_request_id: requestId,
        nursery_user_id: nurseryUserId,
        unit_price: input.unitPrice,
        quantity: input.quantity,
        delivery_charge: input.deliveryCharge,
        terms: input.terms || null,
        valid_until: input.validUntil,
        status: 'ACTIVE'
    })
        .select('*')
        .single();
    if (error) {
        if (error.code === '23505')
            throw new Error('Invalid status transition: this request already has a quotation.');
        throw new Error(error.message);
    }
    const { error: updateError } = await supabase
        .from('quote_requests')
        .update({ status: 'QUOTED', updated_at: new Date().toISOString() })
        .eq('id', requestId);
    if (updateError)
        throw new Error(updateError.message);
    return data;
};
exports.respondWithQuotation = respondWithQuotation;
const setQuoteRequestStatus = async (supabase, requestId, from, to) => {
    if (!(0, exports.canTransitionQuoteRequest)(from, to)) {
        throw new Error(`Invalid status transition from ${from} to ${to}.`);
    }
    const { error } = await supabase
        .from('quote_requests')
        .update({ status: to, updated_at: new Date().toISOString() })
        .eq('id', requestId);
    if (error)
        throw new Error(error.message);
};
const declineQuotation = async (buyerUserId, requestId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const request = await getQuoteRequest(supabase, requestId);
    if (request.buyer_user_id !== buyerUserId)
        throw new Error('You do not have permission to decline this quotation.');
    await setQuoteRequestStatus(supabase, requestId, request.status, 'DECLINED');
    await supabase.from('quotations').update({ status: 'DECLINED', updated_at: new Date().toISOString() }).eq('quote_request_id', requestId);
    return getQuoteRequest(supabase, requestId);
};
exports.declineQuotation = declineQuotation;
const cancelQuoteRequest = async (buyerUserId, requestId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const request = await getQuoteRequest(supabase, requestId);
    if (request.buyer_user_id !== buyerUserId)
        throw new Error('You do not have permission to cancel this quote request.');
    await setQuoteRequestStatus(supabase, requestId, request.status, 'CANCELLED');
    return getQuoteRequest(supabase, requestId);
};
exports.cancelQuoteRequest = cancelQuoteRequest;
const declineQuoteRequest = async (nurseryUserId, requestId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const request = await getQuoteRequest(supabase, requestId);
    if (request.nursery_user_id !== nurseryUserId)
        throw new Error('You do not have permission to decline this quote request.');
    await setQuoteRequestStatus(supabase, requestId, request.status, 'DECLINED');
    await supabase.from('quotations').update({ status: 'WITHDRAWN', updated_at: new Date().toISOString() }).eq('quote_request_id', requestId);
    return getQuoteRequest(supabase, requestId);
};
exports.declineQuoteRequest = declineQuoteRequest;
const acceptQuotation = async (buyerUserId, requestId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const request = await getQuoteRequest(supabase, requestId);
    if (request.buyer_user_id !== buyerUserId) {
        throw new Error('You do not have permission to accept this quotation.');
    }
    // Guard against duplicate acceptance: return the order created earlier.
    if (request.status === 'ACCEPTED') {
        const { data: existingOrder, error } = await supabase
            .from('orders')
            .select('*, items:order_items(*)')
            .eq('quote_request_id', requestId)
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        if (existingOrder)
            return existingOrder;
        throw new Error('Invalid status transition from ACCEPTED to ACCEPTED.');
    }
    if (!(0, exports.canTransitionQuoteRequest)(request.status, 'ACCEPTED')) {
        throw new Error(`Invalid status transition from ${request.status} to ACCEPTED.`);
    }
    const quotation = Array.isArray(request.quotation) ? request.quotation[0] : request.quotation;
    if (!quotation || quotation.status !== 'ACTIVE') {
        throw new Error('There is no active quotation to accept for this request.');
    }
    if ((0, exports.isQuotationExpired)(quotation.valid_until)) {
        await supabase.from('quotations').update({ status: 'EXPIRED', updated_at: new Date().toISOString() }).eq('id', quotation.id);
        await supabase.from('quote_requests').update({ status: 'EXPIRED', updated_at: new Date().toISOString() }).eq('id', requestId);
        throw new Error('This quotation has expired and can no longer be accepted.');
    }
    const listing = await getListing(supabase, request.listing_id);
    if (!listing)
        throw new Error('Listing not found.');
    if (!(0, exports.hasSufficientStock)(listing.available_quantity, quotation.quantity)) {
        throw new Error('The nursery is out of stock for the quoted quantity, so this quotation cannot be accepted.');
    }
    const totals = (0, exports.computeOrderTotals)(Number(quotation.unit_price), quotation.quantity, Number(quotation.delivery_charge));
    // Reserve stock with a conditional update so concurrent acceptances cannot
    // reserve more than the listing has available.
    const reservedQuantity = listing.available_quantity - quotation.quantity;
    const { data: reservation, error: reservationError } = await supabase
        .from('plant_listings')
        .update({
        available_quantity: reservedQuantity,
        status: reservedQuantity === 0 ? 'OUT_OF_STOCK' : 'ACTIVE',
        updated_at: new Date().toISOString()
    })
        .eq('id', listing.id)
        .gte('available_quantity', quotation.quantity)
        .select('id')
        .maybeSingle();
    if (reservationError)
        throw new Error(reservationError.message);
    if (!reservation) {
        throw new Error('The nursery is out of stock for the quoted quantity, so this quotation cannot be accepted.');
    }
    const restoreStock = async () => {
        await supabase
            .from('plant_listings')
            .update({
            available_quantity: listing.available_quantity,
            status: listing.status,
            updated_at: new Date().toISOString()
        })
            .eq('id', listing.id);
    };
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
        quote_request_id: requestId,
        quotation_id: quotation.id,
        buyer_user_id: request.buyer_user_id,
        nursery_user_id: request.nursery_user_id,
        status: 'CONFIRMED',
        plant_name: listing.name,
        unit_price: quotation.unit_price,
        quantity: quotation.quantity,
        delivery_charge: quotation.delivery_charge,
        subtotal: totals.subtotal,
        total: totals.total,
        delivery_area: request.delivery_area,
        delivery_date: request.delivery_date,
        terms: quotation.terms
    })
        .select('*')
        .single();
    if (orderError) {
        await restoreStock();
        if (orderError.code === '23505') {
            const { data: existingOrder } = await supabase
                .from('orders')
                .select('*, items:order_items(*)')
                .eq('quote_request_id', requestId)
                .maybeSingle();
            if (existingOrder)
                return existingOrder;
        }
        throw new Error(orderError.message);
    }
    const { error: itemError } = await supabase
        .from('order_items')
        .insert({
        order_id: order.id,
        listing_id: listing.id,
        plant_name: listing.name,
        species: listing.species,
        unit_price: quotation.unit_price,
        quantity: quotation.quantity,
        line_total: totals.subtotal
    });
    if (itemError) {
        await supabase.from('orders').delete().eq('id', order.id);
        await restoreStock();
        throw new Error(itemError.message);
    }
    await supabase.from('quotations').update({ status: 'ACCEPTED', updated_at: new Date().toISOString() }).eq('id', quotation.id);
    await supabase.from('quote_requests').update({ status: 'ACCEPTED', updated_at: new Date().toISOString() }).eq('id', requestId);
    return { ...order, items: [{ listing_id: listing.id, plant_name: listing.name, unit_price: quotation.unit_price, quantity: quotation.quantity, line_total: totals.subtotal }] };
};
exports.acceptQuotation = acceptQuotation;
const getBuyerOrders = async (buyerUserId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('buyer_user_id', buyerUserId)
        .order('created_at', { ascending: false });
    if (error)
        throw new Error(error.message);
    return data ?? [];
};
exports.getBuyerOrders = getBuyerOrders;
const getNurseryOrders = async (nurseryUserId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('nursery_user_id', nurseryUserId)
        .order('created_at', { ascending: false });
    if (error)
        throw new Error(error.message);
    return data ?? [];
};
exports.getNurseryOrders = getNurseryOrders;
const changeOrderStatus = async (userId, orderId, target, supabase = (0, auth_1.getSupabaseClient)()) => {
    const { data: order, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', orderId)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (!order)
        throw new Error('Order not found.');
    if (!(0, exports.isOrderParticipant)(order, userId)) {
        throw new Error('You do not have permission to change this order.');
    }
    if (!(0, exports.canChangeOrderStatus)(order, userId, target)) {
        if (!(0, exports.canTransitionOrder)(order.status, target)) {
            throw new Error(`Invalid status transition from ${order.status} to ${target}.`);
        }
        throw new Error('You do not have permission to change this order to that status.');
    }
    const { data, error: updateError } = await supabase
        .from('orders')
        .update({ status: target, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('status', order.status)
        .select('*, items:order_items(*)')
        .maybeSingle();
    if (updateError)
        throw new Error(updateError.message);
    if (!data)
        throw new Error(`Invalid status transition from ${order.status} to ${target}.`);
    // Cancelling a confirmed order releases its reserved stock.
    if (target === 'CANCELLED') {
        const items = Array.isArray(order.items) ? order.items : [];
        for (const item of items) {
            if (!item.listing_id)
                continue;
            const listing = await getListing(supabase, item.listing_id);
            if (!listing)
                continue;
            const available = listing.available_quantity + item.quantity;
            await supabase
                .from('plant_listings')
                .update({
                available_quantity: available,
                status: listing.status === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE',
                updated_at: new Date().toISOString()
            })
                .eq('id', listing.id);
        }
    }
    return data;
};
exports.changeOrderStatus = changeOrderStatus;
