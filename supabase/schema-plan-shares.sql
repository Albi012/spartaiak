-- 2. fázis kiegészítés – Edzésterv-megosztás barátok közt.
-- Futtatás: Supabase → SQL Editor → Run. Feltételezi a friendships táblát
-- (schema-friends.sql). A megosztott terv önálló csomag (payload): a program,
-- a benne lévő SAJÁT edzések és a hivatkozott SAJÁT gyakorlatok. A beépített
-- napok/gyakorlatok a fogadó oldalán oldódnak fel.

create table if not exists public.plan_shares (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references auth.users(id) on delete cascade,
  from_name  text,
  to_user    uuid not null references auth.users(id) on delete cascade,
  name       text,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.plan_shares enable row level security;

-- Küldés csak elfogadott barátnak, saját nevében.
drop policy if exists "plan: küldés barátnak" on public.plan_shares;
create policy "plan: küldés barátnak" on public.plan_shares for insert
  with check ( from_user = auth.uid() and exists (
    select 1 from public.friendships f
    where f.status='accepted'
      and ( (f.requester=auth.uid() and f.addressee=to_user)
         or (f.addressee=auth.uid() and f.requester=to_user) )));

-- A felek olvashatják és törölhetik (fogadó importálás/elvetés, küldő visszavonás).
drop policy if exists "plan: felek olvasnak" on public.plan_shares;
create policy "plan: felek olvasnak" on public.plan_shares for select
  using ( to_user = auth.uid() or from_user = auth.uid() );

drop policy if exists "plan: felek törölnek" on public.plan_shares;
create policy "plan: felek törölnek" on public.plan_shares for delete
  using ( to_user = auth.uid() or from_user = auth.uid() );
