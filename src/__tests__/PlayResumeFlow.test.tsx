import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PlayScreen } from '../screens/PlayScreen';
import { useMatchStore } from '../store/useMatchStore';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
  useIsFocused: () => true,
}));

function mockCreateQuery(finalResult: any) {
  const query: any = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    order: jest.fn(() => Promise.resolve(finalResult)),
    single: jest.fn(() => Promise.resolve(finalResult)),
  };

  return query;
}

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({
        data: { user: { id: 'auth-1' } },
        error: null,
      })),
    },
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return mockCreateQuery({
          data: { id: 'player-1' },
          error: null,
        });
      }

      if (table === 'match_players') {
        return mockCreateQuery({
          data: [
            {
              matches: {
                id: 'match-1',
                layout_id: 'layout-1',
                date_played: '2026-05-21',
                status: 'active',
                layouts: {
                  name: 'Main',
                  courses: { name: 'Park Reagana' },
                },
                match_players: [{ count: 2 }],
              },
            },
          ],
          error: null,
        });
      }

      return mockCreateQuery({ data: [], error: null });
    }),
  },
}));

describe('Play resume flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useMatchStore.getState().resetMatch();
  });

  it('resumes active Match with match and layout context', async () => {
    const { findByText } = render(<PlayScreen />);

    const activeMatch = await findByText('Park Reagana');
    fireEvent.press(activeMatch);

    await waitFor(() => {
      const state = useMatchStore.getState();
      expect(state.matchId).toBe('match-1');
      expect(state.layoutId).toBe('layout-1');
      expect(mockNavigate).toHaveBeenCalledWith('ActiveMatch');
    });
  });

  it('lists active Matches where the current Player participates but did not create the Match', async () => {
    const { findByText } = render(<PlayScreen />);

    expect(await findByText('Park Reagana')).toBeTruthy();
  });
});
