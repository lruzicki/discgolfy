import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { EditProfileScreen } from '../EditProfileScreen';
import { profileService } from '../../services/profileService';
import { supabase } from '../../lib/supabase';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaType: { Images: 'Images' },
}));

jest.mock('../../services/profileService');
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ 
        data: { user: { id: 'auth-id', email: 'test@example.com' } },
        error: null 
      }),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ 
      data: { id: 'profile-id', display_name: 'Test User', avatar_url: null }, 
      error: null 
    }),
  }
}));

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};

describe('EditProfileScreen', () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    alertSpy.mockRestore();
  });

  it('renders correctly and fetches profile data', async () => {
    const { getByDisplayValue } = render(
      <EditProfileScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByDisplayValue('Test User')).toBeTruthy();
      expect(getByDisplayValue('test@example.com')).toBeTruthy();
    });
  });

  it('updates display name and calls save', async () => {
    (profileService.updateProfile as jest.Mock).mockResolvedValue({ success: true });
    
    const { getByDisplayValue, getByText } = render(
      <EditProfileScreen navigation={mockNavigation} />
    );

    await waitFor(() => getByDisplayValue('Test User'));

    const nameInput = getByDisplayValue('Test User');
    fireEvent.changeText(nameInput, 'Updated Name');
    
    const saveButton = getByText('Save Changes');
    fireEvent.press(saveButton);

    expect(profileService.updateProfile).toHaveBeenCalledWith('profile-id', {
      display_name: 'Updated Name'
    });
    
    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  it('picks an image and uploads it', async () => {
    const mockPickResult = {
      canceled: false,
      assets: [{ uri: 'file://new-avatar.jpg' }]
    };
    const ImagePicker = require('expo-image-picker');
    ImagePicker.launchImageLibraryAsync.mockResolvedValue(mockPickResult);
    
    (profileService.uploadAvatar as jest.Mock).mockResolvedValue({ 
      success: true, 
      publicUrl: 'https://supabase.com/avatar.jpg' 
    });
    (profileService.updateProfile as jest.Mock).mockResolvedValue({ success: true });

    const { getByTestId, getByText, getByDisplayValue } = render(
      <EditProfileScreen navigation={mockNavigation} />
    );

    await waitFor(() => getByDisplayValue('Test User'));
    
    fireEvent.press(getByTestId('avatar-touchable'));

    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });

    // Small delay to ensure state update
    await new Promise(resolve => setTimeout(resolve, 50));

    const saveButton = getByText('Save Changes');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(profileService.uploadAvatar).toHaveBeenCalledWith('profile-id', 'file://new-avatar.jpg', undefined);
    });

    expect(profileService.updateProfile).toHaveBeenCalledWith('profile-id', expect.objectContaining({
      avatar_url: 'https://supabase.com/avatar.jpg'
    }));
  });

  it('rejects oversized selected image and does not upload', async () => {
    const ImagePicker = require('expo-image-picker');
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://too-large.jpg', fileSize: 5 * 1024 * 1024 + 1 }]
    });

    (profileService.updateProfile as jest.Mock).mockResolvedValue({ success: true });

    const { getByTestId, getByText, getByDisplayValue } = render(
      <EditProfileScreen navigation={mockNavigation} />
    );

    await waitFor(() => getByDisplayValue('Test User'));
    fireEvent.press(getByTestId('avatar-touchable'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Image too large', 'Please select an image smaller than 5MB');
    });

    fireEvent.press(getByText('Save Changes'));

    expect(profileService.uploadAvatar).not.toHaveBeenCalled();
  });

  it('stays on edit screen and shows error when upload fails', async () => {
    const ImagePicker = require('expo-image-picker');
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://new-avatar.jpg', fileSize: 1000 }]
    });

    (profileService.uploadAvatar as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Upload failed'
    });

    const { getByTestId, getByText, getByDisplayValue } = render(
      <EditProfileScreen navigation={mockNavigation} />
    );

    await waitFor(() => getByDisplayValue('Test User'));
    fireEvent.press(getByTestId('avatar-touchable'));

    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });

    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Upload failed');
    });

    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });
});
