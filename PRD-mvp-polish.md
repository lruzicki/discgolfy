# PRD: MVP Polish, Navigation & Core Features Expansion

## Problem Statement
The current Disc Golf application ("discgolfy") lacks several critical features for a complete MVP experience and suffers from UX inconsistencies. Specifically:
- **Navigation is fragmented:** Users cannot easily switch between an active match, their profile, and the leaderboard without losing context or following a deep stack.
- **Map & GPS UX is suboptimal:** The default map view (Standard) lacks terrain detail, and the throw measurement process is visually ambiguous, leading to confusion about when a measurement is active.
- **Summary Screens are incomplete:** The in-game summary lacks a clear leaderboard of total scores vs PAR, and the background styling is inconsistent with the rest of the app.
- **Core screens are missing:** Match History, Throw History, and the Global Leaderboard are either non-existent or placeholders.
- **Profile lacks depth:** User statistics are currently hardcoded and don't reflect actual play data.

## Solution
This PRD outlines a comprehensive update to:
1.  **Restructure App Navigation:** Transition to a Bottom Tab Navigation architecture (Play, Leaderboard, Profile) to provide persistent access to core areas.
2.  **Polish Active Match UX:** Set Satellite view as default, improve GPS measurement feedback, and add a quick "Add Disc" shortcut during disc selection.
3.  **Enhance Round Summaries:** Add a sorted total leaderboard to both mid-round and post-round summaries and fix background styling.
4.  **Implement Data-Driven Features:** Build functional Match History, Throw History, and Global Leaderboard screens powered by real Supabase data.
5.  **Dynamic Profile Stats:** Replace hardcoded stats with live calculations from the database.

## User Stories
1. As a player, I want to use Satellite view by default on the map, so that I can see trees and obstacles on the course.
2. As a player, I want clear visual feedback when GPS throw measurement is active, so that I know the app is recording my position.
3. As a player, I want to see a "Stop" icon instead of "OK" when ending a measurement, so that the action is intuitive.
4. As a player, I want to see a history of my previous throws for the current hole, so that I can review my performance.
5. As a player, I want to add a new disc directly from the "Select Disc" modal if I forgot to add it earlier, so that I don't have to leave the match.
6. As a player, I want to see a sorted leaderboard (total score vs PAR) in the summary view, so that I immediately know who is leading.
7. As a player, I want the summary screen background to match the app's dark theme (gray), so that the UI feels cohesive.
8. As a player, I want to navigate to my Profile or the Leaderboard during a round and then return to the match using a "Play" button, so that I can check other info without ending my game.
9. As a player, I want to see a list of all my past matches, so that I can track my progress over time.
10. As a player, I want to see a global leaderboard of all users, so that I can see how I rank against the community.
11. As a player, I want my profile stats (Rounds Played, Avg Score, Best Hole) to be calculated from my real match data.

## Implementation Decisions

### 1. Navigation Refactor
- **Transition to Tab Navigation:** Use `@react-navigation/bottom-tabs`. 
- **Tabs:**
    - **Play:** Handles course selection, player selection, and active match. If a match is active, it shows a "Resume Match" button or goes straight to the active screen.
    - **Leaderboard:** Shows the Global Board.
    - **Profile:** User profile, stats, bag, and match history.
- **State Management:** The `useMatchStore` will remain the source of truth for whether a match is currently active.

### 2. Map & GPS Improvements
- **Default View:** Set `isSatellite` default to `true` in `MapComponent`.
- **Measurement Feedback:** 
    - Change button icon from `check` to `stop-circle` when measurement is active.
    - Display a "Measurement in Progress" status bar or pulsing indicator at the top of the map/scorecard.
- **Disc Selection:** Add an "Add New Disc" item at the top of the disc selection list that navigates to `AddEditDiscScreen`.

### 3. Summary & History Views
- **SummaryView Update:** Add a "Total Leaderboard" section above or below the hole grid. Sort players by `total_strokes - total_par`.
- **Styling:** Update `summaryContent` background in `ActiveMatchScreen.tsx` to `COLORS.background`.
- **Throw History:** Implement a new `ThrowHistoryModal` or screen that lists all `throws` for the current hole, showing disc used and distance.

### 4. Data Layer & Statistics
- **Match History:** New `MatchHistoryScreen` fetching from `matches` and `match_players`.
- **Global Leaderboard:** New `LeaderboardScreen` fetching from a Supabase View or `match_players` aggregated by player.
- **Profile Stats:** Implement a `fetchProfileStats` function that performs aggregations on `scores` and `matches` for the current user.

## Testing Decisions
- **Navigation Persistence:** Verify that navigating away from an active match and back doesn't reset the local state.
- **GPS Logic:** Ensure throw distances are still calculated correctly with the new UI flow.
- **Data Accuracy:** Verify that profile stats and leaderboards correctly reflect the database state.

## Out of Scope
- Real-time multiplayer (scores are still synced via the creator's device).
- Advanced social features like "liking" or "commenting" on matches.
- Offline map tile storage.

## Further Notes
- The transition to Tab Navigation is a significant architectural change and should be the first priority to ensure a stable foundation for the other features.
