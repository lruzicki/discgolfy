import { buildProfileStats } from '../profileStats';

describe('buildProfileStats', () => {
  it('excludes active matches from profile statistics', () => {
    const stats = buildProfileStats({
      roundsCount: 1,
      bestRoundData: [
        {
          total_score: 18,
          matches: {
            status: 'completed',
            date_played: '2026-05-10',
            layouts: { holes: [{ par: 3 }, { par: 3 }, { par: 3 }] },
          },
        },
        {
          total_score: 1,
          matches: {
            status: 'active',
            date_played: '2026-05-11',
            layouts: { holes: [{ par: 10 }] },
          },
        },
      ],
      scoresData: [
        { strokes: 3, holes: { par: 3, hole_number: 1 }, matches: { status: 'completed' } },
        { strokes: 2, holes: { par: 3, hole_number: 2 }, matches: { status: 'completed' } },
        { strokes: 1, holes: { par: 5, hole_number: 3 }, matches: { status: 'active' } },
      ],
      throwData: [
        { distance_m: 45, matches: { status: 'completed' } },
        { distance_m: 120, matches: { status: 'active' } },
      ],
    });

    expect(stats.roundsPlayed).toBe(1);
    expect(stats.totalThrows).toBe(5);
    expect(stats.birdies).toBe(1);
    expect(stats.eagles).toBe(0);
    expect(stats.bestRound).toBe('-1');
    expect(stats.recentPerformance).toHaveLength(1);
  });

  it('ignores longest throw from unfinished matches', () => {
    const stats = buildProfileStats({
      roundsCount: 1,
      bestRoundData: [],
      scoresData: [],
      throwData: [
        { distance_m: 60, matches: { status: 'completed' } },
        { distance_m: 110, matches: { status: 'active' } },
      ],
    });

    expect(stats.longestThrow).toBe(60);
  });

  it('computes best round and recent performance from played holes only', () => {
    const stats = buildProfileStats({
      roundsCount: 1,
      bestRoundData: [
        {
          total_score: 3,
          matches: {
            status: 'completed',
            date_played: '2026-05-10',
            layouts: { holes: [{ par: 3 }, { par: 4 }] },
          },
        },
      ],
      scoresData: [
        {
          strokes: 3,
          holes: { par: 3, hole_number: 1 },
          matches: { status: 'completed', date_played: '2026-05-10' } as any,
          match_id: 'match-1',
        } as any,
      ],
      throwData: [],
    });

    expect(stats.totalThrows).toBe(3);
    expect(stats.avgScore).toBe(0);
    expect(stats.bestRound).toBe('E');
    expect(stats.recentPerformance).toEqual([{ label: '10/5', diff: 0 }]);
  });

  it('counts throw events from completed matches only', () => {
    const stats = buildProfileStats({
      roundsCount: 1,
      bestRoundData: [],
      scoresData: [],
      throwData: [],
      throwEventData: [
        { event_type: 'tree', matches: { status: 'completed' } },
        { event_type: 'tree', matches: { status: 'active' } },
        { event_type: 'water', matches: { status: 'completed' } },
        { event_type: 'ob', matches: { status: 'completed' } },
        { event_type: 'hit_person', matches: { status: 'completed' } },
      ],
    });

    expect(stats.treeHits).toBe(1);
    expect(stats.waterHits).toBe(1);
    expect(stats.obHits).toBe(1);
    expect(stats.hitPeople).toBe(1);
  });

  it('excludes unplayable holes represented by null strokes from totals and best-hole stats', () => {
    const stats = buildProfileStats({
      roundsCount: 1,
      bestRoundData: [],
      scoresData: [
        { strokes: 3, holes: { par: 3, hole_number: 1 }, matches: { status: 'completed' } },
        { strokes: null, holes: { par: 4, hole_number: 2 }, matches: { status: 'completed' } },
      ],
      throwData: [],
    });

    expect(stats.totalThrows).toBe(3);
    expect(stats.avgScore).toBe(0);
    expect(stats.bestHole).toBe('Par');
    expect(stats.bestHoleInfo).toBe('(Hole 1)');
  });
});
