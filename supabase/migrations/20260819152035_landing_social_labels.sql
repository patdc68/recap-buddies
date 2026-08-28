alter table public."RB_LANDING_PAGE_SETTINGS"
  add column if not exists facebook_label text not null default 'recapbuddiesph',
  add column if not exists instagram_label text not null default 'recapbuddiesph';

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

revoke all on function public.rb_get_landing_page() from public;
grant execute on function public.rb_get_landing_page() to anon, authenticated, service_role;
