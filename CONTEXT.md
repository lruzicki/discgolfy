# Project Context: Disc Golf App (UDisc Clone)

## 1. Project Overview
A mobile application for tracking disc golf scores and statistics. The app is a simplified UDisc clone designed for excellent outdoor readability (high contrast, green and white color scheme). It features GPS throw tracking, virtual disc bag management, real-time score calculation, and a public feed of recent games (Global Board).

## 2. Tech Stack & API Philosophy
- **Frontend:** React Native, Expo (EAS Build)
- **Backend & Database:** Supabase (PostgreSQL, Supabase Auth, Supabase Storage)
- **API Architecture:** **No traditional backend endpoints.** Supabase automatically generates REST APIs based on the database tables. Interaction with the backend happens directly via the `supabase-js` client. Development focus must be on DB Schema, Row Level Security (RLS) policies, and Client-Side state.
- **Maps & GPS:** `react-native-maps`, `expo-location`
- **State Management:** Zustand (crucial for local-first active gameplay)
- **Styling:** NativeWind (Tailwind for React Native) or StyleSheet (following the Google Stitch design system)

## 3. Core Features (MVP)
1. **Gameplay & Scorecard:** Tracking strokes for players (both authenticated users and guests). Real-time score calculation relative to PAR.
2. **Global Board (Feed):** A public leaderboard/feed displaying completed matches from all users.
3. **Virtual Bag (Discs):** Users can add their discs (name, RGB/Hex color, max throw distance, max putt distance). Discs are tied to the player's profile.
4. **GPS Throw Tracking:** Tracking individual throws via GPS (Start -> End), calculating the distance locally, and linking the throw to a specific disc from the user's bag.
5. **Courses & Layouts:** Support for multiple layouts on a single course (e.g., full 18 holes, front 9, back 9).
6. **WearOS Ready:** Database tables and Supabase auto-generated REST APIs must be designed cleanly to support future smartwatch integration out-of-the-box.

## 4. Database Schema (PostgreSQL via Supabase)
All tables use `uuid` (via `gen_random_uuid()`) as their Primary Key (PK).

- **`profiles`**: `id`, `auth_id` (nullable), `display_name`, `first_name`, `avatar_url`, `is_guest` (boolean), `created_at`.
- **`discs`**: `id`, `player_id` (FK), `name`, `color_rgba`, `speed`, `glide`, `turn`, `fade`, `weight_g`, `max_throw_m`, `max_putt_m`, `archived_at` (timestamp, nullable), `created_at`.
- **`courses`**: `id`, `name`, `location`, `created_at`.
- **`layouts`**: `id`, `course_id` (FK), `name`, `hole_count`.
- **`holes`**: `id`, `layout_id` (FK), `hole_number`, `par`, `distance_m`, `tee_latitude`, `tee_longitude`, `basket_latitude`, `basket_longitude`.
- **`matches`**: `id`, `layout_id` (FK), `created_by` (FK), `date_played`, `status` ('active', 'completed').
- **`match_players`**: `id`, `match_id` (FK), `player_id` (FK), `total_score` (nullable, populated upon match completion).
- **`scores`**: `id`, `match_id` (FK), `player_id` (FK), `hole_id` (FK), `strokes` (integer - raw number of throws).
- **`throws`**: `id`, `match_id` (FK), `player_id` (FK), `hole_id` (FK), `disc_id` (FK, nullable), `throw_number`, `start_lat`, `start_lng`, `end_lat`, `end_lng`, `distance_m`.

## 5. Architectural Rules & Business Logic
CRITICAL rules the AI must follow when generating code or suggesting solutions:

1. **Disc Soft-Deletion:**
   - Discs must NEVER be hard-deleted if they are referenced in the `throws` table.
   - Use the `archived_at` column to hide discs from the active "Bag" UI while preserving historical throw data.

2. **Score Calculation (Strokes vs +/- PAR):**
   - The database (`scores` table) stores ONLY the raw number of strokes (the `strokes` column).
   - DO NOT store the score relative to PAR (e.g., -1, +2) in the database to prevent data duplication and inconsistency.
   - The score relative to PAR is ALWAYS calculated on the fly on the frontend: `scoreRelativeToPar = strokes - hole.par`.
   - **Skipped Holes:** If a player skips a hole, the `strokes` value in the database MUST be `null`. Skipped holes do not receive the standard +4 penalty and must be excluded from average statistics.

