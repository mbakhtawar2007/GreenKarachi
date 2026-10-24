"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptSupplyOffer = exports.withdrawSupplyOffer = exports.rejectSupplyOffer = exports.getMySupplyOffers = exports.submitSupplyOffer = exports.getSupplyGapRequestForParticipant = exports.getOpenSupplyGapRequests = exports.getMySupplyGapRequests = exports.changeSupplyGapRequestStatus = exports.updateSupplyGapRequest = exports.createSupplyGapRequest = exports.findPendingOfferFromSupplier = exports.isEligibleSupplier = exports.isOfferSupplier = exports.isRequester = exports.simulateConcurrentAcceptances = exports.canAcceptOffer = exports.canTransitionSupplyOffer = exports.canTransitionSupplyGapRequest = exports.supplyOfferTransitions = exports.supplyGapRequestTransitions = exports.isOpenForOffers = exports.remainingGap = exports.summarizeOffers = exports.computeQuantityNeeded = exports.supplyGapRequestStatusInputSchema = exports.supplyOfferInputSchema = exports.supplyGapRequestInputSchema = exports.supplyOfferStatuses = exports.supplyGapRequestStatuses = void 0;
const zod_1 = require("zod");
const auth_1 = require("../lib/auth");
const notifications_service_1 = require("./notifications.service");
// Phase 5 domain rules.
// Nursery-to-nursery supply-gap collaboration is GreenKarachi's core
// differentiator. A nursery that needs more plants than it has publishes a
// supply-gap request; other nurseries offer stock against the gap.
// Only ACCEPTED offers count as committed supply. An accepted offer is a
// supply commitment between the two nurseries, NOT proof that plants were
// delivered, and no payment is processed or recorded anywhere here.
// The requester nursery remains responsible for coordinating fulfillment
// and any payment arrangement directly with each supplier nursery; the
// supplier identity and quantity stay visible on every offer.
exports.supplyGapRequestStatuses = ['OPEN', 'FULFILLED', 'CLOSED', 'CANCELLED'];
exports.supplyOfferStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];
const positiveMoney = zod_1.z.number().finite().positive().max(9999999999.99)
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.0000001, 'Price can have at most two decimal places.');
const dateSchema = zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format.')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Date must be a valid date.');
exports.supplyGapRequestInputSchema = zod_1.z.object({
    plantName: zod_1.z.string().trim().min(1).max(120),
    species: zod_1.z.string().trim().max(120).optional().or(zod_1.z.literal('')),
    totalRequired: zod_1.z.number().int().positive().max(100000000),
    stockAvailable: zod_1.z.number().int().min(0).max(100000000),
    requirements: zod_1.z.string().trim().max(2000).optional().or(zod_1.z.literal('')),
    neededBy: dateSchema,
    area: zod_1.z.string().trim().min(1).max(160),
    notes: zod_1.z.string().trim().max(2000).optional().or(zod_1.z.literal(''))
});
exports.supplyOfferInputSchema = zod_1.z.object({
    quantity: zod_1.z.number().int().positive().max(100000000),
    unitPrice: positiveMoney,
    availabilityCondition: zod_1.z.string().trim().min(1).max(500),
    deliveryArrangement: zod_1.z.string().trim().min(1).max(500),
    notes: zod_1.z.string().trim().max(2000).optional().or(zod_1.z.literal(''))
});
exports.supplyGapRequestStatusInputSchema = zod_1.z.object({
    status: zod_1.z.enum(['CLOSED', 'CANCELLED'])
});
// ---------------------------------------------------------------------------
// Pure business rules (unit tested without a database)
// ---------------------------------------------------------------------------
// The gap is always derived on the server; client-supplied gap values are
// never trusted or accepted by the schemas above.
const computeQuantityNeeded = (totalRequired, stockAvailable) => Math.max(0, totalRequired - stockAvailable);
exports.computeQuantityNeeded = computeQuantityNeeded;
// Breakdown shown to the requester: how much was needed, how much is
// currently on the table (PENDING offers, not yet secured), how much is
// committed (ACCEPTED offers only), and how much gap remains. Rejected and
// withdrawn offers count toward nothing.
const summarizeOffers = (quantityNeeded, offers) => {
    const offered = offers
        .filter((offer) => offer.status === 'PENDING')
        .reduce((sum, offer) => sum + offer.quantity, 0);
    const committed = offers
        .filter((offer) => offer.status === 'ACCEPTED')
        .reduce((sum, offer) => sum + offer.quantity, 0);
    return {
        quantity_needed: quantityNeeded,
        offered_quantity: offered,
        committed_quantity: committed,
        remaining_gap: Math.max(0, quantityNeeded - committed)
    };
};
exports.summarizeOffers = summarizeOffers;
const remainingGap = (quantityNeeded, committedQuantity) => Math.max(0, quantityNeeded - committedQuantity);
exports.remainingGap = remainingGap;
// An offer can be submitted or accepted only against a request that is
// still OPEN. Closed, fulfilled, and cancelled requests reject new offers.
const isOpenForOffers = (status) => status === 'OPEN';
exports.isOpenForOffers = isOpenForOffers;
exports.supplyGapRequestTransitions = {
    OPEN: ['FULFILLED', 'CLOSED', 'CANCELLED'],
    FULFILLED: [],
    CLOSED: [],
    CANCELLED: []
};
exports.supplyOfferTransitions = {
    PENDING: ['ACCEPTED', 'REJECTED', 'WITHDRAWN'],
    ACCEPTED: [],
    REJECTED: [],
    WITHDRAWN: []
};
const canTransitionSupplyGapRequest = (from, to) => exports.supplyGapRequestTransitions[from]?.includes(to) ?? false;
exports.canTransitionSupplyGapRequest = canTransitionSupplyGapRequest;
const canTransitionSupplyOffer = (from, to) => exports.supplyOfferTransitions[from]?.includes(to) ?? false;
exports.canTransitionSupplyOffer = canTransitionSupplyOffer;
// Acceptance rule, applied identically by the service's atomic claim below
// and by the concurrency simulation the tests exercise: a pending offer may
// be accepted only while the request is OPEN and the offer fits inside the
// remaining gap (gap minus already-accepted commitments).
const canAcceptOffer = (request, committedQuantity, offer) => {
    if (!(0, exports.isOpenForOffers)(request.status))
        return false;
    if (offer.status !== 'PENDING')
        return false;
    return offer.quantity <= (0, exports.remainingGap)(request.quantity_needed, committedQuantity);
};
exports.canAcceptOffer = canAcceptOffer;
// Simulates simultaneous acceptances arriving together. Each claim is
// applied with the same atomic compare-and-swap semantics the service uses
// against the database: a claim succeeds only if, at the instant it is
// applied, committed + quantity still fits the gap. However the claims are
// ordered, the committed total can never exceed the gap.
const simulateConcurrentAcceptances = (quantityNeeded, initialCommitted, offerQuantities) => {
    let committed = initialCommitted;
    const results = offerQuantities.map((quantity) => {
        if (quantity > 0 && quantity <= (0, exports.remainingGap)(quantityNeeded, committed)) {
            committed += quantity;
            return true;
        }
        return false;
    });
    return { results, committed };
};
exports.simulateConcurrentAcceptances = simulateConcurrentAcceptances;
const isRequester = (request, userId) => request.requester_user_id === userId;
exports.isRequester = isRequester;
const isOfferSupplier = (offer, userId) => offer.supplier_user_id === userId;
exports.isOfferSupplier = isOfferSupplier;
// A nursery may not offer against its own supply-gap request.
const isEligibleSupplier = (request, supplierUserId) => request.requester_user_id !== supplierUserId;
exports.isEligibleSupplier = isEligibleSupplier;
const findPendingOfferFromSupplier = (offers, supplierUserId) => offers.find((offer) => offer.supplier_user_id === supplierUserId && offer.status === 'PENDING');
exports.findPendingOfferFromSupplier = findPendingOfferFromSupplier;
const todayIsoDate = () => new Date().toISOString().slice(0, 10);
// Eligibility policy (current phase): a supplier must hold the
// NURSERY_OWNER role (enforced on the routes) and have a nursery profile,
// and must not be the requester. Nursery verification review is Phase 7
// scope, so - exactly as Phases 3 and 4 handled listings and quotations -
// having a nursery profile is the eligibility bar applied here today.
const getNursery = async (supabase, userId) => {
    const { data, error } = await supabase
        .from('nurseries')
        .select('user_id, name')
        .eq('user_id', userId)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    return data;
};
const getSupplyGapRequest = async (supabase, requestId) => {
    const { data, error } = await supabase
        .from('supply_gap_requests')
        .select('*, requester_nursery:nurseries!supply_gap_requests_requester_nursery_user_id_fkey(name, city)')
        .eq('id', requestId)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (!data)
        throw new Error('Supply gap request not found.');
    return data;
};
const getOffersForRequest = async (supabase, requestId) => {
    const { data, error } = await supabase
        .from('supply_offers')
        .select('*, supplier_nursery:nurseries!supply_offers_supplier_nursery_user_id_fkey(name, city)')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });
    if (error)
        throw new Error(error.message);
    return data ?? [];
};
const recordOfferEvent = async (supabase, offer, actorUserId, fromStatus, toStatus) => {
    const { error } = await supabase
        .from('supply_offer_events')
        .insert({
        offer_id: offer.id,
        request_id: offer.request_id,
        actor_user_id: actorUserId,
        from_status: fromStatus,
        to_status: toStatus
    });
    if (error)
        throw new Error(error.message);
};
// Attaches offers and the quantity breakdown to a request. The requester
// sees every offer; a supplier browsing open requests sees only their own
// offers, while the summary (needed / committed / remaining) is computed
// from all offers because the committed totals are what they compete for.
const enrichRequest = async (supabase, request, viewerUserId) => {
    const offers = await getOffersForRequest(supabase, request.id);
    const summary = (0, exports.summarizeOffers)(request.quantity_needed, offers);
    const visibleOffers = (0, exports.isRequester)(request, viewerUserId)
        ? offers
        : offers.filter((offer) => offer.supplier_user_id === viewerUserId);
    return { ...request, offers: visibleOffers, summary };
};
const createSupplyGapRequest = async (requesterUserId, input, supabase = (0, auth_1.getSupabaseClient)()) => {
    if (input.neededBy < todayIsoDate())
        throw new Error('Needed-by date cannot be in the past.');
    const nursery = await getNursery(supabase, requesterUserId);
    if (!nursery)
        throw new Error('Create a nursery profile before publishing a supply gap request.');
    const { data, error } = await supabase
        .from('supply_gap_requests')
        .insert({
        requester_user_id: requesterUserId,
        requester_nursery_user_id: requesterUserId,
        plant_name: input.plantName,
        species: input.species || null,
        total_required: input.totalRequired,
        stock_available: input.stockAvailable,
        quantity_needed: (0, exports.computeQuantityNeeded)(input.totalRequired, input.stockAvailable),
        committed_quantity: 0,
        requirements: input.requirements || null,
        needed_by: input.neededBy,
        area: input.area,
        notes: input.notes || null,
        status: 'OPEN'
    })
        .select('*')
        .single();
    if (error)
        throw new Error(error.message);
    return enrichRequest(supabase, data, requesterUserId);
};
exports.createSupplyGapRequest = createSupplyGapRequest;
const updateSupplyGapRequest = async (requesterUserId, requestId, input, supabase = (0, auth_1.getSupabaseClient)()) => {
    if (input.neededBy < todayIsoDate())
        throw new Error('Needed-by date cannot be in the past.');
    const request = await getSupplyGapRequest(supabase, requestId);
    if (!(0, exports.isRequester)(request, requesterUserId)) {
        throw new Error('You do not have permission to edit this supply gap request.');
    }
    if (request.status !== 'OPEN') {
        throw new Error(`Invalid status transition from ${request.status} to OPEN.`);
    }
    const quantityNeeded = (0, exports.computeQuantityNeeded)(input.totalRequired, input.stockAvailable);
    // Shrinking the requirement must not strand supply that suppliers have
    // already committed: the gap can never drop below committed supply.
    if (quantityNeeded < request.committed_quantity) {
        throw new Error('Quantity needed cannot be reduced below the supply already committed by accepted offers.');
    }
    const status = quantityNeeded === request.committed_quantity && request.committed_quantity > 0
        ? 'FULFILLED'
        : 'OPEN';
    const { data, error } = await supabase
        .from('supply_gap_requests')
        .update({
        plant_name: input.plantName,
        species: input.species || null,
        total_required: input.totalRequired,
        stock_available: input.stockAvailable,
        quantity_needed: quantityNeeded,
        requirements: input.requirements || null,
        needed_by: input.neededBy,
        area: input.area,
        notes: input.notes || null,
        status,
        updated_at: new Date().toISOString()
    })
        .eq('id', requestId)
        .eq('status', 'OPEN')
        .select('*')
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (!data)
        throw new Error(`Invalid status transition from ${request.status} to ${status}.`);
    return enrichRequest(supabase, data, requesterUserId);
};
exports.updateSupplyGapRequest = updateSupplyGapRequest;
const changeSupplyGapRequestStatus = async (requesterUserId, requestId, target, supabase = (0, auth_1.getSupabaseClient)()) => {
    const request = await getSupplyGapRequest(supabase, requestId);
    if (!(0, exports.isRequester)(request, requesterUserId)) {
        throw new Error('You do not have permission to change this supply gap request.');
    }
    if (!(0, exports.canTransitionSupplyGapRequest)(request.status, target)) {
        throw new Error(`Invalid status transition from ${request.status} to ${target}.`);
    }
    const { data, error } = await supabase
        .from('supply_gap_requests')
        .update({ status: target, updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('status', request.status)
        .select('*')
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (!data)
        throw new Error(`Invalid status transition from ${request.status} to ${target}.`);
    return enrichRequest(supabase, data, requesterUserId);
};
exports.changeSupplyGapRequestStatus = changeSupplyGapRequestStatus;
const getMySupplyGapRequests = async (requesterUserId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const { data, error } = await supabase
        .from('supply_gap_requests')
        .select('*, requester_nursery:nurseries!supply_gap_requests_requester_nursery_user_id_fkey(name, city)')
        .eq('requester_user_id', requesterUserId)
        .order('created_at', { ascending: false });
    if (error)
        throw new Error(error.message);
    const requests = [];
    for (const request of data ?? [])
        requests.push(await enrichRequest(supabase, request, requesterUserId));
    return requests;
};
exports.getMySupplyGapRequests = getMySupplyGapRequests;
// Open requests from OTHER nurseries, for suppliers looking to offer stock.
const getOpenSupplyGapRequests = async (viewerUserId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const { data, error } = await supabase
        .from('supply_gap_requests')
        .select('*, requester_nursery:nurseries!supply_gap_requests_requester_nursery_user_id_fkey(name, city)')
        .eq('status', 'OPEN')
        .neq('requester_user_id', viewerUserId)
        .order('needed_by', { ascending: true });
    if (error)
        throw new Error(error.message);
    const requests = [];
    for (const request of data ?? [])
        requests.push(await enrichRequest(supabase, request, viewerUserId));
    return requests;
};
exports.getOpenSupplyGapRequests = getOpenSupplyGapRequests;
const getSupplyGapRequestForParticipant = async (requestId, userId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const request = await getSupplyGapRequest(supabase, requestId);
    if ((0, exports.isRequester)(request, userId))
        return enrichRequest(supabase, request, userId);
    if ((0, exports.isOpenForOffers)(request.status)) {
        return enrichRequest(supabase, request, userId);
    }
    const offers = await getOffersForRequest(supabase, requestId);
    if (offers.some((offer) => offer.supplier_user_id === userId)) {
        return enrichRequest(supabase, request, userId);
    }
    throw new Error('You do not have permission to access this supply gap request.');
};
exports.getSupplyGapRequestForParticipant = getSupplyGapRequestForParticipant;
const submitSupplyOffer = async (supplierUserId, requestId, input, supabase = (0, auth_1.getSupabaseClient)()) => {
    const request = await getSupplyGapRequest(supabase, requestId);
    if (!(0, exports.isEligibleSupplier)(request, supplierUserId)) {
        throw new Error('You do not have permission to offer stock on your own supply gap request.');
    }
    if (!(0, exports.isOpenForOffers)(request.status)) {
        throw new Error('This supply gap request is closed and no longer accepts offers.');
    }
    const nursery = await getNursery(supabase, supplierUserId);
    if (!nursery)
        throw new Error('Create a nursery profile before submitting a supply offer.');
    // Size the offer against the *remaining* gap, not the original gap: with
    // part of the need already committed, a full-gap offer could never be
    // accepted and would linger as a dead pending offer.
    const remainingGap = Math.max(0, request.quantity_needed - (request.committed_quantity ?? 0));
    if (input.quantity > remainingGap) {
        throw new Error('Offer quantity cannot exceed the remaining gap for this request.');
    }
    const existingOffers = await getOffersForRequest(supabase, requestId);
    if ((0, exports.findPendingOfferFromSupplier)(existingOffers, supplierUserId)) {
        throw new Error('You already have a pending offer on this request. Withdraw it before submitting another.');
    }
    const { data, error } = await supabase
        .from('supply_offers')
        .insert({
        request_id: requestId,
        supplier_user_id: supplierUserId,
        supplier_nursery_user_id: supplierUserId,
        quantity: input.quantity,
        unit_price: input.unitPrice,
        availability_condition: input.availabilityCondition,
        delivery_arrangement: input.deliveryArrangement,
        notes: input.notes || null,
        status: 'PENDING'
    })
        .select('*')
        .single();
    if (error) {
        if (error.code === '23505') {
            throw new Error('You already have a pending offer on this request. Withdraw it before submitting another.');
        }
        throw new Error(error.message);
    }
    await recordOfferEvent(supabase, data, supplierUserId, null, 'PENDING');
    // Phase 8: tell the requesting nursery an offer arrived (failure-safe).
    await (0, notifications_service_1.createNotification)(supabase, (0, notifications_service_1.supplyOfferReceivedNotification)({
        recipientUserId: request.requester_user_id,
        actorUserId: supplierUserId,
        requestId,
        plantName: request.plant_name,
        quantity: input.quantity
    }));
    return data;
};
exports.submitSupplyOffer = submitSupplyOffer;
const getMySupplyOffers = async (supplierUserId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const { data, error } = await supabase
        .from('supply_offers')
        .select('*, request:supply_gap_requests(plant_name, species, area, needed_by, status, quantity_needed, committed_quantity)')
        .eq('supplier_user_id', supplierUserId)
        .order('created_at', { ascending: false });
    if (error)
        throw new Error(error.message);
    return data ?? [];
};
exports.getMySupplyOffers = getMySupplyOffers;
const getOffer = async (supabase, offerId) => {
    const { data, error } = await supabase
        .from('supply_offers')
        .select('*')
        .eq('id', offerId)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (!data)
        throw new Error('Supply offer not found.');
    return data;
};
const setOfferStatus = async (supabase, offer, actorUserId, target) => {
    if (!(0, exports.canTransitionSupplyOffer)(offer.status, target)) {
        throw new Error(`Invalid status transition from ${offer.status} to ${target}.`);
    }
    const { data, error } = await supabase
        .from('supply_offers')
        .update({ status: target, updated_at: new Date().toISOString() })
        .eq('id', offer.id)
        .eq('status', offer.status)
        .select('*')
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (!data)
        throw new Error(`Invalid status transition from ${offer.status} to ${target}.`);
    await recordOfferEvent(supabase, data, actorUserId, offer.status, target);
    return data;
};
const rejectSupplyOffer = async (requesterUserId, offerId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const offer = await getOffer(supabase, offerId);
    const request = await getSupplyGapRequest(supabase, offer.request_id);
    if (!(0, exports.isRequester)(request, requesterUserId)) {
        throw new Error('You do not have permission to reject this offer.');
    }
    const updated = await setOfferStatus(supabase, offer, requesterUserId, 'REJECTED');
    // Phase 8: tell the supplier their offer was rejected (failure-safe).
    await (0, notifications_service_1.createNotification)(supabase, (0, notifications_service_1.supplyOfferStatusNotification)({
        recipientUserId: offer.supplier_user_id,
        actorUserId: requesterUserId,
        requestId: request.id,
        plantName: request.plant_name,
        quantity: offer.quantity,
        status: 'REJECTED'
    }));
    return { offer: updated, request: await enrichRequest(supabase, request, requesterUserId) };
};
exports.rejectSupplyOffer = rejectSupplyOffer;
const withdrawSupplyOffer = async (supplierUserId, offerId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const offer = await getOffer(supabase, offerId);
    if (!(0, exports.isOfferSupplier)(offer, supplierUserId)) {
        throw new Error('You do not have permission to withdraw this offer.');
    }
    // Only PENDING offers can be withdrawn. An ACCEPTED offer is a commitment
    // other nurseries are relying on, so it cannot be pulled back here.
    const updated = await setOfferStatus(supabase, offer, supplierUserId, 'WITHDRAWN');
    const request = await getSupplyGapRequest(supabase, offer.request_id);
    // Phase 8: tell the requesting nursery the offer was withdrawn
    // (failure-safe follow-up).
    await (0, notifications_service_1.createNotification)(supabase, (0, notifications_service_1.supplyOfferStatusNotification)({
        recipientUserId: request.requester_user_id,
        actorUserId: supplierUserId,
        requestId: request.id,
        plantName: request.plant_name,
        quantity: offer.quantity,
        status: 'WITHDRAWN'
    }));
    return { offer: updated, request: await enrichRequest(supabase, request, supplierUserId) };
};
exports.withdrawSupplyOffer = withdrawSupplyOffer;
// Concurrency strategy for acceptance (documented because the Supabase JS
// client has no multi-table transactions, the same constraint Phase 4 hit
// with stock reservation):
//
// 1. The request row carries a committed_quantity counter, guarded by a
//    database check constraint committed_quantity <= quantity_needed.
// 2. Acceptance claims capacity with a compare-and-swap conditional
//    update: SET committed_quantity = committed + quantity (and status to
//    FULFILLED when the gap is exactly covered) WHERE id = ? AND
//    committed_quantity = <value just read> AND status = 'OPEN'. If a
//    simultaneous acceptance changed the counter first, the update matches
//    no row and this attempt re-reads and re-validates against the fresh
//    remaining gap (bounded retries). Two racing acceptances can therefore
//    never both claim the same capacity: the loser either retries against
//    the smaller remaining gap or is rejected as an overcommit.
// 3. Only after the claim succeeds is the offer flipped PENDING ->
//    ACCEPTED with its own conditional update. If that flip fails (the
//    offer was withdrawn or rejected in between), the claim is released
//    with a compensating compare-and-swap decrement, mirroring Phase 4's
//    saga-style rollback for stock reservation.
const acceptSupplyOffer = async (requesterUserId, offerId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const offer = await getOffer(supabase, offerId);
        const request = await getSupplyGapRequest(supabase, offer.request_id);
        if (!(0, exports.isRequester)(request, requesterUserId)) {
            throw new Error('You do not have permission to accept this offer.');
        }
        if (!(0, exports.canAcceptOffer)({ status: request.status, quantity_needed: request.quantity_needed }, request.committed_quantity, offer)) {
            if (!(0, exports.isOpenForOffers)(request.status)) {
                throw new Error('This supply gap request is closed and no longer accepts offers.');
            }
            if (offer.status !== 'PENDING') {
                throw new Error(`Invalid status transition from ${offer.status} to ACCEPTED.`);
            }
            throw new Error('Accepting this offer would exceed the remaining supply gap. Accepted commitments cannot exceed the quantity needed.');
        }
        const committedBefore = request.committed_quantity;
        const committedAfter = committedBefore + offer.quantity;
        const nextStatus = committedAfter === request.quantity_needed ? 'FULFILLED' : 'OPEN';
        const { data: claimed, error: claimError } = await supabase
            .from('supply_gap_requests')
            .update({
            committed_quantity: committedAfter,
            status: nextStatus,
            updated_at: new Date().toISOString()
        })
            .eq('id', request.id)
            .eq('committed_quantity', committedBefore)
            .eq('status', 'OPEN')
            .select('*')
            .maybeSingle();
        if (claimError)
            throw new Error(claimError.message);
        if (!claimed)
            continue; // Lost the race: re-read and re-validate.
        try {
            const updated = await setOfferStatus(supabase, offer, requesterUserId, 'ACCEPTED');
            // Phase 8: tell the supplier their offer was accepted. Delivery is
            // failure-safe, so it cannot trigger the compensating rollback.
            await (0, notifications_service_1.createNotification)(supabase, (0, notifications_service_1.supplyOfferStatusNotification)({
                recipientUserId: offer.supplier_user_id,
                actorUserId: requesterUserId,
                requestId: request.id,
                plantName: request.plant_name,
                quantity: offer.quantity,
                status: 'ACCEPTED'
            }));
            const fresh = await getSupplyGapRequest(supabase, request.id);
            return { offer: updated, request: await enrichRequest(supabase, fresh, requesterUserId) };
        }
        catch (error) {
            // Compensating rollback: release the claimed capacity.
            await supabase
                .from('supply_gap_requests')
                .update({
                committed_quantity: committedBefore,
                status: 'OPEN',
                updated_at: new Date().toISOString()
            })
                .eq('id', request.id)
                .eq('committed_quantity', committedAfter);
            throw error;
        }
    }
    throw new Error('This offer could not be accepted because the request changed at the same time. Please review the remaining gap and try again.');
};
exports.acceptSupplyOffer = acceptSupplyOffer;
