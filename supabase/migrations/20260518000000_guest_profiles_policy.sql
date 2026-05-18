-- Allow authenticated users to create guest profiles
CREATE POLICY "Users can create guest profiles" ON profiles
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    is_guest = true AND 
    created_by_auth_id = auth.uid()
  );

-- Allow creators to update their guest profiles
CREATE POLICY "Users can update their own guest profiles" ON profiles
  FOR UPDATE USING (
    auth.uid() = created_by_auth_id AND 
    is_guest = true
  );
