Status: Completed

## Parent
[PRD-mvp-polish.md](../PRD-mvp-polish.md)

## What to build
Expand the functionality of the active match screen to handle common player needs: adding a missing disc and reviewing previous throws.

1. **"Add New Disc" Shortcut**: In the "Select Disc" modal that appears after ending a measurement, add a special "Add New Disc" item at the top of the list. Tapping this should navigate to `AddEditDiscScreen`.
2. **Throw History View**: Implement a way to view all previously recorded throws for the *current hole*. This should show the throw number, the disc used (with its color), and the calculated distance.

## Acceptance criteria
- [x] Users can navigate to the disc creation screen without leaving an active match.
- [x] The "Select Disc" list updates immediately if a new disc is added.
- [x] Throw history is accessible and displays accurate data from the `throws` table for the current hole/player.

## Blocked by
None - can start immediately.
