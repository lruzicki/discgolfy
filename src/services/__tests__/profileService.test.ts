import { profileService } from '../profileService';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      updateUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
    },
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn().mockResolvedValue({ data: { path: 'avatars/test.jpg' }, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/test.jpg' } }),
    }
  }
}));

describe('profileService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['small-image-bytes'], { type: 'image/jpeg' }),
    } as any);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('updateProfile', () => {
    it('updates the display name in the profiles table', async () => {
      const profileId = 'test-id';
      const updates = { display_name: 'New Name' };
      
      const result = await profileService.updateProfile(profileId, updates);

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(supabase.update).toHaveBeenCalledWith(updates);
      expect(supabase.eq).toHaveBeenCalledWith('id', profileId);
      expect(result.success).toBe(true);
    });

    it('returns error when update fails', async () => {
      (supabase.single as jest.Mock).mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Update failed' } 
      });

      const result = await profileService.updateProfile('id', { display_name: 'Fail' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('updateEmail', () => {
    it('calls supabase.auth.updateUser with the new email', async () => {
      const newEmail = 'new@example.com';
      
      const result = await profileService.updateEmail(newEmail);

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ email: newEmail });
      expect(result.success).toBe(true);
    });

    it('returns error when email update fails', async () => {
      (supabase.auth.updateUser as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid email' }
      });

      const result = await profileService.updateEmail('invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email');
    });
  });
});
