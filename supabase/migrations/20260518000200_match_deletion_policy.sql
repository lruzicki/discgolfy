-- Allow creators to delete their matches
CREATE POLICY "Creators can delete their matches" ON matches
  FOR DELETE USING (
    auth.uid() IN (
      SELECT auth_id FROM profiles WHERE id = created_by
    )
  );
