import { supabase } from '../service/supabaseClient';

export interface FooterContactSettings {
  email: string;
  instagram: string;
  facebook: string;
}

export const FOOTER_CONTENT = {
  terms: { bucket: 'terms_and_condition', path: 'agreement.md', label: 'Terms and Agreement' },
  faqs: { bucket: 'footer_content', path: 'faqs.md', label: 'FAQs' },
  privacy: { bucket: 'footer_content', path: 'privacy_policy.md', label: 'Privacy Policy' },
  contact: { bucket: 'footer_content', path: 'contact_settings.json', label: 'Contact Us / Socials' },
} as const;

export type FooterRichContentKey = 'terms' | 'faqs' | 'privacy';

export const DEFAULT_CONTACT_SETTINGS: FooterContactSettings = { email: '', instagram: '', facebook: '' };

export const loadFooterMarkdown = async (key: FooterRichContentKey) => {
  const cfg = FOOTER_CONTENT[key];
  const { data, error } = await supabase.storage.from(cfg.bucket).download(cfg.path);
  if (error || !data) {
    if ((error as { statusCode?: string | number } | null)?.statusCode === '404') return '';
    throw new Error(error?.message ?? `Failed to load ${cfg.label}.`);
  }
  return data.text();
};

export const saveFooterMarkdown = async (key: FooterRichContentKey, markdown: string) => {
  const cfg = FOOTER_CONTENT[key];
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const { error } = await supabase.storage.from(cfg.bucket).upload(cfg.path, blob, { upsert: true, contentType: 'text/markdown' });
  if (error) throw new Error(error.message);
};

export const loadFooterContactSettings = async (): Promise<FooterContactSettings> => {
  const { data, error } = await supabase.storage.from(FOOTER_CONTENT.contact.bucket).download(FOOTER_CONTENT.contact.path);
  if (error || !data) {
    if ((error as { statusCode?: string | number } | null)?.statusCode === '404') return DEFAULT_CONTACT_SETTINGS;
    throw new Error(error?.message ?? 'Failed to load contact settings.');
  }
  return { ...DEFAULT_CONTACT_SETTINGS, ...JSON.parse(await data.text()) };
};

export const saveFooterContactSettings = async (settings: FooterContactSettings) => {
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json;charset=utf-8' });
  const { error } = await supabase.storage.from(FOOTER_CONTENT.contact.bucket).upload(FOOTER_CONTENT.contact.path, blob, { upsert: true, contentType: 'application/json' });
  if (error) throw new Error(error.message);
};
