## Type

AFK

## What to build

Player statistics must count only completed Matches. Active or unfinished Matches should not affect rounds played, average score, best round, recent performance, total throws, birdies, eagles, rankings, or any future statistic.

## Acceptance criteria

- [x] Profile statistics exclude all Match data where Match status is not completed.
- [x] Match History lists completed Matches only.
- [x] Ranking/stat queries continue to use completed Matches only.
- [x] Throws tied to unfinished Matches do not contribute to longest throw or total throw statistics.
- [x] Covered by behavior tests with one active Match and one completed Match for the same Player.

## TDD plan

- [x] RED: Add a Profile statistics test where active Match rows exist and must not change stats.
- [x] GREEN: Filter stats through completed Match status.
- [x] RED: Add a longest throw test where the longest throw belongs to an active Match and is ignored.
- [x] GREEN: Filter throw-based stats through completed Match status.
- [x] REFACTOR: Centralize completed-Match filtering behind a small query/helper boundary if duplication appears.

## Commit requirement

After this issue passes tests, commit this issue's changes before starting another issue. Do not batch multiple issues into one commit.

## Blocked by

None - can start immediately
