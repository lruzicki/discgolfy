Status: Completed

## What to build
Implement the finalization workflow for a completed match.

## Acceptance criteria
- [x] "Finish Match" button triggers a final mandatory sync.
- [x] Total scores are calculated and saved to `match_players.total_score`.
- [x] Match status is updated to `'completed'`.
- [x] `MatchSummaryScreen` displays the final scorecard and statistics for the round.
- [x] Local Zustand state is cleared upon completion.

## Blocked by
- 003-core-gameplay.md
