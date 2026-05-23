## Type

AFK

## What to build

Match summaries should show a "Possible Score" table when any Player recorded tree, water, OB, or hit-person events. Possible Score estimates each Player's score without those events by subtracting the Player's event count from their actual total strokes.

## Acceptance criteria

- [x] Summary shows no Possible Score section when nobody recorded event counters.
- [x] Summary shows Possible Score when at least one Player has event counters.
- [x] Possible Score displays actual score, event count, adjusted strokes, and adjusted diff for each Player.
- [x] The section is clearly labelled "Possible Score" so it is not confused with final score.
- [x] Historical Match Summary also shows Possible Score for completed Matches.
- [x] Covered by summary behavior tests for zero counters and non-zero counters.

## TDD plan

- [x] RED: Add Summary test where no event counters exist and the section is absent.
- [x] GREEN: Keep Summary unchanged for zero-counter Matches.
- [x] RED: Add Summary test where one Player has counters and expected Possible Score appears.
- [x] GREEN: Fetch/aggregate counters and render possible score.
- [x] REFACTOR: Reuse score aggregation helpers from final score calculations.

## Commit requirement

After this issue passes tests, commit this issue's changes before starting another issue. Do not batch multiple issues into one commit.

## Blocked by

- `.agent/.planning/issues/013-add-throw-event-counters.md`

## Status

Resolved on 2026-05-23.
