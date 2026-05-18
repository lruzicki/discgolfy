## Parent
[PRD-mvp-polish.md](../PRD-mvp-polish.md)

## What to build
Redesign the `PlayScreen` to provide a better overview of available courses and ongoing games.

1. **Active Matches**: Instead of a single "Resume Match" button, fetch all matches with `status = 'active'` created by the user from Supabase. Display them in an "Active Rounds" list.
2. **Courses Section**: Add a "Quick Start" or "Courses" section that lists recently played courses or provides a quick entry to the `SelectCourse` flow.
3. **Improved Layout**: Use a cleaner, multi-section layout instead of one large card.

## Acceptance criteria
- [ ] Multiple active matches are correctly displayed and can be resumed individually.
- [ ] Users can quickly jump to course selection from the Play screen.
- [ ] The layout is balanced and provides clear calls to action for both existing and new games.

## Blocked by
None - can start immediately.
