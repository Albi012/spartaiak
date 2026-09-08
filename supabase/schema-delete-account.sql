-- Fiók végleges törlése (App Store 5.1.1(v) és Google Play követelmény).
-- Futtatás: Supabase → SQL Editor → Run. Feltételezi az 1. és 2. fázis
-- sémáját (schema.sql, schema-friends.sql, schema-plan-shares.sql).
--
-- Elv: a kliens NEM tud auth.users sort törölni (ahhoz service_role kellene,
-- ami sosem kerülhet a böngészőbe). Ezért egy SECURITY DEFINER függvény
-- végzi, ami KIZÁRÓLAG a HÍVÓ SAJÁT sorát törli (auth.uid()), így nem lehet
-- vele más fiókjához nyúlni.
--
-- Az összes tábla `references auth.users(id) on delete cascade`, tehát az
-- auth.users sor törlése magával viszi a profilt, a gym_state naplót, a
-- barát-kapcsolatokat (mindkét irányban), a megosztott összefoglalót és a
-- megosztott terveket is. Ha ÚJ táblát veszel fel, azon is legyen
-- `on delete cascade` – különben árva sor marad a törölt fiók után.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Nincs bejelentkezett felhasználó.';
  end if;

  -- A cascade elvileg mindent visz; a barát-kapcsolatokat és a nekünk
  -- küldött terveket azért töröljük explicit is, hogy a másik félnél se
  -- maradjon függőben lévő kérés egy már nem létező fiókra.
  delete from public.plan_shares  where from_user = uid or to_user = uid;
  delete from public.friendships  where requester = uid or addressee = uid;
  delete from public.shared_stats where user_id = uid;
  delete from public.gym_state    where user_id = uid;
  delete from public.profiles     where id = uid;

  -- Végül maga a fiók. Innentől a kiadott JWT is érvénytelen.
  delete from auth.users where id = uid;
end $$;

-- Csak bejelentkezett felhasználó hívhatja (és az is csak a sajátját).
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
