import { z } from 'zod';
import { getSupabaseClient } from '../lib/auth';
import {
  createNotification,
  orderConfirmedNotification,
  orderStatusNotification,
  quotationDeclinedNotification,
  quotationReceivedNotification,
  quoteRequestCancelledNotification,
  quoteRequestDeclinedNotification,
  quoteRequestReceivedNotification
} from './notifications.service';

// Phase 4 domain rules.
// A quote request is NOT an accepted order. An order exists only after a buyer
// accepts a nursery quotation, and it stores immutable snapshots of the agreed
// price, quantity, participants, and terms. No payment is processed or recorded.

export const quoteRequestStatuses = ['PENDING', 'QUOTED', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED'] as const;
export const quotationStatuses = ['ACTIVE', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN'] as const;
export const orderStatuses = ['CONFIRMED', 'FULFILLED', 'CANCELLED'] as const;

export type QuoteRequestStatus = (typeof quoteRequestStatuses)[number];
export type QuotationStatus = (typeof quotationStatuses)[number];
export type OrderStatus = (typeof orderStatuses)[number];

const money = (minimum: number) => z.number().finite().min(minimum).max(9999999999.99)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.0000001, 'Money values can have at most two decimal places.');
const positiveMoney = z.number().finite().positive().max(9999999999.99)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.0000001, 'Price can have at most two decimal places.');

export const quoteRequestInputSchema = z.object({
  listingId: z.string().uuid(),
  quantity: z.number().int().positive().max(100000000),
  deliveryArea: z.string().trim().min(1).max(160),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Delivery date must use YYYY-MM-DD format.')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Delivery date must be a valid date.'),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  idempotencyKey: z.string().trim().min(8).max(128).optional()
});

export const quotationInputSchema = z.object({
  unitPrice: positiveMoney,
  quantity: z.number().int().positive().max(100000000),
  deliveryCharge: money(0),
  terms: z.string().trim().max(2000).optional().or(z.literal('')),
  validUntil: z.string().datetime({ message: 'Quotation validity must be an ISO date-time.' })
});

export const orderStatusInputSchema = z.object({
  status: z.enum(['FULFILLED', 'CANCELLED'])
});

export type QuoteRequestInput = z.infer<typeof quoteRequestInputSchema>;
export type QuotationInput = z.infer<typeof quotationInputSchema>;

// ---------------------------------------------------------------------------
// Pure business rules (unit tested without a database)
// ---------------------------------------------------------------------------

export const quoteRequestTransitions: Record<QuoteRequestStatus, QuoteRequestStatus[]> = {
  PENDING: ['QUOTED', 'DECLINED', 'CANCELLED', 'EXPIRED'],
  QUOTED: ['ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED'],
  ACCEPTED: [],
  DECLINED: [],
  CANCELLED: [],
  EXPIRED: []
};

export const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  CONFIRMED: ['FULFILLED', 'CANCELLED'],
  FULFILLED: [],
  CANCELLED: []
};

export const canTransitionQuoteRequest = (from: QuoteRequestStatus, to: QuoteRequestStatus): boolean =>
  quoteRequestTransitions[from]?.includes(to) ?? false;

export const canTransitionOrder = (from: OrderStatus, to: OrderStatus): boolean =>
  orderTransitions[from]?.includes(to) ?? false;

export const isQuotationExpired = (validUntil: string, now: Date = new Date()): boolean =>
  new Date(validUntil).getTime() <= now.getTime();

export const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export const computeOrderTotals = (unitPrice: number, quantity: number, deliveryCharge: number) => {
  const subtotal = roundMoney(unitPrice * quantity);
  return { subtotal, total: roundMoney(subtotal + deliveryCharge) };
};

export const hasSufficientStock = (availableQuantity: number, requiredQuantity: number): boolean =>
  availableQuantity >= requiredQuantity;

export const openQuoteRequestStatuses: QuoteRequestStatus[] = ['PENDING', 'QUOTED'];

export type QuoteRequestSummary = {
  listing_id: string;
  quantity: number;
  delivery_date: string;
  status: QuoteRequestStatus;
};

