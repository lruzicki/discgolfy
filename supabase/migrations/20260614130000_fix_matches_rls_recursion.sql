-- Fix RLS recursion in matches table
-- The previous policy in 20260612090000 used can_read_match(id) which 
-- caused infinite recursion during RLS evaluation for SELECT.

DROP POLICY IF EXISTS "Active matches are viewable by participants" ON matches;

CREATE POLICY "Active matches are viewable by participants" ON matches FOR SELECT
  USING (
    status <> 'active'
    OR created_by = public.current_profile_id()
    OR EXISTS (
      SELECT 1
      FROM match_players mp
      WHERE mp.match_id = id
        AND mp.player_id = public.current_profile_id()
    )
  );
