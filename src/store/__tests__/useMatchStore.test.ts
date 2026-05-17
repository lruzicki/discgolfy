import { useMatchStore } from '../useMatchStore';

describe('useMatchStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useMatchStore.setState({
      matchId: 'm1',
      layoutId: 'l1',
      activeHoleId: 'h1',
      scores: {},
      syncQueue: [],
      isSyncing: false,
      lastSyncError: null,
    });
  });

  it('increments score from 0 to 1 and adds to syncQueue', () => {
    const { incrementScore } = useMatchStore.getState();
    
    incrementScore('h1', 'p1');
    
    const state = useMatchStore.getState();
    expect(state.scores['h1']['p1']).toBe(1);
    expect(state.syncQueue).toContainEqual({
      holeId: 'h1',
      playerId: 'p1',
      strokes: 1,
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
});
