import { supabase } from '../lib/supabase';

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

async function getImageBlob(fileUri: string): Promise<Blob> {
  const response = await fetch(fileUri);
  if (!response.ok) {
    throw new Error('Failed to read image file');
  }

  return response.blob();
}

export const profileService = {
  async updateProfile(profileId: string, updates: { display_name?: string; avatar_url?: string }) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profileId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  },

  async uploadAvatar(profileId: string, fileUri: string, knownFileSizeBytes?: number) {
    if (typeof knownFileSizeBytes === 'number' && knownFileSizeBytes > MAX_AVATAR_SIZE_BYTES) {
      return { success: false, error: 'Please select an image smaller than 5MB' };
    }

    const fileExt = fileUri.split('.').pop();
    const fileName = `${profileId}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    const contentType = `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;

    let blob: Blob;
    try {
      blob = await getImageBlob(fileUri);
    } catch (error) {
      return { success: false, error: 'Failed to read selected image' };
    }

    if (blob.size > MAX_AVATAR_SIZE_BYTES) {
      return { success: false, error: 'Please select an image smaller than 5MB' };
    }

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, {
        contentType,
        upsert: true,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return { success: true, publicUrl };
  },

  async updateEmail(newEmail: string) {
    const { data, error } = await supabase.auth.updateUser({ email: newEmail });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  }
};
