## Type

AFK

## What to build

Recording a measured throw should create a Throw record only. It must not increment the score for the current Hole. Strokes remain controlled by the explicit plus/minus score buttons.

## Acceptance criteria

- [ ] Finalizing a measured throw inserts a Throw row.
- [ ] Finalizing a measured throw does not call score increment logic.
- [ ] Current Hole stroke display stays unchanged after throw measurement.
- [ ] Existing plus/minus scoring still updates strokes and sync queue.
- [ ] Covered by a behavior test for measured throw finalization.

## TDD plan

- [ ] RED: Add an Active Match test that finalizes a throw and expects no score change.
- [ ] GREEN: Remove the scoring side effect from throw finalization.
- [ ] RED: Add/keep a plus-button test proving scoring still works.
- [ ] GREEN: Leave score controls as the only stroke mutation path.
- [ ] REFACTOR: Split "record Throw" from "change Score" in naming and handlers.

## Resolution

- [x] Finalizing a measured throw inserts a Throw row.
- [x] Finalizing a measured throw does not call score increment logic.
- [x] Current Hole stroke display stays unchanged after throw measurement.
- [x] Existing plus/minus scoring still updates strokes and sync queue.
- [x] Covered by a behavior test for measured throw finalization.

- [x] RED: Add an Active Match test that finalizes a throw and expects no score change.
- [x] GREEN: Remove the scoring side effect from throw finalization.
- [x] RED: Add/keep a plus-button test proving scoring still works.
- [x] GREEN: Leave score controls as the only stroke mutation path.
- [x] REFACTOR: Split "record Throw" from "change Score" in naming and handlers.

## Commit requirement

After this issue passes tests, commit this issue's changes before starting another issue. Do not batch multiple issues into one commit.

## Blocked by

None - can start immediately
