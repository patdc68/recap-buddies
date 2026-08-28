-- Public landing-page CMS. Business tables remain private; anonymous visitors
-- receive only curated, visible content through rb_get_landing_page().

create table if not exists public."RB_LANDING_PAGE_SETTINGS" (
  id smallint primary key default 1 check (id = 1),
  hero_eyebrow text not null default 'CAMERA RENTAL & CREATIVES',
  hero_headline text not null default 'Your next story deserves the right camera.',
  hero_subheadline text not null default 'Rent creator-ready cameras with a smooth, secure booking experience from Recap Buddies.',
  hero_supporting_text text not null default 'From everyday memories to your next big project, we make quality gear easier to book.',
  hero_image_path text,
  rent_cta_label text not null default 'Rent Now',
  returnee_cta_label text not null default 'Returning Renter',
  browse_cta_label text not null default 'Browse Cameras',
  final_cta_headline text not null default 'Ready to rent your next camera?',
  final_cta_subheadline text not null default 'Book your gear with Recap Buddies today and focus on creating something worth remembering.',
  facebook_label text not null default 'recapbuddiesph',
  facebook_url text not null default 'https://www.facebook.com/recapbuddiesph',
  instagram_label text not null default 'recapbuddiesph',
  instagram_url text not null default 'https://www.instagram.com/recapbuddiesph',
  contact_email text not null default 'recapbuddies@gmail.com',
  updated_at timestamptz not null default now()
);

