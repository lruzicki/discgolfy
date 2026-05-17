# Offline Sync & Client State Specification

This specification outlines how the React Native frontend utilizes Zustand to manage active gameplay state and synchronize with Supabase, explicitly designing for the spotty cellular coverage common on disc golf courses.

## 1. Core Principles

1. **Local-First Gameplay:** During an active match (`status = 'active'`), the UI must *never* block the user waiting for a network request to resolve. Tapping [+] or [-] for a score must instantly update the screen.
2. **Batch Synchronization:** Syncing data to Supabase should happen in batches at natural interaction boundaries (e.g., swiping to the next hole) rather than aggressively on every single tap.
3. **Match Scoring Authority:** As defined in the RLS spec, only the user who created the Match has the authority to write to the `scores` table. Therefore, only the Match Creator's device runs this Sync Engine for scores.

## 2. Zustand Store Structure (`useMatchStore`)

The Zustand store holds the canonical state of the active match.

```typescript
interface MatchState {
  matchId: string;
  layoutId: string;
  activeHoleId: string;
  
  // Local score state: Record<hole_id, Record<player_id, strokes>>
  // null indicates a "Skipped Hole"
  scores: Record<string, Record<string, number | null>>;
  
  // Pending changes that haven't been confirmed by Supabase
  syncQueue: Array<{
    holeId: string;
    playerId: string;
    strokes: number | null;
  }>;
  
  isSyncing: boolean;
  lastSyncError: Error | null;

  // Actions
  incrementScore: (holeId: string, playerId: string) => void;
  decrementScore: (holeId: string, playerId: string) => void;
  skipHole: (holeId: string, playerId: string) => void;
  
  // Sync orchestration
  triggerSync: () => Promise<void>;
}
```

## 3. The Sync Workflow

1. **User Input:**
   - The user taps `+` on Hole 1 for Player A.
   - `incrementScore` is called.
   - The local `scores` object is updated instantly (e.g., from 3 to 4).
   - An entry `{ holeId: 'h1', playerId: 'pA', strokes: 4 }` is pushed or updated in the `syncQueue`.

2. **Triggering Sync:**
   - Sync is NOT triggered on the `+` tap.
   - Sync IS triggered when:
     - The user navigates to the next hole.
     - The user minimizes the app (App State change to 'background').
     - The user taps "Finish Match".
     - A background interval (e.g., every 30 seconds) fires, *if* the network is available.

3. **Executing Sync (`triggerSync`):**
   - Check network connectivity (`NetInfo`). If offline, abort silently (data remains in `syncQueue`).
   - If online, take a snapshot of `syncQueue` and clear it from the state.
   - Execute an `upsert` to the Supabase `scores` table with the batch of changes.
   - **Success:** Do nothing (data is already removed from `syncQueue`).
   - **Failure:** 
     - Prepend the failed snapshot back onto the `syncQueue`.
     - Set `lastSyncError`.
     - The UI might show a small non-intrusive warning ("Offline - Scores saved locally"), but gameplay continues uninterrupted.

## 4. Finishing a Match

When the Match Creator taps "Finish Match":
1. The app forces a final `triggerSync()`.
2. If the sync fails (offline), the app blocks the completion and informs the user: "You must be online to finalize the match. Scores are saved locally."
3. If the sync succeeds, the app makes an API call to:
   - Calculate total scores for all players based on the `scores` table.
   - Update `match_players.total_score` for each participant.
   - Update `matches.status` to `'completed'`.
4. The local Zustand store is cleared, and the user navigates to the Match Summary screen.

## 5. Viewers (Non-Creators)
Players who did not create the match do not run the sync queue. Their Zustand store simply polls or listens to Supabase Realtime for updates to the `scores` table, providing them a read-only view of the Match Creator's inputs.