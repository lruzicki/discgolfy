import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { PlayScreen } from '../PlayScreen';
import { Linking } from 'react-native';

const mockNavigate = jest.fn();
const mockSetActiveMatch = jest.fn();
const mockSupabaseFrom = jest.fn();

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
  useIsFocused: () => true,
}));

jest.mock('../../store/useMatchStore', () => ({
  useMatchStore: () => ({
    setActiveMatch: mockSetActiveMatch,
  }),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockSupabaseFrom(...args),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'auth-1' } }, error: null })),
    },
  },
}));

describe('PlayScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValueOnce();

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: { id: 'player-1' }, error: null })),
            })),
          })),
        };
      }

      if (table === 'matches') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          })),
        };
      }

      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      };
    });
  });

  it('renders support message under quick actions and opens Buy Me a Coffee link', async () => {
    const screen = render(<PlayScreen />);

    await waitFor(() => {
      expect(screen.getByText('QUICK ACTIONS')).toBeTruthy();
    });

    expect(screen.getByText(/built by a solo developer/i)).toBeTruthy();
    const cta = screen.getByText('Buy Me a Coffee');
    fireEvent.press(cta);

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith('https://buymeacoffee.com/ruzicki');
    });
  });
});