3. **Offline & Latency Resilience (Crucial for Disc Golf):**
   - Disc golf courses often have poor cellular service. During an active game (`status = 'active'`), use local state via **Zustand** to track strokes. 
   - Prevent network latency delays on every [+]/[-] tap. Sync local state with Supabase (the `scores` table) only when transitioning between holes or when explicitly finishing a match. The app must handle potential connection drops gracefully.

4. **Security via Row Level Security (RLS) & Match Scoring Authority:**
   - Security is managed directly in PostgreSQL via Supabase RLS policies instead of backend endpoints. 
   - E.g., Anonymous/Guest users can view the Global Board but cannot alter other users' data.
   - **Match Scoring Authority:** ONLY the player who created the match (`created_by`) has permission to edit the scores for that match. Other participants have read-only access. This eliminates multi-device offline sync conflicts.
   - **Device Failure Edge Case:** We deliberately DO NOT support transferring match ownership if the creator's device dies mid-round. This is an accepted trade-off to keep the database and RLS policies extremely simple.

5. **Throw Distance (GPS):**
   - The throw distance in meters is calculated locally on the device using the Haversine formula based on `start_lat`/`start_lng` and `end_lat`/`end_lng`. The calculated result is then sent to the `throws` table (`distance_m`).

6. **Global Board:**
   - Fetched using JOINs or Supabase Views. We are only interested in matches where `status = 'completed'`.

7. **Guest Identity & Persistence:**
   - Guest profiles are persistent records in the `profiles` table.
   - A Guest profile created by an authenticated user MUST be linked to that creator (e.g., via a `created_by_auth_id` column). This allows the creator to reuse the same Guest profile across multiple matches, ensuring the Guest's match history remains intact without needing a formal account.
   - **No Account Conversion:** Guest profiles CANNOT be claimed or converted into fully authenticated accounts. If a Guest decides to create their own account later, they start from scratch.

## 6. AI Instructions (Grill Me Mode Workflow)
When the user initializes the "Grill Me" mode, act as a Senior Solutions Architect specialized in React Native and Supabase. Follow these strict steps:

1. **The Interrogation:** - Ask **ONLY ONE question at a time**.
   - Focus heavily on challenging edge cases, data integrity, and architectural constraints. 
   - Examples of things to grill the user on: *How to handle deleting a disc from the bag if it's referenced in historical throws? How will the Zustand store batch database syncs when cellular connection returns after being offline? What specific RLS policies are needed for guests?*
   - Evaluate the user's answer, provide feedback, correct misconceptions based on Supabase/React Native best practices, and then ask the next question.

2. **The Output Generation:**
   - When the user says "Stop grilling" or "Generate spec", conclude the session.
   - Compile the agreed-upon architectural decisions into new standalone specification files:
     - `spec-database-rls.md` (For security policies)
     - `spec-offline-sync.md` (For Zustand & offline logic)
     - `spec-features.md` (For general feature specifications)
   - Do not begin writing frontend UI or database code until the user approves these specification files.

## 7. Domain Glossary (Language)

**Match**:
A single round of disc golf played by one or more players on a specific layout.
_Avoid_: Game, Session

**Player**:
An individual participating in a match, whether authenticated or a guest. Scores are always tracked individually per player.
_Avoid_: User, Account

**Guest**:
A persistent profile created by an authenticated user for someone who does not have their own account. Guests are linked to their creator and reused across matches to track history.
_Avoid_: Anonymous User, Temporary User

**Squad / Friend Group (Dynamic)**:
An informal collection of players. There is NO `squads` table in the database. Comparisons and shared statistics between a group of friends are calculated dynamically on the frontend by querying the `match_players` and `scores` tables for specific combinations of players.
_Avoid_: Team, Doubles, League

## 8. Flagged Ambiguities
- "Team" was used to describe a group of friends playing together. Resolved: "Team" implies shared scores (like Doubles). For a group of friends playing individually, use "Squad" or simply rely on "Match History" filters.