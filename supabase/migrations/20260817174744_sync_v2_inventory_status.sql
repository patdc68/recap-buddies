create or replace function public.rb_sync_v2_rental_item_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item_status text;
begin
  if new.renter_type is null or old.status is not distinct from new.status then
    return new;
  end if;

  v_item_status := case new.status
    when 'submitted' then 'In Review'
    when 'in-review' then 'In Review'
    when 'confirmed' then 'In Review'
    when 'renting' then 'Renting'
    when 'completed' then 'Available'
    when 'declined' then 'Available'
    else null
  end;

  if v_item_status is not null then
    update public."RB_ITEM" item
    set status = v_item_status
    where item.id in (
      select rental_item.item_id_fk
      from public."RB_RENTAL_ITEMS" rental_item
      where rental_item.rental_form_id = new.id
      union
      select new.cam_name_id_fk where new.cam_name_id_fk is not null
    );
  end if;

  return new;
end;
$$;

revoke all on function public.rb_sync_v2_rental_item_status() from public, anon, authenticated;

drop trigger if exists rb_sync_v2_rental_item_status on public."RB_RENTAL_FORM";
create trigger rb_sync_v2_rental_item_status
after update of status on public."RB_RENTAL_FORM"
for each row execute function public.rb_sync_v2_rental_item_status();
