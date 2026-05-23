import { buildLongestPuttRankings, buildLongestThrowRankings, ThrowRankingRow } from '../throwRankings';

const rows: ThrowRankingRow[] = [
  {
    player_id: 'p1',
    distance_m: 40,
    throw_type: 'shot',
    profiles: { display_name: 'Alice' },
    discs: { name: 'Driver' },
  },
  {
    player_id: 'p1',
    distance_m: 21,
    throw_type: 'putt',
    profiles: { display_name: 'Alice' },
    discs: { name: 'Putter' },
  },
  {
    player_id: 'p2',
    distance_m: 29,
    throw_type: null,
    profiles: { display_name: 'Bob' },
    discs: { name: 'Fairway' },
  },
  {
    player_id: 'p2',
    distance_m: 18,
    throw_type: 'putt',
    profiles: { display_name: 'Bob' },
    discs: { name: 'Putter' },
  },
];

describe('throwRankings', () => {
  it('builds longest putt rankings from measured putt throws', () => {
    expect(buildLongestPuttRankings(rows)).toEqual([
      { id: 'p1', display_name: 'Alice', value: '21m', subValue: 'Putter' },
      { id: 'p2', display_name: 'Bob', value: '18m', subValue: 'Putter' },
    ]);
  });

  it('builds longest throw rankings from shot and legacy untyped throws', () => {
    expect(buildLongestThrowRankings(rows)).toEqual([
      { id: 'p1', display_name: 'Alice', value: '40m', subValue: 'Driver' },
      { id: 'p2', display_name: 'Bob', value: '29m', subValue: 'Fairway' },
    ]);
  });
});
