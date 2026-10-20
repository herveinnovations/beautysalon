begin;
create table public.bloom_site_content (
 id text primary key check(id in ('draft','published')),
 data jsonb not null default '{}'::jsonb check(jsonb_typeof(data)='object'),
 updated_at timestamptz not null default now()
);
alter table public.bloom_site_content enable row level security;
revoke all on public.bloom_site_content from anon,authenticated;
grant select on public.bloom_site_content to anon,authenticated;
grant update(data,updated_at) on public.bloom_site_content to authenticated;
grant all on public.bloom_site_content to service_role;
create policy "Read published website content" on public.bloom_site_content for select to anon,authenticated using(id='published');
create policy "Admins read website drafts" on public.bloom_site_content for select to authenticated using(exists(select 1 from public.bloom_admins where user_id=(select auth.uid())));
create policy "Admins publish website content" on public.bloom_site_content for update to authenticated using(exists(select 1 from public.bloom_admins where user_id=(select auth.uid()))) with check(exists(select 1 from public.bloom_admins where user_id=(select auth.uid())));
insert into public.bloom_site_content(id) values('draft'),('published');
alter table public.bloom_services add column image_url text,add column image_alt text;
grant update(image_url,image_alt) on public.bloom_services to authenticated;
grant insert(name,category,price_zmw,duration_minutes,description,active,sort_order,image_url,image_alt) on public.bloom_services to authenticated;
create policy "Admins add treatments" on public.bloom_services for insert to authenticated with check(exists(select 1 from public.bloom_admins where user_id=(select auth.uid())));
alter table public.bloom_appointment_requests drop constraint bloom_appointment_requests_service_name_check;
alter table public.bloom_appointment_requests add constraint bloom_request_service_fk foreign key(service_name) references public.bloom_services(name);
drop policy "Visitors may submit pending appointment requests" on public.bloom_appointment_requests;
create policy "Visitors may submit pending appointment requests" on public.bloom_appointment_requests for insert to anon,authenticated with check(status='pending' and preferred_date >= (now() at time zone 'Africa/Lusaka')::date);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('bloom-website','bloom-website',true,5242880,array['image/jpeg','image/png','image/webp','image/avif']);
create policy "Admins upload website photos" on storage.objects for insert to authenticated with check(bucket_id='bloom-website' and exists(select 1 from public.bloom_admins where user_id=(select auth.uid())));
create policy "Admins view uploaded photo records" on storage.objects for select to authenticated using(bucket_id='bloom-website' and exists(select 1 from public.bloom_admins where user_id=(select auth.uid())));
commit;
create or replace function public.bloom_validate_request() returns trigger
language plpgsql security invoker set search_path='' as $$
declare treatment public.bloom_services%rowtype; cfg jsonb; hours jsonb; opening time; closing time; dow integer;
begin
 select * into treatment from public.bloom_services where name=new.service_name and active;
 if not found then raise exception 'Treatment unavailable'; end if;
 select data into cfg from public.bloom_site_content where id='published';
 if coalesce((cfg->>'booking_enabled')::boolean,true)=false then raise exception 'Online booking is paused'; end if;
 dow:=extract(dow from new.preferred_date);
 select value into hours from jsonb_array_elements(coalesce(cfg->'hours','[]'::jsonb)) where (value->>'day')::integer=dow;
 if hours is null then
  if dow=0 then raise exception 'Studio closed'; end if;
  opening:=time '09:00';closing:=time '18:00';
  if dow=6 then closing:=time '16:00'; end if;
 else
  if (hours->>'closed')::boolean then raise exception 'Studio closed'; end if;
  opening:=(hours->>'open')::time;closing:=(hours->>'close')::time;
 end if;
 if new.preferred_time<opening or new.preferred_time+make_interval(mins=>treatment.duration_minutes)>closing then raise exception 'Choose an appointment within studio hours'; end if;
 if new.preferred_date=(now() at time zone 'Africa/Lusaka')::date and new.preferred_time <= (now() at time zone 'Africa/Lusaka')::time then raise exception 'Choose a future appointment'; end if;
 if new.email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Valid email required'; end if;
 if new.phone !~ '^[+0-9() .-]{7,25}$' then raise exception 'Valid phone required'; end if;
 new.price_zmw:=treatment.price_zmw;new.duration_minutes:=treatment.duration_minutes;return new;
end;
$$;
