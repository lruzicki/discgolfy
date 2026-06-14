import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { ActiveMatchScreen } from '../screens/ActiveMatchScreen';
import { useMatchStore } from '../store/useMatchStore';
import { supabase } from '../lib/supabase';

const mockSupabaseFrom = jest.fn();
const mockInjectedScripts: string[] = [];
const mockChannelOn = jest.fn();
const mockChannelSubscribe = jest.fn();
const mockRemoveChannel = jest.fn();
let mockRealtimeHandler: ((payload: any) => void) | undefined;

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    WebView: React.forwardRef((props: any, ref: any) => {
      const { ref: _ignoredRef, ...viewProps } = props;

      React.useImperativeHandle(ref, () => ({
        injectJavaScript: (script: string) => mockInjectedScripts.push(script),
      }));

      return React.createElement(View, { ...viewProps, testID: props.testID || 'match-map-webview' });
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
      channel: jest.fn(() => ({
        on: (...args: any[]) => {
          mockChannelOn(...args);
          mockRealtimeHandler = args[2];
          return {
            subscribe: mockChannelSubscribe,
          };
        },
      })),
      removeChannel: (...args: any[]) => mockRemoveChannel(...args),
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
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null }, error: null });
    mockInjectedScripts.length = 0;
    mockRealtimeHandler = undefined;
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

    expect(Alert.alert).not.toHaveBeenCalledWith(
      'Finish round?',
      expect.stringContaining('not all holes have scores'),
      expect.any(Array),
    );
  });

  it('asks for confirmation instead of finishing when a playable hole is missing a score', async () => {
    const updateMatch = jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ error: null })),
    }));

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'holes') {
        return mockOrderedQuery({
          data: [
            {
              id: 'hole-1',
              hole_number: 1,
              par: 3,
              distance_m: 100,
              tee_latitude: 54,
              tee_longitude: 18,
              basket_latitude: 54.001,
              basket_longitude: 18.001,
            },
            {
              id: 'hole-2',
              hole_number: 2,
              par: 4,
              distance_m: 120,
              tee_latitude: 54.002,
              tee_longitude: 18.002,
              basket_latitude: 54.003,
              basket_longitude: 18.003,
            },
          ],
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

      if (table === 'discs' || table === 'throws') {
        return mockEqChain({ data: [], error: null });
      }

      if (table === 'matches') {
        return { update: updateMatch };
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
      expect(Alert.alert).toHaveBeenCalledWith(
        'Finish round?',
        expect.stringContaining('not all holes have scores'),
        expect.any(Array),
      );
    });

    expect(updateMatch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith('MatchSummary');
  });

  it('keeps the match active when missing-score finish confirmation is cancelled', async () => {
    const updateMatch = jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ error: null })),
    }));
    const upsertScores = jest.fn(() => Promise.resolve({ error: null }));

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'holes') {
        return mockOrderedQuery({
          data: [
            {
              id: 'hole-1',
              hole_number: 1,
              par: 3,
              distance_m: 100,
              tee_latitude: 54,
              tee_longitude: 18,
              basket_latitude: 54.001,
              basket_longitude: 18.001,
            },
            {
              id: 'hole-2',
              hole_number: 2,
              par: 4,
              distance_m: 120,
              tee_latitude: 54.002,
              tee_longitude: 18.002,
              basket_latitude: 54.003,
              basket_longitude: 18.003,
            },
          ],
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
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{
                hole_id: 'hole-1',
                player_id: 'player-1',
                strokes: 3,
              }],
              error: null,
            })),
          })),
          upsert: upsertScores,
        };
      }

      if (table === 'discs' || table === 'throws') {
        return mockEqChain({ data: [], error: null });
      }

      if (table === 'matches') {
        return { update: updateMatch };
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
      expect(Alert.alert).toHaveBeenCalledWith(
        'Finish round?',
        expect.stringContaining('not all holes have scores'),
        expect.any(Array),
      );
    });

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    buttons[0].onPress?.();

    expect(updateMatch).not.toHaveBeenCalled();
    expect(upsertScores).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith('MatchSummary');
    expect(useMatchStore.getState().matchId).toBe('match-1');
  });

  it('finishes through the existing flow when missing-score confirmation is accepted', async () => {
    const updateMatchPlayer = jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
    }));
    const updateMatch = jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ error: null })),
    }));

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'holes') {
        return mockOrderedQuery({
          data: [
            {
              id: 'hole-1',
              hole_number: 1,
              par: 3,
              distance_m: 100,
              tee_latitude: 54,
              tee_longitude: 18,
              basket_latitude: 54.001,
              basket_longitude: 18.001,
            },
            {
              id: 'hole-2',
              hole_number: 2,
              par: 4,
              distance_m: 120,
              tee_latitude: 54.002,
              tee_longitude: 18.002,
              basket_latitude: 54.003,
              basket_longitude: 18.003,
            },
          ],
          error: null,
        });
      }

      if (table === 'match_players') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{
                player_id: 'player-1',
                profiles: { id: 'player-1', display_name: 'Alice' },
              }],
              error: null,
            })),
          })),
          update: updateMatchPlayer,
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
        return { update: updateMatch };
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
      expect(Alert.alert).toHaveBeenCalledWith(
        'Finish round?',
        expect.stringContaining('not all holes have scores'),
        expect.any(Array),
      );
    });

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    await act(async () => {
      await buttons[1].onPress();
    });

    await waitFor(() => {
      expect(updateMatch).toHaveBeenCalledWith({ status: 'completed' });
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

  it('finalizes measured throw as shot by inserting throw type without changing strokes', async () => {
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
    fireEvent.press(await screen.findByText('Shot'));
    fireEvent.press(await screen.findByText('Driver'));

    await waitFor(() => {
      expect(insertThrow).toHaveBeenCalledWith(expect.objectContaining({
        match_id: 'match-1',
        player_id: 'player-1',
        hole_id: 'hole-1',
        disc_id: 'disc-1',
        throw_number: 1,
        throw_type: 'shot',
      }));
    });

    expect(screen.getByText('E (3)')).toBeTruthy();
    expect(useMatchStore.getState().scores['hole-1']?.['player-1']).toBe(3);
  });

  it('shows a dismissible measured throw result without changing the score', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getCurrentPositionAsync as jest.Mock)
      .mockResolvedValueOnce({ coords: { latitude: 54.1, longitude: 18.1 } })
      .mockResolvedValueOnce({ coords: { latitude: 54.1, longitude: 18.101 } });
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
              const countQuery: any = { eq: jest.fn(() => countQuery) };
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
      expect(screen.getByText('E (3)')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.UNSAFE_getByProps({ name: 'ruler' }).parent?.parent);
    });
    fireEvent.press(screen.UNSAFE_getByProps({ name: 'stop-circle' }).parent?.parent);
    fireEvent.press(await screen.findByText('Shot'));
    fireEvent.press(await screen.findByText('Driver'));

    await waitFor(() => {
      expect(screen.getByText('Throw measured')).toBeTruthy();
      expect(screen.getByText('65m')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Close measured throw result'));

    await waitFor(() => {
      expect(screen.queryByText('Throw measured')).toBeNull();
    });
    expect(screen.getByText('E (3)')).toBeTruthy();
    expect(useMatchStore.getState().scores['hole-1']?.['player-1']).toBe(3);
    expect(mockNavigate).not.toHaveBeenCalledWith('MatchSummary');
  });

  it('keeps the completed measured throw line on the map after closing the result', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getCurrentPositionAsync as jest.Mock)
      .mockResolvedValueOnce({ coords: { latitude: 54.1, longitude: 18.1 } })
      .mockResolvedValueOnce({ coords: { latitude: 54.1, longitude: 18.101 } });
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'auth-1' } },
      error: null,
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
        return mockEqQuery({ data: [{ hole_id: 'hole-1', player_id: 'player-1', strokes: 3 }], error: null });
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
              const countQuery: any = { eq: jest.fn(() => countQuery) };
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
          insert: jest.fn(() => Promise.resolve({ error: null })),
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

    await act(async () => {
      fireEvent.press(screen.UNSAFE_getByProps({ name: 'ruler' }).parent?.parent);
    });
    fireEvent.press(screen.UNSAFE_getByProps({ name: 'stop-circle' }).parent?.parent);
    fireEvent.press(await screen.findByText('Shot'));
    fireEvent.press(await screen.findByText('Driver'));

    await waitFor(() => {
      expect(screen.getByText('Throw measured')).toBeTruthy();
    });

    const scriptsBeforeClose = mockInjectedScripts.length;
    fireEvent.press(screen.getByLabelText('Close measured throw result'));

    await waitFor(() => {
      expect(screen.queryByText('Throw measured')).toBeNull();
    });
    expect(mockInjectedScripts.some(script =>
        script.includes('"throwStart":{"lat":54.1,"lng":18.1}') &&
        script.includes('"throwEnd":{"lat":54.1,"lng":18.101}')
    )).toBe(true);
    expect(mockInjectedScripts.slice(scriptsBeforeClose).some(script =>
      script.includes('"throwEnd":null') || script.includes('"throwStart":null')
    )).toBe(false);
  });

  it('finalizes measured throw as putt by inserting throw type', async () => {
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
        return mockEqChain({ data: [{ id: 'disc-1', name: 'Putter', color_rgba: '#fff' }], error: null });
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

    await act(async () => {
      fireEvent.press(screen.UNSAFE_getByProps({ name: 'ruler' }).parent?.parent);
    });
    fireEvent.press(screen.UNSAFE_getByProps({ name: 'stop-circle' }).parent?.parent);
    fireEvent.press(await screen.findByText('Putt'));
    fireEvent.press(await screen.findByText('Putter'));

    await waitFor(() => {
      expect(insertThrow).toHaveBeenCalledWith(expect.objectContaining({
        throw_type: 'putt',
      }));
    });
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

  it('decrements one player score down to blank without clearing other players on the hole', async () => {
    const upsertScores = jest.fn(() => Promise.resolve({ error: null }));

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
          data: [
            { player_id: 'player-1', profiles: { id: 'player-1', display_name: 'Alice' } },
            { player_id: 'player-2', profiles: { id: 'player-2', display_name: 'Bob' } },
          ],
          error: null,
        });
      }

      if (table === 'scores') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [
                { hole_id: 'hole-1', player_id: 'player-1', strokes: 1 },
                { hole_id: 'hole-1', player_id: 'player-2', strokes: 4 },
              ],
              error: null,
            })),
          })),
          upsert: upsertScores,
        };
      }

      if (table === 'throws' || table === 'discs') {
        return mockEqChain({ data: [], error: null });
      }

      return mockEqQuery({ data: [], error: null });
    });

    useMatchStore.setState({
      matchId: 'match-1',
      layoutId: 'layout-1',
    });

    const screen = render(<ActiveMatchScreen />);

    await waitFor(() => {
      expect(screen.getByText('-2 (1)')).toBeTruthy();
      expect(screen.getByText('+1 (4)')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Decrease Alice score for hole 1'));

    await waitFor(() => {
      expect(useMatchStore.getState().scores['hole-1']).toEqual({
        'player-1': null,
        'player-2': 4,
      });
      expect(screen.getByText('Not played')).toBeTruthy();
      expect(screen.getByText('+1 (4)')).toBeTruthy();
    });

    expect(upsertScores).not.toHaveBeenCalled();
  });

  it('renders participating non-creator active Match as read-only watcher mode', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'auth-2' } },
      error: null,
    });

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: { id: 'player-2' }, error: null })),
            })),
          })),
        };
      }

      if (table === 'matches') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: { created_by: 'player-1', status: 'active' }, error: null })),
            })),
          })),
        };
      }

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
          data: [
            { player_id: 'player-1', profiles: { id: 'player-1', display_name: 'Alice' } },
            { player_id: 'player-2', profiles: { id: 'player-2', display_name: 'Bob' } },
          ],
          error: null,
        });
      }

      if (table === 'scores') {
        return mockEqQuery({
          data: [
            { hole_id: 'hole-1', player_id: 'player-1', strokes: 3 },
            { hole_id: 'hole-1', player_id: 'player-2', strokes: 4 },
          ],
          error: null,
        });
      }

      return mockEqChain({ data: [], error: null });
    });

    useMatchStore.setState({
      matchId: 'match-1',
      layoutId: 'layout-1',
    });

    const screen = render(<ActiveMatchScreen />);

    await waitFor(() => {
      expect(screen.getByText('Watching live')).toBeTruthy();
      expect(screen.getByText('E (3)')).toBeTruthy();
      expect(screen.getByText('+1 (4)')).toBeTruthy();
    });

    expect(screen.queryByText('FINISH ROUND')).toBeNull();
    expect(screen.queryByLabelText('Mark hole unplayable today')).toBeNull();
    expect(screen.queryByLabelText('Open throw events')).toBeNull();
    expect(useMatchStore.getState().syncQueue).toEqual({});
  });

  it('denies active Match access when the authenticated Player is not a participant', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'auth-3' } },
      error: null,
    });

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: { id: 'player-3' }, error: null })),
            })),
          })),
        };
      }

      if (table === 'matches') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: { created_by: 'player-1', status: 'active' }, error: null })),
            })),
          })),
        };
      }

      if (table === 'holes') {
        return mockOrderedQuery({
          data: [{ id: 'hole-1', hole_number: 1, par: 3, distance_m: 100 }],
          error: null,
        });
      }

      if (table === 'match_players') {
        return mockEqQuery({
          data: [
            { player_id: 'player-1', profiles: { id: 'player-1', display_name: 'Alice' } },
            { player_id: 'player-2', profiles: { id: 'player-2', display_name: 'Bob' } },
          ],
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
      expect(Alert.alert).toHaveBeenCalledWith('Access denied', 'Only Match participants can watch this active Match.');
      expect(mockNavigate).toHaveBeenCalledWith('Play');
    });
  });

  it('hydrates watcher scorecard from scoped realtime score changes and unsubscribes on unmount', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'auth-2' } },
      error: null,
    });

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: { id: 'player-2' }, error: null })),
            })),
          })),
        };
      }

      if (table === 'matches') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: { created_by: 'player-1', status: 'active' }, error: null })),
            })),
          })),
        };
      }

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
          data: [
            { player_id: 'player-1', profiles: { id: 'player-1', display_name: 'Alice' } },
            { player_id: 'player-2', profiles: { id: 'player-2', display_name: 'Bob' } },
          ],
          error: null,
        });
      }

      if (table === 'scores') {
        return mockEqQuery({
          data: [
            { hole_id: 'hole-1', player_id: 'player-1', strokes: 3 },
            { hole_id: 'hole-1', player_id: 'player-2', strokes: 4 },
          ],
          error: null,
        });
      }

      return mockEqChain({ data: [], error: null });
    });

    useMatchStore.setState({
      matchId: 'match-1',
      layoutId: 'layout-1',
    });

    const screen = render(<ActiveMatchScreen />);

    await waitFor(() => {
      expect(mockChannelOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          table: 'scores',
          filter: 'match_id=eq.match-1',
        }),
        expect.any(Function),
      );
    });

    act(() => {
      mockRealtimeHandler?.({
        new: {
          match_id: 'match-1',
          hole_id: 'hole-1',
          player_id: 'player-2',
          strokes: 2,
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText('-1 (2)')).toBeTruthy();
    });
    expect(useMatchStore.getState().syncQueue).toEqual({});

    screen.unmount();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });
});
