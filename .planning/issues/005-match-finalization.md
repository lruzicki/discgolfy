## What to build
Implement the finalization workflow for a completed match.

## Acceptance criteria
- [ ] "Finish Match" button triggers a final mandatory sync.
- [ ] Total scores are calculated and saved to `match_players.total_score`.
- [ ] Match status is updated to `'completed'`.
- [ ] `MatchSummaryScreen` displays the final scorecard and statistics for the round.
- [ ] Local Zustand state is cleared upon completion.

## Blocked by
- 003-core-gameplay.md
