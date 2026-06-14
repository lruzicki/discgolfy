import { useMatchStore } from '../useMatchStore';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      upsert: jest.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

describe('useMatchStore', () => {
  beforeEach(() => {
    useMatchStore.getState().resetMatch();
    useMatchStore.setState({
      scores: {},
      syncQueue: {},
      isSyncing: false,
      lastSyncError: null,
    });
  });

  it('increments score from empty to par and adds to syncQueue', () => {
    const { incrementScore } = useMatchStore.getState();
    
    incrementScore('h1', 'p1', 3);
    
    const state = useMatchStore.getState();
    expect(state.scores['h1']['p1']).toBe(3);
    expect(state.syncQueue['h1_p1']).toEqual({
      holeId: 'h1',
      playerId: 'p1',
      strokes: 3,
    });
  });

  it('clears a player score back to unplayed and queues the null score for sync', () => {
    const { setScore, clearScore } = useMatchStore.getState();

    setScore('h1', 'p1', 4);
    setScore('h1', 'p2', 5);
    clearScore('h1', 'p1');

    const state = useMatchStore.getState();
    expect(state.scores['h1']).toEqual({
      p1: null,
      p2: 5,
    });
    expect(state.syncQueue['h1_p1']).toEqual({
      holeId: 'h1',
      playerId: 'p1',
      strokes: null,
    });
  });

  it('decrements score from one stroke back to unplayed instead of zero', () => {
    const { setScore, decrementScore } = useMatchStore.getState();

    setScore('h1', 'p1', 1);
    decrementScore('h1', 'p1', 3);

    const state = useMatchStore.getState();
    expect(state.scores['h1']['p1']).toBeNull();
    expect(state.syncQueue['h1_p1']).toEqual({
      holeId: 'h1',
      playerId: 'p1',
      strokes: null,
    });
  });

  it('sets course and layout', () => {
    const { setCourse, setLayout } = useMatchStore.getState();
    
    setCourse('c1');
    setLayout('l2');
    
    const state = useMatchStore.getState();
    expect(state.courseId).toBe('c1');
    expect(state.layoutId).toBe('l2');
  });

  it('stores complete active Match context for resume navigation', () => {
    useMatchStore.getState().setActiveMatch({
      matchId: 'match-1',
      courseId: 'course-1',
      layoutId: 'layout-1',
    });

    const state = useMatchStore.getState();
    expect(state.matchId).toBe('match-1');
    expect(state.courseId).toBe('course-1');
    expect(state.layoutId).toBe('layout-1');
  });

  it('hydrates persisted scores for a resumed Match', () => {
    useMatchStore.getState().hydrateScores([
      { hole_id: 'hole-1', player_id: 'player-1', strokes: 3 },
      { hole_id: 'hole-1', player_id: 'player-2', strokes: null },
      { hole_id: 'hole-2', player_id: 'player-1', strokes: 4 },
    ]);

    expect(useMatchStore.getState().scores).toEqual({
      'hole-1': {
        'player-1': 3,
        'player-2': null,
      },
      'hole-2': {
        'player-1': 4,
      },
    });
  });

  it('applies live score updates without enqueueing creator sync work', () => {
    useMatchStore.setState({
      scores: {
        'hole-1': {
          'player-1': 3,
        },
      },
      syncQueue: {},
    });

    useMatchStore.getState().applyRemoteScore({
      hole_id: 'hole-1',
      player_id: 'player-2',
      strokes: 4,
    });

    expect(useMatchStore.getState().scores).toEqual({
      'hole-1': {
        'player-1': 3,
        'player-2': 4,
      },
    });
    expect(useMatchStore.getState().syncQueue).toEqual({});
  });
});
