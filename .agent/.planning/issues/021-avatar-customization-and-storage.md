## Parent

`spec-lightweight-avatars.md`

## What to build

Extend the Avatar component to support rendering predefined vector icons, and implement the UI in the EditProfileScreen for users to customize their avatar. Add a Dual Picker flow (Icon Grid and Color Palette) allowing users to select from preset icons and background colors. When saved, the selection must be constructed as a string (e.g., `icon:cat:#FF5733`) and stored in the existing `profiles.avatar_url` database column via `profileService`. The Avatar component must parse this string and render the corresponding vector icon and background color.

This issue follows the TDD approach: write failing tests for parsing the `icon:{name}:{color}` string and saving the customized avatar selection before implementing the UI and rendering logic.

## Acceptance criteria

- [x] `Avatar` component successfully parses an `icon:{name}:{color}` string and renders the corresponding vector icon with the specified background color.
- [x] `EditProfileScreen` includes a Dual Picker UI with an Icon Grid (~15 preset icons) and a Color Palette (~8 preset colors).
- [x] `EditProfileScreen` displays a live preview of the selected icon and color combination.
- [x] Saving the profile updates `profiles.avatar_url` in the database with the correctly formatted `icon:name:color` string.
- [x] TDD: Tests verify the parsing of the icon string format and the correct data payload sent to `profileService.updateProfile`.

## Blocked by

- 020-deterministic-initials-fallback-avatar.md