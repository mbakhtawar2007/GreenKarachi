"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMyConversations = exports.postConversationMessage = exports.listConversationMessages = exports.getConversationForUser = exports.getOrCreateConversation = exports.sanitizeMessage = exports.sanitizeConversation = exports.conversationTitleFor = exports.canPostToConversation = exports.canAccessConversation = exports.isConversationAdmin = exports.isConversationParticipant = exports.participantsForProjectAnchor = exports.participantsForSupplyAnchor = exports.participantsForBuyerNurseryAnchor = exports.messageInputSchema = exports.createConversationSchema = exports.conversationRefTypes = void 0;
const zod_1 = require("zod");
const auth_1 = require("../lib/auth");
const notifications_service_1 = require("./notifications.service");
// Phase 8 domain rules.
// A conversation is anchored to exactly one workflow record (a quote
// request, an order, a supply-gap request, or a plantation project).
// Participation is DERIVED from that record on the server, never supplied
// by the client:
//   * quote request / order: the buyer and the nursery;
//   * supply-gap request: the requesting nursery and every nursery with
//     an offer on the request;
//   * project: the organizer and every user with a pledge on the project.
// Only participants may read or post. Users with the ADMIN role may also
// read and post in any thread (moderation/support), which mirrors the
// audit visibility admins already have. Messages stay inside the thread:
// a new-message notification names the conversation but never contains
// message text.
exports.conversationRefTypes = ['QUOTE_REQUEST', 'ORDER', 'SUPPLY_GAP_REQUEST', 'PROJECT'];
exports.createConversationSchema = zod_1.z.object({
    refType: zod_1.z.enum(exports.conversationRefTypes),
    refId: zod_1.z.string().uuid()
});
exports.messageInputSchema = zod_1.z.object({
    body: zod_1.z.string().trim().min(1, 'Message cannot be empty.').max(2000, 'Message is too long.')
});
// ---------------------------------------------------------------------------
// Pure business rules (unit tested without a database)
// ---------------------------------------------------------------------------
const uniqueIds = (ids) => [...new Set(ids.filter((id) => Boolean(id)))];
const participantsForBuyerNurseryAnchor = (anchor) => uniqueIds([anchor.buyer_user_id, anchor.nursery_user_id]);
exports.participantsForBuyerNurseryAnchor = participantsForBuyerNurseryAnchor;
const participantsForSupplyAnchor = (request, offers = []) => uniqueIds([request.requester_user_id, ...offers.map((offer) => offer.supplier_user_id)]);
exports.participantsForSupplyAnchor = participantsForSupplyAnchor;
const participantsForProjectAnchor = (project, pledges = []) => uniqueIds([project.organizer_user_id, ...pledges.map((pledge) => pledge.supporter_user_id)]);
exports.participantsForProjectAnchor = participantsForProjectAnchor;
const isConversationParticipant = (participantIds, userId) => participantIds.includes(userId);
exports.isConversationParticipant = isConversationParticipant;
const isConversationAdmin = (user) => user.roles.includes('ADMIN');
exports.isConversationAdmin = isConversationAdmin;
// Participants and admins can read a thread; everyone else is refused,
// whatever their role is.
const canAccessConversation = (participantIds, user) => (0, exports.isConversationParticipant)(participantIds, user.id) || (0, exports.isConversationAdmin)(user);
exports.canAccessConversation = canAccessConversation;
// Posting follows the same rule as reading: participants coordinate, and
// admins may join a thread to moderate or support it.
const canPostToConversation = (participantIds, user) => (0, exports.isConversationParticipant)(participantIds, user.id) || (0, exports.isConversationAdmin)(user);
exports.canPostToConversation = canPostToConversation;
const conversationTitleFor = (refType, anchor) => {
    switch (refType) {
        case 'QUOTE_REQUEST':
            return `Quote request · ${anchor.listing?.name ?? 'Plant listing'}`;
        case 'ORDER':
            return `Order · ${anchor.plant_name ?? 'Plant order'}`;
        case 'SUPPLY_GAP_REQUEST':
            return `Supply gap · ${anchor.plant_name ?? 'Plants'}`;
        case 'PROJECT':
            return `Project · ${anchor.title ?? 'Plantation project'}`;
        default:
            return 'Conversation';
    }
};
exports.conversationTitleFor = conversationTitleFor;
const sanitizeConversation = (row) => ({
    id: row.id,
    ref_type: row.ref_type,
    ref_id: row.ref_id,
    created_at: row.created_at,
    updated_at: row.updated_at
});
exports.sanitizeConversation = sanitizeConversation;
const sanitizeMessage = (row) => ({
    id: row.id,
    conversation_id: row.conversation_id,
    sender_user_id: row.sender_user_id,
    body: row.body,
    created_at: row.created_at
});
exports.sanitizeMessage = sanitizeMessage;
// Resolves who may take part in the thread for one anchored record and
// what the thread is called. Throws the domain's own "not found" message
// when the anchored record does not exist.
const resolveAnchor = async (supabase, refType, refId) => {
    if (refType === 'QUOTE_REQUEST') {
        const { data, error } = await supabase
            .from('quote_requests')
            .select('buyer_user_id, nursery_user_id, listing:plant_listings(name)')
            .eq('id', refId)
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        if (!data)
            throw new Error('Quote request not found.');
        return {
            title: (0, exports.conversationTitleFor)(refType, data),
            participantIds: (0, exports.participantsForBuyerNurseryAnchor)(data)
        };
    }
    if (refType === 'ORDER') {
        const { data, error } = await supabase
            .from('orders')
            .select('buyer_user_id, nursery_user_id, plant_name')
            .eq('id', refId)
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        if (!data)
            throw new Error('Order not found.');
        return {
            title: (0, exports.conversationTitleFor)(refType, data),
            participantIds: (0, exports.participantsForBuyerNurseryAnchor)(data)
        };
    }
    if (refType === 'SUPPLY_GAP_REQUEST') {
        const { data, error } = await supabase
            .from('supply_gap_requests')
            .select('requester_user_id, plant_name')
            .eq('id', refId)
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        if (!data)
            throw new Error('Supply gap request not found.');
        const { data: offers, error: offersError } = await supabase
            .from('supply_offers')
            .select('supplier_user_id')
            .eq('request_id', refId);
        if (offersError)
            throw new Error(offersError.message);
        return {
            title: (0, exports.conversationTitleFor)(refType, data),
            participantIds: (0, exports.participantsForSupplyAnchor)(data, (offers ?? []))
        };
    }
    const { data, error } = await supabase
        .from('plantation_projects')
        .select('organizer_user_id, title')
        .eq('id', refId)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (!data)
        throw new Error('Plantation project not found.');
    const { data: pledges, error: pledgesError } = await supabase
        .from('project_pledges')
        .select('supporter_user_id')
        .eq('project_id', refId);
    if (pledgesError)
        throw new Error(pledgesError.message);
    return {
        title: (0, exports.conversationTitleFor)(refType, data),
        participantIds: (0, exports.participantsForProjectAnchor)(data, (pledges ?? []))
    };
};
const assertCanAccess = (participantIds, user) => {
    if (!(0, exports.canAccessConversation)(participantIds, user)) {
        throw new Error('You do not have permission to access this conversation.');
    }
};
const getConversationRow = async (supabase, conversationId) => {
    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (!data)
        throw new Error('Conversation not found.');
    return data;
};
const presentConversation = (row, anchor) => ({
    ...(0, exports.sanitizeConversation)(row),
    title: anchor.title,
    participant_ids: anchor.participantIds
});
const getOrCreateConversation = async (user, input, supabase = (0, auth_1.getSupabaseClient)()) => {
    const anchor = await resolveAnchor(supabase, input.refType, input.refId);
    assertCanAccess(anchor.participantIds, user);
    const { data: existing, error: readError } = await supabase
        .from('conversations')
        .select('*')
        .eq('ref_type', input.refType)
        .eq('ref_id', input.refId)
        .maybeSingle();
    if (readError)
        throw new Error(readError.message);
    if (existing) {
        return { conversation: presentConversation(existing, anchor), created: false };
    }
    const { data, error } = await supabase
        .from('conversations')
        .insert({ ref_type: input.refType, ref_id: input.refId, created_by_user_id: user.id })
        .select('*')
        .single();
    if (error) {
        if (error.code === '23505') {
            // Another participant opened the thread at the same time.
            const { data: raced } = await supabase
                .from('conversations')
                .select('*')
                .eq('ref_type', input.refType)
                .eq('ref_id', input.refId)
                .maybeSingle();
            if (raced) {
                return { conversation: presentConversation(raced, anchor), created: false };
            }
        }
        throw new Error(error.message);
    }
    return { conversation: presentConversation(data, anchor), created: true };
};
exports.getOrCreateConversation = getOrCreateConversation;
const getConversationForUser = async (user, conversationId, supabase = (0, auth_1.getSupabaseClient)()) => {
    const row = await getConversationRow(supabase, conversationId);
    const anchor = await resolveAnchor(supabase, row.ref_type, row.ref_id);
    assertCanAccess(anchor.participantIds, user);
    return presentConversation(row, anchor);
};
exports.getConversationForUser = getConversationForUser;
const listConversationMessages = async (user, conversationId, supabase = (0, auth_1.getSupabaseClient)()) => {
    await (0, exports.getConversationForUser)(user, conversationId, supabase);
    const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
    if (error)
        throw new Error(error.message);
    return (data ?? []).map((row) => (0, exports.sanitizeMessage)(row));
};
exports.listConversationMessages = listConversationMessages;
const postConversationMessage = async (user, conversationId, input, supabase = (0, auth_1.getSupabaseClient)()) => {
    const conversation = await (0, exports.getConversationForUser)(user, conversationId, supabase);
    if (!(0, exports.canPostToConversation)(conversation.participant_ids, user)) {
        throw new Error('You do not have permission to post in this conversation.');
    }
    const { data, error } = await supabase
        .from('conversation_messages')
        .insert({ conversation_id: conversationId, sender_user_id: user.id, body: input.body })
        .select('*')
        .single();
    if (error)
        throw new Error(error.message);
    await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    // Notify the other participants (never the sender). Delivery is
    // failure-safe, and the notification names the conversation without
    // quoting the message.
    for (const recipientId of conversation.participant_ids) {
        if (recipientId === user.id)
            continue;
        await (0, notifications_service_1.createNotification)(supabase, (0, notifications_service_1.messageReceivedNotification)({
            recipientUserId: recipientId,
            actorUserId: user.id,
            conversationId,
            conversationTitle: conversation.title
        }));
    }
    return (0, exports.sanitizeMessage)(data);
};
exports.postConversationMessage = postConversationMessage;
// Conversations the user takes part in, newest activity first. Threads
// are loaded (bounded) and participation is re-derived from each thread's
// anchored record, so a user only ever sees threads they currently take
// part in (admins see all threads). Deriving per thread also keeps the
// payload's titles and participant lists accurate.
const listMyConversations = async (user, supabase = (0, auth_1.getSupabaseClient)()) => {
    const { data: threads, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(100);
    if (error)
        throw new Error(error.message);
    const presented = [];
    for (const row of threads ?? []) {
        const typedRow = row;
        let anchor;
        try {
            anchor = await resolveAnchor(supabase, typedRow.ref_type, typedRow.ref_id);
        }
        catch {
            continue; // The anchored record no longer exists; skip its thread.
        }
        if (!(0, exports.canAccessConversation)(anchor.participantIds, user))
            continue;
        presented.push(presentConversation(typedRow, anchor));
    }
    return presented;
};
exports.listMyConversations = listMyConversations;
