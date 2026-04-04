import { supabase } from './supabaseClient';

export const uploadImage = async (file: Blob, path: string) => {
  const { error } = await supabase.storage
    .from('verification-images')
    .upload(path, file, {
      contentType: 'image/jpeg',
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from('verification-images')
    .getPublicUrl(path);

  return data.publicUrl;
};