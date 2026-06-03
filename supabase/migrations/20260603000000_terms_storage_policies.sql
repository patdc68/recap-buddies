-- Storage RLS policies for the public Terms & Conditions document.
-- Drop first so this migration updates existing policies instead of creating duplicates.
drop policy if exists "terms_select_public" on storage.objects;
drop policy if exists "terms_insert_authenticated" on storage.objects;
drop policy if exists "terms_update_authenticated" on storage.objects;

create policy "terms_select_public"
on storage.objects
for select
to public
using (
  bucket_id = 'terms_and_condition'
);

create policy "terms_insert_authenticated"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'terms_and_condition'
  and name = 'agreement.md'
);

create policy "terms_update_authenticated"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'terms_and_condition'
  and name = 'agreement.md'
)
with check (
  bucket_id = 'terms_and_condition'
  and name = 'agreement.md'
);
