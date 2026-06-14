import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface MatchState {
  matchId: string;
  courseId: string;
  layoutId: string;
  activeHoleIndex: number;
  
  // Local score state: Record<hole_id, Record<player_id, strokes>>
  scores: Record<string, Record<string, number | null>>;
  
  // Pending changes for sync
  syncQueue: Record<string, { holeId: string, playerId: string, strokes: number | null }>;
  
  isSyncing: boolean;
  lastSyncError: Error | null;

  // Actions
  setMatchId: (matchId: string) => void;
  setActiveMatch: (match: { matchId: string; courseId?: string; layoutId: string }) => void;
  setCourse: (courseId: string) => void;
  setLayout: (layoutId: string) => void;
  setActiveHoleIndex: (index: number) => void;
  
  // Scoring actions
  setScore: (holeId: string, playerId: string, strokes: number | null) => void;
  clearScore: (holeId: string, playerId: string) => void;
  hydrateScores: (scoreRows: Array<{ hole_id: string; player_id: string; strokes: number | null }>) => void;
  applyRemoteScore: (scoreRow: { hole_id: string; player_id: string; strokes: number | null }) => void;
  incrementScore: (holeId: string, playerId: string, par: number) => void;
  decrementScore: (holeId: string, playerId: string, par: number) => void;
  
  // Sync logic
  triggerSync: () => Promise<void>;
  resetMatch: () => void;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  matchId: '',
  courseId: '',
  layoutId: '',
  activeHoleIndex: 0,
  scores: {},
  syncQueue: {},
  isSyncing: false,
  lastSyncError: null,

  setMatchId: (matchId) => set({ matchId }),
  setActiveMatch: ({ matchId, courseId, layoutId }) => set((state) => ({
    matchId,
    courseId: courseId ?? state.courseId,
    layoutId,
  })),
  setCourse: (courseId) => set({ courseId }),
  setLayout: (layoutId) => set({ layoutId }),
  setActiveHoleIndex: (activeHoleIndex) => set({ activeHoleIndex }),

  setScore: (holeId, playerId, strokes) => {
    set((state) => {
      const currentHoleScores = state.scores[holeId] || {};
      const syncKey = `${holeId}_${playerId}`;
      
      return {
        scores: {
          ...state.scores,
          [holeId]: {
            ...currentHoleScores,
            [playerId]: strokes,
          },
        },
        syncQueue: {
          ...state.syncQueue,
          [syncKey]: { holeId, playerId, strokes },
        },
      };
    });
  },

  clearScore: (holeId, playerId) => {
    get().setScore(holeId, playerId, null);
  },

  hydrateScores: (scoreRows) => {
    const scores = scoreRows.reduce<Record<string, Record<string, number | null>>>((acc, row) => {
      acc[row.hole_id] = {
        ...(acc[row.hole_id] || {}),
        [row.player_id]: row.strokes,
      };
      return acc;
    }, {});

    set({ scores });
  },

  applyRemoteScore: ({ hole_id, player_id, strokes }) => {
    set((state) => ({
      scores: {
        ...state.scores,
        [hole_id]: {
          ...(state.scores[hole_id] || {}),
          [player_id]: strokes,
        },
      },
    }));
  },

  incrementScore: (holeId, playerId, par) => {
    const state = get();
    const currentStrokes = state.scores[holeId]?.[playerId];
    // If null (skipped), start at par. If 0/undefined, start at par.
    const nextStrokes = (currentStrokes === null || currentStrokes === undefined) ? par : currentStrokes + 1;
    get().setScore(holeId, playerId, nextStrokes);
  },

  decrementScore: (holeId, playerId, par) => {
    const state = get();
    const currentStrokes = state.scores[holeId]?.[playerId];
    if (currentStrokes === null || currentStrokes === undefined) return;
    const nextStrokes = currentStrokes <= 1 ? null : currentStrokes - 1;
    get().setScore(holeId, playerId, nextStrokes);
  },

  triggerSync: async () => {
    const state = get();
    const queueItems = Object.values(state.syncQueue);
    
    if (queueItems.length === 0 || state.isSyncing) return;

    set({ isSyncing: true, lastSyncError: null });

    try {
      const matchId = state.matchId;
      const upserts = queueItems.map(item => ({
        match_id: matchId,
        hole_id: item.holeId,
        player_id: item.playerId,
        strokes: item.strokes,
      }));

      const { error } = await supabase
        .from('scores')
        .upsert(upserts, { onConflict: 'match_id,hole_id,player_id' });

      if (error) throw error;

      // Clear the items we just synced from the queue
      set((state) => {
        const newQueue = { ...state.syncQueue };
        queueItems.forEach(item => {
          delete newQueue[`${item.holeId}_${item.playerId}`];
        });
        return { syncQueue: newQueue };
      });
    } catch (error: any) {
      console.error('Sync failed:', error);
      set({ lastSyncError: error });
    } finally {
      set({ isSyncing: false });
    }
  },

  resetMatch: () => set({
    matchId: '',
    courseId: '',
    layoutId: '',
    activeHoleIndex: 0,
    scores: {},
    syncQueue: {},
    isSyncing: false,
    lastSyncError: null,
  }),
}));
