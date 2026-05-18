Status: Completed

## What to build
Integrate GPS-based throw tracking into the active match scorecard.

## Acceptance criteria
- [x] "Mark Start" button captures current GPS coordinates.
- [x] "Mark End" button captures coordinates, allows selecting a disc from the "Virtual Bag", and calculates distance (Haversine).
- [x] Calculated throw data (start/end lat/lng, distance, disc_id) is saved to the `throws` table.
- [x] Visualization of recorded throws for the current hole.

## Blocked by
- 001-virtual-bag.md
- 003-core-gameplay.md
