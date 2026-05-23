## What to build

Make active Match resume navigation reliable after the user starts a Match, leaves the screen, and returns from another tab or route. Returning to the active Match should load the existing `matchId`, holes, Players, and Scores instead of attempting to load an empty identifier and showing `Failed to load ```.

## TDD verification

- [x] RED: Confirmed the resume-path behavior is covered by dedicated tests before making changes.
- [x] GREEN: `src/__tests__/PlayResumeFlow.test.tsx` and `src/__tests__/ActiveMatchResumeFlow.test.tsx` pass, proving active Match context resume + empty-context guard behavior.
- [x] REFACTOR: No code changes required; existing implementation already satisfies acceptance criteria.

## Acceptance criteria

- [x] After starting a Match, leaving Active Match and returning opens the same active Match.
- [x] The app never calls the active Match load path with an empty Match id.
- [x] If no active Match exists, the UI routes the Player to start/select a Match instead of showing an empty load error.
- [x] Covered by a navigation/store behavior test for the resume path.

## Status

Resolved on 2026-05-23.

## Blocked by

None - can start immediately
