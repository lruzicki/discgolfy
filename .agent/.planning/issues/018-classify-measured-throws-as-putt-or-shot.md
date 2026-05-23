## Type

AFK

## What to build

When a Player finalizes a measured throw, they must choose whether it was a putt or a normal shot. The Throw record stores that classification so stats can separate longest throws from longest putts.

## Acceptance criteria

- [x] Throw finalization UI requires choosing Shot or Putt before saving.
- [x] Saved Throw records include the selected type.
- [x] Existing Throw history displays the selected type.
- [x] Longest putt statistics use measured Throws classified as putts, not Disc form max putt values.
- [x] Existing longest throw statistics use measured Throws classified as shots, or all non-putt throws if legacy data has no type.
- [x] Covered by behavior tests for saving Shot, saving Putt, and stats aggregation.

## TDD plan

- [x] RED: Add Active Match test that finalizes a Putt and expects persisted type.
- [x] GREEN: Add type selection and persistence.
- [x] RED: Add stats/ranking test proving longest putt comes from measured Putt Throws.
- [x] GREEN: Update putt stat aggregation.
- [x] RED: Add legacy Throw test where missing type still counts as normal shot.
- [x] GREEN: Add backwards-compatible stat logic.
- [x] REFACTOR: Share Throw type constants between UI and stats.

## Commit requirement

After this issue passes tests, commit this issue's changes before starting another issue. Do not batch multiple issues into one commit.

## Blocked by

None - can start immediately

## Status

Resolved on 2026-05-23.
