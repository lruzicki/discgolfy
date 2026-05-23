## Type

AFK

## What to build

During an active Match, the creator can mark the current Hole as "Unplayable today". That Hole is excluded from scores and statistics for that Match because the group could not play it normally.

## Acceptance criteria

- [x] Active Match has an action to mark the current Hole unplayable today.
- [x] Marking a Hole unplayable sets every Player's score for that Hole to null or an equivalent skipped state.
- [x] Unplayable Holes are visually distinct in the active scorecard and summary.
- [x] Unplayable Holes are excluded from total strokes, total par, averages, best holes, and history stats.
- [x] The state is Match-specific; the Layout remains playable for future Matches.
- [x] Covered by behavior tests for active scorecard, summary totals, and Profile statistics.

## TDD plan

- [x] RED: Add Active Match test that marks a Hole unplayable and expects null/skipped scores for all Players.
- [x] GREEN: Persist and show the unplayable state.
- [x] RED: Add Summary/Profile stat tests proving the Hole is excluded.
- [x] GREEN: Wire unplayable state into score aggregation.
- [x] REFACTOR: Use same skipped/unplayed handling as normal missing/null scores.

## Commit requirement

After this issue passes tests, commit this issue's changes before starting another issue. Do not batch multiple issues into one commit.

## Blocked by

- `.agent/.planning/issues/010-exclude-unplayed-layout-holes-from-statistics.md`

## Status

Resolved on 2026-05-23.
