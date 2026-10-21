import { z } from 'zod';
import { getSupabaseClient } from '../lib/auth';
import { createNotification, messageReceivedNotification } from './notifications.service';

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

export const conversationRefTypes = ['QUOTE_REQUEST', 'ORDER', 'SUPPLY_GAP_REQUEST', 'PROJECT'] as const;
export type ConversationRefType = (typeof conversationRefTypes)[number];

export const createConversationSchema = z.object({
  refType: z.enum(conversationRefTypes),
  refId: z.string().uuid()
});

export const messageInputSchema = z.object({
  body: z.string().trim().min(1, 'Message cannot be empty.').max(2000, 'Message is too long.')
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type MessageInput = z.infer<typeof messageInputSchema>;
export type ConversationUser = { id: string; roles: string[] };

// ---------------------------------------------------------------------------
// Pure business rules (unit tested without a database)
// ---------------------------------------------------------------------------

const uniqueIds = (ids: Array<string | null | undefined>): string[] =>
  [...new Set(ids.filter((id): id is string => Boolean(id)))];

export const participantsForBuyerNurseryAnchor = (
  anchor: { buyer_user_id: string; nursery_user_id: string }
): string[] => uniqueIds([anchor.buyer_user_id, anchor.nursery_user_id]);

export const participantsForSupplyAnchor = (
  request: { requester_user_id: string },
  offers: Array<{ supplier_user_id: string }> = []
): string[] => uniqueIds([request.requester_user_id, ...offers.map((offer) => offer.supplier_user_id)]);

export const participantsForProjectAnchor = (
  project: { organizer_user_id: string },
  pledges: Array<{ supporter_user_id: string }> = []
): string[] => uniqueIds([project.organizer_user_id, ...pledges.map((pledge) => pledge.supporter_user_id)]);

export const isConversationParticipant = (participantIds: string[], userId: string): boolean =>
  participantIds.includes(userId);

export const isConversationAdmin = (user: ConversationUser): boolean => user.roles.includes('ADMIN');

// Participants and admins can read a thread; everyone else is refused,
// whatever their role is.
export const canAccessConversation = (participantIds: string[], user: ConversationUser): boolean =>
  isConversationParticipant(participantIds, user.id) || isConversationAdmin(user);

// Posting follows the same rule as reading: participants coordinate, and
// admins may join a thread to moderate or support it.
export const canPostToConversation = (participantIds: string[], user: ConversationUser): boolean =>
  isConversationParticipant(participantIds, user.id) || isConversationAdmin(user);

export type ConversationAnchorSummary = {
  plant_name?: string | null;
  title?: string | null;
  listing?: { name?: string | null } | null;
};

export const conversationTitleFor = (
  refType: ConversationRefType,
  anchor: ConversationAnchorSummary
): string => {
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

export const sanitizeConversation = (row: Record<string, unknown>) => ({
  id: row.id,
  ref_type: row.ref_type,
  ref_id: row.ref_id,
  created_at: row.created_at,
  updated_at: row.updated_at
});

export const sanitizeMessage = (row: Record<string, unknown>) => ({
  id: row.id,
  conversation_id: row.conversation_id,
  sender_user_id: row.sender_user_id,
  body: row.body,
  created_at: row.created_at
});

// ---------------------------------------------------------------------------
// Database operations (Supabase, following the established service pattern)
// ---------------------------------------------------------------------------

type SupabaseClient = ReturnType<typeof getSupabaseClient>;

type AnchorContext = { title: string; participantIds: string[] };

// Resolves who may take part in the thread for one anchored record and
// what the thread is called. Throws the domain's own "not found" message
// when the anchored record does not exist.
const resolveAnchor = async (
  supabase: SupabaseClient,
  refType: ConversationRefType,
  refId: string
): Promise<AnchorContext> => {
  if (refType === 'QUOTE_REQUEST') {
    const { data, error } = await supabase
      .from('quote_requests')
      .select('buyer_user_id, nursery_user_id, listing:plant_listings(name)')
      .eq('id', refId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Quote request not found.');
    return {
      title: conversationTitleFor(refType, data as ConversationAnchorSummary),
      participantIds: participantsForBuyerNurseryAnchor(data as { buyer_user_id: string; nursery_user_id: string })
    };
  }
  if (refType === 'ORDER') {
    const { data, error } = await supabase
      .from('orders')
      .select('buyer_user_id, nursery_user_id, plant_name')
      .eq('id', refId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Order not found.');
    return {
      title: conversationTitleFor(refType, data as ConversationAnchorSummary),
      participantIds: participantsForBuyerNurseryAnchor(data as { buyer_user_id: string; nursery_user_id: string })
    };
  }
  if (refType === 'SUPPLY_GAP_REQUEST') {
    const { data, error } = await supabase
      .from('supply_gap_requests')
      .select('requester_user_id, plant_name')
      .eq('id', refId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Supply gap request not found.');
    const { data: offers, error: offersError } = await supabase
      .from('supply_offers')
      .select('supplier_user_id')
      .eq('request_id', refId);
    if (offersError) throw new Error(offersError.message);
    return {
      title: conversationTitleFor(refType, data as ConversationAnchorSummary),
      participantIds: participantsForSupplyAnchor(
        data as { requester_user_id: string },
        (offers ?? []) as Array<{ supplier_user_id: string }>
      )
    };
  }
  const { data, error } = await supabase
    .from('plantation_projects')
    .select('organizer_user_id, title')
    .eq('id', refId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Plantation project not found.');
  const { data: pledges, error: pledgesError } = await supabase
    .from('project_pledges')
    .select('supporter_user_id')
    .eq('project_id', refId);
  if (pledgesError) throw new Error(pledgesError.message);
  return {
    title: conversationTitleFor(refType, data as ConversationAnchorSummary),
    participantIds: participantsForProjectAnchor(
      data as { organizer_user_id: string },
      (pledges ?? []) as Array<{ supporter_user_id: string }>
    )
  };
};

const assertCanAccess = (participantIds: string[], user: ConversationUser) => {
  if (!canAccessConversation(participantIds, user)) {
    throw new Error('You do not have permission to access this conversation.');
  }
};

const getConversationRow = async (supabase: SupabaseClient, conversationId: string) => {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Conversation not found.');
  return data;
};

const presentConversation = (
  row: Record<string, unknown>,
  anchor: AnchorContext
) => ({
  ...sanitizeConversation(row),
  title: anchor.title,
  participant_ids: anchor.participantIds
});

export const getOrCreateConversation = async (
  user: ConversationUser,
  input: CreateConversationInput,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const anchor = await resolveAnchor(supabase, input.refType, input.refId);
  assertCanAccess(anchor.participantIds, user);

  const { data: existing, error: readError } = await supabase
    .from('conversations')
    .select('*')
    .eq('ref_type', input.refType)
    .eq('ref_id', input.refId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (existing) {
    return { conversation: presentConversation(existing as Record<string, unknown>, anchor), created: false };
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
        return { conversation: presentConversation(raced as Record<string, unknown>, anchor), created: false };
      }
    }
    throw new Error(error.message);
  }
  return { conversation: presentConversation(data as Record<string, unknown>, anchor), created: true };
};

export const getConversationForUser = async (
  user: ConversationUser,
  conversationId: string,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const row = await getConversationRow(supabase, conversationId);
  const anchor = await resolveAnchor(
    supabase,
    (row as { ref_type: ConversationRefType }).ref_type,
    (row as { ref_id: string }).ref_id
  );
  assertCanAccess(anchor.participantIds, user);
  return presentConversation(row as Record<string, unknown>, anchor);
};

export const listConversationMessages = async (
  user: ConversationUser,
  conversationId: string,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  await getConversationForUser(user, conversationId, supabase);
  const { data, error } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => sanitizeMessage(row as Record<string, unknown>));
};

export const postConversationMessage = async (
  user: ConversationUser,
  conversationId: string,
  input: MessageInput,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const conversation = await getConversationForUser(user, conversationId, supabase);
  if (!canPostToConversation(conversation.participant_ids, user)) {
    throw new Error('You do not have permission to post in this conversation.');
  }
  const { data, error } = await supabase
    .from('conversation_messages')
    .insert({ conversation_id: conversationId, sender_user_id: user.id, body: input.body })
    .select('*')
    .single();
  if (error) throw new Error(error.message);

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  // Notify the other participants (never the sender). Delivery is
  // failure-safe, and the notification names the conversation without
  // quoting the message.
  for (const recipientId of conversation.participant_ids) {
    if (recipientId === user.id) continue;
    await createNotification(supabase, messageReceivedNotification({
      recipientUserId: recipientId,
      actorUserId: user.id,
      conversationId,
      conversationTitle: conversation.title
    }));
  }
  return sanitizeMessage(data as Record<string, unknown>);
};

// Conversations the user takes part in, newest activity first. Threads
// are loaded (bounded) and participation is re-derived from each thread's
// anchored record, so a user only ever sees threads they currently take
// part in (admins see all threads). Deriving per thread also keeps the
// payload's titles and participant lists accurate.
export const listMyConversations = async (
  user: ConversationUser,
  supabase: SupabaseClient = getSupabaseClient()
) => {
  const { data: threads, error } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);

  const presented = [];
  for (const row of threads ?? []) {
    const typedRow = row as { ref_type: ConversationRefType; ref_id: string } & Record<string, unknown>;
    let anchor: AnchorContext;
    try {
      anchor = await resolveAnchor(supabase, typedRow.ref_type, typedRow.ref_id);
    } catch {
      continue; // The anchored record no longer exists; skip its thread.
    }
    if (!canAccessConversation(anchor.participantIds, user)) continue;
    presented.push(presentConversation(typedRow, anchor));
  }
  return presented;
};
