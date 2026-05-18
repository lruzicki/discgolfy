-- Add unique constraint to scores table for upsert operations
-- This allows ON CONFLICT (match_id, hole_id, player_id) DO UPDATE

ALTER TABLE scores 
ADD CONSTRAINT scores_match_hole_player_unique 
UNIQUE (match_id, hole_id, player_id);
