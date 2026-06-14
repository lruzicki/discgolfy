-- Scope active Match reads to creator/participants while preserving creator-only writes.

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE auth_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_read_match(match_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM matches m
    WHERE m.id = match_uuid
      AND (
        m.status <> 'active'
        OR m.created_by = public.current_profile_id()
        OR EXISTS (
          SELECT 1
          FROM match_players mp
          WHERE mp.match_id = match_uuid
            AND mp.player_id = public.current_profile_id()
        )
      )
  )
$$;

DROP POLICY IF EXISTS "Matches are viewable by everyone" ON matches;
CREATE POLICY "Active matches are viewable by participants" ON matches FOR SELECT
  USING (public.can_read_match(id));

DROP POLICY IF EXISTS "Match players are viewable by everyone" ON match_players;
CREATE POLICY "Match players are viewable by match readers" ON match_players FOR SELECT
  USING (public.can_read_match(match_id));

DROP POLICY IF EXISTS "Scores are viewable by everyone" ON scores;
CREATE POLICY "Scores are viewable by match readers" ON scores FOR SELECT
  USING (public.can_read_match(match_id));

DROP POLICY IF EXISTS "Throws are viewable by everyone" ON throws;
CREATE POLICY "Throws are viewable by match readers" ON throws FOR SELECT
  USING (public.can_read_match(match_id));

DROP POLICY IF EXISTS "Throw events are viewable by everyone" ON throw_events;
CREATE POLICY "Throw events are viewable by match readers" ON throw_events FOR SELECT
  USING (public.can_read_match(match_id));

DROP POLICY IF EXISTS "Match creators can manage players" ON match_players;
CREATE POLICY "Match creators can manage players" ON match_players FOR ALL USING (
  auth.uid() IN (
    SELECT auth_id FROM profiles WHERE id = (SELECT created_by FROM matches WHERE id = match_id)
  )
);

DROP POLICY IF EXISTS "Match creators can manage scores" ON scores;
CREATE POLICY "Match creators can manage scores" ON scores FOR ALL USING (
  auth.uid() IN (
    SELECT auth_id FROM profiles WHERE id = (SELECT created_by FROM matches WHERE id = match_id)
  )
);

DROP POLICY IF EXISTS "Match creators can manage throws" ON throws;
CREATE POLICY "Match creators can manage throws" ON throws FOR ALL USING (
  auth.uid() IN (
    SELECT auth_id FROM profiles WHERE id = (SELECT created_by FROM matches WHERE id = match_id)
  )
);

DROP POLICY IF EXISTS "Match creators can manage throw events" ON throw_events;
CREATE POLICY "Match creators can manage throw events" ON throw_events FOR ALL USING (
  auth.uid() IN (
    SELECT auth_id FROM profiles WHERE id = (SELECT created_by FROM matches WHERE id = match_id)
  )
);
