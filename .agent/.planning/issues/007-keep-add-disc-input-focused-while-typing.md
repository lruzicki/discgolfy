## Type

AFK

## What to build

Typing in Add Disc must behave like a normal form. Text inputs should keep focus and accept continuous typing without requiring the Player to tap the same input after each character.

## Acceptance criteria

- [x] The Disc Name input accepts multiple characters in one focused editing session.
- [x] Numeric Disc fields accept continuous input without focus loss.
- [x] Editing one field does not remount the input tree.
- [x] Existing Add Disc and Edit Disc save behavior remains unchanged.
- [x] Covered by a behavior test that types a multi-character Disc name and verifies one save payload.

## TDD plan

- [x] RED: Add a form behavior test that changes Disc Name from empty to a multi-character value before pressing Save.
- [x] GREEN: Stabilize input component identity/handlers enough to keep focus.
- [x] RED: Add the same behavior for one numeric field.
- [x] GREEN: Apply the stable input pattern to all Disc form fields.
- [x] REFACTOR: Keep form field rendering simple and avoid nested component definitions that remount on each state change.

## Commit requirement

After this issue passes tests, commit this issue's changes before starting another issue. Do not batch multiple issues into one commit.

## Blocked by

None - can start immediately
