import { z } from 'zod';
import { getSupabaseClient } from '../lib/auth';
export declare const conversationRefTypes: readonly ["QUOTE_REQUEST", "ORDER", "SUPPLY_GAP_REQUEST", "PROJECT"];
export type ConversationRefType = (typeof conversationRefTypes)[number];
export declare const createConversationSchema: z.ZodObject<{
    refType: z.ZodEnum<["QUOTE_REQUEST", "ORDER", "SUPPLY_GAP_REQUEST", "PROJECT"]>;
    refId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refType: "QUOTE_REQUEST" | "ORDER" | "SUPPLY_GAP_REQUEST" | "PROJECT";
    refId: string;
}, {
    refType: "QUOTE_REQUEST" | "ORDER" | "SUPPLY_GAP_REQUEST" | "PROJECT";
    refId: string;
}>;
export declare const messageInputSchema: z.ZodObject<{
    body: z.ZodString;
}, "strip", z.ZodTypeAny, {
    body: string;
}, {
    body: string;
}>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type MessageInput = z.infer<typeof messageInputSchema>;
export type ConversationUser = {
    id: string;
    roles: string[];
};
export declare const participantsForBuyerNurseryAnchor: (anchor: {
    buyer_user_id: string;
    nursery_user_id: string;
}) => string[];
export declare const participantsForSupplyAnchor: (request: {
    requester_user_id: string;
}, offers?: Array<{
    supplier_user_id: string;
}>) => string[];
export declare const participantsForProjectAnchor: (project: {
    organizer_user_id: string;
}, pledges?: Array<{
    supporter_user_id: string;
}>) => string[];
export declare const isConversationParticipant: (participantIds: string[], userId: string) => boolean;
export declare const isConversationAdmin: (user: ConversationUser) => boolean;
export declare const canAccessConversation: (participantIds: string[], user: ConversationUser) => boolean;
export declare const canPostToConversation: (participantIds: string[], user: ConversationUser) => boolean;
export type ConversationAnchorSummary = {
    plant_name?: string | null;
    title?: string | null;
    listing?: {
        name?: string | null;
    } | null;
};
export declare const conversationTitleFor: (refType: ConversationRefType, anchor: ConversationAnchorSummary) => string;
export declare const sanitizeConversation: (row: Record<string, unknown>) => {
    id: unknown;
    ref_type: unknown;
    ref_id: unknown;
    created_at: unknown;
    updated_at: unknown;
};
export declare const sanitizeMessage: (row: Record<string, unknown>) => {
    id: unknown;
    conversation_id: unknown;
    sender_user_id: unknown;
    body: unknown;
    created_at: unknown;
};
type SupabaseClient = ReturnType<typeof getSupabaseClient>;
export declare const getOrCreateConversation: (user: ConversationUser, input: CreateConversationInput, supabase?: SupabaseClient) => Promise<{
    conversation: {
        title: string;
        participant_ids: string[];
        id: unknown;
        ref_type: unknown;
        ref_id: unknown;
        created_at: unknown;
        updated_at: unknown;
    };
    created: boolean;
}>;
export declare const getConversationForUser: (user: ConversationUser, conversationId: string, supabase?: SupabaseClient) => Promise<{
    title: string;
    participant_ids: string[];
    id: unknown;
    ref_type: unknown;
    ref_id: unknown;
    created_at: unknown;
    updated_at: unknown;
}>;
export declare const listConversationMessages: (user: ConversationUser, conversationId: string, supabase?: SupabaseClient) => Promise<{
    id: unknown;
    conversation_id: unknown;
    sender_user_id: unknown;
    body: unknown;
    created_at: unknown;
}[]>;
export declare const postConversationMessage: (user: ConversationUser, conversationId: string, input: MessageInput, supabase?: SupabaseClient) => Promise<{
    id: unknown;
    conversation_id: unknown;
    sender_user_id: unknown;
    body: unknown;
    created_at: unknown;
}>;
export declare const listMyConversations: (user: ConversationUser, supabase?: SupabaseClient) => Promise<{
    title: string;
    participant_ids: string[];
    id: unknown;
    ref_type: unknown;
    ref_id: unknown;
    created_at: unknown;
    updated_at: unknown;
}[]>;
export {};
