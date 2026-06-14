export type ScoreFilterType = 'avg_diff' | 'best_score' | 'most_rounds' | 'total_strokes';

export interface ScoreRankingRow {
  player_id: string;
  total_score?: number | null;
  profiles?: {
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
  matches?: {
    status?: string | null;
    scores?: Array<{
      player_id: string;
      strokes: number | null;
      holes?: { par?: number | null } | null;
    }> | null;
  } | null;
}

export interface PlayerRanking {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  value: number | string;
  subValue?: string;
}

interface PlayerAggregate {
  id: string;
  name: string;
  avatar_url: string | null;
  totalDiff: number;
  roundsCount: number;
  playedHoles: number;
  bestDiff: number;
  totalStrokes: number;
}

function formatPlayedHoles(playedHoles: number): string {
  return `${playedHoles} played ${playedHoles === 1 ? 'hole' : 'holes'}`;
}

export function averageDiffPerPlayedHole(totalDiff: number, playedHoles: number): number {
  return playedHoles > 0 ? totalDiff / playedHoles : 0;
}

export function buildScoreRankings(rows: ScoreRankingRow[], activeFilter: ScoreFilterType): PlayerRanking[] {
  const playerMap: Record<string, PlayerAggregate> = {};

  rows.forEach((entry) => {
    if (entry.matches?.status !== 'completed') return;

    const playerId = entry.player_id;
    const playedScores = (entry.matches.scores || []).filter(
      (score) => score.player_id === playerId && score.strokes !== null
    );
    if (playedScores.length === 0) return;

    const totalPar = playedScores.reduce((acc, score) => acc + (score.holes?.par || 0), 0);
    const totalStrokes = playedScores.reduce((acc, score) => acc + (score.strokes || 0), 0);
    const diff = totalStrokes - totalPar;

    if (!playerMap[playerId]) {
      playerMap[playerId] = {
        id: playerId,
        name: entry.profiles?.display_name || 'Guest',
        avatar_url: entry.profiles?.avatar_url || null,
        totalDiff: 0,
        roundsCount: 0,
        playedHoles: 0,
        bestDiff: Infinity,
        totalStrokes: 0,
      };
    }

    playerMap[playerId].totalDiff += diff;
    playerMap[playerId].roundsCount += 1;
    playerMap[playerId].playedHoles += playedScores.length;
    playerMap[playerId].totalStrokes += totalStrokes;
    if (diff < playerMap[playerId].bestDiff) {
      playerMap[playerId].bestDiff = diff;
    }
  });

  const result = Object.values(playerMap).map((player) => {
    if (activeFilter === 'avg_diff') {
      return {
        id: player.id,
        display_name: player.name,
        avatar_url: player.avatar_url,
        value: averageDiffPerPlayedHole(player.totalDiff, player.playedHoles).toFixed(1),
        subValue: formatPlayedHoles(player.playedHoles),
      };
    }

    if (activeFilter === 'best_score') {
      return {
        id: player.id,
        display_name: player.name,
        avatar_url: player.avatar_url,
        value: player.bestDiff,
        subValue: `Across ${player.roundsCount} rounds`,
      };
    }

    if (activeFilter === 'most_rounds') {
      return {
        id: player.id,
        display_name: player.name,
        avatar_url: player.avatar_url,
        value: player.roundsCount,
        subValue: `Avg / Hole: ${averageDiffPerPlayedHole(player.totalDiff, player.playedHoles).toFixed(1)}`,
      };
    }

    return {
      id: player.id,
      display_name: player.name,
      avatar_url: player.avatar_url,
      value: player.totalStrokes,
      subValue: `${player.roundsCount} rounds`,
    };
  });

  if (activeFilter === 'avg_diff' || activeFilter === 'best_score') {
    result.sort((a, b) => Number(a.value) - Number(b.value));
  } else {
    result.sort((a, b) => Number(b.value) - Number(a.value));
  }

  return result.slice(0, 20);
}
