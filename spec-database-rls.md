# Database & Row Level Security (RLS) Specification

This specification outlines the Supabase database schema and the associated RLS policies for the Disc Golf application. The architecture relies heavily on PostgreSQL to enforce business rules, keeping the frontend client "thin" regarding security.

## 1. Schema Definition

All tables utilize `uuid` (via `gen_random_uuid()`) as their Primary Key.

### `profiles`
- `id` (uuid, PK)
- `auth_id` (uuid, nullable) - References Supabase Auth (`auth.users.id`). Null for Guests.
- `created_by_auth_id` (uuid, nullable, FK to `auth.users.id`) - The authenticated user who created this Guest profile.
- `display_name` (text)
- `first_name` (text)
- `avatar_url` (text, nullable)
- `is_guest` (boolean) - True if the profile cannot log in directly.
- `created_at` (timestamp)

### `discs`
- `id` (uuid, PK)
- `player_id` (uuid, FK to `profiles.id`)
- `name` (text)
- `color_rgba` (text)
- `speed` (numeric)
- `glide` (numeric)
- `turn` (numeric)
- `fade` (numeric)
- `weight_g` (integer)
- `max_throw_m` (integer)
- `max_putt_m` (integer)
- `archived_at` (timestamp, nullable) - Soft-deletion timestamp.
- `created_at` (timestamp)

### `courses`
- `id` (uuid, PK)
- `name` (text)
- `location` (text) - Can be split into lat/lng if needed later.
- `created_at` (timestamp)

### `layouts`
- `id` (uuid, PK)
- `course_id` (uuid, FK to `courses.id`)
- `name` (text)
- `hole_count` (integer)

### `holes`
- `id` (uuid, PK)
- `layout_id` (uuid, FK to `layouts.id`)
- `hole_number` (integer)
- `par` (integer)
- `distance_m` (integer)
- `tee_latitude` (numeric)
- `tee_longitude` (numeric)
- `basket_latitude` (numeric)
- `basket_longitude` (numeric)

### `matches`
- `id` (uuid, PK)
- `layout_id` (uuid, FK to `layouts.id`)
- `created_by` (uuid, FK to `profiles.id`)
- `date_played` (timestamp)
- `status` (text) - Constraint: 'active', 'completed'.

### `match_players`
- `id` (uuid, PK)
- `match_id` (uuid, FK to `matches.id`)
- `player_id` (uuid, FK to `profiles.id`)
- `total_score` (integer, nullable) - Populated upon match completion.

### `scores`
- `id` (uuid, PK)
- `match_id` (uuid, FK to `matches.id`)
- `player_id` (uuid, FK to `profiles.id`)
- `hole_id` (uuid, FK to `holes.id`)
- `strokes` (integer, nullable) - Raw number of throws. Null indicates a skipped hole.

### `throws`
- `id` (uuid, PK)
- `match_id` (uuid, FK to `matches.id`)
- `player_id` (uuid, FK to `profiles.id`)
- `hole_id` (uuid, FK to `holes.id`)
- `disc_id` (uuid, FK to `discs.id`, nullable)
- `throw_number` (integer)
- `start_lat` (numeric)
- `start_lng` (numeric)
- `end_lat` (numeric)
- `end_lng` (numeric)
- `distance_m` (integer)

---

## 2. Row Level Security (RLS) Policies

All tables must have RLS enabled (`ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`).

### `profiles`
- **SELECT**: Authenticated users can read all profiles (needed for adding friends to matches and viewing the Global Board).
- **INSERT**:
  - Authenticated users can insert their own profile (`auth.uid() = auth_id`).
  - Authenticated users can insert Guest profiles (`is_guest = true` AND `created_by_auth_id = auth.uid()`).
- **UPDATE**:
  - Authenticated users can update their own profile (`auth.uid() = auth_id`).
  - Authenticated users can update Guest profiles they created (`created_by_auth_id = auth.uid()`).

### `discs`
- **SELECT**: Anyone can view (needed for Global Board / historical Match view).
- **INSERT/UPDATE**: Only the owner can modify (`auth.uid() = (SELECT auth_id FROM profiles WHERE id = player_id)`).
- **DELETE**: Hard deletion is DENIED via RLS. The client must use an UPDATE to set `archived_at` instead.

### `courses`, `layouts`, `holes`
- **SELECT**: Public read access.
- **INSERT/UPDATE/DELETE**: Restricted to Admin role or specific staff (out of scope for MVP, assume read-only for standard users).

### `matches`
- **SELECT**: Public read access (for Global Board).
- **INSERT**: Authenticated users can create matches.
- **UPDATE**: Only the creator can update the match status (`auth.uid() = (SELECT auth_id FROM profiles WHERE id = created_by)`).

### `match_players`
- **SELECT**: Public read access.
- **INSERT/UPDATE/DELETE**: Only the match creator can modify participants.

### `scores`
- **SELECT**: Public read access.
- **INSERT/UPDATE**: Only the match creator can insert/update scores. This is the **Match Scoring Authority** rule.
  - Policy condition: `auth.uid() = (SELECT auth_id FROM profiles WHERE id = (SELECT created_by FROM matches WHERE id = match_id))`
- **DELETE**: Only the match creator can delete scores.

### `throws`
- **SELECT**: Public read access.
- **INSERT/UPDATE/DELETE**: Only the match creator can manage throws for the match.

---

## 3. Key Business Rules Enforced
1. **Match Scoring Authority:** By restricting `scores` UPDATE/INSERT to the match `created_by` profile, we guarantee no conflict if multiple players try to edit the scorecard offline.
2. **Guest Identity:** Guests are strictly managed by their creator via the `created_by_auth_id` on the `profiles` table.
3. **No Account Conversion:** There is no mechanism to convert a Guest to an Authenticated user; they remain separate entities permanently.