-- All public V2 operations are mediated by the public-booking Edge Function.
-- Remove direct anonymous table privileges as defense in depth; RLS remains on.
revoke all on table public."RB_RENTER" from anon;
revoke all on table public."RB_RENTAL_FORM" from anon;
revoke all on table public."RB_RENTAL_ITEMS" from anon;
revoke all on table public."RB_PUBLIC_BOOKING_FLOW" from anon;
revoke all on table public."RB_ITEM" from anon;
revoke all on table public."RB_DEVICES" from anon;
revoke all on table public."RB_BRANCHES" from anon;
revoke all on table public."RB_USER" from anon;
revoke all on table public."RB_SELFIE_VERIFICATION_INST" from anon;
