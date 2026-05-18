## Parent
[PRD-mvp-polish.md](../PRD-mvp-polish.md)

## What to build
Replace the hardcoded data in the `ProfileScreen` with real, dynamic statistics calculated from the user's play history in the Supabase database.

Statistics to calculate:
- **Rounds Played**: Total count of completed matches.
- **Avg. Score**: Average score relative to PAR across all completed holes.
- **Best Hole**: Identify the best performance (e.g., Ace or Eagle) and the hole/course where it occurred.
- **Total Throws**: Aggregated count of strokes from the `scores` table.

## Acceptance criteria
- [ ] Profile stats are no longer hardcoded.
- [ ] Stats update correctly after a match is finished.
- [ ] Efficient Supabase queries are used to perform these aggregations.

## Blocked by
- [010-tab-navigation-architecture.md](./010-tab-navigation-architecture.md)
