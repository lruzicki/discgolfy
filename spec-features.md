# Feature Specification

This document details the core features, calculated statistics, and business rules for the Disc Golf MVP application.

## 1. Virtual Bag (Discs)

**Purpose:** Allow users to manage their physical disc inventory and associate them with GPS tracked throws.

**Features:**
- **Add Disc:** Users input Name, Color (RGBA), Flight Numbers (Speed, Glide, Turn, Fade), Weight (g), and estimated Max Distances (Throw/Putt).
- **Edit Disc:** Update any property.
- **Soft Delete (Archive):** Remove a disc from the active Bag UI. 
  - *Rule:* Discs are never hard-deleted to preserve historical throw data.
- **Flight Visualization (Future):** Flight numbers will eventually be used to plot theoretical flight paths.

## 2. Active Match Gameplay

**Purpose:** The core loop of tracking scores while on the course.

**Features:**
- **Match Setup:** 
  - Creator selects Course and Layout.
  - Creator adds Players (mixing their friends' authenticated accounts and local Guest profiles).
- **Scoring Interface:**
  - High-contrast, outdoor-readable UI.
  - Displays the current Hole Number, Par, and Distance.
  - Large [+] and [-] buttons for strokes.
- **Score Calculation:**
  - *Rule:* Database stores raw strokes. UI calculates `Score = Strokes - Par`.
  - *Rule:* Skipped holes record a `null` stroke value. They incur no penalty and are excluded from statistics.
- **Authority:** 
  - *Rule:* Only the Match Creator can edit scores.
  - *Rule:* If the Creator's device fails, the match cannot be completed or transferred.

## 3. GPS Throw Tracking

**Purpose:** Measure the distance of specific shots and associate them with a disc.

**Features:**
- **Start Throw:** User stands at the lie and taps "Mark Start". Device records `start_lat`/`start_lng`.
- **End Throw:** User walks to the disc, selects the Disc used from their Virtual Bag, and taps "Mark End". Device records `end_lat`/`end_lng`.
- **Calculation:** The app calculates the distance locally using the Haversine formula (in meters) and saves the complete record to the `throws` table.

## 4. Match History & Statistics

**Purpose:** Review past performance and dynamically compare against friends.

**Features:**
- **Personal History:** A list of all completed matches the user participated in.
- **Dynamic Squad Stats:** 
  - *Rule:* There is no formal "Squads" table.
  - Users can select multiple friends (Profiles) in the UI to generate a dynamic head-to-head view.
  - The UI queries `match_players` and `scores` to calculate win/loss records, average score differentials, and lowest rounds across the times those specific people played together.
- **Guest History:** Guests have persistent profiles tied to their creator. The creator can view statistics for their Guests just like a standard user.
  - *Rule:* Guests cannot convert their profile into a real account.

## 5. Global Board (Feed)

**Purpose:** A social feed of recent activity.

**Features:**
- Displays a chronological list of recently `'completed'` matches across the entire app.
- Shows the course name, layout, players involved, and their final total scores.
- Powered by a Supabase View joining `matches`, `match_players`, `profiles`, and `courses`.