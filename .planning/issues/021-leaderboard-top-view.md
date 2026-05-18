## Parent
[PRD-mvp-polish.md](../PRD-mvp-polish.md)

## What to build
Implement the "Top View" (Podium/Top 3) for the Global Leaderboard as seen in the refined design. This section should highlight the top 3 players with a more prominent visual treatment than the standard list items.

Key features:
- Prominent display for 1st, 2nd, and 3rd place players.
- Larger avatars or special icons for the top 3.
- Summary stats (e.g., total score vs PAR) shown clearly.
- This view should be at the top of the 'Players' tab on the Leaderboard screen.

Design reference:
/stitch_course_selection_overlay/leaderboard_refined_ranking_with_filters/screen.png

## Acceptance criteria
- [ ] A dedicated "Top View" section exists at the top of the Players ranking list.
- [ ] 1st, 2nd, and 3rd places are visually distinct and more prominent than other rankings.
- [ ] The view is integrated into the `LeaderboardScreen.tsx` and correctly displays data from the `playerRankings` state.
