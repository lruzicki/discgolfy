import { supabase } from '../lib/supabase';

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

  async uploadAvatar(profileId: string, fileUri: string) {
    const fileExt = fileUri.split('.').pop();
    const fileName = `${profileId}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
    } as any);

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, formData);

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
