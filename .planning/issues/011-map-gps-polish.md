Status: Completed

Status: Completed

## Parent
[PRD-mvp-polish.md](../PRD-mvp-polish.md)

## What to build
Improve the User Experience of the GPS throw tracking and map visualization during an active match.

1. **Satellite Default**: Update the `MapComponent` to default to Satellite view instead of the inverted OSM view for better terrain visibility.
2. **Measurement Iconography**: Change the measurement button icon in the scorecard header. When a measurement is NOT active, show the `ruler` icon. When a measurement IS active, show a `stop-circle` icon.
3. **Active Feedback**: Add a clear visual indicator (e.g., a pulsing red dot or a "Recording..." status bar) on the map or scorecard when a GPS measurement is in progress.

## Acceptance criteria
- [x] Map defaults to Satellite view on hole load.
- [x] Measurement button icon toggles correctly between `ruler` and `stop-circle`.
- [x] User receives immediate visual confirmation that their starting position has been recorded.
- [x] Visual indicator disappears once the throw is finalized or cancelled.

## Blocked by
None - can start immediately.
