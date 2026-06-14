## Type

AFK

## What to build

Build a polished Moderator UI for managing Course Holes, Layouts, and course maps.

The current Layout editor allows adding Holes inside a Layout, but that makes the wrong thing feel canonical. Moderators should be able to manage the Course's reusable Holes first, then build Layouts by selecting existing Holes from that Course. Layout editing should feel map-first: choose Holes on the map, order them in the Layout, and edit tee/start plus basket/finish coordinates without typing raw latitude/longitude unless the moderator explicitly opens an advanced/manual edit.

Add simple course map management too. Maps should be metadata-only for now: name plus a built-in icon/style choice if useful. Do not add map images or image upload for maps in this issue.

## Acceptance criteria

- [x] Moderator Course details has a clear, attractive management flow for Course Holes, Layouts, and Maps.
- [x] A Moderator can create reusable Holes for a Course outside any specific Layout.
- [x] A Moderator can select existing Course Holes when creating or editing a Layout.
- [x] Layout Holes can be added from the Course map/list instead of only being created inside the Layout.
- [x] The Layout editor shows which Course Holes are already included, excluded, and in what order.
- [x] A Moderator can reorder Holes within a Layout without changing the canonical Course Hole coordinates.
- [x] A Moderator can add or adjust a Hole tee/start point by tapping the map.
- [x] A Moderator can add or adjust a Hole basket/finish point by tapping the map.
- [x] The editor still allows manual coordinate correction as a fallback, but raw coordinate fields are not the primary UI.
- [x] Editing a Hole from a Layout can update/fix its tee and basket coordinates when the Moderator confirms that change.
- [x] A Moderator can add a new course map with name and optional built-in icon/style only.
- [x] The map management UI does not request, upload, store, or display custom map images.
- [x] Existing Match course selection and active Match scoring keep using Layouts exactly as before from a Player perspective.
- [x] Covered by behavior tests for Course Hole creation, Layout selection from existing Course Holes, tee/basket map picking, coordinate correction from Layout context, and map metadata creation.

## TDD plan

- [x] RED: Add a data/model test proving a Course can expose reusable Holes independently of a single Layout.
- [x] GREEN: Add the smallest schema/service path needed to represent reusable Course Holes and Layout membership/order without breaking existing Match reads.
- [x] RED: Add a Moderator Course details test showing separate entry points/sections for Holes, Layouts, and Maps.
- [x] GREEN: Implement the Course management UI shell with existing Moderator gating.
- [x] RED: Add a Layout editor test where existing Course Holes are listed and selected into a Layout.
- [x] GREEN: Implement selecting/removing existing Course Holes and persisting Layout membership plus order.
- [x] RED: Add a map picking test where the Moderator chooses Tee mode, taps the map, and sees tee coordinates update for the selected Hole.
- [x] GREEN: Wire map tap selection for tee/start and basket/finish points.
- [x] RED: Add a Layout-context edit test proving coordinate fixes can update the underlying Course Hole after confirmation.
- [x] GREEN: Add the confirm-and-save coordinate correction path.
- [x] RED: Add a map metadata test proving a map can be added with a name/icon and no image field.
- [x] GREEN: Implement simple map metadata creation and display.
- [x] REFACTOR: Keep Moderator editing concerns separate from active Match map rendering and Player course selection.

## Notes

- Canonical domain language stays: Course, Layout, Hole, Match.
- A Course should own the reusable Hole definition. A Layout should choose/order Course Holes.
- Tee/start and basket/finish should be edited with the app's existing map experience wherever practical.
- Avoid custom map images in this issue. Use names and possibly built-in icons/styles only.
- If schema migration is needed, preserve read compatibility for current `matches -> layouts -> holes` usage or migrate the query paths in the same issue.

## Commit requirement

After this issue passes tests, commit this issue's changes before starting another issue. Do not batch multiple issues into one commit.

## Blocked by

None - can start immediately
