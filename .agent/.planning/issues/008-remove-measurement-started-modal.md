## Type

AFK

## What to build

Starting throw measurement should not show a "Measurement Started" modal or alert. The map already shows recording state, so the Player should start measurement and continue walking without dismissing any extra UI.

## Acceptance criteria

- [x] Starting measurement requests location permission and stores the throw start point as today.
- [x] No "Measurement Started" alert/modal appears after measurement starts.
- [x] Permission denied and error alerts still appear.
- [x] Map recording indicator still appears while a throw is pending.
- [x] Covered by a behavior test that verifies no success alert is shown on measurement start.

## TDD plan

- [x] RED: Add a measurement-start test that grants location and expects no success alert.
- [x] GREEN: Remove only the success alert.
- [x] RED: Add/keep a denied-permission test that expects the permission alert.
- [x] GREEN: Keep denied/error paths intact.
- [x] REFACTOR: Name measurement states around pending throw, not modal visibility.

## Commit requirement

After this issue passes tests, commit this issue's changes before starting another issue. Do not batch multiple issues into one commit.

## Blocked by

None - can start immediately
