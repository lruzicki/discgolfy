import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { ActiveMatchScreen } from '../screens/ActiveMatchScreen';
import { useMatchStore } from '../store/useMatchStore';
import { supabase } from '../lib/supabase';

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
  getCurrentPositionAsync: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
const mockRouteParams: { current: any } = { current: undefined };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    setParams: mockSetParams,
  }),
  useRoute: () => ({
    params: mockRouteParams.current,
  }),
  useFocusEffect: (callback: () => void) => callback(),
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
    mockRouteParams.current = undefined;
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

  it('opens Add New Disc from active match with pending throw return context', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getCurrentPositionAsync as jest.Mock)
      .mockResolvedValueOnce({ coords: { latitude: 54.1, longitude: 18.1 } })
      .mockResolvedValueOnce({ coords: { latitude: 54.2, longitude: 18.2 } });

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

      if (table === 'throws') {
        return mockEqChain({ data: [], error: null });
      }

      if (table === 'discs') {
        return mockEqChain({ data: [{ id: 'disc-1', name: 'Driver', color_rgba: '#fff' }], error: null });
      }

      return mockEqQuery({ data: [], error: null });
    });

    useMatchStore.setState({
      matchId: 'match-1',
      layoutId: 'layout-1',
    });

    const screen = render(<ActiveMatchScreen />);

    await waitFor(() => {
      expect(screen.getByText('Scorecard')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.UNSAFE_getByProps({ name: 'ruler' }).parent?.parent);
    });

    await waitFor(() => {
      expect(screen.UNSAFE_getByProps({ name: 'stop-circle' })).toBeTruthy();
    });

    fireEvent.press(screen.UNSAFE_getByProps({ name: 'stop-circle' }).parent?.parent);
    fireEvent.press(await screen.findByText('Add New Disc'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Profile', {
        screen: 'AddEditDisc',
        params: {
          returnToActiveMatchDiscPicker: true,
          pendingThrow: { startLat: 54.1, startLng: 18.1 },
          tempEndCoords: { lat: 54.2, lng: 18.2 },
        },
      });
    });
  });

  it('starts throw measurement without showing a success alert', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 54.1, longitude: 18.1 },
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

      if (table === 'throws' || table === 'discs') {
        return mockEqChain({ data: [], error: null });
      }

      if (table === 'discs') {
        return mockEqChain({ data: [{ id: 'disc-1', name: 'Driver', color_rgba: '#fff' }], error: null });
      }

      return mockEqQuery({ data: [], error: null });
    });

    useMatchStore.setState({
      matchId: 'match-1',
      layoutId: 'layout-1',
    });

    const screen = render(<ActiveMatchScreen />);

    await waitFor(() => {
      expect(screen.getByText('Scorecard')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.UNSAFE_getByProps({ name: 'ruler' }).parent?.parent);
    });

    expect(Alert.alert).not.toHaveBeenCalledWith(
      'Measurement Started',
      'Walk to your disc and tap the check icon.',
    );
    expect(screen.UNSAFE_getByProps({ name: 'stop-circle' })).toBeTruthy();
  });

  it('shows permission denied alert when measurement permission is not granted', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

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

      if (table === 'throws' || table === 'discs') {
        return mockEqChain({ data: [], error: null });
      }

      if (table === 'discs') {
        return mockEqChain({ data: [{ id: 'disc-1', name: 'Driver', color_rgba: '#fff' }], error: null });
      }

      return mockEqQuery({ data: [], error: null });
    });

    useMatchStore.setState({
      matchId: 'match-1',
      layoutId: 'layout-1',
    });

    const screen = render(<ActiveMatchScreen />);

    await waitFor(() => {
      expect(screen.getByText('Scorecard')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.UNSAFE_getByProps({ name: 'ruler' }).parent?.parent);
    });

    expect(Alert.alert).toHaveBeenCalledWith('Permission Denied', 'Location permission is required.');
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('finalizes measured throw by inserting throw without changing strokes', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getCurrentPositionAsync as jest.Mock)
      .mockResolvedValueOnce({ coords: { latitude: 54.1, longitude: 18.1 } })
      .mockResolvedValueOnce({ coords: { latitude: 54.2, longitude: 18.2 } });
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'auth-1' } },
      error: null,
    });

    const insertThrow = jest.fn(() => Promise.resolve({ error: null }));

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

      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: { id: 'player-1' }, error: null })),
            })),
          })),
        };
      }

      if (table === 'discs') {
        return mockEqChain({ data: [{ id: 'disc-1', name: 'Driver', color_rgba: '#fff' }], error: null });
      }

      if (table === 'throws') {
        return {
          select: jest.fn((_columns?: string, options?: { count?: 'exact'; head?: boolean }) => {
            if (options?.count === 'exact' && options?.head === true) {
              const countQuery: any = {
                eq: jest.fn(() => countQuery),
              };
              countQuery.eq = jest.fn(() => countQuery);
              countQuery.eq.mockImplementationOnce(() => countQuery);
              countQuery.eq.mockImplementationOnce(() => countQuery);
              countQuery.eq.mockImplementationOnce(() => Promise.resolve({ count: 0, error: null }));
              return countQuery;
            }

            return {
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    order: jest.fn(() => Promise.resolve({ data: [], error: null })),
                  })),
                })),
              })),
            };
          }),
          insert: insertThrow,
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
      expect(screen.getByText('Scorecard')).toBeTruthy();
    });

    expect(screen.getByText('E (3)')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.UNSAFE_getByProps({ name: 'ruler' }).parent?.parent);
    });
    fireEvent.press(screen.UNSAFE_getByProps({ name: 'stop-circle' }).parent?.parent);
    fireEvent.press(await screen.findByText('Driver'));

    await waitFor(() => {
      expect(insertThrow).toHaveBeenCalledWith(expect.objectContaining({
        match_id: 'match-1',
        player_id: 'player-1',
        hole_id: 'hole-1',
        disc_id: 'disc-1',
        throw_number: 1,
      }));
    });

    expect(screen.getByText('E (3)')).toBeTruthy();
    expect(useMatchStore.getState().scores['hole-1']?.['player-1']).toBe(3);
  });

  it('records one tree event for the current player and hole', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'auth-1' } },
      error: null,
    });

    const insertThrowEvent = jest.fn(() => Promise.resolve({ error: null }));

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

      if (table === 'throws' || table === 'discs') {
        return mockEqChain({ data: [], error: null });
      }

      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: { id: 'player-1' }, error: null })),
            })),
          })),
        };
      }

      if (table === 'throw_events') {
        return {
          insert: insertThrowEvent,
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
      expect(screen.getByText('Scorecard')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Open throw events'));
    fireEvent.press(screen.getByLabelText('Record tree event'));

    await waitFor(() => {
      expect(insertThrowEvent).toHaveBeenCalledTimes(1);
      expect(insertThrowEvent).toHaveBeenCalledWith({
        match_id: 'match-1',
        player_id: 'player-1',
        hole_id: 'hole-1',
        event_type: 'tree',
      });
    });
  });
});
