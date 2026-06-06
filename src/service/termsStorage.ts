import { supabase } from './supabaseClient';

export const TERMS_BUCKET = 'terms_and_condition';
export const TERMS_FILE_PATH = 'agreement.md';
export const TERMS_CONTENT_TYPE = 'text/html';

export const getTermsPublicUrl = () => (
  supabase.storage.from(TERMS_BUCKET).getPublicUrl(TERMS_FILE_PATH).data.publicUrl
);
