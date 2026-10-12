-- Edző AI – heti kérdéslimit.
-- Futtatás: Supabase → SQL Editor → Run. Utána a schema-delete-account.sql-t
-- is futtasd újra (a fiók-törlés ezt a táblát is takarítja).
--
-- Minden MEGVÁLASZOLT kérdés egy sor. Az Edge Function (supabase/functions/
-- coach) a felhasználó SAJÁT JWT-jével olvas és ír, így az RLS miatt csak a
-- saját sorait látja. Törlés- és módosítás-jog SZÁNDÉKOSAN nincs: különben a
-- felhasználó a böngészőből kitörölhetné a számlálóját.

create table if not exists public.coach_usage (
  id      bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  at      timestamptz not null default now()
);
create index if not exists coach_usage_user_at on public.coach_usage (user_id, at);

alter table public.coach_usage enable row level security;

drop policy if exists "coach: saját sorok olvasása" on public.coach_usage;
create policy "coach: saját sorok olvasása" on public.coach_usage for select
  using ( user_id = auth.uid() );

drop policy if exists "coach: saját sor írása" on public.coach_usage;
create policy "coach: saját sor írása" on public.coach_usage for insert
  with check ( user_id = auth.uid() );
