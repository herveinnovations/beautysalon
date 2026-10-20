begin;
create table public.bloom_admins(user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.bloom_admins enable row level security;
revoke all on public.bloom_admins from anon,authenticated;
grant select on public.bloom_admins to authenticated;
create policy "Admins may verify own membership" on public.bloom_admins for select to authenticated using(user_id=(select auth.uid()));
insert into public.bloom_admins(user_id) select id from auth.users where lower(email)='hervecreativeagency@gmail.com' and email_confirmed_at is not null on conflict do nothing;
grant select on public.bloom_appointment_requests to authenticated;
grant update(status) on public.bloom_appointment_requests to authenticated;
create policy "Admins read appointment requests" on public.bloom_appointment_requests for select to authenticated using(exists(select 1 from public.bloom_admins where user_id=(select auth.uid())));
create policy "Admins update appointment status" on public.bloom_appointment_requests for update to authenticated using(exists(select 1 from public.bloom_admins where user_id=(select auth.uid()))) with check(exists(select 1 from public.bloom_admins where user_id=(select auth.uid())));
create policy "Admins read inactive treatments" on public.bloom_services for select to authenticated using(exists(select 1 from public.bloom_admins where user_id=(select auth.uid())));
grant update(price_zmw,duration_minutes,description,active) on public.bloom_services to authenticated;
create policy "Admins edit treatments" on public.bloom_services for update to authenticated using(exists(select 1 from public.bloom_admins where user_id=(select auth.uid()))) with check(exists(select 1 from public.bloom_admins where user_id=(select auth.uid())));
commit;
-- Approval runs only for a verified address, inside the auth lifecycle.
create schema if not exists bloom_private;
revoke all on schema bloom_private from public,anon,authenticated;
create function bloom_private.approve_owner() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if lower(new.email)='hervecreativeagency@gmail.com' and new.email_confirmed_at is not null then
  insert into public.bloom_admins(user_id) values(new.id) on conflict do nothing;
 end if;
 return new;
end;
$$;
revoke all on function bloom_private.approve_owner() from public,anon,authenticated;
create trigger bloom_approve_owner after insert or update of email_confirmed_at on auth.users
for each row execute function bloom_private.approve_owner();
