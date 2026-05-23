## Type

AFK

## What to build

Finishing a Match must keep the app open and land the Player on the completed Match Summary. The summary screen should support a Match opened from active play and should not throw when it is opened without history-specific route state.

## Acceptance criteria

- [x] Tapping Finish Match syncs queued scores, marks the Match completed, and navigates to Match Summary.
- [x] Match Summary renders after Finish Match without closing or crashing the app.
- [x] The active Match state is cleared only after the Player leaves the completed summary via an explicit action.
- [x] Errors during finish show an alert and leave the Player in the active Match.
- [x] Covered by a behavior test for the Finish Match -> Summary path.

## TDD plan

- [x] RED: Add a behavior test that completes an active Match and expects Match Summary content to render.
- [x] GREEN: Make the smallest navigation/summary state change that passes.
- [x] RED: Add a behavior test for failed finish sync/update leaving the Player in active play.
- [x] GREEN: Preserve active Match state on failure.
- [x] REFACTOR: Remove duplicated Match id resolution and keep summary mode naming explicit.

## Commit requirement

After this issue passes tests, commit this issue's changes before starting another issue. Do not batch multiple issues into one commit.

## Blocked by

None - can start immediately
