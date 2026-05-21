## What to build

Stabilize the production Match map so it does not continually refresh or flicker. The map should keep one WebView/map instance alive while location, throw, tee, and basket data update without reloading the whole map document every render.

## Acceptance criteria

- [ ] Production builds no longer show constant map blinking during an active Match.
- [ ] Location and throw marker updates still appear on the map.
- [ ] The generated map document is not recreated for unrelated screen renders.
- [ ] Covered by a focused test or instrumentation around the map input/update boundary.

## Blocked by

None - can start immediately
