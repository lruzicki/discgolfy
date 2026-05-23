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

  it('picks a vector icon and color and saves formatted string', async () => {
    (profileService.updateProfile as jest.Mock).mockResolvedValue({ success: true });

    const { getByTestId, getByText, getByDisplayValue } = render(
      <EditProfileScreen navigation={mockNavigation} />
    );

    await waitFor(() => getByDisplayValue('Test User'));

    // Open avatar selection (assuming tapping the avatar opens a modal or expands the picker)
    fireEvent.press(getByTestId('avatar-touchable'));

    // Select an icon from the grid
    const iconCat = await waitFor(() => getByTestId('icon-preset-paw'));
    fireEvent.press(iconCat);

    // Select a color from the palette
    const colorRed = getByTestId('color-preset-#ef4444');
    fireEvent.press(colorRed);

    // Save changes
    const saveButton = getByText('Save Changes');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(profileService.updateProfile).toHaveBeenCalledWith('profile-id', expect.objectContaining({
        avatar_url: 'icon:paw:#ef4444'
      }));
    });
  });

});
