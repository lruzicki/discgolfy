import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { MatchHistoryScreen } from '../MatchHistoryScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSupabaseFrom = jest.fn();

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
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

describe('MatchHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens Match Summary with the pressed completed match id', async () => {
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

      if (table === 'match_players') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => Promise.resolve({
                  data: [
                    {
                      player_id: 'player-1',
                      match_id: 'match-history-1',
                      matches: {
                        id: 'match-history-1',
                        date_played: '2026-05-20',
                        status: 'completed',
                        created_by: 'player-1',
                        layouts: {
                          name: 'Blue Layout',
                          courses: { name: 'Reagana' },
                          holes: [{ par: 3 }],
                        },
                        scores: [{ player_id: 'player-1', strokes: 3, holes: { par: 3 } }],
                      },
                    },
                  ],
                  error: null,
                })),
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

    const screen = render(<MatchHistoryScreen />);

    await waitFor(() => {
      expect(screen.getByText('Reagana')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Reagana'));

    expect(mockNavigate).toHaveBeenCalledWith('MatchSummary', { matchId: 'match-history-1' });
  });
});