create table if not exists public."RB_LANDING_FEATURED_CAMERA" (
  device_id uuid primary key references public."RB_DEVICES"(id) on delete cascade,
  tagline text not null default 'Ready for your next story.',
  description text not null default 'Creator-ready gear for memorable photos and videos.',
  landing_image_path text,
  is_visible boolean not null default false,
  display_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public."RB_LANDING_CONTENT_ITEM" (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('why', 'how', 'faq')),
  title text not null,
  body text not null,
  icon_key text,
  is_visible boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public."RB_LANDING_TESTIMONIAL" (
  id uuid primary key default gen_random_uuid(),
  renter_name text not null,
  feedback text not null,
  photo_path text,
  is_visible boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public."RB_LANDING_GALLERY" (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  title text,
  caption text,
  is_visible boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rb_landing_featured_camera_visible_order_idx
  on public."RB_LANDING_FEATURED_CAMERA" (is_visible, display_order, device_id);
create index if not exists rb_landing_content_section_visible_order_idx
  on public."RB_LANDING_CONTENT_ITEM" (section, is_visible, display_order, id);
create index if not exists rb_landing_testimonial_visible_order_idx
  on public."RB_LANDING_TESTIMONIAL" (is_visible, display_order, id);
create index if not exists rb_landing_gallery_visible_order_idx
  on public."RB_LANDING_GALLERY" (is_visible, display_order, id);

create or replace function public.rb_landing_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists rb_landing_settings_touch_updated_at on public."RB_LANDING_PAGE_SETTINGS";
create trigger rb_landing_settings_touch_updated_at
before update on public."RB_LANDING_PAGE_SETTINGS"
for each row execute function public.rb_landing_touch_updated_at();

drop trigger if exists rb_landing_featured_camera_touch_updated_at on public."RB_LANDING_FEATURED_CAMERA";
create trigger rb_landing_featured_camera_touch_updated_at
before update on public."RB_LANDING_FEATURED_CAMERA"
for each row execute function public.rb_landing_touch_updated_at();

drop trigger if exists rb_landing_content_touch_updated_at on public."RB_LANDING_CONTENT_ITEM";
create trigger rb_landing_content_touch_updated_at
before update on public."RB_LANDING_CONTENT_ITEM"
for each row execute function public.rb_landing_touch_updated_at();

drop trigger if exists rb_landing_testimonial_touch_updated_at on public."RB_LANDING_TESTIMONIAL";
create trigger rb_landing_testimonial_touch_updated_at
before update on public."RB_LANDING_TESTIMONIAL"
for each row execute function public.rb_landing_touch_updated_at();

drop trigger if exists rb_landing_gallery_touch_updated_at on public."RB_LANDING_GALLERY";
create trigger rb_landing_gallery_touch_updated_at
before update on public."RB_LANDING_GALLERY"
for each row execute function public.rb_landing_touch_updated_at();

alter table public."RB_LANDING_PAGE_SETTINGS" enable row level security;
alter table public."RB_LANDING_FEATURED_CAMERA" enable row level security;
alter table public."RB_LANDING_CONTENT_ITEM" enable row level security;
alter table public."RB_LANDING_TESTIMONIAL" enable row level security;
alter table public."RB_LANDING_GALLERY" enable row level security;

revoke all on table public."RB_LANDING_PAGE_SETTINGS" from public, anon, authenticated;
revoke all on table public."RB_LANDING_FEATURED_CAMERA" from public, anon, authenticated;
revoke all on table public."RB_LANDING_CONTENT_ITEM" from public, anon, authenticated;
revoke all on table public."RB_LANDING_TESTIMONIAL" from public, anon, authenticated;
revoke all on table public."RB_LANDING_GALLERY" from public, anon, authenticated;

grant select, insert, update, delete on table public."RB_LANDING_PAGE_SETTINGS" to authenticated;
grant select, insert, update, delete on table public."RB_LANDING_FEATURED_CAMERA" to authenticated;
grant select, insert, update, delete on table public."RB_LANDING_CONTENT_ITEM" to authenticated;
grant select, insert, update, delete on table public."RB_LANDING_TESTIMONIAL" to authenticated;
grant select, insert, update, delete on table public."RB_LANDING_GALLERY" to authenticated;
grant all on table public."RB_LANDING_PAGE_SETTINGS" to service_role;
grant all on table public."RB_LANDING_FEATURED_CAMERA" to service_role;
grant all on table public."RB_LANDING_CONTENT_ITEM" to service_role;
grant all on table public."RB_LANDING_TESTIMONIAL" to service_role;
grant all on table public."RB_LANDING_GALLERY" to service_role;

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

insert into public."RB_LANDING_PAGE_SETTINGS" (id)
values (1)
on conflict (id) do nothing;

insert into public."RB_LANDING_CONTENT_ITEM" (section, title, body, icon_key, display_order)
select seed.section, seed.title, seed.body, seed.icon_key, seed.display_order
from (values
  ('why', 'Quality camera units', 'Well-maintained gear selected for creators, milestones, travel, and everyday stories.', 'camera', 1),
  ('why', 'A smoother booking flow', 'Choose your camera, share your rental details, and follow a clear review process.', 'spark', 2),
  ('why', 'Secure renter verification', 'A practical verification process helps protect renters, gear, and every booking.', 'verified', 3),
  ('why', 'Flexible coordination', 'Arrange hub pickup or delivery and return details around your confirmed booking.', 'delivery', 4),
  ('why', 'Reliable support', 'Our team stays within reach from booking review through return coordination.', 'support', 5),
  ('how', 'Choose your camera', 'Browse featured gear and pick the camera that fits your story.', null, 1),
  ('how', 'Submit your booking', 'New renters complete verification once; returnees use the faster returning-renter flow.', null, 2),
  ('how', 'Get reviewed and confirmed', 'We review your booking details and send updates to your provided email.', null, 3),
  ('how', 'Coordinate pickup or delivery', 'Confirm the hub or delivery details for your scheduled rental.', null, 4),
  ('how', 'Create, then return', 'Enjoy your camera, keep it safe, and follow the agreed return coordination.', null, 5),
  ('faq', 'What do new renters need?', 'New renters provide contact details, two valid IDs, proof of billing, and a clear verification selfie.', null, 1),
  ('faq', 'How does returnee booking work?', 'Returning renters provide their previous booking details and a current selfie, then continue to the booking form.', null, 2),
  ('faq', 'Can I choose pickup or delivery?', 'Yes. Available hub pickup, delivery, and return options are selected during booking and confirmed during review.', null, 3),
  ('faq', 'When is my booking confirmed?', 'A submitted booking is reviewed by the Recap Buddies team. Confirmation and status updates are sent by email.', null, 4),
  ('faq', 'What happens when I return the camera?', 'Follow the confirmed return time and location, then hand the complete unit back in its received condition.', null, 5)
) as seed(section, title, body, icon_key, display_order)
where not exists (
  select 1 from public."RB_LANDING_CONTENT_ITEM" existing
  where existing.section = seed.section
);

with ranked_devices as (
  select
    d.id,
    row_number() over (order by count(i.id) desc, d.cam_name, d.id) as rank
  from public."RB_DEVICES" d
  left join public."RB_ITEM" i on i.device_id_fk = d.id
  where lower(coalesce(d.cam_name, '')) <> 'lenses'
  group by d.id, d.cam_name
)
insert into public."RB_LANDING_FEATURED_CAMERA" (
  device_id, tagline, description, is_visible, display_order
)
select
  id,
  'Ready for your next story.',
  'Creator-ready gear for memorable photos and videos.',
  rank <= 6,
  rank
from ranked_devices
on conflict (device_id) do nothing;

create or replace function public.rb_get_landing_page()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_settings jsonb;
  v_cameras jsonb;
  v_content jsonb;
  v_testimonials jsonb;
  v_gallery jsonb;
begin
  select jsonb_build_object(
    'hero_eyebrow', hero_eyebrow,
    'hero_headline', hero_headline,
    'hero_subheadline', hero_subheadline,
    'hero_supporting_text', hero_supporting_text,
    'hero_image_path', hero_image_path,
    'rent_cta_label', rent_cta_label,
    'returnee_cta_label', returnee_cta_label,
    'browse_cta_label', browse_cta_label,
    'final_cta_headline', final_cta_headline,
    'final_cta_subheadline', final_cta_subheadline,
    'facebook_label', facebook_label,
    'facebook_url', facebook_url,
    'instagram_label', instagram_label,
    'instagram_url', instagram_url,
    'contact_email', contact_email
  ) into v_settings
  from public."RB_LANDING_PAGE_SETTINGS"
  where id = 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'device_id', featured.device_id,
    'cam_name', devices.cam_name,
    'device_image', devices.device_img,
    'landing_image_path', featured.landing_image_path,
    'tagline', featured.tagline,
    'description', featured.description,
    'display_order', featured.display_order
  ) order by featured.display_order, devices.cam_name), '[]'::jsonb)
  into v_cameras
  from public."RB_LANDING_FEATURED_CAMERA" featured
  join public."RB_DEVICES" devices on devices.id = featured.device_id
  where featured.is_visible;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', item.id,
    'section', item.section,
    'title', item.title,
    'body', item.body,
    'icon_key', item.icon_key,
    'display_order', item.display_order
  ) order by item.section, item.display_order, item.id), '[]'::jsonb)
  into v_content
  from public."RB_LANDING_CONTENT_ITEM" item
  where item.is_visible;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', testimonial.id,
    'renter_name', testimonial.renter_name,
    'feedback', testimonial.feedback,
    'photo_path', testimonial.photo_path,
    'display_order', testimonial.display_order
  ) order by testimonial.display_order, testimonial.id), '[]'::jsonb)
  into v_testimonials
  from public."RB_LANDING_TESTIMONIAL" testimonial
  where testimonial.is_visible;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', gallery.id,
    'image_path', gallery.image_path,
    'title', gallery.title,
    'caption', gallery.caption,
    'display_order', gallery.display_order
  ) order by gallery.display_order, gallery.id), '[]'::jsonb)
  into v_gallery
  from public."RB_LANDING_GALLERY" gallery
  where gallery.is_visible;

  return jsonb_build_object(
    'settings', coalesce(v_settings, '{}'::jsonb),
    'featured_cameras', coalesce(v_cameras, '[]'::jsonb),
    'content_items', coalesce(v_content, '[]'::jsonb),
    'testimonials', coalesce(v_testimonials, '[]'::jsonb),
    'gallery', coalesce(v_gallery, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.rb_landing_touch_updated_at() from public, anon, authenticated;
revoke all on function public.rb_get_landing_page() from public;
grant execute on function public.rb_get_landing_page() to anon, authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'landing-page',
  'landing-page',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists rb_public_read_landing_assets on storage.objects;
create policy rb_public_read_landing_assets
on storage.objects for select to anon, authenticated
using (bucket_id = 'landing-page');

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

-- Catalogue imagery is intentionally public; all renter verification folders
-- in the same historical bucket remain private.
drop policy if exists rb_public_read_device_catalog_images on storage.objects;
create policy rb_public_read_device_catalog_images
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'verification-images'
  and (storage.foldername(name))[1] = 'devices'
);
