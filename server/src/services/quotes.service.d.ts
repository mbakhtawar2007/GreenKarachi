import { z } from 'zod';
import { getSupabaseClient } from '../lib/auth';
export declare const quoteRequestStatuses: readonly ["PENDING", "QUOTED", "ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED"];
export declare const quotationStatuses: readonly ["ACTIVE", "ACCEPTED", "DECLINED", "EXPIRED", "WITHDRAWN"];
export declare const orderStatuses: readonly ["CONFIRMED", "FULFILLED", "CANCELLED"];
export type QuoteRequestStatus = (typeof quoteRequestStatuses)[number];
export type QuotationStatus = (typeof quotationStatuses)[number];
export type OrderStatus = (typeof orderStatuses)[number];
export declare const quoteRequestInputSchema: z.ZodObject<{
    listingId: z.ZodString;
    quantity: z.ZodNumber;
    deliveryArea: z.ZodString;
    deliveryDate: z.ZodEffects<z.ZodString, string, string>;
    notes: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    listingId?: string;
    quantity?: number;
    deliveryArea?: string;
    deliveryDate?: string;
    notes?: string;
    idempotencyKey?: string;
}, {
    listingId?: string;
    quantity?: number;
    deliveryArea?: string;
    deliveryDate?: string;
    notes?: string;
    idempotencyKey?: string;
}>;
export declare const quotationInputSchema: z.ZodObject<{
    unitPrice: z.ZodEffects<z.ZodNumber, number, number>;
    quantity: z.ZodNumber;
    deliveryCharge: z.ZodEffects<z.ZodNumber, number, number>;
    terms: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    validUntil: z.ZodString;
}, "strip", z.ZodTypeAny, {
    unitPrice?: number;
    quantity?: number;
    deliveryCharge?: number;
    terms?: string;
    validUntil?: string;
}, {
    unitPrice?: number;
    quantity?: number;
    deliveryCharge?: number;
    terms?: string;
    validUntil?: string;
}>;
export declare const orderStatusInputSchema: z.ZodObject<{
    status: z.ZodEnum<["FULFILLED", "CANCELLED"]>;
}, "strip", z.ZodTypeAny, {
    status?: "CANCELLED" | "FULFILLED";
}, {
    status?: "CANCELLED" | "FULFILLED";
}>;
export type QuoteRequestInput = z.infer<typeof quoteRequestInputSchema>;
export type QuotationInput = z.infer<typeof quotationInputSchema>;
export declare const quoteRequestTransitions: Record<QuoteRequestStatus, QuoteRequestStatus[]>;
export declare const orderTransitions: Record<OrderStatus, OrderStatus[]>;
export declare const canTransitionQuoteRequest: (from: QuoteRequestStatus, to: QuoteRequestStatus) => boolean;
export declare const canTransitionOrder: (from: OrderStatus, to: OrderStatus) => boolean;
export declare const isQuotationExpired: (validUntil: string, now?: Date) => boolean;
export declare const roundMoney: (value: number) => number;
export declare const computeOrderTotals: (unitPrice: number, quantity: number, deliveryCharge: number) => {
    subtotal: number;
    total: number;
};
export declare const hasSufficientStock: (availableQuantity: number, requiredQuantity: number) => boolean;
export declare const openQuoteRequestStatuses: QuoteRequestStatus[];
export type QuoteRequestSummary = {
    listing_id: string;
    quantity: number;
    delivery_date: string;
    status: QuoteRequestStatus;
};
export declare const findOpenDuplicate: (existing: QuoteRequestSummary[], candidate: QuoteRequestSummary) => QuoteRequestSummary | undefined;
export declare const isQuoteParticipant: (request: {
    buyer_user_id: string;
    nursery_user_id: string;
}, userId: string) => boolean;
export declare const isOrderParticipant: (order: {
    buyer_user_id: string;
    nursery_user_id: string;
}, userId: string) => boolean;
export declare const canChangeOrderStatus: (order: {
    buyer_user_id: string;
    nursery_user_id: string;
    status: OrderStatus;
}, userId: string, target: OrderStatus) => boolean;
type SupabaseClient = ReturnType<typeof getSupabaseClient>;
export declare const createQuoteRequest: (buyerUserId: string, input: QuoteRequestInput, supabase?: SupabaseClient) => Promise<any>;
export declare const getBuyerQuoteRequests: (buyerUserId: string, supabase?: SupabaseClient) => Promise<any[]>;
export declare const getNurseryQuoteRequests: (nurseryUserId: string, supabase?: SupabaseClient) => Promise<any[]>;
export declare const getQuoteRequestForParticipant: (requestId: string, userId: string, supabase?: SupabaseClient) => Promise<any>;
export declare const respondWithQuotation: (nurseryUserId: string, requestId: string, input: QuotationInput, supabase?: SupabaseClient) => Promise<any>;
export declare const declineQuotation: (buyerUserId: string, requestId: string, supabase?: SupabaseClient) => Promise<any>;
export declare const cancelQuoteRequest: (buyerUserId: string, requestId: string, supabase?: SupabaseClient) => Promise<any>;
export declare const declineQuoteRequest: (nurseryUserId: string, requestId: string, supabase?: SupabaseClient) => Promise<any>;
export declare const acceptQuotation: (buyerUserId: string, requestId: string, supabase?: SupabaseClient) => Promise<any>;
export declare const getBuyerOrders: (buyerUserId: string, supabase?: SupabaseClient) => Promise<any[]>;
export declare const getNurseryOrders: (nurseryUserId: string, supabase?: SupabaseClient) => Promise<any[]>;
export declare const changeOrderStatus: (userId: string, orderId: string, target: OrderStatus, supabase?: SupabaseClient) => Promise<any>;
export {};
