-- Evaluate the authenticated user id once per statement in landing CMS RLS
-- policies. This preserves the Admin-only boundary while avoiding per-row
-- auth.uid() initialization plans.

drop policy if exists rb_landing_settings_admin_all on public."RB_LANDING_PAGE_SETTINGS";
create policy rb_landing_settings_admin_all
on public."RB_LANDING_PAGE_SETTINGS" for all to authenticated
using (exists (
  select 1 from public."RB_USER" u
  where u.auth_user_id = (select auth.uid()) and lower(u.role) = 'admin'
))
with check (exists (
  select 1 from public."RB_USER" u
  where u.auth_user_id = (select auth.uid()) and lower(u.role) = 'admin'
));

drop policy if exists rb_landing_featured_camera_admin_all on public."RB_LANDING_FEATURED_CAMERA";
create policy rb_landing_featured_camera_admin_all
on public."RB_LANDING_FEATURED_CAMERA" for all to authenticated
using (exists (
  select 1 from public."RB_USER" u
  where u.auth_user_id = (select auth.uid()) and lower(u.role) = 'admin'
))
with check (exists (
  select 1 from public."RB_USER" u
  where u.auth_user_id = (select auth.uid()) and lower(u.role) = 'admin'
));

drop policy if exists rb_landing_content_admin_all on public."RB_LANDING_CONTENT_ITEM";
create policy rb_landing_content_admin_all
on public."RB_LANDING_CONTENT_ITEM" for all to authenticated
using (exists (
  select 1 from public."RB_USER" u
  where u.auth_user_id = (select auth.uid()) and lower(u.role) = 'admin'
))
with check (exists (
  select 1 from public."RB_USER" u
  where u.auth_user_id = (select auth.uid()) and lower(u.role) = 'admin'
));

drop policy if exists rb_landing_testimonial_admin_all on public."RB_LANDING_TESTIMONIAL";
create policy rb_landing_testimonial_admin_all
on public."RB_LANDING_TESTIMONIAL" for all to authenticated
using (exists (
  select 1 from public."RB_USER" u
  where u.auth_user_id = (select auth.uid()) and lower(u.role) = 'admin'
))
with check (exists (
  select 1 from public."RB_USER" u
  where u.auth_user_id = (select auth.uid()) and lower(u.role) = 'admin'
));

drop policy if exists rb_landing_gallery_admin_all on public."RB_LANDING_GALLERY";
create policy rb_landing_gallery_admin_all
on public."RB_LANDING_GALLERY" for all to authenticated
using (exists (
  select 1 from public."RB_USER" u
  where u.auth_user_id = (select auth.uid()) and lower(u.role) = 'admin'
))
with check (exists (
  select 1 from public."RB_USER" u
  where u.auth_user_id = (select auth.uid()) and lower(u.role) = 'admin'
));

drop policy if exists rb_admin_insert_landing_assets on storage.objects;
create policy rb_admin_insert_landing_assets
on storage.objects for insert to authenticated
with check (
  bucket_id = 'landing-page'
  and exists (
    select 1 from public."RB_USER" u
    where u.auth_user_id = (select auth.uid()) and lower(u.role) = 'admin'
  )
);

drop policy if exists rb_admin_update_landing_assets on storage.objects;
create policy rb_admin_update_landing_assets
on storage.objects for update to authenticated
using (
  bucket_id = 'landing-page'
  and exists (
    select 1 from public."RB_USER" u
    where u.auth_user_id = (select auth.uid()) and lower(u.role) = 'admin'
  )
)
with check (
  bucket_id = 'landing-page'
  and exists (
    select 1 from public."RB_USER" u
    where u.auth_user_id = (select auth.uid()) and lower(u.role) = 'admin'
  )
);

drop policy if exists rb_admin_delete_landing_assets on storage.objects;
create policy rb_admin_delete_landing_assets
on storage.objects for delete to authenticated
using (
  bucket_id = 'landing-page'
  and exists (
    select 1 from public."RB_USER" u
    where u.auth_user_id = (select auth.uid()) and lower(u.role) = 'admin'
  )
);
