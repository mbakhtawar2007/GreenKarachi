"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllNotificationsRead = exports.markNotificationRead = exports.getUnreadNotificationCount = exports.getMyNotifications = exports.createNotification = exports.sanitizeNotification = exports.applyNotificationRead = exports.canMarkNotificationRead = exports.countUnreadNotifications = exports.isUnreadNotification = exports.messageReceivedNotification = exports.reportUpdatedNotification = exports.contentModerationNotification = exports.accountSuspensionNotification = exports.verificationDecisionNotification = exports.pledgeStatusNotification = exports.pledgeReceivedNotification = exports.supplyOfferStatusNotification = exports.supplyOfferReceivedNotification = exports.orderStatusNotification = exports.orderConfirmedNotification = exports.quoteRequestCancelledNotification = exports.quoteRequestDeclinedNotification = exports.quotationDeclinedNotification = exports.quotationReceivedNotification = exports.quoteRequestReceivedNotification = exports.buildNotification = exports.notificationLinkFor = exports.notificationListFilterSchema = exports.notificationRefTypes = exports.notificationTypes = void 0;
const zod_1 = require("zod");
const auth_1 = require("../lib/auth");
// Phase 8 domain rules.
// In-app notifications are created by the Phase 4-7 services when a
// workflow event happens, as a follow-up write in the same style as the
// audit/offer/pledge event inserts: a failed notification write must never
// fail the business action that triggered it, so delivery swallows errors
// and reports success/failure instead of throwing.
//
// Notification copy is built ONLY from safe display fields. The builders
// below deliberately accept no pledge amounts, no verification notes, no
// suspension or moderation reasons, no resolution notes, and no message
// bodies, so a notification cannot leak data its recipient is not already
// allowed to see. Notifications are visible only to their recipient.
exports.notificationTypes = [
    'QUOTE_REQUEST_RECEIVED', 'QUOTATION_RECEIVED', 'QUOTATION_DECLINED',
    'QUOTE_REQUEST_DECLINED', 'QUOTE_REQUEST_CANCELLED',
    'ORDER_CONFIRMED', 'ORDER_FULFILLED', 'ORDER_CANCELLED',
    'SUPPLY_OFFER_RECEIVED', 'SUPPLY_OFFER_ACCEPTED', 'SUPPLY_OFFER_REJECTED',
    'SUPPLY_OFFER_WITHDRAWN',
    'PLEDGE_RECEIVED', 'PLEDGE_CONFIRMED', 'PLEDGE_DECLINED', 'PLEDGE_WITHDRAWN',
    'VERIFICATION_DECIDED', 'ACCOUNT_SUSPENDED', 'ACCOUNT_REACTIVATED',
    'LISTING_HIDDEN', 'LISTING_RESTORED', 'PROJECT_HIDDEN', 'PROJECT_RESTORED',
    'REPORT_UPDATED', 'MESSAGE_RECEIVED'
];
exports.notificationRefTypes = [
    'QUOTE_REQUEST', 'ORDER', 'SUPPLY_GAP_REQUEST', 'SUPPLY_OFFER',
    'PROJECT', 'PLEDGE', 'LISTING', 'USER', 'NURSERY', 'REPORT', 'CONVERSATION'
];
exports.notificationListFilterSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(50).default(20),
    unreadOnly: zod_1.z.enum(['true', 'false']).optional()
});
// ---------------------------------------------------------------------------
// Pure business rules (unit tested without a database)
// ---------------------------------------------------------------------------
// The client route where the recipient can act on the referenced record.
// Returns null when there is no meaningful destination page (reports are
// followed up inside the admin workflow, and the notification itself
// carries the outcome).
const notificationLinkFor = (refType, refId) => {
    switch (refType) {
        case 'QUOTE_REQUEST':
        case 'ORDER':
            return '/quotes';
        case 'SUPPLY_GAP_REQUEST':
        case 'SUPPLY_OFFER':
            return '/collaboration';
        case 'PROJECT':
        case 'PLEDGE':
            return '/projects';
        case 'LISTING':
        case 'NURSERY':
            return '/inventory';
        case 'CONVERSATION':
            return refId ? `/messages/${refId}` : '/messages';
        case 'USER':
            return '/';
        case 'REPORT':
        case null:
        case undefined:
        default:
            return null;
    }
};
exports.notificationLinkFor = notificationLinkFor;
// Builds the row to store, or null when there is nobody to notify. A user
// is never notified about their own action: every workflow event notifies
// the OTHER participant(s).
const buildNotification = (draft) => {
    if (!draft.recipientUserId)
        return null;
    if (draft.actorUserId && draft.actorUserId === draft.recipientUserId)
        return null;
    return {
        recipient_user_id: draft.recipientUserId,
        actor_user_id: draft.actorUserId ?? null,
        type: draft.type,
        title: draft.title,
        body: draft.body,
        ref_type: draft.refType ?? null,
        ref_id: draft.refId ?? null,
        link: (0, exports.notificationLinkFor)(draft.refType, draft.refId)
    };
};
exports.buildNotification = buildNotification;
// --- Event builders ---------------------------------------------------------
// Each builder phrases one workflow event from safe display fields only.
const quoteRequestReceivedNotification = (input) => (0, exports.buildNotification)({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId,
    type: 'QUOTE_REQUEST_RECEIVED',
    title: 'New quote request',
    body: `A buyer requested a quote for ${input.quantity} plants (${input.plantName}) for delivery to ${input.deliveryArea}. A quote request is not an order yet.`,
    refType: 'QUOTE_REQUEST',
    refId: input.requestId
});
exports.quoteRequestReceivedNotification = quoteRequestReceivedNotification;
const quotationReceivedNotification = (input) => (0, exports.buildNotification)({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId,
    type: 'QUOTATION_RECEIVED',
    title: 'Quotation received',
    body: `A nursery sent a quotation for ${input.quantity} plants (${input.plantName}). Review the price and validity under Quotes & Orders.`,
    refType: 'QUOTE_REQUEST',
    refId: input.requestId
});
exports.quotationReceivedNotification = quotationReceivedNotification;
const quotationDeclinedNotification = (input) => (0, exports.buildNotification)({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId,
    type: 'QUOTATION_DECLINED',
    title: 'Quotation declined',
    body: 'The buyer declined your quotation for one of your quote requests.',
    refType: 'QUOTE_REQUEST',
    refId: input.requestId
});
exports.quotationDeclinedNotification = quotationDeclinedNotification;
const quoteRequestDeclinedNotification = (input) => (0, exports.buildNotification)({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId,
    type: 'QUOTE_REQUEST_DECLINED',
    title: 'Quote request declined',
    body: 'The nursery declined one of your quote requests.',
    refType: 'QUOTE_REQUEST',
    refId: input.requestId
});
exports.quoteRequestDeclinedNotification = quoteRequestDeclinedNotification;
const quoteRequestCancelledNotification = (input) => (0, exports.buildNotification)({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId,
    type: 'QUOTE_REQUEST_CANCELLED',
    title: 'Quote request cancelled',
    body: 'A buyer cancelled one of the quote requests sent to your nursery.',
    refType: 'QUOTE_REQUEST',
    refId: input.requestId
});
exports.quoteRequestCancelledNotification = quoteRequestCancelledNotification;
const orderConfirmedNotification = (input) => (0, exports.buildNotification)({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId,
    type: 'ORDER_CONFIRMED',
    title: 'Order confirmed',
    body: `A buyer confirmed an order for ${input.quantity} plants (${input.plantName}). The agreed price, quantity, and terms are recorded on the order. No payment has been processed.`,
    refType: 'ORDER',
    refId: input.orderId
});
exports.orderConfirmedNotification = orderConfirmedNotification;
const orderStatusNotification = (input) => (0, exports.buildNotification)({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId,
    type: input.status === 'FULFILLED' ? 'ORDER_FULFILLED' : 'ORDER_CANCELLED',
    title: input.status === 'FULFILLED' ? 'Order fulfilled' : 'Order cancelled',
    body: input.status === 'FULFILLED'
        ? `Your order for ${input.plantName} was marked fulfilled.`
        : `The order for ${input.plantName} was cancelled. Any reserved stock was released.`,
    refType: 'ORDER',
    refId: input.orderId
});
exports.orderStatusNotification = orderStatusNotification;
const supplyOfferReceivedNotification = (input) => (0, exports.buildNotification)({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId,
    type: 'SUPPLY_OFFER_RECEIVED',
    title: 'New supply offer',
    body: `Another nursery offered ${input.quantity} plants towards your supply gap for ${input.plantName}. The offer counts only once you accept it.`,
    refType: 'SUPPLY_GAP_REQUEST',
    refId: input.requestId
});
exports.supplyOfferReceivedNotification = supplyOfferReceivedNotification;
const supplyOfferStatusNotification = (input) => (0, exports.buildNotification)({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId,
    type: input.status === 'ACCEPTED'
        ? 'SUPPLY_OFFER_ACCEPTED'
        : input.status === 'REJECTED' ? 'SUPPLY_OFFER_REJECTED' : 'SUPPLY_OFFER_WITHDRAWN',
    title: input.status === 'ACCEPTED'
        ? 'Supply offer accepted'
        : input.status === 'REJECTED' ? 'Supply offer rejected' : 'Supply offer withdrawn',
    body: input.status === 'ACCEPTED'
        ? `Your offer of ${input.quantity} plants for ${input.plantName} was accepted. Accepted supply is a commitment, not proof of delivery.`
        : input.status === 'REJECTED'
            ? `Your offer of ${input.quantity} plants for ${input.plantName} was rejected.`
            : `A supplier withdrew their offer of ${input.quantity} plants for ${input.plantName}. Withdrawn offers do not count towards your committed supply.`,
    refType: 'SUPPLY_GAP_REQUEST',
    refId: input.requestId
});
exports.supplyOfferStatusNotification = supplyOfferStatusNotification;
// Pledge notifications never carry the pledged amount or quantity: the
// builder does not accept them, so they cannot leak into a notification.
const pledgeReceivedNotification = (input) => (0, exports.buildNotification)({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId,
    type: 'PLEDGE_RECEIVED',
    title: 'New pledge received',
    body: `A supporter registered a ${input.pledgeType.toLowerCase().replaceAll('_', ' ')} pledge for "${input.projectTitle}". A pledge is intended support, not money received.`,
    refType: 'PROJECT',
    refId: input.projectId
});
exports.pledgeReceivedNotification = pledgeReceivedNotification;
const pledgeStatusNotification = (input) => (0, exports.buildNotification)({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId,
    type: input.status === 'CONFIRMED'
        ? 'PLEDGE_CONFIRMED'
        : input.status === 'DECLINED' ? 'PLEDGE_DECLINED' : 'PLEDGE_WITHDRAWN',
    title: input.status === 'CONFIRMED'
        ? 'Pledge confirmed'
        : input.status === 'DECLINED' ? 'Pledge declined' : 'Pledge withdrawn',
    body: input.status === 'CONFIRMED'
        ? `The organizer confirmed your pledge for "${input.projectTitle}". Confirmation acknowledges intended support; it does not record any funds as received.`
        : input.status === 'DECLINED'
            ? `The organizer declined your pledge for "${input.projectTitle}".`
            : `A supporter withdrew their pledge for "${input.projectTitle}".`,
    refType: 'PROJECT',
    refId: input.projectId
});
exports.pledgeStatusNotification = pledgeStatusNotification;
// Verification decisions are reported as a status only. Admin notes are
// internal records and are never copied into a notification.
const verificationDecisionNotification = (input) => (0, exports.buildNotification)({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId,
    type: 'VERIFICATION_DECIDED',
    title: 'Verification status updated',
    body: `Your ${input.subject === 'NURSERY' ? 'nursery' : 'account'} verification status is now ${input.status}.`,
    refType: input.subject,
    refId: input.recipientUserId
});
exports.verificationDecisionNotification = verificationDecisionNotification;
// Suspension is reported without the admin's reason, which stays in the
// admin account-state record.
const accountSuspensionNotification = (input) => (0, exports.buildNotification)({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId,
    type: input.suspended ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_REACTIVATED',
    title: input.suspended ? 'Account suspended' : 'Account reactivated',
    body: input.suspended
        ? 'Your GreenKarachi account has been suspended by an administrator. You will not be able to sign in until it is reactivated.'
        : 'Your GreenKarachi account has been reactivated by an administrator. You can sign in again.',
    refType: 'USER',
    refId: input.recipientUserId
});
exports.accountSuspensionNotification = accountSuspensionNotification;
// Moderation outcomes name the owner's own content (which they can
// already see) and never include the moderator's reason.
const contentModerationNotification = (input) => (0, exports.buildNotification)({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId,
    type: input.kind === 'LISTING'
        ? (input.hidden ? 'LISTING_HIDDEN' : 'LISTING_RESTORED')
        : (input.hidden ? 'PROJECT_HIDDEN' : 'PROJECT_RESTORED'),
    title: input.kind === 'LISTING'
        ? (input.hidden ? 'Listing hidden by moderators' : 'Listing restored')
        : (input.hidden ? 'Project hidden by moderators' : 'Project restored'),
    body: input.hidden
        ? `Your ${input.kind === 'LISTING' ? 'listing' : 'project'} "${input.name}" was hidden by a moderator and is no longer publicly visible.`
        : `Your ${input.kind === 'LISTING' ? 'listing' : 'project'} "${input.name}" was restored by a moderator and is publicly visible again.`,
    refType: input.kind,
    refId: input.targetId
});
exports.contentModerationNotification = contentModerationNotification;
// Report outcomes carry the new status only, never the resolution notes.
const reportUpdatedNotification = (input) => (0, exports.buildNotification)({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId,
    type: 'REPORT_UPDATED',
    title: 'Report updated',
    body: `The content report you filed was marked ${input.status.replaceAll('_', ' ')}.`,
    refType: 'REPORT',
    refId: input.reportId
});
exports.reportUpdatedNotification = reportUpdatedNotification;
// A new-message notification names the conversation but never includes
// any part of the message text.
const messageReceivedNotification = (input) => (0, exports.buildNotification)({
    recipientUserId: input.recipientUserId,
    actorUserId: input.actorUserId,
    type: 'MESSAGE_RECEIVED',
    title: 'New message',
    body: `You have a new message in "${input.conversationTitle}".`,
    refType: 'CONVERSATION',
    refId: input.conversationId
});
exports.messageReceivedNotification = messageReceivedNotification;
// --- Read / unread rules ------------------------------------------------------
const isUnreadNotification = (notification) => !notification.is_read;
exports.isUnreadNotification = isUnreadNotification;
const countUnreadNotifications = (notifications) => notifications.filter(exports.isUnreadNotification).length;
exports.countUnreadNotifications = countUnreadNotifications;
const canMarkNotificationRead = (notification, userId) => notification.recipient_user_id === userId;
exports.canMarkNotificationRead = canMarkNotificationRead;
// Idempotent: marking an already-read notification read changes nothing.
const applyNotificationRead = (notification, now = new Date()) => (notification.is_read
    ? notification
    : { ...notification, is_read: true, read_at: now.toISOString() });
