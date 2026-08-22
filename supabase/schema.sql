-- 1. fázis – Supabase séma (fiók + felhő-szinkron)
-- Futtatás: Supabase → SQL Editor → Run.
-- Részletek: docs/felho-szinkron-terv.md

-- Profil (az auth.users mellé)
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz default now()
);

-- A teljes edzésnapló-állapot, egy sor / felhasználó.
-- A data JSON pontosan a mai gymlog_v1 tartalom (sessions, active, weights,
-- notes, photos, injury, lastBackup). Az alak NEM változik.
create table if not exists public.gym_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security: mindenki CSAK a saját sorát látja/írja.
alter table public.profiles  enable row level security;
alter table public.gym_state enable row level security;

drop policy if exists "profil: saját" on public.profiles;
create policy "profil: saját" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "állapot: saját" on public.gym_state;
create policy "állapot: saját" on public.gym_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Új regisztrációnál automatikusan jöjjön létre a profil + üres állapot.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles(id) values (new.id) on conflict do nothing;
  insert into public.gym_state(user_id, data) values (new.id, '{}'::jsonb)
    on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