export const findOpenDuplicate = (
  existing: QuoteRequestSummary[],
  candidate: QuoteRequestSummary
): QuoteRequestSummary | undefined => existing.find((request) =>
  openQuoteRequestStatuses.includes(request.status)
  && request.listing_id === candidate.listing_id
  && request.quantity === candidate.quantity
  && request.delivery_date === candidate.delivery_date);

export const isQuoteParticipant = (
  request: { buyer_user_id: string; nursery_user_id: string },
  userId: string
): boolean => request.buyer_user_id === userId || request.nursery_user_id === userId;

export const isOrderParticipant = (
  order: { buyer_user_id: string; nursery_user_id: string },
  userId: string
): boolean => order.buyer_user_id === userId || order.nursery_user_id === userId;

export const canChangeOrderStatus = (
  order: { buyer_user_id: string; nursery_user_id: string; status: OrderStatus },
  userId: string,
  target: OrderStatus
): boolean => {
  if (!canTransitionOrder(order.status, target)) return false;
  if (target === 'FULFILLED') return order.nursery_user_id === userId;
  if (target === 'CANCELLED') return isOrderParticipant(order, userId);
  return false;
};

// ---------------------------------------------------------------------------
// Database operations (Supabase, following the catalog service pattern)
// ---------------------------------------------------------------------------

