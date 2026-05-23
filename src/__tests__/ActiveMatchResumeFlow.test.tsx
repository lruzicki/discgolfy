import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { ActiveMatchScreen } from '../screens/ActiveMatchScreen';
import { useMatchStore } from '../store/useMatchStore';

const mockSupabaseFrom = jest.fn();
const mockInjectedScripts: string[] = [];

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    WebView: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        injectJavaScript: (script: string) => mockInjectedScripts.push(script),
      }));

      return React.createElement(View, { ...props, testID: props.testID || 'match-map-webview' });
    }),
  };
});

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

function mockEqChain(result: any) {
  const query: any = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    is: jest.fn(() => Promise.resolve(result)),
    order: jest.fn(() => Promise.resolve(result)),
    update: jest.fn(() => query),
  };

  return query;
}

describe('Active Match resume guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    mockInjectedScripts.length = 0;
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

  it('keeps one map document alive while GPS marker updates are pushed into the WebView', async () => {
    let onLocationChange: ((location: any) => void) | undefined;

    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.watchPositionAsync as jest.Mock).mockImplementation(async (_options, callback) => {
      onLocationChange = callback;
      return { remove: jest.fn() };
    });

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
        return mockEqQuery({ data: [], error: null });
      }

      return mockEqQuery({ data: [], error: null });
    });

    useMatchStore.setState({
      matchId: 'match-1',
      layoutId: 'layout-1',
    });

    const screen = render(<ActiveMatchScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('match-map-webview')).toBeTruthy();
    });

    const initialSource = screen.getByTestId('match-map-webview').props.source;

    act(() => {
      onLocationChange?.({
        coords: {
          latitude: 54.0005,
          longitude: 18.0005,
        },
      });
    });

    await waitFor(() => {
      expect(mockInjectedScripts.some(script => script.includes('54.0005') && script.includes('18.0005'))).toBe(true);
    });

    expect(screen.getByTestId('match-map-webview').props.source).toBe(initialSource);
  });

  it('finishes match and navigates to Match Summary', async () => {
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
        return {
          ...mockEqChain({
            data: [{
              player_id: 'player-1',
              profiles: { id: 'player-1', display_name: 'Alice' },
            }],
            error: null,
          }),
          update: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ error: null })),
            })),
          })),
        };
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

      if (table === 'discs' || table === 'throws') {
        return mockEqChain({ data: [], error: null });
      }

      if (table === 'matches') {
        return {
          update: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ error: null })),
          })),
        };
      }

      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        };
      }

      return mockEqQuery({ data: [], error: null });
    });

    useMatchStore.setState({
      matchId: 'match-1',
      layoutId: 'layout-1',
    });

    const screen = render(<ActiveMatchScreen />);

    await waitFor(() => {
      expect(screen.getByText('FINISH ROUND')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('FINISH ROUND'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('MatchSummary');
    });
  });

  it('shows finish error and stays in active play when completion update fails', async () => {
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
        return {
          ...mockEqChain({
            data: [{
              player_id: 'player-1',
              profiles: { id: 'player-1', display_name: 'Alice' },
            }],
            error: null,
          }),
          update: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ error: null })),
            })),
          })),
        };
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

      if (table === 'discs' || table === 'throws') {
        return mockEqChain({ data: [], error: null });
      }

      if (table === 'matches') {
        return {
          update: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ error: { message: 'update failed' } })),
          })),
        };
      }

      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        };
      }

      return mockEqQuery({ data: [], error: null });
    });

    useMatchStore.setState({
      matchId: 'match-1',
      layoutId: 'layout-1',
    });

    const screen = render(<ActiveMatchScreen />);

    await waitFor(() => {
      expect(screen.getByText('FINISH ROUND')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('FINISH ROUND'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'update failed');
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('MatchSummary');
    expect(useMatchStore.getState().matchId).toBe('match-1');
  });
});
