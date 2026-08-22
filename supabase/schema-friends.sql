-- 2. fázis – Barátok (schema). Futtatás: Supabase → SQL Editor → Run.
-- Feltételezi az 1. fázis sémáját (profiles, gym_state) – lásd schema.sql.
-- Elv: barát KÓDDAL adható hozzá (nem e-maillel). Megosztás CSAK összefoglaló
-- (shared_stats) – a napló nyers tartalma, jegyzetek, fotók priváták maradnak.

-- Profil kiegészítése: megjelenítendő név + egyedi barát-kód.
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists friend_code text unique;

-- Barát-kapcsolatok. A nevet denormalizálva tároljuk, hogy a függőben lévő
-- kéréseknél is látszódjon, mielőtt barátok lennénk (a profiles önmagában
-- csak a sajátunkat engedi olvasni).
create table if not exists public.friendships (
  requester       uuid not null references auth.users(id) on delete cascade,
  addressee       uuid not null references auth.users(id) on delete cascade,
  requester_name  text,
  addressee_name  text,
  status          text not null default 'pending',   -- pending | accepted
  created_at      timestamptz not null default now(),
  primary key (requester, addressee)
);

-- Megosztott összefoglaló (csak nem érzékeny összegzés).
create table if not exists public.shared_stats (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  data         jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

alter table public.friendships  enable row level security;
alter table public.shared_stats enable row level security;

-- friendships: a felek látják; a címzett frissíthet (elfogad); bármelyik fél törölhet.
drop policy if exists "friendship: résztvevő olvas" on public.friendships;
create policy "friendship: résztvevő olvas" on public.friendships
  for select using (auth.uid() = requester or auth.uid() = addressee);

drop policy if exists "friendship: címzett frissít" on public.friendships;
create policy "friendship: címzett frissít" on public.friendships
  for update using (auth.uid() = addressee) with check (auth.uid() = addressee);

drop policy if exists "friendship: résztvevő töröl" on public.friendships;
create policy "friendship: résztvevő töröl" on public.friendships
  for delete using (auth.uid() = requester or auth.uid() = addressee);

-- shared_stats: a tulaj ír/olvas; elfogadott barát olvashat.
drop policy if exists "stats: saját minden" on public.shared_stats;
create policy "stats: saját minden" on public.shared_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "stats: barát olvas" on public.shared_stats;
create policy "stats: barát olvas" on public.shared_stats
  for select using (exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ( (f.requester = auth.uid() and f.addressee = shared_stats.user_id)
         or (f.addressee = auth.uid() and f.requester = shared_stats.user_id) )));

-- Barát-kérés kóddal (security definer, hogy a profiles-t ne kelljen kliensből olvasni).
create or replace function public.request_friend(code text)
returns text language plpgsql security definer set search_path = public as $$
declare t_id uuid; t_name text; my_name text;
begin
  select id, display_name into t_id, t_name from public.profiles where friend_code = upper(code);
  if t_id is null then return 'notfound'; end if;
  if t_id = auth.uid() then return 'self'; end if;
  select display_name into my_name from public.profiles where id = auth.uid();
  -- ha a másik irányban már van kérés, fogadjuk el
  update public.friendships set status='accepted'
    where requester = t_id and addressee = auth.uid() and status='pending';
  if found then return 'accepted'; end if;
  insert into public.friendships(requester, addressee, requester_name, addressee_name, status)
    values (auth.uid(), t_id, my_name, t_name, 'pending')
    on conflict (requester, addressee) do nothing;
  return 'ok';
end $$;
grant execute on function public.request_friend(text) to authenticated;
