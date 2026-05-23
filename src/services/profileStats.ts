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
  strokes: number;
  holes: { par: number; hole_number: number };
  matches?: { status?: string | null } | null;
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
  const completedRounds = (input.bestRoundData || []).filter((r) => isCompleted(r.matches?.status));
  const completedScores = (input.scoresData || []).filter((s) => isCompleted(s.matches?.status));
  const completedThrows = (input.throwData || []).filter((t) => isCompleted(t.matches?.status));

  const longestThrow = completedThrows.length
    ? Math.max(...completedThrows.map((t) => t.distance_m || 0))
    : 0;

  let bestRoundDiff = Infinity;
  completedRounds.forEach((r) => {
    const totalPar = r.matches?.layouts?.holes?.reduce((acc, h) => acc + h.par, 0) || 0;
    if (totalPar > 0 && r.total_score !== null) {
      const diff = r.total_score - totalPar;
      if (diff < bestRoundDiff) bestRoundDiff = diff;
    }
  });

  const recentPerformance = [...completedRounds]
    .sort((a, b) => new Date(b.matches?.date_played || 0).getTime() - new Date(a.matches?.date_played || 0).getTime())
    .slice(0, 5)
    .reverse()
    .map((r) => {
      const totalPar = r.matches?.layouts?.holes?.reduce((acc, h) => acc + h.par, 0) || 0;
      const date = new Date(r.matches?.date_played || 0);
      return {
        label: `${date.getDate()}/${date.getMonth() + 1}`,
        diff: (r.total_score || 0) - totalPar,
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
