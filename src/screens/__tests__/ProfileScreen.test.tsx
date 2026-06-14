import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { ProfileScreen } from '../ProfileScreen';
import { supabase } from '../../lib/supabase';

const mockSupabaseFrom = jest.fn();

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require('react');
    React.useEffect(callback, [callback]);
  },
}));

jest.mock('expo-location', () => ({
  Accuracy: { High: 'high' },
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockSupabaseFrom(...args),
    auth: {
      getUser: jest.fn(),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
    },
  },
}));

function mockProfileStatsQuery(result: any) {
  const query: any = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    not: jest.fn(() => query),
    order: jest.fn(() => query),
    limit: jest.fn(() => Promise.resolve(result)),
    single: jest.fn(() => Promise.resolve(result)),
  };

  return query;
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'auth-1' } },
      error: null,
    });
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return mockProfileStatsQuery({
          data: { id: 'player-1', display_name: 'Alice', avatar_url: null },
          error: null,
        });
      }

      if (table === 'match_players') {
        return mockProfileStatsQuery({ data: [], count: 0, error: null });
      }

      return mockProfileStatsQuery({ data: [], error: null });
    });
  });

  it('measures a standalone throw from Profile without entering a Match', async () => {
    (Location.getCurrentPositionAsync as jest.Mock)
      .mockResolvedValueOnce({ coords: { latitude: 54.1, longitude: 18.1 } })
      .mockResolvedValueOnce({ coords: { latitude: 54.1, longitude: 18.101 } });

    const screen = render(<ProfileScreen route={{}} navigation={{ navigate: jest.fn() }} />);

    await waitFor(() => {
      expect(screen.getByText('MEASURE THROW')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('MEASURE THROW'));
    await act(async () => {
      fireEvent.press(screen.getByText('START'));
    });
    await act(async () => {
      fireEvent.press(await screen.findByText('FINISH'));
    });

    await waitFor(() => {
      expect(screen.getByText('Throw measured')).toBeTruthy();
      expect(screen.getByText('65m')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Close standalone throw result'));

    await waitFor(() => {
      expect(screen.queryByText('Throw measured')).toBeNull();
    });
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(2);
  });
});
