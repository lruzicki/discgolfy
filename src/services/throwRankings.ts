import { ThrowType } from '../constants/throwTypes';

export interface ThrowRankingRow {
  player_id: string;
  distance_m: number;
  throw_type?: ThrowType | null;
  profiles?: {
    display_name?: string | null;
  } | null;
  discs?: {
    name?: string | null;
  } | null;
}

interface PlayerRanking {
  id: string;
  display_name: string;
  value: string;
  subValue: string;
}

function buildPlayerMax(rows: ThrowRankingRow[]): Record<string, ThrowRankingRow> {
  const playerMax: Record<string, ThrowRankingRow> = {};
  rows.forEach((row) => {
    if (!playerMax[row.player_id] || row.distance_m > playerMax[row.player_id].distance_m) {
      playerMax[row.player_id] = row;
    }
  });
  return playerMax;
}

function toRankingRows(playerMax: Record<string, ThrowRankingRow>): PlayerRanking[] {
  return Object.values(playerMax)
    .map((row) => ({
      id: row.player_id,
      display_name: row.profiles?.display_name || 'Unknown',
      value: `${row.distance_m}m`,
      subValue: row.discs?.name || 'Unknown Disc',
    }))
    .sort((a, b) => parseInt(b.value, 10) - parseInt(a.value, 10))
    .slice(0, 20);
}

export function buildLongestThrowRankings(rows: ThrowRankingRow[]): PlayerRanking[] {
  const throwRows = rows.filter((row) => row.throw_type !== 'putt');
  return toRankingRows(buildPlayerMax(throwRows));
}

export function buildLongestPuttRankings(rows: ThrowRankingRow[]): PlayerRanking[] {
  const puttRows = rows.filter((row) => row.throw_type === 'putt');
  return toRankingRows(buildPlayerMax(puttRows));
}
