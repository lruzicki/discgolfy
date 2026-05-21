import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SelectPlayersScreen } from '../screens/SelectPlayersScreen';
import { supabase } from '../lib/supabase';
import { useMatchStore } from '../store/useMatchStore';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const mockCurrentPlayer = {
  id: 'player-1',
  auth_id: 'auth-1',
  display_name: 'Current Player',
  avatar_url: null,
  is_guest: false,
};

const mockFriends = Array.from({ length: 4 }, (_, index) => ({
  id: `friend-${index + 1}`,
  auth_id: `friend-auth-${index + 1}`,
  display_name: `Friend ${index + 1}`,
  avatar_url: null,
  is_guest: false,
}));

const mockInsertMatchPlayers = jest.fn();

function mockCreateProfilesQuery() {
  const query: any = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    neq: jest.fn(() => query),
    maybeSingle: jest.fn(() => Promise.resolve({ data: mockCurrentPlayer, error: null })),
    order: jest.fn(() => Promise.resolve({ data: [], error: null })),
    limit: jest.fn(() => Promise.resolve({ data: mockFriends, error: null })),
  };

  return query;
}

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({
        data: { user: { id: 'auth-1', email: 'current@example.com' } },
        error: null,
      })),
      getSession: jest.fn(() => Promise.resolve({
        data: { session: { user: { id: 'auth-1', email: 'current@example.com' } } },
        error: null,
      })),
    },
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return mockCreateProfilesQuery();
      }

      if (table === 'matches') {
        return {
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: { id: 'match-1' },
                error: null,
              })),
            })),
          })),
        };
      }

      if (table === 'match_players') {
        return {
          insert: mockInsertMatchPlayers,
        };
      }

      return {};
    }),
  },
}));

describe('SelectPlayersFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInsertMatchPlayers.mockResolvedValue({ error: null });
    useMatchStore.setState({
      layoutId: 'layout-1',
      matchId: '',
    });
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lets a match start with more than four selected players', async () => {
    const { findByText, getByText } = render(<SelectPlayersScreen />);

    await findByText(/Friend 4/);

    fireEvent.press(getByText(/Friend 1/));
    fireEvent.press(getByText(/Friend 2/));
    fireEvent.press(getByText(/Friend 3/));
    fireEvent.press(getByText(/Friend 4/));

    await waitFor(() => {
      expect(getByText('SELECTED (5)')).toBeTruthy();
    });
    expect(Alert.alert).not.toHaveBeenCalledWith('Squad Full', expect.any(String));

    fireEvent.press(getByText('Graj'));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('match_players');
      expect(mockInsertMatchPlayers).toHaveBeenCalledWith([
        { match_id: 'match-1', player_id: 'player-1' },
        { match_id: 'match-1', player_id: 'friend-1' },
        { match_id: 'match-1', player_id: 'friend-2' },
        { match_id: 'match-1', player_id: 'friend-3' },
        { match_id: 'match-1', player_id: 'friend-4' },
      ]);
      expect(mockNavigate).toHaveBeenCalledWith('ActiveMatch');
    });
  });
});
