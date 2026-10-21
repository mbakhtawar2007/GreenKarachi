import { z } from 'zod';
import { getSupabaseClient } from '../lib/auth';
export declare const notificationTypes: readonly ["QUOTE_REQUEST_RECEIVED", "QUOTATION_RECEIVED", "QUOTATION_DECLINED", "QUOTE_REQUEST_DECLINED", "QUOTE_REQUEST_CANCELLED", "ORDER_CONFIRMED", "ORDER_FULFILLED", "ORDER_CANCELLED", "SUPPLY_OFFER_RECEIVED", "SUPPLY_OFFER_ACCEPTED", "SUPPLY_OFFER_REJECTED", "SUPPLY_OFFER_WITHDRAWN", "PLEDGE_RECEIVED", "PLEDGE_CONFIRMED", "PLEDGE_DECLINED", "PLEDGE_WITHDRAWN", "VERIFICATION_DECIDED", "ACCOUNT_SUSPENDED", "ACCOUNT_REACTIVATED", "LISTING_HIDDEN", "LISTING_RESTORED", "PROJECT_HIDDEN", "PROJECT_RESTORED", "REPORT_UPDATED", "MESSAGE_RECEIVED"];
export type NotificationType = (typeof notificationTypes)[number];
export declare const notificationRefTypes: readonly ["QUOTE_REQUEST", "ORDER", "SUPPLY_GAP_REQUEST", "SUPPLY_OFFER", "PROJECT", "PLEDGE", "LISTING", "USER", "NURSERY", "REPORT", "CONVERSATION"];
export type NotificationRefType = (typeof notificationRefTypes)[number];
export declare const notificationListFilterSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    unreadOnly: z.ZodOptional<z.ZodEnum<["true", "false"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    unreadOnly?: "true" | "false" | undefined;
}, {
    page?: number | undefined;
    pageSize?: number | undefined;
    unreadOnly?: "true" | "false" | undefined;
}>;
export type NotificationListFilters = z.infer<typeof notificationListFilterSchema>;
export declare const notificationLinkFor: (refType: NotificationRefType | null | undefined, refId?: string | null) => string | null;
export type NotificationDraft = {
    recipientUserId: string;
    actorUserId?: string | null;
    type: NotificationType;
    title: string;
    body: string;
    refType?: NotificationRefType | null;
    refId?: string | null;
};
export type NotificationRow = {
    recipient_user_id: string;
    actor_user_id: string | null;
    type: NotificationType;
    title: string;
    body: string;
    ref_type: NotificationRefType | null;
    ref_id: string | null;
    link: string | null;
};
export declare const buildNotification: (draft: NotificationDraft) => NotificationRow | null;
export declare const quoteRequestReceivedNotification: (input: {
    recipientUserId: string;
    actorUserId: string;
    requestId: string;
    plantName: string;
    quantity: number;
    deliveryArea: string;
}) => NotificationRow | null;
export declare const quotationReceivedNotification: (input: {
    recipientUserId: string;
    actorUserId: string;
    requestId: string;
    plantName: string;
    quantity: number;
}) => NotificationRow | null;
export declare const quotationDeclinedNotification: (input: {
    recipientUserId: string;
    actorUserId: string;
    requestId: string;
}) => NotificationRow | null;
export declare const quoteRequestDeclinedNotification: (input: {
    recipientUserId: string;
    actorUserId: string;
    requestId: string;
}) => NotificationRow | null;
export declare const quoteRequestCancelledNotification: (input: {
    recipientUserId: string;
    actorUserId: string;
    requestId: string;
}) => NotificationRow | null;
export declare const orderConfirmedNotification: (input: {
    recipientUserId: string;
    actorUserId: string;
    orderId: string;
    plantName: string;
    quantity: number;
}) => NotificationRow | null;
export declare const orderStatusNotification: (input: {
    recipientUserId: string;
    actorUserId: string;
    orderId: string;
    plantName: string;
    status: "FULFILLED" | "CANCELLED";
}) => NotificationRow | null;
export declare const supplyOfferReceivedNotification: (input: {
    recipientUserId: string;
    actorUserId: string;
    requestId: string;
    plantName: string;
    quantity: number;
}) => NotificationRow | null;
export declare const supplyOfferStatusNotification: (input: {
    recipientUserId: string;
    actorUserId: string;
    requestId: string;
    plantName: string;
    quantity: number;
    status: "ACCEPTED" | "REJECTED" | "WITHDRAWN";
}) => NotificationRow | null;
export declare const pledgeReceivedNotification: (input: {
    recipientUserId: string;
    actorUserId: string;
    projectId: string;
    projectTitle: string;
    pledgeType: string;
}) => NotificationRow | null;
export declare const pledgeStatusNotification: (input: {
    recipientUserId: string;
    actorUserId: string;
    projectId: string;
    projectTitle: string;
    status: "CONFIRMED" | "DECLINED" | "WITHDRAWN";
}) => NotificationRow | null;
export declare const verificationDecisionNotification: (input: {
    recipientUserId: string;
    actorUserId: string;
    subject: "USER" | "NURSERY";
    status: string;
}) => NotificationRow | null;
export declare const accountSuspensionNotification: (input: {
    recipientUserId: string;
    actorUserId: string;
    suspended: boolean;
}) => NotificationRow | null;
export declare const contentModerationNotification: (input: {
    recipientUserId: string;
    actorUserId: string;
    kind: "LISTING" | "PROJECT";
    targetId: string;
    name: string;
    hidden: boolean;
}) => NotificationRow | null;
export declare const reportUpdatedNotification: (input: {
    recipientUserId: string;
    actorUserId: string;
    reportId: string;
    status: string;
}) => NotificationRow | null;
export declare const messageReceivedNotification: (input: {
    recipientUserId: string;
    actorUserId: string;
    conversationId: string;
    conversationTitle: string;
}) => NotificationRow | null;
export declare const isUnreadNotification: (notification: {
    is_read: boolean;
}) => boolean;
export declare const countUnreadNotifications: (notifications: Array<{
    is_read: boolean;
}>) => number;
export declare const canMarkNotificationRead: (notification: {
    recipient_user_id: string;
}, userId: string) => boolean;
export declare const applyNotificationRead: <T extends {
    is_read: boolean;
    read_at: string | null;
}>(notification: T, now?: Date) => T;
export declare const sanitizeNotification: (row: Record<string, unknown>) => {
    id: unknown;
    type: unknown;
    title: unknown;
    body: unknown;
    ref_type: {} | null;
    ref_id: {} | null;
    link: {} | null;
    is_read: boolean;
    read_at: string | null;
    created_at: unknown;
};
type SupabaseClient = ReturnType<typeof getSupabaseClient>;
export declare const createNotification: (supabase: SupabaseClient, row: NotificationRow | null) => Promise<boolean>;
export declare const notifyFromDraft: (supabase: SupabaseClient, draft: NotificationDraft) => Promise<boolean>;
export declare const getMyNotifications: (userId: string, filters: NotificationListFilters, supabase?: SupabaseClient) => Promise<{
    notifications: {
        id: unknown;
        type: unknown;
        title: unknown;
        body: unknown;
        ref_type: {} | null;
        ref_id: {} | null;
        link: {} | null;
        is_read: boolean;
        read_at: string | null;
        created_at: unknown;
    }[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
    unreadCount: number;
}>;
export declare const getUnreadNotificationCount: (userId: string, supabase?: SupabaseClient) => Promise<number>;
export declare const markNotificationRead: (userId: string, notificationId: string, supabase?: SupabaseClient) => Promise<{
    id: unknown;
    type: unknown;
    title: unknown;
    body: unknown;
    ref_type: {} | null;
    ref_id: {} | null;
    link: {} | null;
    is_read: boolean;
    read_at: string | null;
    created_at: unknown;
}>;
export declare const markAllNotificationsRead: (userId: string, supabase?: SupabaseClient) => Promise<{
    updated: number;
}>;
export {};
