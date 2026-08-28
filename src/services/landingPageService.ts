import { supabase } from '../service/supabaseClient';
import {
  DEFAULT_LANDING_SETTINGS,
  type LandingContentItem,
  type LandingFeaturedCamera,
  type LandingGalleryItem,
  type LandingPageData,
  type LandingPageSettings,
  type LandingTestimonial,
} from '../types/landingPage';

const LANDING_BUCKET = 'landing-page';
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const asString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const asNullableString = (value: unknown) => typeof value === 'string' && value.trim() ? value : null;
const asNumber = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const normalizeSettings = (value: unknown): LandingPageSettings => {
  const row = isRecord(value) ? value : {};
  return {
    hero_eyebrow: asString(row.hero_eyebrow, DEFAULT_LANDING_SETTINGS.hero_eyebrow),
    hero_headline: asString(row.hero_headline, DEFAULT_LANDING_SETTINGS.hero_headline),
    hero_subheadline: asString(row.hero_subheadline, DEFAULT_LANDING_SETTINGS.hero_subheadline),
    hero_supporting_text: asString(row.hero_supporting_text, DEFAULT_LANDING_SETTINGS.hero_supporting_text),
    hero_image_path: asNullableString(row.hero_image_path),
    rent_cta_label: asString(row.rent_cta_label, DEFAULT_LANDING_SETTINGS.rent_cta_label),
    returnee_cta_label: asString(row.returnee_cta_label, DEFAULT_LANDING_SETTINGS.returnee_cta_label),
    browse_cta_label: asString(row.browse_cta_label, DEFAULT_LANDING_SETTINGS.browse_cta_label),
    final_cta_headline: asString(row.final_cta_headline, DEFAULT_LANDING_SETTINGS.final_cta_headline),
    final_cta_subheadline: asString(row.final_cta_subheadline, DEFAULT_LANDING_SETTINGS.final_cta_subheadline),
    facebook_label: asString(row.facebook_label, DEFAULT_LANDING_SETTINGS.facebook_label),
    facebook_url: asString(row.facebook_url, DEFAULT_LANDING_SETTINGS.facebook_url),
    instagram_label: asString(row.instagram_label, DEFAULT_LANDING_SETTINGS.instagram_label),
    instagram_url: asString(row.instagram_url, DEFAULT_LANDING_SETTINGS.instagram_url),
    contact_email: asString(row.contact_email, DEFAULT_LANDING_SETTINGS.contact_email),
  };
};

const normalizeArray = <T>(value: unknown, mapper: (row: Record<string, unknown>) => T | null): T[] => (
  Array.isArray(value)
    ? value.flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const mapped = mapper(entry);
      return mapped ? [mapped] : [];
    })
    : []
);

export const normalizeLandingPageData = (value: unknown): LandingPageData => {
  const payload = isRecord(value) ? value : {};
  return {
    settings: normalizeSettings(payload.settings),
    featured_cameras: normalizeArray<LandingFeaturedCamera>(payload.featured_cameras, (row) => {
      const deviceId = asString(row.device_id);
      const cameraName = asString(row.cam_name);
      if (!deviceId || !cameraName) return null;
      return {
        device_id: deviceId,
        cam_name: cameraName,
        device_image: asNullableString(row.device_image),
        landing_image_path: asNullableString(row.landing_image_path),
        tagline: asString(row.tagline, 'Ready for your next story.'),
        description: asString(row.description, 'Creator-ready gear for memorable photos and videos.'),
        display_order: asNumber(row.display_order),
      };
    }),
    content_items: normalizeArray<LandingContentItem>(payload.content_items, (row) => {
      const section = row.section;
      if (section !== 'why' && section !== 'how' && section !== 'faq') return null;
      return {
        id: asString(row.id),
        section,
        title: asString(row.title),
        body: asString(row.body),
        icon_key: asNullableString(row.icon_key),
        display_order: asNumber(row.display_order),
      };
    }),
    testimonials: normalizeArray<LandingTestimonial>(payload.testimonials, (row) => ({
      id: asString(row.id),
      renter_name: asString(row.renter_name),
      feedback: asString(row.feedback),
      photo_path: asNullableString(row.photo_path),
      display_order: asNumber(row.display_order),
    })),
    gallery: normalizeArray<LandingGalleryItem>(payload.gallery, (row) => {
      const imagePath = asString(row.image_path);
      if (!imagePath) return null;
      return {
        id: asString(row.id),
        image_path: imagePath,
        title: asNullableString(row.title),
        caption: asNullableString(row.caption),
        display_order: asNumber(row.display_order),
      };
    }),
  };
};

export const fetchLandingPageData = async () => {
  const { data, error } = await supabase.rpc('rb_get_landing_page');
  if (error) throw new Error(error.message);
  return normalizeLandingPageData(data);
};

export const getLandingAssetUrl = (path: string | null | undefined) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return supabase.storage.from(LANDING_BUCKET).getPublicUrl(path).data.publicUrl;
};

export const getVerificationDevicePath = (value: string | null | undefined) => {
  if (!value) return null;
  const marker = '/verification-images/';
  const markerIndex = value.indexOf(marker);
  if (markerIndex >= 0) return decodeURIComponent(value.slice(markerIndex + marker.length).split('?')[0]);
  if (value.startsWith('verification-images/')) return value.slice('verification-images/'.length);
  if (value.startsWith('devices/')) return value;
  return null;
};

export const getPublicDeviceImageUrl = async (value: string | null | undefined) => {
  const path = getVerificationDevicePath(value);
  if (!path) return null;
  const { data, error } = await supabase.storage.from('verification-images').createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
};

const safeExtension = (file: File) => {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'jpg';
};

export const uploadLandingAsset = async (file: File, folder: 'hero' | 'cameras' | 'testimonials' | 'gallery') => {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error('Use a JPG, PNG, WebP, or GIF image.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Images must be 10 MB or smaller.');
  const path = `${folder}/${crypto.randomUUID()}.${safeExtension(file)}`;
  const { error } = await supabase.storage.from(LANDING_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
};

export const removeLandingAsset = async (path: string | null | undefined) => {
  if (!path || /^https?:\/\//i.test(path)) return;
  const { error } = await supabase.storage.from(LANDING_BUCKET).remove([path]);
  if (error) throw new Error(error.message);
};