type SupabaseClient = ReturnType<typeof getSupabaseClient>;

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const getListing = async (supabase: SupabaseClient, listingId: string) => {
  const { data, error } = await supabase
    .from('plant_listings')
    .select('id, nursery_user_id, name, species, available_quantity, minimum_order_quantity, status')
    .eq('id', listingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
};

const getQuoteRequest = async (supabase: SupabaseClient, requestId: string) => {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('*, quotation:quotations(*)')
    .eq('id', requestId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Quote request not found.');
  return data;
};

export const createQuoteRequest = async (
  buyerUserId: string,
  input: QuoteRequestInput,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  if (input.deliveryDate < todayIsoDate()) throw new Error('Delivery date cannot be in the past.');

  const listing = await getListing(supabase, input.listingId);
  if (!listing) throw new Error('Listing not found.');
  if (listing.nursery_user_id === buyerUserId) throw new Error('You do not have permission to request a quote for your own listing.');
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
    if (error) throw new Error(error.message);
    if (existing) return existing;
  }

  const { data: openRequests, error: openError } = await supabase
    .from('quote_requests')
    .select('listing_id, quantity, delivery_date, status')
    .eq('buyer_user_id', buyerUserId)
    .eq('listing_id', input.listingId)
    .in('status', openQuoteRequestStatuses);
  if (openError) throw new Error(openError.message);
  const duplicate = findOpenDuplicate((openRequests ?? []) as QuoteRequestSummary[], {
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
      if (existing) return existing;
    }
    throw new Error(error.message);
  }
  // Phase 8: tell the nursery a request arrived (failure-safe follow-up).
  await createNotification(supabase, quoteRequestReceivedNotification({
    recipientUserId: listing.nursery_user_id,
    actorUserId: buyerUserId,
    requestId: data.id as string,
    plantName: listing.name,
    quantity: input.quantity,
    deliveryArea: input.deliveryArea
  }));
  return data;
};

export const getBuyerQuoteRequests = async (buyerUserId: string, supabase: SupabaseClient = getSupabaseClient()) => {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('*, quotation:quotations(*), listing:plant_listings(name, species, category, unit_price)')
    .eq('buyer_user_id', buyerUserId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
};

export const getNurseryQuoteRequests = async (nurseryUserId: string, supabase: SupabaseClient = getSupabaseClient()) => {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('*, quotation:quotations(*), listing:plant_listings(name, species, category, unit_price)')
    .eq('nursery_user_id', nurseryUserId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
};

export const getQuoteRequestForParticipant = async (
  requestId: string,
  userId: string,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const request = await getQuoteRequest(supabase, requestId);
  if (!isQuoteParticipant(request, userId)) {
    throw new Error('You do not have permission to access this quote request.');
  }
  return request;
};

export const respondWithQuotation = async (
  nurseryUserId: string,
  requestId: string,
  input: QuotationInput,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const request = await getQuoteRequest(supabase, requestId);
  if (request.nursery_user_id !== nurseryUserId) {
    throw new Error('You do not have permission to respond to this quote request.');
  }
  if (!canTransitionQuoteRequest(request.status as QuoteRequestStatus, 'QUOTED')) {
    throw new Error(`Invalid status transition from ${request.status} to QUOTED.`);
  }
  if (isQuotationExpired(input.validUntil)) {
    throw new Error('Quotation validity must be in the future: this quotation has already expired.');
  }
  if (input.quantity > request.quantity) {
    throw new Error('Quoted quantity cannot exceed the requested quantity.');
  }

  const listing = await getListing(supabase, request.listing_id);
  if (!listing) throw new Error('Listing not found.');
  if (!hasSufficientStock(listing.available_quantity, input.quantity)) {
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
    if (error.code === '23505') throw new Error('Invalid status transition: this request already has a quotation.');
    throw new Error(error.message);
  }

  const { error: updateError } = await supabase
    .from('quote_requests')
    .update({ status: 'QUOTED', updated_at: new Date().toISOString() })
    .eq('id', requestId);
  if (updateError) throw new Error(updateError.message);
  // Phase 8: tell the buyer their quotation arrived (failure-safe).
  await createNotification(supabase, quotationReceivedNotification({
    recipientUserId: request.buyer_user_id,
    actorUserId: nurseryUserId,
    requestId,
    plantName: listing.name,
    quantity: input.quantity
  }));
  return data;
};

const setQuoteRequestStatus = async (
  supabase: SupabaseClient,
  requestId: string,
  from: QuoteRequestStatus,
  to: QuoteRequestStatus
) => {
  if (!canTransitionQuoteRequest(from, to)) {
    throw new Error(`Invalid status transition from ${from} to ${to}.`);
  }
  const { error } = await supabase
    .from('quote_requests')
    .update({ status: to, updated_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) throw new Error(error.message);
};

export const declineQuotation = async (buyerUserId: string, requestId: string, supabase: SupabaseClient = getSupabaseClient()) => {
  const request = await getQuoteRequest(supabase, requestId);
  if (request.buyer_user_id !== buyerUserId) throw new Error('You do not have permission to decline this quotation.');
  await setQuoteRequestStatus(supabase, requestId, request.status as QuoteRequestStatus, 'DECLINED');
  await supabase.from('quotations').update({ status: 'DECLINED', updated_at: new Date().toISOString() }).eq('quote_request_id', requestId);
  // Phase 8: tell the nursery the buyer declined (failure-safe).
  await createNotification(supabase, quotationDeclinedNotification({
    recipientUserId: request.nursery_user_id,
    actorUserId: buyerUserId,
    requestId
  }));
  return getQuoteRequest(supabase, requestId);
};

export const cancelQuoteRequest = async (buyerUserId: string, requestId: string, supabase: SupabaseClient = getSupabaseClient()) => {
  const request = await getQuoteRequest(supabase, requestId);
  if (request.buyer_user_id !== buyerUserId) throw new Error('You do not have permission to cancel this quote request.');
  await setQuoteRequestStatus(supabase, requestId, request.status as QuoteRequestStatus, 'CANCELLED');
  // Phase 8: tell the nursery the request was cancelled (failure-safe).
  await createNotification(supabase, quoteRequestCancelledNotification({
    recipientUserId: request.nursery_user_id,
    actorUserId: buyerUserId,
    requestId
  }));
  return getQuoteRequest(supabase, requestId);
};

export const declineQuoteRequest = async (nurseryUserId: string, requestId: string, supabase: SupabaseClient = getSupabaseClient()) => {
  const request = await getQuoteRequest(supabase, requestId);
  if (request.nursery_user_id !== nurseryUserId) throw new Error('You do not have permission to decline this quote request.');
  await setQuoteRequestStatus(supabase, requestId, request.status as QuoteRequestStatus, 'DECLINED');
  await supabase.from('quotations').update({ status: 'WITHDRAWN', updated_at: new Date().toISOString() }).eq('quote_request_id', requestId);
  // Phase 8: tell the buyer the nursery declined (failure-safe).
  await createNotification(supabase, quoteRequestDeclinedNotification({
    recipientUserId: request.buyer_user_id,
    actorUserId: nurseryUserId,
    requestId
  }));
  return getQuoteRequest(supabase, requestId);
};

export const acceptQuotation = async (buyerUserId: string, requestId: string, supabase: SupabaseClient = getSupabaseClient()) => {
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
    if (error) throw new Error(error.message);
    if (existingOrder) return existingOrder;
    throw new Error('Invalid status transition from ACCEPTED to ACCEPTED.');
  }
  if (!canTransitionQuoteRequest(request.status as QuoteRequestStatus, 'ACCEPTED')) {
    throw new Error(`Invalid status transition from ${request.status} to ACCEPTED.`);
  }

  const quotation = Array.isArray(request.quotation) ? request.quotation[0] : request.quotation;
  if (!quotation || quotation.status !== 'ACTIVE') {
    throw new Error('There is no active quotation to accept for this request.');
  }
  if (isQuotationExpired(quotation.valid_until)) {
    await supabase.from('quotations').update({ status: 'EXPIRED', updated_at: new Date().toISOString() }).eq('id', quotation.id);
    await supabase.from('quote_requests').update({ status: 'EXPIRED', updated_at: new Date().toISOString() }).eq('id', requestId);
    throw new Error('This quotation has expired and can no longer be accepted.');
  }

  const listing = await getListing(supabase, request.listing_id);
  if (!listing) throw new Error('Listing not found.');
  if (!hasSufficientStock(listing.available_quantity, quotation.quantity)) {
    throw new Error('The nursery is out of stock for the quoted quantity, so this quotation cannot be accepted.');
  }

  const totals = computeOrderTotals(Number(quotation.unit_price), quotation.quantity, Number(quotation.delivery_charge));

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
  if (reservationError) throw new Error(reservationError.message);
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
      if (existingOrder) return existingOrder;
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

  // Phase 8: tell the nursery the order was confirmed (failure-safe).
  await createNotification(supabase, orderConfirmedNotification({
    recipientUserId: request.nursery_user_id,
    actorUserId: buyerUserId,
    orderId: order.id as string,
    plantName: listing.name,
    quantity: quotation.quantity
  }));

  return { ...order, items: [{ listing_id: listing.id, plant_name: listing.name, unit_price: quotation.unit_price, quantity: quotation.quantity, line_total: totals.subtotal }] };
};

export const getBuyerOrders = async (buyerUserId: string, supabase: SupabaseClient = getSupabaseClient()) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('buyer_user_id', buyerUserId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
};

export const getNurseryOrders = async (nurseryUserId: string, supabase: SupabaseClient = getSupabaseClient()) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('nursery_user_id', nurseryUserId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
};

export const changeOrderStatus = async (
  userId: string,
  orderId: string,
  target: OrderStatus,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) throw new Error('Order not found.');
  if (!isOrderParticipant(order, userId)) {
    throw new Error('You do not have permission to change this order.');
  }
  if (!canChangeOrderStatus(order, userId, target)) {
    if (!canTransitionOrder(order.status as OrderStatus, target)) {
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
  if (updateError) throw new Error(updateError.message);
  if (!data) throw new Error(`Invalid status transition from ${order.status} to ${target}.`);

  // Cancelling a confirmed order releases its reserved stock.
  if (target === 'CANCELLED') {
    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items) {
      if (!item.listing_id) continue;
      const listing = await getListing(supabase, item.listing_id);
      if (!listing) continue;
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

  // Phase 8: tell the other participant about the new order status
  // (failure-safe follow-up).
  if (target === 'FULFILLED' || target === 'CANCELLED') {
    const otherParticipant = order.buyer_user_id === userId ? order.nursery_user_id : order.buyer_user_id;
    await createNotification(supabase, orderStatusNotification({
      recipientUserId: otherParticipant,
      actorUserId: userId,
      orderId,
      plantName: order.plant_name,
      status: target
    }));
  }
  return data;
};
