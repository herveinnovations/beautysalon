begin;
create table public.bloom_services (
 name text primary key,
 category text not null check(category in ('Lashes','Nails','Hair')),
 price_zmw numeric(10,2) not null check(price_zmw>0),
 duration_minutes integer not null check(duration_minutes between 15 and 480),
 description text not null,
 active boolean not null default true,
 sort_order integer not null default 0
);
alter table public.bloom_services enable row level security;
revoke all on public.bloom_services from anon,authenticated;
grant select on public.bloom_services to anon,authenticated;
grant all on public.bloom_services to service_role;
create policy "Read active beauty treatments" on public.bloom_services for select to anon,authenticated using(active);
insert into public.bloom_services(name,category,price_zmw,duration_minutes,description,sort_order) values
('The signature lash set','Lashes',550,90,'Soft, individually placed lashes. Choose a natural, wispy or fuller finish.',1),
('Gloss & gel manicure','Nails',320,60,'Thoughtful shaping, cuticle care and a glossy colour that feels like you.',2),
('The fresh-start cut','Hair',450,60,'A personal consultation, wash, precision cut and beautiful blow-dry.',3),
('Soft-glam blowout','Hair',280,45,'Bouncy volume, polished waves or a sleek finish for your next moment.',4),
('Lash refresh','Lashes',350,60,'A gentle refill to bring your existing lash set back into balance.',5),
('Nail art moment','Nails',420,75,'A gel manicure with delicate details, playful colour or a little sparkle.',6);
alter table public.bloom_appointment_requests
 add column price_zmw numeric(10,2),
 add column duration_minutes integer;
create function public.bloom_validate_request() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare treatment public.bloom_services%rowtype; closing_time time;
begin
 select * into treatment from public.bloom_services where name=new.service_name and active;
 if not found then raise exception 'Treatment unavailable'; end if;
 closing_time:=time '18:00';
 if extract(isodow from new.preferred_date)=6 then closing_time:=time '16:00'; end if;
 if new.preferred_time+make_interval(mins=>treatment.duration_minutes)>closing_time then raise exception 'Treatment ends after closing'; end if;
 if new.preferred_date=(now() at time zone 'Africa/Lusaka')::date and new.preferred_time <= (now() at time zone 'Africa/Lusaka')::time then raise exception 'Choose a future appointment'; end if;
 if new.email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Valid email required'; end if;
 if new.phone !~ '^[+0-9() .-]{7,25}$' then raise exception 'Valid phone required'; end if;
 new.price_zmw:=treatment.price_zmw;
 new.duration_minutes:=treatment.duration_minutes;
 return new;
end;
$$;
revoke execute on function public.bloom_validate_request() from public,anon,authenticated;
create trigger bloom_validate_request before insert on public.bloom_appointment_requests for each row execute function public.bloom_validate_request();
commit;
