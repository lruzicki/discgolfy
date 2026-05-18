# PRD: Active Match Map and Scorecard Summary

## Problem Statement
During an active disc golf round, players need a way to visualize the hole layout (tee to basket) to plan their shots, especially on unfamiliar courses. Additionally, there is no quick way to review the performance of all players in the squad collectively during the round, leading to cognitive load when trying to track who is leading or where scores were missed.

## Solution
Integrate an OpenStreetMap (OSM) view into the active gameplay screen that shows the current hole's tee and basket positions. Introduce "Summary" tabs into the hole navigation flow that display a read-only, multi-player scorecard grid (chunked by 9 holes) for immediate performance review.

## User Stories
1. As a player, I want to see the tee and basket locations on a map, so that I can understand the hole layout and distance.
2. As a player, I want to see a line between the tee and basket, so that I can visualize the direct flight path.
3. As a match creator, I want to review the scores of all players in my squad after hole 9, so that I can see the "Front 9" standings.
4. As a player, I want to see a total summary at the end of the round, so that I can verify final scores before finishing the match.
5. As a player, I want the scorecard summary to be high-contrast and easy to read outdoors, so that I can check scores even in bright sunlight.
6. As a player, I want the scorecard to be split into 9-hole chunks, so that the grid remains legible on my mobile screen.
7. As a player, I want the map to automatically center on the current hole, so that I don't have to manually pan or zoom while playing.
8. As a player, I want to see color-coded scores (e.g., green for birdies), so that I can quickly identify great performances.

## Implementation Decisions
- **Map Provider:** Use `react-native-maps` with `UrlTile` to fetch OpenStreetMap tiles, ensuring a free and open-source map layer.
- **Map Visualization:** 
    - Tee marker: Yellow background with `golf-tee` icon.
    - Basket marker: Orange background with "T" (Target) label.
    - Path: Dashed polyline using the primary theme color.
- **Navigation Flow:** Insert `SUM` (Summary) items into the `navItems` array in `ActiveMatchScreen`. These appear after hole 9 and after the final hole of the layout.
- **Scorecard Grid:** A new `SummaryView` component that:
    - Renders players as rows and holes as columns.
    - Chunks holes into groups of 9.
    - Uses sticky columns for player names.
    - Calculates +/- PAR differentials on the fly for color coding.
- **State Management:** Navigation between holes and summary views is handled via `activeNavItemIndex`, which maps to either a specific `hole` or a `summary` range.

## Testing Decisions
- **Verification:** Ensure that the "SUM" tabs appear correctly for layouts with different hole counts (e.g., 9-hole vs 18-hole courses).
- **Data Integrity:** Verify that the summary grid correctly reflects the `scores` state from the Zustand store.
- **Map Behavior:** Confirm that the map region updates and markers render correctly when switching between holes.

## Out of Scope
- Interactive score editing within the summary grid (it is read-only).
- Offline tile storage (standard device caching only).
- GPS location tracking of the player on the map (fixed tee/basket view only for this phase).
- Historical match summary viewing outside of an active match.

## Further Notes
- The "SUM" labels in navigation are intentionally brief to save space on mobile.
- The map uses a custom dark theme overlay to maintain the "Aether Disc" aesthetic.
