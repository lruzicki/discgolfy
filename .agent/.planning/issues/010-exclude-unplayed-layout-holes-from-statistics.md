## Type

AFK

## What to build

Unplayed Holes must be excluded from Match and Player statistics instead of counted as zero strokes. A missing score row or a score row with `strokes = null` means the Player did not play that Hole for stat purposes.

## Acceptance criteria

- [x] Match totals include only Holes with non-null strokes for each Player.
- [x] Total par is calculated from played Holes only, not every Hole on the Layout.
- [x] Summary and History never display an unplayed Hole as `0`.
- [x] Average score, best round, recent performance, birdie/eagle counts, and total throws exclude unplayed Holes.
- [x] Covered by behavior tests where a Layout has more Holes than the Player completed.

## TDD plan

- [x] RED: Add a summary/history stats test with one played Hole and one unplayed Hole.
- [x] GREEN: Calculate total strokes and total par from non-null scores only.
- [x] RED: Add a Profile stats test proving unplayed Holes do not affect average or total throws.
- [x] GREEN: Apply played-Hole filtering to Player stats.
- [x] REFACTOR: Extract a score aggregation helper that treats null/missing strokes consistently.

## Commit requirement

After this issue passes tests, commit this issue's changes before starting another issue. Do not batch multiple issues into one commit.

## Blocked by

None - can start immediately
