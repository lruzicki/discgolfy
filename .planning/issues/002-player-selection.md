## What to build
Implement the player selection flow that precedes an active match. The user should be able to select a course layout and then choose players (friends or local guests).

## Acceptance criteria
- [ ] `SelectCourseScreen` (already partially implemented) correctly navigates to `SelectPlayersScreen` with a selected layout.
- [ ] `SelectPlayersScreen` fetches and displays searchable profiles.
- [ ] Ability to select multiple players for a match.
- [ ] Functionality to create/select "Guest" profiles (linked to the creator).
- [ ] "Start Match" action creates a `matches` record and associated `match_players` records in Supabase.
- [ ] Successful creation navigates to the `ActiveMatchScreen`.

## Blocked by
None - can start immediately.
