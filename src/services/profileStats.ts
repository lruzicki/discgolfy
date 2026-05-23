export interface MatchSummaryRow {
  total_score: number | null;
  matches?: {
    status?: string | null;
    date_played?: string;
    layouts?: {
      holes?: Array<{ par: number }>;
    };
  } | null;
}

export interface ScoreRow {
  match_id?: string;
  strokes: number | null;
  holes: { par: number; hole_number: number };
  matches?: { status?: string | null; date_played?: string } | null;
}

export interface ThrowRow {
  distance_m: number;
  matches?: { status?: string | null } | null;
}

export interface ProfileStatsResult {
  roundsPlayed: number;
  avgScore: number;
  bestHole: string;
  bestHoleInfo: string;
  totalThrows: number;
  longestThrow: number;
  bestRound: string;
  birdies: number;
  eagles: number;
  recentPerformance: Array<{ label: string; diff: number }>;
}

const isCompleted = (status?: string | null) => status === 'completed';

export function buildProfileStats(input: {
  roundsCount: number;
  bestRoundData: MatchSummaryRow[];
  scoresData: ScoreRow[];
  throwData: ThrowRow[];
}): ProfileStatsResult {
  const completedScores = (input.scoresData || []).filter(
    (s) => isCompleted(s.matches?.status) && s.strokes !== null
  );
  const completedThrows = (input.throwData || []).filter((t) => isCompleted(t.matches?.status));

  const longestThrow = completedThrows.length
    ? Math.max(...completedThrows.map((t) => t.distance_m || 0))
    : 0;

  const roundMap: Record<string, { date_played?: string; totalStrokes: number; totalPar: number }> = {};
  completedScores.forEach((s) => {
    const key = s.match_id || s.matches?.date_played || 'unknown';
    if (!roundMap[key]) {
      roundMap[key] = { date_played: s.matches?.date_played, totalStrokes: 0, totalPar: 0 };
    }
    roundMap[key].totalStrokes += s.strokes || 0;
    roundMap[key].totalPar += s.holes.par;
  });
  const completedRoundScores = Object.values(roundMap).filter((r) => r.totalPar > 0);

  let bestRoundDiff = Infinity;
  completedRoundScores.forEach((r) => {
    const diff = r.totalStrokes - r.totalPar;
    if (diff < bestRoundDiff) bestRoundDiff = diff;
  });

  const recentPerformance = completedRoundScores
    .sort((a, b) => new Date(b.date_played || 0).getTime() - new Date(a.date_played || 0).getTime())
    .slice(0, 5)
    .reverse()
    .map((r) => {
      const date = new Date(r.date_played || 0);
      return {
        label: `${date.getDate()}/${date.getMonth() + 1}`,
        diff: r.totalStrokes - r.totalPar,
      };
    });

  let totalStrokes = 0;
  let totalPar = 0;
  let birdies = 0;
  let eagles = 0;
  let bestHoleDiff = Infinity;
  let bestHoleStr = 'N/A';
  let bestHoleDetails = '';

  completedScores.forEach((s) => {
    totalStrokes += s.strokes;
    totalPar += s.holes.par;
    const diff = s.strokes - s.holes.par;

    if (diff === -1) birdies++;
    if (diff <= -2) eagles++;

    if (diff < bestHoleDiff) {
      bestHoleDiff = diff;
      if (diff <= -3) bestHoleStr = 'Albatross+';
      else if (diff === -2) bestHoleStr = 'Eagle';
      else if (diff === -1) bestHoleStr = 'Birdie';
      else if (diff === 0) bestHoleStr = 'Par';
      else bestHoleStr = 'Bogey+';

      bestHoleDetails = `(Hole ${s.holes.hole_number})`;
    }
  });

  return {
    roundsPlayed: input.roundsCount || 0,
    avgScore: completedScores.length > 0 ? (totalStrokes - totalPar) / (input.roundsCount || 1) : 0,
    bestHole: bestHoleStr,
    bestHoleInfo: bestHoleDetails,
    totalThrows: totalStrokes,
    longestThrow,
    bestRound:
      bestRoundDiff === Infinity
        ? 'N/A'
        : bestRoundDiff === 0
          ? 'E'
          : bestRoundDiff > 0
            ? `+${bestRoundDiff}`
            : `${bestRoundDiff}`,
    birdies,
    eagles,
    recentPerformance,
  };
}
