-- One-time rental status normalization for the new status model.
-- Safe to run once before enabling the scheduled auto-start function.
update "RB_RENTAL_FORM" set status = 'for-review' where status = 'submitted';
update "RB_RENTAL_FORM" set status = 'confirmed' where status = 'in-review';
update "RB_RENTAL_FORM" set status = 'ongoing' where status = 'renting';
update "RB_RENTAL_FORM" set status = 'canceled' where status in ('cancelled', 'Canceled', 'Cancelled');
