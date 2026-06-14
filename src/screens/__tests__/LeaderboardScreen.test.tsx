import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { LeaderboardScreen } from '../LeaderboardScreen';

const mockSupabaseFrom = jest.fn();

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockSupabaseFrom(...args),
  },
}));

describe('LeaderboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'courses') {
        return {
          select: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: [], error: null })),
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

  it('labels the default leaderboard metric as average per hole', async () => {
    const screen = render(<LeaderboardScreen />);

    await waitFor(() => {
      expect(screen.getByText('Avg / Hole')).toBeTruthy();
    });
    expect(screen.queryByText('Avg Diff')).toBeNull();
  });
});
