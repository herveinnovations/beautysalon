-- Run in this project's Supabase SQL Editor, using an owner account.
-- This dedicated table stores appointment requests, not confirmed reservations.
begin;
create table public.bloom_appointment_requests (
  id uuid primary key,
  created_at timestamptz not null default now(),
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text not null check (char_length(phone) between 7 and 25),
  service_name text not null check (service_name in ('The signature lash set','Gloss & gel manicure','The fresh-start cut','Soft-glam blowout','Lash refresh','Nail art moment')),
  preferred_date date not null,
  preferred_time time not null,
  appointment_timezone text not null default 'Africa/Lusaka' check (appointment_timezone = 'Africa/Lusaka'),
  followup_consent boolean not null default false,
  display_currency text not null check (display_currency in ('ZMW','USD')),
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed'))
);
alter table public.bloom_appointment_requests enable row level security;
revoke all on public.bloom_appointment_requests from anon, authenticated;
grant insert (id,customer_name,email,phone,service_name,preferred_date,preferred_time,followup_consent,display_currency) on public.bloom_appointment_requests to anon, authenticated;
grant all on public.bloom_appointment_requests to service_role;
create policy "Visitors may submit pending appointment requests"
on public.bloom_appointment_requests for insert to anon, authenticated
with check (
  status = 'pending'
  and preferred_date >= (now() at time zone 'Africa/Lusaka')::date
  and extract(isodow from preferred_date) between 1 and 6
  and preferred_time >= time '09:00'
  and preferred_time + case service_name
    when 'The signature lash set' then interval '90 minutes'
    when 'Nail art moment' then interval '75 minutes'
    when 'Soft-glam blowout' then interval '45 minutes'
    else interval '60 minutes' end
    <= case when extract(isodow from preferred_date)=6 then time '16:00' else time '18:00' end
);
-- Deliberately no public SELECT, UPDATE or DELETE policy.
commit;
