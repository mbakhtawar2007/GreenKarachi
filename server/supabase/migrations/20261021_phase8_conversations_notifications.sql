-- Phase 8: conversations, in-app notifications, and workflow polish.
-- Participants in a quote, order, supply-gap, or project-support workflow
-- coordinate through a conversation thread anchored to that workflow's
-- record. Platform events (Phases 4-7) also create in-app notifications
-- with read/unread state and a link back to the affected record.
--
-- Privacy rules enforced by the API service (the tables below have RLS
-- enabled and NO permissive policies, so they are reachable only through
-- the API server's service-role client after its own checks):
--   * Only a thread's participants, plus users with the ADMIN role, can
--     read or post in a conversation. Participation is derived from the
--     anchored record (buyer/nursery, requester/suppliers, organizer/
--     supporters), never from anything the client supplies.
--   * Notifications are visible only to their recipient. Notification
--     copy is built from safe display fields only: it never contains
--     pledge amounts, verification notes/reasons, suspension reasons, or
--     message bodies, so a notification can never leak data the recipient
--     is not already allowed to see.
--   * No external email/SMS/WhatsApp delivery is represented here; these
--     are in-app notifications only.

-- ---------------------------------------------------------------------------
-- Conversations: one thread per workflow record.
-- ---------------------------------------------------------------------------

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  ref_type text not null check (ref_type in ('QUOTE_REQUEST', 'ORDER', 'SUPPLY_GAP_REQUEST', 'PROJECT')),
  ref_id uuid not null,
  created_by_user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_one_thread_per_record unique (ref_type, ref_id)
);

create index if not exists conversations_ref_idx
  on public.conversations (ref_type, ref_id);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists conversation_messages_thread_idx
  on public.conversation_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Notifications: one row per recipient per event.
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null,
  actor_user_id uuid,
  type text not null check (type in (
    'QUOTE_REQUEST_RECEIVED', 'QUOTATION_RECEIVED', 'QUOTATION_DECLINED',
    'QUOTE_REQUEST_DECLINED', 'QUOTE_REQUEST_CANCELLED',
    'ORDER_CONFIRMED', 'ORDER_FULFILLED', 'ORDER_CANCELLED',
    'SUPPLY_OFFER_RECEIVED', 'SUPPLY_OFFER_ACCEPTED', 'SUPPLY_OFFER_REJECTED',
    'SUPPLY_OFFER_WITHDRAWN',
    'PLEDGE_RECEIVED', 'PLEDGE_CONFIRMED', 'PLEDGE_DECLINED', 'PLEDGE_WITHDRAWN',
    'VERIFICATION_DECIDED', 'ACCOUNT_SUSPENDED', 'ACCOUNT_REACTIVATED',
    'LISTING_HIDDEN', 'LISTING_RESTORED', 'PROJECT_HIDDEN', 'PROJECT_RESTORED',
    'REPORT_UPDATED', 'MESSAGE_RECEIVED'
  )),
  title text not null,
  body text not null,
  -- The record the notification is about; link is the client route for it.
  ref_type text check (ref_type in (
    'QUOTE_REQUEST', 'ORDER', 'SUPPLY_GAP_REQUEST', 'SUPPLY_OFFER',
    'PROJECT', 'PLEDGE', 'LISTING', 'USER', 'NURSERY', 'REPORT', 'CONVERSATION'
  )),
  ref_id uuid,
  link text,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (recipient_user_id)
  where is_read = false;

-- RLS stays enabled with no permissive policies (the Phase 7 pattern for
-- private tables): all access goes through the API server, which derives
-- participation and recipients on the server before reading or writing.
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.notifications enable row level security;
