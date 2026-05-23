## Type

AFK

## What to build

Opening a completed Match from Match History must show that Match Summary reliably. The summary should resolve the Match id from route params when launched from history, and from active Match state when launched after Finish Match.

## Acceptance criteria

- [x] Tapping a Match History row opens Match Summary for that exact Match.
- [x] Summary does not depend on active Match store state when opened from History.
- [x] Historical Summary shows history-appropriate actions, including back navigation instead of active-play actions.
- [x] Existing active Finish Match summary path still works.
- [x] Covered by a behavior test based on the earlier active Match restore/resume test style.

## TDD plan

- [x] RED: Add a History row press test that passes a completed Match id into Summary.
- [x] GREEN: Make Summary use route Match id when present.
- [x] RED: Add a Summary mode test with no active Match state.
- [x] GREEN: Render historical actions without reading undefined state.
- [x] REFACTOR: Use one explicit `summaryMatchId` and one explicit `isViewingHistorical` source.

## Commit requirement

After this issue passes tests, commit this issue's changes before starting another issue. Do not batch multiple issues into one commit.

## Blocked by

None - can start immediately
