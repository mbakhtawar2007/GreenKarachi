-- Audit leftovers (2026-10-24): user-id columns that had no foreign key
-- to auth.users, two missing indexes, and the supply_gap_requests SELECT
-- policy whose supplier check compared offer.request_id to offer.id
-- instead of to the request's id. Orphan checks before applying showed
-- zero orphan values in every column below, so these constraints apply
-- cleanly. conversations.participant_ids is a uuid[] and cannot carry a
-- foreign key; it is deliberately left out.

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'admin_audit_log_actor_user_id_fkey') then
    alter table public.admin_audit_log add constraint admin_audit_log_actor_user_id_fkey foreign key (actor_user_id) references auth.users (id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'admin_audit_log_target_user_id_fkey') then
    alter table public.admin_audit_log add constraint admin_audit_log_target_user_id_fkey foreign key (target_user_id) references auth.users (id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'content_reports_reporter_user_id_fkey') then
    alter table public.content_reports add constraint content_reports_reporter_user_id_fkey foreign key (reporter_user_id) references auth.users (id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'conversation_messages_sender_user_id_fkey') then
    alter table public.conversation_messages add constraint conversation_messages_sender_user_id_fkey foreign key (sender_user_id) references auth.users (id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'conversations_created_by_user_id_fkey') then
    alter table public.conversations add constraint conversations_created_by_user_id_fkey foreign key (created_by_user_id) references auth.users (id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'notifications_actor_user_id_fkey') then
    alter table public.notifications add constraint notifications_actor_user_id_fkey foreign key (actor_user_id) references auth.users (id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'notifications_recipient_user_id_fkey') then
    alter table public.notifications add constraint notifications_recipient_user_id_fkey foreign key (recipient_user_id) references auth.users (id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'orders_buyer_user_id_fkey') then
    alter table public.orders add constraint orders_buyer_user_id_fkey foreign key (buyer_user_id) references auth.users (id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'plantation_projects_organizer_user_id_fkey') then
    alter table public.plantation_projects add constraint plantation_projects_organizer_user_id_fkey foreign key (organizer_user_id) references auth.users (id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'project_pledge_events_actor_user_id_fkey') then
    alter table public.project_pledge_events add constraint project_pledge_events_actor_user_id_fkey foreign key (actor_user_id) references auth.users (id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'project_pledges_supporter_user_id_fkey') then
    alter table public.project_pledges add constraint project_pledges_supporter_user_id_fkey foreign key (supporter_user_id) references auth.users (id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'project_progress_updates_author_user_id_fkey') then
    alter table public.project_progress_updates add constraint project_progress_updates_author_user_id_fkey foreign key (author_user_id) references auth.users (id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'quote_requests_buyer_user_id_fkey') then
    alter table public.quote_requests add constraint quote_requests_buyer_user_id_fkey foreign key (buyer_user_id) references auth.users (id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'supply_gap_requests_requester_user_id_fkey') then
    alter table public.supply_gap_requests add constraint supply_gap_requests_requester_user_id_fkey foreign key (requester_user_id) references auth.users (id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'supply_offer_events_actor_user_id_fkey') then
    alter table public.supply_offer_events add constraint supply_offer_events_actor_user_id_fkey foreign key (actor_user_id) references auth.users (id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'supply_offers_supplier_user_id_fkey') then
    alter table public.supply_offers add constraint supply_offers_supplier_user_id_fkey foreign key (supplier_user_id) references auth.users (id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_account_states_user_id_fkey') then
    alter table public.user_account_states add constraint user_account_states_user_id_fkey foreign key (user_id) references auth.users (id);
  end if;
end $$;

create index if not exists conversations_updated_at_idx on public.conversations (updated_at desc);

create index if not exists plant_listings_created_at_idx on public.plant_listings (created_at desc);

drop policy if exists "Requesters and suppliers can view supply gap requests" on public.supply_gap_requests;

create policy "Requesters and suppliers can view supply gap requests" on public.supply_gap_requests for select using (
  auth.uid() = requester_user_id
  or status = 'OPEN'
  or exists (
    select 1 from public.supply_offers offer
    where offer.request_id = supply_gap_requests.id
      and offer.supplier_user_id = auth.uid()
  )
);
