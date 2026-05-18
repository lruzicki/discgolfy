Status: Completed

## Parent
[PRD-mvp-polish.md](../PRD-mvp-polish.md)

## What to build
Refactor the root application navigation to use a Bottom Tab navigation pattern. This replaces the current stack-only flow for the main screens to provide persistent access to core app areas.

The tabs should be:
1. **Play**: The primary action tab. It should dynamically route the user. If `useMatchStore` has an active `matchId`, it should show a "Resume Match" button or navigate directly to `ActiveMatchScreen`. If no match is active, it should start the `SelectCourse` flow.
2. **Leaderboard**: A new placeholder screen for the Global Board.
3. **Profile**: The existing `ProfileScreen`.

## Acceptance criteria
- [x] `@react-navigation/bottom-tabs` is installed and configured.
- [x] Bottom tab bar is visible on all main screens (Play, Leaderboard, Profile).
- [x] "Play" tab intelligently handles active vs. new match state.
- [x] Navigation state is preserved when switching between tabs.
- [x] Tab icons use `Ionicons` consistent with the app theme.

## Blocked by
None - can start immediately.
