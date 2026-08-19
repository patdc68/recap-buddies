-- A renter may request more than one physical unit of the same device model.
-- Availability remains protected by row locks in rb_submit_public_booking.
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
  select * into v_flow from public."RB_PUBLIC_BOOKING_FLOW"
  where token_hash = p_token_hash for update;
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
    select i.id into v_item_id
    from public."RB_ITEM" i
    where i.device_id_fk = v_device_id
      and i.status = 'Available'
      and coalesce(i.current_condition, 'working') = 'working'
    order by i.created_at, i.id
    for update skip locked limit 1;
    if v_item_id is null then
      raise exception using errcode = 'P0001', message = 'One of the selected devices is no longer available.';
    end if;
    v_item_ids := array_append(v_item_ids, v_item_id);
    update public."RB_ITEM" set status = 'In Review' where id = v_item_id;
    v_item_id := null;
  end loop;

  select coalesce(sum(coalesce(i.rent_price, 0)), 0),
         (array_agg(i.branch_id_fk order by array_position(v_item_ids, i.id)))[1]
  into v_rent_price, v_branch_id
  from public."RB_ITEM" i where i.id = any(v_item_ids);

  insert into public."RB_RENTAL_FORM" (
    cam_name_id_fk, renter_id_fk, branch_id_fk, loc_usage,
    proof_of_purpose_of_rental, discount_code, username, refund_info,
    rent_date_start, rent_date_end, pickup_time, return_time,
    hub_pick_up_addr, delivery_addr, hub_return_addr, return_addr,
    rent_price, status, renter_type, returnee_matched_existing, legacy_returnee
  ) values (
    v_item_ids[1], v_flow.renter_id, v_branch_id, p_loc_usage,
    p_proof_path, nullif(trim(p_discount_code), ''), trim(p_username), trim(p_refund_info),
    p_start_date, p_end_date, p_pickup_time, p_return_time,
    p_hub_pick_up, nullif(trim(p_delivery_addr), ''), p_hub_return, nullif(trim(p_return_addr), ''),
    v_rent_price, 'submitted', v_flow.renter_type, v_flow.returnee_matched_existing, v_flow.legacy_returnee
  ) returning id into rental_id;

  insert into public."RB_RENTAL_ITEMS" (rental_form_id, item_id_fk)
  select rental_id, value from unnest(v_item_ids) as value;
  update public."RB_PUBLIC_BOOKING_FLOW" set consumed_at = now() where id = v_flow.id;
  renter_id := v_flow.renter_id;
  renter_type := v_flow.renter_type;
  return next;
end;
$$;

revoke all on function public.rb_submit_public_booking(text, uuid[], text, text, text, text, text, date, date, time, time, uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.rb_submit_public_booking(text, uuid[], text, text, text, text, text, date, date, time, time, uuid, text, uuid, text) to service_role;
