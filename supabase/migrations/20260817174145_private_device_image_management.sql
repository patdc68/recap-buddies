-- Camera catalogue images share the private verification bucket for historical
-- compatibility. Only admins may mutate the devices/ prefix; authenticated
-- staff retain read-only access through the existing bucket policy.
drop policy if exists "rb_admin_manage_device_images_insert" on storage.objects;
create policy "rb_admin_manage_device_images_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'verification-images'
  and (storage.foldername(name))[1] = 'devices'
  and exists (
    select 1 from public."RB_USER" u
    where u.auth_user_id = auth.uid() and lower(u.role) = 'admin'
  )
);

drop policy if exists "rb_admin_manage_device_images_update" on storage.objects;
create policy "rb_admin_manage_device_images_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'verification-images'
  and (storage.foldername(name))[1] = 'devices'
  and exists (
    select 1 from public."RB_USER" u
    where u.auth_user_id = auth.uid() and lower(u.role) = 'admin'
  )
)
with check (
  bucket_id = 'verification-images'
  and (storage.foldername(name))[1] = 'devices'
  and exists (
    select 1 from public."RB_USER" u
    where u.auth_user_id = auth.uid() and lower(u.role) = 'admin'
  )
);

drop policy if exists "rb_admin_manage_device_images_delete" on storage.objects;
create policy "rb_admin_manage_device_images_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'verification-images'
  and (storage.foldername(name))[1] = 'devices'
  and exists (
    select 1 from public."RB_USER" u
    where u.auth_user_id = auth.uid() and lower(u.role) = 'admin'
  )
);
