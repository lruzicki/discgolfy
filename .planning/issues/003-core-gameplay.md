## What to build
Develop the core gameplay scorecard interface and the underlying offline-sync logic.

## Acceptance criteria
- [x] `ActiveMatchScreen` displays hole-by-hole scorecard for all selected players.
- [x] High-contrast, outdoor-readable UI for [+] and [-] strokes.
- [x] `useMatchStore` (Zustand) tracks local scores and manages a `syncQueue`.
- [x] Batch sync logic: Scores are pushed to Supabase `scores` table when navigating holes or app enters background.
- [x] RLS validation: Only the match creator can update scores.
- [x] Support for "Skipped Holes" (null strokes).

## Blocked by
- 002-player-selection.md
