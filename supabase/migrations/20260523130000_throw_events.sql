-- Event markers recorded during throws (tree, water, OB, hit person)

CREATE TABLE throw_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES profiles(id) NOT NULL,
  hole_id uuid REFERENCES holes(id) NOT NULL,
  event_type text CHECK (event_type IN ('tree', 'water', 'ob', 'hit_person')) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE throw_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Throw events are viewable by everyone" ON throw_events FOR SELECT USING (true);
CREATE POLICY "Match creators can manage throw events" ON throw_events FOR ALL USING (
  auth.uid() IN (
    SELECT auth_id FROM profiles WHERE id = (SELECT created_by FROM matches WHERE id = match_id)
  )
);
