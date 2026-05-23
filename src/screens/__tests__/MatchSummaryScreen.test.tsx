import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { MatchSummaryScreen } from '../MatchSummaryScreen';
import { useMatchStore } from '../../store/useMatchStore';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSupabaseFrom = jest.fn();
let mockRouteParams: any;

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: mockRouteParams,
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

describe('MatchSummaryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
    useMatchStore.getState().resetMatch();
  });

  it('uses history route match id and historical actions without active store context', async () => {
    const queriedMatchIds: unknown[] = [];

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
            eq: jest.fn((_: string, matchId: unknown) => {
              queriedMatchIds.push(matchId);
              return {
                single: jest.fn(() => Promise.resolve({
                  data: {
                    id: 'match-history-1',
                    date_played: '2026-05-20',
                    created_by: 'player-2',
                    layouts: {
                      name: 'Main Layout',
                      hole_count: 18,
                      courses: { name: 'Reagana', location: 'Gdansk' },
                    },
                  },
                  error: null,
                })),
              };
            }),
          })),
        };
      }

      if (table === 'scores') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{ strokes: 3, player_id: 'player-1', hole_id: 'hole-1', holes: { par: 3 } }],
              error: null,
            })),
          })),
        };
      }

      if (table === 'match_players') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{ player_id: 'player-1', profiles: { display_name: 'Alice' } }],
              error: null,
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

    useMatchStore.setState({ matchId: null });
    mockRouteParams = { matchId: 'match-history-1' };

    const screen = render(<MatchSummaryScreen />);

    await waitFor(() => {
      expect(screen.getByText('Final Results')).toBeTruthy();
      expect(screen.getByText('BACK TO FEED')).toBeTruthy();
    });

    expect(screen.queryByText('PLAY AGAIN')).toBeNull();
    expect(screen.queryByText('BACK TO HUB')).toBeNull();
    expect(queriedMatchIds).toContain('match-history-1');
  });

  it('renders from active-play match context without history route params', async () => {
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
              single: jest.fn(() => Promise.resolve({
                data: {
                  id: 'match-1',
                  date_played: '2026-05-20',
                  created_by: 'player-1',
                  layouts: {
                    name: 'Main Layout',
                    hole_count: 18,
                    courses: { name: 'Reagana', location: 'Gdansk' },
                  },
                },
                error: null,
              })),
            })),
          })),
        };
      }

      if (table === 'scores') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{ strokes: 3, player_id: 'player-1', hole_id: 'hole-1', holes: { par: 3 } }],
              error: null,
            })),
          })),
        };
      }

      if (table === 'match_players') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{ player_id: 'player-1', profiles: { display_name: 'Alice' } }],
              error: null,
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

    useMatchStore.setState({ matchId: 'match-1' });

    const screen = render(<MatchSummaryScreen />);

    await waitFor(() => {
      expect(screen.getByText('Final Results')).toBeTruthy();
      expect(screen.getByText('PLAY AGAIN')).toBeTruthy();
      expect(screen.getByText('BACK TO HUB')).toBeTruthy();
    });
  });

  it('excludes unplayed holes with null strokes from totals and par', async () => {
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
              single: jest.fn(() => Promise.resolve({
                data: {
                  id: 'match-1',
                  date_played: '2026-05-20',
                  created_by: 'player-1',
                  layouts: {
                    name: 'Main Layout',
                    hole_count: 2,
                    courses: { name: 'Reagana', location: 'Gdansk' },
                  },
                },
                error: null,
              })),
            })),
          })),
        };
      }

      if (table === 'scores') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [
                { strokes: 3, player_id: 'player-1', hole_id: 'hole-1', holes: { par: 3 } },
                { strokes: null, player_id: 'player-1', hole_id: 'hole-2', holes: { par: 4 } },
              ],
              error: null,
            })),
          })),
        };
      }

      if (table === 'match_players') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{ player_id: 'player-1', profiles: { display_name: 'Alice' } }],
              error: null,
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

    useMatchStore.setState({ matchId: 'match-1' });

    const screen = render(<MatchSummaryScreen />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('E')).toBeTruthy();
    });

    expect(screen.queryByText('+4')).toBeNull();
  });
});
