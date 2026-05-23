## Type

AFK

## What to build

When a Player records a throw, opens Add New Disc from the disc picker, saves a disc, and returns, the app should return to the disc picker for that pending throw. The new Disc must be visible immediately so the Player can select it for the recorded throw.

## Acceptance criteria

- [x] Add New Disc opened from active Match carries return context for the pending throw.
- [x] Saving the Disc returns to the active Match disc picker, not to Bag.
- [x] The Disc picker refetches active Discs after the new Disc is created.
- [x] The pending throw start/end coordinates survive the Add New Disc detour.
- [x] Covered by a behavior test through active Match -> Add New Disc -> disc picker.

## TDD plan

- [x] RED: Add a behavior test that opens Add New Disc from the active Match disc picker and saves a Disc.
- [x] GREEN: Preserve return context and navigate back to the disc picker.
- [x] RED: Add a behavior test that the newly created Disc appears in the picker without reopening the Match.
- [x] GREEN: Refetch active Discs on return/success.
- [x] REFACTOR: Keep normal Bag -> Add/Edit Disc behavior separate from Match-return behavior.

## Commit requirement

After this issue passes tests, commit this issue's changes before starting another issue. Do not batch multiple issues into one commit.

## Blocked by

None - can start immediately
