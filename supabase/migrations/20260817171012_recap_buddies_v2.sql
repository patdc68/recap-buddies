-- Recap Buddies V2: public renter intake, booking classification, lifecycle,
-- private verification documents, and safer reminder scheduling.

alter table public."RB_RENTAL_FORM"
  add column if not exists renter_type text,
  add column if not exists returnee_matched_existing boolean,
  add column if not exists legacy_returnee boolean;

alter table public."RB_RENTAL_FORM"
  drop constraint if exists rb_rental_form_renter_type_check,
  add constraint rb_rental_form_renter_type_check
    check (renter_type is null or renter_type in ('new', 'returnee')),
  drop constraint if exists rb_rental_form_status_check,
  add constraint rb_rental_form_status_check
    check (
      status is null or status in (
        'submitted', 'in-review', 'confirmed', 'renting', 'completed', 'declined',
        -- Historical V1 compatibility. These values remain readable but are not
        -- offered by the V2 workflow.
        'available', 'for-delivery', 'delivered', 'for-return', 'for-refund',
        'for-penalty', 'canceled', 'extended', 'approved'
      )
    );

comment on column public."RB_RENTAL_FORM".renter_type is
  'Booking-specific V2 classification: new or returnee. Null means historical/unclassified.';
comment on column public."RB_RENTAL_FORM".returnee_matched_existing is
  'For V2 returnee bookings, whether the submitted identity matched an existing RB_RENTER.';
comment on column public."RB_RENTAL_FORM".legacy_returnee is
  'For V2 returnee bookings, whether the renter reported pre-system rental history and no existing record matched.';

create table if not exists public."RB_PUBLIC_BOOKING_FLOW" (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  renter_id uuid not null references public."RB_RENTER"(id) on delete restrict,
  renter_type text not null check (renter_type in ('new', 'returnee')),
  returnee_matched_existing boolean not null default false,
  legacy_returnee boolean not null default false,
  ip_hash text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  consumed_at timestamptz
);

alter table public."RB_PUBLIC_BOOKING_FLOW" enable row level security;
revoke all on table public."RB_PUBLIC_BOOKING_FLOW" from anon, authenticated;
grant all on table public."RB_PUBLIC_BOOKING_FLOW" to service_role;

create index if not exists rb_public_booking_flow_token_hash_idx
  on public."RB_PUBLIC_BOOKING_FLOW" (token_hash);
create index if not exists rb_public_booking_flow_rate_limit_idx
  on public."RB_PUBLIC_BOOKING_FLOW" (ip_hash, created_at desc)
  where ip_hash is not null;
create index if not exists rb_rental_form_renter_type_idx
  on public."RB_RENTAL_FORM" (renter_type);

create or replace function public.rb_normalize_phone(p_value text)
returns text
language plpgsql
immutable
strict
set search_path = public, pg_temp
as $$
declare
  v_digits text := regexp_replace(p_value, '[^0-9]', '', 'g');
begin
  if length(v_digits) = 12 and left(v_digits, 2) = '63' then
    v_digits := substring(v_digits from 3);
  elsif length(v_digits) = 11 and left(v_digits, 1) = '0' then
    v_digits := substring(v_digits from 2);
  end if;

  if length(v_digits) <> 10 or left(v_digits, 1) <> '9' then
    return null;
  end if;
  return v_digits;
end;
$$;

create or replace function public.rb_normalize_name(p_value text)
returns text
language sql
immutable
strict
set search_path = public, pg_temp
as $$
  select lower(regexp_replace(trim(p_value), '\s+', ' ', 'g'));
$$;

