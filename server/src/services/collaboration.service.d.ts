import { z } from 'zod';
import { getSupabaseClient } from '../lib/auth';
export declare const supplyGapRequestStatuses: readonly ["OPEN", "FULFILLED", "CLOSED", "CANCELLED"];
export declare const supplyOfferStatuses: readonly ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"];
export type SupplyGapRequestStatus = (typeof supplyGapRequestStatuses)[number];
export type SupplyOfferStatus = (typeof supplyOfferStatuses)[number];
export declare const supplyGapRequestInputSchema: z.ZodObject<{
    plantName: z.ZodString;
    species: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    totalRequired: z.ZodNumber;
    stockAvailable: z.ZodNumber;
    requirements: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    neededBy: z.ZodEffects<z.ZodString, string, string>;
    area: z.ZodString;
    notes: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    plantName: string;
    totalRequired: number;
    stockAvailable: number;
    neededBy: string;
    area: string;
    species?: string | undefined;
    notes?: string | undefined;
    requirements?: string | undefined;
}, {
    plantName: string;
    totalRequired: number;
    stockAvailable: number;
    neededBy: string;
    area: string;
    species?: string | undefined;
    notes?: string | undefined;
    requirements?: string | undefined;
}>;
export declare const supplyOfferInputSchema: z.ZodObject<{
    quantity: z.ZodNumber;
    unitPrice: z.ZodEffects<z.ZodNumber, number, number>;
    availabilityCondition: z.ZodString;
    deliveryArrangement: z.ZodString;
    notes: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    unitPrice: number;
    quantity: number;
    availabilityCondition: string;
    deliveryArrangement: string;
    notes?: string | undefined;
}, {
    unitPrice: number;
    quantity: number;
    availabilityCondition: string;
    deliveryArrangement: string;
    notes?: string | undefined;
}>;
export declare const supplyGapRequestStatusInputSchema: z.ZodObject<{
    status: z.ZodEnum<["CLOSED", "CANCELLED"]>;
}, "strip", z.ZodTypeAny, {
    status: "CANCELLED" | "CLOSED";
}, {
    status: "CANCELLED" | "CLOSED";
}>;
export type SupplyGapRequestInput = z.infer<typeof supplyGapRequestInputSchema>;
export type SupplyOfferInput = z.infer<typeof supplyOfferInputSchema>;
export declare const computeQuantityNeeded: (totalRequired: number, stockAvailable: number) => number;
export type OfferQuantitySummary = {
    quantity_needed: number;
    offered_quantity: number;
    committed_quantity: number;
    remaining_gap: number;
};
type OfferLike = {
    quantity: number;
    status: SupplyOfferStatus | string;
};
export declare const summarizeOffers: (quantityNeeded: number, offers: OfferLike[]) => OfferQuantitySummary;
export declare const remainingGap: (quantityNeeded: number, committedQuantity: number) => number;
export declare const isOpenForOffers: (status: SupplyGapRequestStatus) => boolean;
export declare const supplyGapRequestTransitions: Record<SupplyGapRequestStatus, SupplyGapRequestStatus[]>;
export declare const supplyOfferTransitions: Record<SupplyOfferStatus, SupplyOfferStatus[]>;
export declare const canTransitionSupplyGapRequest: (from: SupplyGapRequestStatus, to: SupplyGapRequestStatus) => boolean;
export declare const canTransitionSupplyOffer: (from: SupplyOfferStatus, to: SupplyOfferStatus) => boolean;
export declare const canAcceptOffer: (request: {
    status: SupplyGapRequestStatus;
    quantity_needed: number;
}, committedQuantity: number, offer: {
    status: SupplyOfferStatus | string;
    quantity: number;
}) => boolean;
export declare const simulateConcurrentAcceptances: (quantityNeeded: number, initialCommitted: number, offerQuantities: number[]) => {
    results: boolean[];
    committed: number;
};
export declare const isRequester: (request: {
    requester_user_id: string;
}, userId: string) => boolean;
export declare const isOfferSupplier: (offer: {
    supplier_user_id: string;
}, userId: string) => boolean;
export declare const isEligibleSupplier: (request: {
    requester_user_id: string;
}, supplierUserId: string) => boolean;
export declare const findPendingOfferFromSupplier: <T extends {
    supplier_user_id: string;
    status: string;
}>(offers: T[], supplierUserId: string) => T | undefined;
type SupabaseClient = ReturnType<typeof getSupabaseClient>;
export declare const createSupplyGapRequest: (requesterUserId: string, input: SupplyGapRequestInput, supabase?: SupabaseClient) => Promise<{
    offers: any[];
    summary: OfferQuantitySummary;
    id: string;
    quantity_needed: number;
    requester_user_id: string;
}>;
export declare const updateSupplyGapRequest: (requesterUserId: string, requestId: string, input: SupplyGapRequestInput, supabase?: SupabaseClient) => Promise<{
    offers: any[];
    summary: OfferQuantitySummary;
    id: string;
    quantity_needed: number;
    requester_user_id: string;
}>;
export declare const changeSupplyGapRequestStatus: (requesterUserId: string, requestId: string, target: "CLOSED" | "CANCELLED", supabase?: SupabaseClient) => Promise<{
    offers: any[];
    summary: OfferQuantitySummary;
    id: string;
    quantity_needed: number;
    requester_user_id: string;
}>;
export declare const getMySupplyGapRequests: (requesterUserId: string, supabase?: SupabaseClient) => Promise<{
    offers: any[];
    summary: OfferQuantitySummary;
    id: string;
    quantity_needed: number;
    requester_user_id: string;
}[]>;
export declare const getOpenSupplyGapRequests: (viewerUserId: string, supabase?: SupabaseClient) => Promise<{
    offers: any[];
    summary: OfferQuantitySummary;
    id: string;
    quantity_needed: number;
    requester_user_id: string;
}[]>;
export declare const getSupplyGapRequestForParticipant: (requestId: string, userId: string, supabase?: SupabaseClient) => Promise<{
    offers: any[];
    summary: OfferQuantitySummary;
    id: string;
    quantity_needed: number;
    requester_user_id: string;
}>;
export declare const submitSupplyOffer: (supplierUserId: string, requestId: string, input: SupplyOfferInput, supabase?: SupabaseClient) => Promise<any>;
export declare const getMySupplyOffers: (supplierUserId: string, supabase?: SupabaseClient) => Promise<any[]>;
export declare const rejectSupplyOffer: (requesterUserId: string, offerId: string, supabase?: SupabaseClient) => Promise<{
    offer: any;
    request: {
        offers: any[];
        summary: OfferQuantitySummary;
        id: string;
        quantity_needed: number;
        requester_user_id: string;
    };
}>;
export declare const withdrawSupplyOffer: (supplierUserId: string, offerId: string, supabase?: SupabaseClient) => Promise<{
    offer: any;
    request: {
        offers: any[];
        summary: OfferQuantitySummary;
        id: string;
        quantity_needed: number;
        requester_user_id: string;
    };
}>;
export declare const acceptSupplyOffer: (requesterUserId: string, offerId: string, supabase?: SupabaseClient) => Promise<{
    offer: any;
    request: {
        offers: any[];
        summary: OfferQuantitySummary;
        id: string;
        quantity_needed: number;
        requester_user_id: string;
    };
}>;
export {};
