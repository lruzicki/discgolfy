## Type

AFK

## What to build

Add a dedicated Longest Throws tab/list so Players can inspect their longest measured throws instead of seeing only one aggregate statistic. The list should show distance, Disc, Course/Layout, Hole, date, and whether the throw was a shot or putt when that data exists.

## Acceptance criteria

- [x] Profile has a navigation entry or tab for Longest Throws.
- [x] The Longest Throws view lists measured Throws sorted by distance descending.
- [x] Each row shows distance, Disc name, Course/Layout, Hole number, and date.
- [x] Throws from unfinished Matches are excluded.
- [x] The view handles empty state cleanly.
- [x] Covered by a behavior test with multiple completed Throws and one active-Match Throw.

## TDD plan

- [x] RED: Add behavior test for Longest Throws sorting and row details.
- [x] GREEN: Implement the minimal list and query.
- [x] RED: Add test proving active-Match Throws are excluded.
- [x] GREEN: Filter through completed Match status.
- [x] RED: Add empty-state test.
- [x] GREEN: Render empty state.
- [x] REFACTOR: Reuse completed-Match throw query logic with Profile stats where practical.

## Commit requirement

After this issue passes tests, commit this issue's changes before starting another issue. Do not batch multiple issues into one commit.

## Blocked by

None - can start immediately

## Status

Resolved on 2026-05-23.
