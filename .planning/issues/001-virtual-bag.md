## What to build
Implement the "Virtual Bag" feature to allow users to manage their physical disc inventory. This includes adding, editing, and archiving discs.

## Acceptance criteria
- [ ] UI for "My Bag" screen showing list of discs.
- [ ] "Add Disc" form with fields: Name, Color (RGBA), Speed, Glide, Turn, Fade, Weight (g), Max Throw (m), Max Putt (m).
- [ ] Ability to edit existing discs.
- [ ] Soft-delete (Archive) functionality: Discs are never deleted from DB, only marked with `archived_at` to preserve history.
- [ ] Discs are correctly associated with the authenticated user's profile.

## Blocked by
None - can start immediately.