create or replace function public.rb_create_returnee_flow(
  p_full_name text,
  p_phone text,
  p_token_hash text,
  p_ip_hash text
)
returns table(returnee_matched_existing boolean, legacy_returnee boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_phone text;
  v_name text;
  v_renter_id uuid;
  v_first_name text;
  v_last_name text;
  v_rate_count integer;
begin
  v_phone := public.rb_normalize_phone(p_phone);
  v_name := public.rb_normalize_name(p_full_name);
  if v_phone is null or length(v_name) < 3 or length(v_name) > 160 then
    raise exception using errcode = '22023', message = 'Invalid returnee details.';
  end if;

  select count(*) into v_rate_count
  from public."RB_PUBLIC_BOOKING_FLOW"
  where ip_hash = p_ip_hash
    and created_at >= now() - interval '15 minutes';
  if v_rate_count >= 8 then
    raise exception using errcode = 'P0001', message = 'Too many attempts. Please try again later.';
  end if;

  select r.id into v_renter_id
  from public."RB_RENTER" r
  where public.rb_normalize_phone(r.mobile_no::text) = v_phone
    and public.rb_normalize_name(concat_ws(' ', r.renter_fname, r.renter_lname)) = v_name
  order by r.created_at asc
  limit 1;

  if v_renter_id is null then
    v_first_name := split_part(v_name, ' ', 1);
    v_last_name := nullif(trim(substring(v_name from length(v_first_name) + 1)), '');
    if v_last_name is null then
      raise exception using errcode = '22023', message = 'Please enter your complete name.';
    end if;

    insert into public."RB_RENTER" (
      renter_fname,
      renter_lname,
      mobile_no,
      auth_user_id,
      selfie_verification_id
    ) values (
      initcap(v_first_name),
      initcap(v_last_name),
      v_phone::numeric,
      null,
      null
    ) returning id into v_renter_id;

    returnee_matched_existing := false;
    legacy_returnee := true;
  else
    returnee_matched_existing := true;
    legacy_returnee := false;
  end if;

  insert into public."RB_PUBLIC_BOOKING_FLOW" (
    token_hash,
    renter_id,
    renter_type,
    returnee_matched_existing,
    legacy_returnee,
    ip_hash
  ) values (
    p_token_hash,
    v_renter_id,
    'returnee',
    returnee_matched_existing,
    legacy_returnee,
    p_ip_hash
  );

  return next;
end;
$$;

create or replace function public.rb_submit_public_booking(
  p_token_hash text,
  p_device_ids uuid[],
  p_loc_usage text,
  p_proof_path text,
  p_discount_code text,
  p_username text,
  p_refund_info text,
  p_start_date date,
  p_end_date date,
  p_pickup_time time,
  p_return_time time,
  p_hub_pick_up uuid,
  p_delivery_addr text,
  p_hub_return uuid,
  p_return_addr text
)
returns table(rental_id uuid, renter_id uuid, renter_type text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_flow public."RB_PUBLIC_BOOKING_FLOW"%rowtype;
  v_device_id uuid;
  v_item_id uuid;
  v_item_ids uuid[] := '{}'::uuid[];
  v_branch_id uuid;
  v_rent_price double precision := 0;
begin
  select * into v_flow
  from public."RB_PUBLIC_BOOKING_FLOW"
  where token_hash = p_token_hash
  for update;

  if not found or v_flow.expires_at <= now() or v_flow.consumed_at is not null then
    raise exception using errcode = 'P0001', message = 'This booking session is invalid or expired.';
  end if;
  if cardinality(p_device_ids) is null or cardinality(p_device_ids) < 1 or cardinality(p_device_ids) > 5 then
    raise exception using errcode = '22023', message = 'Select between one and five devices.';
  end if;
  if p_loc_usage not in ('domestic', 'international') then
    raise exception using errcode = '22023', message = 'Invalid usage location.';
  end if;
  if p_start_date is null or p_end_date is null or p_start_date < current_date or p_end_date < p_start_date or p_end_date > p_start_date + 60 then
    raise exception using errcode = '22023', message = 'Invalid rental period.';
  end if;
  if nullif(trim(p_username), '') is null or nullif(trim(p_refund_info), '') is null or nullif(trim(p_proof_path), '') is null then
    raise exception using errcode = '22023', message = 'Required booking information is missing.';
  end if;
  if (p_hub_pick_up is null) = (nullif(trim(p_delivery_addr), '') is null) then
    raise exception using errcode = '22023', message = 'Choose exactly one pickup method.';
  end if;
  if (p_hub_return is null) = (nullif(trim(p_return_addr), '') is null) then
    raise exception using errcode = '22023', message = 'Choose exactly one return method.';
  end if;

  foreach v_device_id in array p_device_ids loop
    select i.id, i.branch_id_fk, coalesce(i.rent_price, 0)
      into v_item_id, v_branch_id, v_rent_price
    from public."RB_ITEM" i
    where i.device_id_fk = v_device_id
      and i.status = 'Available'
      and coalesce(i.current_condition, 'working') = 'working'
    order by i.created_at, i.id
    for update skip locked
    limit 1;

    if v_item_id is null then
      raise exception using errcode = 'P0001', message = 'One of the selected devices is no longer available.';
    end if;

    v_item_ids := array_append(v_item_ids, v_item_id);
    update public."RB_ITEM" set status = 'In Review' where id = v_item_id;
    v_item_id := null;
  end loop;

  select
    coalesce(sum(coalesce(i.rent_price, 0)), 0),
    (array_agg(i.branch_id_fk order by array_position(v_item_ids, i.id)))[1]
    into v_rent_price, v_branch_id
  from public."RB_ITEM" i
  where i.id = any(v_item_ids);

  insert into public."RB_RENTAL_FORM" (
    cam_name_id_fk,
    renter_id_fk,
    branch_id_fk,
    loc_usage,
    proof_of_purpose_of_rental,
    discount_code,
    username,
    refund_info,
    rent_date_start,
    rent_date_end,
    pickup_time,
    return_time,
    hub_pick_up_addr,
    delivery_addr,
    hub_return_addr,
    return_addr,
    rent_price,
    status,
    renter_type,
    returnee_matched_existing,
    legacy_returnee
  ) values (
    v_item_ids[1],
    v_flow.renter_id,
    v_branch_id,
    p_loc_usage,
    p_proof_path,
    nullif(trim(p_discount_code), ''),
    trim(p_username),
    trim(p_refund_info),
    p_start_date,
    p_end_date,
    p_pickup_time,
    p_return_time,
    p_hub_pick_up,
    nullif(trim(p_delivery_addr), ''),
    p_hub_return,
    nullif(trim(p_return_addr), ''),
    v_rent_price,
    'submitted',
    v_flow.renter_type,
    v_flow.returnee_matched_existing,
    v_flow.legacy_returnee
  ) returning id into rental_id;

  insert into public."RB_RENTAL_ITEMS" (rental_form_id, item_id_fk)
  select rental_id, value from unnest(v_item_ids) as value;

  update public."RB_PUBLIC_BOOKING_FLOW"
  set consumed_at = now()
  where id = v_flow.id;

  renter_id := v_flow.renter_id;
  renter_type := v_flow.renter_type;
  return next;
end;
$$;

revoke all on function public.rb_normalize_phone(text) from public, anon, authenticated;
revoke all on function public.rb_normalize_name(text) from public, anon, authenticated;
revoke all on function public.rb_create_returnee_flow(text, text, text, text) from public, anon, authenticated;
revoke all on function public.rb_submit_public_booking(text, uuid[], text, text, text, text, text, date, date, time, time, uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.rb_create_returnee_flow(text, text, text, text) to service_role;
grant execute on function public.rb_submit_public_booking(text, uuid[], text, text, text, text, text, date, date, time, time, uuid, text, uuid, text) to service_role;

create or replace function public.rb_validate_v2_status_transition()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.renter_type is null then
    return new;
  end if;

  if tg_op = 'INSERT' and new.status <> 'submitted' then
    raise exception using errcode = '23514', message = 'V2 bookings must start as Submitted.';
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if not (
      (old.status = 'submitted' and new.status = 'in-review') or
      (old.status = 'in-review' and new.status in ('confirmed', 'declined')) or
      (old.status = 'confirmed' and new.status = 'renting') or
      (old.status = 'renting' and new.status = 'completed')
    ) then
      raise exception using errcode = '23514', message = 'Invalid V2 rental status transition.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists rb_validate_v2_status_transition on public."RB_RENTAL_FORM";
create trigger rb_validate_v2_status_transition
before insert or update of status on public."RB_RENTAL_FORM"
for each row execute function public.rb_validate_v2_status_transition();

-- Renter and rental records are now operated by trusted Admin/Staff clients or
-- service-role Edge Functions. Public intake never receives direct table access.
drop policy if exists rb_renter_policy on public."RB_RENTER";
create policy rb_renter_admin_staff_all
  on public."RB_RENTER"
  for all to authenticated
  using (public.is_admin_or_staff())
  with check (public.is_admin_or_staff());

drop policy if exists rb_rental_form_policy on public."RB_RENTAL_FORM";
create policy rb_rental_form_admin_staff_all
  on public."RB_RENTAL_FORM"
  for all to authenticated
  using (public.is_admin_or_staff())
  with check (public.is_admin_or_staff());

drop policy if exists rb_rental_items_select_own_or_admin on public."RB_RENTAL_ITEMS";
drop policy if exists rb_rental_items_insert_own_or_admin on public."RB_RENTAL_ITEMS";
drop policy if exists rb_rental_items_delete_admin_or_owner on public."RB_RENTAL_ITEMS";
drop policy if exists rb_rental_items_update_admin_only on public."RB_RENTAL_ITEMS";
create policy rb_rental_items_admin_staff_all
  on public."RB_RENTAL_ITEMS"
  for all to authenticated
  using (public.is_admin_or_staff())
  with check (public.is_admin_or_staff());

revoke execute on function public.is_admin_or_staff() from public, anon;
grant execute on function public.is_admin_or_staff() to authenticated, service_role;

-- Existing object paths remain unchanged; only access changes. Admin/Staff can
-- create short-lived signed URLs, while public intake uploads through an Edge Function.
update storage.buckets
set public = false
where id = 'verification-images';

drop policy if exists "Allow public uploads 1yqi356_0" on storage.objects;
drop policy if exists "Allow public uploads 1yqi356_1" on storage.objects;
drop policy if exists "Allow public uploads 1yqi356_2" on storage.objects;
drop policy if exists "Allow public uploads 1yqi356_3" on storage.objects;
drop policy if exists rb_verification_admin_staff_select on storage.objects;
create policy rb_verification_admin_staff_select
  on storage.objects
  for select to authenticated
  using (bucket_id = 'verification-images' and public.is_admin_or_staff());

-- Move the existing reminder credential out of the cron command into Vault
-- without hard-coding or exposing it in migration source.
do $$
declare
  v_job record;
  v_token text;
  v_secret_id uuid;
begin
  select jobid, schedule, command into v_job
  from cron.job
  where command like '%/functions/v1/rental-reminder-cron%'
  order by jobid
  limit 1;

  if v_job.jobid is not null and not exists (
    select 1 from vault.decrypted_secrets where name = 'rental_reminder_service_role'
  ) then
    v_token := substring(v_job.command from 'Bearer ([A-Za-z0-9._-]+)');
    if v_token is not null then
      select vault.create_secret(v_token, 'rental_reminder_service_role', 'Used only by the Recap Buddies reminder cron') into v_secret_id;
      perform cron.unschedule(v_job.jobid);
      perform cron.schedule(
        'recap-buddies-rental-reminders',
        v_job.schedule,
        $cron$
          select net.http_post(
            url := 'https://uhbyjqimjfkamblbvvhl.supabase.co/functions/v1/rental-reminder-cron',
            headers := jsonb_build_object(
              'Authorization',
              'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'rental_reminder_service_role')
            ),
            body := '{}'::jsonb
          );
        $cron$
      );
    end if;
  end if;
end;
$$;
