Status: Completed

## Parent
[PRD-mvp-polish.md](../PRD-mvp-polish.md)

## What to build
Enhance the mid-round and final match summary views to provide more competitive context and better visual consistency.

1. **Total Leaderboard**: Add a section to the `SummaryView` (both the in-game "SUM" tabs and the `MatchSummaryScreen`) that displays a leaderboard of all players in the match, sorted by their total score relative to PAR.
2. **Consistent Background**: Update the background color of the Summary view in `ActiveMatchScreen` to use `COLORS.background` (the same dark gray used elsewhere) instead of pure black, fixing the "black hole" visual issue.

## Acceptance criteria
- [x] A sorted leaderboard (best score to worst) is visible in all summary views.
- [x] Scores are clearly displayed as "Total Strokes (Relative to PAR)".
- [x] Background color of the summary tab matches the rest of the application theme.

## Blocked by
None - can start immediately.
