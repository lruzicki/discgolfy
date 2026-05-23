## Type

AFK

## What to build

Fix profile photo editing so a Player can pick a photo, preview it, upload it, and save the new avatar URL. Photos over 5 MB must be rejected before upload with a clear error.

## Acceptance criteria

- [x] Picking a valid image previews it on Edit Profile.
- [x] Saving uploads the image to avatar storage and updates the profile avatar URL.
- [x] Images larger than 5 MB are rejected before upload.
- [x] If file size is unavailable from the picker, the implementation still enforces the 5 MB limit before upload.
- [x] Upload errors keep the Player on Edit Profile and show an error.
- [x] Covered by service and screen behavior tests for valid image, oversized image, and upload failure.

## TDD plan

- [x] RED: Add screen test that oversized image selection shows an error and never calls upload.
- [x] GREEN: Enforce size validation before saving/uploading.
- [x] RED: Add service test that upload uses a Supabase Storage-compatible payload for Expo image URIs.
- [x] GREEN: Fix upload implementation.
- [x] RED: Add valid image flow test for preview, upload, and profile update.
- [x] GREEN: Complete happy path.
- [x] REFACTOR: Keep picker validation separate from storage upload.

## Commit requirement

After this issue passes tests, commit this issue's changes before starting another issue. Do not batch multiple issues into one commit.

## Blocked by

None - can start immediately

## Status

Resolved on 2026-05-23.