exports.applyNotificationRead = applyNotificationRead;
// Whitelist the fields a recipient may ever see. Anything else that a row
// might carry one day (internal bookkeeping) never leaves the service.
const sanitizeNotification = (row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    ref_type: row.ref_type ?? null,
    ref_id: row.ref_id ?? null,
    link: row.link ?? null,
    is_read: row.is_read === true,
    read_at: row.read_at ?? null,
    created_at: row.created_at
});
exports.sanitizeNotification = sanitizeNotification;
// Failure-safe delivery: returns true when the row was stored, false when
// there was nothing to send or the write failed. Callers ignore the result;
// a notification can never fail the business action that triggered it.
const createNotification = async (supabase, row) => {
    if (!row)
        return false;
    try {
        const { error } = await supabase.from('notifications').insert(row);
        return !error;
    }
    catch {
        return false;
    }
};
exports.createNotification = createNotification;
const getMyNotifications = async (userId, filters, supabase = (0, auth_1.getSupabaseClient)()) => {
    const from = (filters.page - 1) * filters.pageSize;
    let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('recipient_user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, from + filters.pageSize - 1);
    if (filters.unreadOnly === 'true')
        query = query.eq('is_read', false);
    const { data, count, error } = await query;
    if (error)
        throw new Error(error.message);
    const unreadCount = await (0, exports.getUnreadNotificationCount)(userId, supabase);
    return {
        notifications: (data ?? []).map((row) => (0, exports.sanitizeNotification)(row)),
        pagination: {
            page: filters.page,
            pageSize: filters.pageSize,
            total: count ?? 0,
            totalPages: Math.ceil((count ?? 0) / filters.pageSize)
        },
        unreadCount
    };
};
exports.getMyNotifications = getMyNotifications;
const getUnreadNotificationCount = async (userId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_user_id', userId)
        .eq('is_read', false);
    if (error)
        throw new Error(error.message);
    return count ?? 0;
};
exports.getUnreadNotificationCount = getUnreadNotificationCount;
const markNotificationRead = async (userId, notificationId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const { data: existing, error: readError } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', notificationId)
        .maybeSingle();
    if (readError)
        throw new Error(readError.message);
    if (!existing)
        throw new Error('Notification not found.');
    if (!(0, exports.canMarkNotificationRead)(existing, userId)) {
        throw new Error('You do not have permission to update this notification.');
    }
    const read = (0, exports.applyNotificationRead)(existing);
    if (read.is_read && existing.read_at) {
        return (0, exports.sanitizeNotification)(existing);
    }
    const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: read.read_at })
        .eq('id', notificationId)
        .eq('recipient_user_id', userId)
        .select('*')
        .single();
    if (error)
        throw new Error(error.message);
    return (0, exports.sanitizeNotification)(data);
};
exports.markNotificationRead = markNotificationRead;
const markAllNotificationsRead = async (userId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_user_id', userId)
        .eq('is_read', false)
        .select('id');
    if (error)
        throw new Error(error.message);
    return { updated: (data ?? []).length };
};
exports.markAllNotificationsRead = markAllNotificationsRead;
