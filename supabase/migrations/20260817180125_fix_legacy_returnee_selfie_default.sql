-- Legacy returnees intentionally have no verification instruction. The old
-- random UUID default violates the existing instruction foreign key.
alter table public."RB_RENTER"
  alter column selfie_verification_id drop default;

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
  where ip_hash = p_ip_hash and created_at >= now() - interval '15 minutes';
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
      renter_fname, renter_lname, mobile_no, auth_user_id, selfie_verification_id
    ) values (
      initcap(v_first_name), initcap(v_last_name), v_phone::numeric, null, null
    ) returning id into v_renter_id;
    returnee_matched_existing := false;
    legacy_returnee := true;
  else
    returnee_matched_existing := true;
    legacy_returnee := false;
  end if;

  insert into public."RB_PUBLIC_BOOKING_FLOW" (
    token_hash, renter_id, renter_type, returnee_matched_existing, legacy_returnee, ip_hash
  ) values (
    p_token_hash, v_renter_id, 'returnee', returnee_matched_existing, legacy_returnee, p_ip_hash
  );
  return next;
end;
$$;

revoke all on function public.rb_create_returnee_flow(text, text, text, text) from public, anon, authenticated;
grant execute on function public.rb_create_returnee_flow(text, text, text, text) to service_role;
