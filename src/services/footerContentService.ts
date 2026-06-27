import { supabase } from '../service/supabaseClient';

export interface FooterContactSettings {
  email: string;
  instagram: string;
  facebook: string;
}

export type FooterContentKey = 'faqs' | 'terms' | 'privacy';

export const FOOTER_CONTENT_PATHS: Record<FooterContentKey, { bucket: string; path: string }> = {
  terms: { bucket: 'terms_and_condition', path: 'agreement.md' },
  faqs: { bucket: 'footer_content', path: 'faqs.md' },
  privacy: { bucket: 'footer_content', path: 'privacy_policy.md' },
};

export const CONTACT_SETTINGS_PATH = { bucket: 'footer_content', path: 'contact_settings.json' };

export const DEFAULT_CONTACT_SETTINGS: FooterContactSettings = {
  email: '',
  instagram: '',
  facebook: '',
};

export async function loadFooterContent(key: FooterContentKey): Promise<string> {
  const target = FOOTER_CONTENT_PATHS[key];
  const { data, error } = await supabase.storage.from(target.bucket).download(target.path);
  if (error) throw error;
  return data.text();
}

export async function saveFooterContent(key: FooterContentKey, content: string): Promise<void> {
  const target = FOOTER_CONTENT_PATHS[key];
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const { error } = await supabase.storage.from(target.bucket).upload(target.path, blob, {
    upsert: true,
    contentType: 'text/markdown',
  });
  if (error) throw error;
}

export async function loadContactSettings(): Promise<FooterContactSettings> {
  const { data, error } = await supabase.storage.from(CONTACT_SETTINGS_PATH.bucket).download(CONTACT_SETTINGS_PATH.path);
  if (error) throw error;
  const parsed = JSON.parse(await data.text()) as Partial<FooterContactSettings>;
  return { ...DEFAULT_CONTACT_SETTINGS, ...parsed };
}

export async function saveContactSettings(settings: FooterContactSettings): Promise<void> {
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json;charset=utf-8' });
  const { error } = await supabase.storage.from(CONTACT_SETTINGS_PATH.bucket).upload(CONTACT_SETTINGS_PATH.path, blob, {
    upsert: true,
    contentType: 'application/json',
  });
  if (error) throw error;
}
