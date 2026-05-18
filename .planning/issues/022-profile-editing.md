## Parent
[PRD-mvp-polish.md](../PRD-mvp-polish.md)

## What to build
Implement a Profile Editing feature that allows users to update their personal information and customize their profile appearance.

Key features:
- **Profile Image Upload:** Support for image selection and upload (up to 5MB).
- **Name Change:** Allow users to update their `display_name`.
- **Email Update:** Allow users to change their account email address (requires re-authentication/confirmation via Supabase).
- **Integration:** Ensure the updated profile data is reflected across the app (Leaderboard, Player Selection, Profile Screen).

## Technical Requirements
- Image compression or validation to enforce the 5MB limit.
- Supabase Storage for storing profile avatars.
- Atomic updates to the `profiles` table.

## Acceptance criteria
- [ ] Users can pick an image from their device and upload it as an avatar.
- [ ] Images larger than 5MB are rejected with a clear error message.
- [ ] Users can save a new display name.
- [ ] Users can initiate an email change process.
- [ ] The Profile Screen immediately reflects saved changes.
