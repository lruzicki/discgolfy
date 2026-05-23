## Type

AFK

## What to build

Add a Moderator role. A Player with Moderator permissions can manage Layouts for Courses: choose which Holes belong to a Layout, edit tee and basket coordinates, add a new Layout, and edit par values for Holes in that Layout. Non-moderators keep read-only course/layout access.

## Acceptance criteria

- [x] Authenticated profiles can be marked as Moderator in an RLS-backed way.
- [x] Moderator-only UI is hidden from non-moderators.
- [x] A Moderator can create a new Layout for an existing Course.
- [x] A Moderator can include/exclude Holes from a Layout.
- [x] A Moderator can edit tee coordinates, basket coordinates, and par for Layout Holes.
- [x] Non-moderators cannot write Courses, Layouts, or Holes through client calls.
- [x] Covered by RLS/migration tests plus UI behavior tests for moderator and non-moderator paths.

## TDD plan

- [x] RED: Add permission tests proving non-moderator writes fail and moderator writes pass.
- [x] GREEN: Add role storage and RLS policies.
- [x] RED: Add UI behavior test proving moderator controls appear only for Moderator.
- [x] GREEN: Add moderator-gated entry point.
- [x] RED: Add behavior test for create/edit Layout path from Course to saved Layout.
- [x] GREEN: Implement the minimal editor path.
- [x] REFACTOR: Keep Layout editing logic separate from Match course selection logic.

## Commit requirement

After this issue passes tests, commit this issue's changes before starting another issue. Do not batch multiple issues into one commit.

## Blocked by

None - can start immediately

## Resolution

- [x] Authenticated profiles can be marked as Moderator in an RLS-backed way.
- [x] Moderator-only UI is hidden from non-moderators.
- [x] A Moderator can create a new Layout for an existing Course.
- [x] A Moderator can include/exclude Holes from a Layout.
- [x] A Moderator can edit tee coordinates, basket coordinates, and par for Layout Holes.
- [x] Non-moderators cannot write Courses, Layouts, or Holes through client calls.
- [x] Covered by RLS/migration tests plus UI behavior tests for moderator and non-moderator paths.

- [x] RED: Add permission tests proving non-moderator writes fail and moderator writes pass.
- [x] GREEN: Add role storage and RLS policies.
- [x] RED: Add UI behavior test proving moderator controls appear only for Moderator.
- [x] GREEN: Add moderator-gated entry point.
- [x] RED: Add behavior test for create/edit Layout path from Course to saved Layout.
- [x] GREEN: Implement the minimal editor path.
- [x] REFACTOR: Keep Layout editing logic separate from Match course selection logic.
