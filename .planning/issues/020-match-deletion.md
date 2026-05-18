## Parent
[PRD-mvp-polish.md](../PRD-mvp-polish.md)

## What to build
Allow users to delete matches they have created, providing a way to clean up mistakes or unwanted history.

1. **Delete Action**: Add a "Delete Match" button (trash icon or text) to `MatchHistoryScreen` (per item) and `MatchSummaryScreen` (primary action).
2. **Confirmation**: Implement a confirmation dialog to prevent accidental deletions.
3. **Data Cleanup**: Ensure that deleting a match also cleans up related entries in `match_players`, `scores`, and `throws` (or rely on DB-level cascade deletes).

## Acceptance criteria
- [x] Users can delete matches from their history.
- [x] Deletion requires confirmation.
- [x] Deleted matches are immediately removed from all UI lists.

## Blocked by
None - can start immediately.
