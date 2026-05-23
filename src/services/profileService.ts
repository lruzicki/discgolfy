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

  async updateEmail(newEmail: string) {
    const { data, error } = await supabase.auth.updateUser({ email: newEmail });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  }
};
