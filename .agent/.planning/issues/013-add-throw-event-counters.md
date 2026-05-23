## Type

AFK

## What to build

During active Match play, add a compact toggle/action icon. When opened, it shows four event icons: tree, water, OB, and hit person. Tapping an event records it for the current Player and Hole, and completed Match statistics include counters for each event type.

## Acceptance criteria

- [ ] Active Match scorecard has one compact event toggle icon.
- [ ] Opening the toggle reveals tree, water, OB, and hit person actions.
- [ ] Tapping an action records exactly one event for the current Player, current Hole, current Match, and event type.
- [ ] Player stats expose tree counter, water counter, OB counter, and hit-with-disc counter for completed Matches only.
- [ ] Event counters are protected by Match creator permissions like Scores and Throws.
- [ ] Covered by DB/RLS tests or migration assertions plus a UI behavior test for recording an event.

## TDD plan

- [ ] RED: Add a public behavior test that taps the event toggle and records one event.
- [ ] GREEN: Add the smallest UI/state path and persistence needed.
- [ ] RED: Add stats aggregation test for completed vs active Match event counts.
- [ ] GREEN: Aggregate counters through completed Matches only.
- [ ] RED: Add migration/RLS coverage for creator-only event writes.
- [ ] GREEN: Add schema and policies.
- [ ] REFACTOR: Keep event type constants shared by UI, persistence, and stats.

## Resolution

- [x] Active Match scorecard has one compact event toggle icon.
- [x] Opening the toggle reveals tree, water, OB, and hit person actions.
- [x] Tapping an action records exactly one event for the current Player, current Hole, current Match, and event type.
- [x] Player stats expose tree counter, water counter, OB counter, and hit-with-disc counter for completed Matches only.
- [x] Event counters are protected by Match creator permissions like Scores and Throws.
- [x] Covered by DB/RLS tests or migration assertions plus a UI behavior test for recording an event.

- [x] RED: Add a public behavior test that taps the event toggle and records one event.
- [x] GREEN: Add the smallest UI/state path and persistence needed.
- [x] RED: Add stats aggregation test for completed vs active Match event counts.
- [x] GREEN: Aggregate counters through completed Matches only.
- [x] RED: Add migration/RLS coverage for creator-only event writes.
- [x] GREEN: Add schema and policies.
- [x] REFACTOR: Keep event type constants shared by UI, persistence, and stats.

## Commit requirement

After this issue passes tests, commit this issue's changes before starting another issue. Do not batch multiple issues into one commit.

## Blocked by

None - can start immediately
