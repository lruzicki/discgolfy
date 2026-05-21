import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { ActiveMatchScreen } from '../screens/ActiveMatchScreen';
import { useMatchStore } from '../store/useMatchStore';

const mockSupabaseFrom = jest.fn();

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
}));

jest.mock('expo-location', () => ({
  Accuracy: { High: 'high' },
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'denied' })),
  watchPositionAsync: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockSupabaseFrom(...args),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
  },
}));

function mockOrderedQuery(result: any) {
  const query: any = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    order: jest.fn(() => Promise.resolve(result)),
  };

  return query;
}

function mockEqQuery(result: any) {
  const query: any = {
    select: jest.fn(() => query),
    eq: jest.fn(() => Promise.resolve(result)),
  };

  return query;
}

describe('Active Match resume guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useMatchStore.getState().resetMatch();
    mockSupabaseFrom.mockReturnValue(mockOrderedQuery({ data: [], error: null }));
  });

  it('routes to Match selection without loading when active Match context is incomplete', async () => {
    useMatchStore.setState({
      matchId: 'match-1',
      layoutId: '',
    });

    render(<ActiveMatchScreen />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('SelectCourse');
    });

    expect(mockSupabaseFrom).not.toHaveBeenCalledWith('holes');
    expect(mockSupabaseFrom).not.toHaveBeenCalledWith('match_players');
  });

  it('hydrates persisted scores when resumed Match loads', async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'holes') {
        return mockOrderedQuery({
          data: [{
            id: 'hole-1',
            hole_number: 1,
            par: 3,
            distance_m: 100,
            tee_latitude: 54,
            tee_longitude: 18,
            basket_latitude: 54.001,
            basket_longitude: 18.001,
          }],
          error: null,
        });
      }

      if (table === 'match_players') {
        return mockEqQuery({
          data: [{
            player_id: 'player-1',
            profiles: { id: 'player-1', display_name: 'Alice' },
          }],
          error: null,
        });
      }

      if (table === 'scores') {
        return mockEqQuery({
          data: [{
            hole_id: 'hole-1',
            player_id: 'player-1',
            strokes: 3,
          }],
          error: null,
        });
      }

      return mockEqQuery({ data: [], error: null });
    });

    useMatchStore.setState({
      matchId: 'match-1',
      layoutId: 'layout-1',
    });

    render(<ActiveMatchScreen />);

    await waitFor(() => {
      expect(useMatchStore.getState().scores).toEqual({
        'hole-1': {
          'player-1': 3,
        },
      });
    });
  });
});
