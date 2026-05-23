import { buildLongestThrows } from '../longestThrows';

describe('buildLongestThrows', () => {
  it('returns completed throws sorted by distance descending with row details', () => {
    const rows = [
      {
        distance_m: 82,
        created_at: '2026-05-03T10:00:00.000Z',
        throw_type: 'putt',
        discs: { name: 'Judge' },
        holes: {
          hole_number: 9,
          layouts: { name: 'Blue', courses: { name: 'Reagana' } },
        },
        matches: { status: 'completed', date_played: '2026-05-03' },
      },
      {
        distance_m: 120,
        created_at: '2026-05-10T10:00:00.000Z',
        throw_type: 'shot',
        discs: { name: 'Destroyer' },
        holes: {
          hole_number: 3,
          layouts: { name: 'Gold', courses: { name: 'Jaskowa' } },
        },
        matches: { status: 'completed', date_played: '2026-05-10' },
      },
      {
        distance_m: 140,
        created_at: '2026-05-12T10:00:00.000Z',
        throw_type: 'shot',
        discs: { name: 'Wraith' },
        holes: {
          hole_number: 1,
          layouts: { name: 'Blue', courses: { name: 'Reagana' } },
        },
        matches: { status: 'active', date_played: '2026-05-12' },
      },
    ];

    const result = buildLongestThrows(rows as any);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({
        distance_m: 120,
        discName: 'Destroyer',
        courseLayout: 'Jaskowa / Gold',
        holeNumber: 3,
        throwType: 'shot',
      })
    );
    expect(result[1]).toEqual(
      expect.objectContaining({
        distance_m: 82,
        discName: 'Judge',
        courseLayout: 'Reagana / Blue',
        holeNumber: 9,
        throwType: 'putt',
      })
    );
  });

  it('returns empty array when there are no completed measured throws', () => {
    const result = buildLongestThrows([
      {
        distance_m: 120,
        matches: { status: 'active' },
      },
    ] as any);

    expect(result).toEqual([]);
  });
});
