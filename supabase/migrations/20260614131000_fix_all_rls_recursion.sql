-- Fix comprehensive RLS recursion between matches and related tables
-- The issue is that matches SELECT policy queries match_players,
-- AND match_players FOR ALL policies query matches.
-- This creates a cycle.
-- We fix this by wrapping the cross-table queries in SECURITY DEFINER functions,
-- which bypass RLS during their internal execution and break the infinite loop.

CREATE OR REPLACE FUNCTION public.is_match_creator(match_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM matches m
    JOIN profiles p ON p.id = m.created_by
    WHERE m.id = match_uuid AND p.auth_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_match_participant(match_uuid uuid, profile_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM match_players mp
    WHERE mp.match_id = match_uuid
      AND mp.player_id = profile_uuid
  );
$$;

DROP POLICY IF EXISTS "Active matches are viewable by participants" ON matches;
CREATE POLICY "Active matches are viewable by participants" ON matches FOR SELECT
  USING (
    status <> 'active'
    OR created_by = public.current_profile_id()
    OR public.is_match_participant(id, public.current_profile_id())
  );

DROP POLICY IF EXISTS "Match creators can manage players" ON match_players;
CREATE POLICY "Match creators can manage players" ON match_players FOR ALL USING (
  public.is_match_creator(match_id)
);

DROP POLICY IF EXISTS "Match creators can manage scores" ON scores;
CREATE POLICY "Match creators can manage scores" ON scores FOR ALL USING (
  public.is_match_creator(match_id)
);

DROP POLICY IF EXISTS "Match creators can manage throws" ON throws;
CREATE POLICY "Match creators can manage throws" ON throws FOR ALL USING (
  public.is_match_creator(match_id)
);

DROP POLICY IF EXISTS "Match creators can manage throw events" ON throw_events;
CREATE POLICY "Match creators can manage throw events" ON throw_events FOR ALL USING (
  public.is_match_creator(match_id)
);
