import { create } from 'zustand';

interface MatchState {
  matchId: string;
  layoutId: string;
  activeHoleId: string;
  scores: Record<string, Record<string, number | null>>;
  syncQueue: Array<{
    holeId: string;
    playerId: string;
    strokes: number | null;
  }>;
  isSyncing: boolean;
  lastSyncError: Error | null;
  incrementScore: (holeId: string, playerId: string) => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  matchId: '',
  layoutId: '',
  activeHoleId: '',
  scores: {},
  syncQueue: [],
  isSyncing: false,
  lastSyncError: null,
  incrementScore: (holeId, playerId) => {
    set((state) => {
      const currentHoleScores = state.scores[holeId] || {};
      const currentStrokes = currentHoleScores[playerId] || 0;
      const newStrokes = currentStrokes + 1;

      return {
        scores: {
          ...state.scores,
          [holeId]: {
            ...currentHoleScores,
            [playerId]: newStrokes,
          },
        },
        syncQueue: [
          ...state.syncQueue,
          { holeId, playerId, strokes: newStrokes },
        ],
      };
    });
  },
}));
