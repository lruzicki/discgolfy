import { buildScoreRankings, ScoreRankingRow } from '../scoreRankings';

describe('buildScoreRankings', () => {
  it('ranks the default leaderboard by average score per played hole', () => {
    const rows: ScoreRankingRow[] = [
      {
        player_id: 'short-match-player',
        profiles: { display_name: 'Short Match Player' },
        matches: {
          status: 'completed',
          scores: [
            { player_id: 'short-match-player', strokes: 4, holes: { par: 3 } },
            { player_id: 'short-match-player', strokes: 4, holes: { par: 3 } },
            { player_id: 'short-match-player', strokes: 4, holes: { par: 3 } },
            { player_id: 'short-match-player', strokes: 4, holes: { par: 3 } },
            { player_id: 'short-match-player', strokes: 4, holes: { par: 3 } },
          ],
        },
      },
      {
        player_id: 'full-match-player',
        profiles: { display_name: 'Full Match Player' },
        matches: {
          status: 'completed',
          scores: Array.from({ length: 18 }, () => ({
            player_id: 'full-match-player',
            strokes: 3,
            holes: { par: 3 },
          })).map((score, index) => (index < 9 ? { ...score, strokes: 4 } : score)),
        },
      },
    ];

    expect(buildScoreRankings(rows, 'avg_diff')).toEqual([
      {
        id: 'full-match-player',
        display_name: 'Full Match Player',
        avatar_url: null,
        value: '0.5',
        subValue: '18 played holes',
      },
      {
        id: 'short-match-player',
        display_name: 'Short Match Player',
        avatar_url: null,
        value: '1.0',
        subValue: '5 played holes',
      },
    ]);
  });

  it('excludes null scores, skipped holes, and unfinished matches from the average', () => {
    const rows: ScoreRankingRow[] = [
      {
        player_id: 'steady-player',
        profiles: { display_name: 'Steady Player' },
        matches: {
          status: 'completed',
          scores: [
            { player_id: 'steady-player', strokes: 3, holes: { par: 3 } },
            { player_id: 'steady-player', strokes: null, holes: { par: 4 } },
            { player_id: 'steady-player', strokes: 5, holes: { par: 4 } },
          ],
        },
      },
      {
        player_id: 'empty-player',
        profiles: { display_name: 'Empty Player' },
        matches: {
          status: 'completed',
          scores: [{ player_id: 'empty-player', strokes: null, holes: { par: 3 } }],
        },
      },
      {
        player_id: 'active-player',
        profiles: { display_name: 'Active Player' },
        matches: {
          status: 'active',
          scores: [{ player_id: 'active-player', strokes: 1, holes: { par: 5 } }],
        },
      },
    ];

    expect(buildScoreRankings(rows, 'avg_diff')).toEqual([
      {
        id: 'steady-player',
        display_name: 'Steady Player',
        avatar_url: null,
        value: '0.5',
        subValue: '2 played holes',
      },
    ]);
  });

  it('keeps secondary score filters based on completed played holes', () => {
    const rows: ScoreRankingRow[] = [
      {
        player_id: 'p1',
        profiles: { display_name: 'Player One' },
        matches: {
          status: 'completed',
          scores: [
            { player_id: 'p1', strokes: 2, holes: { par: 3 } },
            { player_id: 'p1', strokes: 5, holes: { par: 4 } },
          ],
        },
      },
      {
        player_id: 'p1',
        profiles: { display_name: 'Player One' },
        matches: {
          status: 'completed',
          scores: [{ player_id: 'p1', strokes: 3, holes: { par: 3 } }],
        },
      },
      {
        player_id: 'p2',
        profiles: { display_name: 'Player Two' },
        matches: {
          status: 'completed',
          scores: [
            { player_id: 'p2', strokes: 4, holes: { par: 3 } },
            { player_id: 'p2', strokes: 4, holes: { par: 3 } },
          ],
        },
      },
    ];

    expect(buildScoreRankings(rows, 'best_score').map((item) => [item.id, item.value])).toEqual([
      ['p1', 0],
      ['p2', 2],
    ]);
    expect(buildScoreRankings(rows, 'most_rounds').map((item) => [item.id, item.value])).toEqual([
      ['p1', 2],
      ['p2', 1],
    ]);
    expect(buildScoreRankings(rows, 'total_strokes').map((item) => [item.id, item.value])).toEqual([
      ['p1', 10],
      ['p2', 8],
    ]);
  });
});
