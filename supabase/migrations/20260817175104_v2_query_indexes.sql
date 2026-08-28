create index if not exists rb_public_booking_flow_renter_id_idx
  on public."RB_PUBLIC_BOOKING_FLOW" (renter_id);

create index if not exists rb_rental_form_renter_id_idx
  on public."RB_RENTAL_FORM" (renter_id_fk);

create index if not exists rb_rental_form_start_reminder_idx
  on public."RB_RENTAL_FORM" (rent_date_start, status)
  where start_reminder_sent is not true;

create index if not exists rb_rental_form_return_reminder_idx
  on public."RB_RENTAL_FORM" (rent_date_end, status)
  where return_reminder_sent is not true;

create index if not exists rb_item_catalog_availability_idx
  on public."RB_ITEM" (device_id_fk, status, current_condition);
